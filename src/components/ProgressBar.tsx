import React from 'react';
import type { AppState, SourceStatus } from '../types';

const STEPS = [
  'Idle',
  'Parsing input',
  'Fetching arXiv',
  'Cross-referencing DBLP & IEEE',
  'Validating & diffing',
  'Complete',
];

const SOURCE_LABELS: { key: keyof AppState['sources']; label: string }[] = [
  { key: 'arxiv', label: 'arXiv' },
  { key: 'dblp', label: 'DBLP' },
  { key: 'scholar', label: 'Scholar' },
  { key: 'ieee', label: 'IEEE' },
];

const sourceStatusIcon = (status: SourceStatus): string => {
  switch (status) {
    case 'loading': return '⏳';
    case 'success': return '✅';
    case 'error': return '❌';
    default: return '⏸️';
  }
};

const sourceStatusClass = (status: SourceStatus): string => {
  switch (status) {
    case 'loading': return 'text-yellow-700 bg-yellow-50 border-yellow-200';
    case 'success': return 'text-green-700 bg-green-50 border-green-200';
    case 'error': return 'text-red-700 bg-red-50 border-red-200';
    default: return 'text-gray-400 bg-gray-50 border-gray-200';
  }
};

interface ProgressBarProps {
  step: number;
  sources: AppState['sources'];
}

export const ProgressBar: React.FC<ProgressBarProps> = ({ step, sources }) => {
  if (step === 0) return null;

  const progressPct = Math.round(((step - 1) / (STEPS.length - 2)) * 100);

  return (
    <div className="w-full max-w-2xl mx-auto mt-6 space-y-3">
      <p className="text-sm text-gray-600 mb-1">
        Step {step} of {STEPS.length - 1}: <span className="font-medium">{STEPS[step] ?? 'Processing…'}</span>
      </p>
      <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
        <div
          className="h-full bg-blue-500 transition-all duration-500"
          style={{ width: `${progressPct}%` }}
        />
      </div>

      {step >= 2 && step < 5 && (
        <div className="flex flex-wrap gap-2 mt-2">
          {SOURCE_LABELS.map(({ key, label }) => {
            const status = sources[key].status;
            if (status === 'idle') return null;
            return (
              <span
                key={key}
                className={`inline-flex items-center gap-1 text-xs font-medium px-2.5 py-1 rounded-full border ${sourceStatusClass(status)}`}
              >
                <span aria-hidden="true">{sourceStatusIcon(status)}</span>
                {label}
                {status === 'loading' && (
                  <span className="inline-block w-3 h-3 border-2 border-current border-t-transparent rounded-full animate-spin" />
                )}
              </span>
            );
          })}
        </div>
      )}
    </div>
  );
};
