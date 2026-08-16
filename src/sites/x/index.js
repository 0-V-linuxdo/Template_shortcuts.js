/* -------------------------------------------------------------------------- *
 * Site Entry · [X] 快捷键跳转
 * -------------------------------------------------------------------------- */

import {
    X_REPLY_SORT_RECENCY_URL,
    X_REPLY_SORT_RELEVANT_URL,
    getXReplySortModeFromUrl,
    resolveXReplySortUrl
} from './reply-sort-url.js';

(function() {
    'use strict';

    const ShortcutTemplate = window.ShortcutTemplate;

    if (!ShortcutTemplate || typeof ShortcutTemplate.createShortcutEngine !== 'function') {
        console.error('[X Shortcut] Template module not found.');
        return;
    }

    const LOG_TAG = '[X Shortcut Script]';
    const SHORTCUTS_STORAGE_KEY = 'x_shortcuts_v1';
    const REPLY_SORT_MIGRATION_KEY = 'x_reply_sort_shortcuts_added_20260817_v110';
    const REPLY_SORT_SPA_MIGRATION_KEY = 'x_reply_sort_spa_20260817_v111';
    const defaultIconURL = 'https://abs.twimg.com/favicons/twitter.3.ico';

    const SITE_MESSAGES = Object.freeze({
        'zh-CN': {
            menuCommandLabel: 'X - 设置快捷键',
            panelTitle: 'X - 自定义快捷键',
            shortcuts: {
                home: '主页',
                bookmarks: '书签',
                grok: 'Grok',
                sortRelevant: '相关',
                sortRecency: '最新'
            }
        },
        'en-US': {
            menuCommandLabel: 'X - Shortcut settings',
            panelTitle: 'X - Custom shortcuts',
            shortcuts: {
                home: 'Home',
                bookmarks: 'Bookmarks',
                grok: 'Grok',
                sortRelevant: 'Relevant',
                sortRecency: 'Latest'
            }
        }
    });

    function createSvgIconDataUrl(body, { color = '#111827', strokeWidth = '2' } = {}) {
        const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="${color}" stroke-width="${strokeWidth}" stroke-linecap="round" stroke-linejoin="round">${body}</svg>`;
        return `data:image/svg+xml,${encodeURIComponent(svg)}`;
    }

    function createShortcutIconSet(body, options = {}) {
        return Object.freeze({
            icon: createSvgIconDataUrl(body, { color: '#111827', ...options }),
            iconDark: createSvgIconDataUrl(body, { color: '#F8FAFC', ...options }),
            iconAdaptive: false
        });
    }

    const SHORTCUT_ICON_SETS = Object.freeze({
        home: createShortcutIconSet('<path d="M15 21v-8a1 1 0 0 0-1-1h-4a1 1 0 0 0-1 1v8"/><path d="M3 10a2 2 0 0 1 .709-1.528l7-5.999a2 2 0 0 1 2.582 0l7 5.999A2 2 0 0 1 21 10v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>'),
        bookmarks: createShortcutIconSet('<path d="m19 21-7-4-7 4V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/>'),
        grok: createShortcutIconSet('<path d="M9.937 15.5A2 2 0 0 0 8.5 14.063l-6.135-1.582a.5.5 0 0 1 0-.962L8.5 9.936A2 2 0 0 0 9.937 8.5l1.582-6.135a.5.5 0 0 1 .963 0L14.063 8.5A2 2 0 0 0 15.5 9.937l6.135 1.581a.5.5 0 0 1 0 .964L15.5 14.063a2 2 0 0 0-1.437 1.437l-1.582 6.135a.5.5 0 0 1-.963 0z"/><path d="M20 3v4"/><path d="M22 5h-4"/>'),
        sortRelevant: createShortcutIconSet('<path d="M3 6h18"/><path d="M7 12h10"/><path d="M10 18h4"/>'),
        sortRecency: createShortcutIconSet('<circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/>')
    });

    const X_SPA_NAVIGATION_SHORTCUTS = Object.freeze({
        '/home': Object.freeze({
            url: 'https://x.com/home',
            urlMethod: 'spa',
            urlAdvanced: 'pushState'
        }),
        '/i/history': Object.freeze({
            url: 'https://x.com/i/history',
            urlMethod: 'spa',
            urlAdvanced: 'pushState'
        }),
        '/i/grok': Object.freeze({
            url: 'https://x.com/i/grok',
            urlMethod: 'spa',
            urlAdvanced: 'pushState'
        })
    });

    const defaultIcons = [
        { name: 'X', url: defaultIconURL },
        { name: 'ChatGPT', url: 'https://chatgpt.com/favicon.ico' },
        { name: 'Claude', url: 'https://claude.ai/favicon.ico' },
        { name: 'Gemini', url: 'https://www.gstatic.com/lamda/images/gemini_sparkle_v002_d4735304ff6292a690345.svg' },
        { name: 'Grok', url: 'https://grok.com/favicon.ico' },
        { name: 'Perplexity', url: 'https://www.perplexity.ai/favicon.ico' },
        { name: 'GitHub', url: 'https://github.githubassets.com/favicons/favicon.svg' }
    ];

    const protectedIconUrls = [defaultIconURL];

    const baseShortcut = {
        url: '',
        urlMethod: 'current',
        urlAdvanced: 'href',
        selector: '',
        simulateKeys: '',
        customAction: '',
        data: {},
        icon: defaultIconURL
    };

    function createShortcut(overrides, iconKey = '') {
        const iconSet = SHORTCUT_ICON_SETS[String(iconKey || '')] || {};
        return { ...baseShortcut, ...iconSet, ...(overrides || {}) };
    }

    const defaultShortcuts = [
        createShortcut({
            key: 'x.home',
            name: 'Home',
            labelKey: 'shortcuts.home',
            actionType: 'url',
            ...X_SPA_NAVIGATION_SHORTCUTS['/home'],
            hotkey: 'CTRL+H'
        }, 'home'),
        createShortcut({
            key: 'x.bookmarks',
            name: 'Bookmarks',
            labelKey: 'shortcuts.bookmarks',
            actionType: 'url',
            ...X_SPA_NAVIGATION_SHORTCUTS['/i/history'],
            hotkey: 'CTRL+B'
        }, 'bookmarks'),
        createShortcut({
            key: 'x.grok',
            name: 'Grok',
            labelKey: 'shortcuts.grok',
            actionType: 'url',
            ...X_SPA_NAVIGATION_SHORTCUTS['/i/grok'],
            hotkey: 'CTRL+G'
        }, 'grok'),
        createShortcut({
            key: 'x.sortRelevant',
            name: 'Relevant',
            labelKey: 'shortcuts.sortRelevant',
            actionType: 'url',
            url: X_REPLY_SORT_RELEVANT_URL,
            urlMethod: 'spa',
            urlAdvanced: 'pushState',
            hotkey: 'CTRL+R'
        }, 'sortRelevant'),
        createShortcut({
            key: 'x.sortRecency',
            name: 'Latest',
            labelKey: 'shortcuts.sortRecency',
            actionType: 'url',
            url: X_REPLY_SORT_RECENCY_URL,
            urlMethod: 'spa',
            urlAdvanced: 'pushState',
            hotkey: 'CTRL+N'
        }, 'sortRecency')
    ];

    function gmGetValueLocal(key, fallback) {
        if (typeof GM_getValue !== 'function') return fallback;
        try {
            const value = GM_getValue(key, fallback);
            if (value && typeof value.then === 'function') return fallback;
            return value === undefined ? fallback : value;
        } catch {
            return fallback;
        }
    }

    function gmSetValueLocal(key, value) {
        if (typeof GM_setValue !== 'function') return;
        try {
            GM_setValue(key, value);
        } catch {}
    }

    function normalizeXHotkey(value) {
        return String(value || '')
            .replace(/\s+/g, '')
            .toUpperCase()
            .replace(/\bCONTROL\b/g, 'CTRL')
            .replace(/\bCOMMAND\b/g, 'CMD')
            .replace(/\bOPTION\b/g, 'ALT');
    }

    function isXReplySortShortcut(shortcut, key) {
        if (!shortcut || typeof shortcut !== 'object') return false;
        if (String(shortcut.key || '').trim() === key) return true;
        const mode = key === 'x.sortRecency' ? 'recency' : 'relevant';
        return getXReplySortModeFromUrl(shortcut.url) === mode
            && String(shortcut.actionType || '').trim() === 'url';
    }

    function migrateXReplySortShortcuts() {
        const migratedRaw = gmGetValueLocal(REPLY_SORT_MIGRATION_KEY, false);
        if (migratedRaw === true || migratedRaw === 'true') return;

        const stored = gmGetValueLocal(SHORTCUTS_STORAGE_KEY, null);
        if (!Array.isArray(stored)) {
            gmSetValueLocal(REPLY_SORT_MIGRATION_KEY, true);
            return;
        }

        const templates = defaultShortcuts.filter((shortcut) => shortcut.key === 'x.sortRelevant' || shortcut.key === 'x.sortRecency');
        const next = stored.slice();
        let changed = false;
        for (const template of templates) {
            if (next.some((shortcut) => isXReplySortShortcut(shortcut, template.key))) continue;
            const hotkeyTaken = next.some((shortcut) => normalizeXHotkey(shortcut?.hotkey) === normalizeXHotkey(template.hotkey));
            next.push({
                ...template,
                hotkey: hotkeyTaken ? '' : template.hotkey
            });
            changed = true;
        }

        if (changed) gmSetValueLocal(SHORTCUTS_STORAGE_KEY, next);
        gmSetValueLocal(REPLY_SORT_MIGRATION_KEY, true);
    }

    function shouldMigrateXReplySortToSpa(shortcut) {
        if (!shortcut || typeof shortcut !== 'object') return false;
        if (String(shortcut.actionType || '').trim() !== 'url') return false;
        const method = String(shortcut.urlMethod || 'current').trim();
        const advanced = String(shortcut.urlAdvanced || 'href').trim();
        return method !== 'spa' || advanced !== 'pushState';
    }

    function migrateXReplySortToSpa() {
        const migratedRaw = gmGetValueLocal(REPLY_SORT_SPA_MIGRATION_KEY, false);
        if (migratedRaw === true || migratedRaw === 'true') return;

        const stored = gmGetValueLocal(SHORTCUTS_STORAGE_KEY, null);
        if (!Array.isArray(stored)) {
            gmSetValueLocal(REPLY_SORT_SPA_MIGRATION_KEY, true);
            return;
        }

        let changed = false;
        const next = stored.map((shortcut) => {
            const isSortShortcut = isXReplySortShortcut(shortcut, 'x.sortRelevant')
                || isXReplySortShortcut(shortcut, 'x.sortRecency');
            if (!isSortShortcut || !shouldMigrateXReplySortToSpa(shortcut)) return shortcut;
            changed = true;
            return {
                ...shortcut,
                urlMethod: 'spa',
                urlAdvanced: 'pushState'
            };
        });

        if (changed) gmSetValueLocal(SHORTCUTS_STORAGE_KEY, next);
        gmSetValueLocal(REPLY_SORT_SPA_MIGRATION_KEY, true);
    }

    function resolveUrlTemplate(targetUrl) {
        return resolveXReplySortUrl(targetUrl, typeof location !== 'undefined' ? location.href : '');
    }

    migrateXReplySortShortcuts();
    migrateXReplySortToSpa();

    const engine = ShortcutTemplate.createShortcutEngine({
        menuCommandLabel: 'X - 设置快捷键',
        panelTitle: 'X - 自定义快捷键',
        storageKeys: {
            shortcuts: SHORTCUTS_STORAGE_KEY,
            iconCachePrefix: 'x_icon_cache_v1::',
            userIcons: 'x_user_icons_v1'
        },
        ui: {
            idPrefix: 'xcom',
            cssPrefix: 'xcom'
        },
        i18n: {
            messages: SITE_MESSAGES
        },
        defaultIconURL,
        iconLibrary: defaultIcons,
        protectedIconUrls,
        defaultShortcuts,
        consoleTag: LOG_TAG,
        colors: {
            primary: '#111827'
        },
        resolveUrlTemplate,
        shouldBypassIconCache: (url) => {
            const value = String(url || '');
            return value.startsWith('https://abs.twimg.com/')
                || value.startsWith('https://x.com/')
                || value.startsWith('https://twitter.com/')
                || value.startsWith('data:image/');
        }
    });

    engine.init();
})();
