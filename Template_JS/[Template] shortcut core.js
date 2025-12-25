// ==UserScript==
// @name         [Template] 快捷键跳转 [20251225] v1.0.0
// @namespace    https://github.com/0-V-linuxdo/Template_shortcuts.js
// @version      [20251225] v1.0.0
// @update-log   1.0.0: 新增 ShortcutTemplate.utils(menu/dom/events/oneStep) 以参数化菜单点击与 1step 编排，站点脚本仅需填写参数/defs
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

    const DEFAULT_OPTIONS = {
        version: '20251225',
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
 * Module 03 · Engine core (storage, icons, state, shared helpers)
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
	            searchQuery: '',
	            currentPanelOverlay: null,
	            currentPanelCloser: null,
	            currentEditCloser: null,
	            destroyResponsiveListener: null,
	            destroyDarkModeObserver: null,
	            destroyDragCss: null,
	            menuCommandRegistered: false,
	            filterChangedEventName: `${idPrefix}-filterChanged`
	        };

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

	        const GMX = (typeof GM_xmlhttpRequest === 'function')
	            ? GM_xmlhttpRequest
	            : (typeof GM !== 'undefined' && GM.xmlHttpRequest ? GM.xmlHttpRequest : null);

        let engineApi = null;
        let shortcuts = loadShortcuts();
        ensureUniqueShortcutIds(shortcuts);
        const core = createCoreLayer();
        const uiShared = createUiSharedLayer();

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
		                icon: shortcut.icon || ""
		            };
		        }

        function loadShortcuts() {
            const stored = safeGMGet(options.storageKeys.shortcuts, options.defaultShortcuts);
            const list = Array.isArray(stored) ? stored : [];
            return list.map(normalizeShortcut);
        }

        function saveShortcuts() {
            safeGMSet(options.storageKeys.shortcuts, shortcuts);
        }

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

            function rebuildHotkeyIndex() {
                const next = new Map();
                for (let i = 0; i < shortcuts.length; i++) {
                    const item = shortcuts[i];
                    if (!item || !item.hotkey) continue;
                    const norm = normalizeHotkey(item.hotkey);
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
                if (!item) return;
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
                        executeCustomAction(item, event);
                        break;
                    default:
                        console.warn(`${options.consoleTag} Shortcut "${item.name}" has unknown actionType: ${item.actionType}`);
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

	            return Object.freeze({
	                setShortcuts: setShortcutsList,
	                mutateShortcuts,
	                persistShortcuts: saveShortcuts,
	                getShortcuts: getShortcutsSnapshot,
	                rebuildHotkeyIndex,
	                getShortcutByHotkeyNorm,
	                executeShortcutAction,
	                hotkeys: Object.freeze({
	                    normalize: normalizeHotkey,
	                    modifierOrder: HOTKEY_MODIFIER_ORDER,
	                    fromEvent: getHotkeyFromKeyboardEvent,
	                    getMainKeyFromEvent: getStandardKeyFromKeyboardEvent,
	                    isAllowedMainKey: isAllowedHotkeyMainKey,
	                    isAllowedSimulateMainKey,
	                    formatForDisplay: formatHotkeyForDisplay,
	                    formatModifierToken: formatHotkeyModifierToken,
	                    formatKeyToken: formatHotkeyMainKeyDisplayToken
	                }),
	                normalizeHotkey,
	                normalizeShortcut
	            });
	        }

        function createUiSharedLayer() {
            return Object.freeze({
                theme: Object.freeze({
                    addThemeChangeListener,
                    removeThemeChangeListener,
                    setupDarkModeObserver,
                    detectInitialDarkMode
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
                })
            });
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
	            if (htmlEl.classList.contains('dark') || bodyEl?.classList?.contains('dark')) {
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
	            try {
	                observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class', 'data-theme'] });
	                if (document.body) {
	                    observer.observe(document.body, { attributes: true, attributeFilter: ['class', 'data-theme'] });
	                }
	            } catch {}

	            intervalId = setInterval(() => { detectInitialDarkMode(); }, 5000);
	            detectInitialDarkMode();

	            return () => {
	                if (cleaned) return;
	                cleaned = true;
	                try { if (removeMediaListener) removeMediaListener(); } catch {}
	                try { if (observer) observer.disconnect(); } catch {}
	                try { if (intervalId) clearInterval(intervalId); } catch {}
	            };
	        }

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

		            const mainKey = normalizeMainKeyToken(getStandardKeyFromKeyboardEvent(e), modifiers);
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
	            const sel = (typeof selector === "string") ? selector.trim() : "";
	            if (!sel) return;

	            const element = Utils.dom.safeQuerySelector(document, sel);
	            if (!element) {
	                showAlert(`无法找到元素: ${sel}`);
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

	            const ok = Utils.events.simulateClick(element, { nativeFallback: true });
	            if (ok) return;

	            const fallbackTarget = (typeof element.closest === "function")
	                ? (element.closest('button, a, [role="button"], [onclick]') || element)
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
	                console.error(`${options.consoleTag} Failed to dispatch click event on element: ${sel}`, eventError);
	                showAlert(`无法模拟点击元素: ${sel}`);
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
	                margin: '0 0 15px 0', lineHeight: '1.4', whiteSpace: 'pre-wrap'
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
            getUrlMethodDisplayText,
            setIconImage,
            setTrustedHTML: Utils?.dom?.setTrustedHTML,
            safeGMGet,
            safeGMSet,
            debounce
        };

        engineApi = createEngineApi(ctx);
        return engineApi;
    }
/* -------------------------------------------------------------------------- *
 * Module 04 · Keyboard handling (hotkey parsing, matching, action dispatch)
 * -------------------------------------------------------------------------- */

        function createKeyboardLayer(ctx = {}) {
            const { state, core } = ctx;
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
                const allowedTags = ['INPUT', 'TEXTAREA', 'SELECT'];
                const isAllowedTag = allowedTags.includes(activeEl.tagName);
                const isContentEditable = !!activeEl.isContentEditable;
                const isHotkeyCapturer = isInHotkeyCaptureMode(activeEl);
                return (isAllowedTag || isContentEditable) && !isHotkeyCapturer;
            }

            function isAllowedShortcut(e) {
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

            function onKeydown(e) {
                if (!e) return;

                if (state.isSettingsPanelOpen) {
                    if (isInHotkeyCaptureMode(e.target)) {
                        return;
                    }
                    if (isAllowedShortcut(e)) {
                        return;
                    }
                    if (isInAllowedInputElement(e.target)) {
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
                ids,
                classes,
                URL_METHODS,
                getUrlMethodDisplayText,
                setIconImage,
                setTrustedHTML,
                safeGMGet,
                safeGMSet,
                debounce
            } = ctx;
            const { theme, colors, style, dialogs, layout } = uiShared;
            const { addThemeChangeListener, removeThemeChangeListener } = theme;
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

	            function matchesSearchQuery(shortcut, queryLower) {
	                const query = typeof queryLower === "string" ? queryLower : "";
	                if (!query) return true;
	                if (!shortcut) return false;
	                const haystack = [
	                    shortcut.name,
	                    shortcut.url,
	                    shortcut.selector,
	                    shortcut.simulateKeys,
	                    shortcut.customAction
	                ].filter(Boolean).join(" ").toLowerCase();
	                return haystack.includes(query);
	            }

	            function getShortcutStats() {
	                const list = core.getShortcuts();
	                const query = String(state.searchQuery || "").trim().toLowerCase();
	                const stats = {
	                    total: 0,
	                    url: 0,
	                    selector: 0,
	                    simulate: 0,
	                    custom: 0
	                };
	                list.forEach(shortcut => {
	                    if (!matchesSearchQuery(shortcut, query)) return;
	                    stats.total++;
	                    if (shortcut.actionType === 'url') stats.url++;
	                    else if (shortcut.actionType === 'selector') stats.selector++;
	                    else if (shortcut.actionType === 'simulate') stats.simulate++;
	                    else if (shortcut.actionType === 'custom') stats.custom++;
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
	                    if (type === 'all' || shortcut.actionType === type) {
	                        filtered.push({ item: shortcut, index: i });
	                    }
	                }
	                return filtered;
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
	                Object.assign(button.style, {
	                    flex: "0 0 auto",
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

                const escapeHtml = (input) =>
                    String(input ?? "").replace(/[&<>"']/g, (ch) => ({
                        "&": "&amp;",
                        "<": "&lt;",
                        ">": "&gt;",
                        '"': "&quot;",
                        "'": "&#39;"
                    })[ch] || ch);

                const safeLabel = escapeHtml(label);
                const safeCount = escapeHtml(count);
                const html = `<span style="margin-right: 6px;">${safeLabel}</span><span style="background: ${isActive ? 'rgba(255,255,255,0.3)' : color}; color: white; padding: 2px 6px; border-radius: 8px;">${safeCount}</span>`;
                if (typeof setTrustedHTML === "function") {
                    setTrustedHTML(button, html);
                } else {
                    button.textContent = `${label} ${count}`;
                }

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

	            function createStatsDisplay() {
	                const stats = getShortcutStats();
	                const container = document.createElement("div");
	                container.id = ids.stats;
	                Object.assign(container.style, {
	                    display: "flex",
	                    alignItems: "center",
	                    gap: "8px",
	                    flex: "1 1 auto",
	                    minWidth: "0",
	                    padding: "2px 0",
	                    flexWrap: "nowrap",
	                    overflowX: "auto",
	                    overflowY: "hidden",
	                    WebkitOverflowScrolling: "touch"
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

            function updateStatsDisplay() {
                const existingStats = document.getElementById(ids.stats);
                if (existingStats) {
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
	                justifyContent: "flex-start",
	                alignItems: "center",
	                marginBottom: "15px",
	                paddingBottom: "10px",
	                flexWrap: "nowrap",
	                gap: "10px",
	                minWidth: "0"
	            });

		            const title = document.createElement("h2");
		            title.textContent = options.panelTitle || '自定义快捷键';
		            Object.assign(title.style, {
		                margin: "0",
		                fontSize: "1.1em",
		                flex: "0 999 auto",
		                minWidth: "0",
		                overflow: "hidden",
		                textOverflow: "ellipsis",
		                whiteSpace: "nowrap"
		            });
	            headerContainer.appendChild(title);

		            const actionsContainer = document.createElement("div");
			            Object.assign(actionsContainer.style, {
			                display: "flex",
			                alignItems: "center",
			                justifyContent: "flex-end",
			                gap: "6px",
			                flex: "0 0 auto"
			            });

	            const settingsBtn = document.createElement("button");
	            settingsBtn.type = "button";
	            settingsBtn.title = options.text.buttons.settings || "设置";
	            settingsBtn.textContent = "⚙️";
	            Object.assign(settingsBtn.style, {
	                width: "32px",
	                height: "32px",
	                display: "flex",
	                alignItems: "center",
	                justifyContent: "center",
	                fontSize: "16px",
	                lineHeight: "1"
	            });

	            const searchWidget = document.createElement("div");
	            Object.assign(searchWidget.style, {
	                display: "flex",
	                alignItems: "center",
	                width: "32px",
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

	            let isSearchExpanded = !!String(state.searchQuery || "").trim();

	            const refreshSearchWidgetStyle = (isDark = state.isDarkMode) => {
	                const hasValue = !!String(searchInput.value || "").trim();
	                const active = isSearchExpanded || hasValue;
	                searchWidget.style.borderColor = active ? getPrimaryColor() : getBorderColor(isDark);
	                searchIconBtn.style.color = active ? getPrimaryColor() : getTextColor(isDark);
	            };

	            const updateClearSearchVisibility = () => {
	                const hasValue = !!String(searchInput.value || "").trim();
	                clearSearchBtn.style.display = isSearchExpanded && hasValue ? "flex" : "none";
	            };

	            const setSearchExpanded = (expanded, { focus = false } = {}) => {
	                isSearchExpanded = !!expanded;
	                searchWidget.style.width = isSearchExpanded ? "220px" : "32px";
	                searchInput.style.display = isSearchExpanded ? "block" : "none";
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

		            const statsRow = document.createElement("div");
			            Object.assign(statsRow.style, {
			                display: "flex",
			                alignItems: "center",
			                gap: "8px",
			                flex: "1 1 0%",
			                minWidth: "0",
			                flexWrap: "nowrap"
			            });

	            const statsContainer = createStatsDisplay();

	            searchWidget.appendChild(searchIconBtn);
	            searchWidget.appendChild(searchInput);
	            searchWidget.appendChild(clearSearchBtn);
	            statsRow.appendChild(searchWidget);
	            statsRow.appendChild(statsContainer);
	            headerContainer.appendChild(statsRow);

	            actionsContainer.appendChild(settingsBtn);
	            headerContainer.appendChild(actionsContainer);

	            panel.appendChild(headerContainer);

            const listContainer = document.createElement("div");
	            Object.assign(listContainer.style, {
	                maxHeight: "calc(80vh - 150px)", overflowY: "auto", marginBottom: "15px",
	                width: "100%", overflowX: "hidden"
	            });
	            panel.appendChild(listContainer);

	            function getExportPayload() {
	                const shortcuts = core.getShortcuts();
	                const userIcons = safeGMGet(options.storageKeys.userIcons, []);
	                return {
	                    schemaVersion: 1,
	                    exportedAt: new Date().toISOString(),
	                    shortcuts,
	                    userIcons
	                };
	            }

	            async function tryCopyToClipboard(text) {
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

	            function openExportDialog() {
	                const payload = getExportPayload();
	                const json = JSON.stringify(payload, null, 2);

	                const ioOverlay = document.createElement("div");
	                Object.assign(ioOverlay.style, {
	                    position: "fixed",
	                    top: 0,
	                    left: 0,
	                    width: "100vw",
	                    height: "100vh",
	                    zIndex: "999999",
	                    display: "flex",
	                    alignItems: "center",
	                    justifyContent: "center",
	                    padding: "20px",
	                    boxSizing: "border-box"
	                });
	                ioOverlay.onclick = (e) => { if (e.target === ioOverlay) close(); };

	                const box = document.createElement("div");
	                Object.assign(box.style, {
	                    width: "100%",
	                    maxWidth: "820px",
	                    maxHeight: "90vh",
	                    overflow: "auto",
	                    borderRadius: "8px",
	                    boxShadow: "0 4px 12px rgba(0,0,0,0.2)",
	                    padding: "16px",
	                    boxSizing: "border-box"
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
	                    const ok = await tryCopyToClipboard(textarea.value);
	                    if (ok) showAlert("已复制到剪贴板。");
	                    else showAlert("复制失败，请手动复制。");
	                };
	                btnRow.appendChild(copyBtn);

	                const closeBtn = document.createElement("button");
	                closeBtn.textContent = options.text.buttons.close || "关闭";
	                closeBtn.onclick = close;
	                btnRow.appendChild(closeBtn);

	                box.appendChild(btnRow);
	                ioOverlay.appendChild(box);
	                overlay.appendChild(ioOverlay);

	                const updateTheme = (isDark) => {
	                    ioOverlay.style.backgroundColor = getOverlayBackgroundColor(isDark);
	                    box.style.background = getPanelBackgroundColor(isDark);
	                    box.style.color = getTextColor(isDark);
	                    titleEl.style.color = getTextColor(isDark);
	                    styleInputField(textarea, isDark);
	                    textarea.style.height = "360px";
	                    textarea.style.resize = "vertical";
	                    styleButton(copyBtn, "#2196F3", "#1e88e5");
	                    styleButton(closeBtn, "#9E9E9E", "#757575");
	                };

	                addThemeChangeListener(updateTheme);
	                updateTheme(state.isDarkMode);

	                function close() {
	                    removeThemeChangeListener(updateTheme);
	                    try { ioOverlay.remove(); } catch {}
	                }
	            }

	            function openImportDialog() {
	                const ioOverlay = document.createElement("div");
	                Object.assign(ioOverlay.style, {
	                    position: "fixed",
	                    top: 0,
	                    left: 0,
	                    width: "100vw",
	                    height: "100vh",
	                    zIndex: "999999",
	                    display: "flex",
	                    alignItems: "center",
	                    justifyContent: "center",
	                    padding: "20px",
	                    boxSizing: "border-box"
	                });
	                ioOverlay.onclick = (e) => { if (e.target === ioOverlay) close(); };

	                const box = document.createElement("div");
	                Object.assign(box.style, {
	                    width: "100%",
	                    maxWidth: "820px",
	                    maxHeight: "90vh",
	                    overflow: "auto",
	                    borderRadius: "8px",
	                    boxShadow: "0 4px 12px rgba(0,0,0,0.2)",
	                    padding: "16px",
	                    boxSizing: "border-box"
	                });
	                box.onclick = (e) => e.stopPropagation();

	                const titleEl = document.createElement("h3");
	                titleEl.textContent = options.text.buttons.import || "导入";
	                Object.assign(titleEl.style, { margin: "0 0 10px 0", fontSize: "1.05em" });
	                box.appendChild(titleEl);

	                const tip = document.createElement("div");
	                tip.textContent = "支持导入 { shortcuts: [...], userIcons?: [...] } 或直接导入 shortcuts 数组。";
	                Object.assign(tip.style, { fontSize: "12px", opacity: "0.75", marginBottom: "8px", lineHeight: "1.4" });
	                box.appendChild(tip);

	                const textarea = document.createElement("textarea");
	                textarea.placeholder = "粘贴 JSON 到这里…";
	                Object.assign(textarea.style, { height: "360px", resize: "vertical" });
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
	                    } catch (err) {
	                        showAlert("JSON 解析失败，请检查格式。");
	                        return;
	                    }

	                    const shortcutsRaw = Array.isArray(parsed)
	                        ? parsed
	                        : (Array.isArray(parsed?.shortcuts) ? parsed.shortcuts : null);
	                    if (!Array.isArray(shortcutsRaw)) {
	                        showAlert("导入数据中未找到 shortcuts 数组。");
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
	                        showAlert(`导入失败：存在重复快捷键(请先在 JSON 中修复)：\n${lines}${duplicates.length > 12 ? "\n..." : ""}`);
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

	                    renderShortcutsList(state.isDarkMode);
	                    updateStatsDisplay();
	                    close();
	                };
	                btnRow.appendChild(confirmBtn);

	                const cancelBtn = document.createElement("button");
	                cancelBtn.textContent = options.text.buttons.cancel || "取消";
	                cancelBtn.onclick = close;
	                btnRow.appendChild(cancelBtn);

	                box.appendChild(btnRow);
	                ioOverlay.appendChild(box);
	                overlay.appendChild(ioOverlay);

	                const updateTheme = (isDark) => {
	                    ioOverlay.style.backgroundColor = getOverlayBackgroundColor(isDark);
	                    box.style.background = getPanelBackgroundColor(isDark);
	                    box.style.color = getTextColor(isDark);
	                    titleEl.style.color = getTextColor(isDark);
	                    tip.style.color = getTextColor(isDark);
	                    styleInputField(textarea, isDark);
	                    textarea.style.height = "360px";
	                    textarea.style.resize = "vertical";
	                    styleButton(confirmBtn, "#2196F3", "#1e88e5");
	                    styleButton(cancelBtn, "#9E9E9E", "#757575");
	                };

	                addThemeChangeListener(updateTheme);
	                updateTheme(state.isDarkMode);

	                function close() {
	                    removeThemeChangeListener(updateTheme);
	                    try { ioOverlay.remove(); } catch {}
	                }
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
	            let settingsMenuThemeHandler = null;

	            function closeSettingsMenu({ restoreFocus = true } = {}) {
	                if (!settingsMenuOverlay) return;
	                if (typeof settingsMenuKeydownHandler === "function") {
	                    document.removeEventListener("keydown", settingsMenuKeydownHandler, true);
	                }
	                if (typeof settingsMenuThemeHandler === "function") {
	                    removeThemeChangeListener(settingsMenuThemeHandler);
	                }
	                try { settingsMenuOverlay.remove(); } catch {}
	                settingsMenuOverlay = null;
	                settingsMenuKeydownHandler = null;
	                settingsMenuThemeHandler = null;
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
	                Object.assign(modal.style, {
	                    position: "fixed",
	                    top: 0,
	                    left: 0,
	                    width: "100vw",
	                    height: "100vh",
	                    zIndex: "999999",
	                    display: "flex",
	                    alignItems: "center",
	                    justifyContent: "center",
	                    padding: "20px",
	                    boxSizing: "border-box"
	                });
	                modal.onclick = (e) => {
	                    if (e.target === modal) closeSettingsMenu();
	                };

	                const dialog = document.createElement("div");
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

	                const actions = document.createElement("div");
	                Object.assign(actions.style, {
	                    display: "flex",
	                    flexDirection: "column",
	                    gap: "10px"
	                });

	                const importActionBtn = document.createElement("button");
	                importActionBtn.textContent = options.text.buttons.import || "导入";
	                importActionBtn.onclick = () => {
	                    closeSettingsMenu({ restoreFocus: false });
	                    openImportDialog();
	                };
	                actions.appendChild(importActionBtn);

	                const exportActionBtn = document.createElement("button");
	                exportActionBtn.textContent = options.text.buttons.export || "导出";
	                exportActionBtn.onclick = () => {
	                    closeSettingsMenu({ restoreFocus: false });
	                    openExportDialog();
	                };
	                actions.appendChild(exportActionBtn);

	                const resetActionBtn = document.createElement("button");
	                resetActionBtn.textContent = options.text.buttons.reset || "重置默认";
	                resetActionBtn.onclick = () => {
	                    closeSettingsMenu({ restoreFocus: false });
	                    showConfirmDialog("确定重置为默认配置吗？(需要点击“保存并关闭”才会写入存储)", () => {
	                        resetToDefaults();
	                    });
	                };
	                actions.appendChild(resetActionBtn);

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

	                settingsMenuThemeHandler = (isDark) => {
	                    modal.style.backgroundColor = getOverlayBackgroundColor(isDark);
	                    dialog.style.background = getPanelBackgroundColor(isDark);
	                    dialog.style.color = getTextColor(isDark);
	                    dialog.style.border = `1px solid ${getBorderColor(isDark)}`;
	                    titleEl.style.color = getTextColor(isDark);
	                    styleTransparentButton(closeBtn, getTextColor(isDark), getHoverColor(isDark), isDark);
	                    closeBtn.style.padding = "6px 8px";
	                    closeBtn.style.borderRadius = "6px";
	                    styleButton(importActionBtn, "#2196F3", "#1e88e5");
	                    styleButton(exportActionBtn, "#607D8B", "#546e7a");
	                    styleButton(resetActionBtn, "#F44336", "#D32F2F");
	                };

	                addThemeChangeListener(settingsMenuThemeHandler);
	                settingsMenuThemeHandler(state.isDarkMode);
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
	                overlay.style.backgroundColor = getOverlayBackgroundColor(isDark);
	                panel.style.background = getPanelBackgroundColor(isDark);
	                panel.style.color = getTextColor(isDark);
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
                    state.destroyResponsiveListener = createResponsiveListener(panel, (compactMode) => {
                        renderShortcutsList(state.isDarkMode, compactMode);
                    });
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
	                setupDragAndDrop(row, item, index);

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
                    const methodText = (typeof getUrlMethodDisplayText === "function")
                        ? getUrlMethodDisplayText(item.urlMethod)
                        : (URL_METHODS?.[item.urlMethod]?.name || "未知跳转方式");
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

	                setupDragAndDrop(card, item, index);

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
                hotkeyContainer.textContent = core?.hotkeys?.formatForDisplay ? (core.hotkeys.formatForDisplay(item.hotkey) || "无") : (item.hotkey || "无");

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
                    const methodText = (typeof getUrlMethodDisplayText === "function")
                        ? getUrlMethodDisplayText(item.urlMethod)
                        : (URL_METHODS?.[item.urlMethod]?.name || "未知跳转方式");
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
                        core.mutateShortcuts((list) => { list.splice(index, 1); });
                        renderShortcutsList(state.isDarkMode);
                        updateStatsDisplay();
                    });
                };

                buttonContainer.appendChild(editButton);
                buttonContainer.appendChild(delButton);
                return buttonContainer;
            }

	            let draggingShortcutId = null;

	            function matchesCurrentView(shortcut) {
	                if (!shortcut) return false;
	                if (state.currentFilter && state.currentFilter !== 'all') {
	                    if (shortcut.actionType !== state.currentFilter) return false;
	                }
	                const query = String(state.searchQuery || "").trim().toLowerCase();
	                if (!query) return true;
	                const haystack = [
	                    shortcut.name,
	                    shortcut.url,
	                    shortcut.selector,
	                    shortcut.simulateKeys,
	                    shortcut.customAction
	                ].filter(Boolean).join(" ").toLowerCase();
	                return haystack.includes(query);
	            }

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
	                        if (matchesCurrentView(sc)) {
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
	                            renderShortcutsList(state.isDarkMode);
	                            updateStatsDisplay();
	                        }
	                    } catch (err) {
	                        console.error("Drag-and-drop error:", err);
	                        showAlert("拖拽排序时出错: " + err);
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

	            function closePanel() {
	                closeSettingsMenu({ restoreFocus: false });
	                state.currentPanelCloser = null;
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
                const { container: simulateInputContainer, getSimulateKeys, destroy: destroySimulateKeysCapture } = createEnhancedKeyboardCaptureInput("模拟按键:", temp.simulateKeys, {
                    placeholder: options.text.hints.simulate,
                    hint: options.text.hints.simulateHelp,
                    methodName: "getSimulateKeys",
                    captureType: "simulate"
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

                const { label: iconLabel, input: iconTextarea, preview: iconPreview, destroy: destroyIconField } = createIconField("图标URL:", temp.icon);
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

                const { container: hotkeyContainer, getHotkey, destroy: destroyHotkeyCapture } = createEnhancedKeyboardCaptureInput("快捷键:", temp.hotkey, {
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
                    if (core.getShortcuts().some((s, i) => normalizeHotkey(s.hotkey) === normalizedNewHotkey && i !== index)) {
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

                    const normalized = core.normalizeShortcut(temp);
                    core.mutateShortcuts((list) => {
                        if (isNew) {
                            list.push(normalized);
                        } else {
                            list[index] = normalized;
                        }
                    });
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
	                state.currentEditCloser = closeEdit;

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
	                    state.currentEditCloser = null;
	                    removeThemeChangeListener(updateEditPanelTheme);
	                    try { if (typeof destroyIconField === "function") destroyIconField(); } catch {}
	                    try { if (typeof destroySimulateKeysCapture === "function") destroySimulateKeysCapture(); } catch {}
	                    try { if (typeof destroyHotkeyCapture === "function") destroyHotkeyCapture(); } catch {}
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

                const destroy = () => {
                    removeThemeChangeListener(updatePreviewTheme);
                };

                return { label, input: textarea, preview, destroy };
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
	                    expandButton.textContent = isExpanded ? '▲' : '▼';
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
	                    iconGrid.replaceChildren();
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
	                expandButton.textContent = isExpanded ? '▲' : '▼';

	                return { container, updateTheme };
	            }

	            function createEnhancedKeyboardCaptureInput(labelText, currentValue, {
	                placeholder = "点击此处，然后按下快捷键组合",
	                hint = "💡 支持 Ctrl/Shift/Alt/Cmd + 字母/数字/功能键等组合",
	                methodName = "getHotkey",
	                captureType = "hotkey"
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
	                        const displayKeys = core?.hotkeys?.formatForDisplay ? (core.hotkeys.formatForDisplay(finalKeys) || finalKeys) : finalKeys;
	                        statusDiv.textContent = `✅ 已捕获${labelText}: ${displayKeys}`;
	                    } else {
	                        statusDiv.textContent = `❌ 未捕获到有效的${labelText}`;
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
	                            statusDiv.textContent = `❌ 不支持的快捷键: ${displayKey}`;
	                            return;
	                        }

	                        if (captureType === "simulate" && core?.hotkeys?.isAllowedSimulateMainKey && !core.hotkeys.isAllowedSimulateMainKey(standardKey)) {
	                            const displayKey = core?.hotkeys?.formatKeyToken ? core.hotkeys.formatKeyToken(standardKey) : standardKey;
	                            statusDiv.textContent = `❌ 不支持的模拟按键: ${displayKey}`;
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

	                const destroy = () => {
	                    removeThemeChangeListener(updateTheme);
	                };

	                const result = { container, destroy };
	                result[methodName] = () => mainInput.value.trim();
	                return result;
	            }
        }

	            return Object.freeze({ openSettingsPanel, closeSettingsPanel });
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
                core,
                uiShared,
                URL_METHODS
            });
        }
/* -------------------------------------------------------------------------- *
 * Module 99 · Global export (ShortcutTemplate)
 * -------------------------------------------------------------------------- */

    global.ShortcutTemplate = Object.freeze({
        VERSION: '20251225',
        URL_METHODS,
        createShortcutEngine,
        utils: Utils
    });

})(typeof window !== 'undefined' ? window : this);
