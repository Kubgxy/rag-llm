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
            elif settings.OLLAMA_NUM_GPU >= 0:
                additional_kwargs["num_gpu"] = settings.OLLAMA_NUM_GPU

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
        model_name: str
    ) -> Dict[str, Any]:
        """
        ถามคำถามโดยใช้ context จาก Vector Store

        Args:
            query: คำถามที่ต้องการถาม
            session_id: Session ID สำหรับดึง context
            model_name: ชื่อโมเดลที่ต้องการใช้

        Returns:
            Dict with 'thinking' (optional) and 'answer' keys
        """
        start_time = time.time()
        print(f"💬 [Query] {session_id}: {query}")

        # ดึง Storage Context สำหรับ session นี้
        t1 = time.time()
        storage_context = vector_store_service.get_session_storage(session_id)
        print(f"   ⏱️ Get storage: {time.time() - t1:.2f}s")

        # สร้าง Index จาก Vector Store
        t1 = time.time()
        index = VectorStoreIndex.from_vector_store(
            vector_store=storage_context.vector_store
        )
        print(f"   ⏱️ Create index: {time.time() - t1:.2f}s")

        # 1. Vector Retriever
        vector_retriever = index.as_retriever(similarity_top_k=3)

        # 2. BM25 Retriever
        bm25_retriever = vector_store_service.get_bm25_retriever(session_id)

        # ดึง LLM มาเตรียมไว้สำหรับ Retriever / Synthesizer
        llm = self.get_llm(model_name)

        # 4. FlashRank Reranker (Cross-Encoder)
        if hasattr(self, 'reranker') and self.reranker:
            # Update top_n if it differs from current setting
            if self.reranker.top_n != settings.SIMILARITY_TOP_K:
                print(f"🔧 Updating FlashRank top_n from {self.reranker.top_n} to {settings.SIMILARITY_TOP_K}")
                # Create new instance with updated top_n
                import os
                cache_dir = os.path.join(vector_store_service.bm25_persist_dir, "flashrank_models")
                self.reranker = FlashrankReranker(
                    top_n=settings.SIMILARITY_TOP_K,
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

        QA_PROMPT_TMPL = (
            "ข้อมูลจากเอกสาร (Context information) อยู่ด้านล่างนี้\n"
            "---------------------\n"
            "{context_str}\n"
            "---------------------\n"
            "คำสั่ง: จากข้อมูลเอกสารข้างต้น จงตอบคำถามต่อไปนี้\n"
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
                    similarity_top_k=4
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
        try:
            response = await asyncio.to_thread(query_engine.query, query)
        except Exception as e:
            # ถ้า GPU memory ไม่พอ ให้ fallback CPU อัตโนมัติและ retry 1 ครั้ง
            if self.fallback_to_cpu_if_needed(e):
                llm = self.get_llm(model_name)
                query_engine = build_query_engine(llm)
                response = await asyncio.to_thread(query_engine.query, query)
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
                file_name = metadata.get("file_name", "Unknown File")
                page_label = metadata.get("page_label", "N/A")
                score = getattr(node, 'score', None)
                source_id = f"{file_name}_{page_label}"
                
                if source_id not in seen_sources:
                    seen_sources.add(source_id)
                    citations.append({
                        "file_name": file_name,
                        "page_label": page_label,
                        "text_snippet": node.node.get_text()[:200] + "...", 
                        "similarity_score": float(score) if score is not None else None
                    })

        return {
            "thinking": thinking,
            "answer": answer,
            "citations": citations
        }


# Singleton instance
llm_service = LLMService()
