import React from "react";
import {
  Link,
  Navigate,
  Route,
  Routes,
  useLocation,
  useNavigate,
} from "react-router-dom";
import Login from "./pages/Login.jsx";
import Register from "./pages/Register.jsx";
import Dashboard from "./pages/Dashboard.jsx";
import { setAuthToken } from "./api.js";

export const AuthContext = React.createContext({ token: "", setToken: () => {} });

function useAuth() {
  const [token, setTokenState] = React.useState(
    () => localStorage.getItem("token") || ""
  );

  React.useEffect(() => setAuthToken(token || null), [token]);

  const setToken = (t) => {
    const next = t || "";
    if (next) localStorage.setItem("token", next);
    else localStorage.removeItem("token");
    setTokenState(next);
  };

  return { token, setToken };
}

export default function App() {
  const nav = useNavigate();
  const location = useLocation();
  const auth = useAuth();
  const isAuthPage =
    location.pathname === "/login" || location.pathname === "/register";
  const isDashboard = location.pathname.startsWith("/dashboard");

  return (
    <AuthContext.Provider value={auth}>
      <div
        className={
          "container " +
          (isAuthPage ? "containerAuth" : isDashboard ? "containerDash" : "")
        }
      >
        {!isAuthPage && !isDashboard && (
          <header className="topbar">
            <div>
              <div className="eyebrow">Daily Habit Tracker</div>
              <div className="title">Full-stack project</div>
            </div>
            <nav className="nav">
              {auth.token ? (
                <button
                  className="ghost"
                  onClick={() => {
                    auth.setToken("");
                    nav("/login");
                  }}
                  type="button"
                >
                  Log out
                </button>
              ) : (
                <>
                  <Link to="/login">Login</Link>
                  <Link to="/register">Register</Link>
                </>
              )}
            </nav>
          </header>
        )}

        <Routes>
          <Route
            path="/"
            element={
              auth.token ? (
                <Navigate to="/dashboard" />
              ) : (
                <Navigate to="/login" />
              )
            }
          />
          <Route
            path="/login"
            element={<Login onAuthed={(t) => auth.setToken(t)} />}
          />
          <Route
            path="/register"
            element={<Register onAuthed={(t) => auth.setToken(t)} />}
          />
          <Route
            path="/dashboard"
            element={auth.token ? <Dashboard /> : <Navigate to="/login" />}
          />
          <Route path="*" element={<Navigate to="/" />} />
        </Routes>
      </div>
    </AuthContext.Provider>
  );
}

