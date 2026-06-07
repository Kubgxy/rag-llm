"""
Seed script สำหรับสร้าง Mock HRM Data — 150 พนักงาน, 5 แผนก, ครบทุกมิติ
Usage: python -m mock_hrm_server.seed_data
"""
import random
import uuid
from datetime import date, datetime, timedelta, timezone

from mock_hrm_server.database import reset_db, SessionLocal
from mock_hrm_server.models import (
    Department, Position, Employee, LeaveType, LeaveRecord, LeaveBalance,
    AttendanceRecord, SalaryRecord, PerformanceReview, Policy, Announcement,
    BenefitPlan, EmployeeBenefit,
)

random.seed(42)

# ──────────────────────────── Thai name pools ────────────────────────────

FIRST_NAMES_TH = [
    "สมชาย", "สมหญิง", "สุชาติ", "สุภาพร", "วิทยา", "วิภา", "ประเสริฐ", "ประภา",
    "ธนา", "ธนิดา", "กิตติ", "กิตติยา", "อนุชา", "อนุสรา", "พงศ์เทพ", "พรทิพย์",
    "ชัยวัฒน์", "ชุติมา", "สิริ", "สิริพร", "ณัฐ", "ณัฐชา", "ภาคิน", "ภาวินี",
    "ปิยะ", "ปิยนุช", "อดิศร", "อรุณี", "จิรวัฒน์", "จิราพร", "เกียรติ", "เกศินี",
    "ธีรภัทร", "ธีราพร", "ศักดิ์ชัย", "ศิริลักษณ์", "วรพล", "วรรณา", "นพดล", "นพรัตน์",
    "พีระ", "พีรดา", "มนัส", "มนัสนันท์", "รัฐพล", "รัตนา", "สราวุธ", "สราวดี",
    "อภิชาติ", "อภิรดี", "ชาญชัย", "ชาลิสา", "ดนัย", "ดวงใจ", "เอกชัย", "เอมอร",
    "กฤษณ์", "กมลชนก", "ไพศาล", "ไพลิน", "บุญมี", "บุษบา", "สันติ", "สันทนา",
    "ยุทธนา", "ยุพิน", "วัชระ", "วาสนา", "ทวีศักดิ์", "ทิพวรรณ", "อุดม", "อุไร",
    "นิรุตติ์", "นิภาพร", "ปรีชา", "ปรียา", "สุรศักดิ์", "สุรีย์",
]

LAST_NAMES_TH = [
    "วงศ์ประเสริฐ", "สุขสวัสดิ์", "จันทร์เจริญ", "แสงทอง", "พงษ์สวัสดิ์",
    "อินทร์สุข", "ศรีสุวรรณ", "สมบูรณ์", "เจริญสุข", "รุ่งเรือง",
    "มั่นคง", "ดีงาม", "ประเสริฐศรี", "ทองดี", "บุญเลิศ",
    "วิเศษสิงห์", "คำแก้ว", "ชาวนา", "ศิริวัฒน์", "พลายงาม",
    "สุขเกษม", "ธรรมรักษ์", "เพชรดี", "นิลกำแหง", "พิทักษ์ธรรม",
    "จิตรกร", "วรากร", "สถิตชัย", "พิพัฒน์", "ดำรงค์",
    "อมรเดช", "กล้าหาญ", "บัวงาม", "ศิลปกร", "ประยูร",
    "ชัยรัตน์", "ปัญญาดี", "มงคลชัย", "วิจิตร", "สกุลดี",
]

FIRST_NAMES_EN = [
    "Somchai", "Somying", "Suchat", "Supaporn", "Witthaya", "Wipa", "Prasert", "Prapa",
    "Thana", "Thanida", "Kitti", "Kittiya", "Anucha", "Anusara", "Pongthep", "Porntip",
    "Chaiwat", "Chutima", "Siri", "Siriporn", "Nat", "Natcha", "Pakin", "Pawinee",
    "Piya", "Piyanut", "Adisorn", "Arunee", "Jirawat", "Jiraporn", "Kiat", "Kesinee",
    "Thiraphat", "Thiraporn", "Sakchai", "Sirilak", "Worapol", "Wanna", "Noppadon", "Nopparat",
    "Peera", "Peerada", "Manat", "Manatnan", "Rattapol", "Rattana", "Sarawut", "Sarawadee",
    "Apichat", "Apiradee", "Chanchai", "Chalisa", "Danai", "Duangjai", "Ekkachai", "Emon",
    "Krit", "Kamolchanok", "Paisarn", "Pailin", "Boonmee", "Butsaba", "Santi", "Santana",
    "Yuttana", "Yupin", "Watchara", "Wasana", "Taweesak", "Tipawan", "Udom", "Urai",
    "Nirut", "Nipaporn", "Preecha", "Preeya", "Surasak", "Suree",
]

LAST_NAMES_EN = [
    "Wongprasert", "Suksawat", "Chancharoen", "Saengthong", "Pongsawat",
    "Insuk", "Srisuwan", "Somboon", "Charoensuk", "Rungreung",
    "Mankong", "Deengam", "Prasertsri", "Thongdee", "Boonlert",
    "Wisetsing", "Kamkaew", "Chaona", "Siriwat", "Plaiyngam",
    "Sukkasem", "Thamarak", "Phetdee", "Nilkamhaeng", "Pitaktham",
    "Jittrakorn", "Warakorn", "Sathitchai", "Pipat", "Damrong",
    "Amorndet", "Klahan", "Buangam", "Sinlapakorn", "Prayoon",
    "Chairat", "Panyadee", "Mongkolchai", "Wichit", "Sakundee",
]


def _random_phone():
    return f"0{random.choice(['6', '8', '9'])}{random.randint(10000000, 99999999)}"


def _random_national_id():
    return f"{random.randint(1, 9)}-{random.randint(1000, 9999)}-{random.randint(10000, 99999)}-{random.randint(10, 99)}-{random.randint(0, 9)}"


def _random_bank_account():
    return f"{random.randint(100, 999)}-{random.randint(1, 9)}-{random.randint(10000, 99999)}-{random.randint(0, 9)}"


DEPARTMENTS_DATA = [
    {"name": "ฝ่ายเทคโนโลยีสารสนเทศ", "name_en": "Information Technology", "location": "อาคาร A ชั้น 5", "budget": 15000000},
    {"name": "ฝ่ายทรัพยากรบุคคล", "name_en": "Human Resources", "location": "อาคาร A ชั้น 3", "budget": 8000000},
    {"name": "ฝ่ายการเงินและบัญชี", "name_en": "Finance & Accounting", "location": "อาคาร B ชั้น 2", "budget": 10000000},
    {"name": "ฝ่ายการตลาด", "name_en": "Marketing", "location": "อาคาร B ชั้น 4", "budget": 12000000},
    {"name": "ฝ่ายปฏิบัติการ", "name_en": "Operations", "location": "อาคาร C ชั้น 1", "budget": 20000000},
]

POSITIONS_DATA = [
    # IT
    {"title": "นักพัฒนาซอฟต์แวร์", "title_en": "Software Developer", "level": 2, "min_salary": 25000, "max_salary": 50000},
    {"title": "นักพัฒนาซอฟต์แวร์อาวุโส", "title_en": "Senior Software Developer", "level": 3, "min_salary": 45000, "max_salary": 80000},
    {"title": "หัวหน้าทีมพัฒนา", "title_en": "Tech Lead", "level": 4, "min_salary": 60000, "max_salary": 100000},
    {"title": "ผู้จัดการฝ่าย IT", "title_en": "IT Manager", "level": 5, "min_salary": 80000, "max_salary": 130000},
    {"title": "วิศวกรระบบ", "title_en": "System Engineer", "level": 2, "min_salary": 28000, "max_salary": 55000},
    {"title": "นักวิเคราะห์ข้อมูล", "title_en": "Data Analyst", "level": 2, "min_salary": 30000, "max_salary": 55000},
    {"title": "ผู้ดูแลระบบเครือข่าย", "title_en": "Network Administrator", "level": 2, "min_salary": 25000, "max_salary": 45000},
    {"title": "UX/UI Designer", "title_en": "UX/UI Designer", "level": 2, "min_salary": 28000, "max_salary": 50000},
    # HR
    {"title": "เจ้าหน้าที่ทรัพยากรบุคคล", "title_en": "HR Officer", "level": 1, "min_salary": 18000, "max_salary": 30000},
    {"title": "เจ้าหน้าที่สรรหาบุคลากร", "title_en": "Recruitment Specialist", "level": 2, "min_salary": 25000, "max_salary": 40000},
    {"title": "ผู้จัดการฝ่าย HR", "title_en": "HR Manager", "level": 5, "min_salary": 70000, "max_salary": 120000},
    {"title": "เจ้าหน้าที่ฝึกอบรม", "title_en": "Training Coordinator", "level": 2, "min_salary": 22000, "max_salary": 38000},
    # Finance
    {"title": "นักบัญชี", "title_en": "Accountant", "level": 2, "min_salary": 22000, "max_salary": 40000},
    {"title": "นักบัญชีอาวุโส", "title_en": "Senior Accountant", "level": 3, "min_salary": 38000, "max_salary": 65000},
    {"title": "ผู้จัดการฝ่ายการเงิน", "title_en": "Finance Manager", "level": 5, "min_salary": 75000, "max_salary": 125000},
    {"title": "เจ้าหน้าที่งบประมาณ", "title_en": "Budget Officer", "level": 2, "min_salary": 25000, "max_salary": 42000},
    # Marketing
    {"title": "เจ้าหน้าที่การตลาด", "title_en": "Marketing Officer", "level": 1, "min_salary": 20000, "max_salary": 35000},
    {"title": "นักการตลาดดิจิทัล", "title_en": "Digital Marketing Specialist", "level": 2, "min_salary": 28000, "max_salary": 50000},
    {"title": "ผู้จัดการฝ่ายการตลาด", "title_en": "Marketing Manager", "level": 5, "min_salary": 70000, "max_salary": 120000},
    {"title": "Content Creator", "title_en": "Content Creator", "level": 1, "min_salary": 18000, "max_salary": 32000},
    {"title": "Graphic Designer", "title_en": "Graphic Designer", "level": 2, "min_salary": 22000, "max_salary": 40000},
    # Operations
    {"title": "เจ้าหน้าที่ปฏิบัติการ", "title_en": "Operations Officer", "level": 1, "min_salary": 18000, "max_salary": 30000},
    {"title": "หัวหน้างานปฏิบัติการ", "title_en": "Operations Supervisor", "level": 3, "min_salary": 35000, "max_salary": 55000},
    {"title": "ผู้จัดการฝ่ายปฏิบัติการ", "title_en": "Operations Manager", "level": 5, "min_salary": 70000, "max_salary": 120000},
    {"title": "เจ้าหน้าที่คลังสินค้า", "title_en": "Warehouse Officer", "level": 1, "min_salary": 16000, "max_salary": 28000},
    {"title": "เจ้าหน้าที่จัดซื้อ", "title_en": "Procurement Officer", "level": 2, "min_salary": 22000, "max_salary": 38000},
    # General
    {"title": "เลขานุการ", "title_en": "Secretary", "level": 1, "min_salary": 18000, "max_salary": 30000},
    {"title": "ผู้อำนวยการ", "title_en": "Director", "level": 6, "min_salary": 120000, "max_salary": 200000},
]

LEAVE_TYPES_DATA = [
    {"name": "ลาพักร้อน", "name_en": "Annual Leave", "max_days_per_year": 10, "is_paid": True, "description": "วันลาพักร้อนประจำปี สำหรับพนักงานที่ทำงานครบ 1 ปี"},
    {"name": "ลาป่วย", "name_en": "Sick Leave", "max_days_per_year": 30, "is_paid": True, "description": "วันลาป่วย ลาได้ไม่เกิน 30 วันต่อปี โดยไม่ต้องมีใบรับรองแพทย์สำหรับ 3 วันแรก"},
    {"name": "ลากิจ", "name_en": "Personal Leave", "max_days_per_year": 5, "is_paid": True, "description": "วันลากิจส่วนตัว สำหรับธุระจำเป็น"},
    {"name": "ลาคลอด", "name_en": "Maternity Leave", "max_days_per_year": 98, "is_paid": True, "description": "วันลาคลอดบุตร 98 วัน โดยได้รับค่าจ้างไม่เกิน 45 วัน"},
    {"name": "ลาบวช", "name_en": "Ordination Leave", "max_days_per_year": 15, "is_paid": True, "description": "วันลาบวช สำหรับพนักงานชายที่ยังไม่เคยบวช"},
    {"name": "ลาไม่รับค่าจ้าง", "name_en": "Unpaid Leave", "max_days_per_year": 30, "is_paid": False, "description": "วันลาที่ไม่ได้รับค่าจ้าง ต้องได้รับอนุมัติจากหัวหน้า"},
    {"name": "ลาฝึกอบรม", "name_en": "Training Leave", "max_days_per_year": 10, "is_paid": True, "description": "วันลาเข้ารับการฝึกอบรมหรือพัฒนาทักษะ ต้องได้รับอนุมัติล่วงหน้า"},
]

POLICIES_DATA = [
    {
        "title": "นโยบายการลาพักร้อน",
        "category": "leave",
        "content": """นโยบายการลาพักร้อนขององค์กร:
1. พนักงานที่ทำงานครบ 1 ปี มีสิทธิ์ลาพักร้อนได้ 10 วันต่อปี
2. วันลาที่ไม่ได้ใช้สามารถสะสมได้ไม่เกิน 5 วันในปีถัดไป
3. ต้องยื่นใบลาล่วงหน้าอย่างน้อย 3 วันทำการ
4. การลาต่อเนื่องเกิน 5 วัน ต้องได้รับอนุมัติจากผู้จัดการฝ่าย
5. ไม่สามารถลาพักร้อนในช่วงปิดบัญชีไตรมาส (เดือนมีนาคม, มิถุนายน, กันยายน, ธันวาคม) ยกเว้นได้รับอนุมัติพิเศษ""",
        "effective_date": date(2025, 1, 1),
    },
    {
        "title": "นโยบายการลาป่วย",
        "category": "leave",
        "content": """นโยบายการลาป่วย:
1. พนักงานมีสิทธิ์ลาป่วยได้ไม่เกิน 30 วันต่อปี โดยได้รับค่าจ้าง
2. การลาป่วยตั้งแต่ 3 วันขึ้นไป ต้องมีใบรับรองแพทย์ประกอบ
3. หากลาป่วยเกิน 30 วัน จะถูกพิจารณาเป็นลาไม่รับค่าจ้าง
4. กรณีเจ็บป่วยฉุกเฉิน สามารถแจ้งลาย้อนหลังได้ภายใน 1 วันทำการ
5. ห้ามใช้วันลาป่วยเพื่อวัตถุประสงค์อื่น ฝ่าฝืนถือว่าผิดวินัย""",
        "effective_date": date(2025, 1, 1),
    },
    {
        "title": "นโยบายเวลาทำงานและการเข้างาน",
        "category": "attendance",
        "content": """ข้อกำหนดเวลาทำงาน:
1. เวลาทำงานปกติ: 08:30 - 17:30 น. (พักเที่ยง 12:00 - 13:00 น.)
2. ถือว่ามาสาย: เข้างานหลัง 08:45 น.
3. สายเกิน 3 ครั้งต่อเดือน จะถูกหักค่าจ้าง 1 วัน
4. การลงเวลาเข้า-ออกงาน ต้องใช้ระบบสแกนนิ้วมือหรือบัตรพนักงาน
5. การทำงานล่วงเวลา (OT) ต้องได้รับอนุมัติล่วงหน้าจากหัวหน้างาน
6. OT ในวันทำงานปกติ: 1.5 เท่า, วันหยุด: 2 เท่า, วันหยุดนักขัตฤกษ์: 3 เท่า""",
        "effective_date": date(2025, 1, 1),
    },
    {
        "title": "นโยบาย Work From Home (WFH)",
        "category": "attendance",
        "content": """นโยบายการทำงานจากบ้าน:
1. พนักงานสามารถ WFH ได้สูงสุด 2 วันต่อสัปดาห์
2. ต้องแจ้ง WFH ล่วงหน้าอย่างน้อย 1 วันทำการผ่านระบบ
3. ต้อง online และพร้อมติดต่อได้ในเวลาทำงานปกติ
4. ต้องเข้าร่วมประชุม online ตามที่กำหนด
5. ฝ่ายที่ต้องให้บริการหน้างาน (Operations) อาจมีข้อจำกัด WFH ตามดุลยพินิจของหัวหน้าฝ่าย
6. พนักงานใหม่ (ช่วงทดลองงาน) ไม่สามารถ WFH ได้""",
        "effective_date": date(2025, 3, 1),
    },
    {
        "title": "นโยบายการแต่งกาย (Dress Code)",
        "category": "conduct",
        "content": """ข้อกำหนดการแต่งกาย:
1. วันจันทร์-พฤหัสบดี: Business Casual (สุภาพ ไม่ต้องใส่สูท แต่ห้ามกางเกงยีนส์ขาด)
2. วันศุกร์: Casual Friday (แต่งกายตามสบาย แต่ต้องสุภาพ)
3. วันที่มีลูกค้ามาเยือนหรือการประชุมสำคัญ: Business Formal
4. ห้ามสวมรองเท้าแตะเข้าพื้นที่สำนักงาน
5. พนักงานฝ่ายปฏิบัติการต้องสวมชุดยูนิฟอร์มและ PPE ตามกำหนด""",
        "effective_date": date(2025, 1, 1),
    },
    {
        "title": "นโยบายสวัสดิการพนักงาน",
        "category": "benefits",
        "content": """สวัสดิการที่องค์กรมอบให้พนักงาน:
1. ประกันสุขภาพกลุ่ม: คุ้มครอง OPD 2,000 บาท/ครั้ง, IPD 200,000 บาท/ปี
2. ประกันทันตกรรม: 5,000 บาท/ปี
3. ประกันชีวิต: 10 เท่าของเงินเดือน
4. กองทุนสำรองเลี้ยงชีพ: บริษัทสมทบ 5% ของเงินเดือน
5. ค่าเดินทาง: 2,500 บาท/เดือน (สำหรับพนักงานที่ไม่ได้รับรถประจำตำแหน่ง)
6. ค่าอาหารกลางวัน: 50 บาท/วัน
7. โบนัสประจำปี: 1-3 เดือน ตามผลประกอบการ""",
        "effective_date": date(2025, 1, 1),
    },
    {
        "title": "นโยบายการประเมินผลการปฏิบัติงาน",
        "category": "general",
        "content": """ระบบการประเมินผล:
1. ประเมินผล 2 ครั้งต่อปี (รอบ H1: มกราคม-มิถุนายน, รอบ H2: กรกฎาคม-ธันวาคม)
2. เกณฑ์การประเมิน: KPI 60% + Competency 40%
3. ระดับคะแนน: 1 (ต้องปรับปรุง) ถึง 5 (ดีเยี่ยม)
4. ผลประเมินมีผลต่อการปรับเงินเดือนและโบนัสประจำปี
5. พนักงานที่ได้คะแนนต่ำกว่า 2 ติดต่อกัน 2 รอบ จะเข้าสู่ PIP (Performance Improvement Plan)""",
        "effective_date": date(2025, 1, 1),
    },
    {
        "title": "นโยบายการทำงานล่วงเวลา (OT)",
        "category": "attendance",
        "content": """ข้อกำหนดการทำงานล่วงเวลา:
1. OT ต้องได้รับอนุมัติจากหัวหน้างานล่วงหน้าก่อนทำ OT อย่างน้อย 1 วัน
2. OT วันทำงานปกติ: คิดอัตรา 1.5 เท่า (หลัง 17:30 น.)
3. OT วันหยุดสุดสัปดาห์: คิดอัตรา 2 เท่า
4. OT วันหยุดนักขัตฤกษ์: คิดอัตรา 3 เท่า
5. OT สูงสุดไม่เกิน 36 ชั่วโมงต่อสัปดาห์ (ตามกฎหมายแรงงาน)
6. การทำ OT เกิน 4 ชั่วโมงติดต่อกัน ต้องพักอย่างน้อย 20 นาที""",
        "effective_date": date(2025, 1, 1),
    },
    {
        "title": "นโยบายความปลอดภัยข้อมูล",
        "category": "general",
        "content": """ข้อกำหนดความปลอดภัยข้อมูล:
1. ห้ามเปิดเผยข้อมูลความลับของบริษัทต่อบุคคลภายนอก
2. Password ต้องเปลี่ยนทุก 90 วัน และมีความยาวอย่างน้อย 12 ตัวอักษร
3. ห้ามใช้ USB drive ส่วนตัวกับคอมพิวเตอร์บริษัท
4. ต้อง lock หน้าจอทุกครั้งที่ลุกจากโต๊ะ
5. ข้อมูลส่วนบุคคลของพนักงาน (เงินเดือน, ประวัติ) ถือเป็นข้อมูลลับ ห้ามเปิดเผย
6. รายงานเหตุการณ์ด้านความปลอดภัยทันทีที่พบ ผ่านช่องทาง security@company.com""",
        "effective_date": date(2025, 1, 1),
    },
    {
        "title": "นโยบายวันหยุดนักขัตฤกษ์ประจำปี 2026",
        "category": "leave",
        "content": """วันหยุดนักขัตฤกษ์ประจำปี 2026:
1. วันปีใหม่ — 1 มกราคม
2. วันมาฆบูชา — 12 กุมภาพันธ์
3. วันจักรี — 6 เมษายน
4. วันสงกรานต์ — 13-15 เมษายน
5. วันแรงงาน — 1 พฤษภาคม
6. วันฉัตรมงคล — 4 พฤษภาคม
7. วันวิสาขบูชา — 11 พฤษภาคม
8. วันเฉลิมพระชนมพรรษา สมเด็จพระราชินี — 3 มิถุนายน
9. วันอาสาฬหบูชา — 10 กรกฎาคม
10. วันเข้าพรรษา — 11 กรกฎาคม
11. วันเฉลิมพระชนมพรรษา ร.10 — 28 กรกฎาคม
12. วันแม่แห่งชาติ — 12 สิงหาคม
13. วันคล้ายวันสวรรคต ร.9 — 13 ตุลาคม
14. วันปิยมหาราช — 23 ตุลาคม
15. วันพ่อแห่งชาติ — 5 ธันวาคม
16. วันรัฐธรรมนูญ — 10 ธันวาคม
17. วันสิ้นปี — 31 ธันวาคม
รวม 17 วันหยุด (ไม่รวมวันหยุดชดเชย)""",
        "effective_date": date(2026, 1, 1),
    },
]

ANNOUNCEMENTS_DATA = [
    {
        "title": "ประกาศปรับเวลาทำงานแบบยืดหยุ่น (Flexible Hours)",
        "content": "ตั้งแต่เดือนกรกฎาคม 2026 เป็นต้นไป พนักงานสามารถเลือกเวลาเข้างานได้ระหว่าง 07:30-09:30 น. โดยต้องทำงานครบ 8 ชั่วโมง เช่น เข้า 07:30 ออก 16:30 หรือ เข้า 09:30 ออก 18:30 — ทั้งนี้ต้องแจ้งหัวหน้างานล่วงหน้า",
        "category": "hr", "priority": "high", "is_pinned": True,
        "publish_date": date(2026, 6, 1),
    },
    {
        "title": "กิจกรรม Team Building ประจำไตรมาส 2/2026",
        "content": "เชิญชวนพนักงานทุกท่านเข้าร่วมกิจกรรม Team Building ในวันเสาร์ที่ 21 มิถุนายน 2026 ณ รีสอร์ทพัทยา มีกิจกรรมสนุกสนานมากมาย รวมทั้งอาหารเย็น กรุณาลงทะเบียนผ่านแบบฟอร์ม HR ภายในวันที่ 10 มิถุนายน",
        "category": "event", "priority": "normal", "is_pinned": False,
        "publish_date": date(2026, 5, 28),
    },
    {
        "title": "ประกาศหยุดทำงานวันสงกรานต์ 2026",
        "content": "บริษัทกำหนดวันหยุดสงกรานต์ตั้งแต่วันที่ 12-16 เมษายน 2026 (รวม 5 วัน) พนักงานที่ต้องเข้าเวรจะได้รับ OT อัตรา 3 เท่า กรุณาจัดเตรียมงานที่ค้างก่อนวันหยุด",
        "category": "general", "priority": "high", "is_pinned": False,
        "publish_date": date(2026, 3, 15),
    },
    {
        "title": "แจ้งเปลี่ยนระบบประกันสุขภาพกลุ่มใหม่",
        "content": "ตั้งแต่วันที่ 1 กรกฎาคม 2026 บริษัทจะเปลี่ยนบริษัทประกันสุขภาพกลุ่มเป็น บมจ.กรุงเทพประกันชีวิต ซึ่งมีวงเงินคุ้มครองเพิ่มขึ้น 20% รายละเอียดเพิ่มเติมจะแจ้งให้ทราบทางอีเมลภายในสัปดาห์หน้า",
        "category": "hr", "priority": "normal", "is_pinned": False,
        "publish_date": date(2026, 5, 20),
    },
    {
        "title": "ประกาศรับสมัครพนักงานใหม่ฝ่าย IT",
        "content": "ฝ่าย IT กำลังเปิดรับสมัครตำแหน่ง Senior Developer 2 อัตรา และ Data Analyst 1 อัตรา พนักงานที่สนใจสามารถสมัครภายใน (Internal Transfer) ได้ หรือแนะนำบุคคลภายนอก รับค่าแนะนำ 10,000 บาท",
        "category": "hr", "priority": "normal", "is_pinned": False,
        "publish_date": date(2026, 6, 3),
    },
]

BENEFIT_PLANS_DATA = [
    {"name": "ประกันสุขภาพกลุ่ม", "category": "health", "description": "คุ้มครอง OPD 2,000 บาท/ครั้ง (สูงสุด 30 ครั้ง/ปี), IPD 200,000 บาท/ปี, ห้องเดี่ยว 3,000 บาท/คืน", "coverage_details": "รพ.ในเครือข่าย, ไม่ต้องสำรองจ่าย", "employer_contribution": 100, "employee_contribution": 0},
    {"name": "ประกันทันตกรรม", "category": "dental", "description": "คุ้มครอง 5,000 บาท/ปี ครอบคลุมอุดฟัน, ขูดหินปูน, ถอนฟัน", "coverage_details": "คลินิกในเครือข่ายเท่านั้น", "employer_contribution": 100, "employee_contribution": 0},
    {"name": "ประกันชีวิตกลุ่ม", "category": "life", "description": "ทุนประกัน 10 เท่าของเงินเดือน สูงสุด 2,000,000 บาท", "coverage_details": "คุ้มครองตลอด 24 ชั่วโมง รวมอุบัติเหตุ", "employer_contribution": 100, "employee_contribution": 0},
    {"name": "กองทุนสำรองเลี้ยงชีพ", "category": "retirement", "description": "บริษัทสมทบ 5% ของเงินเดือน พนักงานสมทบ 3-15% ตามความสมัครใจ", "coverage_details": "บริหารโดย บลจ.กสิกรไทย", "employer_contribution": 5, "employee_contribution": 3},
    {"name": "ค่าเดินทาง", "category": "other", "description": "เบี้ยเลี้ยงค่าเดินทาง 2,500 บาท/เดือน สำหรับพนักงานที่ไม่มีรถประจำตำแหน่ง", "coverage_details": "จ่ายรวมกับเงินเดือน", "employer_contribution": 100, "employee_contribution": 0},
    {"name": "ค่าอาหารกลางวัน", "category": "other", "description": "เบี้ยเลี้ยงค่าอาหารกลางวัน 50 บาท/วันทำงาน", "coverage_details": "จ่ายรวมกับเงินเดือน", "employer_contribution": 100, "employee_contribution": 0},
]


# ──────────────────────────── Position-to-department mapping ────────────────────────────

DEPT_POSITION_MAP = {
    "ฝ่ายเทคโนโลยีสารสนเทศ": [0, 1, 2, 3, 4, 5, 6, 7],  # IT positions
    "ฝ่ายทรัพยากรบุคคล": [8, 9, 10, 11],  # HR positions
    "ฝ่ายการเงินและบัญชี": [12, 13, 14, 15],  # Finance positions
    "ฝ่ายการตลาด": [16, 17, 18, 19, 20],  # Marketing positions
    "ฝ่ายปฏิบัติการ": [21, 22, 23, 24, 25],  # Operations positions
}

DEPT_SIZES = {
    "ฝ่ายเทคโนโลยีสารสนเทศ": 40,
    "ฝ่ายทรัพยากรบุคคล": 20,
    "ฝ่ายการเงินและบัญชี": 25,
    "ฝ่ายการตลาด": 30,
    "ฝ่ายปฏิบัติการ": 35,
}


def seed():
    db = SessionLocal()
    try:
        print("🌱 กำลัง seed ข้อมูล Mock HRM...")

        # 1. Departments
        departments = []
        for d in DEPARTMENTS_DATA:
            dept = Department(**d)
            db.add(dept)
            departments.append(dept)
        db.flush()
        print(f"  ✅ Departments: {len(departments)}")

        # 2. Positions
        positions = []
        for p in POSITIONS_DATA:
            pos = Position(**p)
            db.add(pos)
            positions.append(pos)
        db.flush()
        print(f"  ✅ Positions: {len(positions)}")

        # 3. Leave Types
        leave_types = []
        for lt in LEAVE_TYPES_DATA:
            ltype = LeaveType(**lt)
            db.add(ltype)
            leave_types.append(ltype)
        db.flush()
        print(f"  ✅ Leave Types: {len(leave_types)}")

        # 4. Employees (150)
        employees = []
        name_idx = 0
        used_emails = set()

        for dept in departments:
            dept_name = dept.name
            dept_pos_indices = DEPT_POSITION_MAP[dept_name]
            count = DEPT_SIZES[dept_name]

            # First employee is manager
            manager = None

            for i in range(count):
                fn_idx = name_idx % len(FIRST_NAMES_TH)
                ln_idx = name_idx % len(LAST_NAMES_TH)

                first_th = FIRST_NAMES_TH[fn_idx]
                last_th = LAST_NAMES_TH[ln_idx]
                first_en = FIRST_NAMES_EN[fn_idx]
                last_en = LAST_NAMES_EN[ln_idx]

                # Pick position
                if i == 0:
                    # Manager of department
                    pos_idx = dept_pos_indices[-1] if positions[dept_pos_indices[-1]].level >= 5 else dept_pos_indices[0]
                else:
                    pos_idx = random.choice(dept_pos_indices[:-1]) if len(dept_pos_indices) > 1 else dept_pos_indices[0]

                pos = positions[pos_idx]

                # Generate unique email
                base_email = f"{first_en.lower()}.{last_en.lower()}@company.com"
                email = base_email
                suffix = 1
                while email in used_emails:
                    email = f"{first_en.lower()}.{last_en.lower()}{suffix}@company.com"
                    suffix += 1
                used_emails.add(email)

                # Random data
                hire_year = random.randint(2018, 2025)
                hire_month = random.randint(1, 12)
                hire_day = random.randint(1, 28)
                gender = random.choice(["ชาย", "หญิง"])
                birth_year = random.randint(1975, 2000)

                salary = random.randint(int(pos.min_salary or 18000), int(pos.max_salary or 50000))
                salary = round(salary / 1000) * 1000  # round to nearest 1000

                emp = Employee(
                    employee_code=f"EMP{name_idx + 1:04d}",
                    first_name=first_th,
                    last_name=last_th,
                    first_name_en=first_en,
                    last_name_en=last_en,
                    email=email,
                    phone=_random_phone(),
                    date_of_birth=date(birth_year, random.randint(1, 12), random.randint(1, 28)),
                    gender=gender,
                    national_id=_random_national_id(),
                    address=f"{random.randint(1, 999)} หมู่ {random.randint(1, 15)} ต.{random.choice(['ในเมือง', 'บางรัก', 'ปทุมวัน', 'สาทร', 'บางกะปิ'])} อ.{random.choice(['เมือง', 'บางพลี', 'ลาดกระบัง', 'คลองเตย'])} จ.{random.choice(['กรุงเทพฯ', 'นนทบุรี', 'สมุทรปราการ', 'ปทุมธานี'])}",
                    department_id=dept.id,
                    position_id=pos.id,
                    manager_id=manager.id if manager and i > 0 else None,
                    hire_date=date(hire_year, hire_month, hire_day),
                    employment_type=random.choices(["full_time", "contract"], weights=[90, 10])[0],
                    status=random.choices(["active", "on_leave"], weights=[95, 5])[0],
                    probation_end_date=date(hire_year, hire_month, hire_day) + timedelta(days=120) if hire_year >= 2025 else None,
                    bank_account=_random_bank_account(),
                    bank_name=random.choice(["ธนาคารกสิกรไทย", "ธนาคารกรุงเทพ", "ธนาคารไทยพาณิชย์", "ธนาคารกรุงไทย"]),
                    tax_id=f"{random.randint(1000000000000, 9999999999999)}",
                    social_security_id=f"{random.randint(1000000000, 9999999999)}",
                )
                db.add(emp)
                db.flush()

                if i == 0:
                    manager = emp
                    dept.head_employee_id = emp.id

                employees.append((emp, salary))
                name_idx += 1

        db.flush()
        print(f"  ✅ Employees: {len(employees)}")

        # 5. Leave Balances & Records
        leave_balance_count = 0
        leave_record_count = 0
        today = date.today()

        for emp, _ in employees:
            for lt in leave_types:
                if lt.name == "ลาคลอด" and random.random() > 0.05:
                    continue
                if lt.name == "ลาบวช" and random.random() > 0.1:
                    continue

                max_days = lt.max_days_per_year
                used = round(random.uniform(0, min(max_days * 0.7, 15)), 1)
                used = max(0, used)

                bal = LeaveBalance(
                    employee_id=emp.id,
                    leave_type_id=lt.id,
                    year=2026,
                    total_days=max_days,
                    used_days=used,
                    remaining_days=max_days - used,
                )
                db.add(bal)
                leave_balance_count += 1

                # Generate some leave records
                if used > 0:
                    remaining_days = used
                    while remaining_days > 0:
                        leave_days = min(random.choice([0.5, 1, 1, 2, 3, 5]), remaining_days)
                        start = today - timedelta(days=random.randint(1, 150))
                        end = start + timedelta(days=max(0, int(leave_days) - 1))

                        lr = LeaveRecord(
                            employee_id=emp.id,
                            leave_type_id=lt.id,
                            start_date=start,
                            end_date=end,
                            days=leave_days,
                            reason=random.choice([
                                "ธุระส่วนตัว", "ไม่สบาย", "พักผ่อน", "ท่องเที่ยว",
                                "ไปหาหมอ", "ธุระครอบครัว", "อบรม", "นัดราชการ",
                            ]),
                            status=random.choices(["approved", "pending", "rejected"], weights=[85, 10, 5])[0],
                            approved_by=employees[0][0].id if random.random() > 0.1 else None,
                        )
                        db.add(lr)
                        leave_record_count += 1
                        remaining_days -= leave_days

        db.flush()
        print(f"  ✅ Leave Balances: {leave_balance_count}")
        print(f"  ✅ Leave Records: {leave_record_count}")

        # 6. Attendance Records (last 30 days)
        att_count = 0
        for emp, _ in employees:
            for day_offset in range(30):
                d = today - timedelta(days=day_offset)
                if d.weekday() >= 5:  # skip weekends
                    continue

                status = random.choices(
                    ["present", "late", "wfh", "absent", "half_day"],
                    weights=[70, 10, 12, 3, 5]
                )[0]

                if status == "present":
                    base_hour = 8
                    base_min = random.randint(20, 40)
                elif status == "late":
                    base_hour = random.choice([8, 9])
                    base_min = random.randint(46, 59) if base_hour == 8 else random.randint(0, 30)
                else:
                    base_hour = 8
                    base_min = 30
                clock_in = datetime(d.year, d.month, d.day, base_hour, base_min) if status not in ["absent"] else None
                clock_out = datetime(d.year, d.month, d.day, 17, random.randint(30, 59)) if clock_in else None

                ot = round(random.choice([0, 0, 0, 0, 1, 1.5, 2, 3]), 1) if status == "present" and random.random() > 0.7 else 0

                att = AttendanceRecord(
                    employee_id=emp.id,
                    date=d,
                    clock_in=clock_in,
                    clock_out=clock_out,
                    status=status,
                    overtime_hours=ot,
                    note="WFH" if status == "wfh" else None,
                )
                db.add(att)
                att_count += 1

        db.flush()
        print(f"  ✅ Attendance Records: {att_count}")

        # 7. Salary Records (last 6 months)
        salary_count = 0
        for emp, base_salary in employees:
            for month_offset in range(6):
                m = today.month - month_offset
                y = today.year
                if m <= 0:
                    m += 12
                    y -= 1

                allowances = random.choice([0, 1500, 2500, 3000, 5000])
                ot_pay = round(random.uniform(0, 5000), 2)
                bonus = round(random.uniform(0, base_salary * 0.1), 2) if month_offset == 0 and random.random() > 0.7 else 0
                deductions = round(random.uniform(0, 500), 2)
                tax = round(base_salary * random.uniform(0.03, 0.1), 2)
                ss = min(750, round(base_salary * 0.05, 2))
                net = base_salary + allowances + ot_pay + bonus - deductions - tax - ss

                sr = SalaryRecord(
                    employee_id=emp.id,
                    month=m, year=y,
                    base_salary=base_salary,
                    allowances=allowances,
                    overtime_pay=ot_pay,
                    bonus=bonus,
                    deductions=deductions,
                    tax=tax,
                    social_security=ss,
                    net_salary=round(net, 2),
                    payment_date=date(y, m, 25) if month_offset > 0 else None,
                    payment_status="paid" if month_offset > 0 else "pending",
                )
                db.add(sr)
                salary_count += 1

        db.flush()
        print(f"  ✅ Salary Records: {salary_count}")

        # 8. Performance Reviews
        perf_count = 0
        for emp, _ in employees:
            for period in ["2025-H2", "2026-H1"]:
                overall = round(random.uniform(2.5, 5.0), 1)
                pr = PerformanceReview(
                    employee_id=emp.id,
                    reviewer_id=employees[0][0].id,
                    review_period=period,
                    overall_score=overall,
                    kpi_score=round(random.uniform(2.0, 5.0), 1),
                    competency_score=round(random.uniform(2.5, 5.0), 1),
                    strengths=random.choice([
                        "ทำงานตรงเวลา รับผิดชอบดี", "มีความคิดสร้างสรรค์", "ทำงานเป็นทีมได้ดี",
                        "เรียนรู้เร็ว ปรับตัวดี", "สื่อสารชัดเจน ประสานงานดี",
                    ]),
                    improvements=random.choice([
                        "ควรพัฒนาทักษะการนำเสนอ", "ควรจัดลำดับความสำคัญของงาน",
                        "ควรเรียนรู้เทคโนโลยีใหม่", "ควรปรับปรุงการบริหารเวลา",
                    ]),
                    goals=random.choice([
                        "ปรับปรุงประสิทธิภาพ 10%", "เรียนจบหลักสูตร certification",
                        "Lead project ใหม่ 1 โปรเจค", "ลดข้อร้องเรียน 20%",
                    ]),
                    status="approved" if period == "2025-H2" else "submitted",
                )
                db.add(pr)
                perf_count += 1

        db.flush()
        print(f"  ✅ Performance Reviews: {perf_count}")

        # 9. Policies
        for p in POLICIES_DATA:
            pol = Policy(**p)
            db.add(pol)
        db.flush()
        print(f"  ✅ Policies: {len(POLICIES_DATA)}")

        # 10. Announcements
        for a in ANNOUNCEMENTS_DATA:
            ann = Announcement(**a, author_id=employees[0][0].id)
            db.add(ann)
        db.flush()
        print(f"  ✅ Announcements: {len(ANNOUNCEMENTS_DATA)}")

        # 11. Benefit Plans & Employee Benefits
        benefit_plans = []
        for b in BENEFIT_PLANS_DATA:
            bp = BenefitPlan(**b)
            db.add(bp)
            benefit_plans.append(bp)
        db.flush()

        eb_count = 0
        for emp, _ in employees:
            for bp in benefit_plans:
                if random.random() > 0.15:  # 85% enrollment rate
                    eb = EmployeeBenefit(
                        employee_id=emp.id,
                        benefit_plan_id=bp.id,
                        enrolled_date=emp.hire_date,
                        status="active",
                    )
                    db.add(eb)
                    eb_count += 1

        db.flush()
        print(f"  ✅ Benefit Plans: {len(benefit_plans)}")
        print(f"  ✅ Employee Benefits: {eb_count}")

        db.commit()
        print(f"\n🎉 Seed สำเร็จ! รวม {len(employees)} พนักงาน ครบทุกมิติ")

    except Exception as e:
        db.rollback()
        print(f"❌ Seed error: {e}")
        raise
    finally:
        db.close()


if __name__ == "__main__":
    reset_db()
    seed()
