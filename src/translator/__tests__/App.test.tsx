/// <reference types="@testing-library/jest-dom" />
/// <reference types="jest" />

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import App from '../App';

// Mock chrome storage
declare global {
  namespace NodeJS {
    interface Global {
      chrome: any;
    }
  }
}

interface MockChrome {
  storage: {
    local: {
      get: jest.Mock;
      set: jest.Mock;
      remove: jest.Mock;
    };
  };
  runtime: {
    sendMessage: jest.Mock;
  };
}

const mockStorageGet = jest.fn();
const mockStorageSet = jest.fn();
const mockStorageRemove = jest.fn();
const mockSendMessage = jest.fn();

global.chrome = {
  storage: {
    local: {
      get: mockStorageGet,
      set: mockStorageSet,
      remove: mockStorageRemove,
    },
  },
  runtime: {
    sendMessage: mockSendMessage,
  },
} as MockChrome;

// Mock translation response
// Mock clipboard
Object.defineProperty(navigator, 'clipboard', {
  value: {
    writeText: jest.fn(),
  },
  writable: true,
});
const mockTranslationResponse = {
  success: true,
  translation: 'Translated text',
  cached: false,
};

beforeEach(() => {
  jest.clearAllMocks();
  mockStorageGet.mockImplementation((keys, callback) => {
    callback({});
  });
});

describe('App Component', () => {
  it('renders without crashing', () => {
    render(<App />);
    expect(screen.getByText('ARK 豆包翻译器')).toBeInTheDocument();
  });

  it('handles text input and translation', async () => {
    // Mock the translation response
    chrome.runtime.sendMessage.mockImplementation((message, callback) => {
      callback(mockTranslationResponse);
    });

    render(<App />);
    
    // Enter text in the input field
    const textarea = screen.getByPlaceholderText('请输入要翻译的文本...');
    fireEvent.change(textarea, { target: { value: 'Hello world' } });
    
    // Wait for translation to complete
    await waitFor(() => {
      expect(screen.getByText('Translated text')).toBeInTheDocument();
    });
    
    // Verify status message
    expect(screen.getByText('状态：翻译完成')).toBeInTheDocument();
  });

  it('handles language swap', () => {
    render(<App />);
    
    // Check initial languages
    expect(screen.getByText('源语言：自动检测')).toBeInTheDocument();
    expect(screen.getByText('目标语言：简体中文')).toBeInTheDocument();
    
    // Click swap button
    const swapButton = screen.getByTitle('交换语言');
    fireEvent.click(swapButton);
    
    // Verify swapped languages
    expect(screen.getByText('源语言：简体中文')).toBeInTheDocument();
    expect(screen.getByText('目标语言：自动检测')).toBeInTheDocument();
  });

  it('copies translation to clipboard', async () => {
    // Mock clipboard API
    Object.assign(navigator, {
      clipboard: {
        writeText: jest.fn().mockResolvedValue(undefined),
      },
    });

    // Mock the translation response
    chrome.runtime.sendMessage.mockImplementation((message, callback) => {
      callback(mockTranslationResponse);
    });

    render(<App />);
    
    // Enter text and wait for translation
    const textarea = screen.getByPlaceholderText('请输入要翻译的文本...');
    fireEvent.change(textarea, { target: { value: 'Text to copy' } });
    
    await waitFor(() => {
      expect(screen.getByText('Translated text')).toBeInTheDocument();
    });
    
    // Click copy button
    const copyButton = screen.getByTitle('复制翻译结果');
    fireEvent.click(copyButton);
    
    // Verify copy action
    await waitFor(() => {
      expect(navigator.clipboard.writeText).toHaveBeenCalledWith('Translated text');
      expect(screen.getByText('状态：已复制到剪贴板')).toBeInTheDocument();
    });
  });
});