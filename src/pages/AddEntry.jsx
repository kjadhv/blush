import { useState } from "react";
import { useNavigate } from "react-router-dom";

// Indian phone number validation
// Valid: 10 digits, starts with 6,7,8,9
// Also accepts +91 or 91 prefix
const isValidIndianPhone = (val) => {
  const cleaned = val.replace(/\s+/g, "").replace(/^(\+91|91)/, "");
  return /^[6-9]\d{9}$/.test(cleaned);
};

export default function AddEntry({ onAddText, onClose }) {
  const navigate  = useNavigate();
  const [value,   setValue]   = useState("");
  const [error,   setError]   = useState("");
  const [loading, setLoading] = useState(false);

  const isNumber = (val) => /^\d+$/.test(val.trim().replace(/^\+91|^91/, "").replace(/\s/g, ""));

  const handleSubmit = () => {
    const trimmed = value.trim();
    if (!trimmed) { setError("Please enter something."); return; }

    if (isNumber(trimmed)) {
      // ── Phone number path ──────────────────────────────────
      if (!isValidIndianPhone(trimmed)) {
        setError("Invalid Indian number. Must be 10 digits starting with 6–9.");
        return;
      }
      // Clean to pure 10 digits
      const clean = trimmed.replace(/^(\+91|91)/, "").replace(/\s/g, "");
      setLoading(true);
      setTimeout(() => {
        onClose();
        navigate(`/chat/${clean}`);
      }, 300);

    } else {
      // ── Text path ──────────────────────────────────────────
      onAddText(trimmed);
      onClose();
    }
  };

  return (
    <>
      <style>{CSS}</style>

      {/* Backdrop */}
      <div style={S.backdrop} onClick={onClose} />

      {/* Bottom sheet */}
      <div style={S.sheet}>
        <div style={S.handle} />

        <p style={S.sheetTitle}>Add new</p>
        <p style={S.sheetSub}>Enter a category you want to add</p>

        <div style={S.inputWrap}>
          <input
            style={S.input}
            placeholder="Type here..."
            value={value}
            onChange={e => { setValue(e.target.value); setError(""); }}
            onKeyDown={e => e.key === "Enter" && handleSubmit()}
            autoFocus
          />
        </div>

        {error && <p style={S.error}>⚠️ {error}</p>}

        {/* Hint */}
        {value.trim() && (
          <p style={S.hint}>
            {isNumber(value.trim())
              ? "📱 Looks like a phone number — will open chat"
              : "📝 Looks like text — will add a new section"
            }
          </p>
        )}

        <div style={S.btnRow}>
          <button style={S.cancelBtn} onClick={onClose}>Cancel</button>
          <button style={S.submitBtn} onClick={handleSubmit} disabled={loading}>
            {loading ? "..." : "Continue →"}
          </button>
        </div>
      </div>
    </>
  );
}

const CSS = `
  @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600&display=swap');
  @keyframes slideUp { from{transform:translateY(100%);} to{transform:translateY(0);} }
  input:focus { outline: none; }
`;

const S = {
  backdrop: {
    position:"fixed", inset:0,
    background:"rgba(0,0,0,0.4)",
    zIndex:300,
  },
  sheet: {
    position:"fixed", bottom:0, left:0, right:0,
    background:"#fff",
    borderRadius:"24px 24px 0 0",
    padding:"16px 24px 40px",
    zIndex:400,
    animation:"slideUp 0.3s cubic-bezier(.22,1,.36,1)",
    maxWidth:480,
    margin:"0 auto",
    fontFamily:"'DM Sans',sans-serif",
  },
  handle: {
    width:40, height:4, borderRadius:99,
    background:"#f9a8d4",
    margin:"0 auto 20px",
  },
  sheetTitle: { fontSize:20, fontWeight:700, color:"#be185d", marginBottom:4 },
  sheetSub:   { fontSize:13, color:"#f472b6", marginBottom:20 },
  inputWrap: {
    background:"#fce7f3",
    borderRadius:14, border:"1.5px solid #fbcfe8",
    padding:"0 16px", marginBottom:8,
  },
  input: {
    width:"100%", padding:"14px 0",
    background:"transparent", border:"none",
    fontSize:16, color:"#831843",
    fontFamily:"'DM Sans',sans-serif",
  },
  error: { fontSize:13, color:"#be123c", marginBottom:8 },
  hint:  { fontSize:12, color:"#a21caf", marginBottom:16, padding:"8px 12px", background:"#fdf4ff", borderRadius:10 },
  btnRow:    { display:"flex", gap:12, marginTop:16 },
  cancelBtn: {
    flex:1, padding:"13px 0",
    background:"#fce7f3", color:"#be185d",
    border:"none", borderRadius:12,
    fontSize:15, fontWeight:600,
    fontFamily:"'DM Sans',sans-serif",
    cursor:"pointer",
  },
  submitBtn: {
    flex:2, padding:"13px 0",
    background:"linear-gradient(135deg,#ec4899,#be185d)",
    color:"#fff", border:"none", borderRadius:12,
    fontSize:15, fontWeight:600,
    fontFamily:"'DM Sans',sans-serif",
    cursor:"pointer",
    boxShadow:"0 4px 16px rgba(236,72,153,0.35)",
  },
};