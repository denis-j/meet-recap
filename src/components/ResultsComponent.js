import React, { useState } from 'react';

function ResultsComponent({ results }) {
  const [activeTab, setActiveTab] = useState('summary');
  
  if (!results) return null;
  
  const { transcript, summary, audioFilePath } = results;
  
  if (!summary && !transcript) {
    return (
      <div className="alert alert-warning">
        <svg xmlns="http://www.w3.org/2000/svg" className="stroke-current shrink-0 h-6 w-6" fill="none" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/></svg>
        <span>No transcript or summary data available.</span>
      </div>
    );
  }
  
  return (
    <div className="mt-8">
      {/* Simple tabs at the top */}
      <div className="tabs tabs-lifted">
        <a className={`tab tab-lg ${activeTab === 'summary' ? 'tab-active' : ''}`}
           onClick={() => setActiveTab('summary')}>
          Summary
        </a>
        <a className={`tab tab-lg ${activeTab === 'transcript' ? 'tab-active' : ''}`}
           onClick={() => setActiveTab('transcript')}>
          Full Transcript
        </a>
      </div>

      {/* Content area with subtle background */}
      <div className="bg-base-100 p-6 rounded-b-box border-base-300 border-x border-b min-h-[300px]">
        {activeTab === 'summary' && (
          <div className="prose max-w-none">
            <h2 className="text-2xl font-bold mb-4">Meeting Summary</h2>
            <div className="whitespace-pre-wrap bg-base-200 p-4 rounded-lg">
              {summary}
            </div>
          </div>
        )}
        
        {activeTab === 'transcript' && (
          <div className="prose max-w-none">
            <h2 className="text-2xl font-bold mb-4">Full Transcript</h2>
            <div className="whitespace-pre-wrap bg-base-200 p-4 rounded-lg">
              {transcript}
            </div>
          </div>
        )}

        {/* File info as a badge */}
        {audioFilePath && (
          <div className="mt-6 flex items-center gap-2">
            <div className="badge badge-neutral">Audio File</div>
            <span className="text-sm opacity-70">{audioFilePath}</span>
          </div>
        )}
      </div>
    </div>
  );
}

export default ResultsComponent; 