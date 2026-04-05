import { useState, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { auth, db } from "../firebase";
import {
  collection, addDoc, query, orderBy,
  onSnapshot, serverTimestamp, doc, getDoc,
  where, getDocs,
} from "firebase/firestore";

export default function ChatPage() {
  const { phone }    = useParams();
  const navigate     = useNavigate();
  const [messages,   setMessages]   = useState([]);
  const [text,       setText]       = useState("");
  const [otherUser,  setOtherUser]  = useState(null);
  const [myPhone,    setMyPhone]    = useState("");
  const [loading,    setLoading]    = useState(true);
  const [notFound,   setNotFound]   = useState(false);
  const bottomRef    = useRef(null);

  const me    = auth.currentUser;
  // Chat room ID = both phones sorted and joined
  const chatId = [myPhone, phone].sort().join("_");

  // ── Load my phone + other user's info ──────────────────────────
  useEffect(() => {
    const loadUsers = async () => {
      if (!me) return;

      // Get my phone from Firestore
      const myDoc = await getDoc(doc(db, "users", me.uid));
      if (myDoc.exists()) {
        setMyPhone(myDoc.data().phone || "");
      }

      // Find other user by phone
      const q    = query(collection(db, "users"), where("phone", "==", phone));
      const snap = await getDocs(q);
      if (snap.empty) {
        setNotFound(true);
      } else {
        setOtherUser(snap.docs[0].data());
      }
      setLoading(false);
    };
    loadUsers();
  }, [me, phone]);

  // ── Listen to messages in real time ───────────────────────────
  useEffect(() => {
    if (!myPhone || !chatId.includes("_")) return;

    const q    = query(
      collection(db, "chats", chatId, "messages"),
      orderBy("createdAt", "asc")
    );
    const unsub = onSnapshot(q, (snap) => {
      setMessages(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });
    return () => unsub();
  }, [myPhone, chatId]);

  // ── Auto scroll to bottom ──────────────────────────────────────
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // ── Send message ───────────────────────────────────────────────
  const handleSend = async () => {
    const trimmed = text.trim();
    if (!trimmed || !myPhone) return;

    setText("");
    await addDoc(collection(db, "chats", chatId, "messages"), {
      text:      trimmed,
      senderPhone: myPhone,
      senderName:  me?.displayName || "You",
      createdAt:   serverTimestamp(),
    });
  };

  // ── Loading state ──────────────────────────────────────────────
  if (loading) return (
    <div style={S.center}>
      <style>{`@keyframes spin { to{transform:rotate(360deg);} }`}</style>
      <div style={S.spinner} />
    </div>
  );

  // ── User not found ─────────────────────────────────────────────
  if (notFound) return (
    <div style={S.center}>
      <p style={{ fontSize: 40, marginBottom: 12 }}>🔍</p>
      <p style={{ fontWeight: 700, color: "#be185d", marginBottom: 8 }}>No user found</p>
      <p style={{ fontSize: 13, color: "#f472b6", marginBottom: 20 }}>
        No Blush account with +91 {phone}
      </p>
      <button style={S.backBtnCenter} onClick={() => navigate("/dashboard")}>
        ← Go Back
      </button>
    </div>
  );

  return (
    <div style={S.root}>
      <style>{CSS}</style>

      {/* Topbar */}
      <div style={S.topbar}>
        <button style={S.backBtn} onClick={() => navigate("/dashboard")}>←</button>
        <div style={S.topInfo}>
          <div style={S.avatar}>🌸</div>
          <div>
            <p style={S.nameTxt}>{otherUser?.name || "+91 " + phone}</p>
            <p style={S.statusTxt}>+91 {phone}</p>
          </div>
        </div>
      </div>

      {/* Messages */}
      <div style={S.messages}>
        {messages.length === 0 && (
          <p style={S.emptyMsg}>Say hello 👋</p>
        )}
        {messages.map(msg => {
          const isMine = msg.senderPhone === myPhone;
          return (
            <div key={msg.id} style={{ ...S.msgRow, justifyContent: isMine ? "flex-end" : "flex-start" }}>
              <div style={{
                ...S.bubble,
                background:   isMine ? "linear-gradient(135deg,#ec4899,#be185d)" : "#fff",
                color:        isMine ? "#fff" : "#1a0a12",
                borderRadius: isMine ? "18px 18px 4px 18px" : "18px 18px 18px 4px",
                boxShadow:    isMine ? "0 4px 12px rgba(236,72,153,0.3)" : "0 2px 8px rgba(0,0,0,0.08)",
              }}>
                <p style={S.bubbleText}>{msg.text}</p>
                <p style={{ ...S.bubbleTime, color: isMine ? "rgba(255,255,255,0.7)" : "#aaa" }}>
                  {msg.createdAt?.toDate
                    ? msg.createdAt.toDate().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
                    : ""}
                </p>
              </div>
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>

      {/* Input bar */}
      <div style={S.inputBar}>
        <input
          style={S.input}
          placeholder="Type a message..."
          value={text}
          onChange={e => setText(e.target.value)}
          onKeyDown={e => e.key === "Enter" && handleSend()}
        />
        <button style={S.sendBtn} onClick={handleSend}>➤</button>
      </div>
    </div>
  );
}

const CSS = `
  @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600&display=swap');
  * { box-sizing: border-box; margin: 0; padding: 0; }
  input:focus { outline: none; }
  @keyframes spin { to{transform:rotate(360deg);} }
`;

const S = {
  root: {
    height:"100vh", display:"flex", flexDirection:"column",
    background:"#fff0f5", fontFamily:"'DM Sans',sans-serif",
  },
  topbar: {
    display:"flex", alignItems:"center", gap:12,
    background:"#ec4899", padding:"14px 16px",
    position:"sticky", top:0, zIndex:100,
    flexShrink:0,
  },
  backBtn: {
    background:"rgba(255,255,255,0.2)", border:"none",
    borderRadius:10, padding:"6px 12px",
    color:"#fff", fontSize:18, cursor:"pointer", flexShrink:0,
  },
  topInfo:   { display:"flex", alignItems:"center", gap:10 },
  avatar:    { width:38, height:38, background:"rgba(255,255,255,0.25)", borderRadius:"50%", display:"flex", alignItems:"center", justifyContent:"center", fontSize:18, flexShrink:0 },
  nameTxt:   { fontSize:15, fontWeight:600, color:"#fff" },
  statusTxt: { fontSize:11, color:"rgba(255,255,255,0.75)" },

  messages: {
    flex:1, overflowY:"auto", padding:"16px",
    display:"flex", flexDirection:"column", gap:8,
  },
  emptyMsg: { textAlign:"center", color:"#f472b6", fontSize:14, marginTop:"auto", marginBottom:"auto", alignSelf:"center" },

  msgRow:   { display:"flex", width:"100%" },
  bubble:   { maxWidth:"72%", padding:"10px 14px", wordBreak:"break-word" },
  bubbleText:{ fontSize:14, lineHeight:1.5 },
  bubbleTime:{ fontSize:10, marginTop:4, textAlign:"right" },

  inputBar: {
    display:"flex", alignItems:"center", gap:10,
    padding:"12px 16px",
    background:"#fff",
    borderTop:"1px solid #fce7f3",
    flexShrink:0,
  },
  input: {
    flex:1, padding:"12px 16px",
    background:"#fce7f3", border:"1.5px solid #fbcfe8",
    borderRadius:24, fontSize:14, color:"#831843",
    fontFamily:"'DM Sans',sans-serif",
  },
  sendBtn: {
    width:44, height:44, borderRadius:"50%",
    background:"linear-gradient(135deg,#ec4899,#be185d)",
    color:"#fff", border:"none", fontSize:16,
    cursor:"pointer", flexShrink:0,
    display:"flex", alignItems:"center", justifyContent:"center",
  },

  center: {
    minHeight:"100vh", display:"flex", flexDirection:"column",
    alignItems:"center", justifyContent:"center",
    background:"#fff0f5", fontFamily:"'DM Sans',sans-serif",
    padding:20, textAlign:"center",
  },
  spinner: {
    width:36, height:36,
    border:"3px solid #fbcfe8", borderTop:"3px solid #ec4899",
    borderRadius:"50%", animation:"spin 0.8s linear infinite",
  },
  backBtnCenter: {
    padding:"12px 24px",
    background:"linear-gradient(135deg,#ec4899,#be185d)",
    color:"#fff", border:"none", borderRadius:12,
    fontSize:14, fontWeight:600, cursor:"pointer",
    fontFamily:"'DM Sans',sans-serif",
  },
};