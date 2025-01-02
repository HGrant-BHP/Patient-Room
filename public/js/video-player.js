document.addEventListener('DOMContentLoaded', () => {
    const videoCards = document.querySelectorAll('.video-card');
    const userId = document.body.dataset.userId;

    // Handle related video clicks
    videoCards.forEach(card => {
        card.addEventListener('click', () => {
            const videoId = card.dataset.id;
            window.location.href = `/user/${userId}/video/${videoId}`;
        });
    });
}); 