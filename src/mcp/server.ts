#!/usr/bin/env node
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { z } from 'zod';

import { fetchArxivMetadata } from '../agents/arxivAgent.js';
import { fetchDblpMetadata, searchDblp } from '../agents/dblpAgent.js';
import { fetchIeeeMetadata } from '../agents/scholarAgent.js';
import {
  compareMetadata,
  aggregateDiscrepancies,
} from '../agents/validationAgent.js';
import { normalizeDoi, extractArxivId, detectInputType } from '../utils/doi.js';
import type { PaperMetadata, Discrepancy, DblpSearchResult } from '../types/index.js';

const server = new McpServer({
  name: 'bib-validate',
  version: '1.0.0',
});

// ─── Utility tools ──────────────────────────────────────────────────────────

server.tool(
  'extract_arxiv_id',
  'Extract an arXiv ID from a URL or plain ID string (e.g. https://arxiv.org/abs/2301.00001, arxiv:2301.00001, 2301.00001)',
  { input: z.string().describe('arXiv URL, prefixed ID, or plain ID') },
  async ({ input }) => {
    const id = extractArxivId(input);
    return {
      content: [
        {
          type: 'text' as const,
          text: id
            ? JSON.stringify({ arxivId: id })
            : JSON.stringify({ error: 'Could not extract an arXiv ID from the input' }),
        },
      ],
    };
  },
);

server.tool(
  'normalize_doi',
  'Normalize a DOI string by stripping URL prefixes (https://doi.org/, doi:, etc.)',
  { input: z.string().describe('DOI URL or plain DOI') },
  async ({ input }) => {
    const normalized = normalizeDoi(input);
    return {
      content: [{ type: 'text' as const, text: JSON.stringify({ doi: normalized }) }],
    };
  },
);

server.tool(
  'detect_input_type',
  'Detect whether an input string is an arXiv ID/URL, a DOI, or unknown',
  { input: z.string().describe('User-supplied identifier string') },
  async ({ input }) => {
    const inputType = detectInputType(input);
    return {
      content: [{ type: 'text' as const, text: JSON.stringify({ type: inputType }) }],
    };
  },
);

// ─── Metadata fetch tools ───────────────────────────────────────────────────

server.tool(
  'fetch_arxiv_metadata',
  'Fetch paper metadata (title, authors, year) from the arXiv API using an arXiv ID',
  { arxivId: z.string().describe('arXiv ID, e.g. "2301.00001" or "2301.00001v2"') },
  async ({ arxivId }) => {
    try {
      const metadata = await fetchArxivMetadata(arxivId);
      return {
        content: [{ type: 'text' as const, text: JSON.stringify(metadata, null, 2) }],
      };
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      return {
        content: [{ type: 'text' as const, text: JSON.stringify({ error: message }) }],
        isError: true,
      };
    }
  },
);

server.tool(
  'fetch_dblp_metadata',
  'Search DBLP by paper title and return the top result metadata',
  { title: z.string().describe('Paper title to search') },
  async ({ title }) => {
    try {
      const metadata = await fetchDblpMetadata(title);
      return {
        content: [{ type: 'text' as const, text: JSON.stringify(metadata, null, 2) }],
      };
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      return {
        content: [{ type: 'text' as const, text: JSON.stringify({ error: message }) }],
        isError: true,
      };
    }
  },
);

server.tool(
  'search_dblp',
  'Search DBLP for one or more queries and return full result metadata (title, authors, year, venue, pages, doi, url, etc.) for each query. Ported from https://github.com/raux/dblp-api.',
  { queries: z.array(z.string()).describe('List of search queries (paper titles, keywords, etc.)') },
  async ({ queries }) => {
    try {
      const results: Array<DblpSearchResult | null> = await searchDblp(queries);
      return {
        content: [{ type: 'text' as const, text: JSON.stringify(results, null, 2) }],
      };
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      return {
        content: [{ type: 'text' as const, text: JSON.stringify({ error: message }) }],
        isError: true,
      };
    }
  },
);

server.tool(
  'fetch_ieee_metadata',
  'Search IEEE Xplore by paper title and return the top result metadata. Requires IEEE_API_KEY environment variable.',
  { title: z.string().describe('Paper title to search') },
  async ({ title }) => {
    try {
      const apiKey = process.env.IEEE_API_KEY;
      const metadata = await fetchIeeeMetadata(title, apiKey);
      return {
        content: [{ type: 'text' as const, text: JSON.stringify(metadata, null, 2) }],
      };
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      return {
        content: [{ type: 'text' as const, text: JSON.stringify({ error: message }) }],
        isError: true,
      };
    }
  },
);

// ─── Validation tools ───────────────────────────────────────────────────────

const PaperMetadataSchema = z.object({
  title: z.string(),
  authors: z.array(z.string()),
  year: z.string(),
  source: z.string(),
});

server.tool(
  'compare_metadata',
  'Compare a source metadata record against a ground-truth record and return any discrepancies found in title, authors, or year',
  {
    groundTruth: PaperMetadataSchema.describe('Ground-truth metadata (e.g. from arXiv)'),
    source: PaperMetadataSchema.describe('Metadata from another source to compare'),
  },
  async ({ groundTruth, source }) => {
    const discrepancies = compareMetadata(
      groundTruth as PaperMetadata,
      source as PaperMetadata,
    );
    return {
      content: [
        {
          type: 'text' as const,
          text: JSON.stringify({ discrepancies, count: discrepancies.length }, null, 2),
        },
      ],
    };
  },
);

// ─── End-to-end validation tool ─────────────────────────────────────────────

server.tool(
  'validate_paper',
  'Full validation workflow: fetch metadata from arXiv (ground truth) then cross-reference against DBLP and IEEE Xplore to find discrepancies in title, authors, and year',
  {
    input: z
      .string()
      .describe('arXiv URL, arXiv ID, or DOI (e.g. "2301.00001", "https://arxiv.org/abs/2301.00001")'),
  },
  async ({ input }) => {
    // Step 1: Parse input
    const arxivId = extractArxivId(input);
    if (!arxivId) {
      return {
        content: [
          {
            type: 'text' as const,
            text: JSON.stringify({
              error:
                'Could not extract an arXiv ID from the input. Please provide a valid arXiv URL or ID.',
            }),
          },
        ],
        isError: true,
      };
    }

    // Step 2: Fetch arXiv ground truth
    let groundTruth: PaperMetadata;
    try {
      groundTruth = await fetchArxivMetadata(arxivId);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      return {
        content: [
          {
            type: 'text' as const,
            text: JSON.stringify({ error: `Failed to fetch arXiv metadata: ${message}` }),
          },
        ],
        isError: true,
      };
    }

    // Step 3: Cross-reference DBLP and IEEE in parallel
    const sources: PaperMetadata[] = [];
    const errors: Record<string, string> = {};

    const [dblpResult, ieeeResult] = await Promise.allSettled([
      fetchDblpMetadata(groundTruth.title),
      fetchIeeeMetadata(groundTruth.title, process.env.IEEE_API_KEY),
    ]);

    if (dblpResult.status === 'fulfilled') {
      sources.push(dblpResult.value);
    } else {
      errors['DBLP'] = dblpResult.reason instanceof Error
        ? dblpResult.reason.message
        : String(dblpResult.reason);
    }

    if (ieeeResult.status === 'fulfilled') {
      sources.push(ieeeResult.value);
    } else {
      errors['IEEE'] = ieeeResult.reason instanceof Error
        ? ieeeResult.reason.message
        : String(ieeeResult.reason);
    }

    // Step 4: Validate
    const discrepancies: Discrepancy[] = aggregateDiscrepancies(groundTruth, sources);

    // Step 5: Return results
    const result = {
      groundTruth,
      sources,
      discrepancies,
      sourceErrors: Object.keys(errors).length > 0 ? errors : undefined,
      summary: discrepancies.length === 0
        ? 'No discrepancies found across queried sources.'
        : `Found ${discrepancies.length} discrepancy(ies) across ${sources.length} source(s).`,
    };

    return {
      content: [{ type: 'text' as const, text: JSON.stringify(result, null, 2) }],
    };
  },
);

// ─── Start server ───────────────────────────────────────────────────────────

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
}

main().catch((err) => {
  console.error('Fatal error starting MCP server:', err);
  process.exit(1);
});
