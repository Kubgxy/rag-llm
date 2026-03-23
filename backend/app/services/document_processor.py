import os
import json
import re
import asyncio
from typing import Dict, List, Optional
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
        """สร้าง Mindmap JSON พร้อม hierarchy structure"""
        try:
            llm = llm_service.get_llm(settings.DEFAULT_LLM_MODEL)
            query_engine = index.as_query_engine(
                llm=llm,
                similarity_top_k=3
            )

            # Request structured markdown hierarchy
            prompt = """สรุปเนื้อหาเอกสารเป็น Mind Map ให้ mีหัวข้อหลัก 1 อัน แล้วแตกออกเป็นหัวข้อรองลงมา 3-4 อัน แต่ละหัวข้อก็แตกเป็นข้อย่อยๆ 2-3 อัน
ใช้รูปแบบ Markdown ตามตัวอย่าง (เพียงชื่อหัวข้อเท่านั้น ไม่มีรายละเอียด):
# หัวข้อหลัก
## หัวข้อรองที่ 1
### บรรทัดรายละเอียด 1.1
### บรรทัดรายละเอียด 1.2
## หัวข้อรองที่ 2
### บรรทัดรายละเอียด 2.1

ให้สร้างโครงสร้างนี้จากเนื้อหาเอกสาร:"""

            response = await asyncio.to_thread(query_engine.query, prompt)
            hierarchy_text = str(response)

            # Parse markdown hierarchy เป็น tree structure
            mindmap = self._parse_markdown_hierarchy(hierarchy_text)
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


# Singleton instance
document_processor = DocumentProcessorService()
