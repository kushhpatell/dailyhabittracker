import React from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../api.js";
import { AuthContext } from "../App.jsx";

const today = new Date().toISOString().slice(0, 10);

function calcStreak(checks) {
  if (!checks) return 0;
  const set = new Set(Object.keys(checks).filter((d) => checks[d]));
  let s = 0;
  const cursor = new Date(today);
  while (set.has(cursor.toISOString().slice(0, 10))) {
    s += 1;
    cursor.setDate(cursor.getDate() - 1);
  }
  return s;
}

function habitKind(habit) {
  const name = String(habit?.name || "").toLowerCase();
  if (name.includes("gym") || name.includes("workout") || name.includes("exercise")) return "gym";
  if (name.includes("water") || name.includes("hydration")) return "water";
  return "general";
}

function formatDateDDMMYYYY(dateStr) {
  // Convert YYYY-MM-DD to DD-MM-YYYY
  if (!dateStr || typeof dateStr !== "string") return dateStr;
  const parts = dateStr.split("-");
  if (parts.length === 3) {
    return `${parts[2]}-${parts[1]}-${parts[0]}`;
  }
  return dateStr;
}

export default function Dashboard() {
  const auth = React.useContext(AuthContext);
  const nav = useNavigate();
  const [habits, setHabits] = React.useState([]);
  const [q, setQ] = React.useState("");
  const [filter, setFilter] = React.useState("all");
  const [error, setError] = React.useState("");
  const [toggleBusyId, setToggleBusyId] = React.useState(null);
  const [section, setSection] = React.useState("dashboard"); // dashboard | habits | analytics | settings
  const [analyticsDays, setAnalyticsDays] = React.useState([]);
  const [analyticsLoading, setAnalyticsLoading] = React.useState(false);
  const [modalOpen, setModalOpen] = React.useState(false);
  const [editing, setEditing] = React.useState(null); // habit or null
  const [emojiOpen, setEmojiOpen] = React.useState(false);
  const [detailsOpen, setDetailsOpen] = React.useState(false);
  const [activeHabit, setActiveHabit] = React.useState(null);
  const [scheduleDays, setScheduleDays] = React.useState([]);
  const [scheduleTime, setScheduleTime] = React.useState("");
  const [exercises, setExercises] = React.useState([]);
  const [exForm, setExForm] = React.useState({ name: "", sets: 3, reps: 10, notes: "" });
  const [waterGoalMl, setWaterGoalMl] = React.useState(0);
  const [form, setForm] = React.useState({
    name: "",
    tag: "",
    color: "#8b5cf6",
    notes: "",
  });

  // Settings state
  const [me, setMe] = React.useState({ id: "", username: "" });
  const [theme, setTheme] = React.useState(() => localStorage.getItem("theme") || "light");
  const [newUsername, setNewUsername] = React.useState("");
  const [curPw, setCurPw] = React.useState("");
  const [newPw, setNewPw] = React.useState("");
  const [newPw2, setNewPw2] = React.useState("");
  const [settingsMsg, setSettingsMsg] = React.useState("");
  const [sideName, setSideName] = React.useState(
    () => localStorage.getItem("username") || ""
  );

  // Manual analytics input
  const [manualDate, setManualDate] = React.useState(
    () => new Date().toISOString().slice(0, 10)
  );
  const [manualHabitId, setManualHabitId] = React.useState("");

  // Date detail modal
  const [dateDetailOpen, setDateDetailOpen] = React.useState(false);
  const [selectedDateData, setSelectedDateData] = React.useState(null);
  const [unmarkBusyId, setUnmarkBusyId] = React.useState(null);

  React.useEffect(() => {
    document.documentElement.dataset.theme = theme;
    localStorage.setItem("theme", theme);
  }, [theme]);

  const EMOJIS = React.useMemo(
    () => [
      "💧","🏃","💪","🧘","📚","🧠","🍎","🥗","🥤","☕","🛌","⏰","🧹","🧼","🪥","🧴",
      "🎯","✅","📝","📅","📈","🔥","🌱","🌞","🌙","💊","🧎","🚶","🚴","🏋️","🎵","🎧",
      "💻","🧑‍💻","🗣️","📵","🧊","🍫","🚰","🫶","❤️","🙏","🧘‍♂️","🧘‍♀️","🧴","🧽",
    ],
    []
  );

  async function load() {
    const { data } = await api.get("/api/habits");
    setHabits(data.habits || []);
  }

  React.useEffect(() => {
    load().catch((e) => setError(e?.response?.data?.error || "Failed to load"));
    // also hydrate username for sidebar greeting
    api
      .get("/api/auth/me")
      .then((res) => {
        if (res?.data?.user?.username) {
          setSideName(res.data.user.username);
          localStorage.setItem("username", res.data.user.username);
        }
      })
      .catch(() => {
        // ignore, user might not be fully logged in yet
      });
  }, []);

  async function loadAnalytics() {
    setError("");
    setAnalyticsLoading(true);
    try {
      const { data } = await api.get("/api/analytics/daily?days=30&onlyActive=true");
      const days = data.days || [];
      setAnalyticsDays(days);
      return days;
    } catch (e) {
      setError(e?.response?.data?.error || "Failed to load analytics");
      return [];
    } finally {
      setAnalyticsLoading(false);
    }
  }

  async function addManualRecord() {
    setError("");
    if (!manualDate || !manualHabitId) return;
    const habit = habits.find((h) => h._id === manualHabitId);
    if (!habit) return;
    try {
      await api.post(`/api/habits/${habit._id}/toggle`, {
        date: manualDate,
        done: true,
      });
      await load();
      await loadAnalytics();
    } catch (e) {
      setError(e?.response?.data?.error || "Failed to add manual record");
    }
  }

  async function unmarkHabitForDate(habitId, dateStr) {
    setError("");
    setUnmarkBusyId(habitId);
    try {
      await api.post(`/api/habits/${habitId}/toggle`, {
        date: dateStr,
        done: false,
      });
      await load();
      const days = await loadAnalytics();
      const updated = days.find((d) => d.date === dateStr);
      if (updated) {
        setSelectedDateData(updated);
      } else {
        setDateDetailOpen(false);
      }
    } catch (e) {
      setError(e?.response?.data?.error || "Failed to unmark habit");
    } finally {
      setUnmarkBusyId(null);
    }
  }

  async function loadMe() {
    setSettingsMsg("");
    try {
      const { data } = await api.get("/api/auth/me");
      setMe(data.user);
      setNewUsername(data.user.username);
      setSideName(data.user.username);
      localStorage.setItem("username", data.user.username);
    } catch (e) {
      const status = e?.response?.status;
      if (status === 401) {
        auth.setToken("");
        nav("/login");
        return;
      }
      setError(e?.response?.data?.error || "Failed to load profile");
    }
  }

  async function saveUsername() {
    setError("");
    setSettingsMsg("");
    try {
      const { data } = await api.post("/api/auth/update-username", { username: newUsername });
      // update token so it carries new username
      auth.setToken(data.token);
      setMe(data.user);
      setSideName(data.user.username);
      localStorage.setItem("username", data.user.username);
      setSettingsMsg("Username updated.");
    } catch (e) {
      setError(e?.response?.data?.error || "Failed to update username");
    }
  }

  async function changePassword() {
    setError("");
    setSettingsMsg("");
    if (!curPw || !newPw) {
      setError("Please fill current + new password.");
      return;
    }
    if (newPw !== newPw2) {
      setError("New passwords do not match.");
      return;
    }
    try {
      await api.post("/api/auth/change-password", {
        currentPassword: curPw,
        newPassword: newPw,
      });
      setCurPw("");
      setNewPw("");
      setNewPw2("");
      setSettingsMsg("Password updated.");
    } catch (e) {
      setError(e?.response?.data?.error || "Failed to change password");
    }
  }

  async function toggle(habit, done) {
    setError("");
    setToggleBusyId(habit._id);
    try {
      await api.post(`/api/habits/${habit._id}/toggle`, { date: today, done });
      await load();
    } catch (e) {
      setError(
        e?.response?.data?.error ||
          e?.message ||
          "Failed to update habit"
      );
    } finally {
      setToggleBusyId(null);
    }
  }

  async function openHabitDetails(habit) {
    try {
      const { data } = await api.get(`/api/habits/${habit._id}`);
      const h = data.habit;
      setActiveHabit(h);
      setScheduleDays(h.schedule?.days || []);
      setScheduleTime(h.schedule?.time || "");
      setExercises(h.exercises || []);
      setWaterGoalMl(Number(h.waterGoalMl || 0));
      setExForm({ name: "", sets: 3, reps: 10, notes: "" });
      setDetailsOpen(true);
    } catch (e) {
      setError(e?.response?.data?.error || "Failed to open habit");
    }
  }

  async function saveSchedule() {
    if (!activeHabit?._id) return;
    try {
      await api.patch(`/api/habits/${activeHabit._id}`, {
        schedule: { days: scheduleDays, time: scheduleTime || "" },
      });
      await openHabitDetails(activeHabit);
      await load();
    } catch (e) {
      setError(e?.response?.data?.error || "Failed to save schedule");
    }
  }

  async function saveWaterGoal() {
    if (!activeHabit?._id) return;
    try {
      await api.patch(`/api/habits/${activeHabit._id}`, {
        waterGoalMl: Number(waterGoalMl || 0),
      });
      await openHabitDetails(activeHabit);
      await load();
    } catch (e) {
      setError(e?.response?.data?.error || "Failed to save water goal");
    }
  }

  async function addExercise() {
    if (!activeHabit?._id) return;
    const name = String(exForm.name || "").trim();
    if (!name) return;
    const next = [
      ...exercises,
      {
        id: crypto.randomUUID(),
        name,
        sets: Number(exForm.sets) || 3,
        reps: Number(exForm.reps) || 10,
        notes: String(exForm.notes || "").trim(),
      },
    ];
    try {
      await api.patch(`/api/habits/${activeHabit._id}`, { exercises: next });
      await openHabitDetails(activeHabit);
      await load();
    } catch (e) {
      setError(e?.response?.data?.error || "Failed to add exercise");
    }
  }

  async function deleteExercise(exId) {
    if (!activeHabit?._id) return;
    const next = exercises.filter((x) => x.id !== exId);
    try {
      await api.patch(`/api/habits/${activeHabit._id}`, { exercises: next });
      await openHabitDetails(activeHabit);
      await load();
    } catch (e) {
      setError(e?.response?.data?.error || "Failed to delete exercise");
    }
  }

  function openCreate() {
    setEditing(null);
    setForm({ name: "", tag: "", color: "#8b5cf6", notes: "" });
    setEmojiOpen(false);
    setModalOpen(true);
  }

  function openEdit(habit) {
    setEditing(habit);
    setForm({
      name: habit.name || "",
      tag: habit.tag || "",
      color: habit.color || "#8b5cf6",
      notes: habit.notes || "",
    });
    setEmojiOpen(false);
    setModalOpen(true);
  }

  async function saveHabit(e) {
    e.preventDefault();
    setError("");
    const payload = {
      name: String(form.name || "").trim(),
      tag: String(form.tag || "").trim(),
      color: String(form.color || "").trim(),
      notes: String(form.notes || "").trim(),
    };
    if (!payload.name) {
      setError("Habit name is required.");
      return;
    }
    try {
      if (editing?._id) {
        await api.patch(`/api/habits/${editing._id}`, payload);
      } else {
        await api.post("/api/habits", payload);
      }
      setModalOpen(false);
      setEditing(null);
      await load();
    } catch (e2) {
      setError(e2?.response?.data?.error || "Failed to save habit");
    }
  }

  async function del(habit) {
    if (!confirm("Delete this habit?")) return;
    await api.delete(`/api/habits/${habit._id}`);
    await load();
  }

  const shown = habits.filter((h) => {
    const text = `${h.name} ${h.tag || ""} ${h.notes || ""}`.toLowerCase();
    if (q && !text.includes(q.toLowerCase())) return false;
    const doneToday = !!(h.checks && h.checks[today]);
    if (filter === "done" && !doneToday) return false;
    if (filter === "todo" && doneToday) return false;
    return true;
  });

  const shownAll = habits.filter((h) => {
    const text = `${h.name} ${h.tag || ""} ${h.notes || ""}`.toLowerCase();
    return !q || text.includes(q.toLowerCase());
  });

  const completedToday = habits.filter((h) => !!(h.checks && h.checks[today]))
    .length;
  const total = habits.length;
  const percent = total ? Math.round((completedToday / total) * 100) : 0;

  const remainingToday = Math.max(0, total - completedToday);
  const maxStreak = habits.reduce((acc, h) => Math.max(acc, calcStreak(h.checks)), 0);

  return (
    <div className="tempoShell">
      <aside className="sidebar">
        <div className="sbBrand">
          <div className="sbLogo">
            Hi {sideName || "there"}
          </div>
        </div>

        <nav className="sbNav">
          <button
            className={"sbItem " + (section === "dashboard" ? "active" : "")}
            type="button"
            onClick={() => setSection("dashboard")}
          >
            Dashboard
          </button>
          <button
            className={"sbItem " + (section === "habits" ? "active" : "")}
            type="button"
            onClick={() => {
              setSection("habits");
              setFilter("all");
            }}
          >
            Habits
          </button>
          <button
            className={"sbItem " + (section === "analytics" ? "active" : "")}
            type="button"
            onClick={() => {
              setSection("analytics");
              loadAnalytics();
            }}
          >
            Analytics
          </button>
          <button
            className={"sbItem " + (section === "settings" ? "active" : "")}
            type="button"
            onClick={() => {
              setSection("settings");
              loadMe();
            }}
          >
            Settings
          </button>
        </nav>

        <div className="sbFooter">
          <button
            className="sbItem danger"
            type="button"
            onClick={() => auth.setToken("")}
          >
            Sign out
          </button>
        </div>
      </aside>

      <main className="tempoMain">
        <div className="tempoTop">
          <div className="tempoDate">
            {new Date().toLocaleDateString(undefined, {
              weekday: "short",
              month: "long",
              day: "numeric",
            })}
          </div>
          <div className="tempoActions">
            <input
              className="tempoSearch"
              placeholder={section === "habits" ? "Search habits..." : "Search today's tasks..."}
              value={q}
              onChange={(e) => setQ(e.target.value)}
            />
            {section !== "settings" && (
              <select
                className="tempoFilter"
                value={filter}
                onChange={(e) => setFilter(e.target.value)}
                aria-label="Filter habits"
              >
                <option value="all">All</option>
                <option value="done">Done today</option>
                <option value="todo">Not done</option>
              </select>
            )}
            {section !== "analytics" && (
              <button type="button" className="tempoAdd" onClick={openCreate}>
                + Add habit
              </button>
            )}
          </div>
        </div>

        {section === "dashboard" && (
          <div className="statsRow">
            <div className="statCard">
              <div className="statLabel">Today's completion</div>
              <div className="statValue">{percent}%</div>
            </div>
            <div className="statCard">
              <div className="statLabel">Completed</div>
              <div className="statValue">{completedToday}/{total}</div>
            </div>
            <div className="statCard">
              <div className="statLabel">Remaining</div>
              <div className="statValue">{remainingToday}</div>
            </div>
            <div className="statCard">
              <div className="statLabel">Best current streak</div>
              <div className="statValue">{maxStreak} days</div>
            </div>
          </div>
        )}

        {error && <div className="error">{error}</div>}

        {section === "dashboard" && (
          <div className="tempoGrid">
            <section className="panel">
              <div className="panelHead">
                <div className="panelTitle">Today's tasks</div>
                <div className="panelSub">{completedToday}/{total} done</div>
              </div>

              <div className="tasks">
                {shown.map((h) => {
                  const doneToday = !!(h.checks && h.checks[today]);
                  return (
                    <div className="taskRow" key={h._id}>
                      <div
                        className="taskIcon"
                        style={{ borderColor: h.color || "#8b5cf6" }}
                      >
                        {h.tag || "✨"}
                      </div>
                      <div className="taskMid">
                        <button
                          type="button"
                          className="linkTitle"
                          onClick={() => openHabitDetails(h)}
                          title="Open habit details"
                        >
                          {h.name}
                        </button>
                        <div
                          className={
                            "taskState " + (doneToday ? "done" : "pending")
                          }
                        >
                          {doneToday ? "Completed" : "Not done"}
                        </div>
                      </div>
                      <label className="switch">
                        <input
                          type="checkbox"
                          checked={doneToday}
                          disabled={toggleBusyId === h._id}
                          onChange={(e) => toggle(h, e.target.checked)}
                          aria-label={`Mark ${h.name} done today`}
                        />
                        <span
                          className="slider"
                          style={{
                            background: doneToday
                              ? h.color || "#8b5cf6"
                              : undefined,
                          }}
                        />
                      </label>
                      <div className="taskActions">
                        <button
                          className="miniBtn"
                          type="button"
                          onClick={() => openEdit(h)}
                        >
                          Edit
                        </button>
                        <button
                          className="miniBtn danger"
                          type="button"
                          onClick={() => del(h)}
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  );
                })}
                {!shown.length && (
                  <div className="muted">No habits yet.</div>
                )}
              </div>
            </section>

            <section className="panel">
              <div className="panelHead">
                <div className="panelTitle">Streaks</div>
                <div className="pillSel">This week</div>
              </div>
              <div className="donutWrap">
                <div className="donut" style={{ ["--pct"]: percent }}>
                  <div className="donutInner">
                    <div className="donutPct">{percent}%</div>
                    <div className="muted">completed</div>
                  </div>
                </div>
                <div className="donutLegend">
                  <div>
                    <span className="dot ok" /> Completed {percent}%
                  </div>
                  <div>
                    <span className="dot miss" /> Missed {100 - percent}%
                  </div>
                </div>
              </div>
            </section>

            <section className="panel">
              <div className="panelHead">
                <div className="panelTitle">Quick tips</div>
                <div className="pillSel">Today</div>
              </div>
              <div className="muted" style={{ lineHeight: 1.6 }}>
                - Keep your habits small and consistent.
                <br />
                - Aim for {remainingToday} more habit
                {remainingToday === 1 ? "" : "s"} today.
                <br />
                - Your best current streak is {maxStreak} day
                {maxStreak === 1 ? "" : "s"}.
              </div>
            </section>
          </div>
        )}

        {section === "habits" && (
          <div className="tempoGrid" style={{ gridTemplateColumns: "1.5fr 1fr 1fr" }}>
            <section className="panel" style={{ gridColumn: "1 / -1" }}>
              <div className="panelHead">
                <div className="panelTitle">Habits</div>
                <div className="panelSub">{habits.length} total</div>
              </div>

              <div className="tasks">
                {shownAll
                  .filter((h) => {
                    const doneToday = !!(h.checks && h.checks[today]);
                    if (filter === "done" && !doneToday) return false;
                    if (filter === "todo" && doneToday) return false;
                    return true;
                  })
                  .map((h) => {
                    const doneToday = !!(h.checks && h.checks[today]);
                    const s = calcStreak(h.checks);
                    return (
                      <div className="taskRow" key={h._id}>
                        <div
                          className="taskIcon"
                          style={{ borderColor: h.color || "#8b5cf6" }}
                        >
                          {h.tag || "✨"}
                        </div>
                        <div className="taskMid">
                          <button
                            type="button"
                            className="linkTitle"
                            onClick={() => openHabitDetails(h)}
                            title="Open habit details"
                          >
                            {h.name}
                          </button>
                          <div className="taskState">
                            {s} day streak • {doneToday ? "Done today" : "Not done"}
                          </div>
                        </div>
                        <label className="switch">
                          <input
                            type="checkbox"
                            checked={doneToday}
                            disabled={toggleBusyId === h._id}
                            onChange={(e) => toggle(h, e.target.checked)}
                            aria-label={`Mark ${h.name} done today`}
                          />
                          <span
                            className="slider"
                            style={{
                              background: doneToday
                                ? h.color || "#8b5cf6"
                                : undefined,
                            }}
                          />
                        </label>
                        <div className="taskActions">
                          <button
                            className="miniBtn"
                            type="button"
                            onClick={() => openEdit(h)}
                          >
                            Edit
                          </button>
                          <button
                            className="miniBtn danger"
                            type="button"
                            onClick={() => del(h)}
                          >
                            Delete
                          </button>
                        </div>
                      </div>
                    );
                  })}
                {!shownAll.length && (
                  <div className="muted">No habits found.</div>
                )}
              </div>
            </section>
          </div>
        )}

        {section === "settings" && (
          <div className="tempoGrid" style={{ gridTemplateColumns: "1fr" }}>
            <section className="panel">
              <div className="panelHead">
                <div className="panelTitle">Account settings</div>
              </div>
              {settingsMsg && <div className="muted" style={{ fontWeight: 900 }}>{settingsMsg}</div>}

              <div className="settingsGrid">
                <div className="settingsCard">
                  <div className="settingsTitle">Profile</div>
                  <div className="muted" style={{ marginBottom: 10 }}>
                    Logged in as <span className="mono">{me.username || "..."}</span>
                  </div>
                  <label>
                    Username
                    <input value={newUsername} onChange={(e) => setNewUsername(e.target.value)} />
                  </label>
                  <div className="settingsActions">
                    <button className="miniBtn" type="button" onClick={saveUsername}>
                      Save username
                    </button>
                  </div>
                </div>

                <div className="settingsCard">
                  <div className="settingsTitle">Password reset</div>
                  <div className="muted" style={{ marginBottom: 10 }}>
                    Change your password (requires current password).
                  </div>
                  <label>
                    Current password
                    <input type="password" value={curPw} onChange={(e) => setCurPw(e.target.value)} />
                  </label>
                  <label>
                    New password
                    <input type="password" value={newPw} onChange={(e) => setNewPw(e.target.value)} />
                  </label>
                  <label>
                    Confirm new password
                    <input type="password" value={newPw2} onChange={(e) => setNewPw2(e.target.value)} />
                  </label>
                  <div className="settingsActions">
                    <button className="miniBtn" type="button" onClick={changePassword}>
                      Update password
                    </button>
                  </div>
                </div>
              </div>
            </section>
          </div>
        )}

        {section === "analytics" && (
          <div className="tempoGrid" style={{ gridTemplateColumns: "1fr" }}>
            <section className="panel">
              <div className="panelHead">
                <div className="panelTitle">Analytics (Date-wise)</div>
                <div className="panelSub">Last 30 days</div>
              </div>

              {analyticsLoading ? (
                <div className="muted">Loading analytics…</div>
              ) : (
                <div className="tableWrap">
                  <div className="manualRow">
                    <label>
                      Date
                      <input
                        type="date"
                        value={manualDate}
                        onChange={(e) => setManualDate(e.target.value)}
                      />
                    </label>
                    <label>
                      Habit
                      <select
                        value={manualHabitId || (habits[0]?._id ?? "")}
                        onChange={(e) => setManualHabitId(e.target.value)}
                      >
                        {habits.map((h) => (
                          <option key={h._id} value={h._id}>
                            {[h.tag?.trim(), h.name].filter(Boolean).join(" ")}
                          </option>
                        ))}
                      </select>
                    </label>
                    <button
                      type="button"
                      className="miniBtn"
                      onClick={addManualRecord}
                      disabled={!habits.length}
                    >
                      Mark done
                    </button>
                  </div>
                  <div className="tableHead">
                    <div>Date</div>
                    <div>Completed</div>
                    <div>Percent</div>
                  </div>
                  {analyticsDays
                    .slice()
                    .reverse()
                    .map((d) => (
                      <div 
                        key={d.date} 
                        className="tableRow"
                        style={{ cursor: "pointer" }}
                        onClick={() => {
                          setSelectedDateData(d);
                          setDateDetailOpen(true);
                        }}
                      >
                        <div className="mono">{formatDateDDMMYYYY(d.date)}</div>
                        <div>
                          {d.completed}/{d.total}
                        </div>
                        <div className="rowPct">
                          <div className="pctBar">
                            <div
                              className="pctFill"
                              style={{ width: `${d.percent}%` }}
                            />
                          </div>
                          <div className="mono">{d.percent}%</div>
                        </div>
                      </div>
                    ))}
                  {!analyticsDays.length && (
                    <div className="muted">
                      No records yet. Complete at least one habit and the date will appear here.
                    </div>
                  )}
                </div>
              )}
            </section>
          </div>
        )}

        {modalOpen && (
          <div
            className="modalBack"
            role="dialog"
            aria-modal="true"
            onMouseDown={(e) => {
              if (e.target === e.currentTarget) setModalOpen(false);
            }}
          >
            <div className="modalCard">
              <div className="modalHead">
                <div className="modalTitle">
                  {editing ? "Edit habit" : "Add habit"}
                </div>
                <button className="miniBtn" type="button" onClick={() => setModalOpen(false)}>
                  ✕
                </button>
              </div>

              <form className="modalForm" onSubmit={saveHabit}>
                <label>
                  Habit name
                  <input
                    value={form.name}
                    onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                    placeholder="e.g. Drink Water"
                    required
                    maxLength={60}
                  />
                </label>
                <div className="modalRow">
                  <div className="emojiField">
                    <div className="emojiLabel">Emoji</div>
                    <button
                      type="button"
                      className="emojiBtn"
                      onClick={() => setEmojiOpen((v) => !v)}
                      aria-haspopup="listbox"
                      aria-expanded={emojiOpen}
                    >
                      <span className="emojiBtnIcon">{form.tag?.trim() || "✨"}</span>
                      <span className="emojiBtnText">Choose</span>
                    </button>
                    {emojiOpen && (
                      <div className="emojiPop" role="listbox" aria-label="Emoji picker">
                        {EMOJIS.map((e) => (
                          <button
                            key={e}
                            type="button"
                            className="emojiPick"
                            onClick={() => {
                              setForm((f) => ({ ...f, tag: e }));
                              setEmojiOpen(false);
                            }}
                            title={e}
                          >
                            {e}
                          </button>
                        ))}
                        <button
                          type="button"
                          className="emojiClear"
                          onClick={() => {
                            setForm((f) => ({ ...f, tag: "" }));
                            setEmojiOpen(false);
                          }}
                        >
                          Clear
                        </button>
                      </div>
                    )}
                  </div>
                  <label>
                    Color
                    <input
                      type="color"
                      value={form.color}
                      onChange={(e) => setForm((f) => ({ ...f, color: e.target.value }))}
                      aria-label="Habit color"
                    />
                  </label>
                </div>
                <label>
                  Notes (optional)
                  <input
                    value={form.notes}
                    onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
                    placeholder="Small goal or reminder"
                    maxLength={140}
                  />
                </label>
                <div className="modalActions">
                  <button className="miniBtn" type="button" onClick={() => setModalOpen(false)}>
                    Cancel
                  </button>
                  <button type="submit">{editing ? "Save changes" : "Create habit"}</button>
                </div>
              </form>
            </div>
          </div>
        )}

        {detailsOpen && activeHabit && (
          <div
            className="modalBack"
            role="dialog"
            aria-modal="true"
            onMouseDown={(e) => {
              if (e.target === e.currentTarget) setDetailsOpen(false);
            }}
          >
            <div className="modalCard">
              <div className="modalHead">
                <div className="modalTitle">
                  {activeHabit.tag || "✨"} {activeHabit.name}
                </div>
                <button className="miniBtn" type="button" onClick={() => setDetailsOpen(false)}>
                  ✕
                </button>
              </div>

              {habitKind(activeHabit) === "gym" && (
                <div className="detailGrid">
                  <section className="detailSection">
                    <div className="detailHead">
                      <div className="detailTitle">Gym schedule</div>
                      <button className="miniBtn" type="button" onClick={saveSchedule}>
                        Save
                      </button>
                    </div>
                    <div className="daysRow">
                      {["Mon","Tue","Wed","Thu","Fri","Sat","Sun"].map((d) => (
                        <button
                          key={d}
                          type="button"
                          className={"dayPill " + (scheduleDays.includes(d) ? "on" : "")}
                          onClick={() =>
                            setScheduleDays((prev) =>
                              prev.includes(d) ? prev.filter((x) => x !== d) : [...prev, d]
                            )
                          }
                        >
                          {d}
                        </button>
                      ))}
                    </div>
                    <label>
                      Time
                      <input
                        type="time"
                        value={scheduleTime}
                        onChange={(e) => setScheduleTime(e.target.value)}
                      />
                    </label>
                    <div className="muted" style={{ fontSize: 12 }}>
                      Pick days + time for your gym schedule.
                    </div>
                  </section>

                  <section className="detailSection">
                    <div className="detailHead">
                      <div className="detailTitle">Exercises</div>
                    </div>

                    <div className="exAdd">
                      <input
                        placeholder="Exercise name (e.g. Bench Press)"
                        value={exForm.name}
                        onChange={(e) => setExForm((f) => ({ ...f, name: e.target.value }))}
                      />
                      <input
                        type="number"
                        min="1"
                        max="50"
                        value={exForm.sets}
                        onChange={(e) => setExForm((f) => ({ ...f, sets: e.target.value }))}
                        title="Sets"
                      />
                      <input
                        type="number"
                        min="1"
                        max="200"
                        value={exForm.reps}
                        onChange={(e) => setExForm((f) => ({ ...f, reps: e.target.value }))}
                        title="Reps"
                      />
                      <button type="button" className="miniBtn" onClick={addExercise}>
                        Add
                      </button>
                    </div>
                    <input
                      placeholder="Notes (optional)"
                      value={exForm.notes}
                      onChange={(e) => setExForm((f) => ({ ...f, notes: e.target.value }))}
                    />

                    <div className="exList">
                      {exercises.map((x) => (
                        <div key={x.id} className="exRow">
                          <div>
                            <div className="exName">{x.name}</div>
                            <div className="muted exMeta">
                              {x.sets} sets • {x.reps} reps{ x.notes ? ` • ${x.notes}` : "" }
                            </div>
                          </div>
                          <button className="miniBtn danger" type="button" onClick={() => deleteExercise(x.id)}>
                            Remove
                          </button>
                        </div>
                      ))}
                      {!exercises.length && <div className="muted">No exercises yet.</div>}
                    </div>
                  </section>
                </div>
              )}

              {habitKind(activeHabit) === "water" && (
                <div className="detailGrid" style={{ gridTemplateColumns: "1fr" }}>
                  <section className="detailSection">
                    <div className="detailHead">
                      <div className="detailTitle">Water goal</div>
                      <button className="miniBtn" type="button" onClick={saveWaterGoal}>
                        Save
                      </button>
                    </div>
                    <div className="waterGoalRow">
                      <label style={{ margin: 0 }}>
                        Daily goal (ml)
                        <input
                          type="number"
                          min="0"
                          max="20000"
                          value={waterGoalMl}
                          onChange={(e) => setWaterGoalMl(e.target.value)}
                          placeholder="e.g. 2000"
                        />
                      </label>
                      <div className="muted" style={{ fontSize: 12, alignSelf: "end" }}>
                        Tip: 2000 ml = 2 liters
                      </div>
                    </div>
                  </section>
                </div>
              )}

              {habitKind(activeHabit) === "general" && (
                <div className="detailGrid" style={{ gridTemplateColumns: "1fr" }}>
                  <section className="detailSection">
                    <div className="detailHead">
                      <div className="detailTitle">Details</div>
                      <button className="miniBtn" type="button" onClick={() => openEdit(activeHabit)}>
                        Edit habit
                      </button>
                    </div>
                    <div className="muted" style={{ lineHeight: 1.7 }}>
                      {activeHabit.notes || "No notes yet."}
                    </div>
                  </section>
                </div>
              )}
            </div>
          </div>
        )}

        {dateDetailOpen && selectedDateData && (
          <div
            className="modalBack"
            role="dialog"
            aria-modal="true"
            onMouseDown={(e) => {
              if (e.target === e.currentTarget) setDateDetailOpen(false);
            }}
          >
            <div className="modalCard">
              <div className="modalHead">
                <div className="modalTitle">
                  Habits for {formatDateDDMMYYYY(selectedDateData.date)}
                </div>
                <button className="miniBtn" type="button" onClick={() => setDateDetailOpen(false)}>
                  ✕
                </button>
              </div>

              <div style={{ padding: "1rem 0" }}>
                <div style={{ marginBottom: "1rem", fontSize: "0.9rem", color: "var(--muted)" }}>
                  Completed {selectedDateData.completed} of {selectedDateData.total} habits ({selectedDateData.percent}%)
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
                  {habits.map((habit) => {
                    const isCompleted = selectedDateData.doneHabitIds?.includes(String(habit._id)) || false;
                    return (
                      <div
                        key={habit._id}
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: "0.75rem",
                          padding: "0.75rem",
                          borderRadius: "8px",
                          backgroundColor: "var(--bg)",
                          border: `2px solid ${isCompleted ? habit.color : "var(--border)"}`,
                          opacity: isCompleted ? 1 : 0.7,
                        }}
                      >
                        <div
                          style={{
                            width: "28px",
                            height: "28px",
                            borderRadius: "50%",
                            backgroundColor: habit.color,
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            flexShrink: 0,
                            border: isCompleted ? "2px solid white" : "none",
                          }}
                        >
                          {isCompleted ? (
                            <span style={{ color: "white", fontSize: "16px", fontWeight: "bold" }}>✓</span>
                          ) : (
                            <div
                              style={{
                                width: "12px",
                                height: "12px",
                                borderRadius: "50%",
                                backgroundColor: "rgba(255, 255, 255, 0.3)",
                              }}
                            />
                          )}
                        </div>
                        <div style={{ flex: 1 }}>
                          <div style={{ fontWeight: 500, display: "flex", alignItems: "center", gap: "0.5rem" }}>
                            {habit.tag && <span>{habit.tag}</span>}
                            <span>{habit.name}</span>
                          </div>
                          {habit.notes && (
                            <div style={{ fontSize: "0.85rem", color: "var(--muted)", marginTop: "0.25rem" }}>
                              {habit.notes}
                            </div>
                          )}
                        </div>
                        {isCompleted && (
                          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                            <span style={{ color: habit.color, fontSize: "0.85rem", fontWeight: 500 }}>
                              ✓ Done
                            </span>
                            <button
                              type="button"
                              className="miniBtn"
                              onClick={() => unmarkHabitForDate(habit._id, selectedDateData.date)}
                              disabled={unmarkBusyId === habit._id}
                              title="Remove this completion (mark as not done for this date)"
                            >
                              {unmarkBusyId === habit._id ? "Removing…" : "Unmark"}
                            </button>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
                {habits.length === 0 && (
                  <div className="muted" style={{ textAlign: "center", padding: "2rem" }}>
                    No habits found
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

