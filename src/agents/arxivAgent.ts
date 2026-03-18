import axios from 'axios';
import { XMLParser } from 'fast-xml-parser';
import type { PaperMetadata } from '../types';

const ARXIV_API = 'https://export.arxiv.org/api/query';

/**
 * Fetch paper metadata from the arXiv API using an arXiv ID.
 */
export async function fetchArxivMetadata(arxivId: string): Promise<PaperMetadata> {
  const response = await axios.get(ARXIV_API, {
    params: { id_list: arxivId, max_results: 1 },
  });

  const parser = new XMLParser({ ignoreAttributes: false, isArray: (name) => name === 'author' });
  const result = parser.parse(response.data);

  const feed = result?.feed;
  const entry = feed?.entry;

  if (!entry) {
    throw new Error(`No entry found for arXiv ID: ${arxivId}`);
  }

  const title: string = (entry.title ?? '').replace(/\s+/g, ' ').trim();
  const published: string = entry.published ?? '';
  const year = published.slice(0, 4);

  let authors: string[] = [];
  if (Array.isArray(entry.author)) {
    authors = entry.author.map((a: { name: string }) => a.name ?? '').filter(Boolean);
  } else if (entry.author?.name) {
    authors = [entry.author.name];
  }

  return { title, authors, year, source: 'arXiv' };
}
