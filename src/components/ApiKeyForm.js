import React, { useState } from 'react';

function ApiKeyForm({ setApiKey }) {
  const [inputKey, setInputKey] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    if (inputKey.trim()) {
      setApiKey(inputKey.trim());
    }
  };

  return (
    <div className="api-key-form">
      <h2>OpenAI API Key</h2>
      <p>
        Enter your OpenAI API key to use transcription and summarization features.
        Your key is stored locally and never sent to any server other than OpenAI.
      </p>
      <form onSubmit={handleSubmit}>
        <input
          type="password"
          value={inputKey}
          onChange={(e) => setInputKey(e.target.value)}
          placeholder="Enter your OpenAI API key"
          required
        />
        <button type="submit">Save Key</button>
      </form>
    </div>
  );
}

export default ApiKeyForm; 