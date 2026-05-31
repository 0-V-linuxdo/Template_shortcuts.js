/* -------------------------------------------------------------------------- *
 * Site Entry · [QuiverAI] 快捷键跳转
 * -------------------------------------------------------------------------- */

(function() {
    'use strict';

    const ShortcutTemplate = window.ShortcutTemplate;

    if (!ShortcutTemplate || typeof ShortcutTemplate.createShortcutEngine !== 'function') {
        console.error('[QuiverAI Shortcut] Template module not found.');
        return;
    }

    const LOG_TAG = '[QuiverAI Shortcut Script]';
    const TemplateUtils = ShortcutTemplate.utils || {};
    const DomUtils = TemplateUtils.dom || {};
    const EventUtils = TemplateUtils.events || {};

    const safeQuerySelectorAll = typeof DomUtils.safeQuerySelectorAll === 'function'
        ? DomUtils.safeQuerySelectorAll
        : (root, selector) => {
            const base = root && typeof root.querySelectorAll === 'function' ? root : document;
            try {
                return Array.from(base.querySelectorAll(selector));
            } catch {
                return [];
            }
        };

    const isVisible = typeof DomUtils.isVisible === 'function'
        ? DomUtils.isVisible
        : (element) => {
            if (!element || element.hidden) return false;
            try {
                return !!(element.offsetWidth || element.offsetHeight || element.getClientRects().length);
            } catch {
                return false;
            }
        };

    const defaultIconURL = 'https://app.quiver.ai/favicon.ico';
    const QUIVER_DEFAULT_SHORTCUTS_STORAGE_KEY = 'quiver_shortcuts_v1';

    const SITE_MESSAGES = Object.freeze({
        'zh-CN': {
            menuCommandLabel: 'QuiverAI - 设置快捷键',
            panelTitle: 'QuiverAI - 自定义快捷键',
            shortcuts: {
                toggleSidebar: '侧边栏 展开/折叠',
                creations: 'Creations',
                gallery: 'Gallery'
            }
        },
        'en-US': {
            menuCommandLabel: 'QuiverAI - Shortcut settings',
            panelTitle: 'QuiverAI - Custom shortcuts',
            shortcuts: {
                toggleSidebar: 'Toggle Sidebar',
                creations: 'Creations',
                gallery: 'Gallery'
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
        sidebar: createShortcutIconSet('<rect width="18" height="18" x="3" y="3" rx="2"/><path d="M9 3v18"/><path d="m16 15-3-3 3-3"/>'),
        creations: createShortcutIconSet('<path d="M16 5h6"/><path d="M19 2v6"/><path d="M21 11.5V19a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h7.5"/><path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21"/><circle cx="9" cy="9" r="2"/>'),
        gallery: createShortcutIconSet('<path d="M2 7v10"/><path d="M6 5v14"/><rect width="12" height="18" x="10" y="3" rx="2"/>')
    });

    const LEGACY_SHORTCUT_ICON_SETS = Object.freeze({
        sidebar: createShortcutIconSet('<rect x="3" y="4" width="18" height="16" rx="2"/><path d="M9 4v16"/><path d="M6.5 9h.01"/><path d="M6.5 12h.01"/><path d="M6.5 15h.01"/>', { strokeWidth: '1.9' }),
        creations: createShortcutIconSet('<path d="M12 5v14"/><path d="M5 12h14"/><rect x="4" y="4" width="16" height="16" rx="3"/>', { strokeWidth: '1.9' }),
        gallery: createShortcutIconSet('<rect x="3" y="5" width="18" height="14" rx="2"/><circle cx="8.5" cy="10" r="1.5"/><path d="m21 15-4.5-4.5L11 16l-2-2-4 5"/>', { strokeWidth: '1.9' })
    });

    const SHORTCUT_ICON_KEYS = Object.freeze({
        'quiver.toggleSidebar': 'sidebar',
        'quiver.creations': 'creations',
        'quiver.gallery': 'gallery'
    });

    const QUIVER_SPA_NAVIGATION_SHORTCUTS = Object.freeze({
        '/creations': Object.freeze({
            url: 'https://app.quiver.ai/creations',
            urlMethod: 'spa',
            urlAdvanced: 'pushState'
        }),
        '/gallery': Object.freeze({
            url: 'https://app.quiver.ai/gallery',
            urlMethod: 'spa',
            urlAdvanced: 'pushState'
        })
    });

    const defaultIcons = [
        { name: 'QuiverAI', url: defaultIconURL },
        { name: 'ChatGPT', url: 'https://chatgpt.com/favicon.ico' },
        { name: 'Claude', url: 'https://claude.ai/favicon.ico' },
        { name: 'Gemini', url: 'https://www.gstatic.com/lamda/images/gemini_sparkle_v002_d4735304ff6292a690345.svg' },
        { name: 'Perplexity', url: 'https://www.perplexity.ai/favicon.ico' }
    ];

    const protectedIconUrls = [
        defaultIconURL
    ];

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

    function getDefaultShortcutIconKey(shortcut) {
        const key = String(shortcut?.key || '').trim();
        if (SHORTCUT_ICON_KEYS[key]) return SHORTCUT_ICON_KEYS[key];

        const name = String(shortcut?.name || '').trim().toLowerCase();
        if (name === 'toggle sidebar') return 'sidebar';
        if (name === 'creations' || name === 'create') return 'creations';
        if (name === 'gallery') return 'gallery';
        return '';
    }

    function isManagedShortcutIcon(value, iconKey) {
        const icon = String(value || '').trim();
        if (!icon) return true;
        if (icon === defaultIconURL) return true;
        const currentIconSet = SHORTCUT_ICON_SETS[iconKey] || null;
        if (currentIconSet && (icon === currentIconSet.icon || icon === currentIconSet.iconDark)) return true;
        const legacyIconSet = LEGACY_SHORTCUT_ICON_SETS[iconKey] || null;
        return !!legacyIconSet && (icon === legacyIconSet.icon || icon === legacyIconSet.iconDark);
    }

    function getQuiverSpaNavigationConfig(shortcut) {
        if (!shortcut || typeof shortcut !== 'object' || Array.isArray(shortcut)) return null;
        const actionType = String(shortcut.actionType || '').trim();
        if (actionType && actionType !== 'url') return null;

        const url = String(shortcut.url || '').trim();
        if (!url) return null;
        try {
            const target = new URL(url, location.origin);
            if (target.hostname !== 'app.quiver.ai') return null;
            return QUIVER_SPA_NAVIGATION_SHORTCUTS[target.pathname.replace(/\/+$/, '')] || null;
        } catch {
            return QUIVER_SPA_NAVIGATION_SHORTCUTS[url.replace(/^https:\/\/app\.quiver\.ai/i, '').replace(/\/+$/, '')] || null;
        }
    }

    function migrateDefaultShortcuts() {
        if (typeof GM_getValue !== 'function' || typeof GM_setValue !== 'function') return;
        let stored = null;
        try {
            stored = GM_getValue(QUIVER_DEFAULT_SHORTCUTS_STORAGE_KEY, null);
        } catch {
            stored = null;
        }
        if (!Array.isArray(stored)) return;

        let changed = false;
        const next = stored.map((shortcut) => {
            if (!shortcut || typeof shortcut !== 'object' || Array.isArray(shortcut)) return shortcut;
            const iconKey = getDefaultShortcutIconKey(shortcut);
            const iconSet = SHORTCUT_ICON_SETS[iconKey] || null;

            let updated = shortcut;
            const ensureUpdated = () => {
                if (updated === shortcut) updated = { ...shortcut };
                return updated;
            };
            const replaceLightIcon = iconSet && isManagedShortcutIcon(shortcut.icon, iconKey);
            const replaceDarkIcon = replaceLightIcon && isManagedShortcutIcon(shortcut.iconDark, iconKey);

            if (replaceLightIcon && shortcut.icon !== iconSet.icon) {
                ensureUpdated().icon = iconSet.icon;
                changed = true;
            }
            if (replaceDarkIcon && shortcut.iconDark !== iconSet.iconDark) {
                ensureUpdated().iconDark = iconSet.iconDark;
                changed = true;
            }
            if ((replaceLightIcon || replaceDarkIcon) && shortcut.iconAdaptive) {
                ensureUpdated().iconAdaptive = false;
                changed = true;
            }
            const spaConfig = getQuiverSpaNavigationConfig(updated);
            if (spaConfig) {
                for (const field of ['url', 'urlMethod', 'urlAdvanced']) {
                    if (updated[field] !== spaConfig[field]) {
                        ensureUpdated()[field] = spaConfig[field];
                        changed = true;
                    }
                }
            }
            return updated;
        });

        if (!changed) return;
        try {
            GM_setValue(QUIVER_DEFAULT_SHORTCUTS_STORAGE_KEY, next);
        } catch {}
    }

    const defaultShortcuts = [
        createShortcut({
            key: 'quiver.toggleSidebar',
            name: 'Toggle Sidebar',
            labelKey: 'shortcuts.toggleSidebar',
            actionType: 'custom',
            customAction: 'toggleSidebar',
            hotkey: 'CTRL+B'
        }, 'sidebar'),
        createShortcut({
            key: 'quiver.creations',
            name: 'Creations',
            labelKey: 'shortcuts.creations',
            actionType: 'url',
            ...QUIVER_SPA_NAVIGATION_SHORTCUTS['/creations'],
            hotkey: 'CTRL+C'
        }, 'creations'),
        createShortcut({
            key: 'quiver.gallery',
            name: 'Gallery',
            labelKey: 'shortcuts.gallery',
            actionType: 'url',
            ...QUIVER_SPA_NAVIGATION_SHORTCUTS['/gallery'],
            hotkey: 'CTRL+G'
        }, 'gallery')
    ];

    function normalizeText(text) {
        if (typeof DomUtils.normalizeText === 'function') return DomUtils.normalizeText(text);
        return String(text || '').replace(/\s+/g, ' ').trim().toLowerCase();
    }

    function getElementText(element) {
        if (!element) return '';
        const parts = [];
        for (const attr of ['aria-label', 'title', 'data-tooltip', 'data-testid', 'data-test-id', 'class']) {
            const value = element.getAttribute?.(attr);
            if (value) parts.push(value);
        }
        if (element.textContent) parts.push(element.textContent);
        return parts.join(' ');
    }

    function isDisabled(element) {
        if (!element) return true;
        if (element.disabled) return true;
        return element.getAttribute?.('aria-disabled') === 'true';
    }

    function isUsableElement(element) {
        return !!element && isVisible(element) && !isDisabled(element);
    }

    function getClickableElement(element) {
        if (!element) return null;
        return element.closest?.('button, a, [role="button"], [onclick], [tabindex]') || element;
    }

    function clickElement(element) {
        const target = getClickableElement(element);
        if (!target || !isUsableElement(target)) return false;

        if (typeof EventUtils.simulateClick === 'function') {
            try {
                if (EventUtils.simulateClick(target, { nativeFallback: true })) return true;
            } catch {}
        }

        try {
            if (typeof target.click === 'function') {
                target.click();
                return true;
            }
        } catch {}

        try {
            target.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true, view: window }));
            return true;
        } catch {
            return false;
        }
    }

    function getVisibleElements(selectors, root = document) {
        const elements = [];
        const seen = new Set();
        for (const selector of selectors) {
            for (const element of safeQuerySelectorAll(root, selector)) {
                const target = getClickableElement(element);
                if (!target || seen.has(target) || !isUsableElement(target)) continue;
                seen.add(target);
                elements.push(target);
            }
        }
        return elements;
    }

    function isTopLeftControl(element, { maxTop = 112, maxLeft = 380 } = {}) {
        try {
            const rect = element.getBoundingClientRect();
            if (rect.top < 0 || rect.top > maxTop) return false;
            if (rect.left < 0 || rect.left > maxLeft) return false;
            if (rect.width > 112 || rect.height > 88) return false;
            return true;
        } catch {
            return false;
        }
    }

    function scoreSidebarToggleCandidate(element) {
        const text = normalizeText(getElementText(element));
        let score = 0;
        if (element.matches?.('button[data-sidebar="trigger"]')) score += 80;
        if (/\b(sidebar|side nav|navigation|nav|panel|menu|collapse|expand|toggle)\b/.test(text)) score += 30;
        if (/\b(lucide-panel-left|lucide-sidebar|lucide-menu|panel-left|sidebar|menu)\b/.test(text)) score += 20;
        if (element.tagName === 'BUTTON') score += 12;
        try {
            const rect = element.getBoundingClientRect();
            score += Math.max(0, 80 - rect.top) / 8;
            score += Math.max(0, 380 - rect.left) / 40;
        } catch {}
        return score;
    }

    function findDirectSidebarToggle() {
        const selectors = [
            'button[data-sidebar="trigger"]',
            'button[aria-label*="sidebar" i]',
            'button[title*="sidebar" i]',
            'button[aria-label*="side nav" i]',
            'button[title*="side nav" i]',
            'button[aria-label*="navigation" i]',
            'button[title*="navigation" i]',
            'button[aria-label*="menu" i]',
            'button[title*="menu" i]',
            'button[aria-label*="collapse" i]',
            'button[title*="collapse" i]',
            'button[aria-label*="expand" i]',
            'button[title*="expand" i]',
            'button:has(svg.lucide-panel-left)',
            'button:has(svg.lucide-sidebar)',
            'button:has(svg.lucide-menu)',
            'button:has(svg[class*="panel-left"])',
            'button:has(svg[class*="sidebar"])',
            'button:has(svg[class*="menu"])'
        ];
        const candidates = getVisibleElements(selectors)
            .filter((element) => isTopLeftControl(element))
            .sort((a, b) => scoreSidebarToggleCandidate(b) - scoreSidebarToggleCandidate(a));
        return candidates[0] || null;
    }

    function getAnchorHref(element) {
        const href = element?.getAttribute?.('href') || '';
        try {
            return href ? new URL(href, location.origin).pathname : '';
        } catch {
            return href;
        }
    }

    function countQuiverNavLinks(container) {
        if (!container || typeof container.querySelectorAll !== 'function') return 0;
        const paths = new Set(['/creations', '/gallery', '/settings/api-keys', '/settings/billing', '/settings/usage']);
        let count = 0;
        for (const link of safeQuerySelectorAll(container, 'a[href]')) {
            if (paths.has(getAnchorHref(link))) count += 1;
        }
        return count;
    }

    function findSidebarNavContainer() {
        const links = getVisibleElements([
            'a[href$="/creations"]',
            'a[href$="/gallery"]',
            'a[href$="/settings/api-keys"]'
        ]).filter((element) => ['/creations', '/gallery', '/settings/api-keys'].includes(getAnchorHref(element)));

        let best = null;
        let bestScore = 0;
        for (const link of links) {
            let node = link.parentElement;
            for (let depth = 0; node && depth < 8; depth += 1, node = node.parentElement) {
                const navLinkCount = countQuiverNavLinks(node);
                if (navLinkCount < 3) continue;
                let score = navLinkCount * 20;
                try {
                    const rect = node.getBoundingClientRect();
                    if (rect.left <= 360) score += 20;
                    if (rect.width > 80 && rect.width <= 360) score += 30;
                    if (rect.height >= 240) score += 20;
                    if (rect.top <= 24) score += 10;
                    if (rect.width > 520) score -= 70;
                } catch {}
                if (score > bestScore) {
                    best = node;
                    bestScore = score;
                }
            }
        }
        return best;
    }

    function findToggleInsideSidebarNav() {
        const nav = findSidebarNavContainer();
        if (!nav) return null;

        const buttons = getVisibleElements(['button', '[role="button"]'], nav).filter((element) => {
            try {
                const navRect = nav.getBoundingClientRect();
                const rect = element.getBoundingClientRect();
                if (rect.top > navRect.top + 88) return false;
                if (rect.width > 80 || rect.height > 72) return false;
                return true;
            } catch {
                return false;
            }
        });

        buttons.sort((a, b) => {
            const rectA = a.getBoundingClientRect();
            const rectB = b.getBoundingClientRect();
            const scoreA = scoreSidebarToggleCandidate(a);
            const scoreB = scoreSidebarToggleCandidate(b);
            if (scoreA !== scoreB) return scoreB - scoreA;
            if (rectA.top !== rectB.top) return rectA.top - rectB.top;
            return rectB.right - rectA.right;
        });

        return buttons[0] || null;
    }

    function findCollapsedSidebarToggle() {
        const candidates = getVisibleElements(['button', '[role="button"]'])
            .filter((element) => isTopLeftControl(element, { maxTop: 96, maxLeft: 320 }))
            .sort((a, b) => {
                const scoreA = scoreSidebarToggleCandidate(a);
                const scoreB = scoreSidebarToggleCandidate(b);
                if (scoreA !== scoreB) return scoreB - scoreA;
                const rectA = a.getBoundingClientRect();
                const rectB = b.getBoundingClientRect();
                if (rectA.top !== rectB.top) return rectA.top - rectB.top;
                return rectA.left - rectB.left;
            });
        return candidates[0] || null;
    }

    function toggleSidebar() {
        const target = findDirectSidebarToggle() ||
            findToggleInsideSidebarNav() ||
            findCollapsedSidebarToggle();

        if (!clickElement(target)) {
            console.warn(`${LOG_TAG} sidebar toggle button not found.`);
        }
    }

    const CUSTOM_ACTIONS = Object.freeze({
        toggleSidebar
    });

    migrateDefaultShortcuts();

    const engine = ShortcutTemplate.createShortcutEngine({
        menuCommandLabel: 'QuiverAI - 设置快捷键',
        panelTitle: 'QuiverAI - 自定义快捷键',
        storageKeys: {
            shortcuts: QUIVER_DEFAULT_SHORTCUTS_STORAGE_KEY,
            iconCachePrefix: 'quiver_icon_cache_v1::',
            userIcons: 'quiver_user_icons_v1'
        },
        ui: {
            idPrefix: 'quiver',
            cssPrefix: 'quiver'
        },
        i18n: {
            messages: SITE_MESSAGES
        },
        defaultIconURL,
        iconLibrary: defaultIcons,
        protectedIconUrls,
        defaultShortcuts,
        customActions: CUSTOM_ACTIONS,
        consoleTag: LOG_TAG,
        colors: {
            primary: '#111827'
        },
        shouldBypassIconCache: (url) => {
            return url && url.startsWith('https://app.quiver.ai/');
        }
    });

    engine.init();
})();
