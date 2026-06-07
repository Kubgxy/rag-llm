import uuid
from datetime import datetime, timezone
from sqlalchemy import (
    String, Text, Boolean, Integer, Float, Date, DateTime,
    ForeignKey, Index, JSON,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship
from mock_hrm_server.database import Base


def utcnow():
    return datetime.now(timezone.utc).replace(tzinfo=None)


def new_id():
    return str(uuid.uuid4())


class Department(Base):
    __tablename__ = "departments"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=new_id)
    name: Mapped[str] = mapped_column(String(100), unique=True, nullable=False)
    name_en: Mapped[str] = mapped_column(String(100), nullable=False)
    description: Mapped[str | None] = mapped_column(Text)
    head_employee_id: Mapped[str | None] = mapped_column(String(36))
    location: Mapped[str | None] = mapped_column(String(200))
    budget: Mapped[float | None] = mapped_column(Float)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=utcnow, onupdate=utcnow)

    employees: Mapped[list["Employee"]] = relationship(back_populates="department")


class Position(Base):
    __tablename__ = "positions"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=new_id)
    title: Mapped[str] = mapped_column(String(200), nullable=False)
    title_en: Mapped[str] = mapped_column(String(200), nullable=False)
    level: Mapped[int] = mapped_column(Integer, default=1)  # 1=Junior, 2=Mid, 3=Senior, 4=Lead, 5=Manager, 6=Director
    description: Mapped[str | None] = mapped_column(Text)
    min_salary: Mapped[float | None] = mapped_column(Float)
    max_salary: Mapped[float | None] = mapped_column(Float)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=utcnow, onupdate=utcnow)

    employees: Mapped[list["Employee"]] = relationship(back_populates="position")


class Employee(Base):
    __tablename__ = "employees"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=new_id)
    employee_code: Mapped[str] = mapped_column(String(20), unique=True, nullable=False)
    first_name: Mapped[str] = mapped_column(String(100), nullable=False)
    last_name: Mapped[str] = mapped_column(String(100), nullable=False)
    first_name_en: Mapped[str | None] = mapped_column(String(100))
    last_name_en: Mapped[str | None] = mapped_column(String(100))
    email: Mapped[str] = mapped_column(String(255), unique=True, nullable=False)
    phone: Mapped[str | None] = mapped_column(String(20))
    date_of_birth: Mapped[datetime | None] = mapped_column(Date)
    gender: Mapped[str | None] = mapped_column(String(10))
    national_id: Mapped[str | None] = mapped_column(String(20))
    address: Mapped[str | None] = mapped_column(Text)

    department_id: Mapped[str] = mapped_column(String(36), ForeignKey("departments.id"), nullable=False)
    position_id: Mapped[str] = mapped_column(String(36), ForeignKey("positions.id"), nullable=False)
    manager_id: Mapped[str | None] = mapped_column(String(36), ForeignKey("employees.id"))

    hire_date: Mapped[datetime] = mapped_column(Date, nullable=False)
    employment_type: Mapped[str] = mapped_column(String(20), default="full_time")  # full_time, part_time, contract
    status: Mapped[str] = mapped_column(String(20), default="active")  # active, resigned, terminated, on_leave
    probation_end_date: Mapped[datetime | None] = mapped_column(Date)
    bank_account: Mapped[str | None] = mapped_column(String(30))
    bank_name: Mapped[str | None] = mapped_column(String(100))
    tax_id: Mapped[str | None] = mapped_column(String(20))
    social_security_id: Mapped[str | None] = mapped_column(String(20))

    created_at: Mapped[datetime] = mapped_column(DateTime, default=utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=utcnow, onupdate=utcnow)

    department: Mapped["Department"] = relationship(back_populates="employees")
    position: Mapped["Position"] = relationship(back_populates="employees")
    manager: Mapped["Employee | None"] = relationship(remote_side=[id])
    leaves: Mapped[list["LeaveRecord"]] = relationship(back_populates="employee", foreign_keys="[LeaveRecord.employee_id]")
    attendance_records: Mapped[list["AttendanceRecord"]] = relationship(back_populates="employee")
    salary_records: Mapped[list["SalaryRecord"]] = relationship(back_populates="employee")
    performance_reviews: Mapped[list["PerformanceReview"]] = relationship(back_populates="employee", foreign_keys="[PerformanceReview.employee_id]")
    benefits: Mapped[list["EmployeeBenefit"]] = relationship(back_populates="employee")

    __table_args__ = (
        Index("idx_emp_department", "department_id"),
        Index("idx_emp_email", "email"),
        Index("idx_emp_code", "employee_code"),
        Index("idx_emp_updated", "updated_at"),
    )


class LeaveType(Base):
    __tablename__ = "leave_types"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=new_id)
    name: Mapped[str] = mapped_column(String(100), nullable=False)
    name_en: Mapped[str] = mapped_column(String(100), nullable=False)
    description: Mapped[str | None] = mapped_column(Text)
    max_days_per_year: Mapped[int] = mapped_column(Integer, default=0)
    is_paid: Mapped[bool] = mapped_column(Boolean, default=True)
    requires_approval: Mapped[bool] = mapped_column(Boolean, default=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=utcnow)


class LeaveRecord(Base):
    __tablename__ = "leave_records"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=new_id)
    employee_id: Mapped[str] = mapped_column(String(36), ForeignKey("employees.id"), nullable=False)
    leave_type_id: Mapped[str] = mapped_column(String(36), ForeignKey("leave_types.id"), nullable=False)
    start_date: Mapped[datetime] = mapped_column(Date, nullable=False)
    end_date: Mapped[datetime] = mapped_column(Date, nullable=False)
    days: Mapped[float] = mapped_column(Float, nullable=False)
    reason: Mapped[str | None] = mapped_column(Text)
    status: Mapped[str] = mapped_column(String(20), default="pending")  # pending, approved, rejected, cancelled
    approved_by: Mapped[str | None] = mapped_column(String(36), ForeignKey("employees.id"))
    approved_at: Mapped[datetime | None] = mapped_column(DateTime)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=utcnow, onupdate=utcnow)

    employee: Mapped["Employee"] = relationship(back_populates="leaves", foreign_keys=[employee_id])
    leave_type: Mapped["LeaveType"] = relationship()

    __table_args__ = (
        Index("idx_leave_employee", "employee_id"),
        Index("idx_leave_dates", "start_date", "end_date"),
        Index("idx_leave_updated", "updated_at"),
    )


class LeaveBalance(Base):
    __tablename__ = "leave_balances"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=new_id)
    employee_id: Mapped[str] = mapped_column(String(36), ForeignKey("employees.id"), nullable=False)
    leave_type_id: Mapped[str] = mapped_column(String(36), ForeignKey("leave_types.id"), nullable=False)
    year: Mapped[int] = mapped_column(Integer, nullable=False)
    total_days: Mapped[float] = mapped_column(Float, default=0)
    used_days: Mapped[float] = mapped_column(Float, default=0)
    remaining_days: Mapped[float] = mapped_column(Float, default=0)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=utcnow, onupdate=utcnow)

    employee: Mapped["Employee"] = relationship()
    leave_type: Mapped["LeaveType"] = relationship()

    __table_args__ = (
        Index("idx_balance_employee_year", "employee_id", "year"),
    )


class AttendanceRecord(Base):
    __tablename__ = "attendance_records"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=new_id)
    employee_id: Mapped[str] = mapped_column(String(36), ForeignKey("employees.id"), nullable=False)
    date: Mapped[datetime] = mapped_column(Date, nullable=False)
    clock_in: Mapped[datetime | None] = mapped_column(DateTime)
    clock_out: Mapped[datetime | None] = mapped_column(DateTime)
    status: Mapped[str] = mapped_column(String(20), default="present")  # present, absent, late, half_day, wfh, holiday
    overtime_hours: Mapped[float] = mapped_column(Float, default=0)
    note: Mapped[str | None] = mapped_column(Text)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=utcnow, onupdate=utcnow)

    employee: Mapped["Employee"] = relationship(back_populates="attendance_records")

    __table_args__ = (
        Index("idx_att_employee_date", "employee_id", "date"),
        Index("idx_att_updated", "updated_at"),
    )


class SalaryRecord(Base):
    __tablename__ = "salary_records"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=new_id)
    employee_id: Mapped[str] = mapped_column(String(36), ForeignKey("employees.id"), nullable=False)
    month: Mapped[int] = mapped_column(Integer, nullable=False)
    year: Mapped[int] = mapped_column(Integer, nullable=False)
    base_salary: Mapped[float] = mapped_column(Float, nullable=False)
    allowances: Mapped[float] = mapped_column(Float, default=0)
    overtime_pay: Mapped[float] = mapped_column(Float, default=0)
    bonus: Mapped[float] = mapped_column(Float, default=0)
    deductions: Mapped[float] = mapped_column(Float, default=0)
    tax: Mapped[float] = mapped_column(Float, default=0)
    social_security: Mapped[float] = mapped_column(Float, default=0)
    net_salary: Mapped[float] = mapped_column(Float, nullable=False)
    payment_date: Mapped[datetime | None] = mapped_column(Date)
    payment_status: Mapped[str] = mapped_column(String(20), default="pending")
    created_at: Mapped[datetime] = mapped_column(DateTime, default=utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=utcnow, onupdate=utcnow)

    employee: Mapped["Employee"] = relationship(back_populates="salary_records")

    __table_args__ = (
        Index("idx_salary_employee_period", "employee_id", "year", "month"),
        Index("idx_salary_updated", "updated_at"),
    )


class PerformanceReview(Base):
    __tablename__ = "performance_reviews"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=new_id)
    employee_id: Mapped[str] = mapped_column(String(36), ForeignKey("employees.id"), nullable=False)
    reviewer_id: Mapped[str | None] = mapped_column(String(36), ForeignKey("employees.id"))
    review_period: Mapped[str] = mapped_column(String(20), nullable=False)  # "2026-H1", "2025-H2"
    overall_score: Mapped[float] = mapped_column(Float, nullable=False)  # 1.0 - 5.0
    kpi_score: Mapped[float | None] = mapped_column(Float)
    competency_score: Mapped[float | None] = mapped_column(Float)
    strengths: Mapped[str | None] = mapped_column(Text)
    improvements: Mapped[str | None] = mapped_column(Text)
    goals: Mapped[str | None] = mapped_column(Text)
    status: Mapped[str] = mapped_column(String(20), default="draft")  # draft, submitted, approved
    created_at: Mapped[datetime] = mapped_column(DateTime, default=utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=utcnow, onupdate=utcnow)

    employee: Mapped["Employee"] = relationship(back_populates="performance_reviews", foreign_keys=[employee_id])

    __table_args__ = (
        Index("idx_perf_employee", "employee_id"),
        Index("idx_perf_updated", "updated_at"),
    )


class Policy(Base):
    __tablename__ = "policies"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=new_id)
    title: Mapped[str] = mapped_column(String(300), nullable=False)
    category: Mapped[str] = mapped_column(String(50), nullable=False)  # leave, attendance, conduct, benefits, general
    content: Mapped[str] = mapped_column(Text, nullable=False)
    effective_date: Mapped[datetime] = mapped_column(Date, nullable=False)
    version: Mapped[str] = mapped_column(String(10), default="1.0")
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=utcnow, onupdate=utcnow)

    __table_args__ = (
        Index("idx_policy_category", "category"),
        Index("idx_policy_updated", "updated_at"),
    )


class Announcement(Base):
    __tablename__ = "announcements"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=new_id)
    title: Mapped[str] = mapped_column(String(300), nullable=False)
    content: Mapped[str] = mapped_column(Text, nullable=False)
    category: Mapped[str] = mapped_column(String(50), default="general")  # general, urgent, event, hr
    priority: Mapped[str] = mapped_column(String(10), default="normal")  # low, normal, high, urgent
    author_id: Mapped[str | None] = mapped_column(String(36), ForeignKey("employees.id"))
    is_pinned: Mapped[bool] = mapped_column(Boolean, default=False)
    publish_date: Mapped[datetime] = mapped_column(Date, nullable=False)
    expire_date: Mapped[datetime | None] = mapped_column(Date)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=utcnow, onupdate=utcnow)

    __table_args__ = (
        Index("idx_announce_updated", "updated_at"),
    )


class BenefitPlan(Base):
    __tablename__ = "benefit_plans"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=new_id)
    name: Mapped[str] = mapped_column(String(200), nullable=False)
    category: Mapped[str] = mapped_column(String(50), nullable=False)  # health, dental, life, retirement, other
    description: Mapped[str] = mapped_column(Text, nullable=False)
    coverage_details: Mapped[str | None] = mapped_column(Text)
    employer_contribution: Mapped[float] = mapped_column(Float, default=0)
    employee_contribution: Mapped[float] = mapped_column(Float, default=0)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=utcnow, onupdate=utcnow)


class EmployeeBenefit(Base):
    __tablename__ = "employee_benefits"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=new_id)
    employee_id: Mapped[str] = mapped_column(String(36), ForeignKey("employees.id"), nullable=False)
    benefit_plan_id: Mapped[str] = mapped_column(String(36), ForeignKey("benefit_plans.id"), nullable=False)
    enrolled_date: Mapped[datetime] = mapped_column(Date, nullable=False)
    status: Mapped[str] = mapped_column(String(20), default="active")  # active, cancelled, pending
    created_at: Mapped[datetime] = mapped_column(DateTime, default=utcnow)

    employee: Mapped["Employee"] = relationship(back_populates="benefits")
    benefit_plan: Mapped["BenefitPlan"] = relationship()

    __table_args__ = (
        Index("idx_empben_employee", "employee_id"),
    )


class WebhookRegistration(Base):
    __tablename__ = "webhook_registrations"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=new_id)
    url: Mapped[str] = mapped_column(Text, nullable=False)
    events: Mapped[str] = mapped_column(Text, nullable=False)  # comma-separated: "employee.updated,leave.created"
    secret: Mapped[str | None] = mapped_column(String(255))
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=utcnow)
