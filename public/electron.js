const { app, BrowserWindow, ipcMain, dialog, desktopCapturer } = require('electron');
const path = require('path');
const isDev = require('electron-is-dev');
const fs = require('fs');
const ffmpeg = require('fluent-ffmpeg');
const { OpenAI } = require('openai');

let mainWindow;

// Store API key
let openaiApiKey = '';

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 900,
    height: 680,
    webPreferences: {
      nodeIntegration: false, // For security
      contextIsolation: true, // Protect against prototype pollution
      enableRemoteModule: false, // Keep remote module disabled
      preload: path.join(__dirname, 'preload.js'), // Use preload script
    },
  });

  mainWindow.loadURL(
    isDev
      ? 'http://localhost:3000'
      : `file://${path.join(__dirname, '../build/index.html')}`
  );

  if (isDev) {
    mainWindow.webContents.openDevTools();
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
app.whenReady().then(() => {
  createWindow();
  
  // Register the get-sources handler here
  // ipcMain.handle('get-sources', async () => {
  //   try {
  //     const sources = await desktopCapturer.getSources({ 
  //       types: ['window', 'screen'],
  //       thumbnailSize: { width: 150, height: 150 } 
  //     });
  //     
  //     return sources.map(source => ({
  //       id: source.id,
  //       name: source.name,
  //       thumbnail: source.thumbnail.toDataURL()
  //     }));
  //   } catch (error) {
  //     console.error('Error getting sources:', error);
  //     throw error;
  //   }
  // });
  
  // On macOS it's common to re-create a window in the app when the
  // dock icon is clicked and there are no other windows open.
  app.on('activate', function () {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

// Quit when all windows are closed, except on macOS. There, it's common
// for applications and their menu bar to stay active until the user quits
// explicitly with Cmd + Q.
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

// Handle start recording
ipcMain.on('start-recording', (event, options) => {
  // Store API key for later use
  if (options && options.apiKey) {
    openaiApiKey = options.apiKey;
  }
  
  // Reply to renderer that recording has started
  event.reply('recording-started');
});

// Handle stop recording
ipcMain.on('stop-recording', async (event, data) => { // data contains audioBuffer and mimeType
  try {
    const { audioBuffer, mimeType } = data;
    if (!audioBuffer) {
        throw new Error("No audio buffer received");
    }

    // --- FIX: Ensure audioBuffer is a Buffer --- 
    let bufferToWrite;
    // Check if it arrived as an object with numeric keys (common IPC serialization)
    // or if it's already a Buffer/TypedArray
    if (Buffer.isBuffer(audioBuffer)) {
        bufferToWrite = audioBuffer;
    } else if (typeof audioBuffer === 'object' && audioBuffer !== null && !(audioBuffer instanceof Uint8Array)) {
        console.log("Received audioBuffer as a plain object, attempting conversion.");
        // Extract values in order - assumes keys are '0', '1', ...
        try {
            const byteValues = Object.keys(audioBuffer)
                                   .sort((a, b) => parseInt(a) - parseInt(b)) // Ensure correct order
                                   .map(key => audioBuffer[key]);
            bufferToWrite = Buffer.from(byteValues);
        } catch (conversionError) {
            console.error("Error converting received object to Buffer:", conversionError);
            throw new Error("Failed to convert received audio data object.");
        }
    } else {
        // Assume it arrived as a type Buffer.from() understands (like Uint8Array)
        try {
            bufferToWrite = Buffer.from(audioBuffer);
        } catch (conversionError) {
            console.error("Error creating Buffer from received data:", conversionError);
            throw new Error("Failed to create Buffer from received audio data.");
        }
    }

    if (!Buffer.isBuffer(bufferToWrite) || bufferToWrite.length === 0) {
         console.error("Failed to create valid Buffer for writing. Received data:", audioBuffer);
         throw new Error("Received audio data could not be converted to a valid Buffer for saving.");
    }
    // --- END FIX --- 

    // Determine file extension based on mime type
    let fileExtension = '.webm'; // Default
    if (mimeType) {
        if (mimeType.includes('ogg')) fileExtension = '.ogg';
        else if (mimeType.includes('mp4')) fileExtension = '.mp4';
        else if (mimeType.includes('aac')) fileExtension = '.aac';
        // webm is a good default if unsure
    }

    // Ask user where to save the audio recording
    const { filePath } = await dialog.showSaveDialog({
      title: 'Save Audio Recording',
      defaultPath: path.join(app.getPath('music'), `meeting-audio${fileExtension}`), // Save in Music folder
      filters: [{ name: 'Audio Files', extensions: [fileExtension.substring(1)] }], // Use correct extension
    });

    if (!filePath) {
      event.reply('recording-save-cancelled');
      return;
    }

    // Write the correctly converted buffer to disk
    fs.writeFileSync(filePath, bufferToWrite);
    console.log(`Audio saved to: ${filePath}`);

    // Generate transcript and summary
    event.reply('processing-started');

    // No need for ffmpeg conversion anymore!
    const audioFilePath = filePath;

    try {
      event.reply('transcribing-audio');

      // Use the stored API key
      const openai = new OpenAI({
        apiKey: openaiApiKey,
      });

      console.log(`Transcribing audio file: ${audioFilePath}`);

      // Transcribe the audio using OpenAI's Whisper
      // Use the file directly
      const transcription = await openai.audio.transcriptions.create({
        file: fs.createReadStream(audioFilePath),
        model: "whisper-1",
      });

      console.log("Transcription successful. Length:", transcription.text.length);
      console.log("First 100 chars of transcription:", transcription.text.substring(0, 100));
      
      event.reply('generating-summary');

      // Generate a summary using OpenAI
      const summary = await openai.chat.completions.create({
        model: "gpt-4", // Or your preferred model
        messages: [
          {
            role: "system",
            content: "You are a helpful assistant that summarizes meeting transcripts. Create a concise summary with key points, action items, and decisions made."
          },
          {
            role: "user",
            content: `Here is the meeting transcript:\n\n${transcription.text}\n\nPlease provide a summary.`
          }
        ],
      });

      console.log("Summary generation successful.");
      console.log("Raw summary response:", JSON.stringify(summary, null, 2));
      console.log("Summary content:", summary.choices[0].message.content);

      // Send the results back to the renderer
      const resultsToSend = {
        transcript: transcription.text,
        summary: summary.choices[0].message.content,
        audioFilePath,
        videoFilePath: null
      };
      
      console.log("Sending results to renderer. Summary length:", resultsToSend.summary.length);
      event.reply('processing-complete', resultsToSend);

    } catch (error) {
      console.error('Error processing audio recording:', error);
      // Clean up the saved file if processing fails?
      // fs.unlinkSync(audioFilePath); // Optional: Delete file on error
      event.reply('processing-error', error.message);
    }

  } catch (error) {
    console.error('Error handling stop-recording:', error);
    event.reply('recording-save-error', error.message);
  }
}); 