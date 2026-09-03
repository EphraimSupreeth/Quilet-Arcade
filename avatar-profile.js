(() => {
  const AVATAR_KEY = "quiletProfileAvatars";
  const DEFAULT_AVATAR = "🧑‍🎓";
  const MOBILE_BREAKPOINT = 900;
  const PRESET_AVATARS = [
    "🧑‍🎓", "👩‍🎓", "👨‍🎓", "🧑‍🏫",
    "🦊", "🐼", "🐯", "🐸",
    "🦄", "🤖", "👾", "🚀"
  ];

  let selectedAvatar = {
    type: "emoji",
    value: DEFAULT_AVATAR
  };

  let syncFrame = 0;

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

  function getUserKey(user = getCurrentUser()) {
    return String(user?.email || user?.id || "")
      .trim()
      .toLowerCase();
  }

  function getAvatarMap() {
    const avatars = readJson(AVATAR_KEY, {});

    return avatars && typeof avatars === "object"
      ? avatars
      : {};
  }

  function getSavedAvatar() {
    const avatar = getAvatarMap()[getUserKey()];

    if (
      avatar &&
      ["emoji", "image"].includes(avatar.type) &&
      typeof avatar.value === "string" &&
      avatar.value
    ) {
      return avatar;
    }

    return {
      type: "emoji",
      value: DEFAULT_AVATAR
    };
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

  function showMessage(message, duration = 3500) {
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

  function addStyles() {
    if (document.querySelector("#avatarProfileStyles")) return;

    const style = document.createElement("style");
    style.id = "avatarProfileStyles";
    style.textContent = `
      #settingsForm .settings-section:has(#profileNameInput) {
        display: none !important;
      }

      #mainTopbar .topbar-actions {
        min-width: 0;
      }

      #mainTopbar .sidebar-profile-card {
        order: -10;
        display: flex !important;
        width: 100%;
        min-width: 0;
        max-width: 100%;
        min-height: 72px;
        flex: 0 0 auto;
        align-items: center;
        gap: 12px;
        margin: 0 0 6px !important;
        padding: 11px 12px;
        overflow: hidden;
        border: 1px solid var(--border);
        border-radius: 16px;
        background:
          linear-gradient(
            135deg,
            var(--panel),
            color-mix(in srgb, var(--accent) 7%, var(--panel))
          );
        color: var(--text);
        box-shadow: var(--shadow-sm);
        cursor: pointer;
        text-align: left;
        transition:
          transform 180ms ease,
          border-color 180ms ease,
          box-shadow 180ms ease;
      }

      #mainTopbar .sidebar-profile-card:hover,
      #mainTopbar .sidebar-profile-card:focus-visible {
        border-color:
          color-mix(in srgb, var(--accent) 38%, var(--border));
        box-shadow: var(--shadow);
        transform: translateY(-2px);
      }

      .profile-avatar-badge-avatar {
        display: grid;
        width: 28px;
        height: 28px;
        flex: 0 0 auto;
        place-items: center;
        overflow: hidden;
        border-radius: 50%;
        background: var(--accent-soft);
        font-size: 1.1rem;
      }

      #mainTopbar .sidebar-profile-card
      .profile-avatar-badge-avatar {
        width: 44px;
        height: 44px;
        flex: 0 0 44px;
        border: 2px solid var(--panel);
        box-shadow: 0 5px 12px rgba(15, 23, 42, 0.12);
        font-size: 1.5rem;
      }

      .profile-avatar-badge-avatar img,
      .profile-editor-preview img {
        width: 100%;
        height: 100%;
        object-fit: cover;
      }

      .sidebar-profile-details {
        display: block;
        min-width: 0;
        max-width: 100%;
        overflow: hidden;
      }

      .sidebar-profile-name,
      .sidebar-profile-label {
        display: block;
        max-width: 100%;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }

      .sidebar-profile-name {
        color: var(--text);
        font-size: 1rem;
        font-weight: 900;
        line-height: 1.2;
      }

      .sidebar-profile-label {
        margin-top: 3px;
        color: var(--muted);
        font-size: 0.75rem;
        font-weight: 700;
      }

      .sidebar-profile-description {
        display: block;
        max-width: 100%;
        overflow: hidden;
        color: var(--muted);
        font-size: 0.68rem;
        text-overflow: ellipsis;
        white-space: nowrap;
      }

      .sidebar-profile-edit-icon {
        display: grid;
        width: 28px;
        height: 28px;
        flex: 0 0 28px;
        margin-left: auto;
        place-items: center;
        border-radius: 9px;
        background: var(--accent-soft);
        color: var(--accent);
        font-size: 0.85rem;
      }

      #mainTopbar .nav-group {
        order: 0;
      }

      #mainTopbar .user-actions {
        order: 1;
      }

      #mainTopbar .user-actions > #userBadge,
      #mainTopbar .user-actions > #notificationBtn,
      #mainTopbar .user-actions > #installAppBtn,
      #mainTopbar .user-actions > #appInstalledStatus {
        display: none !important;
      }

      #workspaceHeader {
        display: grid !important;
        grid-template-columns: minmax(180px, 1fr) auto;
        align-items: center !important;
        gap: clamp(14px, 2vw, 24px) !important;
        width: 100%;
        min-width: 0;
        max-width: 100%;
        min-height: 96px;
        padding: 15px 18px !important;
      }

      #workspaceHeader > div:first-child,
      #workspaceHeader .workspace-header-actions {
        min-width: 0;
        max-width: 100%;
      }

      #workspaceEyebrow,
      #workspaceTitle,
      #workspaceDescription {
        max-width: 100%;
        overflow-wrap: break-word;
      }

      #workspaceEyebrow {
        margin: 0 0 3px;
        line-height: 1.35;
      }

      #workspaceTitle {
        margin: 0;
        font-size: clamp(1.65rem, 3vw, 2.35rem);
        line-height: 1.08;
      }

      #workspaceDescription {
        margin: 5px 0 0;
      }

      #workspaceHeader .workspace-header-actions {
        display: flex !important;
        align-items: center;
        justify-content: flex-end;
        gap: 9px;
      }

      #workspaceHeader .workspace-search {
        width: min(290px, 28vw);
        min-width: 190px;
        max-width: 100%;
        overflow: hidden;
      }

      #workspaceHeader .workspace-search > span:nth-child(2) {
        min-width: 0;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }

      #workspaceHeader .workspace-tool-btn {
        position: relative;
        display: grid;
        width: 46px;
        min-width: 46px;
        max-width: 46px;
        height: 46px;
        min-height: 46px;
        padding: 0;
        flex: 0 0 46px;
        place-items: center;
        overflow: visible;
        border: 1px solid var(--border);
        border-radius: 13px;
        background: var(--panel);
        color: var(--text);
        box-shadow: var(--shadow-sm);
        font-size: 1.2rem;
        line-height: 1;
      }

      #workspaceHeader .workspace-tool-btn:hover:not(:disabled) {
        transform: translateY(-2px);
        border-color:
          color-mix(in srgb, var(--accent) 40%, var(--border));
        color: var(--accent);
        box-shadow: var(--shadow);
      }

      #workspaceInstallBtn.installed {
        color: var(--success);
      }

      #workspaceNotificationBtn .notification-unread-dot {
        position: absolute;
        top: -5px;
        right: -5px;
        display: grid;
        min-width: 18px;
        height: 18px;
        place-items: center;
        padding: 0 4px;
        border: 2px solid var(--panel);
        border-radius: 999px;
        background: #dc2626;
        color: #fff;
        font-size: 10px;
        font-weight: 900;
        line-height: 1;
        pointer-events: none;
      }

      .profile-editor-modal {
        position: fixed;
        inset: 0;
        z-index: 12000;
        display: grid;
        padding: 16px;
        place-items: center;
      }

      .profile-editor-backdrop {
        position: absolute;
        inset: 0;
        border: 0;
        border-radius: 0;
        background: rgba(15, 23, 42, 0.68);
        backdrop-filter: blur(8px);
      }

      .profile-editor-panel {
        position: relative;
        z-index: 1;
        width: min(100%, 504px);
        max-height: calc(100dvh - 32px);
        padding: clamp(20px, 4vw, 30px);
        overflow: auto;
        border: 1px solid var(--border);
        border-radius: 24px;
        background: var(--panel);
        color: var(--text);
        box-shadow: var(--shadow-lg);
      }

      .profile-editor-head {
        display: flex;
        align-items: flex-start;
        justify-content: space-between;
        gap: 15px;
        margin-bottom: 22px;
      }

      .profile-editor-head h2 {
        margin: 0;
      }

      .profile-editor-head p {
        margin: 4px 0 0;
        color: var(--muted);
      }

      .profile-editor-close {
        display: grid;
        width: 42px;
        min-width: 42px;
        height: 42px;
        min-height: 42px;
        padding: 0;
        place-items: center;
        border: 1px solid var(--border);
        border-radius: 12px;
        background: var(--panel-soft);
        color: var(--text);
      }

      .profile-editor-layout {
        display: grid;
        grid-template-columns: 88px minmax(0, 1fr);
        gap: 20px;
        align-items: start;
      }

      .profile-editor-preview {
        display: grid;
        width: 80px;
        height: 80px;
        place-items: center;
        overflow: hidden;
        border: 4px solid var(--panel);
        border-radius: 50%;
        background: var(--accent-soft);
        box-shadow: var(--shadow);
        font-size: 2.5rem;
      }

      .profile-editor-content {
        min-width: 0;
      }

      .profile-editor-content label {
        margin-bottom: 15px;
      }

      .profile-avatar-options {
        display: grid;
        grid-template-columns: repeat(6, 44px);
        gap: 8px;
        margin: 8px 0 14px;
      }

      .profile-avatar-option {
        display: grid;
        width: 44px;
        min-width: 44px;
        height: 44px;
        min-height: 44px;
        padding: 0;
        place-items: center;
        border: 2px solid transparent;
        border-radius: 13px;
        background: var(--panel-soft);
        color: var(--text);
        font-size: 1.4rem;
      }

      .profile-avatar-option:hover,
      .profile-avatar-option.selected {
        border-color: var(--accent);
        background: var(--accent-soft);
      }

      .profile-upload-row,
      .profile-editor-actions {
        display: flex;
        flex-wrap: wrap;
        gap: 9px;
      }

      .profile-upload-label {
        display: inline-flex;
        min-height: 42px;
        align-items: center;
        justify-content: center;
        padding: 9px 14px;
        border: 1px solid var(--border);
        border-radius: 12px;
        background: var(--panel);
        color: var(--text);
        box-shadow: var(--shadow-sm);
        cursor: pointer;
        font-weight: 800;
      }

      .profile-upload-input {
        position: absolute;
        width: 1px;
        height: 1px;
        overflow: hidden;
        clip: rect(0, 0, 0, 0);
      }

      .profile-editor-actions {
        justify-content: flex-end;
        margin-top: 24px;
        padding-top: 18px;
        border-top: 1px solid var(--border);
      }

      @media (max-width: 900px) {
        #mainTopbar #topbarActions {
          display: none !important;
        }

        #mainTopbar.menu-open #topbarActions,
        #mainTopbar #topbarActions.mobile-menu-open {
          display: flex !important;
          visibility: visible !important;
          opacity: 1 !important;
          pointer-events: auto !important;
        }

        #mainTopbar .topbar-actions {
          flex-direction: column !important;
          justify-content: flex-start !important;
          gap: 10px !important;
        }

        #mainTopbar .sidebar-profile-card {
          order: -10;
          width: 100%;
          margin: 0 0 4px !important;
        }

        #mainTopbar .nav-group {
          order: 0;
          width: 100%;
          margin: 0 !important;
        }

        #mainTopbar .topbar-actions .user-actions {
          order: 1;
          width: 100%;
          margin: 0 !important;
        }

        #workspaceHeader {
          grid-template-columns: minmax(145px, 1fr) auto;
          min-height: 82px;
          padding: 11px 13px !important;
        }

        #workspaceDescription {
          display: none;
        }

        #workspaceHeader .workspace-search,
        #workspaceHeader .workspace-create-btn {
          width: 44px;
          min-width: 44px;
          max-width: 44px;
          min-height: 44px;
          padding: 0;
          justify-content: center;
        }

        #workspaceHeader .workspace-search > span:nth-child(2),
        #workspaceHeader .workspace-search kbd {
          display: none;
        }

        #workspaceHeader .workspace-create-btn {
          font-size: 0;
        }

        #workspaceHeader .workspace-create-btn span {
          font-size: 1.2rem;
        }
      }

      @media (max-width: 620px) {
        #workspaceHeader {
          grid-template-columns: minmax(0, 1fr);
          gap: 10px !important;
        }

        #workspaceHeader .workspace-header-actions {
          display: grid !important;
          grid-template-columns: minmax(0, 1fr) 42px 42px 42px;
          width: 100%;
          gap: 7px;
        }

        #workspaceHeader .workspace-search {
          grid-column: 1;
          width: 100%;
          min-width: 0;
          max-width: none;
        }

        #workspaceHeader .workspace-search > span:nth-child(2) {
          display: block;
          font-size: 0.88rem;
        }

        #workspaceInstallBtn {
          grid-column: 2;
        }

        #workspaceNotificationBtn {
          grid-column: 3;
        }

        #workspaceHeader .workspace-create-btn {
          grid-column: 4;
        }

        .profile-editor-layout {
          grid-template-columns: 1fr;
        }

        .profile-editor-preview {
          margin: 0 auto;
        }

        .profile-avatar-options {
          grid-template-columns: repeat(6, minmax(40px, 1fr));
        }

        .profile-avatar-option {
          width: 100%;
          min-width: 0;
        }
      }

      @media (max-width: 430px) {
        .profile-editor-modal {
          padding: 8px;
        }

        .profile-editor-panel {
          max-height: calc(100dvh - 16px);
          padding: 18px 15px;
          border-radius: 20px;
        }

        .profile-avatar-options {
          grid-template-columns: repeat(4, minmax(42px, 1fr));
        }

        .profile-upload-row,
        .profile-editor-actions {
          flex-direction: column;
        }

        .profile-upload-row > *,
        .profile-editor-actions > * {
          width: 100%;
        }
      }
    `;

    document.head.appendChild(style);
  }

  function avatarContent(avatar) {
    if (avatar?.type === "image") {
      return `<img src="${escapeHtml(avatar.value)}" alt="" />`;
    }

    return escapeHtml(avatar?.value || DEFAULT_AVATAR);
  }

  function createSidebarProfile() {
    const navigation = document.querySelector(
      "#mainTopbar .nav-group"
    );

    if (!navigation) return null;

    let profile = document.querySelector("#sidebarProfileCard");

    if (!profile) {
      profile = document.createElement("button");
      profile.id = "sidebarProfileCard";
      profile.type = "button";
      profile.className = "sidebar-profile-card";
      profile.setAttribute("aria-label", "Edit profile");
      profile.setAttribute("aria-haspopup", "dialog");
    }

    /*
     * Keep the profile immediately before navigation so it appears
     * below the Quilet Arcade brand and above Home.
     */
    if (
      profile.parentElement !== navigation.parentElement ||
      profile.nextElementSibling !== navigation
    ) {
      navigation.insertAdjacentElement("beforebegin", profile);
    }

    return profile;
  }

  function renderUserProfile() {
    const user = getCurrentUser();
    const badge = document.querySelector("#userBadge");

    if (!user) {
      badge?.replaceChildren();
      document.querySelector("#sidebarProfileCard")?.remove();
      closeProfileEditor();
      return;
    }

    const avatar = getSavedAvatar();
    const name = String(user.name || "Learner").trim() || "Learner";
    const profile = createSidebarProfile();

    if (badge) {
      badge.innerHTML = `
        <span class="profile-avatar-badge-avatar" aria-hidden="true">
          ${avatarContent(avatar)}
        </span>
        <span class="profile-avatar-badge-name">
          ${escapeHtml(name)}
        </span>
      `;

      badge.title = user.email || name;
    }

    if (profile) {
      profile.innerHTML = `
        <span class="profile-avatar-badge-avatar" aria-hidden="true">
          ${avatarContent(avatar)}
        </span>

        <span class="sidebar-profile-details">
          <strong class="sidebar-profile-name">
            ${escapeHtml(name)}
          </strong>
          <small class="sidebar-profile-label">
            Signed-in profile
          </small>
          ${user.description ? `
            <small class="sidebar-profile-description">
              ${escapeHtml(user.description)}
            </small>
          ` : ""}
        </span>

        <span class="sidebar-profile-edit-icon" aria-hidden="true">
          ✎
        </span>
      `;

      profile.title = "Change profile picture or display name";
    }

    const heroName = document.querySelector("#heroName");
    if (heroName) heroName.textContent = name;

    const hiddenNameInput = document.querySelector(
      "#profileNameInput"
    );

    if (hiddenNameInput) hiddenNameInput.value = name;
  }

  function createProfileEditor() {
    let modal = document.querySelector("#profileEditorModal");
    if (modal) return modal;

    modal = document.createElement("div");
    modal.id = "profileEditorModal";
    modal.className = "profile-editor-modal hidden";
    modal.setAttribute("role", "dialog");
    modal.setAttribute("aria-modal", "true");
    modal.setAttribute("aria-labelledby", "profileEditorTitle");

    modal.innerHTML = `
      <button
        type="button"
        class="profile-editor-backdrop"
        data-close-profile-editor
        aria-label="Close profile editor"
      ></button>

      <form id="profileEditorForm" class="profile-editor-panel">
        <div class="profile-editor-head">
          <div>
            <p class="eyebrow">Personal profile</p>
            <h2 id="profileEditorTitle">Edit your profile</h2>
            <p>Change the name and picture shown in your workspace.</p>
          </div>

          <button
            type="button"
            class="profile-editor-close"
            data-close-profile-editor
            aria-label="Close profile editor"
          >
            ✕
          </button>
        </div>

        <div class="profile-editor-layout">
          <div
            id="profileEditorPreview"
            class="profile-editor-preview"
            aria-label="Selected profile picture"
          ></div>

          <div class="profile-editor-content">
            <label for="profileEditorName">
              Display name
              <input
                id="profileEditorName"
                type="text"
                maxlength="60"
                autocomplete="name"
                placeholder="Enter your display name"
                required
              />
            </label>

            <label for="profileEditorDescription">
              Description
              <textarea
                id="profileEditorDescription"
                maxlength="160"
                rows="3"
                placeholder="Tell people a little about yourself"
              ></textarea>
            </label>

            <strong>Choose a profile picture</strong>

            <div class="profile-avatar-options" aria-label="Avatar choices">
              ${PRESET_AVATARS.map((avatar) => `
                <button
                  type="button"
                  class="profile-avatar-option"
                  data-profile-avatar="${avatar}"
                  aria-label="Use ${avatar} as profile picture"
                  aria-pressed="false"
                >
                  ${avatar}
                </button>
              `).join("")}
            </div>

            <div class="profile-upload-row">
              <label
                class="profile-upload-label"
                for="profileEditorUpload"
              >
                Upload image
              </label>

              <input
                id="profileEditorUpload"
                class="profile-upload-input"
                type="file"
                accept="image/png,image/jpeg,image/webp"
              />

              <button
                type="button"
                class="tiny-btn"
                data-default-profile-avatar
              >
                Use default
              </button>
            </div>

            <p class="muted-text" style="margin:11px 0 0">
              Uploaded images are resized and stored in this browser.
            </p>
          </div>
        </div>

        <div class="profile-editor-actions">
          <button
            type="button"
            class="secondary-btn"
            data-close-profile-editor
          >
            Cancel
          </button>

          <button type="submit" class="primary-btn">
            Save profile
          </button>
        </div>
      </form>
    `;

    document.body.appendChild(modal);
    bindProfileEditor(modal);

    return modal;
  }

  function renderEditorPreview() {
    const preview = document.querySelector(
      "#profileEditorPreview"
    );

    if (preview) {
      preview.innerHTML = avatarContent(selectedAvatar);
    }

    document
      .querySelectorAll("[data-profile-avatar]")
      .forEach((button) => {
        const selected =
          selectedAvatar.type === "emoji" &&
          selectedAvatar.value === button.dataset.profileAvatar;

        button.classList.toggle("selected", selected);
        button.setAttribute("aria-pressed", String(selected));
      });
  }

  function openProfileEditor() {
    const user = getCurrentUser();

    if (!user) {
      showMessage("Sign in before editing your profile.");
      return;
    }

    const modal = createProfileEditor();
    const nameInput = modal.querySelector("#profileEditorName");
    const descriptionInput = modal.querySelector(
      "#profileEditorDescription"
    );

    selectedAvatar = getSavedAvatar();

    if (nameInput) {
      nameInput.value = user.name || "Learner";
    }

    if (descriptionInput) {
      descriptionInput.value = user.description || "";
    }

    renderEditorPreview();
    modal.classList.remove("hidden");
    document.body.classList.add("overlay-open");

    requestAnimationFrame(() => {
      nameInput?.focus();
      nameInput?.select();
    });
  }

  function closeProfileEditor() {
    const modal = document.querySelector("#profileEditorModal");

    if (!modal || modal.classList.contains("hidden")) return;

    modal.classList.add("hidden");
    document.body.classList.remove("overlay-open");
    document.querySelector("#sidebarProfileCard")?.focus();
  }

  function resizeImage(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();

      reader.onerror = () => {
        reject(new Error("The image could not be read."));
      };

      reader.onload = () => {
        const image = new Image();

        image.onerror = () => {
          reject(new Error("Please choose a valid image."));
        };

        image.onload = () => {
          const size = 192;
          const canvas = document.createElement("canvas");
          const context = canvas.getContext("2d");

          if (!context) {
            reject(new Error("Image processing is unavailable."));
            return;
          }

          canvas.width = size;
          canvas.height = size;

          const sourceSize = Math.min(image.width, image.height);
          const sourceX = (image.width - sourceSize) / 2;
          const sourceY = (image.height - sourceSize) / 2;

          context.drawImage(
            image,
            sourceX,
            sourceY,
            sourceSize,
            sourceSize,
            0,
            0,
            size,
            size
          );

          resolve(canvas.toDataURL("image/jpeg", 0.8));
        };

        image.src = String(reader.result);
      };

      reader.readAsDataURL(file);
    });
  }

  async function handleImageUpload(input) {
    const file = input.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      showMessage("Please choose a PNG, JPEG, or WebP image.");
      input.value = "";
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      showMessage("Please choose an image smaller than 5 MB.");
      input.value = "";
      return;
    }

    try {
      selectedAvatar = {
        type: "image",
        value: await resizeImage(file)
      };

      renderEditorPreview();
      showMessage("Image ready. Select Save profile to apply it.");
    } catch (error) {
      showMessage(
        error.message || "The image could not be processed."
      );
    } finally {
      input.value = "";
    }
  }

  function saveProfile(event) {
    event.preventDefault();

    const user = getCurrentUser();
    const nameInput = document.querySelector("#profileEditorName");
    const descriptionInput = document.querySelector(
      "#profileEditorDescription"
    );
    const name = String(nameInput?.value || "")
      .replace(/\s+/g, " ")
      .trim()
      .slice(0, 60);
    const description = String(descriptionInput?.value || "")
      .replace(/\s+/g, " ")
      .trim()
      .slice(0, 160);

    if (!user) {
      showMessage("Your signed-in profile could not be found.");
      return;
    }

    if (name.length < 2) {
      showMessage(
        "Enter a display name with at least two characters."
      );
      nameInput?.focus();
      return;
    }

    const updatedUser = {
      ...user,
      name,
      description
    };

    const avatars = getAvatarMap();
    avatars[getUserKey(updatedUser)] = selectedAvatar;

    try {
      writeJson("quiletUser", updatedUser);
      writeJson(AVATAR_KEY, avatars);

      const accounts = readJson("quiletAccounts", []);

      if (Array.isArray(accounts)) {
        const accountIndex = accounts.findIndex((account) =>
          String(account.email || "").toLowerCase() ===
          String(user.email || "").toLowerCase()
        );

        if (accountIndex >= 0) {
          accounts[accountIndex] = {
            ...accounts[accountIndex],
            name,
            description
          };

          writeJson("quiletAccounts", accounts);
        }
      }

      renderUserProfile();
      closeProfileEditor();
      showMessage("Profile updated successfully.", 5000);

      window.dispatchEvent(
        new CustomEvent("quilet:profile-updated", {
          detail: {
            user: updatedUser,
            avatar: selectedAvatar
          }
        })
      );
    } catch {
      showMessage(
        "The profile could not be saved in this browser."
      );
    }
  }

  function bindProfileEditor(modal) {
    modal.addEventListener("click", (event) => {
      if (event.target.closest("[data-close-profile-editor]")) {
        closeProfileEditor();
        return;
      }

      const avatarButton = event.target.closest(
        "[data-profile-avatar]"
      );

      if (avatarButton) {
        selectedAvatar = {
          type: "emoji",
          value: avatarButton.dataset.profileAvatar
        };

        renderEditorPreview();
        return;
      }

      if (event.target.closest("[data-default-profile-avatar]")) {
        selectedAvatar = {
          type: "emoji",
          value: DEFAULT_AVATAR
        };

        renderEditorPreview();
      }
    });

    modal
      .querySelector("#profileEditorUpload")
      ?.addEventListener("change", (event) => {
        void handleImageUpload(event.currentTarget);
      });

    modal
      .querySelector("#profileEditorForm")
      ?.addEventListener("submit", saveProfile);
  }

  function createWorkspaceTool(id, icon, label) {
    const button = document.createElement("button");

    button.id = id;
    button.type = "button";
    button.className = "workspace-tool-btn";
    button.setAttribute("aria-label", label);
    button.title = label;
    button.innerHTML = `<span aria-hidden="true">${icon}</span>`;

    return button;
  }

  function updateWorkspaceBell(button) {
    const unread = document
      .querySelector("#notificationBtn .notification-unread-dot")
      ?.textContent.trim() || "";

    let indicator = button.querySelector(
      ".notification-unread-dot"
    );

    if (!unread) {
      indicator?.remove();
      button.setAttribute("aria-label", "Notifications");
      button.title = "Notifications";
      return;
    }

    if (!indicator) {
      indicator = document.createElement("span");
      indicator.className = "notification-unread-dot";
      indicator.setAttribute("aria-hidden", "true");
      button.appendChild(indicator);
    }

    if (indicator.textContent !== unread) {
      indicator.textContent = unread;
    }

    button.setAttribute(
      "aria-label",
      `Notifications, ${unread} unread`
    );

    button.title =
      `${unread} unread notification${unread === "1" ? "" : "s"}`;
  }

  function updateWorkspaceInstall(button) {
    const source = document.querySelector("#installAppBtn");
    const installed =
      Boolean(document.querySelector("#appInstalledStatus")) ||
      source?.textContent.trim() === "App installed";

    const icon = button.querySelector("[aria-hidden='true']");
    const iconText = installed ? "✓" : "⬇";
    const label = installed ? "App installed" : "Install app";

    button.classList.toggle("installed", installed);
    button.disabled = installed;
    button.title = label;
    button.setAttribute("aria-label", label);

    if (icon && icon.textContent !== iconText) {
      icon.textContent = iconText;
    }
  }

  function placeWorkspaceTools() {
    const actions = document.querySelector(
      "#workspaceHeader .workspace-header-actions"
    );

    const search = actions?.querySelector(".workspace-search");
    if (!actions || !search) return;

    let install = document.querySelector("#workspaceInstallBtn");

    if (!install) {
      install = createWorkspaceTool(
        "workspaceInstallBtn",
        "⬇",
        "Install app"
      );

      install.addEventListener("click", (event) => {
        event.preventDefault();
        event.stopPropagation();

        const source = document.querySelector("#installAppBtn");

        if (source) {
          source.click();
        } else if (install.classList.contains("installed")) {
          showMessage("The app is already installed.");
        } else {
          showMessage(
            "Open the website outside the embedded preview to install the app."
          );
        }
      });
    }

    let bell = document.querySelector("#workspaceNotificationBtn");

    if (!bell) {
      bell = createWorkspaceTool(
        "workspaceNotificationBtn",
        "🔔",
        "Notifications"
      );

      bell.addEventListener("click", (event) => {
        event.preventDefault();
        event.stopPropagation();
        document.querySelector("#notificationBtn")?.click();
      });
    }

    if (search.nextElementSibling !== install) {
      search.insertAdjacentElement("afterend", install);
    }

    if (install.nextElementSibling !== bell) {
      install.insertAdjacentElement("afterend", bell);
    }

    updateWorkspaceInstall(install);
    updateWorkspaceBell(bell);
  }

  function isMobileMenu() {
    return window.innerWidth <= MOBILE_BREAKPOINT;
  }

  function menuIsOpen() {
    return Boolean(
      document
        .querySelector("#mainTopbar")
        ?.classList.contains("menu-open") ||
      document
        .querySelector("#topbarActions")
        ?.classList.contains("mobile-menu-open")
    );
  }

  function setMobileMenu(open) {
    const topbar = document.querySelector("#mainTopbar");
    const button = document.querySelector("#hamburgerBtn");
    const actions = document.querySelector("#topbarActions");

    if (!topbar || !button || !actions) return;

    const shouldOpen = Boolean(
      open &&
      isMobileMenu() &&
      !topbar.classList.contains("hidden-on-auth")
    );

    topbar.classList.toggle("menu-open", shouldOpen);
    actions.classList.toggle("mobile-menu-open", shouldOpen);
    button.setAttribute("aria-expanded", String(shouldOpen));
    button.setAttribute(
      "aria-label",
      shouldOpen ? "Close navigation" : "Open navigation"
    );
  }

  function bindMobileMenu() {
    const button = document.querySelector("#hamburgerBtn");

    if (
      !button ||
      button.dataset.profileMobileMenuReady === "true"
    ) {
      return;
    }

    button.dataset.profileMobileMenuReady = "true";
    button.setAttribute("aria-controls", "topbarActions");

    document.addEventListener("click", (event) => {
      if (event.target.closest("#hamburgerBtn")) {
        if (!isMobileMenu()) return;

        event.preventDefault();
        event.stopImmediatePropagation();
        setMobileMenu(!menuIsOpen());
        return;
      }

      if (!isMobileMenu()) return;

      if (
        event.target.closest("#topbarActions .nav-btn") ||
        event.target.closest("#logoutBtn")
      ) {
        setMobileMenu(false);
        return;
      }

      if (
        menuIsOpen() &&
        !event.target.closest("#mainTopbar")
      ) {
        setMobileMenu(false);
      }
    }, true);

    window.addEventListener("resize", () => {
      if (!isMobileMenu()) setMobileMenu(false);
    }, { passive: true });
  }

  function bindEvents() {
    document.addEventListener("click", (event) => {
      if (event.target.closest("#sidebarProfileCard")) {
        event.preventDefault();
        openProfileEditor();
        return;
      }

      if (
        event.target.closest("#logoutBtn") ||
        event.target.closest("#deleteAccountBtn")
      ) {
        setTimeout(renderUserProfile, 0);
      }
    });

    document.addEventListener("keydown", (event) => {
      if (event.key === "Escape") {
        closeProfileEditor();
      }
    });

    window.addEventListener("storage", (event) => {
      if (
        event.key === "quiletUser" ||
        event.key === AVATAR_KEY ||
        event.key === "quiletNotificationInbox"
      ) {
        requestAnimationFrame(refreshInterface);
      }
    });
  }

  function scheduleInterfaceSync() {
    if (syncFrame) return;

    syncFrame = requestAnimationFrame(() => {
      syncFrame = 0;

      if (getCurrentUser()) {
        createSidebarProfile();
      }

      placeWorkspaceTools();
    });
  }

  function observeInterface() {
    const observer = new MutationObserver((mutations) => {
      const shouldSync = mutations.some((mutation) => {
        if (mutation.type !== "childList") return false;

        return (
          mutation.target.id === "notificationBtn" ||
          mutation.target.id === "workspaceHeader" ||
          mutation.target.classList?.contains(
            "workspace-header-actions"
          ) ||
          [...mutation.addedNodes, ...mutation.removedNodes].some(
            (node) =>
              node.nodeType === Node.ELEMENT_NODE &&
              (
                node.id === "workspaceHeader" ||
                node.id === "notificationBtn" ||
                node.id === "installAppBtn" ||
                node.id === "appInstalledStatus" ||
                node.classList?.contains(
                  "notification-unread-dot"
                )
              )
          )
        );
      });

      if (shouldSync) scheduleInterfaceSync();
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true
    });
  }

  function refreshInterface() {
    selectedAvatar = getSavedAvatar();
    renderUserProfile();
    placeWorkspaceTools();
    bindMobileMenu();
  }

  function init() {
    addStyles();
    createProfileEditor();
    bindMobileMenu();
    bindEvents();
    observeInterface();
    refreshInterface();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init, {
      once: true
    });
  } else {
    init();
  }
})();
