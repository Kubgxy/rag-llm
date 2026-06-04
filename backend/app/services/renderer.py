import math

def repair_json_newlines(json_str: str) -> str:
    """
    Escapes literal newlines and control characters inside double-quoted strings in JSON.
    This fixes JSONDecodeErrors when LLMs return literal newlines in JSON string values.
    """
    chars = list(json_str)
    inside_string = False
    escaped = False
    repaired = []
    
    for char in chars:
        if escaped:
            repaired.append(char)
            escaped = False
            continue
            
        if char == '\\':
            repaired.append(char)
            if inside_string:
                escaped = True
            continue
            
        if char == '"':
            inside_string = not inside_string
            repaired.append(char)
            continue
            
        if inside_string and char == '\n':
            repaired.append('\\n')
            continue
            
        if inside_string and char == '\r':
            continue
            
        repaired.append(char)
        
    return "".join(repaired)


def is_color_light(hex_color: str) -> bool:
    """
    ตรวจสอบว่าสี Hex Code (เช่น #ffffff หรือ #000000) เป็นสีโทนสว่างหรือไม่
    ใช้สูตร HSP Color Model: Brightness = sqrt(0.299*R^2 + 0.587*G^2 + 0.114*B^2)
    """
    if not hex_color:
        return False
    
    # ลบเครื่องหมาย # และคลีนช่องว่าง
    hex_color = hex_color.strip().lstrip('#')
    
    # รองรับสีแบบสั้น เช่น FFF -> FFFFFF
    if len(hex_color) == 3:
        hex_color = ''.join([c * 2 for c in hex_color])
        
    if len(hex_color) != 6:
        # หากความยาวไม่ได้ ให้ถือว่าไม่เป็นสีสว่างไว้ก่อน (Fallback)
        return False
        
    try:
        r = int(hex_color[0:2], 16)
        g = int(hex_color[2:4], 16)
        b = int(hex_color[4:6], 16)
        
        # HSP formula
        brightness = math.sqrt(0.299 * (r ** 2) + 0.587 * (g ** 2) + 0.114 * (b ** 2))
        return brightness > 180  # ค่ามากกว่า 180 ถือว่าเป็นสีสว่าง
    except Exception as e:
        print(f"⚠️ [Color Brightness Warning] เกิดข้อผิดพลาดในการตรวจสอบสี {hex_color}: {e}")
        return False
