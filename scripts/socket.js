const socket = io({
    auth: {
        userId: document.getElementById('userId').textContent
    }
});

const usernameSpan = document.getElementById('username');
const alertButton = document.getElementById('alertButton');

// Handle connection errors
socket.on('connect_error', (error) => {
    if (error.message === 'Invalid ID') {
        alert('Connection failed: Invalid ID');
        alertButton.disabled = true;
    }
});

// Update username dynamically
socket.on('username_updated', ({ username }) => {
    usernameSpan.textContent = username;
});

// Handle alert button click
alertButton.addEventListener('click', () => {
    socket.emit('alert_clicked');
    alertButton.disabled = true;
    setTimeout(() => {
        alertButton.disabled = false;
    }, 5000); // Re-enable after 5 seconds
});
