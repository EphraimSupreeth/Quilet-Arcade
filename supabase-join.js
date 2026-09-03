(() => {
  const liveState = {
    client: null,
    hostSession: null,
    playerSession: null,
    member: null,
    sessionChannel: null,
    memberChannel: null,
    publishing: false,
    joining: false,
    answeredQuestion: null,
    initialized: false,
    updateQueued: false
  };

  const $ = (selector) => document.querySelector(selector);

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
    }, 4500);
  }

  function describeError(error) {
    const message = String(error?.message || error || "Unknown error");

    if (message.toLowerCase().includes("already answered")) {
      return "You already answered this question.";
    }

    if (message.toLowerCase().includes("not found")) {
      return "That session was not found or has expired.";
    }

    if (
      message.toLowerCase().includes("row-level security") ||
      message.toLowerCase().includes("permission denied")
    ) {
      return "Supabase permissions are missing. Run quiz-live.sql.";
    }

    if (
      message.toLowerCase().includes("relation") ||
      message.toLowerCase().includes("schema cache")
    ) {
      return "Live quiz tables are missing. Run quiz-live.sql in Supabase.";
    }

    return message;
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

  function cleanCode(value) {
    return String(value || "")
      .replace(/[^a-z0-9]/gi, "")
      .slice(0, 6)
      .toUpperCase();
  }

  function readJson(key, fallback) {
    try {
      const value = localStorage.getItem(key);
      return value === null ? fallback : JSON.parse(value);
    } catch {
      return fallback;
    }
  }

  function getDisplayName() {
    return String(
      readJson("quiletUser", {})?.name || "Learner"
    ).trim().slice(0, 32);
  }

  function getJoinLink(code) {
    const url = new URL(window.location.href);

    url.search = "";
    url.hash = "";
    url.searchParams.set("join", code);

    return url.toString();
  }

  function getUrlCode() {
    const params = new URLSearchParams(window.location.search);

    return cleanCode(
      params.get("join") ||
      params.get("code") ||
      params.get("sessionCode")
    );
  }

  async function copyText(value) {
    try {
      await navigator.clipboard.writeText(value);
      return true;
    } catch {
      const textarea = document.createElement("textarea");

      textarea.value = value;
      textarea.readOnly = true;
      textarea.style.position = "fixed";
      textarea.style.left = "-9999px";
      document.body.appendChild(textarea);
      textarea.select();

      const copied = document.execCommand("copy");
      textarea.remove();

      return copied;
    }
  }

  function getClient() {
    if (liveState.client) return liveState.client;

    liveState.client =
      window.__QUILET_SUPABASE_CLIENT__ ||
      window.__SUPABASE_CLIENT__ ||
      null;

    return liveState.client;
  }

  async function requireUser() {
    const client = getClient();
    const localUser = readJson("quiletUser", null);

    if (!client) {
      throw new Error("Supabase is not available.");
    }

    if (!localUser?.id || !localUser?.email) {
      throw new Error("Please sign in before hosting or joining a live quiz.");
    }

    const result = await client.auth.getSession();

    if (result.error) throw result.error;

    let user = result.data.session?.user;

    if (!user) {
      const anonymousResult = await client.auth.signInAnonymously();

      if (anonymousResult.error) {
        throw new Error(
          "Live quizzes need anonymous access enabled in Supabase."
        );
      }

      user = anonymousResult.data.user;
    }

    return user;
  }

  function activatePlayView() {
    document.querySelectorAll(".view").forEach((view) => {
      view.classList.remove("active");
    });

    $("#playView")?.classList.add("active");

    document.querySelectorAll(".nav-btn").forEach((button) => {
      button.classList.remove("active");
    });

    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function findHostQuiz() {
    const lobby = $("#playContent .session-info");
    if (!lobby) return null;

    const title = $("#playContent .play-head h2")?.textContent.trim();
    const quizzes = readJson("quiletQuizzes", []);

    return quizzes.find((quiz) => quiz.title === title) || null;
  }

  function updateHostCode(code) {
    document.querySelectorAll(
      "#playContent .session-code, [data-session-code]"
    ).forEach((element) => {
      element.textContent = code;
      element.dataset.sessionCode = code;
    });

    const startButton = $("[data-start-live-game]");

    if (startButton) {
      startButton.dataset.startLive = "true";
      startButton.disabled = false;
    }

    let panel = $("#liveSharePanel");

    if (!panel) {
      panel = document.createElement("section");
      panel.id = "liveSharePanel";
      panel.className = "quilet-live-share";

      $("#playContent .session-info")?.insertAdjacentElement(
        "afterend",
        panel
      );
    }

    const link = getJoinLink(code);

    panel.innerHTML = `
      <strong>Invite players from anywhere</strong>
      <a href="${escapeHtml(link)}" target="_blank" rel="noopener">
        ${escapeHtml(link)}
      </a>
      <div class="quilet-live-actions">
        <button type="button" class="secondary-btn"
          data-copy-live-code="${escapeHtml(code)}">
          Copy code
        </button>
        <button type="button" class="secondary-btn"
          data-copy-live-link="${escapeHtml(link)}">
          Copy link
        </button>
      </div>
    `;
  }

  async function publishHostLobby() {
    if (
      liveState.publishing ||
      liveState.hostSession ||
      !$("#playContent .session-info")
    ) {
      return;
    }

    const quiz = findHostQuiz();
    if (!quiz) return;

    liveState.publishing = true;

    try {
      await requireUser();

      const result = await getClient().rpc(
        "quilet_create_quiz_session",
        {
          p_quiz: quiz,
          p_settings: {
            mode:
              $("#playContent .play-head .muted-text")
                ?.textContent.trim() || "Live quiz",
            question_seconds: Number(
              window.QuiletHostTiming?.seconds || 20
            ),
            timed: Boolean(window.QuiletHostTiming?.enabled)
          }
        }
      );

      if (result.error) throw result.error;

      liveState.hostSession = result.data;
      updateHostCode(result.data.code);
      await subscribeAsHost(result.data.id);

      showMessage(`Live session ready: ${result.data.code}`);
    } catch (error) {
      console.error("Live quiz publishing failed:", error);
      showMessage(describeError(error));
    } finally {
      liveState.publishing = false;
    }
  }

  async function fetchSession(sessionId) {
    const result = await getClient()
      .from("quilet_quiz_sessions")
      .select("*")
      .eq("id", sessionId)
      .single();

    if (result.error) throw result.error;
    return result.data;
  }

  async function fetchMembers(sessionId) {
    const result = await getClient()
      .from("quilet_quiz_members")
      .select("id, display_name, score, correct_answers, status, joined_at")
      .eq("session_id", sessionId)
      .neq("status", "removed")
      .order("score", { ascending: false })
      .order("joined_at", { ascending: true });

    if (result.error) throw result.error;
    return result.data || [];
  }

  function removeChannel(channel) {
    if (channel && getClient()) {
      void getClient().removeChannel(channel);
    }
  }

  async function subscribeAsHost(sessionId) {
    removeChannel(liveState.memberChannel);

    liveState.memberChannel = getClient()
      .channel(`quiz-host-members-${sessionId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "quilet_quiz_members",
          filter: `session_id=eq.${sessionId}`
        },
        () => {
          if (liveState.hostSession?.status !== "waiting") {
            void renderHostControl();
          } else {
            void updateWaitingLobby();
          }
        }
      )
      .subscribe();

    await updateWaitingLobby();
  }

  async function updateWaitingLobby() {
    const session = liveState.hostSession;
    const list = $("#playContent .leaderboard-list");
    if (!session || !list) return;

    try {
      const members = await fetchMembers(session.id);
      const players = members.filter((member) => member.status === "connected");
      const hostName = getDisplayName();

      const count = $("#playContent .leaderboard-panel .badge");
      if (count) count.textContent = `${players.length} / 30 joined`;

      list.innerHTML = `
        <div class="leaderboard-item">
          <span class="leaderboard-rank">👑</span>
          <div>
            <strong>${escapeHtml(hostName)}</strong>
            <p class="muted-text">Host • Ready</p>
          </div>
        </div>
        ${players.map((member) => `
          <div class="leaderboard-item">
            <span class="leaderboard-rank">👤</span>
            <div>
              <strong>${escapeHtml(member.display_name)}</strong>
              <p class="muted-text">Player • Ready</p>
            </div>
          </div>
        `).join("")}
      `;
    } catch (error) {
      console.error("Lobby update failed:", error);
    }
  }

  async function startLiveQuiz() {
    const session = liveState.hostSession;

    if (!session) {
      showMessage("The online session is still being created.");
      return;
    }

    try {
      const result = await getClient()
        .from("quilet_quiz_sessions")
        .update({
          status: "active",
          current_question: 0,
          started_at: new Date().toISOString()
        })
        .eq("id", session.id)
        .eq("host_id", (await requireUser()).id)
        .select()
        .single();

      if (result.error) throw result.error;

      liveState.hostSession = result.data;

      $("#hostLeaderboardBox")?.remove();
      $("#hostLeaderboardLauncher")?.remove();

      await renderHostControl();
      showMessage("The live quiz has started.");
    } catch (error) {
      console.error("Could not start live quiz:", error);
      showMessage(describeError(error));
    }
  }

  async function renderHostControl() {
    const session = liveState.hostSession;
    const content = $("#playContent");
    if (!session || !content) return;

    try {
      const latest = await fetchSession(session.id);
      const members = await fetchMembers(session.id);

      liveState.hostSession = latest;

      const questions = latest.quiz_data?.questions || [];
      const question = questions[latest.current_question];
      const connected = members.filter(
        (member) => member.status === "connected"
      );

      content.innerHTML = `
        <div class="play-head">
          <div>
            <p class="eyebrow">Live host control</p>
            <h2>${escapeHtml(latest.title)}</h2>
            <p class="muted-text">
              Code ${escapeHtml(latest.code)} •
              ${connected.length} player${connected.length === 1 ? "" : "s"}
            </p>
          </div>
          <span class="host-badge">
            ${latest.status === "finished" ? "Finished" : "● Live"}
          </span>
        </div>

        ${question && latest.status === "active" ? `
          <section class="quilet-host-question">
            <span class="badge">
              Question ${latest.current_question + 1} of ${questions.length}
            </span>
            <h3>${escapeHtml(question.text)}</h3>
            <div class="option-list">
              ${(question.options || []).map((option, index) => `
                <div class="option-btn">
                  <strong>${String.fromCharCode(65 + index)}.</strong>
                  ${escapeHtml(option)}
                </div>
              `).join("")}
            </div>
          </section>
        ` : ""}

        <section class="quilet-live-ranking">
          <div class="panel-head">
            <h3>Live leaderboard</h3>
            <span class="badge">${connected.length} connected</span>
          </div>

          <div class="leaderboard-list">
            ${members.length ? members.map((member, index) => `
              <div class="leaderboard-item">
                <span class="leaderboard-rank">${index + 1}</span>
                <div>
                  <strong>${escapeHtml(member.display_name)}</strong>
                  <p class="muted-text">
                    ${member.correct_answers} correct
                  </p>
                </div>
                <strong>${member.score} pts</strong>
              </div>
            `).join("") : `
              <div class="empty-state">
                <p>Waiting for players.</p>
              </div>
            `}
          </div>
        </section>

        <div class="form-actions">
          ${latest.status === "active" ? `
            <button type="button" class="primary-btn" data-live-next>
              ${latest.current_question + 1 >= questions.length
                ? "Finish quiz"
                : "Next question"}
            </button>
            <button type="button" class="secondary-btn" data-live-end>
              End quiz
            </button>
          ` : `
            <button type="button" class="primary-btn" data-view="library">
              Back to library
            </button>
          `}
        </div>
      `;
    } catch (error) {
      console.error("Host dashboard failed:", error);
      showMessage(describeError(error));
    }
  }

  async function advanceLiveQuiz(forceEnd = false) {
    const session = liveState.hostSession;
    if (!session) return;

    const questionCount = session.quiz_data?.questions?.length || 0;
    const finished =
      forceEnd ||
      session.current_question + 1 >= questionCount;

    try {
      const changes = finished
        ? {
            status: "finished",
            ended_at: new Date().toISOString()
          }
        : {
            current_question: session.current_question + 1
          };

      const result = await getClient()
        .from("quilet_quiz_sessions")
        .update(changes)
        .eq("id", session.id)
        .select()
        .single();

      if (result.error) throw result.error;

      liveState.hostSession = result.data;
      await renderHostControl();

      if (finished) {
        showMessage("The live quiz has ended.");
      }
    } catch (error) {
      console.error("Question update failed:", error);
      showMessage(describeError(error));
    }
  }

  async function joinSession(code) {
    if (liveState.joining) return;

    const clean = cleanCode(code);

    if (clean.length !== 6) {
      showMessage("Enter a valid 6-character session code.");
      return;
    }

    liveState.joining = true;

    try {
      await requireUser();

      const result = await getClient().rpc(
        "quilet_join_quiz_session",
        {
          p_code: clean,
          p_display_name: getDisplayName()
        }
      );

      if (result.error) throw result.error;

      liveState.playerSession = result.data.session;
      liveState.member = result.data.member;
      liveState.answeredQuestion = null;

      activatePlayView();
      subscribeAsPlayer(result.data.session.id);
      renderPlayerSession();

      const url = new URL(window.location.href);
      url.searchParams.set("join", clean);
      window.history.replaceState({}, "", url);

      showMessage(`Joined session ${clean}.`);
    } catch (error) {
      console.error("Could not join session:", error);
      showMessage(describeError(error));
    } finally {
      liveState.joining = false;
    }
  }

  function subscribeAsPlayer(sessionId) {
    removeChannel(liveState.sessionChannel);

    liveState.sessionChannel = getClient()
      .channel(`quiz-player-session-${sessionId}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "quilet_quiz_sessions",
          filter: `id=eq.${sessionId}`
        },
        (payload) => {
          const previousQuestion =
            liveState.playerSession?.current_question;

          liveState.playerSession = payload.new;

          if (payload.new.current_question !== previousQuestion) {
            liveState.answeredQuestion = null;
          }

          renderPlayerSession();
        }
      )
      .subscribe();
  }

  function renderPlayerSession() {
    const session = liveState.playerSession;
    const content = $("#playContent");
    if (!session || !content) return;

    activatePlayView();

    const questions = session.quiz_data?.questions || [];
    const question = questions[session.current_question];

    if (session.status === "waiting") {
      content.innerHTML = `
        <div class="result-box">
          <p class="eyebrow">Live session ${escapeHtml(session.code)}</p>
          <h2>${escapeHtml(session.title)}</h2>
          <h3>You're in!</h3>
          <p>Waiting for the host to start the quiz.</p>
          <div class="quilet-waiting-pulse">● Connected</div>
          <button type="button" class="secondary-btn" data-leave-live>
            Leave session
          </button>
        </div>
      `;
      return;
    }

    if (session.status === "finished" || !question) {
      content.innerHTML = `
        <div class="result-box">
          <p class="eyebrow">Live quiz complete</p>
          <h2>${escapeHtml(session.title)}</h2>
          <h3>${Number(liveState.member?.score || 0)} points</h3>
          <p>Thanks for playing.</p>
          <button type="button" class="primary-btn" data-leave-live>
            Back to library
          </button>
        </div>
      `;
      return;
    }

    const answered =
      liveState.answeredQuestion === session.current_question;

    content.innerHTML = `
      <div class="play-head">
        <div>
          <p class="eyebrow">Live quiz • ${escapeHtml(session.code)}</p>
          <h2>${escapeHtml(session.title)}</h2>
        </div>
        <span class="badge">
          Question ${session.current_question + 1} of ${questions.length}
        </span>
      </div>

      <h3 class="play-question">${escapeHtml(question.text)}</h3>

      <div class="option-list">
        ${(question.options || []).map((option, index) => `
          <button type="button" class="option-btn"
            data-live-answer="${index}"
            ${answered ? "disabled" : ""}>
            <strong>${String.fromCharCode(65 + index)}.</strong>
            ${escapeHtml(option)}
          </button>
        `).join("")}
      </div>

      <div id="liveAnswerFeedback"
        class="feedback ${answered ? "" : "hidden"}"
        role="status">
        ${answered
          ? "Answer submitted. Waiting for the host."
          : ""}
      </div>

      <div class="form-actions">
        <button type="button" class="secondary-btn" data-leave-live>
          Leave quiz
        </button>
      </div>
    `;
  }

  async function submitLiveAnswer(answerIndex) {
    const session = liveState.playerSession;

    if (
      !session ||
      liveState.answeredQuestion === session.current_question
    ) {
      return;
    }

    document.querySelectorAll("[data-live-answer]").forEach((button) => {
      button.disabled = true;
    });

    try {
      const result = await getClient().rpc(
        "quilet_submit_quiz_answer",
        {
          p_session_id: session.id,
          p_question_index: session.current_question,
          p_answer_index: answerIndex
        }
      );

      if (result.error) throw result.error;

      liveState.answeredQuestion = session.current_question;
      liveState.member = {
        ...liveState.member,
        score: result.data.score,
        correct_answers: result.data.correct_answers
      };

      const feedback = $("#liveAnswerFeedback");

      if (feedback) {
        feedback.classList.remove("hidden");
        feedback.textContent = result.data.correct
          ? "Correct! Waiting for the host."
          : "Answer submitted. Waiting for the host.";
      }
    } catch (error) {
      document.querySelectorAll("[data-live-answer]").forEach((button) => {
        button.disabled = false;
      });

      showMessage(describeError(error));
    }
  }

  function leaveLiveSession() {
    removeChannel(liveState.sessionChannel);
    liveState.sessionChannel = null;
    liveState.playerSession = null;
    liveState.member = null;
    liveState.answeredQuestion = null;

    const url = new URL(window.location.href);
    url.searchParams.delete("join");
    url.searchParams.delete("code");
    url.searchParams.delete("sessionCode");
    window.history.replaceState({}, "", url);

    document.querySelector('[data-view="library"]')?.click();
  }

  function addStyles() {
    if ($("#quiletLiveQuizStyles")) return;

    const style = document.createElement("style");
    style.id = "quiletLiveQuizStyles";
    style.textContent = `
      .quilet-live-share,
      .quilet-host-question,
      .quilet-live-ranking {
        margin-top: 18px;
        padding: 18px;
        border: 1px solid var(--border, #dbe3ef);
        border-radius: 18px;
        background: var(--panel-soft, #f8fafc);
      }

      .quilet-live-share {
        display: grid;
        gap: 10px;
        text-align: center;
      }

      .quilet-live-share a {
        overflow: hidden;
        color: var(--accent, #2563eb);
        font-weight: 700;
        text-overflow: ellipsis;
        white-space: nowrap;
      }

      .quilet-live-actions {
        display: flex;
        flex-wrap: wrap;
        justify-content: center;
        gap: 10px;
      }

      .quilet-waiting-pulse {
        margin: 18px 0;
        color: #16a34a;
        font-weight: 800;
        animation: quiletPulse 1.5s infinite;
      }

      @keyframes quiletPulse {
        50% { opacity: .45; }
      }
    `;

    document.head.appendChild(style);
  }

  function scheduleHostPublishing() {
    if (liveState.updateQueued) return;

    liveState.updateQueued = true;

    requestAnimationFrame(() => {
      liveState.updateQueued = false;

      if ($("#playContent .session-info")) {
        void publishHostLobby();
      }
    });
  }

  function bindEvents() {
    document.addEventListener("submit", (event) => {
      if (event.target?.id !== "joinForm") return;

      event.preventDefault();
      event.stopImmediatePropagation();

      void joinSession($("#joinCodeInput")?.value);
    }, true);

    document.addEventListener("click", (event) => {
      const copyCode = event.target.closest(
        "[data-copy-live-code], [data-copy-code]"
      );

      if (copyCode && liveState.hostSession) {
        event.preventDefault();
        event.stopImmediatePropagation();

        void copyText(liveState.hostSession.code).then(() => {
          showMessage(`Code copied: ${liveState.hostSession.code}`);
        });
        return;
      }

      const copyLink = event.target.closest("[data-copy-live-link]");

      if (copyLink) {
        event.preventDefault();

        void copyText(copyLink.dataset.copyLiveLink).then(() => {
          showMessage("Invitation link copied.");
        });
        return;
      }

      if (
        event.target.closest(
          "[data-start-live-game], [data-start-live], [data-gm-start-quiz]"
        ) &&
        liveState.hostSession
      ) {
        event.preventDefault();
        event.stopImmediatePropagation();
        void startLiveQuiz();
        return;
      }

      if (event.target.closest("[data-live-next]")) {
        event.preventDefault();
        void advanceLiveQuiz(false);
        return;
      }

      if (event.target.closest("[data-live-end]")) {
        event.preventDefault();

        if (window.confirm("End this live quiz for every player?")) {
          void advanceLiveQuiz(true);
        }
        return;
      }

      const answer = event.target.closest("[data-live-answer]");

      if (answer) {
        event.preventDefault();
        void submitLiveAnswer(Number(answer.dataset.liveAnswer));
        return;
      }

      if (event.target.closest("[data-leave-live]")) {
        event.preventDefault();
        leaveLiveSession();
      }
    }, true);
  }

  function applyLinkCode() {
    const code = getUrlCode();
    const input = $("#joinCodeInput");

    if (!code || !input) return;

    input.value = code;

    if (
      readJson("quiletUser", null) &&
      !liveState.playerSession &&
      !liveState.joining
    ) {
      document.querySelector('[data-view="library"]')?.click();

      setTimeout(() => {
        void joinSession(code);
      }, 300);
    }
  }

  function initialize() {
    if (liveState.initialized) return;
    liveState.initialized = true;

    addStyles();
    bindEvents();

    new MutationObserver(() => {
      scheduleHostPublishing();
      applyLinkCode();
    }).observe(document.body, {
      childList: true,
      subtree: true
    });

    scheduleHostPublishing();
    applyLinkCode();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initialize, {
      once: true
    });
  } else {
    initialize();
  }
})();
