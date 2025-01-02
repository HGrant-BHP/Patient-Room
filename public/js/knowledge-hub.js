document.addEventListener('DOMContentLoaded', () => {
    const videosContainer = document.getElementById('videos-container');
    const gridViewBtn = document.getElementById('grid-view');
    const listViewBtn = document.getElementById('list-view');
    const searchInput = document.getElementById('video-search');
    const videoCards = document.querySelectorAll('.video-card');
    const userId = document.body.dataset.userId;

    // View Toggle
    gridViewBtn.addEventListener('click', () => {
        videosContainer.className = 'grid-view';
        gridViewBtn.classList.add('active');
        listViewBtn.classList.remove('active');
    });

    listViewBtn.addEventListener('click', () => {
        videosContainer.className = 'list-view';
        listViewBtn.classList.add('active');
        gridViewBtn.classList.remove('active');
    });

    // Search Functionality
    searchInput.addEventListener('input', (e) => {
        const searchTerm = e.target.value.toLowerCase();
        
        videoCards.forEach(card => {
            const title = card.querySelector('h3').textContent.toLowerCase();
            const description = card.querySelector('p').textContent.toLowerCase();
            
            if (title.includes(searchTerm) || description.includes(searchTerm)) {
                card.style.display = '';
            } else {
                card.style.display = 'none';
            }
        });
    });

    // Video Click Handler with userId
    videoCards.forEach(card => {
        card.addEventListener('click', () => {
            const videoId = card.dataset.id;
            window.location.href = `/user/${userId}/video/${videoId}`;
        });
    });
}); 