import React, { useState, useEffect } from 'react';

// Accept a function to handle selection
function Sidebar({ onSelectRecording }) {
  const [recordings, setRecordings] = useState([]);
  const [searchTerm, setSearchTerm] = useState(''); // State for search input

  useEffect(() => {
    window.electron.receive('recordings-updated', (files) => {
      console.log("Sidebar received recordings with details:", files); // Log updated structure
      setRecordings(files);
    });
    window.electron.send('get-recordings');
  }, []);

  const handleSelect = (recording) => {
    if (onSelectRecording) {
        onSelectRecording(recording); 
    }
  };

  // Filter recordings based on search term (checking displayName and tags)
  const filteredRecordings = recordings.filter(recording => {
    const lowerSearchTerm = searchTerm.toLowerCase();
    const nameMatch = recording.displayName?.toLowerCase().includes(lowerSearchTerm);
    const tagMatch = recording.tags?.some(tag => tag.toLowerCase().includes(lowerSearchTerm));
    return nameMatch || tagMatch;
  });

  // Simple function to get a color for a tag (can be expanded)
  const getTagColor = (tag) => {
    // Basic hash function for pseudo-random color based on tag name
    let hash = 0;
    for (let i = 0; i < tag.length; i++) {
        hash = tag.charCodeAt(i) + ((hash << 5) - hash);
    }
    const colors = ['badge-primary', 'badge-secondary', 'badge-accent', 'badge-info', 'badge-success', 'badge-warning', 'badge-error'];
    return colors[Math.abs(hash) % colors.length];
  }

  return (
    <div className="drawer-side">
      <label htmlFor="recordings-drawer" className="drawer-overlay"></label>
      <aside className="bg-base-200 w-80 min-h-full p-4 flex flex-col">
        <h3 className="font-bold text-lg mb-4">Recent Recordings</h3>
        
        {/* Search Input */}
        <div className="mb-4 relative">
          <input 
            type="text"
            placeholder="Search meetings or tags" 
            className="input input-bordered w-full pl-8" // Add padding for icon
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
           {/* Search Icon */}
           <span className="absolute left-2 top-1/2 transform -translate-y-1/2 text-base-content/50">
             <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z" clipRule="evenodd" />
              </svg>
           </span>
        </div>

        {/* Recordings List - Use filtered list */}
        <div className="flex-grow overflow-y-auto">
          {filteredRecordings.length === 0 ? (
            <div className="text-base-content/70 text-sm p-2">
              {recordings.length > 0 ? 'No matching recordings' : 'No recordings yet'}
            </div>
          ) : (
            <ul className="menu bg-base-100 rounded-box p-2 gap-1"> {/* Reduced gap */} 
              {filteredRecordings.map((recording) => ( 
                <li key={recording.jsonPath} onClick={() => handleSelect(recording)}>
                  <div className="hover:bg-base-200 rounded-lg p-3 cursor-pointer">
                    <div className="flex flex-col gap-1">
                       {/* Display Name */}
                       <span className="font-medium text-sm mb-1 truncate">{recording.displayName}</span> 
                       {/* Tags */} 
                       {recording.tags && recording.tags.length > 0 && (
                        <div className="flex flex-wrap gap-1 mb-1"> 
                            {recording.tags.map(tag => (
                                <div key={tag} className={`badge ${getTagColor(tag)} badge-sm`}>{tag}</div>
                            ))}
                        </div>
                       )}
                      <div className="flex justify-between text-xs text-base-content/70 mt-1">
                        <span>{recording.date}</span> 
                        <span>{recording.size}</span>
                      </div>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </aside>
    </div>
  );
}

export default Sidebar; 