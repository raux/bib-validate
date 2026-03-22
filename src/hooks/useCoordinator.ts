import { useReducer, useCallback } from 'react';
import type { AppState, AppAction, SourceResult } from '../types';
import { fetchArxivMetadata } from '../agents/arxivAgent';
import { fetchDblpMetadata } from '../agents/dblpAgent';
import { fetchIeeeMetadata } from '../agents/scholarAgent';
import { aggregateDiscrepancies } from '../agents/validationAgent';
import { extractArxivId, normalizeDoi } from '../utils/doi';

const initialSourceResult: SourceResult = { status: 'idle', data: null, error: null };

const initialState: AppState = {
  input: '',
  step: 0,
  sources: {
    arxiv: initialSourceResult,
    dblp: initialSourceResult,
    scholar: initialSourceResult,
    ieee: initialSourceResult,
  },
  discrepancies: [],
};

function reducer(state: AppState, action: AppAction): AppState {
  switch (action.type) {
    case 'SET_INPUT':
      return { ...state, input: action.payload };
    case 'SET_STEP':
      return { ...state, step: action.payload };
    case 'SOURCE_LOADING':
      return {
        ...state,
        sources: {
          ...state.sources,
          [action.source]: { status: 'loading', data: null, error: null },
        },
      };
    case 'SOURCE_SUCCESS':
      return {
        ...state,
        sources: {
          ...state.sources,
          [action.source]: { status: 'success', data: action.data, error: null },
        },
      };
    case 'SOURCE_ERROR':
      return {
        ...state,
        sources: {
          ...state.sources,
          [action.source]: { status: 'error', data: null, error: action.error },
        },
      };
    case 'SET_DISCREPANCIES':
      return { ...state, discrepancies: action.payload };
    case 'RESET':
      return { ...initialState };
    default:
      return state;
  }
}

export function useCoordinator() {
  const [state, dispatch] = useReducer(reducer, initialState);

  const run = useCallback(async (input: string) => {
    dispatch({ type: 'RESET' });
    dispatch({ type: 'SET_INPUT', payload: input });

    try {
      // Step 1: Resolve arXiv ID or DOI
      dispatch({ type: 'SET_STEP', payload: 1 });

      const arxivId = extractArxivId(input);
      const queryIdentifier = arxivId ?? normalizeDoi(input);

      // Step 2: Fetch arXiv ground truth
      dispatch({ type: 'SET_STEP', payload: 2 });
      dispatch({ type: 'SOURCE_LOADING', source: 'arxiv' });

      let arxivData;
      try {
        arxivData = await fetchArxivMetadata(queryIdentifier);
        dispatch({ type: 'SOURCE_SUCCESS', source: 'arxiv', data: arxivData });
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Source Unavailable';
        dispatch({ type: 'SOURCE_ERROR', source: 'arxiv', error: msg });
        dispatch({ type: 'SET_STEP', payload: 5 });
        return;
      }

      // Step 3: Cross-reference DBLP and IEEE in parallel
      dispatch({ type: 'SET_STEP', payload: 3 });
      dispatch({ type: 'SOURCE_LOADING', source: 'dblp' });
      dispatch({ type: 'SOURCE_LOADING', source: 'scholar' });
      dispatch({ type: 'SOURCE_LOADING', source: 'ieee' });

      const [dblpResult, ieeeResult] = await Promise.allSettled([
        fetchDblpMetadata(arxivData.title),
        fetchIeeeMetadata(arxivData.title),
      ]);

      if (dblpResult.status === 'fulfilled') {
        dispatch({ type: 'SOURCE_SUCCESS', source: 'dblp', data: dblpResult.value });
      } else {
        dispatch({
          type: 'SOURCE_ERROR',
          source: 'dblp',
          error: dblpResult.reason instanceof Error ? dblpResult.reason.message : 'Source Unavailable',
        });
      }

      if (ieeeResult.status === 'fulfilled') {
        dispatch({ type: 'SOURCE_SUCCESS', source: 'ieee', data: ieeeResult.value });
      } else {
        dispatch({
          type: 'SOURCE_ERROR',
          source: 'ieee',
          error: ieeeResult.reason instanceof Error ? ieeeResult.reason.message : 'Source Unavailable',
        });
      }

      // Scholar (Google Scholar) not available without API key – mark unavailable
      dispatch({
        type: 'SOURCE_ERROR',
        source: 'scholar',
        error: 'Google Scholar requires a SERP API key (VITE_SERP_API_KEY)',
      });

      // Step 4: Validate and diff
      dispatch({ type: 'SET_STEP', payload: 4 });
      const successfulSources = [dblpResult, ieeeResult]
        .filter((r) => r.status === 'fulfilled')
        .map((r) => (r as PromiseFulfilledResult<typeof arxivData>).value);

      const discrepancies = aggregateDiscrepancies(arxivData, successfulSources);
      dispatch({ type: 'SET_DISCREPANCIES', payload: discrepancies });
      dispatch({ type: 'SET_STEP', payload: 5 });
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'An unexpected error occurred';
      console.error('[useCoordinator] unexpected error:', msg);
      dispatch({ type: 'SOURCE_ERROR', source: 'arxiv', error: msg });
      dispatch({ type: 'SET_STEP', payload: 5 });
    }
  }, []);

  return { state, dispatch, run };
}
