import React, { useRef, useEffect } from 'react';
import "../index.css"

function RecordingComponent({ 
  isRecording, 
  startRecording, 
  stopRecording, 
  stream, 
  audioDevices = [], // Default to empty array
  selectedDeviceId, 
  onDeviceChange 
}) {
  const videoRef = useRef(null);

  // Set up video stream when available
  useEffect(() => {
    if (stream && videoRef.current) {
      videoRef.current.srcObject = stream;
    }
  }, [stream]);

  return (
    <div className="card bg-base-100 shadow-xl rounded-lg">
      <div className="card-body items-center text-center">
        <h2 className="card-title text-2xl mb-2">Record Meeting</h2>
        <p className="text-base-content/70 max-w-md mb-6">
          Select your audio input device, then click "Start Recording".
        </p>
        
        {/* --- Audio Device Selector --- */}
        <div className="form-control w-full max-w-xs mb-6">
          <label className="label">
            <span className="label-text">Audio Input Device</span>
          </label>
          <select 
            className="select select-bordered select-sm rounded-lg" 
            value={selectedDeviceId || ''} // Ensure controlled component
            onChange={(e) => onDeviceChange(e.target.value)}
            disabled={isRecording} // Disable while recording
          >
            {audioDevices.length === 0 && <option value="" disabled>Loading devices...</option>}
            {audioDevices.map(device => (
              <option key={device.deviceId} value={device.deviceId}>
                {device.label || `Device ${device.deviceId.substring(0, 6)}`}
              </option>
            ))}
          </select>
        </div>
        {/* --- End Audio Device Selector --- */}

        <div className="card-actions">
          {!isRecording ? (
            <button 
              className="btn btn-primary btn-lg gap-2 rounded-lg" 
              onClick={startRecording}
              // Disable button if no device is selected
              disabled={!selectedDeviceId || audioDevices.length === 0}
            >
              <svg xmlns="http://www.w3.org/2000/svg" 
                   className="h-6 w-6" 
                   viewBox="0 0 24 24" 
                   fill="currentColor">
                <circle cx="12" cy="12" r="6"/>
              </svg>
              Start Recording
            </button>
          ) : (
            <button 
              className="btn btn-error btn-lg gap-2 rounded-lg" 
              onClick={stopRecording}
            >
              <svg xmlns="http://www.w3.org/2000/svg" 
                   className="h-6 w-6" 
                   viewBox="0 0 24 24" 
                   fill="currentColor">
                <rect x="6" y="6" width="12" height="12"/>
              </svg>
              Stop Recording
            </button>
          )}
        </div>
        
        {isRecording && stream && (
          <div className="w-full mt-6">
            <div className="alert alert-info">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 animate-pulse" fill="currentColor" viewBox="0 0 24 24">
                <circle cx="12" cy="12" r="12"/>
              </svg>
              <span>Recording in progress...</span>
            </div>
            
            <div className="mt-4 rounded-box overflow-hidden border-2 border-base-300">
              <video 
                ref={videoRef} 
                autoPlay 
                muted 
                className="w-full max-h-[400px] object-contain bg-base-200"
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default RecordingComponent; 