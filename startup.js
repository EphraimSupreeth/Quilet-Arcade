(() => {
  const BUILD_VERSION = "2026.08.14.8";
  const OBSERVER_TIMEOUT_MS = 30000;

  window.QuiletHostTiming = {
    enabled: false,
    seconds: 20
  };

  function markReady() {
    document.documentElement.dataset.quiletReady = "true";
    document.documentElement.classList.remove("restoring-session");
  }

  function loadLocalStylesheet(filename) {
    return new Promise((resolve, reject) => {
      const existing = document.querySelector(
        `link[data-quilet-stylesheet="${filename}"]`
      );

      if (existing) {
        resolve();
        return;
      }

      const link = document.createElement("link");

      link.rel = "stylesheet";
      link.dataset.quiletStylesheet = filename;
      link.href = `${filename}?v=${encodeURIComponent(BUILD_VERSION)}`;

      link.addEventListener("load", resolve, { once: true });
      link.addEventListener(
        "error",
        () => reject(new Error(`Could not load ${filename}.`)),
        { once: true }
      );

      document.head.appendChild(link);
    });
  }

  async function loadLocalScript(filename) {
    const existing = document.querySelector(
      `script[data-quilet-source="${filename}"]`
    );

    if (existing) {
      return;
    }

    const response = await fetch(
      `${filename}?v=${encodeURIComponent(BUILD_VERSION)}`,
      { cache: "no-store" }
    );

    if (!response.ok) {
      throw new Error(
        `Could not load ${filename}: HTTP ${response.status}`
      );
    }

    const contentType = response.headers.get("content-type") || "";

    if (contentType.includes("text/html")) {
      throw new Error(`${filename} returned HTML instead of JavaScript.`);
    }

    const source = await response.text();
    const script = document.createElement("script");

    script.dataset.quiletSource = filename;
    script.textContent = `${source}\n//# sourceURL=${filename}`;

    document.head.appendChild(script);
  }

  function yieldToBrowser() {
    return new Promise((resolve) => {
      window.setTimeout(resolve, 0);
    });
  }

  async function loadScriptsSequentially(scripts, index = 0) {
    if (index >= scripts.length) {
      return;
    }

    await loadLocalScript(scripts[index]);
    await yieldToBrowser();

    return loadScriptsSequentially(scripts, index + 1);
  }

  function bindHeroJoinButton() {
    const button = document.querySelector("#heroJoinQuizBtn");

    if (!button || button.dataset.quiletJoinBound === "true") {
      return;
    }

    button.dataset.quiletJoinBound = "true";

    button.addEventListener("click", () => {
      window.setTimeout(() => {
        document.querySelector("#joinQuizPanel")?.scrollIntoView({
          behavior: "smooth",
          block: "start"
        });

        document.querySelector("#joinCodeInput")?.focus();
      }, 100);
    });
  }

  function showStartupError(error) {
    console.error("Quilet startup failed:", error);

    const toast = document.querySelector("#notificationToast");

    if (toast) {
      toast.textContent =
        `The application could not start: ${error.message}`;
      toast.classList.remove("hidden");
    }
  }

  async function loadEnhancements() {
    const enhancementScripts = [
      "quiz-editing.js",
      "analytics.js",
      "dark-mode.js",
      "quiz-catalog.js",
      "game-modes.js",
      "avatar-profile.js",
      "draw-guess.js",
      "chat.js"
    ];

    const results = await Promise.allSettled(
      enhancementScripts.map((filename) => loadLocalScript(filename))
    );

    results.forEach((result, index) => {
      if (result.status === "rejected") {
        console.warn(
          `Optional script failed to load: ${enhancementScripts[index]}`,
          result.reason
        );
      }
    });
  }

  async function startApplication() {
    const coreScripts = [
      "theme-bootstrap.js",
      "supabase-config.js",
      "supabase-join.js",
      "app.js"
    ];

    await loadScriptsSequentially(coreScripts);
    bindHeroJoinButton();
    markReady();

    await loadEnhancements();
  }

  startApplication().catch(showStartupError);
})();
