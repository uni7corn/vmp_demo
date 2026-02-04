// ==UserScript==
// @name         日志导出log
// @namespace    http://tampermonkey.net/
// @version      1.4
// @description  油猴日志导出工具，不输出控制台，直接导出
// @author       buluo
// @match        *://*/*
// @grant        unsafeWindow
// @run-at       document-start
// ==/UserScript==

(function() {
    'use strict';


    let logStorage = [];
    let isUpdatingUI = false;

    const targetWindow = typeof unsafeWindow !== 'undefined' ? unsafeWindow : window;

    function safeStringify(obj) {
        const cache = new Set();
        try {
            return JSON.stringify(obj, (key, value) => {
                if (typeof value === 'object' && value !== null) {
                    if (cache.has(value)) return '[Circular]';
                    cache.add(value);
                }
                return value;
            });
        } catch (e) {
            return "[Object Serialization Failed]";
        }
    }

    // 插桩函数：只存入数组
    targetWindow.logHook = function(...args) {
        try {
            const timestamp = new Date().toLocaleTimeString('zh-CN', { hour12: false, fractionalSecondDigits: 3 });
            const message = args.map(arg => {
                if (typeof arg === 'object' && arg !== null) return safeStringify(arg);
                return String(arg);
            }).join(' ');

            logStorage.push(`[${timestamp}] ${message}`);

            // 仅在有 UI 时触发异步更新
            if (!isUpdatingUI) {
                isUpdatingUI = true;
                requestAnimationFrame(updateUICount);
            }
        } catch (err) {
            // 静默处理异常
        }
        return '';
    };

    function updateUICount() {
        const span = document.getElementById('log-hook-count');
        if (span) span.innerText = `Logs: ${logStorage.length}`;
        isUpdatingUI = false;
    }
    function exportLogs() {
        if (logStorage.length === 0) {
            alert('当前暂无日志');
            return;
        }

        // 使用 Blob 构造函数直接传入数组
        // 每行末尾加换行符
        const blobData = logStorage.flatMap(line => [line, '\n']);
        const blob = new Blob(blobData, { type: 'text/plain;charset=utf-8' });

        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        const timeStr = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);

        a.href = url;
        a.download = `full_debug_log_${timeStr}.log`;
        document.body.appendChild(a);
        a.click();

        // 释放内存映射
        setTimeout(() => {
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
        }, 1000);
    }

    function createUI() {
        if (document.getElementById('log-hook-ui')) return;

        const container = document.createElement('div');
        container.id = 'log-hook-ui';
        container.style.cssText = `
            position: fixed; bottom: 10px; right: 10px; z-index: 2147483647;
            background: #222; border: 1px solid #444; padding: 6px 12px;
            border-radius: 4px; color: #eee; font-family: Consolas, monospace;
            display: flex; gap: 10px; align-items: center; font-size: 12px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.5);
        `;

        const countSpan = document.createElement('span');
        countSpan.id = 'log-hook-count';
        countSpan.innerText = 'Logs: 0';
        countSpan.style.color = '#00ff00';

        const btnStyle = "cursor:pointer; border:none; color:white; padding:4px 8px; border-radius:3px; font-weight:bold;";

        const exportBtn = document.createElement('button');
        exportBtn.innerText = '导出全量日志';
        exportBtn.style.cssText = btnStyle + "background: #007bff;";
        exportBtn.onclick = exportLogs;

        const clearBtn = document.createElement('button');
        clearBtn.innerText = '清空';
        clearBtn.style.cssText = btnStyle + "background: #dc3545;";
        clearBtn.onclick = () => {
            if(confirm('确定要清空已记录的 ' + logStorage.length + ' 条日志吗？')) {
                logStorage = [];
                updateUICount();
            }
        };

        container.appendChild(countSpan);
        container.appendChild(exportBtn);
        container.appendChild(clearBtn);
        document.body.appendChild(container);
    }

    if (document.readyState === 'complete') {
        createUI();
    } else {
        window.addEventListener('load', createUI);
    }
})();