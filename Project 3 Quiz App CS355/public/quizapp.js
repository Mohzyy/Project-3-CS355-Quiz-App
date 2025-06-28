let currentQuestion = 0;
let score = 0;
let questions = [];

const username = localStorage.getItem("quizUsername") || "Guest";
const totalQuestions = parseInt(localStorage.getItem("numQuestions")) || 4;

const timerEl = document.getElementById("timer");
const questionEl = document.getElementById("question-text");
const answersEl = document.getElementById("answer-buttons");
const scoreEl = document.getElementById("score");
const playerNameEl = document.getElementById("player-name");
const nextBtn = document.getElementById("next-btn");
const progressBar = document.getElementById("progress");

playerNameEl.innerText = username;

const correctSound = new Audio("correct.mp3");
const wrongSound = new Audio("wrong.mp3");

const selectedCategory = localStorage.getItem("category") || "";
const categoryParam = selectedCategory ? `&category=${selectedCategory}` : "";
fetch(`/questions?num=${totalQuestions}${categoryParam}`)  .then((res) => res.json())
  .then((data) => {
    if (!data || data.length === 0) {
      throw new Error("No questions loaded");
    }

    questions = data;
    showQuestion(); 
    startTimer();  
  })
  .catch((err) => {
    questionEl.innerText = "❌ Failed to load quiz.";
    console.error("Error:", err);
  });

let timeLeft = 30;
let timerInterval;

function startTimer() {
  clearInterval(timerInterval);
  timeLeft = 30;

  timerInterval = setInterval(() => {
    timeLeft--;
    timerEl.innerText = `Time left: ${timeLeft}s`;

    if (timeLeft <= 0) {
      clearInterval(timerInterval);
      handleNext();
    }
  }, 1000);
}

function showQuestion() {
  resetState();
  const q = questions[currentQuestion];
  questionEl.innerText = `${currentQuestion + 1}. ${q.question}`;
  questionEl.style.opacity = 0;
  setTimeout(() => (questionEl.style.opacity = 1), 100);

  ["A", "B", "C", "D"].forEach((letter) => {
    const btn = document.createElement("button");
    btn.innerText = `${letter}. ${q[letter]}`;
    btn.addEventListener("click", () => selectAnswer(btn, q.answer));
    answersEl.appendChild(btn);
  });

  updateProgress();
}

function selectAnswer(button, correctLetter) {
  const buttons = answersEl.querySelectorAll("button");
  buttons.forEach((btn) => {
    btn.disabled = true;
    const letter = btn.innerText.split(".")[0];
    if (letter === correctLetter) {
      btn.classList.add("correct");
    } else if (btn === button) {
      btn.classList.add("incorrect");
    }
  });

  const selectedLetter = button.innerText.split(".")[0];
  if (selectedLetter === correctLetter) {
    score++;
    scoreEl.innerText = score;
    correctSound.play();
  } else {
    wrongSound.play();
  }

  nextBtn.style.display = "inline-block";
}

function resetState() {
  nextBtn.style.display = "none";
  answersEl.innerHTML = "";
}

nextBtn.addEventListener("click", handleNext);

function handleNext() {
  currentQuestion++;
  if (currentQuestion < questions.length) {
    startTimer();
    showQuestion();
  } else {
    endQuiz();
  }
}

function updateProgress() {
  progressBar.style.width = `${((currentQuestion + 1) / questions.length) * 100}%`;
}

function endQuiz() {
  clearInterval(timerInterval);
  localStorage.setItem("quizScore", score);

  const token = localStorage.getItem("token");
  fetch("/submit-score", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`
    },
    body: JSON.stringify({ score })
  }).then(() => {
    window.location.href = "result.html";
  }).catch(err => {
    console.error("Failed to save score:", err);
    window.location.href = "result.html";
  });
}
