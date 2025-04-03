const timerElement = document.getElementById('timer');
const stopButton = document.getElementById('stop-btn');

// Listen for timer updates from main process
const cleanupTimerListener = window.electronMini.receive('update-timer', (timeString) => {
    if (timerElement) {
        timerElement.textContent = timeString;
    }
});

stopButton.addEventListener('click', () => {
    console.log('Mini window stop button clicked');
    window.electronMini.send('mini-stop-recording');
    // Optionally disable button after click
    stopButton.disabled = true;
    stopButton.textContent = 'Stopping...'; // Provide feedback
});

console.log('Mini player renderer loaded.');

// Optional: Cleanup listener when the window is potentially closed
window.addEventListener('beforeunload', () => {
    if (typeof cleanupTimerListener === 'function') {
        cleanupTimerListener(); // Clean up the IPC listener
    }
});