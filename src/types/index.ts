// Chrome Extension API types
export interface ChromeRuntimeMessage {
  type: string;
  payload?: Record<string, unknown>;
}

export interface TranslationRequest {
  text: string;
  targetLanguage: string;
}

export interface TranslationResponse {
  success: boolean;
  translation?: string;
  error?: string;
  cached?: boolean;
}

export interface DoubaoApiResponse {
  choices?: Array<{
    message?: {
      content: string;
    };
  }>;
  output?: Array<{
    content?: Array<{
      text: string;
    }>;
  }>;
  error?: {
    message: string;
  };
}

// Storage types
export interface StorageSettings {
  doubaoApiKey?: string;
  doubaoTargetLanguage?: string;
  doubaoDisplayMode?: string;
  extensionEnabled?: boolean;
  autoTranslate?: boolean;
}

export interface TranslationHistoryEntry {
  id: string;
  sourceText: string;
  translatedText: string;
  sourceLang: string;
  targetLang: string;
  timestamp: string;
}

// Language types
export interface LanguageOption {
  value: string;
  label: string;
}

export const LANGUAGE_OPTIONS: LanguageOption[] = [
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
  { value: 'uk', label: 'Українська' },
];

// Display mode types
export const MODE_OPTIONS = {
  ORIGINAL: 'original',
  BILINGUAL: 'bilingual',
  TRANSLATION_ONLY: 'translation-only',
} as const;

export type DisplayMode = typeof MODE_OPTIONS[keyof typeof MODE_OPTIONS];

// Component props types
export interface TranslationBlockProps {
  text: string;
  targetLanguage: string;
  initialTranslation?: string;
  onStatusChange?: (status: string) => void;
  onTranslationComplete?: (translation: string) => void;
}

export interface AppState {
  sourceLang: string;
  targetLang: string;
  inputText: string;
  translation: string;
  isTranslating: boolean;
  statusMessage: string;
  history: TranslationHistoryEntry[];
  fontSize: number;
  copied: boolean;
}

// Utility types
export interface TypographyVars {
  fontFamily: string;
  fontSize: string;
  lineHeight: string;
  color: string;
}

export interface ElementStatus {
  PENDING: 'pending';
  DONE: 'done';
}