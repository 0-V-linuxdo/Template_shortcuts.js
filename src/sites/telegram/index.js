/* -------------------------------------------------------------------------- *
 * Site Entry · [Telegram] 快捷键跳转
 * -------------------------------------------------------------------------- */

(function() {
    'use strict';

    const ShortcutTemplate = window.ShortcutTemplate;

    if (!ShortcutTemplate || typeof ShortcutTemplate.createShortcutEngine !== 'function') {
        console.error('[Telegram Shortcut] Template module not found.');
        return;
    }

    const logTag = '[Telegram Shortcut Script]';
    const TemplateUtils = ShortcutTemplate?.utils || {};

    const SHORTCUTS_STORAGE_KEY = 'telegram_shortcuts_v2';
    const ICON_CACHE_PREFIX = 'telegram_icon_cache_v1::';
    const USER_ICONS_STORAGE_KEY = 'telegram_user_icons_v1';
    const ICON_THEME_ADAPTED_STORAGE_KEY = 'telegram_icon_theme_adapted_v1';

    const defaultIconURL = 'https://web.telegram.org/a/favicon.ico';
    const TELEGRAM_SEARCH_ICON = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='currentColor'%3E%3Cpath d='M15.5 14h-.79l-.28-.27A6.471 6.471 0 0 0 16 9.5 6.5 6.5 0 1 0 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z'/%3E%3C/svg%3E";
    const TELEGRAM_CLOSE_ICON = "data:image/svg+xml,%3Csvg fill='currentColor' viewBox='0 0 24 24' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z'/%3E%3C/svg%3E";

    const defaultIcons = [
        { name: 'Telegram', url: 'https://web.telegram.org/a/favicon.ico' },
        { name: 'Telegram Desktop', url: 'https://telegram.org/favicon.ico' },
        { name: 'ChatGPT', url: 'https://chat.openai.com/favicon.ico' },
        { name: 'Claude', url: 'https://claude.ai/favicon.ico' },
        { name: 'Gemini', url: 'https://www.gstatic.com/lamda/images/gemini_sparkle_aurora_33f86dc0c0257da337c63.svg' },
        { name: 'Copilot', url: 'https://copilot.microsoft.com/favicon.ico' },
        { name: 'Poe', url: 'https://psc2.cf2.poecdn.net/assets/favicon.svg' },
        { name: 'Perplexity', url: 'https://www.perplexity.ai/favicon.ico' },
        { name: 'Hugging Face', url: 'https://huggingface.co/favicon.ico' },
        { name: 'Google', url: 'https://www.google.com/favicon.ico' },
        { name: 'GitHub', url: 'https://github.githubassets.com/favicons/favicon.svg' },
        { name: 'Stack Overflow', url: 'https://cdn.sstatic.net/Sites/stackoverflow/Img/favicon.ico' },
        { name: 'Reddit', url: 'https://www.reddit.com/favicon.ico' },
        { name: 'Twitter / X', url: 'https://abs.twimg.com/favicons/twitter.3.ico' }
    ];

    const protectedIconUrls = [
        'https://web.telegram.org/a/favicon.ico',
        'https://telegram.org/favicon.ico'
    ];

    const SITE_MESSAGES = Object.freeze({
        "en-US": {
            menuCommandLabel: "Telegram - Shortcut settings",
            panelTitle: "Telegram - Custom shortcuts",
            shortcuts: {
                "返回聊天列表": "Return to chat list",
                "返回": "Back",
                "搜索聊天": "Search chat",
                "到底部": "Go to bottom",
                "搜索关闭": "Close search",
                "菜单按钮": "Menu button"
            }
        }
    });

    const baseShortcut = {
        url: '',
        urlMethod: 'current',
        urlAdvanced: 'href',
        selector: '',
        simulateKeys: '',
        icon: defaultIconURL,
        customAction: '',
        data: {}
    };

    const createShortcut = (overrides) => ({ ...baseShortcut, ...overrides });

    const defaultShortcuts = [
        createShortcut({
            name: '返回聊天列表',
            actionType: 'selector',
            selector: 'button[aria-label="Return to chat list"]',
            hotkey: 'CTRL+L'
        }),
        createShortcut({
            name: '返回',
            actionType: 'selector',
            selector: 'button[aria-label="Back"]',
            hotkey: 'CTRL+B'
        }),
        createShortcut({
            name: '搜索聊天',
            actionType: 'selector',
            selector: 'button[aria-label="Search this chat"]',
            hotkey: 'CTRL+F',
            icon: TELEGRAM_SEARCH_ICON
        }),
        createShortcut({
            name: '到底部',
            actionType: 'selector',
            selector: 'button[aria-label="Go to bottom"]',
            hotkey: 'CTRL+G'
        }),
        createShortcut({
            name: '搜索关闭',
            actionType: 'selector',
            selector: 'button.Button.tiny.translucent.round i.icon.icon-close',
            hotkey: 'CTRL+X',
            icon: TELEGRAM_CLOSE_ICON
        }),
        createShortcut({
            name: '菜单按钮',
            actionType: 'selector',
            selector: 'button[aria-label="Open menu"]',
            hotkey: 'CTRL+M'
        })
    ];

    function parseContainsSelector(selector) {
        const match = String(selector || '').match(/^(.*):contains\((['"])(.+)\2\)\s*$/);
        if (!match) return null;
        return {
            baseSelector: String(match[1] || '').trim(),
            text: String(match[3] || '').trim()
        };
    }

    function resolveSelectorWithContains(selector) {
        const parsed = parseContainsSelector(selector);
        if (!parsed || !parsed.baseSelector) return null;

        let elements = [];
        try {
            elements = Array.from(document.querySelectorAll(parsed.baseSelector));
        } catch {
            return null;
        }

        const target = elements.find((el) => String(el.textContent || '').trim().includes(parsed.text));
        if (!target) return null;

        return target.closest('button, a, [role="button"], [onclick]') || target;
    }

    function findElementBySelector(selector) {
        const sel = String(selector || '').trim();
        if (!sel) return null;

        if (sel.includes(':contains(')) {
            return resolveSelectorWithContains(sel);
        }

        if (sel.includes('i.icon')) {
            try {
                const iconEl = document.querySelector(sel);
                if (!iconEl) return null;
                return iconEl.closest('button, a, [role="button"], [onclick]') || iconEl;
            } catch {
                return null;
            }
        }

        try {
            return document.querySelector(sel);
        } catch {
            return null;
        }
    }

    function triggerClickChain(element) {
        if (!element) return false;

        try {
            const ok = TemplateUtils?.events?.simulateClick?.(element, { nativeFallback: true });
            if (ok) return true;
        } catch {}

        try {
            if (typeof element.click === 'function') {
                element.click();
                return true;
            }
        } catch {}

        try {
            const evt = new MouseEvent('click', { bubbles: true, cancelable: true, view: window });
            element.dispatchEvent(evt);
            return true;
        } catch {}

        return false;
    }

    function telegramSelectorHandler({ shortcut }) {
        const selector = typeof shortcut?.selector === 'string' ? shortcut.selector.trim() : '';
        if (!selector) {
            console.warn(`${logTag} selector action has empty selector:`, shortcut?.name || '(unnamed)');
            return false;
        }

        const target = findElementBySelector(selector);
        if (!target) {
            console.warn(`${logTag} selector target not found:`, selector);
            return false;
        }

        const clickable = target.closest?.('button, a, [role="button"], [onclick]') || target;
        const ok = triggerClickChain(clickable);
        if (!ok) {
            console.warn(`${logTag} selector click failed:`, selector, clickable);
        }
        return ok;
    }

    function executeCurrentWindowJump(url, advanced) {
        if (advanced === 'replace') {
            window.location.replace(url);
            return true;
        }
        window.location.href = url;
        return true;
    }

    function executeSpaNavigation(url, advanced) {
        try {
            const urlObj = new URL(url, location.origin);
            const nextUrl = urlObj.pathname + urlObj.search + urlObj.hash;
            const stateObj = { url };
            const title = document.title;

            if (advanced === 'replaceState') {
                window.history.replaceState(stateObj, title, nextUrl);
            } else {
                window.history.pushState(stateObj, title, nextUrl);
            }

            window.dispatchEvent(new PopStateEvent('popstate', { state: stateObj }));
            return true;
        } catch (err) {
            console.warn(`${logTag} spa navigation failed, fallback to location.href:`, err);
            window.location.href = url;
            return true;
        }
    }

    function executeNewWindowJump(url, advanced) {
        if (advanced === 'popup') {
            const popup = window.open(
                url,
                '_blank',
                'width=900,height=700,scrollbars=yes,resizable=yes,status=yes,location=yes,menubar=yes,toolbar=yes'
            );
            if (popup) {
                popup.focus();
                return true;
            }
            console.warn(`${logTag} popup blocked, fallback to normal open`);
        }

        window.open(url, '_blank', 'noopener,noreferrer');
        return true;
    }

    function jumpToTelegramUrl(targetUrl, method = 'current', advanced = 'href') {
        const finalUrl = String(targetUrl || '').trim();
        if (!finalUrl) return false;

        try {
            const currentBaseUrl = window.location.href.split('#')[0];
            const targetBaseUrl = finalUrl.split('#')[0];

            if (currentBaseUrl === targetBaseUrl && finalUrl.includes('#')) {
                window.history.pushState(null, '', finalUrl);
                window.location.reload();
                return true;
            }
        } catch (err) {
            console.warn(`${logTag} telegram hash-route check failed:`, err);
        }

        try {
            if (method === 'spa') return executeSpaNavigation(finalUrl, advanced);
            if (method === 'newWindow') return executeNewWindowJump(finalUrl, advanced);
            return executeCurrentWindowJump(finalUrl, advanced);
        } catch (err) {
            console.error(`${logTag} jumpToTelegramUrl failed:`, finalUrl, err);
            return false;
        }
    }

    function telegramUrlHandler({ shortcut }) {
        const url = typeof shortcut?.url === 'string' ? shortcut.url.trim() : '';
        if (!url) {
            console.warn(`${logTag} url action has empty URL:`, shortcut?.name || '(unnamed)');
            return false;
        }

        const method = typeof shortcut?.urlMethod === 'string' ? shortcut.urlMethod : 'current';
        const advanced = typeof shortcut?.urlAdvanced === 'string' ? shortcut.urlAdvanced : 'href';
        return jumpToTelegramUrl(url, method, advanced);
    }

    const engine = ShortcutTemplate.createShortcutEngine({
        menuCommandLabel: 'Telegram - 设置快捷键',
        panelTitle: 'Telegram - 自定义快捷键',
        storageKeys: {
            shortcuts: SHORTCUTS_STORAGE_KEY,
            iconCachePrefix: ICON_CACHE_PREFIX,
            userIcons: USER_ICONS_STORAGE_KEY,
            iconThemeAdapted: ICON_THEME_ADAPTED_STORAGE_KEY
        },
        ui: {
            idPrefix: 'telegram'
        },
        i18n: {
            messages: SITE_MESSAGES
        },
        defaultIconURL,
        iconLibrary: defaultIcons,
        protectedIconUrls,
        defaultShortcuts,
        actionHandlers: {
            selector: telegramSelectorHandler,
            url: telegramUrlHandler
        },
        allowOverrideBuiltinActions: true,
        actionTypeMeta: {
            selector: {
                label: 'Element click',
                shortLabel: 'Click',
                color: '#FF9800',
                builtin: true
            },
            url: {
                label: 'URL jump',
                shortLabel: 'URL',
                color: '#4CAF50',
                builtin: true
            }
        },
        colors: {
            primary: '#37aee2'
        },
        consoleTag: logTag,
        shouldBypassIconCache: (url) => {
            const value = String(url || '');
            return value.startsWith('https://web.telegram.org/')
                || value.startsWith('https://telegram.org/');
        }
    });

    engine.init();

    try {
        const currentShortcuts = engine.getShortcuts();
        if (Array.isArray(currentShortcuts) && currentShortcuts.length > 0) {
            engine.setShortcuts(currentShortcuts);
        }
    } catch (err) {
        console.warn(`${logTag} shortcut normalization sync failed:`, err);
    }
})();
