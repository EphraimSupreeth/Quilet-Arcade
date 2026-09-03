(() => {
  if (window.__quiletChatLoaded) return;
  window.__quiletChatLoaded = true;

  const state = {
    channel: null,
    connected: false,
    currentUserId: "",
    roomCode: "",
    selectedFriendId: "",
    friends: []
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

  function currentAvatar(user) {
    try {
      const avatars = JSON.parse(
        localStorage.getItem("quiletProfileAvatars") || "{}"
      );
      const saved = avatars[String(user?.email || user?.id || "").toLowerCase()];
      return saved?.type === "emoji" && saved.value
        ? saved.value
        : "🧑‍🎓";
    } catch {
      return "🧑‍🎓";
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
    clearTimeout(showMessage.timer);
    showMessage.timer = setTimeout(() => toast.classList.add("hidden"), 3500);
  }

  function cleanCode(value) {
    return String(value || "")
      .toUpperCase()
      .replace(/[^A-Z0-9]/g, "")
      .slice(0, 6);
  }

  function randomCode() {
    const characters = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
    return Array.from({ length: 6 }, () =>
      characters[Math.floor(Math.random() * characters.length)]
    ).join("");
  }

  function roomLink(code) {
    const url = new URL(window.location.href);
    url.search = "";
    url.hash = "";
    url.searchParams.set("chat", code);
    return url.toString();
  }

  function renderEmpty(message) {
    const messages = document.querySelector("[data-chat-messages]");
    if (!messages) return;

    messages.innerHTML = `<div class="chat-empty">${escapeHtml(message)}</div>`;
  }

  function addMessage(message) {
    const messages = document.querySelector("[data-chat-messages]");
    if (!messages) return;

    if (
      message.recipientId &&
      message.recipientId !== state.currentUserId &&
      message.userId !== state.currentUserId
    ) return;

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

  async function connect(requestedRoom = state.roomCode || "") {
    const user = readUser();
    const supabase = client();

    if (!user || !supabase) return false;
    const roomCode = cleanCode(requestedRoom) || cleanCode(
      new URLSearchParams(window.location.search).get("chat")
    ) || localStorage.getItem("quiletChatRoom") || randomCode();

    if (
      state.connected &&
      state.currentUserId === String(user.id) &&
      state.roomCode === roomCode
    ) return true;

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
    state.roomCode = roomCode;
    localStorage.setItem("quiletChatRoom", roomCode);
    state.channel = supabase
      .channel(`quilet-community-chat:${roomCode}`, {
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
          name: user.name || "Learner",
          description: user.description || "",
          avatar: currentAvatar(user)
        });
        resolve();
      });
    });

    state.connected = true;
    const roomLabel = document.querySelector("[data-chat-room]");
    if (roomLabel) roomLabel.textContent = `Room ${state.roomCode}`;
    updateOnlineCount();
    return true;
  }

  function updateOnlineCount() {
    const count = document.querySelector("[data-chat-online]");
    const online = state.channel?.presenceState() || {};
    const total = Object.keys(online).length;
    if (count) count.textContent = `${total || 1} online`;
    state.friends = Object.values(online)
      .flat()
      .filter((friend) => String(friend.id) !== state.currentUserId);
    renderFriends();
  }

  function renderFriends() {
    const list = document.querySelector("[data-chat-friends]");
    if (!list) return;

    if (!state.friends.length) {
      list.innerHTML = '<div class="chat-empty-small">No friends online yet.</div>';
      return;
    }

    list.innerHTML = state.friends.map((friend) => `
      <button type="button" class="chat-friend${String(friend.id) === state.selectedFriendId ? " selected" : ""}" data-chat-friend="${escapeHtml(friend.id)}">
        <span class="chat-message-avatar" aria-hidden="true">${escapeHtml(friend.avatar || "🧑‍🎓")}</span>
        <span><strong>${escapeHtml(friend.name || "Learner")}</strong><small>${escapeHtml(friend.description || "Available to chat")}</small></span>
      </button>
    `).join("");
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
        <div class="chat-room-tools">
          <strong data-chat-room>Room ${escapeHtml(state.roomCode || "------")}</strong>
          <button type="button" class="secondary-btn" data-chat-copy-code>Copy code</button>
          <button type="button" class="secondary-btn" data-chat-copy-link>Copy join link</button>
        </div>
        <div class="chat-layout">
          <aside class="chat-friends">
            <h3>Friends online</h3>
            <div data-chat-friends></div>
            <form class="chat-join-form" data-chat-join-form>
              <label for="chatRoomCode">Join another room</label>
              <div><input id="chatRoomCode" name="roomCode" maxlength="6" placeholder="ABC123" required /><button type="submit" class="primary-btn">Join</button></div>
            </form>
          </aside>
          <div class="chat-conversation">
            <p class="chat-selected" data-chat-selected>Select a friend to start a private conversation.</p>
            <div class="chat-messages" data-chat-messages></div>
          </div>
        </div>
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
          avatar: currentAvatar(user),
          recipientId: state.selectedFriendId || ""
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
      if (event.target.matches("[data-chat-join-form]")) {
        event.preventDefault();
        const code = cleanCode(event.target.elements.roomCode.value);
        if (code.length !== 6) return;
        state.connected = false;
        state.selectedFriendId = "";
        connect(code).catch(() => showMessage("That chat room could not be opened."));
      }
    });

    document.addEventListener("click", (event) => {
      if (!event.target.closest('[data-view="chat"]')) return;
      renderChat();
      connect().catch((error) => {
        console.error("Community chat connection failed:", error);
        renderEmpty("Chat could not connect. Check your Supabase anonymous sign-in setting.");
      });
    });

    document.addEventListener("click", (event) => {
      const friend = event.target.closest("[data-chat-friend]");
      if (friend) {
        state.selectedFriendId = friend.dataset.chatFriend;
        const profile = state.friends.find((item) => String(item.id) === state.selectedFriendId);
        const selected = document.querySelector("[data-chat-selected]");
        if (selected) selected.textContent = `Chatting with ${profile?.name || "friend"}`;
        renderFriends();
      }

      if (event.target.closest("[data-chat-copy-code]")) {
        void navigator.clipboard.writeText(state.roomCode).then(() => showMessage("Room code copied."));
      }

      if (event.target.closest("[data-chat-copy-link]")) {
        void navigator.clipboard.writeText(roomLink(state.roomCode)).then(() => showMessage("Join link copied."));
      }
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initialize, { once: true });
  } else {
    initialize();
  }
})();
