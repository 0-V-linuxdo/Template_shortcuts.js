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
