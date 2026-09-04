(() => {
  const METADATA_KEY = "quiletQuizMetadata";
  const QUIZZES_KEY = "quiletQuizzes";
  const PENDING_OPEN_KEY = "quiletPendingCatalogQuiz";
  const MAX_PUBLIC_RESULTS = 200;

  let client = null;
  let authPromise = null;
  let publicQuizzes = [];
  let publicQuizzesLoaded = false;
  let searchQuery = "";
  let syncQueued = false;
  let importInProgress = false;

  function readJson(key, fallback) {
    try {
      const value = localStorage.getItem(key);
      return value === null ? fallback : JSON.parse(value);
    } catch {
      return fallback;
    }
  }

  function writeJson(key, value) {
    localStorage.setItem(key, JSON.stringify(value));
  }

  function getCurrentUser() {
    return readJson("quiletUser", null);
  }

  function getOwnerKey() {
    const user = getCurrentUser();

    return String(user?.email || user?.id || "")
      .trim()
      .toLowerCase();
  }

  function getMetadata() {
    const metadata = readJson(METADATA_KEY, {});

    return metadata && typeof metadata === "object"
      ? metadata
      : {};
  }

  function saveMetadata(metadata) {
    writeJson(METADATA_KEY, metadata);
  }

  function getQuizzes() {
    const quizzes = readJson(QUIZZES_KEY, []);
    return Array.isArray(quizzes) ? quizzes : [];
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

  function showMessage(message, duration = 4000) {
    const toast = document.querySelector("#notificationToast");

    if (!toast) return;

    toast.textContent = message;
    toast.classList.remove("hidden");
    toast.setAttribute("role", "status");

    clearTimeout(showMessage.timer);
    showMessage.timer = setTimeout(() => {
      toast.classList.add("hidden");
    }, duration);
  }

  function setText(element, value) {
    if (element && element.textContent !== value) {
      element.textContent = value;
    }
  }

  function createClient() {
    if (client) return client;

    const config = window.__SUPABASE_CONFIG__ || {};

    client =
      window.__QUILET_SUPABASE_CLIENT__ ||
      window.__SUPABASE_CLIENT__ ||
      null;

    if (
      !client &&
      window.supabase?.createClient &&
      config.url &&
      config.anonKey
    ) {
      client = window.supabase.createClient(
        config.url,
        config.anonKey
      );
    }

    if (client) {
      window.__SUPABASE_CLIENT__ = client;
    }

    return client;
  }

  async function ensureAuthenticated() {
    const supabaseClient = createClient();

    if (!supabaseClient) {
      throw new Error("The public quiz service is unavailable.");
    }

    if (authPromise) return authPromise;

    authPromise = (async () => {
      const sessionResult = await supabaseClient.auth.getSession();

      if (sessionResult.error) throw sessionResult.error;

      if (sessionResult.data.session?.user) {
        return sessionResult.data.session.user;
      }

      const signInResult =
        await supabaseClient.auth.signInAnonymously();

      if (signInResult.error) {
        throw new Error(
          "Anonymous access is not enabled for public quizzes."
        );
      }

      return signInResult.data.user;
    })();

    try {
      return await authPromise;
    } catch (error) {
      authPromise = null;
      throw error;
    }
  }

  function addStyles() {
    if (document.querySelector("#quizCatalogStyles")) return;

    const style = document.createElement("style");
    style.id = "quizCatalogStyles";
    style.textContent = `
      .quiz-visibility-panel {
        max-width: 100%;
        padding: 18px;
        overflow: hidden;
        border: 1px solid var(--border);
        border-radius: 17px;
        background: var(--panel-soft);
      }

      .quiz-visibility-panel h3,
      .public-catalog-head h2 {
        margin: 0;
      }

      .quiz-visibility-panel p,
      .public-catalog-head p {
        margin: 4px 0 0;
        color: var(--muted);
      }

      .visibility-options {
        display: grid;
        grid-template-columns: repeat(2, minmax(0, 1fr));
        gap: 12px;
        margin-top: 14px;
      }

      .visibility-choice {
        display: flex;
        min-width: 0;
        min-height: 82px;
        flex-direction: row;
        align-items: flex-start;
        gap: 11px;
        padding: 14px;
        border: 1px solid var(--border);
        border-radius: 14px;
        background: var(--panel);
        cursor: pointer;
      }

      .visibility-choice:has(input:checked) {
        border-color: var(--accent);
        background: var(--accent-soft);
        box-shadow: 0 0 0 3px var(--accent-soft);
      }

      .visibility-choice input {
        width: 19px;
        min-width: 19px;
        min-height: 19px;
        margin-top: 2px;
        accent-color: var(--accent);
      }

      .visibility-choice span {
        min-width: 0;
      }

      .visibility-choice strong,
      .visibility-choice small {
        display: block;
        overflow-wrap: anywhere;
      }

      .visibility-choice small {
        margin-top: 3px;
        color: var(--muted);
        line-height: 1.4;
      }

      #discoverView > .panel {
        min-height: 420px;
      }

      .public-catalog {
        min-width: 0;
        max-width: 100%;
        margin-top: 4px;
      }

      .public-catalog-head {
        display: flex;
        min-width: 0;
        align-items: flex-start;
        justify-content: space-between;
        gap: 18px;
        margin-bottom: 20px;
      }

      .public-catalog-head > div {
        min-width: 0;
      }

      .public-catalog-search {
        display: flex;
        gap: 10px;
        margin-bottom: 20px;
      }

      .public-catalog-search input {
        min-width: 0;
        flex: 1;
      }

      .public-quiz-grid {
        display: grid;
        grid-template-columns:
          repeat(auto-fit, minmax(min(100%, 245px), 1fr));
        gap: 16px;
        min-width: 0;
      }

      .public-quiz-grid > * {
        min-width: 0;
        max-width: 100%;
      }

      .visibility-badge.public {
        background: rgba(22, 163, 74, 0.12);
        color: var(--success);
      }

      .visibility-badge.private {
        background: rgba(100, 116, 139, 0.13);
        color: var(--muted);
      }

      .catalog-owner {
        margin-top: -5px !important;
        font-size: 0.85rem;
      }

      [data-host-public-quiz].is-importing {
        cursor: wait;
        pointer-events: none;
      }

      .join-participant-fields {
        display: grid;
        grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
        gap: 14px;
        padding: 16px;
        border: 1px solid var(--border);
        border-radius: 15px;
        background: var(--panel-soft);
      }

      .join-participant-fields[hidden] {
        display: none !important;
      }

      .join-consent {
        display: flex;
        min-width: 0;
        flex-direction: row;
        align-items: center;
        gap: 10px;
        margin: 0;
      }

      .join-consent input {
        width: 19px;
        min-width: 19px;
        min-height: 19px;
        flex: 0 0 19px;
      }

      @media (max-width: 640px) {
        .visibility-options,
        .join-participant-fields {
          grid-template-columns: minmax(0, 1fr);
        }

        .public-catalog-head,
        .public-catalog-search {
          flex-direction: column;
        }

        .public-catalog-head > *,
        .public-catalog-search > * {
          width: 100%;
          max-width: 100%;
        }
      }
    `;

    document.head.appendChild(style);
  }

  function addDiscoverNavigation() {
    const navigation = document.querySelector(".nav-group");

    if (
      !navigation ||
      navigation.querySelector('[data-view="discover"]')
    ) {
      return;
    }

    const button = document.createElement("button");
    button.type = "button";
    button.className = "nav-btn";
    button.dataset.view = "discover";
    button.innerHTML = `
      <span class="nav-icon" aria-hidden="true">◎</span>
      <span>Discover</span>
    `;

    const libraryButton = navigation.querySelector(
      '[data-view="library"]'
    );

    if (libraryButton) {
      libraryButton.insertAdjacentElement("afterend", button);
    } else {
      navigation.appendChild(button);
    }
  }

  function addDiscoverView() {
    const main = document.querySelector("main");

    if (!main || document.querySelector("#discoverView")) return;

    const view = document.createElement("section");
    view.id = "discoverView";
    view.className = "view";

    view.innerHTML = `
      <div class="panel">
        <section id="publicQuizCatalog" class="public-catalog">
          <div class="public-catalog-head">
            <div>
              <p class="eyebrow">Explore shared quizzes</p>
              <h2>Discover</h2>
              <p>
                Search public quizzes shared by other Quilet creators.
              </p>
            </div>

            <button
              type="button"
              class="secondary-btn"
              data-refresh-public-quizzes
            >
              Refresh
            </button>
          </div>

          <div class="public-catalog-search">
            <input
              id="publicQuizSearch"
              class="search-input"
              type="search"
              placeholder="Search by title, subject, category, or creator..."
              autocomplete="off"
            />
          </div>

          <div id="publicQuizList" class="public-quiz-grid">
            <div class="empty-state">
              <p>Open Discover to load public quizzes.</p>
            </div>
          </div>
        </section>
      </div>
    `;

    const analytics = document.querySelector("#analyticsView");

    if (analytics) {
      analytics.insertAdjacentElement("beforebegin", view);
    } else {
      main.appendChild(view);
    }
  }

  function showDiscoverView() {
    if (!getCurrentUser()) return;

    document.querySelectorAll(".view").forEach((view) => {
      view.classList.remove("active");
    });

    document.querySelector("#discoverView")?.classList.add("active");

    document.querySelectorAll(".nav-btn").forEach((button) => {
      button.classList.toggle(
        "active",
        button.dataset.view === "discover"
      );
    });

    document.querySelector("#mainTopbar")
      ?.classList.remove("menu-open");

    document.querySelector("#topbarActions")
      ?.classList.remove("mobile-menu-open");

    document.querySelector("#hamburgerBtn")
      ?.setAttribute("aria-expanded", "false");

    localStorage.setItem("quiletActiveView", "discover");

    window.scrollTo({
      top: 0,
      behavior: window.matchMedia?.(
        "(prefers-reduced-motion: reduce)"
      ).matches ? "auto" : "smooth"
    });

    if (!publicQuizzesLoaded) {
      void loadPublicQuizzes();
    }
  }

  function restoreDiscoverView() {
    if (
      getCurrentUser() &&
      localStorage.getItem("quiletActiveView") === "discover" &&
      !sessionStorage.getItem(PENDING_OPEN_KEY)
    ) {
      showDiscoverView();
    }
  }

  function addVisibilitySelector() {
    const form = document.querySelector("#quizForm");
    const questions = document.querySelector("#questionFields");

    if (
      !form ||
      !questions ||
      document.querySelector("#quizVisibilityPanel")
    ) {
      return;
    }

    const panel = document.createElement("section");
    panel.id = "quizVisibilityPanel";
    panel.className = "quiz-visibility-panel";

    panel.innerHTML = `
      <h3>Quiz visibility</h3>
      <p>Choose who can find and host this quiz.</p>

      <div class="visibility-options">
        <label class="visibility-choice">
          <input
            type="radio"
            name="visibility"
            value="private"
            checked
          />
          <span>
            <strong>🔒 Private</strong>
            <small>Only this account can see and host the quiz.</small>
          </span>
        </label>

        <label class="visibility-choice">
          <input
            type="radio"
            name="visibility"
            value="public"
          />
          <span>
            <strong>🌍 Public</strong>
            <small>Anyone can find, import, and host the quiz.</small>
          </span>
        </label>
      </div>
    `;

    questions.insertAdjacentElement("beforebegin", panel);
  }

  function addJoinParticipantFields() {
    const form = document.querySelector("#joinForm");

    if (
      !form ||
      form.querySelector("[data-join-disclosure]")
    ) {
      return;
    }

    const fields = document.createElement("div");
    fields.className = "join-participant-fields";
    fields.dataset.joinDisclosure = "true";
    fields.hidden = true;
    fields.setAttribute("aria-hidden", "true");

    fields.innerHTML = `
      <label for="joinParticipantName">
        Nickname
        <input
          id="joinParticipantName"
          name="nickname"
          maxlength="30"
          autocomplete="nickname"
          placeholder="Enter your nickname"
          disabled
        />
      </label>

    `;

    const helper = form.querySelector(".muted-text");

    if (helper) {
      helper.insertAdjacentElement("beforebegin", fields);
    } else {
      form.appendChild(fields);
    }
  }

  function syncJoinDisclosure() {
    const codeInput = document.querySelector("#joinCodeInput");
    const disclosure = document.querySelector(
      "#joinForm [data-join-disclosure]"
    );

    if (!codeInput || !disclosure) return;

    const code = String(codeInput.value || "")
      .toUpperCase()
      .replace(/[^A-Z0-9]/g, "")
      .slice(0, 6);

    if (codeInput.value !== code) {
      codeInput.value = code;
    }

    const visible = /^[A-Z0-9]{6}$/.test(code);
    const nickname = disclosure.querySelector(
      "#joinParticipantName"
    );

    disclosure.hidden = !visible;
    disclosure.setAttribute("aria-hidden", String(!visible));

    if (nickname) {
      nickname.disabled = !visible;
      nickname.required = visible;

      if (!visible) nickname.value = "";
    }

  }

  function migrateLocalQuizOwnership() {
    const ownerKey = getOwnerKey();
    if (!ownerKey) return;

    const metadata = getMetadata();
    let changed = false;

    getQuizzes().forEach((quiz) => {
      const id = String(quiz.id);

      if (!metadata[id]) {
        metadata[id] = {
          ownerKey,
          visibility:
            quiz.visibility === "public" ? "public" : "private",
          createdAt: new Date().toISOString(),
          imported: false
        };

        changed = true;
      }
    });

    if (changed) saveMetadata(metadata);
  }

  function decorateLocalCards() {
    const metadata = getMetadata();
    const ownerKey = getOwnerKey();

    document.querySelectorAll(
      "#quizList .quiz-card, #homePreview .quiz-card"
    ).forEach((card) => {
      const playButton = card.querySelector("[data-play-quiz]");
      if (!playButton) return;

      const id = String(playButton.dataset.playQuiz);
      const details = metadata[id] || {
        ownerKey,
        visibility: "private"
      };

      const isOwner =
        !details.ownerKey ||
        details.ownerKey === ownerKey;

      card.classList.toggle("hidden", !isOwner);
      if (!isOwner) return;

      let badge = card.querySelector("[data-visibility-badge]");

      if (!badge) {
        badge = document.createElement("span");
        badge.dataset.visibilityBadge = "true";
        card.querySelector(".badge-row")?.appendChild(badge);
      }

      if (!badge) return;

      const isPublic = details.visibility === "public";
      const className =
        `badge visibility-badge ${isPublic ? "public" : "private"}`;

      if (badge.className !== className) {
        badge.className = className;
      }

      setText(
        badge,
        isPublic ? "🌍 Public" : "🔒 Private"
      );
    });

    const quizCount = document.querySelector("#quizCount");

    if (quizCount) {
      const count = getQuizzes().filter((quiz) => {
        const details = metadata[String(quiz.id)];

        return !details || details.ownerKey === ownerKey;
      }).length;

      setText(quizCount, String(count));
    }
  }

  function quizPayload(quiz) {
    return {
      ...quiz,
      visibility: "public",
      creatorName:
        getCurrentUser()?.name || "Quilet creator"
    };
  }

  async function publishQuiz(quiz, localId) {
    const supabaseClient = createClient();

    if (!supabaseClient) {
      throw new Error("The public quiz service is unavailable.");
    }

    const user = await ensureAuthenticated();
    const metadata = getMetadata();
    const details = metadata[String(localId)] || {};

    const values = {
      owner_id: user.id,
      creator_name:
        getCurrentUser()?.name || "Quilet creator",
      title: quiz.title,
      subject: quiz.subject || "General",
      description: quiz.description || "",
      category: quiz.category || "",
      difficulty: quiz.difficulty || "medium",
      visibility: "public",
      quiz: quizPayload(quiz),
      updated_at: new Date().toISOString()
    };

    let result;

    if (details.remoteId && !details.imported) {
      result = await supabaseClient
        .from("quizzes")
        .update(values)
        .eq("id", details.remoteId)
        .eq("owner_id", user.id)
        .select("id")
        .single();
    } else {
      result = await supabaseClient
        .from("quizzes")
        .insert(values)
        .select("id")
        .single();
    }

    if (result.error) throw result.error;

    metadata[String(localId)] = {
      ...details,
      ownerKey: getOwnerKey(),
      visibility: "public",
      remoteId: result.data.id,
      imported: false,
      createdAt:
        details.createdAt || new Date().toISOString()
    };

    saveMetadata(metadata);
  }

  async function handleSavedQuiz(beforeIds, visibility) {
    const quiz = getQuizzes().find(
      (item) => !beforeIds.has(String(item.id))
    );

    if (!quiz) return;

    const metadata = getMetadata();
    const id = String(quiz.id);

    metadata[id] = {
      ownerKey: getOwnerKey(),
      visibility,
      createdAt: new Date().toISOString(),
      imported: false
    };

    saveMetadata(metadata);
    decorateLocalCards();

    if (visibility !== "public") {
      showMessage("Private quiz saved.");
      return;
    }

    showMessage("Publishing quiz to Discover…");

    try {
      await publishQuiz(quiz, id);
      publicQuizzesLoaded = false;
      decorateLocalCards();
      showMessage("Public quiz published successfully.");
    } catch (error) {
      console.error(error);

      metadata[id].visibility = "private";
      saveMetadata(metadata);
      decorateLocalCards();

      showMessage(`The quiz was kept private: ${error.message}`);
    }
  }

  async function handleUpdatedQuiz(event) {
    const quiz = event.detail;
    if (!quiz?.id) return;

    const details = getMetadata()[String(quiz.id)];

    if (
      !details ||
      details.visibility !== "public" ||
      details.imported
    ) {
      return;
    }

    try {
      await publishQuiz(quiz, quiz.id);
      publicQuizzesLoaded = false;
      showMessage("Quiz and public copy updated.");
    } catch (error) {
      console.error(error);
      showMessage(`Online update failed: ${error.message}`);
    }
  }

  async function loadPublicQuizzes() {
    const list = document.querySelector("#publicQuizList");
    const supabaseClient = createClient();

    if (!list) return;

    if (!supabaseClient) {
      list.innerHTML = `
        <div class="empty-state">
          <p>The public quiz service is not configured.</p>
        </div>
      `;
      return;
    }

    list.innerHTML = `
      <div class="empty-state">
        <p>Loading public quizzes…</p>
      </div>
    `;

    try {
      await ensureAuthenticated();

      const result = await supabaseClient
        .from("quizzes")
        .select(`
          id,
          owner_id,
          creator_name,
          title,
          subject,
          description,
          category,
          difficulty,
          quiz,
          play_count,
          created_at
        `)
        .eq("visibility", "public")
        .order("created_at", { ascending: false })
        .limit(MAX_PUBLIC_RESULTS);

      if (result.error) throw result.error;

      publicQuizzes = result.data || [];
      publicQuizzesLoaded = true;
      renderPublicQuizzes();
    } catch (error) {
      console.error(error);
      publicQuizzesLoaded = false;

      list.innerHTML = `
        <div class="empty-state">
          <h3>Public quizzes unavailable</h3>
          <p>${escapeHtml(error.message)}</p>
        </div>
      `;
    }
  }

  function renderPublicQuizzes() {
    const list = document.querySelector("#publicQuizList");
    if (!list) return;

    const query = searchQuery.trim().toLowerCase();

    const quizzes = query
      ? publicQuizzes.filter((item) => [
          item.title,
          item.subject,
          item.description,
          item.category,
          item.creator_name
        ].some((value) =>
          String(value || "").toLowerCase().includes(query)
        ))
      : publicQuizzes;

    list.innerHTML = quizzes.map((item) => {
      const quiz = item.quiz || {};
      const questionCount = Array.isArray(quiz.questions)
        ? quiz.questions.length
        : 0;

      return `
        <article class="quiz-card">
          <div class="badge-row">
            <span class="badge">
              ${escapeHtml(item.subject || "General")}
            </span>
            <span class="badge">${questionCount} questions</span>
            <span class="badge">
              ${escapeHtml(item.difficulty || "medium")}
            </span>
            <span class="badge visibility-badge public">
              🌍 Public
            </span>
          </div>

          <h3>${escapeHtml(item.title || "Untitled quiz")}</h3>

          <p>
            ${escapeHtml(
              item.description ||
              "Shared with the Quilet community."
            )}
          </p>

          <p class="catalog-owner">
            By ${escapeHtml(item.creator_name || "Quilet creator")}
            • ${Number(item.play_count || 0)} hosts
          </p>

          <div class="quiz-actions">
            <button
              type="button"
              class="primary-btn"
              data-host-public-quiz="${escapeHtml(item.id)}"
            >
              Import and host
            </button>
          </div>
        </article>
      `;
    }).join("") || `
      <div class="empty-state">
        <h3>No public quizzes found</h3>
        <p>Try a different search.</p>
      </div>
    `;
  }

  function normalizeImportedQuiz(record, localId) {
    const source = record.quiz || {};

    return {
      ...source,
      id: Number(localId),
      title: record.title || source.title || "Untitled quiz",
      subject: record.subject || source.subject || "General",
      description:
        record.description || source.description || "",
      category: record.category || source.category || "",
      difficulty:
        record.difficulty || source.difficulty || "medium",
      questions: Array.isArray(source.questions)
        ? source.questions
        : []
    };
  }

  async function clearStaleAppCache() {
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
          .catch(() => {})
      );
    }

    if ("caches" in window) {
      tasks.push(
        caches.keys()
          .then((names) =>
            Promise.allSettled(
              names.map((name) => caches.delete(name))
            )
          )
          .catch(() => {})
      );
    }

    await Promise.allSettled(tasks);
  }

  async function reloadIntoImportedQuiz(localId) {
    sessionStorage.setItem(PENDING_OPEN_KEY, String(localId));
    localStorage.setItem("quiletActiveView", "library");

    showMessage(
      "Quiz imported. Opening it in the current workspace…",
      8000
    );

    await clearStaleAppCache();

    const url = new URL(window.location.href);

    url.searchParams.delete("join");
    url.searchParams.delete("build");
    url.searchParams.set("catalogRefresh", Date.now().toString());

    window.location.replace(url.toString());
  }

  async function importAndHost(remoteId) {
    if (importInProgress) return;

    const record = publicQuizzes.find(
      (item) => String(item.id) === String(remoteId)
    );

    if (!record?.quiz?.questions?.length) {
      showMessage("That public quiz is unavailable.");
      return;
    }

    importInProgress = true;

    try {
      const quizzes = getQuizzes();
      const metadata = getMetadata();

      const existing = Object.entries(metadata).find(
        ([localId, details]) =>
          String(details.remoteId) === String(record.id) &&
          quizzes.some(
            (quiz) => String(quiz.id) === String(localId)
          )
      );

      let localId = existing?.[0];

      if (!localId) {
        localId = String(Date.now());

        quizzes.unshift(
          normalizeImportedQuiz(record, localId)
        );

        writeJson(QUIZZES_KEY, quizzes);

        metadata[localId] = {
          ownerKey: getOwnerKey(),
          visibility: "public",
          remoteId: record.id,
          imported: true,
          createdAt: new Date().toISOString()
        };

        saveMetadata(metadata);
      } else {
        const quizIndex = quizzes.findIndex(
          (quiz) => String(quiz.id) === String(localId)
        );

        if (quizIndex >= 0) {
          quizzes[quizIndex] = normalizeImportedQuiz(
            record,
            localId
          );

          writeJson(QUIZZES_KEY, quizzes);
        }
      }

      try {
        const supabaseClient = createClient();

        if (supabaseClient) {
          await ensureAuthenticated();

          await supabaseClient.rpc(
            "increment_quiz_play_count",
            { p_quiz_id: record.id }
          );
        }
      } catch (error) {
        console.warn("Could not update public play count:", error);
      }

      await reloadIntoImportedQuiz(localId);
    } finally {
      importInProgress = false;
    }
  }

  async function removeRemoteQuizIfDeleted(
    localId,
    previousMetadata
  ) {
    const stillExists = getQuizzes().some(
      (quiz) => String(quiz.id) === String(localId)
    );

    if (stillExists) return;

    const metadata = getMetadata();
    delete metadata[String(localId)];
    saveMetadata(metadata);

    if (
      !previousMetadata?.remoteId ||
      previousMetadata.imported
    ) {
      return;
    }

    try {
      const supabaseClient = createClient();
      if (!supabaseClient) return;

      const user = await ensureAuthenticated();

      const result = await supabaseClient
        .from("quizzes")
        .delete()
        .eq("id", previousMetadata.remoteId)
        .eq("owner_id", user.id);

      if (result.error) throw result.error;

      publicQuizzesLoaded = false;
    } catch (error) {
      console.error(error);
      showMessage(`Online deletion failed: ${error.message}`);
    }
  }

  function cleanRefreshParameter() {
    const url = new URL(window.location.href);

    if (!url.searchParams.has("catalogRefresh")) return;

    url.searchParams.delete("catalogRefresh");

    window.history.replaceState(
      window.history.state,
      "",
      `${url.pathname}${url.search}${url.hash}`
    );
  }

  function openPendingQuiz() {
    const localId = sessionStorage.getItem(PENDING_OPEN_KEY);
    if (!localId) return;

    localStorage.setItem("quiletActiveView", "library");

    let attempts = 0;

    const tryOpen = () => {
      attempts += 1;

      const libraryButton = document.querySelector(
        '.nav-btn[data-view="library"], [data-view="library"]'
      );

      libraryButton?.click();

      const escapedId =
        window.CSS?.escape?.(localId) || localId;

      const playButton = document.querySelector(
        `[data-play-quiz="${escapedId}"]`
      );

      if (playButton) {
        sessionStorage.removeItem(PENDING_OPEN_KEY);

        requestAnimationFrame(() => {
          playButton.scrollIntoView({
            behavior: window.matchMedia?.(
              "(prefers-reduced-motion: reduce)"
            ).matches ? "auto" : "smooth",
            block: "center"
          });

          playButton.click();
        });

        return;
      }

      if (attempts < 30) {
        setTimeout(tryOpen, 150);
      } else {
        sessionStorage.removeItem(PENDING_OPEN_KEY);
        showMessage(
          "The quiz was imported successfully and is in your library."
        );
      }
    };

    setTimeout(tryOpen, 200);
  }

  function synchronizeInterface() {
    addDiscoverNavigation();
    addDiscoverView();
    addVisibilitySelector();
    addJoinParticipantFields();
    syncJoinDisclosure();
    migrateLocalQuizOwnership();
    decorateLocalCards();
  }

  function scheduleInterfaceSync() {
    if (syncQueued) return;

    syncQueued = true;

    requestAnimationFrame(() => {
      syncQueued = false;
      synchronizeInterface();
    });
  }

  function bindEvents() {
    const form = document.querySelector("#quizForm");

    form?.addEventListener("submit", () => {
      const beforeIds = new Set(
        getQuizzes().map((quiz) => String(quiz.id))
      );

      const visibility =
        form.querySelector(
          '[name="visibility"]:checked'
        )?.value || "private";

      setTimeout(() => {
        void handleSavedQuiz(beforeIds, visibility);
      }, 100);
    }, true);

    window.addEventListener(
      "quilet:quiz-updated",
      handleUpdatedQuiz
    );

    document.addEventListener("input", (event) => {
      if (event.target.id === "publicQuizSearch") {
        searchQuery = event.target.value;
        renderPublicQuizzes();
      }

      if (event.target.id === "joinCodeInput") {
        syncJoinDisclosure();
      }
    });

    document.addEventListener("click", async (event) => {
      if (event.target.closest('[data-view="discover"]')) {
        showDiscoverView();
        return;
      }

      if (event.target.closest("[data-refresh-public-quizzes]")) {
        event.preventDefault();
        publicQuizzesLoaded = false;
        await loadPublicQuizzes();
        return;
      }

      const hostButton = event.target.closest(
        "[data-host-public-quiz]"
      );

      if (hostButton) {
        event.preventDefault();
        event.stopImmediatePropagation();

        if (importInProgress) return;

        const originalText = hostButton.textContent;

        hostButton.disabled = true;
        hostButton.classList.add("is-importing");
        hostButton.textContent = "Importing quiz…";

        try {
          await importAndHost(
            hostButton.dataset.hostPublicQuiz
          );
        } catch (error) {
          console.error(error);
          importInProgress = false;
          hostButton.disabled = false;
          hostButton.classList.remove("is-importing");
          hostButton.textContent = originalText;

          showMessage(`Could not import quiz: ${error.message}`);
        }

        return;
      }

      const deleteButton = event.target.closest(
        "[data-delete-quiz]"
      );

      if (deleteButton) {
        const localId = String(
          deleteButton.dataset.deleteQuiz
        );

        const previousMetadata =
          getMetadata()[localId];

        setTimeout(() => {
          void removeRemoteQuizIfDeleted(
            localId,
            previousMetadata
          );
        }, 120);
      }
    }, true);
  }

  function observeInterface() {
    const targets = [
      document.querySelector("#quizList"),
      document.querySelector("#homePreview"),
      document.querySelector(".nav-group"),
      document.querySelector("#joinForm")
    ].filter(Boolean);

    const observer = new MutationObserver(
      scheduleInterfaceSync
    );

    targets.forEach((target) => {
      observer.observe(target, {
        childList: true,
        subtree: true
      });
    });
  }

  function initialize() {
    addStyles();
    cleanRefreshParameter();
    synchronizeInterface();
    bindEvents();
    observeInterface();
    openPendingQuiz();
    restoreDiscoverView();
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
