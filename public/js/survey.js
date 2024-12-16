const socket = io({
    auth: {
        userId: document.getElementById('userId').textContent
    }
});

// Add styles for survey questions
const style = document.createElement('style');
style.textContent = `
    .question-container {
        background: rgba(255, 255, 255, 0.05);
        padding: 2rem;
        border-radius: 0.75rem;
        border: 1px solid rgba(255, 255, 255, 0.1);
        margin-bottom: 1.5rem;
    }

    .question-text {
        color: white;
        font-size: 1.1rem;
        margin-bottom: 1.5rem;
    }

    .rating-options {
        display: flex;
        gap: 1.5rem;
        margin-top: 1rem;
    }

    .rating-option {
        display: flex;
        align-items: center;
        justify-content: center;
        width: 3rem;
        height: 3rem;
        border: 2px solid rgba(255, 255, 255, 0.2);
        border-radius: 0.75rem;
        color: white;
        cursor: pointer;
        transition: all 0.3s ease;
        font-size: 1.1rem;
    }

    .rating-option:hover {
        border-color: #D4AF37;
        background: rgba(212, 175, 55, 0.1);
    }

    .rating-option.selected {
        background: #D4AF37;
        border-color: #D4AF37;
    }

    .text-input {
        width: 100%;
        padding: 1rem;
        background: rgba(255, 255, 255, 0.05);
        border: 1px solid rgba(255, 255, 255, 0.1);
        border-radius: 0.75rem;
        color: white;
        margin-top: 1rem;
        font-size: 1rem;
        resize: vertical;
        min-height: 100px;
    }

    .text-input:focus {
        outline: none;
        border-color: #D4AF37;
    }
`;
document.head.appendChild(style);

// Load survey questions
async function loadSurveyQuestions() {
    try {
        const response = await fetch('/data/survey_questions.json');
        const data = await response.json();
        const questionsContainer = document.getElementById('surveyQuestions');

        data.questions.forEach(question => {
            const questionDiv = document.createElement('div');
            questionDiv.className = 'question-container';
            
            if (question.type === 'rating') {
                questionDiv.innerHTML = `
                    <div class="question-text">${question.question}</div>
                    <div class="rating-options" data-question-id="${question.id}">
                        ${question.options.map(option => `
                            <div class="rating-option" data-value="${option}">${option}</div>
                        `).join('')}
                    </div>
                `;

                // Add click handlers for rating options
                const ratingOptions = questionDiv.querySelectorAll('.rating-option');
                ratingOptions.forEach(option => {
                    option.addEventListener('click', () => {
                        ratingOptions.forEach(opt => opt.classList.remove('selected'));
                        option.classList.add('selected');
                    });
                });
            } else if (question.type === 'text') {
                questionDiv.innerHTML = `
                    <div class="question-text">${question.question}</div>
                    <textarea class="text-input" rows="4" placeholder="${question.placeholder}" data-question-id="${question.id}"></textarea>
                `;
            }

            questionsContainer.appendChild(questionDiv);
        });
    } catch (error) {
        console.error('Error loading survey questions:', error);
    }
}

// Handle form submission
document.getElementById('surveyForm').addEventListener('submit', async (e) => {
    e.preventDefault();

    const answers = [];
    const ratingContainers = document.querySelectorAll('.rating-options');
    const textInputs = document.querySelectorAll('.text-input');

    // Collect rating answers
    ratingContainers.forEach(container => {
        const questionId = container.dataset.questionId;
        const selectedOption = container.querySelector('.rating-option.selected');
        if (selectedOption) {
            answers.push({
                questionId,
                type: 'rating',
                value: selectedOption.dataset.value
            });
        }
    });

    // Collect text answers
    textInputs.forEach(input => {
        const questionId = input.dataset.questionId;
        if (input.value.trim()) {
            answers.push({
                questionId,
                type: 'text',
                value: input.value.trim()
            });
        }
    });

    // Validate that all rating questions have been answered
    const unansweredRatings = Array.from(ratingContainers).filter(container => 
        !container.querySelector('.rating-option.selected')
    );

    if (unansweredRatings.length > 0) {
        alert('Please answer all rating questions before submitting.');
        return;
    }

    // Validate that text questions have been answered (if you want to make them required)
    const unansweredText = Array.from(textInputs).filter(input => 
        !input.value.trim()
    );

    if (unansweredText.length > 0) {
        alert('Please fill in all text questions before submitting.');
        return;
    }

    // Send answers to server
    socket.emit('survey_submitted', {
        userId: document.getElementById('userId').textContent,
        answers
    });

    // Create and show thank you content
    const surveyContainer = document.querySelector('.survey-container');
    const thankYouContent = document.createElement('div');
    thankYouContent.className = 'text-center py-12';
    thankYouContent.innerHTML = `
        <div class="inline-flex p-4 rounded-xl bg-[#D4AF37] shadow-lg mb-6">
            <i class="fas fa-check-circle text-4xl text-white"></i>
        </div>
        <h2 class="text-2xl font-medium text-white mb-4">Thank You for Your Feedback!</h2>
        <p class="text-white/60 mb-6">Your responses help us improve our services.</p>
        <a href="/user/${document.getElementById('userId').textContent}" class="inline-block px-6 py-3 bg-[#374151] text-white rounded-lg hover:bg-[#4B5563] transition-colors">
            Return to Dashboard
        </a>
    `;

    // Replace survey content with thank you content
    document.getElementById('surveyContent').remove();
    surveyContainer.appendChild(thankYouContent);

    // Redirect after delay
    setTimeout(() => {
        window.location.href = `/user/${document.getElementById('userId').textContent}`;
    }, 3000);
});

// Handle cancel button
document.getElementById('cancelSurvey').addEventListener('click', () => {
    window.location.href = `/user/${document.getElementById('userId').textContent}`;
});

// Load questions when page loads
loadSurveyQuestions(); 