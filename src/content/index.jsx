import React, { useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import styles from './translation.css?inline';

console.log('Doubao Immersive Translator content script loaded');

const BLOCK_SELECTORS = 'p, h1, h2, h3, h4, h5, h6, li';
const TRANSLATION_ATTR = 'data-doubao-translation-container';
const ORIGINAL_CLASS = 'doubao-original';
const STATUS_ATTR = 'data-doubao-status';
const STATUS = {
  PENDING: 'pending',
  DONE: 'done'
};
const META_CLASS_KEYWORDS = ['time', 'date', 'stats', 'stat', 'counter', 'meta', 'timestamp'];
const USERNAME_CLASS_KEYWORDS = ['author', 'text-bold', 'link--primary', 'user', 'avatar', 'follow', 'f4'];
const COMMON_SHORT_WORDS = new Set(['new', 'top', 'star', 'fork', 'edit', 'save', 'news']);
const COMMON_WORDS = new Set([
  ...COMMON_SHORT_WORDS,
  'issues',
  'pull',
  'request',
  'releases',
  'docs',
  'code',
  'main',
  'stable',
  'latest',
  'profile',
  'readme',
  'community',
  'support',
  'explore',
  'home',
  'topics'
]);
const MODE_OPTIONS = {
  BILINGUAL: 'bilingual',
  TRANSLATION_ONLY: 'translation-only'
};

const sendTranslationRequest = (text, targetLanguage) =>
  new Promise((resolve, reject) => {
    chrome.runtime.sendMessage(
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
          reject(new Error(response?.error || 'Translation failed.'));
          return;
        }

        resolve(response);
      }
    );
  });

const isUrlLike = (text) => /^https?:\/\//i.test(text) || /^([A-Za-z]:\\|\/|\.\/)/.test(text);
const hasLetters = (text) => /[\p{L}]/u.test(text);
const shouldSkipText = (text) => isUrlLike(text) || !hasLetters(text);
const isShortNumericText = (text) => text.length < 3 && /\d/.test(text);
const isRepoPath = (text) => /^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/.test(text);
const isUsernameText = (text) => text.trim().startsWith('@');
const camelCaseRegex = /[a-z]+[A-Z][a-z]+/;
const snakeCaseRegex = /[a-z]+_[a-z]+/;
const codeSymbolRegex = /[`$<>;(){}\[\]]/;
const commandKeywordRegex = /(npm|yarn|pnpm|git|sudo|brew|pip|cargo|dotnet|razor)/i;

const getClassString = (element) => {
  if (!element) return '';
  if (typeof element.className === 'string') return element.className;
  if (typeof element.className?.baseVal === 'string') return element.className.baseVal;
  if (element.classList) return Array.from(element.classList).join(' ');
  return '';
};

const hasUsernameLikeContext = (element) => {
  let current = element;
  while (current && current !== document.body) {
    const classString = getClassString(current).toLowerCase();
    if (USERNAME_CLASS_KEYWORDS.some((keyword) => classString.includes(keyword))) {
      return true;
    }
    current = current.parentElement;
  }
  return false;
};

const isCommonWord = (text) => COMMON_WORDS.has(text.toLowerCase());

const shouldSkipTranslation = (text, element) => {
  const value = text.trim();
  if (!value) return true;
  if (isRepoPath(value)) return true;
  if (isUsernameText(value) || hasUsernameLikeContext(element)) return true;
  if (camelCaseRegex.test(value) || snakeCaseRegex.test(value) || codeSymbolRegex.test(value) || commandKeywordRegex.test(value)) {
    return true;
  }
  if (value.length < 4 && !COMMON_SHORT_WORDS.has(value.toLowerCase())) {
    return true;
  }
  if (!/\s/.test(value) && !isCommonWord(value)) {
    return true;
  }
  return false;
};

const matchesMetaClass = (element) => {
  const className =
    typeof element.className === 'string'
      ? element.className
      : typeof element.className?.baseVal === 'string'
        ? element.className.baseVal
        : Array.from(element.classList ?? []).join(' ');
  const lower = className?.toLowerCase?.() || '';
  return META_CLASS_KEYWORDS.some((keyword) => lower.includes(keyword));
};

const injectDisplayModeStyles = (() => {
  let injected = false;
  return () => {
    if (injected) return;
    const style = document.createElement('style');
    style.setAttribute('data-doubao-style', 'display-mode');
    style.textContent = `
      .${ORIGINAL_CLASS} {
        display: block;
      }
      [data-doubao-display-mode='${MODE_OPTIONS.TRANSLATION_ONLY}'] .${ORIGINAL_CLASS} {
        display: none !important;
      }
    `;
    (document.head || document.documentElement).appendChild(style);
    injected = true;
  };
})();

const applyDisplayMode = (mode = MODE_OPTIONS.BILINGUAL) => {
  document.documentElement.setAttribute('data-doubao-display-mode', mode);
};

chrome.storage.local.get(['doubaoDisplayMode'], (result) => {
  injectDisplayModeStyles();
  applyDisplayMode(result?.doubaoDisplayMode || MODE_OPTIONS.BILINGUAL);
});

chrome.storage.onChanged.addListener((changes, areaName) => {
  if (areaName !== 'local' || !changes.doubaoDisplayMode) return;
  const mode = changes.doubaoDisplayMode.newValue || MODE_OPTIONS.BILINGUAL;
  applyDisplayMode(mode);
});

const getTypographyVars = (element) => {
  const computed = window.getComputedStyle(element);
  return {
    fontFamily: computed.fontFamily,
    fontSize: computed.fontSize,
    lineHeight: computed.lineHeight,
    color: computed.color
  };
};

const applyTypographyVars = (wrapper, typography) => {
  if (!typography) return;
  const entries = [
    ['--doubao-font-family', typography.fontFamily],
    ['--doubao-font-size', typography.fontSize],
    ['--doubao-line-height', typography.lineHeight],
    ['--doubao-color', typography.color]
  ];
  entries.forEach(([key, value]) => {
    if (value) {
      wrapper.style.setProperty(key, value);
    }
  });
};

const ensureOriginalWrapped = (element) => {
  if (element.querySelector(`.${ORIGINAL_CLASS}`)) {
    return;
  }

  const wrapper = document.createElement('span');
  wrapper.className = ORIGINAL_CLASS;

  while (element.firstChild) {
    const child = element.firstChild;
    if (child.hasAttribute?.(TRANSLATION_ATTR)) {
      break;
    }
    wrapper.appendChild(child);
  }

  element.insertBefore(wrapper, element.firstChild);
};

const getStatus = (element) => element.getAttribute(STATUS_ATTR);
const setStatus = (element, status) => element.setAttribute(STATUS_ATTR, status);

function TranslationBlock({ text, targetLanguage, onStatusChange }) {
  const [state, setState] = useState({ status: 'loading', translation: '', error: '' });

  useEffect(() => {
    let isMounted = true;
    onStatusChange?.('loading');

    sendTranslationRequest(text, targetLanguage)
      .then((result) => {
        if (!isMounted) return;
        setState({ status: 'success', translation: result.translation, error: '' });
        onStatusChange?.('success');
      })
      .catch((error) => {
        if (!isMounted) return;
        setState({ status: 'error', translation: '', error: error.message || 'Translation failed.' });
        onStatusChange?.('error');
      });

    return () => {
      isMounted = false;
    };
  }, [text, targetLanguage]);

  const classNames = ['translation-line'];
  if (state.status === 'loading') classNames.push('translation-line--loading');
  if (state.status === 'error') classNames.push('translation-line--error');
  if (state.status === 'success' && state.translation.length > 0 && state.translation.length < 20) {
    classNames.push('translation-line--short');
  }

  const displayText =
    state.status === 'loading' ? 'Translating…' : state.status === 'error' ? state.error : state.translation;

  return <div className={classNames.join(' ')}>{displayText}</div>;
}

const createShadowContainer = () => {
  const wrapper = document.createElement('div');
  wrapper.setAttribute(TRANSLATION_ATTR, 'true');
  const shadowRoot = wrapper.attachShadow({ mode: 'open' });

  const styleTag = document.createElement('style');
  styleTag.textContent = styles;
  shadowRoot.appendChild(styleTag);

  const mountPoint = document.createElement('div');
  shadowRoot.appendChild(mountPoint);

  return { wrapper, mountPoint };
};

const getBlocks = () => Array.from(document.querySelectorAll(BLOCK_SELECTORS));

const hasTranslation = (element) => Boolean(element.querySelector(`[${TRANSLATION_ATTR}]`));

const isNarrowContext = (element) => {
  if (!element) return false;
  const width = element.getBoundingClientRect?.().width || 0;
  if (width && width < 280) return true;
  return Boolean(element.closest?.('aside, nav, [data-view-component="true"] .js-repos-container, [data-hpc]'));
};

const mountTranslation = (element, text, targetLanguage) => {
  const typography = getTypographyVars(element);
  const { wrapper, mountPoint } = createShadowContainer();
  applyTypographyVars(wrapper, typography);
  if (isNarrowContext(element)) {
    wrapper.setAttribute('data-doubao-size', 'narrow');
  }
  element.appendChild(wrapper);
  element.dataset.doubaoTranslationLanguage = targetLanguage;

  const root = createRoot(mountPoint);
  root.render(
    <TranslationBlock
      text={text}
      targetLanguage={targetLanguage}
      onStatusChange={(status) => {
        if (status === 'success' || status === 'error') {
          setStatus(element, STATUS.DONE);
        }
      }}
    />
  );
};

const translatePage = (targetLanguage = 'zh') => {
  const blocks = getBlocks();
  blocks.forEach((element) => {
    const currentStatus = getStatus(element);
    if (currentStatus === STATUS.PENDING || currentStatus === STATUS.DONE) return;
    if (hasTranslation(element)) return;
    if (matchesMetaClass(element)) return;

    const text = element.innerText?.trim();
    if (!text || shouldSkipText(text) || isShortNumericText(text) || shouldSkipTranslation(text, element)) return;

    setStatus(element, STATUS.PENDING);
    ensureOriginalWrapped(element);

    mountTranslation(element, text, targetLanguage);
  });
};

chrome.runtime.onMessage.addListener((message) => {
  if (message.type === 'START_TRANSLATION') {
    const targetLanguage = message.payload?.targetLanguage || 'zh';
    translatePage(targetLanguage);
  }
});

console.info('Doubao Immersive Translator content script ready.');
