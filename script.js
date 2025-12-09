document.addEventListener('DOMContentLoaded', () => {
    const container = document.getElementById('questions-container');
    const submitBtn = document.getElementById('submit-btn');
    const scoreDisplay = document.getElementById('score-display');
    const form = document.getElementById('exam-form');

    // Mapping for circled numbers
    const circleMap = ["①", "②", "③", "④"];

    // Shuffle Function (Fisher-Yates)
    function shuffleArray(array) {
        for (let i = array.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [array[i], array[j]] = [array[j], array[i]];
        }
    }

    // State key for localStorage
    const STATE_KEY = 'exam_state_v1';

    // 1. Load State or Initial Shuffle
    let savedState = null;
    try {
        savedState = JSON.parse(localStorage.getItem(STATE_KEY));
    } catch (e) {
        console.error("Error parsing saved state", e);
    }

    let currentQuestions = [];

    // Validating function
    const isStateValid = (state) => {
        return state &&
            Array.isArray(state.questionsOrder) &&
            state.questionsOrder.length === questions.length;
    };

    if (isStateValid(savedState)) {
        // Restore order based on saved IDs
        // Map saved IDs to actual question objects
        currentQuestions = savedState.questionsOrder
            .map(id => questions.find(q => q.id === id))
            .filter(q => q); // Filter out any undefineds

        // Final sanity check: length must match
        if (currentQuestions.length !== questions.length) {
            // Something mismatch (e.g. source code changed), reset
            savedState = null;
        }
    } else {
        savedState = null; // Force reset if invalid
    }

    // If no valid state, initialize new session
    if (!savedState) {
        currentQuestions = [...questions]; // Copy original array
        shuffleArray(currentQuestions);

        savedState = {
            questionsOrder: currentQuestions.map(q => q.id),
            answers: {}
        };
        localStorage.setItem(STATE_KEY, JSON.stringify(savedState));
    }


    // 2. Render all questions
    currentQuestions.forEach((q, index) => {
        const qEl = document.createElement('div');
        qEl.classList.add('question-item');
        qEl.dataset.id = q.id;

        // Image HTML if exists
        let imageHtml = '';
        if (q.image) {
            let imgStyle = '';
            // Handle cropping (clip-path)
            if (q.cropTop || q.cropLeft) {
                const top = q.cropTop || 0;
                const left = q.cropLeft || 0;
                imgStyle = `style="clip-path: inset(${top}px 0 0 ${left}px); margin-top: -${top}px; display: block;"`;
            }

            // Build Overlays
            let overlaysHtml = '';
            if (q.overlays) {
                q.overlays.forEach(ov => {
                    overlaysHtml += `<div class="image-overlay-label" style="top: ${ov.top}; left: ${ov.left};">${ov.text}</div>`;
                });
            }
            if (q.masks) {
                q.masks.forEach(mask => {
                    overlaysHtml += `<div class="image-mask" style="top: ${mask.top}; left: ${mask.left}; width: ${mask.width}; height: ${mask.height};"></div>`;
                });
            }

            if (overlaysHtml) {
                imageHtml = `
                    <div class="image-wrapper">
                        <img src="${q.image}" alt="Question Image" class="question-image" ${imgStyle}>
                        ${overlaysHtml}
                    </div>
                 `;
            } else {
                imageHtml = `<img src="${q.image}" alt="Question Image" class="question-image" ${imgStyle}>`;
            }
        }

        // Options HTML
        let optionsHtml = '';
        // Check if already answered in saved state
        const savedAnswer = savedState.answers && savedState.answers[q.id];
        const isAnswered = savedAnswer !== undefined;

        q.options.forEach((opt, optIdx) => {
            const isChecked = isAnswered && savedAnswer === optIdx ? 'checked' : '';
            optionsHtml += `
                <label class="option-item">
                    <input type="radio" name="q_${q.id}" value="${optIdx}" ${isChecked} ${isAnswered ? 'disabled' : ''}>
                    <span class="circle-num">${circleMap[optIdx]}</span>
                    <span class="option-text">${opt}</span>
                </label>
            `;
        });

        qEl.innerHTML = `
            <div class="question-text">
                <span class="question-number">${index + 1}.</span>
                <span>${q.question}</span>
            </div>
            ${imageHtml}
            <div class="options-list">
                ${optionsHtml}
            </div>
            <div class="explanation">
                <strong>해설:</strong> ${q.explanation}
            </div>
        `;

        container.appendChild(qEl);

        // If already answered, visually update 'graded' style
        if (isAnswered) {
            markQuestionGraded(qEl, savedAnswer, q);
        }
    });


    // Helper to visually mark a question as graded
    function markQuestionGraded(qEl, userVal, questionData) {
        // Lock inputs
        const inputs = qEl.querySelectorAll('input');
        inputs.forEach(inp => inp.disabled = true);

        // Add 'graded' class
        qEl.classList.add('graded');

        const circleNums = qEl.querySelectorAll('.circle-num');

        if (userVal === questionData.answer) {
            // Correct
            qEl.classList.add('correct');
            circleNums[userVal].parentElement.classList.add('correct-answer');
        } else {
            // Wrong
            qEl.classList.add('incorrect');
            if (circleNums[userVal]) {
                circleNums[userVal].parentElement.classList.add('wrong-choice');
            }
            // Show correct answer
            circleNums[questionData.answer].parentElement.classList.add('correct-answer');
        }
    }


    // 3. Immediate Feedback on Selection with Persistence
    container.addEventListener('change', (e) => {
        if (e.target.matches('input[type="radio"]')) {
            const input = e.target;
            const qEl = input.closest('.question-item');
            const qId = parseInt(qEl.dataset.id);
            const questionData = questions.find(q => q.id === qId);

            if (!questionData) return;

            const userVal = parseInt(input.value);

            // SAVE to state
            savedState.answers = savedState.answers || {};
            savedState.answers[qId] = userVal;
            localStorage.setItem(STATE_KEY, JSON.stringify(savedState));

            markQuestionGraded(qEl, userVal, questionData);
        }
    });

    // 4. Handle Submission (Score Only calculation now, since visual feedback is immediate)
    submitBtn.addEventListener('click', () => {
        let score = 0;
        let total = questions.length;

        // Recalculate score based on current saved answers
        questions.forEach(q => {
            const ans = savedState.answers ? savedState.answers[q.id] : undefined;
            if (ans !== undefined && ans === q.answer) {
                score++;
            }
        });

        const finalScore = (score / total) * 100;
        scoreDisplay.textContent = `점수: ${finalScore.toFixed(0)}점 (${score} / ${total})`;
        scoreDisplay.classList.remove('hidden');
        submitBtn.style.display = 'none';
        window.scrollTo(0, document.body.scrollHeight);
    });

    // 5. Reset Button Logic
    const resetBtn = document.getElementById('reset-btn');
    if (resetBtn) {
        resetBtn.addEventListener('click', () => {
            if (confirm('정말로 기록을 삭제하고 처음부터 다시 시작하시겠습니까?')) {
                localStorage.removeItem(STATE_KEY);
                location.reload();
            }
        });
    }
});
