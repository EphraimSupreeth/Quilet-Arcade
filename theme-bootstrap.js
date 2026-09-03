(() => {
  const THEME_KEY = "quiletTheme";
  const SYSTEM_THEME = "system";
  const INSTALL_KEY = "quiletAppInstalled";
  const PWA_BUILD = "2026.08.08.7";
  const LOGO_URL =
    "https://uploads.onecompiler.io/44t258rvg/44x5y9pza/Page%20logo.png";

  let deferredInstallPrompt = null;
  let serviceWorkerReadyPromise = Promise.resolve(null);
  let domSyncFrame = 0;

  function removeBuildParameter() {
    const url = new URL(window.location.href);

    if (!url.searchParams.has("build")) return;

    url.searchParams.delete("build");
    window.history.replaceState(
      window.history.state,
      "",
      `${url.pathname}${url.search}${url.hash}`
    );
  }

  function isStandalone() {
    return Boolean(
      window.matchMedia?.("(display-mode: standalone)").matches ||
      window.navigator.standalone === true
    );
  }

  function rememberInstallation() {
    try {
      localStorage.setItem(INSTALL_KEY, "true");
    } catch {
      // Storage may be unavailable in private browsing.
    }
  }

  function hasRememberedInstallation() {
    try {
      return localStorage.getItem(INSTALL_KEY) === "true";
    } catch {
      return false;
    }
  }

  async function isAppInstalled() {
    if (isStandalone() || hasRememberedInstallation()) {
      return true;
    }

    if (typeof navigator.getInstalledRelatedApps === "function") {
      try {
        const installedApps =
          await navigator.getInstalledRelatedApps();

        if (installedApps.length > 0) {
          rememberInstallation();
          return true;
        }
      } catch (error) {
        console.warn("Installed app check failed:", error);
      }
    }

    return false;
  }

  function isEmbeddedPreview() {
    try {
      return window.self !== window.top;
    } catch {
      return true;
    }
  }

  function isAppleDevice() {
    return /iPhone|iPad|iPod|Macintosh/i.test(navigator.userAgent);
  }

  function isDarkSystemTheme() {
    return Boolean(
      window.matchMedia?.("(prefers-color-scheme: dark)").matches
    );
  }

  function showMessage(message) {
    const toast = document.querySelector("#notificationToast");

    if (!toast) {
      window.alert(message);
      return;
    }

    toast.textContent = message;
    toast.classList.remove("hidden");
    toast.setAttribute("role", "status");

    clearTimeout(showMessage.timer);
    showMessage.timer = setTimeout(() => {
      toast.classList.add("hidden");
    }, 5500);
  }

  function setButtonText(button, text) {
    if (button && button.textContent !== text) {
      button.textContent = text;
    }
  }

  function applySystemTheme() {
    const selectedTheme =
      localStorage.getItem(THEME_KEY) || SYSTEM_THEME;

    const isSystem = selectedTheme === SYSTEM_THEME;
    const isDark = isSystem && isDarkSystemTheme();

    document.body.classList.toggle("theme-system", isSystem);
    document.body.classList.toggle("system-dark-active", isDark);

    if (!isSystem) return;

    document.documentElement.style.colorScheme = isDark
      ? "dark"
      : "light";

    document.documentElement.style.setProperty("--accent", "#2563eb");
    document.documentElement.style.setProperty("--accent-2", "#3b82f6");
    document.documentElement.style.setProperty(
      "--accent-soft",
      "rgba(37, 99, 235, 0.11)"
    );
    document.documentElement.style.setProperty(
      "--page-background",
      isDark
        ? "linear-gradient(135deg,#020617,#0f172a,#1e293b)"
        : "linear-gradient(135deg,#eff6ff,#dbeafe,#f8fafc)"
    );
  }

  function addMeta(name, content) {
    let meta = document.head.querySelector(`meta[name="${name}"]`);

    if (!meta) {
      meta = document.createElement("meta");
      meta.name = name;
      document.head.appendChild(meta);
    }

    meta.content = content;
  }

  function addPwaMetadata() {
    let viewport = document.head.querySelector('meta[name="viewport"]');

    if (!viewport) {
      viewport = document.createElement("meta");
      viewport.name = "viewport";
      document.head.appendChild(viewport);
    }

    viewport.content =
      "width=device-width, initial-scale=1, viewport-fit=cover";

    let manifest = document.head.querySelector('link[rel="manifest"]');

    if (!manifest) {
      manifest = document.createElement("link");
      manifest.rel = "manifest";
      document.head.appendChild(manifest);
    }

    manifest.href = `./manifest.webmanifest?v=${PWA_BUILD}`;

    let appleIcon = document.head.querySelector(
      'link[rel="apple-touch-icon"]'
    );

    if (!appleIcon) {
      appleIcon = document.createElement("link");
      appleIcon.rel = "apple-touch-icon";
      document.head.appendChild(appleIcon);
    }

    appleIcon.href = LOGO_URL;

    addMeta("theme-color", "#2563eb");
    addMeta("application-name", "Quilet");
    addMeta("apple-mobile-web-app-capable", "yes");
    addMeta("apple-mobile-web-app-status-bar-style", "default");
    addMeta("apple-mobile-web-app-title", "Quilet");
    addMeta("mobile-web-app-capable", "yes");
    addMeta("format-detection", "telephone=no");
  }

  function addInstallStyles() {
    if (document.querySelector("#quiletInstallStyles")) return;

    const style = document.createElement("style");
    style.id = "quiletInstallStyles";
    style.textContent = `
      #installAppBtn {
        width: 100%;
        min-height: 44px;
        padding: 10px 15px;
        border: 1px solid var(--border);
        border-radius: 13px;
        background: var(--panel);
        color: var(--text);
        box-shadow: var(--shadow-sm);
        font-weight: 800;
        white-space: normal;
        cursor: pointer;
        touch-action: manipulation;
      }

      #installAppBtn:hover:not(:disabled) {
        border-color: var(--accent);
        color: var(--accent);
      }

      #installAppBtn.install-ready {
        border-color: color-mix(
          in srgb,
          var(--accent) 45%,
          var(--border)
        );
        color: var(--accent);
      }

      #installAppBtn.installing {
        cursor: wait;
        opacity: 0.72;
        pointer-events: none;
      }

      body > #installAppBtn.auth-install-button {
        position: fixed;
        right: max(16px, env(safe-area-inset-right));
        bottom: max(16px, env(safe-area-inset-bottom));
        z-index: 300;
        width: auto;
        max-width: calc(100vw - 32px);
        background: var(--panel);
        box-shadow: var(--shadow-lg);
      }

      @media (max-width: 560px) {
        body > #installAppBtn.auth-install-button {
          right: max(12px, env(safe-area-inset-right));
          bottom: max(12px, env(safe-area-inset-bottom));
          left: max(12px, env(safe-area-inset-left));
          width: auto;
        }
      }
    `;

    document.head.appendChild(style);
  }

  function authViewIsActive() {
    return document
      .querySelector("#authView")
      ?.classList.contains("active");
  }

  function getInstallContainer() {
    if (authViewIsActive()) return document.body;

    return (
      document.querySelector(".user-actions") ||
      document.querySelector("#topbarActions") ||
      document.body
    );
  }

  function removeInstallButton() {
    document.querySelector("#installAppBtn")?.remove();
  }

  function createInstallButton() {
    if (isStandalone()) {
      removeInstallButton();
      return null;
    }

    const container = getInstallContainer();
    if (!container) return null;

    let button = document.querySelector("#installAppBtn");

    if (!button) {
      button = document.createElement("button");
      button.id = "installAppBtn";
      button.type = "button";
      button.className = "secondary-btn";
      button.addEventListener("click", requestInstall);
    }

    if (button.parentElement !== container) {
      if (container === document.body) {
        container.appendChild(button);
      } else {
        container.insertBefore(button, container.firstChild);
      }
    }

    button.classList.toggle(
      "auth-install-button",
      container === document.body
    );

    return button;
  }

  function updateInstallButton() {
    if (isStandalone()) {
      rememberInstallation();
      removeInstallButton();
      return;
    }

    const button = createInstallButton();
    if (!button || button.classList.contains("installing")) return;

    button.disabled = false;
    button.classList.toggle(
      "install-ready",
      Boolean(deferredInstallPrompt)
    );

    if (hasRememberedInstallation()) {
      setButtonText(button, "App installed");
      button.setAttribute(
        "aria-label",
        "Quilet is already installed"
      );
      button.title = "Quilet is already installed on this device";
      return;
    }

    if (isEmbeddedPreview()) {
      setButtonText(button, "Open app to install");
      button.setAttribute(
        "aria-label",
        "Open Quilet in a new browser tab to install the app"
      );
      button.title =
        "Open the website outside the embedded preview before installing.";
      return;
    }

    setButtonText(button, "Install app");
    button.setAttribute("aria-label", "Install Quilet as an app");

    if (deferredInstallPrompt) {
      button.title = "Install Quilet on this device";
    } else if (isAppleDevice()) {
      button.title = "View Safari installation instructions";
    } else {
      button.title = "Install Quilet or view browser instructions";
    }
  }

  function openOutsidePreview() {
    const url = new URL(window.location.href);

    url.searchParams.delete("build");
    url.searchParams.set("install", "true");

    const opened = window.open(
      url.toString(),
      "_blank",
      "noopener,noreferrer"
    );

    if (!opened) {
      showMessage(
        "Allow pop-ups, then open this preview in a new browser tab to install Quilet."
      );
    }
  }

  function waitForInstallPrompt(timeout = 1800) {
    if (deferredInstallPrompt) {
      return Promise.resolve(deferredInstallPrompt);
    }

    return new Promise((resolve) => {
      const startedAt = Date.now();

      const check = () => {
        if (deferredInstallPrompt) {
          resolve(deferredInstallPrompt);
          return;
        }

        if (Date.now() - startedAt >= timeout) {
          resolve(null);
          return;
        }

        setTimeout(check, 100);
      };

      check();
    });
  }

  async function openNativeInstaller() {
    const installPrompt = deferredInstallPrompt;
    if (!installPrompt) return false;

    const button = document.querySelector("#installAppBtn");

    button?.classList.add("installing");

    if (button) {
      button.disabled = true;
      setButtonText(button, "Opening installer…");
    }

    try {
      await installPrompt.prompt();
      const choice = await installPrompt.userChoice;

      deferredInstallPrompt = null;

      if (choice.outcome === "accepted") {
        rememberInstallation();
        showMessage("Quilet was installed successfully.");
      } else {
        showMessage("Installation was cancelled.");
      }

      return true;
    } catch (error) {
      console.error("PWA installation prompt failed:", error);
      deferredInstallPrompt = null;

      showMessage(
        "The browser could not open the installer. Use its Install app menu instead."
      );

      return false;
    } finally {
      button?.classList.remove("installing");

      if (button) {
        button.disabled = false;
      }

      updateInstallButton();
    }
  }

  async function requestInstall() {
    if (await isAppInstalled()) {
      rememberInstallation();
      updateInstallButton();
      showMessage("Quilet is already installed on this device.");
      return;
    }

    if (isEmbeddedPreview()) {
      openOutsidePreview();
      return;
    }

    if (deferredInstallPrompt) {
      await openNativeInstaller();
      return;
    }

    const button = document.querySelector("#installAppBtn");

    button?.classList.add("installing");

    if (button) {
      button.disabled = true;
      setButtonText(button, "Checking installation…");
    }

    try {
      await Promise.race([
        serviceWorkerReadyPromise,
        new Promise((resolve) => setTimeout(resolve, 4000))
      ]);

      await waitForInstallPrompt();
    } catch (error) {
      console.warn("PWA readiness check failed:", error);
    } finally {
      button?.classList.remove("installing");

      if (button) {
        button.disabled = false;
      }
    }

    if (await isAppInstalled()) {
      rememberInstallation();
      updateInstallButton();
      showMessage("Quilet is already installed on this device.");
      return;
    }

    if (deferredInstallPrompt) {
      await openNativeInstaller();
      return;
    }

    updateInstallButton();

    if (isAppleDevice()) {
      showMessage(
        "In Safari, tap Share and then Add to Home Screen or Add to Dock."
      );
      return;
    }

    showMessage(
      "Open your browser menu and choose Install app or Add to Home screen. Installation may be unavailable in private browsing or an embedded preview."
    );
  }

  function initializeInstallEvents() {
    window.addEventListener("beforeinstallprompt", (event) => {
      event.preventDefault();
      deferredInstallPrompt = event;
      updateInstallButton();
    });

    window.addEventListener("appinstalled", () => {
      deferredInstallPrompt = null;
      rememberInstallation();
      updateInstallButton();
      showMessage("Quilet was installed successfully.");
    });

    window
      .matchMedia?.("(display-mode: standalone)")
      .addEventListener("change", () => {
        if (isStandalone()) {
          rememberInstallation();
        }

        updateInstallButton();
      });

    if (isStandalone()) {
      rememberInstallation();
    }

    updateInstallButton();
  }

  async function registerServiceWorker() {
    if (!("serviceWorker" in navigator)) return null;

    let hasControlledPage = Boolean(navigator.serviceWorker.controller);
    navigator.serviceWorker.addEventListener("controllerchange", () => {
      if (!hasControlledPage) {
        hasControlledPage = true;
        return;
      }

      window.location.reload();
    });

    const isSecure =
      window.isSecureContext ||
      window.location.hostname === "localhost";

    if (!isSecure) {
      console.warn("PWA installation requires HTTPS or localhost.");
      return null;
    }

    try {
      const registration = await navigator.serviceWorker.register(
        `./service-worker.js?v=${PWA_BUILD}`,
        {
          scope: "./",
          updateViaCache: "none"
        }
      );

      registration.update().catch(() => {});

      await Promise.race([
        navigator.serviceWorker.ready,
        new Promise((resolve) => setTimeout(resolve, 4000))
      ]);

      return registration;
    } catch (error) {
      console.error("Service worker registration failed:", error);
      return null;
    }
  }

  function correctAnswerIndexes() {
    document.querySelectorAll('select[name="correct"]').forEach((select) => {
      [...select.options].forEach((option, index) => {
        const value = String(index);

        if (option.value !== value) {
          option.value = value;
        }
      });
    });
  }

  function scheduleDomSync() {
    if (domSyncFrame) return;

    domSyncFrame = requestAnimationFrame(() => {
      domSyncFrame = 0;
      correctAnswerIndexes();
      updateInstallButton();
    });
  }

  function observeInterface() {
    const bodyObserver = new MutationObserver(scheduleDomSync);

    bodyObserver.observe(document.body, {
      childList: true,
      subtree: true
    });

    const authView = document.querySelector("#authView");

    if (authView) {
      const authObserver = new MutationObserver(scheduleDomSync);

      authObserver.observe(authView, {
        attributes: true,
        attributeFilter: ["class"]
      });
    }
  }

  function initialize() {
    removeBuildParameter();

    if (!localStorage.getItem(THEME_KEY)) {
      localStorage.setItem(THEME_KEY, SYSTEM_THEME);
    }

    addPwaMetadata();
    addInstallStyles();
    initializeInstallEvents();
    applySystemTheme();
    correctAnswerIndexes();
    observeInterface();

    serviceWorkerReadyPromise = registerServiceWorker();

    window
      .matchMedia?.("(prefers-color-scheme: dark)")
      .addEventListener("change", applySystemTheme);
  }

  removeBuildParameter();

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initialize, {
      once: true
    });
  } else {
    initialize();
  }
})();
