(() => {
  const TEAM_ADJECTIVES = [
    "Crimson", "Golden", "Cosmic", "Mighty", "Electric",
    "Silver", "Emerald", "Rapid", "Mystic", "Brave",
    "Frost", "Solar", "Shadow", "Royal", "Wild"
  ];

  const TEAM_NOUNS = [
    "Comets", "Dragons", "Falcons", "Tigers", "Wolves",
    "Rockets", "Phoenixes", "Sharks", "Panthers", "Titans",
    "Guardians", "Storms", "Knights", "Ravens", "Lions", "Kings"
  ];

  const modeState = {
    format: null,
    selectedQuizId: null,
    teamNames: [],
    teamCount: 0,
    assignments: new Map(),
    participants: [],
    scores: new Map(),
    isHost: false,
    gameStarted: false,
    leaderboardOpen: true,
    winnersShown: false,
    updateQueued: false,
    signature: ""
  };

  const $ = (selector) => document.querySelector(selector);

  function escapeHtml(value = "") {
    return String(value).replace(/[&<>"']/g, (character) => ({
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&#039;",
      "'": "&#039;"
    }[character]));
  }

  function showMessage(message) {
    const toast = $("#notificationToast");

    if (!toast) {
      console.info(message);
      return;
    }

    toast.textContent = message;
    toast.classList.remove("hidden");
    toast.setAttribute("role", "status");

    clearTimeout(showMessage.timer);
    showMessage.timer = setTimeout(() => {
      toast.classList.add("hidden");
    }, 4000);
  }

  function addStyles() {
    if ($("#gmStyles")) return;

    const style = document.createElement("style");
    style.id = "gmStyles";
    style.textContent = `
      .gm-leaderboard-box {
        display: flex !important;
        flex-direction: column !important;
        height: min(820px, calc(100vh - 56px)) !important;
        max-height: calc(100vh - 56px) !important;
        min-height: 0 !important;
        overflow: hidden !important;
      }

      .gm-leaderboard-body {
        display: block !important;
        flex: 1 1 auto !important;
        width: auto !important;
        min-height: 0 !important;
        max-height: none !important;
        margin: 18px 26px !important;
        padding: 8px !important;
        overflow-y: scroll !important;
        overflow-x: hidden !important;
        overscroll-behavior: contain;
        scrollbar-width: none !important;
        -ms-overflow-style: none !important;
      }

      .gm-leaderboard-body::-webkit-scrollbar {
        display: none !important;
        width: 0 !important;
        height: 0 !important;
      }

      @media (max-width: 700px) {
        .gm-leaderboard-box {
          height: calc(100vh - 24px) !important;
          max-height: calc(100vh - 24px) !important;
        }

        .gm-leaderboard-body {
          margin: 14px 16px !important;
        }
      }

      .gm-team-choice {
        display: grid;
        grid-template-columns: repeat(2, minmax(0, 1fr));
        gap: 14px;
        margin-top: 18px;
      }

      .gm-leaderboard-modal {
        position: fixed;
        inset: 0;
        z-index: 5000;
        display: grid;
        padding: 28px;
        place-items: center;
      }

      .gm-leaderboard-modal[hidden] {
        display: none;
      }

      .gm-leaderboard-backdrop {
        position: absolute;
        inset: 0;
        border: 0;
        background: rgba(15, 23, 42, .58);
        backdrop-filter: blur(12px);
      }

      .gm-leaderboard-box {
        position: relative;
        z-index: 1;
        width: min(960px, 100%);
        border: 1px solid var(--border);
        border-radius: 28px;
        background: var(--panel, #fff);
        color: var(--text, #0f172a);
        box-shadow: 0 35px 100px rgba(15, 23, 42, .42);
      }

      .gm-leaderboard-head {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 20px;
        flex: 0 0 auto;
        padding: 24px 26px;
        border-bottom: 1px solid var(--border);
        background: var(--accent-soft);
      }

      .gm-leaderboard-title {
        display: flex;
        min-width: 0;
        gap: 15px;
        align-items: center;
      }

      .gm-leaderboard-icon {
        display: grid;
        flex: 0 0 auto;
        width: 56px;
        height: 56px;
        place-items: center;
        border-radius: 18px;
        background: var(--panel);
        font-size: 1.8rem;
      }

      .gm-leaderboard-head h2 {
        margin: 0;
        font-size: clamp(1.3rem, 3vw, 1.8rem);
      }

      .gm-leaderboard-head p {
        margin: 4px 0 0;
        color: var(--muted);
      }

      .gm-leaderboard-summary {
        display: grid;
        flex: 0 0 auto;
        grid-template-columns: repeat(3, minmax(0, 1fr));
        gap: 12px;
        padding: 18px 26px 0;
      }

      .gm-summary-card {
        padding: 14px 16px;
        border: 1px solid var(--border);
        border-radius: 16px;
        background: var(--panel-soft, var(--panel));
      }

      .gm-summary-card span {
        display: block;
        margin-bottom: 4px;
        color: var(--muted);
        font-size: .78rem;
        font-weight: 700;
        text-transform: uppercase;
      }

      .gm-summary-card strong {
        display: block;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }

      .gm-ranking-row {
        display: grid;
        grid-template-columns: 52px minmax(0, 1fr) auto;
        gap: 14px;
        align-items: center;
        padding: 14px 16px;
        border-radius: 15px;
      }

      .gm-ranking-row:nth-child(odd) {
        background: var(--panel);
      }

      .gm-ranking-position {
        display: grid;
        width: 42px;
        height: 42px;
        place-items: center;
        border-radius: 50%;
        background: var(--accent-soft);
        color: var(--accent);
        font-weight: 900;
      }

      .gm-ranking-name {
        min-width: 0;
        overflow: hidden;
        font-weight: 800;
        text-overflow: ellipsis;
        white-space: nowrap;
      }

      .gm-ranking-score {
        color: var(--accent);
        font-weight: 900;
      }

      .gm-leaderboard-empty {
        display: grid;
        min-height: 220px;
        padding: 30px;
        place-items: center;
        color: var(--muted);
        text-align: center;
      }

      .gm-leaderboard-actions {
        display: flex;
        flex: 0 0 auto;
        justify-content: flex-end;
        gap: 12px;
        padding: 18px 26px 24px;
        border-top: 1px solid var(--border);
      }

      .gm-action-button {
        min-width: 160px;
        min-height: 48px;
        padding: 11px 20px;
        border: 1px solid transparent;
        border-radius: 14px;
        cursor: pointer;
        font: inherit;
        font-weight: 800;
      }

      .gm-action-button:disabled {
        cursor: not-allowed;
        opacity: .48;
      }

      .gm-start-button {
        background: var(--accent);
        color: #fff;
      }

      .gm-end-button {
        border-color: #fecaca;
        background: #fff1f2;
        color: #be123c;
      }

      .gm-leaderboard-launcher {
        position: fixed;
        right: 22px;
        bottom: 22px;
        z-index: 4500;
        display: flex;
        align-items: center;
        gap: 10px;
        min-height: 50px;
        padding: 11px 18px;
        border: 1px solid var(--border);
        border-radius: 999px;
        background: var(--panel, #fff);
        color: var(--text, #0f172a);
        cursor: pointer;
        font: inherit;
        font-weight: 800;
      }

      .gm-launcher-count {
        display: grid;
        min-width: 27px;
        height: 27px;
        padding: 0 7px;
        place-items: center;
        border-radius: 999px;
        background: var(--accent);
        color: #fff;
        font-size: .8rem;
      }

      .gm-host-note {
        margin-right: auto;
        color: var(--muted);
        font-size: .87rem;
      }

      @media (max-width: 700px) {
        .gm-leaderboard-modal {
          padding: 12px;
        }

        .gm-leaderboard-box {
          border-radius: 22px;
        }

        .gm-leaderboard-head {
          padding: 18px;
        }

        .gm-leaderboard-summary {
          grid-template-columns: 1fr 1fr;
          padding: 14px 16px 0;
        }

        .gm-summary-card:last-child {
          grid-column: 1 / -1;
        }

        .gm-leaderboard-actions {
          display: grid;
          grid-template-columns: 1fr 1fr;
          padding: 16px;
        }

        .gm-host-note {
          grid-column: 1 / -1;
        }

        .gm-action-button {
          width: 100%;
          min-width: 0;
        }
      }

      @media (max-width: 480px) {
        .gm-team-choice,
        .gm-leaderboard-summary,
        .gm-leaderboard-actions {
          grid-template-columns: 1fr;
        }

        .gm-summary-card:last-child {
          grid-column: auto;
        }

        .gm-ranking-row {
          grid-template-columns: 42px minmax(0, 1fr);
        }

        .gm-ranking-score {
          grid-column: 2;
        }
      }
    `;

    document.head.appendChild(style);
  }

  function resetMode() {
    Object.assign(modeState, {
      format: null,
      selectedQuizId: null,
      teamNames: [],
      teamCount: 0,
      participants: [],
      isHost: false,
      gameStarted: false,
      leaderboardOpen: true,
      winnersShown: false,
      updateQueued: false,
      signature: ""
    });

    modeState.assignments.clear();
    modeState.scores.clear();

    window.QuiletTeamMode = {
      enabled: false,
      mode: null,
      label: "",
      assignments: modeState.assignments
    };

    document.body.classList.remove("gm-modal-open");
    $("#teamChoiceModal")?.remove();
    $("#hostLeaderboardBox")?.remove();
    $("#hostLeaderboardLauncher")?.remove();
  }

  function parseScore(element) {
    const direct =
      element.dataset.score ||
      element.querySelector("[data-score]")?.dataset.score;

    if (direct !== undefined) return Number(direct) || 0;

    const scoreElement = element.querySelector(
      ".score, .player-score, .leaderboard-score, [class*='score']"
    );

    if (scoreElement) {
      const score = Number(
        scoreElement.textContent.replace(/[^\d.-]/g, "")
      );

      if (Number.isFinite(score)) return score;
    }

    return 0;
  }

  function readLeaderboardEntries() {
    const rows = [
      ...document.querySelectorAll(
        ".leaderboard-panel .leaderboard-item, " +
        "[data-live-leaderboard] [data-player]"
      )
    ];

    return rows.map((item) => {
      const name = item.querySelector(
        "strong, [data-player-name], .player-name"
      )?.textContent.trim();

      if (!name) return null;

      return {
        name,
        score: parseScore(item)
      };
    }).filter(Boolean).filter((entry, index, entries) =>
      entries.findIndex((item) => item.name === entry.name) === index
    );
  }

  function rememberParticipants() {
    readLeaderboardEntries().forEach((entry) => {
      if (!modeState.participants.includes(entry.name)) {
        modeState.participants.push(entry.name);
      }

      modeState.scores.set(entry.name, entry.score);
    });
  }

  function getRankings() {
    rememberParticipants();

    return modeState.participants.map((name) => ({
      name,
      score: Number(modeState.scores.get(name) || 0)
    })).sort((a, b) =>
      b.score - a.score || a.name.localeCompare(b.name)
    );
  }

  function generateTeamName() {
    for (let attempt = 0; attempt < 100; attempt += 1) {
      const adjective = TEAM_ADJECTIVES[
        Math.floor(Math.random() * TEAM_ADJECTIVES.length)
      ];

      const noun = TEAM_NOUNS[
        Math.floor(Math.random() * TEAM_NOUNS.length)
      ];

      const name = `${adjective} ${noun}`;

      if (!modeState.teamNames.includes(name)) return name;
    }

    return `Team ${modeState.teamNames.length + 1}`;
  }

  function assignTeams(rankings) {
    if (modeState.format !== "teams" || !rankings.length) {
      return rankings;
    }

    const teamCount = Math.min(
      10,
      Math.max(1, Math.ceil(rankings.length / 4))
    );

    while (modeState.teamNames.length < teamCount) {
      modeState.teamNames.push(generateTeamName());
    }

    rankings.forEach((player, index) => {
      if (!modeState.assignments.has(player.name)) {
        modeState.assignments.set(player.name, index % teamCount);
      }
    });

    const teams = modeState.teamNames.slice(0, teamCount).map(
      (name) => ({ name, score: 0 })
    );

    rankings.forEach((player) => {
      const teamIndex = modeState.assignments.get(player.name);

      if (teams[teamIndex]) {
        teams[teamIndex].score += player.score;
      }
    });

    return teams.sort((a, b) =>
      b.score - a.score || a.name.localeCompare(b.name)
    );
  }

  function getDisplayedRankings() {
    return assignTeams(getRankings());
  }

  function hasHostScreen() {
    return Boolean(
      $("#playContent .leaderboard-panel") ||
      $("#playContent [data-live-leaderboard]") ||
      $(".session-info")
    );
  }

  function createLeaderboardModal() {
    let modal = $("#hostLeaderboardBox");

    if (modal) return modal;

    modal = document.createElement("div");
    modal.id = "hostLeaderboardBox";
    modal.className = "gm-leaderboard-modal";
    modal.setAttribute("role", "dialog");
    modal.setAttribute("aria-modal", "true");
    modal.setAttribute("aria-labelledby", "gmLeaderboardTitle");

    modal.innerHTML = `
      <button type="button" class="gm-leaderboard-backdrop"
        data-close-leaderboard aria-label="Close leaderboard"></button>

      <section class="gm-leaderboard-box">
        <header class="gm-leaderboard-head">
          <div class="gm-leaderboard-title">
            <span class="gm-leaderboard-icon">🏆</span>
            <div>
              <h2 id="gmLeaderboardTitle">Live Quiz Leaderboard</h2>
              <p data-leaderboard-status>Waiting for participants</p>
            </div>
          </div>

          <button type="button" class="gm-leaderboard-close"
            data-close-leaderboard aria-label="Close leaderboard">✕</button>
        </header>

        <div class="gm-leaderboard-summary">
          <article class="gm-summary-card">
            <span>Status</span>
            <strong data-summary-status>Waiting</strong>
          </article>
          <article class="gm-summary-card">
            <span>Format</span>
            <strong data-summary-format>Individual</strong>
          </article>
          <article class="gm-summary-card">
            <span>Participants</span>
            <strong data-summary-participants>0 players</strong>
          </article>
        </div>

        <div class="gm-leaderboard-body" aria-live="polite"></div>

        <footer class="gm-leaderboard-actions">
          <span class="gm-host-note">
            The host stays on this leaderboard while participants play.
          </span>

          <button type="button" class="gm-action-button gm-end-button"
            data-gm-end-quiz>End Quiz</button>

          <button type="button" class="gm-action-button gm-start-button"
            data-gm-start-quiz>▶ Start Quiz</button>
        </footer>
      </section>
    `;

    document.body.appendChild(modal);
    return modal;
  }

  function createLauncher() {
    let launcher = $("#hostLeaderboardLauncher");

    if (launcher) return launcher;

    launcher = document.createElement("button");
    launcher.id = "hostLeaderboardLauncher";
    launcher.className = "gm-leaderboard-launcher";
    launcher.type = "button";
    launcher.dataset.openLeaderboard = "true";
    launcher.innerHTML = `
      <span>🏆 Leaderboard</span>
      <span class="gm-launcher-count">0</span>
    `;

    document.body.appendChild(launcher);
    return launcher;
  }

  function setLeaderboardOpen(open) {
    modeState.leaderboardOpen = open;

    const modal = $("#hostLeaderboardBox");
    const launcher = $("#hostLeaderboardLauncher");

    if (modal) modal.hidden = !open;
    if (launcher) launcher.hidden = open;

    document.body.classList.toggle(
      "gm-modal-open",
      open && Boolean(modal)
    );
  }

  function getLiveControls() {
    return {
      publish: $("[data-publish-live]"),
      start: $("[data-start-live]"),
      end: $("[data-end-live]")
    };
  }

  function syncLiveState() {
    const controls = getLiveControls();

    if (
      controls.start &&
      (
        controls.start.textContent.includes("Quiz started") ||
        controls.end?.disabled === false
      )
    ) {
      modeState.gameStarted = true;
    }

    if (
      controls.end?.textContent.includes("Quiz ended") ||
      controls.start?.textContent.includes("Quiz ended")
    ) {
      modeState.gameStarted = false;
    }
  }

  function renderLeaderboardBox() {
    if (!modeState.isHost || !hasHostScreen()) return;

    syncLiveState();

    const modal = createLeaderboardModal();
    const launcher = createLauncher();
    const rankings = getDisplayedRankings();
    const controls = getLiveControls();

    const formatLabel =
      modeState.format === "teams" ? "Teams" : "Individual";

    const published = Boolean(
      controls.start && !controls.start.disabled
    );

    const ended = Boolean(
      controls.end?.textContent.includes("Quiz ended")
    );

    modal.hidden = !modeState.leaderboardOpen;
    launcher.hidden = modeState.leaderboardOpen;

    document.body.classList.toggle(
      "gm-modal-open",
      modeState.leaderboardOpen
    );

    launcher.querySelector(".gm-launcher-count").textContent =
      rankings.length;

    modal.querySelector("[data-leaderboard-status]").textContent =
      ended
        ? "Quiz ended"
        : modeState.gameStarted
          ? "Participants are answering the quiz"
          : published
            ? "Lobby published — ready to start"
            : "Publish the waiting lobby first";

    modal.querySelector("[data-summary-status]").textContent =
      ended
        ? "Ended"
        : modeState.gameStarted
          ? "Quiz in progress"
          : published
            ? "Lobby open"
            : "Not published";

    modal.querySelector("[data-summary-format]").textContent = formatLabel;
    modal.querySelector("[data-summary-participants]").textContent =
      `${rankings.length} ${rankings.length === 1 ? "player" : "players"}`;

    const startButton = modal.querySelector("[data-gm-start-quiz]");
    const endButton = modal.querySelector("[data-gm-end-quiz]");

    startButton.disabled =
      !controls.start ||
      controls.start.disabled ||
      modeState.gameStarted ||
      ended;

    startButton.textContent = modeState.gameStarted
      ? "Quiz Started"
      : "▶ Start Quiz";

    endButton.disabled =
      !controls.end ||
      controls.end.disabled ||
      ended;

    const body = modal.querySelector(".gm-leaderboard-body");

    body.innerHTML = rankings.length
      ? rankings.map((entry, index) => `
          <div class="gm-ranking-row">
            <span class="gm-ranking-position">
              ${index === 0 && modeState.gameStarted ? "👑" : index + 1}
            </span>
            <span class="gm-ranking-name">${escapeHtml(entry.name)}</span>
            <span class="gm-ranking-score">${entry.score} pts</span>
          </div>
        `).join("")
      : `
          <div class="gm-leaderboard-empty">
            <div>
              <span class="gm-empty-icon">👥</span>
              <strong>Waiting for participants</strong>
              <p>Players will appear here after joining the lobby.</p>
            </div>
          </div>
        `;

    body.scrollTop = body.scrollHeight;
  }

  function startParticipantsOnly() {
    const liveStartButton = $("[data-start-live]");

    if (!liveStartButton || liveStartButton.disabled) {
      showMessage("Publish the waiting lobby before starting.");
      return;
    }

    liveStartButton.click();
    modeState.gameStarted = true;
    modeState.leaderboardOpen = true;
    renderLeaderboardBox();
    setLeaderboardOpen(true);
  }

  function endParticipantsQuiz() {
    const liveEndButton = $("[data-end-live]");

    if (!liveEndButton || liveEndButton.disabled) {
      showMessage("Start the participant quiz before ending it.");
      return;
    }

    liveEndButton.click();
    setTimeout(renderLeaderboardBox, 500);
  }

  function openFormatChoice(button) {
    $("#teamChoiceModal")?.remove();

    modeState.selectedQuizId =
      button.dataset.quizId ||
      button.closest("[data-quiz-id]")?.dataset.quizId ||
      null;

    if (!modeState.selectedQuizId) return;

    const modal = document.createElement("div");
    modal.id = "teamChoiceModal";
    modal.className = "modal";
    modal.setAttribute("role", "dialog");
    modal.setAttribute("aria-modal", "true");

    modal.innerHTML = `
      <div class="modal-backdrop" data-close-team-choice></div>
      <div class="modal-panel">
        <div class="modal-head">
          <div>
            <p class="eyebrow">Live hosting</p>
            <h2>Choose a hosting format</h2>
            <p class="muted-text">
              The host monitors the leaderboard while participants play.
            </p>
          </div>
          <button type="button" class="text-btn"
            data-close-team-choice aria-label="Close">✕</button>
        </div>

        <div class="gm-team-choice">
          <button type="button" class="mode-card"
            data-team-format="individual">
            <span class="mode-icon">👤</span>
            <strong>Individual</strong>
            <small>Each participant receives their own score.</small>
          </button>

          <button type="button" class="mode-card"
            data-team-format="teams">
            <span class="mode-icon">👥</span>
            <strong>Teams</strong>
            <small>Participants are placed into balanced teams.</small>
          </button>
        </div>
      </div>
    `;

    document.body.appendChild(modal);
  }

  function startSelectedFormat(format) {
    if (!modeState.selectedQuizId) return;

    $("#teamChoiceModal")?.remove();

    modeState.format = format;
    modeState.teamNames = [];
    modeState.assignments.clear();
    modeState.participants = [];
    modeState.scores.clear();
    modeState.isHost = true;
    modeState.gameStarted = false;
    modeState.leaderboardOpen = true;

    window.QuiletTeamMode = {
      enabled: format === "teams",
      mode: format,
      label: format === "teams" ? "Teams" : "Individual",
      assignments: modeState.assignments
    };

    if (typeof window.startQuiz === "function") {
      window.startQuiz(
        modeState.selectedQuizId,
        "host",
        format,
        window.QuiletTeamMode.label
      );
    }

    requestAnimationFrame(renderLeaderboardBox);
    setTimeout(renderLeaderboardBox, 100);
  }

  function handleMutations() {
    if (modeState.updateQueued) return;

    modeState.updateQueued = true;

    requestAnimationFrame(() => {
      modeState.updateQueued = false;

      if (modeState.isHost && hasHostScreen()) {
        renderLeaderboardBox();
      }
    });
  }

  function initialize() {
    addStyles();

    new MutationObserver(handleMutations).observe(document.body, {
      childList: true,
      subtree: true,
      characterData: true,
      attributes: true,
      attributeFilter: ["data-score", "class", "disabled"]
    });

    handleMutations();
  }

  document.addEventListener("click", (event) => {
    const formatButton = event.target.closest("[data-team-format]");

    if (formatButton) {
      event.preventDefault();
      event.stopImmediatePropagation();
      startSelectedFormat(formatButton.dataset.teamFormat);
      return;
    }

    if (event.target.closest("[data-close-team-choice]")) {
      event.preventDefault();
      event.stopImmediatePropagation();
      $("#teamChoiceModal")?.remove();
      return;
    }

    if (event.target.closest("[data-close-leaderboard]")) {
      event.preventDefault();
      setLeaderboardOpen(false);
      return;
    }

    if (event.target.closest("[data-open-leaderboard]")) {
      event.preventDefault();
      setLeaderboardOpen(true);
      renderLeaderboardBox();
      return;
    }

    if (event.target.closest("[data-gm-start-quiz]")) {
      event.preventDefault();
      event.stopImmediatePropagation();
      startParticipantsOnly();
      return;
    }

    if (event.target.closest("[data-gm-end-quiz]")) {
      event.preventDefault();
      event.stopImmediatePropagation();
      endParticipantsQuiz();
      return;
    }

    const hostButton = event.target.closest(
      '[data-start-mode="host"], [data-host-mode]'
    );

    if (hostButton) {
      event.preventDefault();
      event.stopImmediatePropagation();
      openFormatChoice(hostButton);
      return;
    }

    if (
      event.target.closest(
        "[data-exit-game], [data-view='home'], [data-view='library']"
      )
    ) {
      resetMode();
    }
  }, true);

  document.addEventListener("keydown", (event) => {
    if (event.key !== "Escape") return;

    if ($("#teamChoiceModal")) {
      $("#teamChoiceModal")?.remove();
      return;
    }

    if (modeState.leaderboardOpen) {
      setLeaderboardOpen(false);
    }
  });

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initialize, {
      once: true
    });
  } else {
    initialize();
  }
})();
