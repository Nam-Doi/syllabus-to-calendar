"""
Chat Service — Function Calling pattern with Gemini.

Flow:
  1. User gửi câu hỏi
  2. Gemini nhận câu hỏi + function declarations
  3. Gemini quyết định gọi function nào (get_events, get_courses, ...)
  4. Backend thực thi DB query, trả kết quả JSON cho Gemini
  5. Gemini tổng hợp câu trả lời tự nhiên
"""
from __future__ import annotations

import json
import logging
from datetime import datetime, timedelta, timezone
from typing import Optional, Any
from uuid import UUID

from google import genai
from google.genai import types as gtypes
from sqlalchemy import select, and_, func, extract, cast, String
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.models import Course, Event

logger = logging.getLogger(__name__)


# ─── Gemini Client ────────────────────────────────────────────────────────────

def _gemini_client() -> genai.Client:
    return genai.Client(api_key=settings.GEMINI_API_KEY)


# ─── Function Declarations for Gemini ─────────────────────────────────────────

FUNCTION_DECLARATIONS = [
    gtypes.FunctionDeclaration(
        name="get_courses",
        description="Lấy danh sách tất cả các khóa học/môn học của người dùng. Trả về thông tin: tên, mã, giảng viên, học kỳ, ngày bắt đầu/kết thúc.",
        parameters=gtypes.Schema(
            type="OBJECT",
            properties={},
        ),
    ),
    gtypes.FunctionDeclaration(
        name="get_events",
        description="Lấy danh sách các sự kiện/lịch trình (bài giảng, bài tập, kỳ thi, ngày nghỉ, v.v.) với các bộ lọc tùy chọn. Tham số label chấp nhận bất kỳ giá trị nào (exam, assignment, lecture, holiday, seminar, lab, project, v.v.).",
        parameters=gtypes.Schema(
            type="OBJECT",
            properties={
                "course_id": gtypes.Schema(type="STRING", description="ID của khóa học cụ thể (UUID). Chỉ dùng khi biết chính xác course_id."),
                "label": gtypes.Schema(type="STRING", description="Loại sự kiện: exam, assignment, lecture, holiday, seminar, lab, project, hoặc bất kỳ label nào tồn tại. Không giới hạn giá trị."),
                "month": gtypes.Schema(type="INTEGER", description="Tháng (1-12) để lọc theo start_time."),
                "week_number": gtypes.Schema(type="INTEGER", description="Số tuần trong kế hoạch giảng dạy."),
                "status": gtypes.Schema(type="STRING", description="Trạng thái: pending, in-progress, completed."),
                "title_contains": gtypes.Schema(type="STRING", description="Tìm kiếm sự kiện có tiêu đề chứa chuỗi này (không phân biệt hoa thường)."),
            },
        ),
    ),
    gtypes.FunctionDeclaration(
        name="get_upcoming_events",
        description="Lấy các sự kiện sắp tới trong N ngày kể từ hôm nay (mặc định 7 ngày). Hữu ích cho câu hỏi 'tuần này có gì', 'sắp tới có deadline nào'.",
        parameters=gtypes.Schema(
            type="OBJECT",
            properties={
                "days": gtypes.Schema(type="INTEGER", description="Số ngày kể từ hôm nay (mặc định: 7)."),
            },
        ),
    ),
    gtypes.FunctionDeclaration(
        name="get_event_labels",
        description="Lấy danh sách tất cả các loại label (phân loại) sự kiện tồn tại trong dữ liệu. Giúp biết có những loại sự kiện nào (ví dụ: exam, lecture, assignment, holiday, ...).",
        parameters=gtypes.Schema(
            type="OBJECT",
            properties={},
        ),
    ),
    gtypes.FunctionDeclaration(
        name="sync_to_calendar",
        description="Yêu cầu đồng bộ tất cả sự kiện chưa sync lên Google Calendar. Chỉ gọi khi user yêu cầu sync/đồng bộ lịch.",
        parameters=gtypes.Schema(
            type="OBJECT",
            properties={},
        ),
    ),
]


# ─── DB Query Functions ───────────────────────────────────────────────────────

async def fn_get_courses(db: AsyncSession, user_id: UUID, **kwargs) -> list[dict]:
    result = await db.execute(
        select(Course)
        .where(Course.user_id == user_id)
        .order_by(Course.created_at.desc())
    )
    courses = result.scalars().all()
    return [
        {
            "id": str(c.id),
            "name": c.name,
            "code": c.code,
            "term": c.term,
            "instructor": c.instructor,
            "start_date": str(c.start_date) if c.start_date else None,
            "end_date": str(c.end_date) if c.end_date else None,
        }
        for c in courses
    ]


async def fn_get_events(
    db: AsyncSession,
    user_id: UUID,
    *,
    course_id: str | None = None,
    label: str | None = None,
    month: int | None = None,
    week_number: int | None = None,
    status: str | None = None,
    title_contains: str | None = None,
    **kwargs,
) -> list[dict]:
    filters = [Event.user_id == user_id]

    if course_id:
        try:
            filters.append(Event.course_id == UUID(course_id))
        except ValueError:
            pass

    if label:
        filters.append(func.lower(Event.label) == label.lower())

    if month:
        filters.append(extract("month", Event.start_time) == month)

    if week_number:
        filters.append(Event.week_number == week_number)

    if status:
        filters.append(Event.status == status)

    if title_contains:
        filters.append(Event.title.ilike(f"%{title_contains}%"))

    result = await db.execute(
        select(Event).where(and_(*filters)).order_by(Event.start_time)
    )
    events = result.scalars().all()
    return [
        {
            "id": str(e.id),
            "title": e.title,
            "label": e.label,
            "description": e.description,
            "start_time": str(e.start_time) if e.start_time else None,
            "end_time": str(e.end_time) if e.end_time else None,
            "status": e.status,
            "week_number": e.week_number,
            "course_id": str(e.course_id) if e.course_id else None,
        }
        for e in events
    ]


async def fn_get_upcoming_events(
    db: AsyncSession,
    user_id: UUID,
    *,
    days: int = 7,
    **kwargs,
) -> list[dict]:
    now = datetime.now(timezone.utc)
    end = now + timedelta(days=days)

    result = await db.execute(
        select(Event).where(
            Event.user_id == user_id,
            Event.start_time.is_not(None),
            Event.start_time >= now,
            Event.start_time <= end,
        ).order_by(Event.start_time)
    )
    events = result.scalars().all()
    return [
        {
            "id": str(e.id),
            "title": e.title,
            "label": e.label,
            "description": e.description,
            "start_time": str(e.start_time) if e.start_time else None,
            "end_time": str(e.end_time) if e.end_time else None,
            "status": e.status,
            "week_number": e.week_number,
        }
        for e in events
    ]


async def fn_get_event_labels(db: AsyncSession, user_id: UUID, **kwargs) -> list[str]:
    result = await db.execute(
        select(func.distinct(Event.label))
        .where(Event.user_id == user_id, Event.label.is_not(None))
    )
    return [row[0] for row in result.all()]


async def fn_sync_to_calendar(db: AsyncSession, user_id: UUID, **kwargs) -> dict:
    """Trả về hướng dẫn — sync thực sự được thực hiện qua API endpoint."""
    return {
        "message": "Để đồng bộ Google Calendar, vui lòng sử dụng nút 'Sync' trên giao diện Calendar. "
                   "Tôi có thể giúp bạn kiểm tra các sự kiện chưa sync nếu cần."
    }


# ─── Function Router ──────────────────────────────────────────────────────────

FUNCTION_MAP = {
    "get_courses": fn_get_courses,
    "get_events": fn_get_events,
    "get_upcoming_events": fn_get_upcoming_events,
    "get_event_labels": fn_get_event_labels,
    "sync_to_calendar": fn_sync_to_calendar,
}


async def _execute_function_call(
    fn_name: str,
    fn_args: dict[str, Any],
    db: AsyncSession,
    user_id: UUID,
) -> Any:
    """Execute a function call from Gemini and return the result."""
    fn = FUNCTION_MAP.get(fn_name)
    if not fn:
        return {"error": f"Unknown function: {fn_name}"}
    try:
        return await fn(db, user_id, **fn_args)
    except Exception as exc:
        logger.error("Function %s failed: %s", fn_name, exc)
        return {"error": f"Lỗi khi thực thi {fn_name}: {str(exc)}"}


# ─── System Prompt ────────────────────────────────────────────────────────────

_SYSTEM_PROMPT = """Bạn là trợ lý học tập thông minh. Bạn tương tác với Database thông qua các Functions được cung cấp.

NGUYÊN TẮC:
1. Khi user hỏi về lịch học, sự kiện, môn học → GỌI FUNCTION để truy vấn DB, KHÔNG tự bịa dữ liệu.
2. Nếu cần biết có những loại sự kiện nào → gọi get_event_labels trước.
3. Trả lời dựa trên KẾT QUẢ THỰC TẾ từ DB. Nếu không tìm thấy dữ liệu, thông báo rõ.
4. Trả lời ngắn gọn, có cấu trúc (bullet list nếu nhiều item, ngày tháng cụ thể).
5. Sử dụng tiếng Việt.
6. Nếu user muốn sync lên Google Calendar → gọi sync_to_calendar.
7. Ngày hôm nay: {today}
"""


# ─── Main Chat Handler ───────────────────────────────────────────────────────

async def handle_chat(
    db: AsyncSession,
    user_id: UUID,
    question: str,
    history: list[dict] | None = None,
) -> dict:
    """
    Process a chat message using Gemini Function Calling.
    Returns: {"answer": str, "action_taken": str | None}
    """
    client = _gemini_client()

    system_prompt = _SYSTEM_PROMPT.format(
        today=datetime.now(timezone.utc).strftime("%Y-%m-%d")
    )

    # Build conversation history
    contents: list[gtypes.ContentUnion] = []
    for msg in (history or []):
        role = "user" if msg.get("role") == "user" else "model"
        contents.append(gtypes.Content(role=role, parts=[gtypes.Part(text=msg["text"])]))

    # Append the current user message
    contents.append(gtypes.Content(role="user", parts=[gtypes.Part(text=question)]))

    # Tools configuration
    tools = gtypes.Tool(function_declarations=FUNCTION_DECLARATIONS)

    action_taken = None

    # Function calling loop (max 5 iterations to prevent infinite loops)
    for _ in range(5):
        response = client.models.generate_content(
            model=settings.GEMINI_MODEL,
            contents=contents,
            config=gtypes.GenerateContentConfig(
                system_instruction=system_prompt,
                tools=[tools],
                temperature=0.3,
                max_output_tokens=2048,
            ),
        )

        # Check if the model wants to call a function
        candidate = response.candidates[0]
        part = candidate.content.parts[0]

        if part.function_call:
            fn_call = part.function_call
            fn_name = fn_call.name
            fn_args = dict(fn_call.args) if fn_call.args else {}

            logger.info("Gemini called function: %s(%s)", fn_name, fn_args)
            action_taken = fn_name

            # Execute the function
            result = await _execute_function_call(fn_name, fn_args, db, user_id)

            # Add the function call and result to contents for next turn
            contents.append(candidate.content)
            contents.append(
                gtypes.Content(
                    role="user",
                    parts=[
                        gtypes.Part(
                            function_response=gtypes.FunctionResponse(
                                name=fn_name,
                                response={"result": result},
                            )
                        )
                    ],
                )
            )
            # Continue loop — Gemini may want to call another function or generate final answer
            continue
        else:
            # Model returned a text response — we're done
            answer = part.text.strip() if part.text else "Không có phản hồi từ AI."
            return {"answer": answer, "action_taken": action_taken}

    # If we exhausted iterations, return last response
    return {
        "answer": "Đã xử lý xong. Vui lòng hỏi lại nếu cần thêm thông tin.",
        "action_taken": action_taken,
    }
