"use client";
import { useState, useEffect } from "react";
import { courseService, eventService, syllabusService } from "@/lib/services";
import type { SyllabusUpload, Course, CourseCreate, EventCreate, EventLabel } from "@/types";
import { LABEL_CONFIG, LABEL_ORDER } from "@/constants/event-labels";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api/v1";

/**
 * Kiểm tra xem chuỗi ngày `YYYY-MM-DD` có hợp lệ không (vd: 31/4 → invalid).
 * Trả về null nếu hợp lệ, hoặc thông báo lỗi nếu không.
 */
function validateDate(dateStr: string | undefined, fieldName: string): string | null {
  if (!dateStr) return null; // Optional field, skip
  const [y, m, d] = dateStr.split("-").map(Number);
  if (!y || !m || !d) return `${fieldName}: Định dạng ngày không hợp lệ (phải là YYYY-MM-DD).`;
  const date = new Date(y, m - 1, d);
  if (date.getFullYear() !== y || date.getMonth() + 1 !== m || date.getDate() !== d) {
    const monthNames = ["tháng 1","tháng 2","tháng 3","tháng 4","tháng 5","tháng 6",
      "tháng 7","tháng 8","tháng 9","tháng 10","tháng 11","tháng 12"];
    const maxDay = new Date(y, m, 0).getDate();
    return `${fieldName}: Ngày ${d} không tồn tại trong ${monthNames[m - 1]} (chỉ có ${maxDay} ngày).`;
  }
  return null;
}

interface Props {
  upload: SyllabusUpload;
  onClose: () => void;
  onCourseCreated: (course: Course) => void;
  onDiscarded?: (uploadId: string) => void;
}


function EventCard({
  ev, index, onChange, onRemove,
}: {
  ev: EventCreate;
  index: number;
  onChange: (i: number, patch: Partial<EventCreate>) => void;
  onRemove: (i: number) => void;
}) {
  const cfg = LABEL_CONFIG[ev.label || "lecture"] || LABEL_CONFIG.lecture;
  
  return (
    <div style={{
      display: "flex", gap: 12, padding: "12px 0",
      borderBottom: "1px solid #f1f3f4", alignItems: "flex-start",
      background: "#fff"
    }}>
      {/* Vạch màu chỉ thị loại sự kiện (Google style) */}
      <div style={{ 
        width: 4, height: 32, borderRadius: 4, 
        background: cfg.color, flexShrink: 0, marginTop: 2 
      }} />

      <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 6 }}>
        {/* Tiêu đề & Nút xóa */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8 }}>
          <input
            value={ev.title}
            onChange={e => onChange(index, { title: e.target.value })}
            placeholder="Thêm tiêu đề..."
            style={{
              flex: 1, border: "none", background: "transparent", 
              fontWeight: 500, fontSize: 15, color: "#3c4043", outline: "none", padding: 0
            }}
          />
          <button
            onClick={() => onRemove(index)}
            title="Xóa sự kiện"
            style={{ 
              background: "none", border: "none", cursor: "pointer", 
              color: "#9aa0a6", fontSize: 18, lineHeight: 1, padding: "0 4px" 
            }}
          >
            &times;
          </button>
        </div>

        {/* Cụm Ngày - Giờ - Loại */}
        <div style={{ display: "flex", gap: 16, alignItems: "center", flexWrap: "wrap" }}>
          <input
            type="date"
            value={ev.start_time ? ev.start_time.split("T")[0] : ""}
            onChange={e => onChange(index, { start_time: e.target.value ? e.target.value + "T00:00:00" : undefined })}
            style={{
              border: "none", fontSize: 13, color: "#5f6368", background: "transparent", 
              outline: "none", cursor: "pointer", padding: 0
            }}
          />
          <input
            type="time"
            value={ev.start_time && ev.start_time.includes("T") ? ev.start_time.split("T")[1]?.slice(0, 5) || "" : ""}
            onChange={e => {
              const datePart = ev.start_time?.split("T")[0] || new Date().toISOString().split("T")[0];
              onChange(index, { start_time: e.target.value ? `${datePart}T${e.target.value}:00` : `${datePart}T00:00:00` });
            }}
            style={{
              border: "none", fontSize: 13, color: "#5f6368", background: "transparent", 
              outline: "none", cursor: "pointer", padding: 0
            }}
          />
          <select
            value={ev.label || "lecture"}
            onChange={e => onChange(index, { label: e.target.value as EventLabel })}
            style={{
              border: "none", fontSize: 13, fontWeight: 500, color: cfg.color, 
              background: "transparent", cursor: "pointer", outline: "none", padding: 0
            }}
          >
            {Object.entries(LABEL_CONFIG).map(([v, c]) => (
              <option key={v} value={v}>{c.label}</option>
            ))}
          </select>
        </div>

        {/* Mô tả (Chỉ hiện nếu người dùng muốn nhập, làm giao diện bớt rối) */}
        <textarea
          value={ev.description || ""}
          onChange={e => onChange(index, { description: e.target.value || undefined })}
          placeholder="Thêm chi tiết (tuỳ chọn)..."
          rows={1}
          style={{
            width: "100%", padding: 0, border: "none", background: "transparent",
            fontSize: 13, color: "#70757a", resize: "none", outline: "none",
            fontFamily: "inherit"
          }}
          onInput={(e) => {
            // Tự động kéo giãn textarea theo nội dung
            const target = e.target as HTMLTextAreaElement;
            target.style.height = 'auto';
            target.style.height = `${target.scrollHeight}px`;
          }}
        />
      </div>
    </div>
  );
}

// ── Group of events by label ──────────────────────────────────────────────────
function EventGroup({
  labelKey, events, globalIndices, onChangeByGlobal, onRemoveByGlobal, onAdd,
}: {
  labelKey: string;
  events: { ev: EventCreate; globalIndex: number }[];
  globalIndices: number[];
  onChangeByGlobal: (gi: number, patch: Partial<EventCreate>) => void;
  onRemoveByGlobal: (gi: number) => void;
  onAdd: () => void;
}) {
  const [open, setOpen] = useState(true);
  const cfg = LABEL_CONFIG[labelKey] || LABEL_CONFIG.lecture;

  if (events.length === 0) return null; // Ẩn group nếu không có sự kiện

  return (
    <div style={{ paddingBottom: 16 }}>
      {/* Group header phẳng, tinh tế */}
      <div style={{
        display: "flex", alignItems: "center", justifyContent: "space-between",
        padding: "8px 0", borderBottom: open ? "none" : "1px solid #f1f3f4"
      }}>
        <button
          onClick={() => setOpen(o => !o)}
          style={{
            display: "flex", alignItems: "center", gap: 8,
            background: "none", border: "none", cursor: "pointer",
            fontWeight: 500, fontSize: 14, color: "#3c4043", padding: 0,
          }}
        >
          <span style={{ 
            display: "inline-block", transition: "transform 0.2s", 
            transform: open ? "rotate(90deg)" : "rotate(0deg)" 
          }}>
            ▶
          </span>
          {cfg.label}
          <span style={{ fontSize: 13, color: "#9aa0a6", fontWeight: 400 }}>
            ({events.length})
          </span>
        </button>
        <button
          onClick={onAdd}
          style={{
            fontSize: 13, color: "#1a73e8", background: "none", border: "none",
            cursor: "pointer", fontWeight: 500, padding: 0
          }}
        >
          + Thêm
        </button>
      </div>

      {open && (
        <div style={{ display: "flex", flexDirection: "column" }}>
          {events.map(({ ev, globalIndex }) => (
            <EventCard
              key={globalIndex}
              ev={ev}
              index={globalIndex}
              onChange={(_, patch) => onChangeByGlobal(globalIndex, patch)}
              onRemove={() => onRemoveByGlobal(globalIndex)}
            />
          ))}
        </div>
      )}
    </div>
  );
}
// ── Main modal ────────────────────────────────────────────────────────────────
export default function ReviewModal({ upload, onClose, onCourseCreated, onDiscarded }: Props) {
  const parsed = upload.parsed_data;

  const [form, setForm] = useState<CourseCreate>({
    name: parsed?.course_info?.name || "Untitled Course",
    code: parsed?.course_info?.code || "",
    term: parsed?.course_info?.term || "",
    instructor: parsed?.course_info?.instructor || "",
    start_date: parsed?.course_info?.start_date || "",
    end_date: parsed?.course_info?.end_date || "",
    color: parsed?.course_info?.color || "#2563eb",
  });

  const [events, setEvents] = useState<EventCreate[]>(parsed?.events || []);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [showCourseForm, setShowCourseForm] = useState(false);
  const [isZoomed, setIsZoomed] = useState(false);
  const [confirmDiscard, setConfirmDiscard] = useState(false);
  const existingCourseId = upload.course_id;

  // Build authenticated image URL via blob
  useEffect(() => {
    const token = localStorage.getItem("access_token");
    if (!token) return;
    let objectUrl: string;
    fetch(`${API_BASE}/syllabus/${upload.id}/file`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(r => r.blob())
      .then(blob => {
        objectUrl = URL.createObjectURL(blob);
        setImageUrl(objectUrl);
      })
      .catch(() => setImageUrl(null));
    return () => { if (objectUrl) URL.revokeObjectURL(objectUrl); };
  }, [upload.id]);

  const handleEventChange = (i: number, patch: Partial<EventCreate>) => {
    setEvents(prev => prev.map((ev, idx) => idx === i ? { ...ev, ...patch } : ev));
  };

  const handleRemoveEvent = (i: number) => {
    setEvents(prev => prev.filter((_, idx) => idx !== i));
  };

  const handleAddEvent = (label: string) => {
    setEvents(prev => [...prev, { title: "Sự kiện mới", label: label as EventLabel, status: "pending" }]);
  };

  const handleConfirm = async () => {
    setError(null);

    // ── Validate ngày course ──
    const dateErrors = [
      validateDate(form.start_date, "Ngày bắt đầu khóa học"),
      validateDate(form.end_date, "Ngày kết thúc khóa học"),
    ].filter(Boolean);

    // ── Validate ngày các events ──
    events.forEach((ev, idx) => {
      if (ev.start_time) {
        const datePart = ev.start_time.split("T")[0];
        const err = validateDate(datePart, `Sự kiện "${ev.title || `#${idx + 1}`}"`);
        if (err) dateErrors.push(err);
      }
    });

    if (dateErrors.length > 0) {
      setError(dateErrors.join("\n"));
      return;
    }

    setLoading(true);
    try {
      const payload: CourseCreate = {
        ...form,
        start_date: form.start_date || undefined,
        end_date: form.end_date || undefined,
        code: form.code || undefined,
        term: form.term || undefined,
        instructor: form.instructor || undefined,
      };

      let course: Course;
      if (existingCourseId) {
        course = await courseService.update(existingCourseId, payload);
        const dbEvents = await eventService.list({ course_id: existingCourseId });
        for (let i = 0; i < Math.min(events.length, dbEvents.length); i++) {
          const local = events[i];
          const db = dbEvents[i];
          const needsUpdate =
            local.title !== db.title ||
            local.label !== db.label ||
            local.description !== db.description ||
            (local.start_time || null) !== (db.start_time || null);
          if (needsUpdate) {
            await eventService.update(db.id, {
              title: local.title,
              label: local.label,
              description: local.description,
              start_time: local.start_time || undefined,
              end_time: local.end_time || undefined,
            });
          }
        }
        for (let i = dbEvents.length; i < events.length; i++) {
          await eventService.create({ ...events[i], course_id: existingCourseId });
        }
        for (let i = events.length; i < dbEvents.length; i++) {
          await eventService.delete(dbEvents[i].id);
        }
      } else {
        course = await courseService.create(payload);
        for (const ev of events) {
          try { await eventService.create({ ...ev, course_id: course.id }); } catch { /* skip */ }
        }
      }

      onCourseCreated(course);
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail ||
        (err instanceof Error ? err.message : "Không thể tạo khóa học. Vui lòng thử lại.");
      setError(typeof msg === "string" ? msg : JSON.stringify(msg));
    } finally {
      setLoading(false);
    }
  };

  // Group events by label
  const LABEL_ORDER = ["assignment", "exam", "lecture", "holiday"];
  const grouped = LABEL_ORDER.reduce<Record<string, { ev: EventCreate; globalIndex: number }[]>>(
    (acc, lbl) => { acc[lbl] = []; return acc; }, {}
  );
  events.forEach((ev, i) => {
    const key = ev.label && grouped[ev.label] !== undefined ? ev.label : "lecture";
    grouped[key].push({ ev, globalIndex: i });
  });
  // Any unknown labels
  events.forEach((ev, i) => {
    if (!ev.label || !grouped[ev.label]) {
      grouped["lecture"].push({ ev, globalIndex: i });
    }
  });

  return (
    <div style={{
      position: "fixed", inset: 0, background: "rgba(0,0,0,0.55)", zIndex: 300,
      display: "flex", alignItems: "center", justifyContent: "center", padding: 16,
    }}>
      <div style={{
        background: "#fff", borderRadius: 16, width: "100%", maxWidth: 1060,
        height: "90vh", display: "flex", flexDirection: "column", overflow: "hidden",
        boxShadow: "0 25px 60px rgba(0,0,0,0.25)",
      }}>
        {/* ── Header ── */}
        <div style={{
          display: "flex", alignItems: "center", justifyContent: "space-between",
          padding: "18px 24px", borderBottom: "1px solid #f3f4f6", flexShrink: 0,
        }}>
          <div>
            <div style={{ fontSize: 17, fontWeight: 700, color: "#111" }}>Xem lại &amp; Chỉnh sửa</div>
            <div style={{ fontSize: 12, color: "#6b7280", marginTop: 2 }}>
              So sánh tài liệu gốc và chỉnh sửa danh sách lịch trước khi xác nhận.
            </div>
          </div>
          <button
            onClick={onClose}
            style={{ background: "none", border: "none", fontSize: 16, cursor: "pointer", color: "#9ca3af", lineHeight: 1 }}
          >Đóng</button>
        </div>

        {/* ── Body: 2 columns ── */}
        <div style={{ display: "flex", flex: 1, overflow: "hidden" }}>

          {/* LEFT: Document viewer */}
          <div style={{
            width: "44%", borderRight: "1px solid #f3f4f6", display: "flex",
            flexDirection: "column", background: "#fafafa",
          }}>
            {/* Image / preview */}
            <div style={{ flex: 1, overflow: "hidden", display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}>
              {imageUrl ? (
                <img
                  src={imageUrl}
                  alt={upload.original_name}
                  onClick={() => setIsZoomed(true)} // Thêm dòng này
                  style={{ 
                    maxWidth: "100%", maxHeight: "100%", objectFit: "contain", 
                    borderRadius: 8, boxShadow: "0 2px 12px rgba(0,0,0,0.12)", 
                    border: "1px solid #e5e7eb",
                    cursor: "zoom-in" // Thêm dòng này
                  }}
                />
              ) : (
                <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: "100%", color: "#9ca3af", gap: 10 }}>
                  <div style={{ fontSize: 13 }}>{upload.file_type?.includes("pdf") ? "PDF — xem trực tiếp chưa được hỗ trợ" : "Đang tải ảnh..."}</div>
                </div>
              )}
            </div>
          </div>
          {/* RIGHT: Editable event list */}
          <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>

            {/* Course info toggle */}
            <div style={{ padding: "10px 16px", borderBottom: "1px solid #f3f4f6", flexShrink: 0 }}>
              <button
                onClick={() => setShowCourseForm(o => !o)}
                style={{
                  display: "flex", alignItems: "center", gap: 6,
                  background: "none", border: "1px solid #e5e7eb", borderRadius: 8,
                  padding: "6px 14px", cursor: "pointer", fontSize: 12, color: "#374151",
                  fontWeight: 600, width: "100%", justifyContent: "space-between",
                }}
              >
                <span>{form.name || "Thông tin khóa học"}</span>
                <span style={{ fontSize: 11, color: "#6b7280" }}>{showCourseForm ? "Thu gọn" : "Chỉnh sửa"}</span>
              </button>

              {showCourseForm && (
                <div style={{ marginTop: 10, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                  {(([["Tên môn học", "name", "text"], ["Giảng viên", "instructor", "text"], ["Ngày bắt đầu", "start_date", "date"], ["Ngày kết thúc", "end_date", "date"], ["Mã môn", "code", "text"], ["Học kỳ", "term", "text"]] as const)).map(([lbl, key, inputType]) => (
                    <div key={key}>
                      <label style={{ fontSize: 10, color: "#9ca3af", display: "block", marginBottom: 3 }}>{lbl}</label>
                      <input
                        type={inputType}
                        value={(form as unknown as Record<string, string>)[key] || ""}
                        onChange={e => setForm(prev => ({ ...prev, [key]: e.target.value }))}
                        style={{ width: "100%", padding: "6px 8px", border: "1px solid #e5e7eb", borderRadius: 6, fontSize: 12, boxSizing: "border-box" }}
                      />
                    </div>
                  ))}
                  <div>
                    <label style={{ fontSize: 10, color: "#9ca3af", display: "block", marginBottom: 6 }}>Màu sắc</label>
                    <div style={{ display: "flex", gap: 6 }}>
                      {["#2563eb", "#16a34a", "#d97706", "#dc2626", "#7c3aed"].map(c => (
                        <div key={c} onClick={() => setForm(prev => ({ ...prev, color: c }))}
                          style={{ width: 22, height: 22, borderRadius: "50%", background: c, cursor: "pointer", border: form.color === c ? "2.5px solid #111" : "2px solid transparent" }} />
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Events list */}
            <div style={{ flex: 1, overflowY: "auto", padding: "14px 16px" }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: "#111" }}>
                  Danh sách lịch trình
                  <span style={{ fontSize: 11, fontWeight: 400, color: "#9ca3af", marginLeft: 6 }}>({events.length} sự kiện)</span>
                </div>
              </div>

              {events.length === 0 ? (
                <div style={{ textAlign: "center", padding: "40px 0", color: "#9ca3af", fontSize: 13 }}>
                  Không có sự kiện nào. Hãy thêm mới.
                </div>
              ) : (
                LABEL_ORDER.map(lbl => (
                  grouped[lbl].length > 0 || true ? (
                    <EventGroup
                      key={lbl}
                      labelKey={lbl}
                      events={grouped[lbl]}
                      globalIndices={grouped[lbl].map(x => x.globalIndex)}
                      onChangeByGlobal={handleEventChange}
                      onRemoveByGlobal={handleRemoveEvent}
                      onAdd={() => handleAddEvent(lbl)}
                    />
                  ) : null
                ))
              )}
            </div>
          </div>
        </div>

        {/* ── Footer ── */}
        <div style={{
          display: "flex", alignItems: "center", justifyContent: "space-between",
          padding: "14px 24px", borderTop: "1px solid #f3f4f6", flexShrink: 0, background: "#fff",
        }}>
          <div style={{ fontSize: 12, color: "#6b7280" }}>
            {existingCourseId
              ? <>Sẽ <b>cập nhật</b> khóa học và đồng bộ <b>{events.length}</b> sự kiện</>
              : <>Sẽ tạo <b>{events.length}</b> sự kiện trong calendar</>}
          </div>
          <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
            {error && (
              <div style={{ fontSize: 12, color: "#dc2626", maxWidth: 340, textAlign: "right", whiteSpace: "pre-line" }}>⚠️ {error}</div>
            )}
            <button
              onClick={() => setConfirmDiscard(true)}
              style={{ padding: "9px 16px", border: "1px solid #fca5a5", borderRadius: 8, background: "#fff", fontSize: 13, cursor: "pointer", color: "#dc2626" }}
            >Xóa</button>
            <button
              onClick={onClose}
              style={{ padding: "9px 20px", border: "1px solid #d1d5db", borderRadius: 8, background: "#fff", fontSize: 13, cursor: "pointer", color: "#374151" }}
            >Hủy</button>
            <button
              onClick={handleConfirm}
              disabled={loading}
              style={{
                padding: "9px 22px", background: loading ? "#6b7280" : "#111", color: "#fff",
                border: "none", borderRadius: 8, fontSize: 13, fontWeight: 600,
                cursor: loading ? "not-allowed" : "pointer", display: "flex", alignItems: "center", gap: 6,
              }}
            >
              {loading ? "Đang xử lý..." : (existingCourseId ? "Xác nhận & Cập nhật" : "Tạo khóa học")}
            </button>
          </div>
        </div>
      </div>
      {/* ── Zoom Overlay ── */}
      {isZoomed && imageUrl && (
        <div 
          onClick={() => setIsZoomed(false)}
          style={{
            position: "fixed", inset: 0, backgroundColor: "rgba(0,0,0,0.85)", 
            zIndex: 9999, display: "flex", alignItems: "center", justifyContent: "center",
            cursor: "zoom-out", padding: 24
          }}
        >
          <img
            src={imageUrl}
            alt="Phóng to tài liệu"
            style={{
              maxWidth: "100%", maxHeight: "100%", 
              objectFit: "contain", borderRadius: 4,
              boxShadow: "0 10px 40px rgba(0,0,0,0.5)"
            }}
          />
        </div>
      )}
      {confirmDiscard && (
        <ConfirmDialog
          message="Bạn có chắc muốn xóa syllabus này không? Thao tác này không thể hoàn tác."
          confirmLabel="Xóa"
          cancelLabel="Hủy"
          onCancel={() => setConfirmDiscard(false)}
          onConfirm={async () => {
            try {
              await syllabusService.delete(upload.id);
              onDiscarded?.(upload.id);
            } catch {
              setError("Không thể xóa. Vui lòng thử lại.");
              setConfirmDiscard(false);
            }
          }}
        />
      )}
    </div> // Đây là thẻ </div> đóng cuối cùng của component hiện tại
  );
}