import React, { useRef, useEffect } from 'react';

function RecordingComponent({ isRecording, startRecording, stopRecording, stream }) {
  const videoRef = useRef(null);

  // Set up video stream when available
  useEffect(() => {
    if (stream && videoRef.current) {
      videoRef.current.srcObject = stream;
    }
  }, [stream]);

  return (
    <div>
      <h2>Record Meeting</h2>
      <p>
        Click "Start Recording" to capture your screen and audio. 
        When finished, click "Stop Recording" to process and summarize.
      </p>
      
      <div className="controls">
        {!isRecording ? (
          <button onClick={startRecording}>Start Recording</button>
        ) : (
          <button onClick={stopRecording}>Stop Recording</button>
        )}
      </div>
      
      {isRecording && stream && (
        <div className="video-preview">
          <video 
            ref={videoRef} 
            autoPlay 
            muted 
            style={{ width: '100%', maxHeight: '400px' }}
          />
        </div>
      )}
      
      {isRecording && (
        <div className="status recording">
          <span className="recording-indicator">●</span> Recording in progress...
        </div>
      )}
    </div>
  );
}

export default RecordingComponent; 