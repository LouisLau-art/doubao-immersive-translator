// src/test/setupTests.ts
import '@testing-library/jest-dom';

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

// Mock clipboard
Object.defineProperty(navigator, 'clipboard', {
  value: {
    writeText: jest.fn(),
  },
  writable: true,
});

beforeEach(() => {
  jest.clearAllMocks();
  mockStorageGet.mockImplementation((keys, callback) => {
    callback({});
  });
});