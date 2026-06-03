import time
import uuid
from pydantic import BaseModel, Field, EmailStr
from typing import Dict, List, Any, Optional, Literal
from enum import Enum
from datetime import datetime


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
    session_id: Optional[str] = Field(default=None, description="Session ID สำหรับยืนยันสิทธิ์ความเป็นเจ้าของ")


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
    model_name: Optional[str] = Field(
        default=None,
        description="โมเดลสำหรับ action (ถูก ignore; backend ใช้ ACTION_LLM_MODEL เสมอ)",
    )
    user_goal: Optional[str] = Field(default=None, description="เป้าหมายเพิ่มเติมจากผู้ใช้")
    language: str = Field(default="th", description="ภาษา output (th/en)")
    selected_files: Optional[List[str]] = Field(default=None, description="รายชื่อชื่อไฟล์ที่ต้องการดึงข้อมูลสำหรับสร้าง Action")
    detail_level: Optional[str] = Field(default="concise", description="ระดับความละเอียดของเนื้อหา (concise / detailed)")




class ActionGenerateResponse(BaseModel):
    id: Optional[str] = None
    title: Optional[str] = None
    action_type: ActionType
    prompt: str
    answer: str
    thinking: Optional[str] = None
    model_name: str
    citations: Optional[List[Citation]] = None
    created_at: float = Field(default_factory=lambda: time.time() * 1000)


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
    topic: Literal["general", "news"] = Field(
        default="general",
        description="หัวข้อการค้นหา Tavily",
    )
    max_results: int = Field(default=5, ge=1, le=20, description="จำนวนผลลัพธ์สูงสุด")
    time_range: Optional[Literal["day", "week", "month", "year"]] = Field(
        default=None,
        description="ช่วงเวลาที่ต้องการค้นหา",
    )
    start_date: Optional[str] = Field(
        default=None,
        description="วันที่เริ่มต้น (YYYY-MM-DD)",
    )
    end_date: Optional[str] = Field(
        default=None,
        description="วันที่สิ้นสุด (YYYY-MM-DD)",
    )
    country: Optional[str] = Field(
        default="thailand",
        description="ประเทศที่ต้องการค้นหา (เช่น thailand, us, gb, jp, global)",
    )



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
    summary: Optional[str] = None


# ===== Auth Schemas =====

class UserRegisterRequest(BaseModel):
    username: str = Field(..., min_length=3, max_length=100)
    email: str = Field(..., max_length=255)
    password: str = Field(..., min_length=6, max_length=128)


class UserLoginRequest(BaseModel):
    username: str = Field(...)
    password: str = Field(...)


class TokenResponse(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"


class RefreshTokenRequest(BaseModel):
    refresh_token: str


class UserResponse(BaseModel):
    id: uuid.UUID
    username: str
    email: str
    display_name: Optional[str] = None
    avatar_url: Optional[str] = None
    role: str = "user"
    is_active: bool = True
    created_at: datetime

    class Config:
        from_attributes = True


# ===== Session Schemas =====

class ChatSessionCreateRequest(BaseModel):
    title: Optional[str] = None
    session_type: str = Field(default="notebook", description="notebook / arena")
    model_name: Optional[str] = None


class ChatSessionUpdateRequest(BaseModel):
    title: Optional[str] = None
    is_archived: Optional[bool] = None


class ChatMessageResponse(BaseModel):
    id: uuid.UUID
    session_id: uuid.UUID
    role: str
    content: str
    thinking: Optional[str] = None
    model_name: Optional[str] = None
    citations: Optional[Any] = None
    token_count: Optional[int] = None
    created_at: datetime

    class Config:
        from_attributes = True


class ChatSessionResponse(BaseModel):
    id: uuid.UUID
    user_id: uuid.UUID
    title: Optional[str] = None
    session_type: str = "notebook"
    model_name: Optional[str] = None
    is_archived: bool = False
    created_at: datetime
    updated_at: datetime
    messages: Optional[List[ChatMessageResponse]] = None

    class Config:
        from_attributes = True
