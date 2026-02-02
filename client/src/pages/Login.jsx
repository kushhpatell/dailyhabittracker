import React from "react";
import { Link, useNavigate } from "react-router-dom";
import { api } from "../api.js";

export default function Login({ onAuthed }) {
  const nav = useNavigate();
  const [username, setUsername] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [error, setError] = React.useState("");

  async function submit(e) {
    e.preventDefault();
    setError("");
    try {
      const { data } = await api.post("/api/auth/login", { username, password });
      if (data?.user?.username) {
        localStorage.setItem("username", data.user.username);
      }
      onAuthed(data.token);
      nav("/dashboard");
    } catch (err) {
      setError(
        err?.response?.data?.error ||
          err?.message ||
          "Login failed"
      );
    }
  }

  return (
    <div className="authHero">
      {/* top nav removed as requested */}

      <div className="authGrid">
        <section className="authLeft">
          <h1 className="authTitle">Wake Up Early, Live Your Best Day</h1>
          <p className="authSubtitle">
            Track daily habits, build streaks, and stay consistent — one day at a time.
          </p>
          <div className="heroArt" aria-hidden="true">
            <div className="cloud c1" />
            <div className="cloud c2" />
            <div className="sun" />
            <div className="hill h1" />
            <div className="hill h2" />
            <div className="phoneMock">
              <div className="phoneNotch" />
              <div className="phoneCard">
                <div className="phoneLine strong">5:30</div>
                <div className="phoneLine muted">Morning check-in</div>
                <div className="phoneChip">Drink water</div>
              </div>
            </div>
          </div>
        </section>

        <section className="authRight">
          <div className="authCard">
            <h2 className="authCardTitle">Welcome back</h2>
            <p className="muted">Sign in to continue</p>

            <form onSubmit={submit} className="stack">
              <label>
                Username
                <input
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  required
                  autoComplete="username"
                  placeholder="e.g. kp703"
                />
              </label>
              <label>
                Password
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  autoComplete="current-password"
                  placeholder="••••••••"
                />
              </label>
              {error && <p className="error">{error}</p>}
              <button type="submit" className="authPrimary">Login</button>
              <p className="muted">
                Don&apos;t have an account? <Link to="/register">Sign up</Link>
              </p>
            </form>
          </div>
        </section>
      </div>
    </div>
  );
}

