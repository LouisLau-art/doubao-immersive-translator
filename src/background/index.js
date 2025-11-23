import { translateText } from './doubaoService.js';

const MAX_CONCURRENT_REQUESTS = 3;
const requestQueue = [];
const cache = new Map();
let activeCount = 0;

const createHash = (input) => {
  let hash = 0;
  for (let i = 0; i < input.length; i += 1) {
    const chr = input.charCodeAt(i);
    hash = (hash << 5) - hash + chr;
    hash |= 0; // Convert to 32bit integer
  }
  return hash.toString(16);
};

const processQueue = () => {
  if (activeCount >= MAX_CONCURRENT_REQUESTS || requestQueue.length === 0) {
    return;
  }

  const task = requestQueue.shift();
  activeCount += 1;

  translateText(task.text, task.apiKey, task.targetLanguage)
    .then((translation) => {
      cache.set(task.cacheKey, translation);
      task.sendResponse({ success: true, translation, cached: false });
    })
    .catch((error) => {
      console.error('Doubao translation error:', error);
      task.sendResponse({ success: false, error: error.message || 'Translation failed' });
    })
    .finally(() => {
      activeCount -= 1;
      processQueue();
    });
};

const enqueueTranslation = (task) => {
  requestQueue.push(task);
  processQueue();
};

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'TRANSLATE_TEXT') {
    const { text, targetLanguage = 'zh' } = message.payload ?? {};

    if (!text || !text.trim()) {
      sendResponse({ success: false, error: 'No text provided for translation.' });
      return false;
    }

    const cacheKey = createHash(`${targetLanguage}::${text}`);
    if (cache.has(cacheKey)) {
      sendResponse({ success: true, translation: cache.get(cacheKey), cached: true });
      return false;
    }

    chrome.storage.local.get(['doubaoApiKey'], (result) => {
      const apiKey = result?.doubaoApiKey;
      if (!apiKey) {
        sendResponse({ success: false, error: 'Missing Volcengine API key. Save it in the popup first.' });
        return;
      }

      enqueueTranslation({
        text,
        targetLanguage,
        apiKey,
        cacheKey,
        sendResponse
      });
    });

    return true; // Keep the message channel open while queue processes.
  }

  return false;
});

chrome.runtime.onInstalled.addListener(() => {
  if (!chrome.contextMenus) return;
  chrome.contextMenus.create({
    id: 'open-doubao-translator',
    title: 'Translate with Doubao',
    contexts: ['selection']
  });
});

chrome.contextMenus?.onClicked.addListener((info) => {
  if (info.menuItemId !== 'open-doubao-translator' || !info.selectionText) return;

  chrome.storage.local.set({ pending_translation: info.selectionText }, () => {
    chrome.tabs.create({ url: chrome.runtime.getURL('src/translator/index.html') });
  });
});
