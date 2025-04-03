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
    <div className="card w-96 bg-base-100 p-6 mx-auto mt-10">
      <h2 className="card-title text-2xl mb-4">OpenAI API Key</h2>
      <p className="text-base-content/80 mb-6">
        Enter your OpenAI API key to use transcription and summarization features.
        Your key is stored locally and never sent to any server other than OpenAI.
      </p>
      <form onSubmit={handleSubmit} className="form-control gap-4">
        <input
          type="password"
          value={inputKey}
          onChange={(e) => setInputKey(e.target.value)}
          placeholder="Enter your OpenAI API key"
          className="input input-bordered w-full"
          required
        />
        <button type="submit" className="btn btn-primary w-full">Save Key</button>
      </form>
    </div>
  );
}

export default ApiKeyForm; 