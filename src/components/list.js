import React from 'react';

// Define a functional component for the song list that accepts props
const ListCard = ({ index, title, subtitle, onClick, tags }) => {
  return (
      <li className="list-row hover:bg-gray-800 cursor-pointer" onClick={onClick}>
        <div className="text-4xl font-thin opacity-30 tabular-nums">{String(index).padStart(2, '0')}</div>
        <div className="list-col-grow">
          <div>{title}</div>
          <div className="text-xs uppercase font-semibold opacity-60">{subtitle}</div>
          {/* Render tags if they exist */}
          {tags && tags.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-1">
              {tags.map(tag => (
                <div key={tag} className={`badge ${getTagColor(tag)} badge-sm`}>{tag}</div>
              ))}
            </div>
          )}
        </div>
      </li>
  );
};

// Function to get a color for a tag (can be expanded)
const getTagColor = (tag) => {
  // Basic hash function for pseudo-random color based on tag name
  let hash = 0;
  for (let i = 0; i < tag.length; i++) {
      hash = tag.charCodeAt(i) + ((hash << 5) - hash);
  }
  const colors = ['badge-primary', 'badge-secondary', 'badge-accent', 'badge-info', 'badge-success', 'badge-warning', 'badge-error'];
  return colors[Math.abs(hash) % colors.length];
}

export default ListCard;