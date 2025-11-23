import React, { useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import styles from './translation.css?inline';

console.log('Doubao Immersive Translator content script loaded');

const BLOCK_SELECTORS = 'p, h1, h2, h3, h4, h5, h6, li, div, article, section, div[class*="content"], div[class*="text"], div[class*="description"]';
const TRANSLATION_ATTR = 'data-doubao-translation-container';
const ORIGINAL_CLASS = 'doubao-original';
const STATUS_ATTR = 'data-doubao-status';
const STATUS = {
  PENDING: 'pending',
  DONE: 'done'
};
const TECHNICAL_CLASS_KEYWORDS = ['hljs', 'code', 'nav', 'menu', 'footer', 'button', 'input'];
const USERNAME_CLASS_KEYWORDS = ['author', 'text-bold', 'link--primary', 'user', 'avatar', 'follow', 'f4'];
const COMMON_SHORT_WORDS = new Set(['new', 'top', 'star', 'fork', 'edit', 'save', 'news', 'run', 'log']);
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
const repoPathRegex = /^@?[\w-]+\/[\w-]+$/;
const isRepoPath = (text) => repoPathRegex.test(text);
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

const hasDirectTextContent = (element) =>
  Array.from(element?.childNodes ?? []).some(
    (node) => node.nodeType === Node.TEXT_NODE && node.textContent?.trim()?.length > 0
  );

const isTechnicalClass = (element) => {
  const classString = getClassString(element).toLowerCase();
  return TECHNICAL_CLASS_KEYWORDS.some((keyword) => classString.includes(keyword));
};

const isCommonWord = (text) => COMMON_WORDS.has(text.toLowerCase());

const shouldSkipTranslation = (text, element) => {
  const value = text.trim();
  if (!value) return true;
  
  // Golden Rule: Text Density > 50 chars always wins (except code blocks)
  const isInCodeBlock = element.closest('pre, code, textarea');
  if (value.length > 50 && !isInCodeBlock) {
    return false;
  }
  
  // For shorter text, apply strict filtering
  const reasons = [];
  if (isRepoPath(value)) reasons.push('repo-path');
  if (isUsernameText(value) || hasUsernameLikeContext(element)) reasons.push('username');
  if (camelCaseRegex.test(value) || snakeCaseRegex.test(value) || codeSymbolRegex.test(value) || commandKeywordRegex.test(value)) {
    reasons.push('code-like');
  }
  if (value.length < 2 && !COMMON_SHORT_WORDS.has(value.toLowerCase())) {
    reasons.push('too-short');
  }
  if (!/\s/.test(value) && !isCommonWord(value) && !isRepoPath(value)) {
    reasons.push('single-token');
  }

  if (reasons.length > 0) {
    console.log(`Skipped [${reasons.join(',')}]:`, value, 'Element:', element.tagName, getClassString(element));
    return true;
  }

  return false;
};

const matchesMetaClass = (element) => {
  // Deprecated: Use isTechnicalClass instead
  return isTechnicalClass(element);
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

// Extension enable/disable functionality
let extensionEnabled = true;

const updateExtensionState = (enabled) => {
  extensionEnabled = enabled;

  if (enabled) {
    document.body.classList.remove('doubao-disabled');
    console.log('Doubao Translator enabled');
  } else {
    document.body.classList.add('doubao-disabled');
    console.log('Doubao Translator disabled');
  }
};

// Check initial extension state
chrome.storage.local.get(['extensionEnabled'], (result) => {
  updateExtensionState(result.extensionEnabled !== false); // Default to true
});

// Listen for extension state changes
chrome.storage.onChanged.addListener((changes, areaName) => {
  if (areaName !== 'local' || !changes.extensionEnabled) return;
  updateExtensionState(changes.extensionEnabled.newValue);
});

// Add CSS for disabled state
const injectDisableStyles = (() => {
  let injected = false;
  return () => {
    if (injected) return;
    const style = document.createElement('style');
    style.setAttribute('data-doubao-style', 'disable-state');
    style.textContent = `
      body.doubao-disabled [data-doubao-translation-container] {
        display: none !important;
      }
    `;
    (document.head || document.documentElement).appendChild(style);
    injected = true;
  };
})();

// Inject disable styles on load
injectDisableStyles();

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

let currentTargetLanguage = 'zh';

const isEligibleRichBlock = (element, text) => {
  if (!element) return false;
  const tag = element.tagName;
  
  // Skip technical classes regardless of text density
  if (isTechnicalClass(element)) {
    console.log(`Skipped [Technical Class]:`, tag, getClassString(element), text.length);
    return false;
  }
  
  // Golden Rule: Text Density > 50 chars always wins
  if (text.length > 50) {
    return true;
  }
  
  // For shorter text, apply stricter heuristics
  if (tag === 'DIV') {
    if (!hasDirectTextContent(element)) {
      console.log(`Skipped [No Direct Text]:`, tag, getClassString(element), text.length);
      return false;
    }
    if (text.length < 30) {
      console.log(`Skipped [Too Short]:`, tag, getClassString(element), text.length);
      return false;
    }
  }
  if (tag === 'SECTION' || tag === 'ARTICLE') {
    if (!hasDirectTextContent(element) || text.length < 30) {
      console.log(`Skipped [Section/Article Too Short]:`, tag, getClassString(element), text.length);
      return false;
    }
  }
  return true;
};

const translatePage = (targetLanguage = 'zh') => {
  // Check if extension is enabled before processing
  if (!extensionEnabled) {
    console.log('Translation disabled - skipping page processing');
    return;
  }

  currentTargetLanguage = targetLanguage;
  const blocks = getBlocks();

  // Performance: Quick filter for already processed elements
  const unprocessedBlocks = blocks.filter((element) => {
    const currentStatus = getStatus(element);
    return currentStatus !== STATUS.PENDING && currentStatus !== STATUS.DONE;
  });

  unprocessedBlocks.forEach((element) => {
    try {
      if (hasTranslation(element)) return;
      if (isTechnicalClass(element)) return;

      const text = element.innerText?.trim();
      if (!text || shouldSkipText(text) || isShortNumericText(text) || shouldSkipTranslation(text, element)) return;

      const tag = element.tagName;
      if (tag === 'DIV' || tag === 'SECTION' || tag === 'ARTICLE') {
        if (!isEligibleRichBlock(element, text)) {
          return;
        }
      }

      setStatus(element, STATUS.PENDING);
      ensureOriginalWrapped(element);

      mountTranslation(element, text, targetLanguage);
    } catch (error) {
      console.error('Error processing element:', error, element);
      // Continue processing other elements even if one fails
    }
  });

  console.log(`Processed ${unprocessedBlocks.length} unprocessed blocks out of ${blocks.length} total`);
};

chrome.runtime.onMessage.addListener((message) => {
  if (message.type === 'START_TRANSLATION') {
    const targetLanguage = message.payload?.targetLanguage || 'zh';
    translatePage(targetLanguage);
  }
});

const setupScrollListener = () => {
  if (typeof window === 'undefined') return;
  let scrollTimeout;
  
  const handleScroll = () => {
    if (scrollTimeout) {
      clearTimeout(scrollTimeout);
    }
    scrollTimeout = setTimeout(() => {
      translatePage(currentTargetLanguage);
    }, 500); // 500ms debounce
  };
  
  window.addEventListener('scroll', handleScroll, { passive: true });
  console.log('Scroll listener attached for translation scanning');
};

const setupMutationObserver = () => {
  if (typeof MutationObserver === 'undefined' || !document?.body) return;
  let timeoutId;
  const observer = new MutationObserver(() => {
    if (timeoutId) {
      clearTimeout(timeoutId);
    }
    timeoutId = setTimeout(() => {
      translatePage(currentTargetLanguage);
    }, 1500);
  });

  observer.observe(document.body, { childList: true, subtree: true });
};

setupMutationObserver();
setupScrollListener();

console.info('Doubao Immersive Translator content script ready.');
