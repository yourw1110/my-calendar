import { useState, useEffect, useRef } from "react";

const COLORS = [
  { id: "red",     label: "レッド",    bg: "#ff3b3b", dark: "#ff3b3b" },
  { id: "orange",  label: "オレンジ",  bg: "#ff8c00", dark: "#ff8c00" },
  { id: "yellow",  label: "イエロー",  bg: "#ffe600", dark: "#ffe600" },
  { id: "green",   label: "グリーン",  bg: "#00e676", dark: "#00e676" },
  { id: "cyan",    label: "シアン",    bg: "#00e5ff", dark: "#00e5ff" },
  { id: "magenta", label: "マゼンタ",  bg: "#e040fb", dark: "#e040fb" },
];

const REPEATS = [
  { id: "none",    label: "一度きり" },
  { id: "daily",   label: "毎日" },
  { id: "weekly",  label: "毎週" },
  { id: "monthly", label: "毎月" },
];

const DAY_NAMES = ["SUN","MON","TUE","WED","THU","FRI","SAT"];
const MONTH_NAMES = ["JAN","FEB","MAR","APR","MAY","JUN","JUL","AUG","SEP","OCT","NOV","DEC"];

function genId() { return Math.random().toString(36).slice(2, 10); }
function pad(n) { return String(n).padStart(2, "0"); }
function toDateStr(d) { return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`; }

function eventOccursOnDate(event, dateStr) {
  const [ey, em, ed] = event.date.split("-").map(Number);
  const [dy, dm, dd] = dateStr.split("-").map(Number);
  const eDate = new Date(ey, em - 1, ed);
  const dDate = new Date(dy, dm - 1, dd);
  if (dDate < eDate) return false;
  if (event.repeat === "none")    return event.date === dateStr;
  if (event.repeat === "daily")   return true;
  if (event.repeat === "weekly")  return eDate.getDay() === dDate.getDay();
  if (event.repeat === "monthly") return ed === dd;
  return false;
}

const API = "/api/events";
async function apiGet() {
  const r = await fetch(API);
  if (!r.ok) throw new Error("fetch failed");
  return r.json();
}
async function apiPost(ev) {
  await fetch(API, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(ev) });
}
async function apiPut(ev) {
  await fetch(API, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(ev) });
}
async function apiDelete(id) {
  await fetch(API, { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id }) });
}

const defaultForm = {
  title: "", date: toDateStr(new Date()),
  startTime: "10:00", endTime: "11:00",
  allDay: false, color: "cyan", repeat: "none", memo: ""
};

const F = "'BIZ UDPGothic','Hiragino Kaku Gothic ProN','Meiryo',sans-serif";

export default function CalendarDark() {
  const today = new Date();
  const todayStr = toDateStr(today);
  const [viewYear, setViewYear]     = useState(today.getFullYear());
  const [viewMonth, setViewMonth]   = useState(today.getMonth());
  const [events, setEvents]         = useState([]);
  const [loading, setLoading]       = useState(true);
  const [selected, setSelected]     = useState(null);
  const [modal, setModal]           = useState(null);
  const [form, setForm]             = useState(defaultForm);
  const [editId, setEditId]         = useState(null);
  const [delConfirm, setDelConfirm] = useState(null);
  const [detailEv, setDetailEv]     = useState(null);
  const [toast, setToast]           = useState(null);
  const [menuOpen, setMenuOpen]     = useState(false);
  const importRef = useRef();

  useEffect(() => {
    apiGet()
      .then(data => setEvents(data))
      .catch(() => showToast("データの読み込みに失敗しました", "err"))
      .finally(() => setLoading(false));
  }, []);

  const showToast = (msg, type = "ok") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 2600);
  };

  const firstDay    = new Date(viewYear, viewMonth, 1).getDay();
  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
  const cells = [];
  for (let i = 0; i < firstDay; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);

  const prevMonth = () => { if (viewMonth === 0) { setViewYear(y=>y-1); setViewMonth(11); } else setViewMonth(m=>m-1); };
  const nextMonth = () => { if (viewMonth === 11) { setViewYear(y=>y+1); setViewMonth(0); } else setViewMonth(m=>m+1); };

  const openAdd  = (ds) => { setForm({...defaultForm, date: ds}); setEditId(null); setModal("add"); };
  const openEdit = (ev) => {
    setForm({
      title: ev.title, date: ev.date,
      startTime: ev.startTime || "10:00",
      endTime: ev.endTime || "11:00",
      allDay: ev.allDay, color: ev.color, repeat: ev.repeat, memo: ev.memo || ""
    });
    setEditId(ev.id); setDetailEv(null); setModal("edit");
  };
  const closeModal = () => { setModal(null); setEditId(null); };

  const handleSave = async () => {
    if (!form.title.trim()) return;
    if (modal === "add") {
      const newEv = { ...form, id: genId(), createdAt: Date.now() };
      setEvents(ev => [...ev, newEv]);
      closeModal();
      await apiPost(newEv).catch(() => showToast("保存に失敗しました", "err"));
    } else {
      const updated = { ...form, id: editId };
      setEvents(ev => ev.map(e => e.id === editId ? updated : e));
      closeModal();
      await apiPut(updated).catch(() => showToast("更新に失敗しました", "err"));
    }
  };

  const handleDelete = async (id) => {
    setEvents(ev => ev.filter(e => e.id !== id));
    setDelConfirm(null); setDetailEv(null);
    await apiDelete(id).catch(() => showToast("削除に失敗しました", "err"));
  };

  const getColor = (id) => COLORS.find(c => c.id === id) || COLORS[4];

  const selectedEvents = selected
    ? events.filter(e => eventOccursOnDate(e, selected))
        .sort((a,b) => (a.allDay?-1:1) - (b.allDay?-1:1) || (a.startTime||"").localeCompare(b.startTime||""))
    : [];

  const handleExport = () => {
    const blob = new Blob([JSON.stringify(events, null, 2)], { type: "application/json" });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement("a");
    a.href = url; a.download = `calendar-export-${toDateStr(new Date())}.json`; a.click();
    URL.revokeObjectURL(url);
    showToast(`${events.length}件エクスポートしました`);
  };

  const handleImport = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async (ev) => {
      try {
        const parsed = JSON.parse(ev.target.result);
        if (!Array.isArray(parsed)) throw new Error();
        const valid = parsed.filter(e => e.id && e.title && e.date);
        const ids = new Set(events.map(e => e.id));
        const newEvs = valid.filter(e => !ids.has(e.id));
        setEvents(prev => [...prev, ...newEvs]);
        await Promise.all(newEvs.map(e => apiPost(e)));
        showToast(`${newEvs.length}件インポートしました`);
      } catch { showToast("読み込みに失敗しました", "err"); }
    };
    reader.readAsText(file);
    e.target.value = "";
  };

  const fmtTime = (ev) => {
    if (ev.allDay) return "ALL DAY";
    const s = ev.startTime || "";
    return s + (ev.endTime ? ` – ${ev.endTime}` : "");
  };

  const handleDayClick = (ds) => {
    if (selected === ds) { setSelected(null); setDetailEv(null); }
    else { setSelected(ds); setDetailEv(null); }
  };

  const panelVisible = selected !== null;

  return (
    <div style={{ minHeight:"100vh", background:"#0e0e0e", color:"#e8e8e8", fontFamily:F, display:"flex", flexDirection:"column" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=BIZ+UDPGothic:wght@400;700&display=swap');
        *{box-sizing:border-box;margin:0;padding:0}
        ::-webkit-scrollbar{width:4px}::-webkit-scrollbar-track{background:#1a1a1a}::-webkit-scrollbar-thumb{background:#333;border-radius:2px}

        .cell-day{border-radius:4px;width:36px;height:36px;display:flex;align-items:center;justify-content:center;font-size:14px;cursor:pointer;transition:background .12s;font-family:'BIZ UDPGothic','Hiragino Kaku Gothic ProN','Meiryo',sans-serif;font-weight:400}
        .cell-day:hover{background:#1f1f1f}
        .cell-day.today{background:#e8e8e8;color:#0e0e0e;font-weight:700}
        .cell-day.selected{outline:1.5px solid #555}
        .cell-day.today.selected{outline:1.5px solid #aaa}

        .dot-row{display:flex;gap:2px;justify-content:center;min-height:5px;margin-top:3px}
        .dot{width:5px;height:5px;border-radius:50%;flex-shrink:0}

        .modal-overlay{position:fixed;inset:0;background:rgba(0,0,0,.75);display:flex;align-items:center;justify-content:center;z-index:100;backdrop-filter:blur(4px)}
        .modal-box{background:#141414;border:1px solid #2a2a2a;border-radius:12px;padding:26px 26px 22px;width:380px;max-width:95vw;box-shadow:0 24px 64px rgba(0,0,0,.6)}

        .form-label{font-size:11px;color:#666;letter-spacing:.08em;text-transform:uppercase;margin-bottom:4px;display:block;font-weight:700}
        .form-input{width:100%;border:1px solid #2a2a2a;border-radius:6px;padding:9px 11px;font-size:14px;color:#e8e8e8;background:#1a1a1a;font-family:'BIZ UDPGothic','Hiragino Kaku Gothic ProN','Meiryo',sans-serif;outline:none;transition:border .12s;font-weight:400}
        .form-input:focus{border-color:#555}
        .form-input::placeholder{color:#3a3a3a}
        input[type=date].form-input::-webkit-calendar-picker-indicator{filter:invert(.4)}
        input[type=time].form-input::-webkit-calendar-picker-indicator{filter:invert(.4)}

        .color-swatch{width:26px;height:26px;border-radius:4px;cursor:pointer;border:2px solid transparent;transition:transform .1s,border-color .1s}
        .color-swatch.active{border-color:#fff;transform:scale(1.1)}

        .tag-btn{padding:5px 12px;border-radius:4px;border:1px solid #2a2a2a;font-size:12px;cursor:pointer;background:none;color:#888;font-family:'BIZ UDPGothic','Hiragino Kaku Gothic ProN','Meiryo',sans-serif;transition:all .1s;font-weight:400}
        .tag-btn.active{background:#e8e8e8;color:#0e0e0e;border-color:#e8e8e8;font-weight:700}
        .tag-btn:hover:not(.active){border-color:#444;color:#ccc}

        .save-btn{width:100%;padding:12px;border-radius:6px;border:none;background:#e8e8e8;color:#0e0e0e;font-size:14px;cursor:pointer;font-family:'BIZ UDPGothic','Hiragino Kaku Gothic ProN','Meiryo',sans-serif;letter-spacing:.04em;font-weight:700;transition:opacity .13s}
        .save-btn:hover{opacity:.85}
        .cancel-link{display:block;text-align:center;margin-top:10px;font-size:13px;color:#444;cursor:pointer;font-weight:400}
        .cancel-link:hover{color:#888}

        .icon-btn{width:30px;height:30px;border-radius:4px;border:1px solid #2a2a2a;background:none;cursor:pointer;display:flex;align-items:center;justify-content:center;font-size:14px;color:#666;transition:all .12s}
        .icon-btn:hover{border-color:#444;color:#ccc;background:#1a1a1a}
        .icon-btn.del{border-color:#2a1a1a;color:#663333}
        .icon-btn.del:hover{background:#1f0f0f;border-color:#ff3b3b;color:#ff3b3b}

        .nav-btn{width:34px;height:34px;border-radius:4px;border:1px solid #2a2a2a;background:none;cursor:pointer;display:flex;align-items:center;justify-content:center;font-size:18px;color:#666;transition:all .12s}
        .nav-btn:hover{border-color:#444;color:#ccc}

        .ev-row{display:flex;align-items:center;gap:10px;padding:11px 12px;border-radius:6px;cursor:pointer;margin-bottom:6px;transition:background .1s;border:1px solid #1c1c1c}
        .ev-row:hover{background:#181818;border-color:#2a2a2a}

        .detail-box{background:#0e0e0e;border-radius:8px;padding:16px;border:1px solid #2a2a2a}

        .top-action-btn{padding:5px 13px;border-radius:4px;border:1px solid #2a2a2a;background:none;cursor:pointer;font-size:12px;color:#666;font-family:'BIZ UDPGothic','Hiragino Kaku Gothic ProN','Meiryo',sans-serif;letter-spacing:.04em;transition:all .12s;font-weight:700}
        .top-action-btn:hover{border-color:#444;color:#ccc;background:#1a1a1a}

        .hamburger-btn{width:32px;height:28px;border-radius:4px;border:1px solid #2a2a2a;background:none;cursor:pointer;display:flex;flex-direction:column;gap:4px;align-items:center;justify-content:center;transition:all .12s;padding:0}
        .hamburger-btn:hover{border-color:#444;background:#1a1a1a}
        .hamburger-btn span{display:block;width:13px;height:1.5px;background:#666;border-radius:1px;transition:background .12s}
        .hamburger-btn:hover span{background:#ccc}

        .dropdown{position:absolute;top:calc(100% + 6px);right:0;background:#141414;border:1px solid #2a2a2a;border-radius:8px;overflow:hidden;z-index:200;min-width:148px;box-shadow:0 8px 32px rgba(0,0,0,.5)}
        .menu-item{display:block;width:100%;padding:10px 16px;background:none;border:none;text-align:left;font-size:12px;color:#888;font-family:'BIZ UDPGothic','Hiragino Kaku Gothic ProN','Meiryo',sans-serif;letter-spacing:.04em;cursor:pointer;transition:background .1s,color .1s;font-weight:400}
        .menu-item:hover{background:#1f1f1f;color:#e8e8e8}

        .toast{position:fixed;bottom:28px;left:50%;transform:translateX(-50%);background:#e8e8e8;color:#0e0e0e;padding:9px 20px;border-radius:6px;font-size:13px;letter-spacing:.03em;z-index:200;animation:fadeup .2s ease;pointer-events:none;font-weight:700}
        .toast.err{background:#ff3b3b;color:#fff}
        @keyframes fadeup{from{opacity:0;transform:translateX(-50%) translateY(8px)}to{opacity:1;transform:translateX(-50%) translateY(0)}}

        textarea.form-input{resize:vertical;min-height:60px;line-height:1.7}
        .loading-spinner{display:flex;align-items:center;justify-content:center;height:200px;color:#333;font-size:13px;letter-spacing:.08em}

        /* Bottom panel */
        .bottom-panel{
          border-top:1px solid #1c1c1c;
          background:#141414;
          overflow:hidden;
          transition:max-height .3s ease, opacity .3s ease;
          max-height:0;
          opacity:0;
        }
        .bottom-panel.open{
          max-height:500px;
          opacity:1;
        }

        .add-fab{
          width:40px;height:40px;border-radius:50%;border:1px solid #2a2a2a;
          background:none;cursor:pointer;display:flex;align-items:center;justify-content:center;
          font-size:22px;color:#666;transition:all .12s;
        }
        .add-fab:hover{border-color:#444;color:#ccc;background:#1a1a1a}
      `}</style>

      {/* Header */}
      <div style={{ borderBottom:"1px solid #1c1c1c", padding:"14px 24px", display:"flex", alignItems:"center", gap:12 }}>
        <div style={{ fontFamily:F, fontSize:13, letterSpacing:"0.18em", color:"#444", flex:1, fontWeight:700 }}>
          CALENDAR
        </div>
        <div style={{ display:"flex", gap:8, alignItems:"center", position:"relative" }}>
          <button className="top-action-btn" onClick={() => { setViewYear(today.getFullYear()); setViewMonth(today.getMonth()); setSelected(todayStr); setDetailEv(null); }}>
            TODAY
          </button>
          <button className="hamburger-btn" onClick={() => setMenuOpen(o => !o)} title="メニュー">
            <span /><span /><span />
          </button>
          {menuOpen && (
            <div className="dropdown" onMouseLeave={() => setMenuOpen(false)}>
              <button className="menu-item" onClick={() => { setMenuOpen(false); handleExport(); }}>↑ EXPORT</button>
              <button className="menu-item" onClick={() => { setMenuOpen(false); importRef.current?.click(); }}>↓ IMPORT</button>
            </div>
          )}
          <input ref={importRef} type="file" accept=".json" style={{ display:"none" }} onChange={handleImport} />
        </div>
      </div>

      {/* Calendar */}
      <div style={{ flex:1, padding:"22px 24px 0", maxWidth:700, margin:"0 auto", width:"100%" }}>
        {/* Month nav */}
        <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:20 }}>
          <button className="nav-btn" onClick={prevMonth}>‹</button>
          <div style={{ flex:1, textAlign:"center", fontSize:15, letterSpacing:"0.12em", color:"#aaa", fontWeight:700 }}>
            {MONTH_NAMES[viewMonth]} {viewYear}
          </div>
          <button className="nav-btn" onClick={nextMonth}>›</button>
        </div>

        {/* Day headers */}
        <div style={{ display:"grid", gridTemplateColumns:"repeat(7,1fr)", marginBottom:8 }}>
          {DAY_NAMES.map((d, i) => (
            <div key={d} style={{ textAlign:"center", fontSize:11, color:i===0?"#ff3b3b":i===6?"#00e5ff":"#444", letterSpacing:"0.08em", padding:"2px 0", fontWeight:700 }}>{d}</div>
          ))}
        </div>

        {/* Grid */}
        {loading ? (
          <div className="loading-spinner">LOADING...</div>
        ) : (
          <div style={{ display:"grid", gridTemplateColumns:"repeat(7,1fr)", gap:"6px 0" }}>
            {cells.map((day, i) => {
              if (day === null) return <div key={`e${i}`} />;
              const ds = `${viewYear}-${pad(viewMonth+1)}-${pad(day)}`;
              const isToday = ds === todayStr;
              const isSel   = ds === selected;
              const dayEvs  = events.filter(e => eventOccursOnDate(e, ds));
              const dots    = dayEvs.slice(0, 4).map(e => getColor(e.color).dark);
              const wd      = (firstDay + day - 1) % 7;
              return (
                <div key={ds} style={{ display:"flex", flexDirection:"column", alignItems:"center", padding:"2px 0" }} onClick={() => handleDayClick(ds)}>
                  <div className={`cell-day${isToday?" today":""}${isSel?" selected":""}`}
                    style={{ color: isToday ? undefined : isSel ? "#e8e8e8" : wd===0?"#993333":wd===6?"#006666":"#aaa" }}>
                    {day}
                  </div>
                  <div className="dot-row">
                    {dots.map((c, di) => <div key={di} className="dot" style={{ background:c }} />)}
                    {dayEvs.length > 4 && <span style={{ fontSize:7, color:"#444" }}>+</span>}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Bottom Panel */}
      <div style={{ maxWidth:700, margin:"0 auto", width:"100%", marginTop:16 }}>
        <div className={`bottom-panel${panelVisible?" open":""}`}>
          <div style={{ padding:"16px 24px 20px" }}>
            {selected && (
              <>
                {/* Panel header */}
                <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:14 }}>
                  <div style={{ fontSize:13, color:"#555", letterSpacing:"0.08em", fontWeight:700 }}>
                    {selected.replace(/-/g,".")}
                  </div>
                  <div style={{ display:"flex", alignItems:"center", gap:8 }}>
                    {detailEv && (
                      <button className="icon-btn" style={{ fontSize:12, color:"#555" }} onClick={() => setDetailEv(null)}>← back</button>
                    )}
                    <button className="add-fab" onClick={() => openAdd(selected)} title="追加">+</button>
                  </div>
                </div>

                {/* Detail view */}
                {detailEv ? (
                  <div className="detail-box">
                    <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:10 }}>
                      <div style={{ display:"flex", alignItems:"center", gap:7 }}>
                        <div style={{ width:8, height:8, borderRadius:"50%", background:getColor(detailEv.color).dark, boxShadow:`0 0 6px ${getColor(detailEv.color).dark}88` }} />
                        <span style={{ fontSize:11, color:"#555", letterSpacing:"0.04em" }}>{REPEATS.find(r=>r.id===detailEv.repeat)?.label}</span>
                      </div>
                      <div style={{ display:"flex", gap:5 }}>
                        <button className="icon-btn" onClick={() => openEdit(detailEv)}>✎</button>
                        <button className="icon-btn del" onClick={() => setDelConfirm(detailEv.id)}>✕</button>
                      </div>
                    </div>
                    <div style={{ fontSize:16, color:"#e8e8e8", fontWeight:700, marginBottom:5, lineHeight:1.5 }}>{detailEv.title}</div>
                    <div style={{ fontSize:12, color:"#555", marginBottom: detailEv.memo ? 8 : 0 }}>
                      {fmtTime(detailEv)}
                    </div>
                    {detailEv.memo && (
                      <div style={{ fontSize:13, color:"#777", borderTop:"1px solid #1c1c1c", paddingTop:8, lineHeight:1.8, marginTop:4 }}>{detailEv.memo}</div>
                    )}
                  </div>
                ) : (
                  /* Event list */
                  <div>
                    {selectedEvents.map(ev => {
                      const c = getColor(ev.color);
                      return (
                        <div key={ev.id} className="ev-row" onClick={() => setDetailEv(ev)}>
                          <div style={{ width:3, borderRadius:2, background:c.dark, alignSelf:"stretch", flexShrink:0, boxShadow:`0 0 4px ${c.dark}66` }} />
                          <div style={{ flex:1, minWidth:0 }}>
                            <div style={{ fontSize:14, color:"#ccc", overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap", fontWeight:700 }}>{ev.title}</div>
                            <div style={{ fontSize:11, color:"#444", marginTop:2 }}>
                              {fmtTime(ev)}
                              {ev.repeat !== "none" && <span style={{ marginLeft:6, color:"#333" }}>↻ {REPEATS.find(r=>r.id===ev.repeat)?.label}</span>}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>

      {/* Add/Edit Modal */}
      {modal && (
        <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && closeModal()}>
          <div className="modal-box">
            <div style={{ fontSize:16, color:"#e8e8e8", fontWeight:700, marginBottom:20, letterSpacing:"0.04em" }}>
              {modal === "add" ? "予定を追加" : "予定を編集"}
            </div>

            <div style={{ marginBottom:13 }}>
              <label className="form-label">TITLE</label>
              <input className="form-input" value={form.title} onChange={e=>setForm(f=>({...f,title:e.target.value}))} placeholder="イベントタイトル" autoFocus />
            </div>

            <div style={{ marginBottom:13 }}>
              <label className="form-label">DATE</label>
              <input className="form-input" type="date" value={form.date} onChange={e=>setForm(f=>({...f,date:e.target.value}))} />
            </div>

            {!form.allDay && (
              <div style={{ display:"flex", gap:9, marginBottom:13 }}>
                <div style={{ flex:1 }}>
                  <label className="form-label">START</label>
                  <input className="form-input" type="time" value={form.startTime} onChange={e=>setForm(f=>({...f,startTime:e.target.value}))} />
                </div>
                <div style={{ flex:1 }}>
                  <label className="form-label">END</label>
                  <input className="form-input" type="time" value={form.endTime} onChange={e=>setForm(f=>({...f,endTime:e.target.value}))} />
                </div>
              </div>
            )}

            <div style={{ marginBottom:13 }}>
              <label style={{ display:"flex", alignItems:"center", gap:7, cursor:"pointer", fontSize:13, color:"#666", fontWeight:400 }}>
                <input type="checkbox" checked={form.allDay} onChange={e=>setForm(f=>({...f,allDay:e.target.checked}))} style={{ accentColor:"#e8e8e8", width:14, height:14 }} />
                終日
              </label>
            </div>

            <div style={{ marginBottom:13 }}>
              <label className="form-label">REPEAT</label>
              <div style={{ display:"flex", gap:5, flexWrap:"wrap", marginTop:4 }}>
                {REPEATS.map(r => (
                  <button key={r.id} className={`tag-btn${form.repeat===r.id?" active":""}`} onClick={()=>setForm(f=>({...f,repeat:r.id}))}>{r.label}</button>
                ))}
              </div>
            </div>

            <div style={{ marginBottom:16 }}>
              <label className="form-label">COLOR</label>
              <div style={{ display:"flex", gap:7, marginTop:5 }}>
                {COLORS.map(c => (
                  <div key={c.id} className={`color-swatch${form.color===c.id?" active":""}`}
                    style={{ background:c.bg, boxShadow: form.color===c.id ? `0 0 8px ${c.bg}99` : "none" }}
                    onClick={()=>setForm(f=>({...f,color:c.id}))} title={c.label} />
                ))}
              </div>
            </div>

            <div style={{ marginBottom:20 }}>
              <label className="form-label">MEMO</label>
              <textarea className="form-input" value={form.memo} onChange={e=>setForm(f=>({...f,memo:e.target.value}))} placeholder="メモ（任意）" />
            </div>

            <button className="save-btn" onClick={handleSave}>保存する</button>
            <span className="cancel-link" onClick={closeModal}>キャンセル</span>
          </div>
        </div>
      )}

      {/* Delete confirm */}
      {delConfirm && (
        <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && setDelConfirm(null)}>
          <div className="modal-box" style={{ width:290 }}>
            <div style={{ fontSize:15, color:"#e8e8e8", marginBottom:8, fontWeight:700 }}>予定を削除しますか？</div>
            <div style={{ fontSize:13, color:"#555", marginBottom:20 }}>この操作は元に戻せません</div>
            <div style={{ display:"flex", gap:8 }}>
              <button onClick={()=>setDelConfirm(null)} style={{ flex:1, padding:"10px", borderRadius:6, border:"1px solid #2a2a2a", background:"none", cursor:"pointer", fontFamily:F, fontSize:13, color:"#666" }}>キャンセル</button>
              <button onClick={()=>handleDelete(delConfirm)} style={{ flex:1, padding:"10px", borderRadius:6, border:"none", background:"#ff3b3b", color:"#fff", cursor:"pointer", fontFamily:F, fontSize:13, fontWeight:700 }}>削除する</button>
            </div>
          </div>
        </div>
      )}

      {toast && <div className={`toast${toast.type==="err"?" err":""}`}>{toast.msg}</div>}
    </div>
  );
}
