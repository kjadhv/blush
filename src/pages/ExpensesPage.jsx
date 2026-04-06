import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { db, auth } from "../firebase";
import {
  collection, addDoc, getDocs, query, where,
  deleteDoc, doc, serverTimestamp, updateDoc,
  arrayUnion
} from "firebase/firestore";

// ─── Preset categories with emoji + color ─────────────────────────────────────
const PRESET_CATEGORIES = [
  { id: "trips",    label: "Trips",     emoji: "✈️",  color: "#6366f1" },
  { id: "shopping", label: "Shopping",  emoji: "🛍️", color: "#ec4899" },
  { id: "movies",   label: "Movies",    emoji: "🎬",  color: "#f59e0b" },
  { id: "health",   label: "Health",    emoji: "💊",  color: "#10b981" },
  { id: "sips",     label: "Sips",      emoji: "☕",  color: "#8b5cf6" },
  { id: "food",     label: "Food",      emoji: "🍜",  color: "#ef4444" },
  { id: "gifts",    label: "Gifts",     emoji: "🎁",  color: "#f97316" },
  { id: "rent",     label: "Rent",      emoji: "🏠",  color: "#0ea5e9" },
  { id: "fuel",     label: "Fuel",      emoji: "⛽",  color: "#84cc16" },
  { id: "fun",      label: "Fun",       emoji: "🎉",  color: "#e879f9" },
];

export default function ExpensesPage() {
  const navigate  = useNavigate();
  const user      = auth.currentUser;

  const [groups,      setGroups]      = useState([]);   // shared expense groups
  const [loading,     setLoading]     = useState(true);
  const [showCreate,  setShowCreate]  = useState(false);
  const [activeGroup, setActiveGroup] = useState(null); // group detail view

  // ── Fetch groups where user is a member ───────────────────────
  useEffect(() => {
    if (!user) return;
    (async () => {
      try {
        const q    = query(collection(db, "expenseGroups"), where("members", "array-contains", user.email));
        const snap = await getDocs(q);
        setGroups(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      } catch (e) { console.error(e); }
      finally { setLoading(false); }
    })();
  }, [user]);

  const handleGroupCreated = (group) => {
    setGroups(prev => [group, ...prev]);
    setShowCreate(false);
    setActiveGroup(group);
  };

  const handleDeleteGroup = async (groupId) => {
    if (!window.confirm("Delete this expense group?")) return;
    await deleteDoc(doc(db, "expenseGroups", groupId));
    setGroups(prev => prev.filter(g => g.id !== groupId));
    setActiveGroup(null);
  };

  // ── Group detail view ─────────────────────────────────────────
  if (activeGroup) {
    return (
      <GroupDetail
        group={activeGroup}
        user={user}
        onBack={() => setActiveGroup(null)}
        onDelete={() => handleDeleteGroup(activeGroup.id)}
        onUpdate={(updated) => {
          setGroups(prev => prev.map(g => g.id === updated.id ? updated : g));
          setActiveGroup(updated);
        }}
      />
    );
  }

  return (
    <div style={S.root}>
      <style>{CSS}</style>

      {/* ── Header ── */}
      <div style={S.header}>
        <button style={S.backBtn} onClick={() => navigate(-1)}>←</button>
        <div style={{ flex: 1 }}>
          <h1 style={S.headerTitle}>Expenses 💰</h1>
          <p style={S.headerSub}>{groups.length} shared group{groups.length !== 1 ? "s" : ""}</p>
        </div>
        <button style={S.addBtn} onClick={() => setShowCreate(true)}>+ New</button>
      </div>

      {/* ── Groups list ── */}
      <div style={S.content}>
        {loading ? (
          <div style={S.centerBox}><div style={S.spinner} /></div>
        ) : groups.length === 0 ? (
          <div style={S.emptyWrap}>
            <div style={S.emptyOrb}>💸</div>
            <h2 style={S.emptyTitle}>No expense groups yet</h2>
            <p style={S.emptySub}>Create a group and invite your sister to start tracking together</p>
            <button style={S.createBtn} onClick={() => setShowCreate(true)}>
              + Create Group
            </button>
          </div>
        ) : (
          <>
            {groups.map((g, i) => (
              <GroupCard
                key={g.id}
                group={g}
                index={i}
                userEmail={user.email}
                onClick={() => setActiveGroup(g)}
              />
            ))}
          </>
        )}
      </div>

      {/* ── Create Group Sheet ── */}
      {showCreate && (
        <CreateGroupSheet
          user={user}
          onClose={() => setShowCreate(false)}
          onCreated={handleGroupCreated}
        />
      )}
    </div>
  );
}

// ─── Group Card ───────────────────────────────────────────────────────────────
function GroupCard({ group: g, index, userEmail, onClick }) {
  const totalSpent = (g.expenses || []).reduce((sum, e) => sum + Number(e.amount), 0);
  const otherMember = g.members?.find(m => m !== userEmail) || "Unknown";

  return (
    <div style={{ ...S.groupCard, animationDelay: `${index * 0.07}s` }} className="group-card" onClick={onClick}>
      <div style={S.groupCardTop}>
        <div style={S.groupIcon}>{g.emoji || "💰"}</div>
        <div style={{ flex: 1 }}>
          <p style={S.groupName}>{g.name}</p>
          <p style={S.groupWith}>with {otherMember.split("@")[0]}</p>
        </div>
        <div style={S.groupTotal}>
          <p style={S.groupTotalAmt}>₹{totalSpent.toLocaleString()}</p>
          <p style={S.groupTotalLbl}>total</p>
        </div>
      </div>

      {/* Category pills preview */}
      <div style={S.groupCats}>
        {[...new Set((g.expenses || []).map(e => e.category))].slice(0, 4).map(cat => {
          const preset = PRESET_CATEGORIES.find(p => p.id === cat);
          return preset ? (
            <span key={cat} style={{ ...S.catPillSmall, background: preset.color + "22", color: preset.color }}>
              {preset.emoji} {preset.label}
            </span>
          ) : null;
        })}
        {(g.expenses || []).length === 0 && (
          <span style={S.noExpYet}>No expenses yet — tap to add</span>
        )}
      </div>

      <span style={S.groupArrow}>›</span>
    </div>
  );
}

// ─── Group Detail ─────────────────────────────────────────────────────────────
function GroupDetail({ group, user, onBack, onDelete, onUpdate }) {
  const [showAdd,    setShowAdd]    = useState(false);
  const [filterCat,  setFilterCat]  = useState("all");
  const [expenses,   setExpenses]   = useState(group.expenses || []);

  const totalSpent = expenses.reduce((sum, e) => sum + Number(e.amount), 0);
  const myTotal    = expenses.filter(e => e.paidBy === user.email).reduce((sum, e) => sum + Number(e.amount), 0);
  const herTotal   = totalSpent - myTotal;

  const usedCats = [...new Set(expenses.map(e => e.category))];
  const filtered = filterCat === "all" ? expenses : expenses.filter(e => e.category === filterCat);

  // Sort newest first
  const sorted = [...filtered].sort((a, b) => {
    const aTime = a.createdAt?.seconds || 0;
    const bTime = b.createdAt?.seconds || 0;
    return bTime - aTime;
  });

  const handleAddExpense = async (expense) => {
    try {
      const groupRef  = doc(db, "expenseGroups", group.id);
      const newExp    = {
        ...expense,
        id:       `exp_${Date.now()}`,
        paidBy:   user.email,
        paidByName: user.displayName || user.email.split("@")[0],
        createdAt: { seconds: Math.floor(Date.now() / 1000) },
      };
      await updateDoc(groupRef, { expenses: arrayUnion(newExp) });
      const updated = [...expenses, newExp];
      setExpenses(updated);
      onUpdate({ ...group, expenses: updated });
      setShowAdd(false);
    } catch (e) { console.error(e); alert("Failed to add expense"); }
  };

  const handleDeleteExpense = async (expId) => {
    if (!window.confirm("Delete this expense?")) return;
    const updated   = expenses.filter(e => e.id !== expId);
    const groupRef  = doc(db, "expenseGroups", group.id);
    await updateDoc(groupRef, { expenses: updated });
    setExpenses(updated);
    onUpdate({ ...group, expenses: updated });
  };

  return (
    <div style={S.root}>
      <style>{CSS}</style>

      {/* Header */}
      <div style={S.header}>
        <button style={S.backBtn} onClick={onBack}>←</button>
        <div style={{ flex: 1 }}>
          <h1 style={S.headerTitle}>{group.emoji} {group.name}</h1>
          <p style={S.headerSub}>
            with {group.members?.find(m => m !== user.email)?.split("@")[0] || "sister"}
          </p>
        </div>
        <button style={{ ...S.addBtn }} onClick={() => setShowAdd(true)}>+ Add</button>
      </div>

      {/* Summary cards */}
      <div style={S.summaryRow}>
        <div style={S.summaryCard}>
          <p style={S.summaryAmt}>₹{totalSpent.toLocaleString()}</p>
          <p style={S.summaryLbl}>Total Spent</p>
        </div>
        <div style={{ ...S.summaryCard, background: "#fdf2f8" }}>
          <p style={{ ...S.summaryAmt, color: "#ec4899" }}>₹{myTotal.toLocaleString()}</p>
          <p style={S.summaryLbl}>You paid</p>
        </div>
        <div style={{ ...S.summaryCard, background: "#f0fdf4" }}>
          <p style={{ ...S.summaryAmt, color: "#16a34a" }}>₹{herTotal.toLocaleString()}</p>
          <p style={S.summaryLbl}>She paid</p>
        </div>
      </div>

      {/* Category filter */}
      {usedCats.length > 0 && (
        <div style={S.filterScroll}>
          <button
            style={{ ...S.filterPill, ...(filterCat === "all" ? S.filterActive : {}) }}
            onClick={() => setFilterCat("all")}
          >
            All ({expenses.length})
          </button>
          {usedCats.map(cat => {
            const preset = PRESET_CATEGORIES.find(p => p.id === cat);
            if (!preset) return null;
            const count = expenses.filter(e => e.category === cat).length;
            return (
              <button key={cat}
                style={{
                  ...S.filterPill,
                  ...(filterCat === cat ? { background: preset.color, color: "#fff", borderColor: preset.color } : {}),
                }}
                onClick={() => setFilterCat(cat)}
              >
                {preset.emoji} {preset.label} ({count})
              </button>
            );
          })}
        </div>
      )}

      {/* Expense list */}
      <div style={S.expList}>
        {sorted.length === 0 ? (
          <div style={S.centerBox}>
            <div style={{ fontSize: 48 }}>🧾</div>
            <p style={S.emptyTitle}>No expenses yet</p>
            <p style={S.emptySub}>Tap "+ Add" to log your first one</p>
          </div>
        ) : (
          sorted.map((exp, i) => {
            const preset = PRESET_CATEGORIES.find(p => p.id === exp.category);
            const isMe   = exp.paidBy === user.email;
            return (
              <div key={exp.id} style={{ ...S.expCard, animationDelay: `${i * 0.04}s` }} className="exp-card">
                {/* Category icon */}
                <div style={{ ...S.expIcon, background: (preset?.color || "#ec4899") + "22" }}>
                  <span style={{ fontSize: 22 }}>{preset?.emoji || "💸"}</span>
                </div>

                {/* Info */}
                <div style={S.expBody}>
                  <p style={S.expName}>{exp.note || preset?.label || "Expense"}</p>
                  <div style={S.expMeta}>
                    <span style={{ ...S.expCatTag, background: (preset?.color || "#ec4899") + "18", color: preset?.color || "#ec4899" }}>
                      {preset?.label || exp.category}
                    </span>
                    <span style={S.expWho}>
                      {isMe ? "you" : exp.paidByName || "her"} paid
                    </span>
                  </div>
                </div>

                {/* Amount + delete */}
                <div style={S.expRight}>
                  <p style={{ ...S.expAmt, color: isMe ? "#ec4899" : "#16a34a" }}>
                    ₹{Number(exp.amount).toLocaleString()}
                  </p>
                  {isMe && (
                    <button style={S.expDelete}
                      onClick={() => handleDeleteExpense(exp.id)}>
                      🗑
                    </button>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Add expense sheet */}
      {showAdd && (
        <AddExpenseSheet
          onClose={() => setShowAdd(false)}
          onAdd={handleAddExpense}
        />
      )}

      {/* Danger zone */}
      <div style={{ padding: "0 16px 40px" }}>
        <button style={S.dangerBtn} onClick={onDelete}>🗑 Delete Group</button>
      </div>
    </div>
  );
}

// ─── Create Group Sheet ───────────────────────────────────────────────────────
function CreateGroupSheet({ user, onClose, onCreated }) {
  const [name,    setName]    = useState("");
  const [email,   setEmail]   = useState("");
  const [emoji,   setEmoji]   = useState("💰");
  const [saving,  setSaving]  = useState(false);
  const [err,     setErr]     = useState("");

  const GROUP_EMOJIS = ["💰","✈️","🛍️","🎉","🏖️","🎬","☕","🍜","🎁","💊"];

  const handleCreate = async () => {
    if (!name.trim())  { setErr("Give your group a name"); return; }
    if (!email.trim()) { setErr("Enter your sister's email"); return; }
    if (email.toLowerCase() === user.email.toLowerCase()) { setErr("Can't invite yourself!"); return; }

    setSaving(true);
    setErr("");
    try {
      const data = {
        name:      name.trim(),
        emoji,
        members:   [user.email, email.toLowerCase().trim()],
        createdBy: user.email,
        expenses:  [],
        createdAt: serverTimestamp(),
      };
      const ref  = await addDoc(collection(db, "expenseGroups"), data);
      onCreated({ id: ref.id, ...data, createdAt: new Date() });
    } catch (e) {
      console.error(e);
      setErr("Failed to create. Try again.");
    }
    setSaving(false);
  };

  return (
    <div style={S.sheetOverlay} onClick={onClose}>
      <div style={S.sheet} onClick={e => e.stopPropagation()}>
        <div style={S.sheetHandle} />
        <div style={S.sheetScroll}>
          <div style={S.sheetHeader}>
            <h2 style={S.sheetTitle}>New Group</h2>
            <button style={S.sheetClose} onClick={onClose}>✕</button>
          </div>

          {/* Emoji picker */}
          <label style={S.label}>Pick an icon</label>
          <div style={S.emojiRow}>
            {GROUP_EMOJIS.map(e => (
              <button key={e}
                style={{ ...S.emojiBtn, ...(emoji === e ? S.emojiBtnActive : {}) }}
                onClick={() => setEmoji(e)}>
                {e}
              </button>
            ))}
          </div>

          {/* Name */}
          <label style={S.label}>Group Name *</label>
          <input style={S.input} placeholder="e.g. Goa Trip 🌊, Monthly Sips"
            value={name} onChange={e => setName(e.target.value)} />

          {/* Sister's email */}
          <label style={S.label}>Sister's Email *</label>
          <input style={S.input} type="email" placeholder="her@email.com"
            value={email} onChange={e => setEmail(e.target.value)} />
          <p style={S.inputHint}>She must already have an account on this app</p>

          {err && <p style={S.errTxt}>{err}</p>}

          <button style={{ ...S.saveBtn, opacity: saving ? 0.6 : 1 }}
            onClick={handleCreate} disabled={saving}>
            {saving ? "Creating..." : "Create Group 💰"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Add Expense Sheet ────────────────────────────────────────────────────────
function AddExpenseSheet({ onClose, onAdd }) {
  const [amount,   setAmount]   = useState("");
  const [note,     setNote]     = useState("");
  const [category, setCategory] = useState(null);
  const [custom,   setCustom]   = useState("");
  const [saving,   setSaving]   = useState(false);

  const handleSave = () => {
    if (!amount || isNaN(amount)) { alert("Enter a valid amount"); return; }
    if (!category)                { alert("Pick a category"); return; }
    setSaving(true);
    onAdd({
      amount:   parseFloat(amount),
      note:     note.trim(),
      category: category === "__custom__" ? custom.trim() || "Other" : category,
    });
  };

  return (
    <div style={S.sheetOverlay} onClick={onClose}>
      <div style={S.sheet} onClick={e => e.stopPropagation()}>
        <div style={S.sheetHandle} />
        <div style={S.sheetScroll}>
          <div style={S.sheetHeader}>
            <h2 style={S.sheetTitle}>Add Expense</h2>
            <button style={S.sheetClose} onClick={onClose}>✕</button>
          </div>

          {/* Amount — big input */}
          <div style={S.amountWrap}>
            <span style={S.rupeeSign}>₹</span>
            <input
              style={S.amountInput}
              type="number"
              placeholder="0"
              value={amount}
              onChange={e => setAmount(e.target.value)}
              autoFocus
            />
          </div>

          {/* Note */}
          <label style={S.label}>Note (optional)</label>
          <input style={S.input} placeholder="e.g. Chai at Starbucks"
            value={note} onChange={e => setNote(e.target.value)} />

          {/* Category grid */}
          <label style={S.label}>Category *</label>
          <div style={S.catGrid}>
            {PRESET_CATEGORIES.map(cat => (
              <button key={cat.id}
                style={{
                  ...S.catGridBtn,
                  background:   category === cat.id ? cat.color : cat.color + "15",
                  color:        category === cat.id ? "#fff"    : cat.color,
                  border:       `1.5px solid ${category === cat.id ? cat.color : cat.color + "44"}`,
                }}
                onClick={() => setCategory(cat.id)}
              >
                <span style={{ fontSize: 20 }}>{cat.emoji}</span>
                <span style={{ fontSize: 11, fontWeight: 600 }}>{cat.label}</span>
              </button>
            ))}

            {/* Custom */}
            <button
              style={{
                ...S.catGridBtn,
                background: category === "__custom__" ? "#6366f1" : "#6366f115",
                color:      category === "__custom__" ? "#fff"    : "#6366f1",
                border:     `1.5px solid ${category === "__custom__" ? "#6366f1" : "#6366f144"}`,
              }}
              onClick={() => setCategory("__custom__")}
            >
              <span style={{ fontSize: 20 }}>✏️</span>
              <span style={{ fontSize: 11, fontWeight: 600 }}>Custom</span>
            </button>
          </div>

          {category === "__custom__" && (
            <input style={{ ...S.input, marginTop: 10 }}
              placeholder="Type your category"
              value={custom}
              onChange={e => setCustom(e.target.value)}
            />
          )}

          <button style={{ ...S.saveBtn, opacity: saving ? 0.6 : 1 }}
            onClick={handleSave} disabled={saving}>
            {saving ? "Adding..." : "Add Expense 💸"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── CSS ──────────────────────────────────────────────────────────────────────
const CSS = `
  @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@500;700&family=DM+Sans:wght@300;400;500;600&display=swap');
  * { box-sizing:border-box; margin:0; padding:0; }
  @keyframes fadeUp  { from{opacity:0;transform:translateY(14px);} to{opacity:1;transform:translateY(0);} }
  @keyframes spin    { to{transform:rotate(360deg);} }
  @keyframes slideUp { from{transform:translateY(100%);} to{transform:translateY(0);} }
  input:focus, textarea:focus { outline:none; }
  input[type=number]::-webkit-inner-spin-button { -webkit-appearance:none; }
  button { font-family:'DM Sans',sans-serif; }
  .group-card { transition:transform 0.18s,box-shadow 0.18s; animation:fadeUp 0.4s ease both; }
  .group-card:hover { transform:translateY(-2px); box-shadow:0 8px 28px rgba(236,72,153,0.13)!important; }
  .exp-card { animation:fadeUp 0.35s ease both; }
`;

// ─── Styles ───────────────────────────────────────────────────────────────────
const S = {
  root:    { minHeight:"100vh", background:"#fff8fb", fontFamily:"'DM Sans',sans-serif", paddingBottom:40 },
  header:  { display:"flex", alignItems:"center", gap:12, padding:"16px 16px 12px", background:"#fff", borderBottom:"1px solid #fce7f3", position:"sticky", top:0, zIndex:50 },
  backBtn: { background:"#fce7f3", border:"none", borderRadius:10, width:36, height:36, fontSize:18, cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center", color:"#be185d", flexShrink:0 },
  headerTitle: { fontFamily:"'Playfair Display',serif", fontSize:20, color:"#be185d", marginBottom:1 },
  headerSub:   { fontSize:12, color:"#f9a8d4" },
  addBtn:  { background:"linear-gradient(135deg,#ec4899,#be185d)", color:"#fff", border:"none", borderRadius:12, padding:"8px 16px", fontSize:13, fontWeight:600, cursor:"pointer", flexShrink:0 },
  content: { padding:"16px" },

  // Empty
  emptyWrap:  { display:"flex", flexDirection:"column", alignItems:"center", padding:"60px 24px", gap:12, textAlign:"center" },
  emptyOrb:   { fontSize:56, marginBottom:8 },
  emptyTitle: { fontFamily:"'Playfair Display',serif", fontSize:20, color:"#be185d" },
  emptySub:   { fontSize:13, color:"#f9a8d4", maxWidth:260, lineHeight:1.6 },
  createBtn:  { marginTop:8, padding:"12px 28px", background:"linear-gradient(135deg,#ec4899,#be185d)", color:"#fff", border:"none", borderRadius:12, fontSize:14, fontWeight:600, cursor:"pointer" },

  // Group card
  groupCard:     { background:"#fff", borderRadius:18, padding:16, marginBottom:12, boxShadow:"0 2px 16px rgba(236,72,153,0.08)", cursor:"pointer", position:"relative" },
  groupCardTop:  { display:"flex", alignItems:"center", gap:12, marginBottom:10 },
  groupIcon:     { width:44, height:44, borderRadius:12, background:"#fce7f3", display:"flex", alignItems:"center", justifyContent:"center", fontSize:22, flexShrink:0 },
  groupName:     { fontFamily:"'Playfair Display',serif", fontSize:16, color:"#1a0a12", marginBottom:2 },
  groupWith:     { fontSize:12, color:"#f9a8d4" },
  groupTotal:    { textAlign:"right" },
  groupTotalAmt: { fontFamily:"'Playfair Display',serif", fontSize:18, color:"#be185d", fontWeight:700 },
  groupTotalLbl: { fontSize:11, color:"#f9a8d4" },
  groupCats:     { display:"flex", gap:6, flexWrap:"wrap" },
  catPillSmall:  { fontSize:11, fontWeight:600, borderRadius:999, padding:"3px 10px" },
  noExpYet:      { fontSize:11, color:"#f9a8d4", fontStyle:"italic" },
  groupArrow:    { position:"absolute", right:16, top:"50%", transform:"translateY(-50%)", color:"#ec4899", fontSize:20 },

  // Summary
  summaryRow:  { display:"flex", gap:10, padding:"14px 16px" },
  summaryCard: { flex:1, background:"#fff", borderRadius:14, padding:"12px 10px", textAlign:"center", boxShadow:"0 2px 10px rgba(236,72,153,0.07)" },
  summaryAmt:  { fontFamily:"'Playfair Display',serif", fontSize:17, color:"#be185d", fontWeight:700, marginBottom:3 },
  summaryLbl:  { fontSize:10, color:"#f9a8d4", textTransform:"uppercase", letterSpacing:"0.5px" },

  // Filter scroll
  filterScroll: { display:"flex", gap:8, padding:"0 16px 12px", overflowX:"auto" },
  filterPill:   { padding:"6px 14px", borderRadius:999, border:"1.5px solid #fce7f3", background:"#fff", color:"#be185d", fontSize:12, fontWeight:500, cursor:"pointer", whiteSpace:"nowrap", flexShrink:0, transition:"all 0.2s" },
  filterActive: { background:"linear-gradient(135deg,#ec4899,#be185d)", color:"#fff", border:"1.5px solid transparent" },

  // Expense list
  expList:   { padding:"0 16px" },
  expCard:   { display:"flex", alignItems:"center", gap:12, background:"#fff", borderRadius:14, padding:"12px 14px", marginBottom:10, boxShadow:"0 2px 10px rgba(236,72,153,0.06)" },
  expIcon:   { width:44, height:44, borderRadius:12, display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 },
  expBody:   { flex:1, minWidth:0 },
  expName:   { fontSize:14, fontWeight:600, color:"#1a0a12", marginBottom:4 },
  expMeta:   { display:"flex", gap:8, alignItems:"center" },
  expCatTag: { fontSize:11, fontWeight:600, borderRadius:6, padding:"2px 8px" },
  expWho:    { fontSize:11, color:"#f9a8d4" },
  expRight:  { display:"flex", flexDirection:"column", alignItems:"flex-end", gap:4, flexShrink:0 },
  expAmt:    { fontFamily:"'Playfair Display',serif", fontSize:16, fontWeight:700 },
  expDelete: { background:"rgba(239,68,68,0.08)", border:"none", borderRadius:7, width:28, height:28, fontSize:12, cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center" },

  // Danger
  dangerBtn: { width:"100%", padding:12, background:"rgba(239,68,68,0.07)", border:"1px solid rgba(239,68,68,0.2)", borderRadius:12, color:"#ef4444", fontSize:13, fontWeight:600, cursor:"pointer", marginTop:8 },

  // Sheet
  sheetOverlay: { position:"fixed", inset:0, background:"rgba(0,0,0,0.45)", zIndex:200, display:"flex", alignItems:"flex-end" },
  sheet:        { background:"#fff", borderRadius:"24px 24px 0 0", width:"100%", maxHeight:"92vh", animation:"slideUp 0.35s cubic-bezier(.22,1,.36,1) both", display:"flex", flexDirection:"column" },
  sheetHandle:  { width:40, height:4, background:"#fce7f3", borderRadius:99, margin:"12px auto 0" },
  sheetScroll:  { overflowY:"auto", padding:"0 20px 40px", flex:1 },
  sheetHeader:  { display:"flex", alignItems:"center", justifyContent:"space-between", padding:"16px 0 14px" },
  sheetTitle:   { fontFamily:"'Playfair Display',serif", fontSize:22, color:"#be185d" },
  sheetClose:   { background:"#fce7f3", border:"none", borderRadius:10, width:32, height:32, fontSize:16, cursor:"pointer", color:"#be185d", display:"flex", alignItems:"center", justifyContent:"center" },

  // Form
  label:     { display:"block", fontSize:12, fontWeight:600, color:"#be185d", marginBottom:6, letterSpacing:"0.5px", textTransform:"uppercase" },
  input:     { width:"100%", padding:"12px 14px", background:"#fff8fb", border:"1.5px solid #fce7f3", borderRadius:12, fontSize:14, color:"#1a0a12", fontFamily:"'DM Sans',sans-serif", marginBottom:14 },
  inputHint: { fontSize:11, color:"#f9a8d4", marginTop:-10, marginBottom:14 },
  errTxt:    { fontSize:12, color:"#ef4444", background:"#fef2f2", border:"1px solid #fecaca", borderRadius:8, padding:"8px 12px", marginBottom:12 },
  saveBtn:   { width:"100%", padding:16, background:"linear-gradient(135deg,#ec4899,#be185d)", color:"#fff", border:"none", borderRadius:14, fontSize:15, fontWeight:600, cursor:"pointer", marginTop:16, boxShadow:"0 6px 20px rgba(236,72,153,0.3)" },

  // Emoji picker
  emojiRow:     { display:"flex", gap:8, flexWrap:"wrap", marginBottom:16 },
  emojiBtn:     { width:42, height:42, borderRadius:10, border:"1.5px solid #fce7f3", background:"#fff8fb", fontSize:20, cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center" },
  emojiBtnActive:{ border:"2px solid #ec4899", background:"#fdf2f8" },

  // Amount input
  amountWrap:  { display:"flex", alignItems:"center", background:"#fff8fb", border:"1.5px solid #fce7f3", borderRadius:16, padding:"0 20px", marginBottom:20 },
  rupeeSign:   { fontSize:28, color:"#ec4899", fontFamily:"'Playfair Display',serif", marginRight:6 },
  amountInput: { flex:1, padding:"18px 0", background:"transparent", border:"none", fontSize:36, color:"#1a0a12", fontFamily:"'Playfair Display',serif", fontWeight:700 },

  // Category grid
  catGrid:    { display:"grid", gridTemplateColumns:"repeat(4, 1fr)", gap:8, marginBottom:6 },
  catGridBtn: { borderRadius:12, padding:"10px 4px", display:"flex", flexDirection:"column", alignItems:"center", gap:4, cursor:"pointer", transition:"all 0.18s" },

  // Misc
  centerBox:  { display:"flex", flexDirection:"column", alignItems:"center", padding:"60px 20px", gap:10, textAlign:"center" },
  spinner:    { width:30, height:30, border:"3px solid #fce7f3", borderTop:"3px solid #ec4899", borderRadius:"50%", animation:"spin 0.8s linear infinite" },
};