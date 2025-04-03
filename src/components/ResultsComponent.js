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

  // Update edit state when results change (e.g., selecting a different recording)
  useEffect(() => {
    if (results) {
      setEditName(results.displayName || ''); // Use displayName
      setEditTags(results.tags || []);
      setIsEditing(false); // Reset edit mode when result changes
      setActiveTab('summary'); // Reset to summary tab
    }
  }, [results]);

  if (!results) return null;
  
  const { transcript, summary, audioFilePath, displayName, tags = [], jsonPath } = results;
  
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
    <div className="mt-8 card bg-base-100 shadow-xl">
      <div className="card-body p-0">
        <div className="p-6 pb-0">
          <div className="flex justify-between items-center mb-4">
             {isEditing ? (
                <input 
                  type="text"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="input input-bordered input-lg w-full max-w-md"
                />
             ) : (
               <h2 className="text-2xl font-bold card-title truncate">{editName || displayName}</h2>
             )}
            {isViewing && (
              <div className="flex gap-2">
                {isEditing ? (
                  <>
                    <button className="btn btn-sm btn-ghost" onClick={() => setIsEditing(false)}>Cancel</button>
                    <button className="btn btn-sm btn-primary" onClick={handleSaveEdit}>Save</button>
                  </>
                ) : (
                  <button className="btn btn-sm btn-outline" onClick={() => setIsEditing(true)}>Edit</button>
                )}
              </div>
            )}
          </div>

           {isViewing && (
             <div className="mb-4">
               {isEditing ? (
                 <div className="p-4 border border-base-300 rounded-lg bg-base-200">
                   <h4 className="font-semibold mb-2 text-sm">Edit Tags</h4>
                    <div className="flex flex-wrap gap-2 mb-3">
                        {editTags.map(tag => (
                            <div key={tag} className={`badge ${getTagColor(tag)} badge-lg gap-1`}>
                                {tag}
                                <button onClick={() => handleRemoveTag(tag)} className="btn btn-xs btn-circle btn-ghost ml-1">✕</button>
                            </div>
                        ))}
                        {editTags.length === 0 && <span className="text-xs text-base-content/60">No tags yet.</span>}
                    </div>
                    <form onSubmit={handleAddTag} className="join">
                      <input 
                        type="text"
                        value={newTagInput}
                        onChange={(e) => setNewTagInput(e.target.value)}
                        placeholder="Add a tag..."
                        className="input input-bordered input-sm join-item"
                      />
                      <button type="submit" className="btn btn-sm join-item">Add</button>
                    </form>
                 </div>
               ) : (
                 tags && tags.length > 0 && (
                   <div className="flex flex-wrap gap-2">
                     {tags.map(tag => (
                         <div key={tag} className={`badge ${getTagColor(tag)}`}>{tag}</div>
                     ))}
                   </div>
                 )
               )}
             </div>
           )}
        </div>

        <div className="tabs tabs-lifted px-6 -mb-px">
          <a className={`tab tab-lg ${activeTab === 'summary' ? 'tab-active [--tab-bg:hsl(var(--b1))] [--tab-border-color:hsl(var(--b1))] ' : ''}`}
             onClick={() => setActiveTab('summary')}>
            Summary
          </a>
          <a className={`tab tab-lg ${activeTab === 'transcript' ? 'tab-active [--tab-bg:hsl(var(--b1))] [--tab-border-color:hsl(var(--b1))] ' : ''}`}
             onClick={() => setActiveTab('transcript')}>
            Full Transcript
          </a>
          <a className="tab tab-lg flex-grow"></a>
        </div>

        <div className="bg-base-100 p-6 rounded-b-box border-base-300 border-t min-h-[300px]">
          {activeTab === 'summary' && (
            <div className="prose max-w-none">
              <div className="whitespace-pre-wrap bg-base-200 p-4 rounded-lg">
                {summary}
              </div>
            </div>
          )}
          
          {activeTab === 'transcript' && (
            <div className="prose max-w-none">
              <div className="whitespace-pre-wrap bg-base-200 p-4 rounded-lg">
                {transcript}
              </div>
            </div>
          )}

          {audioFilePath && (
            <div className="mt-6 flex items-center gap-2">
              <div className="badge badge-neutral">Audio File</div>
              <span className="text-sm opacity-70 break-all">{audioFilePath}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default ResultsComponent; 