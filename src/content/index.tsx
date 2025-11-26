
import React, { useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
// @ts-ignore - Vite handles CSS imports
import styles from './translation.css?inline';

console.log('Doubao Immersive Translator content script loaded');

// Define types

// Define types
type DisplayMode = 'original' | 'bilingual' | 'translation-only';
type ElementStatus = 'pending' | 'done';

const BLOCK_SELECTORS = 'p, h1, h2, h3, h4, h5, h6, li, div, article, section, div[class*="content"], div[class*="text"], div[class*="description"]';
const TRANSLATION_ATTR = 'data-doubao-translation-container';
const ORIGINAL_CLASS = 'doubao-original';
const STATUS_ATTR = 'data-doubao-status';
const STATUS: Record<string, ElementStatus> = {
  PENDING: 'pending',
  DONE: 'done',
};
const TECHNICAL_CLASS_KEYWORDS = ['hljs', 'code', 'nav', 'menu', 'footer', 'button', 'input'];
const USERNAME_CLASS_KEYWORDS = ['author', 'text-bold', 'link--primary', 'user', 'avatar', 'follow', 'f4'];
const COMMON_SHORT_WORDS = new Set(['new', 'top', 'star', 'fork', 'edit', 'save', 'news', 'run', 'log']);
const COMMON_WORDS = new Set([...COMMON_SHORT_WORDS, 'issues', 'pull', 'request', 'releases', 'docs', 'code', 'main', 'stable', 'latest', 'profile', 'readme', 'community', 'support', 'explore', 'home', 'topics']);
const MODE_OPTIONS = {
  ORIGINAL: 'original',
  BILINGUAL: 'bilingual',
  TRANSLATION_ONLY: 'translation-only',
} as const;

interface TranslationBlockProps {
  text: string;
  targetLanguage: string;
  initialTranslation?: string;
  onStatusChange?: (status: string) => void;
  onTranslationComplete?: (translation: string) => void;
}

interface TranslationResponse {
  success: boolean;
  translation?: string;
  error?: string;
  cached?: boolean;
}

// Utility functions
const sendTranslationRequest = (text: string, targetLanguage: string): Promise<TranslationResponse> => 
  new Promise((resolve, reject) => {
    chrome.runtime.sendMessage(
      {
        type: 'TRANSLATE_TEXT',
        payload: { text, targetLanguage },
      },
      (response: TranslationResponse) => {
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

const isUrlLike = (text: string) => /^https?:\/\//i.test(text) || /^([A-Za-z]:\\|\/|\.\/)/.test(text);
const hasLetters = (text: string) => /[\p{L}]/u.test(text);
const shouldSkipText = (text: string) => isUrlLike(text) || !hasLetters(text);
const isShortNumericText = (text: string) => text.length < 3 && /\d/.test(text);
const repoPathRegex = /^@?[\w-]+\/[\w-]+$/u;
const isRepoPath = (text: string) => repoPathRegex.test(text);
const isUsernameText = (text: string) => text.trim().startsWith('@');
const camelCaseRegex = /[a-z]+[A-Z][a-z]+/;
const snakeCaseRegex = /[a-z]+_[a-z]+/;
const codeSymbolRegex = /[`$<>;(){}\[\]]/;
const commandKeywordRegex = /(npm|yarn|pnpm|git|sudo|brew|pip|cargo|dotnet|razor)/i;

const getClassString = (element: Element | null): string => {
  if (!element) return '';
  if (typeof element.className === 'string') return element.className;
  if (typeof (element as SVGElement).className?.baseVal === 'string') return (element as SVGElement).className.baseVal;
  if (element.classList) return Array.from(element.classList).join(' ');
  return '';
};

const hasUsernameLikeContext = (element: Element | null): boolean => {
  let current = element;
  while (current && current !== document.body) {
    const classString = getClassString(current).toLowerCase();
    if (USERNAME_CLASS_KEYWORDS.some(keyword => classString.includes(keyword))) {
      return true;
    }
    current = current.parentElement;
  }
  return false;
};

const hasDirectTextContent = (element: Element | null): boolean => {
  if (!element) return false;
  return Array.from(element.childNodes).some(node => {
    if (node.nodeType === Node.TEXT_NODE && node.textContent) {
      return node.textContent.trim().length > 0;
    }
    return false;
  });
};

const isTechnicalClass = (element: Element): boolean => {
  const classString = getClassString(element).toLowerCase();
  return TECHNICAL_CLASS_KEYWORDS.some(keyword => classString.includes(keyword));
};

const isCommonWord = (text: string) => COMMON_WORDS.has(text.toLowerCase());

const shouldSkipTranslation = (text: string, element: Element): boolean => {
  const value = text.trim();
  if (!value) return true;

  // Skip huge blocks (over 1000 characters)
  if (value.length > 1000) {
    console.log(`Skipped [Too long]:`, value.substring(0, 50) + '...', 'Length:', value.length);
    return true;
  }

  // Skip text with extremely long words (likely URLs/garbage)
  const words = value.split(/\s+/);
  if (words.some(word => word.length > 40)) {
    console.log(`Skipped [Long word]:`, value.substring(0, 50) + '...');
    return true;
  }

  // Chinese character detection - skip if text contains Chinese characters
  const chineseRegex = /[\u4e00-\u9fa5]/;
  if (chineseRegex.test(value)) {
    console.log(
      `Skipped [Chinese text]:`,
      value.substring(0, 50) + '...',
      'Element:',
      element.tagName,
      getClassString(element),
    );
    return true;
  }

  // Golden Rule: Text Density > 50 chars always wins (except code blocks)
  const isInCodeBlock = element.closest('pre, code, textarea');
  if (value.length > 50 && !isInCodeBlock) {
    return false;
  }

  // For shorter text, apply strict filtering
  const reasons = [];
  if (isRepoPath(value)) reasons.push('repo-path');
  if (isUsernameText(value) || hasUsernameLikeContext(element)) reasons.push('username');
  if (
    camelCaseRegex.test(value) ||
    snakeCaseRegex.test(value) ||
    codeSymbolRegex.test(value) ||
    commandKeywordRegex.test(value)
  ) {
    reasons.push('code-like');
  }
  if (value.length < 2 && !COMMON_SHORT_WORDS.has(value.toLowerCase())) {
    reasons.push('too-short');
  }
  if (!/\s/.test(value) && !isCommonWord(value) && !isRepoPath(value)) {
    reasons.push('single-token');
  }

  if (reasons.length > 0) {
    console.log(
      `Skipped [${reasons.join(',')}]:`,
      value,
      'Element:',
      element.tagName,
      getClassString(element),
    );
    return true;
  }

  return false;
};

// Implement strict 3-state rendering system
const renderElement = (element: HTMLElement, mode: DisplayMode) => {
  const originalText = element.dataset.originalText || element.textContent || '';
  const translatedText = element.dataset.translatedText || '';

  // Skip elements that have images or other non-text content
  const hasImages = element.querySelector('img');
  if (hasImages) {
    // If element contains images, just remove translation and leave as-is
    const translationBlock = element.querySelector(`[${TRANSLATION_ATTR}]`);
    if (translationBlock) {
      translationBlock.remove();
    }
    return;
  }

  switch (mode) {
    case MODE_OPTIONS.ORIGINAL: {
      // Remove translation containers and restore original text
      const translationBlockOriginal = element.querySelector(`[${TRANSLATION_ATTR}]`);
      if (translationBlockOriginal) {
        translationBlockOriginal.remove();
      }
      break;
    }

    case MODE_OPTIONS.BILINGUAL: {
      // Remove existing translation block
      const translationBlockBilingual = element.querySelector(`[${TRANSLATION_ATTR}]`);
      if (translationBlockBilingual) {
        translationBlockBilingual.remove();
      }

      // Recreate translation block only if we have a translation
      if (translatedText) {
        mountTranslation(
          element,
          originalText,
          element.dataset.doubaoTranslationLanguage || 'zh',
          translatedText
        );
      }
      break;
    }

    case MODE_OPTIONS.TRANSLATION_ONLY: {
      // Remove translation container
      const translationBlockOnly = element.querySelector(`[${TRANSLATION_ATTR}]`);
      if (translationBlockOnly) {
        translationBlockOnly.remove();
      }

      // Replace with translated text
      element.textContent = translatedText;
      break;
    }
  }
};

const applyDisplayMode = (mode: DisplayMode = MODE_OPTIONS.BILINGUAL) => {
  // Get all elements with processed translations
  const translatedElements = document.querySelectorAll<HTMLElement>('[data-doubao-status="done"]');

  translatedElements.forEach(element => {
    renderElement(element, mode);
  });

  // Store current mode for reference
  document.documentElement.setAttribute('data-doubao-current-mode', mode);
};

chrome.storage.local.get(['doubaoDisplayMode'], result => {
  // Clean up old display mode styles
  const oldStyle = document.querySelector('[data-doubao-style="display-mode"]');
  if (oldStyle) oldStyle.remove();

  applyDisplayMode(result?.doubaoDisplayMode as DisplayMode || MODE_OPTIONS.BILINGUAL);
});

chrome.storage.onChanged.addListener((changes, areaName) => {
  if (areaName !== 'local' || !changes.doubaoDisplayMode) return;
  const mode = changes.doubaoDisplayMode.newValue as DisplayMode || MODE_OPTIONS.BILINGUAL;
  applyDisplayMode(mode);
});

// Extension enable/disable functionality
let extensionEnabled = true;

const updateExtensionState = (enabled: boolean) => {
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
chrome.storage.local.get(['extensionEnabled'], result => {
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

const getTypographyVars = (element: Element) => {
  const computed = window.getComputedStyle(element);
  return {
    fontFamily: computed.fontFamily,
    fontSize: computed.fontSize,
    lineHeight: computed.lineHeight,
    color: computed.color,
  };
};

const applyTypographyVars = (wrapper: HTMLElement, typography: ReturnType<typeof getTypographyVars>) => {
  if (!typography) return;
  const entries = [
    ['--doubao-font-family', typography.fontFamily],
    ['--doubao-font-size', typography.fontSize],
    ['--doubao-line-height', typography.lineHeight],
    ['--doubao-color', typography.color],
  ];
  entries.forEach(([key, value]) => {
    if (value) {
      wrapper.style.setProperty(key, value);
    }
  });
};

const ensureOriginalWrapped = (element: HTMLElement) => {
  if (element.querySelector(`.${ORIGINAL_CLASS}`)) {
    return;
  }

  const wrapper = document.createElement('span');
  wrapper.className = ORIGINAL_CLASS;

  while (element.firstChild) {
    const child = element.firstChild;
    if (child instanceof HTMLElement && child.hasAttribute(TRANSLATION_ATTR)) {
      break;
    }
    wrapper.appendChild(child);
  }

  element.insertBefore(wrapper, element.firstChild);
};

const getStatus = (element: Element) => element.getAttribute(STATUS_ATTR);
const setStatus = (element: Element, status: string) => element.setAttribute(STATUS_ATTR, status);

const TranslationBlock: React.FC<TranslationBlockProps> = ({
  text,
  targetLanguage,
  initialTranslation,
  onStatusChange,
  onTranslationComplete,
}) => {
  const [state, setState] = useState(() => {
    if (initialTranslation) {
      return { status: 'success', translation: initialTranslation, error: '' };
    }
    return { status: 'loading', translation: '', error: '' };
  });

  useEffect(() => {
    // Skip if we already have a translation
    if (initialTranslation) return;

    let isMounted = true;
    onStatusChange?.('loading');

    sendTranslationRequest(text, targetLanguage)
      .then(result => {
        if (!isMounted) return;
        setState({ status: 'success', translation: result.translation || '', error: '' });
        onStatusChange?.('success');
        onTranslationComplete?.(result.translation || '');
      })
      .catch(error => {
        if (!isMounted) return;
        setState({
          status: 'error',
          translation: '',
          error: error.message || 'Translation failed.',
        });
        onStatusChange?.('error');
      });

    return () => {
      isMounted = false;
    };
  }, [text, targetLanguage, initialTranslation, onStatusChange, onTranslationComplete]);

  const classNames = ['translation-line'];
  if (state.status === 'loading') classNames.push('translation-line--loading');
  if (state.status === 'error') classNames.push('translation-line--error');
  if (state.status === 'success' && state.translation.length > 0 && state.translation.length < 20) {
    classNames.push('translation-line--short');
  }

  const displayText =
    state.status === 'loading'
      ? 'Translating…'
      : state.status === 'error'
        ? state.error
        : state.translation;

  return <div className={classNames.join(' ')}>{displayText}</div>;
};

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

const getBlocks = () => Array.from(document.querySelectorAll<HTMLElement>(BLOCK_SELECTORS));

const hasTranslation = (element: Element) => Boolean(element.querySelector(`[${TRANSLATION_ATTR}]`));

const isNarrowContext = (element: Element): boolean => {
  if (!element) return false;
  const rect = element.getBoundingClientRect();
  if (rect && rect.width < 280) return true;
  return Boolean(
    element.closest('aside, nav, [data-view-component="true"] .js-repos-container, [data-hpc]')
  );
};

const mountTranslation = (element: HTMLElement, text: string, targetLanguage: string, translatedText: string | null = null) => {
  const typography = getTypographyVars(element);
  const { wrapper, mountPoint } = createShadowContainer();
  applyTypographyVars(wrapper, typography);
  if (isNarrowContext(element)) {
    wrapper.setAttribute('data-doubao-size', 'narrow');
  }
  element.appendChild(wrapper);
  element.dataset.doubaoTranslationLanguage = targetLanguage;

  // Save original text only once
  if (!element.dataset.originalText) {
    element.dataset.originalText = text;
  }

  const root = createRoot(mountPoint);
  root.render(
    <TranslationBlock
      text={text}
      targetLanguage={targetLanguage}
      initialTranslation={translatedText || undefined}
      onStatusChange={status => {
        if (status === 'success' || status === 'error') {
          setStatus(element, STATUS.DONE);
        }
      }}
      onTranslationComplete={newTranslation => {
        const finalTranslatedText = newTranslation || translatedText;

        // Store important data attributes
        if (!element.dataset.originalText) {
          element.dataset.originalText = text;
        }
        element.dataset.translatedText = finalTranslatedText || '';
        element.dataset.doubaoStatus = 'done';

        // Remove old data attribute
        delete element.dataset.doubaoTranslation;

        // Apply current display mode
        chrome.storage.local.get(['doubaoDisplayMode'], result => {
          renderElement(element, result?.doubaoDisplayMode as DisplayMode || MODE_OPTIONS.BILINGUAL);
        });
  }}
/>
);
};