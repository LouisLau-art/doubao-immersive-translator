import type { TranslationResponse } from '../types';

declare const jest: any;

const chrome = {
  runtime: {
    sendMessage: jest.fn(
      (
        message: { type: string; payload?: any },
        callback: (response: TranslationResponse) => void
      ) => {
        if (message.type === 'TRANSLATE_TEXT') {
          callback({
            success: true,
            translation: 'Mock translation',
            cached: false
          });
        }
      }
    ),
    lastError: undefined as { message?: string } | undefined
  },
  storage: {
    local: {
      get: jest.fn(
        (keys: string | string[] | object | null, callback: (items: object) => void) =>
          callback({})
      ),
      set: jest.fn((items: object, callback?: () => void) => callback?.()),
      remove: jest.fn((keys: string | string[], callback?: () => void) => callback?.())
    }
  }
};

export default chrome;