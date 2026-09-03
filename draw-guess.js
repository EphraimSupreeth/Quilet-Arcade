(() => {
  if (window.__quiletDrawGuessLoaded) return;
  window.__quiletDrawGuessLoaded = true;

  const WORDS = [
    "apple", "balloon", "bicycle", "butterfly", "camera",
    "castle", "cloud", "dinosaur", "flower", "guitar",
    "hamburger", "ice cream", "island", "lighthouse", "moon",
    "mountain", "octopus", "pencil", "pizza", "rainbow",
    "rocket", "snowman", "spider", "train", "umbrella"
  ];

  const COLORS = [
    "#111827", "#ef4444", "#f97316", "#eab308", "#22c55e",
    "#06b6d4", "#2563eb", "#7c3aed", "#db2777", "#ffffff"
  ];

  const game = {
    client: null,
    channel: null,
    code: "",
    playerId: "",
    playerName: "",
    hostId: "",
    isHost: false,
    status: "waiting",
    artistId: "",
    word: "",
    lastWord: "",
    wordChoices: [],
    pendingChoices: [],
    maskedWord: "",
    round: 0,
    maxRounds: 3,
    turnIndex: 0,
    turnOrder: [],
    seconds: 80,
    scores: {},
    players: [],
    guessed: new Set(),
    timer: null,
    nextRoundTimer: null,
    drawing: false,
    lastPoint: null,
    color: "#111827",
    width: 6
  };

  function readJson(key, fallback) {
    try {
      const value = localStorage.getItem(key);
      return value === null ? fallback : JSON.parse(value);
    } catch {
      return fallback;
    }
  }

  function currentUser() {
    return readJson("quiletUser", null);
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

  function normalize(value) {
    return String(value || "")
      .normalize("NFKC")
      .toLowerCase()
      .replace(/[^\p{L}\p{N}\s]/gu, "")
      .replace(/\s+/g, " ")
      .trim();
  }

  function showMessage(message) {
    const toast = document.querySelector("#notificationToast");

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
    }, 4000);
  }

  function randomCode() {
    const characters = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

    return Array.from({ length: 6 }, () =>
      characters[Math.floor(Math.random() * characters.length)]
    ).join("");
  }

  function randomWordChoices(count = 3) {
    const available = [...WORDS];
    const choices = [];

    while (choices.length < count && available.length) {
      const index = Math.floor(Math.random() * available.length);
      choices.push(available.splice(index, 1)[0]);
    }

    return choices;
  }

  function maskWord(word) {
    return [...String(word || "")]
      .map((character) => character === " " ? "  " : "_")
      .join(" ");
  }

  function getClient() {
    return (
      window.__QUILET_SUPABASE_CLIENT__ ||
      window.__SUPABASE_CLIENT__ ||
      null
    );
  }

  function playerById(id) {
    return game.players.find((player) => player.id === id);
  }

  function playerName(id) {
    return playerById(id)?.name || "Player";
  }

  function isCurrentArtist() {
    return (
      game.playerId === game.artistId &&
      (game.status === "choosing" || game.status === "active")
    );
  }

  function canDraw() {
    return (
      game.playerId === game.artistId &&
      game.status === "active"
    );
  }

  function connectedTurnOrder() {
    const connectedIds = new Set(game.players.map((player) => player.id));
    return game.turnOrder.filter((id) => connectedIds.has(id));
  }

  function buildTurnOrder() {
    const participants = game.players
      .filter((player) => player.id !== game.hostId)
      .sort((a, b) =>
        Number(a.joinedAt || 0) - Number(b.joinedAt || 0) ||
        a.name.localeCompare(b.name)
      );

    return [
      game.hostId,
      ...participants.map((player) => player.id)
    ].filter(Boolean);
  }

  function addLibraryEntry() {
    const activity = document.querySelector("#drawGuessActivity");

    if (!activity || document.querySelector("#drawGuessLibraryPanel")) {
      return;
    }

    const panel = document.createElement("section");
    panel.id = "drawGuessLibraryPanel";
    panel.className = "dg-library-panel";
    panel.innerHTML = `
      <div>
        <p class="eyebrow">Arcade activity</p>
        <h3>🎨 Draw &amp; Guess</h3>
        <p>The host draws first, then every participant gets a turn.</p>
      </div>

      <div class="dg-library-actions">
        <button type="button" class="primary-btn" data-dg-host>
          Host game
        </button>
        <button type="button" class="secondary-btn" data-dg-join>
          Join game
        </button>
      </div>
    `;

    activity.appendChild(panel);
  }

  function createOverlay() {
    let overlay = document.querySelector("#drawGuessOverlay");
    if (overlay) return overlay;

    overlay = document.createElement("div");
    overlay.id = "drawGuessOverlay";
    overlay.className = "dg-overlay hidden";
    overlay.setAttribute("role", "dialog");
    overlay.setAttribute("aria-modal", "true");
    overlay.setAttribute("aria-labelledby", "drawGuessTitle");

    overlay.innerHTML = `
      <section class="dg-shell">
        <header class="dg-head">
          <div>
            <h2 id="drawGuessTitle">🎨 Draw &amp; Guess</h2>
            <p data-dg-status>Set up your game</p>
          </div>

          <div class="dg-head-actions">
            <button
              type="button"
              class="dg-code"
              data-dg-copy
              hidden
            ></button>

            <button
              type="button"
              class="dg-close"
              data-dg-close
              aria-label="Close Draw and Guess"
            >✕</button>
          </div>
        </header>

        <div data-dg-content></div>
      </section>
    `;

    document.body.appendChild(overlay);
    return overlay;
  }

  function renderCodeButton() {
    const button = document.querySelector("[data-dg-copy]");
    if (!button) return;

    if (!game.code) {
      button.hidden = true;
      button.replaceChildren();
      return;
    }

    button.hidden = false;
    button.innerHTML = `
      <span class="dg-code-value">${escapeHtml(game.code)}</span>
      <span class="dg-copy-label">Copy code</span>
    `;
  }

  function showSetup(mode) {
    if (!currentUser()) {
      showMessage("Sign in before opening Draw & Guess.");
      return;
    }

    const overlay = createOverlay();
    const content = overlay.querySelector("[data-dg-content]");
    const name = String(currentUser()?.name || "Player").slice(0, 32);

    content.className = "dg-setup";
    content.innerHTML = `
      <div class="dg-setup-icon">
        ${mode === "host" ? "🖌️" : "🎨"}
      </div>

      <h3>
        ${mode === "host"
          ? "Create a drawing room"
          : "Join a drawing room"}
      </h3>

      <p class="muted-text">
        Every player chooses a word and draws once per round.
      </p>

      <form class="stacked-form" data-dg-setup-form="${mode}">
        <label>
          Display name
          <input
            name="playerName"
            maxlength="32"
            minlength="2"
            value="${escapeHtml(name)}"
            autocomplete="nickname"
            required
          />
        </label>

        ${mode === "join" ? `
          <label>
            Room code
            <input
              name="roomCode"
              maxlength="6"
              minlength="6"
              placeholder="ABC123"
              autocomplete="off"
              required
            />
          </label>
        ` : ""}

        <button type="submit" class="primary-btn">
          ${mode === "host" ? "Create room" : "Join room"}
        </button>
      </form>
    `;

    overlay.querySelector("[data-dg-status]").textContent =
      mode === "host"
        ? "Create a private room"
        : "Join with a room code";

    game.code = "";
    renderCodeButton();
    overlay.classList.remove("hidden");
    document.body.classList.add("overlay-open");

    requestAnimationFrame(() => content.querySelector("input")?.focus());
  }

  function send(event, payload) {
    if (!game.channel) return Promise.resolve();

    return game.channel.send({
      type: "broadcast",
      event,
      payload
    });
  }

  async function connectRoom(code, name, isHost) {
    const client = getClient();

    if (!client) {
      throw new Error("The realtime game service is unavailable.");
    }

    await leaveRoom(false);

    const sessionResult = await client.auth.getSession();
    if (sessionResult.error) throw sessionResult.error;

    let user = sessionResult.data.session?.user;

    if (!user) {
      const anonymousResult = await client.auth.signInAnonymously();

      if (anonymousResult.error) {
        throw new Error(
          "Draw & Guess needs anonymous access enabled in Supabase."
        );
      }

      user = anonymousResult.data.user;
    }

    if (!user) {
      throw new Error("Sign in before joining a room.");
    }

    Object.assign(game, {
      client,
      code,
      playerId: user.id,
      playerName: name,
      hostId: isHost ? user.id : "",
      isHost,
      status: "waiting",
      artistId: "",
      word: "",
      lastWord: "",
      wordChoices: [],
      pendingChoices: [],
      maskedWord: "",
      round: 0,
      turnIndex: 0,
      turnOrder: [],
      seconds: 80,
      scores: { [user.id]: 0 },
      players: [{
        id: user.id,
        name,
        host: isHost,
        joinedAt: Date.now()
      }]
    });

    game.guessed.clear();

    game.channel = client.channel(`draw-guess:${code}`, {
      config: {
        broadcast: { self: false },
        presence: { key: user.id }
      }
    });

    game.channel
      .on("presence", { event: "sync" }, syncPresence)
      .on("presence", { event: "join" }, syncPresence)
      .on("presence", { event: "leave" }, syncPresence)
      .on("broadcast", { event: "hello" }, handleHello)
      .on("broadcast", { event: "state" }, handleState)
      .on("broadcast", { event: "choice-offer" }, handleChoiceOffer)
      .on("broadcast", { event: "word-selected" }, handleWordSelected)
      .on("broadcast", { event: "round" }, handleRound)
      .on("broadcast", { event: "stroke" }, handleStroke)
      .on("broadcast", { event: "clear" }, clearCanvasLocal)
      .on("broadcast", { event: "guess" }, handleGuess)
      .on("broadcast", { event: "chat" }, handleChat)
      .on("broadcast", { event: "correct" }, handleCorrect)
      .on("broadcast", { event: "tick" }, handleTick)
      .on("broadcast", { event: "ended" }, handleEnded);

    renderGame();

    await new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error("The room connection timed out."));
      }, 10000);

      game.channel.subscribe(async (status) => {
        if (status === "SUBSCRIBED") {
          clearTimeout(timeout);

          await game.channel.track({
            id: game.playerId,
            name: game.playerName,
            host: game.isHost,
            joinedAt: Date.now()
          });

          if (game.isHost) {
            broadcastState();
          } else {
            void send("hello", {
              id: game.playerId,
              name: game.playerName
            });
          }

          syncPresence();
          resolve();
        }

        if (
          status === "CHANNEL_ERROR" ||
          status === "TIMED_OUT"
        ) {
          clearTimeout(timeout);
          reject(new Error("Unable to connect to that room."));
        }
      });
    });
  }

  function syncPresence() {
    if (!game.channel) return;

    const presence = game.channel.presenceState();
    const players = [];

    Object.values(presence).forEach((entries) => {
      entries.forEach((entry) => {
        if (
          entry?.id &&
          !players.some((player) => player.id === entry.id)
        ) {
          players.push({
            id: entry.id,
            name: entry.name || "Player",
            host: Boolean(entry.host),
            joinedAt: Number(entry.joinedAt || Date.now())
          });
        }
      });
    });

    if (!players.some((player) => player.id === game.playerId)) {
      players.push({
        id: game.playerId,
        name: game.playerName,
        host: game.isHost,
        joinedAt: Date.now()
      });
    }

    game.players = players;

    players.forEach((player) => {
      if (!(player.id in game.scores)) {
        game.scores[player.id] = 0;
      }

      if (player.host) game.hostId = player.id;
    });

    renderPlayers();

    if (!game.isHost) return;

    if (
      game.artistId &&
      !players.some((player) => player.id === game.artistId) &&
      game.status !== "waiting"
    ) {
      clearInterval(game.timer);
      advanceTurn();
      return;
    }

    broadcastState();
  }

  function handleHello() {
    if (!game.isHost) return;

    broadcastState();

    if (game.status === "choosing" && game.pendingChoices.length) {
      void send("choice-offer", {
        artistId: game.artistId,
        choices: game.pendingChoices,
        round: game.round,
        turnIndex: game.turnIndex,
        turnOrder: game.turnOrder
      });
    }
  }

  function broadcastState() {
    if (!game.isHost) return;

    void send("state", {
      hostId: game.hostId,
      artistId: game.artistId,
      status: game.status,
      round: game.round,
      maxRounds: game.maxRounds,
      turnIndex: game.turnIndex,
      turnOrder: game.turnOrder,
      seconds: game.seconds,
      maskedWord: game.status === "active" ? maskWord(game.word) : "",
      lastWord: game.lastWord,
      scores: game.scores,
      guessed: [...game.guessed]
    });
  }

  function handleState(message) {
    if (game.isHost) return;

    const payload = message.payload || {};
    const previousArtist = game.artistId;

    game.hostId = payload.hostId || game.hostId;
    game.artistId = payload.artistId || "";
    game.status = payload.status || game.status;
    game.round = Number(payload.round || 0);
    game.maxRounds = Number(payload.maxRounds || 3);
    game.turnIndex = Number(payload.turnIndex || 0);
    game.turnOrder = Array.isArray(payload.turnOrder)
      ? payload.turnOrder
      : game.turnOrder;
    game.seconds = Number(payload.seconds || 80);
    game.maskedWord = payload.maskedWord || "";
    game.lastWord = payload.lastWord || "";
    game.scores = payload.scores || game.scores;
    game.guessed = new Set(payload.guessed || []);

    if (previousArtist !== game.artistId) {
      game.wordChoices = [];
      game.word = "";
    }

    updateRoundInterface();
    renderPlayers();
  }

  function renderGame() {
    const overlay = createOverlay();
    const content = overlay.querySelector("[data-dg-content]");

    content.className = "dg-game";
    content.innerHTML = `
      <section class="dg-board-column">
        <div class="dg-round-bar">
          <strong data-dg-round>Lobby</strong>
          <div class="dg-round-word" data-dg-word>
            Waiting to start
          </div>
          <span class="dg-time" data-dg-time>—</span>
        </div>

        <div class="dg-canvas-wrap">
          <canvas id="drawGuessCanvas"></canvas>
          <div class="dg-waiting" data-dg-waiting></div>
        </div>

        <div class="dg-tools" data-dg-tools hidden>
          ${COLORS.map((color) => `
            <button
              type="button"
              class="dg-color ${color === game.color ? "active" : ""}"
              data-dg-color="${color}"
              style="background:${color}"
              aria-label="Use ${color}"
            ></button>
          `).join("")}

          <input
            class="dg-size"
            data-dg-size
            type="range"
            min="2"
            max="24"
            value="${game.width}"
            aria-label="Brush size"
          />

          <button type="button" class="tiny-btn" data-dg-clear>
            Clear
          </button>
        </div>
      </section>

      <aside class="dg-sidebar">
        <section class="dg-participants-section">
          <div class="dg-participants-head">
            <h3>👥 Participants</h3>
            <span
              class="dg-participant-count"
              data-dg-player-count
            >1</span>
          </div>
          <div class="dg-players" data-dg-players></div>
        </section>

        <div class="dg-chat">
          <p class="dg-chat-title">Guesses and chat</p>

          <div class="dg-messages" data-dg-messages>
            <div class="dg-message">
              Welcome! The host draws first, followed by every participant.
            </div>
          </div>

          <form class="dg-guess-form" data-dg-guess-form>
            <input
              name="guess"
              maxlength="60"
              placeholder="Type a guess or message…"
              autocomplete="off"
              required
            />
            <button type="submit" class="primary-btn">Send</button>
          </form>
        </div>
      </aside>
    `;

    overlay.querySelector("[data-dg-status]").textContent =
      game.isHost
        ? "You manage the room and draw first"
        : "Everyone gets a drawing turn";

    renderCodeButton();
    overlay.classList.remove("hidden");
    document.body.classList.add("overlay-open");

    prepareCanvas();
    renderPlayers();
    updateRoundInterface();
  }

  function prepareCanvas() {
    const canvas = document.querySelector("#drawGuessCanvas");
    if (!canvas) return;

    const resize = () => {
      const rect = canvas.getBoundingClientRect();
      if (!rect.width || !rect.height) return;

      const previous = document.createElement("canvas");
      previous.width = canvas.width;
      previous.height = canvas.height;
      previous.getContext("2d")?.drawImage(canvas, 0, 0);

      const ratio = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.round(rect.width * ratio);
      canvas.height = Math.round(rect.height * ratio);

      const context = canvas.getContext("2d");
      context.setTransform(ratio, 0, 0, ratio, 0, 0);
      context.lineCap = "round";
      context.lineJoin = "round";
      context.fillStyle = "#ffffff";
      context.fillRect(0, 0, rect.width, rect.height);

      if (previous.width && previous.height) {
        context.drawImage(
          previous,
          0,
          0,
          previous.width,
          previous.height,
          0,
          0,
          rect.width,
          rect.height
        );
      }
    };

    requestAnimationFrame(resize);

    const observer = new ResizeObserver(resize);
    observer.observe(canvas.parentElement);

    canvas._dgResizeObserver?.disconnect();
    canvas._dgResizeObserver = observer;

    canvas.addEventListener("pointerdown", startDrawing);
    canvas.addEventListener("pointermove", continueDrawing);
    canvas.addEventListener("pointerup", stopDrawing);
    canvas.addEventListener("pointercancel", stopDrawing);
    canvas.addEventListener("pointerleave", stopDrawing);
  }

  function canvasPoint(event) {
    const canvas = document.querySelector("#drawGuessCanvas");
    const rect = canvas.getBoundingClientRect();

    return {
      x: (event.clientX - rect.left) / rect.width,
      y: (event.clientY - rect.top) / rect.height
    };
  }

  function startDrawing(event) {
    if (!canDraw()) return;

    event.preventDefault();
    event.currentTarget.setPointerCapture?.(event.pointerId);
    game.drawing = true;
    game.lastPoint = canvasPoint(event);
  }

  function continueDrawing(event) {
    if (!canDraw() || !game.drawing || !game.lastPoint) return;

    event.preventDefault();

    const point = canvasPoint(event);
    const stroke = {
      artistId: game.playerId,
      from: game.lastPoint,
      to: point,
      color: game.color,
      width: game.width
    };

    drawStroke(stroke);
    void send("stroke", stroke);
    game.lastPoint = point;
  }

  function stopDrawing() {
    game.drawing = false;
    game.lastPoint = null;
  }

  function drawStroke(stroke) {
    const canvas = document.querySelector("#drawGuessCanvas");
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const context = canvas.getContext("2d");

    context.beginPath();
    context.strokeStyle = stroke.color || "#111827";
    context.lineWidth = Number(stroke.width || 6);
    context.lineCap = "round";
    context.lineJoin = "round";

    context.moveTo(
      Number(stroke.from?.x || 0) * rect.width,
      Number(stroke.from?.y || 0) * rect.height
    );

    context.lineTo(
      Number(stroke.to?.x || 0) * rect.width,
      Number(stroke.to?.y || 0) * rect.height
    );

    context.stroke();
  }

  function handleStroke(message) {
    const stroke = message.payload || {};

    if (
      game.status === "active" &&
      stroke.artistId === game.artistId
    ) {
      drawStroke(stroke);
    }
  }

  function clearCanvasLocal() {
    const canvas = document.querySelector("#drawGuessCanvas");
    if (!canvas) return;

    const context = canvas.getContext("2d");
    const ratio = Math.min(window.devicePixelRatio || 1, 2);

    context.save();
    context.setTransform(1, 0, 0, 1, 0, 0);
    context.fillStyle = "#ffffff";
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.restore();
    context.setTransform(ratio, 0, 0, ratio, 0, 0);
  }

  function renderPlayers() {
    const target = document.querySelector("[data-dg-players]");
    const count = document.querySelector("[data-dg-player-count]");

    if (count) count.textContent = String(game.players.length);
    if (!target) return;

    const players = [...game.players].sort((a, b) => {
      if (a.id === game.hostId) return -1;
      if (b.id === game.hostId) return 1;

      return (
        Number(game.scores[b.id] || 0) -
        Number(game.scores[a.id] || 0) ||
        a.name.localeCompare(b.name)
      );
    });

    target.innerHTML = players.length
      ? players.map((player, index) => `
          <div class="dg-player ${
            player.id === game.artistId ? "active-artist" : ""
          }">
            <strong>
              ${index + 1}. ${escapeHtml(player.name)}
              ${player.id === game.hostId ? " 👑" : ""}
              ${player.id === game.artistId ? " 🖌️" : ""}
              ${game.guessed.has(player.id) ? " ✅" : ""}
              ${player.id === game.playerId
                ? '<small class="dg-player-you">(you)</small>'
                : ""}
            </strong>

            <span>${Number(game.scores[player.id] || 0)} pts</span>
          </div>
        `).join("")
      : '<div class="dg-message">Connecting participants…</div>';
  }

  function addChat(name, text, type = "") {
    const target = document.querySelector("[data-dg-messages]");
    if (!target) return;

    const message = document.createElement("div");
    message.className = `dg-message ${type}`.trim();
    message.innerHTML = name
      ? `<strong>${escapeHtml(name)}:</strong> ${escapeHtml(text)}`
      : escapeHtml(text);

    target.appendChild(message);
    target.scrollTop = target.scrollHeight;
  }

  function handleChat(message) {
    const payload = message.payload || {};
    addChat(payload.name, payload.text, payload.type || "");
  }

  function submitGuess(value) {
    const text = String(value || "").replace(/\s+/g, " ").trim();
    if (!text) return;

    const isGuess =
      game.playerId !== game.artistId &&
      game.status === "active" &&
      !game.guessed.has(game.playerId);

    if (isGuess) {
      void send("guess", {
        id: game.playerId,
        name: game.playerName,
        text
      });
      return;
    }

    addChat(game.playerName, text);

    void send("chat", {
      id: game.playerId,
      name: game.playerName,
      text
    });
  }

  function handleGuess(message) {
    if (!game.isHost || game.status !== "active") return;

    const payload = message.payload || {};

    if (
      !payload.id ||
      payload.id === game.artistId ||
      game.guessed.has(payload.id)
    ) {
      return;
    }

    if (normalize(payload.text) !== normalize(game.word)) {
      addChat(payload.name, payload.text);

      void send("chat", {
        id: payload.id,
        name: payload.name,
        text: payload.text
      });

      return;
    }

    game.guessed.add(payload.id);

    const points = Math.max(25, 100 + game.seconds);
    game.scores[payload.id] =
      Number(game.scores[payload.id] || 0) + points;
    game.scores[game.artistId] =
      Number(game.scores[game.artistId] || 0) + 25;

    void send("correct", {
      id: payload.id,
      name: payload.name,
      scores: game.scores
    });

    addChat("", `${payload.name} guessed the word!`, "correct");
    renderPlayers();
    broadcastState();
    checkEveryoneGuessed();
  }

  function handleCorrect(message) {
    const payload = message.payload || {};

    game.scores = payload.scores || game.scores;
    game.guessed.add(payload.id);
    addChat("", `${payload.name} guessed the word!`, "correct");
    renderPlayers();
  }

  function checkEveryoneGuessed() {
    if (!game.isHost || game.status !== "active") return;

    const guessers = game.players.filter(
      (player) => player.id !== game.artistId
    );

    if (
      guessers.length &&
      guessers.every((player) => game.guessed.has(player.id))
    ) {
      setTimeout(() => {
        if (game.status === "active") {
          finishTurn("Everyone guessed the word!");
        }
      }, 700);
    }
  }

  function startGame() {
    if (!game.isHost || !game.channel) return;

    game.round = 1;
    game.turnOrder = buildTurnOrder();
    game.turnIndex = 0;

    if (!game.turnOrder.length) {
      showMessage("No players are available.");
      return;
    }

    offerWordChoices();
  }

  function offerWordChoices() {
    if (!game.isHost || !game.channel) return;

    clearInterval(game.timer);
    clearTimeout(game.nextRoundTimer);
    stopDrawing();

    const order = connectedTurnOrder();

    if (!order.length) {
      endGame();
      return;
    }

    game.turnOrder = order;

    if (game.turnIndex >= game.turnOrder.length) {
      game.turnIndex = 0;
    }

    game.artistId = game.turnOrder[game.turnIndex];
    game.status = "choosing";
    game.word = "";
    game.lastWord = "";
    game.maskedWord = "";
    game.guessed.clear();
    game.pendingChoices = randomWordChoices(3);
    game.wordChoices =
      game.artistId === game.playerId
        ? [...game.pendingChoices]
        : [];

    void send("choice-offer", {
      artistId: game.artistId,
      choices: game.pendingChoices,
      round: game.round,
      turnIndex: game.turnIndex,
      turnOrder: game.turnOrder
    });

    broadcastState();
    updateRoundInterface();
    renderPlayers();
  }

  function handleChoiceOffer(message) {
    const payload = message.payload || {};

    game.artistId = payload.artistId || game.artistId;
    game.round = Number(payload.round || game.round);
    game.turnIndex = Number(payload.turnIndex || 0);
    game.turnOrder = Array.isArray(payload.turnOrder)
      ? payload.turnOrder
      : game.turnOrder;
    game.status = "choosing";
    game.word = "";
    game.lastWord = "";
    game.guessed.clear();

    game.wordChoices =
      game.artistId === game.playerId
        ? [...(payload.choices || [])]
        : [];

    updateRoundInterface();
    renderPlayers();
  }

  function chooseWord(word) {
    if (
      game.status !== "choosing" ||
      game.playerId !== game.artistId ||
      !game.wordChoices.includes(word)
    ) {
      return;
    }

    game.word = word;
    game.wordChoices = [];
    updateRoundInterface();

    if (game.isHost) {
      startTurn(word);
    } else {
      void send("word-selected", {
        artistId: game.playerId,
        word
      });
    }
  }

  function handleWordSelected(message) {
    if (!game.isHost || game.status !== "choosing") return;

    const payload = message.payload || {};

    if (
      payload.artistId === game.artistId &&
      game.pendingChoices.includes(payload.word)
    ) {
      startTurn(payload.word);
    }
  }

  function startTurn(word) {
    if (!game.isHost) return;

    game.word = word;
    game.maskedWord = maskWord(word);
    game.wordChoices = [];
    game.pendingChoices = [];
    game.seconds = 80;
    game.status = "active";
    game.guessed.clear();

    clearCanvasLocal();

    void send("clear", {});
    void send("round", {
      artistId: game.artistId,
      artistName: playerName(game.artistId),
      round: game.round,
      maxRounds: game.maxRounds,
      turnIndex: game.turnIndex,
      turnOrder: game.turnOrder,
      seconds: game.seconds,
      maskedWord: game.maskedWord
    });

    addChat(
      "",
      `${playerName(game.artistId)} is drawing in round ${game.round}.`,
      "correct"
    );

    updateRoundInterface();
    renderPlayers();
    broadcastState();
    startHostTimer();
  }

  function handleRound(message) {
    const payload = message.payload || {};

    game.artistId = payload.artistId || "";
    game.round = Number(payload.round || 1);
    game.maxRounds = Number(payload.maxRounds || 3);
    game.turnIndex = Number(payload.turnIndex || 0);
    game.turnOrder = Array.isArray(payload.turnOrder)
      ? payload.turnOrder
      : game.turnOrder;
    game.seconds = Number(payload.seconds || 80);
    game.maskedWord = payload.maskedWord || "";
    game.lastWord = "";
    game.status = "active";
    game.guessed.clear();

    if (game.playerId !== game.artistId) {
      game.word = "";
    }

    clearCanvasLocal();

    addChat(
      "",
      `${payload.artistName || "A player"} is drawing in round ${game.round}.`,
      "correct"
    );

    updateRoundInterface();
    renderPlayers();
  }

  function startHostTimer() {
    clearInterval(game.timer);

    game.timer = setInterval(() => {
      if (!game.isHost || game.status !== "active") {
        clearInterval(game.timer);
        return;
      }

      game.seconds -= 1;
      void send("tick", { seconds: game.seconds });
      updateRoundInterface();

      if (game.seconds <= 0) {
        finishTurn("Time is up!");
      }
    }, 1000);
  }

  function handleTick(message) {
    game.seconds = Math.max(
      0,
      Number(message.payload?.seconds || 0)
    );

    updateRoundInterface();
  }

  function finishTurn(reason) {
    if (!game.isHost || game.status !== "active") return;

    clearInterval(game.timer);
    stopDrawing();

    game.status = "between";
    game.lastWord = game.word;

    const text = `${reason} The word was “${game.word}”.`;

    addChat("", text, "correct");
    void send("chat", { name: "", text, type: "correct" });

    broadcastState();
    updateRoundInterface();

    clearTimeout(game.nextRoundTimer);
    game.nextRoundTimer = setTimeout(() => {
      if (game.isHost && game.channel) advanceTurn();
    }, 3500);
  }

  function advanceTurn() {
    if (!game.isHost) return;

    game.turnOrder = connectedTurnOrder();
    game.turnIndex += 1;

    if (game.turnIndex < game.turnOrder.length) {
      offerWordChoices();
      return;
    }

    if (game.round >= game.maxRounds) {
      endGame();
      return;
    }

    game.round += 1;
    game.turnOrder = buildTurnOrder();
    game.turnIndex = 0;
    offerWordChoices();
  }

  function waitingMarkup() {
    if (game.status === "waiting") {
      return `
        <div>
          <div>👥</div>
          <h3>Waiting in the lobby</h3>
          <p>
            ${game.isHost
              ? "Start when everyone has joined. You will draw first."
              : "The host will start. Everyone gets a drawing turn."}
          </p>

          ${game.isHost ? `
            <button type="button" class="primary-btn" data-dg-start>
              Start game
            </button>
          ` : ""}
        </div>
      `;
    }

    if (game.status === "choosing") {
      if (game.playerId !== game.artistId) {
        return `
          <div>
            <div>🤔</div>
            <h3>${escapeHtml(playerName(game.artistId))} is choosing</h3>
            <p>The drawing turn will begin shortly.</p>
          </div>
        `;
      }

      if (!game.wordChoices.length) {
        return `
          <div>
            <div>⏳</div>
            <h3>Word selected</h3>
            <p>Waiting for the turn to begin.</p>
          </div>
        `;
      }

      return `
        <div>
          <div>🖌️</div>
          <h3>It is your drawing turn</h3>
          <p>Choose one word. Only you will see it.</p>

          <div class="dg-word-choices">
            ${game.wordChoices.map((word) => `
              <button
                type="button"
                class="dg-word-choice"
                data-dg-word-choice="${escapeHtml(word)}"
              >
                ${escapeHtml(word)}
              </button>
            `).join("")}
          </div>
        </div>
      `;
    }

    if (game.status === "between") {
      return `
        <div>
          <div>✅</div>
          <h3>Drawing turn complete</h3>
          <p>
            The word was
            <strong>${escapeHtml(game.lastWord || "unknown")}</strong>.
          </p>
          <p>The next player will choose a word shortly.</p>
        </div>
      `;
    }

    return "";
  }

  function updateRoundInterface() {
    const round = document.querySelector("[data-dg-round]");
    const word = document.querySelector("[data-dg-word]");
    const time = document.querySelector("[data-dg-time]");
    const waiting = document.querySelector("[data-dg-waiting]");
    const tools = document.querySelector("[data-dg-tools]");
    const canvas = document.querySelector("#drawGuessCanvas");
    const statusText = document.querySelector("[data-dg-status]");
    const drawable = canDraw();
    const turnCount = game.turnOrder.length;

    if (!drawable) stopDrawing();

    if (round) {
      round.textContent = game.round
        ? `Round ${game.round}/${game.maxRounds} · Turn ${
            Math.min(game.turnIndex + 1, Math.max(turnCount, 1))
          }/${Math.max(turnCount, 1)}`
        : "Lobby";
    }

    if (word) {
      if (game.status === "active") {
        word.textContent = drawable ? game.word : game.maskedWord;
      } else if (game.status === "choosing") {
        word.textContent = isCurrentArtist()
          ? "Choose your word"
          : `${playerName(game.artistId)} is choosing`;
      } else if (game.status === "between") {
        word.textContent = "Turn complete";
      } else if (game.status === "ended") {
        word.textContent = "Game finished";
      } else {
        word.textContent = "Waiting to start";
      }
    }

    if (time) {
      time.textContent =
        game.status === "active" ? `${game.seconds}s` : "—";
    }

    if (waiting) {
      waiting.hidden = game.status === "active";
      if (!waiting.hidden) waiting.innerHTML = waitingMarkup();
    }

    if (tools) tools.hidden = !drawable;

    if (statusText && game.status !== "waiting") {
      if (game.status === "active") {
        statusText.textContent = drawable
          ? "You are drawing"
          : `${playerName(game.artistId)} is drawing`;
      } else if (game.status === "choosing") {
        statusText.textContent = isCurrentArtist()
          ? "Choose a word for your turn"
          : `${playerName(game.artistId)} is choosing a word`;
      } else if (game.status === "between") {
        statusText.textContent = "Preparing the next drawing turn";
      }
    }

    canvas?.classList.toggle("dg-can-draw", drawable);
  }

  function endGame() {
    if (!game.isHost) return;

    clearInterval(game.timer);
    clearTimeout(game.nextRoundTimer);
    stopDrawing();

    game.status = "ended";
    void send("ended", { scores: game.scores });
    showResults();
  }

  function handleEnded(message) {
    game.scores = message.payload?.scores || game.scores;
    game.status = "ended";
    stopDrawing();
    showResults();
  }

  function showResults() {
    const players = [...game.players].sort((a, b) =>
      Number(game.scores[b.id] || 0) -
      Number(game.scores[a.id] || 0)
    );

    const content = document.querySelector(
      "#drawGuessOverlay [data-dg-content]"
    );

    if (!content) return;

    content.className = "dg-setup";
    content.innerHTML = `
      <div class="dg-setup-icon">🏆</div>
      <h3>Game finished!</h3>

      <p class="muted-text">
        Every available participant completed a drawing turn.
      </p>

      <div>
        ${players.map((player, index) => `
          <div class="dg-player">
            <strong>
              ${index === 0 ? "👑" : `${index + 1}.`}
              ${escapeHtml(player.name)}
              ${player.id === game.playerId
                ? '<small class="dg-player-you">(you)</small>'
                : ""}
            </strong>
            <span>${Number(game.scores[player.id] || 0)} pts</span>
          </div>
        `).join("")}
      </div>

      <button type="button" class="primary-btn" data-dg-close>
        Return to library
      </button>
    `;

    document.querySelector("[data-dg-status]").textContent =
      "Final leaderboard";
  }

  async function leaveRoom(closeOverlay = true) {
    clearInterval(game.timer);
    clearTimeout(game.nextRoundTimer);

    game.timer = null;
    game.nextRoundTimer = null;
    game.drawing = false;
    game.lastPoint = null;

    const canvas = document.querySelector("#drawGuessCanvas");
    canvas?._dgResizeObserver?.disconnect();

    if (game.channel && game.client) {
      try {
        await game.channel.untrack();
        await game.client.removeChannel(game.channel);
      } catch {
        // Continue closing.
      }
    }

    game.channel = null;
    game.code = "";
    game.artistId = "";
    game.word = "";
    game.lastWord = "";
    game.wordChoices = [];
    game.pendingChoices = [];
    game.maskedWord = "";
    game.players = [];
    game.scores = {};
    game.turnOrder = [];
    game.turnIndex = 0;
    game.guessed.clear();
    game.status = "waiting";
    game.round = 0;

    if (closeOverlay) {
      document.querySelector("#drawGuessOverlay")
        ?.classList.add("hidden");
      document.body.classList.remove("overlay-open");
    }
  }

  async function copyCode() {
    if (!game.code) return;

    try {
      await navigator.clipboard.writeText(game.code);
      showMessage(`Room code copied: ${game.code}`);
    } catch {
      showMessage(`Room code: ${game.code}`);
    }
  }

  function bindEvents() {
    document.addEventListener("click", (event) => {
      if (event.target.closest("[data-dg-host]")) {
        event.preventDefault();
        showSetup("host");
        return;
      }

      if (event.target.closest("[data-dg-join]")) {
        event.preventDefault();
        showSetup("join");
        return;
      }

      if (event.target.closest("[data-dg-close]")) {
        event.preventDefault();
        void leaveRoom();
        return;
      }

      if (event.target.closest("[data-dg-copy]")) {
        event.preventDefault();
        void copyCode();
        return;
      }

      if (event.target.closest("[data-dg-start]")) {
        event.preventDefault();
        startGame();
        return;
      }

      const wordChoice = event.target.closest("[data-dg-word-choice]");

      if (wordChoice) {
        event.preventDefault();
        chooseWord(wordChoice.dataset.dgWordChoice);
        return;
      }

      if (event.target.closest("[data-dg-clear]")) {
        event.preventDefault();

        if (canDraw()) {
          clearCanvasLocal();
          void send("clear", { artistId: game.playerId });
        }

        return;
      }

      const color = event.target.closest("[data-dg-color]");

      if (color && canDraw()) {
        game.color = color.dataset.dgColor;

        document
          .querySelectorAll("[data-dg-color]")
          .forEach((button) => {
            button.classList.toggle("active", button === color);
          });
      }
    });

    document.addEventListener("input", (event) => {
      if (event.target.matches("[data-dg-size]") && canDraw()) {
        game.width = Number(event.target.value || 6);
      }

      if (event.target.name === "roomCode") {
        event.target.value = event.target.value
          .toUpperCase()
          .replace(/[^A-Z0-9]/g, "")
          .slice(0, 6);
      }
    });

    document.addEventListener("submit", async (event) => {
      const setup = event.target.closest("[data-dg-setup-form]");

      if (setup) {
        event.preventDefault();

        const mode = setup.dataset.dgSetupForm;
        const name = String(setup.elements.playerName.value || "")
          .replace(/\s+/g, " ")
          .trim()
          .slice(0, 32);

        const code =
          mode === "host"
            ? randomCode()
            : String(setup.elements.roomCode.value || "")
              .toUpperCase()
              .replace(/[^A-Z0-9]/g, "")
              .slice(0, 6);

        if (name.length < 2) {
          showMessage(
            "Enter a display name with at least two characters."
          );
          return;
        }

        if (!/^[A-Z0-9]{6}$/.test(code)) {
          showMessage("Enter a valid six-character room code.");
          return;
        }

        const button = setup.querySelector('button[type="submit"]');
        button.disabled = true;
        button.textContent = "Connecting…";

        try {
          await connectRoom(code, name, mode === "host");

          showMessage(
            mode === "host"
              ? `Room created: ${code}`
              : `Joined room ${code}`
          );
        } catch (error) {
          console.error(error);
          showMessage(error.message || "The room could not be opened.");

          button.disabled = false;
          button.textContent =
            mode === "host" ? "Create room" : "Join room";
        }

        return;
      }

      if (event.target.matches("[data-dg-guess-form]")) {
        event.preventDefault();

        const input = event.target.elements.guess;
        submitGuess(input.value);
        input.value = "";
        input.focus();
      }
    });

    document.addEventListener("keydown", (event) => {
      if (
        event.key === "Escape" &&
        !document.querySelector("#drawGuessOverlay")
          ?.classList.contains("hidden")
      ) {
        void leaveRoom();
      }
    });

    window.addEventListener("beforeunload", () => {
      clearInterval(game.timer);
      clearTimeout(game.nextRoundTimer);
      game.channel?.untrack();
    });
  }

  function observeLibrary() {
    const observer = new MutationObserver(addLibraryEntry);

    observer.observe(document.body, {
      childList: true,
      subtree: true
    });
  }

  function initialize() {
    createOverlay();
    addLibraryEntry();
    bindEvents();
    observeLibrary();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initialize, {
      once: true
    });
  } else {
    initialize();
  }
})();
