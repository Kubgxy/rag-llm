import os
import json
import re
import asyncio
from typing import Dict
from llama_index.core import Document, VectorStoreIndex
from app.config import settings
from app.utils.ocr import extract_text_from_pdf
from app.services.vector_store import vector_store_service
from app.services.llm_service import llm_service
from app.schemas.models import DocumentStatus, Mindmap, MindmapNode


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
        - สร้าง Summary และ Mindmap

        Args:
            file_path: Path ของไฟล์
            filename: ชื่อไฟล์
            session_id: Session ID
        """
        task_id = f"{session_id}_{filename}"

        try:
            # 1. สกัดข้อความ
            print(f"\n📄 [Task] เริ่มสกัดข้อความจาก: {filename}")
            extracted_text = extract_text_from_pdf(file_path)

            if not extracted_text or len(extracted_text.strip()) < 10:
                raise ValueError("ไม่สามารถสกัดข้อความจากไฟล์ได้")

            # สร้าง Document
            doc = Document(
                text=extracted_text,
                metadata={"file_name": filename, "session_id": session_id}
            )

            # 2. สร้าง Vector Index
            print(f"🔍 [Task] กำลังสร้าง Vector Index...")
            storage_context = vector_store_service.get_session_storage(session_id)
            index = VectorStoreIndex.from_documents(
                [doc],
                storage_context=storage_context
            )

            # 3. เปลี่ยนสถานะเป็น ready_for_chat (ช่วงนี้สามารถเริ่มแชทได้แล้ว)
            doc_status[task_id] = {
                "status": DocumentStatus.READY_FOR_CHAT,
                "summary": "⏳ AI กำลังสรุปเนื้อหาและสร้าง Mindmap อยู่เบื้องหลัง คุณสามารถเริ่มพิมพ์ถามตอบได้เลย...",
                "mindmap": {"nodes": [], "edges": []}
            }
            print(f"✅ [Index] {filename} สร้าง Vector เสร็จแล้ว (เริ่มแชทได้เลย)!")

            # 4. สร้าง Summary (Background)
            print(f"⏳ [LLM] กำลังสร้าง Summary...")
            summary = asyncio.run(self._generate_summary(index))

            # 5. สร้าง Mindmap (Background)
            print(f"⏳ [LLM] กำลังสร้าง Mindmap...")
            mindmap = asyncio.run(self._generate_mindmap(index))

            # 6. อัพเดทสถานะเป็น completed
            doc_status[task_id] = {
                "status": DocumentStatus.COMPLETED,
                "summary": summary,
                "mindmap": mindmap
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

    async def _generate_summary(self, index: VectorStoreIndex) -> str:
        """สร้างสรุปเนื้อหา"""
        try:
            llm = llm_service.get_llm(settings.DEFAULT_LLM_MODEL)
            query_engine = index.as_query_engine(
                llm=llm,
                similarity_top_k=3
            )

            prompt = "สรุปเนื้อหาสำคัญ 5 ข้อเป็นภาษาไทยแบบกระชับ"
            response = await asyncio.to_thread(query_engine.query, prompt)
            return str(response)

        except Exception as e:
            print(f"⚠️ [Summary Error] {str(e)}")
            return "ไม่สามารถสร้างสรุปได้"

    async def _generate_mindmap(self, index: VectorStoreIndex) -> Dict:
        """สร้าง Mindmap JSON"""
        try:
            llm = llm_service.get_llm(settings.DEFAULT_LLM_MODEL)
            query_engine = index.as_query_engine(
                llm=llm,
                similarity_top_k=3
            )

            prompt = """Extract mindmap data in ONLY valid JSON format.
Example: {"nodes": [{"id": "1", "data": {"label": "topic"}}, {"id": "2", "data": {"label": "subtopic"}}], "edges": [{"id": "e1", "source": "1", "target": "2"}]}
Do not say anything else. Return only JSON."""

            response = await asyncio.to_thread(query_engine.query, prompt)

            # พยายามแกะ JSON ออกมา
            json_match = re.search(r'\{.*\}', str(response), re.DOTALL)
            if json_match:
                try:
                    mindmap_json = json.loads(json_match.group(0))
                    return mindmap_json
                except json.JSONDecodeError:
                    pass

            # ถ้าแกะไม่ได้ ให้ return default
            return {
                "nodes": [
                    {"id": "1", "data": {"label": "ไม่สามารถสร้าง Mindmap ได้"}}
                ],
                "edges": []
            }

        except Exception as e:
            print(f"⚠️ [Mindmap Error] {str(e)}")
            return {
                "nodes": [
                    {"id": "1", "data": {"label": "เกิดข้อผิดพลาด"}}
                ],
                "edges": []
            }

    def get_document_status(self, session_id: str, filename: str) -> Dict:
        """ดึงสถานะการประมวลผลเอกสาร"""
        task_id = f"{session_id}_{filename}"
        return doc_status.get(task_id, {
            "status": DocumentStatus.NOT_FOUND,
            "summary": "",
            "mindmap": {"nodes": [], "edges": []}
        })


# Singleton instance
document_processor = DocumentProcessorService()
