(() => {
  if (window.__quiletChatLoaded) return;
  window.__quiletChatLoaded = true;

  const state = {
    channel: null,
    connected: false,
    currentUserId: ""
  };

  function readUser() {
    try {
      return JSON.parse(localStorage.getItem("quiletUser") || "null");
    } catch {
      return null;
    }
  }

  function client() {
    return window.__QUILET_SUPABASE_CLIENT__ ||
      window.__SUPABASE_CLIENT__ ||
      null;
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
    clearTimeout(showMessage.timer);
    showMessage.timer = setTimeout(() => toast.classList.add("hidden"), 3500);
  }

  function renderEmpty(message) {
    const messages = document.querySelector("[data-chat-messages]");
    if (!messages) return;

    messages.innerHTML = `<div class="chat-empty">${escapeHtml(message)}</div>`;
  }

  function addMessage(message) {
    const messages = document.querySelector("[data-chat-messages]");
    if (!messages) return;

    messages.querySelector(".chat-empty")?.remove();

    const ownMessage = message.userId === state.currentUserId;
    const item = document.createElement("article");
    item.className = `chat-message${ownMessage ? " own" : ""}`;
    item.innerHTML = `
      <div class="chat-message-avatar" aria-hidden="true">${escapeHtml(message.avatar || "🧑‍🎓")}</div>
      <div class="chat-message-body">
        <strong>${escapeHtml(message.name || "Learner")}</strong>
        <p>${escapeHtml(message.text)}</p>
      </div>
    `;
    messages.appendChild(item);
    messages.scrollTop = messages.scrollHeight;
  }

  async function connect() {
    const user = readUser();
    const supabase = client();

    if (!user || !supabase) return false;
    if (state.connected && state.currentUserId === String(user.id)) return true;

    if (state.channel) {
      await supabase.removeChannel(state.channel);
      state.channel = null;
    }

    const sessionResult = await supabase.auth.getSession();
    if (sessionResult.error) throw sessionResult.error;

    let authUser = sessionResult.data.session?.user;
    if (!authUser) {
      const anonymousResult = await supabase.auth.signInAnonymously();
      if (anonymousResult.error) throw anonymousResult.error;
      authUser = anonymousResult.data.user;
    }

    state.currentUserId = String(user.id);
    state.channel = supabase
      .channel("quilet-community-chat", {
        config: {
          broadcast: { self: false },
          presence: { key: state.currentUserId }
        }
      })
      .on("broadcast", { event: "message" }, ({ payload }) => {
        if (payload?.text) addMessage(payload);
      })
      .on("presence", { event: "sync" }, updateOnlineCount)
      .on("presence", { event: "join" }, updateOnlineCount)
      .on("presence", { event: "leave" }, updateOnlineCount);

    await new Promise((resolve, reject) => {
      const timeout = setTimeout(
        () => reject(new Error("Chat connection timed out.")),
        10000
      );

      state.channel.subscribe(async (status) => {
        if (status !== "SUBSCRIBED") return;
        clearTimeout(timeout);
        await state.channel.track({
          id: state.currentUserId,
          name: user.name || "Learner"
        });
        resolve();
      });
    });

    state.connected = true;
    updateOnlineCount();
    return true;
  }

  function updateOnlineCount() {
    const count = document.querySelector("[data-chat-online]");
    const online = state.channel?.presenceState() || {};
    const total = Object.keys(online).length;
    if (count) count.textContent = `${total || 1} online`;
  }

  function renderChat() {
    const view = document.querySelector("#chatView");
    if (!view || view.dataset.chatRendered === "true") return;

    view.dataset.chatRendered = "true";
    view.innerHTML = `
      <div class="chat-panel">
        <div class="chat-header">
          <div>
            <p class="eyebrow">Community space</p>
            <h2>Chat with your arcade community</h2>
            <p class="muted-text">Share ideas, encourage teammates, and talk about quizzes.</p>
          </div>
          <span class="chat-online" data-chat-online>Connecting...</span>
        </div>
        <div class="chat-messages" data-chat-messages></div>
        <form class="chat-form" data-chat-form>
          <label class="sr-only" for="chatInput">Message</label>
          <input id="chatInput" name="message" maxlength="240" placeholder="Write a message..." autocomplete="off" required />
          <button type="submit" class="primary-btn">Send</button>
        </form>
      </div>
    `;
    renderEmpty("No messages yet. Start the conversation.");
  }

  async function sendMessage(event) {
    event.preventDefault();
    const input = event.currentTarget.elements.message;
    const text = String(input.value || "").replace(/\s+/g, " ").trim();
    const user = readUser();

    if (!text || !user) return;

    try {
      if (!await connect()) {
        showMessage("Sign in to join the community chat.");
        return;
      }

      await state.channel.send({
        type: "broadcast",
        event: "message",
        payload: {
          userId: state.currentUserId,
          name: user.name || "Learner",
          text,
          avatar: "🧑‍🎓"
        }
      });
      addMessage({ userId: state.currentUserId, name: user.name, text });
      input.value = "";
    } catch (error) {
      console.error("Community chat failed:", error);
      showMessage("Chat is unavailable right now. Please try again.");
    }
  }

  function initialize() {
    renderChat();
    document.addEventListener("submit", (event) => {
      if (event.target.matches("[data-chat-form]")) void sendMessage(event);
    });

    document.addEventListener("click", (event) => {
      if (!event.target.closest('[data-view="chat"]')) return;
      renderChat();
      connect().catch((error) => {
        console.error("Community chat connection failed:", error);
        renderEmpty("Chat could not connect. Check your Supabase anonymous sign-in setting.");
      });
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initialize, { once: true });
  } else {
    initialize();
  }
})();
