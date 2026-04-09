import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { db, auth } from "../firebase";
import {
  doc, getDoc, setDoc, getDocs,
  collection, query, where, updateDoc
} from "firebase/firestore";

const MOODS = [
  { id: "great", label: "Great",    emoji: "😄", color: "#a855f7", light: "#f3e8ff" },
  { id: "good",  label: "Good",     emoji: "😊", color: "#ec4899", light: "#fdf2f8" },
  { id: "okay",  label: "Okay",     emoji: "😐", color: "#f59e0b", light: "#fffbeb" },
  { id: "sad",   label: "Sad",      emoji: "😢", color: "#3b82f6", light: "#eff6ff" },
  { id: "angry", label: "Stressed", emoji: "😤", color: "#ef4444", light: "#fef2f2" },
];

const MOOD_MAP    = Object.fromEntries(MOODS.map(m => [m.id, m]));
const DAYS        = ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"];
const MONTHS      = ["January","February","March","April","May","June","July","August","September","October","November","December"];

const todayKey = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;
};
const dateKey = (year, month, day) =>
  `${year}-${String(month+1).padStart(2,"0")}-${String(day).padStart(2,"0")}`;

export default function MoodPage() {
  const navigate = useNavigate();
  const user     = auth.currentUser;
  const now      = new Date();

  const [tab,        setTab]        = useState("mine"); // mine | hers | stats
  const [viewYear,   setViewYear]   = useState(now.getFullYear());
  const [viewMonth,  setViewMonth]  = useState(now.getMonth());
  const [myData,     setMyData]     = useState({});
  const [herData,    setHerData]    = useState({});
  const [herEmail,   setHerEmail]   = useState(null);
  const [herUid,     setHerUid]     = useState(null);
  const [herName,    setHerName]    = useState("Sister");
  const [loadingMe,  setLoadingMe]  = useState(true);
  const [loadingHer, setLoadingHer] = useState(true);
  const [selected,   setSelected]   = useState(null);
  const [showSheet,  setShowSheet]  = useState(false);
  const [showSetup,  setShowSetup]  = useState(false);

  // ── Load my mood + sister email ───────────────────────────────
  useEffect(() => {
    if (!user) return;
    (async () => {
      try {
        // My moods
        const mSnap = await getDoc(doc(db, "moods", user.uid));
        if (mSnap.exists()) setMyData(mSnap.data().entries || {});

        // Sister email from user doc
        const uSnap = await getDoc(doc(db, "users", user.uid));
        if (uSnap.exists()) {
          const email = uSnap.data().moodSharedWith || uSnap.data().wishlistSharedWith || null;
          setHerEmail(email);
        }
      } catch (e) { console.error(e); }
      finally { setLoadingMe(false); }
    })();
  }, [user]);

  // ── Load her mood by email ────────────────────────────────────
  useEffect(() => {
    if (!herEmail) { setLoadingHer(false); return; }
    (async () => {
      try {
        const q    = query(collection(db, "users"), where("email", "==", herEmail));
        const snap = await getDocs(q);
        if (!snap.empty) {
          const hUser = snap.docs[0].data();
          const uid   = snap.docs[0].id;
          setHerUid(uid);
          setHerName(hUser.name || herEmail.split("@")[0]);
          const mSnap = await getDoc(doc(db, "moods", uid));
          if (mSnap.exists()) setHerData(mSnap.data().entries || {});
        }
      } catch (e) { console.error(e); }
      finally { setLoadingHer(false); }
    })();
  }, [herEmail]);

  // ── Save sister email ─────────────────────────────────────────
  const handleSaveSister = async (email) => {
    try {
      await updateDoc(doc(db, "users", user.uid), { moodSharedWith: email });
      setHerEmail(email);
      setShowSetup(false);
      setLoadingHer(true);
    } catch (e) { console.error(e); alert("Failed to save"); }
  };

  // ── Save/delete my mood ───────────────────────────────────────
  const handleSave = async (key, entry) => {
    const updated = { ...myData, [key]: entry };
    setMyData(updated);
    setShowSheet(false);
    await setDoc(doc(db, "moods", user.uid), { entries: updated }, { merge: true });
  };

  const handleDelete = async (key) => {
    const updated = { ...myData };
    delete updated[key];
    setMyData(updated);
    setShowSheet(false);
    await setDoc(doc(db, "moods", user.uid), { entries: updated });
  };

  // ── Calendar helpers ──────────────────────────────────────────
  const firstDay    = new Date(viewYear, viewMonth, 1).getDay();
  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
  const today       = todayKey();

  const prevMonth = () => {
    if (viewMonth === 0) { setViewYear(y => y-1); setViewMonth(11); }
    else setViewMonth(m => m-1);
  };
  const nextMonth = () => {
    if (viewMonth === 11) { setViewYear(y => y+1); setViewMonth(0); }
    else setViewMonth(m => m+1);
  };

  // ── Stats ─────────────────────────────────────────────────────
  const allEntries  = Object.values(myData);
  const totalLogged = allEntries.length;
  const moodCounts  = MOODS.map(m => ({ ...m, count: allEntries.filter(e => e.mood === m.id).length }));
  const topMood     = [...moodCounts].sort((a,b) => b.count - a.count)[0];

  let streak = 0;
  const checkDate = new Date();
  // eslint-disable-next-line no-constant-condition
  while (true) {
    const k = `${checkDate.getFullYear()}-${String(checkDate.getMonth()+1).padStart(2,"0")}-${String(checkDate.getDate()).padStart(2,"0")}`;
    if (myData[k]) { streak++; checkDate.setDate(checkDate.getDate()-1); } else break;
  }

  const thisMonthEntries = Object.entries(myData)
    .filter(([k]) => k.startsWith(`${viewYear}-${String(viewMonth+1).padStart(2,"0")}`));
  const thisMonthCounts  = MOODS.map(m => ({
    ...m, count: thisMonthEntries.filter(([,e]) => e.mood === m.id).length,
  }));

  // ── Active mood data based on tab ─────────────────────────────
  const activeMoodData = tab === "hers" ? herData : myData;
  const isMyTab        = tab === "mine";

  return (
    <div style={S.root}>
      <style>{CSS}</style>

      {/* Header */}
      <div style={S.header}>
        <button style={S.backBtn} onClick={() => navigate(-1)}>←</button>
        <div style={{ flex:1 }}>
          <h1 style={S.headerTitle}>Mood Board 🎨</h1>
          <p style={S.headerSub}>{totalLogged} days logged · {streak} day streak 🔥</p>
        </div>
        <button style={S.iconBtn} onClick={() => setShowSetup(true)} title="Connect sister">👥</button>
      </div>

      {/* Tabs */}
      <div style={S.tabWrap}>
        <button style={{ ...S.tabBtn, ...(tab==="mine"  ? S.tabActive : {}) }} onClick={() => setTab("mine")}>
          My Mood
          <span style={{ ...S.tabCount, ...(tab==="mine" ? S.tabCountActive : {}) }}>
            {Object.keys(myData).length}
          </span>
        </button>
        <button style={{ ...S.tabBtn, ...(tab==="hers"  ? S.tabActive : {}) }} onClick={() => setTab("hers")}>
          {herName}'s
          <span style={{ ...S.tabCount, ...(tab==="hers" ? S.tabCountActive : {}) }}>
            {Object.keys(herData).length}
          </span>
        </button>
        <button style={{ ...S.tabBtn, ...(tab==="stats" ? S.tabActive : {}) }} onClick={() => setTab("stats")}>
          📊 Stats
        </button>
      </div>

      {/* No sister connected */}
      {tab === "hers" && !herEmail && (
        <div style={S.setupBanner}>
          <span style={{ fontSize:32 }}>👯‍♀️</span>
          <div>
            <p style={S.setupTitle}>Connect your sister</p>
            <p style={S.setupSub}>Add her email to see her mood calendar</p>
          </div>
          <button style={S.setupBtn} onClick={() => setShowSetup(true)}>Connect</button>
        </div>
      )}

      {/* Calendar view */}
      {(tab === "mine" || tab === "hers") && (
        (tab === "mine" ? loadingMe : loadingHer) ? (
          <div style={S.centerBox}><div style={S.spinner}/></div>
        ) : (
          <div style={S.content}>

            {/* Month nav */}
            <div style={S.monthNav}>
              <button style={S.navBtn} onClick={prevMonth}>‹</button>
              <h2 style={S.monthTitle}>{MONTHS[viewMonth]} {viewYear}</h2>
              <button style={S.navBtn} onClick={nextMonth}>›</button>
            </div>

            {/* Legend */}
            <div style={S.legend}>
              {MOODS.map(m => (
                <div key={m.id} style={S.legendItem}>
                  <div style={{ ...S.legendDot, background: m.color }} />
                  <span style={S.legendTxt}>{m.emoji} {m.label}</span>
                </div>
              ))}
            </div>

            {/* Day headers */}
            <div style={S.dayHeaders}>
              {DAYS.map(d => <span key={d} style={S.dayHeader}>{d}</span>)}
            </div>

            {/* Grid */}
            <div style={S.grid}>
              {Array.from({ length: firstDay }).map((_, i) => (
                <div key={`e-${i}`} style={S.emptyCell} />
              ))}
              {Array.from({ length: daysInMonth }).map((_, i) => {
                const day     = i + 1;
                const key     = dateKey(viewYear, viewMonth, day);
                const entry   = activeMoodData[key];
                const mood    = entry ? MOOD_MAP[entry.mood] : null;
                const isToday = key === today;
                const isFuture = key > today;

                return (
                  <div key={key}
                    style={{
                      ...S.cell,
                      background: mood ? mood.color : "#f3e8ff22",
                      border:     isToday ? "2px solid #ec4899" : "2px solid transparent",
                      opacity:    isFuture ? 0.35 : 1,
                      cursor:     isMyTab && !isFuture ? "pointer" : "default",
                    }}
                    className="mood-cell"
                    onClick={() => {
                      if (!isMyTab || isFuture) return;
                      setSelected(key);
                      setShowSheet(true);
                    }}
                  >
                    <span style={{ ...S.cellDay, color: mood ? "#fff" : "#ccc" }}>{day}</span>
                    {mood && <span style={S.cellEmoji}>{mood.emoji}</span>}
                    {entry?.note && <div style={S.cellDot} />}
                  </div>
                );
              })}
            </div>

            {/* Today prompt — only on mine tab */}
            {isMyTab && !myData[today] && (
              <div style={S.todayPrompt} onClick={() => { setSelected(today); setShowSheet(true); }}>
                <span style={{ fontSize:24 }}>✨</span>
                <div>
                  <p style={S.promptTitle}>How are you feeling today?</p>
                  <p style={S.promptSub}>Tap to log your mood</p>
                </div>
                <span style={{ color:"#fff", fontSize:20 }}>›</span>
              </div>
            )}

            {/* Recent entries */}
            {Object.entries(activeMoodData)
              .sort(([a],[b]) => b.localeCompare(a))
              .slice(0,5)
              .map(([key, entry]) => {
                const mood = MOOD_MAP[entry.mood];
                if (!mood) return null;
                return (
                  <div key={key} style={S.recentCard} className="recent-card"
                    onClick={() => { if (!isMyTab) return; setSelected(key); setShowSheet(true); }}>
                    <div style={{ ...S.recentDot, background: mood.color }}>{mood.emoji}</div>
                    <div style={{ flex:1 }}>
                      <p style={S.recentDate}>{new Date(key+"T00:00:00").toLocaleDateString("en-IN",{ weekday:"short", day:"numeric", month:"short" })}</p>
                      {entry.note && <p style={S.recentNote}>{entry.note}</p>}
                      {entry.song && <p style={S.recentSong}>🎵 {entry.song}</p>}
                    </div>
                    <span style={{ ...S.recentMood, color: mood.color }}>{mood.label}</span>
                  </div>
                );
              })}
          </div>
        )
      )}

      {/* Stats tab */}
      {tab === "stats" && (
        <div style={S.content}>
          <div style={S.statsGrid}>
            <div style={S.statCard}>
              <p style={S.statNum}>{totalLogged}</p>
              <p style={S.statLbl}>Days Logged</p>
            </div>
            <div style={S.statCard}>
              <p style={S.statNum}>{streak} 🔥</p>
              <p style={S.statLbl}>Day Streak</p>
            </div>
            <div style={S.statCard}>
              <p style={S.statNum}>{topMood?.count > 0 ? topMood.emoji : "—"}</p>
              <p style={S.statLbl}>Top Mood</p>
            </div>
          </div>

          <h3 style={S.sectionHead}>{MONTHS[viewMonth]} Breakdown</h3>
          {thisMonthCounts.map(m => (
            <div key={m.id} style={S.barRow}>
              <span style={S.barEmoji}>{m.emoji}</span>
              <span style={S.barLabel}>{m.label}</span>
              <div style={S.barBg}>
                <div style={{ ...S.barFill, width: thisMonthEntries.length > 0 ? `${(m.count/thisMonthEntries.length)*100}%` : "0%", background: m.color }} />
              </div>
              <span style={S.barCount}>{m.count}</span>
            </div>
          ))}

          <h3 style={{ ...S.sectionHead, marginTop:24 }}>All Time</h3>
          {moodCounts.map(m => (
            <div key={m.id} style={S.barRow}>
              <span style={S.barEmoji}>{m.emoji}</span>
              <span style={S.barLabel}>{m.label}</span>
              <div style={S.barBg}>
                <div style={{ ...S.barFill, width: totalLogged > 0 ? `${(m.count/totalLogged)*100}%` : "0%", background: m.color }} />
              </div>
              <span style={S.barCount}>{m.count}</span>
            </div>
          ))}
        </div>
      )}

      {/* Mood entry sheet */}
      {showSheet && selected && (
        <MoodSheet
          dateKey={selected}
          existing={myData[selected]}
          onSave={(entry) => handleSave(selected, entry)}
          onDelete={() => handleDelete(selected)}
          onClose={() => setShowSheet(false)}
        />
      )}

      {/* Setup sister sheet */}
      {showSetup && (
        <SetupSisterSheet
          current={herEmail}
          onClose={() => setShowSetup(false)}
          onSave={handleSaveSister}
        />
      )}
    </div>
  );
}

// ── Mood sheet ────────────────────────────────────────────────────────────────
function MoodSheet({ dateKey, existing, onSave, onDelete, onClose }) {
  const [mood, setMood] = useState(existing?.mood || null);
  const [note, setNote] = useState(existing?.note || "");
  const [song, setSong] = useState(existing?.song || "");

  const displayDate = new Date(dateKey+"T00:00:00").toLocaleDateString("en-IN",{
    weekday:"long", day:"numeric", month:"long", year:"numeric"
  });

  return (
    <div style={S.sheetOverlay} onClick={onClose}>
      <div style={S.sheet} onClick={e => e.stopPropagation()}>
        <div style={S.sheetHandle} />
        <div style={S.sheetScroll}>
          <div style={S.sheetHeader}>
            <div>
              <h2 style={S.sheetTitle}>How was your day?</h2>
              <p style={S.sheetDate}>{displayDate}</p>
            </div>
            <button style={S.sheetClose} onClick={onClose}>✕</button>
          </div>

          <div style={S.moodPicker}>
            {MOODS.map(m => (
              <button key={m.id}
                style={{ ...S.moodBtn, background: mood===m.id ? m.color : m.light, border:`2px solid ${mood===m.id ? m.color : "transparent"}`, transform: mood===m.id ? "scale(1.08)" : "scale(1)" }}
                onClick={() => setMood(m.id)}>
                <span style={{ fontSize:28 }}>{m.emoji}</span>
                <span style={{ fontSize:12, fontWeight:600, color: mood===m.id ? "#fff" : m.color }}>{m.label}</span>
              </button>
            ))}
          </div>

          <label style={S.label}>📝 Journal note</label>
          <textarea style={S.textarea} placeholder="Write anything about your day..." value={note} onChange={e => setNote(e.target.value)} rows={3} />

          <label style={S.label}>🎵 Song of the day</label>
          <input style={S.input} placeholder="e.g. Lover - Taylor Swift" value={song} onChange={e => setSong(e.target.value)} />

          <button style={S.saveBtn} onClick={() => {
            if (!mood) { alert("Pick a mood first!"); return; }
            onSave({ mood, note: note.trim(), song: song.trim(), savedAt: Date.now() });
          }}>Save Mood ✨</button>

          {existing && <button style={S.deleteBtn} onClick={onDelete}>🗑 Remove entry</button>}
        </div>
      </div>
    </div>
  );
}

// ── Setup sister sheet ────────────────────────────────────────────────────────
function SetupSisterSheet({ current, onClose, onSave }) {
  const [email,  setEmail]  = useState(current || "");
  const [saving, setSaving] = useState(false);

  return (
    <div style={S.sheetOverlay} onClick={onClose}>
      <div style={{ ...S.sheet, maxHeight:"50vh" }} onClick={e => e.stopPropagation()}>
        <div style={S.sheetHandle} />
        <div style={S.sheetScroll}>
          <div style={S.sheetHeader}>
            <h2 style={S.sheetTitle}>Sister's Mood 👯‍♀️</h2>
            <button style={S.sheetClose} onClick={onClose}>✕</button>
          </div>
          <p style={{ fontSize:13, color:"#f9a8d4", marginBottom:16, lineHeight:1.6 }}>
            Enter your sister's email to see her mood calendar. She must already have an account.
          </p>
          <label style={S.label}>Sister's Email</label>
          <input style={S.input} type="email" placeholder="her@email.com"
            value={email} onChange={e => setEmail(e.target.value)} />
          <button style={{ ...S.saveBtn, opacity: saving ? 0.6:1 }} disabled={saving}
            onClick={async () => {
              if (!email.trim()) return;
              setSaving(true);
              await onSave(email.trim().toLowerCase());
              setSaving(false);
            }}>
            {saving ? "Saving..." : "Save 💌"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── CSS ───────────────────────────────────────────────────────────────────────
const CSS = `
  @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@500;700&family=DM+Sans:wght@300;400;500;600&display=swap');
  * { box-sizing:border-box; margin:0; padding:0; }
  @keyframes fadeUp  { from{opacity:0;transform:translateY(12px);} to{opacity:1;transform:translateY(0);} }
  @keyframes spin    { to{transform:rotate(360deg);} }
  @keyframes slideUp { from{transform:translateY(100%);} to{transform:translateY(0);} }
  input:focus, textarea:focus { outline:none; }
  button { font-family:'DM Sans',sans-serif; }
  .mood-cell { transition:transform 0.15s,box-shadow 0.15s; }
  .mood-cell:hover { transform:scale(1.06); box-shadow:0 4px 12px rgba(0,0,0,0.12); }
  .recent-card { transition:transform 0.15s; }
  .recent-card:hover { transform:translateX(4px); }
`;

// ── Styles ────────────────────────────────────────────────────────────────────
const S = {
  root:        { minHeight:"100vh", background:"#fff8fb", fontFamily:"'DM Sans',sans-serif", paddingBottom:60 },
  header:      { display:"flex", alignItems:"center", gap:12, padding:"16px 16px 12px", background:"#fff", borderBottom:"1px solid #fce7f3", position:"sticky", top:0, zIndex:50 },
  backBtn:     { background:"#fce7f3", border:"none", borderRadius:10, width:36, height:36, fontSize:18, cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center", color:"#be185d", flexShrink:0 },
  headerTitle: { fontFamily:"'Playfair Display',serif", fontSize:20, color:"#be185d", marginBottom:1 },
  headerSub:   { fontSize:12, color:"#f9a8d4" },
  iconBtn:     { background:"#fce7f3", border:"none", borderRadius:10, width:36, height:36, fontSize:17, cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 },

  tabWrap:         { display:"flex", background:"#fff", borderBottom:"1px solid #fce7f3", padding:"0 16px" },
  tabBtn:          { flex:1, padding:"13px 0", background:"none", border:"none", borderBottom:"2px solid transparent", fontSize:14, fontWeight:500, color:"#f9a8d4", cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center", gap:8, transition:"all 0.2s" },
  tabActive:       { color:"#ec4899", borderBottomColor:"#ec4899" },
  tabCount:        { fontSize:11, background:"#fce7f3", color:"#be185d", borderRadius:999, padding:"1px 8px", fontWeight:700 },
  tabCountActive:  { color:"#ec4899" },

  setupBanner: { display:"flex", alignItems:"center", gap:12, margin:"16px", background:"linear-gradient(135deg,#fdf2f8,#fce7f3)", border:"1px solid #fce7f3", borderRadius:16, padding:"16px" },
  setupTitle:  { fontSize:14, fontWeight:600, color:"#be185d", marginBottom:2 },
  setupSub:    { fontSize:12, color:"#f9a8d4" },
  setupBtn:    { background:"linear-gradient(135deg,#ec4899,#be185d)", color:"#fff", border:"none", borderRadius:10, padding:"8px 16px", fontSize:13, fontWeight:600, cursor:"pointer", flexShrink:0 },

  content:    { padding:"16px" },
  centerBox:  { display:"flex", justifyContent:"center", alignItems:"center", padding:60 },
  spinner:    { width:30, height:30, border:"3px solid #fce7f3", borderTop:"3px solid #ec4899", borderRadius:"50%", animation:"spin 0.8s linear infinite" },

  monthNav:   { display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:12 },
  navBtn:     { background:"#fce7f3", border:"none", borderRadius:10, width:36, height:36, fontSize:22, cursor:"pointer", color:"#be185d", display:"flex", alignItems:"center", justifyContent:"center" },
  monthTitle: { fontFamily:"'Playfair Display',serif", fontSize:18, color:"#be185d" },

  legend:     { display:"flex", gap:8, flexWrap:"wrap", marginBottom:10 },
  legendItem: { display:"flex", alignItems:"center", gap:4 },
  legendDot:  { width:9, height:9, borderRadius:"50%" },
  legendTxt:  { fontSize:10, color:"#888" },

  dayHeaders: { display:"grid", gridTemplateColumns:"repeat(7,1fr)", marginBottom:4, maxWidth:340, margin:"0 auto 4px" },
  dayHeader:  { textAlign:"center", fontSize:10, color:"#f9a8d4", fontWeight:600, padding:"3px 0" },

  grid:       { display:"grid", gridTemplateColumns:"repeat(7,1fr)", gap:4, marginBottom:16, maxWidth:340, margin:"0 auto 16px" },
  emptyCell:  { aspectRatio:"1" },
  cell:       { aspectRatio:"1", borderRadius:6, display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", position:"relative", gap:1 },
  cellDay:    { fontSize:12, fontWeight:700 },
  cellEmoji:  { fontSize:11, lineHeight:1 },
  cellDot:    { position:"absolute", bottom:2, right:2, width:4, height:4, borderRadius:"50%", background:"rgba(255,255,255,0.9)" },

  todayPrompt: { display:"flex", alignItems:"center", gap:14, background:"linear-gradient(135deg,#ec4899,#be185d)", borderRadius:16, padding:"14px 16px", marginBottom:14, cursor:"pointer" },
  promptTitle: { fontSize:14, fontWeight:600, color:"#fff", marginBottom:2 },
  promptSub:   { fontSize:12, color:"rgba(255,255,255,0.8)" },

  recentCard:  { display:"flex", alignItems:"flex-start", gap:12, background:"#fff", borderRadius:14, padding:"14px", marginBottom:10, boxShadow:"0 2px 10px rgba(236,72,153,0.06)", cursor:"pointer", animation:"fadeUp 0.3s ease both" },
  recentDot:   { width:40, height:40, borderRadius:12, display:"flex", alignItems:"center", justifyContent:"center", fontSize:20, flexShrink:0 },
  recentDate:  { fontSize:13, fontWeight:600, color:"#1a0a12", marginBottom:3 },
  recentNote:  { fontSize:12, color:"#888", marginBottom:2 },
  recentSong:  { fontSize:12, color:"#a855f7" },
  recentMood:  { fontSize:13, fontWeight:600, flexShrink:0 },

  statsGrid:   { display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:12, marginBottom:24 },
  statCard:    { background:"#fff", borderRadius:14, padding:"16px 10px", textAlign:"center", boxShadow:"0 2px 10px rgba(236,72,153,0.07)" },
  statNum:     { fontFamily:"'Playfair Display',serif", fontSize:24, color:"#be185d", fontWeight:700, marginBottom:4 },
  statLbl:     { fontSize:11, color:"#f9a8d4", textTransform:"uppercase", letterSpacing:"0.5px" },
  sectionHead: { fontFamily:"'Playfair Display',serif", fontSize:17, color:"#be185d", marginBottom:14 },
  barRow:      { display:"flex", alignItems:"center", gap:10, marginBottom:12 },
  barEmoji:    { fontSize:18, flexShrink:0 },
  barLabel:    { fontSize:13, color:"#666", width:60, flexShrink:0 },
  barBg:       { flex:1, height:10, background:"#fce7f3", borderRadius:99, overflow:"hidden" },
  barFill:     { height:"100%", borderRadius:99, transition:"width 0.5s ease" },
  barCount:    { fontSize:13, fontWeight:600, color:"#be185d", width:24, textAlign:"right", flexShrink:0 },

  sheetOverlay: { position:"fixed", inset:0, background:"rgba(0,0,0,0.45)", zIndex:200, display:"flex", alignItems:"flex-end" },
  sheet:        { background:"#fff", borderRadius:"24px 24px 0 0", width:"100%", maxHeight:"90vh", animation:"slideUp 0.35s cubic-bezier(.22,1,.36,1) both", display:"flex", flexDirection:"column" },
  sheetHandle:  { width:40, height:4, background:"#fce7f3", borderRadius:99, margin:"12px auto 0", flexShrink:0 },
  sheetScroll:  { overflowY:"auto", padding:"0 20px 40px", flex:1 },
  sheetHeader:  { display:"flex", alignItems:"flex-start", justifyContent:"space-between", padding:"16px 0 14px" },
  sheetTitle:   { fontFamily:"'Playfair Display',serif", fontSize:22, color:"#be185d" },
  sheetDate:    { fontSize:12, color:"#f9a8d4", marginTop:2 },
  sheetClose:   { background:"#fce7f3", border:"none", borderRadius:10, width:32, height:32, fontSize:16, cursor:"pointer", color:"#be185d", display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 },

  moodPicker:  { display:"grid", gridTemplateColumns:"repeat(5,1fr)", gap:8, marginBottom:20 },
  moodBtn:     { borderRadius:14, padding:"12px 4px", display:"flex", flexDirection:"column", alignItems:"center", gap:6, cursor:"pointer", transition:"all 0.2s", border:"2px solid transparent" },

  label:    { display:"block", fontSize:12, fontWeight:600, color:"#be185d", marginBottom:6, letterSpacing:"0.5px", textTransform:"uppercase" },
  textarea: { width:"100%", padding:"12px 14px", background:"#fff8fb", border:"1.5px solid #fce7f3", borderRadius:12, fontSize:14, color:"#1a0a12", fontFamily:"'DM Sans',sans-serif", marginBottom:14, resize:"vertical" },
  input:    { width:"100%", padding:"12px 14px", background:"#fff8fb", border:"1.5px solid #fce7f3", borderRadius:12, fontSize:14, color:"#1a0a12", fontFamily:"'DM Sans',sans-serif", marginBottom:14 },
  saveBtn:  { width:"100%", padding:16, background:"linear-gradient(135deg,#ec4899,#be185d)", color:"#fff", border:"none", borderRadius:14, fontSize:15, fontWeight:600, cursor:"pointer", marginTop:8, boxShadow:"0 6px 20px rgba(236,72,153,0.3)" },
  deleteBtn:{ width:"100%", padding:12, background:"rgba(239,68,68,0.07)", border:"1px solid rgba(239,68,68,0.2)", borderRadius:12, color:"#ef4444", fontSize:13, fontWeight:600, cursor:"pointer", marginTop:10 },
};