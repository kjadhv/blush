import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  updateProfile,
} from "firebase/auth";
import { doc, setDoc, serverTimestamp } from "firebase/firestore";
import { auth, db } from "../firebase";

export default function Auth() {
  const navigate  = useNavigate();
  const [isLogin, setIsLogin] = useState(true);
  const [name,    setName]    = useState("");
  const [email,   setEmail]   = useState("");
  const [pass,    setPass]    = useState("");
  const [phone, setPhone] = useState("");
  const [showPw,  setShowPw]  = useState(false);
  const [loading, setLoading] = useState(false);
  const [toast,   setToast]   = useState(null);

  const showToast = (msg, type = "error") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3500);
  };

  const handleAuth = async () => {
    if (!email || !pass) { showToast("Please fill in all fields."); return; }
    if (!isLogin && !name) { showToast("Please enter your name."); return; }
    if (pass.length < 6) { showToast("Password must be at least 6 characters."); return; }
    if (!isLogin && !phone) { showToast("Please enter your phone number."); return; }
if (!isLogin && !/^[6-9]\d{9}$/.test(phone.replace(/^(\+91|91)/, "").replace(/\s/g, ""))) {
  showToast("Enter a valid 10-digit Indian phone number."); return;
}

    setLoading(true);
    try {
      if (isLogin) {
        // ── Login ──────────────────────────────────────────────
        await signInWithEmailAndPassword(auth, email.trim().toLowerCase(), pass);
        navigate("/dashboard", { replace: true });

      } else {
        // ── Signup ─────────────────────────────────────────────
        const cred = await createUserWithEmailAndPassword(auth, email.trim(), pass);
        await updateProfile(cred.user, { displayName: name.trim() });

        // Save user to Firestore
        await setDoc(doc(db, "users", cred.user.uid), {
          uid:       cred.user.uid,
          name:      name.trim(),
          email:     email.trim().toLowerCase(),
          phone:     phone.replace(/^(\+91|91)/, "").replace(/\s/g, ""),
          createdAt: serverTimestamp(),
        });

        navigate("/dashboard", { replace: true });
      }
    } catch (err) {
      const msg =
        err.code === "auth/user-not-found"    ? "No account found. Sign up first." :
        err.code === "auth/wrong-password"    ? "Incorrect password." :
        err.code === "auth/email-already-in-use" ? "Email already registered. Log in." :
        err.code === "auth/invalid-email"        ? "Invalid email address." :
err.code === "auth/invalid-credential"   ? "Incorrect email or password." :
err.code === "auth/too-many-requests"    ? "Too many attempts. Try again later." :
`Something went wrong: ${err.code}`;
      showToast(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={S.root}>
      <style>{CSS}</style>

      <div style={S.blob1} />
      <div style={S.blob2} />

      {/* Toast */}
      {toast && (
        <div style={{ ...S.toast, ...(toast.type === "success" ? S.toastOk : S.toastErr) }}>
          {toast.type === "success" ? "✅ " : "⚠️ "}{toast.msg}
        </div>
      )}

      <div style={S.card}>

        {/* Header */}
        <div style={S.header}>
          <div style={S.logo}>🌸</div>
          <h1 style={S.title}>Blush</h1>
          <p style={S.sub}>{isLogin ? "Welcome back 💕" : "Join Blush today ✨"}</p>
        </div>

        {/* Toggle */}
        <div style={S.toggle}>
          <button onClick={() => setIsLogin(true)}
            style={{ ...S.toggleBtn, ...(isLogin ? S.activeBtn : S.inactiveBtn) }}>
            Log In
          </button>
          <button onClick={() => setIsLogin(false)}
            style={{ ...S.toggleBtn, ...(!isLogin ? S.activeBtn : S.inactiveBtn) }}>
            Sign Up
          </button>
        </div>

        {/* Form */}
        <div style={S.form}>

          {/* Name — signup only */}
          {!isLogin && (
            <div style={S.inputWrap}>
              <span style={S.inputIcon}>👤</span>
              <input
                style={S.input} placeholder="Your name"
                value={name} onChange={e => setName(e.target.value)}
              />
            </div>
          )}

          <div style={S.inputWrap}>
            <span style={S.inputIcon}>✉️</span>
            <input
              style={S.input} placeholder="Email address"
              type="email" value={email}
              onChange={e => setEmail(e.target.value)}
              onKeyDown={e => e.key === "Enter" && handleAuth()}
            />
          </div>

          <div style={S.inputWrap}>
            <span style={S.inputIcon}>🔑</span>
            <input
              style={S.input}
              placeholder="Password (min 6 chars)"
              type={showPw ? "text" : "password"}
              value={pass}
              onChange={e => setPass(e.target.value)}
              onKeyDown={e => e.key === "Enter" && handleAuth()}
            />
            <button onClick={() => setShowPw(!showPw)} style={S.eyeBtn}>
              {showPw ? "🙈" : "👁️"}
            </button>
          </div>

          {!isLogin && (
  <div style={S.inputWrap}>
    <span style={S.inputIcon}>📱</span>
    <input
      style={S.input}
      placeholder="Indian phone number (10 digits)"
      type="tel"
      value={phone}
      onChange={e => setPhone(e.target.value)}
    />
  </div>
)}

          <button onClick={handleAuth} disabled={loading} style={S.submitBtn}>
            {loading
              ? <span style={S.spinner} />
              : isLogin ? "Log In →" : "Create Account ✨"
            }
          </button>
        </div>

        <p style={S.switchText}>
          {isLogin ? "New here? " : "Already have an account? "}
          <span style={S.switchLink} onClick={() => setIsLogin(!isLogin)}>
            {isLogin ? "Sign up free" : "Log in"}
          </span>
        </p>

        <p style={S.back} onClick={() => navigate("/")}>← Back</p>
      </div>
    </div>
  );
}

const CSS = `
  @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;600&family=DM+Serif+Display&display=swap');
  * { box-sizing: border-box; margin: 0; padding: 0; }
  @keyframes blobPulse { 0%,100%{transform:scale(1);} 50%{transform:scale(1.08);} }
  @keyframes fadeUp    { from{opacity:0;transform:translateY(24px);} to{opacity:1;transform:translateY(0);} }
  @keyframes toastIn   { from{opacity:0;transform:translateX(-50%) translateY(-12px);} to{opacity:1;transform:translateX(-50%) translateY(0);} }
  @keyframes spin      { to{transform:rotate(360deg);} }
  input::placeholder { color:#f9a8d4; opacity:0.9; }
  input:focus { outline: none; }
  button { cursor: pointer; border: none; background: none; }
`;

const S = {
  root: {
    minHeight: "100vh",
    background: "linear-gradient(160deg, #fce4ec, #fce7f3 50%, #ede9fe)",
    display: "flex", alignItems: "center", justifyContent: "center",
    fontFamily: "'DM Sans', sans-serif",
    position: "relative", overflow: "hidden", padding: 20,
  },
  blob1: {
    position:"absolute", width:320, height:320, borderRadius:"50%",
    background:"radial-gradient(circle, #fbcfe8, transparent 70%)",
    top:-80, left:-80, opacity:0.6,
    animation:"blobPulse 8s ease-in-out infinite",
  },
  blob2: {
    position:"absolute", width:240, height:240, borderRadius:"50%",
    background:"radial-gradient(circle, #f9a8d4, transparent 70%)",
    bottom:-60, right:-60, opacity:0.5,
    animation:"blobPulse 10s ease-in-out infinite reverse",
  },
  toast: {
    position:"fixed", top:24, left:"50%", transform:"translateX(-50%)",
    padding:"12px 24px", borderRadius:14, fontWeight:500, fontSize:14,
    zIndex:999, whiteSpace:"nowrap", maxWidth:"90vw",
    animation:"toastIn 0.3s ease",
    boxShadow:"0 8px 32px rgba(236,72,153,0.25)",
  },
  toastErr: { background:"#fff1f2", color:"#be123c", border:"1.5px solid #fda4af" },
  toastOk:  { background:"#fdf4ff", color:"#7c3aed", border:"1.5px solid #d8b4fe" },
  card: {
    position:"relative", zIndex:1,
    background:"rgba(255,255,255,0.75)",
    backdropFilter:"blur(24px)",
    borderRadius:28, padding:"40px 32px 36px",
    width:"100%", maxWidth:400,
    boxShadow:"0 20px 60px rgba(236,72,153,0.18)",
    border:"1.5px solid rgba(255,255,255,0.9)",
    animation:"fadeUp 0.6s cubic-bezier(.22,1,.36,1) both",
  },
  header:  { textAlign:"center", marginBottom:28 },
  logo:    { fontSize:40, marginBottom:8 },
  title:   { fontFamily:"'DM Serif Display',serif", fontSize:30, color:"#be185d", marginBottom:4 },
  sub:     { fontSize:13, color:"#f472b6", fontWeight:300 },
  toggle:  { display:"flex", background:"#fce7f3", borderRadius:14, padding:4, marginBottom:24, gap:4 },
  toggleBtn:  { flex:1, padding:"10px 0", borderRadius:11, fontSize:14, fontWeight:500, fontFamily:"'DM Sans',sans-serif", transition:"all 0.2s" },
  activeBtn:  { background:"linear-gradient(135deg,#ec4899,#be185d)", color:"#fff", boxShadow:"0 4px 14px rgba(236,72,153,0.35)" },
  inactiveBtn:{ background:"transparent", color:"#f472b6" },
  form:      { display:"flex", flexDirection:"column", gap:14 },
  inputWrap: {
    display:"flex", alignItems:"center",
    background:"rgba(253,242,248,0.9)",
    borderRadius:14, border:"1.5px solid #fbcfe8",
    padding:"0 14px",
  },
  inputIcon: { fontSize:16, marginRight:10, userSelect:"none" },
  input: {
    flex:1, padding:"14px 0",
    background:"transparent", border:"none",
    fontSize:15, color:"#831843",
    fontFamily:"'DM Sans',sans-serif",
  },
  eyeBtn:    { fontSize:15, padding:"4px 0", marginLeft:6, opacity:0.7 },
  submitBtn: {
    marginTop:4, padding:15,
    background:"linear-gradient(135deg,#ec4899,#be185d)",
    color:"#fff", borderRadius:14,
    fontSize:15, fontWeight:600,
    fontFamily:"'DM Sans',sans-serif",
    boxShadow:"0 6px 24px rgba(236,72,153,0.4)",
    display:"flex", alignItems:"center", justifyContent:"center",
    minHeight:52, cursor:"pointer",
    transition:"opacity 0.2s",
  },
  spinner:   { width:20, height:20, border:"2.5px solid rgba(255,255,255,0.4)", borderTop:"2.5px solid #fff", borderRadius:"50%", animation:"spin 0.7s linear infinite", display:"inline-block" },
  switchText:{ textAlign:"center", marginTop:20, fontSize:13, color:"#f472b6" },
  switchLink:{ color:"#be185d", fontWeight:600, cursor:"pointer", textDecoration:"underline" },
  back:      { textAlign:"center", marginTop:14, fontSize:13, color:"#f472b6", cursor:"pointer" },
};