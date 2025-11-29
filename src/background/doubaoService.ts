// src/background/doubaoService.ts
import { v4 as uuidv4 } from 'uuid';
import { captureError } from '../utils/sentry';
import type { DoubaoApiResponse } from '../types';

const DOUBAO_ENDPOINT = 'https://ark.cn-beijing.volces.com/api/v3/responses';
const DEFAULT_MODEL = 'doubao-seed-translation-250915';

/**
 * Sanitizes input text before sending to Doubao API
 * @param text - Input text to sanitize
 * @returns Sanitized text
 * @throws If text becomes empty after sanitization
 */
export function sanitizeText(text: string): string {
  // Remove non-printable control characters (keep newline and tab)
  let sanitized = text.replace(
    // eslint-disable-next-line no-control-regex
    /[\0\x01\x02\x03\x04\x05\x06\x07\x0B\x0C\x0E\x0F\x10\x11\x12\x13\x14\x15\x16\x17\x18\x19\x1A\x1B\x1C\x1D\x1E\x1F]/g,
    '',
  );

  // Check if text is empty after sanitization
  if (!sanitized.trim()) {
    throw new Error('Text is empty after sanitization');
  }

  return sanitized;
}


/**
 * 调用火山引擎豆包翻译模型 (Seed Translation)
 * 严格遵循单轮对话、单 Input Item 的规范
 */
export async function translateText(
  text: string,
  apiKey: string,
  targetLanguage: string = 'zh'
): Promise<string> {
  const requestId = uuidv4();
  // 1. 基础校验
  if (!text || !text.trim()) {
    return '';
  }

  // 2. Sanitize input text
  const sanitizedText = sanitizeText(text);

  // 3. Normalize target language
  const normalizedTargetLanguage = targetLanguage === 'zh-CN' ? 'zh' : targetLanguage;
  
  if (!apiKey) {
    throw new Error('Missing Volcengine API key');
  }

  // 4. 构造请求体
  const payload = {
    model: DEFAULT_MODEL,
    input: [
      {
        role: 'user',
        content: [
          {
            type: 'input_text',
            text: sanitizedText,
            translation_options: {
              target_language: normalizedTargetLanguage,
            },
          },
        ],
      },
    ],
  };

  try {
    const response = await fetch(DOUBAO_ENDPOINT, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    // 5. 处理 HTTP 错误
    if (!response.ok) {
      const errorText = await response.text(); // 获取错误响应文本
      let errorMessage = `HTTP error! status: ${response.status}`; // 创建错误消息
      const requestParams = {
        text: sanitizedText.slice(0, 100) + '...',
        apiKey: '***',
        targetLanguage: normalizedTargetLanguage,
        requestId
      };
      const responseDetails = {
        status: response.status,
        statusText: response.statusText,
        body: errorText.slice(0, 200) + '...'
      };
      console.error('API_ERROR', {
        requestId,
        errorType: 'API_ERROR',
        errorMessage,
        requestParams,
        responseDetails
      });

      // Add status code specific messages
      switch (response.status) {
        case 401:
          errorMessage += ' - Unauthorized (invalid API key)';
          break;
        case 429:
          errorMessage += ' - Rate limit exceeded';
          break;
        case 500:
          errorMessage += ' - Server error';
          break;
      }

      try {
        // 尝试解析详细的 JSON 错误信息
        const errorJson = JSON.parse(errorText) as DoubaoApiResponse;
        if (errorJson.error?.message) {
          errorMessage += ` - ${errorJson.error.message}`;
        }
      } catch {
        errorMessage += ` ${errorText}`;
      }

      captureError(new Error(errorMessage), { requestId }, true, requestId);
      throw new Error(errorMessage);
    }

    const data = await response.json() as DoubaoApiResponse;

    // 6. 解析响应结果 (兼容性处理)
    let translation: string | null = null;

    // 情况 A: 标准 V3 响应 (通常在这里)
    if (data.choices && data.choices.length > 0) {
      translation = data.choices[0].message?.content || '';
      console.log('API_SUCCESS', {
        requestId,
        textLength: sanitizedText.length,
        targetLanguage: normalizedTargetLanguage
      });
      if (translation) {
        // Clean AI hallucinations
        translation = translation.replace(/^(注：|Note:|Warning:).*$/gm, '');
        translation = translation.replace(/\([^)]*(translation|AI)[^)]*\)/gi, '');
        translation = translation.trim();
      }
    }

    // 情况 B: 你的旧代码里的格式 (备用)
    if (!translation && data.output && data.output.length > 0) {
      translation = data.output[0].content?.[0]?.text || '';
      if (translation) {
        // Clean AI hallucinations
        translation = translation.replace(/^(注：|Note:|Warning:).*$/gm, '');
        translation = translation.replace(/\([^)]*(translation|AI)[^)]*\)/gi, '');
        translation = translation.trim();
      }
    }

    if (!translation) {
      console.error('Unexpected API Response:', data);
      throw new Error('Invalid response format: could not extract translation');
    }

    return translation;
  } catch (error) {
    let errorType = 'Unknown error';
    let errorMessage = 'An unknown error occurred';
    
    if (error instanceof Error) {
      if (error instanceof TypeError) {
        errorType = 'Network error';
      } else if (error.message.includes('Invalid response format')) {
        errorType = 'Parsing error';
      } else if (error.message.startsWith('Doubao API error')) {
        errorType = 'API error';
      }
      errorMessage = `${errorType}: ${error.message}`;
    }
    
    console.error('Translation Request Failed:', errorMessage);
    console.error('FAILED PAYLOAD TEXT:', sanitizedText);
    captureError(new Error(errorMessage), { requestId }, true, requestId);
    throw new Error(errorMessage);
  }
}