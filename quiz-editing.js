(() => {
  let editingQuizId = null;

  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => [
    ...root.querySelectorAll(selector)
  ];

  function readStorage(key, fallback) {
    try {
      const value = localStorage.getItem(key);
      return value === null ? fallback : JSON.parse(value);
    } catch {
      return fallback;
    }
  }

  function writeStorage(key, value) {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch {
      showMessage("Unable to save changes in this browser.");
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
    const toast = $("#notificationToast");

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
    }, 3000);
  }

  function getCurrentUser() {
    return readStorage("quiletUser", null);
  }

  function getQuizzes() {
    const quizzes = readStorage("quiletQuizzes", []);
    return Array.isArray(quizzes) ? quizzes : [];
  }

  function getQuizOwnerId(quiz) {
    return quiz?.ownerId ??
      quiz?.owner_id ??
      quiz?.userId ??
      quiz?.user_id ??
      null;
  }

  function ownsQuiz(quiz) {
    const user = getCurrentUser();
    if (!user || !quiz) return false;

    const ownerId = getQuizOwnerId(quiz);

    return ownerId === null ||
      String(ownerId) === String(user.id);
  }

  function findQuiz(id) {
    return getQuizzes().find(
      (quiz) => String(quiz.id) === String(id)
    );
  }

  function addStyles() {
    if ($("#quizEditingStyles")) return;

    const style = document.createElement("style");
    style.id = "quizEditingStyles";
    style.textContent = `
      #quizList .quiz-actions [data-edit-quiz] {
        min-width: 0;
        max-width: 100%;
        white-space: normal;
      }

      #mainTopbar .user-actions > #installAppBtn {
        min-width: 0;
        max-width: 100%;
      }

      @media (max-width: 640px) {
        #quizList .quiz-actions [data-edit-quiz] {
          width: 100%;
        }
      }
    `;

    document.head.appendChild(style);
  }

  function createQuestionBlock(question, index) {
    const block = document.createElement("article");
    block.className = "question-card";

    block.innerHTML = `
      <div class="question-head">
        <strong class="question-number">Question ${index + 1}</strong>

        <button
          type="button"
          class="tiny-btn danger remove-question"
        >
          Remove
        </button>
      </div>

      <label>
        Question
        <input
          name="question"
          maxlength="300"
          required
          value="${escapeHtml(question?.text || "")}"
          placeholder="Write a clear question"
        />
      </label>

      <div class="option-grid">
        ${[0, 1, 2, 3].map((optionIndex) => `
          <input
            name="option"
            maxlength="180"
            required
            value="${escapeHtml(
              question?.options?.[optionIndex] || ""
            )}"
            placeholder="Answer option ${optionIndex + 1}"
          />
        `).join("")}
      </div>

      <label>
        Correct answer
        <select name="correct">
          ${[0, 1, 2, 3].map((optionIndex) => `
            <option
              value="${optionIndex}"
              ${
                Number(question?.correct) === optionIndex
                  ? "selected"
                  : ""
              }
            >
              Answer option ${optionIndex + 1}
            </option>
          `).join("")}
        </select>
      </label>
    `;

    return block;
  }

  function setSelectValue(select, value) {
    if (!select) return;

    const normalized = String(value || "");
    const exists = [...select.options].some(
      (option) => option.value === normalized
    );

    select.value = exists ? normalized : "";
  }

  function setEditorState(editing, quiz = null) {
    const heading = $("#createView .panel-head h2");
    const submitButton = $('#quizForm button[type="submit"]');
    const cancelButton = $("#cancelEditBtn");

    if (heading) {
      heading.textContent = editing
        ? "Edit your quiz"
        : "Create a new quiz";
    }

    if (submitButton) {
      submitButton.textContent = editing
        ? "Update quiz"
        : "Save quiz";
    }

    cancelButton?.classList.toggle("hidden", !editing);
    editingQuizId = editing && quiz ? quiz.id : null;
  }

  function setVisibility(quizId) {
    const metadata = readStorage("quiletQuizMetadata", {});
    const visibility =
      metadata?.[String(quizId)]?.visibility || "private";

    const input = $(
      `#quizForm [name="visibility"][value="${visibility}"]`
    );

    if (input) input.checked = true;
  }

  function closeMobileMenu() {
    $("#mainTopbar")?.classList.remove("menu-open");

    $("#topbarActions")?.classList.remove(
      "mobile-menu-open"
    );

    const hamburger = $("#hamburgerBtn");

    hamburger?.setAttribute("aria-expanded", "false");
    hamburger?.setAttribute("aria-label", "Open navigation");
  }

  function openEditor(quizId) {
    const quiz = findQuiz(quizId);

    if (!quiz) {
      showMessage("Quiz could not be found.");
      return;
    }

    if (!ownsQuiz(quiz)) {
      showMessage("Only the quiz owner can edit this quiz.");
      return;
    }

    const form = $("#quizForm");
    const questions = $("#questionFields");

    if (!form || !questions) return;

    form.reset();

    const title = $("#quizTitle");
    const description = $("#quizDescription");
    const category = $("#quizCategory");

    if (title) title.value = quiz.title || "";
    if (description) {
      description.value = quiz.description || "";
    }
    if (category) category.value = quiz.category || "";

    setSelectValue($("#quizSubject"), quiz.subject || "");
    setSelectValue(
      $("#quizDifficulty"),
      quiz.difficulty || "medium"
    );

    questions.replaceChildren();

    const quizQuestions = Array.isArray(quiz.questions)
      ? quiz.questions
      : [];

    if (quizQuestions.length) {
      quizQuestions.forEach((question, index) => {
        questions.appendChild(
          createQuestionBlock(question, index)
        );
      });
    } else {
      questions.appendChild(createQuestionBlock(null, 0));
    }

    setVisibility(quiz.id);
    setEditorState(true, quiz);

    $$(".view").forEach((view) => {
      view.classList.remove("active");
    });

    $("#createView")?.classList.add("active");

    $$(".nav-btn").forEach((button) => {
      button.classList.toggle(
        "active",
        button.dataset.view === "create"
      );
    });

    localStorage.setItem("quiletActiveView", "create");
    closeMobileMenu();

    window.scrollTo({
      top: 0,
      behavior: window.matchMedia?.(
        "(prefers-reduced-motion: reduce)"
      ).matches
        ? "auto"
        : "smooth"
    });

    requestAnimationFrame(() => {
      $("#quizTitle")?.focus();
    });
  }

  function resetEditor() {
    const form = $("#quizForm");
    const questions = $("#questionFields");

    editingQuizId = null;
    form?.reset();

    if (questions) {
      questions.replaceChildren(
        createQuestionBlock(null, 0)
      );
    }

    setEditorState(false);
  }

  function cancelEditing() {
    if (editingQuizId === null) return;

    resetEditor();
    $('[data-view="library"]')?.click();
    showMessage("Quiz editing cancelled.");
  }

  function readEditorQuiz(form, existingQuiz) {
    const data = new FormData(form);

    const questions = $$(
      "#questionFields .question-card",
      form
    ).map((block) => ({
      text:
        $('[name="question"]', block)?.value.trim() || "",
      options: $$('[name="option"]', block).map(
        (input) => input.value.trim()
      ),
      correct: Number(
        $('[name="correct"]', block)?.value || 0
      )
    }));

    return {
      ...existingQuiz,
      title: String(data.get("title") || "").trim(),
      subject:
        String(data.get("subject") || "").trim() ||
        "General",
      description: String(
        data.get("description") || ""
      ).trim(),
      difficulty: String(
        data.get("difficulty") || "medium"
      ),
      category: String(data.get("category") || "").trim(),
      questions,
      ownerId:
        getQuizOwnerId(existingQuiz) ??
        getCurrentUser()?.id ??
        null,
      updatedAt: new Date().toISOString()
    };
  }

  function validateUpdatedQuiz(quiz) {
    if (!quiz.title) {
      showMessage("Enter a quiz title.");
      $("#quizTitle")?.focus();
      return false;
    }

    if (!quiz.questions.length) {
      showMessage("Add at least one question.");
      return false;
    }

    const incomplete = quiz.questions.some(
      (question) =>
        !question.text ||
        question.options.length !== 4 ||
        question.options.some((option) => !option) ||
        !Number.isInteger(question.correct) ||
        question.correct < 0 ||
        question.correct > 3
    );

    if (incomplete) {
      showMessage(
        "Complete every question and answer option."
      );
      return false;
    }

    return true;
  }

  function updateQuiz(event) {
    if (editingQuizId === null) return;

    event.preventDefault();
    event.stopImmediatePropagation();

    const form = event.currentTarget;
    const quizzes = getQuizzes();

    const index = quizzes.findIndex(
      (quiz) =>
        String(quiz.id) === String(editingQuizId)
    );

    if (index < 0) {
      showMessage("Quiz could not be found.");
      resetEditor();
      return;
    }

    const existingQuiz = quizzes[index];

    if (!ownsQuiz(existingQuiz)) {
      showMessage(
        "Only the quiz owner can edit this quiz."
      );
      return;
    }

    const updatedQuiz = readEditorQuiz(
      form,
      existingQuiz
    );

    if (!validateUpdatedQuiz(updatedQuiz)) return;

    quizzes[index] = updatedQuiz;
    writeStorage("quiletQuizzes", quizzes);

    window.dispatchEvent(
      new CustomEvent("quilet:quiz-updated", {
        detail: updatedQuiz
      })
    );

    showMessage("Quiz updated successfully.");
    editingQuizId = null;

    setTimeout(() => {
      localStorage.setItem(
        "quiletActiveView",
        "library"
      );
      window.location.reload();
    }, 250);
  }

  function addEditButtons() {
    if (!getCurrentUser()) return;

    $$("#quizList .quiz-card").forEach((card) => {
      if (card.querySelector("[data-edit-quiz]")) {
        return;
      }

      const playButton = card.querySelector(
        "[data-play-quiz]"
      );

      const actions = card.querySelector(".quiz-actions");
      const quiz = findQuiz(
        playButton?.dataset.playQuiz
      );

      if (!actions || !quiz || !ownsQuiz(quiz)) {
        return;
      }

      const button = document.createElement("button");
      button.type = "button";
      button.className = "secondary-btn";
      button.dataset.editQuiz = String(quiz.id);
      button.textContent = "Edit quiz";

      const deleteButton = actions.querySelector(
        "[data-delete-quiz]"
      );

      actions.insertBefore(button, deleteButton || null);
    });
  }

  function observeQuizList() {
    const list = $("#quizList");

    if (!list || list.dataset.editObserverBound) {
      return;
    }

    list.dataset.editObserverBound = "true";

    const observer = new MutationObserver(() => {
      requestAnimationFrame(addEditButtons);
    });

    observer.observe(list, {
      childList: true
    });
  }

  function bindEvents() {
    $("#quizForm")?.addEventListener(
      "submit",
      updateQuiz,
      true
    );

    document.addEventListener("click", (event) => {
      const editButton = event.target.closest(
        "[data-edit-quiz]"
      );

      if (editButton) {
        event.preventDefault();
        event.stopImmediatePropagation();
        openEditor(editButton.dataset.editQuiz);
        return;
      }

      if (event.target.closest("#cancelEditBtn")) {
        event.preventDefault();
        event.stopImmediatePropagation();
        cancelEditing();
        return;
      }

      if (
        event.target.closest('[data-view="library"]') ||
        event.target.closest('[data-view="home"]')
      ) {
        requestAnimationFrame(addEditButtons);
      }
    }, true);

    window.addEventListener("storage", (event) => {
      if (
        event.key === "quiletQuizzes" ||
        event.key === "quiletUser"
      ) {
        requestAnimationFrame(addEditButtons);
      }
    });
  }

  function markCoreReady() {
    document.documentElement.dataset.quiletReady = "true";
    document.documentElement.classList.remove(
      "restoring-session"
    );
  }

  function initialize() {
    addStyles();
    addEditButtons();
    observeQuizList();
    bindEvents();
    markCoreReady();
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
