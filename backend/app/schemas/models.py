from pydantic import BaseModel, Field
from typing import Dict, List, Any, Optional
from enum import Enum


class DocumentStatus(str, Enum):
    PROCESSING = "processing"
    READY_FOR_CHAT = "ready_for_chat"
    COMPLETED = "completed"
    ERROR = "error"
    NOT_FOUND = "not_found"


class MindmapNode(BaseModel):
    id: str
    data: Dict[str, Any]


class MindmapEdge(BaseModel):
    id: Optional[str] = None
    source: Optional[str] = None
    target: Optional[str] = None


class Mindmap(BaseModel):
    nodes: List[MindmapNode] = []
    edges: List[MindmapEdge] = []


class DocumentStatusResponse(BaseModel):
    status: DocumentStatus
    summary: str = ""
    mindmap: Mindmap = Mindmap()
    message: Optional[str] = None


class UploadResponse(BaseModel):
    status: str
    filename: str
    session_id: str
    message: Optional[str] = None


class ChatRequest(BaseModel):
    query: str = Field(..., description="คำถามที่ต้องการถาม")
    model_name: str = Field(..., description="ชื่อโมเดล LLM")
    session_id: str = Field(..., description="Session ID สำหรับแยกแชท")


class RuntimeStatusResponse(BaseModel):
    device: str = Field(..., description="Runtime device ปัจจุบัน (cpu/gpu)")


class RuntimeUpdateRequest(BaseModel):
    device: str = Field(..., description="Runtime device ใหม่ (cpu/gpu)")
    model_names: Optional[List[str]] = Field(
        default=None,
        description="รายชื่อโมเดลที่ต้องการ warmup หลังสลับ runtime"
    )


class Citation(BaseModel):
    file_name: str
    page_label: str
    text_snippet: Optional[str] = None
    similarity_score: Optional[float] = None


class ChatResponse(BaseModel):
    query: str
    answer: str
    thinking: Optional[str] = None
    model_name: Optional[str] = None
    citations: Optional[List[Citation]] = None


class ChatTitleRequest(BaseModel):
    query: str = Field(..., description="ประโยคแรกของผู้ใช้")
    model_name: Optional[str] = Field(default="typhoon-2.5", description="โมเดล LLM ที่ใช้สร้างชื่อ")


class CompareRequest(BaseModel):
    query: str = Field(..., description="คำถามที่ต้องการถาม")
    model_a: str = Field(..., description="ชื่อโมเดล A")
    model_b: str = Field(..., description="ชื่อโมเดล B")
    session_id: str = Field(..., description="Session ID สำหรับแยกแชท")


class CompareResponse(BaseModel):
    query: str
    response_a: ChatResponse
    response_b: ChatResponse


class ErrorResponse(BaseModel):
    status: str = "error"
    message: str
