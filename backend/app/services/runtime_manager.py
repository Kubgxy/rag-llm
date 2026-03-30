from threading import RLock

from app.config import settings


class RuntimeManager:
    """จัดการ runtime device แบบ global ให้มีผลกับทุก session"""

    def __init__(self):
        self._lock = RLock()
        self._runtime_device = settings.LLM_RUNTIME_DEVICE

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


runtime_manager = RuntimeManager()
