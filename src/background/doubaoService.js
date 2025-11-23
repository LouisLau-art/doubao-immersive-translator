// src/background/doubaoService.js

const DOUBAO_ENDPOINT = 'https://ark.cn-beijing.volces.com/api/v3/responses';
// 这里的模型名称如果你有更新的版本，可以在这里修改
const DEFAULT_MODEL = 'doubao-seed-translation-250915';

/**
 * 调用火山引擎豆包翻译模型 (Seed Translation)
 * 严格遵循单轮对话、单 Input Item 的规范
 */
export async function translateText(text, apiKey, targetLanguage = 'zh') {
  // 1. 基础校验
  if (!text || !text.trim()) {
    return '';
  }
  if (!apiKey) {
    throw new Error('Missing Volcengine API key');
  }

  // 2. 构造请求体
  // 注意：Input 数组里只能有一个对象，且不能包含 role: 'system'
  const payload = {
    model: DEFAULT_MODEL,
    input: [
      {
        role: 'user',
        content: [
          {
            type: 'input_text',
            text: text,
            translation_options: {
              // 必须参数：目标语言
              target_language: targetLanguage,
              // 警告：绝对不要传 source_language: 'auto'，API 会报错。
              // 不传该参数，模型默认就是自动检测。
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
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    // 3. 处理 HTTP 错误
    if (!response.ok) {
      const errorText = await response.text();
      let errorMessage = `Doubao API error: ${response.status}`;
      
      try {
        // 尝试解析详细的 JSON 错误信息
        const errorJson = JSON.parse(errorText);
        if (errorJson.error && errorJson.error.message) {
          errorMessage += ` - ${errorJson.error.message}`;
        }
      } catch (e) {
        errorMessage += ` ${errorText}`;
      }
      
      throw new Error(errorMessage);
    }

    const data = await response.json();

    // 4. 解析响应结果 (兼容性处理)
    let translation = null;

    // 情况 A: 标准 V3 响应 (通常在这里)
    if (data.choices && data.choices.length > 0) {
      translation = data.choices[0].message?.content;
    }
    
    // 情况 B: 你的旧代码里的格式 (备用)
    if (!translation && data.output && data.output.length > 0) {
      translation = data.output[0].content?.[0]?.text;
    }

    if (!translation) {
      console.error('Unexpected API Response:', data);
      throw new Error('Invalid response format: could not extract translation');
    }

    return translation;

  } catch (error) {
    console.error('Translation Request Failed:', error);
    throw error;
  }
}