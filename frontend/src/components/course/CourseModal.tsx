"use client";
import { useEffect, useState } from "react";
import { courseService, eventService } from "@/lib/services";
import type { Course, CourseCreate, CalEvent } from "@/types";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { LABEL_TEXT } from "@/constants/event-labels";

interface CourseModalProps {
  course: Course;
  onClose: () => void;
  onSaved: (c: Course) => void;
  onDeleted: (id: string) => void;
}

const COLORS = ["#2563eb", "#16a34a", "#d97706", "#dc2626", "#7c3aed", "#0891b2"];

function validateDate(dateStr: string | undefined, fieldName: string): string | null {
  if (!dateStr) return null;
  const [y, m, d] = dateStr.split("-").map(Number);
  if (!y || !m || !d) return `${fieldName}: Định dạng ngày không hợp lệ.`;
  const date = new Date(y, m - 1, d);
  if (date.getFullYear() !== y || date.getMonth() + 1 !== m || date.getDate() !== d) {
    const monthNames = ["tháng 1","tháng 2","tháng 3","tháng 4","tháng 5","tháng 6",
      "tháng 7","tháng 8","tháng 9","tháng 10","tháng 11","tháng 12"];
    const maxDay = new Date(y, m, 0).getDate();
    return `${fieldName}: Ngày ${d} không tồn tại trong ${monthNames[m - 1]} (chỉ có ${maxDay} ngày).`;
  }
  return null;
}

/** Modal for viewing and editing a course and its events */
export function CourseModal({ course, onClose, onSaved, onDeleted }: CourseModalProps) {
  const [form, setForm] = useState<CourseCreate>({
    name: course.name,
    code: course.code || "",
    term: course.term || "",
    instructor: course.instructor || "",
    start_date: course.start_date ? course.start_date.split("T")[0] : "",
    end_date: course.end_date ? course.end_date.split("T")[0] : "",
    color: course.color,
    icon: course.icon,
  });
  const [events, setEvents] = useState<CalEvent[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);

  useEffect(() => {
    eventService.list({ course_id: course.id }).then(setEvents).catch(() => {});
  }, [course.id]);

  const handleSave = async () => {
    setError(null);

    // Validate ngày
    const dateErrors = [
      validateDate(form.start_date, "Ngày bắt đầu"),
      validateDate(form.end_date, "Ngày kết thúc"),
    ].filter(Boolean) as string[];
    if (dateErrors.length > 0) {
      setError(dateErrors.join("\n"));
      return;
    }

    setSaving(true);
    try {
      const payload: CourseCreate = {
        ...form,
        start_date: form.start_date || undefined,
        end_date: form.end_date || undefined,
        code: form.code || undefined,
        term: form.term || undefined,
        instructor: form.instructor || undefined,
      };
      const saved = await courseService.update(course.id, payload);
      onSaved(saved);
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail ||
        "Không thể lưu khóa học";
      setError(typeof msg === "string" ? msg : "Lỗi khi lưu");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", zIndex: 300, display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}>
      <div style={{ background: "#fff", borderRadius: 8, width: "100%", maxWidth: 600, maxHeight: "90vh", display: "flex", flexDirection: "column", overflow: "hidden", boxSizing: "border-box" }}>

        {/* Header */}
        <div style={{ padding: "16px 20px", borderBottom: "1px solid #e5e7eb", display: "flex", justifyContent: "space-between", alignItems: "center", background: "#f9fafb", flexShrink: 0 }}>
          <div style={{ fontSize: 18, fontWeight: 600, color: "#111827", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
            {course.name}
            {course.code && <span style={{ fontSize: 14, color: "#6b7280", fontWeight: "normal", marginLeft: 8 }}>({course.code})</span>}
          </div>
          <button onClick={onClose} style={{ background: "none", border: "none", fontSize: 20, cursor: "pointer", color: "#6b7280" }}>✕</button>
        </div>

        {/* Body */}
        <div style={{ flex: 1, overflowY: "auto", padding: 20, display: "flex", flexDirection: "column", gap: 24 }}>

          {/* Form fields */}
          <div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <div style={{ gridColumn: "span 2" }}>
                <label style={{ fontSize: 12, color: "#6b7280", display: "block", marginBottom: 4 }}>Tên môn học</label>
                <input type="text" value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))}
                  style={{ width: "100%", padding: "8px 10px", border: "1px solid #d1d5db", borderRadius: 6, fontSize: 14, boxSizing: "border-box" }} />
              </div>
              <div>
                <label style={{ fontSize: 12, color: "#6b7280", display: "block", marginBottom: 4 }}>Mã môn</label>
                <input type="text" value={form.code} onChange={e => setForm(p => ({ ...p, code: e.target.value }))}
                  style={{ width: "100%", padding: "8px 10px", border: "1px solid #d1d5db", borderRadius: 6, fontSize: 14, boxSizing: "border-box" }} />
              </div>
              <div>
                <label style={{ fontSize: 12, color: "#6b7280", display: "block", marginBottom: 4 }}>Học kỳ</label>
                <input type="text" value={form.term} onChange={e => setForm(p => ({ ...p, term: e.target.value }))}
                  style={{ width: "100%", padding: "8px 10px", border: "1px solid #d1d5db", borderRadius: 6, fontSize: 14, boxSizing: "border-box" }} />
              </div>
              <div>
                <label style={{ fontSize: 12, color: "#6b7280", display: "block", marginBottom: 4 }}>Giảng viên</label>
                <input type="text" value={form.instructor} onChange={e => setForm(p => ({ ...p, instructor: e.target.value }))}
                  style={{ width: "100%", padding: "8px 10px", border: "1px solid #d1d5db", borderRadius: 6, fontSize: 14, boxSizing: "border-box" }} />
              </div>
              <div style={{ gridColumn: "span 2" }}>
                <label style={{ fontSize: 12, color: "#6b7280", display: "block", marginBottom: 6 }}>Màu sắc</label>
                <div style={{ display: "flex", gap: 8 }}>
                  {COLORS.map(c => (
                    <div key={c} onClick={() => setForm(p => ({ ...p, color: c }))}
                      style={{ width: 24, height: 24, borderRadius: 4, background: c, cursor: "pointer", border: form.color === c ? "2px solid #111" : "2px solid transparent" }} />
                  ))}
                </div>
              </div>
            </div>
            {error && <div style={{ fontSize: 13, color: "#dc2626", marginTop: 12, whiteSpace: "pre-line" }}>⚠️ {error}</div>}
          </div>

          <hr style={{ borderTop: "1px solid #e5e7eb", margin: 0 }} />

          {/* Events list */}
          <div>
            <div style={{ fontSize: 14, fontWeight: 600, color: "#374151", marginBottom: 12 }}>
              Lịch trình ({events.length})
            </div>
            <div style={{ border: "1px solid #e5e7eb", borderRadius: 6, padding: 8, background: "#fafafa" }}>
              {events.length === 0 ? (
                <div style={{ textAlign: "center", color: "#9ca3af", fontSize: 13, padding: "20px 0" }}>Chưa có sự kiện nào</div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: 6, maxHeight: 200, overflowY: "auto" }}>
                  {events.map(ev => (
                    <div key={ev.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "8px 12px", background: "#fff", border: "1px solid #e5e7eb", borderRadius: 4 }}>
                      <div style={{ flex: 1, minWidth: 0, paddingRight: 8 }}>
                        <div style={{ fontSize: 13, fontWeight: 500, color: "#111827", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{ev.title}</div>
                        {ev.start_time && (
                          <div style={{ fontSize: 11, color: "#6b7280" }}>{new Date(ev.start_time).toLocaleDateString("vi-VN")}</div>
                        )}
                      </div>
                      <span style={{ fontSize: 11, padding: "2px 8px", borderRadius: 4, background: "#f3f4f6", color: "#374151", flexShrink: 0 }}>
                        {LABEL_TEXT[ev.label || "lecture"] || "Bài giảng"}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div style={{ padding: "12px 20px", borderTop: "1px solid #e5e7eb", display: "flex", justifyContent: "space-between", alignItems: "center", background: "#f9fafb", flexShrink: 0 }}>
          <button onClick={() => setConfirmDelete(true)}
            style={{ background: "none", border: "none", color: "#dc2626", fontSize: 13, fontWeight: 500, cursor: "pointer", padding: 0 }}>
            Xóa khóa học
          </button>
          <div style={{ display: "flex", gap: 8 }}>
            <button onClick={onClose}
              style={{ padding: "8px 16px", border: "1px solid #d1d5db", borderRadius: 6, background: "#fff", fontSize: 13, cursor: "pointer", color: "#374151" }}>
              Hủy
            </button>
            <button onClick={handleSave} disabled={saving}
              style={{ padding: "8px 16px", background: "#111", color: "#fff", border: "none", borderRadius: 6, fontSize: 13, fontWeight: 500, cursor: saving ? "not-allowed" : "pointer" }}>
              {saving ? "Đang lưu..." : "Lưu thay đổi"}
            </button>
          </div>
        </div>
      </div>

      {confirmDelete && (
        <ConfirmDialog
          message={`Xóa khóa học "${course.name}" và toàn bộ sự kiện liên quan?`}
          onConfirm={async () => { await courseService.delete(course.id); onDeleted(course.id); }}
          onCancel={() => setConfirmDelete(false)}
        />
      )}
    </div>
  );
}
