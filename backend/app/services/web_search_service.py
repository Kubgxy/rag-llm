import asyncio
from typing import Any, Dict, List

from app.config import settings


class WebSearchService:
    def __init__(self):
        self._client = None
        self._raw_content_cache: Dict[str, Dict[str, Dict[str, str]]] = {}

    def _get_client(self):
        if self._client is not None:
            return self._client

        if not settings.TAVILY_API_KEY:
            raise RuntimeError("ยังไม่ได้ตั้งค่า TAVILY_API_KEY")

        try:
            from tavily import TavilyClient
        except ImportError as exc:
            raise RuntimeError("ยังไม่ได้ติดตั้งแพ็กเกจ tavily-python") from exc

        self._client = TavilyClient(settings.TAVILY_API_KEY)
        return self._client

    @staticmethod
    def _normalize_results(raw_results: List[Dict[str, Any]]) -> List[Dict[str, str]]:
        normalized: List[Dict[str, str]] = []
        for item in raw_results:
            url = str(item.get("url", "")).strip()
            if not url:
                continue

            normalized.append(
                {
                    "title": str(item.get("title", "")).strip() or url,
                    "url": url,
                    "snippet": str(item.get("content", "")).strip(),
                    "source": str(item.get("source", "")).strip(),
                    "raw_content": str(item.get("raw_content", "")).strip(),
                }
            )
        return normalized

    async def search_preview(
        self,
        session_id: str,
        query: str,
        search_depth: str = "basic",
        include_answer: str = "none",
        max_results: int = 10,
    ) -> List[Dict[str, str]]:
        if not query or not query.strip():
            raise ValueError("query ต้องไม่ว่าง")
        if not session_id or not session_id.strip():
            raise ValueError("session_id ต้องไม่ว่าง")

        client = self._get_client()
        search_kwargs = {
            "query": query.strip(),
            "search_depth": search_depth,
            "max_results": max_results,
            "include_raw_content": True,
        }
        if include_answer != "none":
            search_kwargs["include_answer"] = include_answer

        response = await asyncio.to_thread(client.search, **search_kwargs)
        normalized = self._normalize_results(response.get("results", []))

        session_cache: Dict[str, Dict[str, str]] = {}
        preview_results: List[Dict[str, str]] = []
        for item in normalized:
            url = item["url"]
            session_cache[url] = {
                "title": item["title"],
                "url": url,
                "snippet": item["snippet"],
                "source": item["source"],
                "raw_content": item["raw_content"],
            }
            preview_results.append(
                {
                    "title": item["title"],
                    "url": url,
                    "snippet": item["snippet"],
                    "source": item["source"],
                }
            )

        self._raw_content_cache[session_id.strip()] = session_cache
        return preview_results

    async def resolve_selected_sources(self, session_id: str, urls: List[str]) -> List[Dict[str, str]]:
        if not urls:
            return []
        if not session_id or not session_id.strip():
            raise ValueError("session_id ต้องไม่ว่าง")

        clean_session = session_id.strip()
        session_cache = self._raw_content_cache.get(clean_session, {})
        selected = [str(url).strip() for url in urls if str(url).strip()]

        resolved: List[Dict[str, str]] = []
        missing_urls: List[str] = []

        for url in selected:
            item = session_cache.get(url)
            if item and item.get("raw_content"):
                resolved.append(item)
            else:
                missing_urls.append(url)

        if missing_urls:
            client = self._get_client()
            extract_response = await asyncio.to_thread(
                client.extract,
                urls=missing_urls,
                include_images=False,
            )
            extracted_items = extract_response.get("results", []) if isinstance(extract_response, dict) else []
            for item in extracted_items:
                url = str(item.get("url", "")).strip()
                raw_content = str(item.get("raw_content", "")).strip()
                if not url or not raw_content:
                    continue

                merged = {
                    "title": str(item.get("title", "")).strip() or url,
                    "url": url,
                    "snippet": str(item.get("content", "")).strip(),
                    "source": str(item.get("source", "")).strip(),
                    "raw_content": raw_content,
                }
                session_cache[url] = merged
                resolved.append(merged)

            self._raw_content_cache[clean_session] = session_cache

        resolved_by_url = {item["url"]: item for item in resolved}
        return [resolved_by_url[url] for url in selected if url in resolved_by_url]


web_search_service = WebSearchService()
