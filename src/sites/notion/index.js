/* -------------------------------------------------------------------------- *
 * Site Entry · [Notion] 快捷键跳转
 * -------------------------------------------------------------------------- */

(function() {
    'use strict';

    const ShortcutTemplate = window.ShortcutTemplate;

    if (!ShortcutTemplate || typeof ShortcutTemplate.createShortcutEngine !== 'function') {
        console.error('[Notion Shortcut] Template module not found.');
        return;
    }

    const defaultIconURL = 'https://www.notion.so/images/favicon.ico';
    const LOG_TAG = "[Notion Shortcut Script]";
    const NOTION_DEFAULT_SHORTCUTS_STORAGE_KEY = "notion_shortcuts_v1";
    const LEGACY_NEW_CHAT_SIMULATE_KEYS = "CMD+O";
    const LEGACY_SELECT_AI_MODEL_KEY = "selectAiModel";
    const LEGACY_SELECT_AI_MODEL_SELECTOR = '[data-testid="unified-chat-model-button"][role="button"]';

    const NOTION_AI_ICON = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='currentColor'%3E%3Cpath d='M12 2l3.09 6.26L22 9l-5.91 4.47L17 22l-5-3.4L7 22l.91-8.53L2 9l6.91-.74z'/%3E%3C/svg%3E";
    const SEARCH_ICON = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='currentColor'%3E%3Cpath d='M15.5 14h-.79l-.28-.27A6.471 6.471 0 0 0 16 9.5 6.5 6.5 0 1 0 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z'/%3E%3C/svg%3E";
    const SETTINGS_ICON = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='currentColor'%3E%3Cpath d='M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8zM12 14a2 2 0 1 1 0-4 2 2 0 0 1 0 4z'/%3E%3Cpath d='M12 1L9 4H6a2 2 0 0 0-2 2v3l-3 3 3 3v3a2 2 0 0 0 2 2h3l3 3 3-3h3a2 2 0 0 0 2-2v-3l3-3-3-3V6a2 2 0 0 0-2-2h-3L12 1z'/%3E%3C/svg%3E";
    const RESEARCH_ICON = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='currentColor'%3E%3Cpath d='M17 3H7a2 2 0 0 0-2 2v16l7-3 7 3V5a2 2 0 0 0-2-2zm0 15l-5-2.18L7 18V5h10v13z'/%3E%3C/svg%3E";
    const ADD_CONTEXT_ICON = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 16 16' fill='currentColor'%3E%3Cpath d='M11.904 3.28a6.125 6.125 0 1 0-1.648 10.415.625.625 0 1 0-.46-1.163 4.875 4.875 0 1 1 2.808-2.93c-.102.294-.43.523-.878.523a.87.87 0 0 1-.872-.872V5.705a.625.625 0 0 0-1.242-.098 3.04 3.04 0 0 0-1.746-.527c-.792 0-1.542.277-2.095.825-.557.55-.871 1.332-.871 2.256s.313 1.714.864 2.276 1.3.858 2.102.858c.8 0 1.55-.294 2.104-.85a2.12 2.12 0 0 0 1.756.93c.835 0 1.738-.441 2.058-1.361a6.125 6.125 0 0 0-1.88-6.734M6.65 6.793c.294-.29.715-.463 1.216-.463.5 0 .929.173 1.228.466.296.289.508.735.508 1.365 0 .631-.213 1.095-.515 1.4-.303.306-.73.484-1.221.484-.49 0-.91-.178-1.209-.482-.296-.303-.507-.767-.507-1.402 0-.633.21-1.08.5-1.368'/%3E%3C/svg%3E";
    const ATTACH_FILE_ICON = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 20 20' fill='currentColor'%3E%3Cpath d='M10.184 3.64A3.475 3.475 0 0 1 15.1 8.554l-5.374 5.374a2.05 2.05 0 1 1-2.9-2.9l2.688-2.686a.625.625 0 0 1 .884.884L7.71 11.913a.8.8 0 0 0 1.13 1.131l5.375-5.374a2.225 2.225 0 1 0-3.147-3.146L5.694 9.898a3.65 3.65 0 1 0 5.162 5.161l4.702-4.702a.625.625 0 0 1 .884.884l-4.702 4.702a4.9 4.9 0 1 1-6.93-6.93z'/%3E%3C/svg%3E";
    const NEW_CHAT_ICON = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='M12 5v14'/%3E%3Cpath d='M5 12h14'/%3E%3C/svg%3E";
    const WEB_ACCESS_ICON = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Ccircle cx='12' cy='12' r='10'/%3E%3Cpath d='M2 12h20'/%3E%3Cpath d='M12 2a15.3 15.3 0 0 1 0 20'/%3E%3Cpath d='M12 2a15.3 15.3 0 0 0 0 20'/%3E%3C/svg%3E";

    const defaultIcons = [
        { name: 'Notion', url: defaultIconURL },
        { name: 'AI Assistant', url: NOTION_AI_ICON },
        { name: 'Search', url: SEARCH_ICON },
        { name: 'Settings', url: SETTINGS_ICON },
        { name: 'Research', url: RESEARCH_ICON },
        { name: 'New Chat', url: NEW_CHAT_ICON },
        { name: 'Web Access', url: WEB_ACCESS_ICON },
        { name: 'Google', url: 'https://www.google.com/favicon.ico' },
        { name: 'ChatGPT', url: 'https://chat.openai.com/favicon-32x32.png' },
        { name: 'Claude', url: 'https://claude.ai/favicon.ico' },
        { name: 'GitHub', url: 'https://github.githubassets.com/favicons/favicon.svg' }
    ];

    const protectedIconUrls = [
        defaultIconURL
    ];

    const TemplateUtils = ShortcutTemplate.utils || {};
    const domUtils = TemplateUtils.dom || {};
    const eventUtils = TemplateUtils.events || {};
    const sleep = typeof TemplateUtils.sleep === "function"
        ? TemplateUtils.sleep
        : (ms) => new Promise(resolve => setTimeout(resolve, ms));

    function gmGetValueLocal(key, fallback) {
        if (typeof GM_getValue !== "function") return fallback;
        try {
            const value = GM_getValue(key, fallback);
            if (value && typeof value.then === "function") return fallback;
            return value;
        } catch {
            return fallback;
        }
    }

    function gmSetValueLocal(key, value) {
        if (typeof GM_setValue !== "function") return false;
        try {
            GM_setValue(key, value);
            return true;
        } catch {
            return false;
        }
    }

    function cloneShortcutItem(value) {
        if (!value || typeof value !== "object" || Array.isArray(value)) return null;
        try {
            if (typeof structuredClone === "function") return structuredClone(value);
        } catch { }
        try {
            return JSON.parse(JSON.stringify(value));
        } catch {
            return { ...value };
        }
    }

    function isPlainObject(value) {
        return !!value && typeof value === "object" && !Array.isArray(value);
    }

    const siteText = (key, fallback) => ({ ctx } = {}) => ctx?.i18n?.t?.(key, {}, fallback) || fallback;

    const NOTION_MODEL_TARGETS = Object.freeze({
        auto: Object.freeze({
            id: "auto",
            label: "Auto",
            hotkey: "CTRL+SHIFT+1",
            labelKey: "shortcuts.modelAuto",
            aliases: Object.freeze(["Auto", "Automatic"])
        }),
        sonnet46: Object.freeze({
            id: "sonnet46",
            label: "Claude Sonnet 4.6",
            menuLabel: "Sonnet 4.6",
            hotkey: "CTRL+SHIFT+2",
            labelKey: "shortcuts.modelSonnet46",
            aliases: Object.freeze(["Sonnet 4.6", "Claude Sonnet 4.6"])
        }),
        opus46: Object.freeze({
            id: "opus46",
            label: "Claude Opus 4.6",
            menuLabel: "Opus 4.6",
            hotkey: "CTRL+SHIFT+3",
            labelKey: "shortcuts.modelOpus46",
            aliases: Object.freeze(["Opus 4.6", "Claude Opus 4.6"])
        }),
        opus47: Object.freeze({
            id: "opus47",
            label: "Claude Opus 4.7",
            menuLabel: "Opus 4.7",
            hotkey: "CTRL+SHIFT+4",
            labelKey: "shortcuts.modelOpus47",
            aliases: Object.freeze(["Opus 4.7", "Claude Opus 4.7"])
        }),
        gemini31pro: Object.freeze({
            id: "gemini31pro",
            label: "Gemini 3.1 Pro",
            hotkey: "CTRL+SHIFT+5",
            labelKey: "shortcuts.modelGemini31Pro",
            aliases: Object.freeze(["Gemini 3.1 Pro", "Gemini Pro", "gemini pro"])
        }),
        gpt52: Object.freeze({
            id: "gpt52",
            label: "GPT-5.2",
            hotkey: "CTRL+SHIFT+6",
            labelKey: "shortcuts.modelGpt52",
            aliases: Object.freeze(["GPT-5.2", "GPT 5.2"])
        }),
        gpt54: Object.freeze({
            id: "gpt54",
            label: "GPT-5.4",
            hotkey: "CTRL+SHIFT+7",
            labelKey: "shortcuts.modelGpt54",
            aliases: Object.freeze(["GPT-5.4", "GPT 5.4"])
        }),
        gpt55: Object.freeze({
            id: "gpt55",
            label: "GPT-5.5",
            hotkey: "CTRL+SHIFT+8",
            labelKey: "shortcuts.modelGpt55",
            aliases: Object.freeze(["GPT-5.5", "GPT 5.5"])
        }),
        kimi26: Object.freeze({
            id: "kimi26",
            label: "Kimi K2.6",
            hotkey: "CTRL+SHIFT+9",
            labelKey: "shortcuts.modelKimi26",
            aliases: Object.freeze(["Kimi K2.6"])
        }),
        deepseekV4Pro: Object.freeze({
            id: "deepseekV4Pro",
            label: "DeepSeek V4 Pro",
            hotkey: "CTRL+SHIFT+0",
            labelKey: "shortcuts.modelDeepSeekV4Pro",
            aliases: Object.freeze(["DeepSeek V4 Pro", "DeepSeek V4", "deepseek v4 pro"])
        })
    });

    const NOTION_MODEL_TARGET_LIST = Object.freeze(Object.values(NOTION_MODEL_TARGETS));
    const NOTION_MODEL_SHORTCUT_KEYS = Object.freeze(NOTION_MODEL_TARGET_LIST.map(target => `model-${target.id}`));
    const NOTION_MANAGED_DEFAULT_SHORTCUT_KEYS = Object.freeze([
        "newChat",
        ...NOTION_MODEL_SHORTCUT_KEYS,
        "toggleWebAccess"
    ]);
    const NOTION_NEW_CHAT_TRIGGER_SELECTORS = [
        '[data-testid*="new-chat" i]',
        '[data-testid*="new_chat" i]',
        'button[aria-label*="new chat" i]',
        '[role="button"][aria-label*="new chat" i]',
        'a[aria-label*="new chat" i]',
        "button",
        '[role="button"]',
        "a[href]"
    ].join(", ");
    const NOTION_MODEL_TRIGGER_SELECTORS = [
        LEGACY_SELECT_AI_MODEL_SELECTOR,
        '[data-testid="unified-chat-model-button"]',
        'button[aria-label*="model" i]',
        'button[aria-label*="模型" i]',
        'button[aria-haspopup="menu"]',
        "button"
    ].join(", ");
    const NOTION_MODEL_MENU_ROOT_SELECTOR = [
        '[role="menu"]',
        '[role="listbox"]',
        '[data-radix-menu-content]',
        '[data-floating-ui-portal] [role="menu"]'
    ].join(", ");
    const NOTION_MODEL_MENU_ITEM_SELECTOR = [
        '[role="menuitem"]',
        '[role="menuitemradio"]',
        '[role="option"]',
        "button",
        '[tabindex]:not([tabindex="-1"])'
    ].join(", ");
    const MODEL_MENU_TIMING = Object.freeze({
        pollIntervalMs: 120,
        waitTimeoutMs: 3000,
        openDelayMs: 120
    });
    const NOTION_SETTINGS_TRIGGER_SELECTORS = [
        '[data-testid="unified-chat-search-scope-button"][role="button"]',
        '[data-testid="unified-chat-search-scope-button"]',
        '[data-testid*="search-scope" i]',
        '[data-testid*="settings" i]',
        '[data-testid*="source" i]',
        'button[aria-label*="settings" i]',
        'button[aria-label*="设置" i]',
        'button[aria-label*="web access" i]',
        'button[aria-label*="sources" i]',
        'button[aria-label*="options" i]',
        'button[aria-haspopup="menu"]',
        '[role="button"][aria-haspopup="menu"]',
        "button"
    ].join(", ");
    const NOTION_SETTINGS_MENU_ROOT_SELECTOR = [
        '[role="menu"]',
        '[role="dialog"]',
        '[data-radix-menu-content]',
        '[data-floating-ui-portal] [role="menu"]'
    ].join(", ");
    const NOTION_SETTINGS_MENU_ITEM_SELECTOR = [
        '[role="menuitem"]',
        '[role="menuitemcheckbox"]',
        '[role="switch"]',
        "button",
        '[tabindex]:not([tabindex="-1"])'
    ].join(", ");
    const SETTINGS_MENU_TIMING = Object.freeze({
        pollIntervalMs: 120,
        waitTimeoutMs: 3000,
        openDelayMs: 120
    });

    const safeQueryAll = typeof domUtils.safeQuerySelectorAll === "function"
        ? domUtils.safeQuerySelectorAll
        : (root, selector) => {
            const base = root && typeof root.querySelectorAll === "function" ? root : document;
            try { return Array.from(base.querySelectorAll(selector)); } catch { return []; }
        };
    const isVisibleElement = typeof domUtils.isVisible === "function"
        ? domUtils.isVisible
        : (element) => {
            if (!element) return false;
            try {
                return !!(element.offsetWidth || element.offsetHeight || element.getClientRects?.().length);
            } catch {
                return false;
            }
        };
    const simulateClickElement = typeof eventUtils.simulateClick === "function"
        ? eventUtils.simulateClick
        : (element) => {
            try {
                element?.click?.();
                return true;
            } catch {
                return false;
            }
        };

    function getEventConstructor(name) {
        try {
            const view = document?.defaultView || window;
            return view?.[name] || window?.[name] || null;
        } catch {
            return null;
        }
    }

    function simulatePointerSequenceAt(target, x, y) {
        if (!target || typeof target.dispatchEvent !== "function") return false;
        const view = document?.defaultView || window;
        const clientX = Number.isFinite(Number(x)) ? Number(x) : 1;
        const clientY = Number.isFinite(Number(y)) ? Number(y) : 1;
        const common = {
            bubbles: true,
            cancelable: true,
            composed: true,
            view: view || null,
            clientX,
            clientY,
            screenX: clientX,
            screenY: clientY,
            button: 0
        };
        const PointerEventCtor = getEventConstructor("PointerEvent");
        const MouseEventCtor = getEventConstructor("MouseEvent");
        const plans = [
            PointerEventCtor && { ctor: PointerEventCtor, type: "pointerdown", opts: { ...common, buttons: 1, pointerId: 1, pointerType: "mouse", isPrimary: true } },
            MouseEventCtor && { ctor: MouseEventCtor, type: "mousedown", opts: { ...common, buttons: 1 } },
            PointerEventCtor && { ctor: PointerEventCtor, type: "pointerup", opts: { ...common, buttons: 0, pointerId: 1, pointerType: "mouse", isPrimary: true } },
            MouseEventCtor && { ctor: MouseEventCtor, type: "mouseup", opts: { ...common, buttons: 0 } },
            MouseEventCtor && { ctor: MouseEventCtor, type: "click", opts: { ...common, buttons: 0, detail: 1 } }
        ].filter(Boolean);

        let dispatched = false;
        for (const plan of plans) {
            try {
                target.dispatchEvent(new plan.ctor(plan.type, plan.opts));
                dispatched = true;
            } catch { }
        }
        return dispatched;
    }

    function normalizeNotionText(value) {
        return String(value ?? "").replace(/\s+/g, " ").trim().toLowerCase();
    }

    function normalizeNotionTargetKey(value) {
        return normalizeNotionText(value).replace(/[^a-z0-9]+/g, "");
    }

    function getElementText(element) {
        if (!element) return "";
        const aria = element.getAttribute?.("aria-label");
        if (aria && String(aria).trim()) return String(aria);
        const title = element.getAttribute?.("title");
        if (title && String(title).trim()) return String(title);
        try {
            return String(element.textContent || "");
        } catch {
            return "";
        }
    }

    function normalizeHotkeyToken(value) {
        return String(value || "").replace(/\s+/g, "").toUpperCase();
    }

    function getElementRect(element) {
        try {
            const rect = element?.getBoundingClientRect?.();
            if (!rect) return null;
            return {
                top: Number(rect.top || 0),
                right: Number(rect.right || 0),
                bottom: Number(rect.bottom || 0),
                left: Number(rect.left || 0),
                width: Math.max(0, Number(rect.width || 0)),
                height: Math.max(0, Number(rect.height || 0))
            };
        } catch {
            return null;
        }
    }

    function isInsideShortcutUi(element) {
        return !!element?.closest?.([
            "#notion-settings-overlay",
            "#notion-settings-panel",
            "#notion-edit-overlay",
            "#notion-edit-form",
            "#notion-quick-input-overlay"
        ].join(", "));
    }

    function isElementDisabled(element) {
        if (!element) return true;
        if (element.disabled === true) return true;
        const ariaDisabled = String(element.getAttribute?.("aria-disabled") || "").toLowerCase();
        if (ariaDisabled === "true") return true;
        try {
            if (typeof element.matches === "function" && element.matches(":disabled")) return true;
        } catch { }
        return false;
    }

    function getClickableActionElement(element, root = null) {
        let node = element;
        while (node && node.nodeType === 1) {
            if (root && node === root) break;
            if (!isElementDisabled(node)) {
                const tag = String(node.tagName || "").toLowerCase();
                const role = String(node.getAttribute?.("role") || "").toLowerCase();
                const tabIndex = String(node.getAttribute?.("tabindex") || "").trim();
                if (
                    tag === "button" ||
                    tag === "a" ||
                    role === "button" ||
                    role === "menuitem" ||
                    role === "menuitemradio" ||
                    role === "option" ||
                    role === "switch" ||
                    role === "checkbox" ||
                    role === "menuitemcheckbox" ||
                    (tabIndex && tabIndex !== "-1") ||
                    typeof node.onclick === "function"
                ) {
                    return node;
                }
            }
            node = node.parentElement || null;
        }
        return element && !isElementDisabled(element) ? element : null;
    }

    function getTargetComparableLabels(target) {
        if (!target) return [];
        const labels = [target.menuLabel, target.label, ...(target.aliases || [])]
            .map(normalizeNotionText)
            .filter(Boolean);
        return Array.from(new Set(labels));
    }

    function textLooksLikeTarget(text, target) {
        const normalized = normalizeNotionText(text);
        if (!normalized || !target) return false;
        const labels = getTargetComparableLabels(target);
        if (labels.some(label => normalized === label || normalized.includes(label))) return true;

        if (target.id === "gemini31pro") return normalized.includes("gemini") && normalized.includes("pro");
        if (target.id === "opus46") return normalized.includes("opus") && normalized.includes("4.6");
        if (target.id === "opus47") return normalized.includes("opus") && normalized.includes("4.7");
        if (target.id === "sonnet46") return normalized.includes("sonnet") && normalized.includes("4.6");
        if (target.id === "deepseekV4Pro") return normalized.includes("deepseek") && normalized.includes("v4") && normalized.includes("pro");
        if (target.id === "kimi26") return normalized.includes("kimi") && normalized.includes("k2.6");
        return false;
    }

    function inferModelTargetFromText(value) {
        const text = normalizeNotionText(value);
        const key = normalizeNotionTargetKey(value);
        if (!text && !key) return null;

        for (const target of NOTION_MODEL_TARGET_LIST) {
            if (key === normalizeNotionTargetKey(target.id)) return target;
            if (key === normalizeNotionTargetKey(target.label)) return target;
            if (target.menuLabel && key === normalizeNotionTargetKey(target.menuLabel)) return target;
            if ((target.aliases || []).some(alias => key === normalizeNotionTargetKey(alias))) return target;
        }

        if (text.includes("gemini") && text.includes("pro")) return NOTION_MODEL_TARGETS.gemini31pro;
        if (text.includes("opus") && text.includes("4.6")) return NOTION_MODEL_TARGETS.opus46;
        if (text.includes("opus") && text.includes("4.7")) return NOTION_MODEL_TARGETS.opus47;
        if (text.includes("claude") && text.includes("opus")) return NOTION_MODEL_TARGETS.opus47;
        if (text === "opus") return NOTION_MODEL_TARGETS.opus47;
        if (text.includes("sonnet") && text.includes("4.6")) return NOTION_MODEL_TARGETS.sonnet46;
        if (text.includes("gpt") && text.includes("5.2")) return NOTION_MODEL_TARGETS.gpt52;
        if (text.includes("gpt") && text.includes("5.4")) return NOTION_MODEL_TARGETS.gpt54;
        if (text.includes("gpt") && text.includes("5.5")) return NOTION_MODEL_TARGETS.gpt55;
        if (text.includes("kimi") && text.includes("k2.6")) return NOTION_MODEL_TARGETS.kimi26;
        if (text.includes("deepseek") && text.includes("v4") && text.includes("pro")) return NOTION_MODEL_TARGETS.deepseekV4Pro;
        return null;
    }

    function textLooksLikeNewChat(value) {
        const text = normalizeNotionText(value);
        return !!text && (
            text.includes("new chat") ||
            text.includes("new conversation") ||
            text.includes("new thread") ||
            text.includes("新建聊天") ||
            text.includes("新对话") ||
            text.includes("开启新话题")
        );
    }

    function scoreNewChatTriggerCandidate(element) {
        if (!element || !isVisibleElement(element) || isInsideShortcutUi(element) || isElementDisabled(element)) return -1;

        const text = getElementText(element);
        const dataTestId = String(element.getAttribute?.("data-testid") || "").toLowerCase();
        const ariaLabel = String(element.getAttribute?.("aria-label") || "");
        const title = String(element.getAttribute?.("title") || "");
        const role = String(element.getAttribute?.("role") || "").toLowerCase();
        const tag = String(element.tagName || "").toLowerCase();
        const combinedText = [text, ariaLabel, title].join(" ");

        let score = 0;
        if (dataTestId.includes("new-chat") || dataTestId.includes("new_chat")) score += 900;
        if (textLooksLikeNewChat(ariaLabel)) score += 620;
        if (textLooksLikeNewChat(title)) score += 520;
        if (textLooksLikeNewChat(text)) score += 480;
        if (/^\s*new chat\b/i.test(combinedText)) score += 120;
        if (combinedText.includes("⌘") || normalizeNotionText(combinedText).includes("cmd")) score += 70;
        if (tag === "button" || role === "button") score += 80;

        const rect = getElementRect(element);
        const viewportHeight = Number(window?.innerHeight || document?.documentElement?.clientHeight || 0);
        if (rect && viewportHeight > 0 && rect.bottom > viewportHeight * 0.55) score += 40;

        return score > 0 ? score : -1;
    }

    function findNewChatTriggerElement() {
        const candidates = [];
        const seen = new Set();
        for (const element of safeQueryAll(document, NOTION_NEW_CHAT_TRIGGER_SELECTORS)) {
            if (!element || seen.has(element)) continue;
            seen.add(element);
            const score = scoreNewChatTriggerCandidate(element);
            if (score < 0) continue;
            const rect = getElementRect(element);
            candidates.push({
                element,
                score,
                bottom: rect ? rect.bottom : 0,
                area: rect ? rect.width * rect.height : Number.MAX_SAFE_INTEGER
            });
        }
        candidates.sort((a, b) => {
            if (b.score !== a.score) return b.score - a.score;
            if (b.bottom !== a.bottom) return b.bottom - a.bottom;
            return a.area - b.area;
        });
        return getClickableActionElement(candidates[0]?.element || null);
    }

    async function triggerNewChatAction() {
        const trigger = findNewChatTriggerElement();
        if (!trigger) return false;
        return simulateClickElement(trigger, { nativeFallback: true });
    }

    function scoreModelTriggerCandidate(element) {
        if (!element || !isVisibleElement(element)) return -1;
        if (element.closest?.(NOTION_MODEL_MENU_ROOT_SELECTOR)) return -1;

        const text = getElementText(element);
        const normalizedText = normalizeNotionText(text);
        const dataTestId = String(element.getAttribute?.("data-testid") || "").toLowerCase();
        const ariaLabel = String(element.getAttribute?.("aria-label") || "");
        const hasMenu = String(element.getAttribute?.("aria-haspopup") || "").toLowerCase() === "menu";

        let score = 0;
        if (dataTestId === "unified-chat-model-button") score += 1000;
        if (dataTestId.includes("model")) score += 500;
        if (/\bmodel\b|模型/i.test(ariaLabel)) score += 420;
        if (inferModelTargetFromText(text)) score += 360;
        if (hasMenu) score += 80;
        if (normalizedText === "auto") score += 80;
        return score > 0 ? score : -1;
    }

    function textLooksLikeWebAccess(value) {
        const text = normalizeNotionText(value);
        return !!text && (
            text.includes("web access") ||
            text.includes("internet access") ||
            text.includes("联网") ||
            text.includes("网络访问")
        );
    }

    function textLooksLikeComposerPrompt(value) {
        const text = normalizeNotionText(value);
        return !!text && (
            text.includes("do anything with ai") ||
            text.includes("ask anything") ||
            text.includes("message") ||
            text.includes("提问") ||
            text.includes("输入")
        );
    }

    function getComposerCandidateText(element) {
        if (!element) return "";
        return [
            element.getAttribute?.("placeholder"),
            element.getAttribute?.("aria-placeholder"),
            element.getAttribute?.("data-placeholder"),
            getElementText(element)
        ].filter(Boolean).join(" ");
    }

    function findComposerRootElement() {
        const candidates = [];
        const seen = new Set();
        const selector = [
            "textarea",
            '[contenteditable="true"]',
            '[role="textbox"]',
            '[data-placeholder]',
            '[aria-placeholder]',
            "form",
            "div"
        ].join(", ");
        for (const element of safeQueryAll(document, selector)) {
            if (!element || seen.has(element) || !isVisibleElement(element)) continue;
            seen.add(element);
            if (!textLooksLikeComposerPrompt(getComposerCandidateText(element))) continue;

            let node = element;
            let best = element;
            while (node && node.nodeType === 1 && node !== document.body) {
                const rect = getElementRect(node);
                if (rect && rect.width >= 320 && rect.height >= 44 && rect.height <= 260) {
                    best = node;
                }
                node = node.parentElement || null;
            }
            const rect = getElementRect(best);
            const viewportHeight = Number(window?.innerHeight || document?.documentElement?.clientHeight || 0);
            candidates.push({
                element: best,
                bottom: rect ? rect.bottom : 0,
                score: rect && viewportHeight > 0 && rect.bottom > viewportHeight * 0.55 ? 80 : 0
            });
        }

        candidates.sort((a, b) => {
            if (b.score !== a.score) return b.score - a.score;
            return b.bottom - a.bottom;
        });
        return candidates[0]?.element || null;
    }

    function findComposerSettingsTriggerElement() {
        const root = findComposerRootElement();
        const rootRect = getElementRect(root);
        if (!root || !rootRect) return null;

        const buttons = safeQueryAll(root, 'button, [role="button"]')
            .filter(element => element && isVisibleElement(element) && !isElementDisabled(element))
            .map(element => ({ element, rect: getElementRect(element) }))
            .filter(({ rect }) => {
                if (!rect) return false;
                const smallEnough = rect.width <= 96 && rect.height <= 64;
                const inToolbarY = rect.top >= rootRect.top - 8 && rect.bottom <= rootRect.bottom + 8;
                const nearLeftControls = rect.left <= rootRect.left + Math.min(180, Math.max(96, rootRect.width * 0.22));
                return smallEnough && inToolbarY && nearLeftControls;
            })
            .sort((a, b) => {
                if (a.rect.left !== b.rect.left) return a.rect.left - b.rect.left;
                return a.rect.top - b.rect.top;
            });

        if (buttons.length >= 2) return getClickableActionElement(buttons[1].element, root);
        return null;
    }

    function scoreSettingsTriggerCandidate(element) {
        if (!element || !isVisibleElement(element)) return -1;
        if (element.closest?.(NOTION_SETTINGS_MENU_ROOT_SELECTOR)) return -1;
        if (isInsideShortcutUi(element) || isElementDisabled(element)) return -1;

        const text = getElementText(element);
        const dataTestId = String(element.getAttribute?.("data-testid") || "").toLowerCase();
        const ariaLabel = String(element.getAttribute?.("aria-label") || "");
        const title = String(element.getAttribute?.("title") || "");
        const hasMenu = String(element.getAttribute?.("aria-haspopup") || "").toLowerCase() === "menu";

        let score = 0;
        let explicit = false;
        if (dataTestId === "unified-chat-search-scope-button") score += 1000;
        if (dataTestId === "unified-chat-search-scope-button") explicit = true;
        if (dataTestId.includes("search") || dataTestId.includes("scope") || dataTestId.includes("setting") || dataTestId.includes("source")) {
            score += 420;
            explicit = true;
        }
        if (/\bsettings?\b|\boptions?\b|\bsources?\b|设置/i.test(ariaLabel)) {
            score += 520;
            explicit = true;
        }
        if (/\bsettings?\b|\boptions?\b|\bsources?\b|设置/i.test(title)) {
            score += 420;
            explicit = true;
        }
        if (/\bsettings?\b|\boptions?\b|\bsources?\b|设置/i.test(text)) {
            score += 260;
            explicit = true;
        }
        if (textLooksLikeWebAccess(text) || textLooksLikeWebAccess(ariaLabel) || textLooksLikeWebAccess(title)) {
            score += 300;
            explicit = true;
        }
        if (explicit && hasMenu) score += 80;
        return explicit && score > 0 ? score : -1;
    }

    function findSettingsTriggerElement() {
        const candidates = [];
        const seen = new Set();
        for (const element of safeQueryAll(document, NOTION_SETTINGS_TRIGGER_SELECTORS)) {
            if (!element || seen.has(element)) continue;
            seen.add(element);
            const score = scoreSettingsTriggerCandidate(element);
            if (score < 0) continue;
            let bottom = 0;
            try { bottom = Number(element.getBoundingClientRect?.().bottom || 0); } catch { }
            candidates.push({ element, score, bottom });
        }
        candidates.sort((a, b) => {
            if (b.score !== a.score) return b.score - a.score;
            return b.bottom - a.bottom;
        });
        return candidates[0]?.element || findComposerSettingsTriggerElement();
    }

    function scoreSettingsMenuRoot(root) {
        if (!root || !isVisibleElement(root)) return -1;
        const text = getElementText(root);
        const normalized = normalizeNotionText(text);
        let score = 0;
        if (textLooksLikeWebAccess(text)) score += 240;
        if (normalized.includes("my sources")) score += 80;
        if (normalized.includes("add sources")) score += 80;
        if (normalized.includes("personalize")) score += 60;
        if (normalized.includes("mode")) score += 40;
        return score >= 160 ? score : -1;
    }

    function findSettingsMenuRoot(triggerEl = null) {
        if (triggerEl) {
            const controlsId = String(triggerEl.getAttribute?.("aria-controls") || "").trim();
            if (controlsId) {
                const controlled = document.getElementById(controlsId);
                if (scoreSettingsMenuRoot(controlled) > 0) return controlled;
            }
        }

        const candidates = safeQueryAll(document, NOTION_SETTINGS_MENU_ROOT_SELECTOR)
            .map(element => ({ element, score: scoreSettingsMenuRoot(element) }))
            .filter(item => item.score > 0);
        if (candidates.length === 0) return null;
        candidates.sort((a, b) => b.score - a.score);
        return candidates[0]?.element || null;
    }

    async function ensureSettingsMenuOpen(triggerEl, { timeoutMs = SETTINGS_MENU_TIMING.waitTimeoutMs, intervalMs = SETTINGS_MENU_TIMING.pollIntervalMs } = {}) {
        const existing = findSettingsMenuRoot(triggerEl);
        if (existing) return existing;
        if (!triggerEl) return null;
        if (!simulateClickElement(triggerEl, { nativeFallback: true })) return null;
        if (SETTINGS_MENU_TIMING.openDelayMs > 0) await sleep(SETTINGS_MENU_TIMING.openDelayMs);

        const deadline = Date.now() + Math.max(0, Number(timeoutMs) || 0);
        while (Date.now() <= deadline) {
            const root = findSettingsMenuRoot(triggerEl);
            if (root) return root;
            await sleep(intervalMs);
        }
        return findSettingsMenuRoot(triggerEl);
    }

    function findWebAccessMenuItem(root) {
        if (!root) return null;
        const candidates = [];
        const seen = new Set();
        for (const element of safeQueryAll(root, NOTION_SETTINGS_MENU_ITEM_SELECTOR)) {
            if (!element || seen.has(element) || !isVisibleElement(element)) continue;
            seen.add(element);
            if (textLooksLikeWebAccess(getElementText(element))) candidates.push(getSettingsMenuRow(element, root));
        }
        for (const element of safeQueryAll(root, "div, span, button")) {
            if (!element || seen.has(element) || !isVisibleElement(element)) continue;
            seen.add(element);
            if (textLooksLikeWebAccess(getElementText(element))) candidates.push(getSettingsMenuRow(element, root));
        }
        const unique = Array.from(new Set(candidates.filter(Boolean)));
        if (unique.length === 0) return null;
        unique.sort((a, b) => {
            const aHasToggle = !!findExplicitWebAccessToggleTarget(a);
            const bHasToggle = !!findExplicitWebAccessToggleTarget(b);
            if (aHasToggle !== bHasToggle) return bHasToggle - aHasToggle;
            const aText = normalizeNotionText(getElementText(a));
            const bText = normalizeNotionText(getElementText(b));
            if (aText === "web access" && bText !== "web access") return 1;
            if (bText === "web access" && aText !== "web access") return -1;
            const aArea = getElementArea(a);
            const bArea = getElementArea(b);
            if (aArea !== bArea) return aArea - bArea;
            return aText.length - bText.length;
        });
        return unique[0] || null;
    }

    function getElementArea(element) {
        try {
            const rect = element.getBoundingClientRect?.();
            return Math.max(0, Number(rect?.width || 0)) * Math.max(0, Number(rect?.height || 0));
        } catch {
            return Number.MAX_SAFE_INTEGER;
        }
    }

    function getSettingsMenuRow(element, root) {
        if (!element) return null;
        const rootArea = getElementArea(root);
        const rootRect = getElementRect(root);
        let bestWithToggle = null;
        let bestRowLike = null;
        let row = element;
        let node = element;
        while (node && node.nodeType === 1) {
            if (root && node !== root && !root.contains?.(node)) break;
            if (!textLooksLikeWebAccess(getElementText(node))) {
                node = node.parentElement || null;
                continue;
            }
            const area = getElementArea(node);
            if (rootArea > 0 && area >= rootArea * 0.85) break;
            if (findExplicitWebAccessToggleTarget(node)) {
                bestWithToggle = node;
                break;
            }
            const rect = getElementRect(node);
            if (rect && rootRect) {
                const rowLike = rect.height >= 28 &&
                    rect.height <= 88 &&
                    rect.width >= Math.min(180, rootRect.width * 0.45);
                if (rowLike) bestRowLike = node;
            }
            row = node;
            node = node.parentElement || null;
        }
        return bestWithToggle || bestRowLike || row;
    }

    function findExplicitWebAccessToggleTarget(container) {
        if (!container) return null;
        const rowRole = String(container.getAttribute?.("role") || "").toLowerCase();
        if (rowRole === "switch" || rowRole === "checkbox" || rowRole === "menuitemcheckbox") return container;
        const selectors = [
            '[role="switch"]',
            '[role="checkbox"]',
            '[role="menuitemcheckbox"]',
            'input[type="checkbox"]',
            'button[aria-checked]',
            '[aria-checked]',
            'button[data-state="checked"]',
            'button[data-state="unchecked"]',
            '[data-state="checked"]',
            '[data-state="unchecked"]'
        ].join(", ");
        const targets = safeQueryAll(container, selectors)
            .filter(element => element && isVisibleElement(element) && !isElementDisabled(element))
            .sort((a, b) => {
                const aRect = getElementRect(a);
                const bRect = getElementRect(b);
                return (bRect?.right || 0) - (aRect?.right || 0);
            });
        return targets[0] || null;
    }

    function findWebAccessToggleTarget(row) {
        const explicit = findExplicitWebAccessToggleTarget(row);
        if (explicit) return explicit;
        const rowRect = getElementRect(row);
        if (!row || !rowRect) return null;

        const targets = safeQueryAll(row, 'button, [role="button"], [tabindex]:not([tabindex="-1"]), div, span')
            .filter(element => element && element !== row && isVisibleElement(element) && !isElementDisabled(element))
            .map(element => ({ element, rect: getElementRect(element) }))
            .filter(({ rect }) => {
                if (!rect) return false;
                const rightSide = rect.left >= rowRect.left + rowRect.width * 0.55;
                const sizeLooksLikeSwitch = rect.width >= 24 && rect.width <= 96 && rect.height >= 14 && rect.height <= 48;
                return rightSide && sizeLooksLikeSwitch;
            })
            .sort((a, b) => {
                if (b.rect.right !== a.rect.right) return b.rect.right - a.rect.right;
                return (b.rect.width * b.rect.height) - (a.rect.width * a.rect.height);
            });
        return targets[0]?.element || null;
    }

    function getWebAccessToggleState(target) {
        if (!target) return null;
        const explicitTargets = [target, ...safeQueryAll(target, 'input[type="checkbox"], [aria-checked], [data-state]')];
        for (const element of explicitTargets) {
            if (!element) continue;
            if (element.tagName && String(element.tagName).toLowerCase() === "input" && element.type === "checkbox") {
                return !!element.checked;
            }
            const ariaChecked = String(element.getAttribute?.("aria-checked") || "").toLowerCase();
            if (ariaChecked === "true") return true;
            if (ariaChecked === "false") return false;
            const dataState = String(element.getAttribute?.("data-state") || "").toLowerCase();
            if (dataState === "checked" || dataState === "on" || dataState === "open") return true;
            if (dataState === "unchecked" || dataState === "off" || dataState === "closed") return false;
        }
        return null;
    }

    async function waitForWebAccessToggleChange(trigger, previousState) {
        if (previousState === null) {
            await sleep(SETTINGS_MENU_TIMING.openDelayMs);
            return true;
        }
        const deadline = Date.now() + SETTINGS_MENU_TIMING.waitTimeoutMs;
        while (Date.now() <= deadline) {
            const currentRoot = findSettingsMenuRoot(trigger);
            if (!currentRoot) return true;
            const row = findWebAccessMenuItem(currentRoot);
            const target = findWebAccessToggleTarget(row);
            const currentState = getWebAccessToggleState(target);
            if (currentState !== null && currentState !== previousState) return true;
            await sleep(SETTINGS_MENU_TIMING.pollIntervalMs);
        }
        return false;
    }

    function dispatchEscapeKey(target) {
        const eventInit = {
            key: "Escape",
            code: "Escape",
            keyCode: 27,
            which: 27,
            bubbles: true,
            cancelable: true,
            composed: true
        };
        try {
            target?.dispatchEvent?.(new KeyboardEvent("keydown", eventInit));
            target?.dispatchEvent?.(new KeyboardEvent("keyup", eventInit));
            return true;
        } catch {
            return false;
        }
    }

    function dispatchSettingsMenuEscape(root) {
        const targets = [
            document.activeElement || null,
            root || null,
            document.body || null,
            document.documentElement || null,
            document,
            window
        ].filter(Boolean);
        let dispatched = false;
        for (const target of targets) {
            dispatched = dispatchEscapeKey(target) || dispatched;
        }
        return dispatched;
    }

    async function waitForSettingsMenuClose(trigger, { timeoutMs = 900, intervalMs = SETTINGS_MENU_TIMING.pollIntervalMs } = {}) {
        const deadline = Date.now() + Math.max(0, Number(timeoutMs) || 0);
        while (Date.now() <= deadline) {
            if (!findSettingsMenuRoot(trigger)) return true;
            await sleep(intervalMs);
        }
        return !findSettingsMenuRoot(trigger);
    }

    function findOutsideSettingsMenuClickTarget(menuRoot) {
        const rootRect = getElementRect(menuRoot);
        const points = [];
        const width = Number(window?.innerWidth || document?.documentElement?.clientWidth || 0);
        const height = Number(window?.innerHeight || document?.documentElement?.clientHeight || 0);
        if (width <= 0 || height <= 0) return null;

        const pushPoint = (x, y) => points.push([Math.max(1, Math.min(width - 1, x)), Math.max(1, Math.min(height - 1, y))]);
        pushPoint(8, 8);
        pushPoint(width - 8, 8);
        pushPoint(8, height - 8);
        pushPoint(width - 8, height - 8);
        pushPoint(width * 0.12, height * 0.1);
        pushPoint(width * 0.88, height * 0.1);
        pushPoint(width * 0.12, height * 0.88);
        pushPoint(width * 0.88, height * 0.88);

        for (const [x, y] of points) {
            const element = document.elementFromPoint?.(x, y);
            if (!element || element === menuRoot || menuRoot?.contains?.(element)) continue;
            if (isInsideShortcutUi(element)) continue;
            const rect = getElementRect(element);
            if (rootRect && rect) {
                const overlapsMenu =
                    rect.left < rootRect.right &&
                    rect.right > rootRect.left &&
                    rect.top < rootRect.bottom &&
                    rect.bottom > rootRect.top;
                if (overlapsMenu) continue;
            }
            return {
                element: getClickableActionElement(element) || element,
                x,
                y
            };
        }
        return null;
    }

    function findOutsideSettingsMenuFocusTarget(menuRoot) {
        const selectors = [
            "textarea",
            '[contenteditable="true"]',
            '[role="textbox"]',
            "input",
            "button"
        ].join(", ");
        const candidates = safeQueryAll(document, selectors)
            .filter(element => {
                if (!element || !isVisibleElement(element) || isElementDisabled(element)) return false;
                if (menuRoot?.contains?.(element) || isInsideShortcutUi(element)) return false;
                return true;
            })
            .map(element => ({ element, rect: getElementRect(element), text: normalizeNotionText(getElementText(element)) }))
            .filter(({ rect }) => !!rect)
            .sort((a, b) => {
                const aComposer = textLooksLikeComposerPrompt(getComposerCandidateText(a.element)) ? 1 : 0;
                const bComposer = textLooksLikeComposerPrompt(getComposerCandidateText(b.element)) ? 1 : 0;
                if (aComposer !== bComposer) return bComposer - aComposer;
                const aNewChat = textLooksLikeNewChat(a.text) ? 1 : 0;
                const bNewChat = textLooksLikeNewChat(b.text) ? 1 : 0;
                if (aNewChat !== bNewChat) return bNewChat - aNewChat;
                return b.rect.bottom - a.rect.bottom;
            });
        return candidates[0]?.element || null;
    }

    async function closeSettingsMenu(trigger) {
        await sleep(Math.max(80, SETTINGS_MENU_TIMING.openDelayMs));

        for (let attempt = 0; attempt < 3; attempt += 1) {
            const root = findSettingsMenuRoot(trigger);
            if (!root) return true;

            const latestTrigger = findSettingsTriggerElement();
            const triggerCandidates = Array.from(new Set([latestTrigger, trigger].filter(Boolean)));
            for (const candidate of triggerCandidates) {
                if (!isVisibleElement(candidate) || root.contains?.(candidate)) continue;
                const rect = getElementRect(candidate);
                const x = rect ? rect.left + rect.width / 2 : 1;
                const y = rect ? rect.top + rect.height / 2 : 1;
                if (
                    simulatePointerSequenceAt(candidate, x, y) ||
                    simulateClickElement(candidate, { nativeFallback: true })
                ) {
                    if (await waitForSettingsMenuClose(trigger, { timeoutMs: 650 })) return true;
                }
            }

            dispatchSettingsMenuEscape(root);
            try { document.activeElement?.blur?.(); } catch { }
            const focusTarget = findOutsideSettingsMenuFocusTarget(root);
            try { focusTarget?.focus?.({ preventScroll: true }); } catch {
                try { focusTarget?.focus?.(); } catch { }
            }
            if (await waitForSettingsMenuClose(trigger, { timeoutMs: 450 })) return true;

            const outsideTarget = findOutsideSettingsMenuClickTarget(root);
            if (outsideTarget) {
                let outsideClicked = false;
                outsideClicked = simulatePointerSequenceAt(outsideTarget.element, outsideTarget.x, outsideTarget.y) || outsideClicked;
                outsideClicked = simulatePointerSequenceAt(document, outsideTarget.x, outsideTarget.y) || outsideClicked;
                outsideClicked = simulateClickElement(outsideTarget.element, { nativeFallback: true }) || outsideClicked;
                if (outsideClicked) {
                    if (await waitForSettingsMenuClose(trigger, { timeoutMs: 450 })) return true;
                }
            }

            const fallbackTarget = findComposerRootElement() || document.body;
            const fallbackRect = getElementRect(fallbackTarget);
            const fallbackX = fallbackRect ? fallbackRect.left + fallbackRect.width * 0.5 : 1;
            const fallbackY = fallbackRect ? fallbackRect.top + fallbackRect.height * 0.35 : 1;
            if (fallbackTarget) {
                let fallbackClicked = false;
                fallbackClicked = simulatePointerSequenceAt(fallbackTarget, fallbackX, fallbackY) || fallbackClicked;
                fallbackClicked = simulatePointerSequenceAt(document, fallbackX, fallbackY) || fallbackClicked;
                fallbackClicked = simulateClickElement(fallbackTarget, { nativeFallback: true }) || fallbackClicked;
                if (fallbackClicked) {
                    if (await waitForSettingsMenuClose(trigger, { timeoutMs: 450 })) return true;
                }
            }

            await sleep(SETTINGS_MENU_TIMING.pollIntervalMs);
        }
        return false;
    }

    async function toggleWebAccessAction() {
        const trigger = findSettingsTriggerElement();
        const root = await ensureSettingsMenuOpen(trigger);
        if (!root) return false;

        const deadline = Date.now() + SETTINGS_MENU_TIMING.waitTimeoutMs;
        do {
            const currentRoot = findSettingsMenuRoot(trigger) || root;
            const row = findWebAccessMenuItem(currentRoot);
            const target = findWebAccessToggleTarget(row);
            if (target) {
                const previousState = getWebAccessToggleState(target);
                if (!simulateClickElement(target, { nativeFallback: true })) return false;
                const changed = await waitForWebAccessToggleChange(trigger, previousState);
                const closed = await closeSettingsMenu(trigger);
                return changed && closed;
            }
            if (Date.now() >= deadline) break;
            await sleep(SETTINGS_MENU_TIMING.pollIntervalMs);
        } while (true);
        return false;
    }

    function findModelTriggerElement() {
        const candidates = [];
        const seen = new Set();
        for (const element of safeQueryAll(document, NOTION_MODEL_TRIGGER_SELECTORS)) {
            if (!element || seen.has(element)) continue;
            seen.add(element);
            const score = scoreModelTriggerCandidate(element);
            if (score < 0) continue;
            let bottom = 0;
            try { bottom = Number(element.getBoundingClientRect?.().bottom || 0); } catch { }
            candidates.push({ element, score, bottom });
        }
        candidates.sort((a, b) => {
            if (b.score !== a.score) return b.score - a.score;
            return b.bottom - a.bottom;
        });
        return candidates[0]?.element || null;
    }

    function scoreModelMenuRoot(root) {
        if (!root || !isVisibleElement(root)) return -1;
        const text = getElementText(root);
        const normalized = normalizeNotionText(text);
        let score = 0;
        if (normalized.includes("select a model")) score += 160;
        if (normalized.includes("open models")) score += 80;
        for (const target of NOTION_MODEL_TARGET_LIST) {
            if (textLooksLikeTarget(text, target)) score += 80;
        }
        return score >= 160 ? score : -1;
    }

    function findModelMenuRoot(triggerEl = null) {
        if (triggerEl) {
            const controlsId = String(triggerEl.getAttribute?.("aria-controls") || "").trim();
            if (controlsId) {
                const controlled = document.getElementById(controlsId);
                if (scoreModelMenuRoot(controlled) > 0) return controlled;
            }
        }

        const candidates = safeQueryAll(document, NOTION_MODEL_MENU_ROOT_SELECTOR)
            .map(element => ({ element, score: scoreModelMenuRoot(element) }))
            .filter(item => item.score > 0);
        if (candidates.length === 0) return null;
        candidates.sort((a, b) => b.score - a.score);
        return candidates[0]?.element || null;
    }

    async function ensureModelMenuOpen(triggerEl, { timeoutMs = MODEL_MENU_TIMING.waitTimeoutMs, intervalMs = MODEL_MENU_TIMING.pollIntervalMs } = {}) {
        const existing = findModelMenuRoot(triggerEl);
        if (existing) return existing;
        if (!triggerEl) return null;
        if (!simulateClickElement(triggerEl, { nativeFallback: true })) return null;
        if (MODEL_MENU_TIMING.openDelayMs > 0) await sleep(MODEL_MENU_TIMING.openDelayMs);

        const deadline = Date.now() + Math.max(0, Number(timeoutMs) || 0);
        while (Date.now() <= deadline) {
            const root = findModelMenuRoot(triggerEl);
            if (root) return root;
            await sleep(intervalMs);
        }
        return findModelMenuRoot(triggerEl);
    }

    function getClickableMenuItem(element, root) {
        let node = element;
        while (node && node !== root && node.nodeType === 1) {
            const tag = String(node.tagName || "").toLowerCase();
            const role = String(node.getAttribute?.("role") || "").toLowerCase();
            const tabIndex = String(node.getAttribute?.("tabindex") || "").trim();
            if (
                tag === "button" ||
                role === "menuitem" ||
                role === "menuitemradio" ||
                role === "option" ||
                (tabIndex && tabIndex !== "-1")
            ) {
                return node;
            }
            node = node.parentElement || null;
        }
        return element;
    }

    function findModelMenuItem(root, { target = null, textMatch = null, selector = NOTION_MODEL_MENU_ITEM_SELECTOR, fallbackToFirst = false } = {}) {
        if (!root) return null;
        const matchesTarget = (element) => {
            const text = getElementText(element);
            if (target) return textLooksLikeTarget(text, target);
            if (typeof textMatch === "function") {
                try { return !!textMatch(text, element); } catch { return false; }
            }
            if (textMatch instanceof RegExp) {
                try { return textMatch.test(text); } catch { return false; }
            }
            if (Array.isArray(textMatch)) return textMatch.some(item => matchesTarget({ textContent: item }));
            const needle = normalizeNotionText(textMatch);
            return needle ? normalizeNotionText(text).includes(needle) : true;
        };

        const candidates = [];
        const seen = new Set();
        for (const element of safeQueryAll(root, selector || NOTION_MODEL_MENU_ITEM_SELECTOR)) {
            if (!element || seen.has(element) || !isVisibleElement(element)) continue;
            seen.add(element);
            candidates.push(element);
        }

        for (const element of candidates) {
            if (matchesTarget(element)) return getClickableMenuItem(element, root);
        }

        const fallbackCandidates = safeQueryAll(root, "div, span, button")
            .filter(element => element && !seen.has(element) && isVisibleElement(element));
        for (const element of fallbackCandidates) {
            if (matchesTarget(element)) return getClickableMenuItem(element, root);
        }

        return fallbackToFirst ? (candidates[0] || null) : null;
    }

    function getShortcutDataObject(shortcut) {
        return isPlainObject(shortcut?.data) ? shortcut.data : {};
    }

    function getModelPickerSpec(shortcut) {
        const data = getShortcutDataObject(shortcut);
        const rawMenu = data.menu;
        const menu = isPlainObject(rawMenu)
            ? rawMenu
            : (rawMenu !== undefined ? { textMatch: rawMenu } : data);

        const selector = typeof menu.selector === "string" && menu.selector.trim()
            ? menu.selector.trim()
            : NOTION_MODEL_MENU_ITEM_SELECTOR;
        const fallbackToFirst = !!menu.fallbackToFirst;
        const waitForItem = menu.waitForItem !== undefined ? !!menu.waitForItem : true;
        const rawTextMatch = menu.keyword !== undefined ? menu.keyword : menu.textMatch;
        const path = Array.isArray(menu.path) ? menu.path.map(item => String(item ?? "").trim()).filter(Boolean) : [];
        const pathLast = path.length ? path[path.length - 1] : "";
        const target = inferModelTargetFromText(menu.id ?? rawTextMatch ?? pathLast ?? rawMenu ?? shortcut?.name);
        const textMatch = target ? null : (rawTextMatch ?? pathLast);

        if (!target && !textMatch && !fallbackToFirst) {
            console.warn(`${LOG_TAG} modelPicker: missing target; set data.menu = { id: "gemini31pro" } or plain text like "gemini pro".`);
            return null;
        }

        return {
            selector,
            target,
            textMatch,
            fallbackToFirst,
            waitForItem
        };
    }

    async function clickModelPickerItem({ shortcut, engine }) {
        const spec = getModelPickerSpec(shortcut);
        if (!spec) return false;

        const trigger = findModelTriggerElement();
        const currentTarget = inferModelTargetFromText(getElementText(trigger));
        if (spec.target && currentTarget && spec.target.id === currentTarget.id) return true;

        const menuRoot = await ensureModelMenuOpen(trigger);
        if (!menuRoot) return false;

        const deadline = Date.now() + MODEL_MENU_TIMING.waitTimeoutMs;
        do {
            const currentRoot = findModelMenuRoot(trigger) || menuRoot;
            const target = findModelMenuItem(currentRoot, spec);
            if (target && simulateClickElement(target, { nativeFallback: true })) return true;
            if (!spec.waitForItem || Date.now() >= deadline) break;
            await sleep(MODEL_MENU_TIMING.pollIntervalMs);
        } while (true);

        return false;
    }

    function formatMenuDataAdapter(data) {
        const raw = isPlainObject(data) ? data : {};
        const keys = Object.keys(raw);
        if (keys.length === 0) return "";

        const menu = raw.menu;
        if (typeof menu === "string" && menu.trim()) return menu.trim();
        if (isPlainObject(menu)) {
            const value = ["id", "keyword", "textMatch"]
                .map(key => typeof menu[key] === "string" && menu[key].trim() ? menu[key].trim() : "")
                .find(Boolean);
            if (value && Object.keys(menu).every(key => ["id", "keyword", "textMatch"].includes(key))) return value;
        }

        try {
            return JSON.stringify(raw, null, 2);
        } catch {
            return "";
        }
    }

    function parseMenuDataAdapter(text) {
        const trimmed = String(text ?? "").trim();
        if (!trimmed) return {};
        if (trimmed.startsWith("{") || trimmed.startsWith("[")) {
            const parsed = JSON.parse(trimmed);
            if (!isPlainObject(parsed)) throw new Error("data must be an object");
            return parsed;
        }
        return { menu: trimmed };
    }

    function createMenuDataAdapter({ label, placeholder } = {}) {
        return {
            label,
            placeholder,
            format: formatMenuDataAdapter,
            parse: parseMenuDataAdapter
        };
    }

    const SITE_MESSAGES = Object.freeze({
        "zh-CN": {
            menuCommandLabel: "Notion - 设置快捷键",
            panelTitle: "Notion - 自定义快捷键",
            shortcuts: {
                newChat: "新建聊天",
                selectAiModel: "选择 AI 模型",
                modelAuto: "模型：Auto",
                modelSonnet46: "模型：Claude Sonnet 4.6",
                modelOpus46: "模型：Claude Opus 4.6",
                modelOpus47: "模型：Claude Opus 4.7",
                modelGemini31Pro: "模型：Gemini 3.1 Pro",
                modelGpt52: "模型：GPT-5.2",
                modelGpt54: "模型：GPT-5.4",
                modelGpt55: "模型：GPT-5.5",
                modelKimi26: "模型：Kimi K2.6",
                modelDeepSeekV4Pro: "模型：DeepSeek V4 Pro",
                toggleResearchMode: "切换研究模式",
                selectSearchScope: "选择搜索范围",
                toggleWebAccess: "切换联网",
                addContext: "添加上下文",
                attachFile: "附加文件"
            },
            dataAdapters: {
                modelPicker: {
                    label: "模型 ID / 关键词（或粘贴 JSON，高级用法）:",
                    placeholder: "例如: gemini pro / opus 4.7 / {\"menu\":{\"id\":\"opus47\"}}"
                }
            }
        },
        "en-US": {
            menuCommandLabel: "Notion - Shortcut settings",
            panelTitle: "Notion - Custom shortcuts",
            shortcuts: {
                newChat: "New Chat",
                toggleWebAccess: "Toggle Web Access"
            },
            dataAdapters: {
                modelPicker: {
                    label: "Model ID / keyword (or paste JSON, advanced):",
                    placeholder: "Example: gemini pro / opus 4.7 / {\"menu\":{\"id\":\"opus47\"}}"
                }
            }
        }
    });

    const baseShortcut = Object.freeze({
        actionType: 'selector',
        url: '',
        urlMethod: 'current',
        urlAdvanced: 'href',
        selector: '',
        simulateKeys: '',
        customAction: '',
        data: {},
        icon: defaultIconURL
    });

    const createShortcut = (overrides) => ({ ...baseShortcut, ...overrides });

    function createModelShortcut(target) {
        return createShortcut({
            key: `model-${target.id}`,
            name: target.label,
            labelKey: target.labelKey,
            actionType: "custom",
            customAction: "modelPicker",
            hotkey: target.hotkey,
            icon: NOTION_AI_ICON,
            data: { menu: { id: target.id } }
        });
    }

    const defaultModelShortcuts = NOTION_MODEL_TARGET_LIST.map(createModelShortcut);

    const defaultShortcuts = [
        createShortcut({
            key: 'newChat',
            name: 'New Chat',
            labelKey: 'shortcuts.newChat',
            actionType: 'custom',
            customAction: 'newChat',
            hotkey: 'CTRL+N',
            icon: NEW_CHAT_ICON
        }),
        ...defaultModelShortcuts,
        createShortcut({
            key: 'toggleResearchMode',
            name: 'Toggle Research Mode',
            selector: '[data-testid="unified-chat-research-mode-button"]',
            hotkey: 'CTRL+R',
            icon: RESEARCH_ICON
        }),
        createShortcut({
            key: 'selectSearchScope',
            name: 'Select Search Scope',
            selector: '[data-testid="unified-chat-search-scope-button"][role="button"]',
            hotkey: 'CTRL+S',
            icon: SEARCH_ICON
        }),
        createShortcut({
            key: 'toggleWebAccess',
            name: 'Toggle Web Access',
            labelKey: 'shortcuts.toggleWebAccess',
            actionType: 'custom',
            customAction: 'toggleWebAccess',
            hotkey: 'CTRL+W',
            icon: WEB_ACCESS_ICON
        }),
        createShortcut({
            key: 'addContext',
            name: 'Add Context',
            selector: '[data-testid="unified-chat-add-context-button"]',
            hotkey: 'CTRL+SHIFT+C',
            icon: ADD_CONTEXT_ICON
        }),
        createShortcut({
            key: 'attachFile',
            name: 'Attach File',
            selector: 'button[aria-label="Attach file"]',
            hotkey: 'CTRL+SHIFT+F',
            icon: ATTACH_FILE_ICON
        })
    ];

    function createDefaultShortcutByKey(key) {
        const shortcutKey = String(key || "").trim();
        if (!shortcutKey) return null;
        const shortcut = defaultShortcuts.find(item => String(item?.key || "").trim() === shortcutKey);
        return cloneShortcutItem(shortcut);
    }

    function isLegacyNewChatShortcut(shortcut) {
        if (!shortcut || typeof shortcut !== "object" || Array.isArray(shortcut)) return false;
        const key = String(shortcut.key || "").trim();
        const name = String(shortcut.name || "").trim();
        const actionType = String(shortcut.actionType || "").trim().toLowerCase();
        const simulateKeys = normalizeHotkeyToken(shortcut.simulateKeys);
        const selector = String(shortcut.selector || "").trim();
        const customAction = String(shortcut.customAction || "").trim();
        const hotkey = normalizeHotkeyToken(shortcut.hotkey);
        const data = isPlainObject(shortcut.data) ? shortcut.data : {};
        return (
            (key === "newChat" || name === "New Chat") &&
            actionType === "simulate" &&
            simulateKeys === LEGACY_NEW_CHAT_SIMULATE_KEYS &&
            !selector &&
            !customAction &&
            hotkey === "CTRL+N" &&
            Object.keys(data).length === 0
        );
    }

    function isLegacySelectAiModelShortcut(shortcut) {
        if (!shortcut || typeof shortcut !== "object" || Array.isArray(shortcut)) return false;
        const key = String(shortcut.key || "").trim();
        const name = String(shortcut.name || "").trim();
        const actionType = String(shortcut.actionType || "").trim().toLowerCase();
        const selector = String(shortcut.selector || "").trim();
        const customAction = String(shortcut.customAction || "").trim();
        const hotkey = normalizeHotkeyToken(shortcut.hotkey);
        const data = isPlainObject(shortcut.data) ? shortcut.data : {};
        return (
            (key === LEGACY_SELECT_AI_MODEL_KEY || name === "Select AI Model") &&
            (!actionType || actionType === "selector") &&
            selector === LEGACY_SELECT_AI_MODEL_SELECTOR &&
            !customAction &&
            hotkey === "CTRL+M" &&
            Object.keys(data).length === 0
        );
    }

    function migrateNotionManagedModelShortcuts() {
        const stored = gmGetValueLocal(NOTION_DEFAULT_SHORTCUTS_STORAGE_KEY, null);
        if (!Array.isArray(stored)) return;

        let changed = false;
        const next = [];

        for (const shortcut of stored) {
            if (isLegacySelectAiModelShortcut(shortcut)) {
                changed = true;
                continue;
            }
            if (isLegacyNewChatShortcut(shortcut)) {
                const replacement = createDefaultShortcutByKey("newChat");
                if (replacement) {
                    next.push({
                        ...replacement,
                        id: String(shortcut.id || replacement.id || "").trim() || replacement.id,
                        hotkey: String(shortcut.hotkey || replacement.hotkey || "").trim() || replacement.hotkey
                    });
                    changed = true;
                    continue;
                }
            }
            next.push(shortcut);
        }

        const existingKeys = new Set(next.map(shortcut => String(shortcut?.key || "").trim()).filter(Boolean));
        const existingHotkeys = new Map();
        for (const shortcut of next) {
            const hotkey = normalizeHotkeyToken(shortcut?.hotkey);
            if (hotkey) existingHotkeys.set(hotkey, shortcut);
        }

        for (const key of NOTION_MANAGED_DEFAULT_SHORTCUT_KEYS) {
            if (existingKeys.has(key)) continue;
            const shortcut = createDefaultShortcutByKey(key);
            if (!shortcut) continue;
            const hotkey = normalizeHotkeyToken(shortcut.hotkey);
            const conflict = hotkey ? existingHotkeys.get(hotkey) : null;
            if (conflict) {
                shortcut.hotkey = "";
                console.warn(`${LOG_TAG} migration: hotkey ${hotkey} is already used; added ${shortcut.name || key} without a default hotkey.`);
            } else if (hotkey) {
                existingHotkeys.set(hotkey, shortcut);
            }
            next.push(shortcut);
            existingKeys.add(key);
            changed = true;
        }

        if (changed) gmSetValueLocal(NOTION_DEFAULT_SHORTCUTS_STORAGE_KEY, next);
    }

    migrateNotionManagedModelShortcuts();

    const engine = ShortcutTemplate.createShortcutEngine({
        menuCommandLabel: "Notion - 设置快捷键",
        panelTitle: "Notion - 自定义快捷键",
        storageKeys: {
            shortcuts: NOTION_DEFAULT_SHORTCUTS_STORAGE_KEY,
            iconCachePrefix: "notion_icon_cache_v1::",
            userIcons: "notion_user_icons_v1"
        },
        ui: {
            idPrefix: "notion",
            cssPrefix: "notion",
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
            newChat: triggerNewChatAction,
            modelPicker: clickModelPickerItem,
            toggleWebAccess: toggleWebAccessAction
        },
        customActionDataAdapters: {
            modelPicker: createMenuDataAdapter({
                label: siteText("dataAdapters.modelPicker.label", "Model ID / keyword (or paste JSON, advanced):"),
                placeholder: siteText("dataAdapters.modelPicker.placeholder", 'Example: gemini pro / opus 4.7 / {"menu":{"id":"opus47"}}')
            })
        },
        consoleTag: LOG_TAG,
        colors: {
            primary: "#2f3437"
        },
        shouldBypassIconCache: (url) => {
            return String(url || '').startsWith('https://www.notion.so/');
        },
        text: {
            menuLabelFallback: "打开快捷键设置"
        }
    });

    engine.init();
})();
