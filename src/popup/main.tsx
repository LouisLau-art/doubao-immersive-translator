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
  { value: 'uk', label: 'Ukrainian' },
];

const MODE_OPTIONS = {
  BILINGUAL: 'bilingual',
  TRANSLATION_ONLY: 'translation-only',
};

function Popup() {
  const [apiKey, setApiKey] = useState('');
  const [targetLanguage, setTargetLanguage] = useState('zh');
  const [displayMode, setDisplayMode] = useState(MODE_OPTIONS.BILINGUAL);
  const [extensionEnabled, setExtensionEnabled] = useState(true);
  const [autoTranslate, setAutoTranslate] = useState(false);
  interface Status {
    type: 'success' | 'error';
    message: string;
  }
  const [status, setStatus] = useState<Status | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isTranslating, setIsTranslating] = useState(false);

  useEffect(() => {
    chrome.storage.local.get(
      [
        'doubaoApiKey',
        'doubaoTargetLanguage',
        'doubaoDisplayMode',
        'extensionEnabled',
        'autoTranslate',
      ],
      result => {
        if (result.doubaoApiKey) setApiKey(result.doubaoApiKey);
        if (result.doubaoTargetLanguage) setTargetLanguage(result.doubaoTargetLanguage);
        if (result.doubaoDisplayMode) setDisplayMode(result.doubaoDisplayMode);
        if (result.extensionEnabled !== undefined) setExtensionEnabled(result.extensionEnabled);
        if (result.autoTranslate !== undefined) setAutoTranslate(result.autoTranslate);
      },
    );
  }, []);

  const handleSave = async (event: React.FormEvent) => {
    event.preventDefault();
    setIsSaving(true);
    setStatus(null);

    try {
      await chrome.storage.local.set({
        doubaoApiKey: apiKey.trim(),
        doubaoTargetLanguage: targetLanguage,
        doubaoDisplayMode: displayMode,
        extensionEnabled,
        autoTranslate,
      });
      setStatus({ type: 'success', message: 'Preferences saved.' });
    } catch (error) {
      console.error('Failed to save settings:', error);
      setStatus({ type: 'error', message: 'Failed to save settings.' });
    } finally {
      setIsSaving(false);
    }
  };

  // 3. 手动触发翻译 (核心修复部分)
  const handleTranslatePage = async () => {
    setIsTranslating(true);
    setStatus(null);

    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      if (!tab?.id) throw new Error('No active tab found.');

      // Refined internal page check
      const forbiddenProtocols = ['chrome://', 'edge://', 'about:', 'file://', 'extensions://'];
      const isForbiddenPage =
        tab.url && forbiddenProtocols.some(protocol => tab.url?.startsWith(protocol));

      // If it's a forbidden page or URL is not available, show error
      if (isForbiddenPage || !tab.url) {
        let errorMsg = '请选择一个普通的网页进行翻译，支持的页面格式：http:// 或 https://';
        if (tab.url?.startsWith('extensions://')) {
          errorMsg = '无法在扩展管理页面进行翻译，请访问普通网页后重试。';
        }
        setStatus({
          type: 'error',
          message: errorMsg,
        });
        return;
      }

      // 发送消息
      await chrome.tabs.sendMessage(tab.id, {
        type: 'TRIGGER_TRANSLATION',
        payload: { targetLanguage },
      });

      setStatus({ type: 'success', message: 'Translation started.' });
    } catch (error) {
      console.error('Translation trigger failed:', error);
      const isConnectionError =
        (error as Error).message.includes('Receiving end does not exist') ||
        (error as Error).message.includes('Could not establish connection');

      // User-friendly error message for connection issues
      if (isConnectionError) {
        setStatus({
          type: 'error',
          message: '插件脚本未加载，请刷新当前网页',
        });
      } else {
        // For other errors, show generic message
        setStatus({ type: 'error', message: '翻译失败，请检查网络连接或重试' });
      }
    } finally {
      setIsTranslating(false);
    }
  };

  const toggleDisplayMode = () => {
    setDisplayMode(prev =>
      prev === MODE_OPTIONS.BILINGUAL ? MODE_OPTIONS.TRANSLATION_ONLY : MODE_OPTIONS.BILINGUAL,
    );
  };

  const toggleExtensionEnabled = () => {
    setExtensionEnabled(prev => !prev);
  };

  const toggleAutoTranslate = () => {
    setAutoTranslate(prev => !prev);
  };

  const handleOpenTranslator = () => {
    try {
      chrome.tabs.create({ url: chrome.runtime.getURL('src/translator/index.html') });
    } catch (error) {
      console.error('Failed to open translator page:', error);
      setStatus({ type: 'error', message: '无法打开翻译工作台' });
    }
  };

  const handleClearCache = async () => {
    try {
      // Send message to background to clear cache
      chrome.runtime.sendMessage({ type: 'CLEAR_CACHE' }, response => {
        if (response?.success) {
          setStatus({ type: 'success', message: 'Cache cleared successfully.' });
          // Reload current tab to refresh translations
          chrome.tabs.query({ active: true, currentWindow: true }, tabs => {
            if (tabs[0]) {
              if (tabs[0].id) chrome.tabs.reload(tabs[0].id);
            }
          });
        } else {
          setStatus({ type: 'error', message: response?.error || 'Failed to clear cache.' });
        }
      });
    } catch (error) {
      console.error('Failed to clear cache:', error);
      setStatus({ type: 'error', message: 'Failed to clear cache.' });
    }
  };

  return (
    <div className='bg-slate-900 text-white'>
      <div className='p-4 space-y-4'>
        <div>
          <h1 className='text-xl font-semibold'>Doubao Immersive Translator</h1>
          <p className='text-sm text-slate-300'>
            Enter your Volcengine API key and select a target language.
          </p>
        </div>

        <form className='space-y-3' onSubmit={handleSave}>
          <div className='rounded-lg border border-slate-700 bg-slate-800/60 p-3'>
            <div className='flex items-center justify-between'>
              <div>
                <p className='text-sm font-medium text-slate-200'>Extension Status</p>
                <p className='text-xs text-slate-400'>
                  {extensionEnabled ? 'Translation is enabled' : 'Translation is disabled'}
                </p>
              </div>
              <button
                type='button'
                role='switch'
                aria-checked={extensionEnabled}
                onClick={toggleExtensionEnabled}
                className={`flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-semibold text-white transition ${
                  extensionEnabled
                    ? 'border-green-600 bg-green-700 hover:border-green-500'
                    : 'border-red-600 bg-red-700 hover:border-red-500'
                }`}
              >
                <span>{extensionEnabled ? 'Enabled' : 'Disabled'}</span>
                <span
                  className={`inline-flex h-4 w-4 items-center justify-center rounded-full text-[10px] ${
                    extensionEnabled ? 'bg-green-400' : 'bg-red-400'
                  }`}
                >
                  {extensionEnabled ? 'ON' : 'OFF'}
                </span>
              </button>
            </div>
          </div>

          <div className='rounded-lg border border-slate-700 bg-slate-800/60 p-3'>
            <div className='flex items-center justify-between'>
              <div>
                <p className='text-sm font-medium text-slate-200'>Auto-translate</p>
                <p className='text-xs text-slate-400'>
                  {autoTranslate ? 'Translate pages automatically' : 'Manual translation only'}
                </p>
              </div>
              <button
                type='button'
                role='switch'
                aria-checked={autoTranslate}
                onClick={toggleAutoTranslate}
                className={`flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-semibold text-white transition ${
                  autoTranslate
                    ? 'border-blue-600 bg-blue-700 hover:border-blue-500'
                    : 'border-slate-600 bg-slate-700 hover:border-slate-500'
                }`}
              >
                <span>{autoTranslate ? 'Auto' : 'Manual'}</span>
                <span
                  className={`inline-flex h-4 w-4 items-center justify-center rounded-full text-[10px] ${
                    autoTranslate ? 'bg-blue-400' : 'bg-slate-500'
                  }`}
                >
                  {autoTranslate ? 'ON' : 'OFF'}
                </span>
              </button>
            </div>
          </div>

          <div className='rounded-lg border border-slate-700 bg-slate-800/60 p-3'>
            <div className='flex items-center justify-between'>
              <div>
                <p className='text-sm font-medium text-slate-200'>Display Mode</p>
                <p className='text-xs text-slate-400'>
                  {displayMode === MODE_OPTIONS.BILINGUAL
                    ? 'Show original + translation'
                    : 'Show translation only'}
                </p>
              </div>
              <button
                type='button'
                role='switch'
                aria-checked={displayMode === MODE_OPTIONS.TRANSLATION_ONLY}
                onClick={toggleDisplayMode}
                className='flex items-center gap-2 rounded-full border border-slate-600 bg-slate-700 px-3 py-1 text-xs font-semibold text-white transition hover:border-sky-500'
              >
                <span>
                  {displayMode === MODE_OPTIONS.TRANSLATION_ONLY ? 'Translation Only' : 'Bilingual'}
                </span>
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

          <label className='block text-sm font-medium text-slate-200'>
            Volcengine API Key
            <input
              type='password'
              className='mt-1 w-full rounded-md border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-white placeholder-slate-500 focus:border-sky-500 focus:outline-none'
              placeholder='vk-...'
              value={apiKey}
              onChange={e => setApiKey(e.target.value)}
              required
            />
          </label>

          <label className='block text-sm font-medium text-slate-200'>
            Target Language
            <select
              className='mt-1 w-full rounded-md border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-white focus:border-sky-500 focus:outline-none'
              value={targetLanguage}
              onChange={e => setTargetLanguage(e.target.value)}
            >
              {TARGET_OPTIONS.map(option => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>

          <button
            type='submit'
            className='w-full rounded-md bg-sky-500 px-4 py-2 text-sm font-semibold text-white transition hover:bg-sky-400 disabled:cursor-not-allowed disabled:opacity-70'
            disabled={isSaving}
          >
            {isSaving ? 'Saving…' : 'Save Preferences'}
          </button>
        </form>

        <div className='space-y-2'>
          <button
            onClick={handleTranslatePage}
            disabled={isTranslating || !extensionEnabled}
            className='w-full bg-emerald-600 hover:bg-emerald-700 text-white py-2 rounded text-sm font-bold disabled:opacity-50 disabled:cursor-not-allowed flex justify-center items-center gap-2'
          >
            {isTranslating ? (
              <>
                <span className='animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full'></span>
                Translating...
              </>
            ) : (
              'Translate Current Page'
            )}
          </button>

          <div className='grid grid-cols-2 gap-2'>
            <button
              type='button'
              className='rounded-md border border-slate-700 px-3 py-2 text-xs font-semibold text-slate-300 transition hover:border-sky-500 hover:text-sky-200'
              onClick={async () => {
                try {
                  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
                  if (tab?.id) {
                    await chrome.tabs.sendMessage(tab.id, {
                      type: 'UPDATE_DISPLAY_MODE',
                      mode: 'original',
                    });
                    setStatus({ type: 'success', message: '已切换到原文模式' });
                  }
                } catch (error) {
                  console.error('Failed to switch to original mode:', error);
                  setStatus({ type: 'error', message: '切换失败，请重试' });
                }
              }}
            >
              显示原文
            </button>
            <button
              type='button'
              className='rounded-md border border-slate-700 px-3 py-2 text-xs font-semibold text-sky-200 transition hover:border-sky-500 hover:text-white'
              onClick={async () => {
                try {
                  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
                  if (tab?.id) {
                    await chrome.tabs.sendMessage(tab.id, {
                      type: 'UPDATE_DISPLAY_MODE',
                      mode: 'bilingual',
                    });
                    setStatus({ type: 'success', message: '已切换到双语模式' });
                  }
                } catch (error) {
                  console.error('Failed to switch to bilingual mode:', error);
                  setStatus({ type: 'error', message: '切换失败，请重试' });
                }
              }}
            >
              双语模式
            </button>
          </div>

          <div className='grid grid-cols-2 gap-2'>
            <button
              type='button'
              className='rounded-md border border-slate-700 px-3 py-2 text-xs font-semibold text-slate-300 transition hover:border-sky-500 hover:text-sky-200'
              onClick={handleClearCache}
            >
              Clear Cache
            </button>
            <button
              type='button'
              className='rounded-md border border-slate-700 px-3 py-2 text-xs font-semibold text-sky-200 transition hover:border-sky-500 hover:text-white'
              onClick={handleOpenTranslator}
            >
              Full Translator ↗
            </button>
          </div>

          {status && (
            <div
              className={`text-sm ${status.type === 'error' ? 'text-red-400' : 'text-emerald-400'} flex items-center gap-2`}
            >
              <span>{status.message}</span>
              {status.type === 'error' && status.message.includes('请刷新当前网页') && (
                <button
                  onClick={async () => {
                    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
                    if (tab?.id) {
                      chrome.tabs.reload(tab.id);
                    }
                  }}
                  className='ml-2 px-2 py-1 text-xs bg-sky-600 hover:bg-sky-500 text-white rounded transition-colors'
                >
                  刷新网页
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

const rootElement = document.getElementById('root');
if (!rootElement) throw new Error('Failed to find root element');
const root = createRoot(rootElement);
root.render(
  <React.StrictMode>
    <Popup />
  </React.StrictMode>,
);

// Set the popup height to match the content exactly
setTimeout(() => {
  const rootElement = document.getElementById('root');
  if (rootElement) {
    const contentHeight = rootElement.scrollHeight;
    document.body.style.height = `${contentHeight}px`;
    // Also set width if needed
    const contentWidth = rootElement.scrollWidth;
    document.body.style.width = `${contentWidth}px`;
  }
}, 100); // Give React time to render completely
