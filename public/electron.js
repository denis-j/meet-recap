const { app, BrowserWindow, ipcMain, dialog, desktopCapturer } = require('electron');
const path = require('path');
const isDev = require('electron-is-dev');
const fs = require('fs');
const ffmpeg = require('fluent-ffmpeg');
const { OpenAI } = require('openai');

let mainWindow;

// Store API key
let openaiApiKey = '';

// Simplified function to return a static default display name
function formatDefaultDisplayName(name) {
  // No longer parses the name, just returns a default string
  return "Meeting"; 
}

// Function to get all recordings from the music directory
function getRecordings() {
  const musicDir = app.getPath('music');
  try {
    const filesData = fs.readdirSync(musicDir) 
      .filter(file => file.startsWith('meeting_') && file.endsWith('.json'))
      .map(file => {
        const filePath = path.join(musicDir, file);
        let summary = 'Summary not available.'; 
        let transcript = 'Transcript not available.';
        let audioFilePath = 'Audio file path not available.';
        let fileSize = 'N/A';
        let fileDateStr = 'N/A'; // String for display
        let fileTimestamp = 0; // Timestamp for sorting
        let displayName = formatDefaultDisplayName(file); 
        let tags = []; 
        let recordingTimestampFromJson = null; // Store timestamp from JSON if available

        try {
          // First, try reading the JSON to get the original timestamp
          const jsonData = fs.readFileSync(filePath, 'utf-8');
          const parsedData = JSON.parse(jsonData);
          summary = parsedData.summary || summary;
          transcript = parsedData.transcript || transcript;
          audioFilePath = parsedData.audioFilePath || audioFilePath;
          displayName = parsedData.displayName || displayName; 
          tags = parsedData.tags || tags;
          // *** READ original timestamp from JSON ***
          recordingTimestampFromJson = parsedData.recordingTimestamp || null;

          // Get file stats for size and fallback date/timestamp
          const stats = fs.statSync(filePath);
          fileSize = (stats.size / 1024).toFixed(2) + ' KB'; 

          // *** Use JSON timestamp if available, otherwise use file mtime ***
          if (recordingTimestampFromJson && !isNaN(recordingTimestampFromJson)) {
              fileTimestamp = recordingTimestampFromJson;
              fileDateStr = new Date(recordingTimestampFromJson).toLocaleString();
          } else {
              // Fallback for older files without the timestamp
              fileTimestamp = stats.mtime.getTime(); 
              fileDateStr = stats.mtime.toLocaleString(); 
              console.warn(`File ${filePath} missing recordingTimestamp, using mtime as fallback.`);
          }

        } catch (readError) {
          console.error(`Error reading or parsing file ${filePath}:`, readError);
          // If JSON reading fails completely, try getting basic file stats as fallback
          try {
            const stats = fs.statSync(filePath);
            fileTimestamp = stats.mtime.getTime();
            fileDateStr = stats.mtime.toLocaleString();
            fileSize = (stats.size / 1024).toFixed(2) + ' KB';
          } catch (statError) {
              console.error(`Could not get stats for file ${filePath}:`, statError);
          }
        }

        return {
          jsonPath: filePath, 
          displayName: displayName, 
          date: fileDateStr, // Use date derived from original timestamp (or mtime fallback)
          timestamp: fileTimestamp, // Use original timestamp for sorting (or mtime fallback)
          size: fileSize, 
          tags: tags, 
          summary: summary,
          transcript: transcript,
          audioFilePath: audioFilePath,
          // Include the original timestamp itself if needed elsewhere
          recordingTimestamp: recordingTimestampFromJson 
        };
      });
      
      filesData.sort((a, b) => b.timestamp - a.timestamp); 

    return filesData;
  } catch (dirError) {
    console.error(`Error reading directory ${musicDir}:`, dirError);
    return []; 
  }
}

// Function to update recordings list in renderer
function updateRecordingsList() {
  if (mainWindow) {
    const recordings = getRecordings();
    mainWindow.webContents.send('recordings-updated', recordings);
  }
}

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
    }

    // Generate filename with current date and time
    const now = new Date();
    const dateStr = now.toISOString()
        .replace(/[:.]/g, '-') // Replace : and . with -
        .replace('T', '_') // Replace T with _
        .split('.')[0]; // Remove milliseconds
    const defaultFileName = `meeting_${dateStr}${fileExtension}`;
    
    // Use the Music directory as default save location
    const musicDir = app.getPath('music');
    const defaultPath = path.join(musicDir, defaultFileName);

    // Ask user where to save the audio recording
    const { filePath } = await dialog.showSaveDialog({
      title: 'Save Audio Recording',
      defaultPath: defaultPath,
      filters: [{ name: 'Audio Files', extensions: [fileExtension.substring(1)] }],
    });

    if (!filePath) {
      event.reply('recording-save-cancelled');
      return;
    }

    // Write the correctly converted buffer to disk
    fs.writeFileSync(filePath, bufferToWrite);
    console.log(`Audio saved to: ${filePath}`);

    // Update recordings list immediately after saving
    updateRecordingsList();

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

      // *** Get the timestamp from when recording *stopped* ***
      const recordingTimestamp = now.getTime(); // Use the 'now' Date object already defined

      // Prepare results object - ADD recordingTimestamp
      const defaultDisplayName = formatDefaultDisplayName(`meeting_${dateStr}`); 
      const resultsToSave = {
        recordingTimestamp: recordingTimestamp, // *** ADD timestamp ***
        displayName: defaultDisplayName, 
        tags: [], 
        transcript: transcription.text,
        summary: summary.choices[0].message.content,
        audioFilePath, 
      };

      // --- Save results to JSON --- 
      try {
        // Generate JSON file path based on the *audio* file path chosen by user
        const jsonFilePath = audioFilePath.replace(/\.[^/.]+$/, '.json'); 
        const jsonData = JSON.stringify(resultsToSave, null, 2); 
        fs.writeFileSync(jsonFilePath, jsonData);
        console.log(`Results saved to: ${jsonFilePath}`);
        updateRecordingsList(); 
      } catch (jsonError) {
        console.error('Error saving results JSON:', jsonError);
      }
      // --- End Save results to JSON ---
      
      // Send results back to renderer (include the timestamp)
      console.log("Sending results to renderer:", resultsToSave);
      event.reply('processing-complete', resultsToSave);

    } catch (processingError) { // Catch errors specific to transcription/summary
      console.error('Error during transcription or summary:', processingError);
      event.reply('processing-error', `Error during processing: ${processingError.message}`);
      // Note: The audio file is already saved at this point.
      // You might want to send partial results or just the error.
      // Example: event.reply('processing-complete', { transcript: null, summary: null, audioFilePath }); 
      // Or just let the error reply handle it.
    }

  } catch (error) {
    console.error('Error handling stop-recording:', error);
    event.reply('recording-save-error', error.message);
  }
});

// Add new IPC handlers for recordings
ipcMain.on('get-recordings', () => {
  updateRecordingsList();
});

// *** NEW: Handler to update meeting details ***
ipcMain.on('update-meeting-details', (event, { jsonPath, displayName, tags }) => {
  console.log('Received update-meeting-details:', { jsonPath, displayName, tags });
  try {
    if (!jsonPath || typeof jsonPath !== 'string') {
      throw new Error('Invalid or missing jsonPath for update.');
    }

    // *** Read current stats BEFORE potential modification ***
    let needsTimestampBackfill = false;
    let timestampToBackfill = 0;
    const stats = fs.statSync(jsonPath); // Get stats regardless

    // Read the existing file content
    const jsonData = fs.readFileSync(jsonPath, 'utf-8');
    const meetingData = JSON.parse(jsonData);

    // *** Check if timestamp is missing and needs backfilling ***
    if (!meetingData.recordingTimestamp || isNaN(meetingData.recordingTimestamp)) {
        needsTimestampBackfill = true;
        timestampToBackfill = stats.mtime.getTime(); // Use mtime from BEFORE update
        console.log(`File ${jsonPath} is missing recordingTimestamp. Will backfill with mtime: ${new Date(timestampToBackfill).toISOString()}`);
        meetingData.recordingTimestamp = timestampToBackfill; // Add it to the object
    }

    // Update the display name and tags
    meetingData.displayName = displayName; 
    meetingData.tags = tags; 

    // Write the updated data back to the file
    // This will update mtime, but we've already captured the old one if needed
    fs.writeFileSync(jsonPath, JSON.stringify(meetingData, null, 2));
    console.log(`Updated meeting details in: ${jsonPath}${needsTimestampBackfill ? ' (and backfilled timestamp)' : ''}`);

    // Refresh the sidebar list
    updateRecordingsList();

  } catch (error) {
    console.error('Error updating meeting details:', error);
  }
}); 