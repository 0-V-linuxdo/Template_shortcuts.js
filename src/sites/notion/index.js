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

    const NOTION_AI_ICON = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='currentColor'%3E%3Cpath d='M12 2l3.09 6.26L22 9l-5.91 4.47L17 22l-5-3.4L7 22l.91-8.53L2 9l6.91-.74z'/%3E%3C/svg%3E";
    const SEARCH_ICON = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='currentColor'%3E%3Cpath d='M15.5 14h-.79l-.28-.27A6.471 6.471 0 0 0 16 9.5 6.5 6.5 0 1 0 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z'/%3E%3C/svg%3E";
    const SETTINGS_ICON = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='currentColor'%3E%3Cpath d='M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8zM12 14a2 2 0 1 1 0-4 2 2 0 0 1 0 4z'/%3E%3Cpath d='M12 1L9 4H6a2 2 0 0 0-2 2v3l-3 3 3 3v3a2 2 0 0 0 2 2h3l3 3 3-3h3a2 2 0 0 0 2-2v-3l3-3-3-3V6a2 2 0 0 0-2-2h-3L12 1z'/%3E%3C/svg%3E";
    const RESEARCH_ICON = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='currentColor'%3E%3Cpath d='M17 3H7a2 2 0 0 0-2 2v16l7-3 7 3V5a2 2 0 0 0-2-2zm0 15l-5-2.18L7 18V5h10v13z'/%3E%3C/svg%3E";
    const ADD_CONTEXT_ICON = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 16 16' fill='currentColor'%3E%3Cpath d='M11.904 3.28a6.125 6.125 0 1 0-1.648 10.415.625.625 0 1 0-.46-1.163 4.875 4.875 0 1 1 2.808-2.93c-.102.294-.43.523-.878.523a.87.87 0 0 1-.872-.872V5.705a.625.625 0 0 0-1.242-.098 3.04 3.04 0 0 0-1.746-.527c-.792 0-1.542.277-2.095.825-.557.55-.871 1.332-.871 2.256s.313 1.714.864 2.276 1.3.858 2.102.858c.8 0 1.55-.294 2.104-.85a2.12 2.12 0 0 0 1.756.93c.835 0 1.738-.441 2.058-1.361a6.125 6.125 0 0 0-1.88-6.734M6.65 6.793c.294-.29.715-.463 1.216-.463.5 0 .929.173 1.228.466.296.289.508.735.508 1.365 0 .631-.213 1.095-.515 1.4-.303.306-.73.484-1.221.484-.49 0-.91-.178-1.209-.482-.296-.303-.507-.767-.507-1.402 0-.633.21-1.08.5-1.368'/%3E%3C/svg%3E";
    const ATTACH_FILE_ICON = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 20 20' fill='currentColor'%3E%3Cpath d='M10.184 3.64A3.475 3.475 0 0 1 15.1 8.554l-5.374 5.374a2.05 2.05 0 1 1-2.9-2.9l2.688-2.686a.625.625 0 0 1 .884.884L7.71 11.913a.8.8 0 0 0 1.13 1.131l5.375-5.374a2.225 2.225 0 1 0-3.147-3.146L5.694 9.898a3.65 3.65 0 1 0 5.162 5.161l4.702-4.702a.625.625 0 0 1 .884.884l-4.702 4.702a4.9 4.9 0 1 1-6.93-6.93z'/%3E%3C/svg%3E";

    const defaultIcons = [
        { name: 'Notion', url: defaultIconURL },
        { name: 'AI Assistant', url: NOTION_AI_ICON },
        { name: 'Search', url: SEARCH_ICON },
        { name: 'Settings', url: SETTINGS_ICON },
        { name: 'Research', url: RESEARCH_ICON },
        { name: 'Google', url: 'https://www.google.com/favicon.ico' },
        { name: 'ChatGPT', url: 'https://chat.openai.com/favicon-32x32.png' },
        { name: 'Claude', url: 'https://claude.ai/favicon.ico' },
        { name: 'GitHub', url: 'https://github.githubassets.com/favicons/favicon.svg' }
    ];

    const protectedIconUrls = [
        defaultIconURL
    ];

    const SITE_MESSAGES = Object.freeze({
        "zh-CN": {
            menuCommandLabel: "Notion - 设置快捷键",
            panelTitle: "Notion - 自定义快捷键",
            shortcuts: {
                selectAiModel: "选择 AI 模型",
                toggleResearchMode: "切换研究模式",
                selectSearchScope: "选择搜索范围",
                addContext: "添加上下文",
                attachFile: "附加文件"
            }
        },
        "en-US": {
            menuCommandLabel: "Notion - Shortcut settings",
            panelTitle: "Notion - Custom shortcuts"
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

    const defaultShortcuts = [
        createShortcut({
            key: 'selectAiModel',
            name: 'Select AI Model',
            selector: '[data-testid="unified-chat-model-button"][role="button"]',
            hotkey: 'CTRL+M'
        }),
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

    const engine = ShortcutTemplate.createShortcutEngine({
        menuCommandLabel: "Notion - 设置快捷键",
        panelTitle: "Notion - 自定义快捷键",
        storageKeys: {
            shortcuts: "notion_shortcuts_v1",
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
        consoleTag: "[Notion Shortcut Script]",
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
