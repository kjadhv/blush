import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { signOut } from "firebase/auth";
import { auth } from "../firebase";
import AddEntry from "./AddEntry";

const DEFAULT_SECTIONS = [
  { emoji: "🧁", title: "My Recipes",   desc: "Saved recipes & meal ideas"  },
  { emoji: "💰", title: "My Expenses",  desc: "Track your spending"          },
  { emoji: "🛍",  title: "My Wishlist",  desc: "Things you want"              },
  { emoji: "🎨", title: "Mood Board",   desc: "Vibes, inspo & aesthetics"    },
  { emoji: "📅", title: "My Schedule",  desc: "Upcoming plans & reminders"   },
  { emoji: "🏋️", title: "My Workouts", desc: "Fitness routines & progress"  },
];

const EMOJIS = ["📝","🌸","💭","⭐","🎀","🌈","🦋","🍀","💫","🎵"];
const randomEmoji = () => EMOJIS[Math.floor(Math.random() * EMOJIS.length)];

export default function Dashboard({ user }) {
  const navigate  = useNavigate();
  const [dark,    setDark]    = useState(false);
  const [showAdd, setShowAdd] = useState(false);
  const [extras,  setExtras]  = useState([]);

  const name = user?.displayName || "Friend";

  const handleLogout = async () => {
    await signOut(auth);
    navigate("/", { replace: true });
  };

  const handleAddText = (txt) => {
    setExtras(prev => [...prev, {
      emoji: randomEmoji(),
      title: txt,
      desc:  "Added by you",
      id:    Date.now(),
    }]);
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

        {/* Section cards */}
        {allSections.map((s, i) => (
          <div
            key={s.id || s.title}
            style={{
              ...S.sectionCard,
              background: card,
              color: text,
              animationDelay: `${i * 0.06}s`,
            }}
          >
            <div style={S.sectionLeft}>
              <div style={S.sectionEmoji}>{s.emoji}</div>
              <div>
                <p style={S.sectionTitle}>{s.title}</p>
                <p style={{ ...S.sectionDesc, color: sub }}>{s.desc}</p>
              </div>
            </div>
            <span style={{ color: "#ec4899", fontSize: 18 }}>›</span>
          </div>
        ))}

      </div>

      {showAdd && (
        <AddEntry
          onAddText={handleAddText}
          onClose={() => setShowAdd(false)}
        />
      )}
    </div>
  );
}

const CSS = `
  @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;600;700&display=swap');
  * { box-sizing: border-box; margin: 0; padding: 0; }
  @keyframes fadeUp { from{opacity:0;transform:translateY(16px);} to{opacity:1;transform:translateY(0);} }
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
  fabInHero: {
    width:38, height:38, borderRadius:"50%",
    background:"rgba(255,255,255,0.25)",
    color:"#fff", fontSize:24, lineHeight:1,
    border:"none", cursor:"pointer",
    display:"flex", alignItems:"center", justifyContent:"center",
    flexShrink:0, fontFamily:"'DM Sans',sans-serif",
  },
  sectionCard: {
    borderRadius:16, padding:"16px", marginBottom:10,
    display:"flex", alignItems:"center", justifyContent:"space-between",
    boxShadow:"0 2px 12px rgba(236,72,153,0.08)", cursor:"pointer",
    animation:"fadeUp 0.4s ease both",
  },
  sectionLeft:  { display:"flex", alignItems:"center", gap:14 },
  sectionEmoji: { width:46, height:46, background:"#fce7f3", borderRadius:12, display:"flex", alignItems:"center", justifyContent:"center", fontSize:22, flexShrink:0 },
  sectionTitle: { fontSize:15, fontWeight:600, marginBottom:3 },
  sectionDesc:  { fontSize:12 },
};