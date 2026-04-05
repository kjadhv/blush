import { useNavigate } from "react-router-dom";

export default function Hello() {
  const navigate = useNavigate();

  return (
    <div style={S.root}>
      <style>{CSS}</style>

      <div style={S.blob1} />
      <div style={S.blob2} />

      <div style={S.content}>
        <div style={S.iconWrap}>
          <span style={S.icon}>🌸</span>
        </div>

        <h1 style={S.title}>Blush</h1>
        <p style={S.tagline}>your cozy little corner of the internet</p>

        <button style={S.btn} onClick={() => navigate("/auth")}>
          Get Started →
        </button>

        <p style={S.login}>
          Already have an account?{" "}
          <span style={S.loginLink} onClick={() => navigate("/auth")}>
            Log in
          </span>
        </p>
      </div>
    </div>
  );
}

const CSS = `
  @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;600&family=DM+Serif+Display:ital@0;1&display=swap');
  * { box-sizing: border-box; margin: 0; padding: 0; }
  @keyframes blobPulse { 0%,100%{transform:scale(1);} 50%{transform:scale(1.08);} }
  @keyframes fadeUp    { from{opacity:0;transform:translateY(24px);} to{opacity:1;transform:translateY(0);} }
  @keyframes iconPop   { 0%{transform:scale(0.8);} 60%{transform:scale(1.1);} 100%{transform:scale(1);} }
`;

const S = {
  root: {
    minHeight: "100vh",
    background: "linear-gradient(160deg, #fce4ec 0%, #fce7f3 50%, #ede9fe 100%)",
    display: "flex", alignItems: "center", justifyContent: "center",
    fontFamily: "'DM Sans', sans-serif",
    position: "relative", overflow: "hidden", padding: 20,
  },
  blob1: {
    position: "absolute", width: 320, height: 320, borderRadius: "50%",
    background: "radial-gradient(circle, #fbcfe8, transparent 70%)",
    top: -80, left: -80, opacity: 0.6,
    animation: "blobPulse 8s ease-in-out infinite",
  },
  blob2: {
    position: "absolute", width: 240, height: 240, borderRadius: "50%",
    background: "radial-gradient(circle, #f9a8d4, transparent 70%)",
    bottom: -60, right: -60, opacity: 0.5,
    animation: "blobPulse 10s ease-in-out infinite reverse",
  },
  content: {
    position: "relative", zIndex: 1,
    background: "rgba(255,255,255,0.75)",
    backdropFilter: "blur(20px)",
    borderRadius: 28,
    padding: "56px 36px 48px",
    width: "100%", maxWidth: 420,
    textAlign: "center",
    boxShadow: "0 20px 60px rgba(236,72,153,0.15)",
    border: "1.5px solid rgba(255,255,255,0.9)",
    animation: "fadeUp 0.6s cubic-bezier(.22,1,.36,1) both",
  },
  iconWrap: {
    width: 90, height: 90, borderRadius: "50%",
    background: "linear-gradient(135deg, #ec4899, #be185d)",
    display: "flex", alignItems: "center", justifyContent: "center",
    margin: "0 auto 24px",
    boxShadow: "0 8px 24px rgba(236,72,153,0.4)",
    animation: "iconPop 0.6s ease both 0.2s",
  },
  icon:    { fontSize: 40 },
  title:   { fontFamily: "'DM Serif Display', serif", fontSize: 42, color: "#be185d", marginBottom: 10 },
  tagline: { fontSize: 15, color: "#f472b6", fontWeight: 300, marginBottom: 48 },
  btn: {
    width: "100%", padding: "16px 0",
    background: "linear-gradient(135deg, #ec4899, #be185d)",
    color: "#fff", border: "none", borderRadius: 14,
    fontSize: 16, fontWeight: 600,
    fontFamily: "'DM Sans', sans-serif",
    cursor: "pointer",
    boxShadow: "0 6px 24px rgba(236,72,153,0.4)",
    marginBottom: 18,
    transition: "transform 0.2s, box-shadow 0.2s",
  },
  login:     { fontSize: 13, color: "#f472b6" },
  loginLink: { color: "#be185d", fontWeight: 600, cursor: "pointer", textDecoration: "underline" },
};