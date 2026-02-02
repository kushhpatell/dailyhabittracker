import React from "react";
import { Link, useNavigate } from "react-router-dom";
import { api } from "../api.js";

export default function Register({ onAuthed }) {
  const nav = useNavigate();
  const [username, setUsername] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [confirm, setConfirm] = React.useState("");
  const [error, setError] = React.useState("");

  async function submit(e) {
    e.preventDefault();
    setError("");
    if (password !== confirm) {
      setError("Passwords do not match.");
      return;
    }
    try {
      const { data } = await api.post("/api/auth/register", {
        username,
        password,
      });
      onAuthed(data.token);
      nav("/dashboard");
    } catch (err) {
      setError(
        err?.response?.data?.error ||
          err?.message ||
          "Registration failed"
      );
    }
  }

  return (
    <div className="authHero">
      {/* top nav removed as requested */}

      <div className="authGrid">
        <section className="authLeft">
          <h1 className="authTitle">Start your best mornings</h1>
          <p className="authSubtitle">
            Create an account and build a daily routine with streaks, progress, and reminders.
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
                <div className="phoneLine strong">New</div>
                <div className="phoneLine muted">Create habits</div>
                <div className="phoneChip">Exercise</div>
              </div>
            </div>
          </div>
        </section>

        <section className="authRight">
          <div className="authCard">
            <h2 className="authCardTitle">Create account</h2>
            <p className="muted">It only takes a minute</p>

            <form onSubmit={submit} className="stack">
              <label>
                Username
                <input
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  required
                  minLength={3}
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
                  minLength={6}
                  autoComplete="new-password"
                  placeholder="Min 6 characters"
                />
              </label>
              <label>
                Confirm password
                <input
                  type="password"
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                  required
                  minLength={6}
                  autoComplete="new-password"
                  placeholder="Repeat password"
                />
              </label>
              {error && <p className="error">{error}</p>}
              <button type="submit" className="authPrimary">Sign up</button>
              <p className="muted">
                Already have an account? <Link to="/login">Login</Link>
              </p>
            </form>
          </div>
        </section>
      </div>
    </div>
  );
}

