import React, { useCallback, useEffect, useMemo, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';

const DEFAULT_OUTPUT_MESSAGE = '翻译结果将显示在这里…';
const HISTORY_STORAGE_KEY = 'doubaoTranslatorHistory';
const MAX_HISTORY_ITEMS = 5;
const DEBOUNCE_DELAY = 500;

const LANGUAGE_OPTIONS = [
  { value: 'auto', label: '自动检测' },
  { value: 'zh', label: '简体中文' },
  { value: 'zh-Hant', label: '繁體中文' },
  { value: 'en', label: 'English' },
  { value: 'ja', label: '日本語' },
  { value: 'ko', label: '한국어' },
  { value: 'de', label: 'Deutsch' },
  { value: 'fr', label: 'Français' },
  { value: 'es', label: 'Español' },
  { value: 'it', label: 'Italiano' },
  { value: 'pt', label: 'Português' },
  { value: 'ru', label: 'Русский' },
  { value: 'th', label: 'ไทย' },
  { value: 'vi', label: 'Tiếng Việt' },
  { value: 'ar', label: 'العربية' },
  { value: 'cs', label: 'Čeština' },
  { value: 'da', label: 'Dansk' },
  { value: 'fi', label: 'Suomi' },
  { value: 'hr', label: 'Hrvatski' },
  { value: 'hu', label: 'Magyar' },
  { value: 'id', label: 'Bahasa Indonesia' },
  { value: 'ms', label: 'Bahasa Melayu' },
  { value: 'nb', label: 'Norsk Bokmål' },
  { value: 'nl', label: 'Nederlands' },
  { value: 'pl', label: 'Polski' },
  { value: 'ro', label: 'Română' },
  { value: 'sv', label: 'Svenska' },
  { value: 'tr', label: 'Türkçe' },
  { value: 'uk', label: 'Українська' }
];

const TARGET_LANGUAGE_OPTIONS = LANGUAGE_OPTIONS.filter((option) => option.value !== 'auto');

const useDebouncedValue = (value, delay = DEBOUNCE_DELAY) => {
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedValue(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);

  return debouncedValue;
};

const sendTranslationRequest = (text, targetLanguage) =>
  new Promise((resolve, reject) => {
    if (!text?.trim()) {
      reject(new Error('请输入要翻译的文本'));
      return;
    }

    const runtime = typeof chrome !== 'undefined' ? chrome.runtime : null;

    if (!runtime?.sendMessage) {
      reject(new Error('Chrome runtime 不可用，在扩展环境中打开此页面。'));
      return;
    }

    runtime.sendMessage(
      {
        type: 'TRANSLATE_TEXT',
        payload: { text, targetLanguage }
      },
      (response) => {
        if (chrome.runtime.lastError) {
          reject(new Error(chrome.runtime.lastError.message));
          return;
        }

        if (!response?.success) {
          reject(new Error(response?.error || '翻译失败'));
          return;
        }

        resolve(response);
      }
    );
  });

function App() {
  const [sourceLang, setSourceLang] = useState('auto');
  const [targetLang, setTargetLang] = useState('zh');
  const [inputText, setInputText] = useState('');
  const [translation, setTranslation] = useState('');
  const [isTranslating, setIsTranslating] = useState(false);
  const [statusMessage, setStatusMessage] = useState('准备就绪');
  const [history, setHistory] = useState([]);
  const [fontSize, setFontSize] = useState(16);
  const [copied, setCopied] = useState(false);

  const debouncedText = useDebouncedValue(inputText);
  const charCount = useMemo(() => inputText.length, [inputText]);

  useEffect(() => {
    const storage = chrome?.storage?.local;
    if (!storage) return;

    storage.get([HISTORY_STORAGE_KEY], (result) => {
      setHistory(result?.[HISTORY_STORAGE_KEY] ?? []);
    });
  }, []);

  useEffect(() => {
    const storage = chrome?.storage?.local;
    if (!storage) return;

    storage.get(['pending_translation'], (result) => {
      const pending = result?.pending_translation;
      if (pending) {
        setInputText(pending);
        setStatusMessage('已载入选中文本，准备翻译');
        storage.remove('pending_translation');
      }
    });
  }, []);

  useEffect(() => {
    if (!copied) return;
    const timeout = setTimeout(() => setCopied(false), 1500);
    return () => clearTimeout(timeout);
  }, [copied]);

  useEffect(() => {
    const trimmed = debouncedText.trim();

    if (!trimmed) {
      setTranslation('');
      setStatusMessage('请输入文本以开始翻译');
      setIsTranslating(false);
      return;
    }

    let cancelled = false;
    setIsTranslating(true);
    setStatusMessage('翻译中…');

    sendTranslationRequest(trimmed, targetLang)
      .then((result) => {
        if (cancelled) return;
        setTranslation(result.translation);
        setStatusMessage(result.cached ? '已从缓存加载翻译' : '翻译完成');
        persistHistory(trimmed, result.translation, sourceLang, targetLang, setHistory);
      })
      .catch((error) => {
        if (cancelled) return;
        console.error('Translation error:', error);
        setStatusMessage(error.message || '翻译失败');
      })
      .finally(() => {
        if (cancelled) return;
        setIsTranslating(false);
      });

    return () => {
      cancelled = true;
    };
  }, [debouncedText, targetLang, sourceLang]);

  const persistHistory = useCallback((text, translatedText, source, target, setHistoryState) => {
    setHistoryState((prev) => {
      const entry = {
        id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
        sourceText: text,
        translatedText,
        sourceLang: source,
        targetLang: target,
        timestamp: new Date().toISOString()
      };

      const next = [entry, ...prev].slice(0, MAX_HISTORY_ITEMS);
      chrome?.storage?.local?.set({ [HISTORY_STORAGE_KEY]: next });
      return next;
    });
  }, []);

  const handleSwapLanguages = () => {
    const newSource = targetLang;
    const candidateTarget = sourceLang === 'auto' ? targetLang : sourceLang;
    setSourceLang(newSource);
    setTargetLang(candidateTarget === 'auto' ? 'zh' : candidateTarget);
  };

  const handleClear = () => {
    setInputText('');
    setTranslation('');
    setStatusMessage('已清空');
  };

  const handleCopy = async () => {
    if (!translation) return;
    try {
      await navigator.clipboard.writeText(translation);
      setCopied(true);
      setStatusMessage('已复制到剪贴板');
    } catch (error) {
      console.error('Copy failed:', error);
      setStatusMessage('复制失败，请检查权限');
    }
  };

  const inputFontStyle = useMemo(
    () => ({
      fontSize: `${fontSize}px`,
      lineHeight: '1.6'
    }),
    [fontSize]
  );

  return (
    <div className="min-h-screen bg-gray-950 text-gray-100">
      <header className="border-b border-gray-900 bg-gray-950/80 px-6 py-5 backdrop-blur">
        <div className="mx-auto flex max-w-6xl flex-col gap-2">
          <p className="text-sm uppercase tracking-widest text-sky-400">Doubao Translator</p>
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <h1 className="text-2xl font-semibold text-white">沉浸式翻译工作台</h1>
              <p className="text-sm text-gray-400">Volcengine Doubao 翻译模型 · Markdown & KaTeX 渲染</p>
            </div>
            <div className="flex items-center gap-4 text-sm text-gray-400">
              <div>源语言: <span className="text-white">{getLabel(sourceLang)}</span></div>
              <div>目标语言: <span className="text-white">{getLabel(targetLang)}</span></div>
            </div>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl space-y-6 px-6 py-8">
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
          <section className="flex flex-col rounded-2xl border border-gray-900 bg-gray-900/60 shadow-xl shadow-black/30">
            <div className="flex items-center justify-between border-b border-gray-900 px-6 py-4">
              <div className="flex items-center gap-3">
                <label className="text-sm text-gray-400" htmlFor="sourceLang">
                  源语言
                </label>
                <select
                  id="sourceLang"
                  className="rounded-lg border border-gray-800 bg-gray-900 px-3 py-2 text-sm text-gray-100 focus:border-sky-500 focus:outline-none"
                  value={sourceLang}
                  onChange={(event) => setSourceLang(event.target.value)}
                >
                  {LANGUAGE_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>

              <button
                type="button"
                onClick={handleSwapLanguages}
                className="rounded-full border border-gray-800 bg-gray-900 px-2 py-1 text-sm text-gray-300 transition hover:border-sky-500 hover:text-white"
                title="交换语言"
              >
                ⇄
              </button>
            </div>

            <div className="flex flex-1 flex-col gap-4 px-6 py-4">
              <textarea
                className="min-h-[360px] w-full resize-none rounded-xl border border-gray-800 bg-gray-950/80 p-4 text-gray-100 placeholder-gray-500 focus:border-sky-500 focus:outline-none"
                placeholder="请输入要翻译的文本...\n\n提示：输入文本后 0.5s 内自动翻译，无需按钮。\n支持 LaTeX 数学公式：$...$ 行内，$$...$$ 块级。"
                value={inputText}
                onChange={(event) => setInputText(event.target.value)}
                style={inputFontStyle}
              />

              <div className="flex flex-wrap items-center justify-between gap-4 text-sm text-gray-400">
                <div>
                  <span className="text-white">{charCount}</span> 字符
                </div>
                <div className="flex items-center gap-3">
                  <label htmlFor="fontSizeSlider" className="text-sm">
                    字体大小
                  </label>
                  <input
                    id="fontSizeSlider"
                    type="range"
                    min="12"
                    max="26"
                    value={fontSize}
                    onChange={(event) => setFontSize(Number(event.target.value))}
                    className="accent-sky-500"
                  />
                  <span className="text-white">{fontSize}px</span>
                </div>
                <button
                  type="button"
                  onClick={handleClear}
                  className="rounded-lg border border-gray-800 px-3 py-1 text-sm text-gray-300 transition hover:border-red-500 hover:text-white"
                >
                  清空
                </button>
              </div>
            </div>
          </section>

          <section className="flex flex-col rounded-2xl border border-gray-900 bg-gray-900/60 shadow-xl shadow-black/30">
            <div className="flex items-center justify-between border-b border-gray-900 px-6 py-4">
              <div className="flex items-center gap-3">
                <label className="text-sm text-gray-400" htmlFor="targetLang">
                  目标语言
                </label>
                <select
                  id="targetLang"
                  className="rounded-lg border border-gray-800 bg-gray-900 px-3 py-2 text-sm text-gray-100 focus:border-sky-500 focus:outline-none"
                  value={targetLang}
                  onChange={(event) => setTargetLang(event.target.value)}
                >
                  {TARGET_LANGUAGE_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>

              <button
                type="button"
                onClick={handleCopy}
                disabled={!translation}
                className="rounded-lg border border-gray-800 px-3 py-1 text-sm text-gray-300 transition hover:border-sky-500 hover:text-white disabled:cursor-not-allowed disabled:opacity-50"
                title="复制翻译结果"
              >
                {copied ? '已复制 ✓' : '复制'}
              </button>
            </div>

            <div className="relative flex-1 overflow-hidden px-6 py-4">
              {isTranslating && (
                <div className="pointer-events-none absolute inset-0 flex items-start justify-end pr-6 pt-4">
                  <div className="flex items-center gap-2 rounded-full border border-sky-500/30 bg-sky-500/10 px-3 py-1 text-xs text-sky-300">
                    <span className="h-2 w-2 animate-pulse rounded-full bg-sky-400" />
                    翻译中…
                  </div>
                </div>
              )}

              <div className="markdown-body min-h-[360px] rounded-xl border border-gray-800 bg-gray-950/70 px-4 py-4" style={inputFontStyle}>
                <ReactMarkdown
                  remarkPlugins={[remarkMath]}
                  rehypePlugins={[rehypeKatex]}
                  className="prose prose-invert max-w-none"
                >
                  {translation || DEFAULT_OUTPUT_MESSAGE}
                </ReactMarkdown>
              </div>
            </div>
          </section>
        </div>

        <section className="rounded-2xl border border-gray-900 bg-gray-900/50 p-6">
          <details className="history-details" open>
            <summary className="cursor-pointer text-lg font-medium text-white">历史记录</summary>
            <div className="mt-4 grid gap-4 md:grid-cols-2">
              {history.length === 0 && <p className="text-sm text-gray-500">暂无历史记录</p>}
              {history.map((entry) => (
                <article key={entry.id} className="rounded-xl border border-gray-800 bg-gray-950/70 p-4 text-sm text-gray-300">
                  <div className="flex items-center justify-between text-xs text-gray-500">
                    <span>
                      {getLabel(entry.sourceLang)} → {getLabel(entry.targetLang)}
                    </span>
                    <time dateTime={entry.timestamp}>{new Date(entry.timestamp).toLocaleString()}</time>
                  </div>
                  <p className="mt-2 line-clamp-3 text-gray-400">{entry.sourceText}</p>
                  <p className="mt-2 line-clamp-3 text-white">{entry.translatedText}</p>
                </article>
              ))}
            </div>
          </details>
        </section>

        <footer className="flex flex-wrap items-center justify-between gap-4 border-t border-gray-900 pt-4 text-sm text-gray-400">
          <div>
            状态：<span className="text-white">{statusMessage}</span>
          </div>
          <div>Powered by Volcengine Doubao</div>
        </footer>
      </main>
    </div>
  );
}

const getLabel = (value) => LANGUAGE_OPTIONS.find((option) => option.value === value)?.label || value;

export default App;
