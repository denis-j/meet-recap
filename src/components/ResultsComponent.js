import React, { useState } from 'react';

function ResultsComponent({ results }) {
  const [activeTab, setActiveTab] = useState('summary');
  
  console.log("ResultsComponent received results:", results);
  
  if (!results) {
    console.log("No results provided to ResultsComponent");
    return null;
  }
  
  const { transcript, summary, videoFilePath, audioFilePath } = results;
  
  console.log("Extracted data from results:", {
    hasTranscript: !!transcript,
    transcriptLength: transcript?.length,
    hasSummary: !!summary,
    summaryLength: summary?.length,
    audioPath: audioFilePath
  });

  // Ensure we have the required data
  if (!summary && !transcript) {
    return (
      <div className="alert alert-warning">
        <svg xmlns="http://www.w3.org/2000/svg" className="stroke-current shrink-0 h-6 w-6" fill="none" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/></svg>
        <span>No transcript or summary data available.</span>
      </div>
    );
  }
  
  return (
    <div className="card bg-base-100 shadow-xl p-6 mt-8">
      <h2 className="card-title text-2xl mb-6">Meeting Results</h2>
      
      {/* Tabs */}
      <div role="tablist" className="tabs tabs-bordered">
        <input type="radio" 
               name="my_tabs_1" 
               role="tab" 
               className="tab" 
               aria-label="Summary" 
               checked={activeTab === 'summary'}
               onChange={() => setActiveTab('summary')} />
        <div role="tabpanel" className="tab-content p-4">
          <div className="prose">
            <h3 className="text-xl font-semibold mb-4">Meeting Summary</h3>
            <pre className="whitespace-pre-wrap text-base font-normal">
              {summary || 'No summary available'}
            </pre>
          </div>
        </div>

        <input type="radio" 
               name="my_tabs_1" 
               role="tab" 
               className="tab" 
               aria-label="Transcript"
               checked={activeTab === 'transcript'}
               onChange={() => setActiveTab('transcript')} />
        <div role="tabpanel" className="tab-content p-4">
          <div className="prose">
            <h3 className="text-xl font-semibold mb-4">Full Transcript</h3>
            <pre className="whitespace-pre-wrap text-base font-normal">
              {transcript || 'No transcript available'}
            </pre>
          </div>
        </div>
      </div>
      
      {/* File Info */}
      <div className="mt-8 p-4 bg-base-200 rounded-lg">
        <h3 className="font-semibold mb-2">Recording Files</h3>
        {videoFilePath && <p className="text-sm">Video saved at: {videoFilePath}</p>}
        {audioFilePath && (
          <div className="text-sm flex items-center gap-2">
            <span className="font-medium">Audio:</span>
            <span className="text-base-content/70">{audioFilePath}</span>
          </div>
        )}
      </div>
    </div>
  );
}

export default ResultsComponent; 