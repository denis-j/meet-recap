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
        'api-key-cleared',
        'trigger-stop-recording'
      ];
      if (validChannels.includes(channel)) {
        const listener = (event, ...args) => func(...args);
        ipcRenderer.on(channel, listener);
        // Return cleanup function
        return () => ipcRenderer.removeListener(channel, listener);
      }
      // Return no-op cleanup if channel is invalid
      return () => {};
    }
  }
);