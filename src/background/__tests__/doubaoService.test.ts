import { translateText, sanitizeText } from '../doubaoService';

describe('Doubao Service', () => {
  describe('sanitizeText', () => {
    it('should truncate text longer than 800 characters', () => {
      const longText = 'a'.repeat(1000);
      const result = sanitizeText(longText);
      expect(result.length).toBe(800);
    });

    it('should remove non-printable control characters', () => {
      const textWithControlChars = 'Hello\x00World\x01';
      const result = sanitizeText(textWithControlChars);
      expect(result).toBe('HelloWorld');
    });

    it('should throw error for empty text after sanitization', () => {
      const emptyText = '\x00\x01\x02';
      expect(() => sanitizeText(emptyText)).toThrow('Text is empty after sanitization');
    });

    it('should preserve valid text', () => {
      const validText = 'Hello World!';
      const result = sanitizeText(validText);
      expect(result).toBe(validText);
    });
  });

  describe('translateText', () => {
    const mockApiKey = 'test-api-key';
    const mockText = 'Hello World';
    const mockTargetLanguage = 'zh';

    beforeEach(() => {
      (global.fetch as jest.Mock).mockClear();
    });

    it('should return empty string for empty text', async () => {
      const result = await translateText('', mockApiKey, mockTargetLanguage);
      expect(result).toBe('');
    });

    it('should throw error for missing API key', async () => {
      await expect(translateText(mockText, '', mockTargetLanguage))
        .rejects.toThrow('Missing Volcengine API key');
    });

    it('should handle API errors', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        status: 400,
        text: () => Promise.resolve('Bad Request'),
      });

      await expect(translateText(mockText, mockApiKey, mockTargetLanguage))
        .rejects.toThrow('Doubao API error: 400');
    });

    it('should handle network errors', async () => {
      (global.fetch as jest.Mock).mockRejectedValueOnce(new Error('Network error'));

      await expect(translateText(mockText, mockApiKey, mockTargetLanguage))
        .rejects.toThrow('Network error');
    });

    it('should normalize zh-CN to zh', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          choices: [{
            message: {
              content: '你好世界'
            }
          }]
        }),
      });

      await translateText(mockText, mockApiKey, 'zh-CN');
      
      expect(global.fetch).toHaveBeenCalledWith(
        'https://ark.cn-beijing.volces.com/api/v3/responses',
        expect.objectContaining({
          body: expect.stringContaining('"target_language":"zh"')
        })
      );
    });
  });
});