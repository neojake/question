document.addEventListener('DOMContentLoaded', () => {
    const container = document.getElementById('questions-container');
    const submitBtn = document.getElementById('submit-btn');
    const scoreDisplay = document.getElementById('score-display');
    const form = document.getElementById('exam-form');

    // Mapping for circled numbers
    const circleMap = ["①", "②", "③", "④"];

    // 1. Render all questions
    questions.forEach((q, index) => {
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
                // We keep margin-top negative to collapse vertical space, but we REMOVE margin-left negative
                // to keep the horizontal space (as white space) to place our new overlays there.
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
                // Wrapper needed for absolute positioning of overlays
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
        q.options.forEach((opt, optIdx) => {
            optionsHtml += `
                <label class="option-item">
                    <input type="radio" name="q_${q.id}" value="${optIdx}">
                    <span class="circle-num">${circleMap[optIdx]}</span>
                    <span class="option-text">${opt}</span>
                </label>
            `;
        });

        qEl.innerHTML = `
            <div class="question-text">
                <span class="question-number">${q.id}.</span>
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
    });

    // 2. Handle Submission (Grading)
    submitBtn.addEventListener('click', () => {
        let score = 0;
        let total = questions.length;
        let answered = 0;

        questions.forEach(q => {
            const qEl = container.querySelector(`div[data-id="${q.id}"]`);
            const selectedInput = form.querySelector(`input[name="q_${q.id}"]:checked`);

            // Lock inputs
            const inputs = qEl.querySelectorAll('input');
            inputs.forEach(input => input.disabled = true);

            // Add 'graded' class to show explanations
            qEl.classList.add('graded');

            if (selectedInput) {
                const userVal = parseInt(selectedInput.value);
                const circleNums = qEl.querySelectorAll('.circle-num');

                if (userVal === q.answer) {
                    // Correct
                    score++;
                    qEl.classList.add('correct');
                    circleNums[userVal].parentElement.classList.add('correct-answer');
                } else {
                    // Wrong
                    qEl.classList.add('incorrect');
                    circleNums[userVal].parentElement.classList.add('wrong-choice');
                    // Show correct answer
                    circleNums[q.answer].parentElement.classList.add('correct-answer');
                }
                answered++;
            } else {
                // Not answered
                qEl.classList.add('incorrect');
                const circleNums = qEl.querySelectorAll('.circle-num');
                // Show correct answer
                circleNums[q.answer].parentElement.classList.add('correct-answer');
            }
        });

        // Display Score
        const finalScore = (score / total) * 100;
        scoreDisplay.textContent = `점수: ${finalScore.toFixed(0)}점 (${score} / ${total})`;
        scoreDisplay.classList.remove('hidden');
        submitBtn.style.display = 'none'; // Hide submit button after grading

        window.scrollTo(0, document.body.scrollHeight);
    });
});
