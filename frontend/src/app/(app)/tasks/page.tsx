"use client";
import { useEffect, useState } from "react";
import { eventService } from "@/lib/services";
import type { CalEvent } from "@/types";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { LABEL_COLOR, LABEL_TEXT } from "@/constants/event-labels";

function groupByWeekday(events: CalEvent[]) {
  const days: Record<string, CalEvent[]> = {};
  events.forEach(ev => {
    if (!ev.start_time) { (days["Chưa có ngày"] ||= []).push(ev); return; }
    const d = new Date(ev.start_time).toLocaleDateString("vi-VN", { weekday: "long", day: "numeric", month: "numeric" });
    (days[d] ||= []).push(ev);
  });
  return days;
}


export default function TasksPage() {
  const [events, setEvents] = useState<CalEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [confirmId, setConfirmId] = useState<string | null>(null);

  useEffect(() => {
    eventService.list().then(data => { setEvents(data); setLoading(false); });
  }, []);

  const markDone = async (id: string) => {
    const updated = await eventService.update(id, { status: "completed" });
    setEvents(prev => prev.map(e => e.id === id ? updated : e));
  };

  const deleteEvent = async (id: string) => {
    await eventService.delete(id);
    setEvents(prev => prev.filter(e => e.id !== id));
    setConfirmId(null);
  };

  if (loading) return <div style={{ padding: 40, color: "#5f6368", fontSize: 14, textAlign: "center" }}>Đang tải...</div>;

  const grouped = groupByWeekday(events);
  const toDelete = confirmId ? events.find(e => e.id === confirmId) : null;

  return (
    <div style={{ 
      width: "100%", 
      height: "100%", 
      display: "flex", 
      flexDirection: "column", 
      fontFamily: "Roboto, Arial, sans-serif", 
      background: "#fff",
      boxSizing: "border-box"
    }}>
      {/* Header cố định */}
      <div style={{ padding: "24px 32px", borderBottom: "1px solid #f1f3f4", flexShrink: 0 }}>
        <h1 style={{ margin: 0, fontSize: 22, color: "#202124", fontWeight: 400 }}>Nhiệm vụ của bạn</h1>
      </div>

      {/* Khu vực danh sách cuộn */}
      <div style={{ flex: 1, overflowY: "auto", padding: "0 32px 32px", boxSizing: "border-box" }}>
        {events.length === 0 ? (
          <div style={{ padding: 48, textAlign: "center", color: "#5f6368", fontSize: 14 }}>
            Chưa có nhiệm vụ nào.
          </div>
        ) : Object.entries(grouped).map(([day, items]) => (
          <div key={day} style={{ marginTop: 24 }}>
            <div style={{ padding: "8px 0", fontSize: 14, fontWeight: 500, color: "#202124", display: "flex", alignItems: "center", gap: 8 }}>
              {day}
              <span style={{ fontSize: 12, color: "#5f6368", fontWeight: 400 }}>({items.length})</span>
            </div>
            
            <div style={{ borderTop: "1px solid #f1f3f4" }}>
              {items.map(ev => {
                const isOverdue = ev.start_time && new Date(ev.start_time) < new Date() && ev.status !== "completed";
                const isDone = ev.status === "completed";
                const labelColor = LABEL_COLOR[ev.label || "lecture"] || "#5f6368";
                const labelText = LABEL_TEXT[ev.label || "lecture"] || "Nhiệm vụ";

                return (
                  <div key={ev.id} style={{ 
                    display: "flex", alignItems: "flex-start", padding: "12px 0", 
                    borderBottom: "1px solid #f1f3f4", background: "#fff", opacity: isDone ? 0.6 : 1,
                    boxSizing: "border-box"
                  }}>
                    {/* Checkbox */}
                    <div style={{ paddingTop: 2, marginRight: 16 }}>
                      <div onClick={() => !isDone && markDone(ev.id)}
                        style={{ 
                          width: 18, height: 18, border: `2px solid ${isDone ? "#1a73e8" : "#5f6368"}`, 
                          borderRadius: "50%", cursor: isDone ? "default" : "pointer", 
                          background: isDone ? "#1a73e8" : "#fff", 
                          display: "flex", alignItems: "center", justifyContent: "center",
                          boxSizing: "border-box"
                        }}>
                        {isDone && <span style={{ color: "#fff", fontSize: 12, lineHeight: 1 }}>✓</span>}
                      </div>
                    </div>

                    {/* Content */}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ 
                        fontSize: 14, color: "#202124", fontWeight: 400, marginBottom: 4,
                        textDecoration: isDone ? "line-through" : "none",
                        whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis"
                      }}>
                        {ev.title}
                      </div>
                      
                      <div style={{ display: "flex", alignItems: "center", gap: 12, fontSize: 12, color: "#5f6368", flexWrap: "wrap" }}>
                        <span style={{ color: labelColor, fontWeight: 500 }}>{labelText}</span>
                        {ev.course_id && <span>• Khóa học đính kèm</span>}
                        {ev.start_time && (
                          <>
                            <span>• {new Date(ev.start_time).toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" })}</span>
                            {isOverdue && <span style={{ color: "#d93025", fontWeight: 500 }}>Quá hạn</span>}
                          </>
                        )}
                      </div>
                    </div>

                    {/* Actions */}
                    <div style={{ marginLeft: 16 }}>
                      <button 
                        onClick={() => setConfirmId(ev.id)} 
                        style={{ background: "none", border: "none", cursor: "pointer", color: "#5f6368", fontSize: 18, padding: "4px 8px", borderRadius: 4 }}
                        title="Xóa nhiệm vụ"
                      >
                        ✕
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {confirmId && toDelete && (
        <ConfirmDialog
          message={`Bạn có chắc muốn xóa nhiệm vụ "${toDelete.title}" không?`}
          onConfirm={() => deleteEvent(confirmId)}
          onCancel={() => setConfirmId(null)}
        />
      )}
    </div>
  );
}