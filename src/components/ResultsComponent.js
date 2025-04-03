import React, { useState } from 'react';

function ResultsComponent({ results }) {
  const [activeTab, setActiveTab] = useState('summary');
  
  if (!results) {
    return null;
  }
  
  const { transcript, summary, videoFilePath, audioFilePath } = results;
  
  return (
    <div className="results-container">
      <h2>Meeting Results</h2>
      
      <div className="tab-container">
        <div className="tab-buttons">
          <button 
            className={`tab-button ${activeTab === 'summary' ? 'active' : ''}`}
            onClick={() => setActiveTab('summary')}
          >
            Summary
          </button>
          <button 
            className={`tab-button ${activeTab === 'transcript' ? 'active' : ''}`}
            onClick={() => setActiveTab('transcript')}
          >
            Full Transcript
          </button>
        </div>
        
        <div className="tab-content">
          <div className={activeTab === 'summary' ? '' : 'hidden'}>
            <h3>Meeting Summary</h3>
            <div className="summary-content">
              {summary.split('\n').map((paragraph, idx) => (
                <p key={idx}>{paragraph}</p>
              ))}
            </div>
          </div>
          
          <div className={activeTab === 'transcript' ? '' : 'hidden'}>
            <h3>Full Transcript</h3>
            <div className="transcript-content">
              {transcript.split('\n').map((paragraph, idx) => (
                <p key={idx}>{paragraph}</p>
              ))}
            </div>
          </div>
        </div>
      </div>
      
      <div className="file-info">
        <h3>Recording Files</h3>
        <p>Video saved at: {videoFilePath}</p>
        <p>Audio saved at: {audioFilePath}</p>
      </div>
    </div>
  );
}

export default ResultsComponent; 