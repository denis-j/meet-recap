import React, { useRef, useEffect } from 'react';
import "../index.css"

function RecordingComponent({ isRecording, startRecording, stopRecording, stream }) {
  const videoRef = useRef(null);

  // Set up video stream when available
  useEffect(() => {
    if (stream && videoRef.current) {
      videoRef.current.srcObject = stream;
    }
  }, [stream]);

  return (
    <div className="card bg-base-100">
      <div className="card-body items-center text-center">
        <h2 className="card-title text-2xl mb-2">Record Meeting</h2>
        <p className="text-base-content/70 max-w-md mb-8">
          Click "Start Recording" to capture your screen and audio. 
          When finished, click "Stop Recording" to process and summarize.
        </p>
        
        <div className="card-actions">
          {!isRecording ? (
            <button 
              className="btn btn-primary btn-lg gap-2" 
              onClick={startRecording}
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
              className="btn btn-error btn-lg gap-2" 
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