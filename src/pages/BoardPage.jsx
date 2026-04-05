import { useParams, useNavigate } from "react-router-dom";

const BOARD_INFO = {
  recipes:  { emoji: "🧁", title: "My Recipes",   color: "#f59e0b" },
  expenses: { emoji: "💰", title: "My Expenses",  color: "#10b981" },
  wishlist: { emoji: "🛍",  title: "My Wishlist",  color: "#8b5cf6" },
  mood:     { emoji: "🎨", title: "Mood Board",   color: "#ec4899" },
  schedule: { emoji: "📅", title: "My Schedule",  color: "#0891b2" },
  workouts: { emoji: "🏋️", title: "My Workouts", color: "#ef4444" },
};

export default function BoardPage() {
  const { id }   = useParams();
  const navigate = useNavigate();

  const info = BOARD_INFO[id] || {
    emoji: "📝",
    title: id,
    color: "#ec4899",
  };

  return (
    <div style={S.root}>
      <style>{CSS}</style>

      {/* Topbar */}
      <div style={{ ...S.topbar, background: info.color }}>
        <button style={S.backBtn} onClick={() => navigate("/dashboard")}>←</button>
        <div style={S.topInfo}>
          <span style={S.topEmoji}>{info.emoji}</span>
          <p style={S.topTitle}>{info.title}</p>
        </div>
      </div>

      {/* Empty state */}
      <div style={S.empty}>
        <p style={{ fontSize: 48, marginBottom: 16 }}>{info.emoji}</p>
        <p style={{ fontWeight: 700, fontSize: 18, color: "#be185d", marginBottom: 8 }}>
          {info.title}
        </p>
        <p style={{ fontSize: 13, color: "#aaa" }}>
          Nothing here yet. Coming soon!
        </p>
      </div>
    </div>
  );
}

const CSS = `
  @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&display=swap');
  * { box-sizing: border-box; margin: 0; padding: 0; }
`;

const S = {
  root:    { minHeight:"100vh", background:"#fff0f5", fontFamily:"'DM Sans',sans-serif" },
  topbar:  { display:"flex", alignItems:"center", gap:12, padding:"14px 16px", position:"sticky", top:0, zIndex:100 },
  backBtn: { background:"rgba(255,255,255,0.25)", border:"none", borderRadius:10, padding:"6px 12px", color:"#fff", fontSize:18, cursor:"pointer" },
  topInfo: { display:"flex", alignItems:"center", gap:8 },
  topEmoji:{ fontSize:20 },
  topTitle:{ fontSize:17, fontWeight:700, color:"#fff" },
  empty:   { display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", minHeight:"70vh", padding:20, textAlign:"center" },
};