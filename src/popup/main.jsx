import React, { useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import './main.css';

const TARGET_OPTIONS = [
  { value: 'zh', label: 'Chinese (Simplified)' },
  { value: 'zh-Hant', label: 'Chinese (Traditional)' },
  { value: 'en', label: 'English' },
  { value: 'ja', label: 'Japanese' },
  { value: 'ko', label: 'Korean' },
  { value: 'de', label: 'German' },
  { value: 'fr', label: 'French' },
  { value: 'es', label: 'Spanish' },
  { value: 'it', label: 'Italian' },
  { value: 'pt', label: 'Portuguese' },
  { value: 'ru', label: 'Russian' },
  { value: 'th', label: 'Thai' },
  { value: 'vi', label: 'Vietnamese' },
  { value: 'ar', label: 'Arabic' },
  { value: 'cs', label: 'Czech' },
  { value: 'da', label: 'Danish' },
  { value: 'fi', label: 'Finnish' },
  { value: 'hr', label: 'Croatian' },
  { value: 'hu', label: 'Hungarian' },
  { value: 'id', label: 'Indonesian' },
  { value: 'ms', label: 'Malay' },
  { value: 'nb', label: 'Norwegian Bokmål' },
  { value: 'nl', label: 'Dutch' },
  { value: 'pl', label: 'Polish' },
  { value: 'ro', label: 'Romanian' },
  { value: 'sv', label: 'Swedish' },
  { value: 'tr', label: 'Turkish' },
  { value: 'uk', label: 'Ukrainian' }
];

const MODE_OPTIONS = {
  BILINGUAL: 'bilingual',
  TRANSLATION_ONLY: 'translation-only'
};

function Popup() {
  const [apiKey, setApiKey] = useState('');
  const [targetLanguage, setTargetLanguage] = useState('zh');
  const [displayMode, setDisplayMode] = useState(MODE_OPTIONS.BILINGUAL);
  const [status, setStatus] = useState(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isTranslating, setIsTranslating] = useState(false);

  useEffect(() => {
    chrome.storage.local.get(['doubaoApiKey', 'doubaoTargetLanguage', 'doubaoDisplayMode'], (result) => {
      if (result.doubaoApiKey) setApiKey(result.doubaoApiKey);
      if (result.doubaoTargetLanguage) setTargetLanguage(result.doubaoTargetLanguage);
      if (result.doubaoDisplayMode) setDisplayMode(result.doubaoDisplayMode);
    });
  }, []);

  const handleSave = async (event) => {
    event.preventDefault();
    setIsSaving(true);
    setStatus(null);

    try {
      await chrome.storage.local.set({
        doubaoApiKey: apiKey.trim(),
        doubaoTargetLanguage: targetLanguage,
        doubaoDisplayMode: displayMode
      });
      setStatus({ type: 'success', message: 'Preferences saved.' });
    } catch (error) {
      console.error('Failed to save settings:', error);
      setStatus({ type: 'error', message: 'Failed to save settings.' });
    } finally {
      setIsSaving(false);
    }
  };

  const handleTranslate = async () => {
    setIsTranslating(true);
    setStatus(null);

    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      if (!tab?.id) {
        throw new Error('No active tab found.');
      }

      await chrome.tabs.sendMessage(tab.id, {
        type: 'START_TRANSLATION',
        payload: { targetLanguage }
      });

      setStatus({ type: 'success', message: 'Translation started on page.' });
    } catch (error) {
      console.error('Failed to trigger translation:', error);
      setStatus({ type: 'error', message: error.message || 'Failed to start translation.' });
    } finally {
      setIsTranslating(false);
    }
  };

  const toggleDisplayMode = () => {
    setDisplayMode((prev) =>
      prev === MODE_OPTIONS.BILINGUAL ? MODE_OPTIONS.TRANSLATION_ONLY : MODE_OPTIONS.BILINGUAL
    );
  };

  const handleOpenTranslator = () => {
    try {
      chrome.tabs.create({ url: chrome.runtime.getURL('src/translator/index.html') });
    } catch (error) {
      console.error('Failed to open translator page:', error);
      setStatus({ type: 'error', message: '无法打开翻译工作台' });
    }
  };

  return (
    <div className="min-h-[320px] bg-slate-900 text-white">
      <div className="p-4 space-y-4">
        <div>
          <h1 className="text-xl font-semibold">Doubao Immersive Translator</h1>
          <p className="text-sm text-slate-300">
            Enter your Volcengine API key and select a target language.
          </p>
        </div>

        <form className="space-y-3" onSubmit={handleSave}>
          <div className="rounded-lg border border-slate-700 bg-slate-800/60 p-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-200">Display Mode</p>
                <p className="text-xs text-slate-400">
                  {displayMode === MODE_OPTIONS.BILINGUAL ? 'Show original + translation' : 'Show translation only'}
                </p>
              </div>
              <button
                type="button"
                role="switch"
                aria-checked={displayMode === MODE_OPTIONS.TRANSLATION_ONLY}
                onClick={toggleDisplayMode}
                className="flex items-center gap-2 rounded-full border border-slate-600 bg-slate-700 px-3 py-1 text-xs font-semibold text-white transition hover:border-sky-500"
              >
                <span>{displayMode === MODE_OPTIONS.TRANSLATION_ONLY ? 'Translation Only' : 'Bilingual'}</span>
                <span
                  className={`inline-flex h-4 w-4 items-center justify-center rounded-full text-[10px] ${
                    displayMode === MODE_OPTIONS.TRANSLATION_ONLY ? 'bg-sky-400' : 'bg-slate-500'
                  }`}
                >
                  {displayMode === MODE_OPTIONS.TRANSLATION_ONLY ? 'ON' : 'OFF'}
                </span>
              </button>
            </div>
          </div>

          <label className="block text-sm font-medium text-slate-200">
            Volcengine API Key
            <input
              type="password"
              className="mt-1 w-full rounded-md border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-white placeholder-slate-500 focus:border-sky-500 focus:outline-none"
              placeholder="vk-..."
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              required
            />
          </label>

          <label className="block text-sm font-medium text-slate-200">
            Target Language
            <select
              className="mt-1 w-full rounded-md border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-white focus:border-sky-500 focus:outline-none"
              value={targetLanguage}
              onChange={(e) => setTargetLanguage(e.target.value)}
            >
              {TARGET_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>

          <button
            type="submit"
            className="w-full rounded-md bg-sky-500 px-4 py-2 text-sm font-semibold text-white transition hover:bg-sky-400 disabled:cursor-not-allowed disabled:opacity-70"
            disabled={isSaving}
          >
            {isSaving ? 'Saving…' : 'Save Preferences'}
          </button>
        </form>

        <button
          type="button"
          className="w-full rounded-md border border-slate-700 px-4 py-2 text-sm font-semibold text-white transition hover:border-sky-500 hover:text-sky-200 disabled:cursor-not-allowed disabled:opacity-70"
          onClick={handleTranslate}
          disabled={isTranslating}
        >
          {isTranslating ? 'Starting…' : 'Translate This Page'}
        </button>

        <button
          type="button"
          className="w-full rounded-md border border-slate-700 px-4 py-2 text-sm font-semibold text-sky-200 transition hover:border-sky-500 hover:text-white"
          onClick={handleOpenTranslator}
        >
          Open Full Translator ↗
        </button>

        {status && (
          <p
            className={`text-sm ${
              status.type === 'error' ? 'text-red-400' : 'text-emerald-400'
            }`}
          >
            {status.message}
          </p>
        )}
      </div>
    </div>
  );
}

const root = createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <Popup />
  </React.StrictMode>
);
