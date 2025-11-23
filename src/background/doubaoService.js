const DOUBAO_ENDPOINT = 'https://ark.cn-beijing.volces.com/api/v3/responses';
const DEFAULT_MODEL = 'doubao-seed-translation-250915';

export async function translateText(text, apiKey, targetLanguage = 'zh') {
  if (!apiKey) {
    throw new Error('Missing API key');
  }

  const payload = {
    model: DEFAULT_MODEL,
    input: [
      {
        role: 'user',
        content: [
          {
            type: 'input_text',
            text,
            translation_options: {
              target_language: targetLanguage
            }
          }
        ]
      }
    ]
  };

  const response = await fetch(DOUBAO_ENDPOINT, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(payload)
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Doubao API error: ${response.status} ${errorText}`);
  }

  const data = await response.json();

  const outputItem = data?.output?.[0];
  const translation = outputItem?.content?.[0]?.text;

  if (!translation) {
    throw new Error('Invalid response format from Doubao API');
  }

  return translation;
}
