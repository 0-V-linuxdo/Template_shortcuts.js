// ==UserScript==
// @name         [Template] 快捷键跳转 20250924
// @namespace    0_V userscripts/[Template] shortcut
// @version      1.0.1
// @description  提供可复用的快捷键管理模板(支持URL跳转/元素点击/按键模拟、可视化设置面板、按类型筛选、深色模式、自适应布局、图标缓存、快捷键捕获等功能)。
// @author       You
// @match        *://*/*
// @grant        GM_registerMenuCommand
// @grant        GM_getValue
// @grant        GM_setValue
// @grant        GM_xmlhttpRequest
// @connect      *
// @icon         https://raw.githubusercontent.com/favicon.ico
// ==/UserScript==

(function (global) {
    'use strict';

    /* ------------------------------------------------------------------
     * 1. 常量定义 & 工具函数
     * ------------------------------------------------------------------ */

    const DEFAULT_OPTIONS = {
        version: '20250924',
        menuCommandLabel: '设置快捷键',
        panelTitle: '自定义快捷键',
        storageKeys: {
            shortcuts: 'shortcut_engine_shortcuts_v1',
            iconCachePrefix: 'shortcut_engine_icon_cache_v1::',
            userIcons: 'shortcut_engine_user_icons_v1'
        },
        ui: {
            idPrefix: 'shortcut',
            cssPrefix: 'shortcut',
            compactBreakpoint: 800
        },
        defaultIconURL: '',
        iconLibrary: [],
        protectedIconUrls: [],
        defaultShortcuts: [],
        customActions: {},
        colors: {
            primary: '#0066cc'
        },
        consoleTag: '[ShortcutEngine]',
        shouldBypassIconCache: null,
        resolveUrlTemplate: null,
        getCurrentSearchTerm: null,
        placeholderToken: '%s',
        text: {
            stats: {
                total: '总计',
                url: 'URL跳转',
                selector: '元素点击',
                simulate: '按键模拟',
                custom: '自定义动作'
            },
            buttons: {
                addShortcut: '添加新快捷键',
                saveAndClose: '保存并关闭',
                confirm: '确定',
                cancel: '取消',
                delete: '删除',
                edit: '编辑',
                clear: '清除'
            },
            dialogs: {
                alert: '提示',
                confirm: '确认',
                prompt: '输入'
            },
            hints: {
                hotkey: '点击此处，然后按下快捷键组合',
                simulate: '点击此处，然后按下要模拟的按键组合',
                hotkeyHelp: '💡 支持 Ctrl/Shift/Alt/Cmd + 字母/数字/功能键等组合',
                simulateHelp: '⚡ 将模拟这个按键组合发送到网页'
            },
            menuLabelFallback: '打开快捷键设置'
        }
    };

    const URL_METHODS = {
        current: {
            name: "当前窗口",
            options: {
                href: { name: "location.href", desc: "标准跳转，会在历史记录中新增条目" },
                replace: { name: "location.replace", desc: "替换当前页面，不会在历史记录中新增条目" }
            }
        },
        spa: {
            name: "SPA路由",
            options: {
                pushState: { name: "history.pushState", desc: "推送新状态到历史记录，适合SPA导航" },
                replaceState: { name: "history.replaceState", desc: "替换当前历史记录状态，不增加新条目" }
            }
        },
        newWindow: {
            name: "新窗口",
            options: {
                open: { name: "window.open", desc: "在新标签页中打开链接" },
                popup: { name: "popup弹窗", desc: "在新弹窗中打开链接" }
            }
        }
    };

    function deepMerge(target, source) {
        if (!source) return target;
        Object.keys(source).forEach(key => {
            const value = source[key];
            if (Array.isArray(value)) {
                target[key] = value.slice();
            } else if (value && typeof value === 'object') {
                if (!target[key] || typeof target[key] !== 'object') target[key] = {};
                deepMerge(target[key], value);
            } else {
                target[key] = value;
            }
        });
        return target;
    }

    function clone(obj) {
        if (Array.isArray(obj)) return obj.map(item => clone(item));
        if (obj && typeof obj === 'object') {
            const res = {};
            Object.keys(obj).forEach(k => res[k] = clone(obj[k]));
            return res;
        }
        return obj;
    }

    function noop() {}

    /* ------------------------------------------------------------------
     * 2. 核心创建函数
     * ------------------------------------------------------------------ */

    function createShortcutEngine(userOptions = {}) {
        const options = deepMerge(deepMerge({}, DEFAULT_OPTIONS), userOptions || {});
        options.colors = deepMerge(deepMerge({}, DEFAULT_OPTIONS.colors), userOptions.colors || {});
        options.ui = deepMerge(deepMerge({}, DEFAULT_OPTIONS.ui), userOptions.ui || {});
        options.text = deepMerge(deepMerge({}, DEFAULT_OPTIONS.text), userOptions.text || {});
        options.iconLibrary = Array.isArray(options.iconLibrary) ? options.iconLibrary.slice() : [];
        options.protectedIconUrls = Array.isArray(options.protectedIconUrls) ? options.protectedIconUrls.slice() : [];
        options.defaultShortcuts = Array.isArray(options.defaultShortcuts) ? clone(options.defaultShortcuts) : [];

        const idPrefix = options.ui.idPrefix || 'shortcut';
        const cssPrefix = options.ui.cssPrefix || idPrefix;

        const ids = {
            settingsOverlay: `${idPrefix}-settings-overlay`,
            settingsPanel: `${idPrefix}-settings-panel`,
            stats: `${idPrefix}-shortcut-stats`,
            tableBody: `${idPrefix}-shortcut-tbody`,
            editOverlay: `${idPrefix}-edit-overlay`,
            editForm: `${idPrefix}-edit-form`
        };

        const classes = {
            filterButton: `${cssPrefix}-filter-button`,
            compactContainer: `${cssPrefix}-compact-container`,
            compactCard: `${cssPrefix}-compact-card`
        };

        const state = {
            isSettingsPanelOpen: false,
            isCompactMode: false,
            scrollLock: {
                isLocked: false,
                originalBodyOverflow: '',
                originalBodyPosition: '',
                originalBodyTop: '',
                originalBodyLeft: '',
                originalBodyWidth: '',
                scrollTop: 0,
                scrollLeft: 0
            },
            isDarkMode: false,
            currentFilter: 'all',
            currentPanelOverlay: null,
            destroyResponsiveListener: null,
            filterChangedEventName: `${idPrefix}-filterChanged`
        };

        const GMX = (typeof GM_xmlhttpRequest === 'function')
            ? GM_xmlhttpRequest
            : (typeof GM !== 'undefined' && GM.xmlHttpRequest ? GM.xmlHttpRequest : null);

        let engineApi = null;
        let shortcuts = loadShortcuts();

        /* ------------------ 通用工具函数 ------------------ */

        function safeGMGet(key, fallback) {
            try {
                if (typeof GM_getValue === 'function') {
                    return GM_getValue(key, fallback);
                }
            } catch (err) {
                console.warn(`${options.consoleTag} GM_getValue error`, err);
            }
            return fallback;
        }
        function safeGMSet(key, value) {
            try {
                if (typeof GM_setValue === 'function') {
                    GM_setValue(key, value);
                }
            } catch (err) {
                console.warn(`${options.consoleTag} GM_setValue error`, err);
            }
        }

        function loadShortcuts() {
            const stored = safeGMGet(options.storageKeys.shortcuts, options.defaultShortcuts);
            const list = Array.isArray(stored) ? stored : [];
            return list.map(s => ({
                name: s.name || "",
                actionType: s.actionType || (s.url ? 'url' : (s.selector ? 'selector' : (s.simulateKeys ? 'simulate' : (s.customAction ? 'custom' : '')))),
                url: s.url || "",
                urlMethod: s.urlMethod || "current",
                urlAdvanced: s.urlAdvanced || "href",
                selector: s.selector || "",
                simulateKeys: s.simulateKeys || "",
                customAction: s.customAction || "",
                hotkey: s.hotkey || "",
                icon: s.icon || ""
            }));
        }

        function saveShortcuts() {
            safeGMSet(options.storageKeys.shortcuts, shortcuts);
        }

        function getDefaultIconURL() {
            if (options.defaultIconURL) return options.defaultIconURL;
            if (options.iconLibrary.length > 0) return options.iconLibrary[0].url || "";
            return "";
        }

        function getCachedIconDataURL(url) {
            try { return safeGMGet(options.storageKeys.iconCachePrefix + url, ""); } catch { return ""; }
        }
        function saveCachedIconDataURL(url, dataURL) {
            safeGMSet(options.storageKeys.iconCachePrefix + url, dataURL);
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

        function shouldBypassIconCache(url) {
            try {
                if (typeof options.shouldBypassIconCache === 'function') {
                    return !!options.shouldBypassIconCache(url);
                }
            } catch (err) {
                console.warn(`${options.consoleTag} shouldBypassIconCache error`, err);
            }
            return false;
        }

        function setIconImage(imgEl, iconUrl) {
            const fallback = getDefaultIconURL();
            if (!iconUrl) {
                imgEl.src = fallback;
                return;
            }
            if (iconUrl.startsWith("data:") || iconUrl.startsWith("blob:")) {
                imgEl.src = iconUrl;
                return;
            }

            if (shouldBypassIconCache(iconUrl)) {
                imgEl.src = iconUrl;
                imgEl.onerror = () => {
                    imgEl.onerror = null;
                    imgEl.src = fallback;
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
                        imgEl.src = fallback;
                    }
                });
            };
            imgEl.addEventListener('error', onErr, { once: true });
        }

        function debounce(fn, delay = 300) {
            let t = null;
            return function(...args) {
                clearTimeout(t);
                t = setTimeout(() => fn.apply(this, args), delay);
            };
        }

        function enableScrollLock() {
            if (state.scrollLock.isLocked) return;
            const lock = state.scrollLock;

            lock.scrollTop = window.pageYOffset || document.documentElement.scrollTop;
            lock.scrollLeft = window.pageXOffset || document.documentElement.scrollLeft;
            lock.originalBodyOverflow = document.body.style.overflow || '';
            lock.originalBodyPosition = document.body.style.position || '';
            lock.originalBodyTop = document.body.style.top || '';
            lock.originalBodyLeft = document.body.style.left || '';
            lock.originalBodyWidth = document.body.style.width || '';

            document.body.style.overflow = 'hidden';
            document.body.style.position = 'fixed';
            document.body.style.top = `-${lock.scrollTop}px`;
            document.body.style.left = `-${lock.scrollLeft}px`;
            document.body.style.width = '100%';

            lock.isLocked = true;

            document.addEventListener('wheel', preventScrollEvent, { passive: false, capture: true });
            document.addEventListener('touchmove', preventScrollEvent, { passive: false, capture: true });
            document.addEventListener('scroll', preventScrollEvent, { passive: false, capture: true });
            document.addEventListener('keydown', preventScrollKeyEvent, { passive: false, capture: true });
        }

        function disableScrollLock() {
            if (!state.scrollLock.isLocked) return;
            const lock = state.scrollLock;

            document.removeEventListener('wheel', preventScrollEvent, { capture: true });
            document.removeEventListener('touchmove', preventScrollEvent, { capture: true });
            document.removeEventListener('scroll', preventScrollEvent, { capture: true });
            document.removeEventListener('keydown', preventScrollKeyEvent, { capture: true });

            document.body.style.overflow = lock.originalBodyOverflow;
            document.body.style.position = lock.originalBodyPosition;
            document.body.style.top = lock.originalBodyTop;
            document.body.style.left = lock.originalBodyLeft;
            document.body.style.width = lock.originalBodyWidth;

            window.scrollTo(lock.scrollLeft, lock.scrollTop);
            lock.isLocked = false;
        }

        function preventScrollEvent(e) {
            if (isEventFromPanel(e)) return;
            e.preventDefault();
            e.stopPropagation();
            return false;
        }

        function preventScrollKeyEvent(e) {
            const scrollKeys = ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'PageUp', 'PageDown', 'Home', 'End', 'Space'];
            if (scrollKeys.includes(e.code) || scrollKeys.includes(e.key)) {
                if (isEventFromScrollableElement(e)) return;
                e.preventDefault();
                e.stopPropagation();
                return false;
            }
        }

        function isEventFromPanel(e) {
            if (!e.target) return false;
            const panel = document.getElementById(ids.settingsPanel);
            const edit = document.getElementById(ids.editForm);
            return (panel && panel.contains(e.target)) || (edit && edit.contains(e.target));
        }

        function isEventFromScrollableElement(e) {
            if (!e.target) return false;
            let element = e.target;
            while (element && element !== document.body) {
                const style = window.getComputedStyle(element);
                const isScrollable = style.overflowY === 'auto' ||
                                    style.overflowY === 'scroll' ||
                                    style.overflow === 'auto' ||
                                    style.overflow === 'scroll';

                if (isScrollable) {
                    return isEventFromPanel(e);
                }
                element = element.parentElement;
            }
            return false;
        }

        function getShortcutStats() {
            const stats = {
                total: shortcuts.length,
                url: 0,
                selector: 0,
                simulate: 0,
                custom: 0
            };
            shortcuts.forEach(shortcut => {
                if (shortcut.actionType === 'url') stats.url++;
                else if (shortcut.actionType === 'selector') stats.selector++;
                else if (shortcut.actionType === 'simulate') stats.simulate++;
                else if (shortcut.actionType === 'custom') stats.custom++;
            });
            return stats;
        }

        function filterShortcutsByType(type) {
            if (type === 'all') return shortcuts;
            return shortcuts.filter(shortcut => shortcut.actionType === type);
        }

        function shouldUseCompactMode(container) {
            if (!container) return false;
            const containerWidth = container.offsetWidth;
            return containerWidth < (options.ui.compactBreakpoint || 800);
        }

        function createResponsiveListener(container, callback) {
            if (!window.ResizeObserver) {
                const handleResize = debounce(() => {
                    const newCompactMode = shouldUseCompactMode(container);
                    if (newCompactMode !== state.isCompactMode) {
                        state.isCompactMode = newCompactMode;
                        callback(state.isCompactMode);
                    }
                }, 200);
                window.addEventListener('resize', handleResize);
                return () => window.removeEventListener('resize', handleResize);
            }

            const resizeObserver = new ResizeObserver(debounce((entries) => {
                for (const entry of entries) {
                    const newCompactMode = shouldUseCompactMode(entry.target);
                    if (newCompactMode !== state.isCompactMode) {
                        state.isCompactMode = newCompactMode;
                        callback(state.isCompactMode);
                    }
                }
            }, 100));

            resizeObserver.observe(container);
            return () => resizeObserver.disconnect();
        }

        function getUrlMethodDisplayText(method) {
            const methodConfig = URL_METHODS[method];
            if (!methodConfig) return "未知跳转方式";
            return methodConfig.name;
        }

        const darkModeListeners = [];
        function addThemeChangeListener(callback) {
            if (typeof callback === 'function' && !darkModeListeners.includes(callback)) {
                darkModeListeners.push(callback);
            }
        }
        function removeThemeChangeListener(callback) {
            const idx = darkModeListeners.indexOf(callback);
            if (idx !== -1) darkModeListeners.splice(idx, 1);
        }
        function notifyThemeChangeListeners() {
            darkModeListeners.forEach(callback => {
                try { callback(state.isDarkMode); } catch (e) {
                    console.error(`${options.consoleTag} theme change listener error`, e);
                }
            });
        }

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
                    console.warn(`${options.consoleTag} Could not compute background color.`);
                }
            }
            if (state.isDarkMode !== detectedDarkMode) {
                state.isDarkMode = detectedDarkMode;
                notifyThemeChangeListeners();
            }
        }

        function isColorDark(colorStr) {
            if (!colorStr || colorStr === 'transparent')
                return window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
            try {
                let r, g, b, a = 1;
                if (colorStr.startsWith('rgba')) {
                    const parts = colorStr.match(/rgba?\s*$\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*(?:,\s*([\d.]+))?\s*$/i);
                    if (!parts) return window.matchMedia('(prefers-color-scheme: dark)').matches;
                    [, r, g, b, a] = parts.map(Number);
                    a = isNaN(a) ? 1 : a;
                    if (a < 0.5) return false;
                } else if (colorStr.startsWith('rgb')) {
                    const parts = colorStr.match(/rgb\s*$\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*$/i);
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
                console.warn(`${options.consoleTag} Error parsing color:`, colorStr, e);
                return window.matchMedia('(prefers-color-scheme: dark)').matches;
            }
        }

        function setupDarkModeObserver() {
            if (window.matchMedia) {
                const darkModeMediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
                const listener = (e) => { detectInitialDarkMode(); };
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
            observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class', 'data-theme'] });
            if (document.body) {
                observer.observe(document.body, { attributes: true, attributeFilter: ['class', 'data-theme'] });
            }
            setInterval(() => { detectInitialDarkMode(); }, 5000);
            detectInitialDarkMode();
        }

        const ENHANCED_KEY_MAP = {
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
            'ArrowUp': { display: '↑', standard: 'ARROWUP' },
            'ArrowDown': { display: '↓', standard: 'ARROWDOWN' },
            'ArrowLeft': { display: '←', standard: 'ARROWLEFT' },
            'ArrowRight': { display: '→', standard: 'ARROWRIGHT' },
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

        const KEY_EVENT_MAP = (() => {
            const map = Object.create(null);
            const add = (standard, key, code) => { map[standard] = { key, code }; };

            for (let charCode = 65; charCode <= 90; charCode++) {
                const letter = String.fromCharCode(charCode);
                add(letter, letter.toLowerCase(), `Key${letter}`);
            }

            for (let digit = 0; digit <= 9; digit++) {
                add(String(digit), String(digit), `Digit${digit}`);
            }

            for (let f = 1; f <= 24; f++) {
                add(`F${f}`, `F${f}`, `F${f}`);
            }

            add('SPACE', ' ', 'Space');
            add('ENTER', 'Enter', 'Enter');
            add('RETURN', 'Enter', 'Enter');
            add('ESC', 'Escape', 'Escape');
            add('ESCAPE', 'Escape', 'Escape');
            add('BACKSPACE', 'Backspace', 'Backspace');
            add('DELETE', 'Delete', 'Delete');
            add('TAB', 'Tab', 'Tab');
            add('INSERT', 'Insert', 'Insert');
            add('HOME', 'Home', 'Home');
            add('END', 'End', 'End');
            add('PAGEUP', 'PageUp', 'PageUp');
            add('PAGEDOWN', 'PageDown', 'PageDown');
            add('ARROWUP', 'ArrowUp', 'ArrowUp');
            add('ARROWDOWN', 'ArrowDown', 'ArrowDown');
            add('ARROWLEFT', 'ArrowLeft', 'ArrowLeft');
            add('ARROWRIGHT', 'ArrowRight', 'ArrowRight');
            add('CAPSLOCK', 'CapsLock', 'CapsLock');
            add('PRINTSCREEN', 'PrintScreen', 'PrintScreen');
            add('SCROLLLOCK', 'ScrollLock', 'ScrollLock');
            add('PAUSE', 'Pause', 'Pause');
            add('CONTEXTMENU', 'ContextMenu', 'ContextMenu');

            add(';', ';', 'Semicolon');
            add('=', '=', 'Equal');
            add(',', ',', 'Comma');
            add('-', '-', 'Minus');
            add('.', '.', 'Period');
            add('/', '/', 'Slash');
            add('`', '`', 'Backquote');
            add('[', '[', 'BracketLeft');
            add('\\', '\\', 'Backslash');
            add(']', ']', 'BracketRight');
            add("'", "'", 'Quote');

            for (let n = 0; n <= 9; n++) {
                add(`NUMPAD${n}`, String(n), `Numpad${n}`);
            }
            add('NUMPADADD', '+', 'NumpadAdd');
            add('NUMPADSUBTRACT', '-', 'NumpadSubtract');
            add('NUMPADMULTIPLY', '*', 'NumpadMultiply');
            add('NUMPADDIVIDE', '/', 'NumpadDivide');
            add('NUMPADDECIMAL', '.', 'NumpadDecimal');
            add('NUMPADENTER', 'Enter', 'NumpadEnter');

            return Object.freeze(map);
        })();

        function isInHotkeyCaptureMode() {
            const activeEl = document.activeElement;
            if (!activeEl) return false;
            return activeEl.readOnly &&
                   activeEl.type === 'text' &&
                   (activeEl.placeholder.includes('请按下') ||
                    activeEl.placeholder.includes('点击此处，然后按下'));
        }

        function isInAllowedInputElement() {
            const activeEl = document.activeElement;
            if (!activeEl) return false;
            const allowedTags = ['INPUT', 'TEXTAREA', 'SELECT'];
            const isAllowedTag = allowedTags.includes(activeEl.tagName);
            const isContentEditable = activeEl.isContentEditable;
            const isHotkeyCapturer = isInHotkeyCaptureMode();
            return (isAllowedTag || isContentEditable) && !isHotkeyCapturer;
        }

        function isAllowedShortcut(e) {
            const key = e.key.toLowerCase();
            const code = e.code;

            if (['F1', 'F2', 'F3', 'F4', 'F5', 'F6', 'F7', 'F8', 'F9', 'F10', 'F11', 'F12'].includes(code)) {
                return true;
            }

            if (e.ctrlKey || e.metaKey) {
                if (['c', 'v', 'x', 'a', 'z', 'y', 's'].includes(key) && !e.altKey) {
                    return true;
                }
                if ((key === 'i' && e.shiftKey) ||
                    (key === 'j' && e.shiftKey) ||
                    (key === 'c' && e.shiftKey) ||
                    (key === 'u')) {
                    return true;
                }
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
                if (key === '=' || key === '+' ||
                    key === '-' ||
                    key === '0') {
                    return true;
                }
                if (['1', '2', '3', '4', '5', '6', '7', '8', '9'].includes(key)) {
                    return true;
                }
            }

            if (e.altKey) {
                if (['ArrowLeft', 'ArrowRight'].includes(code) ||
                    key === 'd' ||
                    key === 'f4') {
                    return true;
                }
            }

            if (code === 'F11') {
                return true;
            }

            return false;
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

        function jumpToUrl(targetUrl, method = "current", advanced = "href") {
            try {
                let finalUrl = resolveTemplateUrl(targetUrl);
                switch (method) {
                    case 'current':
                        executeCurrentWindowJump(finalUrl, advanced);
                        break;
                    case 'spa':
                        executeSpaNavigation(finalUrl, advanced);
                        break;
                    case 'newWindow':
                        executeNewWindowJump(finalUrl, advanced);
                        break;
                    default:
                        console.warn(`${options.consoleTag} Unknown URL method: ${method}, fallback to current window`);
                        executeCurrentWindowJump(finalUrl, advanced);
                }
            } catch (e) {
                console.error(`${options.consoleTag} Invalid URL or error in jumpToUrl:`, targetUrl, e);
                showAlert(`无效的跳转网址或发生错误: ${targetUrl}`);
            }
        }

        function resolveTemplateUrl(targetUrl) {
            if (typeof options.resolveUrlTemplate === 'function') {
                try {
                    const resolved = options.resolveUrlTemplate(targetUrl, {
                        getCurrentSearchTerm: options.getCurrentSearchTerm,
                        placeholderToken: options.placeholderToken
                    });
                    if (resolved) return resolved;
                } catch (err) {
                    console.warn(`${options.consoleTag} resolveUrlTemplate error`, err);
                }
            }
            const placeholder = options.placeholderToken || '%s';
            if (targetUrl.includes(placeholder)) {
                let keyword = null;
                try {
                    if (typeof options.getCurrentSearchTerm === 'function') {
                        keyword = options.getCurrentSearchTerm();
                    } else {
                        const urlParams = new URL(location.href).searchParams;
                        keyword = urlParams.get('q');
                    }
                } catch (err) {
                    console.warn(`${options.consoleTag} getCurrentSearchTerm error`, err);
                }
                if (keyword !== null && keyword !== undefined) {
                    return targetUrl.replaceAll(placeholder, encodeURIComponent(keyword));
                } else {
                    if (placeholder === '%s' && targetUrl.includes('?')) {
                        return targetUrl.substring(0, targetUrl.indexOf('?'));
                    }
                    return targetUrl.replaceAll(placeholder, '');
                }
            }
            return targetUrl;
        }

        function executeCurrentWindowJump(url, advanced) {
            switch (advanced) {
                case 'href':
                    window.location.href = url;
                    break;
                case 'replace':
                    window.location.replace(url);
                    break;
                default:
                    window.location.href = url;
            }
        }

        function executeSpaNavigation(url, advanced) {
            try {
                const urlObj = new URL(url, window.location.origin);
                const title = document.title;
                switch (advanced) {
                    case 'pushState':
                        window.history.pushState({ url: url }, title, urlObj.pathname + urlObj.search + urlObj.hash);
                        window.dispatchEvent(new PopStateEvent('popstate', { state: { url: url } }));
                        break;
                    case 'replaceState':
                        window.history.replaceState({ url: url }, title, urlObj.pathname + urlObj.search + urlObj.hash);
                        window.dispatchEvent(new PopStateEvent('popstate', { state: { url: url } }));
                        break;
                    default:
                        window.history.pushState({ url: url }, title, urlObj.pathname + urlObj.search + urlObj.hash);
                        window.dispatchEvent(new PopStateEvent('popstate', { state: { url: url } }));
                }
            } catch (e) {
                console.warn(`${options.consoleTag} SPA navigation failed, fallback to location.href:`, e);
                window.location.href = url;
            }
        }

        function executeNewWindowJump(url, advanced) {
            switch (advanced) {
                case 'open':
                    window.open(url, '_blank', 'noopener,noreferrer');
                    break;
                case 'popup':
                    const popup = window.open(url, '_blank', 'width=800,height=600,scrollbars=yes,resizable=yes,status=yes,location=yes,menubar=yes,toolbar=yes');
                    if (popup) {
                        popup.focus();
                    } else {
                        console.warn(`${options.consoleTag} Popup blocked, fallback to normal open`);
                        window.open(url, '_blank', 'noopener,noreferrer');
                    }
                    break;
                default:
                    window.open(url, '_blank', 'noopener,noreferrer');
            }
        }

        function clickElement(selector) {
            let element = null;
            try {
                element = document.querySelector(selector);
                if (selector.includes('input[type="checkbox"]') && element) {
                    element.click();
                    return;
                }
                if (selector.includes('label') && element) {
                    element.click();
                    return;
                }
                if (!element && selector.includes('>')) {
                    const potentialChild = document.querySelector(selector);
                    if (potentialChild) {
                        element = potentialChild.closest('button, a, [role="button"], [onclick]');
                    }
                }
            } catch (e) {
                console.error(`${options.consoleTag} Error finding element with selector "${selector}":`, e);
                showAlert(`无法找到元素: ${selector}\n错误: ${e.message}`);
                return;
            }
            if (element && typeof element.click === 'function') {
                element.click();
            } else if (element) {
                console.warn(`${options.consoleTag} Element found but not clickable via .click(): ${selector}`, element);
                try {
                    const clickEvent = new MouseEvent('click', { bubbles: true, cancelable: true, view: window });
                    element.dispatchEvent(clickEvent);
                } catch (eventError) {
                    console.error(`${options.consoleTag} Failed to dispatch click event on element: ${selector}`, eventError);
                    showAlert(`无法模拟点击元素: ${selector}`);
                }
            }
        }

        function simulateKeystroke(keyString) {
            if (!keyString) return;
            const parts = keyString.toUpperCase().split('+');
            const mainKeyStr = parts.pop();
            const modifiers = parts;

            if (!mainKeyStr) {
                console.warn(`${options.consoleTag} Invalid simulateKeys string (missing main key):`, keyString);
                return;
            }

            const keyProps = KEY_EVENT_MAP[mainKeyStr];
            if (!keyProps) {
                console.warn(`${options.consoleTag} Unknown main key for simulation:`, mainKeyStr, "in", keyString);
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
                metaKey: modifiers.includes("META") || modifiers.includes("CMD"),
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
                console.error(`${options.consoleTag} Error dispatching simulated keyboard event:`, e);
            }
        }

        function showAlert(message, title = options.text.dialogs.alert || "提示") {
            const modal = document.createElement('div');
            modal.className = `${cssPrefix}-custom-modal`;
            Object.assign(modal.style, {
                position: 'fixed', top: '0', left: '0', width: '100vw', height: '100vh',
                backgroundColor: getOverlayBackgroundColor(state.isDarkMode), zIndex: '999999',
                display: 'flex', alignItems: 'center', justifyContent: 'center'
            });

            const dialog = document.createElement('div');
            Object.assign(dialog.style, {
                background: getPanelBackgroundColor(state.isDarkMode), borderRadius: '8px',
                padding: '20px', maxWidth: '400px', width: '90%', maxHeight: '80vh',
                boxShadow: '0 4px 12px rgba(0,0,0,0.3)', color: getTextColor(state.isDarkMode)
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
            okButton.textContent = options.text.buttons.confirm || '确定';
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

        function showConfirmDialog(message, onConfirm, title = options.text.dialogs.confirm || "确认") {
            const modal = document.createElement('div');
            modal.className = `${cssPrefix}-custom-modal`;
            Object.assign(modal.style, {
                position: 'fixed', top: '0', left: '0', width: '100vw', height: '100vh',
                backgroundColor: getOverlayBackgroundColor(state.isDarkMode), zIndex: '999999',
                display: 'flex', alignItems: 'center', justifyContent: 'center'
            });

            const dialog = document.createElement('div');
            Object.assign(dialog.style, {
                background: getPanelBackgroundColor(state.isDarkMode), borderRadius: '8px',
                padding: '20px', maxWidth: '400px', width: '90%', maxHeight: '80vh',
                boxShadow: '0 4px 12px rgba(0,0,0,0.3)', color: getTextColor(state.isDarkMode)
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
            cancelButton.textContent = options.text.buttons.cancel || '取消';
            styleButton(cancelButton, "#9E9E9E", "#757575");
            cancelButton.onclick = () => {
                document.body.removeChild(modal);
            };
            buttonContainer.appendChild(cancelButton);

            const confirmButton = document.createElement('button');
            confirmButton.textContent = options.text.buttons.confirm || '确定';
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

        function showPromptDialog(message, defaultValue = "", onConfirm = null, title = options.text.dialogs.prompt || "输入") {
            const modal = document.createElement('div');
            modal.className = `${cssPrefix}-custom-modal`;
            Object.assign(modal.style, {
                position: 'fixed', top: '0', left: '0', width: '100vw', height: '100vh',
                backgroundColor: getOverlayBackgroundColor(state.isDarkMode), zIndex: '999999',
                display: 'flex', alignItems: 'center', justifyContent: 'center'
            });

            const dialog = document.createElement('div');
            Object.assign(dialog.style, {
                background: getPanelBackgroundColor(state.isDarkMode), borderRadius: '8px',
                padding: '20px', maxWidth: '400px', width: '90%', maxHeight: '80vh',
                boxShadow: '0 4px 12px rgba(0,0,0,0.3)', color: getTextColor(state.isDarkMode)
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
            styleInputField(input, state.isDarkMode);
            input.style.marginBottom = '20px';
            dialog.appendChild(input);

            const buttonContainer = document.createElement('div');
            Object.assign(buttonContainer.style, {
                display: 'flex', justifyContent: 'flex-end', gap: '10px'
            });

            const cancelButton = document.createElement('button');
            cancelButton.textContent = options.text.buttons.cancel || '取消';
            styleButton(cancelButton, "#9E9E9E", "#757575");
            cancelButton.onclick = () => {
                document.body.removeChild(modal);
                if (onConfirm) onConfirm(null);
            };
            buttonContainer.appendChild(cancelButton);

            const confirmButton = document.createElement('button');
            confirmButton.textContent = options.text.buttons.confirm || '确定';
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

        function getPrimaryColor() {
            return options.colors.primary || '#0066cc';
        }

        function getOverlayBackgroundColor(isDark = state.isDarkMode) {
            return isDark ? "rgba(0, 0, 0, 0.7)" : "rgba(0, 0, 0, 0.5)";
        }
        function getPanelBackgroundColor(isDark = state.isDarkMode) {
            return isDark ? "#1a1a1a" : "#ffffff";
        }
        function getInputBackgroundColor(isDark = state.isDarkMode) {
            return isDark ? "#2d2d2d" : "#f9f9f9";
        }
        function getTextColor(isDark = state.isDarkMode) {
            return isDark ? "#ffffff" : "#1a1a1a";
        }
        function getBorderColor(isDark = state.isDarkMode) {
            return isDark ? "#404040" : "#e0e0e0";
        }
        function getTableHeaderBackground(isDark = state.isDarkMode) {
            return isDark ? "#2d2d2d" : "#f5f5f5";
        }
        function getHoverColor(isDark = state.isDarkMode) {
            return isDark ? "rgba(255, 255, 255, 0.1)" : "rgba(0, 0, 0, 0.05)";
        }

        function styleTableHeader(th, isDark = state.isDarkMode) {
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
        function styleTableCell(td, isDark = state.isDarkMode) {
            Object.assign(td.style, {
                padding: "10px 8px",
                borderBottom: `1px solid ${getBorderColor(isDark)}`,
                verticalAlign: "middle",
                color: getTextColor(isDark),
                fontSize: "14px"
            });
        }
        function styleButton(btn, bgColor, hoverColor, isDark = state.isDarkMode) {
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
        function styleTransparentButton(btn, textColor, hoverBg, isDark = state.isDarkMode) {
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
        function styleInputField(input, isDark = state.isDarkMode) {
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

        function createStatsDisplay() {
            const stats = getShortcutStats();
            const container = document.createElement("div");
            container.id = ids.stats;
            Object.assign(container.style, {
                display: "flex",
                alignItems: "center",
                gap: "8px",
                flexWrap: "wrap"
            });

            const filterButtons = [
                { type: 'all', label: options.text.stats.total || "总计", count: stats.total, color: "#0066cc" },
                { type: 'url', label: options.text.stats.url || "URL跳转", count: stats.url, color: "#4CAF50" },
                { type: 'selector', label: options.text.stats.selector || "元素点击", count: stats.selector, color: "#FF9800" },
                { type: 'simulate', label: options.text.stats.simulate || "按键模拟", count: stats.simulate, color: "#9C27B0" },
                { type: 'custom', label: options.text.stats.custom || "自定义动作", count: stats.custom, color: "#607D8B" }
            ];
            filterButtons.forEach(buttonData => {
                if (buttonData.type !== 'all' && buttonData.count === 0) return;
                const button = createFilterButton(buttonData.label, buttonData.count, buttonData.color, buttonData.type);
                container.appendChild(button);
            });
            return container;
        }

        function createFilterButton(label, count, color, filterType) {
            const button = document.createElement("button");
            button.className = classes.filterButton;
            button.dataset.filterType = filterType;
            button.type = "button";
            const isActive = state.currentFilter === filterType;
            Object.assign(button.style, {
                display: "inline-flex",
                alignItems: "center",
                padding: "6px 12px",
                borderRadius: "12px",
                fontSize: "12px",
                fontWeight: "bold",
                color: isActive ? "white" : color,
                backgroundColor: isActive ? color : "transparent",
                border: `2px solid ${color}`,
                whiteSpace: "nowrap",
                minWidth: "fit-content",
                cursor: "pointer",
                transition: "all 0.2s ease",
                outline: "none"
            });
            button.innerHTML = `<span style="margin-right: 6px;">${label}</span><span style="background: ${isActive ? 'rgba(255,255,255,0.3)' : color}; color: ${isActive ? 'white' : 'white'}; padding: 2px 6px; border-radius: 8px;">${count}</span>`;
            button.addEventListener('mouseenter', () => {
                if (state.currentFilter !== filterType) {
                    button.style.backgroundColor = color + "20";
                    button.style.transform = "scale(1.05)";
                }
            });
            button.addEventListener('mouseleave', () => {
                if (state.currentFilter !== filterType) {
                    button.style.backgroundColor = "transparent";
                    button.style.transform = "scale(1)";
                }
            });
            button.addEventListener('click', () => {
                setFilter(filterType);
            });
            return button;
        }

        function setFilter(filterType) {
            if (state.currentFilter === filterType) return;
            state.currentFilter = filterType;
            updateFilterButtonsState();
            const panel = document.getElementById(ids.settingsPanel);
            if (panel) {
                const event = new CustomEvent(state.filterChangedEventName, { detail: { filterType } });
                panel.dispatchEvent(event);
            }
        }

        function updateFilterButtonsState() {
            const buttons = document.querySelectorAll(`.${classes.filterButton}`);
            buttons.forEach(button => {
                const filterType = button.dataset.filterType;
                const isActive = state.currentFilter === filterType;
                const color = getButtonColor(filterType);
                if (isActive) {
                    button.style.backgroundColor = color;
                    button.style.color = "white";
                    button.style.transform = "scale(1)";
                    const countSpan = button.querySelector('span:last-child');
                    if (countSpan) {
                        countSpan.style.background = 'rgba(255,255,255,0.3)';
                        countSpan.style.color = 'white';
                    }
                } else {
                    button.style.backgroundColor = "transparent";
                    button.style.color = color;
                    button.style.transform = "scale(1)";
                    const countSpan = button.querySelector('span:last-child');
                    if (countSpan) {
                        countSpan.style.background = color;
                        countSpan.style.color = 'white';
                    }
                }
            });
        }

        function getButtonColor(filterType) {
            const colorMap = {
                'all': "#0066cc",
                'url': "#4CAF50",
                'selector': "#FF9800",
                'simulate': "#9C27B0",
                'custom': "#607D8B"
            };
            return colorMap[filterType] || "#0066cc";
        }

        function updateStatsDisplay() {
            const existingStats = document.getElementById(ids.stats);
            if (existingStats) {
                const newStats = createStatsDisplay();
                existingStats.parentNode.replaceChild(newStats, existingStats);
            }
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

        /* ------------------------------------------------------------------
         * 键盘事件
         * ------------------------------------------------------------------ */

        function executeCustomAction(item, event) {
            const key = (item && item.customAction) ? String(item.customAction) : "";
            if (!key) {
                console.warn(`${options.consoleTag} Shortcut "${item?.name || ''}" is type 'custom' but has no customAction defined.`);
                return;
            }
            const actions = options.customActions && typeof options.customActions === 'object' ? options.customActions : null;
            const fn = actions ? actions[key] : null;
            if (typeof fn !== 'function') {
                console.warn(`${options.consoleTag} Custom action "${key}" not found or not a function.`);
                return;
            }
            try {
                const res = fn({ shortcut: item, event, engine: engineApi });
                if (res && typeof res.then === 'function') {
                    res.catch(err => console.warn(`${options.consoleTag} Custom action "${key}" rejected:`, err));
                }
            } catch (err) {
                console.warn(`${options.consoleTag} Custom action "${key}" failed:`, err);
            }
        }

        function onKeydown(e) {
            if (state.isSettingsPanelOpen) {
                if (isInHotkeyCaptureMode()) {
                    return;
                }
                if (isAllowedShortcut(e)) {
                    return;
                }
                if (isInAllowedInputElement()) {
                    if (e.ctrlKey || e.altKey || e.metaKey) {
                        e.preventDefault();
                        e.stopPropagation();
                        return;
                    }
                    return;
                }
                e.preventDefault();
                e.stopPropagation();
                return;
            }

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
                                jumpToUrl(item.url, item.urlMethod, item.urlAdvanced);
                            } else {
                                console.warn(`${options.consoleTag} Shortcut "${item.name}" is type 'url' but has no URL defined.`);
                            }
                            break;
                        case 'selector':
                            if (item.selector) {
                                clickElement(item.selector);
                            } else {
                                console.warn(`${options.consoleTag} Shortcut "${item.name}" is type 'selector' but has no selector defined.`);
                            }
                            break;
                        case 'simulate':
                            if (item.simulateKeys) {
                                simulateKeystroke(item.simulateKeys);
                            } else {
                                console.warn(`${options.consoleTag} Shortcut "${item.name}" is type 'simulate' but has no simulateKeys defined.`);
                            }
                            break;
                        case 'custom':
                            executeCustomAction(item, e);
                            break;
                        default:
                            console.warn(`${options.consoleTag} Shortcut "${item.name}" has unknown actionType: ${item.actionType}`);
                    }
                    break;
                }
            }
        }

        /* ------------------------------------------------------------------
         * 设置面板
         * ------------------------------------------------------------------ */

        function openSettingsPanel() {
            if (state.currentPanelOverlay) {
                state.currentPanelOverlay.remove();
                state.currentPanelOverlay = null;
            }
            state.isSettingsPanelOpen = true;
            enableScrollLock();

            const overlay = document.createElement("div");
            overlay.id = ids.settingsOverlay;
            Object.assign(overlay.style, {
                position: "fixed", top: 0, left: 0, width: "100vw", height: "100vh",
                zIndex: "99998", display: "flex", justifyContent: "center", alignItems: "center",
                padding: "20px", boxSizing: "border-box"
            });
            overlay.onclick = (e) => { if (e.target === overlay) closePanel(); };

            const panel = document.createElement("div");
            panel.id = ids.settingsPanel;
            Object.assign(panel.style, {
                borderRadius: "8px", boxShadow: "0 4px 12px rgba(0,0,0,0.2)",
                padding: "20px", fontFamily: "sans-serif", position: "relative",
                opacity: "0", transform: "translateY(20px)",
                transition: "opacity 0.3s ease, transform 0.3s ease",
                maxHeight: "90vh", overflowY: "auto",
                width: "100%", maxWidth: "900px",
                minWidth: "320px"
            });
            panel.onclick = (e) => e.stopPropagation();

            const headerContainer = document.createElement("div");
            Object.assign(headerContainer.style, {
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: "15px",
                paddingBottom: "10px",
                flexWrap: "wrap",
                gap: "10px"
            });

            const title = document.createElement("h2");
            title.textContent = options.panelTitle || '自定义快捷键';
            Object.assign(title.style, {
                margin: "0",
                fontSize: "1.1em",
                flexShrink: "0"
            });
            headerContainer.appendChild(title);

            const statsContainer = createStatsDisplay();
            headerContainer.appendChild(statsContainer);

            panel.appendChild(headerContainer);

            const listContainer = document.createElement("div");
            Object.assign(listContainer.style, {
                maxHeight: "calc(80vh - 150px)", overflowY: "auto", marginBottom: "15px",
                width: "100%", overflowX: "hidden"
            });
            panel.appendChild(listContainer);

            const bottomBar = document.createElement("div");
            Object.assign(bottomBar.style, {
                display: "flex", justifyContent: "space-between", alignItems: "center",
                marginTop: "10px", flexWrap: "wrap", gap: "10px"
            });

            const addBtn = document.createElement("button");
            addBtn.textContent = options.text.buttons.addShortcut || "添加新快捷键";
            addBtn.onclick = () => { editShortcut(); };
            bottomBar.appendChild(addBtn);

            const saveBtn = document.createElement("button");
            saveBtn.textContent = options.text.buttons.saveAndClose || "保存并关闭";
            saveBtn.onclick = () => { saveShortcuts(); closePanel(); };
            bottomBar.appendChild(saveBtn);

            panel.appendChild(bottomBar);
            overlay.appendChild(panel);
            document.body.appendChild(overlay);
            state.currentPanelOverlay = overlay;

            state.isCompactMode = shouldUseCompactMode(panel);

            panel.addEventListener(state.filterChangedEventName, () => {
                renderShortcutsList(state.isDarkMode);
            });

            const updatePanelTheme = (isDark) => {
                overlay.style.backgroundColor = getOverlayBackgroundColor(isDark);
                panel.style.background = getPanelBackgroundColor(isDark);
                panel.style.color = getTextColor(isDark);
                headerContainer.style.borderBottom = `1px solid ${getBorderColor(isDark)}`;
                title.style.color = getTextColor(isDark);
                styleButton(addBtn, "#FF9800", "#F57C00");
                styleButton(saveBtn, "#4CAF50", "#45A049");
                renderShortcutsList(isDark);
            };

            addThemeChangeListener(updatePanelTheme);
            updatePanelTheme(state.isDarkMode);

            requestAnimationFrame(() => {
                panel.style.opacity = "1";
                panel.style.transform = "translateY(0)";
                setTimeout(() => {
                    state.destroyResponsiveListener = createResponsiveListener(panel, (compactMode) => {
                        renderShortcutsList(state.isDarkMode, compactMode);
                    });
                }, 100);
            });

            function renderShortcutsList(isDark = state.isDarkMode, forceCompactMode = null) {
                const useCompactMode = forceCompactMode !== null ? forceCompactMode : shouldUseCompactMode(panel);
                listContainer.innerHTML = "";
                if (useCompactMode) {
                    renderCompactShortcutsList(isDark);
                } else {
                    renderStandardShortcutsList(isDark);
                }
            }

            function renderStandardShortcutsList(isDark = state.isDarkMode) {
                const filteredShortcuts = filterShortcutsByType(state.currentFilter);
                const table = document.createElement("table");
                table.style.width = "100%";
                table.style.borderCollapse = "collapse";
                table.style.tableLayout = "fixed";

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
                tbody.id = ids.tableBody;

                filteredShortcuts.forEach(item => {
                    const originalIndex = shortcuts.findIndex(s => s === item);
                    const row = createStandardTableRow(item, originalIndex, isDark);
                    tbody.appendChild(row);
                });

                table.appendChild(tbody);
                listContainer.appendChild(table);
            }

            function renderCompactShortcutsList(isDark = state.isDarkMode) {
                const filteredShortcuts = filterShortcutsByType(state.currentFilter);
                const container = document.createElement("div");
                container.className = classes.compactContainer;
                Object.assign(container.style, {
                    display: "flex",
                    flexDirection: "column",
                    gap: "12px",
                    width: "100%",
                    alignItems: "flex-start"
                });

                filteredShortcuts.forEach(item => {
                    const originalIndex = shortcuts.findIndex(s => s === item);
                    const card = createCompactCard(item, originalIndex, isDark);
                    container.appendChild(card);
                });
                listContainer.appendChild(container);
            }

            function createStandardTableRow(item, index, isDark) {
                const row = document.createElement("tr");
                setupDragAndDrop(row, index);

                const tdIcon = document.createElement("td");
                styleTableCell(tdIcon, isDark);
                tdIcon.style.textAlign = "center";
                const iconImg = document.createElement("img");
                Object.assign(iconImg.style, { width: "24px", height: "24px", objectFit: "contain", verticalAlign: "middle" });
                setIconImage(iconImg, item.icon);
                tdIcon.appendChild(iconImg);

                const tdName = document.createElement("td");
                tdName.textContent = item.name;
                styleTableCell(tdName, isDark);

                const tdType = document.createElement("td");
                let typeText = "未知";
                switch(item.actionType) {
                    case 'url': typeText = "URL跳转"; break;
                    case 'selector': typeText = "元素点击"; break;
                    case 'simulate': typeText = "按键模拟"; break;
                    case 'custom': typeText = "自定义动作"; break;
                }
                tdType.textContent = typeText;
                Object.assign(tdType.style, { fontSize: "0.9em", opacity: "0.8" });
                styleTableCell(tdType, isDark);

                const tdTarget = document.createElement("td");
                const targetText = item.url || item.selector || item.simulateKeys || item.customAction || "-";
                tdTarget.textContent = targetText;
                if (item.actionType === 'url' && item.url) {
                    const methodText = getUrlMethodDisplayText(item.urlMethod);
                    tdTarget.title = `${methodText}:\n---\n${targetText}`;
                } else {
                    tdTarget.title = targetText;
                }
                Object.assign(tdTarget.style, {
                    wordBreak: "break-all", maxWidth: "300px", overflow: "hidden",
                    textOverflow: "ellipsis", whiteSpace: "nowrap"
                });
                styleTableCell(tdTarget, isDark);

                const tdHotkey = document.createElement("td");
                tdHotkey.textContent = item.hotkey || "";
                styleTableCell(tdHotkey, isDark);

                const tdAction = document.createElement("td");
                styleTableCell(tdAction, isDark);
                tdAction.style.textAlign = "center";
                const actionButtons = createActionButtons(item, index, isDark);
                tdAction.appendChild(actionButtons);

                row.appendChild(tdIcon);
                row.appendChild(tdName);
                row.appendChild(tdType);
                row.appendChild(tdTarget);
                row.appendChild(tdHotkey);
                row.appendChild(tdAction);
                return row;
            }

            function createCompactCard(item, index, isDark) {
                const card = document.createElement("div");
                card.className = classes.compactCard;
                Object.assign(card.style, {
                    border: `1px solid ${getBorderColor(isDark)}`,
                    borderRadius: "8px",
                    padding: "12px",
                    backgroundColor: getInputBackgroundColor(isDark),
                    transition: "border-color 0.2s ease, box-shadow 0.2s ease",
                    cursor: "move",
                    position: "relative",
                    width: "100%",
                    boxSizing: "border-box"
                });

                setupDragAndDrop(card, index);

                const firstRow = document.createElement("div");
                Object.assign(firstRow.style, {
                    display: "flex",
                    alignItems: "center",
                    gap: "8px",
                    marginBottom: "8px",
                    flexWrap: "wrap"
                });

                const iconContainer = document.createElement("div");
                iconContainer.style.flexShrink = "0";
                const iconImg = document.createElement("img");
                Object.assign(iconImg.style, { width: "24px", height: "24px", objectFit: "contain" });
                setIconImage(iconImg, item.icon);
                iconContainer.appendChild(iconImg);

                const nameContainer = document.createElement("div");
                Object.assign(nameContainer.style, {
                    fontWeight: "bold",
                    fontSize: "14px",
                    flexGrow: "1",
                    minWidth: "100px",
                    color: getTextColor(isDark)
                });
                nameContainer.textContent = item.name;

                const typeContainer = document.createElement("div");
                let typeText = "未知";
                switch(item.actionType) {
                    case 'url': typeText = "URL"; break;
                    case 'selector': typeText = "点击"; break;
                    case 'simulate': typeText = "按键"; break;
                    case 'custom': typeText = "自定义"; break;
                }
                Object.assign(typeContainer.style, {
                    backgroundColor: getPrimaryColor(),
                    color: "white",
                    padding: "2px 6px",
                    borderRadius: "4px",
                    fontSize: "12px",
                    fontWeight: "bold",
                    whiteSpace: "nowrap"
                });
                typeContainer.textContent = typeText;

                const hotkeyContainer = document.createElement("div");
                Object.assign(hotkeyContainer.style, {
                    backgroundColor: getBorderColor(isDark),
                    color: getTextColor(isDark),
                    padding: "4px 8px",
                    borderRadius: "4px",
                    fontSize: "12px",
                    fontFamily: "monospace",
                    fontWeight: "bold",
                    whiteSpace: "nowrap",
                    minWidth: "60px",
                    textAlign: "center"
                });
                hotkeyContainer.textContent = item.hotkey || "无";

                const actionButtons = createActionButtons(item, index, isDark);
                Object.assign(actionButtons.style, {
                    flexShrink: "0"
                });

                firstRow.appendChild(iconContainer);
                firstRow.appendChild(nameContainer);
                firstRow.appendChild(typeContainer);
                firstRow.appendChild(hotkeyContainer);
                firstRow.appendChild(actionButtons);

                const secondRow = document.createElement("div");
                Object.assign(secondRow.style, {
                    padding: "8px",
                    backgroundColor: isDark ? "#333333" : "#f8f9fa",
                    borderRadius: "4px",
                    fontSize: "13px",
                    color: isDark ? "#cccccc" : "#666666",
                    wordBreak: "break-all",
                    fontFamily: "monospace",
                    lineHeight: "1.4",
                    border: `1px solid ${getBorderColor(isDark)}`,
                    width: "100%",
                    boxSizing: "border-box"
                });

                const targetText = item.url || item.selector || item.simulateKeys || item.customAction || "（无目标配置）";
                secondRow.textContent = targetText;
                if (item.actionType === 'url' && item.url) {
                    const methodText = getUrlMethodDisplayText(item.urlMethod);
                    secondRow.title = `${methodText}:\n---\n${targetText}`;
                } else {
                    secondRow.title = targetText;
                }

                card.appendChild(firstRow);
                card.appendChild(secondRow);

                card.addEventListener('mouseenter', () => {
                    card.style.borderColor = getPrimaryColor();
                    card.style.boxShadow = `0 2px 8px ${getPrimaryColor()}20`;
                });

                card.addEventListener('mouseleave', () => {
                    card.style.borderColor = getBorderColor(isDark);
                    card.style.boxShadow = 'none';
                });

                return card;
            }

            function createActionButtons(item, index, isDark) {
                const buttonContainer = document.createElement("div");
                Object.assign(buttonContainer.style, {
                    display: "flex",
                    justifyContent: "center",
                    alignItems: "center",
                    gap: "6px",
                    flexWrap: "nowrap"
                });

                const editButton = document.createElement("button");
                editButton.textContent = "✍️";
                editButton.title = options.text.buttons.edit || "编辑";
                styleTransparentButton(editButton, "#FF9800", getHoverColor(isDark), isDark);
                Object.assign(editButton.style, {
                    minWidth: "32px",
                    height: "32px",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center"
                });
                editButton.onclick = (e) => {
                    e.stopPropagation();
                    editShortcut(item, index);
                };

                const delButton = document.createElement("button");
                delButton.textContent = "🗑️";
                delButton.title = options.text.buttons.delete || "删除";
                styleTransparentButton(delButton, "#F44336", getHoverColor(isDark), isDark);
                Object.assign(delButton.style, {
                    minWidth: "32px",
                    height: "32px",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center"
                });
                delButton.onclick = (e) => {
                    e.stopPropagation();
                    showConfirmDialog(`确定删除快捷键【${item.name}】吗?`, () => {
                        shortcuts.splice(index, 1);
                        renderShortcutsList(state.isDarkMode);
                        updateStatsDisplay();
                    });
                };

                buttonContainer.appendChild(editButton);
                buttonContainer.appendChild(delButton);
                return buttonContainer;
            }

            function setupDragAndDrop(element, index) {
                element.setAttribute("draggable", "true");
                element.style.cursor = "move";
                element.dataset.index = index;

                element.addEventListener("dragstart", e => {
                    e.dataTransfer.effectAllowed = "move";
                    e.dataTransfer.setData("text/plain", index.toString());
                    element.classList.add("dragging");
                    const container = element.closest(`#${ids.tableBody}`) || element.closest(`.${classes.compactContainer}`);
                    if (container) container.classList.add("is-dragging");
                });

                element.addEventListener("dragover", e => {
                    e.preventDefault();
                    e.dataTransfer.dropEffect = "move";
                    const draggingElement = document.querySelector(".dragging");
                    if (!draggingElement || draggingElement === element) return;

                    const rect = element.getBoundingClientRect();
                    const midY = rect.top + rect.height / 2;

                    const container = element.closest(`#${ids.tableBody}`) || element.closest(`.${classes.compactContainer}`);
                    if (container) {
                        container.querySelectorAll(".dragover-top, .dragover-bottom").forEach(el => {
                            el.classList.remove("dragover-top", "dragover-bottom");
                        });
                    }

                    element.classList.add(e.clientY < midY ? "dragover-top" : "dragover-bottom");
                });

                element.addEventListener("dragleave", () => {
                    element.classList.remove("dragover-top", "dragover-bottom");
                });

                element.addEventListener("drop", e => {
                    e.preventDefault();
                    e.stopPropagation();

                    const container = element.closest(`#${ids.tableBody}`) || element.closest(`.${classes.compactContainer}`);
                    if (container) {
                        container.querySelectorAll(".dragover-top, .dragover-bottom").forEach(el => {
                            el.classList.remove("dragover-top", "dragover-bottom");
                        });
                    }

                    const fromIndexStr = e.dataTransfer.getData("text/plain");
                    if (fromIndexStr === null) return;

                    const fromIndex = parseInt(fromIndexStr, 10);
                    const toIndex = index;

                    if (isNaN(fromIndex) || fromIndex === toIndex) return;

                    try {
                        const movedItem = shortcuts.splice(fromIndex, 1)[0];
                        shortcuts.splice(toIndex, 0, movedItem);
                        renderShortcutsList(state.isDarkMode);
                        updateStatsDisplay();
                    } catch (err) {
                        console.error("Drag-and-drop error:", err);
                        showAlert("拖拽排序时出错: " + err);
                    }
                });

                element.addEventListener("dragend", () => {
                    const container = element.closest(`#${ids.tableBody}`) || element.closest(`.${classes.compactContainer}`);
                    if (container) {
                        container.classList.remove("is-dragging");
                        container.querySelectorAll(".dragging, .dragover-top, .dragover-bottom").forEach(el => {
                            el.classList.remove("dragging", "dragover-top", "dragover-bottom");
                        });
                    }
                });
            }

            function closePanel() {
                state.isSettingsPanelOpen = false;
                disableScrollLock();
                if (state.destroyResponsiveListener) {
                    state.destroyResponsiveListener();
                    state.destroyResponsiveListener = null;
                }
                removeThemeChangeListener(updatePanelTheme);
                panel.style.opacity = "0";
                panel.style.transform = "translateY(20px)";
                setTimeout(() => {
                    if (overlay) overlay.remove();
                    state.currentPanelOverlay = null;
                }, 300);
            }

            function editShortcut(item = null, index = -1) {
                const isNew = !item;
                let temp = item ? { ...item } : {
                    name: "",
                    actionType: "url",
                    url: "",
                    urlMethod: "current",
                    urlAdvanced: "href",
                    selector: "",
                    simulateKeys: "",
                    customAction: "",
                    hotkey: "",
                    icon: ""
                };
                if (item && !item.actionType) {
                    temp.actionType = item.url ? 'url' : (item.selector ? 'selector' : (item.simulateKeys ? 'simulate' : (item.customAction ? 'custom' : 'url')));
                }
                if (!temp.customAction) temp.customAction = "";
                if (!temp.urlMethod) temp.urlMethod = "current";
                if (!temp.urlAdvanced) temp.urlAdvanced = "href";

                const editOverlay = document.createElement("div");
                editOverlay.id = ids.editOverlay;
                Object.assign(editOverlay.style, {
                    position: "fixed", top: 0, left: 0, width: "100vw", height: "100vh",
                    backgroundColor: "rgba(0, 0, 0, 0.3)", zIndex: "99999", display: "flex",
                    justifyContent: "center", alignItems: "center", padding: "20px", boxSizing: "border-box"
                });

                const formDiv = document.createElement("div");
                formDiv.id = ids.editForm;
                Object.assign(formDiv.style, {
                    borderRadius: "8px", boxShadow: "0 4px 12px rgba(0,0,0,0.2)",
                    padding: "20px", fontFamily: "sans-serif", position: "relative",
                    opacity: "0", transform: "translateY(20px)",
                    transition: "opacity 0.3s ease, transform 0.3s ease",
                    maxHeight: "90vh", overflowY: "auto",
                    width: "100%", maxWidth: "500px", minWidth: "320px"
                });
                formDiv.onclick = (e) => e.stopPropagation();

                const h3 = document.createElement("h3");
                h3.textContent = isNew ? "添加快捷键" : "编辑快捷键";
                Object.assign(h3.style, { marginTop: "0", marginBottom: "15px", fontSize: "1.1em" });
                formDiv.appendChild(h3);

                const nameInput = createInputField("名称:", temp.name, "text");
                formDiv.appendChild(nameInput.label);

                const actionTypeDiv = document.createElement("div");
                actionTypeDiv.style.margin = "15px 0";
                const actionTypeLabel = document.createElement("div");
                actionTypeLabel.textContent = "操作类型:";
                Object.assign(actionTypeLabel.style, { fontWeight: "bold", fontSize: "0.9em", marginBottom: "8px" });
                actionTypeDiv.appendChild(actionTypeLabel);
                const actionTypes = [
                    { value: 'url', text: 'URL 跳转' },
                    { value: 'selector', text: '元素点击' },
                    { value: 'simulate', text: '按键模拟' },
                    { value: 'custom', text: '自定义动作' }
                ];
                const radioGroup = document.createElement("div");
                Object.assign(radioGroup.style, { display: 'flex', gap: '15px', flexWrap: 'wrap' });
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
                            urlContainer.style.display = (at.value === 'url') ? 'block' : 'none';
                            selectorContainer.style.display = (at.value === 'selector') ? 'block' : 'none';
                            simulateContainer.style.display = (at.value === 'simulate') ? 'block' : 'none';
                            customContainer.style.display = (at.value === 'custom') ? 'block' : 'none';
                        }
                    });
                    radioLabel.appendChild(radio);
                    radioLabel.appendChild(document.createTextNode(at.text));
                    radioGroup.appendChild(radioLabel);
                });
                actionTypeDiv.appendChild(radioGroup);
                formDiv.appendChild(actionTypeDiv);

                const urlContainer = document.createElement('div');
                const urlTextarea = createInputField("目标网址 (URL):", temp.url, "textarea", "例如: https://example.com/search?q=%s");
                urlContainer.appendChild(urlTextarea.label);

                const urlMethodContainer = createUrlMethodConfigUI(temp.urlMethod, temp.urlAdvanced);
                urlContainer.appendChild(urlMethodContainer.container);

                formDiv.appendChild(urlContainer);
                actionInputs.url = urlTextarea.input;

                const selectorContainer = document.createElement('div');
                const selectorTextarea = createInputField("目标选择器 (Selector):", temp.selector, "textarea", '例如: label[for="sidebar-visible"]');
                selectorContainer.appendChild(selectorTextarea.label);
                formDiv.appendChild(selectorContainer);
                actionInputs.selector = selectorTextarea.input;

                const simulateContainer = document.createElement('div');
                const { container: simulateInputContainer, getSimulateKeys } = createEnhancedKeyboardCaptureInput("模拟按键:", temp.simulateKeys, {
                    placeholder: options.text.hints.simulate,
                    hint: options.text.hints.simulateHelp,
                    methodName: "getSimulateKeys"
                });
                simulateContainer.appendChild(simulateInputContainer);
                formDiv.appendChild(simulateContainer);

                const customContainer = document.createElement('div');
                const customActionField = createInputField("自定义动作 (customAction):", temp.customAction, "text", "从脚本提供的 customActions 中选择/输入 key");
                customContainer.appendChild(customActionField.label);
                formDiv.appendChild(customContainer);
                actionInputs.customAction = customActionField.input;

                try {
                    const keys = Object.keys(options.customActions || {}).filter(Boolean).sort();
                    if (keys.length) {
                        const datalist = document.createElement("datalist");
                        datalist.id = `${idPrefix}-custom-actions-list`;
                        keys.forEach(k => {
                            const opt = document.createElement("option");
                            opt.value = k;
                            datalist.appendChild(opt);
                        });
                        customActionField.input.setAttribute("list", datalist.id);
                        customActionField.label.appendChild(datalist);
                    }
                } catch {}

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

                const { container: iconLibraryContainer, updateTheme: updateIconLibraryTheme } = createIconLibraryUI(iconTextarea, iconPreview);
                formDiv.appendChild(iconLibraryContainer);

                const { container: hotkeyContainer, getHotkey } = createEnhancedKeyboardCaptureInput("快捷键:", temp.hotkey, {
                    placeholder: options.text.hints.hotkey,
                    hint: options.text.hints.hotkeyHelp,
                    methodName: "getHotkey"
                });
                formDiv.appendChild(hotkeyContainer);

                urlContainer.style.display = (temp.actionType === 'url') ? 'block' : 'none';
                selectorContainer.style.display = (temp.actionType === 'selector') ? 'block' : 'none';
                simulateContainer.style.display = (temp.actionType === 'simulate') ? 'block' : 'none';
                customContainer.style.display = (temp.actionType === 'custom') ? 'block' : 'none';

                const btnRow = document.createElement("div");
                Object.assign(btnRow.style, {
                    marginTop: "20px", display: "flex", justifyContent: "flex-end",
                    gap: "10px", flexWrap: "wrap"
                });

                const confirmBtn = document.createElement("button");
                confirmBtn.textContent = options.text.buttons.confirm || "确定";
                confirmBtn.onclick = () => {
                    temp.name = nameInput.input.value.trim();
                    temp.url = actionInputs.url.value.trim();
                    temp.selector = actionInputs.selector.value.trim();
                    temp.simulateKeys = getSimulateKeys().replace(/\s+/g, "");
                    temp.customAction = (actionInputs.customAction?.value || "").trim();
                    temp.icon = iconTextarea.value.trim();
                    const finalHotkey = getHotkey();
                    const urlMethodConfig = urlMethodContainer.getConfig();
                    temp.urlMethod = urlMethodConfig.method;
                    temp.urlAdvanced = urlMethodConfig.advanced;

                    if (!temp.name) { showAlert("请填写名称!"); return; }
                    if (temp.actionType === 'url' && !temp.url) { showAlert("请填写目标网址!"); return; }
                    if (temp.actionType === 'selector' && !temp.selector) { showAlert("请填写目标选择器!"); return; }
                    if (temp.actionType === 'simulate' && !temp.simulateKeys) { showAlert("请设置模拟按键!"); return; }
                    if (temp.actionType === 'custom' && !temp.customAction) { showAlert("请设置自定义动作 key!"); return; }
                    if (!finalHotkey) { showAlert("请设置快捷键!"); return; }
                    if (finalHotkey.endsWith('+')) { showAlert("快捷键设置不完整 (缺少主键)!"); return; }

                    const normalizedNewHotkey = normalizeHotkey(finalHotkey);
                    if (shortcuts.some((s, i) => normalizeHotkey(s.hotkey) === normalizedNewHotkey && i !== index)) {
                        showAlert("该快捷键已被其他项使用, 请选择其他组合!");
                        return;
                    }
                    temp.hotkey = finalHotkey;

                    if (temp.actionType !== 'url') {
                        temp.url = "";
                        temp.urlMethod = "current";
                        temp.urlAdvanced = "href";
                    }
                    if (temp.actionType !== 'selector') temp.selector = "";
                    if (temp.actionType !== 'simulate') temp.simulateKeys = "";
                    if (temp.actionType !== 'custom') temp.customAction = "";

                    if (isNew) {
                        shortcuts.push(temp);
                    } else {
                        shortcuts[index] = temp;
                    }
                    renderShortcutsList(state.isDarkMode);
                    updateStatsDisplay();
                    closeEdit();
                };
                btnRow.appendChild(confirmBtn);

                const cancelBtn = document.createElement("button");
                cancelBtn.textContent = options.text.buttons.cancel || "取消";
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
                    if (actionInputs.customAction) styleInputField(actionInputs.customAction, isDark);
                    styleInputField(iconTextarea, isDark);
                    actionTypeDiv.querySelectorAll('input[type="radio"]').forEach(rb => rb.style.accentColor = getPrimaryColor());
                    urlMethodContainer.updateTheme(isDark);
                    styleButton(confirmBtn, "#2196F3", "#1e88e5");
                    styleButton(cancelBtn, "#9E9E9E", "#757575");
                    updateIconLibraryTheme(isDark);
                };

                addThemeChangeListener(updateEditPanelTheme);
                updateEditPanelTheme(state.isDarkMode);

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

            function createUrlMethodConfigUI(currentMethod = "current", currentAdvanced = "href") {
                const container = document.createElement("div");
                container.style.marginTop = "10px";

                const titleRow = document.createElement("div");
                Object.assign(titleRow.style, {
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    marginBottom: "8px"
                });

                const title = document.createElement("div");
                title.textContent = "跳转方式:";
                Object.assign(title.style, { fontWeight: "bold", fontSize: "0.9em" });
                titleRow.appendChild(title);

                const expandButton = document.createElement("button");
                expandButton.type = "button";
                expandButton.title = "展开/折叠高级选项";
                Object.assign(expandButton.style, {
                    width: "32px", height: "32px", padding: "0", cursor: "pointer",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    fontSize: "16px", border: "1px solid transparent", background: "transparent",
                    borderRadius: "4px", transition: "background-color 0.2s ease, border-color 0.2s ease"
                });
                titleRow.appendChild(expandButton);
                container.appendChild(titleRow);

                const methodRow = document.createElement("div");
                Object.assign(methodRow.style, {
                    display: "flex",
                    gap: "15px",
                    marginBottom: "10px",
                    flexWrap: "wrap"
                });

                const methods = [
                    { value: 'current', text: '当前窗口' },
                    { value: 'spa', text: 'SPA路由' },
                    { value: 'newWindow', text: '新窗口' }
                ];

                let selectedMethod = currentMethod;
                let selectedAdvanced = currentAdvanced;
                let isExpanded = false;

                methods.forEach(method => {
                    const label = document.createElement("label");
                    Object.assign(label.style, {
                        display: 'inline-flex',
                        alignItems: 'center',
                        cursor: 'pointer'
                    });

                    const radio = document.createElement("input");
                    radio.type = "radio";
                    radio.name = "urlMethod";
                    radio.value = method.value;
                    radio.checked = selectedMethod === method.value;
                    Object.assign(radio.style, { marginRight: "5px", cursor: 'pointer' });

                    radio.addEventListener('change', () => {
                        if (radio.checked) {
                            selectedMethod = method.value;
                            const defaultAdvanced = Object.keys(URL_METHODS[method.value].options)[0];
                            selectedAdvanced = defaultAdvanced;
                            updateAdvancedOptions();
                            updateTheme(state.isDarkMode);
                        }
                    });

                    label.appendChild(radio);
                    label.appendChild(document.createTextNode(method.text));
                    methodRow.appendChild(label);
                });
                container.appendChild(methodRow);

                const advancedContainer = document.createElement("div");
                Object.assign(advancedContainer.style, {
                    display: "none",
                    marginTop: "10px",
                    padding: "8px",
                    borderRadius: "6px",
                    border: "1px solid"
                });
                container.appendChild(advancedContainer);

                function updateAdvancedOptions() {
                    advancedContainer.innerHTML = "";
                    const advancedTitle = document.createElement("div");
                    advancedTitle.textContent = "高级选项:";
                    Object.assign(advancedTitle.style, {
                        fontWeight: "bold",
                        fontSize: "0.8em",
                        marginBottom: "8px",
                        opacity: "0.8"
                    });
                    advancedContainer.appendChild(advancedTitle);

                    const advancedRow = document.createElement("div");
                    Object.assign(advancedRow.style, {
                        display: "flex",
                        flexDirection: "column",
                        gap: "6px"
                    });

                    const methodConfig = URL_METHODS[selectedMethod];
                    if (methodConfig) {
                        Object.entries(methodConfig.options).forEach(([key, option]) => {
                            const label = document.createElement("label");
                            Object.assign(label.style, {
                                display: 'flex',
                                alignItems: 'flex-start',
                                cursor: 'pointer',
                                gap: '8px'
                            });

                            const radio = document.createElement("input");
                            radio.type = "radio";
                            radio.name = "urlAdvanced";
                            radio.value = key;
                            radio.checked = selectedAdvanced === key;
                            Object.assign(radio.style, { cursor: 'pointer', marginTop: '2px' });
                            radio.style.accentColor = getPrimaryColor();

                            radio.addEventListener('change', () => {
                                if (radio.checked) {
                                    selectedAdvanced = key;
                                }
                            });

                            const textContainer = document.createElement("div");
                            Object.assign(textContainer.style, {
                                display: 'flex',
                                flexDirection: 'column',
                                gap: '2px'
                            });

                            const nameSpan = document.createElement("span");
                            nameSpan.textContent = option.name;
                            Object.assign(nameSpan.style, {
                                fontWeight: "bold",
                                fontSize: "0.9em"
                            });

                            const descSpan = document.createElement("span");
                            descSpan.textContent = option.desc;
                            Object.assign(descSpan.style, {
                                fontSize: "0.8em",
                                opacity: "0.7",
                                lineHeight: "1.3"
                            });

                            textContainer.appendChild(nameSpan);
                            textContainer.appendChild(descSpan);

                            label.appendChild(radio);
                            label.appendChild(textContainer);
                            advancedRow.appendChild(label);
                        });
                    }
                    advancedContainer.appendChild(advancedRow);
                }

                expandButton.addEventListener("click", () => {
                    isExpanded = !isExpanded;
                    advancedContainer.style.display = isExpanded ? 'block' : 'none';
                    expandButton.innerHTML = isExpanded ? '▲' : '▼';
                    if (isExpanded) {
                        updateTheme(state.isDarkMode);
                        updateAdvancedOptions();
                    }
                });

                expandButton.innerHTML = isExpanded ? '▲' : '▼';
                updateAdvancedOptions();

                function updateTheme(isDark) {
                    title.style.color = getTextColor(isDark);
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

                    advancedContainer.style.backgroundColor = getInputBackgroundColor(isDark);
                    advancedContainer.style.borderColor = getBorderColor(isDark);
                    container.querySelectorAll('input[type="radio"]').forEach(radio => {
                        radio.style.accentColor = getPrimaryColor();
                    });
                    container.querySelectorAll('label, span, div').forEach(el => {
                        if (el !== title && !el.querySelector('input')) {
                            el.style.color = getTextColor(isDark);
                        }
                    });
                }

                function getConfig() {
                    return {
                        method: selectedMethod,
                        advanced: selectedAdvanced
                    };
                }

                return {
                    container,
                    updateTheme,
                    getConfig
                };
            }

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
                Object.assign(wrap.style, {
                    display: "flex",
                    alignItems: "flex-start",
                    gap: "8px"
                });

                const textarea = document.createElement("textarea");
                textarea.value = value || "";
                textarea.placeholder = "在此粘贴URL, 或从下方图库选择";
                textarea.rows = 1;
                Object.assign(textarea.style, {
                    minHeight: "36px",
                    resize: "vertical",
                    overflowY: "hidden",
                    flexGrow: "1",
                    minWidth: "200px"
                });

                const preview = document.createElement("img");
                Object.assign(preview.style, { width: "36px", height: "36px", objectFit: "contain", borderRadius: "4px", flexShrink: "0" });

                requestAnimationFrame(() => autoResizeTextarea(textarea));
                wrap.appendChild(textarea);
                wrap.appendChild(preview);
                label.appendChild(wrap);

                const updatePreviewTheme = (isDark) => {
                    preview.style.border = `1px solid ${getBorderColor(isDark)}`;
                    preview.style.backgroundColor = getInputBackgroundColor(isDark);
                };
                addThemeChangeListener(updatePreviewTheme);
                updatePreviewTheme(state.isDarkMode);

                return { label, input: textarea, preview };
            }

            function createIconLibraryUI(targetTextarea, targetPreviewImg) {
                let userIcons = safeGMGet(options.storageKeys.userIcons, []);
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
                    if (userIcons.some(icon => icon.url === url) || options.iconLibrary.some(icon => icon.url === url)) { showAlert("该图标已存在于图库中。"); return; }
                    showPromptDialog("请输入图标的名称：", "", (name) => {
                        if (name && name.trim()) {
                            userIcons.push({ name: name.trim(), url: url });
                            safeGMSet(options.storageKeys.userIcons, userIcons);
                            renderIconGrid();
                        }
                    });
                });
                gridWrapper.appendChild(addButton);

                function renderIconGrid() {
                    iconGrid.innerHTML = "";
                    const allIcons = [...options.iconLibrary, ...userIcons];

                    allIcons.forEach(iconInfo => {
                        const isProtected = options.protectedIconUrls.includes(iconInfo.url);
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

                        if (!isProtected) {
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
                                        safeGMSet(options.storageKeys.userIcons, userIcons);
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
                    updateTheme(state.isDarkMode);
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

            function createEnhancedKeyboardCaptureInput(labelText, currentValue, {
                placeholder = "点击此处，然后按下快捷键组合",
                hint = "💡 支持 Ctrl/Shift/Alt/Cmd + 字母/数字/功能键等组合",
                methodName = "getHotkey"
            } = {}) {
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
                    fontSize: "14px",
                    minWidth: "200px"
                });

                const clearButton = document.createElement("button");
                clearButton.type = "button";
                clearButton.textContent = "🗑️";
                clearButton.title = options.text.buttons.clear || `清除${labelText}`;
                Object.assign(clearButton.style, {
                    padding: "8px 12px",
                    border: "1px solid",
                    borderRadius: "4px",
                    cursor: "pointer",
                    fontSize: "14px",
                    backgroundColor: "transparent",
                    flexShrink: "0"
                });

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

                function startCapture() {
                    if (isCapturing) return;
                    isCapturing = true;
                    capturedModifiers.clear();
                    capturedMainKey = "";
                    mainInput.value = "";
                    mainInput.placeholder = `请按下${labelText}组合...`;
                    statusDiv.textContent = `🎯 正在捕获${labelText}，请按下组合键...`;
                    mainInput.focus();
                    updateCaptureState();
                }

                function stopCapture() {
                    if (!isCapturing) return;
                    isCapturing = false;
                    mainInput.placeholder = placeholder;
                    const finalKeys = buildHotkeyString();
                    if (finalKeys) {
                        mainInput.value = finalKeys;
                        statusDiv.textContent = `✅ 已捕获${labelText}: ${finalKeys}`;
                    } else {
                        statusDiv.textContent = `❌ 未捕获到有效的${labelText}`;
                    }
                    mainInput.blur();
                    updateCaptureState();
                }

                function buildHotkeyString() {
                    if (!capturedMainKey) return "";
                    const modArray = Array.from(capturedModifiers).sort();
                    return modArray.length > 0
                        ? [...modArray, capturedMainKey].join("+")
                        : capturedMainKey;
                }

                function updateCaptureState() {
                    if (isCapturing) {
                        mainInput.style.backgroundColor = getPrimaryColor() + "20";
                        mainInput.style.borderColor = getPrimaryColor();
                        mainInput.style.boxShadow = `0 0 0 1px ${getPrimaryColor()}`;
                    } else {
                        styleInputField(mainInput, state.isDarkMode);
                    }
                }

                function handleKeyEvent(e) {
                    if (!isCapturing) return;
                    e.preventDefault();
                    e.stopPropagation();

                    const code = e.code;
                    const key = e.key;

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

                    if (e.type === 'keydown') {
                        const keyInfo = ENHANCED_KEY_MAP[code];
                        if (keyInfo) {
                            capturedMainKey = keyInfo.standard;
                            updateDisplay();
                            setTimeout(stopCapture, 100);
                        } else {
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

                mainInput.addEventListener("click", startCapture);
                mainInput.addEventListener("focus", startCapture);
                mainInput.addEventListener("keydown", handleKeyEvent);
                mainInput.addEventListener("keyup", handleKeyEvent);
                mainInput.addEventListener("blur", () => {
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
                    statusDiv.textContent = `🗑️ ${labelText}已清除`;
                    if (isCapturing) {
                        stopCapture();
                    }
                });

                inputContainer.appendChild(mainInput);
                inputContainer.appendChild(clearButton);
                container.appendChild(inputContainer);
                container.appendChild(statusDiv);

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

                updateTheme(state.isDarkMode);
                addThemeChangeListener(updateTheme);

                const result = { container };
                result[methodName] = () => mainInput.value.trim();
                return result;
            }
        }

        /* ------------------------------------------------------------------
         * 样式注入
         * ------------------------------------------------------------------ */

        function injectDragCss() {
            const styleId = `${cssPrefix}-drag-style`;
            if (document.getElementById(styleId)) return;
            const styleEl = document.createElement('style');
            styleEl.id = styleId;

            const updateDragStyle = (isDark) => {
                const primaryColor = getPrimaryColor();
                styleEl.textContent = `
                    #${ids.tableBody}.is-dragging tr {
                        opacity: 0.5;
                    }
                    #${ids.tableBody} tr.dragging {
                        opacity: 1 !important;
                        background-color: ${primaryColor}30 !important;
                        box-shadow: 0 2px 8px rgba(0,0,0,0.2);
                    }
                    #${ids.tableBody} tr.dragover-top {
                        border-top: 2px dashed ${primaryColor};
                    }
                    #${ids.tableBody} tr.dragover-bottom {
                        border-bottom: 2px dashed ${primaryColor};
                    }

                    .${classes.compactContainer}.is-dragging .${classes.compactCard} {
                        opacity: 0.5;
                    }
                    .${classes.compactCard}.dragging {
                        opacity: 1 !重要;
                        background-color: ${primaryColor}30 !重要;
                        box-shadow: 0 4px 12px rgba(0,0,0,0.3) !重要;
                        transform: scale(1.02);
                        border-color: ${primaryColor} !重要;
                    }
                    .${classes.compactCard}.dragover-top {
                        border-top: 3px dashed ${primaryColor} !重要;
                    }
                    .${classes.compactCard}.dragover-bottom {
                        border-bottom: 3px dashed ${primaryColor} !重要;
                    }

                    @media (max-width: ${options.ui.compactBreakpoint || 800}px) {
                        .${classes.compactCard} {
                            margin: 0;
                            max-width: 100%;
                            align-self: flex-start;
                        }
                        .${classes.compactContainer} {
                            align-items: stretch !重要;
                        }
                    }
                `;
            };

            document.head.appendChild(styleEl);
            addThemeChangeListener(updateDragStyle);
            updateDragStyle(state.isDarkMode);
        }

        /* ------------------------------------------------------------------
         * 生命周期
         * ------------------------------------------------------------------ */

        function init() {
            window.addEventListener("keydown", onKeydown, true);
            setupDarkModeObserver();
            injectDragCss();
            const menuLabel = options.menuCommandLabel || options.text.menuLabelFallback;
            if (typeof GM_registerMenuCommand === 'function') {
                GM_registerMenuCommand(menuLabel, openSettingsPanel);
            }
        }

        function destroy() {
            window.removeEventListener("keydown", onKeydown, true);
            disableScrollLock();
        }

        function getShortcuts() {
            return shortcuts.slice();
        }

        function setShortcuts(newShortcuts) {
            if (!Array.isArray(newShortcuts)) return;
            shortcuts = newShortcuts.map(s => ({
                name: s.name || "",
                actionType: s.actionType || (s.url ? 'url' : (s.selector ? 'selector' : (s.simulateKeys ? 'simulate' : (s.customAction ? 'custom' : '')))),
                url: s.url || "",
                urlMethod: s.urlMethod || "current",
                urlAdvanced: s.urlAdvanced || "href",
                selector: s.selector || "",
                simulateKeys: s.simulateKeys || "",
                customAction: s.customAction || "",
                hotkey: s.hotkey || "",
                icon: s.icon || ""
            }));
            saveShortcuts();
        }

        engineApi = {
            init,
            destroy,
            openSettingsPanel,
            getShortcuts,
            setShortcuts,
            URL_METHODS
        };
        return engineApi;
    }

    global.ShortcutTemplate = Object.freeze({
        VERSION: '20250924',
        URL_METHODS,
        createShortcutEngine
    });

})(typeof window !== 'undefined' ? window : this);
