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
        max_results: int = 5,
        topic: str = "general",
        time_range: str = None,
        start_date: str = None,
        end_date: str = None,
        country: str = "thailand",
    ) -> List[Dict[str, str]]:
        if not query or not query.strip():
            raise ValueError("query ต้องไม่ว่าง")
        if not session_id or not session_id.strip():
            raise ValueError("session_id ต้องไม่ว่าง")

        client = self._get_client()

        # Smart country query augmentation to bias/force local language and country results
        query_str = query.strip()
        if country and country.strip() and country.strip().lower() != "global":
            c_lower = country.strip().lower()
            if c_lower == "thailand":
                if "ไทย" not in query_str and "thailand" not in query_str.lower():
                    query_str = f"{query_str} ประเทศไทย"
            elif c_lower == "us":
                if "us" not in query_str.lower() and "america" not in query_str.lower() and "สหรัฐ" not in query_str:
                    query_str = f"{query_str} US"
            elif c_lower == "gb":
                if "uk" not in query_str.lower() and "united kingdom" not in query_str.lower() and "อังกฤษ" not in query_str:
                    query_str = f"{query_str} UK"
            elif c_lower == "jp":
                if "japan" not in query_str.lower() and "ญี่ปุ่น" not in query_str:
                    query_str = f"{query_str} Japan"
            elif c_lower == "kr":
                if "korea" not in query_str.lower() and "เกาหลี" not in query_str:
                    query_str = f"{query_str} Korea"
            elif c_lower == "sg":
                if "singapore" not in query_str.lower() and "สิงคโปร์" not in query_str:
                    query_str = f"{query_str} Singapore"

        search_kwargs = {
            "query": query_str,
            "search_depth": search_depth,
            "max_results": max_results,
            "topic": topic,
            "include_raw_content": False,
        }
        if time_range and time_range != "none":
            search_kwargs["time_range"] = time_range
        if start_date:
            search_kwargs["start_date"] = start_date
        if end_date:
            search_kwargs["end_date"] = end_date
        
        # Tavily native country parameter is only available when topic is "general"
        if country and country.strip() and country.strip().lower() != "global" and topic == "general":
            search_kwargs["country"] = country.strip().lower()

        # Enforce local country websites by specifying include_domains list
        if country and country.strip() and country.strip().lower() != "global":
            c_lower = country.strip().lower()
            country_domains = {
                "thailand": [
                    "*.th", "*.co.th", "*.go.th", "*.or.th", "*.in.th", "*.net.th", "*.ac.th",
                    "sanook.com", "kapook.com", "mgronline.com", "workpointtoday.com",
                    "thestandard.co", "pptvhd36.com", "one31.net", "ch7.com", "ch3plus.com",
                    "tnnthailand.com", "thansettakij.com", "posttoday.com", "bangkokbiznews.com",
                    "prachachat.net", "naewna.com", "thaipost.net", "isranews.org", "komchadluek.net",
                    "springnews.co.th", "tnews.co.th", "silpa-mag.com", "gqthailand.com",
                    "matichon.co.th", "khaosod.co.th", "thairath.co.th", "dailynews.co.th"
                ],
                "jp": [
                    "*.jp", "*.co.jp", "*.ne.jp", "*.go.jp", "*.or.jp", 
                    "yahoo.co.jp", "asahi.com", "yomiuri.co.jp", "nikkei.com", "nhk.or.jp",
                    "livedoor.com", "ameblo.jp", "fc2.com", "hatena.ne.jp"
                ],
                "kr": [
                    "*.kr", "*.co.kr", "*.go.kr", "*.or.kr", "*.ne.kr",
                    "naver.com", "daum.net", "chosun.com", "donga.com", "joins.com",
                    "hankyung.com", "mk.co.kr", "seoul.co.kr"
                ],
                "sg": [
                    "*.sg", "*.com.sg", "*.gov.sg", "*.edu.sg",
                    "channelnewsasia.com", "straitstimes.com", "todayonline.com", "vulcanpost.com"
                ],
                "gb": [
                    "*.uk", "*.co.uk", "*.org.uk", "*.gov.uk", 
                    "bbc.co.uk", "theguardian.com", "telegraph.co.uk", "independent.co.uk",
                    "dailymail.co.uk", "mirror.co.uk", "sky.com"
                ]
            }
            if c_lower in country_domains:
                search_kwargs["include_domains"] = country_domains[c_lower]

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
            try:
                extract_response = await asyncio.to_thread(
                    client.extract,
                    urls=missing_urls,
                    include_images=False,
                )
                extracted_items = extract_response.get("results", []) if isinstance(extract_response, dict) else []
            except Exception as e:
                print(f"⚠️ [Tavily Extract Error] {e}. Falling back to search snippets.")
                extracted_items = []

            extracted_by_url = {str(item.get("url", "")).strip(): item for item in extracted_items}

            for url in missing_urls:
                cached_item = session_cache.get(url, {})
                ext_item = extracted_by_url.get(url)
                
                # Get raw content from extraction, or fallback to snippet if extraction failed/empty
                raw_content = ""
                if ext_item:
                    raw_content = str(ext_item.get("raw_content", "")).strip()
                
                if not raw_content:
                    raw_content = cached_item.get("snippet", "")
                
                # If still empty, use a placeholder based on title/url
                if not raw_content:
                    raw_content = f"แหล่งข้อมูลจาก {cached_item.get('title', url)}"

                merged = {
                    "title": cached_item.get("title", url),
                    "url": url,
                    "snippet": cached_item.get("snippet", ""),
                    "source": cached_item.get("source", cached_item.get("title", url)),
                    "raw_content": raw_content,
                }
                session_cache[url] = merged
                resolved.append(merged)

            self._raw_content_cache[clean_session] = session_cache

        resolved_by_url = {item["url"]: item for item in resolved}
        return [resolved_by_url[url] for url in selected if url in resolved_by_url]


web_search_service = WebSearchService()
