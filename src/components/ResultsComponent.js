import React, { useState, useEffect } from 'react';

// Helper to get tag color (same as in Sidebar)
const getTagColor = (tag) => {
  let hash = 0;
  for (let i = 0; i < tag.length; i++) {
    hash = tag.charCodeAt(i) + ((hash << 5) - hash);
  }
  const colors = ['badge-primary', 'badge-secondary', 'badge-accent', 'badge-info', 'badge-success', 'badge-warning', 'badge-error'];
  return colors[Math.abs(hash) % colors.length];
}

function ResultsComponent({ results, isViewing }) {
  const [activeTab, setActiveTab] = useState('summary');
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState('');
  const [editTags, setEditTags] = useState([]);
  const [newTagInput, setNewTagInput] = useState('');

  useEffect(() => {
    if (results) {
      setEditName(results.displayName || 'Meeting'); // Default to 'Meeting' if no displayName
      setEditTags(results.tags || []);
      setIsEditing(false);
      setActiveTab('summary');
    }
  }, [results]);

  if (!results) return null;
  
  const { transcript, summary, audioFilePath, date, jsonPath } = results; // Get date from results
  const currentDisplayName = editName || results.displayName || 'Meeting'; // Consistent display name
  const currentTags = isEditing ? editTags : (results.tags || []); // Show editTags or results.tags

  // Check if there is content to display
  if (!summary && !transcript) {
    return (
      <div className="alert alert-warning">
        <svg xmlns="http://www.w3.org/2000/svg" className="stroke-current shrink-0 h-6 w-6" fill="none" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/></svg>
        <span>No transcript or summary data available.</span>
      </div>
    );
  }
  
  const handleSaveEdit = () => {
    if (!jsonPath) {
        console.error("Cannot save, jsonPath is missing from results object.");
        // Show error to user?
        return;
    }
    console.log("Saving edits:", { jsonPath, displayName: editName, tags: editTags });
    // Send IPC message to main process to update the JSON file
    window.electron.send('update-meeting-details', { 
      jsonPath: jsonPath, 
      displayName: editName, 
      tags: editTags 
    });
    setIsEditing(false);
    // Optional: Show saving indicator? Refresh handled by main process calling updateRecordingsList
  };

  const handleAddTag = (e) => {
    e.preventDefault();
    const newTag = newTagInput.trim();
    if (newTag && !editTags.includes(newTag)) {
      setEditTags([...editTags, newTag]);
      setNewTagInput('');
    }
  };

  const handleRemoveTag = (tagToRemove) => {
    setEditTags(editTags.filter(tag => tag !== tagToRemove));
  };

  return (
    <div className="space-y-6">
      {/* --- Header Card --- */}
      <div className="p-5 sm:p-6 rounded-lg bg-base-200 shadow-lg">
        {isEditing ? (
          /* --- EDITING VIEW --- */
          <div className="space-y-4">
            {/* Edit Title */}
            <div>
              <label htmlFor="edit-title" className="block text-sm font-medium text-base-content/80 mb-1">Meeting Title</label>
              <input 
                id="edit-title"
                type="text"
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                className="input input-bordered w-full rounded-lg"
                placeholder="Enter meeting title..."
              />
            </div>

            {/* Edit Tags */}
            <div>
              <label className="block text-sm font-medium text-base-content/80 mb-1">Tags</label>
              <div className="p-3 border border-base-300 rounded-lg bg-base-100 space-y-3">
                {/* Display current tags for removal */}
                <div className="flex flex-wrap gap-2 min-h-[2rem]"> {/* Ensure some height even if empty */} 
                  {editTags.map(tag => (
                      <div key={tag} className={`badge ${getTagColor(tag)} gap-1 rounded-full px-2.5 py-1 text-xs`}> 
                          {tag}
                          <button onClick={() => handleRemoveTag(tag)} className="btn btn-xs btn-circle btn-ghost ml-0.5">✕</button>
                      </div>
                  ))}
                  {editTags.length === 0 && <span className="text-xs text-base-content/60 italic self-center">No tags added yet.</span>}
                </div>
                {/* Form to add new tags - Adjusted size, spacing, rounding */}
                <form onSubmit={handleAddTag} className="flex items-center mt-3"> {/* Use flex, remove join */} 
                  <input 
                    type="text"
                    value={newTagInput}
                    onChange={(e) => setNewTagInput(e.target.value)}
                    placeholder="Add a new tag..."
                    // Use input-sm, make it grow, ensure rounding
                    className="input input-bordered input-sm grow rounded-lg"
                  />
                  {/* Use btn-sm, add margin-left, ensure rounding */}
                  <button type="submit" className="btn btn-sm btn-primary ml-2 rounded-lg">Add Tag</button>
                </form>
              </div>
            </div>
            
            {/* Action Buttons */}
            <div className="flex justify-end gap-3 pt-2">
               <button className="btn btn-sm btn-ghost rounded-lg" onClick={() => setIsEditing(false)}>Cancel</button>
               <button className="btn btn-sm btn-primary rounded-lg" onClick={handleSaveEdit}>Save Changes</button>
             </div>
          </div>
          /* --- END EDITING VIEW --- */

        ) : (
          /* --- DISPLAY VIEW --- */
          <div> { /* Wrap display view in a div */}
            {/* Top Row: Title + Edit Button */}
            <div className="flex justify-between items-start mb-4">
              <h1 className="text-2xl font-bold truncate" title={currentDisplayName}>{currentDisplayName}</h1>
              {isViewing && (
                <button className="btn btn-sm btn-outline rounded-lg flex-shrink-0 ml-4" onClick={() => setIsEditing(true)}>Edit</button>
              )}
            </div>

            {/* Middle Row: Date Info */} 
            {date && (
              <div className="flex items-center gap-2 text-sm opacity-70 mb-4">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                  <span>{date}</span> 
                </div>
            )}

            {/* Bottom Row: Tags */}
            {isViewing && (
                <div className="flex flex-wrap items-center gap-2">
                  {currentTags.map(tag => (
                      <div key={tag} className={`badge ${getTagColor(tag)} rounded-full px-2.5 py-1 text-xs`}>{tag}</div>
                  ))}
                  <button 
                    onClick={() => setIsEditing(true)}
                    className="btn btn-xs btn-ghost btn-circle rounded-full" 
                    title="Edit Tags"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6" /></svg>
                  </button>
                  {currentTags.length === 0 && (
                    <button onClick={() => setIsEditing(true)} className="btn btn-xs btn-ghost opacity-60 rounded-lg">
                      + Add label
                    </button>
                  )}
                </div>
            )}
          </div>
          /* --- END DISPLAY VIEW --- */
        )}
       </div> 
      
       {/* --- Main Content Card --- */}
      <div className="bg-base-200 p-5 sm:p-6 rounded-lg shadow-lg">
          {/* Tabs - Using default style now */} 
          <div className="tabs mb-6 bg-base-300 rounded-lg w-56">
             <a 
               className={`tab tab-bordered ${activeTab === 'summary' ? 'tab-active' : ''}`} 
               onClick={() => setActiveTab('summary')}
             >
               Meeting Notes
             </a> 
             <a 
               className={`tab tab-bordered ${activeTab === 'transcript' ? 'tab-active' : ''}`} 
               onClick={() => setActiveTab('transcript')}
             >
               Transcript
             </a> 
           </div>

          {/* Tab Content */} 
          <div className="space-y-4">
             {activeTab === 'summary' && (
               <div className="prose max-w-none prose-sm lg:prose-base">
                 <h3 className="font-semibold mb-2">Executive Summary</h3> 
                 {/* Simple text display, prose handles styling */} 
                 <p className="text-base-content/90">
                   {summary || "Summary not available."} 
                 </p>
               </div>
             )}
             
             {activeTab === 'transcript' && (
               <div className="prose max-w-none prose-sm lg:prose-base">
                 <h3 className="font-semibold mb-2">Full Transcript</h3> 
                 {/* Simple text display, prose handles styling */} 
                 <p className="text-base-content/90 whitespace-pre-wrap"> {/* Keep whitespace for transcript */} 
                    {transcript || "Transcript not available."} 
                  </p>
               </div>
             )}

             {/* Audio File Path */} 
              {audioFilePath && (
                <div className="pt-4 border-t border-base-300/50 mt-6 flex items-center gap-2 text-xs text-base-content/70">
                  <div className="badge badge-outline rounded-full">Audio File</div>
                  <span className="opacity-70 break-all" title={audioFilePath}>{audioFilePath}</span>
                </div>
              )}
           </div>
       </div>
    </div>
  );
}

export default ResultsComponent; 