// src/background/doubaoService.ts
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
  // 1. Truncate text longer than 800 characters (safe for 1k token limit)
  let sanitized = text.length > 800 ? text.substring(0, 800) : text;

  // 2. Remove non-printable control characters (keep newline and tab)
  sanitized = sanitized.replace(
    // eslint-disable-next-line no-control-regex
    /[\0\x01\x02\x03\x04\x05\x06\x07\x0B\x0C\x0E\x0F\x10\x11\x12\x13\x14\x15\x16\x17\x18\x19\x1A\x1B\x1C\x1D\x1E\x1F]/g,
    '',
  );

  // 3. Check if text is empty after sanitization
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
      const errorText = await response.text();
      console.error('FAILED TEXT:', sanitizedText.substring(0, 100) + '...');
      console.error('FAILED PAYLOAD:', JSON.stringify(payload));
      let errorMessage = `Doubao API error: ${response.status}`;

      try {
        // 尝试解析详细的 JSON 错误信息
        const errorJson = JSON.parse(errorText) as DoubaoApiResponse;
        if (errorJson.error?.message) {
          errorMessage += ` - ${errorJson.error.message}`;
        }
      } catch {
        errorMessage += ` ${errorText}`;
      }

      throw new Error(errorMessage);
    }

    const data = await response.json() as DoubaoApiResponse;

    // 6. 解析响应结果 (兼容性处理)
    let translation: string | null = null;

    // 情况 A: 标准 V3 响应 (通常在这里)
    if (data.choices && data.choices.length > 0) {
      translation = data.choices[0].message?.content || '';
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
    console.error('Translation Request Failed:', error);
    console.error('FAILED PAYLOAD TEXT:', sanitizedText);
    throw error;
  }
}