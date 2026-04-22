// ==UserScript==
// @name         [Poe] 快捷键跳转 20251102 Fixed
// @namespace    0_V userscripts/[Poe] 快捷键跳转
// @version      6.0
// @description  为Poe网站添加高度可配置的快捷键。参考Kagi脚本架构全面优化，支持图标库、拖拽排序、暗黑模式自适应。新增按键模拟功能和增强的快捷键捕获器。完善事件隔离、滚动锁定等用户体验。
// @match        https://poe.com/*
// @grant        GM_registerMenuCommand
// @grant        GM_getValue
// @grant        GM_setValue
// @grant        GM_xmlhttpRequest
// @connect      *
// @run-at       document-end
// ==/UserScript==

(function() {
    'use strict';

    /**
     * 若用户未设置或图标URL失效,自动回退到此默认图标
     */
    const defaultIconURL = "https://psc2.cf2.poecdn.net/assets/favicon.svg";

    // === 面板状态跟踪 ===
    let isSettingsPanelOpen = false;

    // === 滚动穿透防护状态 ===
    let scrollLockState = {
        isLocked: false,
        originalBodyOverflow: '',
        originalBodyPosition: '',
        originalBodyTop: '',
        originalBodyLeft: '',
        originalBodyWidth: '',
        scrollTop: 0,
        scrollLeft: 0
    };

    // === 默认图标库 ===
    const defaultIcons = [
        { name: "Poe", url: "https://psc2.cf2.poecdn.net/assets/favicon.svg" },
        { name: "App-Creator", url: "https://qph.cf2.poecdn.net/main-thumb-pb-5003-50-zdgktfpcizyaajmazqorxwnwlzhiwdmi.jpeg" },
        { name: "Google", url: "https://www.google.com/favicon.ico" },
        { name: "Bing", url: "https://www.bing.com/favicon.ico" },
        { name: "DuckDuckGo", url: "https://duckduckgo.com/favicon.ico" },
        { name: "Wikipedia", url: "https://www.wikipedia.org/static/favicon/wikipedia.ico" },
        { name: "Reddit", url: "https://www.reddit.com/favicon.ico" },
        { name: "Stack Overflow", url: "https://cdn.sstatic.net/Sites/stackoverflow/Img/favicon.ico" },
        { name: "GitHub", url: "https://github.githubassets.com/favicons/favicon.svg" },
        { name: "Twitter / X", url: "https://abs.twimg.com/favicons/twitter.3.ico" },
        { name: "YouTube", url: "https://www.youtube.com/favicon.ico" },
    ];

    // === 核心图标和用户图标管理 ===
    const POE_CORE_ICONS = [
        "https://psc2.cf2.poecdn.net/assets/favicon.svg",
        "https://qph.cf2.poecdn.net/main-thumb-pb-5003-50-zdgktfpcizyaajmazqorxwnwlzhiwdmi.jpeg"
    ];
    const USER_ICONS_STORAGE_KEY = "poe_user_icons_v1";

    /*** 图标处理: 缓存与工具函数 ***/
    const ICON_CACHE_PREFIX = "poe_icon_cache_v1::";
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

    function isPoeUrl(url) {
        return url && (url.startsWith('https://poe.com/') || url.startsWith('https://psc2.cf2.poecdn.net/'));
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

        if (isPoeUrl(iconUrl)) {
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

    /*** 滚动锁定管理器 - 完全防止滚动穿透 ***/
    function enableScrollLock() {
        if (scrollLockState.isLocked) return;

        // 记录当前状态
        scrollLockState.scrollTop = window.pageYOffset || document.documentElement.scrollTop;
        scrollLockState.scrollLeft = window.pageXOffset || document.documentElement.scrollLeft;
        scrollLockState.originalBodyOverflow = document.body.style.overflow || '';
        scrollLockState.originalBodyPosition = document.body.style.position || '';
        scrollLockState.originalBodyTop = document.body.style.top || '';
        scrollLockState.originalBodyLeft = document.body.style.left || '';
        scrollLockState.originalBodyWidth = document.body.style.width || '';

        // 锁定滚动
        document.body.style.overflow = 'hidden';
        document.body.style.position = 'fixed';
        document.body.style.top = `-${scrollLockState.scrollTop}px`;
        document.body.style.left = `-${scrollLockState.scrollLeft}px`;
        document.body.style.width = '100%';

        scrollLockState.isLocked = true;

        // 添加全局事件监听器作为额外保护
        document.addEventListener('wheel', preventScrollEvent, { passive: false, capture: true });
        document.addEventListener('touchmove', preventScrollEvent, { passive: false, capture: true });
        document.addEventListener('scroll', preventScrollEvent, { passive: false, capture: true });
        document.addEventListener('keydown', preventScrollKeyEvent, { passive: false, capture: true });
    }

    function disableScrollLock() {
        if (!scrollLockState.isLocked) return;

        // 移除全局事件监听器
        document.removeEventListener('wheel', preventScrollEvent, { capture: true });
        document.removeEventListener('touchmove', preventScrollEvent, { capture: true });
        document.removeEventListener('scroll', preventScrollEvent, { capture: true });
        document.removeEventListener('keydown', preventScrollKeyEvent, { capture: true });

        // 恢复原始样式
        document.body.style.overflow = scrollLockState.originalBodyOverflow;
        document.body.style.position = scrollLockState.originalBodyPosition;
        document.body.style.top = scrollLockState.originalBodyTop;
        document.body.style.left = scrollLockState.originalBodyLeft;
        document.body.style.width = scrollLockState.originalBodyWidth;

        // 恢复滚动位置
        window.scrollTo(scrollLockState.scrollLeft, scrollLockState.scrollTop);

        scrollLockState.isLocked = false;
    }

    function preventScrollEvent(e) {
        // 检查事件是否来自设置面板内部
        if (isEventFromPanel(e)) {
            return; // 允许面板内部滚动
        }

        // 阻止其他地方的滚动
        e.preventDefault();
        e.stopPropagation();
        return false;
    }

    function preventScrollKeyEvent(e) {
        // 允许的滚动相关按键
        const scrollKeys = ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'PageUp', 'PageDown', 'Home', 'End', 'Space'];

        if (scrollKeys.includes(e.code) || scrollKeys.includes(e.key)) {
            // 检查是否在面板内部的可滚动元素中
            if (isEventFromScrollableElement(e)) {
                return; // 允许面板内滚动
            }

            // 阻止页面滚动
            e.preventDefault();
            e.stopPropagation();
            return false;
        }
    }

    function isEventFromPanel(e) {
        if (!e.target) return false;

        // 检查是否在设置面板内
        const settingsPanel = document.getElementById('poe-settings-panel');
        const editPanel = document.getElementById('poe-edit-form');

        return (settingsPanel && settingsPanel.contains(e.target)) ||
               (editPanel && editPanel.contains(e.target));
    }

    function isEventFromScrollableElement(e) {
        if (!e.target) return false;

        // 检查是否在可滚动的元素内（如列表容器、文本框等）
        let element = e.target;
        while (element && element !== document.body) {
            const style = window.getComputedStyle(element);
            const isScrollable = style.overflowY === 'auto' ||
                                style.overflowY === 'scroll' ||
                                style.overflow === 'auto' ||
                                style.overflow === 'scroll';

            if (isScrollable) {
                // 还需要在面板内部
                return isEventFromPanel(e);
            }

            element = element.parentElement;
        }

        return false;
    }

    // ==============================
    // 1. 默认快捷键配置（保持Poe特殊功能）
    // ==============================
    const defaultShortcuts = [
        {
            name: "App-Creator",
            hotkey: "CTRL+P",
            actionType: "url",
            url: "https://poe.com/App-Creator-1-Legacy",
            selector: "",
            action: "",
            simulateKeys: "",
            icon: "https://qph.cf2.poecdn.net/main-thumb-pb-5003-50-zdgktfpcizyaajmazqorxwnwlzhiwdmi.jpeg",
            autoSelect: false,
            isDefault: true
        },
        {
            name: "New Chat",
            hotkey: "CTRL+N",
            actionType: "click",
            url: "",
            selector: "div.BaseNavbar_rightNavItem__3DfWJ a span.button_label__mCaDf:contains('New chat')",
            action: "",
            simulateKeys: "",
            icon: "",
            autoSelect: false,
            isDefault: true
        },
        {
            name: "侧边栏切换",
            hotkey: "CTRL+B",
            actionType: "click",
            url: "",
            selector: ".ToggleSidebarCollapseButton_hamburgerIcon__VuiyV",
            action: "",
            simulateKeys: "",
            icon: "",
            autoSelect: true,
            isDefault: true
        },
        {
            name: "重试",
            hotkey: "CTRL+R",
            actionType: "click",
            url: "",
            selector: "button[aria-label='Retry']",
            action: "",
            simulateKeys: "",
            icon: "",
            autoSelect: false,
            isDefault: true
        },
        {
            name: "保存重命名",
            hotkey: "CMD+ENTER",
            actionType: "simulate",
            url: "",
            selector: "",
            action: "",
            simulateKeys: "CMD+ENTER",
            icon: "data:image/svg+xml,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%2224%22%20height%3D%2224%22%20viewBox%3D%220%200%2024%2024%22%3E%3Cpath%20fill%3D%22currentColor%22%20d%3D%22M9%2016.17L5.53%2012.7a.996.996%200%200%200-1.41%200a.996.996%200%200%200%200%201.41l4.18%204.18c.39.39%201.02.39%201.41%200L20.29%207.71a.996.996%200%200%200%200-1.41a.996.996%200%200%200-1.41%200L9%2016.17z%22%2F%3E%3C%2Fsvg%3E",
            autoSelect: false,
            isDefault: true
        },
        {
            name: "复制消息",
            hotkey: "CTRL+C",
            actionType: "action",
            url: "",
            selector: "",
            action: "copy",
            simulateKeys: "",
            icon: "data:image/svg+xml,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%2232%22%20height%3D%2232%22%20viewBox%3D%220%200%2024%2024%22%3E%0A%20%20%3Cpath%20fill%3D%22currentColor%22%20d%3D%22M16%201H4c-1.1%200-2%20.9-2%202v14h2V3h12V1zm3%204H8c-1.1%200-2%20.9-2%202v14c0%201.1.9%202%202%202h11c1.1%200%202-.9%202-2V7c0-1.1-.9-2-2-2zm0%2016H8V7h11v14z%22%2F%3E%0A%3C%2Fsvg%3E%0A",
            autoSelect: false,
            isDefault: true
        },
        {
            name: "编辑消息",
            hotkey: "CTRL+D",
            actionType: "action",
            url: "",
            selector: "",
            action: "edit",
            simulateKeys: "",
            icon: "data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIzMiIgaGVpZ2h0PSIzMiIgdmlld0JveD0iMCAwIDI0IDI0Ij48cGF0aCBmaWxsPSJjdXJyZW50Q29sb3IiIGQ9Ik0zIDE3LjI1VjIxaDMuNzVMMTcuODEgOS45NEwxNC4wNiA2LjE5TDMgMTcuMjV6TTIwLjcxIDcuMDRjLjM5LS4zOS4zOS0xLjAyIDAtMS40MWwtMi4zNC0yLjM0YS45OTU5Ljk5NTkgMCAwIDAtMS40MSAwTDE1LjUgNC40MUwxOS4yNSA4LjE2bDEuNDYtMS40NnoiLz48L3N2Zz4=",
            autoSelect: false,
            isDefault: true
        }
    ];

    // 数据迁移和标准化
    let shortcuts = GM_getValue("poe_shortcuts", defaultShortcuts);
    shortcuts = shortcuts.map(s => ({
        name: s.name || "",
        hotkey: s.hotkey || "",
        actionType: s.actionType || s.type || (s.url ? 'url' : (s.action ? 'action' : (s.simulateKeys ? 'simulate' : 'click'))),
        url: s.url || "",
        selector: s.selector || "",
        action: s.action || "",
        simulateKeys: s.simulateKeys || "",
        icon: s.icon || "",
        autoSelect: s.autoSelect || false,
        isDefault: s.isDefault || false
    }));

    // ==============================
    // 2. 暗黑模式检测与响应机制
    // ==============================
    let isDarkMode = false;
    let themeChangeListeners = [];
    function detectInitialDarkMode() { const htmlEl = document.documentElement; const bodyEl = document.body; let detectedDarkMode = false; if (htmlEl.classList.contains('dark') || bodyEl.classList.contains('dark')) { detectedDarkMode = true; } else if (htmlEl.getAttribute('data-theme') === 'dark' || bodyEl.getAttribute('data-theme') === 'dark') { detectedDarkMode = true; } else if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) { if (!htmlEl.classList.contains('light') && !bodyEl.classList.contains('light')) { detectedDarkMode = true; } } else { try { const bgColor = window.getComputedStyle(bodyEl || htmlEl).backgroundColor; if (isColorDark(bgColor)) { detectedDarkMode = true; } } catch (e) { console.warn("[Poe Shortcut Script] Could not compute background color for dark mode detection."); } } if (isDarkMode !== detectedDarkMode) { isDarkMode = detectedDarkMode; notifyThemeChangeListeners(); } }
    function isColorDark(colorStr) { if (!colorStr || colorStr === 'transparent') return window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches; try { let r, g, b, a = 1; if (colorStr.startsWith('rgba')) { const parts = colorStr.match(/rgba?\s*\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*(?:,\s*([\d.]+))?\s*\)/i); if (!parts) return window.matchMedia('(prefers-color-scheme: dark)').matches; [, r, g, b, a] = parts.map(Number); a = isNaN(a) ? 1 : a; if (a < 0.5) return false; } else if (colorStr.startsWith('rgb')) { const parts = colorStr.match(/rgb\s*\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*\)/i); if (!parts) return window.matchMedia('(prefers-color-scheme: dark)').matches; [, r, g, b] = parts.map(Number); } else if (colorStr.startsWith('#')) { let hex = colorStr.substring(1); if (hex.length === 3) hex = hex.split('').map(c => c + c).join(''); if (hex.length === 4) hex = hex.split('').map(c => c + c).join(''); if (hex.length === 8) a = parseInt(hex.substring(6, 8), 16) / 255; if (hex.length !== 6 && hex.length !== 8) return window.matchMedia('(prefers-color-scheme: dark)').matches; r = parseInt(hex.substring(0, 2), 16); g = parseInt(hex.substring(2, 4), 16); b = parseInt(hex.substring(4, 6), 16); if (a < 0.5) return false; } else { return window.matchMedia('(prefers-color-scheme: dark)').matches; } const luminance = (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255; return luminance < 0.5; } catch (e) { console.warn("[Poe Shortcut Script] Error parsing color:", colorStr, e); return window.matchMedia('(prefers-color-scheme: dark)').matches; } }
    function addThemeChangeListener(callback) { if (typeof callback === 'function' && !themeChangeListeners.includes(callback)) { themeChangeListeners.push(callback); } }
    function removeThemeChangeListener(callback) { themeChangeListeners = themeChangeListeners.filter(listener => listener !== callback); }
    function notifyThemeChangeListeners() { themeChangeListeners.forEach(callback => { try { callback(isDarkMode); } catch (e) { console.error("[Poe Shortcut Script] Error in theme change listener:", e); } }); }
    function setupDarkModeObserver() { if (window.matchMedia) { const darkModeMediaQuery = window.matchMedia('(prefers-color-scheme: dark)'); const listener = (e) => { detectInitialDarkMode(); }; if (darkModeMediaQuery.addEventListener) { darkModeMediaQuery.addEventListener('change', listener); } else if (darkModeMediaQuery.addListener) { darkModeMediaQuery.addListener(listener); } } const observerCallback = (mutations) => { let themeMightHaveChanged = false; for (const mutation of mutations) { if (mutation.type === 'attributes' && (mutation.attributeName === 'class' || mutation.attributeName === 'data-theme')) { themeMightHaveChanged = true; break; } } if (themeMightHaveChanged) { detectInitialDarkMode(); } }; const observer = new MutationObserver(observerCallback); observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class', 'data-theme'] }); if (document.body) { observer.observe(document.body, { attributes: true, attributeFilter: ['class', 'data-theme'] }); } setInterval(() => { detectInitialDarkMode(); }, 5000); detectInitialDarkMode(); }
    if (document.readyState === 'loading') { window.addEventListener('DOMContentLoaded', setupDarkModeObserver); } else { setupDarkModeObserver(); }

    // ==============================
    // 3. 增强的键盘映射表
    // ==============================
    const ENHANCED_KEY_MAP = {
        // 字母键
        'KeyA': { display: 'A', standard: 'A' },
        'KeyB': { display: 'B', standard: 'B' },
        'KeyC': { display: 'C', standard: 'C' },
        'KeyD': { display: 'D', standard: 'D' },
        'KeyE': { display: 'E', standard: 'E' },
        'KeyF': { display: 'F', standard: 'F' },
        'KeyG': { display: 'G', standard: 'G' },
        'KeyH': { display: 'H', standard: 'H' },
        'KeyI': { display: 'I', standard: 'I' },
        'KeyJ': { display: 'J', standard: 'J' },
        'KeyK': { display: 'K', standard: 'K' },
        'KeyL': { display: 'L', standard: 'L' },
        'KeyM': { display: 'M', standard: 'M' },
        'KeyN': { display: 'N', standard: 'N' },
        'KeyO': { display: 'O', standard: 'O' },
        'KeyP': { display: 'P', standard: 'P' },
        'KeyQ': { display: 'Q', standard: 'Q' },
        'KeyR': { display: 'R', standard: 'R' },
        'KeyS': { display: 'S', standard: 'S' },
        'KeyT': { display: 'T', standard: 'T' },
        'KeyU': { display: 'U', standard: 'U' },
        'KeyV': { display: 'V', standard: 'V' },
        'KeyW': { display: 'W', standard: 'W' },
        'KeyX': { display: 'X', standard: 'X' },
        'KeyY': { display: 'Y', standard: 'Y' },
        'KeyZ': { display: 'Z', standard: 'Z' },

        // 数字键
        'Digit0': { display: '0', standard: '0' },
        'Digit1': { display: '1', standard: '1' },
        'Digit2': { display: '2', standard: '2' },
        'Digit3': { display: '3', standard: '3' },
        'Digit4': { display: '4', standard: '4' },
        'Digit5': { display: '5', standard: '5' },
        'Digit6': { display: '6', standard: '6' },
        'Digit7': { display: '7', standard: '7' },
        'Digit8': { display: '8', standard: '8' },
        'Digit9': { display: '9', standard: '9' },

        // 功能键
        'F1': { display: 'F1', standard: 'F1' },
        'F2': { display: 'F2', standard: 'F2' },
        'F3': { display: 'F3', standard: 'F3' },
        'F4': { display: 'F4', standard: 'F4' },
        'F5': { display: 'F5', standard: 'F5' },
        'F6': { display: 'F6', standard: 'F6' },
        'F7': { display: 'F7', standard: 'F7' },
        'F8': { display: 'F8', standard: 'F8' },
        'F9': { display: 'F9', standard: 'F9' },
        'F10': { display: 'F10', standard: 'F10' },
        'F11': { display: 'F11', standard: 'F11' },
        'F12': { display: 'F12', standard: 'F12' },

        // 特殊键
        'Space': { display: 'Space', standard: 'SPACE' },
        'Enter': { display: 'Enter', standard: 'ENTER' },
        'Escape': { display: 'Esc', standard: 'ESC' },
        'Backspace': { display: 'Backspace', standard: 'BACKSPACE' },
        'Delete': { display: 'Delete', standard: 'DELETE' },
        'Tab': { display: 'Tab', standard: 'TAB' },
        'Insert': { display: 'Insert', standard: 'INSERT' },
        'Home': { display: 'Home', standard: 'HOME' },
        'End': { display: 'End', standard: 'END' },
        'PageUp': { display: 'Page Up', standard: 'PAGEUP' },
        'PageDown': { display: 'Page Down', standard: 'PAGEDOWN' },

        // 箭头键
        'ArrowUp': { display: '↑', standard: 'ARROWUP' },
        'ArrowDown': { display: '↓', standard: 'ARROWDOWN' },
        'ArrowLeft': { display: '←', standard: 'ARROWLEFT' },
        'ArrowRight': { display: '→', standard: 'ARROWRIGHT' },

        // 标点符号
        'Semicolon': { display: ';', standard: ';' },
        'Equal': { display: '=', standard: '=' },
        'Comma': { display: ',', standard: ',' },
        'Minus': { display: '-', standard: '-' },
        'Period': { display: '.', standard: '.' },
        'Slash': { display: '/', standard: '/' },
        'Backquote': { display: '`', standard: '`' },
        'BracketLeft': { display: '[', standard: '[' },
        'Backslash': { display: '\\', standard: '\\' },
        'BracketRight': { display: ']', standard: ']' },
        'Quote': { display: "'", standard: "'" },

        // 数字键盘
        'Numpad0': { display: 'Num 0', standard: 'NUMPAD0' },
        'Numpad1': { display: 'Num 1', standard: 'NUMPAD1' },
        'Numpad2': { display: 'Num 2', standard: 'NUMPAD2' },
        'Numpad3': { display: 'Num 3', standard: 'NUMPAD3' },
        'Numpad4': { display: 'Num 4', standard: 'NUMPAD4' },
        'Numpad5': { display: 'Num 5', standard: 'NUMPAD5' },
        'Numpad6': { display: 'Num 6', standard: 'NUMPAD6' },
        'Numpad7': { display: 'Num 7', standard: 'NUMPAD7' },
        'Numpad8': { display: 'Num 8', standard: 'NUMPAD8' },
        'Numpad9': { display: 'Num 9', standard: 'NUMPAD9' },
        'NumpadAdd': { display: 'Num +', standard: 'NUMPADADD' },
        'NumpadSubtract': { display: 'Num -', standard: 'NUMPADSUBTRACT' },
        'NumpadMultiply': { display: 'Num *', standard: 'NUMPADMULTIPLY' },
        'NumpadDivide': { display: 'Num /', standard: 'NUMPADDIVIDE' },
        'NumpadDecimal': { display: 'Num .', standard: 'NUMPADDECIMAL' },
        'NumpadEnter': { display: 'Num Enter', standard: 'NUMPADENTER' },
    };

    // ==============================
    // 4. 键盘事件监听与动作执行（优化的事件隔离）
    // ==============================

    /**
     * 检查当前焦点元素是否是快捷键捕获器的输入框
     */
    function isInHotkeyCaptureMode() {
        const activeEl = document.activeElement;
        if (!activeEl) return false;

        return activeEl.readOnly &&
               activeEl.type === 'text' &&
               (activeEl.placeholder.includes('请按下') ||
                activeEl.placeholder.includes('点击此处，然后按下'));
    }

    /**
     * 检查当前焦点元素是否是允许正常键盘输入的元素
     */
    function isInAllowedInputElement() {
        const activeEl = document.activeElement;
        if (!activeEl) return false;

        const allowedTags = ['INPUT', 'TEXTAREA', 'SELECT'];
        const isAllowedTag = allowedTags.includes(activeEl.tagName);
        const isContentEditable = activeEl.isContentEditable;
        const isHotkeyCapturer = isInHotkeyCaptureMode();

        return (isAllowedTag || isContentEditable) && !isHotkeyCapturer;
    }

    /**
     * 统一的允许快捷键检查函数
     */
    function isAllowedShortcut(e) {
        const key = e.key.toLowerCase();
        const code = e.code;

        // 功能键
        if (['F1', 'F2', 'F3', 'F4', 'F5', 'F6', 'F7', 'F8', 'F9', 'F10', 'F11', 'F12'].includes(code)) {
            return true;
        }

        // Ctrl/Cmd组合键
        if (e.ctrlKey || e.metaKey) {
            // 基本编辑快捷键
            if (['c', 'v', 'x', 'a', 'z', 'y', 's'].includes(key) && !e.altKey) {
                return true;
            }

            // 开发者工具
            if ((key === 'i' && e.shiftKey) ||
                (key === 'j' && e.shiftKey) ||
                (key === 'c' && e.shiftKey) ||
                (key === 'u')) {
                return true;
            }

            // 页面控制
            if (key === 'r' ||
                (key === 'r' && e.shiftKey) ||
                key === 'w' ||
                key === 't' ||
                (key === 't' && e.shiftKey) ||
                key === 'l' ||
                key === 'd' ||
                key === 'h' ||
                key === 'j' ||
                (key === 'n' && e.shiftKey)) {
                return true;
            }

            // 缩放控制
            if (key === '=' || key === '+' ||
                key === '-' ||
                key === '0') {
                return true;
            }

            // 数字键
            if (['1', '2', '3', '4', '5', '6', '7', '8', '9'].includes(key)) {
                return true;
            }
        }

        // Alt组合键
        if (e.altKey) {
            if (['ArrowLeft', 'ArrowRight'].includes(code) ||
                key === 'd' ||
                key === 'f4') {
                return true;
            }
        }

        // 特殊单键
        if (code === 'F11') {
            return true;
        }

        return false;
    }

    window.addEventListener("keydown", onKeydown, true);

    function onKeydown(e) {
        // 设置面板打开时的智能事件隔离
        if (isSettingsPanelOpen) {
            // 快捷键捕获器需要接收所有事件
            if (isInHotkeyCaptureMode()) {
                return;
            }

            // 检查是否是应该被允许的快捷键
            if (isAllowedShortcut(e)) {
                return;
            }

            // 对于普通输入元素，应用智能过滤
            if (isInAllowedInputElement()) {
                if (e.ctrlKey || e.altKey || e.metaKey) {
                    e.preventDefault();
                    e.stopPropagation();
                    return;
                }
                return;
            }

            // 其他情况下阻止事件传播到背景页面
            e.preventDefault();
            e.stopPropagation();
            return;
        }

        // 原有的快捷键处理逻辑
        const target = e.target;
        const isInput = target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable;
        const isModifierHeavy = e.ctrlKey || e.altKey || e.metaKey;

        // 检查是否在Poe的重命名弹窗中
        const isInRenameModal = document.querySelector('.ChatRenameModal_modalContainer__hnsEx') !== null;

        // 处理Save按钮的CMD+ENTER快捷键
        if (isInRenameModal && e.metaKey && e.key === 'Enter') {
            e.preventDefault();
            e.stopPropagation();
            const saveButton = document.querySelector('.ChatRenameModal_modalContainer__hnsEx button.button_primary__Vo3KL');
            if (saveButton) {
                saveButton.click();
            }
            return;
        }

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
                        jumpToUrl(item.url);
                        break;
                    case 'click':
                        clickElement(item.selector);
                        break;
                    case 'action':
                        handleComplexAction(item.action);
                        break;
                    case 'simulate':
                        simulateKeystroke(item.simulateKeys);
                        break;
                    default:
                        console.warn(`Unknown actionType: ${item.actionType}`);
                }
                break;
            }
        }
    }

    function normalizeHotkey(hotkeyStr) { if (!hotkeyStr || typeof hotkeyStr !== 'string') return ""; const h = hotkeyStr.replace(/\s+/g, "").toUpperCase(); const parts = h.split("+").filter(p => p); if (parts.length === 0) return ""; let mainKey = parts.pop() || ""; if (parts.length === 0) { return mainKey; } else { const modKs = parts.sort(); return [...modKs, mainKey].join("+"); } }

    // ==============================
    // 5. 核心操作函数
    // ==============================
    function jumpToUrl(url) {
        if (url) {
            window.location.href = url;
        } else {
            console.warn('[Poe Shortcut] URL is not defined.');
            showToast('❌ 此快捷键未配置URL', 'error');
        }
    }

    function clickElement(selector) {
        if (!selector) { console.warn(`[Poe Shortcut] Selector not configured.`); return; }
        let element = null;
        try {
            if (selector === "button[aria-label='Retry']") { element = Array.from(document.querySelectorAll(selector)).pop(); }
            else if (selector.includes(':contains(')) {
                const matches = selector.match(/^(.*):contains\(['"](.+?)['"]\)$/);
                if (matches && matches.length === 3) {
                    const elements = document.querySelectorAll(matches[1]);
                    element = Array.from(elements).find(el => el.textContent.trim().includes(matches[2]));
                    if (element) element = element.closest('button, a') || element;
                }
            } else if (selector.includes('_hamburgerIcon__')) {
                const svgElement = document.querySelector(selector);
                if (svgElement) element = svgElement.closest('button') || svgElement.parentElement;
            } else {
                element = document.querySelector(selector);
            }
            if (element && typeof element.click === 'function') { element.click(); }
            else if (!element) { console.warn(`[Poe Shortcut] Element not found: ${selector}`); }
            else { console.warn(`[Poe Shortcut] Element found but cannot be clicked: ${selector}`, element); }
        } catch (error) { console.error(`[Poe Shortcut] Error clicking element: ${selector}`, error); }
    }

    function simulateKeystroke(keyString) {
        if (!keyString) return;
        const parts = keyString.toUpperCase().split('+');
        const mainKeyStr = parts.pop();
        const modifiers = parts;
        if (!mainKeyStr) {
            console.warn("[Poe Shortcut] Invalid simulateKeys string (missing main key):", keyString);
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
            ';': { key: ';', code: 'Semicolon' }, '=': { key: '=', code: 'Equal' }, ',': { key: ',', code: 'Comma' },
            '-': { key: '-', code: 'Minus' }, '.': { key: '.', code: 'Period' }, '/': { key: '/', code: 'Slash' },
            '`': { key: '`', code: 'Backquote' }, '[': { key: '[', code: 'BracketLeft' },
            '\\': { key: '\\', code: 'Backslash' }, ']': { key: ']', code: 'BracketRight' },
            '\'': { key: '\'', code: 'Quote' },
            'F1': { key: 'F1', code: 'F1' }, 'F2': { key: 'F2', code: 'F2' }, 'F12': { key: 'F12', code: 'F12' }
        };

        const keyProps = keyMap[mainKeyStr];
        if (!keyProps) {
            console.warn("[Poe Shortcut] Unknown main key for simulation:", mainKeyStr, "in", keyString);
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
            console.error("[Poe Shortcut] Error dispatching simulated keyboard event:", e);
        }
    }

    // ==============================
    // 6. 聊天消息操作模块（保持Poe特有功能）
    // ==============================
    let isOperationInProgress = false;
    let currentToast = null;
    let toastTimeout = null;

    function showToast(message, type = 'info', duration = 3000, update = false) {
        try {
            if (update && currentToast) {
                currentToast.innerHTML = message.replace(/\n/g, '<br>');
                currentToast.className = `poe-shortcut-toast show ${type}`;
                if (toastTimeout) clearTimeout(toastTimeout);
                if (duration > 0) toastTimeout = setTimeout(() => hideToast(), duration);
                return;
            }
            hideToast();
            currentToast = document.createElement('div');
            currentToast.className = `poe-shortcut-toast ${type}`;
            currentToast.innerHTML = message.replace(/\n/g, '<br>');
            document.body.appendChild(currentToast);
            requestAnimationFrame(() => { if (currentToast) currentToast.classList.add('show'); });
            if (duration > 0) toastTimeout = setTimeout(() => hideToast(), duration);
        } catch (error) { console.error('Toast error:', error); }
    }

    function hideToast() {
        try {
            if (toastTimeout) { clearTimeout(toastTimeout); toastTimeout = null; }
            if (currentToast) {
                currentToast.classList.remove('show');
                setTimeout(() => {
                    if (currentToast?.parentNode) currentToast.parentNode.removeChild(currentToast);
                    currentToast = null;
                }, 300);
            }
        } catch (error) { console.error('Hide toast error:', error); }
    }

    function handleComplexAction(actionType) {
        const messages = { copy: '🔄 正在复制消息...', edit: '🔄 正在编辑消息...' };
        showToast(messages[actionType] || `🔄 正在执行操作...`, 'info loading', 0);
        executeActionOptimized(actionType);
    }

    const CHAT_ACTION_SELECTORS = { MESSAGE: '.ChatMessage_chatMessage__xkgHx', OVERFLOW_BUTTONS: [ '.ChatMessage_messageOverflowButton__8PaKN', 'button[aria-label="More actions"]', 'button[aria-expanded]', '.DropdownMenuButton_wrapper__uc04T button', '.ChatMessageOverflowButton_overflowButtonWrapper__gzb2s button' ], MENU_CONTAINERS: ['[role="menu"]', '.DropdownMenu_menu', '[data-menu]', '.menu'], MENU_ITEMS: ['button[role="menuitem"]', '[role="menuitem"]', '.menu-item', 'button'] };
    const CHAT_ACTION_PATTERNS = { copy: { exact: /^(copy\s+message|复制\s*消息|复制\s*对话|拷贝\s*消息)$/i, loose: /copy|复制|拷贝/i }, edit: { exact: /^(edit|编辑|修改)$/i, loose: /edit|编辑|修改/i } };

    async function executeActionOptimized(actionType) {
        if (isOperationInProgress) return;
        isOperationInProgress = true;
        try {
            if (!isPageReady()) { showToast('页面正在加载，请稍后再试...', 'warning', 3000, true); return; }
            const targetMessage = findTargetMessage();
            if (!targetMessage) { showToast('未找到可操作的消息', 'error', 3000, true); return; }
            const overflowButton = findOverflowButton(targetMessage);
            if (!overflowButton) { showToast('未找到 "..." 操作按钮', 'error', 3000, true); return; }
            showToast('正在打开菜单...', 'info loading', 0, true);
            if (!performClick(overflowButton)) { showToast('无法点击操作按钮', 'error', 3000, true); return; }
            await fastWaitForCondition(isMenuFullyVisible, 800).catch(() => {});
            showToast(`正在查找"${actionType === 'copy' ? '复制' : '编辑'}"选项...`, 'info loading', 0, true);
            let menuItem = null;
            for (let i = 0; i < 5; i++) { menuItem = findMenuItemOptimized(actionType); if (menuItem) break; await new Promise(r => setTimeout(r, 20)); }
            if (menuItem) {
                if (performClick(menuItem)) {
                    const messages = { copy: '✓ 消息已复制到剪贴板', edit: '✓ 进入编辑模式' };
                    showToast(messages[actionType] || '✓ 操作成功', 'success', 2000, true);
                } else { throw new Error('Menu item click failed'); }
            } else {
                showToast(`❌ 无法找到"${actionType === 'copy' ? '复制' : '编辑'}"选项`, 'error', 4000, true);
                try { document.body.click(); } catch (e) {}
            }
        } catch (error) {
            console.error(`[Poe Shortcut] Error executing action:`, error);
            showToast('❌ 操作执行失败', 'error', 3000, true);
        } finally { isOperationInProgress = false; }
    }

    function findTargetMessage() { return document.querySelector(`${CHAT_ACTION_SELECTORS.MESSAGE}:hover`) || Array.from(document.querySelectorAll(CHAT_ACTION_SELECTORS.MESSAGE)).pop() || null; }
    function findOverflowButton(container) { for (const selector of CHAT_ACTION_SELECTORS.OVERFLOW_BUTTONS) { const button = container.querySelector(selector); if (button && button.offsetParent !== null) return button; } return null; }
    function performClick(element) { if (!element || element.offsetParent === null) return false; try { const evt = new MouseEvent('click', { bubbles: true, cancelable: true, view: window }); element.dispatchEvent(evt); return true; } catch (error) { console.error('Click error:', error); try { element.click(); return true; } catch (e) { return false; } } }
    function isMenuFullyVisible() { for (const selector of CHAT_ACTION_SELECTORS.MENU_CONTAINERS) { const container = document.querySelector(selector); if (container && container.offsetParent !== null) { if (container.querySelectorAll(CHAT_ACTION_SELECTORS.MENU_ITEMS.join(',')).length > 0) return true; } } return false; }
    function findMenuItemOptimized(actionType) { const patterns = CHAT_ACTION_PATTERNS[actionType]; if (!patterns) return null; const candidates = document.querySelectorAll(CHAT_ACTION_SELECTORS.MENU_ITEMS.join(',')); const visibleItems = Array.from(candidates).filter(item => item.offsetParent !== null && item.textContent?.trim()); for (const item of visibleItems) { const text = item.textContent.trim(); if (patterns.exact.test(text)) return item; } for (const item of visibleItems) { const text = item.textContent.trim(); if (patterns.loose.test(text)) return item; } return null; }
    function isPageReady() { return !!document.querySelector(CHAT_ACTION_SELECTORS.MESSAGE); }
    function fastWaitForCondition(conditionFn, timeout = 1000) { return new Promise((resolve, reject) => { const startTime = Date.now(); let rafId; const check = () => { if (conditionFn()) { cancelAnimationFrame(rafId); resolve(true); } else if (Date.now() - startTime >= timeout) { cancelAnimationFrame(rafId); reject(new Error('timeout')); } else { rafId = requestAnimationFrame(check); } }; check(); }); }

    // ==============================
    // 7. 自动选择与页面导航监听（保持Poe特有功能）
    // ==============================
    function isElementSelected(selector) { try { let element = document.querySelector(selector); if (selector.includes(':contains(')) { const matches = selector.match(/^(.*):contains\(['"](.+?)['"]\)$/); if (matches) { const elements = document.querySelectorAll(matches[1]); element = Array.from(elements).find(el => el.textContent.includes(matches[2])); if(element) element = element.closest('button, a') || element; } } if (!element) return false; return element.getAttribute('aria-pressed') === 'true' || element.classList.contains('active') || element.getAttribute('aria-selected') === 'true' || element.getAttribute('aria-expanded') === 'true'; } catch (e) { return false; } }
    function isSidebarCurrentlyOpen() { const sidebarContainer = document.querySelector('.SidebarLayout_sidebarContainer__oGhkh'); if (sidebarContainer) { if (!sidebarContainer.classList.contains('SidebarLayout_collapsed__KoQY2')) return true; } const expandedElements = [ '.ChatSidebar_sidebarContainer__expanded', '[aria-expanded="true"]', '.sidebar-expanded', '.SidebarLayout_sidebarContainer__oGhkh:not(.SidebarLayout_collapsed__KoQY2)' ]; for (const selector of expandedElements) { if (document.querySelector(selector)) return true; } const sidebarEl = document.querySelector('.ToggleSidebarCollapseButton_hamburgerIcon__VuiyV')?.closest('div'); if (sidebarEl) { return parseInt(window.getComputedStyle(sidebarEl).width, 10) > 50; } return false; }
    function autoSelectElements() { setTimeout(() => { for (const item of shortcuts) { if (item.autoSelect && item.actionType === 'click' && item.selector) { if (item.name === "侧边栏切换") { if (!isSidebarCurrentlyOpen()) { console.log(`[Poe Shortcut] 自动选择: ${item.name}`); clickElement(item.selector); } } else if (!isElementSelected(item.selector)) { console.log(`[Poe Shortcut] 自动选择: ${item.name}`); clickElement(item.selector); } } } }, 1000); }
    window.addEventListener('load', autoSelectElements);
    let lastUrl = location.href;
    new MutationObserver(() => { const url = location.href; if (url !== lastUrl) { lastUrl = url; autoSelectElements(); } }).observe(document, { subtree: true, childList: true });

    // ==============================
    // 8. 自定义模态对话框
    // ==============================
    function showAlert(message, title = "提示") {
        const modal = document.createElement('div');
        modal.className = 'poe-custom-modal';
        Object.assign(modal.style, {
            position: 'fixed', top: '0', left: '0', width: '100vw', height: '100vh',
            backgroundColor: getOverlayBackgroundColor(isDarkMode), zIndex: '999999',
            display: 'flex', alignItems: 'center', justifyContent: 'center'
        });

        const dialog = document.createElement('div');
        Object.assign(dialog.style, {
            background: getPanelBackgroundColor(isDarkMode), borderRadius: '8px',
            padding: '20px', maxWidth: '400px', width: '90%', maxHeight: '80vh',
            boxShadow: '0 4px 12px rgba(0,0,0,0.3)', color: getTextColor(isDarkMode)
        });

        const titleEl = document.createElement('h3');
        titleEl.textContent = title;
        Object.assign(titleEl.style, {
            margin: '0 0 15px 0', fontSize: '1.1em', fontWeight: 'bold'
        });
        dialog.appendChild(titleEl);

        const messageEl = document.createElement('p');
        messageEl.textContent = message;
        Object.assign(messageEl.style, {
            margin: '0 0 20px 0', lineHeight: '1.4'
        });
        dialog.appendChild(messageEl);

        const buttonContainer = document.createElement('div');
        Object.assign(buttonContainer.style, {
            textAlign: 'right'
        });

        const okButton = document.createElement('button');
        okButton.textContent = '确定';
        styleButton(okButton, "#4CAF50", "#45A049");
        okButton.onclick = () => {
            document.body.removeChild(modal);
        };
        buttonContainer.appendChild(okButton);
        dialog.appendChild(buttonContainer);
        modal.appendChild(dialog);
        document.body.appendChild(modal);

        okButton.focus();
    }

    function showConfirmDialog(message, onConfirm, title = "确认") {
        const modal = document.createElement('div');
        modal.className = 'poe-custom-modal';
        Object.assign(modal.style, {
            position: 'fixed', top: '0', left: '0', width: '100vw', height: '100vh',
            backgroundColor: getOverlayBackgroundColor(isDarkMode), zIndex: '999999',
            display: 'flex', alignItems: 'center', justifyContent: 'center'
        });

        const dialog = document.createElement('div');
        Object.assign(dialog.style, {
            background: getPanelBackgroundColor(isDarkMode), borderRadius: '8px',
            padding: '20px', maxWidth: '400px', width: '90%', maxHeight: '80vh',
            boxShadow: '0 4px 12px rgba(0,0,0,0.3)', color: getTextColor(isDarkMode)
        });

        const titleEl = document.createElement('h3');
        titleEl.textContent = title;
        Object.assign(titleEl.style, {
            margin: '0 0 15px 0', fontSize: '1.1em', fontWeight: 'bold'
        });
        dialog.appendChild(titleEl);

        const messageEl = document.createElement('p');
        messageEl.textContent = message;
        Object.assign(messageEl.style, {
            margin: '0 0 20px 0', lineHeight: '1.4'
        });
        dialog.appendChild(messageEl);

        const buttonContainer = document.createElement('div');
        Object.assign(buttonContainer.style, {
            display: 'flex', justifyContent: 'flex-end', gap: '10px'
        });

        const cancelButton = document.createElement('button');
        cancelButton.textContent = '取消';
        styleButton(cancelButton, "#9E9E9E", "#757575");
        cancelButton.onclick = () => {
            document.body.removeChild(modal);
        };
        buttonContainer.appendChild(cancelButton);

        const confirmButton = document.createElement('button');
        confirmButton.textContent = '确定';
        styleButton(confirmButton, "#F44336", "#D32F2F");
        confirmButton.onclick = () => {
            document.body.removeChild(modal);
            if (onConfirm) onConfirm();
        };
        buttonContainer.appendChild(confirmButton);

        dialog.appendChild(buttonContainer);
        modal.appendChild(dialog);
        document.body.appendChild(modal);

        cancelButton.focus();
    }

    function showPromptDialog(message, defaultValue = "", onConfirm = null, title = "输入") {
        const modal = document.createElement('div');
        modal.className = 'poe-custom-modal';
        Object.assign(modal.style, {
            position: 'fixed', top: '0', left: '0', width: '100vw', height: '100vh',
            backgroundColor: getOverlayBackgroundColor(isDarkMode), zIndex: '999999',
            display: 'flex', alignItems: 'center', justifyContent: 'center'
        });

        const dialog = document.createElement('div');
        Object.assign(dialog.style, {
            background: getPanelBackgroundColor(isDarkMode), borderRadius: '8px',
            padding: '20px', maxWidth: '400px', width: '90%', maxHeight: '80vh',
            boxShadow: '0 4px 12px rgba(0,0,0,0.3)', color: getTextColor(isDarkMode)
        });

        const titleEl = document.createElement('h3');
        titleEl.textContent = title;
        Object.assign(titleEl.style, {
            margin: '0 0 15px 0', fontSize: '1.1em', fontWeight: 'bold'
        });
        dialog.appendChild(titleEl);

        const messageEl = document.createElement('p');
        messageEl.textContent = message;
        Object.assign(messageEl.style, {
            margin: '0 0 15px 0', lineHeight: '1.4'
        });
        dialog.appendChild(messageEl);

        const input = document.createElement('input');
        input.type = 'text';
        input.value = defaultValue;
        styleInputField(input, isDarkMode);
        input.style.marginBottom = '20px';
        dialog.appendChild(input);

        const buttonContainer = document.createElement('div');
        Object.assign(buttonContainer.style, {
            display: 'flex', justifyContent: 'flex-end', gap: '10px'
        });

        const cancelButton = document.createElement('button');
        cancelButton.textContent = '取消';
        styleButton(cancelButton, "#9E9E9E", "#757575");
        cancelButton.onclick = () => {
            document.body.removeChild(modal);
            if (onConfirm) onConfirm(null);
        };
        buttonContainer.appendChild(cancelButton);

        const confirmButton = document.createElement('button');
        confirmButton.textContent = '确定';
        styleButton(confirmButton, "#4CAF50", "#45A049");
        confirmButton.onclick = () => {
            const value = input.value.trim();
            document.body.removeChild(modal);
            if (onConfirm) onConfirm(value);
        };
        buttonContainer.appendChild(confirmButton);

        dialog.appendChild(buttonContainer);
        modal.appendChild(dialog);
        document.body.appendChild(modal);

        input.focus();
        input.select();
    }

    // ==============================
    // 9. 设置面板（采用参考脚本UI，保留自动选择功能）
    // ==============================
    GM_registerMenuCommand("Poe - 设置快捷键", openSettingsPanel);
    let currentPanelOverlay = null;

    function openSettingsPanel() {
        if (currentPanelOverlay) { currentPanelOverlay.remove(); currentPanelOverlay = null; }

        // 设置面板状态为打开并启用滚动锁定
        isSettingsPanelOpen = true;
        enableScrollLock();

        const overlay = document.createElement("div");
        overlay.id = "poe-settings-overlay";
        Object.assign(overlay.style, { position: "fixed", top: 0, left: 0, width: "100vw", height: "100vh", zIndex: "99998", display: "flex", justifyContent: "center", alignItems: "center" });
        overlay.onclick = (e) => { if (e.target === overlay) closePanel(); };

        const panel = document.createElement("div");
        panel.id = "poe-settings-panel";
        Object.assign(panel.style, { borderRadius: "8px", boxShadow: "0 4px 12px rgba(0,0,0,0.2)", padding: "20px", minWidth: "750px", fontFamily: "sans-serif", position: "relative", opacity: "0", transform: "translateY(20px)", transition: "opacity 0.3s ease, transform 0.3s ease", maxHeight: "90vh", overflowY: "auto" });
        panel.onclick = (e) => e.stopPropagation();

        const title = document.createElement("h2");
        title.textContent = "Poe - 自定义快捷键";
        Object.assign(title.style, { marginTop: "0", marginBottom: "15px", fontSize: "1.1em" });
        panel.appendChild(title);

        const listContainer = document.createElement("div");
        Object.assign(listContainer.style, { maxHeight: "calc(80vh - 150px)", overflowY: "auto", marginBottom: "15px" });
        panel.appendChild(listContainer);

        const bottomBar = document.createElement("div");
        Object.assign(bottomBar.style, { display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "10px" });

        const addBtn = document.createElement("button");
        addBtn.textContent = "添加新快捷键";
        addBtn.onclick = () => { editShortcut(); };
        bottomBar.appendChild(addBtn);

        const saveBtn = document.createElement("button");
        saveBtn.textContent = "保存并关闭";
        saveBtn.onclick = () => { GM_setValue("poe_shortcuts", shortcuts); closePanel(); };
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
        requestAnimationFrame(() => { panel.style.opacity = "1"; panel.style.transform = "translateY(0)"; });

        function renderShortcutsList(isDark = isDarkMode) {
            listContainer.innerHTML = "";
            const table = document.createElement("table");
            table.style.width = "100%";
            table.style.borderCollapse = "collapse";
            const thead = document.createElement("thead");
            const headRow = document.createElement("tr");

            // 保留"自动"列，其他采用参考脚本设计
            const headers = [
                { text: "自动", width: "60px", align: "center" },
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
            tbody.id = "poe-shortcut-tbody";
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
                        showAlert("拖拽排序时出错: " + err);
                    }
                });

                row.addEventListener("dragend", e => {
                    tbody.classList.remove("is-dragging");
                    tbody.querySelectorAll("tr").forEach(r => r.classList.remove("dragging", "dragover-top", "dragover-bottom"));
                });

                // 自动选择列（Poe特有功能）
                const tdAuto = document.createElement("td");
                styleTableCell(tdAuto, isDark);
                tdAuto.style.textAlign = "center";
                const autoCheckbox = document.createElement("input");
                autoCheckbox.type = "checkbox";
                autoCheckbox.checked = !!item.autoSelect;
                autoCheckbox.disabled = item.actionType !== 'click';
                autoCheckbox.onchange = () => {
                    item.autoSelect = autoCheckbox.checked;
                    GM_setValue("poe_shortcuts", shortcuts);
                };
                Object.assign(autoCheckbox.style, {
                    accentColor: getPrimaryColor(),
                    cursor: "pointer",
                    width: "16px",
                    height: "16px",
                    opacity: autoCheckbox.disabled ? 0.5 : 1
                });
                tdAuto.appendChild(autoCheckbox);

                // 图标列
                const tdIcon = document.createElement("td");
                styleTableCell(tdIcon, isDark);
                tdIcon.style.textAlign = "center";
                const iconImg = document.createElement("img");
                Object.assign(iconImg.style, { width: "24px", height: "24px", objectFit: "contain", verticalAlign: "middle" });
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
                    case 'click': typeText = "元素点击"; break;
                    case 'simulate': typeText = "按键模拟"; break;
                    case 'action': typeText = "复杂动作"; break;
                }
                tdType.textContent = typeText;
                Object.assign(tdType.style, { fontSize: "0.9em", opacity: "0.8" });
                styleTableCell(tdType, isDark);

                // 目标列
                const tdTarget = document.createElement("td");
                const targetText = item.url || item.selector || item.simulateKeys || item.action || "-";
                tdTarget.textContent = targetText;
                tdTarget.title = targetText;
                Object.assign(tdTarget.style, {
                    wordBreak: "break-all",
                    maxWidth: "300px",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap"
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
                    display: "flex",
                    justifyContent: "center",
                    alignItems: "center",
                    gap: "8px",
                    flexWrap: "nowrap"
                });

                const editButton = document.createElement("button");
                editButton.textContent = "✍️";
                editButton.title = "编辑";
                styleTransparentButton(editButton, "#FF9800", getHoverColor(isDark), isDark);
                editButton.onclick = () => { editShortcut(item, index); };
                buttonContainer.appendChild(editButton);

                // 对于非默认项，显示删除按钮
                if (!item.isDefault) {
                    const delButton = document.createElement("button");
                    delButton.textContent = "🗑️";
                    delButton.title = "删除";
                    styleTransparentButton(delButton, "#F44336", getHoverColor(isDark), isDark);
                    delButton.onclick = () => {
                        showConfirmDialog(`确定删除快捷键【${item.name}】吗?`, () => {
                            shortcuts.splice(index, 1);
                            renderShortcutsList(isDarkMode);
                        });
                    };
                    buttonContainer.appendChild(delButton);
                }

                tdAction.appendChild(buttonContainer);

                row.appendChild(tdAuto);
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
            // 设置面板状态为关闭并禁用滚动锁定
            isSettingsPanelOpen = false;
            disableScrollLock();

            removeThemeChangeListener(updatePanelTheme);
            panel.style.opacity = "0";
            panel.style.transform = "translateY(20px)";
            setTimeout(() => { if (overlay) overlay.remove(); currentPanelOverlay = null; }, 300);
        }

        function editShortcut(item = null, index = -1) {
            const isNew = !item;
            const isEditingDefault = item && item.isDefault === true;
            let temp = item ? { ...item } : { name: "", actionType: "url", url: "", selector: "", simulateKeys: "", action: "", hotkey: "", icon: "", autoSelect: false, isDefault: false };

            const editOverlay = document.createElement("div");
            editOverlay.id = "poe-edit-overlay";
            Object.assign(editOverlay.style, { position: "fixed", top: 0, left: 0, width: "100vw", height: "100vh", backgroundColor: "rgba(0, 0, 0, 0.3)", zIndex: "99999", display: "flex", justifyContent: "center", alignItems: "center" });

            const formDiv = document.createElement("div");
            formDiv.id = "poe-edit-form";
            Object.assign(formDiv.style, { borderRadius: "8px", boxShadow: "0 4px 12px rgba(0,0,0,0.2)", padding: "20px", minWidth: "450px", fontFamily: "sans-serif", position: "relative", opacity: "0", transform: "translateY(20px)", transition: "opacity 0.3s ease, transform 0.3s ease", maxHeight: "90vh", overflowY: "auto" });
            formDiv.onclick = (e) => e.stopPropagation();

            const h3 = document.createElement("h3");
            h3.textContent = isNew ? "添加快捷键" : "编辑快捷键";
            if (isEditingDefault) h3.textContent += ` (内置)`;
            Object.assign(h3.style, { marginTop: "0", marginBottom: "15px", fontSize: "1.1em" });
            formDiv.appendChild(h3);

            // 名称输入
            const nameInput = createInputField("名称:", temp.name, "text");
            nameInput.input.disabled = isEditingDefault;
            formDiv.appendChild(nameInput.label);

            // 操作类型选择
            const actionTypeDiv = document.createElement("div");
            actionTypeDiv.style.margin = "15px 0";
            const actionTypeLabel = document.createElement("div");
            actionTypeLabel.textContent = "操作类型:";
            Object.assign(actionTypeLabel.style, { fontWeight: "bold", fontSize: "0.9em", marginBottom: "8px" });
            actionTypeDiv.appendChild(actionTypeLabel);

            // 支持的操作类型，新增 action 类型保持向后兼容
            let allActionTypes = [
                {value: 'url', text: 'URL跳转'},
                {value: 'click', text: '元素点击'},
                {value: 'simulate', text: '按键模拟'},
                {value: 'action', text: '复杂动作'}
            ];
            const availableActionTypes = isNew ? allActionTypes.filter(at => at.value !== 'action') : allActionTypes;

            const radioGroup = document.createElement("div");
            Object.assign(radioGroup.style, { display: 'flex', gap: '15px' });
            const actionInputs = {};

            availableActionTypes.forEach(at => {
                const radioLabel = document.createElement("label");
                Object.assign(radioLabel.style, { display: 'inline-flex', alignItems: 'center', cursor: 'pointer' });
                const radio = document.createElement("input");
                radio.type = "radio";
                radio.name = "actionType";
                radio.value = at.value;
                radio.checked = temp.actionType === at.value;
                radio.disabled = isEditingDefault;
                Object.assign(radio.style, { marginRight: "5px", cursor: 'pointer' });

                radio.addEventListener('change', () => {
                    if (radio.checked) {
                        temp.actionType = at.value;
                        updateActionTypeVisibility();
                    }
                });

                radioLabel.appendChild(radio);
                radioLabel.appendChild(document.createTextNode(at.text));
                radioGroup.appendChild(radioLabel);
            });
            actionTypeDiv.appendChild(radioGroup);
            formDiv.appendChild(actionTypeDiv);

            // URL容器
            const urlContainer = document.createElement('div');
            const urlTextarea = createInputField("目标网址 (URL):", temp.url, "textarea", "例如: https://poe.com/App-Creator");
            urlTextarea.input.disabled = isEditingDefault;
            urlContainer.appendChild(urlTextarea.label);
            formDiv.appendChild(urlContainer);
            actionInputs.url = urlTextarea.input;

            // Selector容器
            const selectorContainer = document.createElement('div');
            const selectorTextarea = createInputField("CSS选择器:", temp.selector, "textarea", "例如: .ToggleSidebarCollapseButton_hamburgerIcon__VuiyV");
            selectorTextarea.input.disabled = isEditingDefault;
            selectorContainer.appendChild(selectorTextarea.label);
            formDiv.appendChild(selectorContainer);
            actionInputs.selector = selectorTextarea.input;

            // 按键模拟容器
            const simulateContainer = document.createElement('div');
            const { container: simulateInputContainer, getSimulateKeys } = createEnhancedSimulateKeysInput("模拟按键:", temp.simulateKeys);
            if (isEditingDefault) {
                const inputs = simulateInputContainer.querySelectorAll('input');
                inputs.forEach(input => input.disabled = true);
            }
            simulateContainer.appendChild(simulateInputContainer);
            formDiv.appendChild(simulateContainer);

            // Action容器（用于复杂动作）
            const actionContainer = document.createElement('div');
            const actionLabel = document.createElement("div");
            actionLabel.textContent = "选择动作:";
            Object.assign(actionLabel.style, { fontWeight: "bold", fontSize: "0.9em", marginBottom: "8px" });
            actionContainer.appendChild(actionLabel);
            const actionSelect = document.createElement("select");
            actionSelect.innerHTML = `<option value="copy">复制消息</option><option value="edit">编辑消息</option>`;
            actionSelect.disabled = isEditingDefault;
            styleInputField(actionSelect);
            if (temp.actionType === 'action') actionSelect.value = temp.action;
            actionContainer.appendChild(actionSelect);
            formDiv.appendChild(actionContainer);
            actionInputs.action = actionSelect;

            // 图标字段
            const { label: iconLabel, input: iconTextarea, preview: iconPreview } = createIconField("图标URL:", temp.icon);
            iconTextarea.disabled = isEditingDefault;
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

            // 自动选择复选框（Poe特有功能）
            const autoSelectLabel = document.createElement("label");
            Object.assign(autoSelectLabel.style, { display: "flex", alignItems: "center", margin: "16px 0", cursor: "pointer" });
            const autoSelectCheckbox = document.createElement("input");
            autoSelectCheckbox.type = "checkbox";
            autoSelectCheckbox.checked = temp.autoSelect;
            autoSelectCheckbox.disabled = isEditingDefault;
            Object.assign(autoSelectCheckbox.style, { accentColor: getPrimaryColor(), marginRight: "8px", width: "16px", height: "16px" });
            autoSelectLabel.append(autoSelectCheckbox, "页面加载时自动选择");
            formDiv.appendChild(autoSelectLabel);

            // 快捷键输入（使用增强的快捷键捕获器）
            const { container: hotkeyContainer, getHotkey } = createEnhancedHotkeyInput("快捷键:", temp.hotkey);
            if (isEditingDefault) {
                const inputs = hotkeyContainer.querySelectorAll('input, button');
                inputs.forEach(input => input.disabled = true);
            }
            formDiv.appendChild(hotkeyContainer);

            // 更新显示状态
            function updateActionTypeVisibility() {
                urlContainer.style.display = (temp.actionType === 'url') ? 'block' : 'none';
                selectorContainer.style.display = (temp.actionType === 'click') ? 'block' : 'none';
                simulateContainer.style.display = (temp.actionType === 'simulate') ? 'block' : 'none';
                actionContainer.style.display = (temp.actionType === 'action') ? 'block' : 'none';

                const isClickType = temp.actionType === 'click';
                autoSelectCheckbox.disabled = !isClickType || isEditingDefault;
                autoSelectLabel.style.opacity = autoSelectCheckbox.disabled ? 0.6 : 1;
                autoSelectLabel.style.cursor = autoSelectCheckbox.disabled ? 'not-allowed' : 'pointer';

                requestAnimationFrame(() => {
                    if (urlContainer.style.display !== 'none') autoResizeTextarea(urlTextarea.input);
                    if (selectorContainer.style.display !== 'none') autoResizeTextarea(selectorTextarea.input);
                });
            }

            // 按钮区域
            const btnRow = document.createElement("div");
            Object.assign(btnRow.style, { marginTop: "20px", textAlign: "right" });

            const confirmBtn = document.createElement("button");
            confirmBtn.textContent = "确定";
            confirmBtn.onclick = () => {
                const finalHotkey = getHotkey();
                temp.hotkey = finalHotkey;
                temp.icon = iconTextarea.value.trim();

                if (!isEditingDefault) {
                    temp.name = nameInput.input.value.trim();
                    if (!temp.name) { showAlert("请填写名称!"); return; }

                    const typeRadio = formDiv.querySelector('input[name="actionType"]:checked');
                    if (!typeRadio) { showAlert("请选择操作类型!"); return; }
                    temp.actionType = typeRadio.value;

                    // 清空其他类型的数据
                    temp.url = ""; temp.selector = ""; temp.action = ""; temp.simulateKeys = "";

                    switch(temp.actionType) {
                        case 'url':
                            temp.url = actionInputs.url.value.trim();
                            if (!temp.url) { showAlert("请填写目标网址!"); return; }
                            break;
                        case 'click':
                            temp.selector = actionInputs.selector.value.trim();
                            if (!temp.selector) { showAlert("请填写CSS选择器!"); return; }
                            break;
                        case 'simulate':
                            temp.simulateKeys = getSimulateKeys().replace(/\s+/g, "");
                            if (!temp.simulateKeys) { showAlert("请设置模拟按键!"); return; }
                            break;
                        case 'action':
                            temp.action = actionInputs.action.value;
                            break;
                    }

                    temp.autoSelect = temp.actionType === 'click' && autoSelectCheckbox.checked;
                } else {
                    temp.autoSelect = autoSelectCheckbox.checked;
                }

                if (finalHotkey && shortcuts.some((s, i) => normalizeHotkey(s.hotkey) === normalizeHotkey(finalHotkey) && i !== index)) {
                    showAlert("该快捷键已被使用!");
                    return;
                }

                if (isNew) shortcuts.push(temp);
                else shortcuts[index] = temp;
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
                styleInputField(actionInputs.action, isDark);
                styleInputField(iconTextarea, isDark);
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
                updateActionTypeVisibility();
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

        // 创建输入字段的辅助函数
        function createInputField(labelText, value, type = "text", placeholder = "") {
            const label = document.createElement("label");
            Object.assign(label.style, { display: "block", margin: "12px 0 4px", fontWeight: "bold", fontSize: "0.9em" });
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
            Object.assign(label.style, { display: "block", margin: "12px 0 4px", fontWeight: "bold", fontSize: "0.9em" });
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
            Object.assign(preview.style, { width: "36px", height: "36px", objectFit: "contain", borderRadius: "4px", flexShrink: "0" });

            requestAnimationFrame(() => autoResizeTextarea(textarea));
            wrap.appendChild(textarea); wrap.appendChild(preview); label.appendChild(wrap);
            const updatePreviewTheme = (isDark) => { preview.style.border = `1px solid ${getBorderColor(isDark)}`; preview.style.backgroundColor = getInputBackgroundColor(isDark); };
            addThemeChangeListener(updatePreviewTheme);
            updatePreviewTheme(isDarkMode);
            return { label, input: textarea, preview };
        }

        // 图标库UI（完全采用参考脚本实现）
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
                if (!url) { showAlert("请输入图标的URL！"); return; }
                if (userIcons.some(icon => icon.url === url) || defaultIcons.some(icon => icon.url === url)) { showAlert("该图标已存在于图库中。"); return; }
                showPromptDialog("请输入图标的名称：", "", (name) => {
                    if (name && name.trim()) {
                        userIcons.push({ name: name.trim(), url: url });
                        GM_setValue(USER_ICONS_STORAGE_KEY, userIcons);
                        renderIconGrid();
                    }
                });
            });
            gridWrapper.appendChild(addButton);

            function renderIconGrid() {
                iconGrid.innerHTML = "";
                const allIcons = [...defaultIcons, ...userIcons];

                allIcons.forEach(iconInfo => {
                    const isCore = POE_CORE_ICONS.includes(iconInfo.url);
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
                    Object.assign(img.style, { width: "24px", height: "24px", objectFit: "contain", pointerEvents: "none" });
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
                                showConfirmDialog(`确定要删除自定义图标 "${iconInfo.name}" 吗?`, () => {
                                    userIcons = userIcons.filter(icon => icon.url !== iconInfo.url);
                                    GM_setValue(USER_ICONS_STORAGE_KEY, userIcons);
                                    renderIconGrid();
                                });
                                longPressTimer = null;
                            }, 1000);
                        });
                        const clearLongPress = () => { if (longPressTimer) { clearTimeout(longPressTimer); longPressTimer = null; } };
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

        // 增强的快捷键输入组件
        function createEnhancedHotkeyInput(labelText, currentHotkey) {
            return createKeyboardCaptureInput(labelText, currentHotkey, "快捷键", "点击此处，然后按下快捷键组合", "💡 支持 Ctrl/Shift/Alt/Cmd + 字母/数字/功能键等组合");
        }

        // 增强的按键模拟输入组件
        function createEnhancedSimulateKeysInput(labelText, currentKeys) {
            return createKeyboardCaptureInput(labelText, currentKeys, "模拟按键", "点击此处，然后按下要模拟的按键组合", "⚡ 将模拟这个按键组合发送到网页", "getSimulateKeys");
        }

        // 通用的键盘捕获输入组件
        function createKeyboardCaptureInput(labelText, currentValue, type, placeholder, hint, methodName = "getHotkey") {
            const container = document.createElement("div");
            container.style.margin = "12px 0 4px";

            const label = document.createElement("div");
            label.textContent = labelText;
            Object.assign(label.style, {
                fontWeight: "bold",
                fontSize: "0.9em",
                marginBottom: "8px"
            });
            container.appendChild(label);

            // 创建主输入框
            const inputContainer = document.createElement("div");
            Object.assign(inputContainer.style, {
                display: "flex",
                alignItems: "center",
                gap: "10px",
                marginBottom: "8px"
            });

            const mainInput = document.createElement("input");
            mainInput.type = "text";
            mainInput.placeholder = placeholder;
            mainInput.readOnly = true;
            mainInput.value = currentValue || "";
            Object.assign(mainInput.style, {
                flexGrow: "1",
                cursor: "pointer",
                textAlign: "center",
                fontWeight: "bold",
                fontSize: "14px"
            });

            // 创建清除按钮
            const clearButton = document.createElement("button");
            clearButton.type = "button";
            clearButton.textContent = "🗑️";
            clearButton.title = `清除${type}`;
            Object.assign(clearButton.style, {
                padding: "8px 12px",
                border: "1px solid",
                borderRadius: "4px",
                cursor: "pointer",
                fontSize: "14px",
                backgroundColor: "transparent"
            });

            // 创建状态提示
            const statusDiv = document.createElement("div");
            Object.assign(statusDiv.style, {
                fontSize: "0.8em",
                marginTop: "5px",
                opacity: "0.7",
                minHeight: "20px"
            });
            statusDiv.textContent = hint;

            let isCapturing = false;
            let capturedModifiers = new Set();
            let capturedMainKey = "";

            // 开始捕获快捷键
            function startCapture() {
                if (isCapturing) return;

                isCapturing = true;
                capturedModifiers.clear();
                capturedMainKey = "";

                mainInput.value = "";
                mainInput.placeholder = `请按下${type}组合...`;
                statusDiv.textContent = `🎯 正在捕获${type}，请按下组合键...`;

                mainInput.focus();
                updateCaptureState();
            }

            // 停止捕获
            function stopCapture() {
                if (!isCapturing) return;

                isCapturing = false;
                mainInput.placeholder = placeholder;

                // 构建最终的快捷键字符串
                const finalKeys = buildHotkeyString();
                if (finalKeys) {
                    mainInput.value = finalKeys;
                    statusDiv.textContent = `✅ 已捕获${type}: ${finalKeys}`;
                } else {
                    statusDiv.textContent = `❌ 未捕获到有效的${type}`;
                }

                mainInput.blur();
                updateCaptureState();
            }

            // 构建快捷键字符串
            function buildHotkeyString() {
                if (!capturedMainKey) return "";

                const modArray = Array.from(capturedModifiers).sort();
                return modArray.length > 0
                    ? [...modArray, capturedMainKey].join("+")
                    : capturedMainKey;
            }

            // 更新捕获状态的视觉反馈
            function updateCaptureState() {
                const isDark = isDarkMode;
                if (isCapturing) {
                    mainInput.style.backgroundColor = getPrimaryColor() + "20";
                    mainInput.style.borderColor = getPrimaryColor();
                    mainInput.style.boxShadow = `0 0 0 1px ${getPrimaryColor()}`;
                } else {
                    styleInputField(mainInput, isDark);
                }
            }

            // 处理键盘事件
            function handleKeyEvent(e) {
                if (!isCapturing) return;

                e.preventDefault();
                e.stopPropagation();

                const code = e.code;
                const key = e.key;

                // 处理修饰符
                if (['ControlLeft', 'ControlRight'].includes(code) || key === 'Control') {
                    if (e.type === 'keydown') capturedModifiers.add('CTRL');
                    else capturedModifiers.delete('CTRL');
                    updateDisplay();
                    return;
                }

                if (['ShiftLeft', 'ShiftRight'].includes(code) || key === 'Shift') {
                    if (e.type === 'keydown') capturedModifiers.add('SHIFT');
                    else capturedModifiers.delete('SHIFT');
                    updateDisplay();
                    return;
                }

                if (['AltLeft', 'AltRight'].includes(code) || key === 'Alt') {
                    if (e.type === 'keydown') capturedModifiers.add('ALT');
                    else capturedModifiers.delete('ALT');
                    updateDisplay();
                    return;
                }

                if (['MetaLeft', 'MetaRight'].includes(code) || key === 'Meta') {
                    if (e.type === 'keydown') capturedModifiers.add('CMD');
                    else capturedModifiers.delete('CMD');
                    updateDisplay();
                    return;
                }

                // 处理主键（只在 keydown 时）
                if (e.type === 'keydown') {
                    const keyInfo = ENHANCED_KEY_MAP[code];
                    if (keyInfo) {
                        capturedMainKey = keyInfo.standard;
                        updateDisplay();
                        setTimeout(stopCapture, 100);
                    } else {
                        // 对于未映射的键，尝试使用原始键值
                        let standardKey = key.toUpperCase();
                        if (standardKey.length === 1 || ['ESCAPE', 'ENTER', 'SPACE', 'TAB'].includes(standardKey)) {
                            if (standardKey === 'ESCAPE') standardKey = 'ESC';
                            capturedMainKey = standardKey;
                            updateDisplay();
                            setTimeout(stopCapture, 100);
                        }
                    }
                }
            }

            // 更新显示
            function updateDisplay() {
                if (!isCapturing) return;

                let displayParts = Array.from(capturedModifiers);
                if (capturedMainKey) {
                    const keyEntry = Object.entries(ENHANCED_KEY_MAP).find(([code, info]) => info.standard === capturedMainKey);
                    const displayKey = keyEntry ? keyEntry[1].display : capturedMainKey;
                    displayParts.push(displayKey);
                }

                mainInput.value = displayParts.join(" + ");
            }

            // 绑定事件
            mainInput.addEventListener("click", startCapture);
            mainInput.addEventListener("focus", startCapture);

            mainInput.addEventListener("keydown", handleKeyEvent);
            mainInput.addEventListener("keyup", handleKeyEvent);

            // 点击其他地方时停止捕获
            mainInput.addEventListener("blur", (e) => {
                setTimeout(() => {
                    if (isCapturing && document.activeElement !== mainInput) {
                        stopCapture();
                    }
                }, 100);
            });

            clearButton.addEventListener("click", () => {
                mainInput.value = "";
                capturedModifiers.clear();
                capturedMainKey = "";
                statusDiv.textContent = `🗑️ ${type}已清除`;
                if (isCapturing) {
                    stopCapture();
                }
            });

            inputContainer.appendChild(mainInput);
            inputContainer.appendChild(clearButton);
            container.appendChild(inputContainer);
            container.appendChild(statusDiv);

            // 主题更新函数
            const updateTheme = (isDark) => {
                label.style.color = getTextColor(isDark);
                statusDiv.style.color = getTextColor(isDark);

                if (!isCapturing) {
                    styleInputField(mainInput, isDark);
                }

                clearButton.style.color = getTextColor(isDark);
                clearButton.style.borderColor = getBorderColor(isDark);
                clearButton.style.backgroundColor = getInputBackgroundColor(isDark);

                clearButton.onmouseover = () => {
                    clearButton.style.backgroundColor = getHoverColor(isDark);
                    clearButton.style.borderColor = "#F44336";
                };
                clearButton.onmouseout = () => {
                    clearButton.style.backgroundColor = getInputBackgroundColor(isDark);
                    clearButton.style.borderColor = getBorderColor(isDark);
                };
            };

            // 获取键值的函数
            const getValue = () => {
                return mainInput.value.trim();
            };

            // 初始化主题
            updateTheme(isDarkMode);
            addThemeChangeListener(updateTheme);

            // 返回包含获取值函数的对象
            const result = { container };
            result[methodName] = getValue; // 动态设置方法名
            return result;
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

    // ==============================
    // 10. 样式注入与辅助函数
    // ==============================
    function injectStyles() {
        if (document.getElementById('poe-shortcut-styles')) return;
        const styleEl = document.createElement('style');
        styleEl.id = 'poe-shortcut-styles';
        styleEl.textContent = `
            #poe-settings-panel .dragging { opacity: 0.6; background: ${getPrimaryColor()}; color: #fff !important; }
            #poe-settings-panel .dragover { background-color: ${getPrimaryColor()}20; }
            .poe-shortcut-toast { position: fixed; top: 20px; right: 20px; background: var(--toast-bg, #333); color: var(--toast-color, #fff); border: var(--toast-border, 1px solid #333); padding: 12px 20px; border-radius: 8px; font-size: 14px; z-index: 10000; opacity: 0; transform: translateY(-20px); transition: all 0.3s ease; box-shadow: 0 4px 12px rgba(0,0,0,0.15); max-width: 300px; pointer-events: none; }
            .poe-shortcut-toast.show { opacity: 1; transform: translateY(0); }
            .poe-shortcut-toast.error { background: #dc3545 !important; color: white !important; border: none !important; }
            .poe-shortcut-toast.success { background: #28a745 !important; color: white !important; border: none !important; }
            .poe-shortcut-toast.info { background: #17a2b8 !important; color: white !important; border: none !important; }
            .poe-shortcut-toast.warning { background: #ffc107 !important; color: #212529 !important; border: none !important; }
            .poe-shortcut-toast.loading::after { content: ''; display: inline-block; width: 12px; height: 12px; margin-left: 8px; border: 2px solid transparent; border-top-color: currentColor; border-radius: 50%; animation: spin 1s linear infinite; vertical-align: middle; }
            @keyframes spin { 100% { transform: rotate(360deg); } }
            #poe-shortcut-tbody.is-dragging tr { opacity: 0.5; }
            #poe-shortcut-tbody tr.dragging { opacity: 1 !important; background-color: ${getPrimaryColor()}30 !important; box-shadow: 0 2px 8px rgba(0,0,0,0.2); }
            #poe-shortcut-tbody tr.dragover-top { border-top: 2px dashed ${getPrimaryColor()}; }
            #poe-shortcut-tbody tr.dragover-bottom { border-bottom: 2px dashed ${getPrimaryColor()}; }
        `;
        document.head.appendChild(styleEl);
    }

    function escapeHtml(unsafe) { return unsafe.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#039;"); }

    function styleTableHeader(th, isDark = isDarkMode) { Object.assign(th.style, { borderBottom: `2px solid ${getBorderColor(isDark)}`, padding: "10px 8px", textAlign: th.style.textAlign || "left", background: getTableHeaderBackground(isDark), fontWeight: "bold", position: "sticky", top: "-1px", zIndex: "1", color: getTextColor(isDark) }); }
    function styleTableCell(td, isDark = isDarkMode) { Object.assign(td.style, { padding: "10px 8px", borderBottom: `1px solid ${getBorderColor(isDark)}`, verticalAlign: "middle", color: getTextColor(isDark), fontSize: "14px" }); }
    function styleButton(btn, bgColor, hoverColor, isDark = isDarkMode) { Object.assign(btn.style, { background: bgColor, border: `1px solid ${bgColor}`, color: "#fff", borderRadius: "6px", padding: "8px 16px", cursor: "pointer", fontSize: "14px", fontWeight: "500", transition: "background-color 0.2s ease, border-color 0.2s ease" }); btn.onmouseover = () => { btn.style.background = hoverColor; btn.style.borderColor = hoverColor; }; btn.onmouseout = () => { btn.style.background = bgColor; btn.style.borderColor = bgColor; }; btn.onfocus = () => (btn.style.boxShadow = `0 0 0 2px ${getPanelBackgroundColor(isDark)}, 0 0 0 4px ${getPrimaryColor()}`); btn.onblur = () => (btn.style.boxShadow = 'none'); }
    function styleTransparentButton(btn, textColor, hoverBg, isDark = isDarkMode) { Object.assign(btn.style, { background: "transparent", color: textColor, border: "none", borderRadius: "4px", padding: "6px 8px", cursor: "pointer", fontSize: "16px", lineHeight: "1", transition: "background-color 0.2s ease" }); btn.onmouseover = () => { btn.style.background = hoverBg; }; btn.onmouseout = () => { btn.style.background = "transparent"; }; }
    function styleInputField(input, isDark = isDarkMode) { Object.assign(input.style, { boxSizing: "border-box", width: "100%", padding: "8px 10px", border: `1px solid ${getBorderColor(isDark)}`, borderRadius: "6px", fontSize: "14px", outline: "none", background: getInputBackgroundColor(isDark), color: getTextColor(isDark), transition: "border-color 0.2s ease, box-shadow 0.2s ease, background-color 0.2s ease" }); input.onfocus = () => { input.style.borderColor = getPrimaryColor(); input.style.boxShadow = `0 0 0 1px ${getPrimaryColor()}`; }; input.onblur = () => { input.style.borderColor = getBorderColor(isDark); input.style.boxShadow = 'none'; }; }

    function getOverlayBackgroundColor(isDark = isDarkMode) { return isDark ? "rgba(0, 0, 0, 0.7)" : "rgba(0, 0, 0, 0.5)"; }
    function getPanelBackgroundColor(isDark = isDarkMode) { return isDark ? "#1a1a1a" : "#ffffff"; }
    function getInputBackgroundColor(isDark = isDarkMode) { return isDark ? "#2d2d2d" : "#f9f9f9"; }
    function getTextColor(isDark = isDarkMode) { return isDark ? "#ffffff" : "#1a1a1a"; }
    function getBorderColor(isDark = isDarkMode) { return isDark ? "#404040" : "#e0e0e0"; }
    function getTableHeaderBackground(isDark = isDarkMode) { return isDark ? "#2d2d2d" : "#f5f5f5"; }
    function getHoverColor(isDark = isDarkMode) { return isDark ? "rgba(255, 255, 255, 0.1)" : "rgba(0, 0, 0, 0.05)"; }
    function getPrimaryColor() { return "#5D5CDE"; }

    // ==============================
    // 11. 初始化
    // ==============================
    function init() {
        detectInitialDarkMode();
        setupDarkModeObserver();
        injectStyles();
        console.log('[Poe Shortcut Enhanced] Script loaded and initialized.');
    }

    init();

})();