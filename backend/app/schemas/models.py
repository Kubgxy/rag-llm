from pydantic import BaseModel, Field
from typing import Dict, List, Any, Optional, Literal
from enum import Enum


class DocumentStatus(str, Enum):
    PROCESSING = "processing"
    READY_FOR_CHAT = "ready_for_chat"
    COMPLETED = "completed"
    ERROR = "error"
    NOT_FOUND = "not_found"


class ActionType(str, Enum):
    MINDMAP = "mindmap"
    CHART = "chart"
    SLIDES = "slides"
    INFOGRAPHIC = "infographic"


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
    active_requests: int = Field(default=0, description="จำนวน LLM requests ที่ active อยู่")


class RuntimeUpdateRequest(BaseModel):
    device: str = Field(..., description="Runtime device ใหม่ (cpu/gpu)")
    model_names: Optional[List[str]] = Field(
        default=None,
        description="รายชื่อโมเดลที่ต้องการ warmup หลังสลับ runtime"
    )
    wait_for_pending: bool = Field(
        default=True,
        description="รอให้ pending requests เสร็จก่อน switch หรือไม่"
    )
    force: bool = Field(
        default=False,
        description="บังคับ switch ทันทีโดยไม่รอ pending requests"
    )


class RestartStatusResponse(BaseModel):
    status: str = Field(..., description="สถานะ restart (idle/waiting_requests/shutting_down/restarting/ready)")
    message: str = Field(default="", description="ข้อความสถานะปัจจุบัน")
    progress: int = Field(default=0, description="Progress 0-100")
    active_requests: int = Field(default=0, description="จำนวน requests ที่ active")


class RestartRequest(BaseModel):
    device: Optional[str] = Field(default=None, description="Runtime device ใหม่หลัง restart (cpu/gpu)")
    model_names: Optional[List[str]] = Field(
        default=None,
        description="รายชื่อโมเดลที่ต้องการ warmup หลัง restart"
    )


class Citation(BaseModel):
    file_name: str
    page_label: str
    text_snippet: Optional[str] = None
    similarity_score: Optional[float] = None
    source_type: Optional[Literal["pdf", "web"]] = None
    url: Optional[str] = None


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


class ActionGenerateRequest(BaseModel):
    session_id: str = Field(..., description="Session ID สำหรับแยกชุดเอกสาร")
    action_type: ActionType = Field(..., description="ประเภท action ที่ต้องการสร้าง")
    model_name: Optional[str] = Field(default=None, description="โมเดลสำหรับ action โดยเฉพาะ (optional)")
    user_goal: Optional[str] = Field(default=None, description="เป้าหมายเพิ่มเติมจากผู้ใช้")
    language: str = Field(default="th", description="ภาษา output (th/en)")


class ActionGenerateResponse(BaseModel):
    action_type: ActionType
    prompt: str
    answer: str
    thinking: Optional[str] = None
    model_name: str
    citations: Optional[List[Citation]] = None


class ErrorResponse(BaseModel):
    status: str = "error"
    message: str


class WebSearchRequest(BaseModel):
    query: str = Field(..., min_length=1, max_length=500, description="คีย์เวิร์ดที่ต้องการค้นหา")
    session_id: str = Field(..., min_length=1, description="Session ID สำหรับ cache ผลค้นหาเว็บ")
    search_depth: Literal["basic", "advanced"] = Field(
        default="basic",
        description="ระดับความลึกของการค้นหา Tavily",
    )
    include_answer: Literal["none", "basic", "advanced"] = Field(
        default="none",
        description="ระดับการให้คำตอบสรุปจาก Tavily",
    )
    max_results: int = Field(default=10, ge=1, le=20, description="จำนวนผลลัพธ์สูงสุด")


class WebSearchResult(BaseModel):
    title: str
    url: str
    snippet: str
    source: str = ""


class WebSearchResponse(BaseModel):
    query: str
    session_id: str
    results: List[WebSearchResult]
    total_results: int


class WebImportRequest(BaseModel):
    session_id: str = Field(..., min_length=1, description="Session ID สำหรับนำข้อมูลเข้า collection เดิม")
    urls: List[str] = Field(..., min_length=1, description="รายการ URL ที่ผู้ใช้เลือกนำเข้า")


class WebImportResponse(BaseModel):
    status: str
    session_id: str
    imported_count: int
    total_selected: int
    message: str
    imported_sources: List[WebSearchResult] = []
