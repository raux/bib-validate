import React from 'react';
import type { AppState, Discrepancy } from '../types';
import { SourceCard } from './SourceCard';

interface ResultsMatrixProps {
  state: AppState;
}

const SOURCE_LABELS: Record<keyof AppState['sources'], string> = {
  arxiv: 'arXiv (Ground Truth)',
  dblp: 'DBLP',
  scholar: 'Google Scholar',
  ieee: 'IEEE Xplore',
};

const FIELD_ICONS: Record<Discrepancy['field'], string> = {
  title: '📝',
  authors: '👥',
  year: '📅',
};

export const ResultsMatrix: React.FC<ResultsMatrixProps> = ({ state }) => {
  const { sources, discrepancies, step } = state;

  if (step === 0) return null;

  const activeSourceKeys = (Object.keys(sources) as Array<keyof AppState['sources']>).filter(
    (key) => sources[key].status !== 'idle',
  );

  return (
    <div className="w-full max-w-4xl mx-auto mt-8 space-y-6">
      {activeSourceKeys.length > 0 && (
        <>
          <h2 className="text-xl font-bold text-gray-800">Metadata Sources</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {activeSourceKeys.map((key) => (
              <SourceCard key={key} label={SOURCE_LABELS[key]} result={sources[key]} />
            ))}
          </div>
        </>
      )}

      {step === 5 && (
        <div className="mt-6">
          <h2 className="text-xl font-bold text-gray-800 mb-4">
            Validation Results
            {discrepancies.length === 0 ? (
              <span className="ml-3 text-sm font-normal text-green-600">✅ No discrepancies found</span>
            ) : (
              <span className="ml-3 text-sm font-normal text-red-600">
                ⚠️ {discrepancies.length} discrepanc{discrepancies.length === 1 ? 'y' : 'ies'} found
              </span>
            )}
          </h2>

          {discrepancies.length > 0 && (
            <ul className="space-y-3">
              {discrepancies.map((d, i) => (
                <li
                  key={i}
                  className="flex items-start gap-3 bg-red-50 border border-red-200 rounded-lg p-4 text-sm"
                >
                  <span className="text-lg" aria-hidden="true">{FIELD_ICONS[d.field]}</span>
                  <div>
                    <p className="font-medium text-red-800">{d.message}</p>
                    <p className="text-gray-600 mt-1">
                      Ground truth: <span className="font-mono">{d.groundTruth}</span>
                    </p>
                    <p className="text-gray-600">
                      Found: <span className="font-mono">{d.found}</span>
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
};
