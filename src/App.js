import React, { useState, useEffect, useRef } from 'react';
import RecordingComponent from './components/RecordingComponent';
import ResultsComponent from './components/ResultsComponent';
import ApiKeyForm from './components/ApiKeyForm';

// Use the contextBridge API instead of direct require
const electron = window.electron;

function App() {
  const [apiKey, setApiKey] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const [status, setStatus] = useState('idle');
  const [recordedChunks, setRecordedChunks] = useState([]);
  const [mediaRecorder, setMediaRecorder] = useState(null);
  const [stream, setStream] = useState(null);
  const [results, setResults] = useState(null);
  const [error, setError] = useState(null);

  // Setup event listeners
  useEffect(() => {
    electron.receive('recording-started', () => {
      setStatus('recording');
    });

    electron.receive('recording-save-cancelled', () => {
      setStatus('idle');
    });

    electron.receive('recording-save-error', (errorMsg) => {
      setError(`Error saving recording: ${errorMsg}`);
      setStatus('error');
    });

    electron.receive('processing-started', () => {
      setStatus('processing');
    });

    electron.receive('transcribing-audio', () => {
      setStatus('transcribing');
    });

    electron.receive('generating-summary', () => {
      setStatus('summarizing');
    });

    electron.receive('processing-complete', (data) => {
      setResults(data);
      setStatus('complete');
    });

    electron.receive('processing-error', (errorMsg) => {
      setError(`Error processing recording: ${errorMsg}`);
      setStatus('error');
    });

    // Cleanup on unmount
    return () => {
      // Note: We can't remove listeners with the bridge API
      // but the window will be destroyed anyway
      
      // Stop any ongoing recording/stream
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
    };
  }, [stream]);

  // Handle start recording
  const startRecording = async () => {
    try {
      setError(null);
      setStatus('requesting_access');

      // Set OpenAI API key
      const apiKeyToUse = apiKey;

      console.log("Attempting to get audio stream using navigator.mediaDevices.getUserMedia...");

      let audioStream;
      try {
        // Request microphone access
        audioStream = await navigator.mediaDevices.getUserMedia({
          audio: true,
          video: false // Explicitly no video
        });
        console.log("Got audio stream successfully.");
      } catch (err) {
        console.error('Error getting audio stream:', err);
        // Handle common errors
        let userMessage = `Error getting microphone access: ${err.message}.`;
        if (err.name === 'NotAllowedError') {
          userMessage += ' Please grant microphone permission in System Settings -> Privacy & Security -> Microphone.';
        } else if (err.name === 'NotFoundError') {
          userMessage += ' No microphone found.';
        }
        setError(userMessage);
        setStatus('error');
        return; // Stop execution
      }

      setStream(audioStream); // Store the audio-only stream

      // Create MediaRecorder for audio
      let options = {};
      const supportedAudioTypes = [
        'audio/webm;codecs=opus',
        'audio/ogg;codecs=opus',
        'audio/webm',
        'audio/ogg',
        'audio/mp4', // Less common for recording but possible
        'audio/aac'
      ];

      for (const type of supportedAudioTypes) {
        if (MediaRecorder.isTypeSupported(type)) {
          options = { mimeType: type };
          break; // Use the first supported type
        }
      }

       if (!options.mimeType) {
         console.warn('No specific audio mime type supported, using default.');
         // Let the browser decide the default audio mimeType
       } else {
          console.log("Using audio mimeType:", options.mimeType);
       }


      const recorder = new MediaRecorder(audioStream, options);
      setMediaRecorder(recorder);

      // Event handler for dataavailable
      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          setRecordedChunks(prev => [...prev, e.data]);
        }
      };

      // Start recording
      console.log("Starting audio recording...");
      recorder.start(1000); // Collect chunks every second
      setIsRecording(true);
      setStatus('recording');
      setError(null);

      // Notify main process (sending API key is still useful)
      electron.send('start-recording', { apiKey: apiKeyToUse });

    } catch (err) {
      // Catch any unexpected errors during the setup
      console.error('Unexpected error in startRecording:', err);
      setError(`Failed to start audio recording: ${err.message}`);
      setStatus('error');
    }
  };

  // Handle stop recording - needs adjustment for audio mime type
  const stopRecording = () => {
    if (mediaRecorder && isRecording) {
      mediaRecorder.stop();
      setIsRecording(false);

      mediaRecorder.onstop = () => {
        if (stream) {
          stream.getTracks().forEach(track => track.stop()); // Stop microphone
        }

        // Determine the correct mime type for the Blob
        const blobMimeType = mediaRecorder.mimeType || 'audio/webm'; // Fallback if mimeType isn't set
        console.log("Creating Blob with mimeType:", blobMimeType);

        const blob = new Blob(recordedChunks, {
          type: blobMimeType
        });

        blob.arrayBuffer().then(buffer => {
          // Send the raw audio blob buffer and its mime type to the main process
          electron.send('stop-recording', {
              audioBuffer: new Uint8Array(buffer),
              mimeType: blobMimeType // Send mime type for correct handling
          });
          setRecordedChunks([]);
        });
      };
    }
  };

  return (
    <div className="container">
      <h1>Meeting Recorder & Summarizer</h1>
      
      {!apiKey && (
        <ApiKeyForm setApiKey={setApiKey} />
      )}
      
      {apiKey && (
        <RecordingComponent 
          isRecording={isRecording}
          startRecording={startRecording}
          stopRecording={stopRecording}
          status={status}
        />
      )}
      
      {status === 'processing' && (
        <div className="status loading">
          Processing recording...
        </div>
      )}
      
      {status === 'transcribing' && (
        <div className="status loading">
          Transcribing audio...
        </div>
      )}
      
      {status === 'summarizing' && (
        <div className="status loading">
          Generating summary...
        </div>
      )}
      
      {status === 'complete' && results && (
        <ResultsComponent results={results} />
      )}
      
      {status === 'error' && error && (
        <div className="error">
          {error}
        </div>
      )}
    </div>
  );
}

export default App; 