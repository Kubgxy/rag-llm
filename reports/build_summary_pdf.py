from pathlib import Path
import re
from xml.sax.saxutils import escape

from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import mm
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.platypus import Paragraph, Preformatted, SimpleDocTemplate, Spacer


def register_thai_font() -> tuple[str, str]:
    """Register a Thai-capable font if available, else fallback to Helvetica."""
    candidates = [
        (
            "THSarabunNew",
            Path("C:/Windows/Fonts/THSarabunNew.ttf"),
            Path("C:/Windows/Fonts/THSarabunNew Bold.ttf"),
        ),
        (
            "Tahoma",
            Path("C:/Windows/Fonts/tahoma.ttf"),
            Path("C:/Windows/Fonts/tahomabd.ttf"),
        ),
        (
            "LeelawUI",
            Path("C:/Windows/Fonts/LeelawUI.ttf"),
            Path("C:/Windows/Fonts/LeelaUIb.ttf"),
        ),
    ]

    for font_name, regular_path, bold_path in candidates:
        if regular_path.exists() and bold_path.exists():
            pdfmetrics.registerFont(TTFont(font_name, str(regular_path)))
            pdfmetrics.registerFont(TTFont(f"{font_name}-Bold", str(bold_path)))
            return font_name, f"{font_name}-Bold"

    return "Helvetica", "Helvetica-Bold"


def make_styles(base_font: str, bold_font: str):
    styles = getSampleStyleSheet()

    title = ParagraphStyle(
        "TitleCustom",
        parent=styles["Heading1"],
        fontName=bold_font,
        fontSize=20,
        leading=26,
        spaceAfter=8,
        textColor=colors.HexColor("#111827"),
    )

    h2 = ParagraphStyle(
        "H2Custom",
        parent=styles["Heading2"],
        fontName=bold_font,
        fontSize=14,
        leading=20,
        spaceBefore=10,
        spaceAfter=4,
        textColor=colors.HexColor("#111827"),
    )

    h3 = ParagraphStyle(
        "H3Custom",
        parent=styles["Heading3"],
        fontName=bold_font,
        fontSize=12,
        leading=16,
        spaceBefore=8,
        spaceAfter=2,
        textColor=colors.HexColor("#111827"),
    )

    body = ParagraphStyle(
        "BodyCustom",
        parent=styles["BodyText"],
        fontName=base_font,
        fontSize=11,
        leading=16,
        spaceAfter=3,
        textColor=colors.HexColor("#1f2937"),
    )

    bullet = ParagraphStyle(
        "BulletCustom",
        parent=body,
        leftIndent=14,
        firstLineIndent=-10,
        spaceAfter=2,
    )

    code = ParagraphStyle(
        "CodeCustom",
        parent=body,
        fontName="Courier",
        fontSize=9,
        leading=12,
        backColor=colors.HexColor("#f3f4f6"),
        leftIndent=6,
        rightIndent=6,
    )

    table_text = ParagraphStyle(
        "TableLine",
        parent=body,
        fontName=base_font,
        fontSize=10,
        leading=14,
        backColor=colors.HexColor("#f9fafb"),
        leftIndent=4,
    )

    return {
        "title": title,
        "h2": h2,
        "h3": h3,
        "body": body,
        "bullet": bullet,
        "code": code,
        "table_text": table_text,
    }


def clean_inline_markdown(text: str) -> str:
    """Convert a subset of markdown to plain-ish text safe for reportlab Paragraph."""
    text = text.replace("`", "")
    text = text.replace("**", "")
    text = text.replace("__", "")
    text = text.replace("\t", "    ")
    return escape(text)


def parse_markdown_to_story(markdown_text: str, styles: dict):
    story = []

    in_code_block = False
    code_lines = []

    lines = markdown_text.splitlines()

    for raw_line in lines:
        line = raw_line.rstrip("\n")

        if line.strip().startswith("```"):
            if in_code_block:
                code_text = "\n".join(code_lines).strip("\n")
                if code_text:
                    story.append(Preformatted(code_text, styles["code"]))
                    story.append(Spacer(1, 4))
                code_lines = []
                in_code_block = False
            else:
                in_code_block = True
            continue

        if in_code_block:
            code_lines.append(line)
            continue

        stripped = line.strip()

        if not stripped:
            story.append(Spacer(1, 5))
            continue

        if stripped == "---":
            story.append(Spacer(1, 6))
            continue

        if stripped.startswith("### "):
            story.append(Paragraph(clean_inline_markdown(stripped[4:]), styles["h3"]))
            continue

        if stripped.startswith("## "):
            story.append(Paragraph(clean_inline_markdown(stripped[3:]), styles["h2"]))
            continue

        if stripped.startswith("# "):
            story.append(Paragraph(clean_inline_markdown(stripped[2:]), styles["title"]))
            continue

        if stripped.startswith("|") and stripped.endswith("|"):
            story.append(Paragraph(clean_inline_markdown(stripped), styles["table_text"]))
            continue

        if re.match(r"^[-*]\s+", stripped):
            text = re.sub(r"^[-*]\s+", "", stripped)
            story.append(Paragraph(f"- {clean_inline_markdown(text)}", styles["bullet"]))
            continue

        if re.match(r"^\d+\.\s+", stripped):
            story.append(Paragraph(clean_inline_markdown(stripped), styles["bullet"]))
            continue

        story.append(Paragraph(clean_inline_markdown(stripped), styles["body"]))

    if in_code_block and code_lines:
        code_text = "\n".join(code_lines).strip("\n")
        if code_text:
            story.append(Preformatted(code_text, styles["code"]))

    return story


def add_page_number(canvas_obj, doc):
    canvas_obj.saveState()
    canvas_obj.setFont("Helvetica", 8)
    canvas_obj.setFillColor(colors.HexColor("#6b7280"))
    canvas_obj.drawRightString(200 * mm, 8 * mm, f"Page {doc.page}")
    canvas_obj.restoreState()


def build_pdf(input_md: Path, output_pdf: Path) -> None:
    if not input_md.exists():
        raise FileNotFoundError(f"Markdown file not found: {input_md}")

    base_font, bold_font = register_thai_font()
    styles = make_styles(base_font, bold_font)

    markdown_text = input_md.read_text(encoding="utf-8")
    story = parse_markdown_to_story(markdown_text, styles)

    output_pdf.parent.mkdir(parents=True, exist_ok=True)

    doc = SimpleDocTemplate(
        str(output_pdf),
        pagesize=A4,
        leftMargin=16 * mm,
        rightMargin=16 * mm,
        topMargin=16 * mm,
        bottomMargin=14 * mm,
        title="RAG-LLM Project Summary",
        author="GitHub Copilot",
    )

    doc.build(story, onFirstPage=add_page_number, onLaterPages=add_page_number)


def main():
    root = Path(__file__).resolve().parent
    input_md = root / "RAG-LLM_Project_Summary_2026-04-20.md"
    output_pdf = root / "RAG-LLM_Project_Summary_2026-04-20.pdf"

    build_pdf(input_md, output_pdf)
    print(f"[OK] PDF generated: {output_pdf}")


if __name__ == "__main__":
    main()
