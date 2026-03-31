from threading import RLock
from typing import Set, Optional
from enum import Enum
import asyncio
import time
import uuid

from app.config import settings


class RestartStatus(str, Enum):
    """สถานะของ restart process"""
    IDLE = "idle"
    WAITING_REQUESTS = "waiting_requests"
    SHUTTING_DOWN = "shutting_down"
    RESTARTING = "restarting"
    READY = "ready"


class RuntimeManager:
    """จัดการ runtime device แบบ global ให้มีผลกับทุก session"""

    def __init__(self):
        self._lock = RLock()
        self._runtime_device = settings.LLM_RUNTIME_DEVICE
        
        # Request tracking
        self._active_requests: Set[str] = set()
        
        # Restart status tracking
        self._restart_status = RestartStatus.IDLE
        self._restart_message = ""
        self._restart_progress = 0  # 0-100

    def get_runtime(self) -> str:
        with self._lock:
            return self._runtime_device

    def set_runtime(self, device: str) -> bool:
        """
        ตั้งค่า runtime ใหม่

        Returns:
            bool: True ถ้ามีการเปลี่ยนค่า, False ถ้าค่าเดิม
        """
        if device not in {"cpu", "gpu"}:
            raise ValueError("Runtime device ต้องเป็น 'cpu' หรือ 'gpu' เท่านั้น")

        with self._lock:
            if self._runtime_device == device:
                return False
            self._runtime_device = device
            return True

    # ===== Request Tracking Methods =====
    
    def register_request(self, request_id: Optional[str] = None) -> str:
        """ลงทะเบียน active request และ return request_id"""
        if request_id is None:
            request_id = str(uuid.uuid4())
        with self._lock:
            self._active_requests.add(request_id)
        return request_id
    
    def unregister_request(self, request_id: str) -> None:
        """ยกเลิกการลงทะเบียน request เมื่อเสร็จสิ้น"""
        with self._lock:
            self._active_requests.discard(request_id)
    
    def get_active_request_count(self) -> int:
        """จำนวน request ที่ active อยู่"""
        with self._lock:
            return len(self._active_requests)
    
    def has_active_requests(self) -> bool:
        """ตรวจสอบว่ามี active requests หรือไม่"""
        with self._lock:
            return len(self._active_requests) > 0
    
    async def wait_for_pending_requests(self, timeout: float = 120.0) -> bool:
        """
        รอให้ pending requests เสร็จทั้งหมด
        
        Args:
            timeout: เวลาสูงสุดที่จะรอ (วินาที)
            
        Returns:
            bool: True ถ้าไม่มี pending requests แล้ว, False ถ้า timeout
        """
        start_time = time.time()
        
        while self.has_active_requests():
            elapsed = time.time() - start_time
            if elapsed >= timeout:
                return False
            
            remaining = min(1.0, timeout - elapsed)
            await asyncio.sleep(remaining)
        
        return True

    # ===== Restart Status Methods =====
    
    def get_restart_status(self) -> dict:
        """ดึงสถานะ restart ปัจจุบัน"""
        with self._lock:
            return {
                "status": self._restart_status.value,
                "message": self._restart_message,
                "progress": self._restart_progress,
                "active_requests": len(self._active_requests)
            }
    
    def set_restart_status(
        self, 
        status: RestartStatus, 
        message: str = "", 
        progress: int = 0
    ) -> None:
        """อัพเดทสถานะ restart"""
        with self._lock:
            self._restart_status = status
            self._restart_message = message
            self._restart_progress = max(0, min(100, progress))
    
    def reset_restart_status(self) -> None:
        """รีเซ็ตสถานะ restart กลับเป็น idle"""
        self.set_restart_status(RestartStatus.IDLE, "", 0)


runtime_manager = RuntimeManager()
