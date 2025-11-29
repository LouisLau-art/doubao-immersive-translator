# Doubao Immersive Translator

[English](README.md) | [中文](README_zh.md)

![License](https://img.shields.io/badge/license-MIT-blue.svg) ![Version](https://img.shields.io/badge/version-0.1.0-orange.svg)

## Overview
Doubao Immersive Translator delivers inline, context-aware translations for any website using Volcengine Doubao Seed. It also ships with a full-screen translator workspace featuring Markdown + LaTeX rendering, debounced translation, and history syncing.

---

## Features

- ✨ **Immersive Web Translation** – intelligent block detection, Shadow DOM rendering, GitHub-aware filters (skip code, usernames, repo slugs).
- 🖥️ **Standalone Translator Page** – split-view editor with Markdown/KaTeX preview, font slider, copy/clear controls, and chrome.storage history.
- 📄 **Long Markdown Translation** – Automatic chunking for long documents, preserves Markdown formatting, concurrency control to avoid API limits.
- ⚡ **High Performance** – concurrent request queue (15 workers) with local caching to avoid 429s and reduce API spend.
- 🧰 **Modern Stack** – React + Vite + crxjs + TailwindCSS + Manifest V3.
- ⚙️ **Customizable UX** – Bilingual vs Translation-only mode, font sizing, Doubao Seed integration.

---

## Tech Stack

- React 18 + React Markdown + remark-math + rehype-katex
- Vite 4 + crxjs plugin (Manifest V3 bundling)
- TailwindCSS + Custom CSS
- Chrome Extensions API (runtime, storage, contextMenus)
- Volcengine Doubao Seed Translation API

---

## Installation & Development

```bash
# 1. Install dependencies
npm install

# 2. Start watch build (outputs to dist/ with HMR-like rebuilds)
npm run watch
```

1. Open Chrome/Edge → `chrome://extensions/`.
2. Enable **Developer Mode**.
3. Click **Load unpacked** → choose the `dist/` folder.
4. For development, keep `npm run watch` running and refresh the extension.

---

## Configuration

1. Open the popup and paste your Volcengine API key (Doubao Seed).
2. Choose target language, display mode, and save.
3. Click **Translate This Page** or **Open Full Translator**.

 

## Screenshots

- Popup / Page Translation

  ![Popup Demo](src/assets/popup-demo.jpeg)

- Translator Workspace

  ![Translator Workspace](src/assets/translator-demo.jpeg)

---

## License

MIT © 2025 Doubao Immersive Translator
