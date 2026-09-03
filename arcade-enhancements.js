(() => {
  if (window.__quiletArcadeEnhancementsLoaded) return;
  window.__quiletArcadeEnhancementsLoaded = true;

  const read = (key, fallback) => {
    try {
      const value = localStorage.getItem(key);
      return value === null ? fallback : JSON.parse(value);
    } catch {
      return fallback;
    }
  };

  const escapeHtml = (value = "") => String(value).replace(/[&<>"']/g, (character) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;"
  }[character]));

  function currentUser() {
    return read("quiletUser", null);
  }

  function getData() {
    const quizzes = read("quiletQuizzes", []);
    const history = read("quiletHistory", []);
    const xp = history.reduce((total, result) => {
      return total + 25 + Math.round(Number(result.score || 0) / 5);
    }, 0) + quizzes.length * 40;
    const level = Math.floor(xp / 250) + 1;
    const levelStart = (level - 1) * 250;
    const levelProgress = Math.min(100, Math.round(((xp - levelStart) / 250) * 100));
    const dates = [...new Set(history.map((result) => new Date(result.date).toDateString()))];
    let streak = 0;
    let cursor = new Date();

    while (dates.includes(cursor.toDateString())) {
      streak += 1;
      cursor.setDate(cursor.getDate() - 1);
    }

    const today = new Date().toISOString().slice(0, 10);
    const challengeIndex = today.split("").reduce((sum, character) => sum + character.charCodeAt(0), 0);
    const challenge = quizzes.length ? quizzes[challengeIndex % quizzes.length] : null;

    return { quizzes, history, xp, level, levelProgress, streak, challenge };
  }

  function render() {
    const home = document.querySelector("#homeView");
    const user = currentUser();
    if (!home || !user || home.querySelector("#arcadeHub")) return;

    const data = getData();
    const hub = document.createElement("section");
    hub.id = "arcadeHub";
    hub.className = "arcade-hub";
    hub.innerHTML = `
      <div class="arcade-hub-main">
        <div class="arcade-hub-heading">
          <div>
            <p class="eyebrow">Your arcade progress</p>
            <h2>Keep your momentum</h2>
          </div>
          <span class="arcade-level">Level ${data.level}</span>
        </div>
        <div class="arcade-progress-track" aria-label="${data.levelProgress}% toward next level">
          <span style="width:${data.levelProgress}%"></span>
        </div>
        <div class="arcade-hub-meta">
          <strong>${data.xp} XP</strong>
          <span>${250 - Math.round((data.xp % 250))} XP to Level ${data.level + 1}</span>
        </div>
      </div>
      <div class="arcade-streak">
        <span class="arcade-streak-icon" aria-hidden="true">🔥</span>
        <div><strong>${data.streak} day${data.streak === 1 ? "" : "s"}</strong><small>Learning streak</small></div>
      </div>
      <div class="arcade-challenge">
        <div><p class="eyebrow">Daily challenge</p><h3>${data.challenge ? escapeHtml(data.challenge.title) : "Create your first quiz"}</h3><p>${data.challenge ? `${data.challenge.questions.length} questions • Earn bonus XP` : "Your first quiz becomes tomorrow's challenge."}</p></div>
        ${data.challenge ? `<button type="button" class="primary-btn" data-play-quiz="${escapeHtml(data.challenge.id)}">Play now</button>` : `<button type="button" class="primary-btn" data-view="create">Create quiz</button>`}
      </div>
    `;

    const stats = home.querySelector(".stats-grid");
    if (stats) stats.insertAdjacentElement("afterend", hub);
  }

  function refresh() {
    document.querySelector("#arcadeHub")?.remove();
    render();
  }

  function initialize() {
    render();
    document.addEventListener("click", (event) => {
      if (event.target.closest('[data-view="home"]')) {
        window.setTimeout(refresh, 0);
      }
    });
    window.addEventListener("storage", refresh);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initialize, { once: true });
  } else {
    initialize();
  }
})();
