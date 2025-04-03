const { contextBridge, ipcRenderer } = require('electron');

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld(
  'electron',
  {
    // For sending messages to main process
    send: (channel, data) => {
      const validChannels = [
        'start-recording',
        'stop-recording',
        'get-recordings',
        'update-meeting-details',
        'get-api-key',
        'clear-api-key'
      ];
      if (validChannels.includes(channel)) {
        ipcRenderer.send(channel, data);
      }
    },
    // For receiving messages from main process
    receive: (channel, func) => {
      const validChannels = [
        'recording-started',
        'recording-save-cancelled',
        'recording-save-error',
        'processing-started',
        'transcribing-audio',
        'generating-summary',
        'processing-complete',
        'processing-error',
        'recordings-updated',
        'api-key-loaded',
        'api-key-cleared'
      ];
      if (validChannels.includes(channel)) {
        // Deliberately strip event as it includes `sender`
        ipcRenderer.on(channel, (event, ...args) => func(...args));
      }
    }
  }
);