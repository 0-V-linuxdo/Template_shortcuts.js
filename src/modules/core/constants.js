/* -------------------------------------------------------------------------- *
 * Module 01 · Wrapper & core constants (IIFE bootstrap, defaults, URL methods)
 * -------------------------------------------------------------------------- */

    /* ------------------------------------------------------------------
     * 1. 常量定义 & 工具函数
     * ------------------------------------------------------------------ */

    export const TEMPLATE_VERSION = "__TEMPLATE_VERSION__";

    export const DEFAULT_OPTIONS = {
        version: TEMPLATE_VERSION,
        menuCommandLabel: '设置快捷键',
        panelTitle: '自定义快捷键',
        storageKeys: {
            shortcuts: 'shortcut_engine_shortcuts_v1',
            iconCachePrefix: 'shortcut_engine_icon_cache_v1::',
            userIcons: 'shortcut_engine_user_icons_v1',
            uiPrefs: '',
            iconThemeAdapted: ''
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
        customActionDataAdapters: {},
        actionHandlers: {},
        allowOverrideBuiltinActions: false,
        actionTypeMeta: {},
        locale: 'auto',
        i18n: {},
        colors: {
            primary: '#0066cc'
        },
        consoleTag: '[ShortcutEngine]',
        shouldBypassIconCache: null,
        iconCache: {
            enableMemoryCache: true,
            memoryMaxEntries: 200,
            maxDataUrlChars: 180000
        },
        iconThemeAdapt: {
            enabled: true,
            lightFillColor: '#111827',
            darkFillColor: '#F8FAFC'
        },
        resolveUrlTemplate: null,
        getCurrentSearchTerm: null,
        placeholderToken: '%s',
        keyboard: {
            allowedInputTags: ['INPUT', 'TEXTAREA', 'SELECT'],
            allowContentEditable: true,
            blockUnlistedModifierShortcutsInInputsWhenPanelOpen: true,
            isAllowedShortcutWhenPanelOpen: null
        },
        text: {
            menuCommandLabel: '设置快捷键',
            panelTitle: '自定义快捷键',
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
                import: '导入',
                export: '导出',
                reset: '重置默认',
                settings: '设置',
                copy: '复制',
                close: '关闭',
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
                simulateHelp: '⚡ 将模拟这个按键组合发送到网页',
                searchPlaceholder: '搜索名称/目标'
            },
            builtins: {
                unknownUrlMethod: '未知跳转方式',
                invalidUrlOrError: '无效的跳转网址或发生错误: {url}',
                elementNotFound: '无法找到元素: {selector}',
                clickFailed: '无法模拟点击元素: {selector}'
            },
            actionTypes: {
                unknownLabel: '未知',
                urlShortLabel: 'URL',
                selectorShortLabel: '点击',
                simulateShortLabel: '按键',
                customShortLabel: '自定义'
            },
            panel: {
                languageLabel: '界面语言',
                languageAuto: '自动(跟随浏览器)',
                languageZhCN: '简体中文',
                languageEnUS: 'English',
                themeModeLabel: '面板主题',
                themeModeAuto: '自动(跟随页面)',
                themeModeLight: '普通',
                themeModeDark: '黑暗',
                actionsLabel: '脚本配置',
                resetConfirm: '确定重置为默认配置吗？(需要点击“保存并关闭”才会写入存储)',
                confirmDeleteShortcut: '确定删除快捷键【{name}】吗?',
                iconAdaptiveLabel: 'svg自适应处理',
                iconAdaptiveHint: '仅在主图标为SVG且未设置黑暗模式图标URL时生效',
                tableHeaders: {
                    icon: '图标',
                    name: '名称',
                    type: '类型',
                    target: '目标',
                    hotkey: '快捷键',
                    actions: '操作'
                },
                compact: {
                    noHotkey: '无',
                    emptyTarget: '（无目标配置）'
                },
                dragError: '拖拽排序时出错: {error}'
            },
            editor: {
                titles: {
                    add: '添加快捷键',
                    edit: '编辑快捷键'
                },
                tabs: {
                    general: '常规',
                    data: '扩展',
                    icon: '图标'
                },
                labels: {
                    name: '名称:',
                    actionType: '操作类型:',
                    url: '目标网址 (URL):',
                    selector: '目标选择器 (Selector):',
                    simulate: '模拟按键:',
                    customAction: '自定义动作 (customAction):',
                    data: '扩展参数 (data JSON，可选):',
                    icon: '图标URL:',
                    iconDark: '黑暗模式图标URL:',
                    hotkey: '快捷键:',
                    urlMethod: '跳转方式:',
                    urlMethodToggleAdvanced: '展开/折叠高级选项',
                    urlMethodAdvanced: '高级选项:',
                    iconLibrary: '或从图库选择:'
                },
                placeholders: {
                    url: '例如: https://example.com/search?q=%s',
                    selector: '例如: label[for="sidebar-visible"]',
                    customAction: '从脚本提供的 customActions 中选择/输入 key',
                    data: '例如: {"foo":"bar"}',
                    icon: '在此粘贴URL, 或从下方图库选择',
                    iconDark: '可选：黑暗模式图标URL'
                },
                actionTypeHints: {
                    unregistered: '该类型当前未注册 handler；触发时会提示 unknown actionType。',
                    unregisteredSuffix: ' (未注册)',
                    extended: '扩展类型：可在下方 data JSON 传递参数。'
                },
                validation: {
                    dataParseFailed: 'data 解析失败，请检查输入。',
                    dataJsonParseFailed: 'data JSON 解析失败，请检查格式。',
                    dataJsonMustBeObject: 'data 必须是 JSON 对象 (例如 {"foo":"bar"})。',
                    nameRequired: '请填写名称!',
                    urlRequired: '请填写目标网址!',
                    selectorRequired: '请填写目标选择器!',
                    simulateRequired: '请设置模拟按键!',
                    customActionRequired: '请设置自定义动作 key!',
                    hotkeyRequired: '请设置快捷键!',
                    hotkeyIncomplete: '快捷键设置不完整 (缺少主键)!',
                    hotkeyDuplicate: '该快捷键已被其他项使用, 请选择其他组合!'
                },
                iconLibrary: {
                    userAddedHint: ' (长按删除)',
                    expandTitle: '展开/折叠更多图标',
                    addTitle: '将输入框中的图标URL添加到图库',
                    promptName: '请输入图标的名称：',
                    urlRequired: '请输入图标的URL！',
                    alreadyExists: '该图标已存在于图库中。',
                    confirmDelete: '确定要删除自定义图标 "{name}" 吗?'
                },
                capture: {
                    placeholderDuringCapture: '请按下{label}组合...',
                    statusCapturing: '🎯 正在捕获{label}，请按下组合键...',
                    statusCaptured: '✅ 已捕获{label}: {keys}',
                    statusInvalid: '❌ 未捕获到有效的{label}',
                    statusUnsupportedHotkey: '❌ 不支持的快捷键: {key}',
                    statusUnsupportedSimulate: '❌ 不支持的模拟按键: {key}',
                    statusCleared: '🗑️ {label}已清除'
                }
            },
            io: {
                copySuccess: '已复制到剪贴板。',
                copyFail: '复制失败，请手动复制。',
                importTip: '支持导入 { shortcuts: [...], userIcons?: [...] } 或直接导入 shortcuts 数组。',
                importPlaceholder: '粘贴 JSON 到这里…',
                importJsonParseFailed: 'JSON 解析失败，请检查格式。',
                importMissingShortcuts: '导入数据中未找到 shortcuts 数组。',
                importDuplicateHotkeysPrefix: '导入失败：存在重复快捷键(请先在 JSON 中修复)：'
            },
            menuLabelFallback: '打开快捷键设置'
        }
    };

    export const DEFAULT_CORE_I18N_MESSAGES = {
        "zh-CN": DEFAULT_OPTIONS.text,
        "en-US": {
            stats: {
                total: "Total",
                url: "URL jump",
                selector: "Element click",
                simulate: "Key simulation",
                custom: "Custom action"
            },
            buttons: {
                addShortcut: "Add shortcut",
                saveAndClose: "Save and close",
                import: "Import",
                export: "Export",
                reset: "Reset defaults",
                settings: "Settings",
                copy: "Copy",
                close: "Close",
                confirm: "OK",
                cancel: "Cancel",
                delete: "Delete",
                edit: "Edit",
                clear: "Clear"
            },
            dialogs: {
                alert: "Notice",
                confirm: "Confirm",
                prompt: "Input"
            },
            hints: {
                hotkey: "Click here, then press a shortcut combination",
                simulate: "Click here, then press the keys to simulate",
                hotkeyHelp: "Supports Ctrl/Shift/Alt/Cmd plus letters, numbers, function keys, and more",
                simulateHelp: "This key combination will be simulated on the page",
                searchPlaceholder: "Search name/target"
            },
            builtins: {
                unknownUrlMethod: "Unknown jump method",
                invalidUrlOrError: "Invalid jump URL or error: {url}",
                elementNotFound: "Element not found: {selector}",
                clickFailed: "Could not simulate click on element: {selector}"
            },
            actionTypes: {
                unknownLabel: "Unknown",
                urlShortLabel: "URL",
                selectorShortLabel: "Click",
                simulateShortLabel: "Keys",
                customShortLabel: "Custom"
            },
            panel: {
                languageLabel: "Interface language",
                languageAuto: "Auto (follow browser)",
                languageZhCN: "简体中文",
                languageEnUS: "English",
                themeModeLabel: "Panel theme",
                themeModeAuto: "Auto (follow page)",
                themeModeLight: "Light",
                themeModeDark: "Dark",
                actionsLabel: "Script config",
                resetConfirm: "Reset to the default configuration? Changes are saved only after clicking \"Save and close\".",
                confirmDeleteShortcut: "Delete shortcut \"{name}\"?",
                iconAdaptiveLabel: "SVG adaptive processing",
                iconAdaptiveHint: "Only applies when the main icon is an SVG and no dark-mode icon URL is set",
                tableHeaders: {
                    icon: "Icon",
                    name: "Name",
                    type: "Type",
                    target: "Target",
                    hotkey: "Shortcut",
                    actions: "Actions"
                },
                compact: {
                    noHotkey: "None",
                    emptyTarget: "(No target configured)"
                },
                dragError: "Drag sorting error: {error}"
            },
            editor: {
                titles: {
                    add: "Add shortcut",
                    edit: "Edit shortcut"
                },
                tabs: {
                    general: "General",
                    data: "Data",
                    icon: "Icon"
                },
                labels: {
                    name: "Name:",
                    actionType: "Action type:",
                    url: "Target URL:",
                    selector: "Target selector:",
                    simulate: "Simulated keys:",
                    customAction: "Custom action:",
                    data: "Extra parameters (data JSON, optional):",
                    icon: "Icon URL:",
                    iconDark: "Dark-mode icon URL:",
                    hotkey: "Shortcut:",
                    urlMethod: "Jump method:",
                    urlMethodToggleAdvanced: "Expand/collapse advanced options",
                    urlMethodAdvanced: "Advanced options:",
                    iconLibrary: "Or choose from the library:"
                },
                placeholders: {
                    url: "Example: https://example.com/search?q=%s",
                    selector: "Example: label[for=\"sidebar-visible\"]",
                    customAction: "Choose/type a key from customActions provided by the script",
                    data: "Example: {\"foo\":\"bar\"}",
                    icon: "Paste a URL here, or choose from the library below",
                    iconDark: "Optional: dark-mode icon URL"
                },
                actionTypeHints: {
                    unregistered: "This type currently has no registered handler; triggering it will report an unknown actionType.",
                    unregisteredSuffix: " (unregistered)",
                    extended: "Extended type: pass parameters in the data JSON below."
                },
                validation: {
                    dataParseFailed: "Failed to parse data. Please check the input.",
                    dataJsonParseFailed: "Failed to parse data JSON. Please check the format.",
                    dataJsonMustBeObject: "data must be a JSON object (for example {\"foo\":\"bar\"}).",
                    nameRequired: "Please enter a name.",
                    urlRequired: "Please enter a target URL.",
                    selectorRequired: "Please enter a target selector.",
                    simulateRequired: "Please set simulated keys.",
                    customActionRequired: "Please set a custom action key.",
                    hotkeyRequired: "Please set a shortcut.",
                    hotkeyIncomplete: "Shortcut is incomplete (missing main key).",
                    hotkeyDuplicate: "This shortcut is already used by another item. Choose another combination."
                },
                iconLibrary: {
                    userAddedHint: " (long press to delete)",
                    expandTitle: "Expand/collapse more icons",
                    addTitle: "Add the icon URL from the input to the library",
                    promptName: "Enter an icon name:",
                    urlRequired: "Please enter an icon URL.",
                    alreadyExists: "This icon already exists in the library.",
                    confirmDelete: "Delete custom icon \"{name}\"?"
                },
                capture: {
                    placeholderDuringCapture: "Press the {label} combination...",
                    statusCapturing: "Capturing {label}; press a key combination...",
                    statusCaptured: "Captured {label}: {keys}",
                    statusInvalid: "No valid {label} captured",
                    statusUnsupportedHotkey: "Unsupported shortcut: {key}",
                    statusUnsupportedSimulate: "Unsupported simulated key: {key}",
                    statusCleared: "{label} cleared"
                }
            },
            io: {
                copySuccess: "Copied to clipboard.",
                copyFail: "Copy failed. Please copy manually.",
                importTip: "Supports importing { shortcuts: [...], userIcons?: [...] } or a shortcuts array directly.",
                importPlaceholder: "Paste JSON here...",
                importJsonParseFailed: "Failed to parse JSON. Please check the format.",
                importMissingShortcuts: "No shortcuts array found in the imported data.",
                importDuplicateHotkeysPrefix: "Import failed: duplicate shortcuts found (fix them in JSON first):"
            },
            menuLabelFallback: "Open shortcut settings",
            menuCommandLabel: "Shortcut settings",
            panelTitle: "Custom shortcuts",
            urlMethods: {
                current: {
                    name: "Current window",
                    options: {
                        href: { name: "location.href", desc: "Standard navigation; adds an entry to history" },
                        replace: { name: "location.replace", desc: "Replace the current page without adding a history entry" }
                    }
                },
                spa: {
                    name: "SPA route",
                    options: {
                        pushState: { name: "history.pushState", desc: "Push a new state to history; suitable for SPA navigation" },
                        replaceState: { name: "history.replaceState", desc: "Replace the current history state without adding a new entry" }
                    }
                },
                newWindow: {
                    name: "New window",
                    options: {
                        open: { name: "window.open", desc: "Open the link in a new tab" },
                        popup: { name: "Popup window", desc: "Open the link in a new popup window" }
                    }
                }
            }
        }
    };

    export const URL_METHODS = {
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
