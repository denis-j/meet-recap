import React, { useState, useEffect } from 'react';
import RecordingComponent from './components/RecordingComponent';
import ResultsComponent from './components/ResultsComponent';
import ApiKeyForm from './components/ApiKeyForm';
import Sidebar from './components/Sidebar';

// Use the contextBridge API instead of direct require
const electron = window.electron;

function App() {
  const [apiKey, setApiKey] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const [status, setStatus] = useState('idle'); // idle, requesting_access, recording, processing, transcribing, summarizing, complete, error, viewing
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
      setResults(data); // Set results after processing
      setStatus('complete');
    });

    electron.receive('processing-error', (errorMsg) => {
      setError(`Error processing recording: ${errorMsg}`);
      setStatus('error');
    });

    // Cleanup on unmount
    return () => {
      // Stop any ongoing recording/stream
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
    };
  }, [stream]);

  // Handle start recording
  const startRecording = async () => {
    // Clear previous results/errors when starting a new recording
    setResults(null);
    setError(null);
    setStatus('requesting_access');

    try {
      const apiKeyToUse = apiKey;
      console.log("Attempting to get audio stream...");
      let audioStream;
      try {
        audioStream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
        console.log("Got audio stream successfully.");
      } catch (err) {
        console.error('Error getting audio stream:', err);
        let userMessage = `Error getting microphone access: ${err.message}.`;
        if (err.name === 'NotAllowedError') userMessage += ' Please grant microphone permission.';
        else if (err.name === 'NotFoundError') userMessage += ' No microphone found.';
        setError(userMessage);
        setStatus('error');
        return;
      }

      setStream(audioStream);

      let options = {};
      const supportedAudioTypes = [
        'audio/webm;codecs=opus', 'audio/ogg;codecs=opus', 'audio/webm', 'audio/ogg', 'audio/mp4', 'audio/aac'
      ];
      for (const type of supportedAudioTypes) {
        if (MediaRecorder.isTypeSupported(type)) {
          options = { mimeType: type };
          console.log("Using audio mimeType:", options.mimeType);
          break;
        }
      }
       if (!options.mimeType) console.warn('No specific audio mime type supported, using default.');
       
      const recorder = new MediaRecorder(audioStream, options);
      setMediaRecorder(recorder);

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) setRecordedChunks(prev => [...prev, e.data]);
      };

      console.log("Starting audio recording...");
      recorder.start(1000);
      setIsRecording(true);
      setStatus('recording');
      electron.send('start-recording', { apiKey: apiKeyToUse });
    } catch (err) {
      console.error('Unexpected error in startRecording:', err);
      setError(`Failed to start audio recording: ${err.message}`);
      setStatus('error');
    }
  };

  // Handle stop recording
  const stopRecording = () => {
    if (mediaRecorder && isRecording) {
      mediaRecorder.stop();
      setIsRecording(false);

      mediaRecorder.onstop = () => {
        if (stream) {
          stream.getTracks().forEach(track => track.stop());
        }
        const blobMimeType = mediaRecorder.mimeType || 'audio/webm';
        console.log("Creating Blob with mimeType:", blobMimeType);
        const blob = new Blob(recordedChunks, { type: blobMimeType });

        blob.arrayBuffer().then(buffer => {
          electron.send('stop-recording', { 
              audioBuffer: new Uint8Array(buffer), 
              mimeType: blobMimeType 
          });
          setRecordedChunks([]);
        });
      };
    }
  };

  // Handle selecting a recording from the sidebar
  const handleSelectRecording = (recording) => {
    console.log("App received selected recording:", recording);
    setResults(recording);
    setStatus('viewing');
    setError(null);

    const drawerCheckbox = document.getElementById('recordings-drawer');
    if (drawerCheckbox) drawerCheckbox.checked = false;
  };

  return (
    <div className="drawer lg:drawer-open">
      <input id="recordings-drawer" type="checkbox" className="drawer-toggle" />
      <div className="drawer-content flex flex-col">
        <div className="navbar bg-base-100 shadow-sm lg:hidden sticky top-0 z-10">
          <div className="flex-none">
            <label htmlFor="recordings-drawer" className="btn btn-square btn-ghost">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" className="inline-block w-5 h-5 stroke-current"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16"></path></svg>
            </label>
          </div>
          <div className="flex-1">
            <span className="btn btn-ghost text-xl normal-case">Meet Recap</span>
          </div>
        </div>

        <div className="p-4 md:p-8 flex-grow">
          <div className="max-w-4xl mx-auto">
            <h1 className="text-3xl font-bold mb-6 text-center text-primary hidden lg:block">Meet Recap</h1>

            {!apiKey ? (
              <ApiKeyForm setApiKey={setApiKey} />
            ) : (
              <>
                {status !== 'viewing' && (
                  <RecordingComponent 
                    isRecording={isRecording}
                    startRecording={startRecording}
                    stopRecording={stopRecording}
                    status={status}
                    stream={stream}
                  />
                )}
                
                <div className="mt-4 flex items-center justify-center gap-4 text-sm text-base-content/70">
                  <span>API key is set.</span>
                  <button 
                    className="btn btn-xs btn-ghost"
                    onClick={() => setApiKey('')}
                  >
                    Clear API Key
                  </button>
                  {status === 'viewing' && (
                     <button 
                      className="btn btn-xs btn-outline btn-primary"
                      onClick={() => {
                        setResults(null);
                        setStatus('idle');
                      }}
                    >
                      New Recording
                    </button>
                  )}
                </div>

                {status === 'processing' && <div className="alert alert-info mt-4">Processing recording...</div>}
                {status === 'transcribing' && <div className="alert alert-info mt-4">Transcribing audio...</div>}
                {status === 'summarizing' && <div className="alert alert-info mt-4">Generating summary...</div>}

                {(status === 'complete' || status === 'viewing') && results && (
                  <ResultsComponent results={results} isViewing={status === 'viewing'} />
                )}

                {status === 'error' && error && (
                  <div role="alert" className="alert alert-error mt-4">
                    <svg xmlns="http://www.w3.org/2000/svg" className="stroke-current shrink-0 h-6 w-6" fill="none" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 14l2-2m0 0l2-2m-2 2l-2 2m2-2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                    <span>{error}</span>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>

      <Sidebar onSelectRecording={handleSelectRecording} />
    </div>
  );
}

export default App;