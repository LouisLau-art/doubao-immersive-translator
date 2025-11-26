// src/utils/i18n.ts
import { useState, useEffect } from 'react';

export type Language = 'zh' | 'en' | 'ja' | 'ko' | 'es' | 'fr' | 'de' | 'ru' | 'th' | 'vi' | 'ar' | 'pt' | 'it' | 'nl' | 'pl' | 'tr' | 'uk' | 'cs' | 'da' | 'fi' | 'hr' | 'hu' | 'id' | 'ms' | 'nb' | 'ro' | 'sv';

export interface TranslationKey {
  'app.title': string;
  'app.subtitle': string;
  'app.sourceLanguage': string;
  'app.targetLanguage': string;
  'app.autoDetect': string;
  'app.translate': string;
  'app.translating': string;
  'app.translationComplete': string;
  'app.translationFailed': string;
  'app.clear': string;
  'app.copy': string;
  'app.copied': string;
  'app.history': string;
  'app.noHistory': string;
  'app.reuse': string;
  'app.fontSize': string;
  'app.status': string;
  'app.ready': string;
  'app.emptyText': string;
  'app.copyFailed': string;
  'app.swapLanguages': string;
  'app.inputPlaceholder': string;
  'app.outputPlaceholder': string;
  'app.autoTranslate': string;
  'app.enabled': string;
  'app.disabled': string;
  'app.poweredBy': string;
  'error.apiKeyRequired': string;
  'error.networkError': string;
  'error.translationError': string;
  'error.storageError': string;
  'error.invalidInput': string;
  'error.rateLimit': string;
  'popup.apiKey': string;
  'popup.targetLanguage': string;
  'popup.displayMode': string;
  'popup.extensionStatus': string;
  'popup.autoTranslate': string;
  'popup.save': string;
  'popup.translatePage': string;
  'popup.originalMode': string;
  'popup.bilingualMode': string;
  'popup.clearCache': string;
  'popup.fullTranslator': string;
  'popup.preferencesSaved': string;
  'popup.preferencesFailed': string;
  'popup.refreshPage': string;
}

const translations: Partial<Record<Language, TranslationKey>> = {
  zh: {
    'app.title': 'ARK 豆包翻译器',
    'app.subtitle': '沉浸式双栏体验 · Markdown & KaTeX 支持 · Volcengine Doubao',
    'app.sourceLanguage': '源语言',
    'app.targetLanguage': '目标语言',
    'app.autoDetect': '自动检测',
    'app.translate': '翻译',
    'app.translating': '翻译中…',
    'app.translationComplete': '翻译完成',
    'app.translationFailed': '翻译失败',
    'app.clear': '清空',
    'app.copy': '复制',
    'app.copied': '已复制',
    'app.history': '历史记录',
    'app.noHistory': '暂无历史记录',
    'app.reuse': '再次翻译',
    'app.fontSize': '字体大小',
    'app.status': '状态',
    'app.ready': '准备就绪',
    'app.emptyText': '请输入文本以开始翻译',
    'app.copyFailed': '复制失败，请检查权限',
    'app.swapLanguages': '交换语言',
    'app.inputPlaceholder': '请输入要翻译的文本...\n\n提示：输入文本后 0.5s 内自动翻译，无需按钮。\n支持 LaTeX 数学公式：$...$ 行内，$$...$$ 块级。',
    'app.outputPlaceholder': '翻译结果将显示在这里…',
    'app.autoTranslate': '自动翻译',
    'app.enabled': '已启用',
    'app.disabled': '已禁用',
    'app.poweredBy': 'Powered by Volcengine Doubao',
    'error.apiKeyRequired': 'API key is required',
    'error.networkError': 'Network error occurred',
    'error.translationError': 'Translation failed',
    'error.storageError': 'Storage error',
    'error.invalidInput': 'Invalid input',
    'error.rateLimit': 'Rate limit exceeded',
    'popup.apiKey': 'Volcengine API Key',
    'popup.targetLanguage': 'Target Language',
    'popup.displayMode': 'Display Mode',
    'popup.extensionStatus': 'Extension Status',
    'popup.autoTranslate': 'Auto-translate',
    'popup.save': 'Save Preferences',
    'popup.translatePage': 'Translate Current Page',
    'popup.originalMode': '显示原文',
    'popup.bilingualMode': '双语模式',
    'popup.clearCache': 'Clear Cache',
    'popup.fullTranslator': 'Full Translator',
    'popup.preferencesSaved': 'Preferences saved',
    'popup.preferencesFailed': 'Failed to save settings',
    'popup.refreshPage': 'Refresh Page',
  },
  en: {
    'app.title': 'ARK Doubao Translator',
    'app.subtitle': 'Immersive Dual-column Experience · Markdown & KaTeX Support · Volcengine Doubao',
    'app.sourceLanguage': 'Source Language',
    'app.targetLanguage': 'Target Language',
    'app.autoDetect': 'Auto Detect',
    'app.translate': 'Translate',
    'app.translating': 'Translating…',
    'app.translationComplete': 'Translation Complete',
    'app.translationFailed': 'Translation Failed',
    'app.clear': 'Clear',
    'app.copy': 'Copy',
    'app.copied': 'Copied',
    'app.history': 'History',
    'app.noHistory': 'No history yet',
    'app.reuse': 'Translate Again',
    'app.fontSize': 'Font Size',
    'app.status': 'Status',
    'app.ready': 'Ready',
    'app.emptyText': 'Please enter text to start translation',
    'app.copyFailed': 'Copy failed, please check permissions',
    'app.swapLanguages': 'Swap Languages',
    'app.inputPlaceholder': 'Enter text to translate...\n\nTip: Auto-translates within 0.5s after input, no button needed.\nSupports LaTeX math: $...$ inline, $$...$$ block.',
    'app.outputPlaceholder': 'Translation will appear here…',
    'app.autoTranslate': 'Auto Translate',
    'app.enabled': 'Enabled',
    'app.disabled': 'Disabled',
    'app.poweredBy': 'Powered by Volcengine Doubao',
    'error.apiKeyRequired': 'API key is required',
    'error.networkError': 'Network error occurred',
    'error.translationError': 'Translation failed',
    'error.storageError': 'Storage error',
    'error.invalidInput': 'Invalid input',
    'error.rateLimit': 'Rate limit exceeded',
    'popup.apiKey': 'Volcengine API Key',
    'popup.targetLanguage': 'Target Language',
    'popup.displayMode': 'Display Mode',
    'popup.extensionStatus': 'Extension Status',
    'popup.autoTranslate': 'Auto-translate',
    'popup.save': 'Save Preferences',
    'popup.translatePage': 'Translate Current Page',
    'popup.originalMode': 'Original Mode',
    'popup.bilingualMode': 'Bilingual Mode',
    'popup.clearCache': 'Clear Cache',
    'popup.fullTranslator': 'Full Translator',
    'popup.preferencesSaved': 'Preferences saved',
    'popup.preferencesFailed': 'Failed to save settings',
    'popup.refreshPage': 'Refresh Page',
  },
  ja: {
    'app.title': 'ARK 豆包翻訳機',
    'app.subtitle': '没入型二段表示 · Markdown & KaTeX サポート · Volcengine Doubao',
    'app.sourceLanguage': 'ソース言語',
    'app.targetLanguage': 'ターゲット言語',
    'app.autoDetect': '自動検出',
    'app.translate': '翻訳',
    'app.translating': '翻訳中…',
    'app.translationComplete': '翻訳完了',
    'app.translationFailed': '翻訳失敗',
    'app.clear': 'クリア',
    'app.copy': 'コピー',
    'app.copied': 'コピー済み',
    'app.history': '履歴',
    'app.noHistory': '履歴なし',
    'app.reuse': '再翻訳',
    'app.fontSize': 'フォントサイズ',
    'app.status': 'ステータス',
    'app.ready': '準備完了',
    'app.emptyText': '翻訳を開始するにはテキストを入力してください',
    'app.copyFailed': 'コピー失敗、権限を確認してください',
    'app.swapLanguages': '言語交換',
    'app.inputPlaceholder': '翻訳するテキストを入力...\n\nヒント：入力後0.5秒で自動翻訳、ボタン不要。\nLaTeX数式をサポート：$...$ インライン、$$...$$ ブロック。',
    'app.outputPlaceholder': '翻訳結果がここに表示されます…',
    'app.autoTranslate': '自動翻訳',
    'app.enabled': '有効',
    'app.disabled': '無効',
    'app.poweredBy': 'Powered by Volcengine Doubao',
    'error.apiKeyRequired': 'APIキーが必要です',
    'error.networkError': 'ネットワークエラーが発生しました',
    'error.translationError': '翻訳に失敗しました',
    'error.storageError': 'ストレージエラー',
    'error.invalidInput': '無効な入力',
    'error.rateLimit': 'レート制限を超えました',
    'popup.apiKey': 'Volcengine APIキー',
    'popup.targetLanguage': 'ターゲット言語',
    'popup.displayMode': '表示モード',
    'popup.extensionStatus': '拡張機能ステータス',
    'popup.autoTranslate': '自動翻訳',
    'popup.save': '設定を保存',
    'popup.translatePage': '現在のページを翻訳',
    'popup.originalMode': '原文表示',
    'popup.bilingualMode': '二カ国語モード',
    'popup.clearCache': 'キャッシュクリア',
    'popup.fullTranslator': 'フル翻訳機',
    'popup.preferencesSaved': '設定が保存されました',
    'popup.preferencesFailed': '設定の保存に失敗しました',
    'popup.refreshPage': 'ページを更新',
  },
};

class I18nManager {
  private currentLanguage: Language = 'zh';

  setLanguage(language: Language): void {
    this.currentLanguage = language;
  }

  getLanguage(): Language {
    return this.currentLanguage;
  }

  t(key: keyof TranslationKey, params?: Record<string, string>): string {
    const translation = translations[this.currentLanguage]?.[key];
    if (!translation) {
      console.warn(`Missing translation for key "${key}" in language "${this.currentLanguage}"`);
      return key;
    }
    
    if (params) {
      // Simple parameter replacement
      let result = translation;
      Object.entries(params).forEach(([param, value]) => {
        result = result.replace(`{{${param}}}`, value);
      });
      return result;
    }
    
    return translation;
  }

  getSupportedLanguages(): Language[] {
    return Object.keys(translations) as Language[];
  }

  getLanguageName(language: Language): string {
    const names: Record<Language, string> = {
      zh: '简体中文',
      en: 'English',
      ja: '日本語',
      ko: '한국어',
      es: 'Español',
      fr: 'Français',
      de: 'Deutsch',
      ru: 'Русский',
      th: 'ไทย',
      vi: 'Tiếng Việt',
      ar: 'العربية',
      pt: 'Português',
      it: 'Italiano',
      nl: 'Nederlands',
      pl: 'Polski',
      tr: 'Türkçe',
      uk: 'Українська',
      cs: 'Čeština',
      da: 'Dansk',
      fi: 'Suomi',
      hr: 'Hrvatski',
      hu: 'Magyar',
      id: 'Bahasa Indonesia',
      ms: 'Bahasa Melayu',
      nb: 'Norsk Bokmål',
      ro: 'Română',
      sv: 'Svenska',
    };
    
    return names[language] || language;
  }
}

export const i18n = new I18nManager();

// Hook for React components
export const useI18n = () => {
  const [language, setLanguage] = useState<Language>(i18n.getLanguage());

  useEffect(() => {
    // Load saved language preference
    chrome.storage.local.get(['language'], (result) => {
      if (result.language) {
        setLanguage(result.language);
        i18n.setLanguage(result.language);
      }
    });
  }, []);

  const changeLanguage = (newLanguage: Language): void => {
    setLanguage(newLanguage);
    i18n.setLanguage(newLanguage);
    chrome.storage.local.set({ language: newLanguage });
  };

  return {
    t: i18n.t.bind(i18n),
    getSupportedLanguages: i18n.getSupportedLanguages.bind(i18n),
    getLanguageName: i18n.getLanguageName.bind(i18n),
    setLanguage: changeLanguage,
    getLanguage: () => language,
  };
};

// Helper function for accessibility
export const getAriaLabel = (key: keyof TranslationKey): string => {
  return i18n.t(key);
};

// Helper function for screen readers
export const getScreenReaderText = (key: keyof TranslationKey): string => {
  return i18n.t(key);
};