import React, { useState } from 'react';

interface InputFormProps {
  onSubmit: (input: string) => void;
  isLoading: boolean;
}

export const InputForm: React.FC<InputFormProps> = ({ onSubmit, isLoading }) => {
  const [value, setValue] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = value.trim();
    if (trimmed) onSubmit(trimmed);
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-3 w-full max-w-2xl mx-auto">
      <label htmlFor="paper-input" className="text-sm font-medium text-gray-700">
        Enter an arXiv URL, arXiv ID, or DOI
      </label>
      <div className="flex gap-2">
        <input
          id="paper-input"
          type="text"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder="e.g. https://arxiv.org/abs/2301.00001 or 10.1145/1234567.1234568"
          className="flex-1 border border-gray-300 rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          disabled={isLoading}
        />
        <button
          type="submit"
          disabled={isLoading || !value.trim()}
          className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white font-medium px-6 py-2 rounded-lg text-sm transition-colors"
        >
          {isLoading ? 'Checking…' : 'Validate'}
        </button>
      </div>
    </form>
  );
};
