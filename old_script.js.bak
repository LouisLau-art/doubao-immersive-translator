'use strict';

// --- 全局常量 ---
const DEFAULT_OUTPUT_MESSAGE = '翻译结果将显示在这里...';
const HISTORY_STORAGE_KEY = 'arkTranslatorHistory';
const MAX_HISTORY_ITEMS = 5;
const MATH_PLACEHOLDER = '---MATH-PLACEHOLDER---'; // 使用更独特的占位符

document.addEventListener('DOMContentLoaded', () => {
    // --- DOM 元素获取 ---
    const textInput = document.getElementById('textInput');
    const outputText = document.getElementById('outputText');
    const sourceLangSelect = document.getElementById('sourceLang');
    const targetLangSelect = document.getElementById('targetLang');
    const swapBtn = document.getElementById('swapBtn');
    const copyBtn = document.getElementById('copyBtn');
    const copyIcon = document.getElementById('copyIcon');
    const clearBtn = document.getElementById('clearBtn');
    const loading = document.getElementById('loading');
    const statusMessage = document.getElementById('statusMessage');
    const charCount = document.getElementById('charCount');
    const autoTranslate = document.getElementById('autoTranslate');
    const collapseBtn = document.getElementById('collapseBtn');
    const inputSection = document.getElementById('inputSection');
    const outputSection = document.getElementById('outputSection');
    const fontSizeSlider = document.getElementById('fontSizeSlider');
    const fontSizeValue = document.getElementById('fontSizeValue');
    const historyList = document.getElementById('historyList');
    const historyDetails = document.getElementById('historyDetails');

    let isCollapsed = false;
    let copyResetTimer = null;

    // --- 核心功能函数 ---

    /**
     * 防抖函数，防止函数过于频繁地调用
     */
    function debounce(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    }

    /**
     * 触发 MathJax 重新渲染指定区域的数学公式
     */
    function rerenderMath() {
        if (window.MathJax && typeof window.MathJax.typesetPromise === 'function') {
            // 清除之前的渲染缓存，然后重新渲染
            window.MathJax.typesetClear([outputText]);
            window.MathJax.typesetPromise([outputText]).catch(err => {
                console.error('MathJax typeset error:', err);
            });
        }
    }
    window.rerenderMath = rerenderMath; // 全局暴露以便调试


    /**
     * ✨ 最终修复：结合 Marked.js 和 MathJax 的渲染流程
     * @param {string} text - 从API获取的原始Markdown文本
     * @returns {string} - 可以安全插入innerHTML的最终HTML字符串
     */
    function renderMarkdownAndMath(text) {
        if (!text) {
            return '';
        }

        // 1. 提取 (Extract)
        // 创建一个临时数组来存放所有的数学公式
        const mathEquations = [];
        // 定义一个健壮的正则表达式来匹配行内和块级公式
        const mathRegex = /(\$\$[\s\S]*?\$\$|\$[^\$\n]+\$)/g;

        // 使用占位符替换掉所有的数学公式，并将公式存入数组
        const textWithPlaceholders = text.replace(mathRegex, (match) => {
            mathEquations.push(match);
            return MATH_PLACEHOLDER;
        });

        // 2. 渲染 (Render)
        // 使用marked.js将不含数学公式的文本安全地转换为HTML
        let html = '';
        if (window.marked) {
            html = window.marked.parse(textWithPlaceholders);
        } else {
            // 如果marked.js加载失败，则退回纯文本
            html = textWithPlaceholders; 
        }

        // 3. 注入 (Inject)
        // 将HTML中的占位符替换回原始的数学公式
        if (mathEquations.length > 0) {
            html = html.replace(new RegExp(MATH_PLACEHOLDER, 'g'), () => {
                // 从数组中按顺序取回公式
                return mathEquations.shift() || '';
            });
        }

        return html;
    }


    /**
     * 主翻译函数
     */
    async function performTranslation() {
        const text = textInput.value.trim();
        if (!text) {
            outputText.innerHTML = DEFAULT_OUTPUT_MESSAGE;
            statusMessage.textContent = '请输入要翻译的文本';
            rerenderMath();
            return;
        }

        if (!autoTranslate.checked) {
            statusMessage.textContent = '自动翻译已关闭';
            return;
        }

        const sourceLang = sourceLangSelect.value;
        const targetLang = targetLangSelect.value;

        if (sourceLang !== 'auto' && sourceLang === targetLang) {
            outputText.textContent = text;
            statusMessage.textContent = '源语言和目标语言相同';
            rerenderMath();
            return;
        }

        loading.style.display = 'block';
        outputText.textContent = '';
        statusMessage.textContent = '翻译中...';

        try {
            const response = await fetch('/translate', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ text, sourceLang, targetLang })
            });

            const result = await response.json();

            if (response.ok) {
                const translation = result.translation || '';
                
                // ✨ 使用我们全新的、可靠的渲染函数
                const renderedHtml = translation ? renderMarkdownAndMath(translation) : DEFAULT_OUTPUT_MESSAGE;
                
                outputText.innerHTML = renderedHtml;
                rerenderMath(); // 在内容设置完成后，立即调用MathJax

                statusMessage.textContent = `翻译完成 (${text.length} 字符)`;
                if (translation) {
                    saveTranslationHistory(text, translation, sourceLang, targetLang);
                }
            } else {
                const errorMessage = result.error || '翻译失败';
                outputText.textContent = `错误: ${errorMessage}`;
                statusMessage.textContent = '翻译失败';
            }
        } catch (error) {
            outputText.textContent = `网络错误: ${error.message}`;
            statusMessage.textContent = '连接失败';
        } finally {
            loading.style.display = 'none';
        }
    }

    const debouncedTranslate = debounce(performTranslation, 500);

    // --- 事件监听器和UI辅助函数 ---

    function updateCharCount() {
        charCount.textContent = textInput.value.length;
    }

    collapseBtn.addEventListener('click', () => {
        isCollapsed = !isCollapsed;
        inputSection.classList.toggle('collapsed', isCollapsed);
        outputSection.classList.toggle('expanded', isCollapsed);
        collapseBtn.textContent = isCollapsed ? '»' : '«';
        collapseBtn.title = isCollapsed ? '展开输入框' : '折叠输入框';
    });

    textInput.addEventListener('input', () => {
        updateCharCount();
        debouncedTranslate();
    });

    textInput.addEventListener('paste', () => {
        setTimeout(updateCharCount, 10);
        debouncedTranslate();
    });

    sourceLangSelect.addEventListener('change', debouncedTranslate);
    targetLangSelect.addEventListener('change', debouncedTranslate);

    swapBtn.addEventListener('click', () => {
        const sourceValue = sourceLangSelect.value;
        const targetValue = targetLangSelect.value;
        if (sourceValue === 'auto') return;
        sourceLangSelect.value = targetValue;
        targetLangSelect.value = sourceValue;
        if (textInput.value.trim()) debouncedTranslate();
    });

    copyBtn.addEventListener('click', () => {
        const textToCopy = outputText.innerText || outputText.textContent;
        if (!textToCopy || textToCopy === DEFAULT_OUTPUT_MESSAGE || textToCopy.startsWith('错误:')) return;

        navigator.clipboard.writeText(textToCopy).then(() => {
            statusMessage.textContent = '已复制到剪贴板';
            clearTimeout(copyResetTimer);
            copyIcon.textContent = '✔️';
            copyResetTimer = setTimeout(() => {
                copyIcon.textContent = '📋';
                if (statusMessage.textContent === '已复制到剪贴板') statusMessage.textContent = '准备就绪';
            }, 1500);
        }).catch(err => {
            console.warn('复制失败:', err);
            statusMessage.textContent = '复制失败';
        });
    });

    clearBtn.addEventListener('click', () => {
        textInput.value = '';
        updateCharCount();
        outputText.innerHTML = DEFAULT_OUTPUT_MESSAGE;
        rerenderMath();
        statusMessage.textContent = '已清空';
    });

    autoTranslate.addEventListener('change', () => {
        statusMessage.textContent = autoTranslate.checked ? '自动翻译已启用' : '自动翻译已关闭';
        if (autoTranslate.checked && textInput.value.trim()) debouncedTranslate();
    });

    fontSizeSlider.addEventListener('input', () => {
        const size = fontSizeSlider.value;
        fontSizeValue.textContent = `${size}px`;
        document.documentElement.style.setProperty('--editor-font-size', `${size}px`);
    });

    // --- 历史记录功能 ---
    // (这部分代码无需修改，保持原样即可)
    function readHistory() {
        try {
            const raw = localStorage.getItem(HISTORY_STORAGE_KEY);
            return raw ? JSON.parse(raw) : [];
        } catch (e) { return []; }
    }
    function writeHistory(items) {
        localStorage.setItem(HISTORY_STORAGE_KEY, JSON.stringify(items));
    }
    function saveTranslationHistory(originalText, translatedText, sourceLang, targetLang) {
        const history = readHistory();
        const entry = {
            originalText,
            translatedText,
            sourceLang,
            targetLang,
            sourceLangLabel: resolveLanguageLabel(sourceLangSelect, sourceLang),
            targetLangLabel: resolveLanguageLabel(targetLangSelect, targetLang),
            timestamp: new Date().toISOString()
        };
        history.unshift(entry);
        writeHistory(history.slice(0, MAX_HISTORY_ITEMS));
        renderHistory();
    }
    function resolveLanguageLabel(selectElement, value) {
        const option = [...selectElement.options].find(opt => opt.value === value);
        return option ? option.textContent : value;
    }
    function formatTimestamp(timestamp) {
        return new Date(timestamp).toLocaleString();
    }
    function renderHistory() {
        const history = readHistory();
        historyList.innerHTML = '';
        historyList.classList.toggle('empty', history.length === 0);

        if (history.length === 0) {
            historyList.innerHTML = '<p class="history-empty">暂无历史记录</p>';
            return;
        }

        history.forEach((item, index) => {
            const historyItem = document.createElement('article');
            historyItem.className = 'history-item';
            historyItem.innerHTML = `
                <div class="history-item-header">
                    <span class="history-meta">${item.sourceLangLabel} → ${item.targetLangLabel}</span>
                    <time class="history-time" datetime="${item.timestamp}">${formatTimestamp(item.timestamp)}</time>
                </div>
                <div class="history-text-block">
                    <span class="history-text-label">原文</span>
                    <pre class="history-text"></pre>
                </div>
                <div class="history-text-block">
                    <span class="history-text-label">译文</span>
                    <pre class="history-text"></pre>
                </div>
                <div class="history-actions">
                    <button type="button" class="history-reuse" data-index="${index}">再次使用</button>
                </div>
            `;
            // 使用 textContent 来安全地插入文本，防止XSS
            historyItem.querySelectorAll('.history-text')[0].textContent = item.originalText;
            historyItem.querySelectorAll('.history-text')[1].textContent = item.translatedText;
            historyList.appendChild(historyItem);
        });
    }
    historyList.addEventListener('click', (e) => {
        if (e.target.classList.contains('history-reuse')) {
            const history = readHistory();
            const item = history[Number(e.target.dataset.index)];
            if (item) {
                sourceLangSelect.value = item.sourceLang;
                targetLangSelect.value = item.targetLang;
                textInput.value = item.originalText;
                updateCharCount();
                historyDetails.open = false;
                if (autoTranslate.checked) {
                    debouncedTranslate();
                }
            }
        }
    });

    // --- 初始化 ---
    renderHistory();
    updateCharCount();
    document.documentElement.style.setProperty('--editor-font-size', `${fontSizeSlider.value}px`);
});