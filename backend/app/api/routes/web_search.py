from fastapi import APIRouter, HTTPException

from app.schemas import WebSearchRequest, WebSearchResponse, WebImportRequest, WebImportResponse
from app.services import web_search_service, document_processor


router = APIRouter(prefix="/web-search", tags=["Web Search"])


@router.post("/preview", response_model=WebSearchResponse)
async def web_search_preview(request: WebSearchRequest):
    try:
        results = await web_search_service.search_preview(
            session_id=request.session_id,
            query=request.query,
            search_depth=request.search_depth,
            include_answer=request.include_answer,
            max_results=request.max_results,
        )
        return WebSearchResponse(
            query=request.query,
            session_id=request.session_id,
            results=results,
            total_results=len(results),
        )
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    except RuntimeError as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from exc
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"ค้นหาเว็บไม่สำเร็จ: {str(exc)}") from exc


@router.post("/import", response_model=WebImportResponse)
async def web_import_sources(request: WebImportRequest):
    try:
        resolved_sources = await web_search_service.resolve_selected_sources(
            session_id=request.session_id,
            urls=request.urls,
        )
        imported_sources = document_processor.import_web_sources(
            session_id=request.session_id,
            sources=resolved_sources,
        )
        imported_count = len(imported_sources)
        return WebImportResponse(
            status="success",
            session_id=request.session_id,
            imported_count=imported_count,
            total_selected=len(request.urls),
            message=f"นำเข้าข้อมูลเว็บสำเร็จ {imported_count}/{len(request.urls)} แหล่ง",
            imported_sources=imported_sources,
        )
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    except RuntimeError as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from exc
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"นำเข้าข้อมูลเว็บไม่สำเร็จ: {str(exc)}") from exc
