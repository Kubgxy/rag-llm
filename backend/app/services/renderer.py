import asyncio
import base64
import os
import json
import sys
from jinja2 import Template
from concurrent.futures import ThreadPoolExecutor

# พยายาม Import playwright เพื่อความปลอดภัยในการรันกรณีที่ผู้ใช้ยังไม่ว่างติดตั้ง
try:
    from playwright.async_api import async_playwright
    PLAYWRIGHT_AVAILABLE = True
except ImportError:
    PLAYWRIGHT_AVAILABLE = False
    print("⚠️ [Renderer Warning] 'playwright' is not installed yet. Rendering will use fallback.")

# -------------------------------------------------------------
# 1. JINJA2 HTML TEMPLATE สำหรับ "สไลด์"
# -------------------------------------------------------------
SLIDES_HTML_TEMPLATE = """
<!DOCTYPE html>
<html lang="th">
<head>
  <meta charset="UTF-8">
  <title>{{ title }}</title>
  <!-- Load Tailwind CSS CDN -->
  <script src="https://cdn.tailwindcss.com"></script>
  <!-- Load Lucide Icons Script -->
  <script src="https://unpkg.com/lucide@latest"></script>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&family=Sarabun:wght@300;400;500;600;700&display=swap');
    
    html, body {
      width: 1200px;
      height: 800px;
      overflow: hidden;
      margin: 0;
      padding: 0;
      font-family: 'Sarabun', 'Inter', sans-serif;
    }
  </style>
</head>
<body class="bg-gradient-to-br from-[#0b0f19] via-[#111827] to-[#1e1b4b] text-slate-100 p-8 flex flex-col justify-between">

  <!-- TOP DECK HEADER -->
  <div class="flex items-center justify-between border-b border-slate-800 pb-4 mb-4">
    <div class="flex items-center gap-3">
      <div class="w-10 h-10 rounded-xl bg-indigo-600/20 border border-indigo-500/40 flex items-center justify-center">
        <i data-lucide="presentation" class="w-5 h-5 text-indigo-400"></i>
      </div>
      <div>
        <h1 class="text-xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-white via-indigo-200 to-indigo-400">{{ title }}</h1>
        {% if audience %}
        <p class="text-xs text-slate-400">กลุ่มเป้าหมาย: {{ audience }}</p>
        {% endif %}
      </div>
    </div>
    <span class="text-xs font-medium px-2.5 py-1 rounded-full bg-indigo-500/10 text-indigo-300 border border-indigo-500/20">
      Slide Presentation Deck
    </span>
  </div>

  <!-- SLIDES GRID CANVAS -->
  <div class="flex-1 min-h-0 flex gap-6">
    <!-- LEFT SIDEBAR: SUMMARY & METRICS -->
    <div class="w-[280px] bg-slate-900/55 border border-slate-800/80 rounded-2xl p-5 flex flex-col justify-between backdrop-blur-md">
      <div>
        <h2 class="text-xs font-bold text-indigo-400 uppercase tracking-wider mb-2">บทนำ & ข้อมูลสรุป</h2>
        <p class="text-xs text-slate-300 leading-relaxed">
          สไลด์ชุดนี้นำเสนอหัวข้อ <strong>"{{ title }}"</strong> ย่อยเนื้อหาสำคัญจากข้อมูล RAG ออกเป็น {{ slides|length }} หน้าสไลด์กระชับ เพื่อการนำเสนอที่ทรงพลังที่สุด
        </p>
        
        <div class="mt-6 space-y-4">
          <div class="flex items-center gap-3 bg-slate-800/45 p-3 rounded-xl border border-slate-700/50">
            <i data-lucide="layers" class="w-5 h-5 text-indigo-400"></i>
            <div>
              <p class="text-[10px] text-slate-400">จำนวนสไลด์ทั้งหมด</p>
              <p class="text-sm font-bold text-white">{{ slides|length }} หน้า</p>
            </div>
          </div>
          <div class="flex items-center gap-3 bg-slate-800/45 p-3 rounded-xl border border-slate-700/50">
            <i data-lucide="users" class="w-5 h-5 text-indigo-400"></i>
            <div>
              <p class="text-[10px] text-slate-400">ผู้ฟังเป้าหมายหลัก</p>
              <p class="text-xs font-bold text-white truncate max-w-[170px]" title="{{ audience }}">{{ audience or 'ทั่วไป' }}</p>
            </div>
          </div>
        </div>
      </div>
      
      <div class="border-t border-slate-800 pt-4 flex items-center gap-2">
        <div class="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></div>
        <p class="text-[10px] text-slate-400 font-mono uppercase">Rendered by NotebookLM Engine</p>
      </div>
    </div>

    <!-- RIGHT CONTAINER: DYNAMIC SLIDE CARDS -->
    <div class="flex-1 grid {% if slides|length <= 4 %}grid-cols-2 gap-4{% elif slides|length <= 6 %}grid-cols-3 gap-3{% else %}grid-cols-4 gap-2{% endif %} min-h-0">
      {% for slide in slides %}
      <div class="bg-gradient-to-b from-slate-900/90 to-slate-950/95 border border-slate-800 hover:border-indigo-500/50 rounded-2xl p-4 flex flex-col justify-between relative overflow-hidden transition-all duration-300">
        <!-- Accent Glow at top of card -->
        <div class="absolute top-0 left-0 right-0 h-[3px] bg-gradient-to-r from-indigo-500 to-cyan-500"></div>

        <div>
          <!-- Slide Title with Icon -->
          <div class="flex items-start justify-between gap-2 mb-3">
            <h3 class="text-xs font-bold text-white leading-tight min-h-[32px] line-clamp-2">{{ slide.slide_title }}</h3>
            <div class="w-7 h-7 rounded-lg bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center shrink-0">
              <i data-lucide="{{ slide.icon_name or 'file-text' }}" class="w-3.5 h-3.5 text-indigo-400"></i>
            </div>
          </div>

          <!-- Slide Description -->
          {% if slide.slide_description %}
          <p class="text-[9px] text-slate-400 bg-slate-950/40 border-l border-indigo-500/40 pl-2 py-1 mb-2.5 rounded-r leading-relaxed italic line-clamp-2">
            {{ slide.slide_description }}
          </p>
          {% endif %}

          <!-- Bullet Points -->
          <ul class="space-y-2">
            {% for pt in slide.key_points %}
            <li class="flex items-start gap-1.5 text-[10px] text-slate-300 leading-relaxed">
              <span class="mt-1 w-1.5 h-1.5 rounded-full bg-indigo-400 shrink-0"></span>
              <span class="line-clamp-3">{{ pt }}</span>
            </li>
            {% endfor %}
          </ul>
        </div>

        <!-- Slide Number Indicator -->
        <div class="absolute bottom-2 right-3 text-[9px] font-bold text-slate-600 font-mono">
          #{{ slide.slide_number }}
        </div>
      </div>
      {% endfor %}
    </div>
  </div>

  <!-- FOOTER -->
  <div class="text-center text-[10px] text-slate-500 border-t border-slate-850 pt-2.5 mt-3">
    © 2026 RAG-LLM Studio • เอกสารนำเสนอสร้างขึ้นโดยอัตโนมัติด้วยระบบ AI
  </div>

  <script>
    lucide.createIcons();
  </script>
</body>
</html>
"""

# -------------------------------------------------------------
# 1.5 JINJA2 HTML TEMPLATE สำหรับ "หน้าสไลด์เดี่ยว" (Single Page Rendering)
# -------------------------------------------------------------
SINGLE_SLIDE_HTML_TEMPLATE = """
<!DOCTYPE html>
<html lang="th">
<head>
  <meta charset="UTF-8">
  <title>{{ title }} - Slide {{ current_slide.slide_number }}</title>
  <!-- Load Tailwind CSS CDN -->
  <script src="https://cdn.tailwindcss.com"></script>
  <!-- Load Lucide Icons Script -->
  <script src="https://unpkg.com/lucide@latest"></script>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&family=Sarabun:wght@300;400;500;600;700&display=swap');
    
    html, body {
      width: 1200px;
      height: 675px;
      overflow: hidden;
      margin: 0;
      padding: 0;
      font-family: 'Sarabun', 'Inter', sans-serif;
    }
  </style>
</head>
<body class="bg-gradient-to-br from-[#070b13] via-[#0f172a] to-[#1e1b4b] text-slate-100 p-10 flex flex-col justify-between relative overflow-hidden">
  <!-- Glowing circles in the background -->
  <div class="absolute -top-40 -right-40 w-[500px] h-[500px] rounded-full bg-indigo-500/10 blur-[120px] pointer-events-none"></div>
  <div class="absolute -bottom-40 -left-40 w-[500px] h-[500px] rounded-full bg-cyan-500/10 blur-[120px] pointer-events-none"></div>

  <!-- Decorative Top Line border -->
  <div class="absolute top-0 left-0 right-0 h-[5px] bg-gradient-to-r from-indigo-500 via-purple-500 to-cyan-500"></div>

  <!-- SLIDE HEADER -->
  <div class="flex items-center justify-between border-b border-slate-800 pb-5 mb-6 relative z-10">
    <div class="flex items-center gap-4">
      <div class="w-12 h-12 rounded-2xl bg-indigo-500/10 border border-indigo-500/30 flex items-center justify-center shadow-lg shadow-indigo-500/5">
        <i data-lucide="{{ current_slide.icon_name or 'presentation' }}" class="w-6 h-6 text-indigo-400"></i>
      </div>
      <div>
        <span class="text-[10px] font-bold text-indigo-400 uppercase tracking-widest font-mono">SLIDE {{ current_slide.slide_number }}</span>
        <h1 class="text-2xl font-black text-white tracking-tight leading-tight mt-0.5">{{ current_slide.slide_title }}</h1>
      </div>
    </div>
    
    <div class="flex items-center gap-3">
      <span class="text-xs font-semibold px-3 py-1.5 rounded-full bg-indigo-500/10 text-indigo-300 border border-indigo-500/20 max-w-[280px] truncate" title="{{ title }}">
        {{ title }}
      </span>
      <span class="text-xs font-bold px-3 py-1.5 rounded-full bg-cyan-500/15 text-cyan-300 border border-cyan-500/30 font-mono">
        {{ current_slide.slide_number }} / {{ slides|length }}
      </span>
    </div>
  </div>

  <!-- SLIDE CONTENT -->
  <div class="flex-1 flex flex-col justify-center px-6 relative z-10">
    <div class="my-auto space-y-6">
      {% if current_slide.slide_description %}
      <p class="text-base text-slate-300 leading-relaxed border-l-2 border-indigo-500/50 pl-4 py-2 bg-indigo-500/5 rounded-r-xl max-w-4xl tracking-wide font-normal">
        {{ current_slide.slide_description }}
      </p>
      {% endif %}
      
      <div class="space-y-4">
        {% for pt in current_slide.key_points %}
        <div class="flex items-start gap-4">
          <div class="mt-2.5 w-2 h-2 rounded-full bg-gradient-to-r from-indigo-400 to-cyan-400 shadow-lg shadow-indigo-500/60 shrink-0"></div>
          <p class="text-base text-slate-100 leading-relaxed font-medium tracking-wide">{{ pt }}</p>
        </div>
        {% endfor %}
      </div>
    </div>
  </div>

  <!-- FOOTER -->
  <div class="flex items-center justify-between text-[11px] text-slate-500 border-t border-slate-900 pt-4 mt-6 relative z-10">
    <div class="flex items-center gap-2">
      <div class="w-2 h-2 rounded-full bg-emerald-500/80 animate-pulse"></div>
      <span>RAG-LLM Presentation Engine • AI Generated</span>
    </div>
    <div>
      © 2026 NotebookLM Studio
    </div>
  </div>

  <script>
    lucide.createIcons();
  </script>
</body>
</html>
"""

# -------------------------------------------------------------
# 2. JINJA2 HTML TEMPLATE สำหรับ "อินโฟกราฟิก"
# -------------------------------------------------------------
INFOGRAPHIC_HTML_TEMPLATE = """
<!DOCTYPE html>
<html lang="th">
<head>
  <meta charset="UTF-8">
  <title>{{ headline }}</title>
  <!-- Load Tailwind CSS CDN -->
  <script src="https://cdn.tailwindcss.com"></script>
  <!-- Load Lucide Icons Script -->
  <script src="https://unpkg.com/lucide@latest"></script>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&family=Sarabun:wght@300;400;500;600;700&display=swap');
    
    html, body {
      width: 900px;
      height: auto;
      margin: 0;
      padding: 0;
      font-family: 'Sarabun', 'Inter', sans-serif;
    }
  </style>
</head>
{% set theme_lower = (theme or '')|lower %}
{% if 'ocean' in theme_lower %}
  {% set theme_bg = "from-[#0f172a] via-[#1e293b] to-[#082f49]" %}
  {% set accent_text = "text-cyan-400" %}
  {% set accent_bg = "bg-cyan-500/10 border-cyan-500/20" %}
  {% set cta_bg = "bg-cyan-500/10 border-cyan-500/30" %}
  {% set text_gradient = "from-white via-cyan-100 to-blue-400" %}
  {% set icon_color = "text-cyan-400" %}
{% elif 'emerald' in theme_lower or 'green' in theme_lower %}
  {% set theme_bg = "from-[#0f172a] via-[#022c22] to-[#064e3b]" %}
  {% set accent_text = "text-emerald-400" %}
  {% set accent_bg = "bg-emerald-500/10 border-emerald-500/20" %}
  {% set cta_bg = "bg-emerald-500/10 border-emerald-500/30" %}
  {% set text_gradient = "from-white via-emerald-100 to-teal-400" %}
  {% set icon_color = "text-emerald-400" %}
{% elif 'amber' in theme_lower or 'orange' in theme_lower or 'gold' in theme_lower %}
  {% set theme_bg = "from-[#0f172a] via-[#3f1c06] to-[#1c1917]" %}
  {% set accent_text = "text-amber-400" %}
  {% set accent_bg = "bg-amber-500/10 border-amber-500/20" %}
  {% set cta_bg = "bg-amber-500/10 border-amber-500/30" %}
  {% set text_gradient = "from-white via-amber-100 to-orange-400" %}
  {% set icon_color = "text-amber-400" %}
{% else %}
  <!-- Slate/Indigo Default Theme -->
  {% set theme_bg = "from-[#0b0f19] via-[#111827] to-[#1e1b4b]" %}
  {% set accent_text = "text-indigo-400" %}
  {% set accent_bg = "bg-indigo-500/10 border-indigo-500/20" %}
  {% set cta_bg = "bg-indigo-500/10 border-indigo-500/30" %}
  {% set text_gradient = "from-white via-indigo-100 to-indigo-400" %}
  {% set icon_color = "text-indigo-400" %}
{% endif %}

<body class="bg-gradient-to-br {{ theme_bg }} text-slate-100 p-8 flex flex-col justify-start gap-5 relative overflow-hidden">
  
  <!-- BACKGROUND DECORATIONS -->
  <div class="pointer-events-none absolute -top-24 -right-24 w-80 h-80 rounded-full bg-white/5 blur-3xl"></div>
  <div class="pointer-events-none absolute -bottom-24 -left-24 w-80 h-80 rounded-full bg-white/5 blur-3xl"></div>

  <!-- INFOGRAPHIC HEADER -->
  <div class="relative rounded-2xl border border-slate-800 bg-slate-900/50 p-5 backdrop-blur-md flex items-center justify-between gap-6">
    <div class="flex-1">
      <div class="flex items-center gap-2 mb-1.5">
        <span class="text-[10px] font-bold uppercase tracking-widest {{ accent_text }}">Visualized Infographic</span>
        <span class="text-[9px] px-2 py-0.5 rounded bg-white/5 border border-white/10 text-slate-400 font-mono">{{ visual_style or 'modern-card' }}</span>
      </div>
      <h1 class="text-2xl font-black text-transparent bg-clip-text bg-gradient-to-r {{ text_gradient }} tracking-tight leading-tight">
        {{ headline }}
      </h1>
      {% if subheadline %}
      <p class="text-xs text-slate-400 mt-1 max-w-[850px]">{{ subheadline }}</p>
      {% endif %}
    </div>

    <!-- Theme badge -->
    <div class="shrink-0 flex flex-col items-end gap-1">
      <div class="flex items-center gap-1.5 px-3 py-1.5 rounded-full {{ accent_bg }} {{ accent_text }} text-xs font-semibold">
        <i data-lucide="palette" class="w-3.5 h-3.5"></i>
        <span>Theme: {{ theme|capitalize }}</span>
      </div>
      <p class="text-[9px] text-slate-500 font-mono uppercase mt-1">HD Rendered</p>
    </div>
  </div>

  <!-- KEY STATS ROW (IF PRESENT) -->
  {% if key_stats and key_stats|length > 0 %}
  <div class="grid grid-cols-3 gap-4 w-full">
    {% for stat in key_stats[:6] %}
    <div class="rounded-xl border border-slate-800/80 bg-slate-900/40 p-4 backdrop-blur-md flex flex-col justify-between">
      <p class="text-[10px] text-slate-400 leading-tight truncate" title="{{ stat.label }}">{{ stat.label }}</p>
      <div class="flex items-baseline gap-1 mt-1">
        <span class="text-xl font-black text-white font-mono leading-none">{{ stat.value }}</span>
        {% if stat.unit %}
        <span class="text-xs font-medium {{ accent_text }}">{{ stat.unit }}</span>
        {% endif %}
      </div>
      <!-- Premium mini bar -->
      <div class="mt-2.5 w-full h-1 rounded-full bg-slate-800 overflow-hidden">
        <div class="h-full rounded-full bg-gradient-to-r from-indigo-500 to-cyan-400" style="width: 75%"></div>
      </div>
    </div>
    {% endfor %}
  </div>
  {% endif %}

  <!-- SECTIONS GRID -->
  <div class="grid {% if sections|length <= 3 %}grid-cols-1 gap-5{% else %}grid-cols-2 gap-5{% endif %} w-full">
    {% for section in sections %}
    <div class="rounded-2xl border border-slate-800 bg-slate-900/60 hover:border-slate-700/60 p-5 flex flex-col gap-4 backdrop-blur-md relative overflow-hidden">
      <!-- Glow effect inside card -->
      <div class="absolute -top-12 -left-12 w-24 h-24 rounded-full bg-white/[0.02] blur-xl"></div>
      
      <div>
        <div class="flex items-center gap-2.5 mb-2.5">
          <span class="w-8 h-8 rounded-lg {{ accent_bg }} flex items-center justify-center shrink-0">
            <i data-lucide="{{ section.icon_name or 'shield-check' }}" class="w-4 h-4 {{ icon_color }}"></i>
          </span>
          <h2 class="text-sm font-bold text-white tracking-wide leading-snug">{{ section.title }}</h2>
        </div>
        
        <p class="text-xs text-slate-400 leading-relaxed">
          {{ section.summary }}
        </p>
      </div>

      <!-- Highlights list -->
      {% if section.highlights %}
      <div class="border-t border-slate-800/80 pt-4 space-y-2">
        {% for hl in section.highlights[:3] %}
        <div class="flex items-start gap-2 text-xs text-slate-300 leading-normal">
          <i data-lucide="check-circle-2" class="w-3.5 h-3.5 {{ icon_color }} shrink-0 mt-0.5"></i>
          <span>{{ hl }}</span>
        </div>
        {% endfor %}
      </div>
      {% endif %}
    </div>
    {% endfor %}
  </div>

  <!-- CALL TO ACTION BANNER & FOOTER -->
  <div class="flex items-center justify-between border-t border-slate-800/80 pt-5 w-full mt-2">
    {% if call_to_action %}
    <div class="flex-1 rounded-xl border {{ cta_bg }} p-4 flex items-center gap-3.5 backdrop-blur-md">
      <div class="w-9 h-9 rounded-xl bg-white/5 flex items-center justify-center shrink-0">
        <i data-lucide="sparkles" class="w-4.5 h-4.5 {{ icon_color }}"></i>
      </div>
      <div>
        <p class="text-[10px] font-bold uppercase tracking-wider {{ accent_text }}">Call to Action / สรุปปิดท้าย</p>
        <p class="text-sm text-slate-200 font-semibold mt-0.5 leading-relaxed">{{ call_to_action }}</p>
      </div>
    </div>
    {% endif %}

    <div class="text-right text-[10px] text-slate-500 pl-8 select-none shrink-0 font-mono">
      AI-POWERED STUDIO • FASTAPI + JINJA2 + PLAYWRIGHT
    </div>
  </div>

  <script>
    lucide.createIcons();
  </script>
</body>
</html>
"""

# -------------------------------------------------------------
# 3. ฟังก์ชันเรนเดอร์ภาพผ่าน PLAYWRIGHT
# -------------------------------------------------------------
async def render_html_to_base64(html_content: str, width: int = 1200, height: int = 800, full_page: bool = False) -> str:
    """
    เปิด Headless Browser ด้วย Playwright, โหลด HTML content, 
    รอการโหลดไลบรารี CDN ทั้งหมด (Tailwind, Lucide), แล้วถ่ายรูปหน้าจอ PNG กลับมาเป็น Base64
    """
    if not PLAYWRIGHT_AVAILABLE:
        raise RuntimeError("Playwright is not installed on this system.")

    async with async_playwright() as p:
        # เปิดเบราว์เซอร์ล่องหน
        browser = await p.chromium.launch(headless=True)
        # ตั้งค่าขนาดและความละเอียดระดับ HD (device_scale_factor=2)
        context = await browser.new_context(
            viewport={"width": width, "height": height},
            device_scale_factor=2
        )
        page = await context.new_page()
        
        # ใส่เนื้อหา HTML
        await page.set_content(html_content, wait_until="networkidle")
        
        # รอเพิ่มอีก 300ms เพื่อความมั่นใจว่า Lucide วาดไอคอน SVG ครบถ้วน
        await page.wait_for_timeout(300)
        
        # ถ่าย Screenshot แบบ PNG คืนค่าข้อมูลดิบ (Byte Array)
        if full_page:
            body_element = await page.query_selector("body")
            if body_element:
                image_bytes = await body_element.screenshot(type="png")
            else:
                image_bytes = await page.screenshot(type="png", full_page=True)
        else:
            image_bytes = await page.screenshot(type="png", full_page=False)
        
        # ปิดเบราว์เซอร์
        await browser.close()
        
        # เข้ารหัส base64 พร้อมสำหรับส่งทาง HTTP API
        encoded = base64.b64encode(image_bytes).decode("utf-8")
        return f"data:image/png;base64,{encoded}"


def _run_playwright_in_thread(html_content: str, width: int, height: int, full_page: bool = False) -> str:
    """
    ฟังก์ชันสำหรับรัน Playwright ใน Thread แยกต่างหาก
    หลีกเลี่ยงข้อผิดพลาด NotImplementedError บน Windows เนื่องจาก SelectorEventLoop policy
    """
    import asyncio
    import sys

    if sys.platform == 'win32':
        # บังคับใช้ ProactorEventLoop บน Windows เพื่อให้รองรับ subprocess (Playwright ต้องการสิ่งนี้)
        asyncio.set_event_loop_policy(asyncio.WindowsProactorEventLoopPolicy())

    # สร้าง event loop ใหม่สำหรับ thread นี้โดยเฉพาะ
    loop = asyncio.new_event_loop()
    asyncio.set_event_loop(loop)
    try:
        return loop.run_until_complete(render_html_to_base64(html_content, width, height, full_page))
    finally:
        loop.close()


# -------------------------------------------------------------
# 4. ฟังก์ชันหลักสำหรับแปลง JSON เป็นภาพ Base64
# -------------------------------------------------------------
async def render_action_to_image(action_type: str, data_json_str: str) -> str:
    """
    รับข้อมูลประเภท Action และข้อความ JSON สรุปจาก LLM 
    ทำการรวมเข้ากับ Jinja2 HTML template และเปิด Thread แยกในการเรนเดอร์ Playwright เพื่อความปลอดภัยบน Windows
    """
    try:
        data = json.loads(data_json_str)
    except Exception as e:
        print(f"❌ [Render Error] Failed to parse JSON: {e}")
        raise ValueError(f"LLM output is not valid JSON: {str(e)}")

    # เลือก Template และขนาดหน้าจอ
    if action_type == "slides":
        # เรนเดอร์แต่ละหน้าสไลด์แยกกันแล้วส่งกลับเป็น JSON ที่มี Base64 image อยู่ในแต่ละสไลด์
        slides_list = data.get("slides", [])
        template = Template(SINGLE_SLIDE_HTML_TEMPLATE)
        loop = asyncio.get_running_loop()
        
        for slide in slides_list:
            slide_number = slide.get("slide_number", 1)
            print(f"📸 Rendering slide page {slide_number}/{len(slides_list)}...")
            
            render_data = {
                "title": data.get("title", "Slide Presentation Deck"),
                "audience": data.get("audience", ""),
                "slides": slides_list,
                "current_slide": slide
            }
            html_content = template.render(**render_data)
            
            # ส่งงานไปรันบน Thread แยกผ่าน run_in_executor
            with ThreadPoolExecutor(max_workers=1) as executor:
                base64_img = await loop.run_in_executor(
                    executor,
                    _run_playwright_in_thread,
                    html_content,
                    1200,
                    675,
                    False  # full_page = False for slides
                )
            slide["image"] = base64_img
            
        return json.dumps(data, ensure_ascii=False)
        
    elif action_type == "infographic":
        template_str = INFOGRAPHIC_HTML_TEMPLATE
        width, height = 900, 800  # viewport height is set to 800; full_page=True will expand it to match content
        
        # Compile template
        template = Template(template_str)
        html_content = template.render(**data)

        # ส่งงานไปรันบน Thread แยกผ่าน run_in_executor
        loop = asyncio.get_running_loop()
        with ThreadPoolExecutor(max_workers=1) as executor:
            base64_img = await loop.run_in_executor(
                executor,
                _run_playwright_in_thread,
                html_content,
                width,
                height,
                True  # full_page = True for infographics to crop exactly to content height
            )
        return base64_img
    else:
        raise ValueError(f"Unsupported action type for rendering: {action_type}")
