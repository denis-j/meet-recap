import React, { useState, useEffect, useRef } from 'react';
import ListCard from './list';


// Accept a function to handle selection and onStartMeeting prop
function Sidebar({ onSelectRecording, onStartMeeting }) {
  const [recordings, setRecordings] = useState([]);
  const [searchTerm, setSearchTerm] = useState(''); // State for search input
  const searchInputRef = useRef(null); // Create a ref for the input field

  useEffect(() => {
    window.electron.receive('recordings-updated', (files) => {
      console.log("Sidebar received recordings with details:", files); // Log updated structure
      setRecordings(files);
    });
    window.electron.send('get-recordings');

    // --- Add Keydown Listener for Cmd/Ctrl + K ---
    const handleKeyDown = (event) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault(); // Prevent default browser behavior (e.g., Chrome search)
        searchInputRef.current?.focus(); // Focus the input field using the ref
      }
    };

    document.addEventListener('keydown', handleKeyDown);

    // Cleanup function to remove the listener when the component unmounts
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
    // --- End Keydown Listener ---

  }, []); // Empty dependency array ensures this runs only on mount and unmount

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

  return (
    <div className="drawer-side border-r border-base-300">
      <label htmlFor="recordings-drawer" className="drawer-overlay"></label>
      <aside className="bg-base-200 w-64 h-full p-4 flex flex-col">
        <div className="flex items-center mb-4 flex-shrink-0">
          <h3 className="font-bold text-lg text-left">Meetings</h3>
          <div className="ml-auto">
            <button 
              className="btn btn-primary btn-sm"
              onClick={onStartMeeting}
            >
              Start Meeting
            </button>
          </div>
        </div>
        
        <div className="mb-4 relative flex-shrink-0">
          <label className="input input-bordered flex items-center gap-2">
            <svg className="h-[1em] opacity-50" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><g strokeLinejoin="round" strokeLinecap="round" strokeWidth="2.5" fill="none" stroke="currentColor"><circle cx="11" cy="11" r="8"></circle><path d="m21 21-4.3-4.3"></path></g></svg>
            <input
              ref={searchInputRef}
              type="search"
              className="grow bg-transparent focus:outline-none"
              placeholder="Search recordings..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
            <kbd className="kbd kbd-sm">⌘</kbd>
            <kbd className="kbd kbd-sm">K</kbd>
          </label>
        </div>

        {/* Recordings List - Hide scrollbar visually, keep functionality */}
        <div className="flex-grow overflow-y-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
          {filteredRecordings.length === 0 ? (
            <div className="text-base-content/70 text-sm p-4 text-center">
              {recordings.length > 0 ? 'No matching recordings' : 'No recordings yet'}
            </div>
          ) : (
             <ul className="list bg-base-100 rounded-box shadow-md">
              {filteredRecordings.map((recording, index) => { 
                const reversedIndex = filteredRecordings.length - 1 - index; 
                return (
                  <ListCard 
                    tags={recording.tags} 
                    onClick={() => handleSelect(recording)} 
                    key={recording.jsonPath}
                    index={reversedIndex}
                    title={recording.displayName} 
                    subtitle={recording.date} 
                  />
                );
              })} 
            </ul>
          )}
        </div>
      </aside>
    </div>
  );
}

export default Sidebar; 