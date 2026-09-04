(() => {
  function renderWorkspaceToolbar() {
    const headerActions = document.querySelector("#workspaceHeader .workspace-header-actions");
    if (!headerActions) return;

    // Check if toolbar is already rendered
    if (headerActions.querySelector(".header-search-box")) return;

    headerActions.innerHTML = `
      <div class="header-search-box">
        <span class="search-icon" aria-hidden="true">⌕</span>
        <input 
          type="text" 
          id="topbarSearchInput" 
          placeholder="Search quizzes..." 
          aria-label="Search quizzes"
        />
      </div>

      <button 
        type="button" 
        class="header-icon-btn" 
        id="topbarInstallBtn" 
        title="Install app" 
        aria-label="Install app"
      >
        ⬇
      </button>

      <button 
        type="button" 
        class="header-icon-btn" 
        id="topbarBellBtn" 
        title="Notifications" 
        aria-label="Notifications"
      >
        🔔
      </button>

      <button 
        type="button" 
        class="header-new-quiz-btn" 
        id="topbarNewQuizBtn"
      >
        <span>+</span>
        <span>New quiz</span>
      </button>
    `;

    bindToolbarEvents();
  }

  function bindToolbarEvents() {
    const searchInput = document.querySelector("#topbarSearchInput");
    const installBtn = document.querySelector("#topbarInstallBtn");
    const bellBtn = document.querySelector("#topbarBellBtn");
    const newQuizBtn = document.querySelector("#topbarNewQuizBtn");

    // Live search input filtering
    if (searchInput) {
      searchInput.addEventListener("input", (e) => {
        const query = e.target.value;
        if (typeof setView === "function") {
          setView("library");
        }
        const librarySearch = document.querySelector("#librarySearch");
        if (librarySearch) {
          librarySearch.value = query;
          librarySearch.dispatchEvent(new Event("input", { bubbles: true }));
        }
      });
    }

    // Trigger Install App
    if (installBtn) {
      installBtn.addEventListener("click", () => {
        const primaryInstall = document.querySelector("#installAppBtn");
        if (primaryInstall) {
          primaryInstall.click();
        } else if (typeof showMessage === "function") {
          showMessage("App installation ready.");
        }
      });
    }

    // Trigger Notifications
    if (bellBtn) {
      bellBtn.addEventListener("click", () => {
        const notificationBtn = document.querySelector("#notificationBtn");
        if (notificationBtn) {
          notificationBtn.click();
        } else if (typeof showMessage === "function") {
          showMessage("No new notifications.");
        }
      });
    }

    // Navigate to Create Quiz view
    if (newQuizBtn) {
      newQuizBtn.addEventListener("click", () => {
        if (typeof setView === "function") {
          setView("create");
        }
      });
    }
  }

  // Observe DOM changes to ensure header renders reliably
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", renderWorkspaceToolbar);
  } else {
    renderWorkspaceToolbar();
  }

  const observer = new MutationObserver(renderWorkspaceToolbar);
  observer.observe(document.body, { childList: true, subtree: true });
})();