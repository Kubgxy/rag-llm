from fastapi import APIRouter, HTTPException, BackgroundTasks
import json
import os
import sys
import subprocess

from app.schemas import (
    RuntimeStatusResponse, 
    RuntimeUpdateRequest, 
    RestartStatusResponse, 
    RestartRequest
)
from app.services import llm_service, runtime_manager
from app.services.runtime_manager import RestartStatus


router = APIRouter(prefix="/runtime", tags=["Runtime"])

# Path สำหรับเก็บ config ที่ต้องการหลัง restart
RESTART_CONFIG_PATH = os.path.join(os.path.dirname(__file__), "..", "..", "restart_config.json")


@router.get("/status", response_model=RuntimeStatusResponse)
async def get_runtime_status():
    """ดึง runtime device ปัจจุบันของระบบ พร้อมจำนวน active requests"""
    return RuntimeStatusResponse(
        device=runtime_manager.get_runtime(),
        active_requests=runtime_manager.get_active_request_count()
    )


@router.put("/device", response_model=RuntimeStatusResponse)
async def update_runtime_device(request: RuntimeUpdateRequest, background_tasks: BackgroundTasks):
    """
    เปลี่ยน runtime device แบบ global และมีผลกับทุก session

    - ถ้า wait_for_pending=True จะรอให้ pending requests เสร็จก่อน (max 120s)
    - ถ้า force=True จะ switch ทันทีโดยไม่สนใจ pending requests
    """
    try:
        # ตรวจสอบว่ามี active requests หรือไม่
        active_count = runtime_manager.get_active_request_count()
        
        if active_count > 0 and request.wait_for_pending and not request.force:
            # รอให้ pending requests เสร็จก่อน
            print(f"⏳ [Runtime] รอให้ {active_count} request(s) เสร็จก่อนสลับ runtime...")
            runtime_manager.set_restart_status(
                RestartStatus.WAITING_REQUESTS,
                f"รอให้ {active_count} คำถามเสร็จก่อน...",
                10
            )
            
            success = await runtime_manager.wait_for_pending_requests(timeout=120.0)
            
            if not success:
                remaining = runtime_manager.get_active_request_count()
                print(f"⚠️ [Runtime] Timeout! ยังมี {remaining} request(s) ค้างอยู่")
                # ดำเนินการต่อแม้ timeout (graceful degradation)
        
        # ดำเนินการ switch
        changed = runtime_manager.set_runtime(request.device)
        if changed:
            runtime_manager.set_restart_status(
                RestartStatus.RESTARTING,
                "กำลังโหลดโมเดลใหม่...",
                50
            )
            
            llm_service.clear_cache()
            
            # ทำ sync/warmup แบบ background (sync function ไม่ต้อง await)
            def warmup_and_reset():
                try:
                    llm_service.sync_ollama_runners(
                        request.device,
                        request.model_names or [],
                    )
                finally:
                    runtime_manager.reset_restart_status()
            
            background_tasks.add_task(warmup_and_reset)
            print(f"🔁 [Runtime] เปลี่ยน runtime เป็น: {request.device} (global)")
        else:
            runtime_manager.reset_restart_status()
            print(f"ℹ️ [Runtime] runtime เป็นค่าเดิมอยู่แล้ว: {request.device}")

        return RuntimeStatusResponse(
            device=runtime_manager.get_runtime(),
            active_requests=runtime_manager.get_active_request_count()
        )
    except ValueError as e:
        runtime_manager.reset_restart_status()
        raise HTTPException(status_code=400, detail=str(e))


@router.get("/restart-status", response_model=RestartStatusResponse)
async def get_restart_status():
    """ดึงสถานะ restart/switch process ปัจจุบัน สำหรับ polling จาก frontend"""
    status_data = runtime_manager.get_restart_status()
    return RestartStatusResponse(**status_data)


@router.post("/restart", response_model=RestartStatusResponse)
async def restart_backend(request: RestartRequest, background_tasks: BackgroundTasks):
    """
    Restart backend server พร้อมเปลี่ยน runtime (optional)
    
    หมายเหตุ: ใช้สำหรับกรณีที่ต้องการ restart จริงๆ เท่านั้น
    สำหรับการ switch runtime ปกติ ใช้ PUT /runtime/device แทน
    """
    try:
        active_count = runtime_manager.get_active_request_count()
        
        # บันทึก config ที่ต้องการหลัง restart
        restart_config = {
            "device": request.device,
            "model_names": request.model_names or []
        }
        
        # รอให้ pending requests เสร็จก่อน
        if active_count > 0:
            runtime_manager.set_restart_status(
                RestartStatus.WAITING_REQUESTS,
                f"รอให้ {active_count} คำถามเสร็จก่อน restart...",
                10
            )
            
            success = await runtime_manager.wait_for_pending_requests(timeout=120.0)
            if not success:
                print(f"⚠️ [Restart] Timeout waiting for requests")
        
        # บันทึก config
        runtime_manager.set_restart_status(
            RestartStatus.SHUTTING_DOWN,
            "กำลังบันทึกการตั้งค่า...",
            30
        )
        
        with open(RESTART_CONFIG_PATH, "w", encoding="utf-8") as f:
            json.dump(restart_config, f)
        
        print(f"📝 [Restart] บันทึก config: {restart_config}")
        
        # เริ่ม restart process แบบ background
        def do_restart():
            runtime_manager.set_restart_status(
                RestartStatus.RESTARTING,
                "กำลัง restart backend...",
                50
            )
            
            # ใช้ subprocess เพื่อ spawn process ใหม่แล้ว exit ตัวเก่า
            python = sys.executable
            script = os.path.join(os.path.dirname(__file__), "..", "..", "run.py")
            
            # Spawn new process
            subprocess.Popen(
                [python, script],
                cwd=os.path.dirname(script),
                creationflags=subprocess.CREATE_NEW_PROCESS_GROUP if os.name == 'nt' else 0,
                start_new_session=True if os.name != 'nt' else False
            )
            
            # Exit current process after short delay
            import time
            time.sleep(1)
            os._exit(0)
        
        background_tasks.add_task(do_restart)
        
        return RestartStatusResponse(
            status=RestartStatus.SHUTTING_DOWN.value,
            message="กำลังเริ่ม restart...",
            progress=40,
            active_requests=0
        )
        
    except Exception as e:
        runtime_manager.reset_restart_status()
        raise HTTPException(status_code=500, detail=f"Restart failed: {str(e)}")
