(() => {
  const THEME_KEY = "quiletTheme";
  const SYSTEM_THEME = "system";
  const MOBILE_BREAKPOINT = 900;

  const THEMES = [
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

  const DARK_PALETTES = {
    night: {
      panel: "#171a1f",
      panelSoft: "#22262d",
      text: "#f3f4f6",
      muted: "#aeb6c2",
      border: "#3a414c",
      accent: "#60a5fa",
      accent2: "#38bdf8",
      accentSoft: "rgba(96, 165, 250, 0.15)",
      background: `
        radial-gradient(
          circle at 12% 8%,
          rgba(56, 189, 248, 0.09),
          transparent 30%
        ),
        radial-gradient(
          circle at 88% 18%,
          rgba(96, 165, 250, 0.07),
          transparent 28%
        ),
        linear-gradient(
          145deg,
          #090a0c 0%,
          #111318 48%,
          #181b20 100%
        )
      `,
      themeColor: "#111318"
    },

    galaxy: {
      panel: "#17152f",
      panelSoft: "#242044",
      text: "#faf7ff",
      muted: "#c5bddb",
      border: "#514b78",
      accent: "#a78bfa",
      accent2: "#e879f9",
      accentSoft: "rgba(167, 139, 250, 0.17)",
      background: `
        radial-gradient(
          circle at 12% 8%,
          rgba(99, 102, 241, 0.28),
          transparent 28%
        ),
        radial-gradient(
          circle at 88% 15%,
          rgba(217, 70, 239, 0.2),
          transparent 27%
        ),
        radial-gradient(
          circle at 50% 90%,
          rgba(76, 29, 149, 0.2),
          transparent 35%
        ),
        linear-gradient(
          145deg,
          #080719 0%,
          #14122c 50%,
          #21163b 100%
        )
      `,
      themeColor: "#14122c"
    },

    systemDark: {
      panel: "#111827",
      panelSoft: "#1b2638",
      text: "#f8fafc",
      muted: "#b6c2d2",
      border: "#35445a",
      accent: "#60a5fa",
      accent2: "#818cf8",
      accentSoft: "rgba(96, 165, 250, 0.15)",
      background: `
        radial-gradient(
          circle at 10% 8%,
          rgba(59, 130, 246, 0.16),
          transparent 30%
        ),
        linear-gradient(
          145deg,
          #020617 0%,
          #0f172a 50%,
          #1e293b 100%
        )
      `,
      themeColor: "#0f172a"
    }
  };

  let updateFrame = 0;

  function addSettingsLayoutFixes() {
    if (document.querySelector("#quiletSettingsLayoutFixes")) return;

    const style = document.createElement("style");
    style.id = "quiletSettingsLayoutFixes";
    style.textContent = `
      #settingsView,
      #settingsView > .panel,
      #settingsForm {
        width: 100%;
        min-width: 0;
        max-width: 100%;
      }

      #settingsForm {
        display: grid;
        gap: 20px;
      }

      #settingsForm .settings-section {
        display: flow-root;
        width: 100%;
        min-width: 0;
        max-width: 100%;
        margin: 0;
        padding: 22px;
        overflow: hidden;
      }

      #settingsForm .settings-section legend {
        float: left !important;
        display: block !important;
        width: 100% !important;
        max-width: 100% !important;
        margin: 0 0 16px !important;
        padding: 0 !important;
        color: var(--accent);
        font-family: "Baloo 2", "Nunito", sans-serif;
        font-size: 1.08rem;
        font-weight: 800;
        line-height: 1.3;
        white-space: normal;
        overflow-wrap: break-word;
        word-break: normal;
      }

      #settingsForm .settings-section legend + * {
        clear: both;
      }

      #settingsForm .settings-section > label:not(.checkbox-field) {
        display: grid;
        width: 100%;
        min-width: 0;
        max-width: 100%;
        gap: 8px;
        margin: 0;
        line-height: 1.4;
        overflow-wrap: normal;
        word-break: normal;
      }

      #settingsForm .settings-section > label + label {
        margin-top: 16px;
      }

      #settingsForm
        .settings-section
        > label:not(.checkbox-field)
        > :is(input, select, textarea) {
        display: block;
        width: 100%;
        min-width: 0;
        max-width: 100%;
        margin: 0;
      }

      #settingsForm .settings-grid {
        display: grid;
        grid-template-columns:
          repeat(auto-fit, minmax(min(100%, 280px), 1fr));
        width: 100%;
        min-width: 0;
        max-width: 100%;
        gap: 12px;
        align-items: stretch;
      }

      #settingsForm .checkbox-field {
        display: grid !important;
        grid-template-columns: 22px minmax(0, 1fr);
        width: 100%;
        min-width: 0;
        max-width: 100%;
        min-height: 54px;
        margin: 0;
        padding: 14px;
        align-items: start;
        justify-content: stretch;
        gap: 11px;
        overflow: hidden;
        white-space: normal;
      }

      #settingsForm .checkbox-field > input[type="checkbox"] {
        width: 18px !important;
        min-width: 18px !important;
        max-width: 18px !important;
        height: 18px;
        margin: 2px 0 0;
        padding: 0;
        grid-column: 1;
        flex: none;
      }

      #settingsForm .checkbox-field > span {
        display: block;
        width: 100%;
        min-width: 0;
        max-width: 100%;
        grid-column: 2;
        line-height: 1.45;
        white-space: normal;
        word-break: normal;
        overflow-wrap: break-word;
        hyphens: none;
      }

      #settingsForm .checkbox-field strong,
      #settingsForm .checkbox-field small {
        white-space: normal;
        word-break: normal;
        overflow-wrap: break-word;
      }

      #settingsForm .form-actions,
      #settingsView .danger-actions {
        display: flex;
        width: 100%;
        min-width: 0;
        max-width: 100%;
        flex-wrap: wrap;
        gap: 12px;
      }

      #settingsForm .form-actions > button,
      #settingsView .danger-actions > button {
        min-width: 0;
        white-space: normal;
        overflow-wrap: break-word;
      }

      #notificationPermissionStatus {
        margin-bottom: 0;
        white-space: normal;
        word-break: normal;
        overflow-wrap: break-word;
      }

      #settingsView .danger-zone {
        width: 100%;
        min-width: 0;
        max-width: 100%;
      }

      @media (max-width: 680px) {
        #settingsForm {
          gap: 16px;
        }

        #settingsForm .settings-section {
          padding: 18px 15px;
        }

        #settingsForm .settings-grid {
          grid-template-columns: minmax(0, 1fr);
        }

        #settingsForm .checkbox-field {
          grid-template-columns: 20px minmax(0, 1fr);
          min-height: 52px;
          padding: 12px;
          gap: 10px;
        }

        #settingsForm .form-actions,
        #settingsView .danger-actions {
          display: grid;
          grid-template-columns: minmax(0, 1fr);
        }

        #settingsForm .form-actions > button,
        #settingsView .danger-actions > button {
          width: 100%;
        }
      }

      @media (max-width: 390px) {
        #settingsView > .panel {
          padding-right: 12px;
          padding-left: 12px;
        }

        #settingsForm .settings-section {
          padding: 16px 12px;
        }
      }
    `;

    document.head.appendChild(style);
  }

  function readJson(key, fallback) {
    try {
      const value = localStorage.getItem(key);
      return value === null ? fallback : JSON.parse(value);
    } catch {
      return fallback;
    }
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

  function showMessage(message) {
    const toast = document.querySelector("#notificationToast");
    if (!toast) return;

    toast.textContent = message;
    toast.classList.remove("hidden");
    toast.setAttribute("role", "status");

    clearTimeout(showMessage.timer);

    showMessage.timer = setTimeout(() => {
      toast.classList.add("hidden");
    }, 3500);
  }

  function prefersReducedMotion() {
    return Boolean(
      window.matchMedia?.("(prefers-reduced-motion: reduce)").matches
    );
  }

  function getSelectedTheme() {
    const savedTheme =
      localStorage.getItem(THEME_KEY) || SYSTEM_THEME;

    return THEMES.includes(savedTheme)
      ? savedTheme
      : SYSTEM_THEME;
  }

  function systemUsesDarkTheme() {
    return Boolean(
      window.matchMedia?.("(prefers-color-scheme: dark)").matches
    );
  }

  function clearThemeVariables() {
    [
      "--panel",
      "--panel-soft",
      "--text",
      "--muted",
      "--border",
      "--accent",
      "--accent-2",
      "--accent-soft",
      "--professional-bg",
      "--shadow-sm",
      "--shadow",
      "--shadow-lg"
    ].forEach((property) => {
      document.body.style.removeProperty(property);
    });
  }

  function setThemeVariables(palette) {
    if (!palette) return;

    document.body.style.setProperty("--panel", palette.panel);
    document.body.style.setProperty(
      "--panel-soft",
      palette.panelSoft
    );
    document.body.style.setProperty("--text", palette.text);
    document.body.style.setProperty("--muted", palette.muted);
    document.body.style.setProperty("--border", palette.border);
    document.body.style.setProperty("--accent", palette.accent);
    document.body.style.setProperty("--accent-2", palette.accent2);
    document.body.style.setProperty(
      "--accent-soft",
      palette.accentSoft
    );
    document.body.style.setProperty(
      "--professional-bg",
      palette.background.replace(/\s+/g, " ").trim()
    );

    document.body.style.setProperty(
      "--shadow-sm",
      "0 5px 18px rgba(0, 0, 0, 0.24)"
    );
    document.body.style.setProperty(
      "--shadow",
      "0 18px 48px rgba(0, 0, 0, 0.34)"
    );
    document.body.style.setProperty(
      "--shadow-lg",
      "0 32px 84px rgba(0, 0, 0, 0.46)"
    );
  }

  function updateThemeColor(color) {
    let meta = document.querySelector('meta[name="theme-color"]');

    if (!meta) {
      meta = document.createElement("meta");
      meta.name = "theme-color";
      document.head.appendChild(meta);
    }

    meta.content = color;
  }

  function applyThemeState() {
    const selectedTheme = getSelectedTheme();
    const isSystem = selectedTheme === SYSTEM_THEME;
    const isSystemDark = isSystem && systemUsesDarkTheme();
    const isDark =
      selectedTheme === "night" ||
      selectedTheme === "galaxy" ||
      isSystemDark;

    THEMES.forEach((theme) => {
      document.body.classList.remove(`theme-${theme}`);
    });

    document.body.classList.remove(
      "system-dark",
      "system-dark-active"
    );

    document.body.classList.add(`theme-${selectedTheme}`);
    document.body.classList.toggle("system-dark", isSystemDark);
    document.body.classList.toggle(
      "system-dark-active",
      isSystemDark
    );

    clearThemeVariables();

    if (selectedTheme === "night") {
      setThemeVariables(DARK_PALETTES.night);
      updateThemeColor(DARK_PALETTES.night.themeColor);
    } else if (selectedTheme === "galaxy") {
      setThemeVariables(DARK_PALETTES.galaxy);
      updateThemeColor(DARK_PALETTES.galaxy.themeColor);
    } else if (isSystemDark) {
      setThemeVariables(DARK_PALETTES.systemDark);
      updateThemeColor(DARK_PALETTES.systemDark.themeColor);
    } else {
      updateThemeColor("#2563eb");
    }

    document.documentElement.style.colorScheme = isDark
      ? "dark"
      : "light";

    const select = document.querySelector("#themeSelect");

    if (select && select.value !== selectedTheme) {
      select.value = selectedTheme;
    }
  }

  function bindThemeSelector() {
    const select = document.querySelector("#themeSelect");

    if (!select || select.dataset.themeBound === "true") return;

    select.dataset.themeBound = "true";
    select.value = getSelectedTheme();

    select.addEventListener("change", () => {
      const selected = THEMES.includes(select.value)
        ? select.value
        : SYSTEM_THEME;

      localStorage.setItem(THEME_KEY, selected);
      applyThemeState();
    });
  }

  function smoothScrollToTop() {
    requestAnimationFrame(() => {
      window.scrollTo({
        top: 0,
        left: 0,
        behavior: prefersReducedMotion() ? "auto" : "smooth"
      });
    });
  }

  function setMenuOpen(open) {
    const topbar = document.querySelector("#mainTopbar");
    const button = document.querySelector("#hamburgerBtn");
    const actions = document.querySelector("#topbarActions");

    if (!topbar || !button) return;

    const canOpen =
      window.innerWidth <= MOBILE_BREAKPOINT &&
      !topbar.classList.contains("hidden-on-auth");

    const nextState = Boolean(open && canOpen);

    topbar.classList.toggle("menu-open", nextState);
    actions?.classList.toggle("mobile-menu-open", nextState);

    button.setAttribute("aria-expanded", String(nextState));
    button.setAttribute(
      "aria-label",
      nextState ? "Close navigation" : "Open navigation"
    );
  }

  function syncMenu() {
    const topbar = document.querySelector("#mainTopbar");
    const button = document.querySelector("#hamburgerBtn");

    if (!topbar || !button) return;

    if (window.innerWidth > MOBILE_BREAKPOINT) {
      setMenuOpen(false);
      return;
    }

    const open =
      topbar.classList.contains("menu-open") ||
      document
        .querySelector("#topbarActions")
        ?.classList.contains("mobile-menu-open");

    button.setAttribute("aria-expanded", String(open));
    button.setAttribute(
      "aria-label",
      open ? "Close navigation" : "Open navigation"
    );
  }

  function visibleOverlayExists() {
    return [
      ...document.querySelectorAll(
        ".modal, .command-palette, .profile-editor-modal"
      )
    ].some((element) => {
      if (
        !document.body.contains(element) ||
        element.classList.contains("hidden")
      ) {
        return false;
      }

      return getComputedStyle(element).display !== "none";
    });
  }

  function syncOverlayState() {
    document.body.classList.toggle(
      "overlay-open",
      visibleOverlayExists()
    );
  }

  function scheduleInterfaceSync() {
    if (updateFrame) return;

    updateFrame = requestAnimationFrame(() => {
      updateFrame = 0;
      syncMenu();
      syncOverlayState();
      bindThemeSelector();
    });
  }

  function closeExportModal() {
    const modal = document.querySelector("#exportModal");
    if (!modal) return;

    modal.classList.add("hidden");
    modal.setAttribute("aria-hidden", "true");
    syncOverlayState();
    document.querySelector("#exportToolbarBtn")?.focus();
  }

  function buildWorksheetHtml(quiz) {
    const questions = Array.isArray(quiz.questions)
      ? quiz.questions
      : [];

    return `
      <!DOCTYPE html>
      <html lang="en">
        <head>
          <meta charset="UTF-8">
          <meta
            name="viewport"
            content="width=device-width, initial-scale=1"
          >
          <title>
            ${escapeHtml(quiz.title || "Quilet Quiz")} - Worksheet
          </title>

          <style>
            * {
              box-sizing: border-box;
            }

            body {
              max-width: 850px;
              margin: 0 auto;
              padding: 36px;
              color: #172033;
              font: 16px/1.5 Arial, sans-serif;
            }

            header {
              margin-bottom: 30px;
              padding-bottom: 18px;
              border-bottom: 3px solid #2563eb;
            }

            h1 {
              margin: 0 0 8px;
              color: #1d4ed8;
            }

            .details {
              color: #475569;
            }

            .student {
              display: flex;
              gap: 30px;
              margin: 25px 0;
            }

            .student span {
              flex: 1;
              padding-bottom: 7px;
              border-bottom: 1px solid #64748b;
            }

            article {
              margin: 24px 0;
              break-inside: avoid;
            }

            ol {
              padding-left: 28px;
            }

            li {
              margin: 8px 0;
            }

            @media print {
              body {
                max-width: none;
                padding: 0;
              }
            }
          </style>
        </head>

        <body>
          <header>
            <h1>
              ${escapeHtml(quiz.title || "Quilet Worksheet")}
            </h1>

            <div class="details">
              ${escapeHtml(quiz.subject || "General")} ·
              ${escapeHtml(quiz.difficulty || "Medium")}
            </div>

            ${
              quiz.description
                ? `<p>${escapeHtml(quiz.description)}</p>`
                : ""
            }
          </header>

          <div class="student">
            <span>Name:</span>
            <span>Date:</span>
          </div>

          ${questions.map((question, index) => `
            <article>
              <strong>
                ${index + 1}.
                ${escapeHtml(question.text || "")}
              </strong>

              <ol type="A">
                ${(question.options || []).map((option) => `
                  <li>${escapeHtml(option)}</li>
                `).join("")}
              </ol>
            </article>
          `).join("")}

          <script>
            window.addEventListener("load", () => window.print());
          <\/script>
        </body>
      </html>
    `;
  }

  function printWorksheet(quizId) {
    const quizzes = readJson("quiletQuizzes", []);
    const quiz = Array.isArray(quizzes)
      ? quizzes.find(
          (item) => String(item.id) === String(quizId)
        )
      : null;

    if (!quiz) {
      showMessage("That quiz could not be found.");
      return;
    }

    const printWindow = window.open("", "_blank");

    if (!printWindow) {
      showMessage("Allow pop-ups to export the worksheet.");
      return;
    }

    printWindow.document.open();
    printWindow.document.write(buildWorksheetHtml(quiz));
    printWindow.document.close();

    closeExportModal();
    showMessage("Worksheet opened for printing or PDF download.");
  }

  function openExportModal() {
    const modal = document.querySelector("#exportModal");
    const list = document.querySelector("#exportModalList");
    const storedQuizzes = readJson("quiletQuizzes", []);
    const quizzes = Array.isArray(storedQuizzes)
      ? storedQuizzes
      : [];

    if (!modal || !list) return;

    list.innerHTML = quizzes.length
      ? quizzes.map((quiz) => `
          <article
            class="quiz-card"
            style="min-height:auto;margin-bottom:12px"
          >
            <div class="badge-row">
              <span class="badge">
                ${escapeHtml(quiz.subject || "General")}
              </span>

              <span class="badge">
                ${(quiz.questions || []).length} questions
              </span>
            </div>

            <h3>
              ${escapeHtml(quiz.title || "Untitled quiz")}
            </h3>

            <button
              type="button"
              class="primary-btn"
              data-export-quiz="${escapeHtml(quiz.id)}"
            >
              Print or save as PDF
            </button>
          </article>
        `).join("")
      : `
          <div class="empty-state">
            <h3>No quizzes to export</h3>
            <p>Create and save a quiz first.</p>
          </div>
        `;

    modal.classList.remove("hidden");
    modal.setAttribute("aria-hidden", "false");
    syncOverlayState();

    requestAnimationFrame(() => {
      modal
        .querySelector("[data-export-quiz], #exportModalClose")
        ?.focus();
    });
  }

  function bindInterfaceEvents() {
    if (
      document.documentElement.dataset.darkModeEventsBound ===
      "true"
    ) {
      return;
    }

    document.documentElement.dataset.darkModeEventsBound = "true";

    document.addEventListener("click", (event) => {
      const viewButton = event.target.closest("[data-view]");

      if (viewButton) {
        setMenuOpen(false);
        smoothScrollToTop();
      }

      if (event.target.closest("#exportToolbarBtn")) {
        event.preventDefault();
        openExportModal();
        return;
      }

      if (event.target.closest("#exportModalClose")) {
        event.preventDefault();
        closeExportModal();
        return;
      }

      const exportButton = event.target.closest(
        "[data-export-quiz]"
      );

      if (exportButton) {
        event.preventDefault();
        printWorksheet(exportButton.dataset.exportQuiz);
        return;
      }

      if (
        event.target.classList.contains("modal-backdrop") &&
        event.target.closest("#exportModal")
      ) {
        closeExportModal();
      }

      scheduleInterfaceSync();
    });

    document.addEventListener("keydown", (event) => {
      if (event.key !== "Escape") return;

      setMenuOpen(false);

      const exportModal = document.querySelector("#exportModal");

      if (
        exportModal &&
        !exportModal.classList.contains("hidden")
      ) {
        closeExportModal();
      }

      scheduleInterfaceSync();
    });

    window.addEventListener("resize", scheduleInterfaceSync, {
      passive: true
    });

    window.addEventListener("orientationchange", () => {
      setTimeout(scheduleInterfaceSync, 120);
    });

    window.addEventListener("storage", (event) => {
      if (event.key === THEME_KEY) {
        applyThemeState();
      }
    });

    const observer = new MutationObserver(scheduleInterfaceSync);

    observer.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ["class"]
    });
  }

  function initialize() {
    if (!localStorage.getItem(THEME_KEY)) {
      localStorage.setItem(THEME_KEY, SYSTEM_THEME);
    }

    addSettingsLayoutFixes();
    bindThemeSelector();
    bindInterfaceEvents();
    applyThemeState();
    syncMenu();
    syncOverlayState();

    const mediaQuery = window.matchMedia?.(
      "(prefers-color-scheme: dark)"
    );

    mediaQuery?.addEventListener("change", () => {
      if (getSelectedTheme() === SYSTEM_THEME) {
        applyThemeState();
      }
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener(
      "DOMContentLoaded",
      initialize,
      { once: true }
    );
  } else {
    initialize();
  }
})();
