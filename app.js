// App State
// Active question set selection (1: 第1セット簡単, 2: 第2セット標準, 3: 第3セット標準)
let selectedSetId = 1;

// Set metadata dictionary for preview info
const setMetaInfo = {
  1: {
    badge: "第1回",
    title: "第1セット（簡単・基礎）",
    desc: "全50問・重要用語・定義・基本ルールの総点検"
  },
  2: {
    badge: "第2回",
    title: "第2セット（標準難度）",
    desc: "全50問・教則第5版準拠（法規・機体システム・気象・CRM網羅）"
  },
  3: {
    badge: "第3回",
    title: "第3セット（標準難度）",
    desc: "全50問・教則第5版準拠（捜索特例・気象・運航リスク・CRM網羅）"
  },
  4: {
    badge: "第4回",
    title: "第4セット（標準難度）",
    desc: "全50問・教則第5版準拠（河川港湾法規・PID制御・フェールセーフ・気象応用）"
  },
  5: {
    badge: "第5回",
    title: "第5セット（標準難度）",
    desc: "全50問・教則第5版準拠（航空法規・機体システム・局地気象・CRM網羅）"
  },
  6: {
    badge: "第6回",
    title: "第6セット（標準難度）",
    desc: "全50問・教則第5版準拠（航空法深層・VRS・気圧傾度・リスクアセスメント）"
  }
};

function getSetQuestions(setId) {
  if (setId === 6 && typeof questionsSet6 !== "undefined") {
    return questionsSet6;
  }
  if (setId === 5 && typeof questionsSet5 !== "undefined") {
    return questionsSet5;
  }
  if (setId === 4 && typeof questionsSet4 !== "undefined") {
    return questionsSet4;
  }
  if (setId === 3 && typeof questionsSet3 !== "undefined") {
    return questionsSet3;
  }
  if (setId === 2 && typeof questionsSet2 !== "undefined") {
    return questionsSet2;
  }
  return typeof questionsSet1 !== "undefined" ? questionsSet1 : [];
}

// activeQuestions contains the array of questions currently being worked on (all 50 or filtered mistakes)
let activeQuestions = [...getSetQuestions(selectedSetId)];
let currentIndex = 0;
// userAnswers map keyed by question id:
// userAnswers[qId] = { selectedOptionIndex: number, isCorrect: boolean }
const userAnswers = {};

// History of all questions ever answered wrong across sessions (Set of question ids)
const everWrongQuestionIds = new Set();

// Timer State (30 minutes = 1800 seconds)
const EXAM_DURATION_SECONDS = 30 * 60;
let remainingSeconds = EXAM_DURATION_SECONDS;
let timerInterval = null;
let isTimerRunning = false;
let hasNotifiedTimeUp = false;

// DOM Elements
const qIndexText = document.getElementById("q-index");
const totalQText = document.getElementById("total-q");
const progressFill = document.getElementById("progress-fill");
const wrongCountBadge = document.getElementById("wrong-count");
const correctCountBadge = document.getElementById("correct-count");

const timerBadge = document.getElementById("timer-badge");
const timerDisplay = document.getElementById("timer-display");
const timeupModal = document.getElementById("timeup-modal");
const btnTimeupResult = document.getElementById("btn-timeup-result");
const btnTimeupContinue = document.getElementById("btn-timeup-continue");

const startView = document.getElementById("start-view");
const btnStartExam = document.getElementById("btn-start-exam");
const quizView = document.getElementById("quiz-view");
const resultView = document.getElementById("result-view");
const appFooter = document.querySelector(".app-footer");

const qNumDisplay = document.getElementById("q-num");
const qBodyDisplay = document.getElementById("q-body");
const optionsContainer = document.getElementById("options-container");

const btnPrev = document.getElementById("btn-prev");
const btnNext = document.getElementById("btn-next");
const btnRestart = document.getElementById("btn-restart");
const btnRetryMistakes = document.getElementById("btn-retry-mistakes");
const btnClose = document.getElementById("btn-close");

const letters = ["A", "B", "C", "D"];

// Timer Functions
function startTimer() {
  if (timerInterval) clearInterval(timerInterval);
  isTimerRunning = true;
  updateTimerUI();

  timerInterval = setInterval(() => {
    if (remainingSeconds > 0) {
      remainingSeconds--;
      updateTimerUI();

      if (remainingSeconds === 0 && !hasNotifiedTimeUp) {
        hasNotifiedTimeUp = true;
        handleTimeUp();
      }
    }
  }, 1000);
}

function stopTimer() {
  if (timerInterval) {
    clearInterval(timerInterval);
    timerInterval = null;
  }
  isTimerRunning = false;
}

function resetTimer() {
  stopTimer();
  remainingSeconds = EXAM_DURATION_SECONDS;
  hasNotifiedTimeUp = false;
  if (timerBadge) {
    timerBadge.classList.remove("warning", "danger");
  }
  updateTimerUI();
}

function updateTimerUI() {
  if (!timerDisplay) return;

  const mins = Math.floor(remainingSeconds / 60);
  const secs = remainingSeconds % 60;
  const formatted = `${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
  timerDisplay.textContent = formatted;

  if (timerBadge) {
    if (remainingSeconds <= 300 && remainingSeconds > 60) {
      // 5分以下：注意色（黄色）
      timerBadge.classList.add("warning");
      timerBadge.classList.remove("danger");
    } else if (remainingSeconds <= 60) {
      // 1分以下：警告色（赤＆パルスアニメーション）
      timerBadge.classList.remove("warning");
      timerBadge.classList.add("danger");
    } else {
      timerBadge.classList.remove("warning", "danger");
    }
  }
}

function handleTimeUp() {
  // Show popup modal notification
  if (timeupModal) {
    timeupModal.classList.add("active");
  }
}

// Initialize
function initApp(questionsList, startNewTimer = true) {
  if (!questionsList) {
    questionsList = typeof questionsSet1 !== "undefined" ? questionsSet1 : [];
  }
  activeQuestions = [...questionsList];
  currentIndex = 0;
  totalQText.textContent = activeQuestions.length;
  
  if (startNewTimer) {
    resetTimer();
    startTimer();
  }

  renderQuestion(currentIndex);
  updateScoreAndProgress();
}

// Render question at activeQuestions[index]
function renderQuestion(index) {
  if (!activeQuestions || activeQuestions.length === 0) return;

  const currentQ = activeQuestions[index];
  qIndexText.textContent = index + 1;
  // Display original question ID or sequence number
  qNumDisplay.textContent = `問題${currentQ.id}`;
  qBodyDisplay.textContent = currentQ.question;

  // Clear options
  optionsContainer.innerHTML = "";

  const answeredState = userAnswers[currentQ.id];

  currentQ.options.forEach((optText, i) => {
    const optNumber = i + 1; // 1-based answer matches currentQ.answer
    const isThisCorrect = optNumber === currentQ.answer;

    const optEl = document.createElement("div");
    optEl.className = "option-item";
    optEl.dataset.index = i;

    // Header badge content for option
    let statusBadgeHtml = "";
    if (isThisCorrect) {
      statusBadgeHtml = `
        <span class="opt-status-badge is-correct">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
          答え
        </span>
      `;
    } else {
      statusBadgeHtml = `
        <span class="opt-status-badge is-wrong">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
          不正解
        </span>
      `;
    }

    optEl.innerHTML = `
      <div class="option-main">
        <div class="option-left">
          <span class="opt-char">${letters[i]}.</span>
          <span class="opt-text">
            ${optText}
            <span class="user-tag">（あなたの解答）</span>
          </span>
        </div>
        ${statusBadgeHtml}
      </div>
      <div class="option-explanation">${currentQ.explanation}</div>
    `;

    // Apply state if already answered
    if (answeredState) {
      optEl.classList.add("locked");
      if (isThisCorrect) {
        optEl.classList.add("correct-choice", "show-explanation");
      } else if (answeredState.selectedOptionIndex === i) {
        optEl.classList.add("wrong-choice");
      }
    } else {
      // Add click handler
      optEl.addEventListener("click", () => handleSelectOption(currentQ.id, i));
    }

    optionsContainer.appendChild(optEl);
  });

  // Update navigation buttons
  btnPrev.disabled = index === 0;
  if (index === activeQuestions.length - 1) {
    btnNext.textContent = "結果を見る";
  } else {
    btnNext.textContent = "次へ";
  }

  // Scroll to top of content
  window.scrollTo({ top: 0, behavior: "smooth" });
}

// Option selection handler
function handleSelectOption(qId, selectedOptionIdx) {
  if (userAnswers[qId]) return; // already answered

  const currentQ = activeQuestions.find(q => q.id === qId);
  if (!currentQ) return;
  const isCorrect = (selectedOptionIdx + 1) === currentQ.answer;

  userAnswers[qId] = {
    selectedOptionIndex: selectedOptionIdx,
    isCorrect: isCorrect
  };

  if (!isCorrect) {
    everWrongQuestionIds.add(qId);
  }

  updateScoreAndProgress();
  renderQuestion(currentIndex);
}

// Update Score and Progress Bar for current active set
function updateScoreAndProgress() {
  let correctCount = 0;
  let wrongCount = 0;

  activeQuestions.forEach(q => {
    const ans = userAnswers[q.id];
    if (ans) {
      if (ans.isCorrect) correctCount++;
      else wrongCount++;
    }
  });

  correctCountBadge.textContent = correctCount;
  wrongCountBadge.textContent = wrongCount;

  const progressPercent = activeQuestions.length > 0 
    ? ((currentIndex + 1) / activeQuestions.length) * 100 
    : 0;
  progressFill.style.width = `${progressPercent}%`;
  totalQText.textContent = activeQuestions.length;
}

// Navigation Events
btnPrev.addEventListener("click", () => {
  if (currentIndex > 0) {
    currentIndex--;
    renderQuestion(currentIndex);
    updateScoreAndProgress();
  }
});

btnNext.addEventListener("click", () => {
  if (currentIndex < activeQuestions.length - 1) {
    currentIndex++;
    renderQuestion(currentIndex);
    updateScoreAndProgress();
  } else {
    showResultScreen();
  }
});

// Show Result Screen
function showResultScreen() {
  stopTimer();
  if (timeupModal) {
    timeupModal.classList.remove("active");
  }

  quizView.style.display = "none";
  document.querySelector(".app-footer").style.display = "none";
  resultView.style.display = "block";

  let correctCount = 0;
  let wrongCount = 0;
  activeQuestions.forEach(q => {
    const ans = userAnswers[q.id];
    if (ans && ans.isCorrect) {
      correctCount++;
    } else {
      wrongCount++;
    }
  });

  const total = activeQuestions.length;
  const scorePercent = total > 0 ? Math.round((correctCount / total) * 100) : 0;
  const isPassed = scorePercent >= 80;

  const scoreDisplay = document.getElementById("result-score");
  const descDisplay = document.getElementById("result-desc");
  const titleDisplay = document.getElementById("result-title");

  // Format time taken
  const timeUsedSeconds = EXAM_DURATION_SECONDS - remainingSeconds;
  const usedMins = Math.floor(timeUsedSeconds / 60);
  const usedSecs = timeUsedSeconds % 60;
  const timeTakenStr = `${usedMins}分${usedSecs}秒`;

  scoreDisplay.textContent = `${correctCount} / ${total}問 (${scorePercent}%)`;
  titleDisplay.textContent = isPassed ? "合格基準達成！ 🎉" : "お疲れ様でした！";
  descDisplay.innerHTML = isPassed
    ? `おめでとうございます！所要時間 <strong>${timeTakenStr}</strong> で合格ライン（80%以上）をクリアしました。<br>本番に向けてさらに理解を深めましょう。`
    : `所要時間: <strong>${timeTakenStr}</strong>（基準時間30分）<br>正答率80%以上が合格基準の目安です。<br>間違えた問題を中心に復習を繰り返しましょう！`;

  // Find questions that were answered incorrectly in this current session
  const wrongQuestions = activeQuestions.filter(q => {
    const ans = userAnswers[q.id];
    return ans && !ans.isCorrect;
  });

  if (wrongQuestions.length > 0) {
    btnRetryMistakes.style.display = "block";
    btnRetryMistakes.textContent = `間違えた問題（${wrongQuestions.length}問）を解き直す`;
  } else {
    btnRetryMistakes.style.display = "none";
  }
}

// Modal Event Listeners
if (btnTimeupResult) {
  btnTimeupResult.addEventListener("click", () => {
    timeupModal.classList.remove("active");
    showResultScreen();
  });
}

if (btnTimeupContinue) {
  btnTimeupContinue.addEventListener("click", () => {
    timeupModal.classList.remove("active");
  });
}

// Show Start Cover Screen
function showStartScreen() {
  stopTimer();
  resetTimer();
  for (let key in userAnswers) delete userAnswers[key];
  everWrongQuestionIds.clear();

  const shutterCurtain = document.getElementById("shutter-curtain");
  if (shutterCurtain) {
    shutterCurtain.classList.remove("wipe-cut");
  }

  if (startView) {
    startView.classList.remove("transition-out");
    startView.style.display = "flex";
  }
  if (quizView) {
    quizView.classList.remove("slide-in-up");
    quizView.style.display = "none";
  }
  if (resultView) resultView.style.display = "none";
  if (appFooter) appFooter.style.display = "none";
  if (timeupModal) timeupModal.classList.remove("active");

  activeQuestions = [...getSetQuestions(selectedSetId)];
  currentIndex = 0;
  totalQText.textContent = activeQuestions.length;
  updateScoreAndProgress();
}

// Smooth Screen Transition Helper (Upward shutter cut)
let isTransitioning = false;
function executeWithTransition(onPeakCallback) {
  if (isTransitioning) return;
  isTransitioning = true;

  const shutterCurtain = document.getElementById("shutter-curtain");

  // Add transition-out to currently visible containers
  if (startView && startView.style.display !== "none") {
    startView.classList.add("transition-out");
  }
  if (resultView && resultView.style.display !== "none") {
    resultView.classList.add("transition-out");
  }

  // Trigger upward shutter wipe
  if (shutterCurtain) {
    shutterCurtain.classList.remove("wipe-cut");
    void shutterCurtain.offsetWidth; // Force reflow
    shutterCurtain.classList.add("wipe-cut");
  }

  // Execute screen switch and data init right as shutter reaches top coverage (280ms)
  setTimeout(() => {
    if (startView) startView.classList.remove("transition-out");
    if (resultView) resultView.classList.remove("transition-out");

    onPeakCallback();
    isTransitioning = false;
  }, 280);
}

// Setup Set Selection Dropdown
function setupSetSelection() {
  const setDropdown = document.getElementById("exam-set-select");
  const detailBadge = document.getElementById("set-detail-badge");
  const detailTitle = document.getElementById("set-detail-title");
  const detailDesc = document.getElementById("set-detail-desc");

  function updateSetPreview(setId) {
    const meta = setMetaInfo[setId] || {
      badge: `第${setId}回`,
      title: `第${setId}セット`,
      desc: "全50問・教則第5版準拠"
    };
    if (detailBadge) detailBadge.textContent = meta.badge;
    if (detailTitle) detailTitle.textContent = meta.title;
    if (detailDesc) detailDesc.textContent = meta.desc;
  }

  if (setDropdown) {
    // Sync initial state
    setDropdown.value = String(selectedSetId);
    updateSetPreview(selectedSetId);

    setDropdown.addEventListener("change", (e) => {
      selectedSetId = parseInt(e.target.value, 10) || 1;
      updateSetPreview(selectedSetId);
    });
  }
}

// Start Exam Button Click Handler with cool upward wipe transition
if (btnStartExam) {
  btnStartExam.addEventListener("click", () => {
    executeWithTransition(() => {
      if (startView) startView.style.display = "none";
      if (quizView) {
        quizView.style.display = "block";
        quizView.classList.add("slide-in-up");
      }
      if (appFooter) appFooter.style.display = "flex";

      const chosenQuestions = getSetQuestions(selectedSetId);
      initApp(chosenQuestions, true);
    });
  });
}

// Restart entire quiz with all 50 questions
btnRestart.addEventListener("click", () => {
  executeWithTransition(() => {
    showStartScreen();
  });
});

// Retry ONLY mistaken questions from active set
btnRetryMistakes.addEventListener("click", () => {
  // Filter activeQuestions that were incorrect
  const wrongQuestions = activeQuestions.filter(q => {
    const ans = userAnswers[q.id];
    return ans && !ans.isCorrect;
  });

  if (wrongQuestions.length === 0) return;

  // Reset the answer status for these mistaken questions so user can answer again fresh
  wrongQuestions.forEach(q => {
    delete userAnswers[q.id];
  });

  executeWithTransition(() => {
    if (startView) startView.style.display = "none";
    resultView.style.display = "none";
    quizView.style.display = "block";
    quizView.classList.add("slide-in-up");
    if (appFooter) appFooter.style.display = "flex";

    // Re-initialize with ONLY the mistaken questions
    initApp(wrongQuestions, false);
  });
});

// Header Reset Button (X mark)
if (btnClose) {
  btnClose.addEventListener("click", () => {
    if (confirm("試験を中断して最初の表紙画面に戻りますか？")) {
      showStartScreen();
    }
  });
}

// Start app on load - Show Cover Page First
document.addEventListener("DOMContentLoaded", () => {
  setupSetSelection();
  showStartScreen();
});
