(() => {
  const stateKey = "habitTrackerState_v1";
  const today = new Date().toISOString().slice(0, 10); // YYYY-MM-DD

  const els = {
    authSection: document.getElementById("authSection"),
    appSection: document.getElementById("appSection"),
    registerForm: document.getElementById("registerForm"),
    loginForm: document.getElementById("loginForm"),
    logoutBtn: document.getElementById("logoutBtn"),
    habitForm: document.getElementById("habitForm"),
    habitList: document.getElementById("habitList"),
    habitTemplate: document.getElementById("habitTemplate"),
    todayText: document.getElementById("todayText"),
    searchInput: document.getElementById("searchInput"),
    filterSelect: document.getElementById("filterSelect"),
  };

  const loadState = () => {
    try {
      const raw = localStorage.getItem(stateKey);
      if (!raw) {
        return { users: [], session: null, habitsByUser: {} };
      }
      return JSON.parse(raw);
    } catch (err) {
      console.error("Failed to parse state", err);
      return { users: [], session: null, habitsByUser: {} };
    }
  };

  const saveState = (next) => {
    localStorage.setItem(stateKey, JSON.stringify(next));
  };

  let state = loadState();

  const hash = (value) => {
    // Simple hash for demo only (not secure).
    let h = 0;
    for (let i = 0; i < value.length; i++) {
      h = Math.imul(31, h) + value.charCodeAt(i) | 0;
    }
    return h.toString(16);
  };

  const currentUser = () => state.session?.username || null;

  const requireUser = () => {
    const user = currentUser();
    if (!user) throw new Error("Not signed in");
    return user;
  };

  const setSession = (username) => {
    state = { ...state, session: username ? { username } : null };
    saveState(state);
    render();
  };

  const upsertHabits = (username, updater) => {
    const habits = state.habitsByUser[username] || [];
    const nextHabits = updater(habits);
    state = {
      ...state,
      habitsByUser: { ...state.habitsByUser, [username]: nextHabits },
    };
    saveState(state);
    renderHabits();
  };

  const register = (username, password) => {
    if (state.users.find((u) => u.username === username)) {
      alert("Username already exists.");
      return;
    }
    const user = { username, passwordHash: hash(password) };
    state = {
      ...state,
      users: [...state.users, user],
      habitsByUser: { ...state.habitsByUser, [username]: [] },
      session: { username },
    };
    saveState(state);
    render();
  };

  const login = (username, password) => {
    const user = state.users.find((u) => u.username === username);
    if (!user || user.passwordHash !== hash(password)) {
      alert("Invalid credentials.");
      return;
    }
    setSession(username);
  };

  const addHabit = ({ name, tag, color, notes }) => {
    const username = requireUser();
    const habit = {
      id: crypto.randomUUID(),
      name,
      tag: tag || "",
      color,
      notes: notes || "",
      createdAt: new Date().toISOString(),
      checks: {}, // dateString -> true
    };
    upsertHabits(username, (list) => [habit, ...list]);
  };

  const deleteHabit = (id) => {
    const username = requireUser();
    upsertHabits(username, (list) => list.filter((h) => h.id !== id));
  };

  const updateHabit = (id, updates) => {
    const username = requireUser();
    upsertHabits(username, (list) =>
      list.map((h) => (h.id === id ? { ...h, ...updates } : h))
    );
  };

  const toggleToday = (id, done) => {
    const username = requireUser();
    upsertHabits(username, (list) =>
      list.map((h) => {
        if (h.id !== id) return h;
        const checks = { ...h.checks };
        if (done) checks[today] = true;
        else delete checks[today];
        return { ...h, checks };
      })
    );
  };

  const calcStreak = (checks) => {
    const dates = Object.keys(checks).sort((a, b) => b.localeCompare(a));
    if (!dates.length) return 0;
    let streak = 0;
    let cursor = new Date(today);
    while (dates.includes(cursor.toISOString().slice(0, 10))) {
      streak += 1;
      cursor.setDate(cursor.getDate() - 1);
    }
    return streak;
  };

  // UI bindings
  els.registerForm.addEventListener("submit", (e) => {
    e.preventDefault();
    const data = new FormData(e.target);
    register(
      data.get("username").trim(),
      data.get("password").trim()
    );
    e.target.reset();
  });

  els.loginForm.addEventListener("submit", (e) => {
    e.preventDefault();
    const data = new FormData(e.target);
    login(
      data.get("username").trim(),
      data.get("password").trim()
    );
  });

  els.logoutBtn.addEventListener("click", () => setSession(null));

  els.habitForm.addEventListener("submit", (e) => {
    e.preventDefault();
    const data = new FormData(e.target);
    addHabit({
      name: data.get("name").trim(),
      tag: data.get("tag").trim(),
      color: data.get("color"),
      notes: data.get("notes").trim(),
    });
    e.target.reset();
    e.target.color.value = "#7c3aed";
  });

  els.searchInput.addEventListener("input", renderHabits);
  els.filterSelect.addEventListener("change", renderHabits);

  const render = () => {
    const user = currentUser();
    els.authSection.hidden = !!user;
    els.appSection.hidden = !user;
    els.logoutBtn.hidden = !user;
    els.todayText.textContent = new Date().toLocaleDateString(undefined, {
      weekday: "long",
      year: "numeric",
      month: "short",
      day: "numeric",
    });
    if (user) renderHabits();
  };

  const renderHabits = () => {
    const user = currentUser();
    if (!user) return;
    const habits = state.habitsByUser[user] || [];
    const search = els.searchInput.value.toLowerCase();
    const filter = els.filterSelect.value;
    els.habitList.innerHTML = "";

    const matches = habits.filter((h) => {
      const text = `${h.name} ${h.tag} ${h.notes}`.toLowerCase();
      if (search && !text.includes(search)) return false;
      const doneToday = !!h.checks[today];
      if (filter === "done" && !doneToday) return false;
      if (filter === "todo" && doneToday) return false;
      return true;
    });

    if (!matches.length) {
      const empty = document.createElement("p");
      empty.className = "muted";
      empty.textContent = "No habits yet. Add one to get started.";
      els.habitList.appendChild(empty);
      return;
    }

    matches.forEach((habit) => {
      const node = els.habitTemplate.content.firstElementChild.cloneNode(true);
      node.dataset.id = habit.id;
      node.querySelector(".habit-color").style.background = habit.color;
      node.querySelector(".habit-name").textContent = habit.name;
      node.querySelector(".habit-tag").textContent = habit.tag || "";
      node.querySelector(".habit-notes").textContent = habit.notes || "No notes yet.";
      node.querySelector(".created-pill").textContent =
        "Started " + new Date(habit.createdAt).toLocaleDateString();
      node.querySelector(".streak-pill").textContent =
        `${calcStreak(habit.checks)} day streak`;

      const checkbox = node.querySelector(".done-checkbox");
      checkbox.checked = !!habit.checks[today];
      checkbox.addEventListener("change", (e) =>
        toggleToday(habit.id, e.target.checked)
      );

      node.querySelector(".edit-btn").addEventListener("click", () => {
        const name = prompt("Habit name", habit.name) || habit.name;
        const tag = prompt("Tag / emoji", habit.tag) ?? habit.tag;
        const notes = prompt("Notes", habit.notes) ?? habit.notes;
        const color = prompt("Color (hex)", habit.color) || habit.color;
        updateHabit(habit.id, { name: name.trim(), tag: tag.trim(), notes: notes.trim(), color });
      });

      node.querySelector(".delete-btn").addEventListener("click", () => {
        if (confirm("Delete this habit?")) deleteHabit(habit.id);
      });

      els.habitList.appendChild(node);
    });
  };

  // Kick off
  render();
})();
