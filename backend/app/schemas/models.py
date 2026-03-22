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


class ChatResponse(BaseModel):
    query: str
    answer: str
    model_name: Optional[str] = None


class ErrorResponse(BaseModel):
    status: str = "error"
    message: str
