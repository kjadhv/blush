import { useEffect, useState } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { onAuthStateChanged } from "firebase/auth";
import { auth } from "./firebase";
import BoardPage from "./pages/BoardPage";
import Hello     from "./pages/Hello";
import Auth      from "./pages/Auth";
import Dashboard from "./pages/Dashboard";
import ChatPage  from "./pages/ChatPage";
import RecipesPage  from "./pages/RecipesPage";
import RecipeDetail from "./pages/RecipeDetail";
import ExpensesPage from "./pages/ExpensesPage";
export default function App() {
  const [user,    setUser]    = useState(undefined);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => {
      setUser(u);
      setLoading(false);
    });
    return () => unsub();
  }, []);

  if (loading) return (
    <div style={S.splash}>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      <div style={S.spinner} />
    </div>
  );

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/"              element={<Hello />} />
        <Route path="/auth"          element={user ? <Navigate to="/dashboard" /> : <Auth />} />
        <Route path="/dashboard"     element={user ? <Dashboard user={user} /> : <Navigate to="/auth" />} />
        <Route path="/chat/:phone"   element={user ? <ChatPage /> : <Navigate to="/auth" />} />
        <Route path="/board/:id" element={user ? <BoardPage /> : <Navigate to="/auth" />} />
        <Route path="*"              element={<Navigate to="/" />} />
        <Route path="/recipes"     element={<RecipesPage />} />
<Route path="/recipes/:id" element={<RecipeDetail />} />
<Route path="/expenses" element={<ExpensesPage />} />
      </Routes>
    </BrowserRouter>
  );
}

const S = {
  splash: {
    minHeight:"100vh", display:"flex",
    alignItems:"center", justifyContent:"center",
    background:"linear-gradient(135deg,#fce4ec,#fce7f3)",
  },
  spinner: {
    width:40, height:40,
    border:"3px solid #fbcfe8",
    borderTop:"3px solid #ec4899",
    borderRadius:"50%",
    animation:"spin 0.8s linear infinite",
  },
};