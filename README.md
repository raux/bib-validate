# bib-validate — Research Paper Metadata Cross-Checker

A React application that automates the verification of academic paper metadata by cross-referencing multiple sources.

## Features

- **Input:** arXiv URL/ID or DOI
- **Sources:** arXiv (ground truth), DBLP, IEEE Xplore
- **Discrepancy detection:** fuzzy title matching, author normalization, exact year comparison
- **Parallel queries:** DBLP and IEEE are queried concurrently via `Promise.allSettled`
- **Resilient:** each source failure shows "Source Unavailable" without breaking the app
- **Progress bar:** step-by-step status feedback

## Tech Stack

- React 19, Vite, TypeScript, Tailwind CSS
- `@tanstack/react-query`, `axios`, `fast-xml-parser`, `fuse.js`, `js-levenshtein`
- Tests: Vitest

## Setup

```bash
npm install
```

## Environment Variables

Create a `.env.local` file in the project root:

```env
# Required for IEEE Xplore lookups
VITE_IEEE_API_KEY=your_ieee_api_key_here

# Optional – for future Google Scholar support via a SERP API
VITE_SERP_API_KEY=your_serp_api_key_here
```

## Dev Server

```bash
npm run dev
```

Open [http://localhost:5173](http://localhost:5173) in your browser.

## Build

```bash
npm run build
```

## Tests

Run all tests:

```bash
npm test
```

Run only the Metadata Diff Logic tests:

```bash
npm test -- --grep "Metadata Diff Logic"
```

## Usage

1. Paste an arXiv URL (e.g. `https://arxiv.org/abs/1706.03762`), arXiv ID (e.g. `1706.03762`), or a DOI into the input field.
2. Click **Validate**.
3. The app fetches metadata from arXiv first, then queries DBLP and IEEE Xplore in parallel.
4. Any discrepancies in title, authors, or publication year are highlighted in the results panel.

## Project Structure

```
src/
  agents/          # Data-fetching agents (arXiv, DBLP, IEEE, Validation)
  components/      # React UI components (InputForm, ProgressBar, ResultsMatrix, SourceCard)
  hooks/           # useCoordinator – orchestrates the workflow with useReducer
  types/           # TypeScript interfaces
  utils/           # DOI normalization, author normalization, fuzzy matching
  __tests__/       # Vitest test suite
```
