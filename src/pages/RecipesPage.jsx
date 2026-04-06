import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { db, auth } from "../firebase";
import {
  collection, addDoc, getDocs, query,
  where, deleteDoc, doc, serverTimestamp, updateDoc
} from "firebase/firestore";

// ─── Cloudinary config ────────────────────────────────────────────────────────
const CLOUD_NAME    = "dmmge8nir";
const UPLOAD_PRESET = "kalyani";

export default function RecipesPage() {
  const navigate = useNavigate();
  const user     = auth.currentUser;

  const [tab,        setTab]        = useState("mine");   // mine | explore
  const [myRecipes,  setMyRecipes]  = useState([]);
  const [allRecipes, setAllRecipes] = useState([]);
  const [loadingMine,setLoadingMine]= useState(true);
  const [loadingAll, setLoadingAll] = useState(true);
  const [filter,     setFilter]     = useState("all");    // all | veg | nonveg
  const [search,     setSearch]     = useState("");
  const [showForm,   setShowForm]   = useState(false);

  // ── Fetch MY recipes ──────────────────────────────────────────
  useEffect(() => {
    if (!user) return;
    (async () => {
      try {
        const q    = query(collection(db, "recipes"), where("uid", "==", user.uid));
        const snap = await getDocs(q);
        setMyRecipes(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      } catch (e) { console.error(e); }
      finally { setLoadingMine(false); }
    })();
  }, [user]);

  // ── Fetch ALL recipes (explore) ───────────────────────────────
  useEffect(() => {
    (async () => {
      try {
        const snap = await getDocs(collection(db, "recipes"));
        setAllRecipes(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      } catch (e) { console.error(e); }
      finally { setLoadingAll(false); }
    })();
  }, []);

  // ── Active list based on tab ──────────────────────────────────
  const source  = tab === "mine" ? myRecipes : allRecipes;
  const loading = tab === "mine" ? loadingMine : loadingAll;

  const filtered = source.filter(r => {
    const matchCat    = filter === "all" || r.category === filter;
    const matchSearch = r.name?.toLowerCase().includes(search.toLowerCase());
    return matchCat && matchSearch;
  });

  const handleDelete = async (id) => {
    if (!window.confirm("Delete this recipe?")) return;
    await deleteDoc(doc(db, "recipes", id));
    setMyRecipes(prev => prev.filter(r => r.id !== id));
    setAllRecipes(prev => prev.filter(r => r.id !== id));
  };
  const handleTogglePublic = async (recipe) => {
  const newVal = !recipe.isPublic;
  try {
    await updateDoc(doc(db, "recipes", recipe.id), { isPublic: newVal });
    const updater = prev => prev.map(r => r.id === recipe.id ? { ...r, isPublic: newVal } : r);
    setMyRecipes(updater);
    if (newVal) {
      setAllRecipes(prev => [...prev, { ...recipe, isPublic: true }]);
    } else {
      setAllRecipes(prev => prev.filter(r => r.id !== recipe.id));
    }
  } catch (e) { console.error(e); }
};
  const handleAdded = (recipe) => {
    setMyRecipes(prev  => [recipe, ...prev]);
    setAllRecipes(prev => [recipe, ...prev]);
    setShowForm(false);
  };

  return (
    <div style={S.root}>
      <style>{CSS}</style>

      {/* ── Header ── */}
      <div style={S.header}>
        <button style={S.backBtn} onClick={() => navigate(-1)}>←</button>
        <div style={{ flex:1 }}>
          <h1 style={S.headerTitle}>Recipes 🧁</h1>
          <p style={S.headerSub}>
            {tab === "mine"
              ? `${myRecipes.length} saved by you`
              : `${allRecipes.length} from everyone`}
          </p>
        </div>
        {tab === "mine" && (
          <button style={S.addBtn} onClick={() => setShowForm(true)}>+ Add</button>
        )}
      </div>

      {/* ── Tabs ── */}
      <div style={S.tabWrap}>
        <button
          style={{ ...S.tabBtn, ...(tab === "mine" ? S.tabActive : {}) }}
          onClick={() => setTab("mine")}
        >
          My Recipes
          <span style={{ ...S.tabCount, ...(tab==="mine"?S.tabCountActive:{}) }}>
            {myRecipes.length}
          </span>
        </button>
        <button
          style={{ ...S.tabBtn, ...(tab === "explore" ? S.tabActive : {}) }}
          onClick={() => setTab("explore")}
        >
          Explore
          <span style={{ ...S.tabCount, ...(tab==="explore"?S.tabCountActive:{}) }}>
            {allRecipes.length}
          </span>
        </button>
      </div>

      {/* ── Search ── */}
      <div style={S.searchWrap}>
        <span style={S.searchIcon}>🔍</span>
        <input
          style={S.searchInput}
          placeholder={tab === "mine" ? "search your recipes..." : "search all recipes..."}
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
        {search && (
          <button style={S.clearSearch} onClick={() => setSearch("")}>✕</button>
        )}
      </div>

      {/* ── Filter pills ── */}
      <div style={S.pills}>
        {[
          { key:"all",    label:"All"         },
          { key:"veg",    label:"🟢 Veg"      },
          { key:"nonveg", label:"🔴 Non-Veg"  },
        ].map(f => (
          <button
            key={f.key}
            style={{ ...S.pill, ...(filter === f.key ? S.pillActive : {}) }}
            onClick={() => setFilter(f.key)}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* ── Explore banner ── */}
      {tab === "explore" && (
        <div style={S.exploreBanner}>
          <span style={S.exploreIcon}>🌍</span>
          <div>
            <p style={S.exploreTxt}>Recipes from the community</p>
            <p style={S.exploreSub}>Browse what everyone's cooking</p>
          </div>
        </div>
      )}

      {/* ── List ── */}
      <div style={S.list}>
        {loading ? (
          <div style={S.centerBox}><div style={S.spinner}/></div>
        ) : filtered.length === 0 ? (
          <div style={S.centerBox}>
            <div style={S.emptyIcon}>{tab === "mine" ? "🍽️" : "🔍"}</div>
            <p style={S.emptyTitle}>
              {tab === "mine" ? "No recipes yet" : "Nothing found"}
            </p>
            <p style={S.emptySub}>
              {tab === "mine"
                ? "Tap \"+ Add\" to save your first one"
                : "Try a different filter or search"}
            </p>
            {tab === "mine" && (
              <button style={S.addBtn} onClick={() => setShowForm(true)}>
                + Add Recipe
              </button>
            )}
          </div>
        ) : (
          filtered.map((r, i) => (
            <RecipeCard
              key={r.id}
              recipe={r}
              index={i}
              isOwner={r.uid === user?.uid}
              showAuthor={tab === "explore"}
              showToggle={tab === "mine"} 
              onClick={() => navigate(`/recipes/${r.id}`, { state: { recipe: r } })}
              onDelete={() => handleDelete(r.id)}
              onTogglePublic={() => handleTogglePublic(r)}
            />
          ))
        )}
      </div>

      {/* ── Add Recipe Sheet ── */}
      {showForm && (
        <AddRecipeSheet
          user={user}
          onClose={() => setShowForm(false)}
          onAdded={handleAdded}
        />
      )}
    </div>
  );
}

// ─── Recipe Card ──────────────────────────────────────────────────────────────
function RecipeCard({ recipe: r, index, isOwner, showAuthor, showToggle, onClick, onDelete, onTogglePublic }) {
  return (
    <div
      style={{ ...S.card, animationDelay:`${index * 0.05}s` }}
      className="recipe-card"
      onClick={onClick}
    >
      {/* Photo */}
      <div style={S.cardImgWrap}>
        {r.photo ? (
          <img src={r.photo} alt={r.name} style={S.cardImg}/>
        ) : (
          <div style={S.cardImgPlaceholder}>
            {r.category === "veg" ? "🥦" : "🍗"}
          </div>
        )}
        <div style={{
          ...S.vegDot,
          background: r.category === "veg" ? "#16a34a" : "#dc2626"
        }}/>
      </div>

      {/* Info */}
      <div style={S.cardBody}>
        <p style={S.cardName}>{r.name}</p>
        {showAuthor && r.authorName && (
          <p style={S.cardAuthor}>by {r.authorName} {isOwner ? "· (you)" : ""}</p>
        )}
        <div style={S.cardMeta}>
          {r.cookTime && <span style={S.metaChip}>⏱ {r.cookTime}</span>}
          {r.servings  && <span style={S.metaChip}>🍽 {r.servings}</span>}
        </div>
        <p style={S.cardIngCount}>
          {r.ingredients?.length || 0} ingredients · {r.steps?.length || 0} steps
        </p>
      </div>

      {/* Delete — only owner */}
      <div style={{ display:"flex", flexDirection:"column", gap:6, alignItems:"center", flexShrink:0 }}
  onClick={e => e.stopPropagation()}>
  {showToggle && isOwner && (
    <button
      style={{
        border:"none", borderRadius:8, width:32, height:32, fontSize:16,
        cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center",
        background: r.isPublic ? "rgba(16,163,74,0.1)" : "#fce7f3"
      }}
      onClick={onTogglePublic}
      title={r.isPublic ? "Public — tap to make private" : "Private — tap to share"}
    >
      {r.isPublic ? "🌍" : "🔒"}
    </button>
  )}
  {isOwner && (
    <button style={S.deleteBtn} onClick={onDelete}>🗑</button>
  )}
</div>
    </div>
  );
}

// ─── Add Recipe Sheet ─────────────────────────────────────────────────────────
function AddRecipeSheet({ user, onClose, onAdded }) {
  const fileRef = useRef(null);
  const [form, setForm] = useState({
    name:"", category:"veg", cookTime:"", servings:"",
    photo:"", ingredients:[""], steps:[""],
  });
  const [uploading, setUploading] = useState(false);
  const [uploadPct, setUploadPct] = useState(0);
  const [saving,    setSaving]    = useState(false);

  const set = (key, val) => setForm(f => ({ ...f, [key]: val }));

  // ── Photo upload ─────────────────────────────────────────────
  const handlePhoto = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setUploading(true);
    const fd = new FormData();
    fd.append("file", file);
    fd.append("upload_preset", UPLOAD_PRESET);
    fd.append("folder", "blush_recipes");
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

  // ── Ingredient helpers ───────────────────────────────────────
  const updateIng = (i, v) => { const a=[...form.ingredients]; a[i]=v; set("ingredients",a); };
  const addIng    = ()     => set("ingredients",[...form.ingredients,""]);
  const removeIng = (i)   => set("ingredients",form.ingredients.filter((_,idx)=>idx!==i));

  // ── Step helpers ─────────────────────────────────────────────
  const updateStep = (i, v) => { const a=[...form.steps]; a[i]=v; set("steps",a); };
  const addStep    = ()     => set("steps",[...form.steps,""]);
  const removeStep = (i)   => set("steps",form.steps.filter((_,idx)=>idx!==i));

  // ── Save ─────────────────────────────────────────────────────
  const handleSave = async () => {
    if (!form.name.trim()) { alert("Recipe name is required"); return; }
    setSaving(true);
    try {
      const data = {
        uid:         user.uid,
        authorName:  user.displayName || user.email?.split("@")[0] || "Someone",
        name:        form.name.trim(),
        category:    form.category,
        cookTime:    form.cookTime.trim(),
        servings:    form.servings.trim(),
        photo:       form.photo,
        ingredients: form.ingredients.filter(i => i.trim()),
        steps:       form.steps.filter(s => s.trim()),
        isPublic: false,
        createdAt:   serverTimestamp(),
      };
      const ref = await addDoc(collection(db, "recipes"), data);
      onAdded({ id: ref.id, ...data, createdAt: new Date() });
    } catch (err) {
      console.error(err);
      alert("Failed to save. Try again.");
    }
    setSaving(false);
  };

  return (
    <div style={S.sheetOverlay} onClick={onClose}>
      <div style={S.sheet} onClick={e => e.stopPropagation()}>
        <div style={S.sheetHandle}/>
        <div style={S.sheetScroll}>

          <div style={S.sheetHeader}>
            <h2 style={S.sheetTitle}>New Recipe</h2>
            <button style={S.sheetClose} onClick={onClose}>✕</button>
          </div>

          {/* Photo */}
          <div style={S.photoUpload} onClick={() => fileRef.current?.click()}>
            {form.photo ? (
              <img src={form.photo} alt="recipe" style={S.photoPreview}/>
            ) : uploading ? (
              <div style={S.uploadProgress}>
                <div style={{ width:"80%", height:6, background:"#fce7f3", borderRadius:99, overflow:"hidden" }}>
                  <div style={{ ...S.uploadBar, width:`${uploadPct}%` }}/>
                </div>
                <p style={S.uploadPct}>{uploadPct}%</p>
              </div>
            ) : (
              <div style={S.photoPlaceholder}>
                <span style={{ fontSize:32 }}>📷</span>
                <p style={{ fontSize:13, color:"#ec4899", marginTop:6 }}>tap to add photo</p>
              </div>
            )}
            <input ref={fileRef} type="file" accept="image/*"
              style={{ display:"none" }} onChange={handlePhoto}/>
          </div>

          {/* Name */}
          <label style={S.label}>Recipe Name *</label>
          <input style={S.input} placeholder="e.g. Butter Chicken"
            value={form.name} onChange={e => set("name", e.target.value)}/>

          {/* Category */}
          <label style={S.label}>Category</label>
          <div style={S.catRow}>
            {[
              { key:"veg",    label:"🟢 Vegetarian" },
              { key:"nonveg", label:"🔴 Non-Veg"    },
            ].map(c => (
              <button key={c.key}
                style={{ ...S.catBtn, ...(form.category===c.key ? S.catActive : {}) }}
                onClick={() => set("category", c.key)}>
                {c.label}
              </button>
            ))}
          </div>

          {/* Cook time + Servings */}
          <div style={S.row2}>
            <div style={{ flex:1 }}>
              <label style={S.label}>Cook Time</label>
              <input style={S.input} placeholder="e.g. 30 mins"
                value={form.cookTime} onChange={e => set("cookTime", e.target.value)}/>
            </div>
            <div style={{ flex:1 }}>
              <label style={S.label}>Servings</label>
              <input style={S.input} placeholder="e.g. 4"
                value={form.servings} onChange={e => set("servings", e.target.value)}/>
            </div>
          </div>

          {/* Ingredients */}
          <label style={S.label}>Ingredients</label>
          {form.ingredients.map((ing, i) => (
            <div key={i} style={S.listRow}>
              <span style={S.bullet}>•</span>
              <input
                style={{ ...S.input, flex:1, marginBottom:0 }}
                placeholder={`Ingredient ${i+1}`}
                value={ing}
                onChange={e => updateIng(i, e.target.value)}
              />
              {form.ingredients.length > 1 && (
                <button style={S.removeBtn} onClick={() => removeIng(i)}>✕</button>
              )}
            </div>
          ))}
          <button style={S.addRowBtn} onClick={addIng}>+ Add ingredient</button>

          {/* Steps */}
          <label style={{ ...S.label, marginTop:18 }}>Steps</label>
          {form.steps.map((step, i) => (
            <div key={i} style={S.listRow}>
              <span style={{
                ...S.bullet, background:"#ec4899", color:"#fff",
                borderRadius:"50%", width:22, height:22,
                display:"flex", alignItems:"center", justifyContent:"center",
                fontSize:11, flexShrink:0,
              }}>{i+1}</span>
              <textarea
                style={{ ...S.input, flex:1, marginBottom:0, minHeight:60, resize:"vertical" }}
                placeholder={`Step ${i+1}`}
                value={step}
                onChange={e => updateStep(i, e.target.value)}
              />
              {form.steps.length > 1 && (
                <button style={S.removeBtn} onClick={() => removeStep(i)}>✕</button>
              )}
            </div>
          ))}
          <button style={S.addRowBtn} onClick={addStep}>+ Add step</button>

          {/* Save */}
          <button
            style={{ ...S.saveBtn, opacity: saving ? 0.6 : 1 }}
            onClick={handleSave}
            disabled={saving}
          >
            {saving ? "Saving..." : "Save Recipe 🌸"}
          </button>

        </div>
      </div>
    </div>
  );
}

// ─── CSS ──────────────────────────────────────────────────────────────────────
const CSS = `
  @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@500;700&family=DM+Sans:wght@300;400;500;600&display=swap');
  * { box-sizing: border-box; margin: 0; padding: 0; }
  @keyframes fadeUp  { from{opacity:0;transform:translateY(14px);} to{opacity:1;transform:translateY(0);} }
  @keyframes spin    { to{transform:rotate(360deg);} }
  @keyframes slideUp { from{transform:translateY(100%);} to{transform:translateY(0);} }
  input:focus, textarea:focus { outline: none; }
  button { font-family: 'DM Sans', sans-serif; }
  .recipe-card { transition: transform 0.18s ease, box-shadow 0.18s ease; animation: fadeUp 0.4s ease both; }
  .recipe-card:hover { transform: translateY(-2px); box-shadow: 0 8px 24px rgba(236,72,153,0.15) !important; }
`;

// ─── Styles ───────────────────────────────────────────────────────────────────
const S = {
  root: { minHeight:"100vh", background:"#fff8fb", fontFamily:"'DM Sans',sans-serif", paddingBottom:40 },

  header:      { display:"flex", alignItems:"center", gap:12, padding:"16px 16px 12px", background:"#fff", borderBottom:"1px solid #fce7f3", position:"sticky", top:0, zIndex:50 },
  backBtn:     { background:"#fce7f3", border:"none", borderRadius:10, width:36, height:36, fontSize:18, cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center", color:"#be185d", flexShrink:0 },
  headerTitle: { fontFamily:"'Playfair Display',serif", fontSize:20, color:"#be185d", marginBottom:1 },
  headerSub:   { fontSize:12, color:"#f9a8d4" },
  addBtn:      { background:"linear-gradient(135deg,#ec4899,#be185d)", color:"#fff", border:"none", borderRadius:12, padding:"8px 16px", fontSize:13, fontWeight:600, cursor:"pointer", flexShrink:0 },

  // Tabs
  tabWrap:       { display:"flex", background:"#fff", borderBottom:"1px solid #fce7f3", padding:"0 16px" },
  tabBtn:        { flex:1, padding:"13px 0", background:"none", border:"none", borderBottom:"2px solid transparent", fontSize:14, fontWeight:500, color:"#f9a8d4", cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center", gap:8, transition:"all 0.2s" },
  tabActive:     { color:"#ec4899", borderBottomColor:"#ec4899" },
  tabCount:      { fontSize:11, background:"#fce7f3", color:"#be185d", borderRadius:999, padding:"1px 8px", fontWeight:700 },
  tabCountActive:{ background:"#fce7f3", color:"#ec4899" },

  // Search
  searchWrap:  { display:"flex", alignItems:"center", margin:"12px 16px 0", background:"#fff", border:"1.5px solid #fce7f3", borderRadius:12, padding:"0 14px" },
  searchIcon:  { fontSize:15, marginRight:8 },
  searchInput: { flex:1, padding:"11px 0", background:"transparent", border:"none", fontSize:14, color:"#1a0a12", fontFamily:"'DM Sans',sans-serif" },
  clearSearch: { background:"none", border:"none", color:"#f9a8d4", fontSize:14, cursor:"pointer", padding:"4px" },

  // Pills
  pills:      { display:"flex", gap:8, padding:"12px 16px" },
  pill:       { padding:"6px 16px", borderRadius:999, border:"1.5px solid #fce7f3", background:"#fff", color:"#be185d", fontSize:13, fontWeight:500, cursor:"pointer", transition:"all 0.2s" },
  pillActive: { background:"linear-gradient(135deg,#ec4899,#be185d)", color:"#fff", border:"1.5px solid transparent" },

  // Explore banner
  exploreBanner: { display:"flex", alignItems:"center", gap:12, margin:"0 16px 4px", background:"linear-gradient(135deg,#fdf2f8,#fce7f3)", border:"1px solid #fce7f3", borderRadius:14, padding:"12px 16px" },
  exploreIcon:   { fontSize:28, flexShrink:0 },
  exploreTxt:    { fontSize:14, fontWeight:600, color:"#be185d", marginBottom:2 },
  exploreSub:    { fontSize:12, color:"#f9a8d4" },

  // List
  list:      { padding:"0 16px" },
  centerBox: { display:"flex", flexDirection:"column", alignItems:"center", padding:"60px 20px", gap:10 },
  spinner:   { width:30, height:30, border:"3px solid #fce7f3", borderTop:"3px solid #ec4899", borderRadius:"50%", animation:"spin 0.8s linear infinite" },
  emptyIcon: { fontSize:48 },
  emptyTitle:{ fontSize:16, fontWeight:600, color:"#be185d" },
  emptySub:  { fontSize:13, color:"#f9a8d4" },

  // Card
  card:            { display:"flex", alignItems:"center", gap:14, background:"#fff", borderRadius:16, padding:12, marginBottom:10, boxShadow:"0 2px 12px rgba(236,72,153,0.07)", cursor:"pointer", position:"relative" },
  cardImgWrap:     { position:"relative", flexShrink:0 },
  cardImg:         { width:80, height:80, borderRadius:12, objectFit:"cover", display:"block" },
  cardImgPlaceholder:{ width:80, height:80, borderRadius:12, background:"#fce7f3", display:"flex", alignItems:"center", justifyContent:"center", fontSize:32 },
  vegDot:          { position:"absolute", top:6, left:6, width:10, height:10, borderRadius:"50%", border:"1.5px solid #fff" },
  cardBody:        { flex:1, minWidth:0 },
  cardName:        { fontFamily:"'Playfair Display',serif", fontSize:15, color:"#1a0a12", marginBottom:3, fontWeight:600 },
  cardAuthor:      { fontSize:11, color:"#f9a8d4", marginBottom:4 },
  cardMeta:        { display:"flex", gap:6, flexWrap:"wrap", marginBottom:4 },
  metaChip:        { fontSize:11, background:"#fce7f3", color:"#be185d", borderRadius:6, padding:"2px 8px", fontWeight:500 },
  cardIngCount:    { fontSize:11, color:"#f9a8d4" },
  deleteBtn:       { background:"rgba(239,68,68,0.08)", border:"none", borderRadius:8, width:32, height:32, fontSize:14, cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 },

  // Sheet
  sheetOverlay:{ position:"fixed", inset:0, background:"rgba(0,0,0,0.45)", zIndex:200, display:"flex", alignItems:"flex-end" },
  sheet:       { background:"#fff", borderRadius:"24px 24px 0 0", width:"100%", maxHeight:"92vh", animation:"slideUp 0.35s cubic-bezier(.22,1,.36,1) both", display:"flex", flexDirection:"column" },
  sheetHandle: { width:40, height:4, background:"#fce7f3", borderRadius:99, margin:"12px auto 0" },
  sheetScroll: { overflowY:"auto", padding:"0 20px 40px", flex:1 },
  sheetHeader: { display:"flex", alignItems:"center", justifyContent:"space-between", padding:"16px 0 14px" },
  sheetTitle:  { fontFamily:"'Playfair Display',serif", fontSize:22, color:"#be185d" },
  sheetClose:  { background:"#fce7f3", border:"none", borderRadius:10, width:32, height:32, fontSize:16, cursor:"pointer", color:"#be185d", display:"flex", alignItems:"center", justifyContent:"center" },

  photoUpload:     { width:"100%", height:160, border:"2px dashed #fce7f3", borderRadius:16, overflow:"hidden", cursor:"pointer", marginBottom:16 },
  photoPreview:    { width:"100%", height:"100%", objectFit:"cover" },
  photoPlaceholder:{ width:"100%", height:"100%", display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", background:"#fff8fb" },
  uploadProgress:  { width:"100%", height:"100%", display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", gap:12, background:"#fff8fb" },
  uploadBar:       { height:"100%", background:"linear-gradient(90deg,#ec4899,#be185d)", borderRadius:99, transition:"width 0.2s" },
  uploadPct:       { fontSize:13, color:"#ec4899", fontWeight:600 },

  label:    { display:"block", fontSize:12, fontWeight:600, color:"#be185d", marginBottom:6, letterSpacing:"0.5px", textTransform:"uppercase" },
  input:    { width:"100%", padding:"12px 14px", background:"#fff8fb", border:"1.5px solid #fce7f3", borderRadius:12, fontSize:14, color:"#1a0a12", fontFamily:"'DM Sans',sans-serif", marginBottom:14 },
  catRow:   { display:"flex", gap:10, marginBottom:14 },
  catBtn:   { flex:1, padding:"10px 0", borderRadius:12, border:"1.5px solid #fce7f3", background:"#fff8fb", fontSize:13, fontWeight:500, cursor:"pointer", color:"#be185d", transition:"all 0.2s" },
  catActive:{ background:"linear-gradient(135deg,#ec4899,#be185d)", color:"#fff", border:"1.5px solid transparent" },
  row2:     { display:"flex", gap:12 },
  listRow:  { display:"flex", alignItems:"flex-start", gap:10, marginBottom:10 },
  bullet:   { fontSize:18, color:"#ec4899", lineHeight:"42px", flexShrink:0 },
  removeBtn:{ background:"#fce7f3", border:"none", borderRadius:8, width:32, height:32, fontSize:12, cursor:"pointer", color:"#be185d", marginTop:5, flexShrink:0 },
  addRowBtn:{ background:"none", border:"1.5px dashed #fce7f3", borderRadius:10, padding:"8px 14px", fontSize:13, color:"#ec4899", fontWeight:500, cursor:"pointer", width:"100%", marginBottom:6 },
  saveBtn:  { width:"100%", padding:16, background:"linear-gradient(135deg,#ec4899,#be185d)", color:"#fff", border:"none", borderRadius:14, fontSize:15, fontWeight:600, cursor:"pointer", marginTop:24, boxShadow:"0 6px 20px rgba(236,72,153,0.3)" },
};