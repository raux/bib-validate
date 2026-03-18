import React from 'react';
import type { SourceResult } from '../types';

interface SourceCardProps {
  label: string;
  result: SourceResult;
}

const statusBadge: Record<string, string> = {
  idle: 'bg-gray-100 text-gray-500',
  loading: 'bg-yellow-100 text-yellow-700',
  success: 'bg-green-100 text-green-700',
  error: 'bg-red-100 text-red-700',
};

export const SourceCard: React.FC<SourceCardProps> = ({ label, result }) => {
  return (
    <div className="border border-gray-200 rounded-xl p-4 flex flex-col gap-2 bg-white shadow-sm">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-gray-800">{label}</h3>
        <span className={`text-xs px-2 py-1 rounded-full font-medium ${statusBadge[result.status]}`}>
          {result.status === 'idle' ? 'Waiting' :
           result.status === 'loading' ? 'Fetching…' :
           result.status === 'success' ? 'Available' : 'Source Unavailable'}
        </span>
      </div>

      {result.status === 'success' && result.data && (
        <dl className="text-sm text-gray-700 space-y-1">
          <div>
            <dt className="inline font-medium">Title: </dt>
            <dd className="inline">{result.data.title}</dd>
          </div>
          <div>
            <dt className="inline font-medium">Authors: </dt>
            <dd className="inline">{result.data.authors.join(', ')}</dd>
          </div>
          <div>
            <dt className="inline font-medium">Year: </dt>
            <dd className="inline">{result.data.year}</dd>
          </div>
        </dl>
      )}

      {result.status === 'error' && (
        <p className="text-sm text-red-600">{result.error}</p>
      )}
    </div>
  );
};
