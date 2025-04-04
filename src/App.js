import React, { useState, useEffect } from 'react';
import RecordingComponent from './components/RecordingComponent';
import ResultsComponent from './components/ResultsComponent';
import ApiKeyForm from './components/ApiKeyForm';
import Sidebar from './components/Sidebar';

// Use the contextBridge API instead of direct require
const electron = window.electron;

function App() {
  // Initialize apiKey state to null initially to differentiate between empty and not yet loaded
  const [apiKey, setApiKey] = useState(null);
  const [isRecording, setIsRecording] = useState(false);
  const [status, setStatus] = useState('idle'); // idle, requesting_access, recording, processing, transcribing, summarizing, complete, error, viewing
  const [recordedChunks, setRecordedChunks] = useState([]);
  const [mediaRecorder, setMediaRecorder] = useState(null);
  const [stream, setStream] = useState(null);
  const [results, setResults] = useState(null);
  const [error, setError] = useState(null);
  // --- NEW: State for audio devices ---
  const [audioDevices, setAudioDevices] = useState([]);
  const [selectedDeviceId, setSelectedDeviceId] = useState(''); // Store the selected device ID

  // Setup event listeners, including for API key management
  useEffect(() => {
    // Request the stored API key on initial load
    console.log("Requesting stored API key...");
    electron.send('get-api-key');

    const listeners = {
      'recording-started': () => setStatus('recording'),
      'recording-save-cancelled': () => setStatus('idle'),
      'recording-save-error': (errorMsg) => { setError(`Error saving recording: ${errorMsg}`); setStatus('error'); },
      'processing-started': () => setStatus('processing'),
      'transcribing-audio': () => setStatus('transcribing'),
      'generating-summary': () => setStatus('summarizing'),
      'processing-complete': (data) => { setResults(data); setStatus('complete'); },
      'processing-error': (errorMsg) => { setError(`Error processing recording: ${errorMsg}`); setStatus('error'); },
      // *** NEW: Handle loaded API key ***
      'api-key-loaded': (loadedKey) => {
        console.log("Received API key from main:", loadedKey ? 'Key received' : 'No key stored');
        setApiKey(loadedKey || ''); // Set to empty string if no key is stored
      },
      // *** NEW: Handle confirmation of cleared key ***
      'api-key-cleared': () => {
        console.log("API key confirmed cleared.");
        setApiKey(''); // Ensure frontend state is also cleared
      },
      // *** NEW: Listener for stop trigger from mini window ***
      'trigger-stop-recording': () => {
          console.log("App received: trigger-stop-recording");
          // Call the existing stop function if currently recording
          if (isRecording) { // Check state before calling
             stopRecording();
          }
      }
    };

    // Register listeners
    Object.entries(listeners).forEach(([channel, handler]) => {
      electron.receive(channel, handler);
    });

    // Cleanup on unmount (conceptual, as bridge might not support removeListener)
    return () => {
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
      // Ideally, remove listeners here if possible with the bridge API
    };
  }, [stream, isRecording]); // Add isRecording dependency for the trigger listener check

  // --- Effect to enumerate audio devices --- 
  useEffect(() => {
    const getDevices = async () => {
      try {
        await navigator.mediaDevices.getUserMedia({ audio: true }); // Request permission first
        const devices = await navigator.mediaDevices.enumerateDevices();
        const audioInputDevices = devices.filter(device => device.kind === 'audioinput');
        setAudioDevices(audioInputDevices);
        // Automatically select the default device if none is selected yet
        if (audioInputDevices.length > 0 && !selectedDeviceId) {
          const defaultDevice = audioInputDevices.find(d => d.deviceId === 'default');
          setSelectedDeviceId(defaultDevice ? defaultDevice.deviceId : audioInputDevices[0].deviceId);
        }
      } catch (err) {
        console.error("Error enumerating audio devices or getting permissions:", err);
        // Handle lack of permission or no devices found appropriately in the UI later
        setError("Could not get audio devices. Please ensure microphone permission is granted.");
      }
    };
    getDevices();
    
    // Optional: Listen for device changes
    navigator.mediaDevices.addEventListener('devicechange', getDevices);
    return () => {
      navigator.mediaDevices.removeEventListener('devicechange', getDevices);
    };
  }, []); // Run once on mount

  // Handle start recording - No longer sends API key explicitly
  const startRecording = async () => {
    setResults(null); 
    setError(null);
    setStatus('requesting_access');

    // Ensure a device is selected
    if (!selectedDeviceId) {
      setError("No audio input device selected.");
      setStatus('error');
      console.error('startRecording called without selectedDeviceId');
      return;
    }
    console.log(`Attempting to use audio device: ${selectedDeviceId}`);

    try {
      console.log("Attempting to get audio stream for specific device...");
      let audioStream;
      try {
        // *** Use selectedDeviceId in constraints ***
        const constraints = {
          audio: { 
            deviceId: { exact: selectedDeviceId } 
          },
          video: false
        };
        audioStream = await navigator.mediaDevices.getUserMedia(constraints);
        console.log("Got audio stream successfully for device:", selectedDeviceId);
      } catch (err) {
        console.error('Error getting audio stream for device:', selectedDeviceId, err);
        let userMessage = `Error getting access to selected microphone: ${err.message}.`;
        if (err.name === 'NotAllowedError') userMessage += ' Please grant microphone permission.';
        else if (err.name === 'NotFoundError') userMessage += ' Selected microphone not found.';
        else if (err.name === 'OverconstrainedError') userMessage += ` Constraints not satisfied for device (Exact ID: ${selectedDeviceId}).`;
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
      
      // *** Notify main process - Send API key ONLY IF IT WAS JUST ENTERED ***
      // We send it here so the main process can store it immediately.
      // If the key was already loaded, we don't need to send it again.
      // Check if the apiKey state has a value (meaning it was either loaded or just entered)
      if (apiKey) { 
          electron.send('start-recording', { apiKey: apiKey });
      } else {
          // This case should ideally not be reachable if the UI prevents recording without a key
          console.error("Attempting to start recording without an API key in the frontend state.");
          setError("API Key not set. Please provide an API Key.");
          setStatus('error');
          return;
      }

    } catch (err) {
      console.error('Unexpected error in startRecording:', err);
      setError(`Failed to start audio recording: ${err.message}`);
      setStatus('error');
    }
  };

  // Handle stop recording
  const stopRecording = () => {
    console.log("stopRecording function called in App.js");
    // Check if recorder exists and is actually recording
    if (mediaRecorder && mediaRecorder.state === "recording") { 
      mediaRecorder.stop(); // onstop event will handle the rest
      setIsRecording(false); // Update state immediately
      console.log("MediaRecorder stopped.");
      // No need to set status here, main process will send updates
    } else {
        console.warn("stopRecording called but no active media recorder found or not recording.");
        // Reset state just in case
        setIsRecording(false);
        if (status === 'recording') setStatus('idle');
    }

    // The rest of the logic (creating blob, sending to main) 
    // should be inside mediaRecorder.onstop = () => { ... } 
    // which is already set up in startRecording (or needs to be adjusted there)
    // Re-check startRecording to ensure onstop is correctly defined there.
     if (mediaRecorder) { // Ensure recorder exists before setting onstop if not already set
         mediaRecorder.onstop = () => {
           console.log("MediaRecorder onstop event fired.");
           if (stream) {
             stream.getTracks().forEach(track => track.stop()); 
           }
           if (recordedChunks.length === 0) {
               console.warn("onstop fired but no recorded chunks found.");
               setStatus('idle'); // Go back to idle if nothing was recorded
               return;
           }
           const blobMimeType = mediaRecorder.mimeType || 'audio/webm'; 
           console.log("Creating Blob with mimeType:", blobMimeType);
           const blob = new Blob(recordedChunks, { type: blobMimeType });
           setRecordedChunks([]); // Clear chunks immediately after creating blob

           blob.arrayBuffer().then(buffer => {
             console.log("Sending stop-recording IPC with buffer size:", buffer.byteLength);
             electron.send('stop-recording', { 
                 audioBuffer: new Uint8Array(buffer), 
                 mimeType: blobMimeType 
             });
           }).catch(error => {
                console.error("Error getting array buffer from blob:", error);
                setError("Failed to process recorded data.");
                setStatus('error');
           });
         };
     } else {
         console.error("stopRecording called but mediaRecorder is null.");
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

  // *** NEW: Handle clearing API key ***
  const handleClearApiKey = () => {
      console.log("Requesting to clear API key...");
      electron.send('clear-api-key');
      // State will be updated via 'api-key-cleared' listener
  };

  // --- NEW: Handler for device selection change ---
  const handleDeviceChange = (deviceId) => {
    setSelectedDeviceId(deviceId);
    console.log("Selected audio device ID:", deviceId);
  };

  return (
    <div className="drawer lg:drawer-open" data-theme="cupcake">
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
          <div className="">
            {/* Conditional Rendering for Main Content */} 
            {apiKey === null ? (
              <div className="text-center p-10">
                  <span className="loading loading-ring loading-lg"></span>
              </div>
            ) : !apiKey ? (
              <ApiKeyForm setApiKey={setApiKey} />
            ) : (
              // Main application content when API key is set
              <>
                {/* Show Recording Component if not viewing results */}
                {(status !== 'complete' && status !== 'viewing') && (
                  <RecordingComponent 
                    isRecording={isRecording}
                    startRecording={startRecording}
                    stopRecording={stopRecording}
                    status={status}
                    stream={stream}
                    // --- NEW PROPS --- 
                    audioDevices={audioDevices}
                    selectedDeviceId={selectedDeviceId}
                    onDeviceChange={handleDeviceChange}
                  />
                )}
                
                {/* Status Indicators */} 
                {status === 'processing' && <div className="alert alert-info mt-4 shadow-md">Processing recording... <span className="loading loading-dots loading-sm"></span></div>}
                {status === 'transcribing' && <div className="alert alert-info mt-4 shadow-md">Transcribing audio... <span className="loading loading-dots loading-sm"></span></div>}
                {status === 'summarizing' && <div className="alert alert-info mt-4 shadow-md">Generating summary... <span className="loading loading-dots loading-sm"></span></div>}

                {/* Results Component */} 
                {(status === 'complete' || status === 'viewing') && results && (
                  // Removed the margin-top here, handle spacing inside ResultsComponent now
                  <div className="">
                    <ResultsComponent results={results} isViewing={status === 'viewing'} />
                  </div>
                )}

                {/* Error Display */} 
                {status === 'error' && error && (
                   <div role="alert" className="alert alert-error mt-4 shadow-md">
                     <svg xmlns="http://www.w3.org/2000/svg" className="stroke-current shrink-0 h-6 w-6" fill="none" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 14l2-2m0 0l2-2m-2 2l-2 2m2-2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                     <span>{error}</span>
                   </div>
                 )}
              </>
            )}
          </div>
        </div>
      </div>
      <Sidebar onSelectRecording={handleSelectRecording} onStartMeeting={startRecording} />
    </div>
  );
}

export default App;