import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { db, auth } from "../firebase";
import {
  collection, addDoc, getDocs, query,
  where, deleteDoc, doc, serverTimestamp, updateDoc
} from "firebase/firestore";

const CLOUD_NAME    = "dmmge8nir";
const UPLOAD_PRESET = "kalyani";

const PRESET_CATEGORIES = [
  { id: "fashion",  label: "Fashion",   emoji: "👗", color: "#ec4899" },
  { id: "tech",     label: "Tech",      emoji: "💻", color: "#6366f1" },
  { id: "books",    label: "Books",     emoji: "📚", color: "#f59e0b" },
  { id: "beauty",   label: "Beauty",    emoji: "💄", color: "#e879f9" },
  { id: "home",     label: "Home",      emoji: "🏠", color: "#10b981" },
  { id: "travel",   label: "Travel",    emoji: "✈️", color: "#0ea5e9" },
  { id: "food",     label: "Food",      emoji: "🍜", color: "#ef4444" },
  { id: "fitness",  label: "Fitness",   emoji: "🏋️", color: "#84cc16" },
  { id: "gifts",    label: "Gifts",     emoji: "🎁", color: "#f97316" },
  { id: "random",   label: "Random",    emoji: "✨", color: "#8b5cf6" },
];

const PRIORITIES = [
  { id: "need",  label: "Need it",       emoji: "🔥", color: "#ef4444" },
  { id: "want",  label: "Want it",       emoji: "⭐", color: "#f59e0b" },
  { id: "maybe", label: "Maybe someday", emoji: "💭", color: "#8b5cf6" },
];

// ─── Sister's email — stored in Firestore under user doc ─────────────────────
// You set it once in settings. For now, fetched from user's doc field "sharedWith"

export default function WishlistPage() {
  const navigate    = useNavigate();
  const user        = auth.currentUser;

  const [tab,        setTab]        = useState("mine");  // mine | hers
  const [myItems,    setMyItems]    = useState([]);
  const [herItems,   setHerItems]   = useState([]);
  const [herEmail,   setHerEmail]   = useState(null);
  const [loadingMe,  setLoadingMe]  = useState(true);
  const [loadingHer, setLoadingHer] = useState(true);
  const [filter,     setFilter]     = useState("all");   // all | priority | bought
  const [showAdd,    setShowAdd]    = useState(false);
  const [showSetup,  setShowSetup]  = useState(false);

  // ── Fetch sister's email from user doc ────────────────────────
  useEffect(() => {
    if (!user) return;
    (async () => {
      try {
        const snap = await getDocs(query(collection(db, "users"), where("email", "==", user.email)));
        if (!snap.empty) {
          const data = snap.docs[0].data();
          setHerEmail(data.wishlistSharedWith || null);
        }
      } catch (e) { console.error(e); }
    })();
  }, [user]);

  // ── Fetch MY wishlist ─────────────────────────────────────────
  useEffect(() => {
    if (!user) return;
    (async () => {
      try {
        const q    = query(collection(db, "wishlists"), where("uid", "==", user.uid));
        const snap = await getDocs(q);
        setMyItems(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      } catch (e) { console.error(e); }
      finally { setLoadingMe(false); }
    })();
  }, [user]);

  // ── Fetch HER wishlist (by her email) ─────────────────────────
  useEffect(() => {
    if (!herEmail) { setLoadingHer(false); return; }
    (async () => {
      try {
        const q    = query(collection(db, "wishlists"), where("ownerEmail", "==", herEmail));
        const snap = await getDocs(q);
        setHerItems(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      } catch (e) { console.error(e); }
      finally { setLoadingHer(false); }
    })();
  }, [herEmail]);

  const source  = tab === "mine" ? myItems : herItems;
  const loading = tab === "mine" ? loadingMe : loadingHer;
  const isOwnTab = tab === "mine";

  // Filters
  const filtered = source.filter(item => {
    if (filter === "bought")  return item.bought;
    if (filter === "active")  return !item.bought;
    if (filter === "need")    return item.priority === "need"  && !item.bought;
    if (filter === "want")    return item.priority === "want"  && !item.bought;
    if (filter === "maybe")   return item.priority === "maybe" && !item.bought;
    return true;
  });

  const totalVal   = myItems.filter(i => !i.bought).reduce((s, i) => s + (Number(i.price) || 0), 0);
  const boughtCount = myItems.filter(i => i.bought).length;

  const handleAdded = (item) => {
    setMyItems(prev => [item, ...prev]);
    setShowAdd(false);
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Remove this from wishlist?")) return;
    await deleteDoc(doc(db, "wishlists", id));
    setMyItems(prev => prev.filter(i => i.id !== id));
  };

  const handleToggleBought = async (item) => {
    await updateDoc(doc(db, "wishlists", item.id), { bought: !item.bought });
    setMyItems(prev => prev.map(i => i.id === item.id ? { ...i, bought: !i.bought } : i));
  };

  const handleSaveSister = async (email) => {
    try {
      const snap = await getDocs(query(collection(db, "users"), where("email", "==", user.email)));
      if (!snap.empty) {
        await updateDoc(doc(db, "users", snap.docs[0].id), { wishlistSharedWith: email });
        setHerEmail(email);
        setShowSetup(false);
        setLoadingHer(true);
        // refetch her items
        const q    = query(collection(db, "wishlists"), where("ownerEmail", "==", email));
        const hSnap = await getDocs(q);
        setHerItems(hSnap.docs.map(d => ({ id: d.id, ...d.data() })));
        setLoadingHer(false);
      }
    } catch (e) { console.error(e); alert("Failed to save"); }
  };

  return (
    <div style={S.root}>
      <style>{CSS}</style>

      {/* ── Header ── */}
      <div style={S.header}>
        <button style={S.backBtn} onClick={() => navigate(-1)}>←</button>
        <div style={{ flex: 1 }}>
          <h1 style={S.headerTitle}>Wishlist 🛍️</h1>
          <p style={S.headerSub}>
            {tab === "mine"
              ? `₹${totalVal.toLocaleString()} worth of dreams · ${boughtCount} bought`
              : `${herEmail?.split("@")[0] || "sister"}'s wishlist`}
          </p>
        </div>
        <div style={{ display:"flex", gap:8 }}>
          <button style={S.iconHeaderBtn} onClick={() => setShowSetup(true)} title="Connect sister">👥</button>
          {isOwnTab && <button style={S.addBtn} onClick={() => setShowAdd(true)}>+ Add</button>}
        </div>
      </div>

      {/* ── Tabs ── */}
      <div style={S.tabWrap}>
        <button style={{ ...S.tabBtn, ...(tab==="mine"?S.tabActive:{}) }} onClick={() => setTab("mine")}>
          My Wishlist
          <span style={{ ...S.tabCount, ...(tab==="mine"?S.tabCountActive:{}) }}>{myItems.length}</span>
        </button>
        <button style={{ ...S.tabBtn, ...(tab==="hers"?S.tabActive:{}) }} onClick={() => setTab("hers")}>
          {herEmail ? `${herEmail.split("@")[0]}'s` : "Sister's"}
          <span style={{ ...S.tabCount, ...(tab==="hers"?S.tabCountActive:{}) }}>{herItems.length}</span>
        </button>
      </div>

      {/* ── No sister connected ── */}
      {tab === "hers" && !herEmail && (
        <div style={S.setupBanner}>
          <span style={{ fontSize:32 }}>👯‍♀️</span>
          <div>
            <p style={S.setupTitle}>Connect your sister</p>
            <p style={S.setupSub}>Add her email to see her wishlist</p>
          </div>
          <button style={S.setupBtn} onClick={() => setShowSetup(true)}>Connect</button>
        </div>
      )}

      {/* ── Summary strip (mine only) ── */}
      {tab === "mine" && myItems.length > 0 && (
        <div style={S.summaryStrip}>
          <div style={S.summaryItem}>
            <span style={S.summaryNum}>{myItems.filter(i=>!i.bought).length}</span>
            <span style={S.summaryLbl}>Active</span>
          </div>
          <div style={S.summaryDiv}/>
          <div style={S.summaryItem}>
            <span style={{ ...S.summaryNum, color:"#16a34a" }}>{boughtCount}</span>
            <span style={S.summaryLbl}>Bought ✅</span>
          </div>
          <div style={S.summaryDiv}/>
          <div style={S.summaryItem}>
            <span style={{ ...S.summaryNum, color:"#ec4899" }}>₹{totalVal.toLocaleString()}</span>
            <span style={S.summaryLbl}>Total value</span>
          </div>
        </div>
      )}

      {/* ── Filter pills ── */}
      {source.length > 0 && (
        <div style={S.filterScroll}>
          {[
            { key:"all",    label:"All" },
            { key:"active", label:"Active" },
            { key:"need",   label:"🔥 Need" },
            { key:"want",   label:"⭐ Want" },
            { key:"maybe",  label:"💭 Maybe" },
            { key:"bought", label:"✅ Bought" },
          ].map(f => (
            <button key={f.key}
              style={{ ...S.pill, ...(filter===f.key ? S.pillActive : {}) }}
              onClick={() => setFilter(f.key)}>
              {f.label}
            </button>
          ))}
        </div>
      )}

      {/* ── Items list ── */}
      <div style={S.list}>
        {loading ? (
          <div style={S.centerBox}><div style={S.spinner}/></div>
        ) : filtered.length === 0 ? (
          <div style={S.centerBox}>
            <div style={{ fontSize:52 }}>🌸</div>
            <p style={S.emptyTitle}>
              {tab === "mine" ? "Your wishlist is empty" : "Her wishlist is empty"}
            </p>
            <p style={S.emptySub}>
              {tab === "mine" ? "Add something you're dreaming of" : "Nothing added yet"}
            </p>
            {tab === "mine" && (
              <button style={{ ...S.addBtn, marginTop:12 }} onClick={() => setShowAdd(true)}>
                + Add Item
              </button>
            )}
          </div>
        ) : (
          filtered.map((item, i) => (
            <WishItem
              key={item.id}
              item={item}
              index={i}
              isOwn={isOwnTab}
              onDelete={() => handleDelete(item.id)}
              onToggleBought={() => handleToggleBought(item)}
            />
          ))
        )}
      </div>

      {/* ── Add Sheet ── */}
      {showAdd && (
        <AddWishSheet
          user={user}
          onClose={() => setShowAdd(false)}
          onAdded={handleAdded}
        />
      )}

      {/* ── Setup Sister Sheet ── */}
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

// ─── Wish Item Card ───────────────────────────────────────────────────────────
function WishItem({ item, index, isOwn, onDelete, onToggleBought }) {
  const preset   = PRESET_CATEGORIES.find(c => c.id === item.category);
  const priority = PRIORITIES.find(p => p.id === item.priority);

  return (
    <div
      style={{ ...S.itemCard, ...(item.bought ? S.itemCardBought : {}), animationDelay:`${index*0.05}s` }}
      className="wish-item"
    >
      {/* Photo or emoji placeholder */}
      <div style={S.itemImgWrap}>
        {item.photo ? (
          <img src={item.photo} alt={item.name} style={{ ...S.itemImg, ...(item.bought ? { opacity:0.5 } : {}) }}/>
        ) : (
          <div style={{ ...S.itemImgPlaceholder, background: (preset?.color || "#ec4899") + "22" }}>
            <span style={{ fontSize:28 }}>{preset?.emoji || "✨"}</span>
          </div>
        )}
        {/* Bought overlay */}
        {item.bought && (
          <div style={S.boughtOverlay}>✅</div>
        )}
      </div>

      {/* Info */}
      <div style={S.itemBody}>
        <p style={{ ...S.itemName, ...(item.bought ? S.itemNameBought : {}) }}>{item.name}</p>

        <div style={S.itemTags}>
          {priority && (
            <span style={{ ...S.tag, background: priority.color + "18", color: priority.color }}>
              {priority.emoji} {priority.label}
            </span>
          )}
          {preset && (
            <span style={{ ...S.tag, background: preset.color + "18", color: preset.color }}>
              {preset.emoji} {preset.label}
            </span>
          )}
        </div>

        {item.link && (
          <a href={item.link} target="_blank" rel="noreferrer" style={S.itemLink}
            onClick={e => e.stopPropagation()}>
            🔗 View item
          </a>
        )}
      </div>

      {/* Right side */}
      <div style={S.itemRight}>
        {item.price && (
          <p style={{ ...S.itemPrice, ...(item.bought ? { textDecoration:"line-through", color:"#ccc" } : {}) }}>
            ₹{Number(item.price).toLocaleString()}
          </p>
        )}

        {isOwn && (
          <div style={S.itemActions}>
            <button style={{ ...S.actionBtn, background: item.bought ? "#dcfce7" : "#f0fdf4", color:"#16a34a" }}
              onClick={onToggleBought}
              title={item.bought ? "Mark as not bought" : "Mark as bought"}>
              {item.bought ? "↩" : "✓"}
            </button>
            <button style={{ ...S.actionBtn, background:"rgba(239,68,68,0.08)", color:"#ef4444" }}
              onClick={onDelete}>
              🗑
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Add Wish Sheet ───────────────────────────────────────────────────────────
function AddWishSheet({ user, onClose, onAdded }) {
  const fileRef   = useRef(null);
  const [form, setForm] = useState({
    name:"", price:"", link:"", category:null, priority:"want", photo:"",
  });
  const [uploading, setUploading] = useState(false);
  const [uploadPct, setUploadPct] = useState(0);
  const [saving,    setSaving]    = useState(false);
  const [custom,    setCustom]    = useState("");

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const handlePhoto = (e) => {
    const file = e.target.files[0]; if (!file) return;
    setUploading(true);
    const fd = new FormData();
    fd.append("file", file);
    fd.append("upload_preset", UPLOAD_PRESET);
    fd.append("folder", "blush_wishlist");
    const xhr = new XMLHttpRequest();
    xhr.upload.onprogress = ev => {
      if (ev.lengthComputable) setUploadPct(Math.round(ev.loaded/ev.total*100));
    };
    xhr.onload = () => {
      const res = JSON.parse(xhr.responseText);
      set("photo", res.secure_url);
      setUploading(false); setUploadPct(0);
    };
    xhr.onerror = () => { alert("Upload failed"); setUploading(false); };
    xhr.open("POST", `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`);
    xhr.send(fd);
  };

  const handleSave = async () => {
    if (!form.name.trim()) { alert("Item name is required"); return; }
    if (!form.category)    { alert("Pick a category"); return; }
    setSaving(true);
    try {
      const data = {
        uid:        user.uid,
        ownerEmail: user.email,
        name:       form.name.trim(),
        price:      form.price ? parseFloat(form.price) : null,
        link:       form.link.trim(),
        category:   form.category === "__custom__" ? (custom.trim() || "random") : form.category,
        priority:   form.priority,
        photo:      form.photo,
        bought:     false,
        createdAt:  serverTimestamp(),
      };
      const ref = await addDoc(collection(db, "wishlists"), data);
      onAdded({ id: ref.id, ...data, createdAt: new Date() });
    } catch (err) {
      console.error(err); alert("Failed to save. Try again.");
    }
    setSaving(false);
  };

  return (
    <div style={S.sheetOverlay} onClick={onClose}>
      <div style={S.sheet} onClick={e => e.stopPropagation()}>
        <div style={S.sheetHandle}/>
        <div style={S.sheetScroll}>
          <div style={S.sheetHeader}>
            <h2 style={S.sheetTitle}>Add to Wishlist 🌸</h2>
            <button style={S.sheetClose} onClick={onClose}>✕</button>
          </div>

          {/* Photo */}
          <div style={S.photoUpload} onClick={() => fileRef.current?.click()}>
            {form.photo ? (
              <img src={form.photo} alt="item" style={S.photoPreview}/>
            ) : uploading ? (
              <div style={S.uploadProgress}>
                <div style={{ width:"80%", height:6, background:"#fce7f3", borderRadius:99, overflow:"hidden" }}>
                  <div style={{ height:"100%", background:"linear-gradient(90deg,#ec4899,#be185d)", borderRadius:99, transition:"width 0.2s", width:`${uploadPct}%` }}/>
                </div>
                <p style={{ fontSize:13, color:"#ec4899", fontWeight:600 }}>{uploadPct}%</p>
              </div>
            ) : (
              <div style={S.photoPlaceholder}>
                <span style={{ fontSize:28 }}>📷</span>
                <p style={{ fontSize:12, color:"#ec4899", marginTop:4 }}>add a photo</p>
              </div>
            )}
            <input ref={fileRef} type="file" accept="image/*" style={{ display:"none" }} onChange={handlePhoto}/>
          </div>

          {/* Name */}
          <label style={S.label}>Item Name *</label>
          <input style={S.input} placeholder="e.g. Nike Air Max, Dyson Airwrap..."
            value={form.name} onChange={e => set("name", e.target.value)}/>

          {/* Price + Link */}
          <div style={{ display:"flex", gap:10 }}>
            <div style={{ flex:1 }}>
              <label style={S.label}>Price (₹)</label>
              <input style={S.input} type="number" placeholder="e.g. 2999"
                value={form.price} onChange={e => set("price", e.target.value)}/>
            </div>
            <div style={{ flex:1 }}>
              <label style={S.label}>Link</label>
              <input style={S.input} placeholder="amazon.in/..."
                value={form.link} onChange={e => set("link", e.target.value)}/>
            </div>
          </div>

          {/* Priority */}
          <label style={S.label}>Priority</label>
          <div style={{ display:"flex", gap:8, marginBottom:16 }}>
            {PRIORITIES.map(p => (
              <button key={p.id}
                style={{
                  flex:1, padding:"10px 4px", borderRadius:12, fontSize:12, fontWeight:600, cursor:"pointer",
                  border: `1.5px solid ${form.priority===p.id ? p.color : p.color+"44"}`,
                  background: form.priority===p.id ? p.color : p.color+"15",
                  color: form.priority===p.id ? "#fff" : p.color,
                  transition:"all 0.18s",
                }}
                onClick={() => set("priority", p.id)}>
                {p.emoji}<br/>{p.label}
              </button>
            ))}
          </div>

          {/* Category */}
          <label style={S.label}>Category *</label>
          <div style={S.catGrid}>
            {PRESET_CATEGORIES.map(cat => (
              <button key={cat.id}
                style={{
                  ...S.catGridBtn,
                  background:  form.category===cat.id ? cat.color : cat.color+"15",
                  color:       form.category===cat.id ? "#fff"    : cat.color,
                  border:      `1.5px solid ${form.category===cat.id ? cat.color : cat.color+"44"}`,
                }}
                onClick={() => set("category", cat.id)}>
                <span style={{ fontSize:18 }}>{cat.emoji}</span>
                <span style={{ fontSize:10, fontWeight:600 }}>{cat.label}</span>
              </button>
            ))}
            <button
              style={{
                ...S.catGridBtn,
                background:  form.category==="__custom__" ? "#6366f1" : "#6366f115",
                color:       form.category==="__custom__" ? "#fff"    : "#6366f1",
                border:      `1.5px solid ${form.category==="__custom__" ? "#6366f1" : "#6366f144"}`,
              }}
              onClick={() => set("category", "__custom__")}>
              <span style={{ fontSize:18 }}>✏️</span>
              <span style={{ fontSize:10, fontWeight:600 }}>Custom</span>
            </button>
          </div>

          {form.category === "__custom__" && (
            <input style={{ ...S.input, marginTop:10 }}
              placeholder="e.g. Skincare, Stationery..."
              value={custom} onChange={e => setCustom(e.target.value)}/>
          )}

          <button style={{ ...S.saveBtn, opacity: saving ? 0.6 : 1 }}
            onClick={handleSave} disabled={saving}>
            {saving ? "Saving..." : "Add to Wishlist 🌸"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Setup Sister Sheet ───────────────────────────────────────────────────────
function SetupSisterSheet({ current, onClose, onSave }) {
  const [email,   setEmail]   = useState(current || "");
  const [saving,  setSaving]  = useState(false);

  return (
    <div style={S.sheetOverlay} onClick={onClose}>
      <div style={{ ...S.sheet, maxHeight:"50vh" }} onClick={e => e.stopPropagation()}>
        <div style={S.sheetHandle}/>
        <div style={S.sheetScroll}>
          <div style={S.sheetHeader}>
            <h2 style={S.sheetTitle}>Sister's Wishlist 👯‍♀️</h2>
            <button style={S.sheetClose} onClick={onClose}>✕</button>
          </div>
          <p style={{ fontSize:13, color:"#f9a8d4", marginBottom:16, lineHeight:1.6 }}>
            Enter your sister's email to see her wishlist. She must already have an account.
          </p>
          <label style={S.label}>Sister's Email</label>
          <input style={S.input} type="email" placeholder="her@email.com"
            value={email} onChange={e => setEmail(e.target.value)}/>
          <button
            style={{ ...S.saveBtn, opacity: saving ? 0.6 : 1 }}
            disabled={saving}
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

// ─── CSS & Styles ─────────────────────────────────────────────────────────────
const CSS = `
  @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@500;700&family=DM+Sans:wght@300;400;500;600&display=swap');
  * { box-sizing:border-box; margin:0; padding:0; }
  @keyframes fadeUp  { from{opacity:0;transform:translateY(14px);} to{opacity:1;transform:translateY(0);} }
  @keyframes spin    { to{transform:rotate(360deg);} }
  @keyframes slideUp { from{transform:translateY(100%);} to{transform:translateY(0);} }
  input:focus { outline:none; }
  input[type=number]::-webkit-inner-spin-button { -webkit-appearance:none; }
  button { font-family:'DM Sans',sans-serif; }
  .wish-item { transition:transform 0.18s,box-shadow 0.18s; animation:fadeUp 0.4s ease both; }
  .wish-item:hover { transform:translateY(-2px); box-shadow:0 8px 24px rgba(236,72,153,0.12)!important; }
  a { text-decoration:none; }
`;

const S = {
  root:    { minHeight:"100vh", background:"#fff8fb", fontFamily:"'DM Sans',sans-serif", paddingBottom:40 },
  header:  { display:"flex", alignItems:"center", gap:10, padding:"16px 16px 12px", background:"#fff", borderBottom:"1px solid #fce7f3", position:"sticky", top:0, zIndex:50 },
  backBtn: { background:"#fce7f3", border:"none", borderRadius:10, width:36, height:36, fontSize:18, cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center", color:"#be185d", flexShrink:0 },
  headerTitle: { fontFamily:"'Playfair Display',serif", fontSize:20, color:"#be185d", marginBottom:1 },
  headerSub:   { fontSize:11, color:"#f9a8d4" },
  addBtn:      { background:"linear-gradient(135deg,#ec4899,#be185d)", color:"#fff", border:"none", borderRadius:12, padding:"8px 16px", fontSize:13, fontWeight:600, cursor:"pointer", flexShrink:0 },
  iconHeaderBtn: { background:"#fce7f3", border:"none", borderRadius:10, width:36, height:36, fontSize:17, cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 },

  tabWrap:        { display:"flex", background:"#fff", borderBottom:"1px solid #fce7f3", padding:"0 16px" },
  tabBtn:         { flex:1, padding:"13px 0", background:"none", border:"none", borderBottom:"2px solid transparent", fontSize:14, fontWeight:500, color:"#f9a8d4", cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center", gap:8, transition:"all 0.2s" },
  tabActive:      { color:"#ec4899", borderBottomColor:"#ec4899" },
  tabCount:       { fontSize:11, background:"#fce7f3", color:"#be185d", borderRadius:999, padding:"1px 8px", fontWeight:700 },
  tabCountActive: { color:"#ec4899" },

  setupBanner: { display:"flex", alignItems:"center", gap:12, margin:"16px", background:"linear-gradient(135deg,#fdf2f8,#fce7f3)", border:"1px solid #fce7f3", borderRadius:16, padding:"16px" },
  setupTitle:  { fontSize:14, fontWeight:600, color:"#be185d", marginBottom:2 },
  setupSub:    { fontSize:12, color:"#f9a8d4" },
  setupBtn:    { background:"linear-gradient(135deg,#ec4899,#be185d)", color:"#fff", border:"none", borderRadius:10, padding:"8px 16px", fontSize:13, fontWeight:600, cursor:"pointer", flexShrink:0 },

  summaryStrip: { display:"flex", background:"#fff", borderBottom:"1px solid #fce7f3", padding:"12px 16px" },
  summaryItem:  { flex:1, display:"flex", flexDirection:"column", alignItems:"center", gap:2 },
  summaryNum:   { fontFamily:"'Playfair Display',serif", fontSize:18, fontWeight:700, color:"#be185d" },
  summaryLbl:   { fontSize:10, color:"#f9a8d4", textTransform:"uppercase", letterSpacing:"0.5px" },
  summaryDiv:   { width:1, background:"#fce7f3", alignSelf:"stretch" },

  filterScroll: { display:"flex", gap:8, padding:"12px 16px", overflowX:"auto" },
  pill:         { padding:"6px 14px", borderRadius:999, border:"1.5px solid #fce7f3", background:"#fff", color:"#be185d", fontSize:12, fontWeight:500, cursor:"pointer", whiteSpace:"nowrap", flexShrink:0, transition:"all 0.2s" },
  pillActive:   { background:"linear-gradient(135deg,#ec4899,#be185d)", color:"#fff", border:"1.5px solid transparent" },

  list:     { padding:"0 16px" },
  centerBox:{ display:"flex", flexDirection:"column", alignItems:"center", padding:"60px 20px", gap:10, textAlign:"center" },
  spinner:  { width:30, height:30, border:"3px solid #fce7f3", borderTop:"3px solid #ec4899", borderRadius:"50%", animation:"spin 0.8s linear infinite" },
  emptyTitle:{ fontFamily:"'Playfair Display',serif", fontSize:18, color:"#be185d" },
  emptySub:  { fontSize:13, color:"#f9a8d4", maxWidth:240, lineHeight:1.6 },

  itemCard:       { display:"flex", alignItems:"center", gap:12, background:"#fff", borderRadius:16, padding:12, marginBottom:10, boxShadow:"0 2px 12px rgba(236,72,153,0.07)", cursor:"default" },
  itemCardBought: { background:"#fafafa" },
  itemImgWrap:    { position:"relative", flexShrink:0 },
  itemImg:        { width:72, height:72, borderRadius:12, objectFit:"cover", display:"block" },
  itemImgPlaceholder: { width:72, height:72, borderRadius:12, display:"flex", alignItems:"center", justifyContent:"center" },
  boughtOverlay:  { position:"absolute", inset:0, borderRadius:12, background:"rgba(255,255,255,0.6)", display:"flex", alignItems:"center", justifyContent:"center", fontSize:22 },
  itemBody:       { flex:1, minWidth:0 },
  itemName:       { fontSize:14, fontWeight:600, color:"#1a0a12", marginBottom:5 },
  itemNameBought: { textDecoration:"line-through", color:"#ccc" },
  itemTags:       { display:"flex", gap:6, flexWrap:"wrap", marginBottom:4 },
  tag:            { fontSize:11, fontWeight:600, borderRadius:6, padding:"2px 8px" },
  itemLink:       { fontSize:11, color:"#6366f1", fontWeight:500 },
  itemRight:      { display:"flex", flexDirection:"column", alignItems:"flex-end", gap:6, flexShrink:0 },
  itemPrice:      { fontFamily:"'Playfair Display',serif", fontSize:15, fontWeight:700, color:"#be185d" },
  itemActions:    { display:"flex", gap:4 },
  actionBtn:      { width:30, height:30, borderRadius:8, border:"none", fontSize:13, cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center", fontWeight:700 },

  sheetOverlay: { position:"fixed", inset:0, background:"rgba(0,0,0,0.45)", zIndex:200, display:"flex", alignItems:"flex-end" },
  sheet:        { background:"#fff", borderRadius:"24px 24px 0 0", width:"100%", maxHeight:"92vh", animation:"slideUp 0.35s cubic-bezier(.22,1,.36,1) both", display:"flex", flexDirection:"column" },
  sheetHandle:  { width:40, height:4, background:"#fce7f3", borderRadius:99, margin:"12px auto 0" },
  sheetScroll:  { overflowY:"auto", padding:"0 20px 40px", flex:1 },
  sheetHeader:  { display:"flex", alignItems:"center", justifyContent:"space-between", padding:"16px 0 14px" },
  sheetTitle:   { fontFamily:"'Playfair Display',serif", fontSize:22, color:"#be185d" },
  sheetClose:   { background:"#fce7f3", border:"none", borderRadius:10, width:32, height:32, fontSize:16, cursor:"pointer", color:"#be185d", display:"flex", alignItems:"center", justifyContent:"center" },

  photoUpload:      { width:"100%", height:140, border:"2px dashed #fce7f3", borderRadius:16, overflow:"hidden", cursor:"pointer", marginBottom:16, display:"flex", alignItems:"center", justifyContent:"center" },
  photoPreview:     { width:"100%", height:"100%", objectFit:"cover" },
  photoPlaceholder: { display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", gap:4, background:"#fff8fb", width:"100%", height:"100%" },
  uploadProgress:   { display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", gap:12, background:"#fff8fb", width:"100%", height:"100%" },

  label:   { display:"block", fontSize:12, fontWeight:600, color:"#be185d", marginBottom:6, letterSpacing:"0.5px", textTransform:"uppercase" },
  input:   { width:"100%", padding:"12px 14px", background:"#fff8fb", border:"1.5px solid #fce7f3", borderRadius:12, fontSize:14, color:"#1a0a12", fontFamily:"'DM Sans',sans-serif", marginBottom:14 },
  catGrid:    { display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:8, marginBottom:6 },
  catGridBtn: { borderRadius:12, padding:"10px 4px", display:"flex", flexDirection:"column", alignItems:"center", gap:4, cursor:"pointer", border:"1.5px solid transparent", transition:"all 0.18s" },
  saveBtn: { width:"100%", padding:16, background:"linear-gradient(135deg,#ec4899,#be185d)", color:"#fff", border:"none", borderRadius:14, fontSize:15, fontWeight:600, cursor:"pointer", marginTop:16, boxShadow:"0 6px 20px rgba(236,72,153,0.3)" },
};