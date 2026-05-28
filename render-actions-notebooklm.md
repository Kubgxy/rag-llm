# Render Actions NotebookLM Flow

## Goal
Render slides + infographic on backend into PNG (base64) using Jinja2 + local Tailwind/Lucide assets + Playwright, then expose a new endpoint and update frontend to show images instead of interactive JSON.

## Tasks
- [ ] Inventory backend/frontend touch points (actions route, services, schemas, UI usage) → Verify: list of files to change captured.
- [ ] Add backend render pipeline: LLM JSON → Jinja2 HTML → Playwright screenshot (16:9 slides, 9:16 infographic) with cache → Verify: render function returns PNG bytes for sample input.
- [ ] Create new FastAPI endpoint for render output (base64 only) and log JSON in backend → Verify: endpoint returns `{image_base64}` for slides/infographic.
- [ ] Add local static assets for Tailwind/Lucide and wire template to them → Verify: Playwright renders icons offline.
- [ ] Update frontend to call new endpoint for slides/infographic and display `<img>` + download → Verify: UI shows image and download works.
- [ ] Update docs/config (README/api-specs) for new endpoint and flow → Verify: docs reflect new payload/response.

## Done When
- [ ] Backend returns base64 PNG for slides + infographic with correct aspect ratios.
- [ ] Frontend displays backend-rendered images and allows download.
- [ ] Logs show LLM JSON for render requests.
