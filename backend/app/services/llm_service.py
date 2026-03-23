import asyncio
from typing import Dict
from llama_index.llms.ollama import Ollama
from llama_index.core import VectorStoreIndex
from app.config import settings
from app.services.vector_store import vector_store_service


class LLMService:
    """Service สำหรับจัดการ LLM Operations"""

    def __init__(self):
        self.models_cache = {}

    def get_llm(self, model_name: str) -> Ollama:
        """
        สร้างหรือดึง LLM instance จาก cache

        Args:
            model_name: ชื่อโมเดลที่ต้องการใช้

        Returns:
            Ollama LLM instance
        """
        if model_name not in self.models_cache:
            print(f"🤖 กำลังสร้าง LLM instance สำหรับ: {model_name}")
            self.models_cache[model_name] = Ollama(
                model=model_name,
                base_url=settings.OLLAMA_HOST,
                request_timeout=settings.LLM_REQUEST_TIMEOUT,
                additional_kwargs={"num_ctx": settings.LLM_NUM_CTX}
            )
        return self.models_cache[model_name]

    async def query_with_context(
        self,
        query: str,
        session_id: str,
        model_name: str
    ) -> Dict[str, str]:
        """
        ถามคำถามโดยใช้ context จาก Vector Store

        Args:
            query: คำถามที่ต้องการถาม
            session_id: Session ID สำหรับดึง context
            model_name: ชื่อโมเดลที่ต้องการใช้

        Returns:
            Dict with 'thinking' (optional) and 'answer' keys
        """
        print(f"💬 [Query] {session_id}: {query}")

        # ดึง Storage Context สำหรับ session นี้
        storage_context = vector_store_service.get_session_storage(session_id)

        # สร้าง Index จาก Vector Store
        index = VectorStoreIndex.from_vector_store(
            vector_store=storage_context.vector_store
        )

        from llama_index.core import PromptTemplate

        QA_PROMPT_TMPL = (
            "ข้อมูลจากเอกสาร (Context information) อยู่ด้านล่างนี้\n"
            "---------------------\n"
            "{context_str}\n"
            "---------------------\n"
            "คำสั่ง: จากข้อมูลเอกสารข้างต้น จงตอบคำถามต่อไปนี้\n"
            "หากข้อความจากเอกสารอ่านยากหรือมีการสะกดผิดจากการสแกน ให้คุณพยายามตีความและสรุปใจความเท่าที่ทำได้ "
            "ไม่ต้องตอบว่า 'เนื้อหาอ่านไม่รู้เรื่อง' ยกเว้นว่าจะไม่มีข้อมูลที่เกี่ยวข้องกับคำถามจริงๆ\n"
            "คำถาม: {query_str}\n"
            "คำตอบ: "
        )
        qa_template = PromptTemplate(QA_PROMPT_TMPL)

        # สร้าง Query Engine
        llm = self.get_llm(model_name)
        query_engine = index.as_query_engine(
            llm=llm,
            similarity_top_k=settings.SIMILARITY_TOP_K,
            text_qa_template=qa_template
        )

        # Query
        print(f"🤖 [LLM] กำลังคิดคำตอบด้วย {model_name}...")
        response = await asyncio.to_thread(query_engine.query, query)
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

        print(f"✅ [Response] ตอบคำถามเรียบร้อย")
        return {
            "thinking": thinking,
            "answer": answer
        }


# Singleton instance
llm_service = LLMService()
