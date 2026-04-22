// ==UserScript==
// @name         [Telegram] 快捷键跳转 20250824 (new icon)
// @namespace    0_V userscripts/[Telegram] 快捷键跳转
// @version      2.3
// @description  为 Telegram 网页客户端 添加快捷键功能，支持自定义按键和图标，同时适配普通/暗黑模式。全面升级：图标库系统、操作类型系统、图标缓存、优化UI界面。修正了SPA应用内哈希URL跳转问题，确保群组链接正确导航。
// @match        https://web.telegram.org/a/*
// @grant        GM_registerMenuCommand
// @grant        GM_getValue
// @grant        GM_setValue
// @grant        GM_xmlhttpRequest
// @connect      *
// @icon         data:image/svg+xml,%3Csvg%20viewBox%3D%220%200%2064%2064%22%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20xmlns%3Axlink%3D%22http%3A%2F%2Fwww.w3.org%2F1999%2Fxlink%22%20aria-hidden%3D%22true%22%20role%3D%22img%22%20class%3D%22iconify%20iconify--emojione-monotone%22%3E%0A%20%20%3Cdefs%3E%0A%20%20%20%20%3Cfilter%20id%3D%22telegram-shadow%22%20x%3D%22-50%25%22%20y%3D%22-50%25%22%20width%3D%22200%25%22%20height%3D%22200%25%22%3E%0A%20%20%20%20%20%20%3CfeDropShadow%20dx%3D%222%22%20dy%3D%222%22%20stdDeviation%3D%223%22%20flood-color%3D%22%23000000%22%20flood-opacity%3D%220.4%22%2F%3E%0A%20%20%20%20%3C%2Ffilter%3E%0A%20%20%3C%2Fdefs%3E%0A%20%20%3Cg%20id%3D%22SVGRepo_iconCarrier%22%3E%0A%20%20%20%20%3C!--%20Keycap%20background%20changed%20to%20Telegram's%20light%20blue%20--%3E%0A%20%20%20%20%3Cpath%20d%3D%22M52%202H12C6.478%202%202%206.477%202%2011.999V52c0%205.522%204.478%2010%2010%2010h40c5.522%200%2010-4.478%2010-10V11.999C62%206.477%2057.522%202%2052%202zm5%2043.666A8.333%208.333%200%200%201%2048.667%2054H15.333A8.333%208.333%200%200%201%207%2045.666V12.333A8.332%208.332%200%200%201%2015.333%204h33.334A8.332%208.332%200%200%201%2057%2012.333v33.333z%22%20fill%3D%22%2337aee2%22%3E%3C%2Fpath%3E%0A%0A%20%20%20%20%3C!--%20Telegram%20paper%20plane%20scaled%2C%20centered%2C%20and%20with%20shadow%20--%3E%0A%20%20%20%20%3Cg%20transform%3D%22translate(7.168%204.168)%20scale(0.097)%22%20filter%3D%22url(%23telegram-shadow)%22%3E%0A%20%20%20%20%20%20%3Cpath%20fill%3D%22%23c8daea%22%20d%3D%22M199%20404c-11%200-10-4-13-14l-32-105%20245-144%22%3E%3C%2Fpath%3E%0A%20%20%20%20%20%20%3Cpath%20fill%3D%22%23a9c9dd%22%20d%3D%22M199%20404c7%200%2011-4%2016-8l45-43-56-34%22%3E%3C%2Fpath%3E%0A%20%20%20%20%20%20%3Cpath%20fill%3D%22%23f6fbfe%22%20d%3D%22M204%20319l135%2099c14%209%2026%204%2030-14l55-258c5-22-9-32-24-25L79%20245c-21%208-21%2021-4%2026l83%2026%20190-121c9-5%2017-3%2011%204%22%3E%3C%2Fpath%3E%0A%20%20%20%20%3C%2Fg%3E%0A%20%20%3C%2Fg%3E%0A%3C%2Fsvg%3E
// ==/UserScript==

(function() {
    'use strict';

    /**
     * 若用户未设置或图标URL失效,自动回退到此默认图标
     */
    const defaultIconURL = "https://web.telegram.org/a/favicon.ico";

    // === 默认图标库（Telegram + 常见LLM） ===
    const defaultIcons = [
        // Telegram 相关
        { name: "Telegram", url: "https://web.telegram.org/a/favicon.ico" },
        { name: "Telegram Desktop", url: "https://telegram.org/favicon.ico" },
        // 主流 LLM 平台
        { name: "ChatGPT", url: "https://chat.openai.com/favicon.ico" },
        { name: "Claude", url: "https://claude.ai/favicon.ico" },
        { name: "Gemini", url: "https://www.gstatic.com/lamda/images/gemini_sparkle_aurora_33f86dc0c0257da337c63.svg" },
        { name: "Copilot", url: "https://copilot.microsoft.com/favicon.ico" },
        { name: "Poe", url: "https://psc2.cf2.poecdn.net/assets/favicon.svg" },
        { name: "Perplexity", url: "https://www.perplexity.ai/favicon.ico" },
        { name: "Hugging Face", url: "https://huggingface.co/favicon.ico" },
        // 其他常用服务
        { name: "Google", url: "https://www.google.com/favicon.ico" },
        { name: "GitHub", url: "https://github.githubassets.com/favicons/favicon.svg" },
        { name: "Stack Overflow", url: "https://cdn.sstatic.net/Sites/stackoverflow/Img/favicon.ico" },
        { name: "Reddit", url: "https://www.reddit.com/favicon.ico" },
        { name: "Twitter / X", url: "https://abs.twimg.com/favicons/twitter.3.ico" },
    ];

    // === 用于识别核心Telegram图标和管理用户自定义图标的常量 ===
    const TELEGRAM_CORE_ICONS = [
        "https://web.telegram.org/a/favicon.ico",
        "https://telegram.org/favicon.ico"
    ];
    const USER_ICONS_STORAGE_KEY = "telegram_user_icons_v1";

    /*** 图标处理: 缓存与工具函数 ***/
    const ICON_CACHE_PREFIX = "telegram_icon_cache_v1::";
    const GMX = (typeof GM_xmlhttpRequest === 'function')
      ? GM_xmlhttpRequest
      : (typeof GM !== 'undefined' && GM.xmlHttpRequest ? GM.xmlHttpRequest : null);

    function getCachedIconDataURL(url) {
        try { return GM_getValue(ICON_CACHE_PREFIX + url, ""); } catch { return ""; }
    }
    function saveCachedIconDataURL(url, dataURL) {
        try { GM_setValue(ICON_CACHE_PREFIX + url, dataURL); } catch {}
    }
    function mimeFrom(url, headersLower) {
        let m = (headersLower || "").match(/content-type:\s*([^\r\n;]+)/);
        if (m && m[1]) return m[1].trim();
        if (/\.(svg)(\?|#|$)/i.test(url)) return "image/svg+xml";
        if (/\.(jpe?g)(\?|#|$)/i.test(url)) return "image/jpeg";
        if (/\.(png)(\?|#|$)/i.test(url)) return "image/png";
        if (/\.(gif)(\?|#|$)/i.test(url)) return "image/gif";
        if (/\.(ico)(\?|#|$)/i.test(url)) return "image/x-icon";
        return "image/png";
    }
    function arrayBufferToDataURL(buf, mime) {
        const bytes = new Uint8Array(buf);
        let binary = "";
        for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
        const b64 = btoa(binary);
        return `data:${mime};base64,${b64}`;
    }
    function fetchIconAsDataURL(url, cb) {
        if (!GMX) { cb(null); return; }
        GMX({
            method: "GET",
            url,
            responseType: "arraybuffer",
            onload: function(resp) {
                if (resp.status >= 200 && resp.status < 400 && resp.response) {
                    const mime = mimeFrom(url, (resp.responseHeaders || "").toLowerCase());
                    const dataURL = arrayBufferToDataURL(resp.response, mime);
                    cb(dataURL);
                } else cb(null);
            },
            onerror: function() { cb(null); }
        });
    }

    function isTelegramUrl(url) {
        return url && (url.startsWith('https://web.telegram.org/') || url.startsWith('https://telegram.org/'));
    }

    function setIconImage(imgEl, iconUrl) {
        if (!iconUrl) {
            imgEl.src = defaultIconURL;
            return;
        }
        if (iconUrl.startsWith("data:") || iconUrl.startsWith("blob:")) {
            imgEl.src = iconUrl;
            return;
        }

        if (isTelegramUrl(iconUrl)) {
            imgEl.src = iconUrl;
            imgEl.onerror = () => {
                imgEl.onerror = null;
                imgEl.src = defaultIconURL;
            };
            return;
        }

        const cached = getCachedIconDataURL(iconUrl);
        if (cached) {
            imgEl.src = cached;
            return;
        }

        imgEl.src = iconUrl;

        const onErr = () => {
            imgEl.removeEventListener('error', onErr);
            fetchIconAsDataURL(iconUrl, (dataURL) => {
                if (dataURL) {
                    saveCachedIconDataURL(iconUrl, dataURL);
                    imgEl.src = dataURL;
                } else {
                    imgEl.src = defaultIconURL;
                }
            });
        };
        imgEl.addEventListener('error', onErr, { once: true });
    }

    /*** 轻量防抖 ***/
    function debounce(fn, delay=300) {
        let t = null;
        return function(...args) {
            clearTimeout(t);
            t = setTimeout(() => fn.apply(this, args), delay);
        };
    }

    // ==============================
    // 1. 默认快捷键配置
    // ==============================
    const defaultShortcuts = [
        {
            name: "返回聊天列表",
            actionType: "selector",
            url: "",
            selector: 'button[aria-label="Return to chat list"]',
            simulateKeys: "",
            hotkey: "CTRL+L",
            icon: "https://web.telegram.org/a/favicon.ico",
        },
        {
            name: "返回",
            actionType: "selector",
            url: "",
            selector: 'button[aria-label="Back"]',
            simulateKeys: "",
            hotkey: "CTRL+B",
            icon: "https://web.telegram.org/a/favicon.ico",
        },
        {
            name: "搜索聊天",
            actionType: "selector",
            url: "",
            selector: 'button[aria-label="Search this chat"]',
            simulateKeys: "",
            hotkey: "CTRL+F",
            icon: "https://web.telegram.org/a/favicon.ico",
        },
        {
            name: "到底部",
            actionType: "selector",
            url: "",
            selector: 'button[aria-label="Go to bottom"]',
            simulateKeys: "",
            hotkey: "CTRL+G",
            icon: "https://web.telegram.org/a/favicon.ico",
        },
        {
            name: "搜索关闭",
            actionType: "selector",
            url: "",
            selector: 'button.Button.tiny.translucent.round i.icon.icon-close',
            simulateKeys: "",
            hotkey: "CTRL+X",
            icon: "https://web.telegram.org/a/favicon.ico",
        },
        {
            name: "菜单按钮",
            actionType: "selector",
            url: "",
            selector: 'button[aria-label="Open menu"]',
            simulateKeys: "",
            hotkey: "CTRL+M",
            icon: "https://web.telegram.org/a/favicon.ico",
        }
    ];

    // 从本地存储加载快捷键配置
    let shortcuts = GM_getValue("telegram_shortcuts_v2", defaultShortcuts);

    // 确保配置格式正确（向后兼容）
    shortcuts = shortcuts.map(s => ({
        name: s.name || "",
        actionType: s.actionType || (s.url ? 'url' : (s.selector ? 'selector' : (s.simulateKeys ? 'simulate' : 'selector'))),
        url: s.url || "",
        selector: s.selector || "",
        simulateKeys: s.simulateKeys || "",
        hotkey: s.hotkey || "",
        icon: s.icon || "",
    }));

    // ==============================
    // 2. 暗黑模式检测与响应机制
    // ==============================
    let isDarkMode = false;
    let themeChangeListeners = [];

    function detectInitialDarkMode() {
        const htmlEl = document.documentElement;
        const bodyEl = document.body;
        let detectedDarkMode = false;

        if (htmlEl.classList.contains('dark') || bodyEl.classList.contains('dark')) {
            detectedDarkMode = true;
        } else if (htmlEl.getAttribute('data-theme') === 'dark' || bodyEl.getAttribute('data-theme') === 'dark') {
            detectedDarkMode = true;
        } else if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
            if (!htmlEl.classList.contains('light') && !bodyEl.classList.contains('light')) {
                detectedDarkMode = true;
            }
        } else {
            try {
                const bgColor = window.getComputedStyle(bodyEl || htmlEl).backgroundColor;
                if (isColorDark(bgColor)) {
                    detectedDarkMode = true;
                }
            } catch (e) {
                console.warn("[Telegram Shortcut Script] Could not compute background color for dark mode detection.");
            }
        }

        if (isDarkMode !== detectedDarkMode) {
            isDarkMode = detectedDarkMode;
            notifyThemeChangeListeners();
        }
    }

    function isColorDark(colorStr) {
        if (!colorStr || colorStr === 'transparent') return window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
        try {
            let r, g, b, a = 1;
            if (colorStr.startsWith('rgba')) {
                const parts = colorStr.match(/rgba?\s*\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*(?:,\s*([\d.]+))?\s*\)/i);
                if (!parts) return window.matchMedia('(prefers-color-scheme: dark)').matches;
                [, r, g, b, a] = parts.map(Number);
                a = isNaN(a) ? 1 : a;
                if (a < 0.5) return false;
            } else if (colorStr.startsWith('rgb')) {
                const parts = colorStr.match(/rgb\s*\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*\)/i);
                if (!parts) return window.matchMedia('(prefers-color-scheme: dark)').matches;
                [, r, g, b] = parts.map(Number);
            } else if (colorStr.startsWith('#')) {
                let hex = colorStr.substring(1);
                if (hex.length === 3) hex = hex.split('').map(c => c + c).join('');
                if (hex.length === 4) hex = hex.split('').map(c => c + c).join('');
                if (hex.length === 8) a = parseInt(hex.substring(6, 8), 16) / 255;
                if (hex.length !== 6 && hex.length !== 8) return window.matchMedia('(prefers-color-scheme: dark)').matches;
                r = parseInt(hex.substring(0, 2), 16);
                g = parseInt(hex.substring(2, 4), 16);
                b = parseInt(hex.substring(4, 6), 16);
                if (a < 0.5) return false;
            } else {
                return window.matchMedia('(prefers-color-scheme: dark)').matches;
            }
            const luminance = (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
            return luminance < 0.5;
        } catch (e) {
            console.warn("[Telegram Shortcut Script] Error parsing color:", colorStr, e);
            return window.matchMedia('(prefers-color-scheme: dark)').matches;
        }
    }

    function addThemeChangeListener(callback) {
        if (typeof callback === 'function' && !themeChangeListeners.includes(callback)) {
            themeChangeListeners.push(callback);
        }
    }

    function removeThemeChangeListener(callback) {
        themeChangeListeners = themeChangeListeners.filter(listener => listener !== callback);
    }

    function notifyThemeChangeListeners() {
        themeChangeListeners.forEach(callback => {
            try {
                callback(isDarkMode);
            } catch (e) {
                console.error("[Telegram Shortcut Script] Error in theme change listener:", e);
            }
        });
    }

    function setupDarkModeObserver() {
        if (window.matchMedia) {
            const darkModeMediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
            const listener = (e) => {
                detectInitialDarkMode();
            };
            if (darkModeMediaQuery.addEventListener) {
                darkModeMediaQuery.addEventListener('change', listener);
            } else if (darkModeMediaQuery.addListener) {
                darkModeMediaQuery.addListener(listener);
            }
        }

        const observerCallback = (mutations) => {
            let themeMightHaveChanged = false;
            for (const mutation of mutations) {
                if (mutation.type === 'attributes' && (mutation.attributeName === 'class' || mutation.attributeName === 'data-theme')) {
                    themeMightHaveChanged = true;
                    break;
                }
            }
            if (themeMightHaveChanged) {
                detectInitialDarkMode();
            }
        };

        const observer = new MutationObserver(observerCallback);
        observer.observe(document.documentElement, {
            attributes: true,
            attributeFilter: ['class', 'data-theme']
        });
        if (document.body) {
            observer.observe(document.body, {
                attributes: true,
                attributeFilter: ['class', 'data-theme']
            });
        }

        setInterval(() => {
            detectInitialDarkMode();
        }, 5000);

        detectInitialDarkMode();
    }

    if (document.readyState === 'loading') {
        window.addEventListener('DOMContentLoaded', setupDarkModeObserver);
    } else {
        setupDarkModeObserver();
    }

    // ==============================
    // 3. 键盘事件监听与动作执行
    // ==============================
    window.addEventListener("keydown", onKeydown, true);

    function onKeydown(e) {
        const target = e.target;
        const isInput = target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable;
        const isModifierHeavy = e.ctrlKey || e.altKey || e.metaKey;

        if (isInput && !isModifierHeavy) {
            if (!(e.key === 'Escape' && e.shiftKey)) {
                return;
            }
        }

        let keys = [];
        if (e.ctrlKey) keys.push("CTRL");
        if (e.shiftKey) keys.push("SHIFT");
        if (e.altKey) keys.push("ALT");
        if (e.metaKey) keys.push("CMD");

        let mainKey = e.key.toUpperCase();
        if (mainKey === ' ') mainKey = 'SPACE';
        if (mainKey === 'BACKSPACE' || mainKey === 'DELETE') mainKey = e.code.toUpperCase().includes('DELETE') ? 'DELETE' : 'BACKSPACE';
        if (mainKey === 'ESCAPE') mainKey = 'ESC';

        const validMainKeyRegex = /^[A-Z0-9~!@#$%^&*()_+=[\]{}|\\;:'",./<>?]$|^F\d+$|^(SPACE|ESC|BACKSPACE|DELETE)$/;
        if (!validMainKeyRegex.test(mainKey)) {
            if (!["CONTROL", "SHIFT", "ALT", "META", "OS", "CAPSLOCK", "TAB", "ENTER", "PAGEUP", "PAGEDOWN", "HOME", "END", "INSERT", "ARROWUP", "ARROWDOWN", "ARROWLEFT", "ARROWRIGHT"].includes(mainKey)) {}
            return;
        }

        if (["CTRL", "SHIFT", "ALT", "CMD"].includes(mainKey)) return;

        keys.push(mainKey);
        const modKeys = keys.filter(k => k !== mainKey).sort();
        const combined = [...modKeys, mainKey].join("+");

        for (const item of shortcuts) {
            if (!item.hotkey) continue;
            const hotkeyNorm = normalizeHotkey(item.hotkey);
            if (combined === hotkeyNorm) {
                e.preventDefault();
                e.stopPropagation();
                switch (item.actionType) {
                    case 'url':
                        if (item.url) {
                            jumpToUrl(item.url);
                        } else {
                            console.warn(`Shortcut "${item.name}" is type 'url' but has no URL defined.`);
                        }
                        break;
                    case 'selector':
                        if (item.selector) {
                            clickElement(item.selector);
                        } else {
                            console.warn(`Shortcut "${item.name}" is type 'selector' but has no selector defined.`);
                        }
                        break;
                    case 'simulate':
                        if (item.simulateKeys) {
                            simulateKeystroke(item.simulateKeys);
                        } else {
                            console.warn(`Shortcut "${item.name}" is type 'simulate' but has no simulateKeys defined.`);
                        }
                        break;
                    default:
                        // 默认当作selector处理（向后兼容）
                        if (item.selector) {
                            clickElement(item.selector);
                        }
                }
                break;
            }
        }
    }

    function normalizeHotkey(hotkeyStr) {
        if (!hotkeyStr || typeof hotkeyStr !== 'string') return "";
        const h = hotkeyStr.replace(/\s+/g, "").toUpperCase();
        const parts = h.split("+").filter(p => p);
        if (parts.length === 0) return "";
        let mainKey = parts.pop() || "";
        if (parts.length === 0) {
            return mainKey;
        } else {
            const modKs = parts.sort();
            return [...modKs, mainKey].join("+");
        }
    }

    // --- 核心修正：jumpToUrl 函数 ---
    function jumpToUrl(targetUrl) {
        try {
            const currentBaseUrl = window.location.href.split('#')[0];
            const targetBaseUrl = targetUrl.split('#')[0];

            // 检查是否为应用内部的哈希路由导航
            if (currentBaseUrl === targetBaseUrl && targetUrl.includes('#')) {
                // 这是处理SPA哈希路由的关键。
                // 问题：直接设置 location.href 并立即调用 reload() 会产生竞争条件(race condition)。
                // reload() 可能会在浏览器完全处理 href 更改之前执行，导致页面重新加载的是旧的URL。
                //
                // 解决方案：使用 History API。
                // 1. `history.pushState()`: 这个方法可以同步地、权威地更新浏览器的历史记录和地址栏的URL，
                //    但它本身不会触发页面导航或重新加载。这是关键的第一步：先将新的URL状态“固化”。
                // 2. `window.location.reload()`: 在新的URL状态被固化后，我们再执行重新加载。
                //    现在，浏览器将使用 `history.pushState` 刚刚设置的新URL来重新加载页面，
                //    从而迫使Telegram应用以目标群组的状态进行初始化。
                //
                // 这种 "设置状态 -> 重新加载" 的两步法，完美地解决了竞争条件问题。
                history.pushState(null, '', targetUrl);
                window.location.reload();
            } else {
                // 对于外部URL或非哈希导航（例如，跳转到完全不同的网站），标准的URL赋值是正确的。
                window.location.href = targetUrl;
            }
        } catch (e) {
            console.error("[Telegram Shortcut Script] Invalid URL or error in jumpToUrl:", targetUrl, e);
            alert(`无效的跳转网址或发生错误: ${targetUrl}`);
        }
    }

    function clickElement(selector) {
        let element = null;

        if (selector.includes('i.icon')) {
            const iconElement = document.querySelector(selector);
            if (iconElement) {
                element = iconElement.closest('button');
                if (!element) element = iconElement;
            }
        }
        else if (selector.includes(':contains(')) {
            const matches = selector.match(/^(.*):contains\["'](.+?)["']$/);
            if (matches && matches.length === 3) {
                const baseSelector = matches[1];
                const text = matches[2];
                const elements = document.querySelectorAll(baseSelector);
                for (const el of elements) {
                    if (el.textContent.includes(text)) {
                        element = el;
                        if (el.tagName.toLowerCase() === 'span') {
                            const btn = el.closest('button');
                            if (btn) element = btn;
                        }
                        break;
                    }
                }
            }
        } else {
            element = document.querySelector(selector);
        }

        if (element) {
            element.focus();
            if (typeof element.scrollIntoView === 'function') {
                element.scrollIntoView({ block: "center", inline: "center", behavior: "instant" });
            }

            const eventsBeforeDelay = [
                { type: 'pointerover', options: { bubbles: true, cancelable: true, pointerType: 'mouse' } },
                { type: 'pointerenter', options: { bubbles: true, cancelable: true, pointerType: 'mouse' } },
                { type: 'mouseover', options: { bubbles: true, cancelable: true } },
                { type: 'mousedown', options: { bubbles: true, cancelable: true, pointerType: 'mouse' } }
            ];
            for (const ev of eventsBeforeDelay) {
                let evt;
                if (ev.type.indexOf('pointer') === 0) {
                    evt = new PointerEvent(ev.type, ev.options);
                } else {
                    evt = new MouseEvent(ev.type, ev.options);
                }
                element.dispatchEvent(evt);
            }

            setTimeout(() => {
                const pointerUp = new PointerEvent('pointerup', { bubbles: true, cancelable: true, pointerType: 'mouse' });
                const mouseUp = new MouseEvent('mouseup', { bubbles: true, cancelable: true });
                element.dispatchEvent(pointerUp);
                element.dispatchEvent(mouseUp);
                const clickEvt = new MouseEvent('click', { bubbles: true, cancelable: true, detail: 1 });
                element.dispatchEvent(clickEvt);
            }, 50);
        } else {
            console.warn(`未能找到目标元素: ${selector}`);
        }
    }

    function simulateKeystroke(keyString) {
        if (!keyString) return;

        const parts = keyString.toUpperCase().split('+');
        const mainKeyStr = parts.pop();
        const modifiers = parts;

        if (!mainKeyStr) {
            console.warn("[Telegram Shortcut Script] Invalid simulateKeys string (missing main key):", keyString);
            return;
        }

        const keyMap = {
            'A': { key: 'a', code: 'KeyA' }, 'B': { key: 'b', code: 'KeyB' }, 'C': { key: 'c', code: 'KeyC' },
            'D': { key: 'd', code: 'KeyD' }, 'E': { key: 'e', code: 'KeyE' }, 'F': { key: 'f', code: 'KeyF' },
            'G': { key: 'g', code: 'KeyG' }, 'H': { key: 'h', code: 'KeyH' }, 'I': { key: 'i', code: 'KeyI' },
            'J': { key: 'j', code: 'KeyJ' }, 'K': { key: 'k', code: 'KeyK' }, 'L': { key: 'l', code: 'KeyL' },
            'M': { key: 'm', code: 'KeyM' }, 'N': { key: 'n', code: 'KeyN' }, 'O': { key: 'o', code: 'KeyO' },
            'P': { key: 'p', code: 'KeyP' }, 'Q': { key: 'q', code: 'KeyQ' }, 'R': { key: 'r', code: 'KeyR' },
            'S': { key: 's', code: 'KeyS' }, 'T': { key: 't', code: 'KeyT' }, 'U': { key: 'u', code: 'KeyU' },
            'V': { key: 'v', code: 'KeyV' }, 'W': { key: 'w', code: 'KeyW' }, 'X': { key: 'x', code: 'KeyX' },
            'Y': { key: 'y', code: 'KeyY' }, 'Z': { key: 'z', code: 'KeyZ' },
            '0': { key: '0', code: 'Digit0' }, '1': { key: '1', code: 'Digit1' }, '2': { key: '2', code: 'Digit2' },
            '3': { key: '3', code: 'Digit3' }, '4': { key: '4', code: 'Digit4' }, '5': { key: '5', code: 'Digit5' },
            '6': { key: '6', code: 'Digit6' }, '7': { key: '7', code: 'Digit7' }, '8': { key: '8', code: 'Digit8' },
            '9': { key: '9', code: 'Digit9' },
            'ENTER': { key: 'Enter', code: 'Enter' }, 'ESCAPE': { key: 'Escape', code: 'Escape' },
            'ESC': { key: 'Escape', code: 'Escape' }, 'SPACE': { key: ' ', code: 'Space' },
            'BACKSPACE': { key: 'Backspace', code: 'Backspace' }, 'DELETE': { key: 'Delete', code: 'Delete' },
            'TAB': { key: 'Tab', code: 'Tab' },
            ';': { key: ';', code: 'Semicolon' }, '=': { key: '=', code: 'Equal' },
            ',': { key: ',', code: 'Comma' }, '-': { key: '-', code: 'Minus' },
            '.': { key: '.', code: 'Period' }, '/': { key: '/', code: 'Slash' },
            '`': { key: '`', code: 'Backquote' }, '[': { key: '[', code: 'BracketLeft' },
            '\\': { key: '\\', code: 'Backslash' }, ']': { key: ']', code: 'BracketRight' },
            '\'': { key: '\'', code: 'Quote' },
            'F1': { key: 'F1', code: 'F1' }, 'F2': { key: 'F2', code: 'F2' }, 'F12': { key: 'F12', code: 'F12' }
        };

        const keyProps = keyMap[mainKeyStr];
        if (!keyProps) {
            console.warn("[Telegram Shortcut Script] Unknown main key for simulation:", mainKeyStr, "in", keyString);
            return;
        }

        const eventInit = {
            key: keyProps.key,
            code: keyProps.code,
            bubbles: true,
            cancelable: true,
            ctrlKey: modifiers.includes("CTRL"),
            shiftKey: modifiers.includes("SHIFT"),
            altKey: modifiers.includes("ALT"),
            metaKey: modifiers.includes("META"),
        };

        const targetElement = document.activeElement || document.body;

        try {
            const kdEvent = new KeyboardEvent('keydown', eventInit);
            targetElement.dispatchEvent(kdEvent);
            setTimeout(() => {
                const kuEvent = new KeyboardEvent('keyup', eventInit);
                targetElement.dispatchEvent(kuEvent);
            }, 10);
        } catch (e) {
            console.error("[Telegram Shortcut Script] Error dispatching simulated keyboard event:", e);
        }
    }

    // 注册设置面板入口（通过 GM 菜单进入）
    GM_registerMenuCommand("Telegram - 设置快捷键", openSettingsPanel);

    // ==============================
    // 4. 设置面板（全面升级版本）
    // ==============================
    let currentPanelOverlay = null;
    let originalBodyOverflow = '';

    function openSettingsPanel() {
        if (currentPanelOverlay) { currentPanelOverlay.remove(); currentPanelOverlay = null; }

        originalBodyOverflow = document.body.style.overflow || '';
        document.body.style.overflow = 'hidden';

        const overlay = document.createElement("div");
        overlay.id = "telegram-settings-overlay";
        Object.assign(overlay.style, {
            position: "fixed", top: 0, left: 0, width: "100vw", height: "100vh",
            zIndex: "99998", display: "flex", justifyContent: "center", alignItems: "center"
        });
        overlay.onclick = (e) => { if (e.target === overlay) closePanel(); };
        overlay.addEventListener('wheel', (e) => { e.stopPropagation(); }, { passive: false });
        overlay.addEventListener('touchmove', (e) => { e.stopPropagation(); }, { passive: false });

        const panel = document.createElement("div");
        panel.id = "telegram-settings-panel";
        Object.assign(panel.style, {
            borderRadius: "8px", boxShadow: "0 4px 12px rgba(0,0,0,0.2)", padding: "20px",
            minWidth: "650px", fontFamily: "sans-serif", position: "relative",
            opacity: "0", transform: "translateY(20px)", transition: "opacity 0.3s ease, transform 0.3s ease",
            maxHeight: "90vh", overflowY: "auto"
        });
        panel.onclick = (e) => e.stopPropagation();
        panel.addEventListener('wheel', (e) => { e.stopPropagation(); }, { passive: false });
        panel.addEventListener('touchmove', (e) => { e.stopPropagation(); }, { passive: false });

        const title = document.createElement("h2");
        title.textContent = "Telegram - 自定义快捷键";
        Object.assign(title.style, { marginTop: "0", marginBottom: "15px", fontSize: "1.1em" });
        panel.appendChild(title);

        const listContainer = document.createElement("div");
        Object.assign(listContainer.style, {
            maxHeight: "calc(80vh - 150px)", overflowY: "auto", marginBottom: "15px"
        });
        listContainer.addEventListener('wheel', (e) => { e.stopPropagation(); }, { passive: false });
        panel.appendChild(listContainer);

        const bottomBar = document.createElement("div");
        Object.assign(bottomBar.style, {
            display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "10px"
        });

        const addBtn = document.createElement("button");
        addBtn.textContent = "添加新快捷键";
        addBtn.onclick = () => { editShortcut(); };
        bottomBar.appendChild(addBtn);

        const saveBtn = document.createElement("button");
        saveBtn.textContent = "保存并关闭";
        saveBtn.onclick = () => {
            GM_setValue("telegram_shortcuts_v2", shortcuts);
            closePanel();
        };
        bottomBar.appendChild(saveBtn);

        panel.appendChild(bottomBar);
        overlay.appendChild(panel);
        document.body.appendChild(overlay);
        currentPanelOverlay = overlay;

        const updatePanelTheme = (isDark) => {
            overlay.style.backgroundColor = getOverlayBackgroundColor(isDark);
            panel.style.background = getPanelBackgroundColor(isDark);
            panel.style.color = getTextColor(isDark);
            title.style.borderBottom = `1px solid ${getBorderColor(isDark)}`;
            title.style.paddingBottom = "10px";
            styleButton(addBtn, "#FF9800", "#F57C00");
            styleButton(saveBtn, "#4CAF50", "#45A049");
            renderShortcutsList(isDark);
        };

        addThemeChangeListener(updatePanelTheme);
        updatePanelTheme(isDarkMode);

        requestAnimationFrame(() => {
            panel.style.opacity = "1";
            panel.style.transform = "translateY(0)";
        });

        function renderShortcutsList(isDark = isDarkMode) {
            listContainer.innerHTML = "";
            const table = document.createElement("table");
            table.style.width = "100%";
            table.style.borderCollapse = "collapse";

            const thead = document.createElement("thead");
            const headRow = document.createElement("tr");

            const headers = [
                { text: "图标", width: "60px", align: "center" },
                { text: "名称", width: "15%" },
                { text: "类型", width: "80px" },
                { text: "目标", width: "40%" },
                { text: "快捷键", width: "15%" },
                { text: "操作", width: "120px", align: "center" }
            ];

            headers.forEach(header => {
                const th = document.createElement("th");
                th.innerText = header.text;
                styleTableHeader(th, isDark);
                if (header.width) th.style.width = header.width;
                if (header.align) th.style.textAlign = header.align;
                th.style.whiteSpace = "nowrap";
                th.style.overflow = "hidden";
                th.style.textOverflow = "ellipsis";
                headRow.appendChild(th);
            });

            thead.appendChild(headRow);
            table.appendChild(thead);

            const tbody = document.createElement("tbody");
            tbody.id = "telegram-shortcut-tbody";

            shortcuts.forEach((item, index) => {
                const row = document.createElement("tr");
                row.setAttribute("draggable", "true");
                row.style.cursor = "move";
                row.dataset.index = index;

                // 拖拽事件
                row.addEventListener("dragstart", e => {
                    e.dataTransfer.effectAllowed = "move";
                    e.dataTransfer.setData("text/plain", index.toString());
                    row.classList.add("dragging");
                    tbody.classList.add("is-dragging");
                });
                row.addEventListener("dragover", e => {
                    e.preventDefault();
                    e.dataTransfer.dropEffect = "move";
                    const draggingRow = tbody.querySelector(".dragging");
                    if (!draggingRow || draggingRow === row) return;
                    const rect = row.getBoundingClientRect(), midY = rect.top + rect.height / 2;
                    tbody.querySelectorAll("tr").forEach(r => r.classList.remove("dragover-top", "dragover-bottom"));
                    row.classList.add(e.clientY < midY ? "dragover-top" : "dragover-bottom");
                });
                row.addEventListener("dragleave", e => {
                    row.classList.remove("dragover-top", "dragover-bottom");
                });
                row.addEventListener("drop", e => {
                    e.preventDefault();
                    e.stopPropagation();
                    tbody.querySelectorAll("tr").forEach(r => r.classList.remove("dragover-top", "dragover-bottom"));
                    const fromIndexStr = e.dataTransfer.getData("text/plain");
                    if (fromIndexStr === null) return;
                    const fromIndex = parseInt(fromIndexStr, 10);
                    const toIndex = index;
                    if (isNaN(fromIndex) || fromIndex === toIndex) return;
                    try {
                        const movedItem = shortcuts.splice(fromIndex, 1)[0];
                        shortcuts.splice(toIndex, 0, movedItem);
                        renderShortcutsList(isDarkMode);
                    } catch (err) {
                        console.error("Drag-and-drop error:", err);
                        alert("拖拽排序时出错: " + err);
                    }
                });
                row.addEventListener("dragend", e => {
                    tbody.classList.remove("is-dragging");
                    tbody.querySelectorAll("tr").forEach(r => r.classList.remove("dragging", "dragover-top", "dragover-bottom"));
                });

                // 图标列
                const tdIcon = document.createElement("td");
                styleTableCell(tdIcon, isDark);
                tdIcon.style.textAlign = "center";
                const iconImg = document.createElement("img");
                Object.assign(iconImg.style, {
                    width: "24px", height: "24px", objectFit: "contain", verticalAlign: "middle"
                });
                setIconImage(iconImg, item.icon);
                tdIcon.appendChild(iconImg);

                // 名称列
                const tdName = document.createElement("td");
                tdName.textContent = item.name;
                styleTableCell(tdName, isDark);

                // 类型列
                const tdType = document.createElement("td");
                let typeText = "未知";
                switch(item.actionType) {
                    case 'url': typeText = "URL跳转"; break;
                    case 'selector': typeText = "元素点击"; break;
                    case 'simulate': typeText = "按键模拟"; break;
                }
                tdType.textContent = typeText;
                Object.assign(tdType.style, { fontSize: "0.9em", opacity: "0.8" });
                styleTableCell(tdType, isDark);

                // 目标列
                const tdTarget = document.createElement("td");
                const targetText = item.url || item.selector || item.simulateKeys || "-";
                tdTarget.textContent = targetText;
                tdTarget.title = targetText;
                Object.assign(tdTarget.style, {
                    wordBreak: "break-all", maxWidth: "300px", overflow: "hidden",
                    textOverflow: "ellipsis", whiteSpace: "nowrap"
                });
                styleTableCell(tdTarget, isDark);

                // 快捷键列
                const tdHotkey = document.createElement("td");
                tdHotkey.textContent = item.hotkey || "";
                styleTableCell(tdHotkey, isDark);

                // 操作列
                const tdAction = document.createElement("td");
                styleTableCell(tdAction, isDark);
                tdAction.style.textAlign = "center";

                const buttonContainer = document.createElement("div");
                Object.assign(buttonContainer.style, {
                    display: "flex", justifyContent: "center", alignItems: "center",
                    gap: "8px", flexWrap: "nowrap"
                });

                const editButton = document.createElement("button");
                editButton.textContent = "✍️";
                editButton.title = "编辑";
                styleTransparentButton(editButton, "#FF9800", getHoverColor(isDark), isDark);
                editButton.onclick = () => { editShortcut(item, index); };
                buttonContainer.appendChild(editButton);

                const delButton = document.createElement("button");
                delButton.textContent = "🗑️";
                delButton.title = "删除";
                styleTransparentButton(delButton, "#F44336", getHoverColor(isDark), isDark);
                delButton.onclick = () => {
                    if (confirm(`确定删除快捷键【${item.name}】吗?`)) {
                        shortcuts.splice(index, 1);
                        renderShortcutsList(isDarkMode);
                    }
                };
                buttonContainer.appendChild(delButton);

                tdAction.appendChild(buttonContainer);

                row.appendChild(tdIcon);
                row.appendChild(tdName);
                row.appendChild(tdType);
                row.appendChild(tdTarget);
                row.appendChild(tdHotkey);
                row.appendChild(tdAction);

                tbody.appendChild(row);
            });

            table.appendChild(tbody);
            listContainer.appendChild(table);
        }

        function closePanel() {
            document.body.style.overflow = originalBodyOverflow;
            removeThemeChangeListener(updatePanelTheme);
            panel.style.opacity = "0";
            panel.style.transform = "translateY(20px)";
            setTimeout(() => {
                if (overlay) overlay.remove();
                currentPanelOverlay = null;
            }, 300);
        }

        function editShortcut(item = null, index = -1) {
            const isNew = !item;
            let temp = item ? { ...item } : {
                name: "", actionType: "selector", url: "", selector: "", simulateKeys: "",
                hotkey: "", icon: ""
            };

            if (item && !item.actionType) {
                temp.actionType = item.url ? 'url' : (item.selector ? 'selector' : (item.simulateKeys ? 'simulate' : 'selector'));
            }

            const editOverlay = document.createElement("div");
            editOverlay.id = "telegram-edit-overlay";
            Object.assign(editOverlay.style, {
                position: "fixed", top: 0, left: 0, width: "100vw", height: "100vh",
                backgroundColor: "rgba(0, 0, 0, 0.3)", zIndex: "99999",
                display: "flex", justifyContent: "center", alignItems: "center"
            });
            editOverlay.addEventListener('wheel', (e) => { e.stopPropagation(); }, { passive: false });
            editOverlay.addEventListener('touchmove', (e) => { e.stopPropagation(); }, { passive: false });

            const formDiv = document.createElement("div");
            formDiv.id = "telegram-edit-form";
            Object.assign(formDiv.style, {
                borderRadius: "8px", boxShadow: "0 4px 12px rgba(0,0,0,0.2)", padding: "20px",
                minWidth: "450px", fontFamily: "sans-serif", position: "relative",
                opacity: "0", transform: "translateY(20px)", transition: "opacity 0.3s ease, transform 0.3s ease",
                maxHeight: "90vh", overflowY: "auto"
            });
            formDiv.onclick = (e) => e.stopPropagation();
            formDiv.addEventListener('wheel', (e) => { e.stopPropagation(); }, { passive: false });
            formDiv.addEventListener('touchmove', (e) => { e.stopPropagation(); }, { passive: false });

            const h3 = document.createElement("h3");
            h3.textContent = isNew ? "添加快捷键" : "编辑快捷键";
            Object.assign(h3.style, { marginTop: "0", marginBottom: "15px", fontSize: "1.1em" });
            formDiv.appendChild(h3);

            // 名称输入
            const nameInput = createInputField("名称:", temp.name, "text");
            formDiv.appendChild(nameInput.label);

            // 操作类型选择
            const actionTypeDiv = document.createElement("div");
            actionTypeDiv.style.margin = "15px 0";
            const actionTypeLabel = document.createElement("div");
            actionTypeLabel.textContent = "操作类型:";
            Object.assign(actionTypeLabel.style, { fontWeight: "bold", fontSize: "0.9em", marginBottom: "8px" });
            actionTypeDiv.appendChild(actionTypeLabel);

            const actionTypes = [
                { value: 'selector', text: '元素点击' },
                { value: 'url', text: 'URL 跳转' },
                { value: 'simulate', text: '按键模拟' }
            ];
            const radioGroup = document.createElement("div");
            Object.assign(radioGroup.style, { display: 'flex', gap: '15px' });

            const actionInputs = {};

            actionTypes.forEach(at => {
                const radioLabel = document.createElement("label");
                Object.assign(radioLabel.style, { display: 'inline-flex', alignItems: 'center', cursor: 'pointer' });
                const radio = document.createElement("input");
                radio.type = "radio";
                radio.name = "actionType";
                radio.value = at.value;
                radio.checked = temp.actionType === at.value;
                Object.assign(radio.style, { marginRight: "5px", cursor: 'pointer' });
                radio.addEventListener('change', () => {
                    if (radio.checked) {
                        temp.actionType = at.value;
                        selectorContainer.style.display = (at.value === 'selector') ? 'block' : 'none';
                        urlContainer.style.display = (at.value === 'url') ? 'block' : 'none';
                        simulateContainer.style.display = (at.value === 'simulate') ? 'block' : 'none';
                    }
                });
                radioLabel.appendChild(radio);
                radioLabel.appendChild(document.createTextNode(at.text));
                radioGroup.appendChild(radioLabel);
            });

            actionTypeDiv.appendChild(radioGroup);
            formDiv.appendChild(actionTypeDiv);

            // 选择器输入
            const selectorContainer = document.createElement('div');
            const selectorTextarea = createInputField("目标选择器:", temp.selector, "textarea", '例如: button[aria-label="Return to chat list"]');
            selectorContainer.appendChild(selectorTextarea.label);
            formDiv.appendChild(selectorContainer);
            actionInputs.selector = selectorTextarea.input;

            // URL输入
            const urlContainer = document.createElement('div');
            const urlTextarea = createInputField("目标网址:", temp.url, "textarea", "例如: https://web.telegram.org/a/#-100xxxxxxxxxx");
            urlContainer.appendChild(urlTextarea.label);
            formDiv.appendChild(urlContainer);
            actionInputs.url = urlTextarea.input;

            // 模拟按键输入
            const simulateContainer = document.createElement('div');
            const simulateInput = createInputField("模拟按键:", temp.simulateKeys, "text", "例如: Ctrl+Shift+S 或 Escape");
            simulateInput.input.placeholder = "格式: MOD+MOD+KEY (如 Ctrl+Shift+S)";
            simulateContainer.appendChild(simulateInput.label);
            formDiv.appendChild(simulateContainer);
            actionInputs.simulateKeys = simulateInput.input;

            // 图标输入
            const { label: iconLabel, input: iconTextarea, preview: iconPreview } = createIconField("图标URL:", temp.icon);
            formDiv.appendChild(iconLabel);

            setIconImage(iconPreview, temp.icon || "");
            const debouncedPreview = debounce(() => {
                const val = iconTextarea.value.trim();
                setIconImage(iconPreview, val || "");
            }, 300);
            iconTextarea.addEventListener("input", () => {
                autoResizeTextarea(iconTextarea);
                debouncedPreview();
            });

            // 图标库
            const { container: iconLibraryContainer, updateTheme: updateIconLibraryTheme } = createIconLibraryUI(iconTextarea, iconPreview);
            formDiv.appendChild(iconLibraryContainer);

            // 快捷键输入
            const { container: hotkeyContainer, getHotkey } = createHotkeyInput("快捷键:", temp.hotkey);
            formDiv.appendChild(hotkeyContainer);

            // 根据操作类型显示对应输入框
            selectorContainer.style.display = (temp.actionType === 'selector') ? 'block' : 'none';
            urlContainer.style.display = (temp.actionType === 'url') ? 'block' : 'none';
            simulateContainer.style.display = (temp.actionType === 'simulate') ? 'block' : 'none';

            // 按钮行
            const btnRow = document.createElement("div");
            Object.assign(btnRow.style, { marginTop: "20px", textAlign: "right" });

            const confirmBtn = document.createElement("button");
            confirmBtn.textContent = "确定";
            confirmBtn.onclick = () => {
                temp.name = nameInput.input.value.trim();
                temp.url = actionInputs.url.value.trim();
                temp.selector = actionInputs.selector.value.trim();
                temp.simulateKeys = actionInputs.simulateKeys.value.trim().replace(/\s+/g, "");
                temp.icon = iconTextarea.value.trim();
                const finalHotkey = getHotkey();

                if (!temp.name) { alert("请填写名称!"); return; }
                if (temp.actionType === 'url' && !temp.url) { alert("请填写目标网址!"); return; }
                if (temp.actionType === 'selector' && !temp.selector) { alert("请填写目标选择器!"); return; }
                if (temp.actionType === 'simulate' && !temp.simulateKeys) { alert("请填写模拟按键!"); return; }
                if (!finalHotkey) { alert("请设置快捷键!"); return; }
                if (finalHotkey.endsWith('+')) { alert("快捷键设置不完整 (缺少主键)!"); return; }

                const normalizedNewHotkey = normalizeHotkey(finalHotkey);
                if (shortcuts.some((s, i) => normalizeHotkey(s.hotkey) === normalizedNewHotkey && i !== index)) {
                    alert("该快捷键已被其他项使用, 请选择其他组合!");
                    return;
                }

                temp.hotkey = finalHotkey;

                if (temp.actionType !== 'url') temp.url = "";
                if (temp.actionType !== 'selector') temp.selector = "";
                if (temp.actionType !== 'simulate') temp.simulateKeys = "";

                if (isNew) {
                    shortcuts.push(temp);
                } else {
                    shortcuts[index] = temp;
                }

                renderShortcutsList(isDarkMode);
                closeEdit();
            };
            btnRow.appendChild(confirmBtn);

            const cancelBtn = document.createElement("button");
            cancelBtn.textContent = "取消";
            cancelBtn.style.marginLeft = "8px";
            cancelBtn.onclick = closeEdit;
            btnRow.appendChild(cancelBtn);

            formDiv.appendChild(btnRow);
            editOverlay.appendChild(formDiv);
            document.body.appendChild(editOverlay);

            const updateEditPanelTheme = (isDark) => {
                formDiv.style.background = getPanelBackgroundColor(isDark);
                formDiv.style.color = getTextColor(isDark);
                h3.style.borderBottom = `1px solid ${getBorderColor(isDark)}`;
                h3.style.paddingBottom = "10px";

                styleInputField(nameInput.input, isDark);
                styleInputField(actionInputs.url, isDark);
                styleInputField(actionInputs.selector, isDark);
                styleInputField(actionInputs.simulateKeys, isDark);
                styleInputField(iconTextarea, isDark);

                const mainKeyInput = hotkeyContainer.querySelector('input[type="text"]');
                if (mainKeyInput) styleInputField(mainKeyInput, isDark);

                hotkeyContainer.querySelectorAll('input[type="checkbox"]').forEach(cb => cb.style.accentColor = getPrimaryColor());
                actionTypeDiv.querySelectorAll('input[type="radio"]').forEach(rb => rb.style.accentColor = getPrimaryColor());

                styleButton(confirmBtn, "#2196F3", "#1e88e5");
                styleButton(cancelBtn, "#9E9E9E", "#757575");

                updateIconLibraryTheme(isDark);
            };

            addThemeChangeListener(updateEditPanelTheme);
            updateEditPanelTheme(isDarkMode);

            requestAnimationFrame(() => {
                formDiv.style.opacity = "1";
                formDiv.style.transform = "translateY(0)";
                setTimeout(() => {
                    [actionInputs.url, actionInputs.selector, iconTextarea].forEach(ta => {
                        if (ta && ta.tagName === 'TEXTAREA') {
                            autoResizeTextarea(ta);
                        }
                    });
                }, 350);
            });

            function closeEdit() {
                removeThemeChangeListener(updateEditPanelTheme);
                formDiv.style.opacity = "0";
                formDiv.style.transform = "translateY(20px)";
                setTimeout(() => editOverlay.remove(), 300);
            }
        }

        function createInputField(labelText, value, type = "text", placeholder = "") {
            const label = document.createElement("label");
            Object.assign(label.style, {
                display: "block", margin: "12px 0 4px", fontWeight: "bold", fontSize: "0.9em"
            });
            label.appendChild(document.createTextNode(labelText));

            const input = type === "textarea" ? document.createElement("textarea") : document.createElement("input");
            if (type !== "textarea") input.type = type;
            input.value = value;
            input.placeholder = placeholder;
            input.style.display = 'block';

            if (type === "textarea") {
                input.rows = 1;
                Object.assign(input.style, {
                    minHeight: "36px",
                    resize: "vertical",
                    overflowY: "hidden"
                });
                input.addEventListener("input", function() { autoResizeTextarea(this); });
                requestAnimationFrame(() => autoResizeTextarea(input));
            }

            label.appendChild(input);
            return { label, input };
        }

        function createIconField(labelText, value) {
            const label = document.createElement("label");
            Object.assign(label.style, {
                display: "block", margin: "12px 0 4px", fontWeight: "bold", fontSize: "0.9em"
            });
            label.appendChild(document.createTextNode(labelText));

            const wrap = document.createElement("div");
            Object.assign(wrap.style, { display: "flex", alignItems: "flex-start", gap: "8px" });

            const textarea = document.createElement("textarea");
            textarea.value = value || "";
            textarea.placeholder = "在此粘贴URL, 或从下方图库选择";
            textarea.rows = 1;
            Object.assign(textarea.style, {
                minHeight: "36px",
                resize: "vertical",
                overflowY: "hidden",
                flexGrow: "1"
            });

            const preview = document.createElement("img");
            Object.assign(preview.style, {
                width: "36px", height: "36px", objectFit: "contain",
                borderRadius: "4px", flexShrink: "0"
            });

            requestAnimationFrame(() => autoResizeTextarea(textarea));
            wrap.appendChild(textarea);
            wrap.appendChild(preview);
            label.appendChild(wrap);

            const updatePreviewTheme = (isDark) => {
                preview.style.border = `1px solid ${getBorderColor(isDark)}`;
                preview.style.backgroundColor = getInputBackgroundColor(isDark);
            };

            addThemeChangeListener(updatePreviewTheme);
            updatePreviewTheme(isDarkMode);

            return { label, input: textarea, preview };
        }

        function createIconLibraryUI(targetTextarea, targetPreviewImg) {
            let userIcons = GM_getValue(USER_ICONS_STORAGE_KEY, []);
            let isExpanded = false;
            let longPressTimer = null;

            const container = document.createElement("div");
            container.style.marginTop = "10px";

            const title = document.createElement("div");
            title.textContent = "或从图库选择:";
            Object.assign(title.style, { fontWeight: "bold", fontSize: "0.9em", marginBottom: "8px" });
            container.appendChild(title);

            const gridWrapper = document.createElement("div");
            gridWrapper.style.position = "relative";
            container.appendChild(gridWrapper);

            const iconGrid = document.createElement("div");
            Object.assign(iconGrid.style, {
                display: "grid",
                gridTemplateColumns: "repeat(auto-fill, minmax(36px, 1fr))",
                gap: "8px",
                padding: "8px",
                borderRadius: "6px",
                border: "1px solid",
                maxHeight: "170px",
                overflowY: "auto",
                transition: "background-color 0.2s ease, border-color 0.2s ease",
            });
            gridWrapper.appendChild(iconGrid);

            const baseButtonStyle = {
                width: "32px", height: "32px", padding: "0",
                cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: "16px", transition: "background-color 0.2s ease, border-color 0.2s ease",
                position: "absolute", zIndex: "2"
            };

            const expandButton = document.createElement("button");
            expandButton.type = "button";
            expandButton.title = "展开/折叠更多图标";
            Object.assign(expandButton.style, baseButtonStyle, {
                border: "1px solid transparent",
                background: "transparent",
                top: "-16px",
                right: "8px",
                transform: "translateY(-50%)"
            });
            expandButton.addEventListener("click", () => {
                isExpanded = !isExpanded;
                iconGrid.querySelectorAll('.extra-icon').forEach(btn => {
                    btn.style.display = isExpanded ? 'flex' : 'none';
                });
                expandButton.innerHTML = isExpanded ? '▲' : '▼';
            });
            gridWrapper.appendChild(expandButton);

            const addButton = document.createElement("button");
            addButton.type = "button";
            addButton.textContent = "➕";
            addButton.title = "将输入框中的图标URL添加到图库";
            Object.assign(addButton.style, baseButtonStyle, {
                border: "1px solid",
                borderRadius: "4px",
                bottom: "8px",
                right: "8px",
            });
            addButton.addEventListener('click', () => {
                const url = targetTextarea.value.trim();
                if (!url) { alert("请输入图标的URL！"); return; }
                if (userIcons.some(icon => icon.url === url) || defaultIcons.some(icon => icon.url === url)) {
                    alert("该图标已存在于图库中。"); return;
                }
                const name = prompt("请输入图标的名称：", "");
                if (name && name.trim()) {
                    userIcons.push({ name: name.trim(), url: url });
                    GM_setValue(USER_ICONS_STORAGE_KEY, userIcons);
                    renderIconGrid();
                }
            });
            gridWrapper.appendChild(addButton);

            function renderIconGrid() {
                iconGrid.innerHTML = "";
                const allIcons = [...defaultIcons, ...userIcons];

                allIcons.forEach(iconInfo => {
                    const isCore = TELEGRAM_CORE_ICONS.includes(iconInfo.url);
                    const isUserAdded = userIcons.some(ui => ui.url === iconInfo.url);

                    const button = document.createElement("button");
                    button.type = "button";
                    button.title = iconInfo.name + (isUserAdded ? " (长按删除)" : "");
                    Object.assign(button.style, {
                        width: "36px", height: "36px", padding: "4px", border: "1px solid", borderRadius: "4px",
                        cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center",
                        transition: "background-color 0.2s ease, border-color 0.2s ease", position: "relative"
                    });

                    const img = document.createElement("img");
                    Object.assign(img.style, {
                        width: "24px", height: "24px", objectFit: "contain", pointerEvents: "none"
                    });
                    setIconImage(img, iconInfo.url);
                    button.appendChild(img);

                    if (!isCore) {
                        button.classList.add('extra-icon');
                        button.style.display = isExpanded ? 'flex' : 'none';
                    }

                    button.addEventListener("click", () => {
                        targetTextarea.value = iconInfo.url;
                        setIconImage(targetPreviewImg, iconInfo.url);
                        targetTextarea.dispatchEvent(new Event('input', { bubbles: true }));
                    });

                    if (isUserAdded) {
                        button.addEventListener("mousedown", (e) => {
                            if (e.button !== 0) return;
                            longPressTimer = setTimeout(() => {
                                if (confirm(`确定要删除自定义图标 "${iconInfo.name}" 吗?`)) {
                                    userIcons = userIcons.filter(icon => icon.url !== iconInfo.url);
                                    GM_setValue(USER_ICONS_STORAGE_KEY, userIcons);
                                    renderIconGrid();
                                }
                                longPressTimer = null;
                            }, 1000);
                        });
                        const clearLongPress = () => {
                            if (longPressTimer) {
                                clearTimeout(longPressTimer);
                                longPressTimer = null;
                            }
                        };
                        button.addEventListener("mouseup", clearLongPress);
                        button.addEventListener("mouseleave", clearLongPress);
                    }
                    iconGrid.appendChild(button);
                });
                updateTheme(isDarkMode);
            }

            const updateTheme = (isDark) => {
                title.style.color = getTextColor(isDark);
                gridWrapper.style.backgroundColor = getInputBackgroundColor(isDark);
                gridWrapper.style.borderColor = getBorderColor(isDark);
                iconGrid.style.borderColor = 'transparent';

                const gridButtons = Array.from(iconGrid.querySelectorAll('button'));

                addButton.style.backgroundColor = getInputBackgroundColor(isDark);
                addButton.style.borderColor = getBorderColor(isDark);
                addButton.style.color = getTextColor(isDark);
                addButton.onmouseover = () => {
                    addButton.style.backgroundColor = getHoverColor(isDark);
                    addButton.style.borderColor = getPrimaryColor();
                };
                addButton.onmouseout = () => {
                    addButton.style.backgroundColor = getInputBackgroundColor(isDark);
                    addButton.style.borderColor = getBorderColor(isDark);
                };

                expandButton.style.color = getTextColor(isDark);
                expandButton.onmouseover = () => {
                    expandButton.style.backgroundColor = getHoverColor(isDark);
                    expandButton.style.borderColor = getPrimaryColor();
                };
                expandButton.onmouseout = () => {
                    expandButton.style.backgroundColor = 'transparent';
                    expandButton.style.borderColor = 'transparent';
                };
                expandButton.dispatchEvent(new Event('mouseout'));

                gridButtons.forEach(btn => {
                    btn.style.backgroundColor = "transparent";
                    btn.style.borderColor = getBorderColor(isDark);
                    btn.style.color = getTextColor(isDark);
                    btn.onmouseover = () => {
                        btn.style.backgroundColor = getHoverColor(isDark);
                        btn.style.borderColor = getPrimaryColor();
                    };
                    btn.onmouseout = () => {
                        btn.style.backgroundColor = "transparent";
                        btn.style.borderColor = getBorderColor(isDark);
                    };
                });
            };

            renderIconGrid();
            expandButton.innerHTML = isExpanded ? '▲' : '▼';

            return { container, updateTheme };
        }

        function createHotkeyInput(labelText, currentHotkey) {
            const container = document.createElement("div");
            container.style.margin = "12px 0 4px";

            const label = document.createElement("div");
            label.textContent = labelText;
            Object.assign(label.style, { fontWeight: "bold", fontSize: "0.9em", marginBottom: "8px" });
            container.appendChild(label);

            let currentMods = [];
            let currentMainKey = "";
            if (currentHotkey) {
                const parts = normalizeHotkey(currentHotkey).split('+');
                currentMainKey = parts.pop() || "";
                currentMods = parts;
            }

            const modifiers = ["CTRL", "SHIFT", "ALT", "CMD"];
            const checkboxMap = {};

            const modContainer = document.createElement("div");
            Object.assign(modContainer.style, {
                display: "flex", flexWrap: "wrap", gap: "15px", marginBottom: "10px"
            });

            modifiers.forEach(mod => {
                const cbLabel = document.createElement("label");
                Object.assign(cbLabel.style, { display: "inline-flex", alignItems: "center", cursor: "pointer" });
                const cb = document.createElement("input");
                cb.type = "checkbox";
                cb.value = mod;
                cb.checked = currentMods.includes(mod);
                Object.assign(cb.style, { marginRight: "5px", cursor: "pointer" });
                cbLabel.appendChild(cb);
                cbLabel.appendChild(document.createTextNode(mod));
                modContainer.appendChild(cbLabel);
                checkboxMap[mod] = cb;
            });
            container.appendChild(modContainer);

            const mainKeyLabel = document.createElement("label");
            Object.assign(mainKeyLabel.style, { display: "block", fontSize: "0.9em", marginBottom: "4px" });
            mainKeyLabel.appendChild(document.createTextNode("主键 (点此框后按键):"));

            const mainKeyInput = document.createElement("input");
            mainKeyInput.type = "text";
            mainKeyInput.value = currentMainKey;
            mainKeyInput.placeholder = "点此设置";
            mainKeyInput.readOnly = true;
            Object.assign(mainKeyInput.style, {
                width: "120px", marginRight: "10px", display: "inline-block",
                cursor: 'pointer', textAlign: 'center'
            });

            mainKeyInput.addEventListener("focus", () => {
                mainKeyInput.style.backgroundColor = getPrimaryColor() + "30";
            });
            mainKeyInput.addEventListener("blur", () => {
                styleInputField(mainKeyInput, isDarkMode);
            });
            mainKeyInput.addEventListener("keydown", (e) => {
                e.preventDefault();
                e.stopPropagation();
                let key = e.key.toUpperCase();
                let code = e.code.toUpperCase();
                if (key === ' ') key = 'SPACE';
                else if (key === 'ESCAPE') key = 'ESC';
                else if (code === 'BACKSPACE') key = 'BACKSPACE';
                else if (code === 'DELETE') key = 'DELETE';

                if (["CONTROL", "SHIFT", "ALT", "META", "OS"].includes(key)) return;

                const validMainKeyRegex = /^[A-Z0-9~!@#$%^&*()_+=[\]{}|\\;:'",./<>?]$|^F\d+$|^(SPACE|ESC|BACKSPACE|DELETE)$/;
                if (validMainKeyRegex.test(key)) {
                    mainKeyInput.value = key;
                    mainKeyInput.blur();
                }
                else if (key === 'BACKSPACE' || key === 'DELETE') {
                    mainKeyInput.value = "";
                }
            });

            mainKeyLabel.appendChild(mainKeyInput);
            container.appendChild(mainKeyLabel);

            const getHotkey = () => {
                const selectedMods = modifiers.filter(m => checkboxMap[m].checked).sort();
                const mainPart = mainKeyInput.value.trim().toUpperCase();
                if (!mainPart) return "";
                return selectedMods.length > 0 ? [...selectedMods, mainPart].join("+") : mainPart;
            };

            return { container, getHotkey };
        }

        function autoResizeTextarea(textarea) {
            textarea.style.height = "auto";
            const style = window.getComputedStyle(textarea);
            const lineHeight = parseInt(style.lineHeight) || 20;
            const paddingTop = parseInt(style.paddingTop) || 0;
            const paddingBottom = parseInt(style.paddingBottom) || 0;
            const minHeight = lineHeight + paddingTop + paddingBottom;
            const maxHeight = lineHeight * 5 + paddingTop + paddingBottom;
            let newHeight = textarea.scrollHeight;
            if (newHeight < minHeight) {
                newHeight = minHeight;
            } else if (newHeight > maxHeight) {
                newHeight = maxHeight;
                textarea.style.overflowY = "auto";
            } else {
                textarea.style.overflowY = "hidden";
            }
            textarea.style.height = newHeight + "px";
        }
    }

    // =======================
    // 5. 样式 & 颜色 & 工具方法
    // =======================
    function styleTableHeader(th, isDark = isDarkMode) {
        Object.assign(th.style, {
            borderBottom: `2px solid ${getBorderColor(isDark)}`,
            padding: "10px 8px",
            textAlign: th.style.textAlign || "left",
            background: getTableHeaderBackground(isDark),
            fontWeight: "bold",
            position: "sticky",
            top: "-1px",
            zIndex: "1",
            color: getTextColor(isDark)
        });
    }

    function styleTableCell(td, isDark = isDarkMode) {
        Object.assign(td.style, {
            padding: "10px 8px",
            borderBottom: `1px solid ${getBorderColor(isDark)}`,
            verticalAlign: "middle",
            color: getTextColor(isDark),
            fontSize: "14px"
        });
    }

    function styleButton(btn, bgColor, hoverColor, isDark = isDarkMode) {
        Object.assign(btn.style, {
            background: bgColor,
            border: `1px solid ${bgColor}`,
            color: "#fff",
            borderRadius: "6px",
            padding: "8px 16px",
            cursor: "pointer",
            fontSize: "14px",
            fontWeight: "500",
            transition: "background-color 0.2s ease, border-color 0.2s ease"
        });
        btn.onmouseover = () => {
            btn.style.background = hoverColor;
            btn.style.borderColor = hoverColor;
        };
        btn.onmouseout = () => {
            btn.style.background = bgColor;
            btn.style.borderColor = bgColor;
        };
        btn.onfocus = () => (btn.style.boxShadow = `0 0 0 2px ${getPanelBackgroundColor(isDark)}, 0 0 0 4px ${getPrimaryColor()}`);
        btn.onblur = () => (btn.style.boxShadow = 'none');
    }

    function styleTransparentButton(btn, textColor, hoverBg, isDark = isDarkMode) {
        Object.assign(btn.style, {
            background: "transparent",
            color: textColor,
            border: "none",
            borderRadius: "4px",
            padding: "6px 8px",
            cursor: "pointer",
            fontSize: "16px",
            lineHeight: "1",
            transition: "background-color 0.2s ease"
        });
        btn.onmouseover = () => { btn.style.background = hoverBg; };
        btn.onmouseout = () => { btn.style.background = "transparent"; };
    }

    function styleInputField(input, isDark = isDarkMode) {
        Object.assign(input.style, {
            boxSizing: "border-box",
            width: "100%",
            padding: "8px 10px",
            border: `1px solid ${getBorderColor(isDark)}`,
            borderRadius: "6px",
            fontSize: "14px",
            outline: "none",
            background: getInputBackgroundColor(isDark),
            color: getTextColor(isDark),
            transition: "border-color 0.2s ease, box-shadow 0.2s ease, background-color 0.2s ease"
        });
        input.onfocus = () => {
            input.style.borderColor = getPrimaryColor();
            input.style.boxShadow = `0 0 0 1px ${getPrimaryColor()}`;
        };
        input.onblur = () => {
            input.style.borderColor = getBorderColor(isDark);
            input.style.boxShadow = 'none';
        };
    }

    function getOverlayBackgroundColor(isDark = isDarkMode) {
        return isDark ? "rgba(0, 0, 0, 0.7)" : "rgba(0, 0, 0, 0.5)";
    }

    function getPanelBackgroundColor(isDark = isDarkMode) {
        return isDark ? "#1a1a1a" : "#ffffff";
    }

    function getInputBackgroundColor(isDark = isDarkMode) {
        return isDark ? "#2d2d2d" : "#f9f9f9";
    }

    function getTextColor(isDark = isDarkMode) {
        return isDark ? "#ffffff" : "#1a1a1a";
    }

    function getBorderColor(isDark = isDarkMode) {
        return isDark ? "#404040" : "#e0e0e0";
    }

    function getTableHeaderBackground(isDark = isDarkMode) {
        return isDark ? "#2d2d2d" : "#f5f5f5";
    }

    function getHoverColor(isDark = isDarkMode) {
        return isDark ? "rgba(255, 255, 255, 0.1)" : "rgba(0, 0, 0, 0.05)";
    }

    function getPrimaryColor() {
        return "#0066cc";
    }

    // ==============================
    // 6. 注入拖拽相关的CSS
    // ==============================
    injectDragCss();

    function injectDragCss() {
        const styleId = 'telegram-drag-style';
        if (document.getElementById(styleId)) return;

        const styleEl = document.createElement('style');
        styleEl.id = styleId;

        const updateDragStyle = (isDark) => {
            const primaryColor = getPrimaryColor();
            styleEl.textContent = `
                #telegram-shortcut-tbody.is-dragging tr {
                    opacity: 0.5;
                }
                #telegram-shortcut-tbody tr.dragging {
                    opacity: 1 !important;
                    background-color: ${primaryColor}30 !important;
                    box-shadow: 0 2px 8px rgba(0,0,0,0.2);
                }
                #telegram-shortcut-tbody tr.dragover-top {
                    border-top: 2px dashed ${primaryColor};
                }
                #telegram-shortcut-tbody tr.dragover-bottom {
                    border-bottom: 2px dashed ${primaryColor};
                }
            `;
        };

        document.head.appendChild(styleEl);
        addThemeChangeListener(updateDragStyle);
        updateDragStyle(isDarkMode);
    }

})();