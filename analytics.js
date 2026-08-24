(() => {
  const HISTORY_KEY = "quiletHistory";
  const UPDATE_SESSION_KEY = "quiletUpdateInProgress";
  const UPDATE_CHECK_INTERVAL = 30 * 60 * 1000;
  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];

  let analyticsRange = "all";
  let refreshTimer = null;
  let allowHistoryClear = false;
  let interfaceFrame = 0;
  let updateCheckTimer = null;
  let applicationUpdateAvailable = false;

  const watchedRegistrations = new WeakSet();

  function readJson(key, fallback) {
    try {
      const value = localStorage.getItem(key);
      return value === null ? fallback : JSON.parse(value);
    } catch {
      return fallback;
    }
  }

  function normalizeHistory(value) {
    return Array.isArray(value)
      ? value.filter((item) => item && typeof item === "object")
      : [];
  }

  function historyIdentity(result) {
    if (result.analyticsId) return `analytics:${result.analyticsId}`;
    if (result.id !== undefined && result.id !== null) return `id:${result.id}`;

    return [
      result.quizId || "",
      result.title || "",
      result.mode || "",
      result.date || "",
      result.score || 0
    ].join("|");
  }

  function mergeHistory(existing, incoming) {
    const merged = new Map();

    [...normalizeHistory(existing), ...normalizeHistory(incoming)].forEach(
      (result) => {
        merged.set(historyIdentity(result), result);
      }
    );

    return [...merged.values()].sort((a, b) => {
      const dateA = new Date(a.date || 0).getTime() || 0;
      const dateB = new Date(b.date || 0).getTime() || 0;
      return dateB - dateA;
    });
  }

  function installHistoryWriteProtection() {
    if (window.__quiletHistoryWriteProtection) return;
    window.__quiletHistoryWriteProtection = true;

    const nativeSetItem = Storage.prototype.setItem;

    Storage.prototype.setItem = function setItem(key, value) {
      if (this !== localStorage || key !== HISTORY_KEY) {
        return nativeSetItem.call(this, key, value);
      }

      let incoming;

      try {
        incoming = JSON.parse(value);
      } catch {
        return nativeSetItem.call(this, key, value);
      }

      if (!Array.isArray(incoming)) {
        return nativeSetItem.call(this, key, value);
      }

      if (allowHistoryClear && incoming.length === 0) {
        allowHistoryClear = false;
        return nativeSetItem.call(this, key, "[]");
      }

      const existing = readJson(HISTORY_KEY, []);
      const merged = mergeHistory(existing, incoming);

      const result = nativeSetItem.call(
        this,
        key,
        JSON.stringify(merged)
      );

      window.dispatchEvent(
        new CustomEvent("quilet:history-updated")
      );

      return result;
    };
  }

  function getHistory() {
    return normalizeHistory(readJson(HISTORY_KEY, []));
  }

  function getFilteredHistory() {
    const history = getHistory();

    if (analyticsRange === "all") return history;

    const days = Number(analyticsRange);
    const threshold = Date.now() - days * 24 * 60 * 60 * 1000;

    return history.filter((result) => {
      const timestamp = new Date(result.date).getTime();
      return Number.isFinite(timestamp) && timestamp >= threshold;
    });
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

  function clampScore(value) {
    return Math.max(0, Math.min(100, Number(value) || 0));
  }

  function formatDate(value) {
    const date = new Date(value);

    return Number.isNaN(date.getTime())
      ? "Recently"
      : date.toLocaleDateString(undefined, {
          month: "short",
          day: "numeric",
          year: "numeric"
        });
  }

  function formatMode(value = "Solo") {
    return String(value || "Solo")
      .replace(/host-/gi, "")
      .replace(/[-_]/g, " ")
      .replace(/\b\w/g, (letter) => letter.toUpperCase());
  }

  function showMessage(message) {
    const toast = $("#notificationToast");
    if (!toast) return;

    toast.textContent = message;
    toast.classList.remove("hidden");
    toast.setAttribute("role", "status");

    clearTimeout(showMessage.timer);

    showMessage.timer = setTimeout(() => {
      toast.classList.add("hidden");
    }, 3500);
  }

  function addApplicationUpdateStyles() {
    if ($("#quiletApplicationUpdateStyles")) return;

    const style = document.createElement("style");
    style.id = "quiletApplicationUpdateStyles";
    style.textContent = `
      #appUpdateBtn {
        width: 100%;
        min-width: 0;
        grid-column: 1 / -1;
      }

      #appUpdateBtn[hidden] {
        display: none !important;
      }

      body > #appUpdateBtn.auth-update-button {
        position: fixed;
        bottom: max(16px, env(safe-area-inset-bottom));
        left: max(16px, env(safe-area-inset-left));
        z-index: 450;
        width: auto;
        max-width: calc(100vw - 32px);
        border-color:
          color-mix(in srgb, var(--accent) 40%, var(--border));
        background: var(--panel);
        color: var(--accent);
        box-shadow: var(--shadow-lg);
      }

      #appUpdateBtn.update-running {
        cursor: wait;
        pointer-events: none;
        opacity: 0.75;
      }

      .quilet-update-overlay {
        position: fixed;
        inset: 0;
        z-index: 50000;
        display: grid;
        place-items: center;
        padding: 24px;
        background: var(--panel);
        color: var(--text);
        text-align: center;
      }

      .quilet-update-card {
        width: min(100%, 440px);
        padding: clamp(28px, 6vw, 46px);
        border: 1px solid var(--border);
        border-radius: 28px;
        background: var(--panel);
        box-shadow: var(--shadow-lg);
      }

      .quilet-update-spinner {
        width: 58px;
        height: 58px;
        margin: 0 auto 22px;
        border: 6px solid var(--accent-soft);
        border-top-color: var(--accent);
        border-right-color: var(--accent-2);
        border-radius: 50%;
        animation: quilet-update-spin 700ms linear infinite;
      }

      .quilet-update-card h2 {
        margin: 0 0 8px;
        color: var(--text);
      }

      .quilet-update-card p {
        margin: 0;
        color: var(--muted);
        line-height: 1.6;
      }

      html.quilet-update-boot body {
        overflow: hidden !important;
      }

      html.quilet-update-boot body > *:not(.quilet-update-overlay) {
        visibility: hidden !important;
      }

      @keyframes quilet-update-spin {
        to {
          transform: rotate(360deg);
        }
      }

      @media (max-width: 560px) {
        body > #appUpdateBtn.auth-update-button {
          right: max(12px, env(safe-area-inset-right));
          bottom: max(12px, env(safe-area-inset-bottom));
          left: max(12px, env(safe-area-inset-left));
          width: auto;
        }

        .quilet-update-card {
          border-radius: 22px;
        }
      }

      @media (prefers-reduced-motion: reduce) {
        .quilet-update-spinner {
          animation-duration: 1.5s;
        }
      }
    `;

    document.head.appendChild(style);
  }

  function updateWasRequested() {
    const parameters = new URLSearchParams(window.location.search);

    return (
      sessionStorage.getItem(UPDATE_SESSION_KEY) === "true" ||
      parameters.has("appUpdate")
    );
  }

  function showUpdateOverlay(
    title = "Updating Quilet Arcade",
    message = "Downloading the newest version. Please keep this page open."
  ) {
    let overlay = $(".quilet-update-overlay");

    if (!overlay) {
      overlay = document.createElement("div");
      overlay.className = "quilet-update-overlay";
      overlay.setAttribute("role", "status");
      overlay.setAttribute("aria-live", "assertive");

      overlay.innerHTML = `
        <section class="quilet-update-card">
          <div class="quilet-update-spinner" aria-hidden="true"></div>
          <h2 data-update-title></h2>
          <p data-update-message></p>
        </section>
      `;

      document.body.appendChild(overlay);
    }

    const heading = overlay.querySelector("[data-update-title]");
    const description = overlay.querySelector("[data-update-message]");

    if (heading) heading.textContent = title;
    if (description) description.textContent = message;

    document.documentElement.classList.add("quilet-update-boot");
    return overlay;
  }

  function cleanUpdateUrl() {
    const url = new URL(window.location.href);

    if (!url.searchParams.has("appUpdate")) return;

    url.searchParams.delete("appUpdate");

    window.history.replaceState(
      window.history.state,
      "",
      `${url.pathname}${url.search}${url.hash}`
    );
  }

  function finishUpdateBoot() {
    if (!updateWasRequested()) return;

    const reveal = () => {
      cleanUpdateUrl();
      sessionStorage.removeItem(UPDATE_SESSION_KEY);
      applicationUpdateAvailable = false;

      const button = $("#appUpdateBtn");
      if (button) button.hidden = true;

      document.documentElement.classList.remove("quilet-update-boot");
      $(".quilet-update-overlay")?.remove();

      showMessage("Quilet Arcade is up to date.");
    };

    if (document.readyState === "complete") {
      requestAnimationFrame(() => requestAnimationFrame(reveal));
    } else {
      window.addEventListener("load", () => {
        requestAnimationFrame(() => requestAnimationFrame(reveal));
      }, { once: true });
    }
  }

  function createUpdateButton() {
    let button = $("#appUpdateBtn");

    if (!button) {
      button = document.createElement("button");
      button.id = "appUpdateBtn";
      button.type = "button";
      button.className = "secondary-btn";
      button.hidden = !applicationUpdateAvailable;
      button.innerHTML = `
        <span aria-hidden="true">↻</span>
        <span>App Update</span>
      `;

      button.setAttribute(
        "aria-label",
        "Download the newest version of Quilet Arcade"
      );

      button.title = "A new version of Quilet Arcade is available";
      button.addEventListener("click", performApplicationUpdate);
    }

    return button;
  }

  function setApplicationUpdateAvailable(available) {
    applicationUpdateAvailable = Boolean(available);

    if (applicationUpdateAvailable) {
      placeUpdateButton();

      const button = $("#appUpdateBtn");
      if (button) button.hidden = false;
      return;
    }

    const button = $("#appUpdateBtn");
    if (button) button.hidden = true;
  }

  function placeUpdateButton() {
    if (!applicationUpdateAvailable) {
      const existingButton = $("#appUpdateBtn");
      if (existingButton) existingButton.hidden = true;
      return;
    }

    const button = createUpdateButton();
    const userActions = $("#mainTopbar .user-actions");
    const authActive = $("#authView")?.classList.contains("active");
    const signedIn = Boolean(readJson("quiletUser", null));

    button.hidden = false;

    if (userActions && signedIn && !authActive) {
      const logout = $("#logoutBtn");

      if (button.parentElement !== userActions) {
        userActions.insertBefore(button, logout || null);
      } else if (logout && button.nextElementSibling !== logout) {
        userActions.insertBefore(button, logout);
      }

      button.classList.remove("auth-update-button");
      return;
    }

    if (button.parentElement !== document.body) {
      document.body.appendChild(button);
    }

    button.classList.add("auth-update-button");
  }

  function watchServiceWorkerRegistration(registration) {
    if (!registration || watchedRegistrations.has(registration)) return;

    watchedRegistrations.add(registration);

    const inspectWorker = (worker) => {
      if (!worker) return;

      const checkState = () => {
        if (
          worker.state === "installed" &&
          navigator.serviceWorker.controller &&
          !updateWasRequested()
        ) {
          setApplicationUpdateAvailable(true);
        }
      };

      worker.addEventListener("statechange", checkState);
      checkState();
    };

    if (
      registration.waiting &&
      navigator.serviceWorker.controller &&
      !updateWasRequested()
    ) {
      setApplicationUpdateAvailable(true);
    }

    inspectWorker(registration.installing);

    registration.addEventListener("updatefound", () => {
      inspectWorker(registration.installing);
    });
  }

  async function checkForApplicationUpdate() {
    if (
      !("serviceWorker" in navigator) ||
      updateWasRequested()
    ) {
      return;
    }

    try {
      const registrations =
        await navigator.serviceWorker.getRegistrations();

      registrations.forEach(watchServiceWorkerRegistration);

      const hasWaitingUpdate = registrations.some(
        (registration) =>
          registration.waiting &&
          navigator.serviceWorker.controller
      );

      if (hasWaitingUpdate) {
        setApplicationUpdateAvailable(true);
        return;
      }

      await Promise.allSettled(
        registrations.map((registration) => registration.update())
      );

      const updateReady = registrations.some(
        (registration) =>
          registration.waiting &&
          navigator.serviceWorker.controller
      );

      if (updateReady) {
        setApplicationUpdateAvailable(true);
      }
    } catch (error) {
      console.warn("Unable to check for an application update:", error);
    }
  }

  function monitorApplicationUpdates() {
    if (!("serviceWorker" in navigator)) {
      setApplicationUpdateAvailable(false);
      return;
    }

    navigator.serviceWorker.addEventListener("controllerchange", () => {
      if (!updateWasRequested()) {
        setApplicationUpdateAvailable(true);
      }
    });

    checkForApplicationUpdate();

    clearInterval(updateCheckTimer);
    updateCheckTimer = setInterval(
      checkForApplicationUpdate,
      UPDATE_CHECK_INTERVAL
    );
  }

  async function clearApplicationCaches() {
    const tasks = [];

    if ("serviceWorker" in navigator) {
      tasks.push(
        navigator.serviceWorker
          .getRegistrations()
          .then((registrations) =>
            Promise.allSettled(
              registrations.map((registration) =>
                registration.unregister()
              )
            )
          )
      );
    }

    if ("caches" in window) {
      tasks.push(
        caches.keys().then((names) =>
          Promise.allSettled(
            names.map((name) => caches.delete(name))
          )
        )
      );
    }

    await Promise.allSettled(tasks);
  }

  async function requestFreshDocument(url) {
    try {
      await fetch(url.toString(), {
        method: "GET",
        cache: "reload",
        credentials: "same-origin",
        headers: {
          "Cache-Control": "no-cache, no-store, must-revalidate",
          Pragma: "no-cache"
        }
      });
    } catch {
      // Navigation still proceeds if the preload request is unavailable.
    }
  }

  async function performApplicationUpdate() {
    if (!applicationUpdateAvailable) return;

    const button = $("#appUpdateBtn");

    if (button?.classList.contains("update-running")) return;

    if (button) {
      button.classList.add("update-running");
      button.disabled = true;
      button.innerHTML = `
        <span aria-hidden="true">↻</span>
        <span>Updating…</span>
      `;
    }

    showUpdateOverlay();

    try {
      sessionStorage.setItem(UPDATE_SESSION_KEY, "true");
      localStorage.removeItem("quiletLoadedBuild");

      await clearApplicationCaches();

      const url = new URL(window.location.href);

      [
        "build",
        "catalogRefresh",
        "appUpdate"
      ].forEach((parameter) => {
        url.searchParams.delete(parameter);
      });

      url.searchParams.set("appUpdate", Date.now().toString());

      showUpdateOverlay(
        "Opening the new version",
        "The update is ready. Quilet Arcade will restart automatically."
      );

      await requestFreshDocument(url);
      window.location.replace(url.toString());
    } catch (error) {
      console.error("Application update failed:", error);

      sessionStorage.removeItem(UPDATE_SESSION_KEY);
      document.documentElement.classList.remove("quilet-update-boot");
      $(".quilet-update-overlay")?.remove();

      if (button) {
        button.classList.remove("update-running");
        button.disabled = false;
        button.innerHTML = `
          <span aria-hidden="true">↻</span>
          <span>Try App Update again</span>
        `;
      }

      showMessage(
        "The update could not be completed. Check your connection and try again."
      );
    }
  }

  function scheduleInterfaceUpdate() {
    if (interfaceFrame) return;

    interfaceFrame = requestAnimationFrame(() => {
      interfaceFrame = 0;
      placeUpdateButton();
    });
  }

  function observeUpdateButtonPlacement() {
    const observer = new MutationObserver((mutations) => {
      const relevant = mutations.some((mutation) => {
        if (mutation.type === "attributes") {
          return (
            mutation.target.id === "authView" ||
            mutation.target.id === "mainTopbar"
          );
        }

        return [...mutation.addedNodes, ...mutation.removedNodes].some(
          (node) =>
            node.nodeType === Node.ELEMENT_NODE &&
            (
              node.id === "appUpdateBtn" ||
              node.id === "logoutBtn" ||
              node.id === "authView" ||
              node.classList?.contains("user-actions")
            )
        );
      });

      if (relevant) scheduleInterfaceUpdate();
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ["class"]
    });
  }

  function enhanceNavigation() {
    const icons = {
      home: "⌂",
      create: "＋",
      library: "▦",
      discover: "◎",
      analytics: "↗",
      settings: "⚙"
    };

    $$(".nav-btn").forEach((button) => {
      const view = button.dataset.view;

      if (!view || button.querySelector(".nav-icon")) return;

      const icon = document.createElement("span");
      icon.className = "nav-icon";
      icon.setAttribute("aria-hidden", "true");
      icon.textContent = icons[view] || "•";
      button.prepend(icon);
    });
  }

  function addAnalyticsControls() {
    const panelHead = $("#analyticsView > .panel > .panel-head");
    if (!panelHead) return;

    if (!$("#analyticsToolbar")) {
      const toolbar = document.createElement("div");
      toolbar.id = "analyticsToolbar";
      toolbar.className = "analytics-toolbar";

      toolbar.innerHTML = `
        <label class="analytics-range-label">
          <span>Time range</span>
          <select id="analyticsRange">
            <option value="all">All time</option>
            <option value="7">Last 7 days</option>
            <option value="30">Last 30 days</option>
            <option value="90">Last 90 days</option>
          </select>
        </label>

        <button
          id="exportAnalyticsBtn"
          type="button"
          class="secondary-btn"
        >
          Export CSV
        </button>
      `;

      panelHead.insertAdjacentElement("afterend", toolbar);
    }

    if (!$("#analyticsMetrics")) {
      const metrics = document.createElement("div");
      metrics.id = "analyticsMetrics";
      metrics.className = "analytics-metrics";
      $("#analyticsToolbar")?.insertAdjacentElement("afterend", metrics);
    }

    const range = $("#analyticsRange");

    if (range && !range.dataset.analyticsBound) {
      range.dataset.analyticsBound = "true";
      range.value = analyticsRange;

      range.addEventListener("change", () => {
        analyticsRange = range.value;
        renderAnalytics();
      });
    }

    const exportButton = $("#exportAnalyticsBtn");

    if (exportButton && !exportButton.dataset.analyticsBound) {
      exportButton.dataset.analyticsBound = "true";
      exportButton.addEventListener("click", exportAnalyticsCsv);
    }
  }

  function getSummary(history) {
    const scores = history.map((result) => clampScore(result.score));

    const average = scores.length
      ? Math.round(
          scores.reduce((total, score) => total + score, 0) /
          scores.length
        )
      : 0;

    const best = scores.length ? Math.max(...scores) : 0;

    const passRate = scores.length
      ? Math.round(
          (
            scores.filter((score) => score >= 60).length /
            scores.length
          ) * 100
        )
      : 0;

    const minutes = history.reduce(
      (total, result) =>
        total + Math.max(1, Number(result.durationMinutes) || 1),
      0
    );

    return { average, best, passRate, minutes };
  }

  function updateDashboard(history) {
    const summary = getSummary(history);

    if ($("#gameCount")) {
      $("#gameCount").textContent = String(history.length);
    }

    if ($("#avgScore")) {
      $("#avgScore").textContent = `${summary.average}%`;
    }

    if ($("#totalTime")) {
      $("#totalTime").textContent = summary.minutes >= 60
        ? `${(summary.minutes / 60).toFixed(1)}h`
        : `${summary.minutes}m`;
    }
  }

  function renderMetrics(history, summary) {
    const metrics = $("#analyticsMetrics");
    if (!metrics) return;

    metrics.innerHTML = `
      <article class="analytics-metric">
        <span class="metric-icon blue">◎</span>
        <div>
          <small>Average score</small>
          <strong>${summary.average}%</strong>
        </div>
      </article>

      <article class="analytics-metric">
        <span class="metric-icon violet">★</span>
        <div>
          <small>Best result</small>
          <strong>${summary.best}%</strong>
        </div>
      </article>

      <article class="analytics-metric">
        <span class="metric-icon green">✓</span>
        <div>
          <small>Pass rate</small>
          <strong>${summary.passRate}%</strong>
        </div>
      </article>

      <article class="analytics-metric">
        <span class="metric-icon orange">◷</span>
        <div>
          <small>Completed</small>
          <strong>${history.length}</strong>
        </div>
      </article>

      <article class="analytics-metric">
        <span class="metric-icon blue">◴</span>
        <div>
          <small>Learning time</small>
          <strong>${summary.minutes}m</strong>
        </div>
      </article>
    `;
  }

  function renderAnalytics() {
    addAnalyticsControls();

    const performanceChart = $("#performanceChart");
    const topQuizzesList = $("#topQuizzesList");
    const detailedHistory = $("#detailedHistory");

    if (!performanceChart || !topQuizzesList || !detailedHistory) return;

    const allHistory = getHistory();
    const history = getFilteredHistory();
    const summary = getSummary(history);

    updateDashboard(allHistory);
    renderMetrics(history, summary);

    if (!history.length) {
      performanceChart.innerHTML = `
        <div class="analytics-empty">
          <span>↗</span>
          <h3>No results in this range</h3>
          <p class="muted-text">
            Complete an entire quiz or select a wider time range.
          </p>
        </div>
      `;

      topQuizzesList.innerHTML = `
        <p class="muted-text">
          Quiz engagement will appear here.
        </p>
      `;

      detailedHistory.innerHTML = `
        <div class="empty-state">
          <h3>No activity found</h3>
          <p>Your completed activities will be listed here.</p>
        </div>
      `;

      return;
    }

    const recent = history.slice(0, 10).reverse();

    performanceChart.innerHTML = `
      <div class="professional-chart">
        <div class="chart-summary">
          <div>
            <span class="muted-text">Current average</span>
            <strong>${summary.average}%</strong>
          </div>
          <span class="trend-chip">${summary.passRate}% passing</span>
        </div>

        <div class="chart-bars" aria-label="Recent quiz performance">
          ${recent.map((result, index) => {
            const score = clampScore(result.score);

            return `
              <div class="chart-column">
                <div class="chart-value">${score}%</div>
                <div
                  class="chart-bar"
                  style="height:${Math.max(score, 6)}%"
                  title="${escapeHtml(
                    result.title || "Untitled quiz"
                  )}: ${score}%"
                ></div>
                <small>${index + 1}</small>
              </div>
            `;
          }).join("")}
        </div>
      </div>
    `;

    const grouped = new Map();

    history.forEach((result) => {
      const key =
        result.quizId !== null && result.quizId !== undefined
          ? `id:${result.quizId}`
          : `title:${result.title || "Untitled quiz"}`;

      const item = grouped.get(key) || {
        title: result.title || "Untitled quiz",
        plays: 0,
        totalScore: 0,
        bestScore: 0
      };

      const score = clampScore(result.score);

      item.plays += 1;
      item.totalScore += score;
      item.bestScore = Math.max(item.bestScore, score);
      grouped.set(key, item);
    });

    const topQuizzes = [...grouped.values()]
      .sort((a, b) =>
        b.plays - a.plays ||
        b.bestScore - a.bestScore ||
        a.title.localeCompare(b.title)
      )
      .slice(0, 5);

    topQuizzesList.innerHTML = topQuizzes.map((quiz, index) => `
      <article class="ranked-quiz">
        <span class="rank-number">${index + 1}</span>
        <div>
          <strong>${escapeHtml(quiz.title)}</strong>
          <small>
            ${quiz.plays} play${quiz.plays === 1 ? "" : "s"}
          </small>
        </div>
        <span class="score-pill">
          ${Math.round(quiz.totalScore / quiz.plays)}%
        </span>
      </article>
    `).join("");

    detailedHistory.innerHTML = `
      <table>
        <thead>
          <tr>
            <th>Activity</th>
            <th>Experience</th>
            <th>Score</th>
            <th>Correct</th>
            <th>Duration</th>
            <th>Date</th>
          </tr>
        </thead>
        <tbody>
          ${history.map((result) => {
            const score = clampScore(result.score);
            const correct = Math.max(
              0,
              Number(result.correct) || 0
            );
            const total = Math.max(
              0,
              Number(result.total) || 0
            );
            const duration = Math.max(
              1,
              Number(result.durationMinutes) || 1
            );

            return `
              <tr>
                <td>
                  <strong>
                    ${escapeHtml(result.title || "Untitled quiz")}
                  </strong>
                </td>
                <td>${escapeHtml(formatMode(result.mode))}</td>
                <td>
                  <span class="table-score ${
                    score >= 60 ? "positive" : "needs-work"
                  }">
                    ${score}%
                  </span>
                </td>
                <td>${correct} / ${total}</td>
                <td>${duration} min</td>
                <td>${escapeHtml(formatDate(result.date))}</td>
              </tr>
            `;
          }).join("")}
        </tbody>
      </table>
    `;
  }

  function scheduleRefresh(delay = 0) {
    clearTimeout(refreshTimer);

    refreshTimer = setTimeout(() => {
      updateDashboard(getHistory());

      if ($("#analyticsView")?.classList.contains("active")) {
        renderAnalytics();
      }
    }, delay);
  }

  function exportAnalyticsCsv() {
    const history = getFilteredHistory();

    if (!history.length) {
      showMessage("There is no analytics data to export.");
      return;
    }

    const rows = [
      [
        "Quiz",
        "Mode",
        "Score",
        "Correct",
        "Total",
        "Duration",
        "Date"
      ],
      ...history.map((result) => [
        result.title || "Untitled quiz",
        formatMode(result.mode),
        clampScore(result.score),
        Number(result.correct) || 0,
        Number(result.total) || 0,
        Number(result.durationMinutes) || 1,
        result.date || ""
      ])
    ];

    const csv = rows.map((row) =>
      row.map((value) =>
        `"${String(value).replace(/"/g, '""')}"`
      ).join(",")
    ).join("\n");

    const blob = new Blob([csv], {
      type: "text/csv;charset=utf-8"
    });

    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");

    link.href = url;
    link.download =
      `quilet-analytics-${new Date().toISOString().slice(0, 10)}.csv`;

    link.click();

    setTimeout(() => URL.revokeObjectURL(url), 1000);
    showMessage("Analytics CSV exported.");
  }

  function bindEvents() {
    if (window.__quiletAnalyticsEventsBound) return;
    window.__quiletAnalyticsEventsBound = true;

    document.addEventListener("click", (event) => {
      if (
        event.target.closest("#clearHistoryBtn") ||
        event.target.closest("#deleteAccountBtn")
      ) {
        allowHistoryClear = true;

        setTimeout(() => {
          allowHistoryClear = false;
        }, 1000);
      }

      if (event.target.closest('[data-view="analytics"]')) {
        scheduleRefresh(100);
      }

      if (event.target.closest("[data-view]")) {
        scheduleInterfaceUpdate();
      }
    }, true);

    window.addEventListener("storage", (event) => {
      if (!event.key || event.key === HISTORY_KEY) {
        scheduleRefresh();
      }

      if (
        event.key === "quiletUser" ||
        event.key === "quiletActiveView"
      ) {
        scheduleInterfaceUpdate();
      }
    });

    [
      "quilet:history-updated",
      "quilet:analytics-updated",
      "quilet:quiz-completed"
    ].forEach((eventName) => {
      window.addEventListener(eventName, () => scheduleRefresh());
    });

    window.addEventListener("focus", () => {
      scheduleRefresh();
      checkForApplicationUpdate();
    });

    document.addEventListener("visibilitychange", () => {
      if (!document.hidden) {
        scheduleRefresh();
        checkForApplicationUpdate();
      }
    });
  }

  function init() {
    addApplicationUpdateStyles();

    if (updateWasRequested()) {
      showUpdateOverlay(
        "Starting the new version",
        "Preparing your updated Quilet Arcade workspace."
      );
    }

    installHistoryWriteProtection();
    enhanceNavigation();
    addAnalyticsControls();
    bindEvents();
    observeUpdateButtonPlacement();
    renderAnalytics();
    finishUpdateBoot();
    monitorApplicationUpdates();

    window.QuiletAnalytics = {
      refresh: () => scheduleRefresh(),
      render: renderAnalytics,
      history: getHistory,
      checkForUpdate: checkForApplicationUpdate,
      updateApp: performApplicationUpdate
    };
  }

  installHistoryWriteProtection();

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init, {
      once: true
    });
  } else {
    init();
  }
})();
