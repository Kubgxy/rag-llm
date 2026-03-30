from fastapi import APIRouter, HTTPException, BackgroundTasks

from app.schemas import RuntimeStatusResponse, RuntimeUpdateRequest
from app.services import llm_service, runtime_manager


router = APIRouter(prefix="/runtime", tags=["Runtime"])


@router.get("/status", response_model=RuntimeStatusResponse)
async def get_runtime_status():
    """ดึง runtime device ปัจจุบันของระบบ"""
    return RuntimeStatusResponse(device=runtime_manager.get_runtime())


@router.put("/device", response_model=RuntimeStatusResponse)
async def update_runtime_device(request: RuntimeUpdateRequest, background_tasks: BackgroundTasks):
    """
    เปลี่ยน runtime device แบบ global และมีผลกับทุก session

    หมายเหตุ: จะล้าง LLM cache เพื่อให้ request ถัดไปใช้ device ใหม่ทันที
    """
    try:
        changed = runtime_manager.set_runtime(request.device)
        if changed:
            llm_service.clear_cache()
            # ทำ sync/warmup แบบ background เพื่อลดเวลารอจากหน้า UI
            background_tasks.add_task(
                llm_service.sync_ollama_runners,
                request.device,
                request.model_names,
            )
            print(f"🔁 [Runtime] เปลี่ยน runtime เป็น: {request.device} (global)")
        else:
            print(f"ℹ️ [Runtime] runtime เป็นค่าเดิมอยู่แล้ว: {request.device}")

        return RuntimeStatusResponse(device=runtime_manager.get_runtime())
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
