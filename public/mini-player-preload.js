const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronMini', {
    // Send from mini-renderer to main
    send: (channel, data) => {
        // Whitelist channels sender can use
        const validSendChannels = ['mini-stop-recording'];
        if (validSendChannels.includes(channel)) {
            ipcRenderer.send(channel, data);
        }
    },
    // Receive from main in mini-renderer
    receive: (channel, func) => {
        // Whitelist channels receiver can listen to
        const validReceiveChannels = ['update-timer'];
        if (validReceiveChannels.includes(channel)) {
            // Deliberately strip event as it includes `sender`
            ipcRenderer.on(channel, (event, ...args) => func(...args));
            // Return cleanup function
            return () => ipcRenderer.removeListener(channel, func);
        }
    },
    // Invoke from mini-renderer to main (if needed for synchronous actions)
    // invoke: async (channel, data) => {
    //     const validInvokeChannels = []; // Define if needed
    //     if (validInvokeChannels.includes(channel)) {
    //         return await ipcRenderer.invoke(channel, data);
    //     }
    // }
});

console.log('Mini Preload Script Loaded');
