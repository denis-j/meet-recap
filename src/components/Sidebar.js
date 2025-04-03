import React, { useState, useEffect } from 'react';

function Sidebar() {
  const [recordings, setRecordings] = useState([]);

  useEffect(() => {
    // Listen for file updates from main process
    window.electron.receive('recordings-updated', (files) => {
      setRecordings(files);
    });

    // Request initial file list
    window.electron.send('get-recordings');
  }, []);

  // Format the filename for display
  const formatFileName = (name) => {
    // Remove the 'meeting_' prefix and file extension
    return name
      .replace('meeting_', '')
      .replace(/\.[^/.]+$/, '')
      .replace(/-/g, ':')  // Replace hyphens with colons for time
      .replace('_', ' ');  // Replace underscore with space between date and time
  };

  return (
    <div className="drawer-side">
      <label htmlFor="recordings-drawer" className="drawer-overlay"></label>
      <aside className="bg-base-200 w-80 min-h-full p-4">
        <h3 className="font-bold text-lg mb-4">Recent Recordings</h3>
        
        {recordings.length === 0 ? (
          <div className="text-base-content/70 text-sm">
            No recordings yet
          </div>
        ) : (
          <ul className="menu bg-base-100 rounded-box p-2 gap-2">
            {recordings.map((recording, index) => (
              <li key={index}>
                <div className="hover:bg-base-200 rounded-lg p-3">
                  <div className="flex flex-col gap-1">
                    <div className="flex items-center gap-2">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 opacity-70" viewBox="0 0 20 20" fill="currentColor">
                        <path d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" />
                      </svg>
                      <span className="font-medium">{formatFileName(recording.name)}</span>
                    </div>
                    <div className="flex justify-between text-xs text-base-content/70">
                      <span>{recording.size}</span>
                    </div>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </aside>
    </div>
  );
}

export default Sidebar; 