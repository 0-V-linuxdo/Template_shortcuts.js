/* -------------------------------------------------------------------------- *
 * Site Entry · [AI Studio] 快捷键跳转
 * -------------------------------------------------------------------------- */

(function() {
    'use strict';

    const ShortcutTemplate = window.ShortcutTemplate;

    if (!ShortcutTemplate || typeof ShortcutTemplate.createShortcutEngine !== 'function') {
        console.error('[AI Studio Shortcut] Template module not found.');
        return;
    }

    const LOG_TAG = '[AI Studio Shortcut Script]';
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

    const sleep = typeof TemplateUtils.sleep === 'function'
        ? TemplateUtils.sleep
        : (ms) => new Promise(resolve => setTimeout(resolve, ms));

    const defaultIconURL = 'https://aistudio.google.com/favicon.ico';

    const SITE_MESSAGES = Object.freeze({
        'zh-CN': {
            menuCommandLabel: 'AI Studio - 设置快捷键',
            panelTitle: 'AI Studio - 自定义快捷键',
            shortcuts: {
                toggleLeftSidebar: '左侧边栏展开/折叠',
                toggleRightSidebar: '右侧边栏展开/折叠',
                history: '历史',
                dashboard: 'Dashboard',
                toolGoogleSearch: '工具：Google 搜索',
                toolCodeExecution: '工具：代码执行',
                toolUrlContext: '工具：URL 上下文'
            },
            dataAdapters: {
                toolSwitch: {
                    label: '工具名称关键词（或粘贴 JSON，高级用法）:',
                    placeholder: '例如: Grounding with Google Search / Code execution / URL context'
                }
            }
        },
        'en-US': {
            menuCommandLabel: 'AI Studio - Shortcut settings',
            panelTitle: 'AI Studio - Custom shortcuts',
            shortcuts: {
                toggleLeftSidebar: 'Toggle left sidebar',
                toggleRightSidebar: 'Toggle right sidebar',
                history: 'History',
                dashboard: 'Dashboard',
                toolGoogleSearch: 'Tool: Google Search',
                toolCodeExecution: 'Tool: Code execution',
                toolUrlContext: 'Tool: URL context'
            },
            dataAdapters: {
                toolSwitch: {
                    label: 'Tool keyword (or paste JSON, advanced):',
                    placeholder: 'Example: Grounding with Google Search / Code execution / URL context'
                }
            }
        }
    });

    const siteText = (key, fallback) => ({ ctx } = {}) => ctx?.i18n?.t?.(key, {}, fallback) || fallback;

    function createSvgIconDataUrl(body, { color = '#202124' } = {}) {
        const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="${color}" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round">${body}</svg>`;
        return `data:image/svg+xml,${encodeURIComponent(svg)}`;
    }

    function createShortcutIconSet(body) {
        return Object.freeze({
            icon: createSvgIconDataUrl(body, { color: '#202124' }),
            iconDark: createSvgIconDataUrl(body, { color: '#F8FAFC' }),
            iconAdaptive: false
        });
    }

    const SHORTCUT_ICON_SETS = Object.freeze({
        leftSidebar: createShortcutIconSet('<rect x="3" y="4" width="18" height="16" rx="2"/><path d="M9 4v16"/><path d="M6.5 9h.01"/><path d="M6.5 12h.01"/><path d="M6.5 15h.01"/>'),
        rightSidebar: createShortcutIconSet('<rect x="3" y="4" width="18" height="16" rx="2"/><path d="M15 4v16"/><path d="M18 9h.01"/><path d="M18 12h.01"/><path d="M18 15h.01"/>'),
        history: createShortcutIconSet('<path d="M3 12a9 9 0 1 0 3-6.7"/><path d="M3 4v5h5"/><path d="M12 7v5l3 2"/>'),
        key: createShortcutIconSet('<circle cx="7.5" cy="14.5" r="3.5"/><path d="M10 12 21 1"/><path d="m16 6 3 3"/><path d="m14 8 2 2"/>'),
        search: createShortcutIconSet('<circle cx="11" cy="11" r="6"/><path d="m20 20-4.2-4.2"/><path d="M5 11h12"/><path d="M11 5a10 10 0 0 1 0 12"/><path d="M11 5a10 10 0 0 0 0 12"/>'),
        code: createShortcutIconSet('<path d="m9 18-6-6 6-6"/><path d="m15 6 6 6-6 6"/><path d="m14 4-4 16"/>'),
        urlContext: createShortcutIconSet('<path d="M10 13a5 5 0 0 0 7.1 0l2-2a5 5 0 0 0-7.1-7.1l-1.1 1.1"/><path d="M14 11a5 5 0 0 0-7.1 0l-2 2a5 5 0 0 0 7.1 7.1l1.1-1.1"/>')
    });

    const defaultIcons = [
        { name: 'AI Studio', url: defaultIconURL },
        { name: 'Google', url: 'https://www.google.com/favicon.ico' },
        { name: 'Gemini', url: 'https://www.gstatic.com/lamda/images/gemini_sparkle_v002_d4735304ff6292a690345.svg' },
        { name: 'ChatGPT', url: 'https://chatgpt.com/favicon.ico' },
        { name: 'Claude', url: 'https://claude.ai/favicon.ico' },
        { name: 'Perplexity', url: 'https://www.perplexity.ai/favicon.ico' },
        { name: 'GitHub', url: 'https://github.githubassets.com/favicons/favicon.svg' },
        { name: 'YouTube', url: 'https://www.youtube.com/favicon.ico' }
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
            key: 'aistudio.toggleLeftSidebar',
            name: 'Toggle Left Sidebar',
            labelKey: 'shortcuts.toggleLeftSidebar',
            actionType: 'custom',
            customAction: 'toggleLeftSidebar',
            hotkey: 'CTRL+B'
        }, 'leftSidebar'),
        createShortcut({
            key: 'aistudio.toggleRightSidebar',
            name: 'Toggle Right Sidebar',
            labelKey: 'shortcuts.toggleRightSidebar',
            actionType: 'custom',
            customAction: 'toggleRightSidebar',
            hotkey: 'CTRL+SHIFT+B'
        }, 'rightSidebar'),
        createShortcut({
            key: 'aistudio.history',
            name: 'History',
            labelKey: 'shortcuts.history',
            actionType: 'url',
            url: 'https://aistudio.google.com/library',
            hotkey: 'CTRL+H'
        }, 'history'),
        createShortcut({
            key: 'aistudio.dashboard',
            name: 'Dashboard',
            labelKey: 'shortcuts.dashboard',
            actionType: 'url',
            url: 'https://aistudio.google.com/api-keys',
            hotkey: 'CTRL+K'
        }, 'key'),
        createShortcut({
            key: 'aistudio.toolGoogleSearch',
            name: 'Toggle Tool: Grounding with Google Search',
            labelKey: 'shortcuts.toolGoogleSearch',
            actionType: 'custom',
            customAction: 'toolSwitch',
            hotkey: 'CTRL+SHIFT+G',
            data: { tool: { keyword: 'Grounding with Google Search', aliases: ['Google Search', 'Search'] } }
        }, 'search'),
        createShortcut({
            key: 'aistudio.toolCodeExecution',
            name: 'Toggle Tool: Code execution',
            labelKey: 'shortcuts.toolCodeExecution',
            actionType: 'custom',
            customAction: 'toolSwitch',
            hotkey: 'CTRL+SHIFT+C',
            data: { tool: { keyword: 'Code execution', aliases: ['Code execution', 'Code'] } }
        }, 'code'),
        createShortcut({
            key: 'aistudio.toolUrlContext',
            name: 'Toggle Tool: URL context',
            labelKey: 'shortcuts.toolUrlContext',
            actionType: 'custom',
            customAction: 'toolSwitch',
            hotkey: 'CTRL+SHIFT+U',
            data: { tool: { keyword: 'URL context', aliases: ['URL context', 'URL'] } }
        }, 'urlContext')
    ];

    function normalizeText(text) {
        return String(text || '').replace(/\s+/g, ' ').trim().toLowerCase();
    }

    function getElementText(element) {
        if (!element) return '';
        const parts = [];
        for (const attr of ['aria-label', 'title', 'data-tooltip', 'data-test-id', 'placeholder', 'data-mat-icon-name', 'fonticon']) {
            const value = element.getAttribute?.(attr);
            if (value) parts.push(value);
        }
        if ('value' in element && element.value) parts.push(element.value);
        if (element.textContent) parts.push(element.textContent);
        return parts.join(' ');
    }

    function textMatchesAny(element, matchers) {
        const text = normalizeText(getElementText(element));
        if (!text) return false;
        const list = Array.isArray(matchers) ? matchers : [matchers];
        return list.some((matcher) => {
            if (matcher == null) return false;
            if (matcher instanceof RegExp) {
                try {
                    return matcher.test(getElementText(element));
                } catch {
                    return false;
                }
            }
            const target = normalizeText(matcher);
            return target ? text.includes(target) : false;
        });
    }

    function isDisabled(element) {
        if (!element) return true;
        if (element.disabled) return true;
        if (element.getAttribute?.('aria-disabled') === 'true') return true;
        const disabledParent = element.closest?.('button[disabled], [aria-disabled="true"]');
        return !!disabledParent;
    }

    function getClickableElement(element) {
        if (!element) return null;
        return element.closest?.('button, a, [role="button"], [role="menuitem"], mat-chip, mat-chip-option, [onclick], [tabindex]')
            || element;
    }

    function clickElement(element) {
        const target = getClickableElement(element);
        if (!target || isDisabled(target)) return false;

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

    function clickExactElement(element) {
        if (!element || element.disabled || element.getAttribute?.('aria-disabled') === 'true') return false;

        if (typeof EventUtils.simulateClick === 'function') {
            try {
                if (EventUtils.simulateClick(element, { nativeFallback: true })) return true;
            } catch {}
        }

        try {
            if (typeof element.click === 'function') {
                element.click();
                return true;
            }
        } catch {}

        try {
            element.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true, view: window }));
            return true;
        } catch {
            return false;
        }
    }

    function clickPoint(x, y) {
        let target = null;
        try {
            target = document.elementFromPoint(x, y);
        } catch {
            target = null;
        }
        return target ? clickElement(target) : false;
    }

    function getVisibleInteractiveElements(root = document) {
        const selectors = [
            'button',
            'a',
            '[role="button"]',
            '[role="menuitem"]',
            'mat-chip',
            'mat-chip-option',
            '.mat-mdc-chip',
            '[tabindex]'
        ];
        const elements = [];
        const seen = new Set();
        for (const selector of selectors) {
            for (const element of safeQuerySelectorAll(root, selector)) {
                if (!element || seen.has(element) || !isVisible(element) || isDisabled(element)) continue;
                seen.add(element);
                elements.push(element);
            }
        }
        return elements;
    }

    function findFirstInteractiveByText(matchers, {
        root = document,
        minTop = null,
        maxTop = null,
        minLeft = null,
        maxRight = null,
        preferBottom = false
    } = {}) {
        const candidates = getVisibleInteractiveElements(root).filter((element) => {
            if (!textMatchesAny(element, matchers)) return false;
            try {
                const rect = element.getBoundingClientRect();
                if (minTop != null && rect.top < minTop) return false;
                if (maxTop != null && rect.top > maxTop) return false;
                if (minLeft != null && rect.left < minLeft) return false;
                if (maxRight != null && rect.right > maxRight) return false;
            } catch {
                return false;
            }
            return true;
        });
        if (preferBottom) {
            candidates.sort((a, b) => b.getBoundingClientRect().top - a.getBoundingClientRect().top);
        }
        return candidates[0] || null;
    }

    function scoreIconTextForSidebar(element, tokens) {
        const text = normalizeText(getElementText(element));
        let score = 0;
        for (const token of tokens) {
            if (text.includes(token)) score += 4;
        }
        if (/\b(close|collapse|expand|hide|show|tune|menu)\b|side\s*nav|sidebar|panel/.test(text)) score += 3;
        return score;
    }

    function findTopEdgeButton({ side }) {
        const viewportWidth = Math.max(document.documentElement?.clientWidth || 0, window.innerWidth || 0);
        const candidates = getVisibleInteractiveElements(document).filter((element) => {
            try {
                const rect = element.getBoundingClientRect();
                const text = normalizeText(getElementText(element));
                if (rect.top > 92 || rect.bottom < 0) return false;
                if (rect.width > 96 || rect.height > 72) return false;
                if (side === 'left') return rect.left < Math.max(280, viewportWidth * 0.24);
                if (rect.left < viewportWidth - 300) return false;
                if (rect.width > 56 && /\b(get code|run settings)\b/.test(text)) return false;
                return rect.right > viewportWidth - 300;
            } catch {
                return false;
            }
        });

        const tokens = side === 'left'
            ? ['menu', 'navigation', 'sidebar', 'side nav', 'left panel']
            : ['close', 'collapse', 'expand', 'hide', 'show', 'tune', 'right panel', 'right sidebar', 'run settings'];

        candidates.sort((a, b) => {
            const rectA = a.getBoundingClientRect();
            const rectB = b.getBoundingClientRect();
            const scoreA = scoreIconTextForSidebar(a, tokens);
            const scoreB = scoreIconTextForSidebar(b, tokens);
            if (scoreA !== scoreB) return scoreB - scoreA;
            if (side === 'right' && rectA.width !== rectB.width) return rectA.width - rectB.width;
            if (side === 'left') return rectA.left - rectB.left;
            return rectB.right - rectA.right;
        });

        return candidates[0] || null;
    }

    function toggleLeftSidebar() {
        const direct = findFirstInteractiveByText([
            /toggle.*(?:navigation|sidebar|side nav|menu)/i,
            /(?:navigation|sidebar|side nav|menu).*(?:toggle|collapse|expand)/i,
            'menu'
        ], { maxTop: 120 });
        const target = direct || findTopEdgeButton({ side: 'left' });
        if (!clickElement(target)) {
            console.warn(`${LOG_TAG} left sidebar toggle button not found.`);
        }
    }

    function toggleRightSidebar() {
        const direct = findFirstInteractiveByText([
            /(?:right panel|right sidebar|run settings|sidebar).*(?:close|collapse|expand|hide|show|toggle)/i,
            /(?:close|collapse|expand|hide|show|toggle).*(?:right panel|right sidebar|run settings|sidebar)/i,
            /^(?:close|collapse|expand|hide|show)$/i,
            'tune'
        ], { maxTop: 120 });
        const target = direct || findTopEdgeButton({ side: 'right' });
        if (!clickElement(target) && !clickRightSidebarEdgeFallback()) {
            console.warn(`${LOG_TAG} right sidebar toggle button not found.`);
        }
    }

    function clickRightSidebarEdgeFallback() {
        const viewportWidth = Math.max(document.documentElement?.clientWidth || 0, window.innerWidth || 0);
        const yCandidates = [48, 56, 64, 76].filter((value) => value < (window.innerHeight || 0));
        for (const y of yCandidates) {
            if (clickPoint(viewportWidth - 24, y)) return true;
        }
        return false;
    }

    function resolveToolTarget(data) {
        const raw = data && typeof data === 'object' && !Array.isArray(data) ? data : {};
        const tool = raw.tool ?? raw.menu ?? raw.keyword ?? raw.textMatch ?? raw;
        if (typeof tool === 'string') {
            const keyword = tool.trim();
            return { keyword, aliases: keyword ? [keyword] : [] };
        }
        if (tool && typeof tool === 'object' && !Array.isArray(tool)) {
            const keyword = String(tool.keyword || tool.name || tool.id || tool.textMatch || '').trim();
            const aliases = Array.isArray(tool.aliases)
                ? tool.aliases.map(value => String(value || '').trim()).filter(Boolean)
                : [];
            const list = [keyword, ...aliases].filter(Boolean);
            return { keyword: keyword || list[0] || '', aliases: list };
        }
        return { keyword: '', aliases: [] };
    }

    function getToolMatchers(target) {
        const aliases = Array.isArray(target?.aliases) ? target.aliases : [];
        const keyword = String(target?.keyword || '').trim();
        return Array.from(new Set([keyword, ...aliases].map(value => String(value || '').trim()).filter(Boolean)));
    }

    function findToolsButton() {
        const minTop = Math.max(0, (window.innerHeight || 0) * 0.45);
        const candidates = getVisibleInteractiveElements(document).filter((element) => {
            if (!textMatchesAny(element, ['Open tools menu', 'Tools', '工具'])) return false;
            try {
                const rect = element.getBoundingClientRect();
                if (rect.top < minTop) return false;
                if (rect.width > 160 || rect.height > 72) return false;
            } catch {
                return false;
            }
            return true;
        });

        candidates.sort((a, b) => getToolsButtonScore(b) - getToolsButtonScore(a));
        return candidates[0] || findFirstInteractiveByText([/open tools menu/i, /^tools$/i, /工具/], { preferBottom: true });
    }

    function getToolsButtonScore(element) {
        if (!element) return 0;
        const text = normalizeText(getElementText(element));
        let score = 0;
        if (text.includes('open tools menu')) score += 20;
        if (/(^|\s)tools(\s|$)|工具/.test(text)) score += 12;
        if (isInBottomPromptToolbar(element)) score += 20;
        try {
            const rect = element.getBoundingClientRect();
            const viewportWidth = Math.max(document.documentElement?.clientWidth || 0, window.innerWidth || 0);
            if (rect.left < viewportWidth * 0.72) score += 8;
            if (rect.width <= 96) score += 4;
            score += Math.max(0, rect.top / 100);
        } catch {}
        return score;
    }

    function isInBottomPromptToolbar(element) {
        if (!element) return false;
        try {
            const rect = element.getBoundingClientRect();
            const viewportHeight = Math.max(document.documentElement?.clientHeight || 0, window.innerHeight || 0);
            return rect.top > viewportHeight * 0.52;
        } catch {
            return false;
        }
    }

    function findActiveToolChip(target) {
        const matchers = getToolMatchers(target);
        if (matchers.length === 0) return null;
        const candidates = [
            'mat-chip',
            'mat-chip-option',
            '.mat-mdc-chip',
            '[class*="chip"]',
            'button',
            '[role="button"]'
        ];
        for (const selector of candidates) {
            const matches = safeQuerySelectorAll(document, selector)
                .filter(element => isVisible(element) && isInBottomPromptToolbar(element) && textMatchesAny(element, matchers));
            if (matches.length > 0) {
                matches.sort((a, b) => {
                    const rectA = a.getBoundingClientRect();
                    const rectB = b.getBoundingClientRect();
                    if (rectA.top !== rectB.top) return rectB.top - rectA.top;
                    return (rectA.width * rectA.height) - (rectB.width * rectB.height);
                });
                return matches[0];
            }
        }
        return null;
    }

    function findActiveToolRemoveButton(target) {
        const matchers = getToolMatchers(target);
        if (matchers.length === 0) return null;
        const selectors = [
            'button[aria-label*="remove" i]',
            'button[aria-label*="close" i]',
            'button[aria-label*="dismiss" i]',
            '[role="button"][aria-label*="remove" i]',
            '[role="button"][aria-label*="close" i]',
            '[aria-label*="remove" i]',
            '[aria-label*="close" i]'
        ];
        const seen = new Set();
        const candidates = [];
        for (const selector of selectors) {
            for (const element of safeQuerySelectorAll(document, selector)) {
                if (!element || seen.has(element) || !isVisible(element) || !isInBottomPromptToolbar(element)) continue;
                seen.add(element);
                if (!textMatchesAny(element, matchers)) continue;
                candidates.push(element);
            }
        }

        candidates.sort((a, b) => {
            const rectA = a.getBoundingClientRect();
            const rectB = b.getBoundingClientRect();
            const textA = normalizeText(getElementText(a));
            const textB = normalizeText(getElementText(b));
            const scoreA = (/remove|移除/.test(textA) ? 10 : 0) + rectA.left / 100;
            const scoreB = (/remove|移除/.test(textB) ? 10 : 0) + rectB.left / 100;
            return scoreB - scoreA;
        });

        return candidates[0] || null;
    }

    function closeActiveToolChip(chip, target = null) {
        if (!chip) return false;
        const explicitRemove = target ? findActiveToolRemoveButton(target) : null;
        if (clickExactElement(explicitRemove)) return true;

        const closeTarget = findChipCloseTarget(chip);
        if (clickExactElement(closeTarget)) return true;

        try {
            const rect = chip.getBoundingClientRect();
            if (rect.width > 0 && rect.height > 0) {
                const xOffsets = [14, 18, 24, 30, Math.min(38, Math.max(10, rect.width * 0.22))];
                for (const offset of xOffsets) {
                    const element = document.elementFromPoint(rect.right - offset, rect.top + rect.height / 2);
                    if (element && element !== chip && chip.contains(element) && clickExactElement(element)) return true;
                }
            }
        } catch {}

        return false;
    }

    function findChipCloseTarget(chip) {
        if (!chip) return null;

        const selectors = [
            'button[aria-label*="close" i]',
            'button[aria-label*="remove" i]',
            'button[aria-label*="dismiss" i]',
            'button[aria-label*="cancel" i]',
            '[role="button"][aria-label*="close" i]',
            '[role="button"][aria-label*="remove" i]',
            '[role="button"][aria-label*="dismiss" i]',
            '[class*="chip-remove"]',
            '[class*="chip-trailing"]',
            '[class*="remove"]',
            '[class*="close"]',
            '[class*="dismiss"]',
            'mat-icon[data-mat-icon-name="close"]',
            'mat-icon[fonticon="close"]',
            'mat-icon',
            '.material-icons',
            '.material-symbols-outlined',
            'svg',
            '[aria-hidden="true"]'
        ];
        const seen = new Set();
        const candidates = [];
        for (const selector of selectors) {
            for (const element of safeQuerySelectorAll(chip, selector)) {
                if (!element || seen.has(element) || !isVisible(element)) continue;
                seen.add(element);
                const score = getChipCloseTargetScore(element);
                if (score <= 0) continue;
                candidates.push({ element, score });
            }
        }

        candidates.sort((a, b) => {
            if (a.score !== b.score) return b.score - a.score;
            const rectA = a.element.getBoundingClientRect();
            const rectB = b.element.getBoundingClientRect();
            return rectB.right - rectA.right;
        });

        return candidates[0]?.element || null;
    }

    function getChipCloseTargetScore(element) {
        if (!element) return 0;
        const text = normalizeText(getElementText(element));
        const className = normalizeText(element.getAttribute?.('class') || '');
        const tagName = normalizeText(element.tagName || '');
        let score = 0;

        if (/(^|\b)(close|remove|dismiss|cancel|clear|delete)(\b|$)|关闭|移除|删除/.test(text)) score += 8;
        if (/^(x|×)$/.test(text)) score += 8;
        if (/chip[-_\s]*(remove|trailing)|remove|close|dismiss/.test(className)) score += 6;
        if (tagName === 'mat-icon' && /close|cancel|clear/.test(text)) score += 6;
        if (tagName === 'svg' || tagName === 'mat-icon') score += 1;

        return score;
    }

    const TOOL_SWITCH_SELECTOR = [
        '[role="switch"]',
        'button[aria-checked]',
        'input[type="checkbox"]',
        '[aria-checked]'
    ].join(',');

    const TOOL_MENU_KNOWN_LABELS = [
        'structured outputs',
        'code execution',
        'function calling',
        'grounding with google search',
        'grounding with google maps',
        'url context'
    ];

    function getVisibleToolSwitches(root = document) {
        return safeQuerySelectorAll(root, TOOL_SWITCH_SELECTOR)
            .filter(element => element && isVisible(element) && !isDisabled(element));
    }

    function countToolMenuKnownLabels(element) {
        const text = normalizeText(getElementText(element));
        if (!text) return 0;
        return TOOL_MENU_KNOWN_LABELS.reduce((count, label) => count + (text.includes(label) ? 1 : 0), 0);
    }

    function getToolsMenuRootScore(element, toolsButton) {
        if (!element || !isVisible(element)) return -1;
        const labelCount = countToolMenuKnownLabels(element);
        const switchCount = getVisibleToolSwitches(element).length;
        if (labelCount < 2 || switchCount < 2) return -1;

        try {
            const rect = element.getBoundingClientRect();
            const viewportHeight = Math.max(document.documentElement?.clientHeight || 0, window.innerHeight || 0);
            if (rect.height < 120 || rect.width < 180) return -1;
            if (rect.top < viewportHeight * 0.20 || rect.top > viewportHeight * 0.90) return -1;

            let score = labelCount * 20 + switchCount * 8;
            if (toolsButton) {
                const toolsRect = toolsButton.getBoundingClientRect();
                if (looksLikeRunSettingsToolsRoot(element, rect, toolsRect)) return -1;
                if (rect.bottom <= toolsRect.top + 18 && rect.top < toolsRect.top) score += 40;
                if (rect.left <= toolsRect.right + 420 && rect.right >= toolsRect.left - 180) score += 24;
                if (rect.left > toolsRect.right + 240) return -1;
                if (rect.left > toolsRect.left + 320) score -= 80;
                score -= Math.abs(rect.left - toolsRect.left) / 50;
                score -= Math.abs(rect.bottom - toolsRect.top) / 60;
            }
            score -= (rect.width * rect.height) / 50000;
            return score;
        } catch {
            return -1;
        }
    }

    function looksLikeRunSettingsToolsRoot(element, rect, toolsRect) {
        const text = normalizeText(getElementText(element));
        if (!text.includes('run settings') && !text.includes('advanced settings')) return false;
        return rect.left > toolsRect.right + 80 || rect.right > Math.max(toolsRect.right + 360, window.innerWidth * 0.72);
    }

    function findToolsMenuRoot({ toolsButton = null } = {}) {
        const selectors = [
            '[role="menu"]',
            '[role="listbox"]',
            '.cdk-overlay-pane',
            '.mat-mdc-menu-panel',
            '.mat-mdc-select-panel',
            '[class*="overlay"]',
            'mat-card',
            'section',
            'div'
        ];
        const seen = new Set();
        const candidates = [];
        for (const selector of selectors) {
            for (const element of safeQuerySelectorAll(document, selector)) {
                if (!element || seen.has(element)) continue;
                seen.add(element);
                const score = getToolsMenuRootScore(element, toolsButton);
                if (score <= 0) continue;
                candidates.push({ element, score });
            }
        }

        candidates.sort((a, b) => {
            if (a.score !== b.score) return b.score - a.score;
            const rectA = a.element.getBoundingClientRect();
            const rectB = b.element.getBoundingClientRect();
            return (rectA.width * rectA.height) - (rectB.width * rectB.height);
        });

        return candidates[0]?.element || null;
    }

    function findToolMenuSwitch(target, { toolsButton = null, root = null } = {}) {
        const matchers = getToolMatchers(target);
        if (matchers.length === 0) return null;
        const rootEl = root || findToolsMenuRoot({ toolsButton });
        if (!rootEl) return null;

        const rowInfo = findToolRowInToolsRoot(rootEl, matchers);
        if (!rowInfo) return null;
        const switchEl = findSwitchForToolRow(rootEl, rowInfo.row, rowInfo.label);
        return switchEl ? { root: rootEl, row: rowInfo.row, label: rowInfo.label, switchEl } : null;
    }

    function findToolRowInToolsRoot(rootEl, matchers) {
        const labelSelectors = [
            'span',
            'div',
            'label',
            'button',
            '[role="button"]',
            '[aria-label]',
            'mat-slide-toggle',
            'mat-list-item'
        ];
        const labels = [];
        const seen = new Set();
        for (const selector of labelSelectors) {
            for (const element of safeQuerySelectorAll(rootEl, selector)) {
                if (!element || seen.has(element) || !isVisible(element) || !textMatchesAny(element, matchers)) continue;
                seen.add(element);
                labels.push(element);
            }
        }

        let best = null;
        for (const label of labels) {
            let node = label;
            for (let depth = 0; node && node !== rootEl && depth < 8; depth += 1, node = node.parentElement) {
                if (!toolRowCandidateLooksValid(node, rootEl)) continue;
                const rect = node.getBoundingClientRect();
                const switchCount = getVisibleToolSwitches(node).length;
                const labelCount = countToolMenuKnownLabels(node);
                const area = rect.width * rect.height;
                const score = (switchCount ? 80 : 0) - (labelCount > 1 ? 40 : 0) - area / 1000;
                if (!best || score > best.score) {
                    best = { row: node, label, score };
                }
            }
        }

        return best;
    }

    function toolRowCandidateLooksValid(row, rootEl) {
        if (!row || row === rootEl || !isVisible(row)) return false;
        try {
            const rect = row.getBoundingClientRect();
            const rootRect = rootEl.getBoundingClientRect();
            if (rect.height < 16 || rect.height > 96 || rect.width < 120) return false;
            if (rect.top < rootRect.top - 2 || rect.bottom > rootRect.bottom + 2) return false;
            if (isInBottomPromptToolbar(row)) return false;
            const switchCount = getVisibleToolSwitches(row).length;
            const labelCount = countToolMenuKnownLabels(row);
            return switchCount > 0 || labelCount <= 1;
        } catch {
            return false;
        }
    }

    function findSwitchForToolRow(rootEl, row, label) {
        const direct = getVisibleToolSwitches(row);
        if (direct.length > 0) {
            direct.sort((a, b) => b.getBoundingClientRect().left - a.getBoundingClientRect().left);
            return direct[0] || null;
        }

        let rowRect = null;
        let labelRect = null;
        try {
            rowRect = row.getBoundingClientRect();
            labelRect = label?.getBoundingClientRect?.() || rowRect;
        } catch {
            return null;
        }

        const rowCenterY = rowRect.top + rowRect.height / 2;
        const switches = getVisibleToolSwitches(rootEl).map((element) => {
            const rect = element.getBoundingClientRect();
            let distance = Math.abs((rect.top + rect.height / 2) - rowCenterY);
            if (rect.left < labelRect.right) distance += 80;
            return { element, distance };
        });

        switches.sort((a, b) => a.distance - b.distance);
        return switches[0]?.element || null;
    }

    async function waitForToolsMenuRoot(toolsButton) {
        for (let i = 0; i < 8; i += 1) {
            const root = findToolsMenuRoot({ toolsButton });
            if (root) return root;
            await sleep(80);
        }
        return null;
    }

    async function openToolsMenu(toolsButton = null) {
        const targetButton = toolsButton || findToolsButton();
        if (!targetButton) return { button: null, root: null };

        const existingRoot = findToolsMenuRoot({ toolsButton: targetButton });
        if (existingRoot) return { button: targetButton, root: existingRoot };

        if (!clickElement(targetButton)) return { button: targetButton, root: null };
        await sleep(180);
        return { button: targetButton, root: await waitForToolsMenuRoot(targetButton) };
    }

    async function toggleToolSwitch({ shortcut } = {}) {
        const target = resolveToolTarget(shortcut?.data || {});
        if (!target.keyword) {
            console.warn(`${LOG_TAG} toolSwitch shortcut has no tool keyword.`);
            return;
        }

        const activeChip = findActiveToolChip(target);
        if (activeChip) {
            const closedByChip = closeActiveToolChip(activeChip, target);
            await sleep(240);
            if (closedByChip && !findActiveToolChip(target)) {
                return;
            }
            const menu = await openToolsMenu(findToolsButton());
            const menuSwitch = findToolMenuSwitch(target, { toolsButton: menu.button, root: menu.root });
            if (menuSwitch && clickExactElement(menuSwitch.switchEl)) {
                await sleep(180);
                if (!findActiveToolChip(target)) return;
            }
            console.warn(`${LOG_TAG} failed to close active tool chip: ${target.keyword}`);
            return;
        }

        const menu = await openToolsMenu(findToolsButton());
        const menuSwitch = findToolMenuSwitch(target, { toolsButton: menu.button, root: menu.root });
        if (menuSwitch && clickExactElement(menuSwitch.switchEl)) {
            return;
        }

        console.warn(`${LOG_TAG} tool menu item not found: ${target.keyword}`);
    }

    function formatToolSwitchData(data) {
        const target = resolveToolTarget(data);
        if (target.keyword) return target.keyword;
        try {
            return JSON.stringify(data || {}, null, 2);
        } catch {
            return '';
        }
    }

    function parseToolSwitchData(text) {
        const trimmed = String(text ?? '').trim();
        if (!trimmed) return {};
        if (trimmed.startsWith('{') || trimmed.startsWith('[')) {
            const parsed = JSON.parse(trimmed);
            if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) throw new Error('data must be an object');
            return parsed;
        }
        return { tool: { keyword: trimmed } };
    }

    const engine = ShortcutTemplate.createShortcutEngine({
        menuCommandLabel: 'AI Studio - 设置快捷键',
        panelTitle: 'AI Studio - 自定义快捷键',
        storageKeys: {
            shortcuts: 'aistudio_shortcuts_v1',
            iconCachePrefix: 'aistudio_icon_cache_v1::',
            userIcons: 'aistudio_user_icons_v1'
        },
        ui: {
            idPrefix: 'aistudio',
            cssPrefix: 'aistudio',
            compactBreakpoint: 800
        },
        i18n: {
            messages: SITE_MESSAGES
        },
        defaultIconURL,
        iconLibrary: defaultIcons,
        protectedIconUrls,
        defaultShortcuts,
        customActions: {
            toggleLeftSidebar,
            toggleRightSidebar,
            toolSwitch: toggleToolSwitch
        },
        customActionDataAdapters: {
            toolSwitch: {
                label: siteText('dataAdapters.toolSwitch.label', 'Tool keyword (or paste JSON, advanced):'),
                placeholder: siteText('dataAdapters.toolSwitch.placeholder', 'Example: Grounding with Google Search / Code execution / URL context'),
                format: formatToolSwitchData,
                parse: parseToolSwitchData
            }
        },
        consoleTag: LOG_TAG,
        colors: {
            primary: '#4285F4'
        },
        shouldBypassIconCache: (url) => {
            return url && url.startsWith('https://aistudio.google.com/');
        }
    });

    engine.init();
})();
