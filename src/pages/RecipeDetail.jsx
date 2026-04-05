import { useState } from "react";
import { useNavigate, useLocation, useParams } from "react-router-dom";
import { db } from "../firebase";
import { doc, getDoc } from "firebase/firestore";

export default function RecipeDetail() {
  const navigate  = useNavigate();
  const location  = useLocation();
  const { id }    = useParams();

  // Recipe comes via navigation state (instant) or fetched if direct URL
  const [recipe,      setRecipe]      = useState(location.state?.recipe || null);
  const [fetching,    setFetching]    = useState(!location.state?.recipe);
  const [activeTab,   setActiveTab]   = useState("ingredients"); // ingredients | steps
  const [checkedIngs, setCheckedIngs] = useState(new Set());
  const [checkedSteps,setCheckedSteps]= useState(new Set());

  // Fetch if navigated directly (no state)
  useState(() => {
    if (recipe || !id) return;
    (async () => {
      try {
        const snap = await getDoc(doc(db, "recipes", id));
        if (snap.exists()) setRecipe({ id: snap.id, ...snap.data() });
      } catch (e) { console.error(e); }
      finally { setFetching(false); }
    })();
  });

  const toggleIng  = (i) => setCheckedIngs(s  => { const n = new Set(s); n.has(i) ? n.delete(i) : n.add(i); return n; });
  const toggleStep = (i) => setCheckedSteps(s => { const n = new Set(s); n.has(i) ? n.delete(i) : n.add(i); return n; });

  if (fetching) return (
    <div style={S.loadWrap}>
      <style>{CSS}</style>
      <div style={S.spinner} />
    </div>
  );

  if (!recipe) return (
    <div style={S.loadWrap}>
      <style>{CSS}</style>
      <p style={{ color:"#be185d" }}>Recipe not found.</p>
      <button style={S.backPill} onClick={() => navigate(-1)}>← Go back</button>
    </div>
  );

  const isVeg      = recipe.category === "veg";
  const ingDone    = checkedIngs.size;
  const stepsDone  = checkedSteps.size;
  const ingTotal   = recipe.ingredients?.length || 0;
  const stepsTotal = recipe.steps?.length || 0;

  return (
    <div style={S.root}>
      <style>{CSS}</style>

      {/* ── Hero photo ── */}
      <div style={S.heroWrap}>
        {recipe.photo ? (
          <img src={recipe.photo} alt={recipe.name} style={S.heroImg} />
        ) : (
          <div style={S.heroPlaceholder}>
            <span style={{ fontSize:64 }}>{isVeg ? "🥦" : "🍗"}</span>
          </div>
        )}

        {/* Gradient overlay */}
        <div style={S.heroOverlay} />

        {/* Back button */}
        <button style={S.backBtn} onClick={() => navigate(-1)}>←</button>

        {/* Veg badge */}
        <div style={{ ...S.vegBadge, background: isVeg ? "#16a34a" : "#dc2626" }}>
          {isVeg ? "🟢 Veg" : "🔴 Non-Veg"}
        </div>
      </div>

      {/* ── Content card ── */}
      <div style={S.contentCard}>

        {/* Name + meta */}
        <h1 style={S.recipeName}>{recipe.name}</h1>

        <div style={S.metaRow}>
          {recipe.cookTime && (
            <div style={S.metaItem}>
              <span style={S.metaEmoji}>⏱</span>
              <div>
                <p style={S.metaVal}>{recipe.cookTime}</p>
                <p style={S.metaLbl}>Cook Time</p>
              </div>
            </div>
          )}
          {recipe.servings && (
            <div style={S.metaItem}>
              <span style={S.metaEmoji}>🍽</span>
              <div>
                <p style={S.metaVal}>{recipe.servings}</p>
                <p style={S.metaLbl}>Servings</p>
              </div>
            </div>
          )}
          {ingTotal > 0 && (
            <div style={S.metaItem}>
              <span style={S.metaEmoji}>🧂</span>
              <div>
                <p style={S.metaVal}>{ingTotal}</p>
                <p style={S.metaLbl}>Ingredients</p>
              </div>
            </div>
          )}
          {stepsTotal > 0 && (
            <div style={S.metaItem}>
              <span style={S.metaEmoji}>📋</span>
              <div>
                <p style={S.metaVal}>{stepsTotal}</p>
                <p style={S.metaLbl}>Steps</p>
              </div>
            </div>
          )}
        </div>

        {/* Tabs */}
        <div style={S.tabs}>
          <button
            style={{ ...S.tab, ...(activeTab === "ingredients" ? S.tabActive : {}) }}
            onClick={() => setActiveTab("ingredients")}
          >
            Ingredients
            {ingTotal > 0 && (
              <span style={{ ...S.tabBadge, background: activeTab==="ingredients" ? "#fff" : "#fce7f3", color: activeTab==="ingredients" ? "#ec4899" : "#be185d" }}>
                {ingDone}/{ingTotal}
              </span>
            )}
          </button>
          <button
            style={{ ...S.tab, ...(activeTab === "steps" ? S.tabActive : {}) }}
            onClick={() => setActiveTab("steps")}
          >
            Steps
            {stepsTotal > 0 && (
              <span style={{ ...S.tabBadge, background: activeTab==="steps" ? "#fff" : "#fce7f3", color: activeTab==="steps" ? "#ec4899" : "#be185d" }}>
                {stepsDone}/{stepsTotal}
              </span>
            )}
          </button>
        </div>

        {/* ── Ingredients list ── */}
        {activeTab === "ingredients" && (
          <div style={S.section}>
            {ingTotal === 0 ? (
              <p style={S.noItems}>No ingredients added.</p>
            ) : (
              <>
                {/* Progress bar */}
                <div style={S.progressBg}>
                  <div style={{ ...S.progressFill, width: ingTotal ? `${(ingDone/ingTotal)*100}%` : "0%" }} />
                </div>
                <p style={S.progressLbl}>
                  {ingDone === ingTotal && ingTotal > 0 ? "All ingredients ready! 🎉" : `${ingDone} of ${ingTotal} checked`}
                </p>

                {recipe.ingredients.map((ing, i) => (
                  <div
                    key={i}
                    style={{ ...S.ingRow, ...(checkedIngs.has(i) ? S.ingRowDone : {}) }}
                    onClick={() => toggleIng(i)}
                    className="ing-row"
                  >
                    <div style={{ ...S.checkbox, ...(checkedIngs.has(i) ? S.checkboxDone : {}) }}>
                      {checkedIngs.has(i) && <span style={S.checkmark}>✓</span>}
                    </div>
                    <span style={{ ...S.ingText, ...(checkedIngs.has(i) ? S.ingTextDone : {}) }}>
                      {ing}
                    </span>
                  </div>
                ))}
              </>
            )}
          </div>
        )}

        {/* ── Steps list ── */}
        {activeTab === "steps" && (
          <div style={S.section}>
            {stepsTotal === 0 ? (
              <p style={S.noItems}>No steps added.</p>
            ) : (
              <>
                {/* Progress bar */}
                <div style={S.progressBg}>
                  <div style={{ ...S.progressFill, width: stepsTotal ? `${(stepsDone/stepsTotal)*100}%` : "0%" }} />
                </div>
                <p style={S.progressLbl}>
                  {stepsDone === stepsTotal && stepsTotal > 0 ? "All done! Enjoy your meal 🍽️" : `${stepsDone} of ${stepsTotal} done`}
                </p>

                {recipe.steps.map((step, i) => (
                  <div
                    key={i}
                    style={{ ...S.stepRow, ...(checkedSteps.has(i) ? S.stepRowDone : {}) }}
                    onClick={() => toggleStep(i)}
                    className="step-row"
                  >
                    <div style={{ ...S.stepNum, ...(checkedSteps.has(i) ? S.stepNumDone : {}) }}>
                      {checkedSteps.has(i) ? "✓" : i + 1}
                    </div>
                    <p style={{ ...S.stepText, ...(checkedSteps.has(i) ? S.stepTextDone : {}) }}>
                      {step}
                    </p>
                  </div>
                ))}
              </>
            )}
          </div>
        )}

      </div>
    </div>
  );
}

// ─── CSS ──────────────────────────────────────────────────────────────────────
const CSS = `
  @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@500;700&family=DM+Sans:wght@300;400;500;600&display=swap');
  * { box-sizing: border-box; margin: 0; padding: 0; }
  @keyframes spin   { to{transform:rotate(360deg);} }
  @keyframes fadeUp { from{opacity:0;transform:translateY(12px);} to{opacity:1;transform:translateY(0);} }
  button { font-family: 'DM Sans', sans-serif; cursor: pointer; border: none; }
  .ing-row  { transition: all 0.2s ease; cursor: pointer; }
  .ing-row:hover  { background: #fff0f5 !important; }
  .step-row { transition: all 0.2s ease; cursor: pointer; }
  .step-row:hover { background: #fff0f5 !important; }
`;

// ─── Styles ───────────────────────────────────────────────────────────────────
const S = {
  root:    { minHeight:"100vh", background:"#fff8fb", fontFamily:"'DM Sans',sans-serif", paddingBottom:60 },
  loadWrap:{ minHeight:"100vh", display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", gap:16, background:"#fff8fb" },
  spinner: { width:32, height:32, border:"3px solid #fce7f3", borderTop:"3px solid #ec4899", borderRadius:"50%", animation:"spin 0.8s linear infinite" },
  backPill:{ padding:"8px 18px", background:"#fce7f3", color:"#be185d", borderRadius:10, fontSize:14, fontWeight:500 },

  // Hero
  heroWrap:      { position:"relative", height:280, overflow:"hidden" },
  heroImg:       { width:"100%", height:"100%", objectFit:"cover" },
  heroPlaceholder:{ width:"100%", height:"100%", background:"linear-gradient(135deg,#fce7f3,#fdf2f8)", display:"flex", alignItems:"center", justifyContent:"center" },
  heroOverlay:   { position:"absolute", inset:0, background:"linear-gradient(to bottom, rgba(0,0,0,0.25) 0%, transparent 40%, rgba(0,0,0,0.0) 100%)" },
  backBtn:       { position:"absolute", top:16, left:16, background:"rgba(255,255,255,0.85)", border:"none", borderRadius:10, width:38, height:38, fontSize:18, display:"flex", alignItems:"center", justifyContent:"center", color:"#be185d", backdropFilter:"blur(8px)" },
  vegBadge:      { position:"absolute", top:16, right:16, padding:"4px 12px", borderRadius:999, fontSize:12, fontWeight:600, color:"#fff" },

  // Content card
  contentCard: { background:"#fff", borderRadius:"24px 24px 0 0", marginTop:-24, position:"relative", padding:"24px 20px 0", minHeight:"calc(100vh - 256px)" },
  recipeName:  { fontFamily:"'Playfair Display',serif", fontSize:26, color:"#1a0a12", marginBottom:16, lineHeight:1.3 },

  // Meta row
  metaRow:  { display:"flex", gap:0, marginBottom:24, background:"#fff8fb", borderRadius:16, overflow:"hidden", border:"1px solid #fce7f3" },
  metaItem: { flex:1, padding:"12px 8px", display:"flex", flexDirection:"column", alignItems:"center", gap:4, borderRight:"1px solid #fce7f3" },
  metaEmoji:{ fontSize:18 },
  metaVal:  { fontSize:14, fontWeight:700, color:"#be185d", textAlign:"center" },
  metaLbl:  { fontSize:10, color:"#f9a8d4", textAlign:"center", textTransform:"uppercase", letterSpacing:"0.5px" },

  // Tabs
  tabs:      { display:"flex", background:"#fff8fb", borderRadius:14, padding:4, marginBottom:20, gap:4 },
  tab:       { flex:1, padding:"10px 0", borderRadius:11, background:"transparent", border:"none", fontSize:14, fontWeight:500, color:"#f9a8d4", display:"flex", alignItems:"center", justifyContent:"center", gap:8, transition:"all 0.2s" },
  tabActive: { background:"linear-gradient(135deg,#ec4899,#be185d)", color:"#fff", boxShadow:"0 4px 14px rgba(236,72,153,0.25)" },
  tabBadge:  { fontSize:11, fontWeight:700, borderRadius:999, padding:"1px 7px" },

  // Section
  section: { paddingBottom:20, animation:"fadeUp 0.3s ease both" },
  noItems: { textAlign:"center", color:"#f9a8d4", fontSize:14, padding:"40px 0" },

  // Progress
  progressBg:   { height:6, background:"#fce7f3", borderRadius:99, marginBottom:8, overflow:"hidden" },
  progressFill: { height:"100%", background:"linear-gradient(90deg,#ec4899,#be185d)", borderRadius:99, transition:"width 0.4s ease" },
  progressLbl:  { fontSize:12, color:"#f9a8d4", marginBottom:16, textAlign:"right" },

  // Ingredient rows
  ingRow:     { display:"flex", alignItems:"center", gap:14, padding:"14px 0", borderBottom:"1px solid #fff8fb", borderRadius:8 },
  ingRowDone: { opacity:0.5 },
  checkbox:   { width:22, height:22, borderRadius:6, border:"1.5px solid #fce7f3", flexShrink:0, display:"flex", alignItems:"center", justifyContent:"center", transition:"all 0.2s" },
  checkboxDone:{ background:"linear-gradient(135deg,#ec4899,#be185d)", border:"none" },
  checkmark:  { color:"#fff", fontSize:12, fontWeight:700 },
  ingText:    { fontSize:14, color:"#1a0a12", flex:1, lineHeight:1.4 },
  ingTextDone:{ textDecoration:"line-through", color:"#f9a8d4" },

  // Step rows
  stepRow:     { display:"flex", alignItems:"flex-start", gap:14, padding:"16px 0", borderBottom:"1px solid #fff8fb" },
  stepRowDone: { opacity:0.5 },
  stepNum:     { width:28, height:28, borderRadius:"50%", background:"#fce7f3", color:"#ec4899", fontSize:13, fontWeight:700, display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0, transition:"all 0.2s", marginTop:2 },
  stepNumDone: { background:"linear-gradient(135deg,#ec4899,#be185d)", color:"#fff" },
  stepText:    { fontSize:14, color:"#1a0a12", flex:1, lineHeight:1.6 },
  stepTextDone:{ textDecoration:"line-through", color:"#f9a8d4" },
};