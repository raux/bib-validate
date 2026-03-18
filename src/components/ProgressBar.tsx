import React from 'react';

const STEPS = [
  'Idle',
  'Parsing input',
  'Fetching arXiv',
  'Cross-referencing DBLP & IEEE',
  'Validating & diffing',
  'Complete',
];

interface ProgressBarProps {
  step: number;
}

export const ProgressBar: React.FC<ProgressBarProps> = ({ step }) => {
  if (step === 0) return null;

  const progressPct = Math.round(((step - 1) / (STEPS.length - 2)) * 100);

  return (
    <div className="w-full max-w-2xl mx-auto mt-6">
      <p className="text-sm text-gray-600 mb-1">
        Step {step} of {STEPS.length - 1}: <span className="font-medium">{STEPS[step] ?? 'Processing…'}</span>
      </p>
      <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
        <div
          className="h-full bg-blue-500 transition-all duration-500"
          style={{ width: `${progressPct}%` }}
        />
      </div>
    </div>
  );
};
