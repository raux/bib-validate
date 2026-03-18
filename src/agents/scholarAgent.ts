import axios from 'axios';
import type { PaperMetadata } from '../types';

const IEEE_API = 'https://ieeexploreapi.ieee.org/api/v1/search/articles';

interface IeeeArticle {
  title?: string;
  authors?: { authors?: Array<{ full_name?: string }> };
  publication_year?: string | number;
}

/**
 * Search IEEE Xplore by title and return the top result's metadata.
 * Requires IEEE_API_KEY environment variable (Vite: VITE_IEEE_API_KEY).
 */
export async function fetchIeeeMetadata(title: string): Promise<PaperMetadata> {
  const apiKey = import.meta.env.VITE_IEEE_API_KEY as string | undefined;
  if (!apiKey) {
    throw new Error('IEEE API key not configured (VITE_IEEE_API_KEY)');
  }

  const response = await axios.get(IEEE_API, {
    params: {
      querytext: title,
      max_records: 1,
      apikey: apiKey,
    },
  });

  const articles: IeeeArticle[] = response.data?.articles ?? [];
  if (articles.length === 0) throw new Error('No results found on IEEE Xplore');

  const article = articles[0];
  const titleResult = (article.title ?? '').replace(/\s+/g, ' ').trim();
  const year = String(article.publication_year ?? '');
  const authors = (article.authors?.authors ?? [])
    .map((a) => a.full_name ?? '')
    .filter(Boolean);

  return { title: titleResult, authors, year, source: 'IEEE' };
}

/**
 * Fallback: fetch ACM Digital Library metadata by searching via title
 * using the ACM OpenURL resolver. Returns metadata or throws on failure.
 * Note: ACM does not provide a free metadata API; this is a best-effort stub.
 */
export async function fetchAcmMetadata(title: string): Promise<PaperMetadata> {
  // ACM DL doesn't have a fully open API; attempt a basic metadata search
  throw new Error(`ACM DL API not available – check access for: "${title}"`);
}
