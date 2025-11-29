/**
 * 拆分长文本为适合翻译的块
 * 保留Markdown格式
 * @param text 要拆分的长文本
 * @param maxChunkSize 每个块的最大字符数（默认800）
 * @returns 拆分后的文本块数组
 */
export function splitTextIntoChunks(text: string, maxChunkSize: number = 800): string[] {
  if (text.length <= maxChunkSize) {
    return [text];
  }

  // 定义Markdown分隔符
  const mdDelimiters = [
    /\n#{1,6} /, // 标题
    /\n```[\s\S]*?\n```/, // 代码块
    /\n!\[.*?\]\(.*?\)/, // 图片
    /\n\[(.*?)\]\(.*?\)/, // 链接
    /\n---/, // 分隔线
    /\n\*\*/, // 粗体
    /\n\*/, // 斜体/列表
    /\n- /, // 无序列表
    /\n[0-9]+\. /, // 有序列表
    /\n\n/, // 段落分隔
    /\n/, // 换行
    / /, // 空格
    /$/, // 字符串结束
  ];

  const chunks: string[] = [];
  let currentChunk = "";

  // 首先尝试按Markdown结构拆分
  for (const delimiter of mdDelimiters) {
    const parts = text.split(new RegExp(delimiter, "g"));
    
    if (parts.length > 1) {
      // 检查拆分后的部分是否合适
      const suitableParts = parts.filter(part => part.length <= maxChunkSize);
      
      if (suitableParts.length > 1) {
        // 合并小的块，直到接近maxChunkSize
        let merged = "";
        for (const part of suitableParts) {
          if (merged.length + part.length <= maxChunkSize) {
            merged += part;
          } else {
            chunks.push(merged);
            merged = part;
          }
        }
        
        if (merged) {
          chunks.push(merged);
        }
        
        return chunks;
      }
    }
  }

  // 如果没有合适的Markdown拆分点，按字符数拆分
  let start = 0;
  while (start < text.length) {
    const end = start + maxChunkSize;
    chunks.push(text.slice(start, end));
    start = end;
  }

  return chunks;
}

/**
 * 合并翻译后的文本块
 * @param chunks 翻译后的文本块数组
 * @returns 合并后的完整文本
 */
export function mergeTranslatedChunks(chunks: string[]): string {
  return chunks.join("");
}

/**
 * 统计文本的Token数（估算）
 * @param text 文本
 * @returns 估算的Token数
 */
export function estimateTokenCount(text: string): number {
  // 大致估算：1个Token ~ 4个字符（英文）或2个字符（中文）
  // 这里使用保守的估算：1个Token ~ 3个字符
  return Math.ceil(text.length / 3);
}