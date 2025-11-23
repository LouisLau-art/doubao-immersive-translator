// 确保这个文件名和你实际的文件名一致
import { translateText } from './doubaoService.js';

// 1. 【关键】添加启动日志，证明 Service Worker 活了
console.log('✅ Doubao Background Worker Started');

const MAX_CONCURRENT_REQUESTS = 15;
const requestQueue = [];
const cache = new Map();
let activeCount = 0;

// 哈希生成函数 (保持不变)
const createHash = (input) => {
  let hash = 0;
  for (let i = 0; i < input.length; i += 1) {
    const chr = input.charCodeAt(i);
    hash = (hash << 5) - hash + chr;
    hash |= 0;
  }
  return hash.toString(16);
};

// 队列处理函数 (保持不变)
const processQueue = () => {
  if (activeCount >= MAX_CONCURRENT_REQUESTS || requestQueue.length === 0) {
    return;
  }

  const task = requestQueue.shift();
  activeCount += 1;

  console.log(`🚀 Processing translation: "${task.text.substring(0, 10)}..."`);

  translateText(task.text, task.apiKey, task.targetLanguage)
    .then((translation) => {
      // 写入缓存
      cache.set(task.cacheKey, translation);
      console.log('✅ Translation success');
      task.sendResponse({ success: true, translation, cached: false });
    })
    .catch((error) => {
      console.error('❌ Doubao translation error:', error);
      // 返回详细错误给前端
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
  // 2. 添加消息接收日志
  if (message.type === 'TRANSLATE_TEXT') {
    // 兼容处理：有些地方可能没包 payload，做个容错
    const payload = message.payload || message;
    const { text, targetLanguage = 'zh' } = payload;

    if (!text || !text.trim()) {
      sendResponse({ success: false, error: 'No text provided.' });
      return false;
    }

    // 检查缓存
    const cacheKey = createHash(`${targetLanguage}::${text}`);
    if (cache.has(cacheKey)) {
      console.log('📦 Serving from cache');
      sendResponse({ success: true, translation: cache.get(cacheKey), cached: true });
      return false; // 同步返回，不需要保持通道
    }

    // 获取 API Key
    chrome.storage.local.get(['doubaoApiKey'], (result) => {
      const apiKey = result?.doubaoApiKey;
      if (!apiKey) {
        console.error('❌ No API Key found');
        sendResponse({ success: false, error: 'Missing API key. Please configure in extension popup.' });
        return;
      }

      // 入队
      enqueueTranslation({
        text,
        targetLanguage,
        apiKey,
        cacheKey,
        sendResponse // 将 sendResponse 句柄传给队列，稍后调用
      });
    });

    return true; // 【关键】保持通道开启，等待异步处理
  }

  // Handle cache clearing
  if (message.type === 'CLEAR_CACHE') {
    try {
      const cacheSize = cache.size;
      cache.clear();
      console.log(`🗑️ Cache cleared (${cacheSize} items)`);
      sendResponse({ success: true, clearedItems: cacheSize });
    } catch (error) {
      console.error('❌ Failed to clear cache:', error);
      sendResponse({ success: false, error: error.message });
    }
    return false;
  }

  // 处理其他消息...
  return false;
});

// 上下文菜单 (右键菜单)
if (chrome.contextMenus) {
  chrome.runtime.onInstalled.addListener(() => {
    chrome.contextMenus.removeAll(() => {
      chrome.contextMenus.create({
        id: 'open-doubao-translator',
        title: 'Translate with Doubao',
        contexts: ['selection']
      });
    });
  });

  chrome.contextMenus.onClicked.addListener((info) => {
    if (info.menuItemId === 'open-doubao-translator' && info.selectionText) {
      chrome.storage.local.set({ pending_translation: info.selectionText }, () => {
        chrome.tabs.create({ url: 'src/translator/index.html' });
      });
    }
  });
}