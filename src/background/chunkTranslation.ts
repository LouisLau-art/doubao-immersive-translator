// src/background/chunkTranslation.ts
import { v4 as uuidv4 } from 'uuid';
import { translateText as singleTranslate } from './doubaoService';
import { splitTextIntoChunks, mergeTranslatedChunks } from '../utils/chunkUtils';

/**
 * Process chunks with maximum concurrency to avoid API rate limits
 */
async function processChunksWithConcurrency(
  chunks: string[],
  maxConcurrency: number,
  processor: (chunk: string, apiKey: string, targetLanguage: string) => Promise<string>,
  apiKey: string,
  targetLanguage: string
): Promise<string[]> {
  const results: string[] = [];
  const executing: Promise<any>[] = [];

  for (const chunk of chunks) {
    const p = processor(chunk, apiKey, targetLanguage).then(result => {
      results.push(result);
      executing.splice(executing.indexOf(p), 1);
    });

    executing.push(p);

    // Wait for any running promise to complete if we've reached max concurrency
    if (executing.length >= maxConcurrency) {
      await Promise.race(executing);
    }
  }

  // Wait for all remaining promises to complete
  await Promise.all(executing);
  return results;
}

/**
 * 分块翻译长文本
 * @param text 要翻译的长文本
 * @param apiKey API密钥
 * @param targetLanguage 目标语言
 * @returns 完整的翻译结果
 */
/**
 * 分块翻译长文本
 * @param text 要翻译的长文本
 * @param apiKey API密钥
 * @param targetLanguage 目标语言
 * @param maxConcurrency 最大并发数（默认：15）
 * @returns 完整的翻译结果
 */
export async function translateLongText(
  text: string,
  apiKey: string,
  targetLanguage: string = 'zh',
  maxConcurrency: number = 15
): Promise<string> {
  if (!text || !text.trim()) {
    return '';
  }

  // 拆分文本为块
  const chunks = splitTextIntoChunks(text);
  
  // 翻译所有块，限制并发数
  const translatedChunks = await processChunksWithConcurrency(chunks, maxConcurrency, singleTranslate, apiKey, targetLanguage);

  // 合并翻译结果
  return mergeTranslatedChunks(translatedChunks);
}

/**
 * 分块翻译长文本（带有进度跟踪）
 * @param text 要翻译的长文本
 * @param apiKey API密钥
 * @param targetLanguage 目标语言
 * @param onProgress 进度回调函数
 * @returns 完整的翻译结果
 */
export async function translateLongTextWithProgress(
  text: string,
  apiKey: string,
  targetLanguage: string = 'zh',
  onProgress?: (progress: number, chunkIndex: number, totalChunks: number) => void,
  maxConcurrency: number = 15
): Promise<string> {
  if (!text || !text.trim()) {
    return '';
  }

  // 拆分文本为块
  const chunks = splitTextIntoChunks(text);
  const totalChunks = chunks.length;
  const translatedChunks: string[] = [];

  // 逐块翻译
  for (let i = 0; i < totalChunks; i++) {
    try {
      const translation = await singleTranslate(chunks[i], apiKey, targetLanguage);
      translatedChunks[i] = translation;
      
      // 通知进度
      if (onProgress) {
        const progress = Math.round(((i + 1) / totalChunks) * 100);
        onProgress(progress, i + 1, totalChunks);
      }
    } catch (error) {
      // 翻译失败时保留原文
      translatedChunks[i] = chunks[i];
      console.error(`Translation failed for chunk ${i + 1}:`, error);
    }
  }

  // 合并翻译结果
  return mergeTranslatedChunks(translatedChunks);
}