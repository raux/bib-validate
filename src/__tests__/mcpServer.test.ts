import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import path from 'path';

describe('MCP Server', () => {
  let client: Client;
  let transport: StdioClientTransport;

  beforeAll(async () => {
    const serverPath = path.resolve(__dirname, '../mcp/server.ts');
    transport = new StdioClientTransport({
      command: 'npx',
      args: ['tsx', serverPath],
    });
    client = new Client({ name: 'test-client', version: '1.0.0' });
    await client.connect(transport);
  });

  afterAll(async () => {
    await client.close();
  });

  it('lists all expected tools', async () => {
    const result = await client.listTools();
    const toolNames = result.tools.map((t) => t.name).sort();
    expect(toolNames).toEqual([
      'compare_metadata',
      'detect_input_type',
      'extract_arxiv_id',
      'fetch_arxiv_metadata',
      'fetch_dblp_metadata',
      'fetch_ieee_metadata',
      'normalize_doi',
      'search_dblp',
      'validate_paper',
    ]);
  });

  it('extract_arxiv_id extracts ID from URL', async () => {
    const result = await client.callTool({
      name: 'extract_arxiv_id',
      arguments: { input: 'https://arxiv.org/abs/2301.00001' },
    });
    const content = result.content as Array<{ type: string; text: string }>;
    expect(JSON.parse(content[0].text)).toEqual({ arxivId: '2301.00001' });
  });

  it('extract_arxiv_id returns error for invalid input', async () => {
    const result = await client.callTool({
      name: 'extract_arxiv_id',
      arguments: { input: 'not-an-arxiv-id' },
    });
    const content = result.content as Array<{ type: string; text: string }>;
    const parsed = JSON.parse(content[0].text);
    expect(parsed.error).toBeDefined();
  });

  it('normalize_doi strips URL prefix', async () => {
    const result = await client.callTool({
      name: 'normalize_doi',
      arguments: { input: 'https://doi.org/10.1145/1234567.1234568' },
    });
    const content = result.content as Array<{ type: string; text: string }>;
    expect(JSON.parse(content[0].text)).toEqual({ doi: '10.1145/1234567.1234568' });
  });

  it('detect_input_type identifies arXiv input', async () => {
    const result = await client.callTool({
      name: 'detect_input_type',
      arguments: { input: '2301.00001' },
    });
    const content = result.content as Array<{ type: string; text: string }>;
    expect(JSON.parse(content[0].text)).toEqual({ type: 'arxiv' });
  });

  it('detect_input_type identifies DOI input', async () => {
    const result = await client.callTool({
      name: 'detect_input_type',
      arguments: { input: 'https://doi.org/10.1145/1234567.1234568' },
    });
    const content = result.content as Array<{ type: string; text: string }>;
    expect(JSON.parse(content[0].text)).toEqual({ type: 'doi' });
  });

  it('compare_metadata detects year mismatch', async () => {
    const result = await client.callTool({
      name: 'compare_metadata',
      arguments: {
        groundTruth: {
          title: 'Attention Is All You Need',
          authors: ['Ashish Vaswani', 'Noam Shazeer'],
          year: '2017',
          source: 'arXiv',
        },
        source: {
          title: 'Attention Is All You Need',
          authors: ['Ashish Vaswani', 'Noam Shazeer'],
          year: '2018',
          source: 'DBLP',
        },
      },
    });
    const content = result.content as Array<{ type: string; text: string }>;
    const parsed = JSON.parse(content[0].text);
    expect(parsed.count).toBe(1);
    expect(parsed.discrepancies[0].field).toBe('year');
  });

  it('compare_metadata returns no discrepancies when metadata matches', async () => {
    const result = await client.callTool({
      name: 'compare_metadata',
      arguments: {
        groundTruth: {
          title: 'Attention Is All You Need',
          authors: ['Ashish Vaswani', 'Noam Shazeer'],
          year: '2017',
          source: 'arXiv',
        },
        source: {
          title: 'Attention Is All You Need',
          authors: ['Ashish Vaswani', 'Noam Shazeer'],
          year: '2017',
          source: 'DBLP',
        },
      },
    });
    const content = result.content as Array<{ type: string; text: string }>;
    const parsed = JSON.parse(content[0].text);
    expect(parsed.count).toBe(0);
    expect(parsed.discrepancies).toEqual([]);
  });

  it('validate_paper returns error for invalid input', async () => {
    const result = await client.callTool({
      name: 'validate_paper',
      arguments: { input: 'not-a-valid-id' },
    });
    expect(result.isError).toBe(true);
    const content = result.content as Array<{ type: string; text: string }>;
    const parsed = JSON.parse(content[0].text);
    expect(parsed.error).toContain('Could not extract an arXiv ID');
  });
});
