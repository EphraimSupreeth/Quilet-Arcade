const THEME_NAMES = [
  "system",
  "sunset",
  "ocean",
  "rainbow",
  "candy",
  "forest",
  "galaxy",
  "night",
  "kids"
];

const THEME_CONFIG = {
  system: {
    accent: "#2563eb",
    accent2: "#7c3aed",
    background: "linear-gradient(135deg,#f4f7fb,#eef2ff,#f8fafc)"
  },
  sunset: {
    accent: "#dc5a3f",
    accent2: "#f59e0b",
    background: "linear-gradient(135deg,#fff7ed,#ffedd5,#fef3c7)"
  },
  ocean: {
    accent: "#087f8c",
    accent2: "#0284c7",
    background: "linear-gradient(135deg,#ecfeff,#cffafe,#dbeafe)"
  },
  rainbow: {
    accent: "#7c3aed",
    accent2: "#db2777",
    background: "linear-gradient(135deg,#fef3c7,#fce7f3,#ede9fe)"
  },
  candy: {
    accent: "#db2777",
    accent2: "#9333ea",
    background: "linear-gradient(135deg,#fff1f2,#fce7f3,#fae8ff)"
  },
  forest: {
    accent: "#15803d",
    accent2: "#65a30d",
    background: "linear-gradient(135deg,#f0fdf4,#dcfce7,#ecfccb)"
  },
  galaxy: {
    accent: "#818cf8",
    accent2: "#c084fc",
    background: "linear-gradient(135deg,#0f0b2d,#312e81,#581c87)"
  },
  night: {
    accent: "#60a5fa",
    accent2: "#818cf8",
    background: "linear-gradient(135deg,#020617,#111827,#1e293b)"
  },
  kids: {
    accent: "#db2777",
    accent2: "#0891b2",
    background: "linear-gradient(135deg,#fff7fb,#fef3c7,#ecfeff)"
  }
};

const HOST_MODE_DEFS = [
  { key: "streak", title: "Gold Quest", icon: "🏆", desc: "Build streaks and earn increasing rewards." },
  { key: "speed", title: "Lightning Rush", icon: "⚡", desc: "Answer quickly to earn speed bonuses." },
  { key: "survival", title: "Battle Royale", icon: "⚔️", desc: "Stay in the game with three lives." },
  { key: "streak", title: "Factory", icon: "🏭", desc: "Grow production with correct-answer streaks." },
  { key: "speed", title: "Racing", icon: "🏎️", desc: "Fast and accurate answers move you ahead." },
  { key: "survival", title: "Tower Defense", icon: "🛡️", desc: "Protect your tower by answering correctly." },
  { key: "streak", title: "Cafe", icon: "☕", desc: "Complete orders by maintaining your streak." },
  { key: "speed", title: "Fishing Frenzy", icon: "🎣", desc: "Catch higher rewards with faster answers." },
  { key: "survival", title: "Monster Brawl", icon: "👾", desc: "Wrong answers cost one of your lives." },
  { key: "streak", title: "Kingdom", icon: "🏰", desc: "Build a stronger kingdom through accuracy." }
];

const UNSAFE_CONTENT_RULES = [
  {
    category: "sexual or explicit content",
    patterns: [
      /\bsex(?:ual|ually)?\b/i,
      /\bporn(?:ography|ographic)?\b/i,
      /\bnudes?\b/i,
      /\bnaked\b/i,
      /\berotic(?:a)?\b/i,
      /\b(?:oral|(?:(?!x)x))\s+sex\b/i,
      /\bsexual\s+(?:act|content|image|message|question)s?\b/i,
      /\bexplicit\s+(?:image|video|content)s?\b/i,
      /\b(?:send|share|show)\s+(?:me\s+)?nudes?\b/i
    ]
  },
  {
    category: "bullying or harassment",
    patterns: [
      /\b(?:bully|bullied|bullying|harass|harassed|harassment)\b/i,
      /\bmake\s+fun\s+of\b/i,
      /\b(?:everyone|nobody)\s+hates?\s+(?:you|him|her|them)\b/i,
      /\bwho\s+is\s+the\s+(?:ugliest|stupidest|dumbest|worst)\b/i,
      /\byou(?:'re|\s+are)\s+(?:ugly|stupid|dumb|worthless|pathetic|useless)\b/i,
      /\b(?:loser|idiot|moron)\b/i
    ]
  },
  {
    category: "threatening or violent content",
    patterns: [
      /\b(?:i|we)\s+(?:will|want\s+to|am\s+going\s+to)\s+(?:kill|hurt|attack|beat)\b/i,
      /\b(?:kill|hurt|attack|beat)\s+(?:you|him|her|them|someone)\b/i,
      /\bdeath\s+threats?\b/i,
      /\bshoot\s+(?:you|him|her|them|someone)\b/i
    ]
  },
  {
    category: "self-harm content",
    patterns: [
      /\bkill\s+yourself\b/i,
      /\bhurt\s+yourself\b/i,
      /\bself[\s-]?harm\b/i,
      /\bcommit\s+suicide\b/i
    ]
  },
  {
    category: "hateful or discriminatory content",
    patterns: [
      /\bhate\s+(?:people|someone|them)\s+because\s+of\b/i,
      /\b(?:racial|homophobic|transphobic|religious)\s+slurs?\b/i,
      /\b(?:inferior|superior)\s+race\b/i,
      /\bdiscriminate\s+against\b/i
    ]
  },
  {
    category: "abusive language",
    patterns: [
      /\b(?:shut\s+up|drop\s+dead)\b/i,
      /\b(?:worthless|pathetic|useless)\s+(?:person|kid|student|child)\b/i
    ]
  }
];

const $ = (selector) => document.querySelector(selector);
const $$ = (selector) => [...document.querySelectorAll(selector)];

function normalizeModerationText(value = "") {
  return String(value)
    .normalize("NFKC")
    .toLowerCase()
    .replace(/[@4]/g, "a")
    .replace(/3/g, "e")
    .replace(/[1!|]/g, "i")
    .replace(/0/g, "o")
    .replace(/[$5]/g, "s")
    .replace(/7/g, "t")
    .replace(/[_.*~`^]+/g, "")
    .replace(/(.)\1{2,}/g, "$1$1")
    .replace(/\s+/g, " ")
    .trim();
}

function findUnsafeContent(value) {
  const normalized = normalizeModerationText(value);

  for (const rule of UNSAFE_CONTENT_RULES) {
    if (rule.patterns.some((pattern) => pattern.test(normalized))) {
      return rule.category;
    }
  }

  return null;
}

function validateQuizSafety(entries) {
  for (const entry of entries) {
    const category = findUnsafeContent(entry.value);

    if (category) {
      return {
        category,
        label: entry.label,
        element: entry.element
      };
    }
  }

  return null;
}

function readStorage(key, fallback) {
  try {
    const value = localStorage.getItem(key);
    return value === null ? fallback : JSON.parse(value);
  } catch {
    return fallback;
  }
}

const state = {
  currentUser: readStorage("quiletUser", null),
  accounts: readStorage("quiletAccounts", []),
  quizzes: readStorage("quiletQuizzes", []),
  history: readStorage("quiletHistory", []),
  preferences: readStorage("quiletPreferences", {
    bio: "",
    gameMode: "solo",
    timedMode: false,
    questionTime: 20,
    soundEffects: false,
    animations: true
  }),
  theme: localStorage.getItem("quiletTheme") || "system",
  compact: localStorage.getItem("quiletCompact") === "true",
  activeView: localStorage.getItem("quiletActiveView") || "home",
  play: null,
  libraryQuery: "",
  librarySort: "recent",
  libraryFilter: ""
};

function saveState() {
  localStorage.setItem("quiletUser", JSON.stringify(state.currentUser));
  localStorage.setItem("quiletAccounts", JSON.stringify(state.accounts));
  localStorage.setItem("quiletQuizzes", JSON.stringify(state.quizzes));
  localStorage.setItem("quiletHistory", JSON.stringify(state.history));
  localStorage.setItem("quiletPreferences", JSON.stringify(state.preferences));
  localStorage.setItem("quiletTheme", state.theme);
  localStorage.setItem("quiletCompact", String(state.compact));
  localStorage.setItem("quiletActiveView", state.activeView);
}

function escapeHtml(value = "") {
  return String(value).replace(/[&<>"']/g, (character) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#039;"
  }[character]));
}

async function hashPassword(password) {
  if (!window.crypto?.subtle) return `legacy:${password}`;

  const data = new TextEncoder().encode(password);
  const hash = await crypto.subtle.digest("SHA-256", data);

  return [...new Uint8Array(hash)]
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

function showMessage(message) {
  const toast = $("#notificationToast");
  const authMessage = $("#authMessage");

  if (toast) {
    toast.textContent = message;
    toast.classList.remove("hidden");
    toast.setAttribute("role", "status");
    clearTimeout(showMessage.timer);
    showMessage.timer = setTimeout(() => toast.classList.add("hidden"), 3000);
  }

  if (authMessage && !state.currentUser) {
    authMessage.textContent = message;
  }
}

function setSystemThemeClasses() {
  const isSystem = state.theme === "system";
  const isDark = Boolean(
    isSystem && window.matchMedia?.("(prefers-color-scheme: dark)").matches
  );

  document.body.classList.toggle("theme-system", isSystem);
  document.body.classList.toggle("system-dark-active", isDark);
  document.documentElement.style.colorScheme = isDark ? "dark" : "light";

  if (isSystem && isDark) {
    document.documentElement.style.setProperty(
      "--page-background",
      "linear-gradient(135deg,#020617,#0f172a,#1e293b)"
    );
  }
}

function applyTheme() {
  const theme = THEME_CONFIG[state.theme] || THEME_CONFIG.system;

  document.body.classList.remove(
    ...THEME_NAMES.map((name) => `theme-${name}`),
    "system-dark-active",
    "compact-mode"
  );

  document.body.classList.add(`theme-${state.theme}`);

  if (state.compact) {
    document.body.classList.add("compact-mode");
  }

  document.documentElement.style.setProperty("--accent", theme.accent);
  document.documentElement.style.setProperty("--accent-2", theme.accent2);
  document.documentElement.style.setProperty(
    "--accent-soft",
    `color-mix(in srgb, ${theme.accent} 11%, transparent)`
  );
  document.documentElement.style.setProperty("--page-background", theme.background);

  setSystemThemeClasses();

  if ($("#themeSelect")) $("#themeSelect").value = state.theme;
  if ($("#compactModeInput")) $("#compactModeInput").checked = state.compact;
}
function applyAuthLayout(isAuthView) {
  const appShell = $(".app-shell");
  const topbar = $("#mainTopbar");
  const main = document.querySelector("main");
  const authView = $("#authView");

  document.body.classList.toggle("auth-mode", isAuthView);
  document.documentElement.classList.toggle("auth-mode", isAuthView);

  if (appShell) {
    appShell.style.setProperty(
      "margin-left",
      isAuthView ? "0" : "",
      "important"
    );
    appShell.style.setProperty(
      "padding-left",
      isAuthView ? "0" : "",
      "important"
    );
    appShell.style.setProperty(
      "width",
      isAuthView ? "100%" : "",
      "important"
    );
  }

  if (topbar) {
    topbar.classList.toggle("hidden-on-auth", isAuthView);
    topbar.style.setProperty(
      "display",
      isAuthView ? "none" : "",
      "important"
    );
  }

  if (main) {
    main.style.setProperty(
      "margin-left",
      isAuthView ? "0" : "",
      "important"
    );
    main.style.setProperty(
      "padding-left",
      isAuthView ? "0" : "",
      "important"
    );
    main.style.setProperty(
      "width",
      isAuthView ? "100%" : "",
      "important"
    );
  }

  $$(".view").forEach((view) => {
    const isAuth = view === authView;

    view.style.setProperty(
      "display",
      isAuthView
        ? (isAuth ? "grid" : "none")
        : "",
      "important"
    );

    view.style.setProperty(
      "visibility",
      isAuthView
        ? (isAuth ? "visible" : "hidden")
        : "",
      "important"
    );

    view.style.setProperty(
      "pointer-events",
      isAuthView
        ? (isAuth ? "auto" : "none")
        : "",
      "important"
    );
  });
}


function setView(viewName, persist = true) {
  if (!state.currentUser && viewName !== "auth") {
    viewName = "auth";
  }

  $$(".view").forEach((view) => view.classList.remove("active"));
  $(`#${viewName}View`)?.classList.add("active");

  $$(".nav-btn").forEach((button) => {
    button.classList.toggle("active", button.dataset.view === viewName);
  });

  state.activeView = viewName;

  if (persist) saveState();

  $("#mainTopbar")?.classList.toggle("hidden-on-auth", !state.currentUser);
  $("#mainTopbar")?.classList.remove("menu-open");
  $("#hamburgerBtn")?.setAttribute("aria-expanded", "false");
     applyAuthLayout(viewName === "auth");



  if (viewName === "home") renderHome();
  if (viewName === "library") renderLibrary();
  if (viewName === "analytics") renderAnalytics();

  window.scrollTo(0, 0);

}

function renderUser() {
  const name = state.currentUser?.name || "Learner";

  if ($("#userBadge")) {
    $("#userBadge").textContent = state.currentUser ? `👤 ${name}` : "";
    $("#userBadge").title = state.currentUser?.email || "";
  }

  if ($("#heroName")) $("#heroName").textContent = name;
  if ($("#profileNameInput")) $("#profileNameInput").value = state.currentUser?.name || "";
  if ($("#profileBioInput")) $("#profileBioInput").value = state.preferences.bio || "";
  if ($("#kidModeInput")) $("#kidModeInput").checked = Boolean(state.currentUser?.kidMode);
  if ($("#gameModeSelect")) $("#gameModeSelect").value = state.preferences.gameMode || "solo";
  if ($("#timedModeInput")) $("#timedModeInput").checked = Boolean(state.preferences.timedMode);
  if ($("#questionTimeInput")) $("#questionTimeInput").value = state.preferences.questionTime || 20;
  if ($("#soundInput")) $("#soundInput").checked = Boolean(state.preferences.soundEffects);
  if ($("#animationsInput")) $("#animationsInput").checked = state.preferences.animations !== false;
}

function getAverageScore() {
  if (!state.history.length) return 0;

  return Math.round(
    state.history.reduce((total, result) => total + Number(result.score || 0), 0) /
    state.history.length
  );
}

function renderStats() {
  if ($("#quizCount")) $("#quizCount").textContent = state.quizzes.length;
  if ($("#gameCount")) $("#gameCount").textContent = state.history.length;
  if ($("#avgScore")) $("#avgScore").textContent = `${getAverageScore()}%`;

  const totalMinutes = state.history.reduce(
    (total, result) => total + Number(result.durationMinutes || 2),
    0
  );

  if ($("#totalTime")) {
    $("#totalTime").textContent = totalMinutes >= 60
      ? `${(totalMinutes / 60).toFixed(1)}h`
      : `${totalMinutes}m`;
  }
}

function renderHome() {
  renderStats();

  const preview = $("#homePreview");
  const historyPreview = $("#historyPreview");

  if (preview) {
    preview.innerHTML = state.quizzes.slice(0, 3).map((quiz) => `
      <article class="quiz-card">
        <div class="badge-row">
          <span class="badge">${escapeHtml(quiz.subject || "General")}</span>
          <span class="badge">${escapeHtml(quiz.difficulty || "medium")}</span>
        </div>
        <h3>${escapeHtml(quiz.title)}</h3>
        <p>${quiz.questions.length} questions • ${escapeHtml(quiz.description || "Ready to play")}</p>
        <div class="quiz-actions">
          <button type="button" class="primary-btn" data-play-quiz="${quiz.id}">
            Play quiz
          </button>
        </div>
      </article>
    `).join("") || `
      <div class="empty-state">
        <h3>Create your first quiz</h3>
        <p>Your quizzes and activities will appear here.</p>
      </div>
    `;
  }

  if (historyPreview) {
    historyPreview.innerHTML = state.history.slice(0, 4).map((result) => `
      <article class="quiz-card">
        <span class="badge">${escapeHtml(formatMode(result.mode))}</span>
        <h3>${escapeHtml(result.title)}</h3>
        <p>${formatDate(result.date)}</p>
        <strong>${Number(result.score || 0)}%</strong>
      </article>
    `).join("") || `
      <div class="empty-state">
        <h3>No results yet</h3>
        <p>Complete a quiz to begin tracking your progress.</p>
      </div>
    `;
  }

  renderAchievements();
}

function renderAchievements() {
  const target = $("#achievementsList");
  if (!target) return;

  const achievements = [
    ["🎯", "First game", state.history.length >= 1],
    ["🧠", "Quiz creator", state.quizzes.length >= 1],
    ["🏆", "Perfect score", state.history.some((item) => Number(item.score) === 100)],
    ["🔥", "Five games", state.history.length >= 5]
  ];

  target.innerHTML = achievements.map(([emoji, title, earned]) => `
    <article class="achievement-card" style="${earned ? "" : "opacity:.42;filter:grayscale(1)"}">
      <div class="emoji">${emoji}</div>
      <p>${escapeHtml(title)}</p>
      <small>${earned ? "Earned" : "Locked"}</small>
    </article>
  `).join("");
}

function getFilteredQuizzes() {
  const query = state.libraryQuery.toLowerCase().trim();

  const quizzes = state.quizzes.filter((quiz) => {
    const matchesSearch = !query || [
      quiz.title,
      quiz.subject,
      quiz.description,
      quiz.category
    ].some((value) => String(value || "").toLowerCase().includes(query));

    const matchesDifficulty =
      !state.libraryFilter || quiz.difficulty === state.libraryFilter;

    return matchesSearch && matchesDifficulty;
  });

  return quizzes.sort((a, b) => {
    if (state.librarySort === "title") {
      return String(a.title).localeCompare(String(b.title));
    }

    if (state.librarySort === "subject") {
      return String(a.subject).localeCompare(String(b.subject));
    }

    if (state.librarySort === "difficulty") {
      const levels = { easy: 1, medium: 2, hard: 3 };
      return (levels[a.difficulty] || 0) - (levels[b.difficulty] || 0);
    }

    if (state.librarySort === "popular") {
      const playsA = state.history.filter((item) => item.quizId === a.id).length;
      const playsB = state.history.filter((item) => item.quizId === b.id).length;
      return playsB - playsA;
    }

    return Number(b.id) - Number(a.id);
  });
}

function renderLibrary() {
  const list = $("#quizList");
  if (!list) return;

  const quizzes = getFilteredQuizzes();

  list.innerHTML = quizzes.map((quiz) => `
    <article class="quiz-card">
      <div class="badge-row">
        <span class="badge">${escapeHtml(quiz.subject || "General")}</span>
        <span class="badge">${quiz.questions.length} questions</span>
        <span class="badge">${escapeHtml(quiz.difficulty || "medium")}</span>
      </div>

      <h3>${escapeHtml(quiz.title)}</h3>
      <p>${escapeHtml(quiz.description || "Ready to play")}</p>

      <div class="quiz-actions">
        <button type="button" class="primary-btn" data-play-quiz="${quiz.id}">
          Choose mode
        </button>
        <button type="button" class="tiny-btn danger" data-delete-quiz="${quiz.id}">
          Delete
        </button>
      </div>
    </article>
  `).join("") || `
    <div class="empty-state">
      <h3>${state.quizzes.length ? "No matching quizzes" : "Your library is empty"}</h3>
      <p>${state.quizzes.length
        ? "Try changing the search or difficulty filter."
        : "Create a quiz to add it to your library."}</p>
    </div>
  `;
}

function renumberQuestions() {
  $$("#questionFields .question-card").forEach((card, index) => {
    const heading = card.querySelector(".question-number");
    if (heading) heading.textContent = `Question ${index + 1}`;
  });
}

function addQuestionBlock(question = null) {
  const container = $("#questionFields");
  if (!container) return;

  const number = container.children.length + 1;
  const block = document.createElement("article");

  block.className = "question-card";
  block.innerHTML = `
    <div class="question-head">
      <strong class="question-number">Question ${number}</strong>
      <button type="button" class="tiny-btn danger remove-question">Remove</button>
    </div>

    <label>
      Question
      <input name="question" maxlength="300" required
        value="${escapeHtml(question?.text || "")}"
        placeholder="Write a clear question">
    </label>

    <div class="option-grid">
      ${[0, 1, 2, 3].map((index) => `
        <input name="option" maxlength="180" required
          value="${escapeHtml(question?.options?.[index] || "")}"
          placeholder="Answer option ${index + 1}">
      `).join("")}
    </div>

    <label>
      Correct answer
      <select name="correct">
        ${[0, 1, 2, 3].map((index) => `
          <option value="${index}" ${question?.correct === index ? "selected" : ""}>
            Answer option ${index + 1}
          </option>
        `).join("")}
      </select>
    </label>
  `;

  container.appendChild(block);
}

function saveQuiz(event) {
  event.preventDefault();

  const form = event.currentTarget;
  const blocks = $$("#questionFields .question-card");

  form.querySelectorAll('[aria-invalid="true"]').forEach((element) => {
    element.removeAttribute("aria-invalid");
  });

  if (!blocks.length) {
    showMessage("Add at least one question.");
    return;
  }

  const data = new FormData(form);
  const title = String(data.get("title") || "").trim();
  const subject = String(data.get("subject") || "General").trim();
  const description = String(data.get("description") || "").trim();
  const category = String(data.get("category") || "").trim();

  if (!title) {
    showMessage("Enter a quiz title.");
    return;
  }

  const questions = blocks.map((block) => ({
    text: block.querySelector('[name="question"]').value.trim(),
    options: [...block.querySelectorAll('[name="option"]')]
      .map((input) => input.value.trim()),
    correct: Number(block.querySelector('[name="correct"]').value)
  }));

  if (questions.some((question) =>
    !question.text || question.options.some((option) => !option)
  )) {
    showMessage("Complete every question and answer option.");
    return;
  }

  const safetyEntries = [
    {
      label: "quiz title",
      value: title,
      element: form.querySelector('[name="title"]')
    },
    {
      label: "subject",
      value: subject,
      element: form.querySelector('[name="subject"]')
    },
    {
      label: "description",
      value: description,
      element: form.querySelector('[name="description"]')
    },
    {
      label: "category",
      value: category,
      element: form.querySelector('[name="category"]')
    }
  ];

  blocks.forEach((block, questionIndex) => {
    const questionInput = block.querySelector('[name="question"]');
    const optionInputs = [...block.querySelectorAll('[name="option"]')];

    safetyEntries.push({
      label: `question ${questionIndex + 1}`,
      value: questionInput.value,
      element: questionInput
    });

    optionInputs.forEach((input, optionIndex) => {
      safetyEntries.push({
        label: `answer option ${optionIndex + 1} in question ${questionIndex + 1}`,
        value: input.value,
        element: input
      });
    });
  });

  const unsafeContent = validateQuizSafety(safetyEntries);

  if (unsafeContent) {
    showMessage(
      `Quiz blocked: ${unsafeContent.label} may contain ${unsafeContent.category}.`
    );

    if (unsafeContent.element) {
      unsafeContent.element.setAttribute("aria-invalid", "true");
      unsafeContent.element.focus();
      unsafeContent.element.scrollIntoView({
        behavior: "smooth",
        block: "center"
      });
    }

    return;
  }

  state.quizzes.unshift({
    id: Date.now(),
    title,
    subject,
    description,
    difficulty: String(data.get("difficulty") || "medium"),
    category,
    questions
  });

  saveState();
  form.reset();
  $("#questionFields").innerHTML = "";
  addQuestionBlock();
  renderHome();
  renderLibrary();
  setView("library");
  showMessage("Quiz saved successfully.");
}

function openModeChooser(quizId) {
  const quiz = state.quizzes.find((item) => item.id === Number(quizId));
  if (!quiz) return;

  let modal = $("#modeChooserModal");

  if (!modal) {
    modal = document.createElement("div");
    modal.id = "modeChooserModal";
    modal.className = "modal";
    modal.setAttribute("role", "dialog");
    modal.setAttribute("aria-modal", "true");
    document.body.appendChild(modal);
  }

  modal.innerHTML = `
    <div class="modal-backdrop" data-close-mode></div>

    <div class="modal-panel">
      <div class="modal-head">
        <div>
          <p class="eyebrow">Choose an experience</p>
          <h2>How would you like to play?</h2>
          <p class="muted-text">${escapeHtml(quiz.title)}</p>
        </div>
        <button type="button" class="text-btn" data-close-mode aria-label="Close">✕</button>
      </div>

      <div class="mode-grid">
        ${modeCard("practice", quiz.id, "📚", "Practice", "Instant feedback after each answer.")}
        ${modeCard("timed", quiz.id, "⏱️", "Timed challenge", "Complete each question before time expires.")}
        ${modeCard("exam", quiz.id, "📝", "Exam", "Focus mode with results shown at the end.")}
        ${modeCard("host", quiz.id, "🎮", "Host live", "Choose an interactive hosting experience.")}
      </div>

      <div id="hostModePicker" class="hidden" style="margin-top:24px">
        <div class="panel-head">
          <div>
            <p class="eyebrow">Live experiences</p>
            <h3>Select a hosting mode</h3>
          </div>
          <button type="button" class="text-btn" data-hide-host-modes>Back</button>
        </div>

        <div class="mode-grid">
          ${HOST_MODE_DEFS.map((mode) => `
            <button type="button" class="mode-card"
              data-host-mode="${mode.key}"
              data-host-label="${escapeHtml(mode.title)}"
              data-quiz-id="${quiz.id}">
              <span class="mode-icon">${mode.icon}</span>
              <strong>${escapeHtml(mode.title)}</strong>
              <small>${escapeHtml(mode.desc)}</small>
            </button>
          `).join("")}
        </div>
      </div>
    </div>
  `;

  modal.classList.remove("hidden");
  modal.querySelector("button")?.focus();
}

function modeCard(mode, quizId, icon, title, description) {
  return `
    <button type="button" class="mode-card"
      data-start-mode="${mode}" data-quiz-id="${quizId}">
      <span class="mode-icon">${icon}</span>
      <strong>${escapeHtml(title)}</strong>
      <small>${escapeHtml(description)}</small>
    </button>
  `;
}

function closeModeChooser() {
  $("#modeChooserModal")?.classList.add("hidden");
}

function startQuiz(quizId, mode, hostSubMode = null, hostLabel = "") {
  const quiz = state.quizzes.find((item) => item.id === Number(quizId));
  if (!quiz) return;

  closeModeChooser();

  const isHost = mode === "host";
  const timed = mode === "timed" || (isHost && hostSubMode === "speed");
  const timeLimit = Math.max(
    5,
    Math.min(120, Number(state.preferences.questionTime || 20))
  );
clearInterval(state.play?.timer);
clearTimeout(state.play?.answerTimeout);

  state.play = {
    quiz,
    mode,
    hostSubMode: isHost ? hostSubMode : null,
    hostLabel: isHost ? hostLabel : "",
    index: 0,
    answers: [],
    score: 0,
    correctCount: 0,
    streak: 0,
    lives: 3,
    sessionCode: isHost
      ? Math.random().toString(36).slice(2, 8).toUpperCase()
      : "",
    timer: null,
    answerTimeout: null,
    secondsLeft: timed ? timeLimit : null,
    timeLimit,
    lobbyStarted: !isHost,
    startedAt: Date.now(),
    answering: false
  };

  setView("play");
  renderPlay();
}

function renderHostLobby() {
  const play = state.play;
  const content = $("#playContent");
  if (!play || !content) return;

  const modeName = play.hostLabel || "Live session";
  const hostName = state.currentUser?.name || "Host";

  content.innerHTML = `
    <div class="play-head">
      <div>
        <p class="eyebrow">Live host lobby</p>
        <h2>${escapeHtml(play.quiz.title)}</h2>
        <p class="muted-text">${escapeHtml(modeName)} • ${play.quiz.questions.length} questions</p>
      </div>
      <span class="host-badge">● Waiting for players</span>
    </div>

    <section class="session-info">
      <div>
        <p class="eyebrow">Join with game code</p>
        <div class="copy-block">
          <strong class="session-code">${play.sessionCode}</strong>
          <button type="button" class="secondary-btn" data-copy-code>Copy code</button>
        </div>
      </div>
      <div>
        <strong>${escapeHtml(hostName)}</strong>
        <p class="muted-text">Session host</p>
      </div>
    </section>

    <section class="leaderboard-panel">
      <div class="panel-head">
        <div>
          <h3>Players</h3>
          <p>Participants appear here when they join.</p>
        </div>
        <span class="badge">0 / 30 joined</span>
      </div>

      <div class="leaderboard-list">
        <div class="leaderboard-item">
          <span class="leaderboard-rank">👑</span>
          <div>
            <strong>${escapeHtml(hostName)}</strong>
            <p class="muted-text">Host • Ready</p>
          </div>
        </div>
      </div>

      <div class="copy-block" style="margin-top:18px">
        <strong class="session-code">${play.sessionCode}</strong>
        <button type="button" class="secondary-btn" data-copy-code>
          Copy code
        </button>
      </div>

      <div class="form-actions" style="margin-top:18px">
        <button type="button" class="primary-btn" data-start-live-game>
          Start quiz
        </button>
      </div>
    </section>

    <div class="form-actions" style="margin-top:18px">
      <button type="button" class="secondary-btn" data-exit-game>
        Exit lobby
      </button>
    </div>
  `;
}

function renderPlay() {
  const play = state.play;
  const content = $("#playContent");
  if (!play || !content) return;

  clearInterval(play.timer);

  if (play.mode === "host" && !play.lobbyStarted) {
    renderHostLobby();
    return;
  }

  if (play.mode === "host") {
    renderHostLobby();
    return;
  }

  const question = play.quiz.questions[play.index];

  if (!question) {
    finishQuiz();
    return;
  }

  play.answering = false;

  const modeName = play.mode === "host"
    ? play.hostLabel || "Host session"
    : ({
        practice: "Practice",
        timed: "Timed challenge",
        exam: "Exam"
      }[play.mode] || play.mode);

  const isTimed =
    play.mode === "timed" ||
    (play.mode === "host" && play.hostSubMode === "speed");

  const progress = Math.round(
    ((play.index + 1) / play.quiz.questions.length) * 100
  );

  content.innerHTML = `
    <div class="play-head">
      <div>
        <p class="eyebrow">${escapeHtml(modeName)}</p>
        <h2>${escapeHtml(play.quiz.title)}</h2>
      </div>
      <span class="badge">Question ${play.index + 1} of ${play.quiz.questions.length}</span>
    </div>

    <div style="height:8px;border-radius:99px;background:var(--panel-soft);overflow:hidden">
      <div style="width:${progress}%;height:100%;background:linear-gradient(90deg,var(--accent),var(--accent-2));transition:width .25s"></div>
    </div>

    ${isTimed ? `
      <div class="timer-bar">
        <span>Time remaining</span>
        <strong id="questionTimer">${play.secondsLeft}s</strong>
      </div>
    ` : ""}

    ${play.mode === "host" ? `
      <div class="timer-bar" style="background:var(--accent-soft);color:var(--accent)">
        <span>Streak: <strong>${play.streak}</strong></span>
        ${play.hostSubMode === "survival"
          ? `<span>Lives: <strong>${"♥️".repeat(Math.max(0, play.lives))}</strong></span>`
          : ""}
      </div>
    ` : ""}

    <h3 class="play-question">${escapeHtml(question.text)}</h3>

    <div class="option-list">
      ${question.options.map((option, index) => `
        <button type="button" class="option-btn" data-answer-index="${index}">
          <strong>${String.fromCharCode(65 + index)}.</strong>
          ${escapeHtml(option)}
        </button>
      `).join("")}
    </div>

    <div id="answerFeedback" class="feedback hidden" role="status"></div>

    <div class="form-actions" style="margin-top:20px">
      <button type="button" class="secondary-btn" data-exit-game>Exit quiz</button>
    </div>
  `;

  if (isTimed) startTimer();
}

function startTimer() {
  const play = state.play;
  if (!play) return;

  clearInterval(play.timer);

  play.timer = setInterval(() => {
    if (!state.play || state.play.answering) return;

    state.play.secondsLeft -= 1;

    const timer = $("#questionTimer");
    if (timer) timer.textContent = `${Math.max(0, state.play.secondsLeft)}s`;

    if (state.play.secondsLeft <= 0) {
      clearInterval(state.play.timer);
      answerQuestion(-1);
    }
  }, 1000);
}

function answerQuestion(answerIndex) {
  const play = state.play;
  if (!play || play.answering) return;

  play.answering = true;
  clearInterval(play.timer);

  const question = play.quiz.questions[play.index];
  const isCorrect = answerIndex === question.correct;

  if (isCorrect) {
    play.correctCount += 1;
    play.streak += 1;

    if (play.mode === "host" && play.hostSubMode === "streak") {
      play.score += play.streak;
    } else if (play.mode === "host" && play.hostSubMode === "speed") {
      play.score += 1 + Math.max(0, Math.floor((play.secondsLeft || 0) / 5));
    } else {
      play.score += 1;
    }
  } else {
    play.streak = 0;

    if (play.mode === "host" && play.hostSubMode === "survival") {
      play.lives -= 1;
    }
  }

  play.answers.push({
    question: question.text,
    answerIndex,
    correct: isCorrect
  });

  $$(".option-btn").forEach((button, index) => {
    button.disabled = true;

    if (index === question.correct) button.classList.add("correct");
    if (index === answerIndex && !isCorrect) button.classList.add("wrong");
  });

  const feedback = $("#answerFeedback");

  if (feedback) {
    feedback.classList.remove("hidden");

    if (answerIndex === -1) {
      feedback.textContent = `Time is up. Correct answer: ${question.options[question.correct]}`;
    } else if (isCorrect) {
      feedback.textContent = "Correct — well done.";
    } else {
      feedback.textContent = `Incorrect. Correct answer: ${question.options[question.correct]}`;
    }
  }

  play.answerTimeout = setTimeout(() => {
  if (state.play !== play) return;
    if (
      play.mode === "host" &&
      play.hostSubMode === "survival" &&
      play.lives <= 0
    ) {
      finishQuiz();
      return;
    }

    play.index += 1;
    play.secondsLeft = (
      play.mode === "timed" ||
      (play.mode === "host" && play.hostSubMode === "speed")
    ) ? play.timeLimit : null;

    renderPlay();
  }, play.mode === "exam" ? 450 : 1200);
}

function finishQuiz() {
  const play = state.play;
  if (!play) return;

 clearInterval(play.timer);
clearTimeout(play.answerTimeout);


  const percentage = Math.round(
    (play.correctCount / play.quiz.questions.length) * 100
  );

  const modeLabel = play.mode === "host"
    ? play.hostLabel || `Host ${play.hostSubMode || ""}`
    : play.mode;

  const durationMinutes = Math.max(
    1,
    Math.round((Date.now() - play.startedAt) / 60000)
  );

  state.history.unshift({
    id: Date.now(),
    quizId: play.quiz.id,
    title: play.quiz.title,
    mode: modeLabel,
    score: percentage,
    correct: play.correctCount,
    total: play.quiz.questions.length,
    durationMinutes,
    date: new Date().toISOString()
  });

  saveState();
  renderHome();
  renderAnalytics();

  const resultTitle =
    percentage === 100 ? "Outstanding work!" :
    percentage >= 80 ? "Great result!" :
    percentage >= 60 ? "Good progress!" :
    "Keep practicing!";

  $("#playContent").innerHTML = `
    <div class="result-box">
      <p class="eyebrow">${escapeHtml(formatMode(modeLabel))} complete</p>
      <h2>${resultTitle}</h2>
      <p>You answered <strong>${play.correctCount} of ${play.quiz.questions.length}</strong> correctly.</p>
      <h3>${percentage}%</h3>
      <div class="form-actions">
        <button type="button" class="primary-btn" data-replay-quiz="${play.quiz.id}">
          Play again
        </button>
        <button type="button" class="secondary-btn" data-view="home">
          Back home
        </button>
      </div>
    </div>
  `;

  state.play = null;
}

function renderAnalytics() {
  const chart = $("#performanceChart");
  const topList = $("#topQuizzesList");
  const detailed = $("#detailedHistory");

  if (chart) {
    const recent = [...state.history].slice(0, 8).reverse();

    chart.innerHTML = recent.length ? `
      <div style="display:flex;align-items:flex-end;gap:10px;width:100%;height:170px">
        ${recent.map((result) => `
          <div title="${escapeHtml(result.title)}: ${result.score}%"
            style="flex:1;min-width:16px;height:${Math.max(5, result.score)}%;
            border-radius:8px 8px 3px 3px;
            background:linear-gradient(180deg,var(--accent-2),var(--accent))">
          </div>
        `).join("")}
      </div>
    ` : `<p class="muted-text">Complete a quiz to see performance trends.</p>`;
  }

  if (topList) {
    const quizStats = state.quizzes
      .map((quiz) => {
        const results = state.history.filter((item) =>
          item.quizId === quiz.id || item.title === quiz.title
        );

        return {
          title: quiz.title,
          plays: results.length,
          average: results.length
            ? Math.round(results.reduce((sum, item) => sum + item.score, 0) / results.length)
            : 0
        };
      })
      .sort((a, b) => b.plays - a.plays)
      .slice(0, 5);

    topList.innerHTML = quizStats.length ? quizStats.map((item) => `
      <div class="mini-list-item">
        <div>
          <strong>${escapeHtml(item.title)}</strong>
          <div class="muted-text">${item.plays} plays</div>
        </div>
        <span class="badge">${item.average}%</span>
      </div>
    `).join("") : `<p class="muted-text">No quiz data yet.</p>`;
  }

  if (detailed) {
    detailed.innerHTML = state.history.length ? `
      <table>
        <thead>
          <tr>
            <th>Quiz</th>
            <th>Mode</th>
            <th>Score</th>
            <th>Date</th>
          </tr>
        </thead>
        <tbody>
          ${state.history.map((result) => `
            <tr>
              <td>${escapeHtml(result.title)}</td>
              <td>${escapeHtml(formatMode(result.mode))}</td>
              <td><strong>${result.score}%</strong></td>
              <td>${formatDate(result.date)}</td>
            </tr>
          `).join("")}
        </tbody>
      </table>
    ` : `
      <div class="empty-state">
        <p>Your detailed results will appear here.</p>
      </div>
    `;
  }
}

function formatMode(mode = "") {
  return String(mode)
    .replace(/host-/gi, "")
    .replace(/[-_]/g, " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function formatDate(date) {
  const parsed = new Date(date);
  return Number.isNaN(parsed.getTime())
    ? "Recently"
    : parsed.toLocaleDateString(undefined, {
        month: "short",
        day: "numeric",
        year: "numeric"
      });
}

async function createAccount(event) {
  event.preventDefault();

  const email = $("#signupEmail").value.trim().toLowerCase();
  const password = $("#signupPassword").value;
  const name = $("#signupName").value.trim() || "Learner";

  if (password.length < 8) {
    showMessage("Use a password with at least 8 characters.");
    return;
  }

  if (state.accounts.some((account) => account.email === email)) {
    showMessage("An account with this email already exists.");
    return;
  }

  const account = {
    id: Date.now(),
    name,
    email,
    passwordHash: await hashPassword(password),
    kidMode: false,
    createdAt: new Date().toISOString()
  };

  state.accounts.push(account);
  state.currentUser = {
    id: account.id,
    name: account.name,
    email: account.email,
    kidMode: account.kidMode
  };

  saveState();
  renderUser();
  setView("home");
  showMessage("Account created successfully.");
}

async function signIn(event) {
  event.preventDefault();

  const email = $("#signinEmail").value.trim().toLowerCase();
  const password = $("#signinPassword").value;
  const passwordHash = await hashPassword(password);

  const account = state.accounts.find((item) => item.email === email);

  const passwordMatches = account && (
    account.passwordHash === passwordHash ||
    account.password === password ||
    account.passwordHash === `legacy:${password}`
  );

  if (!passwordMatches) {
    showMessage("Incorrect email or password.");
    return;
  }

  if (!account.passwordHash || account.password) {
    account.passwordHash = passwordHash;
    delete account.password;
  }

  state.currentUser = {
    id: account.id,
    name: account.name,
    email: account.email,
    kidMode: account.kidMode
  };

  saveState();
  renderUser();
  setView("home");
  showMessage("Welcome back.");
}

function saveSettings(event) {
  event.preventDefault();

  if (state.currentUser) {
    state.currentUser.name = $("#profileNameInput").value.trim() || "Learner";

    const account = state.accounts.find(
      (item) => item.email === state.currentUser.email
    );

    if (account) {
      account.name = state.currentUser.name;
    }
  }

  state.preferences = {
    bio: $("#profileBioInput").value.trim(),
    gameMode: $("#gameModeSelect").value,
    timedMode: $("#timedModeInput").checked,
    questionTime: Math.max(5, Math.min(120, Number($("#questionTimeInput").value) || 20)),
    soundEffects: false,
    animations: true
  };

  state.theme = $("#themeSelect").value;
  state.compact = $("#compactModeInput").checked;

  saveState();
  applyTheme();
  renderUser();
  showMessage("Preferences saved.");
}

function resetSettings() {
  state.theme = "system";
  state.compact = false;
  state.preferences = {
    bio: "",
    gameMode: "solo",
    timedMode: false,
    questionTime: 20,
    soundEffects: false,
    animations: true
  };

  saveState();
  applyTheme();
  renderUser();
  showMessage("Settings reset to defaults.");
}

function downloadJson(filename, value) {
  const blob = new Blob([JSON.stringify(value, null, 2)], {
    type: "application/json"
  });

  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");

  link.href = url;
  link.download = filename;
  link.click();

  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function exportUserData() {
  downloadJson("quilet-data.json", {
    profile: state.currentUser,
    preferences: state.preferences,
    quizzes: state.quizzes,
    history: state.history,
    exportedAt: new Date().toISOString()
  });

  showMessage("Your data export has started.");
}

function deleteAccount() {
  const confirmed = window.confirm(
    "Delete this account and all locally stored quizzes and results? This cannot be undone."
  );

  if (!confirmed) return;

  state.accounts = state.accounts.filter(
    (account) => account.email !== state.currentUser?.email
  );
  state.currentUser = null;
  state.quizzes = [];
  state.history = [];
  clearInterval(state.play?.timer);
clearTimeout(state.play?.answerTimeout);
  state.play = null;
  state.activeView = "auth";

  saveState();
  renderHome();
  renderLibrary();
  setView("auth");
  showMessage("Account and local data deleted.");
}

async function copySessionCode() {
  const code = state.play?.sessionCode;
  if (!code) return;

  try {
    await navigator.clipboard.writeText(code);
    showMessage("Session code copied.");
  } catch {
    window.prompt("Copy this session code:", code);
  }
}

function bindEvents() {
  document.addEventListener("click", async (event) => {
    const viewButton = event.target.closest("[data-view]");

    if (viewButton && !viewButton.matches("[data-replay-quiz]")) {
      setView(viewButton.dataset.view);
      return;
    }

    if (event.target.closest("#hamburgerBtn")) {
      const topbar = $("#mainTopbar");
      const open = topbar?.classList.toggle("menu-open");
      $("#hamburgerBtn")?.setAttribute("aria-expanded", String(Boolean(open)));
      return;
    }

    const playButton = event.target.closest("[data-play-quiz]");
    if (playButton) {
      openModeChooser(playButton.dataset.playQuiz);
      return;
    }

    const hostTrigger = event.target.closest('[data-start-mode="host"]');
    if (hostTrigger) {
      $("#hostModePicker")?.classList.remove("hidden");
      hostTrigger.closest(".mode-grid")?.classList.add("hidden");
      return;
    }

    if (event.target.closest("[data-hide-host-modes]")) {
      $("#hostModePicker")?.classList.add("hidden");
      $("#modeChooserModal > .modal-panel > .mode-grid")?.classList.remove("hidden");
      return;
    }

    const hostMode = event.target.closest("[data-host-mode]");
    if (hostMode) {
      startQuiz(
        hostMode.dataset.quizId,
        "host",
        hostMode.dataset.hostMode,
        hostMode.dataset.hostLabel
      );
      return;
    }

    const modeButton = event.target.closest("[data-start-mode]");
    if (modeButton) {
      startQuiz(modeButton.dataset.quizId, modeButton.dataset.startMode);
      return;
    }

    if (event.target.closest("[data-close-mode]")) {
      closeModeChooser();
      return;
    }

    if (event.target.closest("[data-start-live-game]") && state.play?.mode === "host") {
      state.play.lobbyStarted = true;
      renderPlay();
      return;
    }

    const answer = event.target.closest("[data-answer-index]");
    if (answer) {
      answerQuestion(Number(answer.dataset.answerIndex));
      return;
    }

    if (event.target.closest("[data-exit-game]")) {
      clearInterval(state.play?.timer);
clearTimeout(state.play?.answerTimeout);
state.play = null;

      setView("library");
      return;
    }

    const replay = event.target.closest("[data-replay-quiz]");
    if (replay) {
      openModeChooser(replay.dataset.replayQuiz);
      return;
    }

    if (event.target.closest("[data-copy-code]")) {
      await copySessionCode();
      return;
    }

    const removeQuestion = event.target.closest(".remove-question");
    if (removeQuestion) {
      const cards = $$("#questionFields .question-card");

      if (cards.length <= 1) {
        showMessage("A quiz needs at least one question.");
        return;
      }

      removeQuestion.closest(".question-card")?.remove();
      renumberQuestions();
      return;
    }

    const deleteQuiz = event.target.closest("[data-delete-quiz]");
    if (deleteQuiz) {
      const quiz = state.quizzes.find(
        (item) => item.id === Number(deleteQuiz.dataset.deleteQuiz)
      );

      if (!quiz || !window.confirm(`Delete "${quiz.title}"?`)) return;

      state.quizzes = state.quizzes.filter((item) => item.id !== quiz.id);
      saveState();
      renderHome();
      renderLibrary();
      showMessage("Quiz deleted.");
    }
  });

  $("#toggleAuthBtn")?.addEventListener("click", () => {
    const signInVisible = !$("#signinForm").classList.contains("hidden");

    $("#signinForm").classList.toggle("hidden", signInVisible);
    $("#signupForm").classList.toggle("hidden", !signInVisible);
    $("#authTitle").textContent = signInVisible
      ? "Create your Quilet account"
      : "Sign in to Quilet";
    $("#toggleAuthBtn").textContent = signInVisible
      ? "Back to sign in"
      : "Create account";
    $("#authMessage").textContent = "";
  });

  $("#signinForm")?.addEventListener("submit", signIn);
  $("#signupForm")?.addEventListener("submit", createAccount);
  $("#quizForm")?.addEventListener("submit", saveQuiz);
  $("#settingsForm")?.addEventListener("submit", saveSettings);
  $("#addQuestionBtn")?.addEventListener("click", () => addQuestionBlock());
  $("#resetSettingsBtn")?.addEventListener("click", resetSettings);
  $("#exportDataBtn")?.addEventListener("click", exportUserData);
  $("#deleteAccountBtn")?.addEventListener("click", deleteAccount);
  $("#quizForm")?.addEventListener("input", (event) => {
    if (event.target.matches("input, textarea")) {
      event.target.removeAttribute("aria-invalid");
    }
  });

$("#logoutBtn")?.addEventListener("click", (event) => {
  event.preventDefault();
  event.stopPropagation();

  clearInterval(state.play?.timer);
  clearTimeout(state.play?.answerTimeout);

  state.currentUser = null;
  state.play = null;
  state.activeView = "auth";

  document.documentElement.classList.add("auth-mode");
  document.body.classList.add("auth-mode");

  applyAuthLayout(true);
  setView("auth", false);

  const topbar = $("#mainTopbar");
  if (topbar) {
    topbar.style.setProperty("display", "none", "important");
  }

  void window.supabaseClient?.auth.signOut();
  window.scrollTo(0, 0);
  saveState();
  showMessage("You have signed out.");
});






  $("#clearHistoryBtn")?.addEventListener("click", () => {
    if (!state.history.length) return;

    if (!window.confirm("Clear all quiz result history?")) return;

    state.history = [];
    saveState();
    renderHome();
    renderAnalytics();
    showMessage("Result history cleared.");
  });

  $("#themeSelect")?.addEventListener("change", (event) => {
    state.theme = event.target.value;
    saveState();
    applyTheme();
  });

  $("#compactModeInput")?.addEventListener("change", (event) => {
    state.compact = event.target.checked;
    saveState();
    applyTheme();
  });

  $("#librarySearch")?.addEventListener("input", (event) => {
    state.libraryQuery = event.target.value;
    renderLibrary();
  });


  $("#librarySort")?.addEventListener("change", (event) => {
    state.librarySort = event.target.value;
    renderLibrary();
  });

  $("#libraryFilter")?.addEventListener("change", (event) => {
    state.libraryFilter = event.target.value;
    renderLibrary();
 $("#notificationBtn")?.addEventListener("click", () => {
    const message = state.history.length
      ? `Your latest score is ${state.history[0].score}%.`
      : "No new notifications.";
    showMessage(message);
  });  });

  window.matchMedia?.("(prefers-color-scheme: dark)")
    .addEventListener("change", () => {
      if (state.theme === "system") applyTheme();
    });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      closeModeChooser();
      $("#mainTopbar")?.classList.remove("menu-open");
    }

    if (
      state.play &&
      !state.play.answering &&
      ["1", "2", "3", "4"].includes(event.key)
    ) {
      answerQuestion(Number(event.key) - 1);
    }
  });
}

function initializeAccessibility() {
  $("#hamburgerBtn")?.setAttribute("aria-expanded", "false");
  $("#hamburgerBtn")?.setAttribute("aria-controls", "topbarActions");
  $("#notificationToast")?.classList.add("hidden");
}
let initialized = false;

function init() {
  if (initialized) return;
  initialized = true;

  bindEvents();
  initializeAccessibility();
  applyTheme();
  renderUser();
  renderHome();
  renderLibrary();
  renderAnalytics();

  if ($("#questionFields") && !$("#questionFields").children.length) {
    addQuestionBlock();
  }

  if (state.currentUser) {
    setView(state.activeView === "auth" ? "home" : state.activeView, false);
  } else {
    setView("auth", false);
  }
}

window.startQuiz = startQuiz;
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", init, { once: true });
} else {
  init();
}
document.addEventListener("DOMContentLoaded", () => {
  const workspaceSearch = document.querySelector("#workspaceHeader .workspace-search");

  if (workspaceSearch) {
    workspaceSearch.addEventListener("click", () => {
      // Switch to the library view
      if (typeof setView === "function") {
        setView("library");
      }

      // Focus the library search input
      setTimeout(() => {
        const libraryInput = document.querySelector("#librarySearch");
        if (libraryInput) {
          libraryInput.focus();
        }
      }, 100);
    });
  }
});
// Password Reset Function
async function handlePasswordReset() {
  const user = state.currentUser;

  if (!user || !user.email) {
    showMessage("Please sign in before attempting to reset your password.");
    return;
  }

  // 1. Supabase Reset Request (if Supabase client is available)
  if (window.supabaseClient) {
    try {
      const { error } = await window.supabaseClient.auth.resetPasswordForEmail(
        user.email,
        { redirectTo: window.location.origin }
      );

      if (error) throw error;

      showMessage(`Password reset email sent to ${user.email}. Check your inbox!`);
      return;
    } catch (err) {
      console.warn("Supabase email reset failed, falling back to local account check:", err);
    }
  }

  // 2. Local Account Password Reset Flow
  const currentPassword = window.prompt("Enter your CURRENT password:");
  if (!currentPassword) return;

  const currentHash = await hashPassword(currentPassword);
  const account = state.accounts.find(
    (acc) => acc.email.toLowerCase() === user.email.toLowerCase()
  );

  if (!account) {
    showMessage("Unable to locate your account record.");
    return;
  }

  const matches =
    account.passwordHash === currentHash ||
    account.password === currentPassword ||
    account.passwordHash === `legacy:${currentPassword}`;

  if (!matches) {
    showMessage("Incorrect current password.");
    return;
  }

  const newPassword = window.prompt("Enter your NEW password (minimum 8 characters):");
  if (!newPassword) return;

  if (newPassword.length < 8) {
    showMessage("New password must be at least 8 characters long.");
    return;
  }

  account.passwordHash = await hashPassword(newPassword);
  delete account.password;

  saveState();
  showMessage("Your password has been updated successfully.");
}

// Bind event listener safely
document.addEventListener("DOMContentLoaded", () => {
  const resetBtn = document.querySelector("#resetPasswordBtn");
  if (resetBtn) {
    resetBtn.addEventListener("click", handlePasswordReset);
  }
});