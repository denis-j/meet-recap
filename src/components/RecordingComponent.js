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
    <div className="card bg-base-100 shadow-xl p-6 mx-auto mt-10 max-w-2xl">
      <h2 className="card-title text-2xl mb-4">Record Meeting</h2>
      <p className="text-base-content/80 mb-6">
        Click "Start Recording" to capture your screen and audio. 
        When finished, click "Stop Recording" to process and summarize.
      </p>
      
      <div className="flex justify-center mb-6">
        {!isRecording ? (
          <button className="btn btn-primary btn-lg" onClick={startRecording}>
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <circle cx="12" cy="12" r="10" strokeWidth="2"/>
              <circle cx="12" cy="12" r="4" fill="currentColor"/>
            </svg>
            Start Recording
          </button>
        ) : (
          <button className="btn btn-error btn-lg" onClick={stopRecording}>
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <rect x="6" y="6" width="12" height="12" fill="currentColor"/>
            </svg>
            Stop Recording
          </button>
        )}
      </div>
      
      {isRecording && stream && (
        <div className="video-preview rounded-box overflow-hidden mb-6 border-2 border-base-300">
          <video 
            ref={videoRef} 
            autoPlay 
            muted 
            className="w-full max-h-[400px] object-contain bg-base-200"
          />
        </div>
      )}
      
      {isRecording && (
        <div className="alert alert-info shadow-lg">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 animate-pulse" fill="currentColor" viewBox="0 0 24 24">
            <circle cx="12" cy="12" r="12"/>
          </svg>
          <span>Recording in progress...</span>
        </div>
      )}
    </div>
  );
}

export default RecordingComponent; 