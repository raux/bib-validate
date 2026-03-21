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

## MCP Server

bib-validate also ships as an [MCP (Model Context Protocol)](https://modelcontextprotocol.io/) server, letting AI assistants and other MCP clients call its validation logic directly.

### Running the server

```bash
npm run mcp
```

The server communicates over **stdio** using the MCP protocol.

### Available tools

| Tool | Description |
| --- | --- |
| `extract_arxiv_id` | Extract an arXiv ID from a URL or plain string |
| `normalize_doi` | Strip URL prefixes from a DOI string |
| `detect_input_type` | Identify whether input is an arXiv ID, DOI, or unknown |
| `fetch_arxiv_metadata` | Fetch paper metadata (title, authors, year) from the arXiv API |
| `fetch_dblp_metadata` | Search DBLP by title and return the top result |
| `fetch_ieee_metadata` | Search IEEE Xplore by title (requires `IEEE_API_KEY` env var) |
| `compare_metadata` | Compare source metadata against a ground-truth record and report discrepancies |
| `validate_paper` | End-to-end workflow: fetch arXiv ground truth, cross-reference DBLP & IEEE, and aggregate discrepancies |

### Client configuration

#### Claude Desktop

Add the following to your Claude Desktop config file (`claude_desktop_config.json`):

```json
{
  "mcpServers": {
    "bib-validate": {
      "command": "npx",
      "args": ["tsx", "src/mcp/server.ts"],
      "cwd": "/absolute/path/to/bib-validate",
      "env": {
        "IEEE_API_KEY": "your_ieee_api_key_here"
      }
    }
  }
}
```

#### VS Code / Copilot

Add to your VS Code `settings.json` (or `.vscode/mcp.json`):

```json
{
  "mcp": {
    "servers": {
      "bib-validate": {
        "command": "npx",
        "args": ["tsx", "src/mcp/server.ts"],
        "cwd": "/absolute/path/to/bib-validate",
        "env": {
          "IEEE_API_KEY": "your_ieee_api_key_here"
        }
      }
    }
  }
}
```

> **Note:** The MCP server reads `IEEE_API_KEY` from the environment (not the `VITE_`-prefixed variable used by the web app). Set it in the `env` block above or export it in your shell before starting the server.

## Project Structure

```
src/
  agents/          # Data-fetching agents (arXiv, DBLP, IEEE, Validation)
  components/      # React UI components (InputForm, ProgressBar, ResultsMatrix, SourceCard)
  hooks/           # useCoordinator – orchestrates the workflow with useReducer
  mcp/             # MCP server – exposes validation tools over stdio
  types/           # TypeScript interfaces
  utils/           # DOI normalization, author normalization, fuzzy matching
  __tests__/       # Vitest test suite
```
