import asyncio
import time
from typing import Dict, Any, Set
import httpx
from llama_index.llms.ollama import Ollama
from llama_index.core import VectorStoreIndex
from app.config import settings
from app.services.vector_store import vector_store_service
from llama_index.retrievers.bm25 import BM25Retriever
from llama_index.core.retrievers import QueryFusionRetriever
from app.services.flashrank_reranker import FlashrankReranker
from llama_index.core.query_engine import RetrieverQueryEngine

class LLMService:
    """Service สำหรับจัดการ LLM Operations"""

    def __init__(self):
        self.models_cache = {}
        
        # Load FlashRank model globally at startup
        import os
        from app.services.flashrank_reranker import FlashrankReranker
        print(f"⚡ กำลังโหลด FlashRank Model: {settings.FLASHRANK_MODEL}")
        cache_dir = os.path.join(vector_store_service.bm25_persist_dir, "flashrank_models")
        os.makedirs(cache_dir, exist_ok=True)
        try:
            self.reranker = FlashrankReranker(
                top_n=settings.SIMILARITY_TOP_K,
                model_name=settings.FLASHRANK_MODEL,
                cache_dir=cache_dir
            )
            print("✅ FlashRank Model พร้อมใช้งาน")
        except Exception as e:
            print(f"⚠️ โหลด FlashRank ไม่สำเร็จ: {e}")
            self.reranker = None

    def clear_cache(self):
        """ล้าง cache ของ LLM instances ทั้งหมด เพื่อบังคับใช้ runtime ใหม่"""
        cache_size = len(self.models_cache)
        self.models_cache.clear()
        print(f"🧹 ล้าง LLM cache แล้ว ({cache_size} instances)")

    def _known_models(self) -> Set[str]:
        """รวมรายชื่อโมเดลที่ควร sync กับ Ollama runner"""
        models = {
            settings.DEFAULT_LLM_MODEL,
            settings.ALTERNATIVE_LLM_MODEL,
        }

        for cache_key in self.models_cache.keys():
            model_name = cache_key.split("::", 1)[0]
            models.add(model_name)

        return {m for m in models if m}

    def _ollama_runtime_options(self, runtime_device: str) -> Dict[str, Any]:
        options: Dict[str, Any] = {"num_ctx": settings.LLM_NUM_CTX}

        if runtime_device == "cpu":
            options["num_gpu"] = 0
            options["num_ctx"] = min(settings.LLM_NUM_CTX, settings.CPU_LLM_NUM_CTX)
            options["num_predict"] = settings.CPU_LLM_NUM_PREDICT
            
        elif settings.OLLAMA_NUM_GPU >= 0:
            options["num_gpu"] = settings.OLLAMA_NUM_GPU

        return options

    def sync_ollama_runners(self, runtime_device: str, target_models=None):
        """
        Sync runner ของ Ollama ให้ตรง runtime ใหม่
        - unload runner เดิมก่อน
        - ถ้าเป็น GPU ให้ warmup ล่วงหน้าเพื่อหลีกเลี่ยงเคสต้องรัน `ollama run` ด้วยมือ
        """
        models: Set[str] = set()
        if target_models:
            models.update([m for m in target_models if isinstance(m, str) and m.strip()])
        else:
            # fallback เมื่อ frontend ไม่ส่ง model มา
            models.update(self._known_models())

        models = sorted(models)
        if not models:
            return

        options = self._ollama_runtime_options(runtime_device)
        print(f"🔄 [Runtime Sync] เริ่ม sync Ollama runners ({runtime_device}) สำหรับ {models}")

        with httpx.Client(timeout=45.0) as client:
            for model_name in models:
                # 1) Unload runner เดิม
                try:
                    unload_payload = {
                        "model": model_name,
                        "prompt": "",
                        "stream": False,
                        "keep_alive": 0,
                    }
                    client.post(f"{settings.OLLAMA_HOST}/api/generate", json=unload_payload)
                except Exception as e:
                    print(f"⚠️ [Runtime Sync] unload ไม่สำเร็จ ({model_name}): {e}")

                # 2) Warmup เฉพาะตอนใช้ GPU
                if runtime_device == "gpu":
                    try:
                        warm_payload = {
                            "model": model_name,
                            "prompt": "ok",
                            "stream": False,
                            "keep_alive": "5m",
                            "options": options,
                        }
                        client.post(f"{settings.OLLAMA_HOST}/api/generate", json=warm_payload)
                        print(f"✅ [Runtime Sync] warmup สำเร็จ ({model_name})")
                    except Exception as e:
                        print(f"⚠️ [Runtime Sync] warmup ไม่สำเร็จ ({model_name}): {e}")

    @staticmethod
    def is_runtime_memory_error(error: Exception) -> bool:
        """ตรวจว่าข้อผิดพลาดเกี่ยวกับ GPU runtime / runner allocation หรือไม่"""
        message = str(error).lower()
        patterns = [
            "memory layout cannot be allocated",
            "cuda",
            "gpu",
            "out of memory",
            "cudnn",
            "hip",
            "metal",
            "vram",
            "health resp",
            "connection refused",
            "actively refused",
            "dial tcp",
            "/health",
        ]
        return any(pattern in message for pattern in patterns)

    def fallback_to_cpu_if_needed(self, error: Exception) -> bool:
        """
        ถ้า runtime ปัจจุบันเป็น GPU และเจอ memory/runtime error
        จะสลับระบบเป็น CPU อัตโนมัติพร้อมล้าง cache

        Returns:
            bool: True หากมีการ fallback สำเร็จ
        """
        from app.services.runtime_manager import runtime_manager

        if runtime_manager.get_runtime() != "gpu":
            return False

        if not self.is_runtime_memory_error(error):
            return False

        runtime_manager.set_runtime("cpu")
        self.clear_cache()
        print("⚠️ [Runtime] ตรวจพบ GPU memory/runtime error -> fallback เป็น CPU อัตโนมัติ")
        return True

    def get_llm(self, model_name: str) -> Ollama:
        """
        สร้างหรือดึง LLM instance จาก cache

        Args:
            model_name: ชื่อโมเดลที่ต้องการใช้

        Returns:
            Ollama LLM instance
        """
        from app.services.runtime_manager import runtime_manager

        runtime_device = runtime_manager.get_runtime()
        cache_key = f"{model_name}::{runtime_device}"

        if cache_key not in self.models_cache:
            print(f"🤖 กำลังสร้าง LLM instance สำหรับ: {model_name} (runtime={runtime_device})")
            additional_kwargs = {"num_ctx": settings.LLM_NUM_CTX}

            # บังคับ CPU ด้วย num_gpu=0; โหมด GPU ให้ Ollama ใช้ค่าตามระบบ/คอนฟิก
            if runtime_device == "cpu":
                additional_kwargs["num_gpu"] = 0
                additional_kwargs["num_ctx"] = min(settings.LLM_NUM_CTX, settings.CPU_LLM_NUM_CTX)
                additional_kwargs["num_predict"] = max(8192, settings.CPU_LLM_NUM_PREDICT)
            else:
                if settings.OLLAMA_NUM_GPU >= 0:
                    additional_kwargs["num_gpu"] = settings.OLLAMA_NUM_GPU
                # สำหรับ GPU ให้ปลดล็อกความยาวคำตอบ 8192 tokens เพื่อให้จัด JSON สไลด์หลายหน้าได้ยาวละเอียด ไม่โดนหั่นครึ่งทาง
                additional_kwargs["num_predict"] = 8192

            print(f"   ⚙️ Ollama options: {additional_kwargs}")

            self.models_cache[cache_key] = Ollama(
                model=model_name,
                base_url=settings.OLLAMA_HOST,
                request_timeout=settings.LLM_REQUEST_TIMEOUT,
                additional_kwargs=additional_kwargs
            )
        return self.models_cache[cache_key]

    async def query_with_context(
        self,
        query: str,
        session_id: str,
        model_name: str,
        search_query: str = None,
        top_k: int = None,
        selected_files: list = None,
        memory_context: str = "",
        filter_employee_email: str = None,
    ) -> Dict[str, Any]:
        """
        ถามคำถามโดยใช้ context จาก Vector Store

        Args:
            query: คำถามที่ต้องการถาม
            session_id: Session ID สำหรับดึง context
            model_name: ชื่อโมเดลที่ต้องการใช้
            search_query: ข้อความเพิ่มเติมในการค้นหา
            top_k: จำนวน chunk ที่ต้องการดึง (ถ้าระบุ จะใช้แทนค่า default ของระบบ)
            selected_files: รายชื่อไฟล์ที่ต้องการกรองดึงข้อมูล (ถ้าระบุ)

        Returns:
            Dict with 'thinking' (optional) and 'answer' keys
        """
        from app.services.runtime_manager import runtime_manager
        
        start_time = time.time()
        print(f"💬 [Query] {session_id}: {query}")

        # 📊 [Routing] ตรวจสอบไฟล์ทั้งหมดในเซสชันเพื่อประมวลผลระบบนำร่องไฮบริด (Hybrid Router)
        from sqlalchemy import select
        from app.database import async_session
        from app.db_models import Document as DbDocument, ChatSession
        import uuid
        import os
        import sqlite3
        import re
        
        all_session_docs = []
        is_system_session = False
        system_session_id = None
        try:
            session_uuid = uuid.UUID(session_id)
            async with async_session() as db:
                # 1. ตรวจสอบว่า ChatSession นี้เชื่อมโยงกับ System Session หรือไม่
                result = await db.execute(
                    select(ChatSession).where(ChatSession.id == session_uuid)
                )
                chat_session = result.scalar_one_or_none()
                if chat_session and chat_session.system_session_id:
                    is_system_session = True
                    system_session_id = chat_session.system_session_id
                    print(f"🔗 [RAG Routing] ChatSession {session_id} is linked to SystemSession '{system_session_id}'")
                
                # 2. ดึงไฟล์เฉพาะในกรณีที่ไม่ใช่ System Session (System Session จะใช้เวกเตอร์ HRM ส่วนกลางที่ซิงค์ไว้)
                if not is_system_session:
                    result = await db.execute(
                        select(DbDocument).where(
                            DbDocument.session_id == session_uuid,
                            DbDocument.status.in_(["completed", "ready_for_chat"])
                        )
                    )
                    all_session_docs = result.scalars().all()
        except Exception as route_db_err:
            print(f"⚠️ [Routing DB Error] ดึงรายการไฟล์ในเซสชันล้มเหลว: {route_db_err}")
            
        # แยกกลุ่มประเภทไฟล์
        tabular_docs = [d for d in all_session_docs if d.source_type in ["csv", "xlsx"]]
        text_docs = [d for d in all_session_docs if d.source_type not in ["csv", "xlsx"]]
        
        selected_mentions = []
        clean_query = query
        
        # 1. ค้นหา Manual Mention (เช่น /filename.ext หรือ /filename)
        slash_mentions = re.findall(r'/([^\s/]+)', query)
        for mention in slash_mentions:
            mention_lower = mention.lower()
            for doc in all_session_docs:
                base_name = os.path.splitext(doc.file_name)[0]
                clean_base_name = re.sub(r'[-_]\d{10,20}$', '', base_name)
                # แมตช์ตรงตัว, แมตช์ไม่มีนามสกุล, หรือเป็นส่วนหนึ่งของชื่อไฟล์หลัก
                if (mention_lower == doc.file_name.lower() or 
                    mention_lower == base_name.lower() or
                    (len(mention_lower) >= 3 and mention_lower in clean_base_name.lower()) or
                    (len(mention_lower) >= 3 and clean_base_name.lower() in mention_lower)):
                    if doc.file_name not in selected_mentions:
                        selected_mentions.append(doc.file_name)
                    # ลบ tag mention ออกจาก query เพื่อให้ LLM รับคำถามสะอาด
                    clean_query = clean_query.replace(f"/{mention}", "").strip()
                    
        # 2. ค้นหา Auto-linking (เมื่อไม่ได้พิมพ์สัญลักษณ์ / แต่พิมพ์ชื่อไฟล์ตรงๆ หรือใกล้เคียง)
        if not selected_mentions:
            for doc in all_session_docs:
                base_name = os.path.splitext(doc.file_name)[0]
                clean_base_name = re.sub(r'[-_]\d{10,20}$', '', base_name)
                # แมตช์เมื่อพิมพ์ชื่อไฟล์เต็ม หรือชื่อหลัก (ความยาวขั้นต่ำ 4 ตัวเพื่อไม่ให้เพี้ยน)
                if (doc.file_name.lower() in query.lower() or 
                    (len(clean_base_name) >= 4 and clean_base_name.lower() in query.lower())):
                    if doc.file_name not in selected_mentions:
                        selected_mentions.append(doc.file_name)
                        
        # 3. กำหนดกลุ่มเป้าหมายไฟล์ (Target files)
        target_files = selected_files or []
        if selected_mentions:
            print(f"🎯 [Routing] ตรวจพบไฟล์ที่ระบุในคำถาม (Mentions/Auto-link): {selected_mentions}")
            target_files = selected_mentions
            # กรองเนื้อความคำถามออกหากใช้ manual mention
            query = clean_query
            if not query.strip():
                query = "สรุปเนื้อหาในเอกสารนี้"
            
        # กรองรายการเอกสารตาม target_files (หากมี)
        if target_files:
            tabular_docs = [d for d in tabular_docs if d.file_name in target_files]
            text_docs = [d for d in text_docs if d.file_name in target_files]
            selected_files = target_files
        else:
            # 4. Rule-based Semantic Classifier (เมื่อไม่ได้ระบุไฟล์เจาะจง และมีไฟล์ชนิดปะปนในเซสชัน)
            if tabular_docs and text_docs:
                math_keywords = [
                    "เฉลี่ย", "ผลรวม", "รวม", "สถิติ", "ยอดขาย", "ตาราง", "จำนวน", "กี่", "คำนวณ", "คิวรี",
                    "average", "sum", "total", "count", "math", "statistics", "table", "query", "calc",
                    "max", "min", "สูงสุด", "ต่ำสุด", "เฉลี่ยรวม", "บวก", "ลบ", "คูณ", "หาร", "ร้อยละ", "เปอร์เซ็นต์"
                ]
                if any(kw in query.lower() for kw in math_keywords):
                    print("📊 [Routing Classifier] พบคำค้นหากลุ่มตาราง/คณิตศาสตร์ -> นำทางไป Tabular Agent")
                else:
                    print("📝 [Routing Classifier] คำถามทั่วไป/ข้อมูลเชิงสรุป -> นำทางไป Text-based RAG")
                    # เคลียร์ tabular_docs เพื่อให้ bypass ไปทำ RAG เวกเตอร์
                    tabular_docs = []

        # หากเลือกแล้วเหลือเฉพาะตาราง ให้สั่งรัน Tabular Agent
        if tabular_docs:
            print(f"📊 [Routing] ตรวจพบไฟล์ตารางข้อมูลในเซสชัน: {[d.file_name for d in tabular_docs]}")
            
            # โหลด Schema ของแต่ละตารางจาก SQLite
            db_path = os.path.join("data", "tabular.db")
            schemas_list = []
            
            if os.path.exists(db_path):
                conn = sqlite3.connect(db_path)
                cursor = conn.cursor()
                try:
                    for doc in tabular_docs:
                        safe_filename = re.sub(r'[^a-zA-Z0-9_]', '_', os.path.splitext(doc.file_name)[0]).lower()
                        safe_session = re.sub(r'[^a-zA-Z0-9_]', '_', session_id).lower()
                        table_name = f"table_{safe_session}_{safe_filename}"
                        
                        cursor.execute(f"PRAGMA table_info({table_name})")
                        columns = cursor.fetchall()
                        if columns:
                            schema_desc = f"ตารางชื่อ: {table_name} (อัปโหลดมาจากไฟล์: {doc.file_name})\nคอลัมน์:\n"
                            for col in columns:
                                schema_desc += f" - {col[1]} (ประเภท: {col[2]})\n"
                            schemas_list.append(schema_desc)
                except Exception as e:
                    print(f"⚠️ [Routing Error] ไม่สามารถอ่าน SQLite schema: {e}")
                finally:
                    conn.close()
                    
            if schemas_list:
                schemas_context = "\n".join(schemas_list)
                print(f"🔍 [Agent] ส่งโครงสร้างตารางไปวิเคราะห์กับ {settings.ACTION_LLM_MODEL}...")
                
                # ออกแบบ Prompt สำหรับ qwen2.5-coder:7b
                code_prompt = f"""You are a senior data analyst agent. Your task is to write a Python script that queries a local SQLite database at 'data/tabular.db' to answer the user's question.

The SQLite database contains the following tables and schemas:
{schemas_context}

User Question: "{query}"

Rules:
1. Connect to SQLite using:
   ```python
   import sqlite3
   conn = sqlite3.connect('data/tabular.db')
   ```
2. Write Python code using pandas or sqlite3. For example:
   ```python
   import pandas as pd
   df = pd.read_sql_query('SELECT * FROM table_name', conn)
   ```
3. Run necessary operations (filtering, aggregation, calculations) to answer the user's question.
4. You MUST print the final result/dataframe/answer using `print()`. Keep the output clean and human-readable.
5. Do NOT modify the database (no INSERT, UPDATE, DELETE, DROP, CREATE TABLE). Only read data.
6. Return ONLY the executable python code block, enclosed in ```python and ```. Do not write explanations outside the code block.

Let's write the python script:"""
                
                # เรียกใช้โมเดล qwen2.5-coder:7b
                try:
                    code_response = await self.query_direct(code_prompt, settings.ACTION_LLM_MODEL)
                    response_text = code_response.get("answer", "")
                    
                    code = ""
                    code_match = re.search(r'```python\s*(.*?)\s*```', response_text, re.DOTALL)
                    if code_match:
                        code = code_match.group(1).strip()
                    else:
                        code = response_text.strip()
                        
                    # รันโค้ดและดักจับผลลัพธ์ (พร้อมระบบ Self-Healing 1 รอบ)
                    captured_output = ""
                    error_msg = None
                    
                    for run_try in range(2):
                        import sys
                        import io
                        import traceback
                        
                        old_stdout = sys.stdout
                        redirected_output = io.StringIO()
                        sys.stdout = redirected_output
                        
                        exec_globals = {}
                        exec_locals = {}
                        
                        try:
                            exec(code, exec_globals, exec_locals)
                            error_msg = None
                        except Exception as e:
                            error_msg = traceback.format_exc()
                        finally:
                            sys.stdout = old_stdout
                            captured_output = redirected_output.getvalue()
                            
                        if not error_msg:
                            break
                        else:
                            print(f"⚠️ [Sandbox Error] โค้ดรันไม่สำเร็จ (รอบที่ {run_try+1}): {error_msg.splitlines()[-1]}")
                            fix_prompt = f"""The python code you wrote threw the following error:
```
{error_msg}
```

Here was the code you wrote:
```python
{code}
```

Please fix the error and write the corrected code. Keep in mind:
- Database path is 'data/tabular.db'
- Only return the python block enclosed in ```python and ```."""
                            code_response = await self.query_direct(fix_prompt, settings.ACTION_LLM_MODEL)
                            response_text = code_response.get("answer", "")
                            code_match = re.search(r'```python\s*(.*?)\s*```', response_text, re.DOTALL)
                            code = code_match.group(1).strip() if code_match else response_text.strip()

                    print(f"✅ [Sandbox Run] รันโค้ดสำเร็จ ผลลัพธ์ที่ดักจับได้ ({len(captured_output)} ตัวอักษร)")
                    
                    # นำผลลัพธ์มาส่งต่อให้ LLM หลักสังเคราะห์คำตอบภาษาไทย
                    final_prompt = f"""คุณคือผู้เชี่ยวชาญด้านการวิเคราะห์ข้อมูลและนักวิทยาศาสตร์ข้อมูล (Data Scientist)
ผู้ใช้งานถามคำถาม: "{query}"

ระบบได้รันโค้ด Python เพื่อดึงข้อมูลวิเคราะห์จากตารางในระบบเรียบร้อยแล้ว โดยได้ผลลัพธ์จากการรัน (Execution Result) ดังนี้:
---------------------
{captured_output or 'ไม่มีผลลัพธ์แสดงออกมาจากโค้ด (ไม่มีข้อมูลที่ตรงความต้องการ)'}
---------------------

คำสั่ง:
1. จงสรุปและตอบคำถามของผู้ใช้เป็นภาษาไทยอย่างชัดเจน แม่นยำ และเป็นมืออาชีพตามผลลัพธ์การคิวรีด้านบน
2. หากผลลัพธ์มีการคำนวณตัวเลขหรือสรุปยอด ให้อธิบายวิธีการสถิติคร่าวๆ (เช่น ยอดรวมเฉลี่ย หรือจำนวนแถว) ให้ผู้ใช้อ่านเข้าใจง่าย
3. ในการตอบคำถาม ให้แนบการอ้างอิงไฟล์โดยใช้รูปแบบ [ชื่อไฟล์] เสมอ (เช่น จากข้อมูลในไฟล์ [sales.csv] ...) เพื่อบอกผู้ใช้ว่าอ้างอิงจากตารางไหน

คำตอบ:"""
                    
                    final_response = await self.query_direct(final_prompt, model_name)
                    
                    # สร้าง citations คืนค่าให้หน้าบ้าน
                    citations = []
                    for doc in tabular_docs:
                        citations.append({
                            "file_name": doc.file_name,
                            "page_label": "database",
                            "text_snippet": f"คิวรีข้อมูลตารางสำเร็จด้วยการรันโค้ดวิเคราะห์โครงสร้างตาราง (จำนวน: {doc.page_count or 'N/A'} แถว)",
                            "similarity_score": 1.0,
                            "source_type": doc.source_type,
                            "url": None
                        })
                        
                    return {
                        "thinking": final_response.get("thinking"),
                        "answer": final_response.get("answer"),
                        "citations": citations
                    }
                except Exception as agent_err:
                    print(f"❌ [Agent Error] ล้มเหลวในกระบวนการทำงานของ Agent: {agent_err}")
                    # ถ้า Agent ล้มเหลว ให้ทำ RAG ทั่วไปต่อเป็น fallback
        
        # กำหนด top_k ตาม runtime หรือ custom top_k
        current_runtime = runtime_manager.get_runtime()
        if top_k is not None:
            effective_top_k = top_k
            print(f"   🎯 Custom Mode: ใช้ custom top_k={effective_top_k} สำหรับสรุปภาพรวมเอกสาร")
        elif current_runtime == "cpu":
            effective_top_k = settings.CPU_SIMILARITY_TOP_K
            print(f"   ⚡ CPU Mode: ใช้ top_k={effective_top_k} เพื่อลด context")
        else:
            effective_top_k = settings.SIMILARITY_TOP_K

        # ดึง Storage Context สำหรับ session นี้
        t1 = time.time()
        storage_session_id = system_session_id if is_system_session else session_id
        storage_context = vector_store_service.get_session_storage(storage_session_id)
        print(f"   ⏱️ Get storage ({storage_session_id}): {time.time() - t1:.2f}s")

        # สร้าง Index จาก Vector Store
        t1 = time.time()
        index = VectorStoreIndex.from_vector_store(
            vector_store=storage_context.vector_store
        )
        print(f"   ⏱️ Create index: {time.time() - t1:.2f}s")

        # 1. Vector Retriever - ใช้ effective_top_k ที่กำหนดตาม runtime พร้อมกรองไฟล์และ session
        retriever_kwargs = {"similarity_top_k": effective_top_k}
        from llama_index.core.vector_stores import MetadataFilters, MetadataFilter, FilterCondition, FilterOperator
        
        session_filter = MetadataFilter(key="session_id", value=storage_session_id)
        
        # จัดโครงสร้าง filter ตาม filter_employee_email
        email_or_public_filter = None
        if filter_employee_email:
            or_filters = [
                MetadataFilter(key="employee_email", value=filter_employee_email),
                MetadataFilter(key="resource_type", value="policies"),
                MetadataFilter(key="resource_type", value="announcements"),
                MetadataFilter(key="resource_type", value="benefits")
            ]
            email_or_public_filter = MetadataFilters(filters=or_filters, condition=FilterCondition.OR)
            print(f"   🛡️ [Metadata Filter] จำกัดการเข้าถึงเฉพาะข้อมูลส่วนตัวของ {filter_employee_email} และเอกสารสาธารณะ")

        if selected_files:
            print(f"   🎯 [Metadata Filter] ค้นหาเฉพาะไฟล์: {selected_files} และ session_id: {storage_session_id}")
            
            # กรองไฟล์
            if len(selected_files) == 1:
                file_filter = MetadataFilter(key="file_name", value=selected_files[0])
            else:
                file_filter = MetadataFilter(key="file_name", value=selected_files, operator=FilterOperator.IN)
                
            sub_filters = [session_filter, file_filter]
            if email_or_public_filter:
                sub_filters.append(email_or_public_filter)
                
            filters = MetadataFilters(
                filters=sub_filters,
                condition=FilterCondition.AND
            )
        else:
            print(f"   🎯 [Metadata Filter] ค้นหาเฉพาะ session_id: {storage_session_id}")
            sub_filters = [session_filter]
            if email_or_public_filter:
                sub_filters.append(email_or_public_filter)
                
            filters = MetadataFilters(
                filters=sub_filters,
                condition=FilterCondition.AND
            )
            
        retriever_kwargs["filters"] = filters

        vector_retriever = index.as_retriever(**retriever_kwargs)

        # 2. BM25 Retriever
        if selected_files or filter_employee_email:
            session_nodes = vector_store_service._load_bm25_nodes(storage_session_id)
            filtered_nodes = session_nodes
            
            # กรองด้วย selected_files
            if selected_files:
                filtered_nodes = [
                    node for node in filtered_nodes 
                    if node.metadata.get("file_name") in selected_files
                ]
                
            # กรองด้วย filter_employee_email
            if filter_employee_email:
                filtered_nodes = [
                    node for node in filtered_nodes
                    if node.metadata.get("employee_email") == filter_employee_email or
                       node.metadata.get("resource_type") in ["policies", "announcements", "benefits"]
                ]
                
            if filtered_nodes:
                print(f"🚀 [Hybrid Search Filtered] กำลังสร้างคีย์เวิร์ดฟิลเตอร์ชั่วคราวสำหรับ {len(filtered_nodes)} nodes")
                from llama_index.retrievers.bm25 import BM25Retriever
                from app.services.vector_store import thai_tokenizer
                bm25_retriever = BM25Retriever.from_defaults(
                    nodes=filtered_nodes,
                    similarity_top_k=2,
                    tokenizer=thai_tokenizer,
                )
            else:
                print("⚠️ [Hybrid Search Filtered] ไม่พบ nodes สอดคล้องกับตัวกรองสำหรับ BM25")
                bm25_retriever = None
        else:
            bm25_retriever = vector_store_service.get_bm25_retriever(storage_session_id)

        # ดึง LLM มาเตรียมไว้สำหรับ Retriever / Synthesizer
        llm = self.get_llm(model_name)

        # 4. FlashRank Reranker (Cross-Encoder)
        if hasattr(self, 'reranker') and self.reranker:
            # Update top_n if it differs from current effective_top_k
            if self.reranker.top_n != effective_top_k:
                print(f"🔧 Updating FlashRank top_n from {self.reranker.top_n} to {effective_top_k}")
                # Create new instance with updated top_n
                import os
                cache_dir = os.path.join(vector_store_service.bm25_persist_dir, "flashrank_models")
                self.reranker = FlashrankReranker(
                    top_n=effective_top_k,
                    model_name=settings.FLASHRANK_MODEL,
                    cache_dir=cache_dir
                )
            node_postprocessors = [self.reranker]
            print(f"🎯 [Rerank] ใช้งาน FlashRank Model : {settings.FLASHRANK_MODEL}")
        else:
            print(f"⚠️ [Rerank] ไม่พบ FlashRank Model ในระบบ")
            node_postprocessors = []

        from llama_index.core import PromptTemplate
        from llama_index.core.query_engine import RetrieverQueryEngine

        # สร้าง prompt ที่รวม conversation memory (ถ้ามี)
        memory_section = ""
        if memory_context:
            memory_section = (
                "ประวัติการสนทนาที่ผ่านมา:\n"
                f"{memory_context}\n"
                "---------------------\n"
            )

        QA_PROMPT_TMPL = (
            f"{memory_section}"
            "ข้อมูลจากเอกสาร (Context information) อยู่ด้านล่างนี้\n"
            "---------------------\n"
            "{context_str}\n"
            "---------------------\n"
            "คำสั่ง: จากข้อมูลเอกสารข้างต้นและประวัติการสนทนา จงตอบคำถามต่อไปนี้\n"
            "หากข้อความจากเอกสารอ่านยากหรือมีการสะกดผิดจากการสแกน ให้พยายามตีความและสรุปใจความเท่าที่ทำได้ "
            "ไม่ต้องตอบว่า 'เนื้อหาอ่านไม่รู้เรื่อง' ยกเว้นว่าจะไม่มีข้อมูลที่เกี่ยวข้องกับคำถามจริงๆ\n"
            "ในคำตอบของคุณ ให้แนบการอ้างอิงแหล่งที่มาตามแบบฟอร์มนี้เสมอ: [หน้า X] หรือ [ชื่อไฟล์ หน้า X] หากข้อมูลมาจากหลายหน้าให้ระบุทั้งหมด\n"
            "คำถาม: {query_str}\n"
            "คำตอบ: "
        )
        qa_template = PromptTemplate(QA_PROMPT_TMPL)

        # สร้าง Query Engine แบบกำหนดเองให้ใช้ Fusion Retriever + Reranker + Prompt
        # llama-index's custom Prompting via synthesize
        from llama_index.core.response_synthesizers import get_response_synthesizer

        def build_query_engine(active_llm):
            if bm25_retriever:
                print("🚀 [Hybrid Search] ใช้งาน Keyword BM25 + Vector")
                retriever = QueryFusionRetriever(
                    retrievers=[vector_retriever, bm25_retriever],
                    llm=active_llm,
                    num_queries=1,
                    use_async=True,
                    similarity_top_k=effective_top_k
                )
            else:
                print("⚠️ [Search] ไม่พบ BM25 Index, ใช้เฉพาะ Vector Search ธรรมดา")
                retriever = vector_retriever

            response_synthesizer = get_response_synthesizer(
                llm=active_llm,
                text_qa_template=qa_template
            )

            return RetrieverQueryEngine(
                retriever=retriever,
                response_synthesizer=response_synthesizer,
                node_postprocessors=node_postprocessors
            )

        query_engine = build_query_engine(llm)
        print(f"   ⏱️ Create query engine: {time.time() - t1:.2f}s")

        # Query
        print(f"🤖 [LLM] กำลังคิดคำตอบด้วย {model_name}...")
        t1 = time.time()

        from llama_index.core import QueryBundle
        target_query = QueryBundle(query_str=query, custom_embedding_strs=[search_query]) if search_query else query

        try:
            response = await asyncio.to_thread(query_engine.query, target_query)
        except Exception as e:
            # ถ้า GPU memory ไม่พอ ให้ fallback CPU อัตโนมัติและ retry 1 ครั้ง
            if self.fallback_to_cpu_if_needed(e):
                llm = self.get_llm(model_name)
                query_engine = build_query_engine(llm)
                response = await asyncio.to_thread(query_engine.query, target_query)
            else:
                raise
        llm_time = time.time() - t1
        print(f"   ⏱️ LLM response: {llm_time:.2f}s")

        response_text = str(response)

        # Extract thinking blocks from response
        thinking = None
        answer = response_text

        if '<think>' in response_text and '</think>' in response_text:
            start_idx = response_text.find('<think>')
            end_idx = response_text.find('</think>') + len('</think>')
            thinking = response_text[start_idx:end_idx]
            # Remove thinking from answer
            answer = (response_text[:start_idx] + response_text[end_idx:]).strip()
            print(f"🧠 [Thinking] พบ thinking blocks: {len(thinking)} chars")
        else:
            print(f"📝 [Response] ไม่มี thinking blocks")

        total_time = time.time() - start_time
        print(f"✅ [Response] ตอบคำถามเรียบร้อย ({total_time:.2f}s total)")
        
        # ถอด source citations
        citations = []
        if hasattr(response, 'source_nodes') and response.source_nodes:
            seen_sources = set()
            for node in response.source_nodes:
                metadata = node.node.metadata
                source_type = metadata.get("source_type", "pdf")
                file_name = metadata.get("file_name", "Unknown File")
                page_label = metadata.get("page_label", "N/A")
                url = metadata.get("url")

                if source_type == "web":
                    file_name = metadata.get("source") or metadata.get("title") or file_name
                    page_label = "web"
                
                score = getattr(node, 'score', None)
                source_id = f"{source_type}_{file_name}_{page_label}_{url or ''}"
                
                if source_id not in seen_sources:
                    seen_sources.add(source_id)
                    citations.append({
                        "file_name": file_name,
                        "page_label": page_label,
                        "text_snippet": node.node.get_text()[:200] + "...", 
                        "similarity_score": float(score) if score is not None else None,
                        "source_type": source_type,
                        "url": url,
                    })

        return {
            "thinking": thinking,
            "answer": answer,
            "citations": citations
        }

    async def query_direct(
        self,
        query: str,
        model_name: str
    ) -> Dict[str, Any]:
        """
        ส่งคำถามไปยัง LLM โดยตรงโดยไม่มีการดึง Context จาก Vector Store
        (เหมาะสำหรับ Step 2 ในการจัดโครงสร้าง JSON หรือการสรุปข้อมูลต่อยอด)
        """
        start_time = time.time()
        print(f"🤖 [LLM Direct] กำลังประมวลผลด้วย {model_name}...")
        llm = self.get_llm(model_name)
        
        try:
            response = await asyncio.to_thread(llm.complete, query)
        except Exception as e:
            # ถ้า GPU memory ไม่พอ ให้ fallback CPU อัตโนมัติและ retry 1 ครั้ง
            if self.fallback_to_cpu_if_needed(e):
                llm = self.get_llm(model_name)
                response = await asyncio.to_thread(llm.complete, query)
            else:
                raise

        response_text = response.text if hasattr(response, "text") else str(response)
        
        # Extract thinking blocks from response
        thinking = None
        answer = response_text
        if '<think>' in response_text and '</think>' in response_text:
            start_idx = response_text.find('<think>')
            end_idx = response_text.find('</think>') + len('</think>')
            thinking = response_text[start_idx:end_idx]
            answer = (response_text[:start_idx] + response_text[end_idx:]).strip()

        print(f"✅ [LLM Direct] ประมวลผลเรียบร้อย ({time.time() - start_time:.2f}s)")
        return {
            "thinking": thinking,
            "answer": answer,
            "citations": []
        }


# Singleton instance
llm_service = LLMService()
