import os
import json
import re
import asyncio
from typing import Dict, List, Optional, Any
from app.services.vector_store import vector_store_service
from llama_index.core import Document, VectorStoreIndex
from llama_index.core.node_parser import SentenceSplitter
from app.config import settings
from app.utils.ocr import extract_text_by_page
from app.services.llm_service import llm_service
from app.schemas.models import DocumentStatus


# Global dictionary เก็บสถานะการประมวลผล
doc_status: Dict[str, Dict] = {}


class DocumentProcessorService:
    """Service สำหรับประมวลผลเอกสาร"""

    def process_document(
        self,
        file_path: str,
        filename: str,
        session_id: str
    ):
        """
        ประมวลผลเอกสารแบบ Background Task
        - สกัดข้อความ
        - สร้าง Vector Index
        - สร้าง Summary

        Args:
            file_path: Path ของไฟล์
            filename: ชื่อไฟล์
            session_id: Session ID
        """
        task_id = f"{session_id}_{filename}"

        try:
            # 1. สกัดข้อความแยกตามหน้า
            print(f"\n📄 [Task] เริ่มสกัดข้อความจาก: {filename}")
            pages_text = extract_text_by_page(file_path)

            if not pages_text:
                raise ValueError("ไม่สามารถสกัดข้อความจากไฟล์ได้ หรือไฟล์ว่างเปล่า")

            # สร้าง Document ตามจำนวนหน้า เพื่อให้ทำ Citation ได้ชัดเจน
            docs = []
            for page_num, text in pages_text.items():
                if len(text.strip()) > 5:
                    doc = Document(
                        text=text,
                        metadata={
                            "file_name": filename, 
                            "session_id": session_id,
                            "page_label": str(page_num)
                        }
                    )
                    docs.append(doc)

            # 2. สร้าง Vector Index และ BM25
            print(f"🔍 [Task] กำลังสร้าง Vector Index และ BM25 ({len(docs)} chunks/pages)...")
            storage_context = vector_store_service.get_session_storage(session_id)
            from app.services.vector_store import thai_tokenizer
            splitter = SentenceSplitter(chunk_size=1500, chunk_overlap=150, tokenizer=thai_tokenizer)
            nodes = splitter.get_nodes_from_documents(docs)
            index = VectorStoreIndex(
                nodes=nodes,
                storage_context=storage_context
            )
            
            # 2.5 สร้าง BM25 Retriever สำหรับ Keyword Search แบบภาษาไทย
            try:
                if nodes:
                    vector_store_service.extend_bm25_nodes(session_id, nodes)
                    print(f"✅ [BM25] สร้าง Keyword Index สำหรับ {filename} เรียบร้อย")
                else:
                    print(f"⚠️ [BM25] เอกสารว่างเปล่า หรือไม่มีเนื้อหาเพียงพอสำหรับสร้าง BM25")
            except Exception as e:
                print(f"⚠️ [BM25] ล้มเหลวในการสร้าง BM25 Retriever: {e}")

            # 3. เปลี่ยนสถานะเป็น ready_for_chat (ช่วงนี้สามารถเริ่มแชทได้แล้ว)
            doc_status[task_id] = {
                "status": DocumentStatus.READY_FOR_CHAT,
                "summary": "⏳ AI กำลังสรุปเนื้อหาอยู่เบื้องหลัง คุณสามารถเริ่มพิมพ์ถามตอบได้เลย...",
                "mindmap": {"nodes": [], "edges": []}
            }
            print(f"✅ [Index] {filename} สร้าง Vector เสร็จแล้ว (เริ่มแชทได้เลย)!")

            # 4. สร้าง Summary (Background)
            print(f"⏳ [LLM] กำลังสร้าง Summary ของ {filename}...")
            doc_index = VectorStoreIndex(nodes=nodes)
            summary = asyncio.run(self._generate_summary(doc_index))

            # 5. อัพเดทสถานะเป็น completed
            doc_status[task_id] = {
                "status": DocumentStatus.COMPLETED,
                "summary": summary,
                "mindmap": {"nodes": [], "edges": []}
            }
            print(f"🎉 [Task] ประมวลผล {filename} เสร็จสิ้น 100%!\n")

        except Exception as e:
            print(f"❌ [Task Error] {str(e)}")
            doc_status[task_id] = {
                "status": DocumentStatus.ERROR,
                "message": str(e),
                "summary": "",
                "mindmap": {"nodes": [], "edges": []}
            }

    async def process_document_db(
        self,
        document_id: str,
        file_path: str,
        filename: str,
        session_id: str
    ):
        """
        ประมวลผลเอกสารแบบ Background Task และบันทึก/อัปเดตลงตาราง documents ใน PostgreSQL
        """
        from app.database import async_session
        from app.db_models import Document as DbDocument
        import uuid

        doc_uuid = uuid.UUID(document_id)
        task_id = f"{session_id}_{filename}"

        # ตั้งค่าเริ่มต้นใน in-memory status
        doc_status[task_id] = {
            "status": DocumentStatus.PROCESSING,
            "summary": "⏳ กำลังประมวลผลไฟล์...",
            "mindmap": {"nodes": [], "edges": []}
        }

        try:
            # 1. สกัดข้อความแยกตามหน้า
            print(f"\n📄 [Task DB] เริ่มสกัดข้อความจาก: {filename}")
            pages_text = extract_text_by_page(file_path)

            if not pages_text:
                raise ValueError("ไม่สามารถสกัดข้อความจากไฟล์ได้ หรือไฟล์ว่างเปล่า")

            # นับจำนวนหน้า
            page_count = len(pages_text)

            # อัปเดต page_count ใน DB
            async with async_session() as db:
                db_doc = await db.get(DbDocument, doc_uuid)
                if db_doc:
                    db_doc.page_count = page_count
                    await db.commit()

            # สร้าง Document ตามจำนวนหน้า
            docs = []
            for page_num, text in pages_text.items():
                if len(text.strip()) > 5:
                    doc = Document(
                        text=text,
                        metadata={
                            "file_name": filename, 
                            "session_id": session_id,
                            "page_label": str(page_num)
                        }
                    )
                    docs.append(doc)

            # 2. สร้าง Vector Index และ BM25
            print(f"🔍 [Task DB] กำลังสร้าง Vector Index และ BM25 ({len(docs)} chunks/pages)...")
            storage_context = vector_store_service.get_session_storage(session_id)
            from app.services.vector_store import thai_tokenizer
            splitter = SentenceSplitter(chunk_size=1500, chunk_overlap=150, tokenizer=thai_tokenizer)
            nodes = splitter.get_nodes_from_documents(docs)
            index = VectorStoreIndex(
                nodes=nodes,
                storage_context=storage_context
            )
            
            # 2.5 สร้าง BM25 Retriever
            try:
                if nodes:
                    vector_store_service.extend_bm25_nodes(session_id, nodes)
                    print(f"✅ [BM25 DB] สร้าง Keyword Index สำหรับ {filename} เรียบร้อย")
                else:
                    print(f"⚠️ [BM25 DB] เอกสารว่างเปล่า หรือไม่มีเนื้อหาเพียงพอสำหรับสร้าง BM25")
            except Exception as e:
                print(f"⚠️ [BM25 DB] ล้มเหลวในการสร้าง BM25 Retriever: {e}")

            # 3. อัปเดตสถานะเป็น ready_for_chat
            doc_status[task_id] = {
                "status": DocumentStatus.READY_FOR_CHAT,
                "summary": "⏳ AI กำลังสรุปเนื้อหาอยู่เบื้องหลัง คุณสามารถเริ่มพิมพ์ถามตอบได้เลย...",
                "mindmap": {"nodes": [], "edges": []}
            }
            
            async with async_session() as db:
                db_doc = await db.get(DbDocument, doc_uuid)
                if db_doc:
                    db_doc.status = DocumentStatus.READY_FOR_CHAT.value if hasattr(DocumentStatus.READY_FOR_CHAT, 'value') else DocumentStatus.READY_FOR_CHAT
                    await db.commit()
            
            print(f"✅ [Index DB] {filename} สร้าง Vector เสร็จแล้ว (เริ่มแชทได้เลย)!")

            # 4. สร้าง Summary และ Mindmap (Background)
            print(f"⏳ [LLM DB] กำลังสร้าง Summary ของ {filename}...")
            doc_index = VectorStoreIndex(nodes=nodes)
            summary = await self._generate_summary(doc_index)

            print(f"⏳ [LLM DB] กำลังสร้าง Mindmap ของ {filename}...")
            mindmap = await self._generate_mindmap(doc_index)

            # 5. อัปเดตสถานะเป็น completed ใน DB และ in-memory
            doc_status[task_id] = {
                "status": DocumentStatus.COMPLETED,
                "summary": summary,
                "mindmap": mindmap
            }

            async with async_session() as db:
                db_doc = await db.get(DbDocument, doc_uuid)
                if db_doc:
                    db_doc.status = DocumentStatus.COMPLETED.value if hasattr(DocumentStatus.COMPLETED, 'value') else DocumentStatus.COMPLETED
                    db_doc.summary = summary
                    db_doc.mindmap = mindmap
                    await db.commit()

            print(f"🎉 [Task DB] ประมวลผล {filename} เสร็จสิ้น 100%!\n")

        except Exception as e:
            print(f"❌ [Task DB Error] {str(e)}")
            doc_status[task_id] = {
                "status": DocumentStatus.ERROR,
                "message": str(e),
                "summary": "",
                "mindmap": {"nodes": [], "edges": []}
            }

            async with async_session() as db:
                db_doc = await db.get(DbDocument, doc_uuid)
                if db_doc:
                    db_doc.status = DocumentStatus.ERROR.value if hasattr(DocumentStatus.ERROR, 'value') else DocumentStatus.ERROR
                    db_doc.summary = f"เกิดข้อผิดพลาด: {str(e)}"
                    await db.commit()

    async def _generate_summary(self, index: VectorStoreIndex) -> str:
        """สร้างสรุปเนื้อหา"""
        try:
            prompt = "วิเคราะห์และสรุปหัวข้อสำคัญและประเด็นสำคัญทั้งหมดของเอกสารนี้ เป็นภาษาไทยแบบกระชับ มีโครงสร้างชัดเจน และอ่านเข้าใจง่าย"
            llm = llm_service.get_llm(settings.DEFAULT_LLM_MODEL)
            query_engine = index.as_query_engine(llm=llm, similarity_top_k=3)

            try:
                response = await asyncio.to_thread(query_engine.query, prompt)
                return str(response)
            except Exception as e:
                if llm_service.fallback_to_cpu_if_needed(e):
                    llm = llm_service.get_llm(settings.DEFAULT_LLM_MODEL)
                    query_engine = index.as_query_engine(llm=llm, similarity_top_k=3)
                    response = await asyncio.to_thread(query_engine.query, prompt)
                    return str(response)
                raise

        except Exception as e:
            print(f"⚠️ [Summary Error] {str(e)}")
            return "ไม่สามารถสร้างสรุปได้"

    async def _generate_mindmap(self, index: VectorStoreIndex) -> Dict:
        """สร้าง Mindmap JSON พร้อม hierarchy structure"""
        try:
            prompt = self.build_mindmap_prompt()
            llm = llm_service.get_llm(settings.DEFAULT_LLM_MODEL)
            query_engine = index.as_query_engine(llm=llm, similarity_top_k=3)

            try:
                response = await asyncio.to_thread(query_engine.query, prompt)
            except Exception as e:
                if llm_service.fallback_to_cpu_if_needed(e):
                    llm = llm_service.get_llm(settings.DEFAULT_LLM_MODEL)
                    query_engine = index.as_query_engine(llm=llm, similarity_top_k=3)
                    response = await asyncio.to_thread(query_engine.query, prompt)
                else:
                    raise

            hierarchy_text = str(response)

            # Parse markdown hierarchy เป็น tree structure
            mindmap = self.parse_mindmap_markdown(hierarchy_text)
            print(f"✅ [Mindmap] สร้าง hierarchy สำเร็จ ({len(mindmap['nodes'])} nodes)")
            return mindmap

        except Exception as e:
            print(f"⚠️ [Mindmap Error] {str(e)}")
            return {
                "nodes": [
                    {
                        "id": "1",
                        "label": "หัวข้อหลัก",
                        "parentId": None,
                        "level": 0,
                        "type": "root"
                    }
                ],
                "edges": []
            }

    def build_mindmap_prompt(self, language: str = "th", user_goal: Optional[str] = None) -> str:
        """สร้าง prompt สำหรับให้ LLM สร้าง Mindmap แบบ markdown hierarchy"""
        base_prompt = """คุณคือผู้เชี่ยวชาญด้านการจัดระเบียบความคิด (Knowledge Architect)
จงอ่านเนื้อหาจากเอกสารที่แนบมา แล้วสกัดใจความสำคัญเพื่อสร้าง Mind Map แบบ Hierarchical Tree ด้วยรูปแบบ Markdown

[โครงสร้าง Markdown ที่บังคับใช้]:
- `#` หัวข้อหลัก (Root) - มีได้เพียง 1 ข้อเท่านั้น (ชื่อแกนหลักของเรื่อง)
- `##` หมวดหมู่หลัก (Main Categories) - 3-5 หมวด
- `###` หัวข้อย่อย (Subtopics) - 3-7 ข้อต่อหมวด
- `####` รายละเอียด (Details) - ใส่เฉพาะส่วนที่จำเป็นต้องขยายความจริงๆ

[กฎเหล็ก]:
1. ตอบกลับเป็นข้อความ Markdown แบบดิบ (Raw Text) เท่านั้น ห้ามใส่เครื่องหมาย ``` (Code Block) ครอบเด็ดขาด และห้ามมีข้อความอธิบายหรือทักทาย
2. ข้อความในแต่ละหัวข้อต้องสั้น กระชับ ได้ใจความ (3-7 คำ)
3. จัดกลุ่มความสัมพันธ์ให้สมเหตุสมผล ไม่ซ้ำซ้อนกัน
4. เรียงลำดับความสำคัญจากบนลงล่าง และเรียงตรรกะให้เหมาะกับการคลิกขยาย/ย่อ (Expandable/Collapsible)

[ตัวอย่างผลลัพธ์ที่ถูกต้อง]:
# ระบบจัดการร้านอาหาร
## การสั่งอาหาร
### รับออเดอร์หน้าร้าน
### รับออเดอร์ออนไลน์
## การชำระเงิน
### เงินสด
### คิวอาร์โค้ด
#### รองรับทุกธนาคาร

[เนื้อหาเอกสาร]:"""

        # ปรับประโยคคำสั่งภาษาให้เด็ดขาดขึ้น
        lang_instruction = "ภาษาที่ใช้ตอบ: ภาษาไทยเท่านั้น" if language.lower() == "th" else "Response Language: English strictly"
        
        goal_text = f"\n[เป้าหมายเพิ่มเติมจากผู้ใช้]: {user_goal.strip()}" if user_goal and user_goal.strip() else ""
        
        # เพิ่ม Trigger Phrase ปิดท้าย เพื่อบังคับให้ LLM เริ่มพิมพ์ด้วยเครื่องหมาย # ทันที
        return f"{base_prompt}\n\n{lang_instruction}{goal_text}\n\n[เริ่มสร้าง Markdown Mind Map ทันทีโดยไม่ต้องเกริ่นนำ]:\n"

    def parse_mindmap_markdown(self, markdown_text: str) -> Dict:
        """แปลง markdown hierarchy เป็นโครงสร้าง Mindmap JSON"""
        return self._parse_markdown_hierarchy(markdown_text)

    def _parse_markdown_hierarchy(self, markdown_text: str) -> Dict:
        """Parse markdown hierarchy (# ## ###) into tree structure with parent-child relationships"""
        nodes = []
        edges = []
        node_id_counter = 1
        level_to_node_id = {}  # Map level to current node ID at that level

        lines = markdown_text.split('\n')

        for line in lines:
            line = line.strip()
            if not line or not line.startswith('#'):
                continue

            # Extract level (# ## ### -> 1, 2, 3)
            level = 0
            while level < len(line) and line[level] == '#':
                level += 1
            level -= 1  # Convert to 0-indexed

            # Extract label
            label = line.lstrip('#').strip()
            if not label:
                continue

            node_id = str(node_id_counter)
            node_id_counter += 1

            # Determine parent ID
            parent_id = None
            if level > 0 and level - 1 in level_to_node_id:
                parent_id = level_to_node_id[level - 1]

            # Create node
            node = {
                "id": node_id,
                "label": label,
                "parentId": parent_id,
                "level": level,
                "type": "root" if level == 0 else ("branch" if level == 1 else "leaf"),
                "position": {"x": level * 200, "y": node_id_counter * 100},
                "data": {"label": label}
            }
            nodes.append(node)

            # Add edge if has parent
            if parent_id:
                edge = {
                    "id": f"e{parent_id}-{node_id}",
                    "source": parent_id,
                    "target": node_id,
                    "type": "smoothstep",
                    "animated": True
                }
                edges.append(edge)

            # Update level_to_node_id mapping (clear deeper levels)
            level_to_node_id[level] = node_id
            # Clear deeper levels
            keys_to_delete = [k for k in level_to_node_id if k > level]
            for k in keys_to_delete:
                del level_to_node_id[k]

        # If no nodes generated, return default
        if not nodes:
            return {
                "nodes": [
                    {
                        "id": "1",
                        "label": "หัวข้อหลัก",
                        "parentId": None,
                        "level": 0,
                        "type": "root",
                        "position": {"x": 0, "y": 0},
                        "data": {"label": "หัวข้อหลัก"}
                    }
                ],
                "edges": []
            }

        return {"nodes": nodes, "edges": edges}

    def get_document_status(self, session_id: str, filename: str) -> Dict:
        """ดึงสถานะการประมวลผลเอกสาร"""
        task_id = f"{session_id}_{filename}"
        return doc_status.get(task_id, {
            "status": DocumentStatus.NOT_FOUND,
            "summary": "",
            "mindmap": {"nodes": [], "edges": []}
        })

    async def import_web_sources(self, session_id: str, sources: List[Dict[str, str]]) -> Dict[str, Any]:
        """
        นำ raw_content จากแหล่งข้อมูลเว็บเข้าสู่ RAG pipeline เดิม
        - split เป็น chunks
        - ใส่ metadata source/url
        - ทำ embedding และบันทึกลง ChromaDB ของ session เดิม
        - สร้าง summary อัตโนมัติจากหน้าเว็บนำเข้า
        """
        if not sources:
            return {"imported_sources": [], "summary": ""}

        docs: List[Document] = []
        imported_sources: List[Dict[str, str]] = []
        for item in sources:
            raw_content = str(item.get("raw_content", "")).strip()
            if not raw_content:
                continue

            title = str(item.get("title", "")).strip() or str(item.get("url", "")).strip()
            url = str(item.get("url", "")).strip()
            source = str(item.get("source", "")).strip() or title
            snippet = str(item.get("snippet", "")).strip()

            docs.append(
                Document(
                    text=raw_content,
                    metadata={
                        "file_name": source,
                        "page_label": "web",
                        "session_id": session_id,
                        "source_type": "web",
                        "source": source,
                        "url": url,
                        "title": title,
                        "snippet": snippet,
                    },
                )
            )
            imported_sources.append({
                "title": title,
                "url": url,
                "snippet": snippet,
                "source": source,
            })

        if not docs:
            return {"imported_sources": [], "summary": ""}

        storage_context = vector_store_service.get_session_storage(session_id)
        from app.services.vector_store import thai_tokenizer
        splitter = SentenceSplitter(chunk_size=3000, chunk_overlap=150, tokenizer=thai_tokenizer)
        nodes = splitter.get_nodes_from_documents(docs)
        if not nodes:
            return {"imported_sources": [], "summary": ""}

        index = VectorStoreIndex(
            nodes=nodes,
            storage_context=storage_context,
        )
        vector_store_service.extend_bm25_nodes(session_id, nodes)

        # Generate summary of the imported web sources
        summary = ""
        try:
            web_index = VectorStoreIndex(nodes=nodes)
            summary = await self._generate_summary(web_index)
        except Exception as e:
            print(f"⚠️ [Web Summary Error] {str(e)}")

        return {
            "imported_sources": imported_sources,
            "summary": summary
        }


# Singleton instance
document_processor = DocumentProcessorService()
