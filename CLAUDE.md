# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Doubao Immersive Translator is a Chrome Extension (Manifest V3) that provides inline web page translation using Volcengine's Doubao Seed Translation API. It includes both content script injection for web pages and a standalone translator workspace.

## Development Commands

```bash
# Install dependencies
npm install

# Development with hot reload (recommended for extension development)
npm run watch

# Build for production
npm run build

# Preview production build
npm run preview
```

## Architecture

### Extension Structure
- **Background Service Worker** (`src/background/`): Handles translation API calls with concurrent request queue (15 workers) and caching
- **Content Scripts** (`src/content/`): Injected into web pages for inline translation using Shadow DOM
- **Popup UI** (`src/popup/`): Extension popup for settings and quick actions
- **Standalone Translator** (`src/translator/`): Full-screen translator workspace with Markdown/LaTeX support

### Key Technologies
- React 18 with functional components and hooks
- Vite 4 with CRXJS plugin for Chrome extension bundling
- TailwindCSS for styling
- Chrome Extensions Manifest V3 APIs

### Translation Service
- Uses Volcengine Doubao Seed Translation API (`https://ark.cn-beijing.volces.com/api/v3/responses`)
- Model: `doubao-seed-translation-250915`
- Concurrent request management with local caching to avoid API rate limits
- Request queue with 15 worker limit

### Build Configuration
- Multi-entry build: popup and translator pages
- HMR on port 5173
- Chrome extension manifest generated from `src/manifest.config.js`
- Firefox compatibility included in manifest

## Key Implementation Details

### API Integration
The translation service (`src/background/doubaoService.js`) implements:
- Single-turn conversation format with one input item
- Automatic source language detection (do not set `source_language: 'auto'`)
- Target language specification via `translation_options.target_language`
- Error handling and caching with MD5-like hash keys

### Content Script Features
- Intelligent block detection for translation units
- Shadow DOM rendering to avoid style conflicts
- GitHub-aware filters (skips code blocks, usernames, repo paths)
- Bilingual vs translation-only display modes

### Chrome Storage
Uses `chrome.storage.sync` for:
- API key storage
- Translation history
- User preferences (language, display mode, font size)

## Development Workflow

1. Run `npm run watch` for development
2. Load unpacked extension from `dist/` folder in Chrome extensions page
3. Refresh extension after code changes
4. Check background service worker console for debugging

## Important Notes

- No testing framework is currently configured
- Extension requires Volcengine API key for translation functionality
- Content scripts run on all URLs (`<all_urls>`)
- Background service worker uses ES modules (`"type": "module"`)
- Caching is implemented to reduce API calls and avoid 429 errors