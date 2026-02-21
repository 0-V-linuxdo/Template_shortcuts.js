// ==UserScript==
// @name         [Template] 快捷键跳转 [20260222] v1.4.2
// @namespace    https://github.com/0-V-linuxdo/Template_shortcuts.js
// @version      [20260222] v1.4.2
// @update-log   1.4.2: 设置菜单按钮调整为横向排列（重置/导入/导出）并优化配色；“svg自适应处理”提示组件优化为淡粉色；设置按钮改为 SVG 图标。
// @description  提供可复用的快捷键管理模板(支持URL跳转/元素点击/按键模拟、可视化设置面板、按类型筛选、深色模式、自适应布局、图标缓存、快捷键捕获，并内置安全 SVG 图标构造能力)。
// @match        *://*/*
// @grant        GM_registerMenuCommand
// @grant        GM_getValue
// @grant        GM_setValue
// @grant        GM_xmlhttpRequest
// @connect      *
// ==/UserScript==

/* ===================== IMPORTANT · NOTICE · START =====================
 *
 * 1. [编辑指引 | Edit Guidance]
 *    • ⚠️ 这是一个自动生成的文件：请在 `src/modules` 目录下的模块中进行修改，然后运行 `npm run build` 在 `dist/` 目录下重新生成。
 *    • ⚠️ This project bundles auto-generated artifacts. Make changes inside the modules under `src/modules`, then run `npm run build` to regenerate everything under `dist/`.
 *
 * ----------------------------------------------------------------------
 *
 * 2. [安全提示 | Safety Reminder]
 *    • ✅ 必须使用 `setTrustedHTML`，不得使用 `innerHTML`。
 *    • ✅ Always call `setTrustedHTML`; never rely on `innerHTML`.
 *
 * ====================== IMPORTANT · NOTICE · END ======================
 */

(function (global) {
    'use strict';

/* -------------------------------------------------------------------------- *
 * Module 01 · Wrapper & core constants (IIFE bootstrap, defaults, URL methods)
 * -------------------------------------------------------------------------- */

    /* ------------------------------------------------------------------
     * 1. 常量定义 & 工具函数
     * ------------------------------------------------------------------ */

    const TEMPLATE_VERSION = "20260222";

    const DEFAULT_OPTIONS = {
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
/* -------------------------------------------------------------------------- *
 * Module 02 · Utils (DOM helpers, events, menu controller, one-step executor)
 * -------------------------------------------------------------------------- */

    /* ------------------------------------------------------------------
     * Utils: DOM / Events / Menu / 1step
     * ------------------------------------------------------------------ */

    const Utils = (() => {
        const DEFAULT_TIMING = Object.freeze({
            pollIntervalMs: 120,
            waitTimeoutMs: 3000,
            openDelayMs: 250,
            stepDelayMs: 250
        });

        const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

        function safeQuerySelector(root, selector) {
            const base = root && typeof root.querySelector === "function" ? root : (global.document || null);
            if (!base || !selector) return null;
            try {
                return base.querySelector(selector);
            } catch {
                return null;
            }
        }

        function safeQuerySelectorAll(root, selector) {
            const base = root && typeof root.querySelectorAll === "function" ? root : (global.document || null);
            if (!base || !selector) return [];
            try {
                return Array.from(base.querySelectorAll(selector));
            } catch {
                return [];
            }
        }

        const TRUSTED_TYPES_POLICY_NAME = "ShortcutTemplateTrustedHTML";
        let trustedHtmlPolicy = null;

        function getTrustedHtmlPolicy() {
            if (trustedHtmlPolicy) return trustedHtmlPolicy;
            try {
                if (!global.trustedTypes || typeof global.trustedTypes.createPolicy !== "function") return null;
                trustedHtmlPolicy = global.trustedTypes.createPolicy(TRUSTED_TYPES_POLICY_NAME, {
                    createHTML: (input) => String(input ?? "")
                });
                return trustedHtmlPolicy;
            } catch {
                return null;
            }
        }

        function sanitizeFragment(fragment) {
            if (!fragment) return;
            const forbiddenSelector = "script, iframe, object, embed, link, style";
            try {
                fragment.querySelectorAll?.(forbiddenSelector)?.forEach((node) => node.remove());
            } catch {}
            try {
                const walker = global.document?.createTreeWalker?.(
                    fragment,
                    NodeFilter.SHOW_ELEMENT,
                    null
                );
                if (!walker) return;
                while (walker.nextNode()) {
                    const el = walker.currentNode;
                    if (!el || !el.attributes) continue;
                    const attrs = Array.from(el.attributes);
                    for (const attr of attrs) {
                        if (attr && typeof attr.name === "string" && attr.name.toLowerCase().startsWith("on")) {
                            try { el.removeAttribute(attr.name); } catch {}
                        }
                    }
                }
            } catch {}
        }

        function setTrustedHTML(element, html) {
            if (!element) return;
            const value = String(html ?? "");
            const policy = getTrustedHtmlPolicy();
            if (policy) {
                try {
                    element.innerHTML = policy.createHTML(value);
                    return;
                } catch {}
            }
            try {
                element.innerHTML = value;
                return;
            } catch {}

            try {
                const parser = new DOMParser();
                const parsed = parser.parseFromString(value, "text/html");
                const fragment = global.document?.createDocumentFragment?.() || null;
                const body = parsed?.body;
                if (fragment && body) {
                    sanitizeFragment(body);
                    while (body.firstChild) fragment.appendChild(body.firstChild);
                    element.replaceChildren(fragment);
                    return;
                }
            } catch {}

            try {
                element.textContent = value;
            } catch {}
        }

        function isVisible(element) {
            if (!element) return false;
            if (element.hidden) return false;
            try {
                return !!(element.offsetWidth || element.offsetHeight || element.getClientRects().length);
            } catch {
                return false;
            }
        }

        function escapeForAttributeSelector(value) {
            return String(value).replace(/\\/g, "\\\\").replace(/"/g, '\\"');
        }

        function normalizeText(text) {
            return String(text || "").replace(/\s+/g, " ").trim().toLowerCase();
        }

        function matchText(rawText, matcher, { normalize = normalizeText, element = null } = {}) {
            if (matcher == null) return true;
            if (typeof matcher === "function") {
                try {
                    return !!matcher(rawText, element);
                } catch {
                    return false;
                }
            }
            if (matcher instanceof RegExp) {
                try {
                    return matcher.test(String(rawText || ""));
                } catch {
                    return false;
                }
            }
            if (Array.isArray(matcher)) {
                return matcher.some(m => matchText(rawText, m, { normalize, element }));
            }

            const text = typeof normalize === "function" ? normalize(rawText) : String(rawText || "");
            const target = typeof normalize === "function" ? normalize(matcher) : String(matcher || "");
            return target ? text.includes(target) : true;
        }

        function getElementLabelText(element) {
            if (!element) return "";
            const aria = element.getAttribute && element.getAttribute("aria-label");
            if (aria) return aria;
            const title = element.getAttribute && element.getAttribute("title");
            if (title) return title;
            return element.textContent || "";
        }

        function findFirst(root, selector, { textMatch = null, normalize = normalizeText, fallbackToFirst = false } = {}) {
            const list = safeQuerySelectorAll(root, selector);
            if (list.length === 0) return null;
            if (!textMatch) return list[0] || null;
            for (const el of list) {
                const text = getElementLabelText(el);
                if (matchText(text, textMatch, { normalize, element: el })) return el;
            }
            if (fallbackToFirst) return list[0] || null;
            return null;
        }

        async function waitFor(predicate, { timeoutMs = DEFAULT_TIMING.waitTimeoutMs, intervalMs = DEFAULT_TIMING.pollIntervalMs } = {}) {
            const start = Date.now();
            while (Date.now() - start < timeoutMs) {
                try {
                    if (predicate()) return true;
                } catch {}
                await sleep(intervalMs);
            }
            return false;
        }

        async function waitForElement(root, selector, { timeoutMs = DEFAULT_TIMING.waitTimeoutMs, intervalMs = DEFAULT_TIMING.pollIntervalMs } = {}) {
            const start = Date.now();
            while (Date.now() - start < timeoutMs) {
                const el = safeQuerySelector(root, selector);
                if (el) return el;
                await sleep(intervalMs);
            }
            return null;
        }

        async function waitForMatch(root, selector, {
            textMatch = null,
            normalize = normalizeText,
            fallbackToFirst = false,
            timeoutMs = DEFAULT_TIMING.waitTimeoutMs,
            intervalMs = DEFAULT_TIMING.pollIntervalMs
        } = {}) {
            const start = Date.now();
            while (Date.now() - start < timeoutMs) {
                const el = findFirst(root, selector, { textMatch, normalize, fallbackToFirst });
                if (el) return el;
                await sleep(intervalMs);
            }
            return null;
        }

        function resolveEventView(element) {
            try {
                if (element?.ownerDocument?.defaultView) return element.ownerDocument.defaultView;
            } catch (e) {}
            try {
                if (typeof unsafeWindow !== "undefined") return unsafeWindow;
            } catch (e) {}
            return typeof global !== "undefined" ? global : null;
        }

        function dispatchSyntheticEvent(element, type, Ctor, optionsBuilder) {
            if (!element || typeof Ctor !== "function") return false;
            try {
                const opts = typeof optionsBuilder === "function" ? optionsBuilder() : optionsBuilder;
                const event = new Ctor(type, opts);
                element.dispatchEvent(event);
                return true;
            } catch {
                return false;
            }
        }

        function createEventOptions(element) {
            const view = resolveEventView(element);
            const baseOptions = () => ({ bubbles: true, cancelable: true, composed: true, view: view || null });
            const pointerOptions = () => ({ ...baseOptions(), pointerId: 1, pointerType: "mouse", isPrimary: true });
            return { baseOptions, pointerOptions };
        }

        function dispatchEventPlans(element, plans) {
            let dispatched = false;
            for (const plan of plans) {
                const ok = dispatchSyntheticEvent(element, plan.type, plan.ctor, plan.opts);
                dispatched = dispatched || ok;
            }
            return dispatched;
        }

        function simulateClick(element, { nativeFallback = true } = {}) {
            if (!element) return false;
            const { baseOptions, pointerOptions } = createEventOptions(element);
            const eventPlans = [
                typeof PointerEvent === "function" && { ctor: PointerEvent, type: "pointerdown", opts: pointerOptions },
                typeof MouseEvent === "function" && { ctor: MouseEvent, type: "mousedown", opts: baseOptions },
                typeof PointerEvent === "function" && { ctor: PointerEvent, type: "pointerup", opts: pointerOptions },
                typeof MouseEvent === "function" && { ctor: MouseEvent, type: "mouseup", opts: baseOptions },
                typeof MouseEvent === "function" && { ctor: MouseEvent, type: "click", opts: baseOptions }
            ].filter(Boolean);

            let dispatched = dispatchEventPlans(element, eventPlans);
            if (!dispatched && nativeFallback) {
                try {
                    element.click();
                    dispatched = true;
                } catch {}
            }
            return dispatched;
        }

        function simulateHover(element) {
            if (!element) return false;
            const { baseOptions, pointerOptions } = createEventOptions(element);
            const eventPlans = [
                typeof PointerEvent === "function" && { ctor: PointerEvent, type: "pointerover", opts: pointerOptions },
                typeof PointerEvent === "function" && { ctor: PointerEvent, type: "pointerenter", opts: pointerOptions },
                typeof MouseEvent === "function" && { ctor: MouseEvent, type: "mouseover", opts: baseOptions },
                typeof MouseEvent === "function" && { ctor: MouseEvent, type: "mouseenter", opts: baseOptions },
                typeof PointerEvent === "function" && { ctor: PointerEvent, type: "pointermove", opts: pointerOptions },
                typeof MouseEvent === "function" && { ctor: MouseEvent, type: "mousemove", opts: baseOptions }
            ].filter(Boolean);

            return dispatchEventPlans(element, eventPlans);
        }

        function getShortcuts(engine) {
            if (!engine || typeof engine.getShortcuts !== "function") return [];
            try {
                const list = engine.getShortcuts();
                return Array.isArray(list) ? list : [];
            } catch {
                return [];
            }
        }

        function findShortcutByName(engine, name) {
            const list = getShortcuts(engine);
            return list.find(s => s && s.name === name) || null;
        }

        function findShortcutByKey(engine, key) {
            const target = typeof key === "string" ? key.trim() : "";
            if (!target) return null;
            const list = getShortcuts(engine);
            return list.find(s => s && s.key === target) || null;
        }

        function findShortcutById(engine, id) {
            const target = typeof id === "string" ? id.trim() : "";
            if (!target) return null;
            const list = getShortcuts(engine);
            return list.find(s => s && s.id === target) || null;
        }

        function resolveShortcutField(engine, matcher, field, fallback = "") {
            if (!matcher || !field) return fallback;
            let shortcut = null;
            if (typeof matcher === "string") {
                shortcut = findShortcutByName(engine, matcher);
            } else if (matcher && typeof matcher === "object") {
                const id = typeof matcher.id === "string" ? matcher.id : "";
                const key = typeof matcher.key === "string" ? matcher.key : "";
                const name = typeof matcher.name === "string" ? matcher.name : "";
                shortcut = (id ? findShortcutById(engine, id) : null) ||
                    (key ? findShortcutByKey(engine, key) : null) ||
                    (name ? findShortcutByName(engine, name) : null);
            }
            const value = shortcut && typeof shortcut[field] === "string" ? shortcut[field].trim() : "";
            return value || fallback;
        }

        function createOneStepExecutor({ execAction, isOpenChecker = {}, timing = {} } = {}) {
            const openCheckerMap = (isOpenChecker && typeof isOpenChecker === "object") ? isOpenChecker : {};
            const defaultStepDelay = timing.stepDelayMs ?? timing.stepDelay ?? DEFAULT_TIMING.stepDelayMs;
            const defaultOpenDelay = timing.openDelayMs ?? timing.menuOpenDelay ?? DEFAULT_TIMING.openDelayMs;

            async function safeExecStep(step) {
                if (!step) return false;
                try {
                    if (typeof step === "function") return !!(await step());
                    if (typeof execAction !== "function") return false;
                    return !!(await execAction(step));
                } catch {
                    return false;
                }
            }

            function resolveOpenCheck(rule) {
                if (typeof rule?.openCheck === "function") return rule.openCheck;
                if (rule?.openCheckKey && typeof openCheckerMap[rule.openCheckKey] === "function") {
                    return openCheckerMap[rule.openCheckKey];
                }
                return () => false;
            }

            function resolvePrimaryStep(rule) {
                if (!rule) return null;
                return (
                    rule.primaryStep ||
                    rule.primaryActionKey ||
                    (Array.isArray(rule.stepsIfOpen) && rule.stepsIfOpen[0]) ||
                    (Array.isArray(rule.stepsIfClosed) && rule.stepsIfClosed[rule.stepsIfClosed.length - 1]) ||
                    null
                );
            }

            async function runStepSequence(steps, { stepDelay = defaultStepDelay, firstDelay = 0 } = {}) {
                if (!Array.isArray(steps) || steps.length === 0) return false;
                let lastResult = false;
                for (let i = 0; i < steps.length; i++) {
                    lastResult = await safeExecStep(steps[i]);
                    if (i === steps.length - 1) break;
                    if (i === 0 && firstDelay > 0) {
                        await sleep(firstDelay);
                    } else {
                        await sleep(stepDelay);
                    }
                }
                return lastResult;
            }

            return async function execOneStepRule(rule) {
                if (!rule) return false;

                const openCheckFn = resolveOpenCheck(rule);
                const stepDelay = rule.stepDelayMs ?? rule.stepDelay ?? defaultStepDelay;
                const openDelay = rule.openDelayMs ?? rule.openDelay ?? defaultOpenDelay;
                const fastPathEnabled = rule.fastPath !== false;

                const primaryStep = resolvePrimaryStep(rule);
                if (fastPathEnabled && primaryStep && await safeExecStep(primaryStep)) {
                    return true;
                }

                const isOpen = typeof openCheckFn === "function" ? !!openCheckFn() : false;
                const steps = isOpen ? (rule.stepsIfOpen || []) : (rule.stepsIfClosed || []);
                const firstDelay = isOpen ? 0 : openDelay;

                return !!(await runStepSequence(steps, { stepDelay, firstDelay }));
            };
        }

        function resolveSelectorListFromSpec(ctx, spec) {
            if (!spec) return [];
            if (Array.isArray(spec)) {
                return spec.flatMap(item => resolveSelectorListFromSpec(ctx, item));
            }
            if (typeof spec === "string") {
                const trimmed = spec.trim();
                return trimmed ? [trimmed] : [];
            }
            if (typeof spec === "object") {
                if (Array.isArray(spec.selectors)) return resolveSelectorListFromSpec(ctx, spec.selectors);
                const fromId = typeof spec.fromShortcutId === "string" ? spec.fromShortcutId : "";
                const fromKey = typeof spec.fromShortcutKey === "string" ? spec.fromShortcutKey : "";
                const fromName = typeof spec.fromShortcutName === "string" ? spec.fromShortcutName : "";
                const field = typeof spec.field === "string" ? spec.field : "selector";
                const fallback = typeof spec.fallback === "string" ? spec.fallback : (typeof spec.selector === "string" ? spec.selector : "");
                const selector = (fromId || fromKey || fromName)
                    ? resolveShortcutField(ctx?.engine, { id: fromId, key: fromKey, name: fromName }, field, fallback)
                    : fallback;
                const trimmed = selector.trim();
                return trimmed ? [trimmed] : [];
            }
            return [];
        }

        function pickElement(candidates, { pick = "first", preferSvgPathDIncludes = [] } = {}) {
            if (!Array.isArray(candidates) || candidates.length === 0) return null;
            if (candidates.length === 1) return candidates[0];

            const pickLower = String(pick || "").toLowerCase();
            const list = candidates.slice();

            function bottomMostSort(a, b) {
                const aRect = a.getBoundingClientRect();
                const bRect = b.getBoundingClientRect();
                return bRect.bottom - aRect.bottom;
            }

            if (pickLower === "last") return list[list.length - 1] || null;
            if (pickLower === "bottommost") {
                list.sort(bottomMostSort);
                return list[0] || null;
            }

            if (pickLower === "prefersvgpath") {
                const includes = Array.isArray(preferSvgPathDIncludes) ? preferSvgPathDIncludes.filter(Boolean) : [];
                list.sort((a, b) => {
                    const aScore = includes.length ? (hasSvgPathDIncludes(a, includes) ? 1 : 0) : 0;
                    const bScore = includes.length ? (hasSvgPathDIncludes(b, includes) ? 1 : 0) : 0;
                    if (aScore !== bScore) return bScore - aScore;
                    return bottomMostSort(a, b);
                });
                return list[0] || null;
            }

            return list[0] || null;
        }

        function hasSvgPathDIncludes(element, includesAll = []) {
            if (!element || !Array.isArray(includesAll) || includesAll.length === 0) return false;
            let paths = [];
            try {
                paths = Array.from(element.querySelectorAll("svg path"));
            } catch {
                return false;
            }
            for (const path of paths) {
                const d = path.getAttribute("d") || "";
                if (includesAll.every(part => d.includes(part))) return true;
            }
            return false;
        }

        function createMenuController(menuConfig = {}, { parent = null } = {}) {
            const timing = { ...DEFAULT_TIMING, ...(menuConfig.timing || {}) };
            const triggerConfig = menuConfig.trigger || {};
            const rootConfig = menuConfig.root || {};

            const submenus = {};
            if (menuConfig.submenus && typeof menuConfig.submenus === "object") {
                for (const [key, cfg] of Object.entries(menuConfig.submenus)) {
                    if (!cfg) continue;
                    const submenuCfg = {
                        ...cfg,
                        trigger: { ...(cfg.trigger || {}) }
                    };
                    if (!submenuCfg.trigger.searchRoot) submenuCfg.trigger.searchRoot = "parentRoot";
                    submenus[key] = createMenuController(submenuCfg, { parent: null });
                }
            }

            function _setParent(p) {
                parent = p || null;
            }

            function getTriggerSearchRoot(ctx) {
                const mode = triggerConfig.searchRoot;
                if (mode === "parentRoot" && parent && typeof parent.getRootElement === "function") {
                    return parent.getRootElement(ctx);
                }
                return global.document || null;
            }

            function getTriggerCandidateSet(ctx) {
                const root = getTriggerSearchRoot(ctx);
                const fallbackPick = triggerConfig.pick;
                const fallbackSvgIncludes = triggerConfig.preferSvgPathDIncludes;
                if (!root) return { candidates: [], pick: fallbackPick, preferSvgPathDIncludes: fallbackSvgIncludes };

                const specs = Array.isArray(triggerConfig.candidates) ? triggerConfig.candidates : [triggerConfig];
                for (const rawSpec of specs) {
                    if (!rawSpec) continue;
                    const spec = typeof rawSpec === "string" ? { selector: rawSpec } : rawSpec;

                    const selectors = resolveSelectorListFromSpec(ctx, spec.selectors || spec.selector || []);
                    const textMatch = (spec.textMatch !== undefined) ? spec.textMatch : (triggerConfig.textMatch ?? null);
                    const normalize = spec.normalize || triggerConfig.normalize || normalizeText;

                    let candidates = [];
                    for (const sel of selectors) {
                        candidates.push(...safeQuerySelectorAll(root, sel));
                    }
                    candidates = candidates.filter(isVisible);
                    if (textMatch) {
                        candidates = candidates.filter(el => matchText(getElementLabelText(el), textMatch, { normalize, element: el }));
                    }
                    if (candidates.length > 0) {
                        return {
                            candidates,
                            pick: spec.pick ?? fallbackPick,
                            preferSvgPathDIncludes: spec.preferSvgPathDIncludes ?? fallbackSvgIncludes
                        };
                    }
                }

                return { candidates: [], pick: fallbackPick, preferSvgPathDIncludes: fallbackSvgIncludes };
            }

            function getTriggerElement(ctx) {
                const set = getTriggerCandidateSet(ctx);
                return pickElement(set.candidates, {
                    pick: set.pick,
                    preferSvgPathDIncludes: set.preferSvgPathDIncludes
                });
            }

            function activateTrigger(ctx) {
                const el = getTriggerElement(ctx);
                if (!el) return false;
                const action = String(triggerConfig.action || "click").toLowerCase();
                if (action === "hover") return simulateHover(el);
                return simulateClick(el);
            }

            function getRootElement(ctx) {
                const doc = global.document || null;
                if (!doc) return null;
                const triggerEl = getTriggerElement(ctx);
                if (!triggerEl) return null;

                const type = String(rootConfig.type || "ariaControls").toLowerCase();
                const requireVisible = rootConfig.requireVisible !== false;

                if (type === "selector") {
                    const selectors = resolveSelectorListFromSpec(ctx, rootConfig.selectors || rootConfig.selector || []);
                    const all = selectors.flatMap(sel => safeQuerySelectorAll(doc, sel));
                    const visible = requireVisible ? all.filter(isVisible) : all;
                    const pick = String(rootConfig.pick || (requireVisible ? "last" : "last")).toLowerCase();
                    if (pick === "first") return visible[0] || all[0] || null;
                    return visible[visible.length - 1] || all[all.length - 1] || null;
                }

                if (type === "arialabelledby") {
                    const baseSelector = rootConfig.selector || "";
                    const id = triggerEl.getAttribute && triggerEl.getAttribute("id");
                    if (id && baseSelector) {
                        const selector = `${baseSelector}[aria-labelledby="${escapeForAttributeSelector(id)}"]`;
                        const menu = safeQuerySelector(doc, selector);
                        if (menu && (!requireVisible || isVisible(menu))) return menu;
                    }
                    if (!baseSelector) return null;
                    const menus = safeQuerySelectorAll(doc, baseSelector);
                    const visibleMenus = requireVisible ? menus.filter(isVisible) : menus;
                    return visibleMenus[visibleMenus.length - 1] || menus[menus.length - 1] || null;
                }

                const controlsAttr = rootConfig.controlsAttr || "aria-controls";
                const expandedAttr = rootConfig.expandedAttr || "aria-expanded";
                const expandedValue = String(rootConfig.expandedValue || "true").toLowerCase();
                const expanded = (triggerEl.getAttribute && triggerEl.getAttribute(expandedAttr) || "").toLowerCase();
                if (expanded && expanded !== expandedValue) return null;

                const id = triggerEl.getAttribute && triggerEl.getAttribute(controlsAttr);
                if (!id) return null;
                const menu = doc.getElementById(id);
                if (!menu) return null;

                const requireRole = rootConfig.requireRole;
                if (requireRole) {
                    const role = (menu.getAttribute && menu.getAttribute("role")) || "";
                    if (role !== requireRole) return null;
                }

                const requireDataState = rootConfig.requireDataState;
                if (requireDataState) {
                    const state = (menu.getAttribute && menu.getAttribute("data-state") || "").toLowerCase();
                    if (state && state !== String(requireDataState).toLowerCase()) return null;
                }

                if (requireVisible && !isVisible(menu)) return null;
                return menu;
            }

            function isOpen(ctx) {
                return !!getRootElement(ctx);
            }

            async function ensureOpen(ctx, opts = {}) {
                const timeoutMs = opts.timeoutMs ?? timing.waitTimeoutMs;
                const intervalMs = opts.intervalMs ?? timing.pollIntervalMs;
                const openDelayMs = opts.openDelayMs ?? timing.openDelayMs;

                if (isOpen(ctx)) return true;
                if (!activateTrigger(ctx)) return false;
                if (openDelayMs > 0) await sleep(openDelayMs);
                await waitFor(() => isOpen(ctx), { timeoutMs, intervalMs });
                return isOpen(ctx);
            }

            async function ensureSubmenuOpen(ctx, submenuKey, opts = {}) {
                const sub = submenus[submenuKey];
                if (!sub) return false;
                if (!await ensureOpen(ctx, opts)) return false;
                return await sub.ensureOpen(ctx, opts);
            }

            function getOpenMenuRoots(ctx, { includeRoot = true, includeSubmenus = true } = {}) {
                const roots = [];
                if (includeRoot) {
                    const rootEl = getRootElement(ctx);
                    if (rootEl) roots.push(rootEl);
                }
                if (includeSubmenus) {
                    for (const sub of Object.values(submenus)) {
                        if (!sub) continue;
                        const subRoot = sub.getRootElement(ctx);
                        if (subRoot) roots.push(subRoot);
                    }
                }
                return roots;
            }

            async function clickInOpenMenus(ctx, {
                selector,
                textMatch = null,
                normalize = normalizeText,
                fallbackToFirst = false,
                waitForItem = false
            } = {}) {
                const selectorList = resolveSelectorListFromSpec(ctx, selector);
                if (selectorList.length === 0) return false;

                const tryClickOnce = () => {
                    const roots = getOpenMenuRoots(ctx, { includeRoot: true, includeSubmenus: true }).filter(Boolean);
                    if (roots.length === 0) return false;
                    for (const rootEl of roots) {
                        for (const sel of selectorList) {
                            const target = findFirst(rootEl, sel, { textMatch, normalize, fallbackToFirst });
                            if (target && simulateClick(target)) return true;
                        }
                    }
                    return false;
                };

                if (!waitForItem) return tryClickOnce();

                const timeoutMs = timing.waitTimeoutMs ?? DEFAULT_TIMING.waitTimeoutMs;
                const intervalMs = timing.pollIntervalMs ?? DEFAULT_TIMING.pollIntervalMs;
                const start = Date.now();
                while (Date.now() - start < timeoutMs) {
                    if (tryClickOnce()) return true;
                    await sleep(intervalMs);
                }
                return tryClickOnce();
            }

            async function oneStepClick(ctx, {
                selector,
                textMatch = null,
                normalize = normalizeText,
                fallbackToFirst = false,
                openSubmenus = [],
                waitForItem = true
            } = {}) {
                if (!selector) return false;
                if (await clickInOpenMenus(ctx, { selector, textMatch, normalize, fallbackToFirst, waitForItem: false })) return true;

                if (!await ensureOpen(ctx)) return false;

                if (await clickInOpenMenus(ctx, { selector, textMatch, normalize, fallbackToFirst, waitForItem: false })) return true;

                const submenuKeys = Array.isArray(openSubmenus) ? openSubmenus.filter(Boolean) : [];
                for (const key of submenuKeys) {
                    await ensureSubmenuOpen(ctx, key);
                    if (await clickInOpenMenus(ctx, { selector, textMatch, normalize, fallbackToFirst, waitForItem: false })) return true;
                }

                if (!waitForItem) return false;
                return await clickInOpenMenus(ctx, { selector, textMatch, normalize, fallbackToFirst, waitForItem: true });
            }

            function createControllerApi() {
                return {
                    _setParent,
                    timing,
                    getTriggerElement,
                    activateTrigger,
                    getRootElement,
                    isOpen,
                    ensureOpen,
                    ensureSubmenuOpen,
                    getOpenMenuRoots,
                    clickInOpenMenus,
                    oneStepClick
                };
            }

            const api = createControllerApi();
            for (const sub of Object.values(submenus)) {
                if (sub && typeof sub._setParent === "function") sub._setParent(api);
            }
            api.submenus = Object.freeze(submenus);
            return api;
        }

        function buildMenuActions({ menu, defs = [], defaultItemSelector = "", openSubmenus = [] } = {}) {
            const actions = {};
            const list = Array.isArray(defs) ? defs : [];

            for (const def of list) {
                if (!def) continue;
                const actionKey = def.actionKey || def.key;
                const textMatch = def.textMatch;
                const selector = def.selector || defaultItemSelector;
                if (!selector) continue;

                const clickKey = def.customActionKeys?.click;
                const oneStepKey = def.customActionKeys?.oneStep;

                if (actionKey) {
                    actions[actionKey] = ({ engine }) => menu.clickInOpenMenus({ engine }, { selector, textMatch, fallbackToFirst: !!def.fallbackToFirst });
                }
                if (clickKey) {
                    actions[clickKey] = ({ engine }) => menu.clickInOpenMenus({ engine }, { selector, textMatch, fallbackToFirst: !!def.fallbackToFirst });
                }
                if (oneStepKey) {
                    actions[oneStepKey] = ({ engine }) => menu.oneStepClick({ engine }, { selector, textMatch, openSubmenus, fallbackToFirst: !!def.fallbackToFirst });
                }
            }
            return actions;
        }

        /* ------------------------------ SVG --------------------------------- */

        const SVG_NAMESPACE = "http://www.w3.org/2000/svg"
        const SVG_DEFAULT_ICON_FILL_COLOR = "#000000"
        const SVG_DEFAULT_THEME_LIGHT_FILL_COLOR = "#111827"
        const SVG_DEFAULT_THEME_DARK_FILL_COLOR = "#F8FAFC"
        const SVG_THEME_FILL_CLASS_NAME = "st-theme-fill"
        const SVG_SAFE_COLOR_TOKEN_RE = /^(?:#[0-9a-fA-F]{3,8}|(?:rgb|hsl)a?\(\s*[-\d.%\s,]+\s*\)|[a-zA-Z]+)$/
        const SVG_ATTR_NAME_RE = /^[A-Za-z_][\w:.-]*$/
        const SVG_BLOCKED_ATTR_NAMES = new Set(["href", "xlink:href", "src", "style"])
        const SVG_ROOT_LOCKED_ATTR_NAMES = new Set(["xmlns", "width", "height", "viewbox"])
        const SVG_TAG_NAME_MAP = Object.freeze({
            path: "path",
            circle: "circle",
            rect: "rect",
            ellipse: "ellipse",
            line: "line",
            polyline: "polyline",
            polygon: "polygon",
            g: "g",
            defs: "defs",
            clippath: "clipPath",
            mask: "mask",
            lineargradient: "linearGradient",
            radialgradient: "radialGradient",
            stop: "stop"
        })
        const SVG_CONTAINER_TAG_KEYS = new Set(["g", "defs", "clippath", "mask", "lineargradient", "radialgradient"])
        const SVG_GLOBAL_ALLOWED_ATTR_NAMES = new Set([
            "id", "class", "transform", "opacity", "display",
            "fill", "fill-opacity", "fill-rule",
            "stroke", "stroke-opacity", "stroke-width", "stroke-linecap", "stroke-linejoin", "stroke-miterlimit",
            "stroke-dasharray", "stroke-dashoffset",
            "clip-path", "clip-rule",
            "mask",
            "vector-effect", "shape-rendering", "paint-order"
        ])
        const SVG_ALLOWED_ATTR_NAMES_BY_TAG = Object.freeze({
            svg: new Set([
                ...SVG_GLOBAL_ALLOWED_ATTR_NAMES,
                "xmlns", "viewbox", "width", "height", "preserveaspectratio",
                "role", "focusable", "aria-hidden", "aria-label"
            ]),
            path: new Set([...SVG_GLOBAL_ALLOWED_ATTR_NAMES, "d", "pathlength"]),
            circle: new Set([...SVG_GLOBAL_ALLOWED_ATTR_NAMES, "cx", "cy", "r", "pathlength"]),
            rect: new Set([...SVG_GLOBAL_ALLOWED_ATTR_NAMES, "x", "y", "width", "height", "rx", "ry", "pathlength"]),
            ellipse: new Set([...SVG_GLOBAL_ALLOWED_ATTR_NAMES, "cx", "cy", "rx", "ry", "pathlength"]),
            line: new Set([...SVG_GLOBAL_ALLOWED_ATTR_NAMES, "x1", "y1", "x2", "y2", "pathlength"]),
            polyline: new Set([...SVG_GLOBAL_ALLOWED_ATTR_NAMES, "points", "pathlength"]),
            polygon: new Set([...SVG_GLOBAL_ALLOWED_ATTR_NAMES, "points", "pathlength"]),
            g: new Set([...SVG_GLOBAL_ALLOWED_ATTR_NAMES]),
            defs: new Set(["id"]),
            clippath: new Set([...SVG_GLOBAL_ALLOWED_ATTR_NAMES, "clippathunits"]),
            mask: new Set([
                ...SVG_GLOBAL_ALLOWED_ATTR_NAMES,
                "maskunits", "maskcontentunits", "x", "y", "width", "height"
            ]),
            lineargradient: new Set([
                ...SVG_GLOBAL_ALLOWED_ATTR_NAMES,
                "x1", "y1", "x2", "y2",
                "gradientunits", "gradienttransform", "spreadmethod"
            ]),
            radialgradient: new Set([
                ...SVG_GLOBAL_ALLOWED_ATTR_NAMES,
                "cx", "cy", "r", "fx", "fy", "fr",
                "gradientunits", "gradienttransform", "spreadmethod"
            ]),
            stop: new Set([...SVG_GLOBAL_ALLOWED_ATTR_NAMES, "offset", "stop-color", "stop-opacity"])
        })
        const SVG_REQUIRED_ATTR_RULES_BY_TAG = Object.freeze({
            path: Object.freeze({
                relaxed: Object.freeze({ allOf: ["d"] }),
                strict: Object.freeze({ allOf: ["d"] })
            }),
            circle: Object.freeze({
                relaxed: Object.freeze({ allOf: ["r"] }),
                strict: Object.freeze({ allOf: ["cx", "cy", "r"] })
            }),
            rect: Object.freeze({
                relaxed: Object.freeze({ allOf: ["width", "height"] }),
                strict: Object.freeze({ allOf: ["width", "height"] })
            }),
            ellipse: Object.freeze({
                relaxed: Object.freeze({ allOf: ["rx", "ry"] }),
                strict: Object.freeze({ allOf: ["rx", "ry"] })
            }),
            line: Object.freeze({
                relaxed: Object.freeze({ allOf: ["x1", "y1", "x2", "y2"] }),
                strict: Object.freeze({ allOf: ["x1", "y1", "x2", "y2"] })
            }),
            polyline: Object.freeze({
                relaxed: Object.freeze({ allOf: ["points"] }),
                strict: Object.freeze({ allOf: ["points"] })
            }),
            polygon: Object.freeze({
                relaxed: Object.freeze({ allOf: ["points"] }),
                strict: Object.freeze({ allOf: ["points"] })
            }),
            stop: Object.freeze({
                relaxed: Object.freeze({ allOf: ["offset"] }),
                strict: Object.freeze({ allOf: ["offset", "stop-color"] })
            })
        })
        const SVG_VALUE_URL_ATTR_NAMES = new Set(["fill", "stroke", "clip-path", "mask"])
        const SVG_DEFAULT_VALIDATION_OPTIONS = Object.freeze({
            strictRequiredAttrs: false,
            allowExternalUrlRefs: false
        })
        const SVG_ISSUE_CACHE_MAX_SIZE = 500
        const SVG_ISSUE_CACHE = new Set()

        function getSvgTagKey(tagName) {
            return String(tagName || "").trim().toLowerCase()
        }

        function getCanonicalSvgTagName(tagName) {
            const key = getSvgTagKey(tagName)
            return SVG_TAG_NAME_MAP[key] || ""
        }

        function escapeSvgAttrValue(value) {
            return String(value)
                .replace(/&/g, "&amp;")
                .replace(/"/g, "&quot;")
                .replace(/</g, "&lt;")
                .replace(/>/g, "&gt;")
                .replace(/'/g, "&#39;")
        }

        function normalizeSvgCssColorToken(raw, fallback = SVG_DEFAULT_ICON_FILL_COLOR) {
            const value = String(raw || "").trim()
            if (!value) return fallback
            if (!SVG_SAFE_COLOR_TOKEN_RE.test(value)) return fallback
            return value
        }

        function mergeSvgClassNames(baseClassName, appendClassName) {
            const tokens = `${String(baseClassName || "")} ${String(appendClassName || "")}`
                .split(/\s+/)
                .map((part) => String(part || "").trim())
                .filter(Boolean)
            if (tokens.length === 0) return ""
            return Array.from(new Set(tokens)).join(" ")
        }

        function buildSvgThemeFillStyles(lightFillColor, darkFillColor) {
            const light = normalizeSvgCssColorToken(lightFillColor, SVG_DEFAULT_THEME_LIGHT_FILL_COLOR)
            const dark = normalizeSvgCssColorToken(darkFillColor, SVG_DEFAULT_THEME_DARK_FILL_COLOR)
            const selector = `.${SVG_THEME_FILL_CLASS_NAME}`
            return `${selector}{fill:${light};}@media (prefers-color-scheme: dark){${selector}{fill:${dark};}}`
        }

        function isSvgAttrAllowed(name, { tag = "", blockRootLocked = false } = {}) {
            const key = String(name || "").trim().toLowerCase()
            if (!key) return false
            if (/^on/.test(key)) return false
            if (SVG_BLOCKED_ATTR_NAMES.has(key)) return false
            if (blockRootLocked && SVG_ROOT_LOCKED_ATTR_NAMES.has(key)) return false
            const tagKey = getSvgTagKey(tag)
            if (!tagKey) return false
            const allowedAttrNames = SVG_ALLOWED_ATTR_NAMES_BY_TAG[tagKey]
            if (!allowedAttrNames) return false
            return allowedAttrNames.has(key)
        }

        function hasSvgAttrValue(attrs, name) {
            const value = attrs && typeof attrs === "object" ? attrs[name] : ""
            return String(value || "").trim().length > 0
        }

        function normalizeSvgValidationOptions(raw) {
            const options = raw && typeof raw === "object" ? raw : {}
            return {
                strictRequiredAttrs: options.strictRequiredAttrs === true,
                allowExternalUrlRefs: options.allowExternalUrlRefs === true
            }
        }

        function resolveSvgRequiredRule(tagKey, validationOptions = SVG_DEFAULT_VALIDATION_OPTIONS) {
            const rule = SVG_REQUIRED_ATTR_RULES_BY_TAG[tagKey]
            if (!rule || typeof rule !== "object") return null
            const strictRequiredAttrs = validationOptions?.strictRequiredAttrs === true
            const scopedRule = strictRequiredAttrs ? (rule.strict || rule.relaxed || rule) : (rule.relaxed || rule)
            return scopedRule && typeof scopedRule === "object" ? scopedRule : null
        }

        function validateRequiredSvgAttrs(tagKey, attrs, validationOptions = SVG_DEFAULT_VALIDATION_OPTIONS) {
            const rule = resolveSvgRequiredRule(tagKey, validationOptions)
            if (!rule) {
                return { ok: true }
            }
            const allOf = Array.isArray(rule.allOf) ? rule.allOf : []
            const anyOf = Array.isArray(rule.anyOf) ? rule.anyOf : []
            const missingAllOf = allOf.filter((name) => !hasSvgAttrValue(attrs, name))
            if (missingAllOf.length > 0) {
                return { ok: false, mode: "allOf", attrs: missingAllOf }
            }
            if (anyOf.length > 0 && !anyOf.some((name) => hasSvgAttrValue(attrs, name))) {
                return { ok: false, mode: "anyOf", attrs: anyOf.slice() }
            }
            return { ok: true }
        }

        function reportSvgIssue(onIssue, issue) {
            if (typeof onIssue !== "function") return
            if (!issue || typeof issue !== "object") return
            try {
                onIssue(issue)
            } catch {}
        }

        function markSvgIssueKeySeen(key) {
            const issueKey = String(key || "")
            if (!issueKey) return false
            if (SVG_ISSUE_CACHE.has(issueKey)) return false

            SVG_ISSUE_CACHE.add(issueKey)
            if (SVG_ISSUE_CACHE.size > SVG_ISSUE_CACHE_MAX_SIZE) {
                let overflow = SVG_ISSUE_CACHE.size - SVG_ISSUE_CACHE_MAX_SIZE
                for (const oldKey of SVG_ISSUE_CACHE) {
                    SVG_ISSUE_CACHE.delete(oldKey)
                    overflow -= 1
                    if (overflow <= 0) break
                }
            }
            return true
        }

        function warnSvgIssueOnce(issue) {
            if (!issue || typeof issue !== "object") return
            const key = [
                String(issue.code || ""),
                String(issue.path || ""),
                String(issue.tag || ""),
                String(issue.mode || ""),
                Array.isArray(issue.attrs) ? issue.attrs.join(",") : ""
            ].join("|")
            if (!markSvgIssueKeySeen(key)) return
            const message = String(issue.message || issue.code || "Unknown SVG issue")
            console.warn(`[SVG] ${message}`, issue)
        }

        function isSafeSvgLocalUrlReference(rawRef) {
            const value = String(rawRef || "").trim().replace(/^['"]|['"]$/g, "")
            if (!value.startsWith("#")) return false
            return /^#[A-Za-z_][\w:.-]*$/.test(value)
        }

        function isSvgAttrValueSafe(name, value, validationOptions = SVG_DEFAULT_VALIDATION_OPTIONS) {
            const key = String(name || "").trim().toLowerCase()
            const text = String(value ?? "").trim()
            if (!text) return true
            if (/(?:javascript|vbscript)\s*:/i.test(text)) return false
            if (!validationOptions.allowExternalUrlRefs && /\bdata\s*:/i.test(text)) return false

            if (!SVG_VALUE_URL_ATTR_NAMES.has(key) || !/url\s*\(/i.test(text)) return true
            if (validationOptions.allowExternalUrlRefs) return true

            const matches = Array.from(text.matchAll(/url\s*\(([^)]*)\)/ig))
            if (matches.length === 0) return true
            return matches.every((match) => isSafeSvgLocalUrlReference(match[1]))
        }

        function normalizeSvgAttrs(raw, {
            tag = "",
            blockRootLocked = false,
            validationOptions = SVG_DEFAULT_VALIDATION_OPTIONS,
            onIssue = null,
            path = ""
        } = {}) {
            if (!raw) return {}
            if (typeof raw !== "object" || Array.isArray(raw)) return {}
            const attrs = {}
            for (const [nameRaw, valueRaw] of Object.entries(raw)) {
                const name = String(nameRaw || "").trim()
                if (!name || !SVG_ATTR_NAME_RE.test(name)) continue
                if (!isSvgAttrAllowed(name, { tag, blockRootLocked })) continue
                if (valueRaw === null || valueRaw === undefined) continue
                const value = String(valueRaw)
                if (!isSvgAttrValueSafe(name, value, validationOptions)) {
                    reportSvgIssue(onIssue, {
                        code: "unsafeAttrValue",
                        message: `Unsafe SVG attribute value dropped: ${name}.`,
                        path,
                        tag,
                        attr: name
                    })
                    continue
                }
                attrs[name] = value
            }
            return attrs
        }

        function buildSvgAttrsMarkup(attrMap, { tag = "", blockRootLocked = false } = {}) {
            const attrs = attrMap && typeof attrMap === "object" ? attrMap : {}
            return Object.entries(attrs)
                .map(([nameRaw, valueRaw]) => {
                    const name = String(nameRaw || "").trim()
                    if (!name || !SVG_ATTR_NAME_RE.test(name)) return ""
                    if (!isSvgAttrAllowed(name, { tag, blockRootLocked })) return ""
                    if (valueRaw === null || valueRaw === undefined) return ""
                    const value = escapeSvgAttrValue(valueRaw)
                    return `${name}="${value}"`
                })
                .filter(Boolean)
                .join(" ")
        }

        function buildSvgElementMarkup(item, depth = 0, {
            onIssue = warnSvgIssueOnce,
            path = "root",
            validationOptions = SVG_DEFAULT_VALIDATION_OPTIONS
        } = {}) {
            if (!item || typeof item !== "object") {
                reportSvgIssue(onIssue, {
                    code: "invalidElement",
                    message: "Element must be an object.",
                    path
                })
                return ""
            }
            if (depth > 12) {
                reportSvgIssue(onIssue, {
                    code: "maxDepthExceeded",
                    message: "SVG element nesting exceeds max depth (12).",
                    path
                })
                return ""
            }

            const tagKey = getSvgTagKey(item.tag)
            const tagName = getCanonicalSvgTagName(tagKey)
            if (!tagName) {
                reportSvgIssue(onIssue, {
                    code: "unsupportedTag",
                    message: `Unsupported SVG tag: ${String(item.tag || "") || "(empty)"}`,
                    path,
                    tag: String(item.tag || "")
                })
                return ""
            }

            const attrs = normalizeSvgAttrs(item.attrs, {
                tag: tagKey,
                validationOptions,
                onIssue,
                path: `${path}.attrs`
            })
            const requiredCheck = validateRequiredSvgAttrs(tagKey, attrs, validationOptions)
            if (!requiredCheck.ok) {
                reportSvgIssue(onIssue, {
                    code: "missingRequiredAttrs",
                    message: `Missing required attributes for <${tagName}>.`,
                    path,
                    tag: tagName,
                    mode: requiredCheck.mode,
                    attrs: requiredCheck.attrs
                })
                return ""
            }
            if (tagKey === "path") {
                attrs.d = String(attrs.d || "").trim()
            }

            const childItems = Array.isArray(item.children) ? item.children : []
            const childrenMarkup = childItems
                .map((child, index) => buildSvgElementMarkup(child, depth + 1, {
                    onIssue,
                    path: `${path}.${index}`,
                    validationOptions
                }))
                .join("")

            const attrsMarkup = buildSvgAttrsMarkup(attrs, { tag: tagKey })
            if (childrenMarkup) {
                if (!SVG_CONTAINER_TAG_KEYS.has(tagKey)) {
                    reportSvgIssue(onIssue, {
                        code: "childrenNotAllowed",
                        message: `Tag <${tagName}> does not allow children in this builder.`,
                        path,
                        tag: tagName
                    })
                    return ""
                }
                return attrsMarkup
                    ? `<${tagName} ${attrsMarkup}>${childrenMarkup}</${tagName}>`
                    : `<${tagName}>${childrenMarkup}</${tagName}>`
            }
            if (SVG_CONTAINER_TAG_KEYS.has(tagKey)) {
                reportSvgIssue(onIssue, {
                    code: "emptyContainer",
                    message: `Container tag <${tagName}> has no valid children.`,
                    path,
                    tag: tagName
                })
                return ""
            }
            if (!attrsMarkup) {
                reportSvgIssue(onIssue, {
                    code: "emptyAttrs",
                    message: `No valid attributes remained for <${tagName}>.`,
                    path,
                    tag: tagName
                })
                return ""
            }
            return `<${tagName} ${attrsMarkup}/>`
        }

        function buildSvgElementsIconDataUrl(elements, {
            viewBox = "0 0 24 24",
            width = 24,
            height = 24,
            rootAttrs = {},
            onIssue = warnSvgIssueOnce,
            validation = SVG_DEFAULT_VALIDATION_OPTIONS
        } = {}) {
            const validationOptions = normalizeSvgValidationOptions(validation)
            const elementList = Array.isArray(elements) ? elements : []
            const bodyMarkup = elementList
                .map((item, index) => buildSvgElementMarkup(item, 0, {
                    onIssue,
                    path: `root.${index}`,
                    validationOptions
                }))
                .join("")

            if (!bodyMarkup) {
                reportSvgIssue(onIssue, {
                    code: "emptyBody",
                    message: "SVG body is empty after validation.",
                    path: "root"
                })
                return ""
            }
            const safeRootAttrs = normalizeSvgAttrs(rootAttrs, {
                tag: "svg",
                blockRootLocked: true,
                validationOptions,
                onIssue,
                path: "root.attrs"
            })
            const svgAttrs = {
                ...safeRootAttrs,
                xmlns: SVG_NAMESPACE,
                width,
                height,
                viewBox
            }
            const svgAttrsMarkup = buildSvgAttrsMarkup(svgAttrs, { tag: "svg" })
            if (!svgAttrsMarkup) {
                reportSvgIssue(onIssue, {
                    code: "emptyRootAttrs",
                    message: "SVG root attributes are empty after validation.",
                    path: "root",
                    tag: "svg"
                })
                return ""
            }
            const svg = `<svg ${svgAttrsMarkup}>${bodyMarkup}</svg>`
            return `data:image/svg+xml,${encodeURIComponent(svg)}`
        }

        function buildPathsIconDataUrl(paths, {
            viewBox = "0 0 24 24",
            width = 24,
            height = 24,
            rootAttrs = {},
            fillColor = SVG_DEFAULT_ICON_FILL_COLOR,
            fillPriority = "theme",
            onIssue = warnSvgIssueOnce,
            validation = SVG_DEFAULT_VALIDATION_OPTIONS
        } = {}) {
            const validationOptions = normalizeSvgValidationOptions(validation)
            const pathList = Array.isArray(paths) ? paths : []
            const prefersPathFill = String(fillPriority || "").trim().toLowerCase() === "path"
            const elements = pathList
                .map((path, index) => {
                    if (!path || typeof path !== "object") {
                        reportSvgIssue(onIssue, {
                            code: "invalidPathInput",
                            message: "Path entry must be an object.",
                            path: `paths.${index}`,
                            tag: "path"
                        })
                        return null
                    }
                    const d = String(path.d || "").trim()
                    if (!d) {
                        reportSvgIssue(onIssue, {
                            code: "missingPathD",
                            message: "Path entry is missing non-empty \"d\".",
                            path: `paths.${index}`,
                            tag: "path",
                            attrs: ["d"]
                        })
                        return null
                    }
                    const pathAttrs = normalizeSvgAttrs(path.attrs, {
                        tag: "path",
                        validationOptions,
                        onIssue,
                        path: `paths.${index}.attrs`
                    })
                    const attrs = prefersPathFill
                        ? { ...(fillColor ? { fill: fillColor } : {}), ...pathAttrs, d }
                        : { ...pathAttrs, ...(fillColor ? { fill: fillColor } : {}), d }
                    return { tag: "path", attrs }
                })
                .filter(Boolean)

            return buildSvgElementsIconDataUrl(elements, {
                viewBox,
                width,
                height,
                rootAttrs,
                onIssue,
                validation: validationOptions
            })
        }

        function buildPathIconDataUrl(pathD, options = {}) {
            return buildPathsIconDataUrl([{ d: pathD }], options)
        }

        function buildThemeAdaptivePathsIconDataUrl(paths, {
            viewBox = "0 0 24 24",
            width = 24,
            height = 24,
            rootAttrs = {},
            fillPriority = "theme",
            lightFillColor = SVG_DEFAULT_THEME_LIGHT_FILL_COLOR,
            darkFillColor = SVG_DEFAULT_THEME_DARK_FILL_COLOR,
            onIssue = warnSvgIssueOnce,
            validation = SVG_DEFAULT_VALIDATION_OPTIONS
        } = {}) {
            const validationOptions = normalizeSvgValidationOptions(validation)
            const safeLightFillColor = normalizeSvgCssColorToken(lightFillColor, SVG_DEFAULT_THEME_LIGHT_FILL_COLOR)
            const safeDarkFillColor = normalizeSvgCssColorToken(darkFillColor, SVG_DEFAULT_THEME_DARK_FILL_COLOR)
            if (safeLightFillColor !== String(lightFillColor || "").trim()) {
                reportSvgIssue(onIssue, {
                    code: "invalidThemeLightFill",
                    message: "Invalid light theme fill color; fallback applied.",
                    path: "theme.lightFillColor"
                })
            }
            if (safeDarkFillColor !== String(darkFillColor || "").trim()) {
                reportSvgIssue(onIssue, {
                    code: "invalidThemeDarkFill",
                    message: "Invalid dark theme fill color; fallback applied.",
                    path: "theme.darkFillColor"
                })
            }

            const pathList = Array.isArray(paths) ? paths : []
            const prefersPathFill = String(fillPriority || "").trim().toLowerCase() === "path"
            const elements = pathList
                .map((path, index) => {
                    if (!path || typeof path !== "object") {
                        reportSvgIssue(onIssue, {
                            code: "invalidPathInput",
                            message: "Path entry must be an object.",
                            path: `paths.${index}`,
                            tag: "path"
                        })
                        return null
                    }
                    const d = String(path.d || "").trim()
                    if (!d) {
                        reportSvgIssue(onIssue, {
                            code: "missingPathD",
                            message: "Path entry is missing non-empty \"d\".",
                            path: `paths.${index}`,
                            tag: "path",
                            attrs: ["d"]
                        })
                        return null
                    }

                    const pathAttrs = normalizeSvgAttrs(path.attrs, {
                        tag: "path",
                        validationOptions,
                        onIssue,
                        path: `paths.${index}.attrs`
                    })
                    const keepPathFill = prefersPathFill && hasSvgAttrValue(pathAttrs, "fill")
                    const attrs = { ...pathAttrs, d }
                    if (!keepPathFill) {
                        delete attrs.fill
                        attrs.class = mergeSvgClassNames(attrs.class, SVG_THEME_FILL_CLASS_NAME)
                    }
                    return { tag: "path", attrs }
                })
                .filter(Boolean)

            const bodyMarkup = elements
                .map((item, index) => buildSvgElementMarkup(item, 0, {
                    onIssue,
                    path: `root.${index}`,
                    validationOptions
                }))
                .join("")

            if (!bodyMarkup) {
                reportSvgIssue(onIssue, {
                    code: "emptyBody",
                    message: "SVG body is empty after validation.",
                    path: "root"
                })
                return ""
            }

            const safeRootAttrs = normalizeSvgAttrs(rootAttrs, {
                tag: "svg",
                blockRootLocked: true,
                validationOptions,
                onIssue,
                path: "root.attrs"
            })
            const svgAttrs = {
                ...safeRootAttrs,
                xmlns: SVG_NAMESPACE,
                width,
                height,
                viewBox
            }
            const svgAttrsMarkup = buildSvgAttrsMarkup(svgAttrs, { tag: "svg" })
            if (!svgAttrsMarkup) {
                reportSvgIssue(onIssue, {
                    code: "emptyRootAttrs",
                    message: "SVG root attributes are empty after validation.",
                    path: "root",
                    tag: "svg"
                })
                return ""
            }

            const fillStyles = buildSvgThemeFillStyles(safeLightFillColor, safeDarkFillColor)
            const svg = `<svg ${svgAttrsMarkup}><style>${fillStyles}</style>${bodyMarkup}</svg>`
            return `data:image/svg+xml,${encodeURIComponent(svg)}`
        }

        function buildThemeAdaptivePathIconDataUrl(pathD, options = {}) {
            return buildThemeAdaptivePathsIconDataUrl([{ d: pathD }], options)
        }

        return Object.freeze({
            timing: DEFAULT_TIMING,
            sleep,
            dom: Object.freeze({
                safeQuerySelector,
                safeQuerySelectorAll,
                isVisible,
                escapeForAttributeSelector,
                normalizeText,
                matchText,
                findFirst,
                waitFor,
                waitForElement,
                waitForMatch,
                setTrustedHTML
            }),
            svg: Object.freeze({
                buildSvgElementsIconDataUrl,
                buildPathsIconDataUrl,
                buildPathIconDataUrl,
                buildThemeAdaptivePathsIconDataUrl,
                buildThemeAdaptivePathIconDataUrl
            }),
            events: Object.freeze({
                resolveEventView,
                simulateClick,
                simulateHover
            }),
            shortcuts: Object.freeze({
                getShortcuts,
                findShortcutByName,
                findShortcutByKey,
                findShortcutById,
                resolveShortcutField
            }),
            oneStep: Object.freeze({
                createOneStepExecutor
            }),
            menu: Object.freeze({
                createMenuController,
                buildMenuActions
            })
        });
    })();
/* -------------------------------------------------------------------------- *
 * Module 03 · Action registry (extensible action handlers)
 * -------------------------------------------------------------------------- */

        function createActionRegistry({ consoleTag = "[ShortcutEngine]" } = {}) {
            const entries = new Map();

            function normalizeType(actionType) {
                return String(actionType || "").trim();
            }

            function register(actionType, handler, meta = {}) {
                const type = normalizeType(actionType);
                if (!type) return false;
                if (typeof handler !== "function") {
                    console.warn(`${consoleTag} action handler for "${type}" is not a function; ignored.`);
                    return false;
                }
                const safeMeta = meta && typeof meta === "object" ? { ...meta } : {};
                entries.set(type, Object.freeze({ type, handler, meta: Object.freeze(safeMeta) }));
                return true;
            }

            function unregister(actionType) {
                const type = normalizeType(actionType);
                if (!type) return false;
                return entries.delete(type);
            }

            function has(actionType) {
                const type = normalizeType(actionType);
                if (!type) return false;
                return entries.has(type);
            }

            function get(actionType) {
                const type = normalizeType(actionType);
                if (!type) return null;
                return entries.get(type) || null;
            }

            function list() {
                return Array.from(entries.values()).map((entry) => entry);
            }

            return Object.freeze({
                register,
                unregister,
                has,
                get,
                list
            });
        }
/* -------------------------------------------------------------------------- *
 * Module 03 · Built-in actions (URL jump / selector click / key simulation)
 * -------------------------------------------------------------------------- */

        function createBuiltinActionTools(ctx = {}) {
            const { options, URL_METHODS, Utils, hotkeys, showAlert } = ctx;
            const consoleTag = options?.consoleTag || "[ShortcutEngine]";

            function formatMessage(template, vars = {}) {
                let out = String(template ?? "");
                for (const [key, value] of Object.entries(vars || {})) {
                    out = out.split(`{${key}}`).join(String(value ?? ""));
                }
                return out;
            }

            function getUrlMethodDisplayText(method) {
                const methodConfig = URL_METHODS?.[method];
                if (!methodConfig) return options?.text?.builtins?.unknownUrlMethod || "未知跳转方式";
                return methodConfig.name;
            }

            function resolveTemplateUrl(targetUrl) {
                if (typeof options?.resolveUrlTemplate === 'function') {
                    try {
                        const resolved = options.resolveUrlTemplate(targetUrl, {
                            getCurrentSearchTerm: options.getCurrentSearchTerm,
                            placeholderToken: options.placeholderToken
                        });
                        if (resolved) return resolved;
                    } catch (err) {
                        console.warn(`${consoleTag} resolveUrlTemplate error`, err);
                    }
                }
                const placeholder = options?.placeholderToken || '%s';
                if (String(targetUrl || "").includes(placeholder)) {
                    let keyword = null;
                    try {
                        if (typeof options?.getCurrentSearchTerm === 'function') {
                            keyword = options.getCurrentSearchTerm();
                        } else {
                            const urlParams = new URL(location.href).searchParams;
                            keyword = urlParams.get('q');
                        }
                    } catch (err) {
                        console.warn(`${consoleTag} getCurrentSearchTerm error`, err);
                    }
                    if (keyword !== null && keyword !== undefined) {
                        return String(targetUrl).replaceAll(placeholder, encodeURIComponent(keyword));
                    } else {
                        if (placeholder === '%s' && String(targetUrl).includes('?')) {
                            return String(targetUrl).substring(0, String(targetUrl).indexOf('?'));
                        }
                        return String(targetUrl).replaceAll(placeholder, '');
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
                    const urlObj = new URL(url, location.origin);
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
                    console.warn(`${consoleTag} SPA navigation failed, fallback to location.href:`, e);
                    window.location.href = url;
                }
            }

            function executeNewWindowJump(url, advanced) {
                switch (advanced) {
                    case 'open':
                        window.open(url, '_blank', 'noopener,noreferrer');
                        break;
                    case 'popup': {
                        const popup = window.open(url, '_blank', 'width=800,height=600,scrollbars=yes,resizable=yes,status=yes,location=yes,menubar=yes,toolbar=yes');
                        if (popup) {
                            popup.focus();
                        } else {
                            console.warn(`${consoleTag} Popup blocked, fallback to normal open`);
                            window.open(url, '_blank', 'noopener,noreferrer');
                        }
                        break;
                    }
                    default:
                        window.open(url, '_blank', 'noopener,noreferrer');
                }
            }

            function jumpToUrl(targetUrl, method = "current", advanced = "href") {
                try {
                    const finalUrl = resolveTemplateUrl(targetUrl);
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
                            console.warn(`${consoleTag} Unknown URL method: ${method}, fallback to current window`);
                            executeCurrentWindowJump(finalUrl, advanced);
                    }
                } catch (e) {
                    console.error(`${consoleTag} Invalid URL or error in jumpToUrl:`, targetUrl, e);
                    if (typeof showAlert === "function") {
                        const tpl = options?.text?.builtins?.invalidUrlOrError || "无效的跳转网址或发生错误: {url}";
                        showAlert(formatMessage(tpl, { url: targetUrl }));
                    }
                }
            }

            function clickElement(selector) {
                const sel = (typeof selector === "string") ? selector.trim() : "";
                if (!sel) return;

                const element = Utils?.dom?.safeQuerySelector ? Utils.dom.safeQuerySelector(document, sel) : document.querySelector(sel);
                if (!element) {
                    if (typeof showAlert === "function") {
                        const tpl = options?.text?.builtins?.elementNotFound || "无法找到元素: {selector}";
                        showAlert(formatMessage(tpl, { selector: sel }));
                    }
                    return;
                }

                const tagName = (element.tagName || "").toUpperCase();
                const inputType = (element.getAttribute && element.getAttribute("type") || "").toLowerCase();
                if (tagName === "INPUT" && inputType === "checkbox") {
                    try { element.click(); } catch {}
                    return;
                }
                if (tagName === "LABEL") {
                    try { element.click(); } catch {}
                    return;
                }

                const ok = Utils?.events?.simulateClick ? Utils.events.simulateClick(element, { nativeFallback: true }) : false;
                if (ok) return;

                const fallbackTarget = (typeof element.closest === "function")
                    ? (element.closest('button, a, [role=\"button\"], [onclick]') || element)
                    : element;

                try {
                    if (typeof fallbackTarget.click === "function") {
                        fallbackTarget.click();
                        return;
                    }
                } catch {}

                try {
                    const clickEvent = new MouseEvent('click', { bubbles: true, cancelable: true, view: window });
                    fallbackTarget.dispatchEvent(clickEvent);
                } catch (eventError) {
                    console.error(`${consoleTag} Failed to dispatch click event on element: ${sel}`, eventError);
                    if (typeof showAlert === "function") {
                        const tpl = options?.text?.builtins?.clickFailed || "无法模拟点击元素: {selector}";
                        showAlert(formatMessage(tpl, { selector: sel }));
                    }
                }
            }

            function simulateKeystroke(keyString) {
                if (!keyString) return;
                const parts = String(keyString).toUpperCase().split('+');
                const mainKeyStr = parts.pop();
                const modifiers = parts;

                if (!mainKeyStr) {
                    console.warn(`${consoleTag} Invalid simulateKeys string (missing main key):`, keyString);
                    return;
                }

                const keyProps = typeof hotkeys?.getKeyEventProps === "function" ? hotkeys.getKeyEventProps(mainKeyStr) : null;
                if (!keyProps) {
                    console.warn(`${consoleTag} Unknown main key for simulation:`, mainKeyStr, "in", keyString);
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
                    console.error(`${consoleTag} Error dispatching simulated keyboard event:`, e);
                }
            }

            return Object.freeze({
                getUrlMethodDisplayText,
                jumpToUrl,
                clickElement,
                simulateKeystroke
            });
        }
/* -------------------------------------------------------------------------- *
 * Module 03 · Engine core (factory, storage, state wiring)
 * -------------------------------------------------------------------------- */

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
        const storageKeys = options.storageKeys && typeof options.storageKeys === "object" ? options.storageKeys : {};
        const rawUiPrefsKey = userOptions?.storageKeys?.uiPrefs;
        const rawIconThemeAdaptedKey = userOptions?.storageKeys?.iconThemeAdapted;
        const fallbackUiPrefsKeyBase = (typeof storageKeys.shortcuts === "string" && storageKeys.shortcuts.trim())
            ? storageKeys.shortcuts.trim()
            : idPrefix;
        const fallbackUiPrefsKey = `${fallbackUiPrefsKeyBase}::uiPrefs_v1`;
        const fallbackIconThemeAdaptedKey = `${fallbackUiPrefsKeyBase}::iconThemeAdapted_v2`;
        storageKeys.uiPrefs = (typeof rawUiPrefsKey === "string" && rawUiPrefsKey.trim())
            ? rawUiPrefsKey.trim()
            : fallbackUiPrefsKey;
        storageKeys.iconThemeAdapted = (typeof rawIconThemeAdaptedKey === "string" && rawIconThemeAdaptedKey.trim())
            ? rawIconThemeAdaptedKey.trim()
            : fallbackIconThemeAdaptedKey;
        options.storageKeys = storageKeys;

        const ids = {
            settingsOverlay: `${idPrefix}-settings-overlay`,
            settingsPanel: `${idPrefix}-settings-panel`,
            stats: `${idPrefix}-shortcut-stats`,
            tableBody: `${idPrefix}-shortcut-tbody`,
            editOverlay: `${idPrefix}-edit-overlay`,
            editForm: `${idPrefix}-edit-form`
        };

        const classes = {
            overlay: `${cssPrefix}-overlay`,
            panel: `${cssPrefix}-panel`,
            filterButton: `${cssPrefix}-filter-button`,
            filterLabel: `${cssPrefix}-filter-label`,
            filterCount: `${cssPrefix}-filter-count`,
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
                themeMode: "auto",
                legacyIconAdaptiveEnabled: false,
	            isDarkMode: false,
	            currentFilter: 'all',
	            searchQuery: '',
	            currentPanelOverlay: null,
	            currentPanelCloser: null,
	            currentEditCloser: null,
	            destroyResponsiveListener: null,
	            destroyDarkModeObserver: null,
	            destroyDragCss: null,
                destroyBaseCss: null,
	            menuCommandRegistered: false,
	            filterChangedEventName: `${idPrefix}-filterChanged`
	        };

	        const GMX = (typeof GM_xmlhttpRequest === 'function')
	            ? GM_xmlhttpRequest
	            : (typeof GM !== 'undefined' && GM.xmlHttpRequest ? GM.xmlHttpRequest : null);

        const hotkeys = createHotkeysToolkit();

        let engineApi = null;

        /* ------------------ 通用工具函数 ------------------ */

	        function normalizeThemeMode(value) {
	            const token = String(value ?? "").trim().toLowerCase();
	            if (token === "dark") return "dark";
	            if (token === "light") return "light";
	            return "auto";
	        }

        function normalizeBoolean(value, fallback = false) {
            if (typeof value === "boolean") return value;
            const token = String(value ?? "").trim().toLowerCase();
            if (!token) return fallback;
            if (["1", "true", "yes", "on"].includes(token)) return true;
            if (["0", "false", "no", "off"].includes(token)) return false;
            return fallback;
        }

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

        const uiPrefsRaw = safeGMGet(options.storageKeys.uiPrefs, null);
        const uiPrefs = (uiPrefsRaw && typeof uiPrefsRaw === "object" && !Array.isArray(uiPrefsRaw)) ? uiPrefsRaw : {};
        state.themeMode = normalizeThemeMode(uiPrefs.themeMode);
        state.legacyIconAdaptiveEnabled = normalizeBoolean(uiPrefs.iconAdaptiveEnabled, false);
        if (state.themeMode === "dark") state.isDarkMode = true;
        if (state.themeMode === "light") state.isDarkMode = false;

        function generateShortcutId() {
            try {
                if (global.crypto && typeof global.crypto.randomUUID === "function") {
                    return global.crypto.randomUUID();
                }
            } catch {}
            return `sc_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;
        }

        function ensureUniqueShortcutIds(list) {
            if (!Array.isArray(list) || list.length === 0) return;
            const seen = new Set();
            for (const shortcut of list) {
                if (!shortcut || typeof shortcut !== "object") continue;
                const idRaw = typeof shortcut.id === "string" ? shortcut.id.trim() : "";
                let id = idRaw;
                if (!id || seen.has(id)) {
                    id = generateShortcutId();
                    shortcut.id = id;
                }
                seen.add(id);
            }
        }

        function normalizeShortcut(raw) {
            const shortcut = raw && typeof raw === 'object' ? raw : {};
            const key = (typeof shortcut.key === "string") ? shortcut.key.trim() : "";
            let id = (typeof shortcut.id === "string") ? shortcut.id.trim() : "";
            if (!id) {
                id = key ? `key:${key}` : generateShortcutId();
            }
            const dataRaw = shortcut && typeof shortcut.data === "object" && !Array.isArray(shortcut.data) ? shortcut.data : null;
            const normalizeHotkey = typeof hotkeys?.normalize === "function" ? hotkeys.normalize : (v) => String(v || "");
            return {
                id,
                key,
                name: shortcut.name || "",
                actionType: shortcut.actionType || (shortcut.url ? 'url' : (shortcut.selector ? 'selector' : (shortcut.simulateKeys ? 'simulate' : (shortcut.customAction ? 'custom' : '')))),
                url: shortcut.url || "",
                urlMethod: shortcut.urlMethod || "current",
                urlAdvanced: shortcut.urlAdvanced || "href",
                selector: shortcut.selector || "",
                simulateKeys: normalizeHotkey(shortcut.simulateKeys || ""),
                customAction: shortcut.customAction || "",
                hotkey: normalizeHotkey(shortcut.hotkey || ""),
                icon: shortcut.icon || "",
                iconDark: shortcut.iconDark || "",
                iconAdaptive: normalizeBoolean(shortcut.iconAdaptive, state.legacyIconAdaptiveEnabled),
                data: dataRaw ? clone(dataRaw) : {}
            };
        }

        function loadShortcuts() {
            const stored = safeGMGet(options.storageKeys.shortcuts, options.defaultShortcuts);
            const list = Array.isArray(stored) ? stored : [];
            return list.map(normalizeShortcut);
        }

        let shortcuts = loadShortcuts();
        ensureUniqueShortcutIds(shortcuts);

        function saveShortcuts() {
            safeGMSet(options.storageKeys.shortcuts, shortcuts);
        }

        const uiShared = createUiSharedLayer({ options, state, ids, idPrefix, cssPrefix });
        const debounce = uiShared?.utils?.debounce || ((fn) => fn);
        const iconManager = createIconManager({ options, state, safeGMGet, safeGMSet, GMX });
        const builtinActions = createBuiltinActionTools({
            options,
            URL_METHODS,
            Utils,
            hotkeys,
            showAlert: uiShared?.dialogs?.showAlert
        });

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

        function createCoreLayer() {
            let hotkeyIndex = new Map();
            let coreApi = null;
            const actions = createActionRegistry({ consoleTag: options.consoleTag });

            const BUILTIN_ACTION_TYPES = Object.freeze(["url", "selector", "simulate", "custom"]);

            function registerBuiltInActions() {
                actions.register("url", ({ shortcut }) => {
                    if (shortcut?.url) {
                        builtinActions.jumpToUrl(shortcut.url, shortcut.urlMethod, shortcut.urlAdvanced);
                    } else {
                        console.warn(`${options.consoleTag} Shortcut "${shortcut?.name || ""}" is type 'url' but has no URL defined.`);
                    }
                }, { label: options?.text?.stats?.url || "URL跳转", shortLabel: "URL", color: "#4CAF50", builtin: true });

                actions.register("selector", ({ shortcut }) => {
                    if (shortcut?.selector) {
                        builtinActions.clickElement(shortcut.selector);
                    } else {
                        console.warn(`${options.consoleTag} Shortcut "${shortcut?.name || ""}" is type 'selector' but has no selector defined.`);
                    }
                }, { label: options?.text?.stats?.selector || "元素点击", shortLabel: "点击", color: "#FF9800", builtin: true });

                actions.register("simulate", ({ shortcut }) => {
                    if (shortcut?.simulateKeys) {
                        builtinActions.simulateKeystroke(shortcut.simulateKeys);
                    } else {
                        console.warn(`${options.consoleTag} Shortcut "${shortcut?.name || ""}" is type 'simulate' but has no simulateKeys defined.`);
                    }
                }, { label: options?.text?.stats?.simulate || "按键模拟", shortLabel: "按键", color: "#9C27B0", builtin: true });

                actions.register("custom", ({ shortcut, event }) => {
                    executeCustomAction(shortcut, event);
                }, { label: options?.text?.stats?.custom || "自定义动作", shortLabel: "自定义", color: "#607D8B", builtin: true });
            }

            function registerUserActionHandlers() {
                const handlers = options.actionHandlers && typeof options.actionHandlers === "object" ? options.actionHandlers : null;
                if (!handlers) return;
                const allowOverrideBuiltin = !!options.allowOverrideBuiltinActions;
                for (const [type, handler] of Object.entries(handlers)) {
                    if (!type) continue;
                    if (BUILTIN_ACTION_TYPES.includes(type) && !allowOverrideBuiltin) {
                        console.warn(`${options.consoleTag} actionHandlers attempted to override built-in action "${type}". Set allowOverrideBuiltinActions=true to allow.`);
                        continue;
                    }
                    const meta = options.actionTypeMeta && typeof options.actionTypeMeta === "object" ? options.actionTypeMeta[type] : null;
                    const finalMeta = meta && typeof meta === "object" ? { ...meta } : {};
                    if (BUILTIN_ACTION_TYPES.includes(type) && typeof finalMeta.builtin !== "boolean") {
                        finalMeta.builtin = false;
                    }
                    actions.register(type, handler, finalMeta);
                }
            }

            registerBuiltInActions();
            registerUserActionHandlers();

            function rebuildHotkeyIndex() {
                const next = new Map();
                for (let i = 0; i < shortcuts.length; i++) {
                    const item = shortcuts[i];
                    if (!item || !item.hotkey) continue;
                    const norm = hotkeys.normalize(item.hotkey);
                    if (!norm) continue;
                    if (!next.has(norm)) next.set(norm, i);
                }
                hotkeyIndex = next;
            }

            function getShortcutByHotkeyNorm(hotkeyNorm) {
                const index = hotkeyIndex.get(hotkeyNorm);
                if (index == null) return null;
                return shortcuts[index] || null;
            }

            function executeShortcutAction(item, event) {
                if (!item) return null;
                const type = String(item.actionType || "").trim();
                const entry = type ? actions.get(type) : null;
                if (!entry || typeof entry.handler !== "function") {
                    console.warn(`${options.consoleTag} Shortcut "${item?.name || ""}" has unknown actionType: ${type}`);
                    return null;
                }
                try {
                    const res = entry.handler({ shortcut: item, event, engine: engineApi, core: coreApi, options });
                    if (res && typeof res.then === "function") {
                        res.catch((err) => console.warn(`${options.consoleTag} Action "${type}" rejected:`, err));
                    }
                    return res;
                } catch (err) {
                    console.warn(`${options.consoleTag} Action "${type}" failed:`, err);
                    return null;
                }
            }

            function setShortcutsList(newShortcuts, { persist = true } = {}) {
                if (!Array.isArray(newShortcuts)) return;
                shortcuts = newShortcuts.map(normalizeShortcut);
                ensureUniqueShortcutIds(shortcuts);
                rebuildHotkeyIndex();
                if (persist) saveShortcuts();
            }

            function mutateShortcuts(mutator, { persist = false } = {}) {
                if (typeof mutator !== 'function') return;
                mutator(shortcuts);
                ensureUniqueShortcutIds(shortcuts);
                rebuildHotkeyIndex();
                if (persist) saveShortcuts();
            }

            function getShortcutsSnapshot() {
                return shortcuts.slice();
            }

            rebuildHotkeyIndex();

            const actionApi = Object.freeze({
                register: actions.register,
                unregister: actions.unregister,
                has: actions.has,
                get: actions.get,
                list: actions.list,
                builtins: BUILTIN_ACTION_TYPES.slice()
            });

            coreApi = Object.freeze({
                setShortcuts: setShortcutsList,
                mutateShortcuts,
                persistShortcuts: saveShortcuts,
                getShortcuts: getShortcutsSnapshot,
                rebuildHotkeyIndex,
                getShortcutByHotkeyNorm,
                executeShortcutAction,
                actions: actionApi,
                hotkeys: Object.freeze({
                    normalize: hotkeys.normalize,
                    modifierOrder: hotkeys.modifierOrder,
                    fromEvent: hotkeys.fromEvent,
                    getMainKeyFromEvent: hotkeys.getMainKeyFromEvent,
                    isAllowedMainKey: hotkeys.isAllowedMainKey,
                    isAllowedSimulateMainKey: hotkeys.isAllowedSimulateMainKey,
                    formatForDisplay: hotkeys.formatForDisplay,
                    formatModifierToken: hotkeys.formatModifierToken,
                    formatKeyToken: hotkeys.formatKeyToken
                }),
                normalizeHotkey: hotkeys.normalize,
                normalizeShortcut
            });
            return coreApi;
        }

        const core = createCoreLayer();

        const ctx = {
            options,
            state,
            core,
            uiShared,
            idPrefix,
            cssPrefix,
            ids,
            classes,
            URL_METHODS,
            getUrlMethodDisplayText: builtinActions.getUrlMethodDisplayText,
            setIconImage: iconManager.setIconImage,
            ensureThemeAdaptiveIconStored: iconManager.ensureThemeAdaptiveIconStored,
            setTrustedHTML: Utils?.dom?.setTrustedHTML,
            panelFilter: Object.freeze({
                normalizeActionType: panelNormalizeActionType,
                buildShortcutSearchHaystack: panelBuildShortcutSearchHaystack,
                matchesSearchQuery: panelMatchesSearchQuery,
                matchesCurrentView: panelMatchesCurrentView
            }),
            safeGMGet,
            safeGMSet,
            debounce
        };

        uiShared?.theme?.applyThemeCssVariables?.(state.isDarkMode);

	        engineApi = createEngineApi(ctx);
	        return engineApi;
	    }
/* -------------------------------------------------------------------------- *
 * Module 03 · Hotkeys (normalize, capture, display, key-event mapping)
 * -------------------------------------------------------------------------- */

        const HOTKEY_MODIFIER_ORDER = Object.freeze(["CTRL", "SHIFT", "ALT", "CMD"]);
        const HOTKEY_MODIFIER_ALIASES = Object.freeze({
            CTRL: "CTRL",
            CONTROL: "CTRL",
            SHIFT: "SHIFT",
            ALT: "ALT",
            OPTION: "ALT",
            OPT: "ALT",
            CMD: "CMD",
            COMMAND: "CMD",
            META: "CMD",
            WIN: "CMD",
            WINDOWS: "CMD"
        });

        const HOTKEY_MODIFIER_DISPLAY = Object.freeze({
            CTRL: "Ctrl",
            SHIFT: "Shift",
            ALT: "Alt",
            CMD: "Cmd"
        });

        const SHIFTED_SYMBOL_TO_BASE_KEY = Object.freeze({
            "!": "1",
            "@": "2",
            "#": "3",
            "$": "4",
            "%": "5",
            "^": "6",
            "&": "7",
            "*": "8",
            "(": "9",
            ")": "0",
            "_": "-",
            "+": "=",
            "{": "[",
            "}": "]",
            "|": "\\",
            ":": ";",
            "\"": "'",
            "<": ",",
            ">": ".",
            "?": "/",
            "~": "`"
        });

        const HOTKEY_CODE_MAP = {
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

        const HOTKEY_STANDARD_DISPLAY_MAP = (() => {
            const map = Object.create(null);
            for (const info of Object.values(HOTKEY_CODE_MAP)) {
                if (!info || !info.standard || !info.display) continue;
                if (!map[info.standard]) map[info.standard] = info.display;
            }
            return Object.freeze(map);
        })();

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

        function normalizeMainKeyToken(rawKey, modifiers) {
            if (!rawKey) return "";
            const token = String(rawKey).toUpperCase();
            if (HOTKEY_MODIFIER_ALIASES[token]) return "";

            let mainKey = token;
            if (mainKey === "ESCAPE") mainKey = "ESC";
            if (mainKey === "SPACEBAR") mainKey = "SPACE";
            if (mainKey === "DEL") mainKey = "DELETE";

            const shiftedBase = SHIFTED_SYMBOL_TO_BASE_KEY[mainKey];
            if (shiftedBase) {
                if (modifiers && typeof modifiers.add === "function") modifiers.add("SHIFT");
                mainKey = shiftedBase;
            }

            return mainKey;
        }

        function normalizeHotkey(hotkeyStr) {
            if (!hotkeyStr || typeof hotkeyStr !== 'string') return "";
            const raw = hotkeyStr.replace(/\s+/g, "");
            if (!raw) return "";

            const parts = raw.split("+").filter(Boolean);
            if (parts.length === 0) return "";

            const modifiers = new Set();
            let mainKey = "";

            for (const part of parts) {
                const token = String(part || "").trim();
                if (!token) continue;
                const upper = token.toUpperCase();
                const mod = HOTKEY_MODIFIER_ALIASES[upper];
                if (mod) {
                    modifiers.add(mod);
                    continue;
                }
                mainKey = upper;
            }

            mainKey = normalizeMainKeyToken(mainKey, modifiers);
            if (!mainKey) return "";

            const orderedMods = [];
            for (const mod of HOTKEY_MODIFIER_ORDER) {
                if (modifiers.has(mod)) orderedMods.push(mod);
            }

            return orderedMods.length ? [...orderedMods, mainKey].join("+") : mainKey;
        }

        function getStandardKeyFromKeyboardEvent(e) {
            if (!e) return "";
            const code = String(e.code || "");
            const fromCode = code ? HOTKEY_CODE_MAP[code] : null;
            if (fromCode && fromCode.standard) return fromCode.standard;

            const keyRaw = String(e.key || "");
            if (!keyRaw) return "";
            if (keyRaw === " ") return "SPACE";

            let key = keyRaw.toUpperCase();
            if (key === "ESCAPE") key = "ESC";
            if (key === "SPACEBAR") key = "SPACE";
            if (key === "DEL") key = "DELETE";

            const shiftedBase = SHIFTED_SYMBOL_TO_BASE_KEY[key];
            if (shiftedBase) key = shiftedBase;
            return key;
        }

        function getHotkeyFromKeyboardEvent(e) {
            if (!e) return "";
            const modifiers = new Set();
            if (e.ctrlKey) modifiers.add("CTRL");
            if (e.shiftKey) modifiers.add("SHIFT");
            if (e.altKey) modifiers.add("ALT");
            if (e.metaKey) modifiers.add("CMD");

            const mainKey = getStandardKeyFromKeyboardEvent(e);
            if (!mainKey) return "";

            const orderedMods = [];
            for (const mod of HOTKEY_MODIFIER_ORDER) {
                if (modifiers.has(mod)) orderedMods.push(mod);
            }

            return orderedMods.length ? [...orderedMods, mainKey].join("+") : mainKey;
        }

        function isAllowedHotkeyMainKey(mainKey) {
            const key = String(mainKey || "");
            if (!key) return false;
            if (key === "SPACE" || key === "ESC" || key === "BACKSPACE" || key === "DELETE") return true;
            if (/^F\d+$/.test(key)) return true;
            if (/^NUMPAD\d$/.test(key)) return true;
            if (["NUMPADADD", "NUMPADSUBTRACT", "NUMPADMULTIPLY", "NUMPADDIVIDE", "NUMPADDECIMAL"].includes(key)) return true;
            if (key.length !== 1) return false;
            return /^[A-Z0-9~!@#$%^&*()_=[\]{}|\\;:'",./<>?-]$/.test(key);
        }

        function isAllowedSimulateMainKey(mainKey) {
            const normalized = normalizeMainKeyToken(String(mainKey || "").toUpperCase(), null);
            if (!normalized) return false;
            return !!KEY_EVENT_MAP[normalized];
        }

        function formatHotkeyModifierToken(token) {
            const upper = String(token || "").toUpperCase();
            const canonical = HOTKEY_MODIFIER_ALIASES[upper] || upper;
            return HOTKEY_MODIFIER_DISPLAY[canonical] || canonical;
        }

        function formatHotkeyMainKeyDisplayToken(token) {
            const normalized = normalizeMainKeyToken(String(token || "").toUpperCase(), null);
            if (!normalized) return "";
            return HOTKEY_STANDARD_DISPLAY_MAP[normalized] || normalized;
        }

        function formatHotkeyForDisplay(hotkeyStr) {
            const norm = normalizeHotkey(hotkeyStr);
            if (!norm) return "";
            const parts = norm.split("+").filter(Boolean);
            return parts
                .map((part) => (HOTKEY_MODIFIER_ALIASES[part] ? formatHotkeyModifierToken(part) : formatHotkeyMainKeyDisplayToken(part)))
                .join(" + ");
        }

        function createHotkeysToolkit() {
            function getKeyEventProps(standardMainKey) {
                const key = String(standardMainKey || "").toUpperCase();
                return KEY_EVENT_MAP[key] || null;
            }

            return Object.freeze({
                normalize: normalizeHotkey,
                fromEvent: getHotkeyFromKeyboardEvent,
                getMainKeyFromEvent: getStandardKeyFromKeyboardEvent,
                isAllowedMainKey: isAllowedHotkeyMainKey,
                isAllowedSimulateMainKey,
                formatForDisplay: formatHotkeyForDisplay,
                formatModifierToken: formatHotkeyModifierToken,
                formatKeyToken: formatHotkeyMainKeyDisplayToken,
                modifierOrder: HOTKEY_MODIFIER_ORDER,
                getKeyEventProps
            });
        }
/* -------------------------------------------------------------------------- *
 * Module 03 · Icons (favicon loading + GM cache)
 * -------------------------------------------------------------------------- */

        function createIconManager({
            options,
            state,
            safeGMGet,
            safeGMSet,
            GMX
        } = {}) {
            const opts = options && typeof options === "object" ? options : {};
            const stateRef = state && typeof state === "object" ? state : null;
            const cacheOptions = (opts.iconCache && typeof opts.iconCache === "object") ? opts.iconCache : {};
            const themeAdaptOptions = (opts.iconThemeAdapt && typeof opts.iconThemeAdapt === "object") ? opts.iconThemeAdapt : {};
            const enableMemoryCache = cacheOptions.enableMemoryCache !== false;
            const memoryMaxEntries = Number.isFinite(Number(cacheOptions.memoryMaxEntries))
                ? Math.max(0, Number(cacheOptions.memoryMaxEntries))
                : 200;
            const maxDataUrlChars = Number.isFinite(Number(cacheOptions.maxDataUrlChars))
                ? Math.max(0, Number(cacheOptions.maxDataUrlChars))
                : 180000;
            const memoryCache = enableMemoryCache ? new Map() : null; // url -> string | null (null = checked, no cached value)
            const inflightFetches = new Map(); // url -> callbacks[]
            const themeStoreKeyBase = String(opts?.storageKeys?.iconThemeAdapted || "").trim();
            const themeAdaptEnabled = themeAdaptOptions.enabled !== false;
            const themeStoreEnabled = !!themeStoreKeyBase;
            const themeLightFillColor = (typeof normalizeSvgCssColorToken === "function")
                ? normalizeSvgCssColorToken(themeAdaptOptions.lightFillColor, "#111827")
                : (String(themeAdaptOptions.lightFillColor || "").trim() || "#111827");
            const themeDarkFillColor = (typeof normalizeSvgCssColorToken === "function")
                ? normalizeSvgCssColorToken(themeAdaptOptions.darkFillColor, "#F8FAFC")
                : (String(themeAdaptOptions.darkFillColor || "").trim() || "#F8FAFC");
            const themeMemoryCache = enableMemoryCache ? new Map() : null; // key -> { source, adapted } | null
            const inflightThemeBuilds = new Map(); // source -> callbacks[]

            function getDefaultIconURL() {
                if (opts.defaultIconURL) return opts.defaultIconURL;
                if (Array.isArray(opts.iconLibrary) && opts.iconLibrary.length > 0) return opts.iconLibrary[0].url || "";
                return "";
            }

            function isDarkModeNow() {
                if (stateRef && typeof stateRef.isDarkMode === "boolean") return stateRef.isDarkMode;
                try {
                    if (global.matchMedia) return !!global.matchMedia("(prefers-color-scheme: dark)").matches;
                } catch {}
                return false;
            }

            function normalizeLocalBoolean(value, fallback = false) {
                if (typeof value === "boolean") return value;
                const token = String(value ?? "").trim().toLowerCase();
                if (!token) return fallback;
                if (["1", "true", "yes", "on"].includes(token)) return true;
                if (["0", "false", "no", "off"].includes(token)) return false;
                return fallback;
            }

            function rememberMemoryCache(url, value) {
                if (!memoryCache || !url) return;
                if (memoryCache.has(url)) memoryCache.delete(url);
                memoryCache.set(url, value);
                if (memoryMaxEntries > 0 && memoryCache.size > memoryMaxEntries) {
                    const firstKey = memoryCache.keys().next().value;
                    if (firstKey) memoryCache.delete(firstKey);
                }
            }

            function rememberThemeMemoryCache(key, value) {
                if (!themeMemoryCache || !key) return;
                if (themeMemoryCache.has(key)) themeMemoryCache.delete(key);
                themeMemoryCache.set(key, value);
                if (memoryMaxEntries > 0 && themeMemoryCache.size > memoryMaxEntries) {
                    const firstKey = themeMemoryCache.keys().next().value;
                    if (firstKey) themeMemoryCache.delete(firstKey);
                }
            }

            function getCachedIconDataURL(url) {
                const key = opts.storageKeys.iconCachePrefix + url;
                if (memoryCache && memoryCache.has(key)) {
                    const val = memoryCache.get(key);
                    return val || "";
                }
                let stored = "";
                try {
                    stored = safeGMGet(key, "");
                } catch {
                    stored = "";
                }
                if (memoryCache) rememberMemoryCache(key, stored ? stored : null);
                return stored;
            }
            function saveCachedIconDataURL(url, dataURL) {
                const key = opts.storageKeys.iconCachePrefix + url;
                if (memoryCache) rememberMemoryCache(key, dataURL || null);
                if (!dataURL) return;
                if (maxDataUrlChars > 0 && String(dataURL).length > maxDataUrlChars) return;
                try {
                    safeGMSet(key, dataURL);
                } catch {}
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

            function fetchIconAsDataURLOnce(url, cb) {
                if (!url || typeof cb !== "function") return;
                const pending = inflightFetches.get(url);
                if (pending) {
                    pending.push(cb);
                    return;
                }
                inflightFetches.set(url, [cb]);
                fetchIconAsDataURL(url, (dataURL) => {
                    const callbacks = inflightFetches.get(url) || [];
                    inflightFetches.delete(url);
                    callbacks.forEach((fn) => {
                        try { fn(dataURL); } catch {}
                    });
                });
            }

            function shouldBypassIconCache(url) {
                try {
                    if (typeof opts.shouldBypassIconCache === 'function') {
                        return !!opts.shouldBypassIconCache(url);
                    }
                } catch (err) {
                    console.warn(`${opts.consoleTag} shouldBypassIconCache error`, err);
                }
                return false;
            }

            function hashString(input) {
                const text = String(input || "");
                let hash = 5381;
                for (let i = 0; i < text.length; i++) {
                    hash = ((hash << 5) + hash + text.charCodeAt(i)) >>> 0;
                }
                return `${text.length}_${hash.toString(16)}`;
            }

            function getThemeStoreKey(source) {
                if (!themeStoreEnabled) return "";
                return `${themeStoreKeyBase}::${hashString(source)}`;
            }

            function getCachedThemeAdaptiveIconDataURL(source) {
                const input = String(source || "").trim();
                if (!input || !themeStoreEnabled) return "";
                const key = getThemeStoreKey(input);
                if (!key) return "";

                if (themeMemoryCache && themeMemoryCache.has(key)) {
                    const memoryVal = themeMemoryCache.get(key);
                    if (!memoryVal) return "";
                    if (memoryVal && memoryVal.source === input && typeof memoryVal.adapted === "string") {
                        return memoryVal.adapted;
                    }
                    return "";
                }

                let stored = null;
                try {
                    stored = safeGMGet(key, null);
                } catch {
                    stored = null;
                }
                if (
                    stored &&
                    typeof stored === "object" &&
                    !Array.isArray(stored) &&
                    stored.source === input &&
                    typeof stored.adapted === "string" &&
                    stored.adapted
                ) {
                    if (themeMemoryCache) rememberThemeMemoryCache(key, { source: input, adapted: stored.adapted });
                    return stored.adapted;
                }

                if (themeMemoryCache) rememberThemeMemoryCache(key, null);
                return "";
            }

            function saveThemeAdaptiveIconDataURL(source, adaptedDataURL) {
                const input = String(source || "").trim();
                const dataURL = String(adaptedDataURL || "").trim();
                if (!input || !dataURL || !themeStoreEnabled) return;
                if (maxDataUrlChars > 0 && dataURL.length > maxDataUrlChars) return;
                const key = getThemeStoreKey(input);
                if (!key) return;
                const payload = {
                    source: input,
                    adapted: dataURL,
                    savedAt: Date.now()
                };
                if (themeMemoryCache) rememberThemeMemoryCache(key, { source: input, adapted: dataURL });
                try {
                    safeGMSet(key, payload);
                } catch {}
            }

            function isLikelySvgUrl(value) {
                const url = String(value || "").trim();
                if (!url) return false;
                return /\.(svg)(\?|#|$)/i.test(url);
            }

            function decodeBase64Utf8(base64Payload) {
                const payload = String(base64Payload || "").replace(/\s+/g, "");
                if (!payload) return "";
                try {
                    const binary = atob(payload);
                    const bytes = new Uint8Array(binary.length);
                    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
                    if (typeof TextDecoder === "function") {
                        return new TextDecoder("utf-8").decode(bytes);
                    }
                    let escaped = "";
                    for (let i = 0; i < bytes.length; i++) {
                        escaped += `%${bytes[i].toString(16).padStart(2, "0")}`;
                    }
                    return decodeURIComponent(escaped);
                } catch {
                    return "";
                }
            }

            function decodeSvgDataUrl(dataUrl) {
                const raw = String(dataUrl || "").trim();
                if (!raw) return "";
                const match = raw.match(/^data:image\/svg\+xml(?:;([^,]*))?,([\s\S]*)$/i);
                if (!match) return "";
                const meta = String(match[1] || "").toLowerCase();
                const isBase64 = /(?:^|;)base64(?:;|$)/i.test(meta);
                const payload = match[2] || "";
                if (isBase64) return decodeBase64Utf8(payload);
                try {
                    return decodeURIComponent(payload);
                } catch {
                    return payload;
                }
            }

            function fetchSvgText(url, cb) {
                if (!GMX) {
                    cb("");
                    return;
                }
                GMX({
                    method: "GET",
                    url,
                    onload: function(resp) {
                        const status = Number(resp?.status || 0);
                        if (!(status >= 200 && status < 400)) {
                            cb("");
                            return;
                        }
                        const text = String(resp?.responseText || "").trim();
                        if (!text) {
                            cb("");
                            return;
                        }
                        const headers = String(resp?.responseHeaders || "").toLowerCase();
                        const match = headers.match(/content-type:\s*([^\r\n;]+)/i);
                        const contentType = match && match[1] ? match[1].trim().toLowerCase() : "";
                        const isSvgContent = contentType.includes("image/svg+xml") || /<svg[\s>]/i.test(text);
                        cb(isSvgContent ? text : "");
                    },
                    onerror: function() {
                        cb("");
                    }
                });
            }

            function resolveSvgSource(iconSource, cb) {
                const source = String(iconSource || "").trim();
                if (!source) {
                    cb("");
                    return;
                }

                if (/^<svg[\s>]/i.test(source)) {
                    cb(source);
                    return;
                }

                if (source.startsWith("data:")) {
                    if (!/^data:image\/svg\+xml/i.test(source)) {
                        cb("");
                        return;
                    }
                    cb(decodeSvgDataUrl(source));
                    return;
                }

                if (source.startsWith("blob:")) {
                    cb("");
                    return;
                }

                if (!isLikelySvgUrl(source)) {
                    cb("");
                    return;
                }

                fetchSvgText(source, cb);
            }

            function mergeClassNames(baseClassName, appendClassName) {
                const tokens = `${String(baseClassName || "")} ${String(appendClassName || "")}`
                    .split(/\s+/)
                    .map((part) => String(part || "").trim())
                    .filter(Boolean);
                if (tokens.length === 0) return "";
                return Array.from(new Set(tokens)).join(" ");
            }

            function isConvertiblePaintValue(rawValue) {
                const value = String(rawValue || "").trim();
                if (!value) return false;
                if (/^none$/i.test(value)) return false;
                if (/^url\s*\(/i.test(value)) return false;
                if (/^var\s*\(/i.test(value)) return false;
                if (/^context-(?:fill|stroke)$/i.test(value)) return false;
                if (/^(?:inherit|initial|unset)$/i.test(value)) return false;
                return true;
            }

            function normalizeSvgInlineStyleColor(styleText) {
                const raw = String(styleText || "").trim();
                if (!raw) return "";
                const declarations = raw.split(";");
                const normalized = [];
                for (const declarationRaw of declarations) {
                    const declaration = String(declarationRaw || "").trim();
                    if (!declaration) continue;
                    const separatorIndex = declaration.indexOf(":");
                    if (separatorIndex <= 0) continue;
                    const name = declaration.slice(0, separatorIndex).trim().toLowerCase();
                    const value = declaration.slice(separatorIndex + 1).trim();
                    if (!name || !value) continue;

                    if ((name === "fill" || name === "stroke") && isConvertiblePaintValue(value)) {
                        normalized.push(`${name}:currentColor`);
                    } else {
                        normalized.push(`${name}:${value}`);
                    }
                }
                return normalized.join(";");
            }

            function buildThemeAdaptiveSvgDataUrl(svgText) {
                const source = String(svgText || "").trim();
                if (!source) return "";

                if (/prefers-color-scheme\s*:\s*dark/i.test(source)) {
                    return `data:image/svg+xml,${encodeURIComponent(source)}`;
                }

                const DOMParserCtor = global.DOMParser;
                const XMLSerializerCtor = global.XMLSerializer;
                if (typeof DOMParserCtor !== "function" || typeof XMLSerializerCtor !== "function") {
                    return "";
                }

                let doc = null;
                try {
                    doc = new DOMParserCtor().parseFromString(source, "image/svg+xml");
                } catch {
                    doc = null;
                }
                if (!doc || doc.querySelector("parsererror")) return "";

                const root = doc.documentElement;
                if (!root || String(root.tagName || "").toLowerCase() !== "svg") return "";

                if (!root.getAttribute("xmlns")) {
                    root.setAttribute("xmlns", "http://www.w3.org/2000/svg");
                }

                const themeRootClassName = "st-theme-auto";
                const themeRootClass = (typeof mergeSvgClassNames === "function")
                    ? mergeSvgClassNames(root.getAttribute("class"), themeRootClassName)
                    : mergeClassNames(root.getAttribute("class"), themeRootClassName);
                if (themeRootClass) root.setAttribute("class", themeRootClass);

                const styleEl = doc.createElementNS(root.namespaceURI || "http://www.w3.org/2000/svg", "style");
                styleEl.textContent = `.${themeRootClassName}{color:${themeLightFillColor};}@media (prefers-color-scheme: dark){.${themeRootClassName}{color:${themeDarkFillColor};}}`;
                root.insertBefore(styleEl, root.firstChild || null);

                const autoFillTags = new Set(["path", "circle", "rect", "ellipse", "line", "polyline", "polygon", "text"]);
                const skipTags = new Set([
                    "defs", "clippath", "mask",
                    "lineargradient", "radialgradient", "stop",
                    "pattern", "filter", "image", "foreignobject",
                    "style", "script", "metadata", "title", "desc",
                    "symbol", "use"
                ]);

                const nodes = Array.from(root.querySelectorAll("*"));
                for (const node of nodes) {
                    const tag = String(node.tagName || "").toLowerCase();
                    if (!tag || skipTags.has(tag)) continue;
                    let blockedByAncestor = false;
                    try {
                        const ancestor = node.closest("defs,clipPath,mask,linearGradient,radialGradient,pattern,filter,symbol");
                        blockedByAncestor = !!ancestor && ancestor !== node;
                    } catch {}
                    if (blockedByAncestor) continue;

                    const fill = node.getAttribute("fill");
                    if (fill !== null && isConvertiblePaintValue(fill)) {
                        node.setAttribute("fill", "currentColor");
                    }
                    const stroke = node.getAttribute("stroke");
                    if (stroke !== null && isConvertiblePaintValue(stroke)) {
                        node.setAttribute("stroke", "currentColor");
                    }

                    if (node.hasAttribute("style")) {
                        const nextStyle = normalizeSvgInlineStyleColor(node.getAttribute("style"));
                        if (nextStyle) node.setAttribute("style", nextStyle);
                        else node.removeAttribute("style");
                    }

                    const hasPaintAttr = node.hasAttribute("fill") || node.hasAttribute("stroke");
                    if (!hasPaintAttr && autoFillTags.has(tag)) {
                        node.setAttribute("fill", "currentColor");
                    }
                }

                let markup = "";
                try {
                    markup = new XMLSerializerCtor().serializeToString(root);
                } catch {
                    markup = "";
                }
                if (!markup) return "";
                return `data:image/svg+xml,${encodeURIComponent(markup)}`;
            }

            function ensureThemeAdaptiveIconStored(iconSource, cb = null) {
                const source = String(iconSource || "").trim();
                const callback = (typeof cb === "function") ? cb : null;

                if (!source || !themeAdaptEnabled) {
                    if (callback) callback("");
                    return;
                }

                const cached = getCachedThemeAdaptiveIconDataURL(source);
                if (cached) {
                    if (callback) callback(cached);
                    return;
                }

                const pending = inflightThemeBuilds.get(source);
                if (pending) {
                    if (callback) pending.push(callback);
                    return;
                }

                inflightThemeBuilds.set(source, callback ? [callback] : []);

                resolveSvgSource(source, (svgText) => {
                    const themedDataUrl = svgText ? buildThemeAdaptiveSvgDataUrl(svgText) : "";
                    if (themedDataUrl) {
                        saveThemeAdaptiveIconDataURL(source, themedDataUrl);
                    } else if (themeMemoryCache && themeStoreEnabled) {
                        rememberThemeMemoryCache(getThemeStoreKey(source), null);
                    }

                    const queue = inflightThemeBuilds.get(source) || [];
                    inflightThemeBuilds.delete(source);
                    queue.forEach((fn) => {
                        try { fn(themedDataUrl); } catch {}
                    });
                });
            }

            function markImageSource(imgEl, source) {
                if (!imgEl) return;
                const marker = String(source || "");
                try {
                    imgEl.dataset.stIconSource = marker;
                    return;
                } catch {}
                try {
                    imgEl.__stIconSource = marker;
                } catch {}
            }

            function isImageSourceCurrent(imgEl, source) {
                if (!imgEl) return false;
                const marker = String(source || "");
                try {
                    if (imgEl.dataset && imgEl.dataset.stIconSource === marker) return true;
                } catch {}
                try {
                    return imgEl.__stIconSource === marker;
                } catch {
                    return false;
                }
            }

            function setIconImage(imgEl, iconUrl, iconDarkUrl = "", iconAdaptive = false) {
                const fallback = getDefaultIconURL();
                if (!imgEl) return;
                const lightSource = String(iconUrl || "").trim();
                const darkSource = String(iconDarkUrl || "").trim();
                const source = (darkSource && (isDarkModeNow() || !lightSource)) ? darkSource : lightSource;
                const shouldUseThemeAdapt = themeAdaptEnabled && normalizeLocalBoolean(iconAdaptive, false) && !darkSource;
                const sourceMarker = `${source}::ta=${shouldUseThemeAdapt ? "1" : "0"}`;
                markImageSource(imgEl, sourceMarker);

                if (!source) {
                    imgEl.src = fallback;
                    return;
                }

                if (shouldUseThemeAdapt) {
                    const cachedThemeIcon = getCachedThemeAdaptiveIconDataURL(source);
                    if (cachedThemeIcon) {
                        imgEl.src = cachedThemeIcon;
                        return;
                    }
                }

                if (source.startsWith("data:") || source.startsWith("blob:")) {
                    imgEl.src = source;
                    if (shouldUseThemeAdapt && !source.startsWith("blob:")) {
                        ensureThemeAdaptiveIconStored(source, (themedDataUrl) => {
                            if (!themedDataUrl || !isImageSourceCurrent(imgEl, sourceMarker)) return;
                            imgEl.src = themedDataUrl;
                        });
                    }
                    return;
                }

                if (shouldBypassIconCache(source)) {
                    imgEl.src = source;
                    imgEl.onerror = () => {
                        imgEl.onerror = null;
                        imgEl.src = fallback;
                    };
                    if (shouldUseThemeAdapt) {
                        ensureThemeAdaptiveIconStored(source, (themedDataUrl) => {
                            if (!themedDataUrl || !isImageSourceCurrent(imgEl, sourceMarker)) return;
                            imgEl.src = themedDataUrl;
                        });
                    }
                    return;
                }

                const cached = getCachedIconDataURL(source);
                if (cached) {
                    imgEl.src = cached;
                    if (shouldUseThemeAdapt) {
                        ensureThemeAdaptiveIconStored(source, (themedDataUrl) => {
                            if (!themedDataUrl || !isImageSourceCurrent(imgEl, sourceMarker)) return;
                            imgEl.src = themedDataUrl;
                        });
                    }
                    return;
                }

                imgEl.src = source;

                const onErr = () => {
                    imgEl.removeEventListener('error', onErr);
                    fetchIconAsDataURLOnce(source, (dataURL) => {
                        if (dataURL) {
                            saveCachedIconDataURL(source, dataURL);
                            imgEl.src = dataURL;
                        } else {
                            imgEl.src = fallback;
                        }
                    });
                };
                imgEl.addEventListener('error', onErr, { once: true });

                if (shouldUseThemeAdapt) {
                    ensureThemeAdaptiveIconStored(source, (themedDataUrl) => {
                        if (!themedDataUrl || !isImageSourceCurrent(imgEl, sourceMarker)) return;
                        imgEl.src = themedDataUrl;
                    });
                }
            }

            return Object.freeze({
                setIconImage,
                ensureThemeAdaptiveIconStored
            });
        }
/* -------------------------------------------------------------------------- *
 * Module 03 · UI shared (theme, colors, dialogs, layout, styles)
 * -------------------------------------------------------------------------- */

        function createUiSharedLayer(ctx = {}) {
            const { options, state, ids, idPrefix, cssPrefix } = ctx;
            const classPrefix = String(cssPrefix || idPrefix || "shortcut").trim() || "shortcut";

            function debounce(fn, delay = 300) {
                let t = null;
                return function(...args) {
                    clearTimeout(t);
                    t = setTimeout(() => fn.apply(this, args), delay);
                };
            }

            /* ------------------------------ Theme ------------------------------ */

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

            function isColorDark(colorStr) {
                if (!colorStr || colorStr === 'transparent')
                    return window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
                try {
                    let r, g, b, a = 1;
                    if (colorStr.startsWith('rgba')) {
                        const parts = colorStr.match(/rgba?\s*\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*(?:,\s*([\d.]+))?\s*\)\s*$/i);
                        if (!parts) return window.matchMedia('(prefers-color-scheme: dark)').matches;
                        [, r, g, b, a] = parts.map(Number);
                        a = isNaN(a) ? 1 : a;
                        if (a < 0.5) return false;
                    } else if (colorStr.startsWith('rgb')) {
                        const parts = colorStr.match(/rgb\s*\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*\)\s*$/i);
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

            /* ------------------------------ Colors ----------------------------- */

            function getPrimaryColor() {
                return (options.colors && options.colors.primary) ? options.colors.primary : '#0066cc';
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

            function applyThemeCssVariables(isDark = state.isDarkMode) {
                const root = document && document.documentElement ? document.documentElement : null;
                if (!root) return;

                const prefix = String(cssPrefix || idPrefix || "shortcut").trim() || "shortcut";
                const setVar = (name, value) => {
                    try { root.style.setProperty(`--${prefix}-${name}`, String(value ?? "")); } catch {}
                };

                setVar("primary", getPrimaryColor());
                setVar("overlay-bg", getOverlayBackgroundColor(isDark));
                setVar("panel-bg", getPanelBackgroundColor(isDark));
                setVar("input-bg", getInputBackgroundColor(isDark));
                setVar("text", getTextColor(isDark));
                setVar("border", getBorderColor(isDark));
                setVar("table-header-bg", getTableHeaderBackground(isDark));
                setVar("hover-bg", getHoverColor(isDark));
            }

            function detectInitialDarkMode() {
                const htmlEl = document.documentElement;
                const bodyEl = document.body;
                let detectedDarkMode = false;
                const mode = String(state.themeMode || "auto").trim().toLowerCase();
                if (mode === "dark") {
                    detectedDarkMode = true;
                } else if (mode === "light") {
                    detectedDarkMode = false;
                } else if (htmlEl.classList.contains('dark') || bodyEl?.classList?.contains('dark')) {
                    detectedDarkMode = true;
                } else if (htmlEl.getAttribute('data-theme') === 'dark' || bodyEl?.getAttribute?.('data-theme') === 'dark') {
                    detectedDarkMode = true;
                } else if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
                    if (!htmlEl.classList.contains('light') && !bodyEl?.classList?.contains('light')) {
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

                applyThemeCssVariables(detectedDarkMode);
                if (state.isDarkMode !== detectedDarkMode) {
                    state.isDarkMode = detectedDarkMode;
                    notifyThemeChangeListeners();
                }
            }

            function setupDarkModeObserver() {
                let cleaned = false;
                let intervalId = null;
                let observer = null;
                let removeMediaListener = null;

                if (window.matchMedia) {
                    const darkModeMediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
                    const listener = () => { detectInitialDarkMode(); };
                    if (darkModeMediaQuery.addEventListener) {
                        darkModeMediaQuery.addEventListener('change', listener);
                        removeMediaListener = () => darkModeMediaQuery.removeEventListener('change', listener);
                    } else if (darkModeMediaQuery.addListener) {
                        darkModeMediaQuery.addListener(listener);
                        removeMediaListener = () => darkModeMediaQuery.removeListener(listener);
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
                observer = new MutationObserver(observerCallback);

                const observeTarget = document.documentElement || document.body;
                if (observeTarget) {
                    try {
                        observer.observe(observeTarget, { attributes: true, attributeFilter: ['class', 'data-theme'] });
                    } catch (err) {
                        console.warn(`${options.consoleTag} MutationObserver observe failed`, err);
                    }
                }

                intervalId = setInterval(() => { detectInitialDarkMode(); }, 5000);
                detectInitialDarkMode();

                return () => {
                    if (cleaned) return;
                    cleaned = true;
                    if (intervalId) {
                        clearInterval(intervalId);
                        intervalId = null;
                    }
                    if (observer) {
                        try { observer.disconnect(); } catch {}
                        observer = null;
                    }
                    if (removeMediaListener) {
                        try { removeMediaListener(); } catch {}
                        removeMediaListener = null;
                    }
                };
            }

            /* ------------------------------ Styles ----------------------------- */

            function styleTableHeader(th) {
                const prefix = String(cssPrefix || idPrefix || "shortcut").trim() || "shortcut";
                th.classList.add(`${prefix}-th`);
            }
            function styleTableCell(td) {
                const prefix = String(cssPrefix || idPrefix || "shortcut").trim() || "shortcut";
                td.classList.add(`${prefix}-td`);
            }
            function styleButton(btn, bgColor, hoverColor) {
                const prefix = String(cssPrefix || idPrefix || "shortcut").trim() || "shortcut";
                btn.classList.add(`${prefix}-btn`);
                try {
                    btn.style.setProperty(`--${prefix}-btn-bg`, String(bgColor ?? ""));
                    btn.style.setProperty(`--${prefix}-btn-hover-bg`, String(hoverColor ?? ""));
                } catch {}
            }
            function styleTransparentButton(btn, textColor, hoverBg) {
                const prefix = String(cssPrefix || idPrefix || "shortcut").trim() || "shortcut";
                btn.classList.add(`${prefix}-btn-ghost`);
                try {
                    btn.style.setProperty(`--${prefix}-ghost-color`, String(textColor ?? ""));
                    btn.style.setProperty(`--${prefix}-ghost-hover-bg`, String(hoverBg ?? ""));
                } catch {}
            }
            function styleInputField(input) {
                const prefix = String(cssPrefix || idPrefix || "shortcut").trim() || "shortcut";
                input.classList.add(`${prefix}-input`);
            }

            /* ------------------------------ Dialogs ---------------------------- */

            function showAlert(message, title = options.text.dialogs.alert || "提示") {
                const modal = document.createElement('div');
                modal.className = `${classPrefix}-overlay`;
                modal.style.zIndex = '999999';

                const dialog = document.createElement('div');
                dialog.className = `${classPrefix}-panel`;
                Object.assign(dialog.style, { maxWidth: '400px', width: '90%', maxHeight: '80vh', overflow: 'auto' });

                const titleEl = document.createElement('h3');
                titleEl.textContent = title;
                Object.assign(titleEl.style, {
                    margin: '0 0 15px 0', fontSize: '1.1em', fontWeight: 'bold'
                });
                dialog.appendChild(titleEl);

                const messageEl = document.createElement('p');
                messageEl.textContent = message;
                Object.assign(messageEl.style, {
                    margin: '0 0 20px 0', lineHeight: '1.4', whiteSpace: 'pre-wrap'
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
                modal.className = `${classPrefix}-overlay`;
                modal.style.zIndex = '999999';

                const dialog = document.createElement('div');
                dialog.className = `${classPrefix}-panel`;
                Object.assign(dialog.style, { maxWidth: '400px', width: '90%', maxHeight: '80vh', overflow: 'auto' });

                const titleEl = document.createElement('h3');
                titleEl.textContent = title;
                Object.assign(titleEl.style, {
                    margin: '0 0 15px 0', fontSize: '1.1em', fontWeight: 'bold'
                });
                dialog.appendChild(titleEl);

                const messageEl = document.createElement('p');
                messageEl.textContent = message;
                Object.assign(messageEl.style, {
                    margin: '0 0 20px 0', lineHeight: '1.4', whiteSpace: 'pre-wrap'
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
                modal.className = `${classPrefix}-overlay`;
                modal.style.zIndex = '999999';

                const dialog = document.createElement('div');
                dialog.className = `${classPrefix}-panel`;
                Object.assign(dialog.style, { maxWidth: '400px', width: '90%', maxHeight: '80vh', overflow: 'auto' });

                const titleEl = document.createElement('h3');
                titleEl.textContent = title;
                Object.assign(titleEl.style, {
                    margin: '0 0 15px 0', fontSize: '1.1em', fontWeight: 'bold'
                });
                dialog.appendChild(titleEl);

                const messageEl = document.createElement('p');
                messageEl.textContent = message;
                Object.assign(messageEl.style, {
                    margin: '0 0 10px 0', lineHeight: '1.4', whiteSpace: 'pre-wrap'
                });
                dialog.appendChild(messageEl);

                const input = document.createElement('input');
                input.type = 'text';
                input.value = defaultValue || '';
                Object.assign(input.style, { width: '100%', marginBottom: '20px' });
                styleInputField(input);
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
                };
                buttonContainer.appendChild(cancelButton);

                const confirmButton = document.createElement('button');
                confirmButton.textContent = options.text.buttons.confirm || '确定';
                styleButton(confirmButton, "#4CAF50", "#45A049");
                confirmButton.onclick = () => {
                    const val = input.value;
                    document.body.removeChild(modal);
                    if (onConfirm) onConfirm(val);
                };
                buttonContainer.appendChild(confirmButton);

                dialog.appendChild(buttonContainer);
                modal.appendChild(dialog);
                document.body.appendChild(modal);
                input.focus();
                input.select();
            }

            /* ------------------------------ Layout ----------------------------- */

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
                        if (entry.target === container) {
                            const newCompactMode = shouldUseCompactMode(container);
                            if (newCompactMode !== state.isCompactMode) {
                                state.isCompactMode = newCompactMode;
                                callback(state.isCompactMode);
                            }
                        }
                    }
                }, 200));

                try { resizeObserver.observe(container); } catch {}

                return () => {
                    try { resizeObserver.disconnect(); } catch {}
                };
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

            return Object.freeze({
                theme: Object.freeze({
                    addThemeChangeListener,
                    removeThemeChangeListener,
                    setupDarkModeObserver,
                    detectInitialDarkMode,
                    applyThemeCssVariables
                }),
                colors: Object.freeze({
                    getPrimaryColor,
                    getOverlayBackgroundColor,
                    getPanelBackgroundColor,
                    getInputBackgroundColor,
                    getTextColor,
                    getBorderColor,
                    getTableHeaderBackground,
                    getHoverColor
                }),
                style: Object.freeze({
                    styleTableHeader,
                    styleTableCell,
                    styleButton,
                    styleTransparentButton,
                    styleInputField
                }),
                dialogs: Object.freeze({
                    showAlert,
                    showConfirmDialog,
                    showPromptDialog
                }),
                layout: Object.freeze({
                    enableScrollLock,
                    disableScrollLock,
                    autoResizeTextarea,
                    createResponsiveListener,
                    shouldUseCompactMode
                }),
                utils: Object.freeze({
                    debounce
                })
            });
        }
/* -------------------------------------------------------------------------- *
 * Module 04 · Keyboard handling (hotkey parsing, matching, action dispatch)
 * -------------------------------------------------------------------------- */

        function createKeyboardLayer(ctx = {}) {
            const { state, core, options } = ctx;
            const consoleTag = options?.consoleTag || "[ShortcutEngine]";
            const keyboardOptions = (options?.keyboard && typeof options.keyboard === "object") ? options.keyboard : {};
            const allowedInputTags = Array.isArray(keyboardOptions.allowedInputTags)
                ? keyboardOptions.allowedInputTags.map((t) => String(t || "").toUpperCase()).filter(Boolean)
                : ['INPUT', 'TEXTAREA', 'SELECT'];
            const allowedInputTagSet = new Set(allowedInputTags);
            const allowContentEditable = keyboardOptions.allowContentEditable !== false;
            const blockUnlistedModifierShortcutsInInputsWhenPanelOpen =
                keyboardOptions.blockUnlistedModifierShortcutsInInputsWhenPanelOpen !== false;
            const CAPTURE_DATASET_KEY = "shortcutCapture";
            const CAPTURE_DATASET_VALUE = "1";

            function isHotkeyCaptureElement(element) {
                return !!(element && element.dataset && element.dataset[CAPTURE_DATASET_KEY] === CAPTURE_DATASET_VALUE);
            }

            function isInHotkeyCaptureMode(eventTarget = null) {
                const element = eventTarget || document.activeElement;
                return isHotkeyCaptureElement(element);
            }

            function isInAllowedInputElement(eventTarget = null) {
                const activeEl = eventTarget || document.activeElement;
                if (!activeEl) return false;
                const isAllowedTag = allowedInputTagSet.has(activeEl.tagName);
                const isContentEditable = allowContentEditable && !!activeEl.isContentEditable;
                const isHotkeyCapturer = isInHotkeyCaptureMode(activeEl);
                return (isAllowedTag || isContentEditable) && !isHotkeyCapturer;
            }

            function defaultIsAllowedShortcut(e) {
                const key = String(e.key || "").toLowerCase();
                const code = String(e.code || "");

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

            function isAllowedShortcutWhenPanelOpen(e) {
                const custom = keyboardOptions.isAllowedShortcutWhenPanelOpen;
                if (typeof custom === "function") {
                    try {
                        const result = custom(e, {
                            options,
                            state,
                            core,
                            defaultIsAllowedShortcut
                        });
                        if (typeof result === "boolean") return result;
                    } catch (err) {
                        console.warn(`${consoleTag} keyboard.isAllowedShortcutWhenPanelOpen error`, err);
                    }
                }
                return defaultIsAllowedShortcut(e);
            }

            function onKeydown(e) {
                if (!e) return;

                if (state.isSettingsPanelOpen) {
                    if (isInHotkeyCaptureMode(e.target)) {
                        return;
                    }
                    if (isAllowedShortcutWhenPanelOpen(e)) {
                        return;
                    }
                    if (isInAllowedInputElement(e.target)) {
                        if (blockUnlistedModifierShortcutsInInputsWhenPanelOpen && (e.ctrlKey || e.altKey || e.metaKey)) {
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
                const tagName = target && target.tagName ? target.tagName : '';
                const isInput = tagName === 'INPUT' || tagName === 'TEXTAREA' || !!target?.isContentEditable;
                const isModifierHeavy = e.ctrlKey || e.altKey || e.metaKey;
                if (isInput && !isModifierHeavy) {
                    if (!(e.key === 'Escape' && e.shiftKey)) {
                        return;
                    }
                }

                const mainKey = core?.hotkeys?.getMainKeyFromEvent ? core.hotkeys.getMainKeyFromEvent(e) : "";
                if (!core?.hotkeys?.isAllowedMainKey || !core.hotkeys.isAllowedMainKey(mainKey)) return;

                const combined = core?.hotkeys?.fromEvent ? core.hotkeys.fromEvent(e) : "";
                if (!combined) return;

                const item = core.getShortcutByHotkeyNorm(combined);
                if (item) {
                    e.preventDefault();
                    e.stopPropagation();
                    core.executeShortcutAction(item, e);
                }
            }

            function init() {
                window.addEventListener("keydown", onKeydown, true);
            }

            function destroy() {
                window.removeEventListener("keydown", onKeydown, true);
            }

            return Object.freeze({ init, destroy, onKeydown });
        }
/* -------------------------------------------------------------------------- *
 * Module 05 · Settings UI (panel, editor dialog, filters, drag & drop)
 * -------------------------------------------------------------------------- */

	        function createSettingsPanelLayer(ctx = {}) {
            const {
                options,
                state,
                core,
                uiShared,
                idPrefix,
                cssPrefix,
                ids,
                classes,
                URL_METHODS,
                getUrlMethodDisplayText,
                setIconImage,
                safeGMGet,
                safeGMSet,
                panelFilter,
                debounce
            } = ctx;
            const { theme, colors, style, dialogs, layout } = uiShared;
            const { addThemeChangeListener, removeThemeChangeListener, detectInitialDarkMode } = theme;
            const {
                getPrimaryColor,
                getOverlayBackgroundColor,
                getPanelBackgroundColor,
                getInputBackgroundColor,
                getTextColor,
                getBorderColor,
                getTableHeaderBackground,
                getHoverColor
            } = colors;
            const { styleTableHeader, styleTableCell, styleButton, styleTransparentButton, styleInputField } = style;
            const { showAlert, showConfirmDialog, showPromptDialog } = dialogs;
	            const { enableScrollLock, disableScrollLock, createResponsiveListener, shouldUseCompactMode, autoResizeTextarea } = layout;
	            const normalizeHotkey = core.normalizeHotkey;
                const matchesSearchQuery = panelFilter?.matchesSearchQuery || panelMatchesSearchQuery;
                const normalizeActionType = panelFilter?.normalizeActionType || panelNormalizeActionType;

	            function getShortcutStats() {
	                const list = core.getShortcuts();
	                const query = String(state.searchQuery || "").trim().toLowerCase();
	                const stats = { total: 0, byType: Object.create(null) };
	                list.forEach(shortcut => {
	                    if (!matchesSearchQuery(shortcut, query)) return;
	                    stats.total++;
                        const type = normalizeActionType(shortcut);
                        stats.byType[type] = (stats.byType[type] || 0) + 1;
	                });
	                return stats;
	            }

	            function filterShortcutsByType(type) {
	                const list = core.getShortcuts();
	                const query = String(state.searchQuery || "").trim().toLowerCase();
	                const filtered = [];
	                for (let i = 0; i < list.length; i++) {
	                    const shortcut = list[i];
	                    if (!matchesSearchQuery(shortcut, query)) continue;
                        const shortcutType = normalizeActionType(shortcut);
	                    if (type === 'all' || shortcutType === type) {
	                        filtered.push({ item: shortcut, index: i });
	                    }
	                }
	                return filtered;
	            }

            const ACTION_TYPE_COLOR_MAP = Object.freeze({
                all: "#0066cc",
                url: "#4CAF50",
                selector: "#FF9800",
                simulate: "#9C27B0",
                custom: "#607D8B"
            });

            const ACTION_TYPE_COLOR_PALETTE = Object.freeze([
                "#009688",
                "#3F51B5",
                "#E91E63",
                "#795548",
                "#673AB7",
                "#00BCD4",
                "#8BC34A",
                "#FFC107",
                "#CDDC39",
                "#FF5722"
            ]);

            function hashStringToNumber(input) {
                const str = String(input || "");
                let hash = 0;
                for (let i = 0; i < str.length; i++) {
                    hash = ((hash << 5) - hash + str.charCodeAt(i)) | 0;
                }
                return Math.abs(hash);
            }

            function getStableTypeColor(type) {
                const idx = hashStringToNumber(type) % ACTION_TYPE_COLOR_PALETTE.length;
                return ACTION_TYPE_COLOR_PALETTE[idx] || ACTION_TYPE_COLOR_MAP.all;
            }

            function getButtonColor(filterType) {
                const type = String(filterType || "").trim();
                if (!type) return ACTION_TYPE_COLOR_MAP.all;
                if (ACTION_TYPE_COLOR_MAP[type]) return ACTION_TYPE_COLOR_MAP[type];
                return getStableTypeColor(type);
            }

            function normalizeHexColor(value) {
                const v = String(value || "").trim();
                return /^#[0-9a-fA-F]{6}$/.test(v) ? v : "";
            }

            function getActionTypeMeta(actionType) {
                const type = String(actionType || "").trim() || "unknown";
                const entry = (typeof core?.actions?.get === "function") ? core.actions.get(type) : null;
                const meta = entry && entry.meta && typeof entry.meta === "object" ? entry.meta : null;

                const labelRaw = meta && typeof meta.label === "string" ? meta.label.trim() : "";
                const unknownLabel = options?.text?.actionTypes?.unknownLabel || "未知";
                const label = labelRaw || (type === "unknown" ? unknownLabel : type);

                const shortLabelRaw = meta && typeof meta.shortLabel === "string" ? meta.shortLabel.trim() : "";
                let shortLabel = shortLabelRaw;
                if (!shortLabel) {
                    if (type === "url") shortLabel = options?.text?.actionTypes?.urlShortLabel || "URL";
                    else if (type === "selector") shortLabel = options?.text?.actionTypes?.selectorShortLabel || "点击";
                    else if (type === "simulate") shortLabel = options?.text?.actionTypes?.simulateShortLabel || "按键";
                    else if (type === "custom") shortLabel = options?.text?.actionTypes?.customShortLabel || "自定义";
                    else shortLabel = label.length > 4 ? label.slice(0, 4) : label;
                }

                const color = normalizeHexColor(meta?.color) || getButtonColor(type);

                const builtin = (meta && typeof meta.builtin === "boolean")
                    ? meta.builtin
                    : ["url", "selector", "simulate", "custom"].includes(type);

                return { type, label, shortLabel, color, builtin };
            }

            function getShortcutTargetText(item) {
                if (!item) return "-";
                if (item.actionType === "url") return item.url || "-";
                if (item.actionType === "selector") return item.selector || "-";
                if (item.actionType === "simulate") return item.simulateKeys || "-";
                if (item.actionType === "custom") return item.customAction || "-";
                const data = item.data && typeof item.data === "object" ? item.data : null;
                if (data && Object.keys(data).length > 0) {
                    try {
                        const json = JSON.stringify(data);
                        if (json.length <= 180) return json;
                        return json.slice(0, 177) + "...";
                    } catch {}
                }
                return "-";
            }

            function updateFilterButtonsState() {
                const buttons = document.querySelectorAll(`.${classes.filterButton}`);
                buttons.forEach(button => {
                    const filterType = button.dataset.filterType;
                    const isActive = state.currentFilter === filterType;
                    const color = getButtonColor(filterType);
                    button.dataset.active = isActive ? "1" : "0";
                    try {
                        const prefix = String(cssPrefix || "").trim();
                        if (prefix) button.style.setProperty(`--${prefix}-filter-color`, color);
                    } catch {}
                });
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

            function createFilterButton(label, count, color, filterType) {
	                const button = document.createElement("button");
	                button.className = classes.filterButton;
	                button.dataset.filterType = filterType;
	                button.type = "button";
	                const isActive = state.currentFilter === filterType;
                    button.dataset.active = isActive ? "1" : "0";
                    try {
                        const prefix = String(cssPrefix || "").trim();
                        if (prefix) button.style.setProperty(`--${prefix}-filter-color`, color);
                    } catch {}

                    const labelSpan = document.createElement("span");
                    labelSpan.className = classes.filterLabel;
                    labelSpan.textContent = String(label ?? "");

                    const countSpan = document.createElement("span");
                    countSpan.className = classes.filterCount;
                    countSpan.textContent = String(count ?? "");

                    button.appendChild(labelSpan);
                    button.appendChild(countSpan);

                button.addEventListener('click', () => {
                    setFilter(filterType);
                });
                return button;
            }

		            function createStatsDisplay() {
		                const stats = getShortcutStats();
		                const container = document.createElement("div");
		                container.id = ids.stats;
		                Object.assign(container.style, {
		                    position: "relative",
		                    flex: "0 1 auto",
		                    minWidth: "0"
		                });

		                const SCROLLBAR_HEIGHT_PX = 18;
		                const scrollbar = document.createElement("div");
		                Object.assign(scrollbar.style, {
		                    position: "absolute",
		                    left: "0",
		                    right: "0",
		                    top: `-${SCROLLBAR_HEIGHT_PX}px`,
		                    height: `${SCROLLBAR_HEIGHT_PX}px`,
		                    zIndex: "1",
		                    overflowX: "auto",
		                    overflowY: "hidden",
		                    WebkitOverflowScrolling: "touch",
		                    display: "none"
		                });

		                const scrollbarSpacer = document.createElement("div");
		                Object.assign(scrollbarSpacer.style, {
		                    width: "0px",
		                    height: "1px"
		                });
		                scrollbar.appendChild(scrollbarSpacer);

		                const viewport = document.createElement("div");
		                Object.assign(viewport.style, {
		                    width: "100%",
		                    boxSizing: "border-box",
		                    padding: "2px 0",
		                    overflowX: "hidden",
		                    overflowY: "hidden"
		                });

		                const row = document.createElement("div");
		                Object.assign(row.style, {
		                    display: "inline-flex",
		                    alignItems: "center",
		                    gap: "8px",
		                    flexWrap: "nowrap",
		                    willChange: "transform"
		                });

                        const byType = stats?.byType && typeof stats.byType === "object" ? stats.byType : {};
                        const presentTypes = Object.keys(byType).filter((type) => type && byType[type] > 0);
                        const builtinOrder = Array.isArray(core?.actions?.builtins)
                            ? core.actions.builtins.slice()
                            : ["url", "selector", "simulate", "custom"];

		                const filterButtons = [
		                    { type: 'all', label: options.text.stats.total || "总计", count: stats.total, color: getButtonColor("all") }
		                ];

                        builtinOrder.forEach((type) => {
                            const count = byType[type] || 0;
                            if (!count) return;
                            const meta = getActionTypeMeta(type);
                            filterButtons.push({ type, label: meta.label, count, color: meta.color });
                        });

                        const builtinSet = new Set(builtinOrder);
                        const extraButtons = presentTypes
                            .filter((type) => !builtinSet.has(type))
                            .map((type) => {
                                const meta = getActionTypeMeta(type);
                                return { type, label: meta.label, count: byType[type], color: meta.color };
                            })
                            .sort((a, b) => String(a.label).localeCompare(String(b.label), "zh", { numeric: true }));

                        extraButtons.forEach((btn) => filterButtons.push(btn));
		                filterButtons.forEach(buttonData => {
		                    if (buttonData.type !== 'all' && buttonData.count === 0) return;
		                    const button = createFilterButton(buttonData.label, buttonData.count, buttonData.color, buttonData.type);
		                    row.appendChild(button);
		                });

		                const sync = () => {
		                    if (!container.isConnected) return;
		                    const viewportWidth = viewport.clientWidth || 0;
		                    const contentWidth = row.scrollWidth || 0;
		                    const hasOverflow = contentWidth > viewportWidth + 1;
		                    scrollbar.style.display = hasOverflow ? "block" : "none";
		                    if (!hasOverflow) {
		                        scrollbar.scrollLeft = 0;
		                        scrollbarSpacer.style.width = "0px";
		                        row.style.transform = "";
		                        return;
		                    }
		                    scrollbarSpacer.style.width = `${contentWidth}px`;
		                    const maxScroll = Math.max(0, contentWidth - viewportWidth);
		                    if (scrollbar.scrollLeft > maxScroll) scrollbar.scrollLeft = maxScroll;
		                    row.style.transform = `translateX(${-scrollbar.scrollLeft}px)`;
		                };

		                const scheduleSync = debounce(() => {
		                    requestAnimationFrame(() => {
		                        try { sync(); } catch {}
		                    });
		                }, 60);

		                scrollbar.addEventListener("scroll", () => {
		                    requestAnimationFrame(() => {
		                        row.style.transform = `translateX(${-scrollbar.scrollLeft}px)`;
		                    });
		                });

		                viewport.addEventListener(
		                    "wheel",
		                    (e) => {
		                        if (scrollbar.style.display === "none") return;
		                        const deltaX = Number(e.deltaX || 0);
		                        const deltaY = Number(e.deltaY || 0);
		                        const delta = Math.abs(deltaX) > 0 ? deltaX : (e.shiftKey ? deltaY : 0);
		                        if (!delta) return;
		                        e.preventDefault();
		                        scrollbar.scrollLeft += delta;
		                    },
		                    { passive: false }
		                );

		                let cleanup = () => {};
		                if (window.ResizeObserver) {
		                    const ro = new ResizeObserver(() => scheduleSync());
		                    ro.observe(container);
		                    ro.observe(row);
		                    cleanup = () => {
		                        try { ro.disconnect(); } catch {}
		                    };
		                } else {
		                    window.addEventListener("resize", scheduleSync);
		                    cleanup = () => {
		                        try { window.removeEventListener("resize", scheduleSync); } catch {}
		                    };
		                }
		                container.__shortcutTemplateStatsCleanup = cleanup;

		                viewport.appendChild(row);
		                container.appendChild(scrollbar);
		                container.appendChild(viewport);

		                requestAnimationFrame(() => {
		                    try { sync(); } catch {}
		                });
		                return container;
		            }

	            function updateStatsDisplay() {
	                const existingStats = document.getElementById(ids.stats);
	                if (existingStats) {
	                    if (typeof existingStats.__shortcutTemplateStatsCleanup === "function") {
	                        try { existingStats.__shortcutTemplateStatsCleanup(); } catch {}
	                    }
	                    const newStats = createStatsDisplay();
	                    existingStats.parentNode.replaceChild(newStats, existingStats);
	                }
	            }

	            /* ------------------------------------------------------------------
	             * 设置面板
	             * ------------------------------------------------------------------ */

	            function closeSettingsPanel() {
	                if (typeof state.currentPanelCloser === "function") {
	                    state.currentPanelCloser();
	                    return;
	                }
	                if (state.currentPanelOverlay) {
	                    if (typeof state.currentEditCloser === "function") {
	                        try { state.currentEditCloser(); } catch {}
	                    }
	                    try { state.currentPanelOverlay.remove(); } catch {}
	                    state.currentPanelOverlay = null;
	                    state.isSettingsPanelOpen = false;
	                    disableScrollLock();
	                    if (state.destroyResponsiveListener) {
	                        state.destroyResponsiveListener();
	                        state.destroyResponsiveListener = null;
	                    }
	                }
	            }

	        function openSettingsPanel() {
	            if (typeof state.currentPanelCloser === "function") {
	                closeSettingsPanel();
	                return;
	            }
	            if (state.currentPanelOverlay) {
	                try { state.currentPanelOverlay.remove(); } catch {}
	                state.currentPanelOverlay = null;
	            }
	            state.isSettingsPanelOpen = true;
	            enableScrollLock();

            const overlay = document.createElement("div");
            overlay.id = ids.settingsOverlay;
            overlay.className = classes.overlay;
            overlay.style.zIndex = "99998";
            overlay.onclick = (e) => { if (e.target === overlay) closePanel(); };

            const panel = document.createElement("div");
            panel.id = ids.settingsPanel;
            panel.className = classes.panel;
            Object.assign(panel.style, {
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
		                justifyContent: "flex-start",
		                alignItems: "center",
		                marginBottom: "15px",
		                paddingBottom: "10px",
		                flexWrap: "nowrap",
		                gap: "10px",
		                minWidth: "0"
		            });

		            const leftSlot = document.createElement("div");
		            Object.assign(leftSlot.style, {
		                display: "flex",
		                alignItems: "center",
		                gap: "10px",
		                flex: "1 1 auto",
		                minWidth: "0"
		            });

			            const actionsContainer = document.createElement("div");
				            Object.assign(actionsContainer.style, {
				                display: "flex",
				                alignItems: "center",
				                justifyContent: "flex-end",
				                gap: "6px",
				                flex: "0 0 auto"
				            });

			            const title = document.createElement("h2");
			            title.textContent = options.panelTitle || '自定义快捷键';
			            Object.assign(title.style, {
			                margin: "0",
			                fontSize: "1.1em",
			                flex: "1 1 auto",
			                minWidth: "0",
			                overflow: "hidden",
			                textOverflow: "ellipsis",
			                whiteSpace: "nowrap"
			            });

		            const settingsBtn = document.createElement("button");
		            settingsBtn.type = "button";
		            settingsBtn.title = options.text.buttons.settings || "设置";
                    settingsBtn.setAttribute("aria-label", options.text.buttons.settings || "设置");
	            Object.assign(settingsBtn.style, {
	                width: "32px",
	                height: "32px",
	                display: "flex",
	                alignItems: "center",
	                justifyContent: "center",
	                padding: "0",
                    lineHeight: "1"
	            });
                    const settingsIcon = document.createElementNS("http://www.w3.org/2000/svg", "svg");
                    settingsIcon.setAttribute("viewBox", "0 0 24 24");
                    settingsIcon.setAttribute("fill", "none");
                    settingsIcon.setAttribute("aria-hidden", "true");
                    Object.assign(settingsIcon.style, {
                        width: "18px",
                        height: "18px",
                        display: "block",
                        pointerEvents: "none"
                    });
                    const iconStrokeAttrs = {
                        stroke: "currentColor",
                        "stroke-width": "1.8",
                        "stroke-linecap": "round",
                        "stroke-linejoin": "round"
                    };
                    const createIconNode = (tag, attrs = {}) => {
                        const node = document.createElementNS("http://www.w3.org/2000/svg", tag);
                        Object.entries(attrs).forEach(([name, value]) => node.setAttribute(name, String(value)));
                        return node;
                    };
                    settingsIcon.appendChild(createIconNode("circle", { cx: "12", cy: "12", r: "5.2", ...iconStrokeAttrs }));
                    settingsIcon.appendChild(createIconNode("circle", { cx: "12", cy: "12", r: "1.8", fill: "currentColor" }));
                    [
                        "M12 2.75V5.1",
                        "M12 18.9v2.35",
                        "M2.75 12H5.1",
                        "M18.9 12h2.35",
                        "M5.46 5.46l1.66 1.66",
                        "M16.88 16.88l1.66 1.66",
                        "M18.54 5.46l-1.66 1.66",
                        "M7.12 16.88l-1.66 1.66"
                    ].forEach((d) => {
                        settingsIcon.appendChild(createIconNode("path", { d, ...iconStrokeAttrs }));
                    });
                    settingsBtn.replaceChildren(settingsIcon);

			            const searchWidget = document.createElement("div");
			            Object.assign(searchWidget.style, {
			                display: "flex",
			                alignItems: "center",
			                width: "32px",
			                flex: "0 0 32px",
			                height: "32px",
			                maxWidth: "100%",
			                overflow: "hidden",
			                boxSizing: "border-box",
			                transition: "width 0.2s ease"
	            });

	            const searchIconBtn = document.createElement("button");
	            searchIconBtn.type = "button";
	            searchIconBtn.title = options.text.hints.searchPlaceholder || "搜索";
	            searchIconBtn.textContent = "🔍";
	            Object.assign(searchIconBtn.style, {
	                width: "32px",
	                height: "32px",
	                display: "flex",
	                alignItems: "center",
	                justifyContent: "center",
	                fontSize: "16px",
	                lineHeight: "1",
	                border: "none",
	                backgroundColor: "transparent",
	                padding: "0",
	                flex: "0 0 32px"
	            });

	            const searchInput = document.createElement("input");
	            searchInput.type = "text";
	            searchInput.placeholder = options.text.hints.searchPlaceholder || "搜索名称/目标";
	            searchInput.value = String(state.searchQuery || "");
	            Object.assign(searchInput.style, {
	                flex: "1 1 auto",
	                minWidth: "0",
	                height: "32px",
	                border: "none",
	                outline: "none",
	                backgroundColor: "transparent",
	                padding: "0 4px",
	                fontSize: "14px",
	                display: "none"
	            });

		            const clearSearchBtn = document.createElement("button");
		            clearSearchBtn.type = "button";
		            clearSearchBtn.title = options.text.buttons.clear || "清除";
		            clearSearchBtn.textContent = "×";
		        Object.assign(clearSearchBtn.style, {
		            width: "32px",
		            height: "32px",
		            display: "none",
		            alignItems: "center",
		            justifyContent: "center",
		            fontSize: "18px",
		            lineHeight: "1",
		            border: "none",
		            backgroundColor: "transparent",
		            padding: "0",
		            flex: "0 0 32px"
		        });

		            const searchDivider = document.createElement("div");
		            Object.assign(searchDivider.style, {
		                width: "1px",
		                height: "60%",
		                alignSelf: "center",
		                flex: "0 0 1px",
		                opacity: "0.6",
		                display: "none"
		            });

		            let isSearchExpanded = !!String(state.searchQuery || "").trim();

		            const refreshSearchWidgetStyle = (isDark = state.isDarkMode) => {
		                const hasValue = !!String(searchInput.value || "").trim();
		                const active = isSearchExpanded || hasValue;
		                searchWidget.style.borderColor = active ? getPrimaryColor() : getBorderColor(isDark);
		            searchIconBtn.style.color = active ? getPrimaryColor() : getTextColor(isDark);
		                searchDivider.style.backgroundColor = active ? getPrimaryColor() : getBorderColor(isDark);
		        };

	            const updateClearSearchVisibility = () => {
	                const hasValue = !!String(searchInput.value || "").trim();
	                clearSearchBtn.style.display = isSearchExpanded && hasValue ? "flex" : "none";
	            };

		            const setSearchExpanded = (expanded, { focus = false } = {}) => {
		                isSearchExpanded = !!expanded;
		                title.style.display = isSearchExpanded ? "none" : "";
		                searchWidget.style.flex = isSearchExpanded ? "1 1 auto" : "0 0 32px";
		                searchWidget.style.width = isSearchExpanded ? "100%" : "32px";
		                searchInput.style.display = isSearchExpanded ? "block" : "none";
		                searchDivider.style.display = isSearchExpanded ? "block" : "none";
		                updateClearSearchVisibility();
		                refreshSearchWidgetStyle();
		                if (isSearchExpanded) {
		                    if (focus) {
			                        searchInput.focus();
			                        searchInput.select();
		                    }
	                    return;
	                }
	                if (focus || document.activeElement === searchInput) {
	                    searchIconBtn.focus();
	                }
	            };

			            const applySearchImmediate = () => {
			                state.searchQuery = searchInput.value.trim();
			                renderShortcutsList(state.isDarkMode);
			                updateStatsDisplay();
			            };

	            const applySearchDebounced = debounce(applySearchImmediate, 120);

	            searchInput.addEventListener("input", () => {
	                updateClearSearchVisibility();
	                refreshSearchWidgetStyle();
	                applySearchDebounced();
	            });
	            searchInput.addEventListener("keydown", (e) => {
	                if (e.key === "Escape") {
	                    e.preventDefault();
	                    if (String(searchInput.value || "").trim()) {
	                        searchInput.value = "";
	                        updateClearSearchVisibility();
	                        applySearchImmediate();
	                    } else {
	                        setSearchExpanded(false, { focus: true });
	                    }
	                }
	            });
	            clearSearchBtn.addEventListener("click", () => {
	                searchInput.value = "";
	                updateClearSearchVisibility();
	                refreshSearchWidgetStyle();
	                applySearchImmediate();
	                searchInput.focus();
	            });
	            searchIconBtn.addEventListener("click", () => {
	                if (!isSearchExpanded) {
	                    setSearchExpanded(true, { focus: true });
	                    return;
	                }
	                if (!String(searchInput.value || "").trim()) {
	                    setSearchExpanded(false, { focus: true });
	                    return;
	                }
	                searchInput.focus();
	                searchInput.select();
	            });
	            searchInput.addEventListener("focus", () => {
	                if (!isSearchExpanded) {
	                    setSearchExpanded(true, { focus: true });
	                    return;
	                }
	                searchWidget.style.borderColor = getPrimaryColor();
	                searchWidget.style.boxShadow = `0 0 0 1px ${getPrimaryColor()}`;
	            });
	            searchInput.addEventListener("blur", () => {
	                searchWidget.style.boxShadow = "none";
	                refreshSearchWidgetStyle();
	            });

		            updateClearSearchVisibility();
		            setSearchExpanded(isSearchExpanded);

		            const statsContainer = createStatsDisplay();
		
		            searchWidget.appendChild(searchInput);
		            searchWidget.appendChild(clearSearchBtn);
		            searchWidget.appendChild(searchDivider);
		            searchWidget.appendChild(searchIconBtn);

		            leftSlot.appendChild(title);
		            leftSlot.appendChild(searchWidget);
		            headerContainer.appendChild(leftSlot);
		            headerContainer.appendChild(statsContainer);

		            actionsContainer.appendChild(settingsBtn);
		            headerContainer.appendChild(actionsContainer);

	            panel.appendChild(headerContainer);

	            const listContainer = document.createElement("div");
		            Object.assign(listContainer.style, {
		                maxHeight: "calc(80vh - 150px)", overflowY: "auto", marginBottom: "15px",
		                width: "100%", overflowX: "hidden"
		            });
		            panel.appendChild(listContainer);

                    const dnd = panelCreateDragAndDropController(ctx, { renderShortcutsList, updateStatsDisplay });

			            function openExportDialog() {
			                panelOpenExportDialog(ctx, { overlay });
			            }

		            function openImportDialog() {
		                panelOpenImportDialog(ctx, { overlay, renderShortcutsList, updateStatsDisplay });
		            }

	            function resetToDefaults() {
	                const defaults = Array.isArray(options.defaultShortcuts) ? options.defaultShortcuts : [];
	                const normalized = defaults.map((sc) => core.normalizeShortcut(sc));
	                core.setShortcuts(normalized, { persist: false });
	                state.currentFilter = "all";
	                state.searchQuery = "";
	                searchInput.value = "";
	                updateClearSearchVisibility();
	                setSearchExpanded(false);
	                renderShortcutsList(state.isDarkMode);
	                updateStatsDisplay();
	            }

	            const bottomBar = document.createElement("div");
	            Object.assign(bottomBar.style, {
	                display: "flex", justifyContent: "space-between", alignItems: "center",
	                marginTop: "10px", flexWrap: "wrap", gap: "10px"
	            });

	            const leftBar = document.createElement("div");
	            Object.assign(leftBar.style, {
	                display: "flex",
	                alignItems: "center",
	                gap: "10px",
	                flexWrap: "wrap"
	            });
	            bottomBar.appendChild(leftBar);

	            const addBtn = document.createElement("button");
	            addBtn.textContent = options.text.buttons.addShortcut || "添加新快捷键";
	            addBtn.onclick = () => { editShortcut(); };
	            leftBar.appendChild(addBtn);

	            let settingsMenuOverlay = null;
	            let settingsMenuKeydownHandler = null;

	            function closeSettingsMenu({ restoreFocus = true } = {}) {
	                if (!settingsMenuOverlay) return;
	                if (typeof settingsMenuKeydownHandler === "function") {
	                    document.removeEventListener("keydown", settingsMenuKeydownHandler, true);
	                }
	                try { settingsMenuOverlay.remove(); } catch {}
	                settingsMenuOverlay = null;
	                settingsMenuKeydownHandler = null;
	                if (restoreFocus) {
	                    try { settingsBtn.focus(); } catch {}
	                }
	            }

	            function openSettingsMenu() {
	                if (settingsMenuOverlay) {
	                    closeSettingsMenu();
	                    return;
	                }

	                const modal = document.createElement("div");
	                settingsMenuOverlay = modal;
                    modal.className = classes?.overlay || "";
                    modal.style.zIndex = "999999";
	                modal.onclick = (e) => {
	                    if (e.target === modal) closeSettingsMenu();
	                };

	                const dialog = document.createElement("div");
                    dialog.className = classes?.panel || "";
	                Object.assign(dialog.style, {
	                    width: "100%",
	                    maxWidth: "420px",
	                    borderRadius: "10px",
	                    padding: "18px",
	                    boxShadow: "0 4px 12px rgba(0,0,0,0.3)",
	                    display: "flex",
	                    flexDirection: "column",
	                    gap: "12px"
	                });
	                dialog.onclick = (e) => e.stopPropagation();

	                const head = document.createElement("div");
	                Object.assign(head.style, {
	                    display: "flex",
	                    alignItems: "center",
	                    justifyContent: "space-between",
	                    gap: "10px"
	                });

	                const titleEl = document.createElement("h3");
	                titleEl.textContent = options.text.buttons.settings || "设置";
	                Object.assign(titleEl.style, {
	                    margin: "0",
	                    fontSize: "1.05em",
	                    fontWeight: "bold"
	                });
	                head.appendChild(titleEl);

	                const closeBtn = document.createElement("button");
	                closeBtn.type = "button";
	                closeBtn.title = options.text.buttons.close || "关闭";
	                closeBtn.textContent = "×";
	                Object.assign(closeBtn.style, {
	                    fontSize: "20px",
	                    lineHeight: "1"
	                });
	                closeBtn.onclick = () => closeSettingsMenu();
	                head.appendChild(closeBtn);

	                dialog.appendChild(head);
                    const p = String(cssPrefix || idPrefix || "shortcut").trim() || "shortcut";
                    styleTransparentButton(closeBtn, `var(--${p}-text)`, `var(--${p}-hover-bg)`);
                    closeBtn.style.padding = "6px 8px";
                    closeBtn.style.borderRadius = "6px";

                    const themeRow = document.createElement("div");
                    Object.assign(themeRow.style, {
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        gap: "12px"
                    });

                    const themeLabel = document.createElement("div");
                    themeLabel.textContent = options?.text?.panel?.themeModeLabel || "面板主题";
                    Object.assign(themeLabel.style, {
                        fontSize: "14px",
                        fontWeight: "bold"
                    });

                    const themeSelect = document.createElement("select");
                    Object.assign(themeSelect.style, {
                        flex: "0 0 200px",
                        maxWidth: "100%"
                    });
                    styleInputField(themeSelect);

                    const persistUiPrefs = (patch = {}) => {
                        const key = options?.storageKeys?.uiPrefs;
                        if (!key) return;
                        const raw = safeGMGet(key, null);
                        const prev = (raw && typeof raw === "object" && !Array.isArray(raw)) ? raw : {};
                        safeGMSet(key, { ...prev, ...patch });
                    };

                    const addThemeOption = (value, label) => {
                        const opt = document.createElement("option");
                        opt.value = value;
                        opt.textContent = label;
                        themeSelect.appendChild(opt);
                    };

                    addThemeOption("auto", options?.text?.panel?.themeModeAuto || "自动(跟随页面)");
                    addThemeOption("light", options?.text?.panel?.themeModeLight || "普通");
                    addThemeOption("dark", options?.text?.panel?.themeModeDark || "黑暗");

                    themeSelect.value = String(state.themeMode || "auto");
                    themeSelect.onchange = () => {
                        state.themeMode = String(themeSelect.value || "auto");
                        persistUiPrefs({ themeMode: state.themeMode });
                        detectInitialDarkMode();
                    };

                    themeRow.appendChild(themeLabel);
                    themeRow.appendChild(themeSelect);
                    dialog.appendChild(themeRow);

	                const actions = document.createElement("div");
	                Object.assign(actions.style, {
	                    display: "flex",
	                    flexDirection: "row",
                        alignItems: "stretch",
                        flexWrap: "nowrap",
	                    gap: "10px"
	                });

	                const resetActionBtn = document.createElement("button");
	                resetActionBtn.textContent = options.text.buttons.reset || "重置默认";
	                resetActionBtn.onclick = () => {
	                    closeSettingsMenu({ restoreFocus: false });
	                    showConfirmDialog(options?.text?.panel?.resetConfirm || "确定重置为默认配置吗？(需要点击“保存并关闭”才会写入存储)", () => {
	                        resetToDefaults();
	                    });
	                };
	                actions.appendChild(resetActionBtn);
                    styleButton(resetActionBtn, "#9E9E9E", "#757575");

	                const importActionBtn = document.createElement("button");
	                importActionBtn.textContent = options.text.buttons.import || "导入";
	                importActionBtn.onclick = () => {
	                    closeSettingsMenu({ restoreFocus: false });
	                    openImportDialog();
	                };
	                actions.appendChild(importActionBtn);
                    styleButton(importActionBtn, "#2196F3", "#1e88e5");

	                const exportActionBtn = document.createElement("button");
	                exportActionBtn.textContent = options.text.buttons.export || "导出";
	                exportActionBtn.onclick = () => {
	                    closeSettingsMenu({ restoreFocus: false });
	                    openExportDialog();
	                };
	                actions.appendChild(exportActionBtn);
                    styleButton(exportActionBtn, "#4CAF50", "#45A049");

                    [resetActionBtn, importActionBtn, exportActionBtn].forEach(btn => {
                        btn.style.flex = "1 1 0";
                        btn.style.minWidth = "0";
                    });

	                dialog.appendChild(actions);
	                modal.appendChild(dialog);
	                document.body.appendChild(modal);

	                settingsMenuKeydownHandler = (e) => {
	                    if (e.key === "Escape") {
	                        e.preventDefault();
	                        closeSettingsMenu();
	                    }
	                };
	                document.addEventListener("keydown", settingsMenuKeydownHandler, true);
	                closeBtn.focus();
	            }

	            settingsBtn.onclick = openSettingsMenu;

	            const saveBtn = document.createElement("button");
	            saveBtn.textContent = options.text.buttons.saveAndClose || "保存并关闭";
	            saveBtn.onclick = () => { core.persistShortcuts(); closePanel(); };
	            bottomBar.appendChild(saveBtn);

            panel.appendChild(bottomBar);
            overlay.appendChild(panel);
	            document.body.appendChild(overlay);
	            state.currentPanelOverlay = overlay;
	            state.currentPanelCloser = closePanel;
	
		            state.isCompactMode = shouldUseCompactMode(panel);

            panel.addEventListener(state.filterChangedEventName, () => {
                renderShortcutsList(state.isDarkMode);
            });

	            const updatePanelTheme = (isDark) => {
	                headerContainer.style.borderBottom = `1px solid ${getBorderColor(isDark)}`;
	                title.style.color = getTextColor(isDark);
	                styleButton(addBtn, "#FF9800", "#F57C00");
	                styleButton(saveBtn, "#4CAF50", "#45A049");
	                Object.assign(settingsBtn.style, {
	                    border: `1px solid ${getBorderColor(isDark)}`,
	                    borderRadius: "6px",
	                    backgroundColor: getInputBackgroundColor(isDark),
	                    color: getTextColor(isDark),
	                    cursor: "pointer",
	                    transition: "background-color 0.2s ease, border-color 0.2s ease"
	                });
	                settingsBtn.onmouseover = () => {
	                    settingsBtn.style.backgroundColor = getHoverColor(isDark);
	                    settingsBtn.style.borderColor = getPrimaryColor();
	                };
	                settingsBtn.onmouseout = () => {
	                    settingsBtn.style.backgroundColor = getInputBackgroundColor(isDark);
	                    settingsBtn.style.borderColor = getBorderColor(isDark);
	                };

	                Object.assign(searchWidget.style, {
	                    border: `1px solid ${getBorderColor(isDark)}`,
	                    borderRadius: "6px",
	                    backgroundColor: getInputBackgroundColor(isDark),
	                    color: getTextColor(isDark),
	                    transition: "width 0.2s ease, box-shadow 0.2s ease, border-color 0.2s ease, background-color 0.2s ease"
	                });
	                searchWidget.onmouseover = () => {
	                    if (document.activeElement === searchInput) return;
	                    searchWidget.style.backgroundColor = getHoverColor(isDark);
	                };
	                searchWidget.onmouseout = () => {
	                    if (document.activeElement === searchInput) return;
	                    searchWidget.style.backgroundColor = getInputBackgroundColor(isDark);
	                };

	                Object.assign(searchIconBtn.style, {
	                    color: getTextColor(isDark),
	                    cursor: "pointer",
	                    borderRadius: "6px",
	                    transition: "background-color 0.2s ease, color 0.2s ease"
	                });
	                searchIconBtn.onmouseover = () => {
	                    searchIconBtn.style.backgroundColor = getHoverColor(isDark);
	                };
	                searchIconBtn.onmouseout = () => {
	                    searchIconBtn.style.backgroundColor = "transparent";
	                };

	                Object.assign(searchInput.style, {
	                    color: getTextColor(isDark),
	                    caretColor: getPrimaryColor()
	                });

	                Object.assign(clearSearchBtn.style, {
	                    color: getTextColor(isDark),
	                    cursor: "pointer",
	                    borderRadius: "6px",
	                    transition: "background-color 0.2s ease, color 0.2s ease"
	                });
	                clearSearchBtn.onmouseover = () => {
	                    clearSearchBtn.style.backgroundColor = getHoverColor(isDark);
	                };
	                clearSearchBtn.onmouseout = () => {
	                    clearSearchBtn.style.backgroundColor = "transparent";
	                };

	                refreshSearchWidgetStyle(isDark);
	                renderShortcutsList(isDark);
	            };

            addThemeChangeListener(updatePanelTheme);
            updatePanelTheme(state.isDarkMode);

	            requestAnimationFrame(() => {
	                panel.style.opacity = "1";
	                panel.style.transform = "translateY(0)";
	                setTimeout(() => {
	                    if (!state.isSettingsPanelOpen) return;
	                    const destroyResponsiveListener = createResponsiveListener(panel, (compactMode) => {
	                        renderShortcutsList(state.isDarkMode, compactMode);
	                    });
		                    state.destroyResponsiveListener = () => {
		                        try { destroyResponsiveListener && destroyResponsiveListener(); } catch {}
		                    };
		                }, 100);
		            });

	            function renderShortcutsList(isDark = state.isDarkMode, forceCompactMode = null) {
	                const useCompactMode = forceCompactMode !== null ? forceCompactMode : shouldUseCompactMode(panel);
	                listContainer.replaceChildren();
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
                const tableHeaders = options?.text?.panel?.tableHeaders || {};
                const headers = [
                    { text: tableHeaders.icon || "图标", width: "60px", align: "center" },
                    { text: tableHeaders.name || "名称", width: "15%" },
                    { text: tableHeaders.type || "类型", width: "80px" },
                    { text: tableHeaders.target || "目标", width: "40%" },
                    { text: tableHeaders.hotkey || "快捷键", width: "15%" },
                    { text: tableHeaders.actions || "操作", width: "120px", align: "center" }
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

                filteredShortcuts.forEach(({ item, index }) => {
                    const row = createStandardTableRow(item, index, isDark);
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

                filteredShortcuts.forEach(({ item, index }) => {
                    const card = createCompactCard(item, index, isDark);
                    container.appendChild(card);
                });
                listContainer.appendChild(container);
            }

	            function createStandardTableRow(item, index, isDark) {
	                const row = document.createElement("tr");
	                dnd.setupDragAndDrop(row, item, index);

                const tdIcon = document.createElement("td");
                styleTableCell(tdIcon, isDark);
                tdIcon.style.textAlign = "center";
                const iconImg = document.createElement("img");
                Object.assign(iconImg.style, { width: "24px", height: "24px", objectFit: "contain", verticalAlign: "middle" });
                setIconImage(iconImg, item.icon, item.iconDark, item.iconAdaptive);
                tdIcon.appendChild(iconImg);

                const tdName = document.createElement("td");
                tdName.textContent = item.name;
                styleTableCell(tdName, isDark);

                const tdType = document.createElement("td");
                const typeMeta = getActionTypeMeta(item.actionType);
                tdType.textContent = typeMeta.label;
                tdType.title = typeMeta.type;
                Object.assign(tdType.style, { fontSize: "0.9em", opacity: "0.8" });
                styleTableCell(tdType, isDark);

                const tdTarget = document.createElement("td");
                const targetText = getShortcutTargetText(item);
                tdTarget.textContent = targetText;
                    if (typeMeta.builtin && item.actionType === 'url' && item.url) {
                    const methodText = (typeof getUrlMethodDisplayText === "function")
                        ? getUrlMethodDisplayText(item.urlMethod)
                        : (URL_METHODS?.[item.urlMethod]?.name || options?.text?.builtins?.unknownUrlMethod || "未知跳转方式");
                    tdTarget.title = `${methodText}:\n---\n${targetText}`;
                } else {
                    let titleText = targetText;
                    if (!typeMeta.builtin) {
                        try {
                            const data = item.data && typeof item.data === "object" ? item.data : null;
                            if (data && Object.keys(data).length > 0) {
                                titleText = JSON.stringify(data, null, 2);
                            }
                        } catch {}
                    }
                    tdTarget.title = titleText;
                }
                Object.assign(tdTarget.style, {
                    wordBreak: "break-all", maxWidth: "300px", overflow: "hidden",
                    textOverflow: "ellipsis", whiteSpace: "nowrap"
                });
                styleTableCell(tdTarget, isDark);

                const tdHotkey = document.createElement("td");
                tdHotkey.textContent = core?.hotkeys?.formatForDisplay ? (core.hotkeys.formatForDisplay(item.hotkey) || "") : (item.hotkey || "");
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

		                dnd.setupDragAndDrop(card, item, index);

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
                setIconImage(iconImg, item.icon, item.iconDark, item.iconAdaptive);
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
                const typeMeta = getActionTypeMeta(item.actionType);
                Object.assign(typeContainer.style, {
                    backgroundColor: typeMeta.color,
                    color: "white",
                    padding: "2px 6px",
                    borderRadius: "4px",
                    fontSize: "12px",
                    fontWeight: "bold",
                    whiteSpace: "nowrap"
                });
                typeContainer.textContent = typeMeta.shortLabel;
                typeContainer.title = typeMeta.label;

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
                const noHotkeyText = options?.text?.panel?.compact?.noHotkey || "无";
                hotkeyContainer.textContent = core?.hotkeys?.formatForDisplay
                    ? (core.hotkeys.formatForDisplay(item.hotkey) || noHotkeyText)
                    : (item.hotkey || noHotkeyText);

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

                const targetText = getShortcutTargetText(item);
                const displayTargetText = targetText === "-" ? (options?.text?.panel?.compact?.emptyTarget || "（无目标配置）") : targetText;
                secondRow.textContent = displayTargetText;
                if (typeMeta.builtin && item.actionType === 'url' && item.url) {
                    const methodText = (typeof getUrlMethodDisplayText === "function")
                        ? getUrlMethodDisplayText(item.urlMethod)
                        : (URL_METHODS?.[item.urlMethod]?.name || options?.text?.builtins?.unknownUrlMethod || "未知跳转方式");
                    secondRow.title = `${methodText}:\n---\n${displayTargetText}`;
                } else {
                    let titleText = displayTargetText;
                    if (!typeMeta.builtin) {
                        try {
                            const data = item.data && typeof item.data === "object" ? item.data : null;
                            if (data && Object.keys(data).length > 0) {
                                titleText = JSON.stringify(data, null, 2);
                            }
                        } catch {}
                    }
                    secondRow.title = titleText;
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
                    const tpl = options?.text?.panel?.confirmDeleteShortcut || "确定删除快捷键【{name}】吗?";
                    showConfirmDialog(tpl.replace("{name}", String(item.name ?? "")), () => {
                        core.mutateShortcuts((list) => { list.splice(index, 1); });
                        renderShortcutsList(state.isDarkMode);
                        updateStatsDisplay();
                    });
                };

                buttonContainer.appendChild(editButton);
                buttonContainer.appendChild(delButton);
                return buttonContainer;
            }

                    
		            function closePanel() {
		                closeSettingsMenu({ restoreFocus: false });
		                state.currentPanelCloser = null;
		                const statsEl = panel.querySelector(`#${ids.stats}`) || document.getElementById(ids.stats);
		                if (statsEl && typeof statsEl.__shortcutTemplateStatsCleanup === "function") {
		                    try { statsEl.__shortcutTemplateStatsCleanup(); } catch {}
		                }
		                if (typeof state.currentEditCloser === "function") {
		                    try { state.currentEditCloser(); } catch {}
		                }
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
                    panelOpenShortcutEditor(ctx, { item, index, renderShortcutsList, updateStatsDisplay });
	            }

}

	            return Object.freeze({ openSettingsPanel, closeSettingsPanel });
	        }
/* -------------------------------------------------------------------------- *
 * Module 05 · Panel Drag & Drop (reorder within current view)
 * -------------------------------------------------------------------------- */

	        function panelCreateDragAndDropController(ctx, { renderShortcutsList, updateStatsDisplay } = {}) {
            const { ids, classes, state, core, uiShared, options, panelFilter } = ctx;
            const { showAlert } = uiShared.dialogs;
            const matchesCurrentView = panelFilter?.matchesCurrentView || panelMatchesCurrentView;

            let draggingShortcutId = null;

            function reorderShortcutsInCurrentView(fromId, toId, { after = false } = {}) {
                const from = typeof fromId === "string" ? fromId.trim() : "";
                const to = typeof toId === "string" ? toId.trim() : "";
                if (!from || !to || from === to) return false;

                let changed = false;
                core.mutateShortcuts((list) => {
                    const indices = [];
                    const items = [];
                    for (let i = 0; i < list.length; i++) {
                        const sc = list[i];
                        if (matchesCurrentView(ctx, sc)) {
                            indices.push(i);
                            items.push(sc);
                        }
                    }

                    const fromPos = items.findIndex((sc) => sc && sc.id === from);
                    const toPos = items.findIndex((sc) => sc && sc.id === to);
                    if (fromPos < 0 || toPos < 0 || fromPos === toPos) return;

                    const moved = items.splice(fromPos, 1)[0];
                    let insertPos = toPos + (after ? 1 : 0);
                    if (fromPos < insertPos) insertPos -= 1;
                    if (insertPos < 0) insertPos = 0;
                    if (insertPos > items.length) insertPos = items.length;
                    items.splice(insertPos, 0, moved);

                    for (let i = 0; i < indices.length; i++) {
                        list[indices[i]] = items[i];
                    }
                    changed = true;
                });
                return changed;
            }

            function setupDragAndDrop(element, item, index) {
                const shortcutId = item && typeof item.id === "string" ? item.id : "";
                element.setAttribute("draggable", "true");
                element.style.cursor = "move";
                element.dataset.index = index;
                element.dataset.shortcutId = shortcutId;

                element.addEventListener("dragstart", (e) => {
                    draggingShortcutId = shortcutId || null;
                    try {
                        if (e.dataTransfer) {
                            e.dataTransfer.effectAllowed = "move";
                            e.dataTransfer.setData("text/plain", shortcutId || "");
                        }
                    } catch {}

                    element.classList.add("dragging");
                    const container = element.closest(`#${ids.tableBody}`) || element.closest(`.${classes.compactContainer}`);
                    if (container) container.classList.add("is-dragging");
                });

                element.addEventListener("dragover", (e) => {
                    e.preventDefault();
                    try { if (e.dataTransfer) e.dataTransfer.dropEffect = "move"; } catch {}

                    const container = element.closest(`#${ids.tableBody}`) || element.closest(`.${classes.compactContainer}`);
                    const draggingElement = container?.querySelector?.(".dragging") || document.querySelector(".dragging");
                    if (!draggingElement || draggingElement === element) return;

                    const rect = element.getBoundingClientRect();
                    const midY = rect.top + rect.height / 2;

                    if (container) {
                        container.querySelectorAll(".dragover-top, .dragover-bottom").forEach((el) => {
                            el.classList.remove("dragover-top", "dragover-bottom");
                        });
                    }

                    element.classList.add(e.clientY < midY ? "dragover-top" : "dragover-bottom");
                });

                element.addEventListener("dragleave", () => {
                    element.classList.remove("dragover-top", "dragover-bottom");
                });

                element.addEventListener("drop", (e) => {
                    e.preventDefault();
                    e.stopPropagation();

                    const container = element.closest(`#${ids.tableBody}`) || element.closest(`.${classes.compactContainer}`);
                    if (container) {
                        container.querySelectorAll(".dragover-top, .dragover-bottom").forEach((el) => {
                            el.classList.remove("dragover-top", "dragover-bottom");
                        });
                    }

                    const fromId = draggingShortcutId || (() => {
                        try { return e.dataTransfer ? e.dataTransfer.getData("text/plain") : ""; } catch { return ""; }
                    })();
                    const toId = shortcutId;
                    const dropAfter = element.classList.contains("dragover-bottom");
                    if (!fromId || !toId || fromId === toId) return;

                    try {
                        const changed = reorderShortcutsInCurrentView(fromId, toId, { after: dropAfter });
                        if (changed) {
                            if (typeof renderShortcutsList === "function") renderShortcutsList(state.isDarkMode);
                            if (typeof updateStatsDisplay === "function") updateStatsDisplay();
                        }
                    } catch (err) {
                        console.error("Drag-and-drop error:", err);
                        const tpl = options?.text?.panel?.dragError || "拖拽排序时出错: {error}";
                        showAlert(tpl.replace("{error}", String(err ?? "")));
                    }
                });

                element.addEventListener("dragend", () => {
                    draggingShortcutId = null;
                    const container = element.closest(`#${ids.tableBody}`) || element.closest(`.${classes.compactContainer}`);
                    if (container) {
                        container.classList.remove("is-dragging");
                        container.querySelectorAll(".dragging, .dragover-top, .dragover-bottom").forEach((el) => {
                            el.classList.remove("dragging", "dragover-top", "dragover-bottom");
                        });
                    }
                });
            }

            return Object.freeze({ setupDragAndDrop });
        }
/* -------------------------------------------------------------------------- *
 * Module 05 · Panel Editor (add/edit shortcut, icon picker, hotkey capture)
 * -------------------------------------------------------------------------- */

	        function panelOpenShortcutEditor(ctx, { item = null, index = -1, renderShortcutsList, updateStatsDisplay } = {}) {
            const {
                options,
                state,
                core,
                uiShared,
                idPrefix,
                cssPrefix,
                classes,
                ids,
                URL_METHODS,
                setIconImage,
                ensureThemeAdaptiveIconStored,
                debounce,
            } = ctx;
            const { theme, colors, style, dialogs, layout } = uiShared;
            const { addThemeChangeListener, removeThemeChangeListener } = theme;
            const {
                getPrimaryColor,
                getPanelBackgroundColor,
                getInputBackgroundColor,
                getTextColor,
                getBorderColor,
                getHoverColor
            } = colors;
            const { styleButton, styleInputField } = style;
            const { showAlert } = dialogs;
            const { autoResizeTextarea } = layout;

            const normalizeHotkey = core.normalizeHotkey;
            const normalizeLocalBoolean = (value, fallback = false) => {
                if (typeof value === "boolean") return value;
                const token = String(value ?? "").trim().toLowerCase();
                if (!token) return fallback;
                if (["1", "true", "yes", "on"].includes(token)) return true;
                if (["0", "false", "no", "off"].includes(token)) return false;
                return fallback;
            };

            const isNew = !item;
            const temp = item
                ? { ...item, data: (item && typeof item.data === "object" && !Array.isArray(item.data)) ? clone(item.data) : {} }
                : {
                name: "",
                actionType: "url",
                url: "",
                urlMethod: "current",
                urlAdvanced: "href",
                selector: "",
                simulateKeys: "",
                customAction: "",
                hotkey: "",
                icon: "",
                iconDark: "",
                iconAdaptive: false,
                data: {}
            };
            if (item && !item.actionType) {
                temp.actionType = item.url ? 'url' : (item.selector ? 'selector' : (item.simulateKeys ? 'simulate' : (item.customAction ? 'custom' : 'url')));
            }
            if (!temp.customAction) temp.customAction = "";
            if (!temp.urlMethod) temp.urlMethod = "current";
            if (!temp.urlAdvanced) temp.urlAdvanced = "href";
            temp.iconAdaptive = normalizeLocalBoolean(temp.iconAdaptive, false);

            const editOverlay = document.createElement("div");
            editOverlay.id = ids.editOverlay;
            editOverlay.className = classes?.overlay || "";
            editOverlay.style.zIndex = "99999";
            try {
                const prefix = String(cssPrefix || "").trim();
                if (prefix) editOverlay.style.setProperty(`--${prefix}-overlay-bg`, "rgba(0, 0, 0, 0.3)");
            } catch {}

            const formDiv = document.createElement("div");
            formDiv.id = ids.editForm;
            formDiv.className = classes?.panel || "";
            Object.assign(formDiv.style, {
                opacity: "0", transform: "translateY(20px)",
                transition: "opacity 0.3s ease, transform 0.3s ease",
                maxHeight: "90vh", overflowY: "auto",
                width: "100%", maxWidth: "500px", minWidth: "320px"
            });
            formDiv.onclick = (e) => e.stopPropagation();

            const h3 = document.createElement("h3");
            h3.textContent = isNew
                ? (options?.text?.editor?.titles?.add || "添加快捷键")
                : (options?.text?.editor?.titles?.edit || "编辑快捷键");
            Object.assign(h3.style, { marginTop: "0", marginBottom: "15px", fontSize: "1.1em" });
            formDiv.appendChild(h3);

            const nameInput = panelCreateInputField(ctx, options?.text?.editor?.labels?.name || "名称:", temp.name, "text");
            formDiv.appendChild(nameInput.label);

            const actionTypeDiv = document.createElement("div");
            actionTypeDiv.style.margin = "15px 0";
            const actionTypeLabel = document.createElement("div");
            actionTypeLabel.textContent = options?.text?.editor?.labels?.actionType || "操作类型:";
            Object.assign(actionTypeLabel.style, { fontWeight: "bold", fontSize: "0.9em", marginBottom: "8px" });
            actionTypeDiv.appendChild(actionTypeLabel);
            const builtinLabels = Object.freeze({
                url: options?.text?.stats?.url || "URL跳转",
                selector: options?.text?.stats?.selector || "元素点击",
                simulate: options?.text?.stats?.simulate || "按键模拟",
                custom: options?.text?.stats?.custom || "自定义动作"
            });

            const builtinOrder = Array.isArray(core?.actions?.builtins)
                ? core.actions.builtins.slice()
                : ["url", "selector", "simulate", "custom"];
            const builtinSet = new Set(builtinOrder);

            const actionEntries = (typeof core?.actions?.list === "function") ? core.actions.list() : [];
            const entriesByType = new Map(actionEntries.map((entry) => [String(entry?.type || "").trim(), entry]));
            const usedTypes = new Set();
            const actionTypes = [];

            function addActionType(type, fallbackLabel) {
                const normalized = String(type || "").trim();
                if (!normalized || usedTypes.has(normalized)) return;
                usedTypes.add(normalized);
                const entry = entriesByType.get(normalized);
                const metaLabel = entry && entry.meta && typeof entry.meta.label === "string" ? entry.meta.label.trim() : "";
                actionTypes.push({ value: normalized, text: metaLabel || fallbackLabel || normalized });
            }

            builtinOrder.forEach((type) => addActionType(type, builtinLabels[type] || type));

            const extraTypes = [];
            actionEntries.forEach((entry) => {
                const type = String(entry?.type || "").trim();
                if (!type || usedTypes.has(type)) return;
                const metaLabel = entry && entry.meta && typeof entry.meta.label === "string" ? entry.meta.label.trim() : "";
                extraTypes.push({ value: type, text: metaLabel || type });
            });
            extraTypes.sort((a, b) => String(a.text).localeCompare(String(b.text), "zh", { numeric: true }));
            extraTypes.forEach((opt) => addActionType(opt.value, opt.text));

            if (temp.actionType && !usedTypes.has(temp.actionType)) {
                const suffix = options?.text?.editor?.actionTypeHints?.unregisteredSuffix || " (未注册)";
                addActionType(temp.actionType, `${temp.actionType}${suffix}`);
            }

            const actionTypeHint = document.createElement("div");
            Object.assign(actionTypeHint.style, { marginTop: "6px", fontSize: "12px", opacity: "0.75", lineHeight: "1.4" });
            actionTypeDiv.appendChild(actionTypeHint);

            function isBuiltinActionType(type) {
                const normalized = String(type || "").trim();
                const entry = entriesByType.get(normalized);
                if (entry && entry.meta && typeof entry.meta.builtin === "boolean") return entry.meta.builtin;
                return builtinSet.has(normalized);
            }

            function updateActionTypeHint(type) {
                const normalized = String(type || "").trim();
                if (!normalized) {
                    actionTypeHint.textContent = "";
                    return;
                }
                if (!entriesByType.has(normalized)) {
                    actionTypeHint.textContent = options?.text?.editor?.actionTypeHints?.unregistered || "该类型当前未注册 handler；触发时会提示 unknown actionType。";
                    return;
                }
                if (!isBuiltinActionType(normalized)) {
                    actionTypeHint.textContent = options?.text?.editor?.actionTypeHints?.extended || "扩展类型：可在下方 data JSON 传递参数。";
                    return;
                }
                actionTypeHint.textContent = "";
            }
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
                        const isBuiltin = isBuiltinActionType(at.value);
                        urlContainer.style.display = (isBuiltin && at.value === 'url') ? 'block' : 'none';
                        selectorContainer.style.display = (isBuiltin && at.value === 'selector') ? 'block' : 'none';
	                        simulateContainer.style.display = (isBuiltin && at.value === 'simulate') ? 'block' : 'none';
	                        customContainer.style.display = (isBuiltin && at.value === 'custom') ? 'block' : 'none';
	                        updateActionTypeHint(at.value);
                            applyDataEditorMode({ maybeReplaceValue: true });
	                    }
	                });
                radioLabel.appendChild(radio);
                radioLabel.appendChild(document.createTextNode(at.text));
                radioGroup.appendChild(radioLabel);
            });
            actionTypeDiv.appendChild(radioGroup);
            formDiv.appendChild(actionTypeDiv);

            const editorTabsText = options?.text?.editor?.tabs || {};
            const tabBar = document.createElement("div");
            tabBar.setAttribute("role", "tablist");
            Object.assign(tabBar.style, {
                display: "flex",
                gap: "8px",
                margin: "0 0 12px 0",
                paddingBottom: "10px",
                borderBottom: "1px solid"
            });

            const generalTabBtn = document.createElement("button");
            generalTabBtn.type = "button";
            generalTabBtn.setAttribute("role", "tab");
            generalTabBtn.textContent = editorTabsText.general || "常规";
            Object.assign(generalTabBtn.style, {
                border: "1px solid",
                borderRadius: "999px",
                padding: "6px 14px",
                fontSize: "13px",
                fontWeight: "bold",
                cursor: "pointer",
                transition: "background-color 0.2s ease, border-color 0.2s ease, color 0.2s ease"
            });

            const iconTabBtn = document.createElement("button");
            iconTabBtn.type = "button";
            iconTabBtn.setAttribute("role", "tab");
            iconTabBtn.textContent = editorTabsText.icon || "图标";
            Object.assign(iconTabBtn.style, {
                border: "1px solid",
                borderRadius: "999px",
                padding: "6px 14px",
                fontSize: "13px",
                fontWeight: "bold",
                cursor: "pointer",
                transition: "background-color 0.2s ease, border-color 0.2s ease, color 0.2s ease"
            });

            const dataTabBtn = document.createElement("button");
            dataTabBtn.type = "button";
            dataTabBtn.setAttribute("role", "tab");
            dataTabBtn.textContent = editorTabsText.data || "扩展";
            Object.assign(dataTabBtn.style, {
                border: "1px solid",
                borderRadius: "999px",
                padding: "6px 14px",
                fontSize: "13px",
                fontWeight: "bold",
                cursor: "pointer",
                transition: "background-color 0.2s ease, border-color 0.2s ease, color 0.2s ease"
            });

            const generalPanel = document.createElement("div");
            generalPanel.setAttribute("role", "tabpanel");
            const dataPanel = document.createElement("div");
            dataPanel.setAttribute("role", "tabpanel");
            dataPanel.style.display = "none";
            const iconPanel = document.createElement("div");
            iconPanel.setAttribute("role", "tabpanel");
            iconPanel.style.display = "none";

            const generalPanelId = `${idPrefix}-editor-tab-panel-general`;
            const dataPanelId = `${idPrefix}-editor-tab-panel-data`;
            const iconPanelId = `${idPrefix}-editor-tab-panel-icon`;
            const generalTabId = `${idPrefix}-editor-tab-general`;
            const dataTabId = `${idPrefix}-editor-tab-data`;
            const iconTabId = `${idPrefix}-editor-tab-icon`;
            generalTabBtn.id = generalTabId;
            dataTabBtn.id = dataTabId;
            iconTabBtn.id = iconTabId;
            generalPanel.id = generalPanelId;
            dataPanel.id = dataPanelId;
            iconPanel.id = iconPanelId;
            generalPanel.setAttribute("aria-labelledby", generalTabId);
            dataPanel.setAttribute("aria-labelledby", dataTabId);
            iconPanel.setAttribute("aria-labelledby", iconTabId);
            generalTabBtn.setAttribute("aria-controls", generalPanelId);
            dataTabBtn.setAttribute("aria-controls", dataPanelId);
            iconTabBtn.setAttribute("aria-controls", iconPanelId);
            tabBar.appendChild(iconTabBtn);
            tabBar.appendChild(generalTabBtn);
            tabBar.appendChild(dataTabBtn);
            formDiv.appendChild(tabBar);
            formDiv.appendChild(generalPanel);
            formDiv.appendChild(dataPanel);
            formDiv.appendChild(iconPanel);

            const updateEditorTabsTheme = (isDark) => {
                const borderColor = getBorderColor(isDark);
                const inactiveBackground = getInputBackgroundColor(isDark);
                const inactiveTextColor = getTextColor(isDark);
                const activeBackground = getPrimaryColor();
                tabBar.style.borderBottomColor = borderColor;

                [generalTabBtn, dataTabBtn, iconTabBtn].forEach((btn) => {
                    const isActive = btn.getAttribute("data-active") === "1";
                    btn.style.borderColor = isActive ? activeBackground : borderColor;
                    btn.style.backgroundColor = isActive ? activeBackground : inactiveBackground;
                    btn.style.color = isActive ? "#ffffff" : inactiveTextColor;
                    btn.onmouseover = () => {
                        if (btn.getAttribute("data-active") === "1") return;
                        btn.style.backgroundColor = getHoverColor(isDark);
                        btn.style.borderColor = getPrimaryColor();
                    };
                    btn.onmouseout = () => {
                        const activeNow = btn.getAttribute("data-active") === "1";
                        btn.style.borderColor = activeNow ? activeBackground : borderColor;
                        btn.style.backgroundColor = activeNow ? activeBackground : inactiveBackground;
                        btn.style.color = activeNow ? "#ffffff" : inactiveTextColor;
                    };
                });
            };

            const setActiveEditorTab = (nextTab) => {
                const normalizedTab = String(nextTab || "").trim();
                const tab = (normalizedTab === "icon" || normalizedTab === "data") ? normalizedTab : "general";
                const isGeneral = tab === "general";
                const isData = tab === "data";
                const isIcon = tab === "icon";
                generalTabBtn.setAttribute("data-active", isGeneral ? "1" : "0");
                dataTabBtn.setAttribute("data-active", isData ? "1" : "0");
                iconTabBtn.setAttribute("data-active", isIcon ? "1" : "0");
                generalTabBtn.setAttribute("aria-selected", isGeneral ? "true" : "false");
                dataTabBtn.setAttribute("aria-selected", isData ? "true" : "false");
                iconTabBtn.setAttribute("aria-selected", isIcon ? "true" : "false");
                generalPanel.style.display = isGeneral ? "block" : "none";
                dataPanel.style.display = isData ? "block" : "none";
                iconPanel.style.display = isIcon ? "block" : "none";
                updateEditorTabsTheme(state.isDarkMode);
                requestAnimationFrame(() => {
                    const activePanel = isGeneral ? generalPanel : (isData ? dataPanel : iconPanel);
                    activePanel.querySelectorAll("textarea").forEach((ta) => {
                        autoResizeTextarea(ta);
                    });
                });
            };

            generalTabBtn.addEventListener("click", () => setActiveEditorTab("general"));
            dataTabBtn.addEventListener("click", () => setActiveEditorTab("data"));
            iconTabBtn.addEventListener("click", () => setActiveEditorTab("icon"));

            const urlContainer = document.createElement('div');
            const urlTextarea = panelCreateInputField(
                ctx,
                options?.text?.editor?.labels?.url || "目标网址 (URL):",
                temp.url,
                "textarea",
                options?.text?.editor?.placeholders?.url || "例如: https://example.com/search?q=%s"
            );
            urlContainer.appendChild(urlTextarea.label);

            const urlMethodContainer = panelCreateUrlMethodConfigUI(ctx, temp.urlMethod, temp.urlAdvanced);
            urlContainer.appendChild(urlMethodContainer.container);

            generalPanel.appendChild(urlContainer);
            actionInputs.url = urlTextarea.input;

            const selectorContainer = document.createElement('div');
            const selectorTextarea = panelCreateInputField(
                ctx,
                options?.text?.editor?.labels?.selector || "目标选择器 (Selector):",
                temp.selector,
                "textarea",
                options?.text?.editor?.placeholders?.selector || '例如: label[for="sidebar-visible"]'
            );
            selectorContainer.appendChild(selectorTextarea.label);
            generalPanel.appendChild(selectorContainer);
            actionInputs.selector = selectorTextarea.input;

            const simulateContainer = document.createElement('div');
            const simulateCapture = panelCreateEnhancedKeyboardCaptureInput(ctx, options?.text?.editor?.labels?.simulate || "模拟按键:", temp.simulateKeys, {
                placeholder: options.text.hints.simulate,
                hint: options.text.hints.simulateHelp,
                methodName: "getSimulateKeys",
                captureType: "simulate"
            });
            const { container: simulateInputContainer, destroy: destroySimulateKeysCapture } = simulateCapture;
            const getSimulateKeys = simulateCapture.getSimulateKeys;
            simulateContainer.appendChild(simulateInputContainer);
            generalPanel.appendChild(simulateContainer);

            const customContainer = document.createElement('div');
            const customActionField = panelCreateInputField(
                ctx,
                options?.text?.editor?.labels?.customAction || "自定义动作 (customAction):",
                temp.customAction,
                "text",
                options?.text?.editor?.placeholders?.customAction || "从脚本提供的 customActions 中选择/输入 key"
            );
            customContainer.appendChild(customActionField.label);
            generalPanel.appendChild(customContainer);
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

                const defaultDataLabelText = options?.text?.editor?.labels?.data || "扩展参数 (data JSON，可选):";
                const defaultDataPlaceholder = options?.text?.editor?.placeholders?.data || '例如: {"foo":"bar"}';

                const customActionDataAdapters = (options?.customActionDataAdapters && typeof options.customActionDataAdapters === "object")
                    ? options.customActionDataAdapters
                    : null;

                function isPlainObject(value) {
                    return !!value && typeof value === "object" && !Array.isArray(value);
                }

                function formatJsonDataForEditor(data) {
                    const obj = isPlainObject(data) ? data : {};
                    if (Object.keys(obj).length === 0) return "";
                    try {
                        return JSON.stringify(obj, null, 2);
                    } catch {
                        return "";
                    }
                }

                function getCustomActionDataAdapter(customActionKey) {
                    const key = String(customActionKey || "").trim();
                    if (!key || !customActionDataAdapters) return null;
                    const adapter = customActionDataAdapters[key];
                    if (!adapter || typeof adapter !== "object" || Array.isArray(adapter)) return null;
                    return adapter;
                }

                function formatCustomActionData(adapter, data) {
                    if (!adapter) return formatJsonDataForEditor(data);
                    const formatter = typeof adapter.format === "function" ? adapter.format : null;
                    if (formatter) {
                        try {
                            return String(formatter(data, { shortcut: temp, ctx }) ?? "");
                        } catch {
                            return "";
                        }
                    }
                    return formatJsonDataForEditor(data);
                }

                let lastDataAdapterKey = "";

                function applyDataEditorMode({ maybeReplaceValue = false } = {}) {
                    if (!dataField || !dataTextarea) return;

                    const customActionKey = String(actionInputs.customAction?.value || temp.customAction || "").trim();
                    const adapter = (temp.actionType === "custom") ? getCustomActionDataAdapter(customActionKey) : null;
                    const nextDataAdapterKey = adapter ? customActionKey : "";

                    const labelText = (adapter && typeof adapter.label === "string") ? adapter.label : defaultDataLabelText;
                    try {
                        const textNode = dataField.label?.firstChild;
                        if (textNode && textNode.nodeType === 3) textNode.textContent = labelText;
                    } catch {}

                    dataTextarea.placeholder = (adapter && typeof adapter.placeholder === "string") ? adapter.placeholder : defaultDataPlaceholder;

                    const adapterChanged = nextDataAdapterKey !== lastDataAdapterKey;
                    lastDataAdapterKey = nextDataAdapterKey;
                    if (!maybeReplaceValue || !adapterChanged) return;

                    const current = String(dataTextarea.value || "");
                    const currentTrim = current.trim();
                    const baselineJsonTrim = formatJsonDataForEditor(temp.data).trim();

                    const shouldReplaceValue = !currentTrim || currentTrim === "{}" || (baselineJsonTrim && currentTrim === baselineJsonTrim);
                    if (!shouldReplaceValue) return;

                    dataTextarea.value = adapter ? formatCustomActionData(adapter, temp.data) : formatJsonDataForEditor(temp.data);
                    try {
                        if (dataTextarea.tagName === "TEXTAREA") autoResizeTextarea(dataTextarea);
                    } catch {}
                }

	                const initialDataAdapter = (temp.actionType === "custom")
	                    ? getCustomActionDataAdapter(temp.customAction)
	                    : null;
                    lastDataAdapterKey = initialDataAdapter ? String(temp.customAction || "").trim() : "";

            const dataField = panelCreateInputField(
                ctx,
                (initialDataAdapter && typeof initialDataAdapter.label === "string") ? initialDataAdapter.label : defaultDataLabelText,
                initialDataAdapter ? formatCustomActionData(initialDataAdapter, temp.data) : formatJsonDataForEditor(temp.data),
                "textarea",
                (initialDataAdapter && typeof initialDataAdapter.placeholder === "string") ? initialDataAdapter.placeholder : defaultDataPlaceholder
            );
	            dataPanel.appendChild(dataField.label);
	            const dataTextarea = dataField.input;
                actionInputs.customAction?.addEventListener?.("input", () => applyDataEditorMode({ maybeReplaceValue: true }));
                actionInputs.customAction?.addEventListener?.("change", () => applyDataEditorMode({ maybeReplaceValue: true }));

            const iconField = panelCreateIconField(
                ctx,
                options?.text?.editor?.labels?.icon || "图标URL:",
                temp.icon,
                temp.iconDark
            );
            const {
                label: iconLabel,
                input: iconTextarea,
                darkInput: iconDarkTextarea,
                preview: iconPreview,
                darkPreview: iconDarkPreview,
                destroy: destroyIconField
            } = iconField;
            iconPanel.appendChild(iconLabel);

            const refreshIconPreviews = () => {
                const lightVal = iconTextarea.value.trim();
                const darkVal = iconDarkTextarea.value.trim();
                setIconImage(iconPreview, lightVal || "", "", temp.iconAdaptive);
                if (!iconDarkPreview) return;
                if (darkVal) {
                    iconDarkPreview.style.display = "block";
                    setIconImage(iconDarkPreview, "", darkVal, false);
                } else {
                    iconDarkPreview.style.display = "none";
                    iconDarkPreview.removeAttribute("src");
                }
            };

            refreshIconPreviews();
            const debouncedPreview = debounce(() => {
                refreshIconPreviews();
            }, 300);
            iconTextarea.addEventListener("input", () => {
                autoResizeTextarea(iconTextarea);
                refreshIconAdaptiveVisibility();
                debouncedPreview();
            });
            iconDarkTextarea.addEventListener("input", () => {
                autoResizeTextarea(iconDarkTextarea);
                refreshIconAdaptiveVisibility();
                debouncedPreview();
            });

            const iconAdaptiveRow = document.createElement("div");
            Object.assign(iconAdaptiveRow.style, {
                display: "inline-flex",
                alignSelf: "flex-start",
                width: "fit-content",
                maxWidth: "100%",
                position: "relative",
                alignItems: "center",
                justifyContent: "flex-start",
                gap: "10px",
                marginTop: "8px",
                marginBottom: "10px",
                padding: "6px 10px",
                border: "1px solid",
                borderRadius: "6px"
            });

            const iconAdaptiveLabelText = options?.text?.panel?.iconAdaptiveLabel || "svg自适应处理";
            const iconAdaptiveHintText = options?.text?.panel?.iconAdaptiveHint || "仅在主图标为SVG且未设置黑暗模式图标URL时生效";
            const iconAdaptiveHintPaletteByTheme = {
                light: {
                    helpText: "#9d174d",
                    helpBg: "#ffe4ee",
                    helpBgActive: "#ffd6e7",
                    helpBorder: "#f8a4c7",
                    tooltipText: "#831843",
                    tooltipBg: "#fff1f7",
                    tooltipBorder: "#f9a8d4",
                    tooltipShadow: "0 10px 24px rgba(190, 24, 93, 0.18)"
                },
                dark: {
                    helpText: "#f9a8d4",
                    helpBg: "rgba(255, 228, 238, 0.18)",
                    helpBgActive: "rgba(255, 214, 231, 0.28)",
                    helpBorder: "rgba(249, 168, 212, 0.62)",
                    tooltipText: "#831843",
                    tooltipBg: "rgba(255, 241, 247, 0.98)",
                    tooltipBorder: "rgba(249, 168, 212, 0.9)",
                    tooltipShadow: "0 12px 28px rgba(249, 168, 212, 0.26)"
                }
            };
            const iconAdaptiveLabel = document.createElement("div");
            iconAdaptiveLabel.textContent = iconAdaptiveLabelText;
            Object.assign(iconAdaptiveLabel.style, {
                fontSize: "0.9em",
                fontWeight: "bold",
                minWidth: "0",
                flex: "0 1 auto",
                cursor: "default"
            });

            const iconAdaptiveHelpWrap = document.createElement("span");
            Object.assign(iconAdaptiveHelpWrap.style, {
                position: "relative",
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                flex: "0 0 auto"
            });

            const iconAdaptiveHelpBtn = document.createElement("button");
            iconAdaptiveHelpBtn.type = "button";
            iconAdaptiveHelpBtn.textContent = "?";
            iconAdaptiveHelpBtn.setAttribute("aria-label", `${iconAdaptiveLabelText}说明`);
            iconAdaptiveHelpBtn.setAttribute("aria-haspopup", "true");
            iconAdaptiveHelpBtn.setAttribute("aria-expanded", "false");
            Object.assign(iconAdaptiveHelpBtn.style, {
                width: "20px",
                minWidth: "20px",
                height: "20px",
                borderRadius: "999px",
                border: "1px solid",
                padding: "0",
                margin: "0",
                cursor: "pointer",
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: "12px",
                fontWeight: "bold",
                lineHeight: "1",
                boxSizing: "border-box",
                transition: "background-color 0.2s ease, border-color 0.2s ease, color 0.2s ease, box-shadow 0.2s ease"
            });

            const iconAdaptiveSwitch = document.createElement("button");
            iconAdaptiveSwitch.type = "button";
            iconAdaptiveSwitch.setAttribute("role", "switch");
            iconAdaptiveSwitch.setAttribute("aria-label", iconAdaptiveLabelText);
            Object.assign(iconAdaptiveSwitch.style, {
                width: "42px",
                minWidth: "42px",
                height: "24px",
                borderRadius: "999px",
                border: "1px solid",
                padding: "2px",
                cursor: "pointer",
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "flex-start",
                transition: "background-color 0.2s ease, border-color 0.2s ease, box-shadow 0.2s ease",
                boxSizing: "border-box"
            });

            const iconAdaptiveThumb = document.createElement("span");
            Object.assign(iconAdaptiveThumb.style, {
                width: "18px",
                height: "18px",
                borderRadius: "999px",
                backgroundColor: "#ffffff",
                transition: "transform 0.2s ease, background-color 0.2s ease"
            });
            iconAdaptiveSwitch.appendChild(iconAdaptiveThumb);

            const iconAdaptiveTooltip = document.createElement("div");
            iconAdaptiveTooltip.textContent = iconAdaptiveHintText;
            Object.assign(iconAdaptiveTooltip.style, {
                display: "none",
                position: "absolute",
                left: "50%",
                bottom: "calc(100% + 6px)",
                zIndex: "50",
                transform: "translateX(-50%)",
                width: "220px",
                maxWidth: "min(280px, calc(100vw - 48px))",
                padding: "6px 8px",
                borderRadius: "6px",
                border: "1px solid",
                fontSize: "12px",
                lineHeight: "1.35",
                whiteSpace: "normal",
                wordBreak: "break-word",
                overflowWrap: "anywhere",
                pointerEvents: "none",
                boxSizing: "border-box",
                boxShadow: "0 4px 12px rgba(0,0,0,0.28)"
            });

            let iconAdaptiveTooltipPinned = false;
            let iconAdaptiveHelpHover = false;
            let iconAdaptiveHintPalette = iconAdaptiveHintPaletteByTheme.light;
            const applyIconAdaptiveHelpBtnVisual = () => {
                const shouldActive =
                    iconAdaptiveHelpHover ||
                    iconAdaptiveTooltipPinned ||
                    iconAdaptiveTooltip.style.display === "block";
                iconAdaptiveHelpBtn.style.color = iconAdaptiveHintPalette.helpText;
                iconAdaptiveHelpBtn.style.borderColor = iconAdaptiveHintPalette.helpBorder;
                iconAdaptiveHelpBtn.style.backgroundColor = shouldActive
                    ? iconAdaptiveHintPalette.helpBgActive
                    : iconAdaptiveHintPalette.helpBg;
            };
            const applyIconAdaptiveTooltipVisual = () => {
                iconAdaptiveTooltip.style.color = iconAdaptiveHintPalette.tooltipText;
                iconAdaptiveTooltip.style.backgroundColor = iconAdaptiveHintPalette.tooltipBg;
                iconAdaptiveTooltip.style.borderColor = iconAdaptiveHintPalette.tooltipBorder;
                iconAdaptiveTooltip.style.boxShadow = iconAdaptiveHintPalette.tooltipShadow;
            };
            const setIconAdaptiveTooltipVisible = (visible) => {
                const show = !!visible;
                iconAdaptiveTooltip.style.display = show ? "block" : "none";
                iconAdaptiveHelpBtn.setAttribute("aria-expanded", show ? "true" : "false");
                applyIconAdaptiveHelpBtnVisual();
            };

            const hideIconAdaptiveTooltip = () => {
                iconAdaptiveTooltipPinned = false;
                setIconAdaptiveTooltipVisible(false);
            };

            const applyIconAdaptiveSwitchVisual = (isDark) => {
                const checked = !!temp.iconAdaptive;
                iconAdaptiveSwitch.setAttribute("aria-checked", checked ? "true" : "false");
                iconAdaptiveSwitch.style.justifyContent = checked ? "flex-end" : "flex-start";
                iconAdaptiveSwitch.style.backgroundColor = checked ? getPrimaryColor() : getInputBackgroundColor(isDark);
                iconAdaptiveSwitch.style.borderColor = checked ? getPrimaryColor() : getBorderColor(isDark);
                iconAdaptiveSwitch.style.boxShadow = "none";
                iconAdaptiveThumb.style.backgroundColor = "#ffffff";
            };

            const isSvgLikeIconSource = (value) => {
                const source = String(value || "").trim();
                if (!source) return false;
                if (/^<svg[\s>]/i.test(source)) return true;
                if (/^data:image\/svg\+xml(?:;|,)/i.test(source)) return true;
                if (/\.svg(?:[?#].*)?$/i.test(source)) return true;
                return false;
            };

            const refreshIconAdaptiveVisibility = () => {
                const hasSvgMainIcon = isSvgLikeIconSource(iconTextarea.value);
                const hasDarkIcon = !!String(iconDarkTextarea.value || "").trim();
                const visible = hasSvgMainIcon && !hasDarkIcon;
                if (!visible) hideIconAdaptiveTooltip();
                iconAdaptiveRow.style.display = visible ? "inline-flex" : "none";
            };

            const toggleIconAdaptiveEnabled = (nextChecked = !temp.iconAdaptive) => {
                temp.iconAdaptive = !!nextChecked;
                refreshIconPreviews();
                if (typeof renderShortcutsList === "function") renderShortcutsList(state.isDarkMode);
                applyIconAdaptiveSwitchVisual(state.isDarkMode);
            };

            iconAdaptiveSwitch.addEventListener("click", () => toggleIconAdaptiveEnabled());
            iconAdaptiveSwitch.addEventListener("keydown", (event) => {
                if (event.key === " " || event.key === "Enter") {
                    event.preventDefault();
                    toggleIconAdaptiveEnabled();
                }
            });
            iconAdaptiveSwitch.addEventListener("focus", () => {
                iconAdaptiveSwitch.style.boxShadow = `0 0 0 1px ${getPrimaryColor()}`;
            });
            iconAdaptiveSwitch.addEventListener("blur", () => {
                iconAdaptiveSwitch.style.boxShadow = "none";
            });

            iconAdaptiveHelpBtn.addEventListener("mouseenter", () => {
                iconAdaptiveHelpHover = true;
                setIconAdaptiveTooltipVisible(true);
            });
            iconAdaptiveHelpBtn.addEventListener("mouseleave", () => {
                iconAdaptiveHelpHover = false;
                if (!iconAdaptiveTooltipPinned) setIconAdaptiveTooltipVisible(false);
                else applyIconAdaptiveHelpBtnVisual();
            });
            iconAdaptiveHelpBtn.addEventListener("focus", () => {
                iconAdaptiveHelpBtn.style.boxShadow = `0 0 0 1px ${getPrimaryColor()}`;
                setIconAdaptiveTooltipVisible(true);
            });
            iconAdaptiveHelpBtn.addEventListener("blur", () => {
                iconAdaptiveHelpBtn.style.boxShadow = "none";
                iconAdaptiveHelpHover = false;
                if (!iconAdaptiveTooltipPinned) setIconAdaptiveTooltipVisible(false);
                else applyIconAdaptiveHelpBtnVisual();
            });
            iconAdaptiveHelpBtn.addEventListener("keydown", (event) => {
                if (event.key === "Escape") {
                    event.preventDefault();
                    hideIconAdaptiveTooltip();
                    iconAdaptiveHelpBtn.blur();
                }
            });
            iconAdaptiveHelpBtn.addEventListener("click", (event) => {
                event.preventDefault();
                iconAdaptiveTooltipPinned = !iconAdaptiveTooltipPinned;
                setIconAdaptiveTooltipVisible(iconAdaptiveTooltipPinned);
            });

            const handleIconAdaptiveDocPointerDown = (event) => {
                if (!iconAdaptiveTooltipPinned) return;
                if (iconAdaptiveHelpWrap.contains(event.target)) return;
                hideIconAdaptiveTooltip();
            };
            document.addEventListener("pointerdown", handleIconAdaptiveDocPointerDown, true);
            applyIconAdaptiveSwitchVisual(state.isDarkMode);

            iconAdaptiveHelpWrap.appendChild(iconAdaptiveHelpBtn);
            iconAdaptiveHelpWrap.appendChild(iconAdaptiveTooltip);
            iconAdaptiveRow.appendChild(iconAdaptiveLabel);
            iconAdaptiveRow.appendChild(iconAdaptiveHelpWrap);
            iconAdaptiveRow.appendChild(iconAdaptiveSwitch);
            iconPanel.appendChild(iconAdaptiveRow);
            refreshIconAdaptiveVisibility();

            const iconLibrary = panelCreateIconLibraryUI(
                ctx,
                iconTextarea,
                iconPreview,
                iconDarkTextarea,
                () => !!temp.iconAdaptive
            );
            const { container: iconLibraryContainer, destroy: destroyIconLibrary } = iconLibrary;
            iconPanel.appendChild(iconLibraryContainer);

            const hotkeyCapture = panelCreateEnhancedKeyboardCaptureInput(ctx, options?.text?.editor?.labels?.hotkey || "快捷键:", temp.hotkey, {
                placeholder: options.text.hints.hotkey,
                hint: options.text.hints.hotkeyHelp,
                methodName: "getHotkey"
            });
            const { container: hotkeyContainer, destroy: destroyHotkeyCapture } = hotkeyCapture;
            const getHotkey = hotkeyCapture.getHotkey;
            generalPanel.appendChild(hotkeyContainer);

            const initialBuiltin = isBuiltinActionType(temp.actionType);
            urlContainer.style.display = (initialBuiltin && temp.actionType === 'url') ? 'block' : 'none';
            selectorContainer.style.display = (initialBuiltin && temp.actionType === 'selector') ? 'block' : 'none';
            simulateContainer.style.display = (initialBuiltin && temp.actionType === 'simulate') ? 'block' : 'none';
            customContainer.style.display = (initialBuiltin && temp.actionType === 'custom') ? 'block' : 'none';
            updateActionTypeHint(temp.actionType);
            setActiveEditorTab("general");

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
                temp.iconDark = iconDarkTextarea.value.trim();
                temp.iconAdaptive = !!temp.iconAdaptive;

	                let parsedData = {};
	                const dataTextRaw = String(dataTextarea?.value || "");
	                const dataText = dataTextRaw.trim();
                    const adapter = (temp.actionType === "custom") ? getCustomActionDataAdapter(temp.customAction) : null;
                    if (adapter && typeof adapter.parse === "function") {
                        try {
                            parsedData = adapter.parse(dataTextRaw, { shortcut: temp, ctx }) ?? {};
                        } catch {
                            showAlert(options?.text?.editor?.validation?.dataParseFailed || "data 解析失败，请检查输入。");
                            return;
                        }
                        if (!isPlainObject(parsedData)) {
                            showAlert(options?.text?.editor?.validation?.dataJsonMustBeObject || "data 必须是 JSON 对象 (例如 {\"foo\":\"bar\"})。");
                            return;
                        }
                    } else if (dataText) {
	                    try {
	                        parsedData = JSON.parse(dataText);
	                    } catch {
	                        showAlert(options?.text?.editor?.validation?.dataJsonParseFailed || "data JSON 解析失败，请检查格式。");
	                        return;
	                    }
	                    if (!isPlainObject(parsedData)) {
	                        showAlert(options?.text?.editor?.validation?.dataJsonMustBeObject || "data 必须是 JSON 对象 (例如 {\"foo\":\"bar\"})。");
	                        return;
	                    }
	                }
	                temp.data = parsedData;

                const finalHotkey = getHotkey();
                const urlMethodConfig = urlMethodContainer.getConfig();
                temp.urlMethod = urlMethodConfig.method;
                temp.urlAdvanced = urlMethodConfig.advanced;

                if (!temp.name) { showAlert(options?.text?.editor?.validation?.nameRequired || "请填写名称!"); return; }
                const isBuiltinAction = isBuiltinActionType(temp.actionType);
                if (isBuiltinAction && temp.actionType === 'url' && !temp.url) { showAlert(options?.text?.editor?.validation?.urlRequired || "请填写目标网址!"); return; }
                if (isBuiltinAction && temp.actionType === 'selector' && !temp.selector) { showAlert(options?.text?.editor?.validation?.selectorRequired || "请填写目标选择器!"); return; }
                if (isBuiltinAction && temp.actionType === 'simulate' && !temp.simulateKeys) { showAlert(options?.text?.editor?.validation?.simulateRequired || "请设置模拟按键!"); return; }
                if (isBuiltinAction && temp.actionType === 'custom' && !temp.customAction) { showAlert(options?.text?.editor?.validation?.customActionRequired || "请设置自定义动作 key!"); return; }
                if (!finalHotkey) { showAlert(options?.text?.editor?.validation?.hotkeyRequired || "请设置快捷键!"); return; }
                if (finalHotkey.endsWith('+')) { showAlert(options?.text?.editor?.validation?.hotkeyIncomplete || "快捷键设置不完整 (缺少主键)!"); return; }

                const normalizedNewHotkey = normalizeHotkey(finalHotkey);
                if (core.getShortcuts().some((s, i) => normalizeHotkey(s.hotkey) === normalizedNewHotkey && i !== index)) {
                    showAlert(options?.text?.editor?.validation?.hotkeyDuplicate || "该快捷键已被其他项使用, 请选择其他组合!");
                    return;
                }
                temp.hotkey = finalHotkey;

                if (isBuiltinAction) {
                    if (temp.actionType !== 'url') {
                        temp.url = "";
                        temp.urlMethod = "current";
                        temp.urlAdvanced = "href";
                    }
                    if (temp.actionType !== 'selector') temp.selector = "";
                    if (temp.actionType !== 'simulate') temp.simulateKeys = "";
                    if (temp.actionType !== 'custom') temp.customAction = "";
                }

                const normalized = core.normalizeShortcut(temp);
                if (
                    normalized.icon &&
                    !normalized.iconDark &&
                    normalized.iconAdaptive &&
                    typeof ensureThemeAdaptiveIconStored === "function"
                ) {
                    ensureThemeAdaptiveIconStored(normalized.icon);
                }
                core.mutateShortcuts((list) => {
                    if (isNew) {
                        list.push(normalized);
                    } else {
                        list[index] = normalized;
                    }
                });
                if (typeof renderShortcutsList === "function") renderShortcutsList(state.isDarkMode);
                if (typeof updateStatsDisplay === "function") updateStatsDisplay();
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
            state.currentEditCloser = closeEdit;

            const updateEditPanelTheme = (isDark) => {
                h3.style.borderBottom = `1px solid ${getBorderColor(isDark)}`;
                h3.style.paddingBottom = "10px";
                styleInputField(nameInput.input, isDark);
                styleInputField(actionInputs.url, isDark);
                styleInputField(actionInputs.selector, isDark);
                if (actionInputs.customAction) styleInputField(actionInputs.customAction, isDark);
                styleInputField(iconTextarea, isDark);
                styleInputField(iconDarkTextarea, isDark);
                iconAdaptiveRow.style.backgroundColor = getInputBackgroundColor(isDark);
                iconAdaptiveRow.style.borderColor = getBorderColor(isDark);
                iconAdaptiveLabel.style.color = getTextColor(isDark);
                iconAdaptiveHintPalette = isDark ? iconAdaptiveHintPaletteByTheme.dark : iconAdaptiveHintPaletteByTheme.light;
                applyIconAdaptiveHelpBtnVisual();
                applyIconAdaptiveTooltipVisual();
                applyIconAdaptiveSwitchVisual(isDark);
                styleInputField(dataTextarea, isDark);
                actionTypeHint.style.color = getTextColor(isDark);
                actionTypeDiv.querySelectorAll('input[type="radio"]').forEach(rb => rb.style.accentColor = getPrimaryColor());
                urlMethodContainer.updateTheme(isDark);
                updateEditorTabsTheme(isDark);
                styleButton(confirmBtn, "#2196F3", "#1e88e5");
                styleButton(cancelBtn, "#9E9E9E", "#757575");
            };

            addThemeChangeListener(updateEditPanelTheme);
            updateEditPanelTheme(state.isDarkMode);

            requestAnimationFrame(() => {
                formDiv.style.opacity = "1";
                    formDiv.style.transform = "translateY(0)";
                    setTimeout(() => {
                    [actionInputs.url, actionInputs.selector, iconTextarea, iconDarkTextarea, dataTextarea].forEach(ta => {
                        if (ta && ta.tagName === 'TEXTAREA') {
                            autoResizeTextarea(ta);
                        }
                    });
                    }, 350);
            });

            function closeEdit() {
                state.currentEditCloser = null;
                removeThemeChangeListener(updateEditPanelTheme);
                try { document.removeEventListener("pointerdown", handleIconAdaptiveDocPointerDown, true); } catch {}
                try { if (typeof destroyIconField === "function") destroyIconField(); } catch {}
                try { if (typeof destroyIconLibrary === "function") destroyIconLibrary(); } catch {}
                try { if (typeof destroySimulateKeysCapture === "function") destroySimulateKeysCapture(); } catch {}
                try { if (typeof destroyHotkeyCapture === "function") destroyHotkeyCapture(); } catch {}
                formDiv.style.opacity = "0";
                formDiv.style.transform = "translateY(20px)";
                setTimeout(() => editOverlay.remove(), 300);
            }
        }

	        function panelCreateUrlMethodConfigUI(ctx, currentMethod = "current", currentAdvanced = "href") {
            const { URL_METHODS, uiShared, state, options } = ctx;
            const { colors } = uiShared;
            const { getPrimaryColor, getTextColor, getHoverColor, getInputBackgroundColor, getBorderColor } = colors;

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
            title.textContent = options?.text?.editor?.labels?.urlMethod || "跳转方式:";
            Object.assign(title.style, { fontWeight: "bold", fontSize: "0.9em" });
            titleRow.appendChild(title);

            const expandButton = document.createElement("button");
            expandButton.type = "button";
            expandButton.title = options?.text?.editor?.labels?.urlMethodToggleAdvanced || "展开/折叠高级选项";
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

            const methods = Object.entries(URL_METHODS || {}).map(([value, cfg]) => ({
                value,
                text: (cfg && cfg.name) ? cfg.name : value
            }));

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
                advancedContainer.replaceChildren();
                const advancedTitle = document.createElement("div");
                advancedTitle.textContent = options?.text?.editor?.labels?.urlMethodAdvanced || "高级选项:";
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
                expandButton.textContent = isExpanded ? '▲' : '▼';
                if (isExpanded) {
                    updateTheme(state.isDarkMode);
                    updateAdvancedOptions();
                }
            });

            expandButton.textContent = isExpanded ? '▲' : '▼';
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

	        function panelCreateInputField(ctx, labelText, value, type = "text", placeholder = "") {
            const { uiShared } = ctx;
            const { layout } = uiShared;
            const { autoResizeTextarea } = layout;

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

        function panelCreateIconField(ctx, labelText, value, darkValue = "") {
            const { uiShared, state, options } = ctx;
            const { theme, colors } = uiShared;
            const { addThemeChangeListener, removeThemeChangeListener } = theme;
            const { getBorderColor, getInputBackgroundColor } = colors;
            const { autoResizeTextarea } = uiShared.layout;

            const label = document.createElement("label");
            Object.assign(label.style, { display: "block", margin: "12px 0 4px", fontWeight: "bold", fontSize: "0.9em" });
            label.appendChild(document.createTextNode(labelText));

            const wrap = document.createElement("div");
            Object.assign(wrap.style, {
                display: "flex",
                flexDirection: "column",
                gap: "8px"
            });

            const lightRow = document.createElement("div");
            Object.assign(lightRow.style, {
                display: "grid",
                gridTemplateColumns: "minmax(0, 1fr) 36px",
                alignItems: "flex-start",
                columnGap: "8px",
                width: "100%"
            });

            const textarea = document.createElement("textarea");
            textarea.value = value || "";
            textarea.placeholder = options?.text?.editor?.placeholders?.icon || "在此粘贴URL, 或从下方图库选择";
            textarea.rows = 1;
            Object.assign(textarea.style, {
                minHeight: "36px",
                resize: "vertical",
                overflowY: "hidden",
                width: "100%",
                boxSizing: "border-box",
                flex: "1 1 auto",
                minWidth: "0"
            });

            const darkLabel = document.createElement("div");
            darkLabel.textContent = options?.text?.editor?.labels?.iconDark || "黑暗模式图标URL:";
            Object.assign(darkLabel.style, {
                marginTop: "2px",
                fontSize: "1em",
                fontWeight: "inherit",
                lineHeight: "1.4"
            });

            const darkTextarea = document.createElement("textarea");
            darkTextarea.value = darkValue || "";
            darkTextarea.placeholder = options?.text?.editor?.placeholders?.iconDark || "可选：黑暗模式图标URL";
            darkTextarea.rows = 1;
            Object.assign(darkTextarea.style, {
                minHeight: "36px",
                resize: "vertical",
                overflowY: "hidden",
                width: "100%",
                boxSizing: "border-box",
                flex: "1 1 auto",
                minWidth: "0"
            });

            const darkRow = document.createElement("div");
            Object.assign(darkRow.style, {
                display: "grid",
                gridTemplateColumns: "minmax(0, 1fr) 36px",
                alignItems: "flex-start",
                columnGap: "8px",
                width: "100%"
            });

            const preview = document.createElement("img");
            Object.assign(preview.style, { width: "36px", height: "36px", objectFit: "contain", borderRadius: "4px", flexShrink: "0" });

            const darkPreview = document.createElement("img");
            Object.assign(darkPreview.style, {
                width: "36px",
                height: "36px",
                objectFit: "contain",
                borderRadius: "4px",
                flexShrink: "0",
                display: "none"
            });

            requestAnimationFrame(() => autoResizeTextarea(textarea));
            requestAnimationFrame(() => autoResizeTextarea(darkTextarea));
            lightRow.appendChild(textarea);
            lightRow.appendChild(preview);
            darkRow.appendChild(darkTextarea);
            darkRow.appendChild(darkPreview);
            wrap.appendChild(lightRow);
            wrap.appendChild(darkLabel);
            wrap.appendChild(darkRow);
            label.appendChild(wrap);

            const updatePreviewTheme = (isDark) => {
                preview.style.border = `1px solid ${getBorderColor(isDark)}`;
                preview.style.backgroundColor = getInputBackgroundColor(isDark);
                darkPreview.style.border = `1px solid ${getBorderColor(isDark)}`;
                darkPreview.style.backgroundColor = getInputBackgroundColor(isDark);
            };
            addThemeChangeListener(updatePreviewTheme);
            updatePreviewTheme(state.isDarkMode);

            const destroy = () => {
                removeThemeChangeListener(updatePreviewTheme);
            };

            return { label, input: textarea, darkInput: darkTextarea, preview, darkPreview, destroy };
        }

        function panelCreateIconLibraryUI(ctx, targetTextarea, targetPreviewImg, targetDarkTextarea = null, getAdaptiveEnabled = null) {
            const { options, uiShared, state, safeGMGet, safeGMSet, setIconImage, ensureThemeAdaptiveIconStored } = ctx;
            const { theme, colors, dialogs } = uiShared;
            const { addThemeChangeListener, removeThemeChangeListener } = theme;
            const { getPrimaryColor, getInputBackgroundColor, getTextColor, getBorderColor, getHoverColor } = colors;
            const { showAlert, showConfirmDialog, showPromptDialog } = dialogs;

            let userIcons = safeGMGet(options.storageKeys.userIcons, []);
            let isExpanded = false;
            let longPressTimer = null;
            const isTargetIconAdaptiveEnabled = () => {
                try {
                    return !!(typeof getAdaptiveEnabled === "function" ? getAdaptiveEnabled() : false);
                } catch {
                    return false;
                }
            };

            const container = document.createElement("div");
            container.style.marginTop = "10px";

            const title = document.createElement("div");
            title.textContent = options?.text?.editor?.labels?.iconLibrary || "或从图库选择:";
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
            expandButton.title = options?.text?.editor?.iconLibrary?.expandTitle || "展开/折叠更多图标";
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
                expandButton.textContent = isExpanded ? '▲' : '▼';
            });
            gridWrapper.appendChild(expandButton);

            const addButton = document.createElement("button");
            addButton.type = "button";
            addButton.textContent = "➕";
            addButton.title = options?.text?.editor?.iconLibrary?.addTitle || "将输入框中的图标URL添加到图库";
            Object.assign(addButton.style, baseButtonStyle, {
                border: "1px solid",
                borderRadius: "4px",
                bottom: "8px",
                right: "8px",
            });
            addButton.addEventListener('click', () => {
                const url = targetTextarea.value.trim();
                if (!url) { showAlert(options?.text?.editor?.iconLibrary?.urlRequired || "请输入图标的URL！"); return; }
                if (userIcons.some(icon => icon.url === url) || options.iconLibrary.some(icon => icon.url === url)) { showAlert(options?.text?.editor?.iconLibrary?.alreadyExists || "该图标已存在于图库中。"); return; }
                showPromptDialog(options?.text?.editor?.iconLibrary?.promptName || "请输入图标的名称：", "", (name) => {
                    if (name && name.trim()) {
                        userIcons.push({ name: name.trim(), url: url });
                        safeGMSet(options.storageKeys.userIcons, userIcons);
                        if (isTargetIconAdaptiveEnabled() && typeof ensureThemeAdaptiveIconStored === "function") {
                            ensureThemeAdaptiveIconStored(url);
                        }
                        renderIconGrid();
                    }
                });
            });
            gridWrapper.appendChild(addButton);

            function renderIconGrid() {
                iconGrid.replaceChildren();
                const allIcons = [...options.iconLibrary, ...userIcons];

                allIcons.forEach(iconInfo => {
                    const isProtected = options.protectedIconUrls.includes(iconInfo.url);
                    const isUserAdded = userIcons.some(ui => ui.url === iconInfo.url);

                    const button = document.createElement("button");
                    button.type = "button";
                    button.title = iconInfo.name + (isUserAdded ? (options?.text?.editor?.iconLibrary?.userAddedHint || " (长按删除)") : "");
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
                        setIconImage(targetPreviewImg, iconInfo.url, "", isTargetIconAdaptiveEnabled());
                        targetTextarea.dispatchEvent(new Event('input', { bubbles: true }));
                    });

                    if (isUserAdded) {
                        button.addEventListener("mousedown", (e) => {
                            if (e.button !== 0) return;
                            longPressTimer = setTimeout(() => {
                                const tpl = options?.text?.editor?.iconLibrary?.confirmDelete || '确定要删除自定义图标 "{name}" 吗?';
                                showConfirmDialog(tpl.replace("{name}", String(iconInfo.name ?? "")), () => {
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
            expandButton.textContent = isExpanded ? '▲' : '▼';

            addThemeChangeListener(updateTheme);
            updateTheme(state.isDarkMode);

            const destroy = () => {
                removeThemeChangeListener(updateTheme);
            };

            return { container, updateTheme, destroy };
        }

	        function panelCreateEnhancedKeyboardCaptureInput(ctx, labelText, currentValue, {
            placeholder = "点击此处，然后按下快捷键组合",
            hint = "💡 支持 Ctrl/Shift/Alt/Cmd + 字母/数字/功能键等组合",
            methodName = "getHotkey",
            captureType = "hotkey"
        } = {}) {
            const { options, state, core, uiShared } = ctx;
            const { theme, colors, style } = uiShared;
            const { addThemeChangeListener, removeThemeChangeListener } = theme;
            const { getPrimaryColor, getTextColor, getBorderColor, getInputBackgroundColor, getHoverColor } = colors;
            const { styleInputField } = style;

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
            mainInput.dataset.shortcutCapture = "1";
            mainInput.value = currentValue || "";
            Object.assign(mainInput.style, {
                flexGrow: "1",
                cursor: "pointer",
                textAlign: "center",
                fontWeight: "bold",
                fontSize: "14px",
                minWidth: "200px"
            });

            const labelForMessage = String(labelText || "").trim().replace(/[:：]\s*$/, "");

            const clearButton = document.createElement("button");
            clearButton.type = "button";
            clearButton.textContent = "🗑️";
            clearButton.title = options.text.buttons.clear || `清除${labelForMessage}`;
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
            const capturedModifiers = new Set();
            let capturedMainKey = "";

            function formatCaptureMessage(template, vars = {}) {
                let out = String(template ?? "");
                for (const [key, value] of Object.entries(vars || {})) {
                    out = out.split(`{${key}}`).join(String(value ?? ""));
                }
                return out;
            }

            function startCapture() {
                if (isCapturing) return;
                isCapturing = true;
                capturedModifiers.clear();
                capturedMainKey = "";
                mainInput.value = "";
                mainInput.placeholder = formatCaptureMessage(
                    options?.text?.editor?.capture?.placeholderDuringCapture || "请按下{label}组合...",
                    { label: labelForMessage }
                );
                statusDiv.textContent = formatCaptureMessage(
                    options?.text?.editor?.capture?.statusCapturing || "🎯 正在捕获{label}，请按下组合键...",
                    { label: labelForMessage }
                );
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
                    const displayKeys = core?.hotkeys?.formatForDisplay ? (core.hotkeys.formatForDisplay(finalKeys) || finalKeys) : finalKeys;
                    statusDiv.textContent = formatCaptureMessage(
                        options?.text?.editor?.capture?.statusCaptured || "✅ 已捕获{label}: {keys}",
                        { label: labelForMessage, keys: displayKeys }
                    );
                } else {
                    statusDiv.textContent = formatCaptureMessage(
                        options?.text?.editor?.capture?.statusInvalid || "❌ 未捕获到有效的{label}",
                        { label: labelForMessage }
                    );
                }
                mainInput.blur();
                updateCaptureState();
            }

            function buildHotkeyString() {
                if (!capturedMainKey) return "";
                const raw = [...capturedModifiers, capturedMainKey].filter(Boolean).join("+");
                return core?.hotkeys?.normalize ? core.hotkeys.normalize(raw) : raw;
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
                    const standardKey = core?.hotkeys?.getMainKeyFromEvent ? core.hotkeys.getMainKeyFromEvent(e) : "";
                    if (!standardKey) return;

                    if (captureType === "hotkey" && core?.hotkeys?.isAllowedMainKey && !core.hotkeys.isAllowedMainKey(standardKey)) {
                        const displayKey = core?.hotkeys?.formatKeyToken ? core.hotkeys.formatKeyToken(standardKey) : standardKey;
                        statusDiv.textContent = formatCaptureMessage(
                            options?.text?.editor?.capture?.statusUnsupportedHotkey || "❌ 不支持的快捷键: {key}",
                            { key: displayKey }
                        );
                        return;
                    }

                    if (captureType === "simulate" && core?.hotkeys?.isAllowedSimulateMainKey && !core.hotkeys.isAllowedSimulateMainKey(standardKey)) {
                        const displayKey = core?.hotkeys?.formatKeyToken ? core.hotkeys.formatKeyToken(standardKey) : standardKey;
                        statusDiv.textContent = formatCaptureMessage(
                            options?.text?.editor?.capture?.statusUnsupportedSimulate || "❌ 不支持的模拟按键: {key}",
                            { key: displayKey }
                        );
                        return;
                    }

                    capturedMainKey = standardKey;
                    updateDisplay();
                    setTimeout(stopCapture, 100);
                }
            }

            function updateDisplay() {
                if (!isCapturing) return;
                const orderedMods = core?.hotkeys?.modifierOrder || ['CTRL', 'SHIFT', 'ALT', 'CMD'];
                const displayParts = [];

                for (const mod of orderedMods) {
                    if (!capturedModifiers.has(mod)) continue;
                    displayParts.push(core?.hotkeys?.formatModifierToken ? core.hotkeys.formatModifierToken(mod) : mod);
                }

                if (capturedMainKey) {
                    displayParts.push(core?.hotkeys?.formatKeyToken ? core.hotkeys.formatKeyToken(capturedMainKey) : capturedMainKey);
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
                statusDiv.textContent = formatCaptureMessage(
                    options?.text?.editor?.capture?.statusCleared || "🗑️ {label}已清除",
                    { label: labelForMessage }
                );
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

            const destroy = () => {
                removeThemeChangeListener(updateTheme);
            };

            const result = { container, destroy };
            result[methodName] = () => mainInput.value.trim();
            return result;
        }
/* -------------------------------------------------------------------------- *
 * Module 05 · Panel Filter (search + current-view predicate shared by panel/dnd)
 * -------------------------------------------------------------------------- */

        function panelNormalizeActionType(shortcut) {
            const type = shortcut && typeof shortcut.actionType === "string" ? shortcut.actionType.trim() : "";
            return type || "unknown";
        }

        function panelBuildShortcutSearchHaystack(shortcut) {
            if (!shortcut || typeof shortcut !== "object") return "";
            let dataText = "";
            try {
                if (shortcut.data && typeof shortcut.data === "object") {
                    dataText = JSON.stringify(shortcut.data);
                }
            } catch {}

            return [
                shortcut.name,
                shortcut.url,
                shortcut.selector,
                shortcut.simulateKeys,
                shortcut.customAction,
                shortcut.actionType,
                dataText
            ]
                .filter(Boolean)
                .join(" ")
                .toLowerCase();
        }

        function panelMatchesSearchQuery(shortcut, queryLower) {
            const query = typeof queryLower === "string" ? queryLower : "";
            if (!query) return true;
            return panelBuildShortcutSearchHaystack(shortcut).includes(query);
        }

        function panelMatchesCurrentView(ctx, shortcut) {
            if (!shortcut) return false;
            const filterType = String(ctx?.state?.currentFilter || "all");
            if (filterType !== "all" && panelNormalizeActionType(shortcut) !== filterType) return false;
            const queryLower = String(ctx?.state?.searchQuery || "").trim().toLowerCase();
            return panelMatchesSearchQuery(shortcut, queryLower);
        }
/* -------------------------------------------------------------------------- *
 * Module 05 · Panel I/O (import/export, clipboard)
 * -------------------------------------------------------------------------- */

	        function panelGetExportPayload(ctx, { schemaVersion = 1 } = {}) {
            const { options, core, safeGMGet } = ctx;
            const shortcuts = core.getShortcuts();
            const userIcons = safeGMGet(options.storageKeys.userIcons, []);
            return {
                schemaVersion,
                exportedAt: new Date().toISOString(),
                shortcuts,
                userIcons
            };
        }

	        async function panelTryCopyToClipboard(text) {
            const value = String(text ?? "");
            try {
                if (navigator.clipboard && typeof navigator.clipboard.writeText === "function") {
                    await navigator.clipboard.writeText(value);
                    return true;
                }
            } catch {}
            try {
                const ta = document.createElement("textarea");
                ta.value = value;
                ta.style.position = "fixed";
                ta.style.top = "-1000px";
                ta.style.left = "-1000px";
                document.body.appendChild(ta);
                ta.focus();
                ta.select();
                const ok = document.execCommand && document.execCommand("copy");
                document.body.removeChild(ta);
                return !!ok;
            } catch {
                return false;
            }
        }

	        function panelOpenExportDialog(ctx, { overlay } = {}) {
            const { options, uiShared, classes } = ctx;
            const { style, dialogs } = uiShared;
            const { styleInputField, styleButton } = style;
            const { showAlert } = dialogs;

            if (!overlay) return;

            const payload = panelGetExportPayload(ctx);
            const json = JSON.stringify(payload, null, 2);

            const ioOverlay = document.createElement("div");
            ioOverlay.className = classes?.overlay || "";
            ioOverlay.style.zIndex = "999999";
            ioOverlay.onclick = (e) => { if (e.target === ioOverlay) close(); };

            const box = document.createElement("div");
            box.className = classes?.panel || "";
            Object.assign(box.style, {
                width: "100%",
                maxWidth: "820px",
                maxHeight: "90vh",
                overflow: "auto",
                padding: "16px"
            });
            box.onclick = (e) => e.stopPropagation();

            const titleEl = document.createElement("h3");
            titleEl.textContent = options.text.buttons.export || "导出";
            Object.assign(titleEl.style, { margin: "0 0 10px 0", fontSize: "1.05em" });
            box.appendChild(titleEl);

            const textarea = document.createElement("textarea");
            textarea.value = json;
            textarea.readOnly = true;
            Object.assign(textarea.style, { height: "360px", resize: "vertical" });
            styleInputField(textarea);
            box.appendChild(textarea);

            const btnRow = document.createElement("div");
            Object.assign(btnRow.style, {
                display: "flex",
                justifyContent: "flex-end",
                gap: "10px",
                marginTop: "12px",
                flexWrap: "wrap"
            });

            const copyBtn = document.createElement("button");
            copyBtn.textContent = options.text.buttons.copy || "复制";
            copyBtn.onclick = async () => {
                const ok = await panelTryCopyToClipboard(textarea.value);
                if (ok) showAlert(options?.text?.io?.copySuccess || "已复制到剪贴板。");
                else showAlert(options?.text?.io?.copyFail || "复制失败，请手动复制。");
            };
            styleButton(copyBtn, "#2196F3", "#1e88e5");
            btnRow.appendChild(copyBtn);

            const closeBtn = document.createElement("button");
            closeBtn.textContent = options.text.buttons.close || "关闭";
            closeBtn.onclick = close;
            styleButton(closeBtn, "#9E9E9E", "#757575");
            btnRow.appendChild(closeBtn);

            box.appendChild(btnRow);
            ioOverlay.appendChild(box);
            overlay.appendChild(ioOverlay);

            function close() {
                try { ioOverlay.remove(); } catch {}
            }
        }

	        function panelOpenImportDialog(ctx, { overlay, renderShortcutsList, updateStatsDisplay } = {}) {
            const { options, uiShared, state, core, safeGMSet, classes } = ctx;
            const { style, dialogs } = uiShared;
            const { styleInputField, styleButton } = style;
            const { showAlert } = dialogs;

            if (!overlay) return;

            const ioOverlay = document.createElement("div");
            ioOverlay.className = classes?.overlay || "";
            ioOverlay.style.zIndex = "999999";
            ioOverlay.onclick = (e) => { if (e.target === ioOverlay) close(); };

            const box = document.createElement("div");
            box.className = classes?.panel || "";
            Object.assign(box.style, {
                width: "100%",
                maxWidth: "820px",
                maxHeight: "90vh",
                overflow: "auto",
                padding: "16px"
            });
            box.onclick = (e) => e.stopPropagation();

            const titleEl = document.createElement("h3");
            titleEl.textContent = options.text.buttons.import || "导入";
            Object.assign(titleEl.style, { margin: "0 0 10px 0", fontSize: "1.05em" });
            box.appendChild(titleEl);

            const tip = document.createElement("div");
            tip.textContent = options?.text?.io?.importTip || "支持导入 { shortcuts: [...], userIcons?: [...] } 或直接导入 shortcuts 数组。";
            Object.assign(tip.style, { fontSize: "12px", opacity: "0.75", marginBottom: "8px", lineHeight: "1.4" });
            box.appendChild(tip);

            const textarea = document.createElement("textarea");
            textarea.placeholder = options?.text?.io?.importPlaceholder || "粘贴 JSON 到这里…";
            Object.assign(textarea.style, { height: "360px", resize: "vertical" });
            styleInputField(textarea);
            box.appendChild(textarea);

            const btnRow = document.createElement("div");
            Object.assign(btnRow.style, {
                display: "flex",
                justifyContent: "flex-end",
                gap: "10px",
                marginTop: "12px",
                flexWrap: "wrap"
            });

            const confirmBtn = document.createElement("button");
            confirmBtn.textContent = options.text.buttons.confirm || "确定";
            confirmBtn.onclick = () => {
                let parsed = null;
                try {
                    parsed = JSON.parse(textarea.value);
                } catch {
                    showAlert(options?.text?.io?.importJsonParseFailed || "JSON 解析失败，请检查格式。");
                    return;
                }

                const shortcutsRaw = Array.isArray(parsed)
                    ? parsed
                    : (Array.isArray(parsed?.shortcuts) ? parsed.shortcuts : null);
                if (!Array.isArray(shortcutsRaw)) {
                    showAlert(options?.text?.io?.importMissingShortcuts || "导入数据中未找到 shortcuts 数组。");
                    return;
                }

                const normalized = shortcutsRaw.map((sc) => core.normalizeShortcut(sc));
                const hotkeyMap = new Map();
                const duplicates = [];
                for (const sc of normalized) {
                    const hk = String(sc?.hotkey || "");
                    if (!hk) continue;
                    if (hotkeyMap.has(hk)) {
                        duplicates.push([hk, hotkeyMap.get(hk), sc.name || ""]);
                    } else {
                        hotkeyMap.set(hk, sc.name || "");
                    }
                }
                if (duplicates.length > 0) {
                    const lines = duplicates.slice(0, 12).map(([hk, a, b]) => `${hk}: ${a} / ${b}`).join("\n");
                    const prefix = options?.text?.io?.importDuplicateHotkeysPrefix || "导入失败：存在重复快捷键(请先在 JSON 中修复)：";
                    showAlert(`${prefix}\n${lines}${duplicates.length > 12 ? "\n..." : ""}`);
                    return;
                }

                core.setShortcuts(normalized, { persist: false });

                if (!Array.isArray(parsed)) {
                    const iconsRaw = Array.isArray(parsed?.userIcons) ? parsed.userIcons : null;
                    if (iconsRaw) {
                        const cleaned = iconsRaw
                            .map((it) => ({
                                name: typeof it?.name === "string" ? it.name.trim() : "",
                                url: typeof it?.url === "string" ? it.url.trim() : ""
                            }))
                            .filter((it) => it.name && it.url);
                        safeGMSet(options.storageKeys.userIcons, cleaned);
                    }
                }

                if (typeof renderShortcutsList === "function") renderShortcutsList(state.isDarkMode);
                if (typeof updateStatsDisplay === "function") updateStatsDisplay();
                close();
            };
            styleButton(confirmBtn, "#2196F3", "#1e88e5");
            btnRow.appendChild(confirmBtn);

            const cancelBtn = document.createElement("button");
            cancelBtn.textContent = options.text.buttons.cancel || "取消";
            cancelBtn.onclick = close;
            styleButton(cancelBtn, "#9E9E9E", "#757575");
            btnRow.appendChild(cancelBtn);

            box.appendChild(btnRow);
            ioOverlay.appendChild(box);
            overlay.appendChild(ioOverlay);

            function close() {
                try { ioOverlay.remove(); } catch {}
            }
        }
/* -------------------------------------------------------------------------- *
 * Module 06 · Styling & exports (CSS injection, lifecycle, global API)
 * -------------------------------------------------------------------------- */

        function createEngineApi(ctx = {}) {
            const {
                options,
                state,
                core,
                uiShared,
                cssPrefix,
                ids,
                classes,
                URL_METHODS
            } = ctx;

            const keyboardLayer = createKeyboardLayer(ctx);
            const settingsPanelLayer = createSettingsPanelLayer(ctx);

            /* ------------------------------------------------------------------
             * 样式注入
             * ------------------------------------------------------------------ */

            function injectBaseCss() {
                const styleId = `${cssPrefix}-base-style`;
                let styleEl = document.getElementById(styleId);
                if (!styleEl) {
                    styleEl = document.createElement('style');
                    styleEl.id = styleId;
                    document.head.appendChild(styleEl);
                }

                const p = String(cssPrefix || "shortcut").trim() || "shortcut";
                styleEl.textContent = `
                    .${p}-btn {
                        background: var(--${p}-btn-bg, var(--${p}-primary));
                        border: 1px solid var(--${p}-btn-bg, var(--${p}-primary));
                        color: var(--${p}-btn-text, #fff);
                        border-radius: 6px;
                        padding: 8px 16px;
                        cursor: pointer;
                        font-size: 14px;
                        font-weight: 500;
                        transition: background-color 0.2s ease, border-color 0.2s ease, transform 0.05s ease;
                    }
                    .${p}-btn:hover {
                        background: var(--${p}-btn-hover-bg, var(--${p}-btn-bg, var(--${p}-primary)));
                        border-color: var(--${p}-btn-hover-bg, var(--${p}-btn-bg, var(--${p}-primary)));
                    }
                    .${p}-btn:active { transform: translateY(1px); }
                    .${p}-btn:disabled { opacity: 0.6; cursor: not-allowed; }
                    .${p}-btn:focus-visible {
                        outline: none;
                        box-shadow: 0 0 0 2px var(--${p}-panel-bg), 0 0 0 4px var(--${p}-primary);
                    }

                    .${p}-btn-ghost {
                        background: transparent;
                        color: var(--${p}-ghost-color, var(--${p}-text));
                        border: none;
                        border-radius: 4px;
                        padding: 6px 8px;
                        cursor: pointer;
                        font-size: 16px;
                        line-height: 1;
                        transition: background-color 0.2s ease;
                    }
                    .${p}-btn-ghost:hover { background: var(--${p}-ghost-hover-bg, var(--${p}-hover-bg)); }
                    .${p}-btn-ghost:focus-visible {
                        outline: none;
                        box-shadow: 0 0 0 2px var(--${p}-panel-bg), 0 0 0 4px var(--${p}-primary);
                    }

                    .${p}-input {
                        box-sizing: border-box;
                        width: 100%;
                        padding: 8px 10px;
                        border: 1px solid var(--${p}-border);
                        border-radius: 6px;
                        font-size: 14px;
                        outline: none;
                        background: var(--${p}-input-bg);
                        color: var(--${p}-text);
                        transition: border-color 0.2s ease, box-shadow 0.2s ease, background-color 0.2s ease;
                    }
                    .${p}-input:focus {
                        border-color: var(--${p}-primary);
                        box-shadow: 0 0 0 1px var(--${p}-primary);
                    }

                    .${p}-th {
                        border-bottom: 2px solid var(--${p}-border);
                        padding: 10px 8px;
                        text-align: left;
                        background: var(--${p}-table-header-bg);
                        font-weight: bold;
                        position: sticky;
                        top: -1px;
                        z-index: 1;
                        color: var(--${p}-text);
                    }
                    .${p}-td {
                        padding: 10px 8px;
                        border-bottom: 1px solid var(--${p}-border);
                        vertical-align: middle;
                        color: var(--${p}-text);
                        font-size: 14px;
                    }

                    .${p}-overlay {
                        position: fixed;
                        top: 0;
                        left: 0;
                        width: 100vw;
                        height: 100vh;
                        display: flex;
                        align-items: center;
                        justify-content: center;
                        padding: 20px;
                        box-sizing: border-box;
                        background: var(--${p}-overlay-bg);
                    }

                    .${p}-panel {
                        background: var(--${p}-panel-bg);
                        color: var(--${p}-text);
                        border: 1px solid var(--${p}-border);
                        border-radius: 8px;
                        box-shadow: 0 4px 12px rgba(0,0,0,0.2);
                        padding: 20px;
                        box-sizing: border-box;
                        font-family: sans-serif;
                        position: relative;
                    }

                    .${p}-filter-button {
                        flex: 0 0 auto;
                        display: inline-flex;
                        align-items: center;
                        padding: 6px 12px;
                        border-radius: 12px;
                        font-size: 12px;
                        font-weight: bold;
                        white-space: nowrap;
                        min-width: fit-content;
                        cursor: pointer;
                        transition: all 0.2s ease;
                        outline: none;
                        border: 2px solid var(--${p}-filter-color, var(--${p}-primary));
                        color: var(--${p}-filter-color, var(--${p}-primary));
                        background-color: transparent;
                    }
                    .${p}-filter-button[data-active="1"] {
                        background-color: var(--${p}-filter-color, var(--${p}-primary));
                        color: #fff;
                    }
                    .${p}-filter-button:hover:not([data-active="1"]) {
                        background-color: var(--${p}-hover-bg);
                        transform: scale(1.05);
                    }
                    .${p}-filter-label { margin-right: 6px; }
                    .${p}-filter-count {
                        background: var(--${p}-filter-color, var(--${p}-primary));
                        color: #fff;
                        padding: 2px 6px;
                        border-radius: 8px;
                    }
                    .${p}-filter-button[data-active="1"] .${p}-filter-count {
                        background: rgba(255,255,255,0.3);
                    }
                `;

                return () => {
                    try { styleEl.remove(); } catch {}
                };
            }

            function injectDragCss() {
                const styleId = `${cssPrefix}-drag-style`;
                let styleEl = document.getElementById(styleId);
                if (!styleEl) {
                    styleEl = document.createElement('style');
                    styleEl.id = styleId;
                    document.head.appendChild(styleEl);
                }

                const updateDragStyle = () => {
                    const primaryColor = uiShared.colors.getPrimaryColor();
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
                            opacity: 1 !important;
                            background-color: ${primaryColor}30 !important;
                            box-shadow: 0 4px 12px rgba(0,0,0,0.3) !important;
                            transform: scale(1.02);
                            border-color: ${primaryColor} !important;
                        }
                        .${classes.compactCard}.dragover-top {
                            border-top: 3px dashed ${primaryColor} !important;
                        }
                        .${classes.compactCard}.dragover-bottom {
                            border-bottom: 3px dashed ${primaryColor} !important;
                        }

                        @media (max-width: ${options.ui.compactBreakpoint || 800}px) {
                            .${classes.compactCard} {
                                margin: 0;
                                max-width: 100%;
                                align-self: flex-start;
                            }
                            .${classes.compactContainer} {
                                align-items: stretch !important;
                            }
                        }
                    `;
                };

                uiShared.theme.addThemeChangeListener(updateDragStyle);
                updateDragStyle(state.isDarkMode);
                return () => {
                    uiShared.theme.removeThemeChangeListener(updateDragStyle);
                    try { styleEl.remove(); } catch {}
                };
            }

            /* ------------------------------------------------------------------
             * 生命周期
             * ------------------------------------------------------------------ */

            function init() {
                keyboardLayer.init();
                if (typeof state.destroyDarkModeObserver === "function") {
                    try { state.destroyDarkModeObserver(); } catch {}
                }
                state.destroyDarkModeObserver = uiShared.theme.setupDarkModeObserver();

                if (typeof state.destroyBaseCss === "function") {
                    try { state.destroyBaseCss(); } catch {}
                }
                state.destroyBaseCss = injectBaseCss();

                if (typeof state.destroyDragCss === "function") {
                    try { state.destroyDragCss(); } catch {}
                }
                state.destroyDragCss = injectDragCss();

                const menuLabel = options.menuCommandLabel || options.text.menuLabelFallback;
                if (!state.menuCommandRegistered && typeof GM_registerMenuCommand === 'function') {
                    GM_registerMenuCommand(menuLabel, settingsPanelLayer.openSettingsPanel);
                    state.menuCommandRegistered = true;
                }
            }

            function destroy() {
                keyboardLayer.destroy();
                settingsPanelLayer.closeSettingsPanel();
                if (typeof state.destroyDragCss === "function") {
                    try { state.destroyDragCss(); } catch {}
                    state.destroyDragCss = null;
                }
                if (typeof state.destroyBaseCss === "function") {
                    try { state.destroyBaseCss(); } catch {}
                    state.destroyBaseCss = null;
                }
                if (typeof state.destroyDarkModeObserver === "function") {
                    try { state.destroyDarkModeObserver(); } catch {}
                    state.destroyDarkModeObserver = null;
                }
                uiShared.layout.disableScrollLock();
            }

            function getShortcuts() {
                return core.getShortcuts();
            }

            function setShortcuts(newShortcuts) {
                core.setShortcuts(newShortcuts, { persist: true });
            }

            return Object.freeze({
                init,
                destroy,
                openSettingsPanel: settingsPanelLayer.openSettingsPanel,
                closeSettingsPanel: settingsPanelLayer.closeSettingsPanel,
                getShortcuts,
                setShortcuts,
                registerActionHandler: (actionType, handler, meta = {}) => core?.actions?.register?.(actionType, handler, meta),
                unregisterActionHandler: (actionType) => core?.actions?.unregister?.(actionType),
                listActionTypes: () => core?.actions?.list?.() || [],
                core,
                uiShared,
                URL_METHODS
            });
        }
/* -------------------------------------------------------------------------- *
 * Module 07 · Quick Input (reusable macro panel)
 * -------------------------------------------------------------------------- */

    const QuickInput = (() => {
        const sleep = (ms) => (typeof Utils?.sleep === "function" ? Utils.sleep(ms) : new Promise(resolve => setTimeout(resolve, ms)));

        function clampInt(value, { min = 0, max = 9999, fallback = 0 } = {}) {
            const num = Number.parseInt(String(value ?? ""), 10);
            if (!Number.isFinite(num)) return fallback;
            return Math.min(max, Math.max(min, num));
        }

        function normalizeHotkeyString(raw) {
            return String(raw ?? "").trim().replace(/\s+/g, "");
        }

        function normalizeHotkeyFallback(raw) {
            const cleaned = normalizeHotkeyString(raw).toUpperCase();
            if (!cleaned) return "";
            const parts = cleaned.split("+").map(s => s.trim()).filter(Boolean);
            if (parts.length === 0) return "";

            const modifiers = new Set();
            let mainKey = "";

            for (const part of parts) {
                switch (part) {
                    case "CTRL":
                    case "CONTROL":
                        modifiers.add("CTRL");
                        break;
                    case "SHIFT":
                        modifiers.add("SHIFT");
                        break;
                    case "ALT":
                    case "OPTION":
                    case "OPT":
                        modifiers.add("ALT");
                        break;
                    case "CMD":
                    case "COMMAND":
                    case "META":
                    case "WIN":
                    case "WINDOWS":
                        modifiers.add("CMD");
                        break;
                    default:
                        mainKey = part;
                        break;
                }
            }

            if (!mainKey) return "";
            const ordered = [];
            for (const mod of ["CTRL", "SHIFT", "ALT", "CMD"]) {
                if (modifiers.has(mod)) ordered.push(mod);
            }
            return ordered.length ? [...ordered, mainKey].join("+") : mainKey;
        }

        function getKeyEventProps(mainKeyToken) {
            const token = String(mainKeyToken ?? "").toUpperCase();
            if (!token) return null;

            if (token.length === 1 && token >= "A" && token <= "Z") {
                return { key: token.toLowerCase(), code: `Key${token}` };
            }
            if (token.length === 1 && token >= "0" && token <= "9") {
                return { key: token, code: `Digit${token}` };
            }
            if (/^F\d{1,2}$/.test(token)) return { key: token, code: token };

            switch (token) {
                case "ENTER":
                case "RETURN":
                    return { key: "Enter", code: "Enter" };
                case "TAB":
                    return { key: "Tab", code: "Tab" };
                case "ESC":
                case "ESCAPE":
                    return { key: "Escape", code: "Escape" };
                case "SPACE":
                    return { key: " ", code: "Space" };
                case "BACKSPACE":
                    return { key: "Backspace", code: "Backspace" };
                case "DELETE":
                    return { key: "Delete", code: "Delete" };
                case "ARROWUP":
                    return { key: "ArrowUp", code: "ArrowUp" };
                case "ARROWDOWN":
                    return { key: "ArrowDown", code: "ArrowDown" };
                case "ARROWLEFT":
                    return { key: "ArrowLeft", code: "ArrowLeft" };
                case "ARROWRIGHT":
                    return { key: "ArrowRight", code: "ArrowRight" };
                default:
                    return null;
            }
        }

        function simulateKeystroke(keyString, { target = null } = {}) {
            const raw = String(keyString ?? "").trim();
            if (!raw) return false;

            const parts = raw.toUpperCase().split("+").map(s => s.trim()).filter(Boolean);
            if (parts.length === 0) return false;

            const mainKey = parts.pop();
            const modifiers = new Set(parts);
            const props = getKeyEventProps(mainKey);
            if (!props) return false;

            const targetElement = target || global.document?.activeElement || global.document?.body || null;
            if (!targetElement) return false;

            const eventInit = {
                key: props.key,
                code: props.code,
                bubbles: true,
                cancelable: true,
                ctrlKey: modifiers.has("CTRL") || modifiers.has("CONTROL"),
                shiftKey: modifiers.has("SHIFT"),
                altKey: modifiers.has("ALT") || modifiers.has("OPTION") || modifiers.has("OPT"),
                metaKey: modifiers.has("CMD") || modifiers.has("META") || modifiers.has("COMMAND")
            };

            try {
                targetElement.dispatchEvent(new KeyboardEvent("keydown", eventInit));
                targetElement.dispatchEvent(new KeyboardEvent("keyup", eventInit));
                return true;
            } catch {
                return false;
            }
        }

        function isElementVisible(el) {
            if (!el) return false;
            if (el.hidden) return false;
            try {
                const rect = el.getBoundingClientRect();
                if (!rect || rect.width <= 0 || rect.height <= 0) return false;
                if (rect.bottom < 0 || rect.top > global.innerHeight) return false;
                return true;
            } catch {
                return false;
            }
        }

        function pickBestComposerCandidate(candidates) {
            let best = null;
            let bestScore = -Infinity;
            for (const el of candidates) {
                if (!el) continue;
                if (!isElementVisible(el)) continue;
                const tag = (el.tagName || "").toUpperCase();
                const isEditable = tag === "TEXTAREA" || tag === "INPUT" || el.isContentEditable;
                if (!isEditable) continue;
                try {
                    const rect = el.getBoundingClientRect();
                    const bottomScore = rect.bottom / Math.max(1, global.innerHeight);
                    const widthScore = rect.width / Math.max(1, global.innerWidth);
                    const areaScore = (rect.width * rect.height) / Math.max(1, global.innerWidth * global.innerHeight);
                    const score = bottomScore * 2 + widthScore + areaScore * 0.5;
                    if (score > bestScore) {
                        best = el;
                        bestScore = score;
                    }
                } catch {}
            }
            return best;
        }

        function setInputValue(el, value) {
            if (!el) return false;
            const text = String(value ?? "");

            const tag = (el.tagName || "").toUpperCase();
            if (tag === "TEXTAREA" || tag === "INPUT") {
                try {
                    const proto = tag === "TEXTAREA" ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype;
                    const desc = Object.getOwnPropertyDescriptor(proto, "value");
                    if (desc?.set) desc.set.call(el, text);
                    else el.value = text;
                } catch {
                    try { el.value = text; } catch { return false; }
                }
                try {
                    el.dispatchEvent(new InputEvent("input", { bubbles: true, cancelable: true, data: text, inputType: "insertReplacementText" }));
                } catch {
                    try { el.dispatchEvent(new Event("input", { bubbles: true, cancelable: true })); } catch {}
                }
                try { el.dispatchEvent(new Event("change", { bubbles: true })); } catch {}
                return true;
            }

            if (el.isContentEditable) {
                try {
                    el.focus();
                    global.document?.execCommand?.("selectAll", false);
                    global.document?.execCommand?.("insertText", false, text);
                } catch {
                    try { el.textContent = text; } catch { return false; }
                }
                try { el.dispatchEvent(new InputEvent("input", { bubbles: true })); } catch {}
                return true;
            }

            return false;
        }

        function clearInputValue(el) {
            return setInputValue(el, "");
        }

        function findComposerElement({ shouldIgnore = null } = {}) {
            const ignore = typeof shouldIgnore === "function" ? shouldIgnore : null;
            const active = global.document?.activeElement || null;
            if (active && (!ignore || !ignore(active)) && (active.tagName === "TEXTAREA" || active.tagName === "INPUT" || active.isContentEditable)) return active;

            const selectors = [
                "textarea[aria-label]",
                "textarea",
                "input[type='text']",
                "[contenteditable='true'][role='textbox']",
                "[contenteditable='true']"
            ];

            const candidates = [];
            for (const sel of selectors) {
                try {
                    candidates.push(...Array.from(global.document?.querySelectorAll?.(sel) || []));
                } catch {}
            }
            const filtered = ignore ? candidates.filter(el => !ignore(el)) : candidates;
            return pickBestComposerCandidate(filtered);
        }

        async function focusComposer({ timeoutMs = 2500, intervalMs = 120, shouldCancel = null, shouldIgnore = null } = {}) {
            const cancelFn = typeof shouldCancel === "function" ? shouldCancel : null;
            const ignoreFn = typeof shouldIgnore === "function" ? shouldIgnore : null;
            const deadline = Date.now() + Math.max(0, Number(timeoutMs) || 0);
            let composer = findComposerElement({ shouldIgnore: ignoreFn });

            while (!composer && Date.now() < deadline) {
                if (cancelFn && cancelFn()) return null;
                await sleep(intervalMs);
                composer = findComposerElement({ shouldIgnore: ignoreFn });
            }

            if (cancelFn && cancelFn()) return null;
            if (!composer) return null;
            try { composer.scrollIntoView?.({ block: "center" }); } catch {}
            try { composer.focus?.(); } catch {}
            try { Utils?.events?.simulateClick?.(composer, { nativeFallback: true }); } catch {}
            await sleep(20);
            return composer;
        }

        function dispatchPasteEvent(target, clipboardData) {
            if (!target) return false;
            const init = { bubbles: true, cancelable: true, composed: true };
            let evt = null;
            try {
                if (typeof ClipboardEvent === "function") {
                    evt = new ClipboardEvent("paste", { ...init, clipboardData });
                }
            } catch {}
            if (!evt) {
                try { evt = new Event("paste", init); } catch { evt = null; }
            }
            if (!evt) return false;
            if (clipboardData) {
                try { Object.defineProperty(evt, "clipboardData", { value: clipboardData, configurable: true }); } catch {}
                try { Object.defineProperty(evt, "dataTransfer", { value: clipboardData, configurable: true }); } catch {}
            }
            try { target.dispatchEvent(evt); return true; } catch { return false; }
        }

        function dispatchBeforeInputFromPaste(target, dataTransfer) {
            if (!target) return false;
            const init = { bubbles: true, cancelable: true, composed: true };
            let evt = null;
            try {
                if (typeof InputEvent === "function") {
                    evt = new InputEvent("beforeinput", { ...init, inputType: "insertFromPaste", dataTransfer });
                }
            } catch {}
            if (!evt) {
                try { evt = new Event("beforeinput", init); } catch { evt = null; }
            }
            if (!evt) return false;
            try { Object.defineProperty(evt, "inputType", { value: "insertFromPaste", configurable: true }); } catch {}
            if (dataTransfer) {
                try { Object.defineProperty(evt, "dataTransfer", { value: dataTransfer, configurable: true }); } catch {}
                try { Object.defineProperty(evt, "clipboardData", { value: dataTransfer, configurable: true }); } catch {}
            }
            try { return target.dispatchEvent(evt); } catch { return false; }
        }

        function dispatchInputFromPaste(target, dataTransfer) {
            if (!target) return false;
            const init = { bubbles: true, cancelable: false, composed: true };
            let evt = null;
            try {
                if (typeof InputEvent === "function") {
                    evt = new InputEvent("input", { ...init, inputType: "insertFromPaste", dataTransfer });
                }
            } catch {}
            if (!evt) {
                try { evt = new Event("input", init); } catch { evt = null; }
            }
            if (!evt) return false;
            try { Object.defineProperty(evt, "inputType", { value: "insertFromPaste", configurable: true }); } catch {}
            if (dataTransfer) {
                try { Object.defineProperty(evt, "dataTransfer", { value: dataTransfer, configurable: true }); } catch {}
                try { Object.defineProperty(evt, "clipboardData", { value: dataTransfer, configurable: true }); } catch {}
            }
            try { return target.dispatchEvent(evt); } catch { return false; }
        }

        function dispatchDragEvent(target, type, dataTransfer) {
            if (!target) return false;
            const init = { bubbles: true, cancelable: true, composed: true };
            let clientX = 0;
            let clientY = 0;
            try {
                const rect = target.getBoundingClientRect?.();
                if (rect) {
                    clientX = rect.left + rect.width * 0.5;
                    clientY = rect.top + rect.height * 0.5;
                }
            } catch {}
            try {
                if (typeof DragEvent === "function") {
                    const evt = new DragEvent(type, { ...init, dataTransfer, clientX, clientY });
                    target.dispatchEvent(evt);
                    return true;
                }
            } catch {}
            try {
                const evt = new Event(type, init);
                if (dataTransfer) {
                    try { Object.defineProperty(evt, "dataTransfer", { value: dataTransfer, configurable: true }); } catch {}
                }
                try {
                    Object.defineProperty(evt, "clientX", { value: clientX, configurable: true });
                    Object.defineProperty(evt, "clientY", { value: clientY, configurable: true });
                } catch {}
                target.dispatchEvent(evt);
                return true;
            } catch {
                return false;
            }
        }

        function collectFileInputs(rootEl, { shouldIgnore = null } = {}) {
            const ignore = typeof shouldIgnore === "function" ? shouldIgnore : null;
            if (!rootEl || typeof rootEl.querySelectorAll !== "function") return [];
            try {
                return Array.from(rootEl.querySelectorAll("input[type='file']")).filter(input => input && (!ignore || !ignore(input)));
            } catch {
                return [];
            }
        }

        function collectFileInputsFromOpenShadows(rootEl, { maxHosts = 2000, shouldIgnore = null } = {}) {
            const ignore = typeof shouldIgnore === "function" ? shouldIgnore : null;
            const results = [];
            const stack = [];
            const visited = new Set();
            if (rootEl) stack.push(rootEl);

            let remainingHosts = Math.max(0, Number(maxHosts) || 0);
            while (stack.length && remainingHosts > 0) {
                const node = stack.pop();
                if (!node || visited.has(node)) continue;
                visited.add(node);
                if (ignore && ignore(node)) continue;
                if (typeof node.querySelectorAll !== "function") continue;

                try {
                    results.push(...Array.from(node.querySelectorAll("input[type='file']")).filter(input => input && (!ignore || !ignore(input))));
                } catch {}

                let descendants;
                try { descendants = node.querySelectorAll("*"); } catch { descendants = null; }
                if (!descendants) continue;

                for (const el of descendants) {
                    if (remainingHosts-- <= 0) break;
                    if (!el) continue;
                    if (ignore && ignore(el)) continue;
                    const shadow = el.shadowRoot;
                    if (shadow && !visited.has(shadow)) stack.push(shadow);
                }
            }

            return results;
        }

        function trySetFileInputFiles(input, file) {
            if (!input) return false;
            if (!(input instanceof HTMLInputElement)) return false;
            if (String(input.type || "").toLowerCase() !== "file") return false;
            if (input.disabled) return false;

            let dt;
            try {
                dt = new DataTransfer();
                dt.items.add(file);
            } catch {
                return false;
            }

            let assigned = false;
            try { input.files = dt.files; assigned = true; } catch {}
            if (!assigned) {
                try {
                    Object.defineProperty(input, "files", { value: dt.files, configurable: true });
                    assigned = true;
                } catch {}
            }

            if (!assigned) return false;
            try {
                const init = { bubbles: true, cancelable: true, composed: true };
                input.dispatchEvent(new Event("input", init));
                input.dispatchEvent(new Event("change", init));
            } catch {}

            try { return (input.files?.length || 0) > 0; } catch { return true; }
        }

        function safeStoreGet(key, fallback) {
            const k = String(key ?? "").trim();
            if (!k) return fallback;
            try {
                if (typeof GM_getValue === "function") return GM_getValue(k, fallback);
            } catch {}
            try {
                const raw = global.localStorage?.getItem?.(k);
                if (raw == null) return fallback;
                return JSON.parse(raw);
            } catch {}
            return fallback;
        }

        function safeStoreSet(key, value) {
            const k = String(key ?? "").trim();
            if (!k) return;
            try {
                if (typeof GM_setValue === "function") return GM_setValue(k, value);
            } catch {}
            try {
                global.localStorage?.setItem?.(k, JSON.stringify(value));
            } catch {}
        }

        const DEFAULT_LABELS = Object.freeze({
            tabs: Object.freeze({ input: "输入", log: "日志" }),
            fields: Object.freeze({
                images: "图片：",
                preview: "预览：",
                text: "文字：",
                hotkeys: "调用快捷键(可选)：",
                loopCount: "循环次数：",
                newChatHotkey: "新对话快捷键：",
                stepDelay: "步骤间隔(ms)：",
                loopDelay: "循环间隔(ms)：",
                options: "选项："
            }),
            buttons: Object.freeze({
                run: "运行",
                stop: "停止",
                addHotkey: "增加快捷键",
                delete: "删除",
                clearImages: "清空图片"
            }),
            placeholders: Object.freeze({
                imageDrop: "点击选择 / 粘贴 / 拖拽图片",
                text: "在这里输入/粘贴要发送的文字…",
                hotkeyPrimary: "留空则不触发（例如：CTRL+I）",
                hotkeyExtra: "例如：CTRL+I",
                newChatHotkey: "例如：CTRL+N"
            }),
            hints: Object.freeze({
                flow: "流程：插入图片 → 输入文字 →（可选）依次触发快捷键（可多条）→ Enter/Send（循环会按「新对话快捷键」新建对话）。"
            }),
            options: Object.freeze({
                clearBeforeRun: "运行前清空输入框"
            }),
            aria: Object.freeze({
                close: "关闭",
                deleteHotkey: "删除该快捷键",
                deleteImage: "删除该图片",
                clearImages: "清空图片"
            }),
            messages: Object.freeze({
                noImagesDetected: "未检测到图片文件。",
                imagesLoaded: (count, kb) => `已载入图片：${count} 张（约 ${kb} KB）`,
                imageDeleted: (label, remaining) => `已删除图片${label}（剩余 ${remaining} 张）。`,
                imagesCleared: "已清除图片。",
                missingNewChatHotkey: "请填写「新对话快捷键」。",
                missingInput: "请先输入文字或载入图片。",
                start: (loopCount, toolHotkeys, newChatHotkey, imageCount) =>
                    `开始执行：循环 ${loopCount} 次，工具快捷键 ${toolHotkeys.length ? toolHotkeys.join("、") : "(无)"}，新对话快捷键 ${newChatHotkey}，图片 ${imageCount} 张。`,
                loopMarker: (i, loopCount) => `—— 第 ${i}/${loopCount} 次 ——`,
                composerNotFound: "未找到输入框：请先点击一次输入框再运行。",
                textInserted: (ok) => (ok ? "已输入文字。" : "输入文字失败。"),
                hotkeyTriggered: (hotkey, ok) => (ok ? `已触发快捷键：${hotkey}` : `触发快捷键失败：${hotkey}`),
                waitingUploads: (count) => `等待图片上传完成…（${count} 张）`,
                uploadNotReady: "图片尚未上传完成：已取消发送，避免文字先发。",
                sendAttempted: (ok) => (ok ? "已尝试发送（Enter/Send）。" : "发送失败。"),
                loopDelayBeforeNewChat: (ms) => `循环间隔等待中：${ms} ms（发送后 → 新对话前）。`,
                newChatTriggered: (hotkey, ok) => (ok ? `已触发循环：${hotkey} 新建对话。` : `循环新建对话失败：${hotkey}。`),
                stopped: "已停止。",
                finished: "完成。",
                stopRequested: "收到停止请求，将尽快停止…",
                missingAttachAdapter: "图片发送未配置：请在 quickInput.adapter.attachImages 中实现图片插入逻辑。"
            })
        });

        const DEFAULT_CONFIG = Object.freeze({
            toolHotkeys: Object.freeze(["CTRL+I"]),
            toolHotkey: "CTRL+I",
            newChatHotkey: "CTRL+N",
            loopCount: 1,
            stepDelayMs: 120,
            loopDelayMs: 800,
            clearBeforeRun: true,
            panelPos: null
        });

        function normalizeToolHotkeys(value) {
            if (Array.isArray(value)) {
                return value.map(v => String(v ?? "").trim()).filter(Boolean);
            }
            if (typeof value === "string") {
                const trimmed = value.trim();
                return trimmed ? [trimmed] : [];
            }
            return [];
        }

        function loadConfig(storageKey, defaults) {
            const stored = safeStoreGet(storageKey, null);
            const raw = stored && typeof stored === "object" ? stored : {};
            const base = defaults && typeof defaults === "object" ? defaults : DEFAULT_CONFIG;

            const hasToolHotkeys = Object.prototype.hasOwnProperty.call(raw, "toolHotkeys");
            const hasToolHotkey = Object.prototype.hasOwnProperty.call(raw, "toolHotkey");
            const toolHotkeys = (hasToolHotkeys || hasToolHotkey)
                ? normalizeToolHotkeys(hasToolHotkeys ? raw.toolHotkeys : raw.toolHotkey)
                : normalizeToolHotkeys(base.toolHotkeys);

            const panelPos = (() => {
                const pos = raw.panelPos;
                if (!pos || typeof pos !== "object" || Array.isArray(pos)) return null;
                const left = Number(pos.left);
                const top = Number(pos.top);
                if (!Number.isFinite(left) || !Number.isFinite(top)) return null;
                return { left, top };
            })();

            return {
                toolHotkeys,
                toolHotkey: toolHotkeys[0] || "",
                newChatHotkey: typeof raw.newChatHotkey === "string" ? raw.newChatHotkey : base.newChatHotkey,
                loopCount: clampInt(raw.loopCount, { min: 1, max: 999, fallback: clampInt(base.loopCount, { min: 1, max: 999, fallback: 1 }) }),
                stepDelayMs: clampInt(raw.stepDelayMs, { min: 0, max: 30000, fallback: clampInt(base.stepDelayMs, { min: 0, max: 30000, fallback: 120 }) }),
                loopDelayMs: clampInt(raw.loopDelayMs, { min: 0, max: 300000, fallback: clampInt(base.loopDelayMs, { min: 0, max: 300000, fallback: 800 }) }),
                clearBeforeRun: raw.clearBeforeRun !== false,
                panelPos
            };
        }

        function saveConfig(storageKey, cfg, defaults) {
            const safe = cfg && typeof cfg === "object" ? cfg : {};
            const base = defaults && typeof defaults === "object" ? defaults : DEFAULT_CONFIG;
            const stored = safeStoreGet(storageKey, null);
            const prev = stored && typeof stored === "object" ? stored : {};

            const readToolHotkeys = (value) => {
                if (!value || typeof value !== "object") return null;
                if (Object.prototype.hasOwnProperty.call(value, "toolHotkeys")) return normalizeToolHotkeys(value.toolHotkeys);
                if (Object.prototype.hasOwnProperty.call(value, "toolHotkey")) return normalizeToolHotkeys(value.toolHotkey);
                return null;
            };

            const toolHotkeys = readToolHotkeys(safe) ?? readToolHotkeys(prev) ?? normalizeToolHotkeys(base.toolHotkeys);
            const toolHotkey = toolHotkeys[0] || "";
            const newChatHotkey = (typeof safe.newChatHotkey === "string")
                ? safe.newChatHotkey
                : (typeof prev.newChatHotkey === "string" ? prev.newChatHotkey : base.newChatHotkey);

            const panelPos = (() => {
                const src = (safe.panelPos && typeof safe.panelPos === "object" && !Array.isArray(safe.panelPos))
                    ? safe.panelPos
                    : prev.panelPos;
                if (!src || typeof src !== "object" || Array.isArray(src)) return null;
                const left = Number(src.left);
                const top = Number(src.top);
                if (!Number.isFinite(left) || !Number.isFinite(top)) return null;
                return { left, top };
            })();

            const payload = {
                toolHotkeys,
                toolHotkey,
                newChatHotkey,
                loopCount: clampInt(safe.loopCount, { min: 1, max: 999, fallback: clampInt(base.loopCount, { min: 1, max: 999, fallback: 1 }) }),
                stepDelayMs: clampInt(safe.stepDelayMs, { min: 0, max: 30000, fallback: clampInt(base.stepDelayMs, { min: 0, max: 30000, fallback: 120 }) }),
                loopDelayMs: clampInt(safe.loopDelayMs, { min: 0, max: 300000, fallback: clampInt(base.loopDelayMs, { min: 0, max: 300000, fallback: 800 }) }),
                clearBeforeRun: safe.clearBeforeRun !== false
            };
            if (panelPos) payload.panelPos = panelPos;
            safeStoreSet(storageKey, payload);
        }

        async function executeEngineShortcutByHotkey(engine, hotkey) {
            const api = engine || null;
            const core = api?.core || null;
            const normalize = core?.hotkeys?.normalize || core?.normalizeHotkey || null;
            const normalizeOne = (value) => {
                const raw = normalizeHotkeyString(value);
                return typeof normalize === "function" ? normalize(raw) : normalizeHotkeyFallback(raw);
            };
            const norm = normalizeOne(hotkey);
            if (!norm) return false;

            let shortcut = core?.getShortcutByHotkeyNorm?.(norm) || null;
            if (!shortcut && typeof api?.getShortcuts === "function") {
                const list = api.getShortcuts();
                if (Array.isArray(list)) {
                    shortcut = list.find(item => item && normalizeOne(item.hotkey) === norm) || null;
                }
            }
            if (!shortcut) return false;

            try {
                const res = core?.executeShortcutAction?.(shortcut, null);
                if (res && typeof res.then === "function") {
                    try { await res; } catch {}
                }
            } catch {}
            return true;
        }

        async function sleepWithCancel(totalMs, { shouldCancel = null, chunkMs = 160 } = {}) {
            const cancelFn = typeof shouldCancel === "function" ? shouldCancel : null;
            let remain = Math.max(0, Number(totalMs) || 0);
            const chunk = Math.max(20, Number(chunkMs) || 160);

            while (remain > 0) {
                if (cancelFn && cancelFn()) return false;
                const waitMs = Math.min(remain, chunk);
                await sleep(waitMs);
                remain -= waitMs;
            }

            return !(cancelFn && cancelFn());
        }

        function createController(userOptions = {}) {
            const options = userOptions && typeof userOptions === "object" ? userOptions : {};
            const engine = options.engine;
            if (!engine || typeof engine !== "object") throw new Error("[QuickInput] createController: missing engine");

            const idPrefix = String(options.idPrefix || "").trim() || "quick-input";
            const storageKey = String(options.storageKey || `${idPrefix}_quick_input_v1`).trim() || `${idPrefix}_quick_input_v1`;
            const titleText = String(options.title || "快捷输入").trim() || "快捷输入";
            const primaryColor = String(options.primaryColor || "#4285F4").trim() || "#4285F4";
            const styleId = `${idPrefix}-quick-input-style`;
            const overlayId = `${idPrefix}-quick-input-overlay`;

            const labels = deepMerge(deepMerge({}, DEFAULT_LABELS), options.labels || {});
            const defaults = deepMerge(deepMerge({}, DEFAULT_CONFIG), options.defaults || {});

            const rawAdapter = options.adapter && typeof options.adapter === "object" ? options.adapter : {};
            const adapter = Object.freeze({
                focusComposer: typeof rawAdapter.focusComposer === "function" ? rawAdapter.focusComposer : (opts) =>
                    focusComposer({ ...(opts || {}), shouldIgnore: (el) => isInsideOverlay(el) }),
                setInputValue: typeof rawAdapter.setInputValue === "function" ? rawAdapter.setInputValue : setInputValue,
                clearComposerValue: typeof rawAdapter.clearComposerValue === "function" ? rawAdapter.clearComposerValue : clearInputValue,
                attachImages: typeof rawAdapter.attachImages === "function" ? rawAdapter.attachImages : null,
                waitForReadyToSend: typeof rawAdapter.waitForReadyToSend === "function" ? rawAdapter.waitForReadyToSend : null,
                sendMessage: typeof rawAdapter.sendMessage === "function" ? rawAdapter.sendMessage : async (composerEl) =>
                    simulateKeystroke("ENTER", { target: composerEl })
            });

            let overlayEl = null;
            let panelEl = null;
            let logEl = null;
            let fileInputEl = null;
            let previewRowEl = null;
            let imagePreviewShellEl = null;
            let clearAllImagesBtnEl = null;
            let imagePreviewListEl = null;
            let imageDropEl = null;
            let textEl = null;
            let hotkeyListEl = null;
            let addHotkeyBtnEl = null;
            const hotkeyInputs = [];
            let newChatHotkeyEl = null;
            let loopEl = null;
            let stepDelayEl = null;
            let loopDelayEl = null;
            let clearBeforeRunEl = null;
            const runButtons = [];
            const stopButtons = [];
            let activeTab = "input";
            let setActiveTab = null;

            let imageFiles = [];
            let imageObjectUrls = [];
            let running = false;
            let cancelRun = false;

            let dragPointerId = null;
            let dragOffsetX = 0;
            let dragOffsetY = 0;
            let dragWidth = 0;
            let dragHeight = 0;
            let dragStartLeft = 0;
            let dragStartTop = 0;
            let dragMoved = false;
            let dragRaf = 0;
            let dragNextLeft = 0;
            let dragNextTop = 0;
            let dragRestore = null;

            let themeAutoTimer = null;

            function isInsideOverlay(el) {
                if (!el || typeof el.closest !== "function") return false;
                try { return !!el.closest(`#${overlayId}`); } catch { return false; }
            }

            function clampPanelHeightPx(value) {
                const num = Number(value);
                if (!Number.isFinite(num) || num <= 0) return 0;
                const max = Math.min(global.innerHeight * 0.86, 860);
                if (!Number.isFinite(max) || max <= 0) return Math.round(num);
                return Math.round(Math.min(num, max));
            }

            function syncPanelMinHeight() {
                if (!panelEl) return;
                let rect;
                try { rect = panelEl.getBoundingClientRect(); } catch { rect = null; }
                if (!rect) return;
                const next = clampPanelHeightPx(rect.height);
                if (!next) return;
                panelEl.style.minHeight = `${next}px`;
            }

            function ensureStyle() {
                let style = global.document?.getElementById?.(styleId) || null;
                if (!style) {
                    style = global.document?.createElement?.("style");
                    if (!style) return;
                    style.id = styleId;
                    global.document?.head?.appendChild?.(style);
                }
                style.textContent = `
                #${overlayId} {
                    position: fixed;
                    inset: 0;
                    background: rgba(0, 0, 0, 0.7);
                    z-index: 2147483646;
                    display: none;
                    align-items: center;
                    justify-content: center;
                    padding: 18px;
                    box-sizing: border-box;
                }
                #${overlayId}[data-open="1"] { display: flex; }
                #${overlayId} .qi-panel {
                    position: fixed;
                    left: 50%;
                    top: 50%;
                    transform: translate(-50%, -50%);
                    width: min(330px, 96vw);
                    max-height: min(86vh, 860px);
                    overflow: hidden;
                    font-family: sans-serif;
                    background: #1a1a1a;
                    color: #ffffff;
                    border: 1px solid #404040;
                    border-radius: 14px;
                    box-shadow: 0 18px 60px rgba(0,0,0,0.55);
                    display: flex;
                    flex-direction: column;
                }
                #${overlayId} .qi-header {
                    display: flex;
                    align-items: center;
                    justify-content: space-between;
                    gap: 10px;
                    padding: 10px 14px;
                    border-bottom: 1px solid #404040;
                    background: #1a1a1a;
                    cursor: move;
                    user-select: none;
                    -webkit-user-select: none;
                    touch-action: none;
                }
                #${overlayId} .qi-title {
                    font-size: 14px;
                    font-weight: 700;
                    letter-spacing: 0.2px;
                }
                #${overlayId} .qi-close {
                    border: none;
                    background: transparent;
                    color: rgba(255,255,255,0.75);
                    font-size: 18px;
                    cursor: pointer;
                    padding: 6px 8px;
                    border-radius: 8px;
                }
                #${overlayId} .qi-close:hover { background: rgba(255,255,255,0.08); color: #fff; }
                #${overlayId} .qi-tabs {
                    display: flex;
                    gap: 8px;
                    flex: 1;
                    justify-content: center;
                    padding: 0;
                }
                #${overlayId} .qi-tab {
                    flex: 1;
                    font-family: inherit;
                    border: 1px solid #404040;
                    background: #2d2d2d;
                    color: rgba(255,255,255,0.85);
                    padding: 6px 10px;
                    border-radius: 999px;
                    cursor: pointer;
                    font-size: 12px;
                    font-weight: 650;
                }
                #${overlayId} .qi-tab:hover { border-color: ${primaryColor}; }
                #${overlayId} .qi-tab[data-active="1"] {
                    background: ${primaryColor};
                    border-color: ${primaryColor};
                    color: #fff;
                }
                #${overlayId} .qi-content {
                    flex: 1;
                    display: flex;
                    flex-direction: column;
                    overflow: hidden;
                    min-height: 0;
                }
                #${overlayId} .qi-tab-panel {
                    flex: 1;
                    display: none;
                    flex-direction: column;
                    overflow: hidden;
                    min-height: 0;
                }
                #${overlayId} .qi-tab-panel[data-active="1"] { display: flex; }
                #${overlayId} .qi-actions {
                    padding: 6px 12px;
                    border-top: 1px solid #404040;
                    background: #1a1a1a;
                    display: flex;
                    justify-content: flex-end;
                    gap: 6px;
                }
                #${overlayId} .qi-actions .qi-btn {
                    padding: 6px 12px;
                    font-size: 12px;
                    line-height: 1.2;
                    border-radius: 999px;
                }
                #${overlayId} .qi-body {
                    padding: 14px;
                    overflow: auto;
                    display: grid;
                    gap: 12px;
                    flex: 1;
                    min-height: 0;
                }
                #${overlayId} .qi-row {
                    display: grid;
                    grid-template-columns: 110px 1fr;
                    gap: 10px;
                    align-items: center;
                }
                #${overlayId} label { font-size: 14px; font-weight: 650; color: #ffffff; }
                #${overlayId} input[type="text"], #${overlayId} input[type="number"], #${overlayId} textarea, #${overlayId} select {
                    width: 100%;
                    box-sizing: border-box;
                    padding: 8px 10px;
                    font-family: inherit;
                    border-radius: 10px;
                    border: 1px solid #404040;
                    background: #2d2d2d;
                    color: #ffffff;
                    outline: none;
                    font-size: 13px;
                }
                #${overlayId} .qi-hotkey-item {
                    position: relative;
                }
                #${overlayId} .qi-hotkey-item input[type="text"] {
                    padding-right: 34px;
                }
                #${overlayId} .qi-hotkey-del {
                    position: absolute;
                    top: 6px;
                    right: 6px;
                    width: 20px;
                    height: 20px;
                    padding: 0;
                    box-sizing: border-box;
                    border-radius: 999px;
                    border: 1px solid #404040;
                    background: rgba(0,0,0,0.55);
                    color: rgba(255,255,255,0.9);
                    cursor: pointer;
                    display: inline-flex;
                    align-items: center;
                    justify-content: center;
                    font-size: 0;
                    line-height: 0;
                    user-select: none;
                    -webkit-user-select: none;
                    touch-action: manipulation;
                }
                #${overlayId} .qi-hotkey-del::before,
                #${overlayId} .qi-hotkey-del::after {
                    content: "";
                    position: absolute;
                    top: 50%;
                    left: 50%;
                    width: 12px;
                    height: 2px;
                    background: currentColor;
                    border-radius: 999px;
                    transform-origin: center;
                }
                #${overlayId} .qi-hotkey-del::before { transform: translate(-50%, -50%) rotate(45deg); }
                #${overlayId} .qi-hotkey-del::after { transform: translate(-50%, -50%) rotate(-45deg); }
                #${overlayId} .qi-hotkey-del:hover { background: rgba(0,0,0,0.75); }
                #${overlayId} .qi-hotkey-del:disabled { opacity: 0.55; cursor: not-allowed; }
                #${overlayId} input[type="text"]:focus, #${overlayId} input[type="number"]:focus, #${overlayId} textarea:focus, #${overlayId} select:focus {
                    border-color: ${primaryColor};
                    box-shadow: 0 0 0 1px ${primaryColor};
                }
                #${overlayId} textarea { min-height: 3.8em; resize: vertical; }
                #${overlayId} .qi-label-stack {
                    display: flex;
                    flex-direction: column;
                    gap: 4px;
                    align-items: flex-start;
                }
                #${overlayId} .qi-drop {
                    border: 1px dashed #404040;
                    border-radius: 12px;
                    padding: 12px;
                    font-size: 12px;
                    line-height: 1.25;
                    color: rgba(255,255,255,0.9);
                    background: #2d2d2d;
                    cursor: pointer;
                    user-select: none;
                }
                #${overlayId} .qi-drop:hover { border-color: ${primaryColor}; background: rgba(255,255,255,0.08); }
                #${overlayId} .qi-drop:focus { outline: none; }
                #${overlayId} .qi-preview-list {
                    width: 100%;
                    display: none;
                    flex-wrap: wrap;
                    gap: 8px;
                    padding: 30px 8px 8px 8px;
                    border-radius: 12px;
                    border: 1px solid #404040;
                    background: #2d2d2d;
                    box-sizing: border-box;
                }
                #${overlayId} .qi-preview-list:not(:empty) { display: flex; }
                #${overlayId} .qi-preview-shell {
                    width: 100%;
                    position: relative;
                }
                #${overlayId} .qi-preview-clear {
                    position: absolute;
                    top: 6px;
                    right: 6px;
                    width: 22px;
                    height: 22px;
                    padding: 0;
                    border-radius: 999px;
                    border: 1px solid rgba(255,255,255,0.18);
                    background: rgba(239, 68, 68, 0.92);
                    color: #fff;
                    cursor: pointer;
                    display: none;
                    align-items: center;
                    justify-content: center;
                    box-sizing: border-box;
                    font-size: 0;
                    line-height: 0;
                    user-select: none;
                    -webkit-user-select: none;
                    touch-action: manipulation;
                }
                #${overlayId} .qi-preview-shell[data-has-items="1"] .qi-preview-clear { display: inline-flex; }
                #${overlayId} .qi-preview-clear::before,
                #${overlayId} .qi-preview-clear::after {
                    content: "";
                    position: absolute;
                    top: 50%;
                    left: 50%;
                    width: 12px;
                    height: 2px;
                    background: currentColor;
                    border-radius: 999px;
                    transform-origin: center;
                }
                #${overlayId} .qi-preview-clear::before { transform: translate(-50%, -50%) rotate(45deg); }
                #${overlayId} .qi-preview-clear::after { transform: translate(-50%, -50%) rotate(-45deg); }
                #${overlayId} .qi-preview-clear:hover { filter: brightness(0.96); }
                #${overlayId} .qi-preview-clear:disabled { opacity: 0.55; cursor: not-allowed; }
                #${overlayId} .qi-preview-wrap {
                    position: relative;
                    width: 72px;
                    height: 72px;
                    flex: 0 0 auto;
                }
                #${overlayId} .qi-preview-item {
                    width: 100%;
                    height: 100%;
                    display: block;
                    object-fit: cover;
                    border-radius: 10px;
                    border: 1px solid #404040;
                }
                #${overlayId} .qi-preview-del {
                    position: absolute;
                    top: 0;
                    right: -1px;
                    width: 20px;
                    height: 20px;
                    padding: 0;
                    box-sizing: border-box;
                    border-radius: 999px;
                    border: 1px solid #404040;
                    background: rgba(0,0,0,0.55);
                    color: rgba(255,255,255,0.9);
                    cursor: pointer;
                    display: block;
                    font-size: 0;
                    line-height: 0;
                    user-select: none;
                    -webkit-user-select: none;
                    touch-action: manipulation;
                }
                #${overlayId} .qi-preview-del::before,
                #${overlayId} .qi-preview-del::after {
                    content: "";
                    position: absolute;
                    top: 50%;
                    left: 50%;
                    width: 12px;
                    height: 2px;
                    background: currentColor;
                    border-radius: 999px;
                    transform-origin: center;
                }
                #${overlayId} .qi-preview-del::before { transform: translate(-50%, -50%) rotate(45deg); }
                #${overlayId} .qi-preview-del::after { transform: translate(-50%, -50%) rotate(-45deg); }
                #${overlayId} .qi-preview-del:hover { background: rgba(0,0,0,0.75); }
                #${overlayId} .qi-preview-del:disabled { opacity: 0.55; cursor: not-allowed; }
                #${overlayId} .qi-btn {
                    padding: 8px 14px;
                    border-radius: 10px;
                    border: 1px solid #404040;
                    font-family: inherit;
                    background: #2d2d2d;
                    color: #ffffff;
                    cursor: pointer;
                    font-size: 13px;
                    font-weight: 650;
                }
                #${overlayId} .qi-btn:not(.qi-btn-primary):hover { background: rgba(255,255,255,0.1); }
                #${overlayId} .qi-btn-primary {
                    background: ${primaryColor};
                    border-color: ${primaryColor};
                    color: #fff;
                }
                #${overlayId} .qi-btn:disabled { opacity: 0.55; cursor: not-allowed; }
                #${overlayId} .qi-hint { font-size: 12px; color: rgba(255,255,255,0.72); }
                #${overlayId} .qi-log {
                    padding: 10px 14px;
                    font-size: 12px;
                    color: rgba(255,255,255,0.85);
                    overflow: auto;
                    flex: 1;
                    min-height: 0;
                    white-space: pre-wrap;
                    line-height: 1.35;
                }
                #${overlayId} .qi-log .qi-error { color: #fca5a5; }
                #${overlayId} .qi-log .qi-ok { color: #86efac; }
                #${overlayId} .qi-inline {
                    display: inline-flex;
                    gap: 10px;
                    align-items: center;
                    flex-wrap: wrap;
                }

                #${overlayId}[data-theme="light"] { background: rgba(0, 0, 0, 0.32); }
                #${overlayId}[data-theme="light"] .qi-panel {
                    background: #ffffff;
                    color: #111827;
                    border-color: rgba(17, 24, 39, 0.16);
                }
                #${overlayId}[data-theme="light"] .qi-header {
                    background: rgba(17, 24, 39, 0.03);
                    border-color: rgba(17, 24, 39, 0.12);
                }
                #${overlayId}[data-theme="light"] .qi-tab {
                    border-color: rgba(17, 24, 39, 0.18);
                    background: rgba(17, 24, 39, 0.06);
                    color: rgba(17, 24, 39, 0.88);
                }
                #${overlayId}[data-theme="light"] .qi-tab:hover { background: rgba(17, 24, 39, 0.08); }
                #${overlayId}[data-theme="light"] .qi-tab[data-active="1"] {
                    background: ${primaryColor};
                    border-color: ${primaryColor};
                    color: #fff;
                }
                #${overlayId}[data-theme="light"] .qi-actions {
                    background: rgba(17, 24, 39, 0.03);
                    border-color: rgba(17, 24, 39, 0.12);
                }
                #${overlayId}[data-theme="light"] label { color: rgba(17, 24, 39, 0.85); }
                #${overlayId}[data-theme="light"] .qi-close { color: rgba(17, 24, 39, 0.65); }
                #${overlayId}[data-theme="light"] .qi-close:hover { background: rgba(17, 24, 39, 0.08); color: #111827; }
                #${overlayId}[data-theme="light"] input[type="text"],
                #${overlayId}[data-theme="light"] input[type="number"],
                #${overlayId}[data-theme="light"] textarea,
                #${overlayId}[data-theme="light"] select {
                    border-color: rgba(17, 24, 39, 0.18);
                    background: rgba(255, 255, 255, 0.95);
                    color: #111827;
                }
                #${overlayId}[data-theme="light"] .qi-drop {
                    border-color: rgba(17, 24, 39, 0.25);
                    background: rgba(17, 24, 39, 0.03);
                    color: rgba(17, 24, 39, 0.9);
                }
                #${overlayId}[data-theme="light"] .qi-drop:hover { background: rgba(17, 24, 39, 0.05); }
                #${overlayId}[data-theme="light"] .qi-hotkey-del {
                    border-color: rgba(17, 24, 39, 0.18);
                    background: rgba(255,255,255,0.92);
                    color: rgba(17,24,39,0.78);
                }
                #${overlayId}[data-theme="light"] .qi-hotkey-del:hover { background: rgba(255,255,255,1); }
                #${overlayId}[data-theme="light"] .qi-preview-list {
                    border-color: rgba(17, 24, 39, 0.12);
                    background: rgba(17, 24, 39, 0.03);
                }
                #${overlayId}[data-theme="light"] .qi-preview-item {
                    border-color: rgba(17, 24, 39, 0.12);
                }
                #${overlayId}[data-theme="light"] .qi-preview-del {
                    border-color: rgba(17, 24, 39, 0.18);
                    background: rgba(255,255,255,0.92);
                    color: rgba(17,24,39,0.78);
                }
                #${overlayId}[data-theme="light"] .qi-preview-del:hover { background: rgba(255,255,255,1); }
                #${overlayId}[data-theme="light"] .qi-preview-clear {
                    border-color: rgba(185, 28, 28, 0.35);
                    background: rgba(239, 68, 68, 0.92);
                    color: #fff;
                }
                #${overlayId}[data-theme="light"] .qi-btn:not(.qi-btn-primary) {
                    background: rgba(17, 24, 39, 0.06);
                    border-color: rgba(17, 24, 39, 0.18);
                    color: #111827;
                }
                #${overlayId}[data-theme="light"] .qi-btn:not(.qi-btn-primary):hover {
                    background: rgba(17, 24, 39, 0.08);
                }
                #${overlayId}[data-theme="light"] .qi-btn.qi-btn-primary {
                    background: ${primaryColor};
                    border-color: ${primaryColor};
                    color: #fff;
                }
                #${overlayId}[data-theme="light"] .qi-btn.qi-btn-primary:hover {
                    filter: brightness(0.96);
                }
                #${overlayId}[data-theme="light"] .qi-hint { color: rgba(17, 24, 39, 0.65); }
                #${overlayId}[data-theme="light"] .qi-log { color: rgba(17, 24, 39, 0.78); }
                #${overlayId}[data-theme="light"] .qi-log .qi-error { color: #b91c1c; }
                #${overlayId}[data-theme="light"] .qi-log .qi-ok { color: #15803d; }
                `;
            }

            function appendLog(text, { level = "info" } = {}) {
                if (!logEl) return;
                const now = new Date();
                const time = `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}:${String(now.getSeconds()).padStart(2, "0")}`;
                const line = `[${time}] ${String(text ?? "")}`;
                const span = global.document?.createElement?.("div");
                if (!span) return;
                if (level === "error") span.className = "qi-error";
                if (level === "ok") span.className = "qi-ok";
                span.textContent = line;
                logEl.appendChild(span);
                logEl.scrollTop = logEl.scrollHeight;
            }

            function clearLog() {
                if (!logEl) return;
                logEl.textContent = "";
            }

            function revokeImageUrls() {
                for (const url of imageObjectUrls) {
                    if (!url) continue;
                    try { URL.revokeObjectURL(url); } catch {}
                }
                imageObjectUrls = [];
            }

            function setImageFiles(nextFiles) {
                revokeImageUrls();
                imageFiles = Array.isArray(nextFiles) ? nextFiles.filter(Boolean) : [];

                if (!imagePreviewListEl) return;
                imagePreviewListEl.textContent = "";
                let previewCount = 0;
                imageFiles.forEach((file, index) => {
                    if (!(file instanceof File)) return;
                    const url = URL.createObjectURL(file);
                    imageObjectUrls.push(url);
                    const wrap = global.document.createElement("div");
                    wrap.className = "qi-preview-wrap";
                    wrap.title = file.name || "";
                    const img = global.document.createElement("img");
                    img.className = "qi-preview-item";
                    img.src = url;
                    img.alt = file.name || "image";
                    wrap.appendChild(img);

                    const delBtn = global.document.createElement("button");
                    delBtn.type = "button";
                    delBtn.className = "qi-preview-del";
                    delBtn.textContent = "×";
                    delBtn.title = labels.buttons?.delete || "删除";
                    delBtn.setAttribute("aria-label", labels.aria?.deleteImage || "删除该图片");
                    delBtn.disabled = running;
                    delBtn.addEventListener("click", (e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        if (running) return;
                        const next = imageFiles.filter((_, i) => i !== index);
                        setImageFiles(next);
                        const label = file.name ? `：${file.name}` : ` #${index + 1}`;
                        appendLog(labels.messages?.imageDeleted ? labels.messages.imageDeleted(label, next.length) : `已删除图片${label}（剩余 ${next.length} 张）。`, { level: "ok" });
                    });
                    wrap.appendChild(delBtn);

                    imagePreviewListEl.appendChild(wrap);
                    previewCount += 1;
                });
                const hasItems = previewCount > 0;
                if (imagePreviewShellEl) imagePreviewShellEl.setAttribute("data-has-items", hasItems ? "1" : "0");
                if (clearAllImagesBtnEl) {
                    clearAllImagesBtnEl.disabled = running || !hasItems;
                }
                if (previewRowEl) previewRowEl.style.display = hasItems ? "" : "none";
            }

            function onPickFiles(fileList) {
                const files = Array.from(fileList || []).filter(Boolean);
                const images = files.filter(f => String(f?.type || "").startsWith("image/"));
                if (images.length === 0) {
                    appendLog(labels.messages?.noImagesDetected || DEFAULT_LABELS.messages.noImagesDetected, { level: "error" });
                    return;
                }

                setImageFiles(images);
                const kb = images.reduce((sum, file) => sum + (Number(file?.size) || 0), 0) / 1024;
                const msg = labels.messages?.imagesLoaded
                    ? labels.messages.imagesLoaded(images.length, Math.round(kb))
                    : DEFAULT_LABELS.messages.imagesLoaded(images.length, Math.round(kb));
                appendLog(msg, { level: "ok" });
            }

            function clearImageDropFocus({ focusText = true } = {}) {
                try { imageDropEl?.blur?.(); } catch {}
                try { fileInputEl?.blur?.(); } catch {}

                if (!focusText) return;
                if (activeTab !== "input") return;
                if (!overlayEl || overlayEl.getAttribute("data-open") !== "1") return;
                try { textEl?.focus?.(); } catch {}
            }

            function setRunning(nextRunning) {
                running = !!nextRunning;
                for (const btn of runButtons) {
                    if (btn) btn.disabled = running;
                }
                for (const btn of stopButtons) {
                    if (btn) btn.disabled = !running;
                }
                for (const input of hotkeyInputs) {
                    if (input) input.disabled = running;
                }
                if (addHotkeyBtnEl) addHotkeyBtnEl.disabled = running;
                try {
                    const delButtons = hotkeyListEl?.querySelectorAll?.("button.qi-hotkey-del") || [];
                    for (const btn of delButtons) {
                        if (btn) btn.disabled = running;
                    }
                } catch {}
                if (loopEl) loopEl.disabled = running;
                if (stepDelayEl) stepDelayEl.disabled = running;
                if (loopDelayEl) loopDelayEl.disabled = running;
                if (clearBeforeRunEl) clearBeforeRunEl.disabled = running;
                if (newChatHotkeyEl) newChatHotkeyEl.disabled = running;
                if (textEl) textEl.disabled = running;
                if (imageDropEl) imageDropEl.style.opacity = running ? "0.7" : "1";
                if (clearAllImagesBtnEl) {
                    const hasImages = (imageFiles?.length || 0) > 0;
                    clearAllImagesBtnEl.disabled = running || !hasImages;
                }
                try {
                    const delButtons = imagePreviewListEl?.querySelectorAll?.("button.qi-preview-del") || [];
                    for (const btn of delButtons) {
                        if (btn) btn.disabled = running;
                    }
                } catch {}
            }

            function isColorDark(colorStr) {
                if (!colorStr || colorStr === "transparent") {
                    return !!(global.matchMedia && global.matchMedia("(prefers-color-scheme: dark)").matches);
                }
                try {
                    let r, g, b, a = 1;
                    const value = String(colorStr);
                    if (value.startsWith("rgba")) {
                        const parts = value.match(/rgba?\s*\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*(?:,\s*([\d.]+))?\s*\)\s*$/i);
                        if (!parts) return false;
                        [, r, g, b, a] = parts.map(Number);
                        a = Number.isFinite(a) ? a : 1;
                        if (a < 0.5) return false;
                    } else if (value.startsWith("rgb")) {
                        const parts = value.match(/rgb\s*\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*\)\s*$/i);
                        if (!parts) return false;
                        [, r, g, b] = parts.map(Number);
                    } else if (value.startsWith("#")) {
                        let hex = value.slice(1);
                        if (hex.length === 3) hex = hex.split("").map(c => c + c).join("");
                        if (hex.length === 4) hex = hex.split("").map(c => c + c).join("");
                        if (hex.length === 8) a = parseInt(hex.slice(6, 8), 16) / 255;
                        if (hex.length !== 6 && hex.length !== 8) return false;
                        r = parseInt(hex.slice(0, 2), 16);
                        g = parseInt(hex.slice(2, 4), 16);
                        b = parseInt(hex.slice(4, 6), 16);
                        if (a < 0.5) return false;
                    } else {
                        return false;
                    }
                    const luminance = (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
                    return luminance < 0.5;
                } catch {
                    return false;
                }
            }

            function detectPageTheme() {
                const htmlEl = global.document?.documentElement;
                const bodyEl = global.document?.body;
                const htmlTheme = htmlEl?.getAttribute?.("data-theme");
                const bodyTheme = bodyEl?.getAttribute?.("data-theme");

                if (htmlEl?.classList?.contains?.("dark") || bodyEl?.classList?.contains?.("dark")) return "dark";
                if (htmlTheme === "dark" || bodyTheme === "dark") return "dark";
                if (htmlEl?.classList?.contains?.("light") || bodyEl?.classList?.contains?.("light")) return "light";
                if (htmlTheme === "light" || bodyTheme === "light") return "light";

                try {
                    const bgColor = global.getComputedStyle(bodyEl || htmlEl).backgroundColor;
                    if (isColorDark(bgColor)) return "dark";
                    return "light";
                } catch {}

                return (global.matchMedia && global.matchMedia("(prefers-color-scheme: dark)").matches) ? "dark" : "light";
            }

            function normalizeTheme(value) {
                return String(value ?? "").trim().toLowerCase() === "light" ? "light" : "dark";
            }

            function applyTheme(theme) {
                if (!overlayEl) return;
                overlayEl.setAttribute("data-theme", normalizeTheme(theme));
            }

            function stopThemeAutoSync() {
                if (!themeAutoTimer) return;
                clearInterval(themeAutoTimer);
                themeAutoTimer = null;
            }

            function startThemeAutoSync() {
                if (themeAutoTimer) return;
                const tick = () => {
                    if (!overlayEl || overlayEl.getAttribute("data-open") !== "1") return;
                    applyTheme(detectPageTheme());
                };
                themeAutoTimer = setInterval(tick, 800);
                tick();
            }

            function refreshTheme() {
                applyTheme(detectPageTheme());
            }

            function clampPanelPos(left, top, width, height) {
                const margin = 8;
                const w = Math.max(0, Number(width) || 0);
                const h = Math.max(0, Number(height) || 0);
                const maxLeft = Math.max(margin, global.innerWidth - w - margin);
                const maxTop = Math.max(margin, global.innerHeight - h - margin);
                return {
                    left: Math.min(maxLeft, Math.max(margin, left)),
                    top: Math.min(maxTop, Math.max(margin, top))
                };
            }

            function readConfigFromUi() {
                const toolHotkeys = hotkeyInputs
                    .map(input => String(input?.value ?? "").trim())
                    .filter(Boolean);
                return {
                    toolHotkeys,
                    toolHotkey: toolHotkeys[0] || "",
                    newChatHotkey: String(newChatHotkeyEl?.value ?? ""),
                    loopCount: clampInt(loopEl?.value, { min: 1, max: 999, fallback: clampInt(defaults.loopCount, { min: 1, max: 999, fallback: 1 }) }),
                    stepDelayMs: clampInt(stepDelayEl?.value, { min: 0, max: 30000, fallback: clampInt(defaults.stepDelayMs, { min: 0, max: 30000, fallback: 120 }) }),
                    loopDelayMs: clampInt(loopDelayEl?.value, { min: 0, max: 300000, fallback: clampInt(defaults.loopDelayMs, { min: 0, max: 300000, fallback: 800 }) }),
                    clearBeforeRun: !!clearBeforeRunEl?.checked
                };
            }

            function persistPanelPos(left, top, { force = false } = {}) {
                const current = loadConfig(storageKey, defaults);
                const prev = current?.panelPos;
                const next = { left, top };
                if (!force && prev && Math.abs(prev.left - left) < 0.5 && Math.abs(prev.top - top) < 0.5) return;
                saveConfig(storageKey, { ...readConfigFromUi(), panelPos: next }, defaults);
            }

            function applyStoredPanelPos() {
                if (!panelEl) return;
                const cfg = loadConfig(storageKey, defaults);
                const pos = cfg?.panelPos;
                if (!pos) {
                    panelEl.style.left = "";
                    panelEl.style.top = "";
                    panelEl.style.transform = "";
                    return;
                }

                const rect = panelEl.getBoundingClientRect();
                const clamped = clampPanelPos(pos.left, pos.top, rect.width, rect.height);
                panelEl.style.left = `${clamped.left}px`;
                panelEl.style.top = `${clamped.top}px`;
                panelEl.style.transform = "none";
                if (clamped.left !== pos.left || clamped.top !== pos.top) persistPanelPos(clamped.left, clamped.top, { force: true });
            }

            function stopDrag() {
                if (dragRaf) {
                    cancelAnimationFrame(dragRaf);
                    dragRaf = 0;
                }
                if (dragPointerId === null) return;
                dragPointerId = null;
                dragMoved = false;
                global.removeEventListener("pointermove", onDragPointerMove, true);
                global.removeEventListener("pointerup", onDragPointerUp, true);
                global.removeEventListener("pointercancel", onDragPointerUp, true);
                if (dragRestore) {
                    try { global.document.body.style.userSelect = dragRestore.userSelect; } catch {}
                    try { global.document.body.style.cursor = dragRestore.cursor; } catch {}
                    dragRestore = null;
                }
            }

            function onHeaderPointerDown(e) {
                if (!e || dragPointerId !== null) return;
                if (e.button !== 0) return;
                if (e.target && typeof e.target.closest === "function" && e.target.closest(".qi-close, .qi-tabs, .qi-tab")) return;
                if (!overlayEl || overlayEl.getAttribute("data-open") !== "1") return;
                if (!panelEl) return;

                const rect = panelEl.getBoundingClientRect();
                dragPointerId = e.pointerId;
                dragOffsetX = e.clientX - rect.left;
                dragOffsetY = e.clientY - rect.top;
                dragWidth = rect.width;
                dragHeight = rect.height;
                dragStartLeft = rect.left;
                dragStartTop = rect.top;
                dragNextLeft = rect.left;
                dragNextTop = rect.top;
                dragMoved = false;

                global.addEventListener("pointermove", onDragPointerMove, true);
                global.addEventListener("pointerup", onDragPointerUp, true);
                global.addEventListener("pointercancel", onDragPointerUp, true);
                try { e.currentTarget?.setPointerCapture?.(e.pointerId); } catch {}
                try { e.preventDefault(); } catch {}
            }

            function onDragPointerMove(e) {
                if (dragPointerId === null || e.pointerId !== dragPointerId) return;
                if (!panelEl) return;

                const left = e.clientX - dragOffsetX;
                const top = e.clientY - dragOffsetY;

                if (!dragMoved) {
                    const dx = Math.abs(left - dragStartLeft);
                    const dy = Math.abs(top - dragStartTop);
                    if (dx + dy < 3) return;
                    dragMoved = true;
                    dragRestore = { userSelect: global.document.body.style.userSelect, cursor: global.document.body.style.cursor };
                    try { global.document.body.style.userSelect = "none"; } catch {}
                    try { global.document.body.style.cursor = "move"; } catch {}
                    panelEl.style.left = `${dragStartLeft}px`;
                    panelEl.style.top = `${dragStartTop}px`;
                    panelEl.style.transform = "none";
                }

                const clamped = clampPanelPos(left, top, dragWidth, dragHeight);
                dragNextLeft = clamped.left;
                dragNextTop = clamped.top;
                if (dragRaf) return;
                dragRaf = requestAnimationFrame(() => {
                    dragRaf = 0;
                    if (!panelEl) return;
                    panelEl.style.left = `${dragNextLeft}px`;
                    panelEl.style.top = `${dragNextTop}px`;
                });
            }

            function onDragPointerUp(e) {
                if (dragPointerId === null || e.pointerId !== dragPointerId) return;
                const moved = dragMoved;
                stopDrag();
                if (!moved || !panelEl) return;

                const rect = panelEl.getBoundingClientRect();
                const clamped = clampPanelPos(rect.left, rect.top, rect.width, rect.height);
                panelEl.style.left = `${clamped.left}px`;
                panelEl.style.top = `${clamped.top}px`;
                panelEl.style.transform = "none";
                persistPanelPos(clamped.left, clamped.top, { force: true });
            }

            function syncHotkeyPlaceholders() {
                hotkeyInputs.forEach((input, idx) => {
                    if (!input) return;
                    input.placeholder = idx === 0
                        ? (labels.placeholders?.hotkeyPrimary || DEFAULT_LABELS.placeholders.hotkeyPrimary)
                        : (labels.placeholders?.hotkeyExtra || DEFAULT_LABELS.placeholders.hotkeyExtra);
                });
            }

            function createHotkeyInputItem({ value = "" } = {}) {
                const item = global.document.createElement("div");
                item.className = "qi-hotkey-item";

                const input = global.document.createElement("input");
                input.type = "text";
                input.value = String(value ?? "");
                input.disabled = running;

                const delBtn = global.document.createElement("button");
                delBtn.type = "button";
                delBtn.className = "qi-hotkey-del";
                delBtn.textContent = "×";
                delBtn.title = labels.buttons?.delete || "删除";
                delBtn.setAttribute("aria-label", labels.aria?.deleteHotkey || "删除该快捷键");
                delBtn.disabled = running;
                delBtn.addEventListener("click", (e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    if (running) return;

                    const idx = hotkeyInputs.indexOf(input);
                    if (idx === -1) return;

                    if (hotkeyInputs.length <= 1) {
                        input.value = "";
                        syncHotkeyPlaceholders();
                        saveConfig(storageKey, readConfigFromUi(), defaults);
                        return;
                    }

                    hotkeyInputs.splice(idx, 1);
                    try { item.remove(); } catch {}
                    syncHotkeyPlaceholders();
                    saveConfig(storageKey, readConfigFromUi(), defaults);
                });

                item.appendChild(input);
                item.appendChild(delBtn);

                return { item, input };
            }

            function appendHotkeyInput(value) {
                if (!hotkeyListEl) return null;
                const { item, input } = createHotkeyInputItem({ value });
                hotkeyListEl.appendChild(item);
                hotkeyInputs.push(input);
                syncHotkeyPlaceholders();
                return input;
            }

            function writeConfigToUi(cfg) {
                if (!cfg) return;
                const rawToolHotkeys = Array.isArray(cfg.toolHotkeys)
                    ? cfg.toolHotkeys
                    : ((typeof cfg.toolHotkey === "string") ? [cfg.toolHotkey] : []);
                const toolHotkeys = rawToolHotkeys.map(value => String(value ?? "").trim()).filter(Boolean);
                const desired = toolHotkeys.length ? toolHotkeys : [""];

                if (hotkeyListEl) {
                    while (hotkeyInputs.length < desired.length) {
                        appendHotkeyInput("");
                    }
                    while (hotkeyInputs.length > desired.length) {
                        const input = hotkeyInputs.pop();
                        const item = input?.closest?.(".qi-hotkey-item") || input?.parentElement || input;
                        try { item?.remove?.(); } catch {}
                    }
                    hotkeyInputs.forEach((input, idx) => {
                        if (!input) return;
                        input.value = desired[idx] ?? "";
                    });
                    syncHotkeyPlaceholders();
                }
                if (newChatHotkeyEl) newChatHotkeyEl.value = (typeof cfg.newChatHotkey === "string") ? cfg.newChatHotkey : defaults.newChatHotkey;
                if (loopEl) loopEl.value = String(clampInt(cfg.loopCount, { min: 1, max: 999, fallback: clampInt(defaults.loopCount, { min: 1, max: 999, fallback: 1 }) }));
                if (stepDelayEl) stepDelayEl.value = String(clampInt(cfg.stepDelayMs, { min: 0, max: 30000, fallback: clampInt(defaults.stepDelayMs, { min: 0, max: 30000, fallback: 120 }) }));
                if (loopDelayEl) loopDelayEl.value = String(clampInt(cfg.loopDelayMs, { min: 0, max: 300000, fallback: clampInt(defaults.loopDelayMs, { min: 0, max: 300000, fallback: 800 }) }));
                if (clearBeforeRunEl) clearBeforeRunEl.checked = cfg.clearBeforeRun !== false;
            }

            async function transitionToNextLoop({ loopDelayMs, newChatHotkey, shouldCancel, sendCompletedAtMs }) {
                const cancelFn = typeof shouldCancel === "function" ? shouldCancel : null;
                const delayMs = Math.max(0, Number(loopDelayMs) || 0);
                const sendAt = Number(sendCompletedAtMs);
                const delayDeadline = (Number.isFinite(sendAt) ? sendAt : Date.now()) + delayMs;
                const remainMs = Math.max(0, delayDeadline - Date.now());

                if (delayMs > 0) {
                    const waitingMsg = labels.messages?.loopDelayBeforeNewChat
                        ? labels.messages.loopDelayBeforeNewChat(delayMs)
                        : (DEFAULT_LABELS.messages.loopDelayBeforeNewChat
                            ? DEFAULT_LABELS.messages.loopDelayBeforeNewChat(delayMs)
                            : "");
                    if (waitingMsg) appendLog(waitingMsg);
                }

                const waitOk = await sleepWithCancel(remainMs, { shouldCancel: cancelFn, chunkMs: 160 });
                if (!waitOk) return { cancelled: true, okNewChat: false };

                const okNewChat = await executeEngineShortcutByHotkey(engine, newChatHotkey);
                const newChatMsg = labels.messages?.newChatTriggered
                    ? labels.messages.newChatTriggered(newChatHotkey, okNewChat)
                    : DEFAULT_LABELS.messages.newChatTriggered(newChatHotkey, okNewChat);
                appendLog(newChatMsg, { level: okNewChat ? "ok" : "error" });

                return { cancelled: !!(cancelFn && cancelFn()), okNewChat };
            }

            async function runMacro() {
                if (running) return;
                cancelRun = false;
                setRunning(true);
                clearLog();

                const cfg = readConfigFromUi();
                saveConfig(storageKey, cfg, defaults);

                const promptText = String(textEl?.value ?? "");
                const images = Array.isArray(imageFiles) ? imageFiles.filter(Boolean) : [];
                const toolHotkeys = Array.isArray(cfg.toolHotkeys)
                    ? cfg.toolHotkeys.map(value => String(value ?? "").trim()).filter(Boolean)
                    : [];
                const newChatHotkey = String(cfg.newChatHotkey ?? "").trim();

                if (!newChatHotkey) {
                    appendLog(labels.messages?.missingNewChatHotkey || DEFAULT_LABELS.messages.missingNewChatHotkey, { level: "error" });
                    setRunning(false);
                    return;
                }

                if (images.length === 0 && !promptText.trim()) {
                    appendLog(labels.messages?.missingInput || DEFAULT_LABELS.messages.missingInput, { level: "error" });
                    setRunning(false);
                    return;
                }

                const shouldCancel = () => cancelRun;
                setActiveTab?.("log");
                const startMsg = labels.messages?.start
                    ? labels.messages.start(cfg.loopCount, toolHotkeys, newChatHotkey, images.length)
                    : DEFAULT_LABELS.messages.start(cfg.loopCount, toolHotkeys, newChatHotkey, images.length);
                appendLog(startMsg);

                for (let i = 0; i < cfg.loopCount; i++) {
                    if (cancelRun) break;
                    const marker = labels.messages?.loopMarker
                        ? labels.messages.loopMarker(i + 1, cfg.loopCount)
                        : DEFAULT_LABELS.messages.loopMarker(i + 1, cfg.loopCount);
                    appendLog(marker);

                    const composer = await adapter.focusComposer({ timeoutMs: 15000, intervalMs: 160, shouldCancel });
                    if (!composer) {
                        if (cancelRun) break;
                        appendLog(labels.messages?.composerNotFound || DEFAULT_LABELS.messages.composerNotFound, { level: "error" });
                        break;
                    }

                    if (cfg.clearBeforeRun) adapter.clearComposerValue(composer);
                    await sleep(cfg.stepDelayMs);
                    if (cancelRun) break;

                    if (images.length) {
                        if (!adapter.attachImages) {
                            cancelRun = true;
                            appendLog(labels.messages?.missingAttachAdapter || DEFAULT_LABELS.messages.missingAttachAdapter, { level: "error" });
                            break;
                        }

                        const result = await adapter.attachImages(images, composer, {
                            shouldCancel,
                            onDiagnostics: (diag) => {
                                if (!diag) return;
                                if (typeof diag === "string") {
                                    appendLog(diag, { level: "error" });
                                    return;
                                }
                                if (diag && typeof diag === "object") {
                                    const level = String(diag.level || "").toLowerCase() === "ok" ? "ok" : "error";
                                    if (typeof diag.message === "string" && diag.message.trim()) {
                                        appendLog(diag.message, { level });
                                        return;
                                    }
                                    try { appendLog(`诊断: ${JSON.stringify(diag)}`, { level: "error" }); } catch {}
                                }
                            }
                        });
                        if (result?.cancelled) break;
                        if (!result?.ok) {
                            cancelRun = true;
                            const msg = typeof result?.message === "string" && result.message.trim()
                                ? result.message.trim()
                                : "图片插入失败：本轮将中止发送。";
                            appendLog(msg, { level: "error" });
                            break;
                        }
                        appendLog(`已成功插入图片：${images.length} 张。`, { level: "ok" });
                        await sleep(cfg.stepDelayMs);
                        if (cancelRun) break;
                    }

                    if (promptText.trim()) {
                        const okText = adapter.setInputValue(composer, promptText);
                        const msg = labels.messages?.textInserted
                            ? labels.messages.textInserted(okText)
                            : DEFAULT_LABELS.messages.textInserted(okText);
                        appendLog(msg, { level: okText ? "ok" : "error" });
                        await sleep(cfg.stepDelayMs);
                        if (cancelRun) break;
                    }

                    if (toolHotkeys.length) {
                        for (const hotkey of toolHotkeys) {
                            if (cancelRun) break;
                            const okHotkey = await executeEngineShortcutByHotkey(engine, hotkey);
                            const msg = labels.messages?.hotkeyTriggered
                                ? labels.messages.hotkeyTriggered(hotkey, okHotkey)
                                : DEFAULT_LABELS.messages.hotkeyTriggered(hotkey, okHotkey);
                            appendLog(msg, { level: okHotkey ? "ok" : "error" });
                            await sleep(cfg.stepDelayMs);
                        }
                        if (cancelRun) break;
                    }

                    if (images.length) {
                        const waitingMsg = labels.messages?.waitingUploads
                            ? labels.messages.waitingUploads(images.length)
                            : DEFAULT_LABELS.messages.waitingUploads(images.length);
                        appendLog(waitingMsg);

                        if (adapter.waitForReadyToSend) {
                            const ready = await adapter.waitForReadyToSend(composer, { requireImage: true, minAttachments: images.length, timeoutMs: 45000, intervalMs: 160, settleMs: 600, shouldCancel });
                            if (ready?.cancelled) break;
                            if (!ready?.ok) {
                                cancelRun = true;
                                appendLog(labels.messages?.uploadNotReady || DEFAULT_LABELS.messages.uploadNotReady, { level: "error" });
                                break;
                            }
                        } else {
                            await sleep(Math.max(800, cfg.stepDelayMs));
                        }

                        appendLog("图片已就绪。", { level: "ok" });
                        await sleep(Math.min(300, cfg.stepDelayMs));
                        if (cancelRun) break;
                    }

                    if (cancelRun) break;
                    const okSend = await adapter.sendMessage(composer);
                    const sendCompletedAtMs = Date.now();
                    const sendMsg = labels.messages?.sendAttempted
                        ? labels.messages.sendAttempted(okSend)
                        : DEFAULT_LABELS.messages.sendAttempted(okSend);
                    appendLog(sendMsg, { level: okSend ? "ok" : "error" });

                    if (i < cfg.loopCount - 1) {
                        const transition = await transitionToNextLoop({
                            loopDelayMs: cfg.loopDelayMs,
                            newChatHotkey,
                            shouldCancel,
                            sendCompletedAtMs
                        });
                        if (transition.cancelled) break;
                    }
                }

                appendLog(cancelRun ? (labels.messages?.stopped || DEFAULT_LABELS.messages.stopped) : (labels.messages?.finished || DEFAULT_LABELS.messages.finished));
                setRunning(false);
            }

            function stopMacro() {
                if (!running) return;
                cancelRun = true;
                setActiveTab?.("log");
                appendLog(labels.messages?.stopRequested || DEFAULT_LABELS.messages.stopRequested);
            }

            function ensureUi() {
                if (overlayEl) return;
                ensureStyle();

                try { global.document?.getElementById?.(overlayId)?.remove?.(); } catch {}

                overlayEl = global.document.createElement("div");
                overlayEl.id = overlayId;
                overlayEl.setAttribute("data-open", "0");
                overlayEl.setAttribute("data-theme", detectPageTheme());
                overlayEl.addEventListener("click", (e) => {
                    if (e.target === overlayEl) close();
                });

                panelEl = global.document.createElement("div");
                panelEl.className = "qi-panel";
                panelEl.addEventListener("click", (e) => e.stopPropagation());

                const header = global.document.createElement("div");
                header.className = "qi-header";
                header.addEventListener("pointerdown", onHeaderPointerDown);
                const title = global.document.createElement("div");
                title.className = "qi-title";
                title.textContent = titleText;
                const closeBtn = global.document.createElement("button");
                closeBtn.className = "qi-close";
                closeBtn.type = "button";
                closeBtn.textContent = "×";
                closeBtn.title = labels.aria?.close || DEFAULT_LABELS.aria.close;
                closeBtn.setAttribute("aria-label", labels.aria?.close || DEFAULT_LABELS.aria.close);
                closeBtn.addEventListener("click", () => close());
                header.appendChild(title);
                header.appendChild(closeBtn);

                const tabs = global.document.createElement("div");
                tabs.className = "qi-tabs";

                const tabInputBtn = global.document.createElement("button");
                tabInputBtn.type = "button";
                tabInputBtn.className = "qi-tab";
                tabInputBtn.textContent = labels.tabs?.input || DEFAULT_LABELS.tabs.input;
                tabInputBtn.setAttribute("data-active", "1");

                const tabLogBtn = global.document.createElement("button");
                tabLogBtn.type = "button";
                tabLogBtn.className = "qi-tab";
                tabLogBtn.textContent = labels.tabs?.log || DEFAULT_LABELS.tabs.log;
                tabLogBtn.setAttribute("data-active", "0");

                tabs.appendChild(tabInputBtn);
                tabs.appendChild(tabLogBtn);
                header.insertBefore(tabs, closeBtn);

                const content = global.document.createElement("div");
                content.className = "qi-content";

                const inputPanel = global.document.createElement("div");
                inputPanel.className = "qi-tab-panel";
                inputPanel.setAttribute("data-active", "1");

                const body = global.document.createElement("div");
                body.className = "qi-body";

                const imageRow = global.document.createElement("div");
                imageRow.className = "qi-row";
                const imageLabelStack = global.document.createElement("div");
                imageLabelStack.className = "qi-label-stack";
                const imageLabel = global.document.createElement("label");
                imageLabel.textContent = labels.fields?.images || DEFAULT_LABELS.fields.images;
                imageLabelStack.appendChild(imageLabel);
                const imageBox = global.document.createElement("div");
                imageBox.className = "qi-inline";
                imageDropEl = global.document.createElement("div");
                imageDropEl.className = "qi-drop";
                imageDropEl.tabIndex = 0;
                imageDropEl.textContent = labels.placeholders?.imageDrop || DEFAULT_LABELS.placeholders.imageDrop;

                imagePreviewListEl = global.document.createElement("div");
                imagePreviewListEl.className = "qi-preview-list";

                fileInputEl = global.document.createElement("input");
                fileInputEl.type = "file";
                fileInputEl.accept = "image/*";
                fileInputEl.multiple = true;
                fileInputEl.style.display = "none";
                fileInputEl.addEventListener("change", (e) => {
                    if (e && e.isTrusted === false) return;
                    onPickFiles(fileInputEl.files);
                    clearImageDropFocus();
                    try { fileInputEl.value = ""; } catch {}
                });

                imageDropEl.addEventListener("click", () => fileInputEl.click());
                imageDropEl.addEventListener("dragover", (e) => { e.preventDefault(); });
                imageDropEl.addEventListener("drop", (e) => {
                    e.preventDefault();
                    onPickFiles(e.dataTransfer?.files);
                    clearImageDropFocus();
                });
                imageDropEl.addEventListener("paste", (e) => {
                    const items = Array.from(e.clipboardData?.items || []);
                    const files = items
                        .filter(it => it.kind === "file" && String(it.type || "").startsWith("image/"))
                        .map(it => it.getAsFile())
                        .filter(Boolean);
                    if (files.length) {
                        onPickFiles(files);
                        clearImageDropFocus();
                    }
                });

                imageBox.appendChild(imageDropEl);
                imageBox.appendChild(fileInputEl);

                imageRow.appendChild(imageLabelStack);
                imageRow.appendChild(imageBox);

                previewRowEl = global.document.createElement("div");
                previewRowEl.className = "qi-row";
                previewRowEl.style.display = "none";
                const previewLabel = global.document.createElement("label");
                previewLabel.textContent = labels.fields?.preview || DEFAULT_LABELS.fields.preview;
                imagePreviewShellEl = global.document.createElement("div");
                imagePreviewShellEl.className = "qi-preview-shell";
                imagePreviewShellEl.setAttribute("data-has-items", "0");

                clearAllImagesBtnEl = global.document.createElement("button");
                clearAllImagesBtnEl.type = "button";
                clearAllImagesBtnEl.className = "qi-preview-clear";
                clearAllImagesBtnEl.textContent = "×";
                clearAllImagesBtnEl.title = labels.buttons?.clearImages || DEFAULT_LABELS.buttons.clearImages;
                clearAllImagesBtnEl.setAttribute("aria-label", labels.aria?.clearImages || DEFAULT_LABELS.aria.clearImages);
                clearAllImagesBtnEl.disabled = true;
                clearAllImagesBtnEl.addEventListener("click", () => {
                    if (running) return;
                    setImageFiles([]);
                    appendLog(labels.messages?.imagesCleared || DEFAULT_LABELS.messages.imagesCleared);
                });
                imagePreviewShellEl.appendChild(clearAllImagesBtnEl);
                imagePreviewShellEl.appendChild(imagePreviewListEl);

                previewRowEl.appendChild(previewLabel);
                previewRowEl.appendChild(imagePreviewShellEl);

                const textRow = global.document.createElement("div");
                textRow.className = "qi-row";
                const textLabel = global.document.createElement("label");
                textLabel.textContent = labels.fields?.text || DEFAULT_LABELS.fields.text;
                textEl = global.document.createElement("textarea");
                textEl.rows = 3;
                textEl.placeholder = labels.placeholders?.text || DEFAULT_LABELS.placeholders.text;
                textRow.appendChild(textLabel);
                textRow.appendChild(textEl);

                const hotkeyRow = global.document.createElement("div");
                hotkeyRow.className = "qi-row";
                const hotkeyLabel = global.document.createElement("label");
                hotkeyLabel.textContent = labels.fields?.hotkeys || DEFAULT_LABELS.fields.hotkeys;
                const hotkeyStack = global.document.createElement("div");
                hotkeyStack.style.display = "grid";
                hotkeyStack.style.gap = "8px";

                hotkeyListEl = global.document.createElement("div");
                hotkeyListEl.style.display = "grid";
                hotkeyListEl.style.gap = "8px";

                addHotkeyBtnEl = global.document.createElement("button");
                addHotkeyBtnEl.type = "button";
                addHotkeyBtnEl.className = "qi-btn";
                addHotkeyBtnEl.textContent = labels.buttons?.addHotkey || DEFAULT_LABELS.buttons.addHotkey;
                addHotkeyBtnEl.addEventListener("click", () => {
                    if (running) return;
                    const input = appendHotkeyInput("");
                    try { input?.focus?.(); } catch {}
                });

                hotkeyStack.appendChild(hotkeyListEl);
                hotkeyStack.appendChild(addHotkeyBtnEl);

                hotkeyRow.appendChild(hotkeyLabel);
                hotkeyRow.appendChild(hotkeyStack);

                const loopRow = global.document.createElement("div");
                loopRow.className = "qi-row";
                const loopLabel = global.document.createElement("label");
                loopLabel.textContent = labels.fields?.loopCount || DEFAULT_LABELS.fields.loopCount;
                loopEl = global.document.createElement("input");
                loopEl.type = "number";
                loopEl.min = "1";
                loopEl.max = "999";

                loopRow.appendChild(loopLabel);
                loopRow.appendChild(loopEl);

                const newChatRow = global.document.createElement("div");
                newChatRow.className = "qi-row";
                const newChatLabel = global.document.createElement("label");
                newChatLabel.textContent = labels.fields?.newChatHotkey || DEFAULT_LABELS.fields.newChatHotkey;
                newChatHotkeyEl = global.document.createElement("input");
                newChatHotkeyEl.type = "text";
                newChatHotkeyEl.placeholder = labels.placeholders?.newChatHotkey || DEFAULT_LABELS.placeholders.newChatHotkey;
                newChatRow.appendChild(newChatLabel);
                newChatRow.appendChild(newChatHotkeyEl);

                const delayRow = global.document.createElement("div");
                delayRow.className = "qi-row";
                const stepDelayLabel = global.document.createElement("label");
                stepDelayLabel.textContent = labels.fields?.stepDelay || DEFAULT_LABELS.fields.stepDelay;
                stepDelayEl = global.document.createElement("input");
                stepDelayEl.type = "number";
                stepDelayEl.min = "0";
                stepDelayEl.max = "30000";
                const loopDelayLabel = global.document.createElement("label");
                loopDelayLabel.textContent = labels.fields?.loopDelay || DEFAULT_LABELS.fields.loopDelay;
                loopDelayEl = global.document.createElement("input");
                loopDelayEl.type = "number";
                loopDelayEl.min = "0";
                loopDelayEl.max = "300000";

                delayRow.appendChild(stepDelayLabel);
                delayRow.appendChild(stepDelayEl);
                delayRow.appendChild(loopDelayLabel);
                delayRow.appendChild(loopDelayEl);

                const optionsRow = global.document.createElement("div");
                optionsRow.className = "qi-row";
                const optionsLabel = global.document.createElement("label");
                optionsLabel.textContent = labels.fields?.options || DEFAULT_LABELS.fields.options;
                const optionsBox = global.document.createElement("div");
                optionsBox.className = "qi-inline";
                const cbWrap = global.document.createElement("label");
                cbWrap.className = "qi-hint";
                clearBeforeRunEl = global.document.createElement("input");
                clearBeforeRunEl.type = "checkbox";
                clearBeforeRunEl.checked = true;
                cbWrap.appendChild(clearBeforeRunEl);
                cbWrap.appendChild(global.document.createTextNode(` ${labels.options?.clearBeforeRun || DEFAULT_LABELS.options.clearBeforeRun}`));
                optionsBox.appendChild(cbWrap);

                clearBeforeRunEl.addEventListener("change", () => {
                    saveConfig(storageKey, readConfigFromUi(), defaults);
                });
                optionsRow.appendChild(optionsLabel);
                optionsRow.appendChild(optionsBox);

                const hint = global.document.createElement("div");
                hint.className = "qi-hint";
                hint.textContent = labels.hints?.flow || DEFAULT_LABELS.hints.flow;

                body.appendChild(imageRow);
                body.appendChild(previewRowEl);
                body.appendChild(textRow);
                body.appendChild(hotkeyRow);
                body.appendChild(loopRow);
                body.appendChild(newChatRow);
                body.appendChild(delayRow);
                body.appendChild(optionsRow);
                body.appendChild(hint);

                const inputActions = global.document.createElement("div");
                inputActions.className = "qi-actions";

                const stopBtnInput = global.document.createElement("button");
                stopBtnInput.type = "button";
                stopBtnInput.className = "qi-btn";
                stopBtnInput.textContent = labels.buttons?.stop || DEFAULT_LABELS.buttons.stop;
                stopBtnInput.disabled = true;
                stopBtnInput.addEventListener("click", stopMacro);
                stopButtons.push(stopBtnInput);

                const runBtnInput = global.document.createElement("button");
                runBtnInput.type = "button";
                runBtnInput.className = "qi-btn qi-btn-primary";
                runBtnInput.textContent = labels.buttons?.run || DEFAULT_LABELS.buttons.run;
                runBtnInput.addEventListener("click", runMacro);
                runButtons.push(runBtnInput);

                inputActions.appendChild(stopBtnInput);
                inputActions.appendChild(runBtnInput);

                inputPanel.appendChild(body);
                inputPanel.appendChild(inputActions);

                const logPanel = global.document.createElement("div");
                logPanel.className = "qi-tab-panel";
                logPanel.setAttribute("data-active", "0");

                logEl = global.document.createElement("div");
                logEl.className = "qi-log";

                const logActions = global.document.createElement("div");
                logActions.className = "qi-actions";

                const stopBtnLog = global.document.createElement("button");
                stopBtnLog.type = "button";
                stopBtnLog.className = "qi-btn";
                stopBtnLog.textContent = labels.buttons?.stop || DEFAULT_LABELS.buttons.stop;
                stopBtnLog.disabled = true;
                stopBtnLog.addEventListener("click", stopMacro);
                stopButtons.push(stopBtnLog);

                const runBtnLog = global.document.createElement("button");
                runBtnLog.type = "button";
                runBtnLog.className = "qi-btn qi-btn-primary";
                runBtnLog.textContent = labels.buttons?.run || DEFAULT_LABELS.buttons.run;
                runBtnLog.addEventListener("click", runMacro);
                runButtons.push(runBtnLog);

                logActions.appendChild(stopBtnLog);
                logActions.appendChild(runBtnLog);

                logPanel.appendChild(logEl);
                logPanel.appendChild(logActions);

                content.appendChild(inputPanel);
                content.appendChild(logPanel);

                activeTab = "input";
                setActiveTab = (nextTab) => {
                    const key = String(nextTab || "").trim().toLowerCase();
                    const next = (key === "log") ? "log" : "input";
                    const prev = activeTab;
                    if (prev === "input" && next === "log") syncPanelMinHeight();
                    activeTab = next;
                    const inputActive = next === "input";
                    tabInputBtn.setAttribute("data-active", inputActive ? "1" : "0");
                    tabLogBtn.setAttribute("data-active", inputActive ? "0" : "1");
                    inputPanel.setAttribute("data-active", inputActive ? "1" : "0");
                    logPanel.setAttribute("data-active", inputActive ? "0" : "1");
                };
                tabInputBtn.addEventListener("click", () => setActiveTab?.("input"));
                tabLogBtn.addEventListener("click", () => setActiveTab?.("log"));

                panelEl.appendChild(header);
                panelEl.appendChild(content);

                overlayEl.appendChild(panelEl);
                global.document.body.appendChild(overlayEl);

                global.document.addEventListener("keydown", (e) => {
                    if (!overlayEl || overlayEl.getAttribute("data-open") !== "1") return;
                    if (e.key === "Escape") {
                        e.preventDefault();
                        close();
                    }
                }, true);

                writeConfigToUi(loadConfig(storageKey, defaults));
            }

            function open() {
                ensureUi();
                stopDrag();
                overlayEl.setAttribute("data-open", "1");
                refreshTheme();
                startThemeAutoSync();
                requestAnimationFrame(() => {
                    applyStoredPanelPos();
                    syncPanelMinHeight();
                });
                try { if (activeTab === "input") imageDropEl?.focus?.(); } catch {}
            }

            function close() {
                if (!overlayEl) return;
                if (dragPointerId !== null && dragMoved && panelEl) {
                    const rect = panelEl.getBoundingClientRect();
                    const clamped = clampPanelPos(rect.left, rect.top, rect.width, rect.height);
                    persistPanelPos(clamped.left, clamped.top, { force: true });
                }
                stopDrag();
                overlayEl.setAttribute("data-open", "0");
                stopThemeAutoSync();
                if (running) stopMacro();
            }

            return Object.freeze({ open, close });
        }

        

        return Object.freeze({
            createController,
            adapters: Object.freeze({}),
            storage: Object.freeze({
                safeGet: safeStoreGet,
                safeSet: safeStoreSet
            }),
            dom: Object.freeze({
                clampInt,
                normalizeHotkeyString,
                normalizeHotkeyFallback,
                getKeyEventProps,
                simulateKeystroke,
                isElementVisible,
                pickBestComposerCandidate,
                findComposerElement,
                focusComposer,
                setInputValue,
                clearInputValue,
                dispatchPasteEvent,
                dispatchBeforeInputFromPaste,
                dispatchInputFromPaste,
                dispatchDragEvent,
                collectFileInputs,
                collectFileInputsFromOpenShadows,
                trySetFileInputFiles
            }),
            engine: Object.freeze({
                executeShortcutByHotkey: executeEngineShortcutByHotkey
            })
        });
    })();
/* -------------------------------------------------------------------------- *
 * Module 99 · Global export (ShortcutTemplate)
 * -------------------------------------------------------------------------- */

    global.ShortcutTemplate = Object.freeze({
        VERSION: TEMPLATE_VERSION,
        URL_METHODS,
        createShortcutEngine,
        utils: Utils,
        quickInput: QuickInput
    });

})(typeof window !== 'undefined' ? window : this);
