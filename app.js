// App State
// Active question set selection (1: 第1セット簡単, 2: 第2セット標準, ...)
let selectedSetId = 1;
// Exam Mode: "real" (本番モード: 正誤非表示・一括採点・保留あり) or "practice" (練習モード: 1問ごと即時判定)
let currentExamMode = "real";
// Examination review state: true after real exam grading is completed, enables reviewing explanations
let isRealExamGraded = false;

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
  },
  7: {
    badge: "第7回",
    title: "第7セット（標準難度）",
    desc: "全50問・教則第5版準拠（総合演習・法規・機体システム・気象・安全運航）"
  },
  8: {
    badge: "特集",
    title: "【徹底対策】航空法 50問",
    desc: "全50問・航空法および運航ルール・安全基準の徹底対策問題"
  },
  9: {
    badge: "特集",
    title: "【徹底対策】機体構造・飛行原理 50問",
    desc: "全50問・機体構造・飛行原理・各種センサー・バッテリー特性の徹底対策問題"
  },
  10: {
    badge: "特集",
    title: "【徹底対策】気象・自然現象 50問",
    desc: "全50問・気象現象・大気の安定度・局地風・視程・バッテリーへの気温影響の徹底対策問題"
  }
};

function getSetQuestions(setId) {
  if (setId === 10 && typeof questionsSet10 !== "undefined") return questionsSet10;
  if (setId === 9 && typeof questionsSet9 !== "undefined") return questionsSet9;
  if (setId === 8 && typeof questionsSet8 !== "undefined") return questionsSet8;
  if (setId === 7 && typeof questionsSet7 !== "undefined") return questionsSet7;
  if (setId === 6 && typeof questionsSet6 !== "undefined") return questionsSet6;
  if (setId === 5 && typeof questionsSet5 !== "undefined") return questionsSet5;
  if (setId === 4 && typeof questionsSet4 !== "undefined") return questionsSet4;
  if (setId === 3 && typeof questionsSet3 !== "undefined") return questionsSet3;
  if (setId === 2 && typeof questionsSet2 !== "undefined") return questionsSet2;
  return typeof questionsSet1 !== "undefined" ? questionsSet1 : [];
}

// activeQuestions contains the array of questions currently being worked on
let activeQuestions = [...getSetQuestions(selectedSetId)];
let currentIndex = 0;

// userAnswers map keyed by question id:
// userAnswers[qId] = { selectedOptionIndex: number, isCorrect: boolean }
const userAnswers = {};

// flaggedQuestionIds: Set of question IDs marked for later review ("後で見直す")
const flaggedQuestionIds = new Set();
// isReviewingFlaggedOnly: true when user clicks "後で見直す問題を順に表示"
let isReviewingFlaggedOnly = false;
// isRetryingMistakes: true when user clicks "間違えた問題を解き直す"
let isRetryingMistakes = false;
// isReviewingAll: true when user clicks "全問題の解説と解答を見る" after grading
let isReviewingAll = false;

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
const scoreBadges = document.querySelector(".score-badges");

const timerBadge = document.getElementById("timer-badge");
const timerDisplay = document.getElementById("timer-display");
const timeupModal = document.getElementById("timeup-modal");
const btnTimeupResult = document.getElementById("btn-timeup-result");
const btnTimeupContinue = document.getElementById("btn-timeup-continue");

const startView = document.getElementById("start-view");
const btnStartExam = document.getElementById("btn-start-exam");
const quizView = document.getElementById("quiz-view");
const resultView = document.getElementById("result-view");
const appHeader = document.querySelector(".app-header");
const appFooter = document.querySelector(".app-footer");

const qNumDisplay = document.getElementById("q-num");
const qBodyDisplay = document.getElementById("q-body");
const optionsContainer = document.getElementById("options-container");
const btnBookmark = document.getElementById("btn-bookmark");

const btnPrev = document.getElementById("btn-prev");
const btnNext = document.getElementById("btn-next");
const btnGradeFooter = document.getElementById("btn-grade-footer");
const btnOpenStatus = document.getElementById("btn-open-status");

const btnRestart = document.getElementById("btn-restart");
const btnRetryMistakes = document.getElementById("btn-retry-mistakes");
const btnReviewAll = document.getElementById("btn-review-all");
const btnClose = document.getElementById("btn-close");

// Status Modal Elements
const statusModal = document.getElementById("status-modal");
const btnCloseStatus = document.getElementById("btn-close-status");
const btnBackToQuiz = document.getElementById("btn-back-to-quiz");
const btnModalGrade = document.getElementById("btn-modal-grade");
const statAnsweredCount = document.getElementById("stat-answered-count");
const statUnansweredCount = document.getElementById("stat-unanswered-count");
const statFlaggedCount = document.getElementById("stat-flagged-count");
const questionGrid = document.getElementById("question-grid");
const statusQuickAction = document.getElementById("status-quick-action");
const btnJumpNextFlagged = document.getElementById("btn-jump-next-flagged");

// Confirm Grade Modal Elements
const confirmGradeModal = document.getElementById("confirm-grade-modal");
const confirmGradeTitle = document.getElementById("confirm-grade-title");
const confirmGradeDesc = document.getElementById("confirm-grade-desc");
const btnDoGrade = document.getElementById("btn-do-grade");
const btnCancelGrade = document.getElementById("btn-cancel-grade");

// Mode Tabs
const tabModeReal = document.getElementById("tab-mode-real");
const tabModePractice = document.getElementById("tab-mode-practice");
const startNoticeDesc = document.getElementById("start-notice-desc");

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
      timerBadge.classList.add("warning");
      timerBadge.classList.remove("danger");
    } else if (remainingSeconds <= 60) {
      timerBadge.classList.remove("warning");
      timerBadge.classList.add("danger");
    } else {
      timerBadge.classList.remove("warning", "danger");
    }
  }
}

function handleTimeUp() {
  if (timeupModal) {
    timeupModal.classList.add("active");
  }
}

// Mode Selection Initialization
function setupModeSelection() {
  if (tabModeReal && tabModePractice) {
    tabModeReal.addEventListener("click", () => {
      currentExamMode = "real";
      tabModeReal.classList.add("active");
      tabModePractice.classList.remove("active");
      if (startNoticeDesc) {
        startNoticeDesc.innerHTML = `<p>「試験をスタートする」を押すと、全50問の試験が開始されます。<br>本番モードでは正誤は解答中に表示されず、制限時間内に回答状況を確認・見直ししながら全問解いて最後に「採点」を行います。</p>`;
      }
    });

    tabModePractice.addEventListener("click", () => {
      currentExamMode = "practice";
      tabModePractice.classList.add("active");
      tabModeReal.classList.remove("active");
      if (startNoticeDesc) {
        startNoticeDesc.innerHTML = `<p>「試験をスタートする」を押すと、全50問の練習が開始されます。<br>練習モードでは1問選択するごとに、即座に正誤判定と詳しい解説が表示されます。</p>`;
      }
    });
  }
}

// Initialize Application
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

  // Header UI adjustments depending on mode
  if (currentExamMode === "real") {
    if (!isRealExamGraded) {
      if (scoreBadges) scoreBadges.style.display = "none";
    } else {
      if (scoreBadges) scoreBadges.style.display = "flex";
    }
    if (btnBookmark) btnBookmark.style.display = "inline-flex";
    if (btnOpenStatus) btnOpenStatus.style.display = "inline-flex";
  } else {
    // 練習モード：即時正誤判定バッジを表示し、見直す・回答状況ボタンは非表示
    if (scoreBadges) scoreBadges.style.display = "flex";
    if (btnBookmark) btnBookmark.style.display = "none";
    if (btnOpenStatus) btnOpenStatus.style.display = "none";
  }

  renderQuestion(currentIndex);
  updateScoreAndProgress();
}

// Render question at activeQuestions[index]
function renderQuestion(index) {
  if (!activeQuestions || activeQuestions.length === 0) return;

  const currentQ = activeQuestions[index];
  qIndexText.textContent = index + 1;
  qNumDisplay.textContent = `問題${currentQ.id}`;
  qBodyDisplay.textContent = currentQ.question;

  // Update Bookmark (後で見直す) Button State
  if (btnBookmark) {
    const isFlagged = flaggedQuestionIds.has(currentQ.id);
    if (isFlagged) {
      btnBookmark.classList.add("flagged");
      btnBookmark.querySelector(".bookmark-label").textContent = "見直す設定中";
    } else {
      btnBookmark.classList.remove("flagged");
      btnBookmark.querySelector(".bookmark-label").textContent = "後で見直す";
    }
  }

  // Clear options
  optionsContainer.innerHTML = "";
  const answeredState = userAnswers[currentQ.id];

  // In real mode before grading: do NOT show correct/wrong badges or explanations
  const isRealModeActive = (currentExamMode === "real" && !isRealExamGraded);

  currentQ.options.forEach((optText, i) => {
    const optNumber = i + 1;
    const isThisCorrect = optNumber === currentQ.answer;

    const optEl = document.createElement("div");
    optEl.className = "option-item";
    optEl.dataset.index = i;

    if (isRealModeActive) {
      // Real exam mode: Clean display, only show selected state
      optEl.innerHTML = `
        <div class="option-main">
          <div class="option-left">
            <span class="opt-char">${letters[i]}.</span>
            <span class="opt-text">${optText}</span>
          </div>
        </div>
      `;

      if (answeredState && answeredState.selectedOptionIndex === i) {
        optEl.classList.add("real-selected");
      }

      // Allow answering or changing answer freely in real exam
      optEl.addEventListener("click", () => handleSelectOptionRealMode(currentQ.id, i));

    } else {
      // Practice mode or Real mode after grading: Full explanation and badges
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

      if (answeredState) {
        optEl.classList.add("locked");
        if (isThisCorrect) {
          optEl.classList.add("correct-choice", "show-explanation");
        } else if (answeredState.selectedOptionIndex === i) {
          optEl.classList.add("wrong-choice");
        }
      } else {
        optEl.addEventListener("click", () => handleSelectOptionPracticeMode(currentQ.id, i));
      }
    }

    optionsContainer.appendChild(optEl);
  });

  // Update navigation buttons
  if (isRetryingMistakes || isReviewingAll) {
    btnPrev.disabled = index === 0;
    btnGradeFooter.style.display = "none";
    btnNext.style.display = "inline-flex";
    if (index === activeQuestions.length - 1) {
      btnNext.textContent = "トップメニューに戻る";
    } else {
      btnNext.textContent = "次へ";
    }
  } else if (isReviewingFlaggedOnly) {
    // Sequential navigation exclusively through flagged questions
    // Use find/some instead of indexOf so that unflagging the current question
    // doesn't break navigation (indexOf would return -1 after unflagging).
    const flaggedIndices = [];
    activeQuestions.forEach((q, i) => {
      if (flaggedQuestionIds.has(q.id)) flaggedIndices.push(i);
    });

    const hasPrev = flaggedIndices.some(i => i < index);
    const hasNext = flaggedIndices.some(i => i > index);

    btnPrev.disabled = !hasPrev;
    btnNext.textContent = hasNext ? "次の見直し問題へ" : "採点へ進む";
    btnNext.style.display = "inline-flex";
    btnGradeFooter.style.display = "none";
  } else if (isRealModeActive) {
    btnPrev.disabled = index === 0;
    if (index === activeQuestions.length - 1) {
      btnNext.style.display = "none";
      btnGradeFooter.style.display = "inline-flex";
    } else {
      btnNext.style.display = "inline-flex";
      btnNext.textContent = "次へ";
      btnGradeFooter.style.display = "none";
    }
  } else {
    btnPrev.disabled = index === 0;
    btnGradeFooter.style.display = "none";
    btnNext.style.display = "inline-flex";
    if (index === activeQuestions.length - 1) {
      btnNext.textContent = "結果を見る";
    } else {
      btnNext.textContent = "次へ";
    }
  }

  // Scroll to top of content
  window.scrollTo({ top: 0, behavior: "smooth" });
}

// Option selection handler for Practice Mode (Instant validation)
function handleSelectOptionPracticeMode(qId, selectedOptionIdx) {
  if (userAnswers[qId]) return;

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

// Option selection handler for Real Mode (Silent, allows changing selection)
function handleSelectOptionRealMode(qId, selectedOptionIdx) {
  const currentQ = activeQuestions.find(q => q.id === qId);
  if (!currentQ) return;
  const isCorrect = (selectedOptionIdx + 1) === currentQ.answer;

  userAnswers[qId] = {
    selectedOptionIndex: selectedOptionIdx,
    isCorrect: isCorrect
  };

  updateScoreAndProgress();
  renderQuestion(currentIndex);
}

// Bookmark (後で見直す) Toggle Handler
if (btnBookmark) {
  btnBookmark.addEventListener("click", () => {
    if (!activeQuestions || activeQuestions.length === 0) return;
    const currentQ = activeQuestions[currentIndex];
    if (flaggedQuestionIds.has(currentQ.id)) {
      flaggedQuestionIds.delete(currentQ.id);
    } else {
      flaggedQuestionIds.add(currentQ.id);
    }
    renderQuestion(currentIndex);
  });
}

// Update Score and Progress Bar
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

  // Progress Bar calculation:
  // 練習モード（および採点後の解説見直し）: 現在開いている問題位置（1/50, 2/50...）に応じて進捗バーを伸ばす
  // 本番モード（採点前）: 50問中「回答済み」になった問題数に応じて進捗バーを伸ばす
  const total = activeQuestions.length;
  let progressPercent = 0;

  if (currentExamMode === "real" && !isRealExamGraded) {
    let answeredCount = 0;
    activeQuestions.forEach(q => {
      if (userAnswers[q.id] !== undefined) answeredCount++;
    });
    progressPercent = total > 0 ? (answeredCount / total) * 100 : 0;
  } else {
    // 練習モード：回答の有無にかかわらず、次の問題に進んだら 1/50, 2/50... に応じて進む
    progressPercent = total > 0 ? ((currentIndex + 1) / total) * 100 : 0;
  }

  progressFill.style.width = `${progressPercent}%`;
  qIndexText.textContent = currentIndex + 1;
  totalQText.textContent = total;
}

// Navigation Events
btnPrev.addEventListener("click", () => {
  if (isReviewingFlaggedOnly) {
    const flaggedIndices = [];
    activeQuestions.forEach((q, i) => {
      if (flaggedQuestionIds.has(q.id)) flaggedIndices.push(i);
    });
    // Find the largest flagged index that is strictly before currentIndex
    const prevFlagged = [...flaggedIndices].reverse().find(i => i < currentIndex);
    if (prevFlagged !== undefined) {
      currentIndex = prevFlagged;
      renderQuestion(currentIndex);
      updateScoreAndProgress();
    }
    return;
  }

  if (currentIndex > 0) {
    currentIndex--;
    renderQuestion(currentIndex);
    updateScoreAndProgress();
  }
});

btnNext.addEventListener("click", () => {
  if (isRetryingMistakes || isReviewingAll) {
    if (currentIndex < activeQuestions.length - 1) {
      currentIndex++;
      renderQuestion(currentIndex);
      updateScoreAndProgress();
    } else {
      // Finished all questions in review/retry mode -> return to top menu
      isRetryingMistakes = false;
      isReviewingAll = false;
      executeWithTransition(() => {
        showStartScreen();
      });
    }
    return;
  }

  if (isReviewingFlaggedOnly) {
    const flaggedIndices = [];
    activeQuestions.forEach((q, i) => {
      if (flaggedQuestionIds.has(q.id)) flaggedIndices.push(i);
    });
    // Find the smallest flagged index that is strictly after currentIndex.
    // This works even when the current question was just unflagged (its index
    // is no longer in flaggedIndices, but we can still skip past it).
    const nextFlagged = flaggedIndices.find(i => i > currentIndex);
    if (nextFlagged !== undefined) {
      currentIndex = nextFlagged;
      renderQuestion(currentIndex);
      updateScoreAndProgress();
    } else {
      // No more flagged questions ahead -> open grade confirmation
      requestGradeExam();
    }
    return;
  }

  if (currentIndex < activeQuestions.length - 1) {
    currentIndex++;
    renderQuestion(currentIndex);
    updateScoreAndProgress();
  } else {
    if (currentExamMode === "real" && !isRealExamGraded) {
      requestGradeExam();
    } else {
      showResultScreen();
    }
  }
});

if (btnGradeFooter) {
  btnGradeFooter.addEventListener("click", () => {
    requestGradeExam();
  });
}

// Request Exam Grading (with confirmation dialog)
function requestGradeExam() {
  const total = activeQuestions.length;
  let answeredCount = 0;
  activeQuestions.forEach(q => {
    if (userAnswers[q.id] !== undefined) answeredCount++;
  });
  const unansweredCount = total - answeredCount;

  if (unansweredCount > 0) {
    confirmGradeTitle.textContent = `未回答の問題が ${unansweredCount} 問あります`;
    confirmGradeDesc.innerHTML = `全50問中、${answeredCount}問に解答済みです。<br>このまま採点を開始してもよろしいですか？<br>（採点後は解答の変更ができません）`;
  } else {
    confirmGradeTitle.textContent = "全問の解答が完了しました！";
    confirmGradeDesc.innerHTML = `全50問すべて解答済みです。<br>採点を実行して合否判定を確認しますか？`;
  }

  if (statusModal) statusModal.classList.remove("active");
  if (confirmGradeModal) confirmGradeModal.classList.add("active");
}

if (btnCancelGrade) {
  btnCancelGrade.addEventListener("click", () => {
    if (confirmGradeModal) confirmGradeModal.classList.remove("active");
  });
}

if (btnDoGrade) {
  btnDoGrade.addEventListener("click", () => {
    if (confirmGradeModal) confirmGradeModal.classList.remove("active");
    isRealExamGraded = true;
    showResultScreen();
  });
}

// Answer Status Modal Handlers
function openStatusModal() {
  updateStatusSummaryAndGrid();
  if (statusModal) statusModal.classList.add("active");
}

function closeStatusModal() {
  if (statusModal) statusModal.classList.remove("active");
}

function updateStatusSummaryAndGrid() {
  const total = activeQuestions.length;
  let answeredCount = 0;
  let flaggedCount = 0;

  activeQuestions.forEach(q => {
    if (userAnswers[q.id] !== undefined) answeredCount++;
    if (flaggedQuestionIds.has(q.id)) flaggedCount++;
  });

  const unansweredCount = total - answeredCount;

  if (statAnsweredCount) statAnsweredCount.textContent = answeredCount;
  if (statUnansweredCount) statUnansweredCount.textContent = unansweredCount;
  if (statFlaggedCount) statFlaggedCount.textContent = flaggedCount;

  // Show/Hide Quick Jump Button for Flagged Questions
  if (statusQuickAction) {
    if (flaggedCount > 0) {
      statusQuickAction.style.display = "block";
    } else {
      statusQuickAction.style.display = "none";
    }
  }

  renderStatusGrid();
}

function renderStatusGrid() {
  if (!questionGrid) return;
  questionGrid.innerHTML = "";

  activeQuestions.forEach((q, idx) => {
    const isAnswered = userAnswers[q.id] !== undefined;
    const isFlagged = flaggedQuestionIds.has(q.id);
    const isCurrent = idx === currentIndex;

    const rowCard = document.createElement("div");
    rowCard.className = "q-row-card";
    if (isCurrent) rowCard.classList.add("current");

    rowCard.innerHTML = `
      <span class="q-row-num-badge">Q${idx + 1}.</span>
      <div class="q-row-right">
        ${isFlagged ? '<span class="q-row-flag-badge">⭐ 見直す</span>' : ''}
        <span class="q-row-status-tag ${isAnswered ? 'is-answered' : 'is-unanswered'}">
          ${isAnswered ? '回答済' : '未回答'}
        </span>
      </div>
    `;

    rowCard.addEventListener("click", () => {
      isReviewingFlaggedOnly = false;
      currentIndex = idx;
      renderQuestion(currentIndex);
      updateScoreAndProgress();
      closeStatusModal();
    });

    questionGrid.appendChild(rowCard);
  });
}

// Sequential Flagged Review: Starts at the lowest numbered flagged question and navigates through them
if (btnJumpNextFlagged) {
  btnJumpNextFlagged.addEventListener("click", () => {
    const flaggedIndices = [];
    activeQuestions.forEach((q, idx) => {
      if (flaggedQuestionIds.has(q.id)) {
        flaggedIndices.push(idx);
      }
    });

    if (flaggedIndices.length === 0) return;

    // Start with the lowest numbered flagged question
    isReviewingFlaggedOnly = true;
    currentIndex = flaggedIndices[0];
    renderQuestion(currentIndex);
    updateScoreAndProgress();
    closeStatusModal();
  });
}

if (btnOpenStatus) btnOpenStatus.addEventListener("click", openStatusModal);
if (btnCloseStatus) btnCloseStatus.addEventListener("click", closeStatusModal);
if (btnBackToQuiz) btnBackToQuiz.addEventListener("click", closeStatusModal);
if (btnModalGrade) {
  btnModalGrade.addEventListener("click", () => {
    closeStatusModal();
    requestGradeExam();
  });
}

// Show Result Screen
function showResultScreen() {
  stopTimer();
  if (timeupModal) timeupModal.classList.remove("active");
  if (statusModal) statusModal.classList.remove("active");
  if (confirmGradeModal) confirmGradeModal.classList.remove("active");

  quizView.style.display = "none";
  if (appHeader) appHeader.style.display = "none";
  if (appFooter) appFooter.style.display = "none";
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

  // Find questions that were answered incorrectly in this current session
  const wrongQuestions = activeQuestions.filter(q => {
    const ans = userAnswers[q.id];
    return ans && !ans.isCorrect;
  });

  // Drumroll and reveal animation elements
  const scoreDisplay = document.getElementById("result-score");
  const descDisplay = document.getElementById("result-desc");
  const titleDisplay = document.getElementById("result-title");
  const badgeAnim = document.getElementById("result-badge-anim");
  const resultButtons = document.getElementById("result-buttons");

  if (resultButtons) {
    resultButtons.style.opacity = "0";
    resultButtons.style.pointerEvents = "none";
  }

  if (wrongQuestions.length > 0) {
    btnRetryMistakes.style.display = "block";
    btnRetryMistakes.textContent = `間違えた問題（${wrongQuestions.length}問）を解き直す`;
  } else {
    btnRetryMistakes.style.display = "none";
  }

  if (btnReviewAll) {
    if (currentExamMode === "real") {
      btnReviewAll.style.display = "block";
    } else {
      btnReviewAll.style.display = "none";
    }
  }

  // Format time taken
  const timeUsedSeconds = EXAM_DURATION_SECONDS - remainingSeconds;
  const usedMins = Math.floor(timeUsedSeconds / 60);
  const usedSecs = timeUsedSeconds % 60;
  const timeTakenStr = `${usedMins}分${usedSecs}秒`;

  // Start Drumroll Animation (only in real mode or if desired)
  if (currentExamMode === "real") {
    titleDisplay.textContent = "運命の採点中... 🥁";
    if (badgeAnim) {
      badgeAnim.className = "result-badge-anim";
      badgeAnim.textContent = "採点集計中";
    }
    descDisplay.textContent = "あなたの解答を照合しています...";
    scoreDisplay.className = "result-score roll-active";

    let rollCounter = 0;
    const rollDuration = 2200; // 2.2 seconds drumroll
    const rollInterval = 45;
    const rollTimer = setInterval(() => {
      rollCounter++;
      // Randomly cycle numbers between 1 and 50
      const randomScore = Math.floor(Math.random() * (total + 1));
      scoreDisplay.textContent = `${randomScore} / ${total}問`;
    }, rollInterval);

    setTimeout(() => {
      clearInterval(rollTimer);

      // Final Reveal!
      scoreDisplay.className = "result-score final-reveal";
      scoreDisplay.textContent = `${correctCount} / ${total}問 (${scorePercent}%)`;
      titleDisplay.textContent = isPassed ? "合格基準達成！ 🎉" : "お疲れ様でした！";

      if (badgeAnim) {
        if (isPassed) {
          badgeAnim.className = "result-badge-anim is-passed";
          badgeAnim.textContent = "合格ラインクリア（80%以上）";
          // Trigger Confetti!
          launchConfetti();
        } else {
          badgeAnim.className = "result-badge-anim is-failed";
          badgeAnim.textContent = "不合格（あと少し！）";
        }
      }

      descDisplay.innerHTML = isPassed
        ? `おめでとうございます！所要時間 <strong>${timeTakenStr}</strong> で合格ライン（80%以上/40問正解）をクリアしました。<br>本番に向けてさらに理解を深めましょう。`
        : `所要時間: <strong>${timeTakenStr}</strong>（基準時間30分）<br>正答率80%以上（40問以上）が合格基準の目安です。<br>間違えた問題を中心に復習を繰り返しましょう！`;

      // Fade in buttons
      if (resultButtons) {
        resultButtons.style.opacity = "1";
        resultButtons.style.pointerEvents = "auto";
      }
    }, rollDuration);

  } else {
    // Practice mode instant display
    scoreDisplay.className = "result-score";
    scoreDisplay.textContent = `${correctCount} / ${total}問 (${scorePercent}%)`;
    titleDisplay.textContent = isPassed ? "合格基準達成！ 🎉" : "お疲れ様でした！";
    if (badgeAnim) {
      badgeAnim.className = isPassed ? "result-badge-anim is-passed" : "result-badge-anim is-failed";
      badgeAnim.textContent = isPassed ? "合格ラインクリア（80%以上）" : "演習完了";
    }
    descDisplay.innerHTML = isPassed
      ? `おめでとうございます！全問演習を完了し、合格基準（80%以上）を達成しました！`
      : `演習完了！正答率80%以上が合格の目安です。<br>間違えた問題を中心に解き直しましょう。`;

    if (resultButtons) {
      resultButtons.style.opacity = "1";
      resultButtons.style.pointerEvents = "auto";
    }
    if (isPassed) launchConfetti();
  }
}

// Confetti Particle System
function launchConfetti() {
  const canvas = document.getElementById("confetti-canvas");
  if (!canvas) return;
  const ctx = canvas.getContext("2d");
  const card = document.getElementById("result-card");
  if (!card) return;

  canvas.width = card.offsetWidth;
  canvas.height = card.offsetHeight;

  const confettiPieces = [];
  const colors = ["#f59e0b", "#38bdf8", "#22c55e", "#ec4899", "#8b5cf6", "#ef4444", "#fbbf24"];

  for (let i = 0; i < 75; i++) {
    confettiPieces.push({
      x: canvas.width / 2 + (Math.random() - 0.5) * 60,
      y: canvas.height * 0.45,
      w: Math.random() * 8 + 4,
      h: Math.random() * 6 + 4,
      color: colors[Math.floor(Math.random() * colors.length)],
      vx: (Math.random() - 0.5) * 14,
      vy: (Math.random() - 0.9) * 14 - 3,
      rotation: Math.random() * 360,
      vRotation: (Math.random() - 0.5) * 12,
      gravity: 0.38,
      opacity: 1
    });
  }

  let animationFrame;
  function updateConfetti() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    let aliveCount = 0;

    confettiPieces.forEach(p => {
      p.x += p.vx;
      p.y += p.vy;
      p.vy += p.gravity;
      p.rotation += p.vRotation;
      p.opacity -= 0.012;

      if (p.opacity > 0 && p.y < canvas.height + 20) {
        aliveCount++;
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate((p.rotation * Math.PI) / 180);
        ctx.globalAlpha = Math.max(0, p.opacity);
        ctx.fillStyle = p.color;
        ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h);
        ctx.restore();
      }
    });

    if (aliveCount > 0) {
      animationFrame = requestAnimationFrame(updateConfetti);
    } else {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      cancelAnimationFrame(animationFrame);
    }
  }

  updateConfetti();
}

// Modal Event Listeners (Time Up)
if (btnTimeupResult) {
  btnTimeupResult.addEventListener("click", () => {
    timeupModal.classList.remove("active");
    isRealExamGraded = true;
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
  flaggedQuestionIds.clear();
  everWrongQuestionIds.clear();
  isRealExamGraded = false;
  isReviewingFlaggedOnly = false;
  isRetryingMistakes = false;
  isReviewingAll = false;

  const shutterCurtain = document.getElementById("shutter-curtain");
  if (shutterCurtain) shutterCurtain.classList.remove("wipe-cut");

  if (startView) {
    startView.classList.remove("transition-out");
    startView.style.display = "flex";
  }
  if (quizView) {
    quizView.classList.remove("slide-in-up");
    quizView.style.display = "none";
  }
  if (resultView) resultView.style.display = "none";
  if (appHeader) appHeader.style.display = "none";
  if (appFooter) appFooter.style.display = "none";
  if (timeupModal) timeupModal.classList.remove("active");
  if (statusModal) statusModal.classList.remove("active");
  if (confirmGradeModal) confirmGradeModal.classList.remove("active");

  // Synchronize Tab UI to currentExamMode so start screen matches state
  if (tabModeReal && tabModePractice) {
    if (currentExamMode === "real") {
      tabModeReal.classList.add("active");
      tabModePractice.classList.remove("active");
      if (startNoticeDesc) {
        startNoticeDesc.innerHTML = `<p>「試験をスタートする」を押すと、全50問の試験が開始されます。<br>本番モードでは正誤は解答中に表示されず、制限時間内に回答状況を確認・見直ししながら全問解いて最後に「採点」を行います。</p>`;
      }
    } else {
      tabModePractice.classList.add("active");
      tabModeReal.classList.remove("active");
      if (startNoticeDesc) {
        startNoticeDesc.innerHTML = `<p>「試験をスタートする」を押すと、全50問の練習が開始されます。<br>練習モードでは1問選択するごとに、即座に正誤判定と詳しい解説が表示されます。</p>`;
      }
    }
  }

  activeQuestions = [...getSetQuestions(selectedSetId)];
  currentIndex = 0;
  totalQText.textContent = activeQuestions.length;
  updateScoreAndProgress();
}

// Smooth Screen Transition Helper
let isTransitioning = false;
function executeWithTransition(onPeakCallback) {
  if (isTransitioning) return;
  isTransitioning = true;

  const shutterCurtain = document.getElementById("shutter-curtain");

  if (startView && startView.style.display !== "none") {
    startView.classList.add("transition-out");
  }
  if (resultView && resultView.style.display !== "none") {
    resultView.classList.add("transition-out");
  }

  if (shutterCurtain) {
    shutterCurtain.classList.remove("wipe-cut");
    void shutterCurtain.offsetWidth;
    shutterCurtain.classList.add("wipe-cut");
  }

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
    setDropdown.value = String(selectedSetId);
    updateSetPreview(selectedSetId);

    setDropdown.addEventListener("change", (e) => {
      selectedSetId = parseInt(e.target.value, 10) || 1;
      updateSetPreview(selectedSetId);
    });
  }
}

// Start Exam Button Click Handler
if (btnStartExam) {
  btnStartExam.addEventListener("click", () => {
    executeWithTransition(() => {
      if (startView) startView.style.display = "none";
      if (appHeader) appHeader.style.display = "block";
      if (quizView) {
        quizView.style.display = "block";
        quizView.classList.add("slide-in-up");
      }
      if (appFooter) appFooter.style.display = "flex";

      isRealExamGraded = false;
      const chosenQuestions = getSetQuestions(selectedSetId);
      initApp(chosenQuestions, true);
    });
  });
}

// Review all 50 questions with detailed explanations after exam
if (btnReviewAll) {
  btnReviewAll.addEventListener("click", () => {
    executeWithTransition(() => {
      resultView.style.display = "none";
      if (appHeader) appHeader.style.display = "block";
      if (quizView) {
        quizView.style.display = "block";
        quizView.classList.add("slide-in-up");
      }
      if (appFooter) appFooter.style.display = "flex";
      if (scoreBadges) scoreBadges.style.display = "flex";

      // Keep userAnswers intact, navigate back to question 1 in graded review mode
      currentIndex = 0;
      isReviewingFlaggedOnly = false;
      isRetryingMistakes = false;
      isReviewingAll = true;
      if (btnBookmark) btnBookmark.style.display = "none";
      if (btnOpenStatus) btnOpenStatus.style.display = "none";
      renderQuestion(currentIndex);
      updateScoreAndProgress();
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
  const wrongQuestions = activeQuestions.filter(q => {
    const ans = userAnswers[q.id];
    return ans && !ans.isCorrect;
  });

  if (wrongQuestions.length === 0) return;

  wrongQuestions.forEach(q => {
    delete userAnswers[q.id];
  });

  executeWithTransition(() => {
    if (startView) startView.style.display = "none";
    resultView.style.display = "none";
    if (appHeader) appHeader.style.display = "block";
    quizView.style.display = "block";
    quizView.classList.add("slide-in-up");
    if (appFooter) appFooter.style.display = "flex";

    // When retrying mistakes, operate in practice review mode
    currentExamMode = "practice";
    isRetryingMistakes = true;
    isReviewingFlaggedOnly = false;
    initApp(wrongQuestions, false);
  });
});

// Header Reset Button (X mark)
if (btnClose) {
  btnClose.addEventListener("click", () => {
    if (confirm("試験を中断してトップページに戻りますか？")) {
      showStartScreen();
    }
  });
}

// Start app on load
document.addEventListener("DOMContentLoaded", () => {
  setupModeSelection();
  setupSetSelection();
  showStartScreen();
});
