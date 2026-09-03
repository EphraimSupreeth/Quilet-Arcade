const CACHE_NAME = "quilet-pwa-manual-update-v3";

const APP_SHELL = [
  "./",
  "./index.html",
  "./style.css",
  "./modern-layout.css",
  "./mobile-friendly.css",
  "./theme-fix.css",
  "./theme-bootstrap.js",
  "./app.js",
  "./quiz-editing.js",
  "./quiz-catalog.js",
  "./game-modes.js",
  "./avatar-profile.js",
  "./notifications.js",
  "./analytics.js",
  "./dark-mode.js",
  "./supabase-config.js",
  "./supabase-join.js",
  "./manifest.webmanifest"
];

let updateCheckPromise = null;

function getCacheKey(request) {
  const url = new URL(
    typeof request === "string" ? request : request.url,
    self.location.href
  );

  url.search = "";
  url.hash = "";

  return new Request(url.href, { method: "GET" });
}

async function responsesAreDifferent(cached, fresh) {
  if (!cached || !fresh) {
    return Boolean(cached) !== Boolean(fresh);
  }

  try {
    const [cachedBytes, freshBytes] = await Promise.all([
      cached.clone().arrayBuffer(),
      fresh.clone().arrayBuffer()
    ]);

    if (cachedBytes.byteLength !== freshBytes.byteLength) {
      return true;
    }

    const cachedView = new Uint8Array(cachedBytes);
    const freshView = new Uint8Array(freshBytes);

    for (let index = 0; index < cachedView.length; index += 1) {
      if (cachedView[index] !== freshView[index]) {
        return true;
      }
    }

    return false;
  } catch {
    return true;
  }
}

async function notifyClients(type) {
  const clients = await self.clients.matchAll({
    type: "window",
    includeUncontrolled: true
  });

  clients.forEach((client) => {
    client.postMessage({ type });
  });
}

async function cacheInitialAppShell() {
  const cache = await caches.open(CACHE_NAME);

  await Promise.allSettled(
    APP_SHELL.map(async (path) => {
      const request = new Request(path, { cache: "no-store" });
      const response = await fetch(request);

      if (response.ok) {
        await cache.put(getCacheKey(request), response.clone());
      }
    })
  );
}

async function checkForDeployedUpdate() {
  if (updateCheckPromise) return updateCheckPromise;

  updateCheckPromise = (async () => {
    const cache = await caches.open(CACHE_NAME);
    let changed = false;

    await Promise.allSettled(
      APP_SHELL.map(async (path) => {
        const request = new Request(path, { cache: "no-store" });
        const cacheKey = getCacheKey(request);
        const cached = await cache.match(cacheKey);

        const fresh = await fetch(request, {
          cache: "no-store",
          headers: {
            "Cache-Control": "no-cache, no-store, must-revalidate"
          }
        });

        if (!fresh.ok) return;

        if (cached && await responsesAreDifferent(cached, fresh)) {
          changed = true;
        }

        await cache.put(cacheKey, fresh.clone());
      })
    );

    if (changed) {
      await notifyClients("QUILET_UPDATE_AVAILABLE");
    }

    return changed;
  })().finally(() => {
    updateCheckPromise = null;
  });

  return updateCheckPromise;
}

function addUpdateInterface(response) {
  const contentType = response.headers.get("content-type") || "";

  if (!contentType.includes("text/html")) {
    return response;
  }

  return response.text().then((html) => {
    if (html.includes("data-service-worker-update-ui")) {
      return response;
    }

    const interfaceCode = `
      <style data-service-worker-update-ui>
        #deployedAppUpdateBtn {
          position: fixed;
          right: max(16px, env(safe-area-inset-right));
          bottom: max(16px, env(safe-area-inset-bottom));
          z-index: 50000;
          display: none;
          min-height: 48px;
          padding: 11px 20px;
          border: 1px solid #2563eb;
          border-radius: 14px;
          background: linear-gradient(135deg, #2563eb, #7c3aed);
          color: #fff;
          box-shadow: 0 18px 45px rgba(15, 23, 42, 0.3);
          cursor: pointer;
          font: 800 16px/1.2 "Nunito", system-ui, sans-serif;
        }

        #deployedAppUpdateBtn.is-visible {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
        }

        #deployedAppUpdateBtn:disabled {
          cursor: wait;
          opacity: 0.75;
        }

        @media (max-width: 560px) {
          #deployedAppUpdateBtn {
            right: max(12px, env(safe-area-inset-right));
            bottom: max(12px, env(safe-area-inset-bottom));
            left: max(12px, env(safe-area-inset-left));
            width: auto;
          }
        }
      </style>

      <button
        id="deployedAppUpdateBtn"
        type="button"
        aria-label="Load the latest deployed version"
      >
        <span aria-hidden="true">↻</span>
        <span>Update App</span>
      </button>

      <script data-service-worker-update-ui>
        (() => {
          const button = document.querySelector(
            "#deployedAppUpdateBtn"
          );

          if (!button || !("serviceWorker" in navigator)) return;

          function showUpdateButton() {
            button.classList.add("is-visible");
          }

          navigator.serviceWorker.addEventListener(
            "message",
            (event) => {
              if (
                event.data?.type === "QUILET_UPDATE_AVAILABLE"
              ) {
                showUpdateButton();
              }
            }
          );

          button.addEventListener("click", () => {
            if (button.disabled) return;

            button.disabled = true;
            button.innerHTML =
              '<span aria-hidden="true">↻</span>' +
              '<span>Updating…</span>';

            try {
              sessionStorage.setItem(
                "quiletUpdateInProgress",
                "true"
              );
            } catch {
              // Continue when session storage is unavailable.
            }

            const url = new URL(window.location.href);

            url.searchParams.delete("build");
            url.searchParams.delete("catalogRefresh");
            url.searchParams.set(
              "appUpdate",
              Date.now().toString()
            );

            window.location.replace(url.toString());
          });

          function requestUpdateCheck() {
            navigator.serviceWorker.controller?.postMessage({
              type: "CHECK_FOR_DEPLOYED_UPDATE"
            });
          }

          if (navigator.serviceWorker.controller) {
            requestUpdateCheck();
          } else {
            navigator.serviceWorker.ready
              .then(requestUpdateCheck)
              .catch(() => {});
          }

          window.addEventListener("focus", requestUpdateCheck);

          document.addEventListener(
            "visibilitychange",
            () => {
              if (!document.hidden) requestUpdateCheck();
            }
          );
        })();
      <\/script>
    `;

    const updatedHtml = html.includes("</body>")
      ? html.replace("</body>", `${interfaceCode}</body>`)
      : `${html}${interfaceCode}`;

    const headers = new Headers(response.headers);
    headers.delete("content-length");
    headers.set("Cache-Control", "no-cache");

    return new Response(updatedHtml, {
      status: response.status,
      statusText: response.statusText,
      headers
    });
  });
}

self.addEventListener("install", (event) => {
  event.waitUntil(
    cacheInitialAppShell().then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const cacheNames = await caches.keys();

      await Promise.all(
        cacheNames
          .filter((name) => name !== CACHE_NAME)
          .map((name) => caches.delete(name))
      );

      await self.clients.claim();
    })()
  );
});

self.addEventListener("message", (event) => {
  if (event.data?.type === "CHECK_FOR_DEPLOYED_UPDATE") {
    event.waitUntil(checkForDeployedUpdate());
  }
});

function offlinePage() {
  return new Response(
    `<!DOCTYPE html>
    <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta
          name="viewport"
          content="width=device-width,initial-scale=1"
        >
        <meta name="theme-color" content="#2563eb">
        <title>Quilet Offline</title>
        <style>
          body {
            display: grid;
            min-height: 100vh;
            margin: 0;
            place-items: center;
            background: #eff6ff;
            color: #172033;
            font-family: Arial, sans-serif;
          }

          main {
            width: min(90%, 480px);
            padding: 30px;
            border-radius: 20px;
            background: white;
            text-align: center;
            box-shadow: 0 16px 42px rgba(15, 23, 42, 0.12);
          }

          button {
            padding: 11px 18px;
            border: 0;
            border-radius: 12px;
            background: #2563eb;
            color: white;
            cursor: pointer;
            font: inherit;
            font-weight: 700;
          }
        </style>
      </head>

      <body>
        <main>
          <h1>Quilet is offline</h1>
          <p>Reconnect to the internet and try loading the app again.</p>
          <button type="button" onclick="location.reload()">
            Try again
          </button>
        </main>
      </body>
    </html>`,
    {
      status: 503,
      headers: {
        "Content-Type": "text/html; charset=utf-8"
      }
    }
  );
}

async function handleNavigation(request, event) {
  const cache = await caches.open(CACHE_NAME);

  const cached =
    await cache.match(getCacheKey("./index.html")) ||
    await cache.match(getCacheKey("./"));

  if (cached) {
    event.waitUntil(checkForDeployedUpdate());
    return addUpdateInterface(cached.clone());
  }

  try {
    const fresh = await fetch(request, {
      cache: "no-store"
    });

    if (fresh.ok) {
      await cache.put(
        getCacheKey("./index.html"),
        fresh.clone()
      );
    }

    return addUpdateInterface(fresh);
  } catch {
    return addUpdateInterface(offlinePage());
  }
}

async function handleAsset(request, event) {
  const cache = await caches.open(CACHE_NAME);
  const cacheKey = getCacheKey(request);
  const cached = await cache.match(cacheKey);

  const refresh = fetch(request, {
    cache: "no-store"
  }).then(async (fresh) => {
    if (fresh.ok) {
      await cache.put(cacheKey, fresh.clone());
    }

    return fresh;
  }).catch(() => null);

  if (cached) {
    event.waitUntil(refresh);
    return cached;
  }

  return (
    await refresh ||
    new Response("", {
      status: 504,
      statusText: "Offline"
    })
  );
}

self.addEventListener("fetch", (event) => {
  const request = event.request;
  const url = new URL(request.url);

  if (
    request.method !== "GET" ||
    url.origin !== self.location.origin
  ) {
    return;
  }

  if (request.mode === "navigate") {
    event.respondWith(handleNavigation(request, event));
    return;
  }

  event.respondWith(handleAsset(request, event));
});
