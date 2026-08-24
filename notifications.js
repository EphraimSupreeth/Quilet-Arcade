(() => {
  const STORAGE_KEY = "quiletNotificationPreferences";
  const INBOX_STORAGE_KEY = "quiletNotificationInbox";
  const MAX_NOTIFICATIONS = 20;
  const ICON_URL =
    "https://uploads.onecompiler.io/44t258rvg/44x5y9pza/Page%20logo.png";

  let lastToastMessage = "";
  let lastToastTime = 0;

  function readJson(key, fallback) {
    try {
      const value = localStorage.getItem(key);
      return value === null ? fallback : JSON.parse(value);
    } catch {
      return fallback;
    }
  }

  function getCurrentUser() {
    return readJson("quiletUser", null);
  }

  function getUserKey() {
    const user = getCurrentUser();

    return String(user?.email || user?.id || "guest")
      .trim()
      .toLowerCase();
  }

  function getAllPreferences() {
    return readJson(STORAGE_KEY, {});
  }

  function getPreferences() {
    const saved = getAllPreferences()[getUserKey()] || {};

    return {
      quizStarts: Boolean(saved.quizStarts),
      quizAssigned: Boolean(saved.quizAssigned)
    };
  }

  function savePreferences() {
    const allPreferences = getAllPreferences();

    allPreferences[getUserKey()] = {
      quizStarts: Boolean(
        document.querySelector("#quizStartNotificationsInput")?.checked
      ),
      quizAssigned: Boolean(
        document.querySelector("#quizAssignedNotificationsInput")?.checked
      )
    };

    localStorage.setItem(STORAGE_KEY, JSON.stringify(allPreferences));
  }

  function getAllInboxes() {
    return readJson(INBOX_STORAGE_KEY, {});
  }

  function getInbox() {
    const inbox = getAllInboxes()[getUserKey()];
    return Array.isArray(inbox) ? inbox : [];
  }

  function saveInbox(inbox) {
    const allInboxes = getAllInboxes();
    allInboxes[getUserKey()] = inbox.slice(0, MAX_NOTIFICATIONS);

    localStorage.setItem(
      INBOX_STORAGE_KEY,
      JSON.stringify(allInboxes)
    );
  }

  function addInboxNotification(type, title, message) {
    const inbox = getInbox();

    inbox.unshift({
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      type,
      title,
      message,
      createdAt: new Date().toISOString(),
      read: false
    });

    saveInbox(inbox);
    renderNotificationPanel();
    updateBell();
  }

  function markAllAsRead() {
    const inbox = getInbox().map((item) => ({
      ...item,
      read: true
    }));

    saveInbox(inbox);
    renderNotificationPanel();
    updateBell();
  }

  function clearInbox() {
    saveInbox([]);
    renderNotificationPanel();
    updateBell();
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

  function escapeHtml(value = "") {
    return String(value).replace(/[&<>"']/g, (character) => ({
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#039;"
    }[character]));
  }

  function formatNotificationTime(value) {
    const date = new Date(value);

    if (Number.isNaN(date.getTime())) return "Recently";

    const elapsed = Date.now() - date.getTime();
    const minutes = Math.floor(elapsed / 60000);
    const hours = Math.floor(elapsed / 3600000);
    const days = Math.floor(elapsed / 86400000);

    if (minutes < 1) return "Just now";
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    if (days < 7) return `${days}d ago`;

    return date.toLocaleDateString(undefined, {
      month: "short",
      day: "numeric"
    });
  }

  function addNotificationStyles() {
    if (document.querySelector("#notificationPanelStyles")) return;

    const style = document.createElement("style");
    style.id = "notificationPanelStyles";
    style.textContent = `
      #notificationBtn {
        position: relative;
      }

      .notification-unread-dot {
        position: absolute;
        top: 3px;
        right: 3px;
        display: grid;
        min-width: 17px;
        height: 17px;
        place-items: center;
        padding: 0 4px;
        border: 2px solid var(--panel);
        border-radius: 999px;
        background: #dc2626;
        color: #fff;
        font-size: 10px;
        font-weight: 800;
        line-height: 1;
      }

      .notification-panel {
        position: fixed;
        z-index: 10000;
        top: 72px;
        right: 18px;
        width: min(380px, calc(100vw - 28px));
        max-height: min(520px, calc(100vh - 92px));
        overflow: hidden;
        border: 1px solid var(--border);
        border-radius: 18px;
        background: var(--panel);
        color: var(--text);
        box-shadow: 0 20px 55px rgba(15, 23, 42, .22);
      }

      .notification-panel.hidden {
        display: none;
      }

      .notification-panel-head {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 12px;
        padding: 16px 18px;
        border-bottom: 1px solid var(--border);
      }

      .notification-panel-head h3 {
        margin: 0;
      }

      .notification-panel-actions {
        display: flex;
        align-items: center;
        gap: 8px;
      }

      .notification-panel-list {
        max-height: 420px;
        overflow-y: auto;
      }

      .notification-panel-item {
        display: grid;
        grid-template-columns: 38px minmax(0, 1fr);
        gap: 11px;
        padding: 15px 18px;
        border-bottom: 1px solid var(--border);
      }

      .notification-panel-item.unread {
        background: var(--accent-soft);
      }

      .notification-panel-icon {
        display: grid;
        width: 38px;
        height: 38px;
        place-items: center;
        border-radius: 12px;
        background: var(--panel-soft);
        font-size: 1.15rem;
      }

      .notification-panel-content {
        min-width: 0;
      }

      .notification-panel-content strong {
        display: block;
        margin-bottom: 3px;
      }

      .notification-panel-content p {
        margin: 0 0 5px;
        color: var(--muted);
        font-size: .9rem;
        line-height: 1.4;
      }

      .notification-panel-content time {
        color: var(--muted);
        font-size: .78rem;
      }

      .notification-panel-empty {
        padding: 36px 20px;
        text-align: center;
        color: var(--muted);
      }

      @media (max-width: 600px) {
        .notification-panel {
          top: 66px;
          right: 14px;
          left: 14px;
          width: auto;
        }
      }
    `;

    document.head.appendChild(style);
  }

  function createNotificationPanel() {
    if (document.querySelector("#notificationPanel")) return;

    const panel = document.createElement("aside");
    panel.id = "notificationPanel";
    panel.className = "notification-panel hidden";
    panel.setAttribute("aria-label", "Latest notifications");

    panel.innerHTML = `
      <div class="notification-panel-head">
        <h3>Notifications</h3>

        <div class="notification-panel-actions">
          <button
            type="button"
            class="tiny-btn"
            data-clear-notifications
          >
            Clear
          </button>

          <button
            type="button"
            class="text-btn"
            data-close-notifications
            aria-label="Close notifications"
          >
            ✕
          </button>
        </div>
      </div>

      <div
        id="notificationPanelList"
        class="notification-panel-list"
        aria-live="polite"
      ></div>
    `;

    document.body.appendChild(panel);
    renderNotificationPanel();
  }

  function renderNotificationPanel() {
    const list = document.querySelector("#notificationPanelList");
    if (!list) return;

    const inbox = getInbox();

    if (!inbox.length) {
      list.innerHTML = `
        <div class="notification-panel-empty">
          <div style="font-size:2rem;margin-bottom:8px">🔔</div>
          <strong>No notifications yet</strong>
          <p style="margin:6px 0 0">
            Quiz starts and assignments will appear here.
          </p>
        </div>
      `;
      return;
    }

    list.innerHTML = inbox.map((item) => {
      const icon = item.type === "quiz-assigned" ? "📚" : "⚡";

      return `
        <article class="notification-panel-item ${item.read ? "" : "unread"}">
          <span class="notification-panel-icon" aria-hidden="true">
            ${icon}
          </span>

          <div class="notification-panel-content">
            <strong>${escapeHtml(item.title)}</strong>
            <p>${escapeHtml(item.message)}</p>
            <time datetime="${escapeHtml(item.createdAt)}">
              ${escapeHtml(formatNotificationTime(item.createdAt))}
            </time>
          </div>
        </article>
      `;
    }).join("");
  }

  function updateBell() {
    const button = document.querySelector("#notificationBtn");
    if (!button) return;

    const unread = getInbox().filter((item) => !item.read).length;
    let indicator = button.querySelector(".notification-unread-dot");

    button.setAttribute(
      "aria-label",
      unread
        ? `Notifications, ${unread} unread`
        : "Notifications"
    );
    button.setAttribute("aria-expanded", String(
      !document.querySelector("#notificationPanel")?.classList.contains("hidden")
    ));

    if (!unread) {
      indicator?.remove();
      return;
    }

    if (!indicator) {
      indicator = document.createElement("span");
      indicator.className = "notification-unread-dot";
      indicator.setAttribute("aria-hidden", "true");
      button.appendChild(indicator);
    }

    indicator.textContent = unread > 9 ? "9+" : String(unread);
  }

  function openNotificationPanel() {
    const panel = document.querySelector("#notificationPanel");
    if (!panel) return;

    panel.classList.remove("hidden");
    markAllAsRead();
    updateBell();
  }

  function closeNotificationPanel() {
    const panel = document.querySelector("#notificationPanel");
    if (!panel) return;

    panel.classList.add("hidden");
    updateBell();
  }

  function toggleNotificationPanel() {
    const panel = document.querySelector("#notificationPanel");
    if (!panel) return;

    if (panel.classList.contains("hidden")) {
      openNotificationPanel();
    } else {
      closeNotificationPanel();
    }
  }

  function updatePermissionStatus() {
    const status = document.querySelector("#notificationPermissionStatus");
    const button = document.querySelector("#enableNotificationsBtn");

    if (!status || !button) return;

    if (!("Notification" in window)) {
      status.textContent =
        "Browser notifications are not supported on this device.";
      button.disabled = true;
      return;
    }

    if (Notification.permission === "granted") {
      status.textContent = "Browser notifications are enabled.";
      button.textContent = "Notifications enabled";
      button.disabled = true;
      return;
    }

    if (Notification.permission === "denied") {
      status.textContent =
        "Notifications are blocked. Allow them in your browser site settings.";
      button.textContent = "Notifications blocked";
      button.disabled = true;
      return;
    }

    status.textContent =
      "Allow browser permission to receive selected notifications.";
    button.textContent = "Enable browser notifications";
    button.disabled = false;
  }

  function loadPreferences() {
    const preferences = getPreferences();
    const quizStarts =
      document.querySelector("#quizStartNotificationsInput");
    const quizAssigned =
      document.querySelector("#quizAssignedNotificationsInput");

    if (quizStarts) quizStarts.checked = preferences.quizStarts;
    if (quizAssigned) quizAssigned.checked = preferences.quizAssigned;

    updatePermissionStatus();
    renderNotificationPanel();
    updateBell();
  }

  async function requestPermission() {
    if (!("Notification" in window)) {
      showMessage("Browser notifications are not supported.");
      return;
    }

    try {
      const permission = await Notification.requestPermission();
      updatePermissionStatus();

      if (permission === "granted") {
        showMessage("Browser notifications enabled.");

        sendBrowserNotification(
          "Notifications enabled",
          "Quilet can now notify you about quiz activity.",
          "permission-test"
        );
      } else {
        showMessage(
          "Notifications were not enabled. Check your browser settings."
        );
      }
    } catch {
      showMessage("Notification permission could not be requested.");
    }
  }

  function sendBrowserNotification(title, body, tag) {
    if (
      !("Notification" in window) ||
      Notification.permission !== "granted"
    ) {
      return false;
    }

    try {
      const notification = new Notification(title, {
        body,
        icon: ICON_URL,
        badge: ICON_URL,
        tag,
        renotify: true
      });

      notification.onclick = () => {
        window.focus();
        notification.close();
      };

      return true;
    } catch {
      return false;
    }
  }

  function notifyQuizStarted(details = {}) {
    const preferences = getPreferences();
    if (!preferences.quizStarts) return;

    const title = String(details.title || "Your live quiz").trim();
    const host = String(details.host || "").trim();
    const message = host
      ? `${title} has started. Hosted by ${host}.`
      : `${title} has started. Join now!`;
