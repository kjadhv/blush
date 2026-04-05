import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { signOut } from "firebase/auth";
import { auth, db } from "../firebase";
import {
  doc, getDoc, updateDoc, setDoc, arrayUnion, arrayRemove
} from "firebase/firestore";
import AddEntry from "./AddEntry";

const DEFAULT_SECTIONS = [
  { emoji: "🧁", title: "My Recipes",   desc: "Saved recipes & meal ideas",  id: "recipes",  isDefault: true },
  { emoji: "💰", title: "My Expenses",  desc: "Track your spending",          id: "expenses", isDefault: true },
  { emoji: "🛍",  title: "My Wishlist",  desc: "Things you want",              id: "wishlist", isDefault: true },
  { emoji: "🎨", title: "Mood Board",   desc: "Vibes, inspo & aesthetics",    id: "mood",     isDefault: true },
  { emoji: "📅", title: "My Schedule",  desc: "Upcoming plans & reminders",   id: "schedule", isDefault: true },
  { emoji: "🏋️", title: "My Workouts", desc: "Fitness routines & progress",  id: "workouts", isDefault: true },
];

const EMOJIS = ["📝","🌸","💭","⭐","🎀","🌈","🦋","🍀","💫","🎵"];
const randomEmoji = () => EMOJIS[Math.floor(Math.random() * EMOJIS.length)];

export default function Dashboard({ user }) {
  const navigate    = useNavigate();
  const [dark,      setDark]      = useState(false);
  const [showAdd,   setShowAdd]   = useState(false);
  const [extras,    setExtras]    = useState([]);  // from Firebase
  const [loading,   setLoading]   = useState(true);
  const [deleteModal, setDeleteModal] = useState(null); // board to delete

  const name = user?.displayName || "Friend";
  const userRef = doc(db, "users", user.uid);

  // ── Load saved boards from Firebase ──────────────────────────
  useEffect(() => {
    const load = async () => {
      try {
        const snap = await getDoc(userRef);
        if (snap.exists()) {
          setExtras(snap.data().boards || []);
        }
      } catch (err) {
        console.error("Load boards error:", err);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [user.uid]);

  // ── Save new board to Firebase ────────────────────────────────
  const handleAddText = async (txt) => {
    const newBoard = {
      emoji: randomEmoji(),
      title: txt,
      desc:  "Added by you",
      id:    `board_${Date.now()}`,
    };
    try {
      // Make sure doc exists first
      const snap = await getDoc(userRef);
      if (!snap.exists()) {
        await setDoc(userRef, { boards: [newBoard] }, { merge: true });
      } else {
        await updateDoc(userRef, { boards: arrayUnion(newBoard) });
      }
      setExtras(prev => [...prev, newBoard]);
    } catch (err) {
      console.error("Save board error:", err);
    }
  };

  // ── Delete board from Firebase ────────────────────────────────
  const handleDelete = async (board) => {
    try {
      await updateDoc(userRef, { boards: arrayRemove(board) });
      setExtras(prev => prev.filter(b => b.id !== board.id));
      setDeleteModal(null);
    } catch (err) {
      console.error("Delete board error:", err);
    }
  };

  const handleLogout = async () => {
    await signOut(auth);
    navigate("/", { replace: true });
  };

  const bg   = dark ? "#1a0a12" : "#fff0f5";
  const card = dark ? "#2a0f1f" : "#fff";
  const text = dark ? "#fff"    : "#1a0a12";
  const sub  = dark ? "#888"    : "#aaa";

  const allSections = [...DEFAULT_SECTIONS, ...extras];

  return (
    <div style={{ ...S.root, background: bg, color: text }}>
      <style>{CSS}</style>

      {/* Topbar */}
      <div style={{ ...S.topbar, background: dark ? "#3b0a2a" : "#ec4899" }}>
        <span style={S.appName}>Blush 🌸</span>
        <div style={S.topRight}>
          <button style={S.iconBtn} onClick={() => setDark(!dark)}>
            {dark ? "☀️" : "🌙"}
          </button>
          <button style={S.iconBtn} onClick={handleLogout}>⎋</button>
        </div>
      </div>

      <div style={S.content}>

        {/* Hero */}
        <div style={S.hero}>
          <div style={S.heroInner}>
            <div style={S.heartBox}>🌸</div>
            <div style={{ flex: 1 }}>
              <h2 style={S.heroName}>Hello, {name.split(" ")[0]} 💕</h2>
              <p style={S.heroSub}>Good to see you again</p>
            </div>
            <button style={S.fabInHero} onClick={() => setShowAdd(true)}>+</button>
          </div>
        </div>

        {loading ? (
          <div style={{ textAlign:"center", padding:40 }}>
            <div style={S.spinner} />
          </div>
        ) : (
          allSections.map((s, i) => (
            <SectionCard
              key={s.id}
              section={s}
              card={card}
              text={text}
              sub={sub}
              i={i}
              onLongPress={() => !s.isDefault && setDeleteModal(s)}
              onClick={() => navigate(`/board/${s.id}`)}
            />
          ))
        )}

      </div>

      {/* AddEntry sheet */}
      {showAdd && (
        <AddEntry
          onAddText={handleAddText}
          onClose={() => setShowAdd(false)}
        />
      )}

      {/* Delete modal */}
      {deleteModal && (
        <div style={S.modalOverlay} onClick={() => setDeleteModal(null)}>
          <div style={{ ...S.modal, background: card }} onClick={e => e.stopPropagation()}>
            <p style={{ fontSize: 32, marginBottom: 12 }}>🗑️</p>
            <p style={{ fontWeight: 700, fontSize: 16, color: "#be185d", marginBottom: 8 }}>
              Delete "{deleteModal.title}"?
            </p>
            <p style={{ fontSize: 13, color: sub, marginBottom: 24 }}>
              This will permanently remove this board.
            </p>
            <div style={S.modalBtns}>
              <button style={S.cancelBtn} onClick={() => setDeleteModal(null)}>Cancel</button>
              <button style={S.deleteBtn} onClick={() => handleDelete(deleteModal)}>Delete</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Section card with long press ──────────────────────────────
function SectionCard({ section: s, card, text, sub, i, onLongPress, onClick }) {
  const timerRef    = useRef(null);
  const pressedRef  = useRef(false);

  const startPress = () => {
    pressedRef.current = false;
    timerRef.current = setTimeout(() => {
      pressedRef.current = true;
      onLongPress();
    }, 600); // 600ms = long press
  };

  const endPress = () => {
    clearTimeout(timerRef.current);
  };

  const handleClick = () => {
    if (!pressedRef.current) onClick();
  };

  return (
    <div
      style={{ ...S.sectionCard, background: card, color: text, animationDelay: `${i * 0.06}s` }}
      onMouseDown={startPress}
      onMouseUp={endPress}
      onMouseLeave={endPress}
      onTouchStart={startPress}
      onTouchEnd={endPress}
      onClick={handleClick}
    >
      <div style={S.sectionLeft}>
        <div style={S.sectionEmoji}>{s.emoji}</div>
        <div>
          <p style={S.sectionTitle}>{s.title}</p>
          <p style={{ ...S.sectionDesc, color: sub }}>{s.desc}</p>
        </div>
      </div>
      <div style={{ display:"flex", alignItems:"center", gap:8 }}>
        {!s.isDefault && <span style={{ fontSize:11, color: sub }}>hold to delete</span>}
        <span style={{ color: "#ec4899", fontSize: 18 }}>›</span>
      </div>
    </div>
  );
}

const CSS = `
  @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;600;700&display=swap');
  * { box-sizing: border-box; margin: 0; padding: 0; }
  @keyframes fadeUp { from{opacity:0;transform:translateY(16px);} to{opacity:1;transform:translateY(0);} }
  @keyframes spin   { to{transform:rotate(360deg);} }
`;

const S = {
  root:    { minHeight:"100vh", fontFamily:"'DM Sans',sans-serif", transition:"background 0.3s" },
  topbar:  { display:"flex", alignItems:"center", justifyContent:"space-between", padding:"14px 20px", position:"sticky", top:0, zIndex:100 },
  appName: { fontSize:20, fontWeight:700, color:"#fff" },
  topRight:{ display:"flex", gap:8 },
  iconBtn: { background:"rgba(255,255,255,0.2)", border:"none", borderRadius:10, padding:"6px 10px", fontSize:18, cursor:"pointer", color:"#fff" },
  content: { padding:"20px 16px 40px", maxWidth:480, margin:"0 auto" },
  hero: {
    background:"linear-gradient(135deg,#ec4899,#be185d)",
    borderRadius:20, padding:"20px", marginBottom:16,
    animation:"fadeUp 0.5s ease both",
  },
  heroInner: { display:"flex", alignItems:"center", gap:14 },
  heartBox:  { width:48, height:48, background:"rgba(255,255,255,0.25)", borderRadius:14, display:"flex", alignItems:"center", justifyContent:"center", fontSize:22, flexShrink:0 },
  heroName:  { fontSize:20, fontWeight:700, color:"#fff", marginBottom:2 },
  heroSub:   { fontSize:13, color:"rgba(255,255,255,0.8)" },
  fabInHero: { width:38, height:38, borderRadius:"50%", background:"rgba(255,255,255,0.25)", color:"#fff", fontSize:24, lineHeight:1, border:"none", cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0, fontFamily:"'DM Sans',sans-serif" },
  sectionCard: { borderRadius:16, padding:"16px", marginBottom:10, display:"flex", alignItems:"center", justifyContent:"space-between", boxShadow:"0 2px 12px rgba(236,72,153,0.08)", cursor:"pointer", animation:"fadeUp 0.4s ease both", userSelect:"none" },
  sectionLeft:  { display:"flex", alignItems:"center", gap:14 },
  sectionEmoji: { width:46, height:46, background:"#fce7f3", borderRadius:12, display:"flex", alignItems:"center", justifyContent:"center", fontSize:22, flexShrink:0 },
  sectionTitle: { fontSize:15, fontWeight:600, marginBottom:3 },
  sectionDesc:  { fontSize:12 },
  spinner: { width:30, height:30, border:"3px solid #fbcfe8", borderTop:"3px solid #ec4899", borderRadius:"50%", animation:"spin 0.8s linear infinite", margin:"0 auto" },
  modalOverlay: { position:"fixed", inset:0, background:"rgba(0,0,0,0.5)", zIndex:500, display:"flex", alignItems:"center", justifyContent:"center", padding:20 },
  modal: { borderRadius:20, padding:"28px 24px", width:"100%", maxWidth:320, textAlign:"center", boxShadow:"0 20px 60px rgba(0,0,0,0.2)" },
  modalBtns: { display:"flex", gap:12 },
  cancelBtn: { flex:1, padding:"12px 0", background:"#fce7f3", color:"#be185d", border:"none", borderRadius:12, fontSize:14, fontWeight:600, fontFamily:"'DM Sans',sans-serif", cursor:"pointer" },
  deleteBtn: { flex:1, padding:"12px 0", background:"linear-gradient(135deg,#ef4444,#dc2626)", color:"#fff", border:"none", borderRadius:12, fontSize:14, fontWeight:600, fontFamily:"'DM Sans',sans-serif", cursor:"pointer" },
};