/* -------------------------------------------------------------------------- *
 * Site Entry · [ChatGPT] 快捷键跳转
 * -------------------------------------------------------------------------- */

import { resolveShortcutTemplate } from "../shared/resolve-template-core.js";

export async function startSite(runtime = {}) {
    function getUserscriptApi(name) {
        const runtimeGetter = typeof runtime?.getUserscriptApi === "function" ? runtime.getUserscriptApi : null;
        if (runtimeGetter) {
            try {
                const runtimeApi = runtimeGetter(name);
                if (typeof runtimeApi === "function") return runtimeApi;
            } catch { }
        }

        const scope = typeof globalThis !== "undefined" ? globalThis : null;
        if (!scope) return null;

        const direct = scope[name];
        if (typeof direct === "function") return direct.bind(scope);

        const gm = scope.GM;
        if (gm && typeof gm === "object") {
            const altName = name.replace(/^GM_/, "");
            const directGm = gm[altName];
            if (typeof directGm === "function") return directGm.bind(gm);

            const lowerCamel = altName.charAt(0).toLowerCase() + altName.slice(1);
            const camelGm = gm[lowerCamel];
            if (typeof camelGm === "function") return camelGm.bind(gm);
        }

        return null;
    }

    function gmRegisterMenuCommandLocal(label, handler) {
        const fn = getUserscriptApi("GM_registerMenuCommand");
        if (typeof fn !== "function") return null;
        try {
            return fn(label, handler);
        } catch {
            return null;
        }
    }

    function gmGetValueLocal(key, fallback) {
        const fn = getUserscriptApi("GM_getValue");
        if (typeof fn !== "function") return fallback;
        try {
            return fn(key, fallback);
        } catch {
            return fallback;
        }
    }

    function gmSetValueLocal(key, value) {
        const fn = getUserscriptApi("GM_setValue");
        if (typeof fn !== "function") return;
        try {
            fn(key, value);
        } catch { }
    }

    const ShortcutTemplate = await resolveShortcutTemplate(runtime);

    // 检查模板是否正确加载
    if (!ShortcutTemplate || typeof ShortcutTemplate.createShortcutEngine !== 'function') {
        console.error('[ChatGPT Shortcut] Template module not found.');
        return;
    }

    // ChatGPT 默认图标
    const defaultIconURL = "https://chatgpt.com/favicon.ico";

    // ChatGPT 图标库
    const defaultIcons = [
        { name: "ChatGPT", url: "https://chatgpt.com/favicon.ico" },
        { name: "OpenAI", url: "https://openai.com/favicon.ico" },
        { name: "Claude", url: "https://claude.ai/favicon.ico" },
        { name: "Google", url: "https://www.google.com/favicon.ico" },
        { name: "Bing", url: "https://www.bing.com/favicon.ico" },
        { name: "DuckDuckGo", url: "https://duckduckgo.com/favicon.ico" },
        { name: "Wikipedia", url: "https://www.wikipedia.org/static/favicon/wikipedia.ico" },
        { name: "Reddit", url: "https://www.reddit.com/favicon.ico" },
        { name: "Stack Overflow", url: "https://cdn.sstatic.net/Sites/stackoverflow/Img/favicon.ico" },
        { name: "GitHub", url: "https://github.githubassets.com/favicons/favicon.svg" },
        { name: "Twitter / X", url: "https://abs.twimg.com/favicons/twitter.3.ico" },
        { name: "YouTube", url: "https://www.youtube.com/favicon.ico" },
        { name: "Perplexity", url: "https://www.perplexity.ai/favicon.ico" },
        { name: "Gemini", url: "https://gemini.google.com/favicon.ico" },
    ];

    // 受保护的核心图标URL
    const protectedIconUrls = [
        "https://chatgpt.com/favicon.ico",
        "https://openai.com/favicon.ico"
    ];

    // ChatGPT 元素选择器
    const SELECTORS = {
        composerPlusBtn: "button[data-testid='composer-plus-btn']",
        moreSubmenuItem: "div[role='menuitem']",
        popupMenuItem: "[role='menuitem'], [role='menuitemradio']"
    };

    const QUICK_INPUT_STORAGE_KEY = "chatgpt_quick_input_v1";
    const bootstrapMenuManaged = runtime?.bootstrapMenuManaged === true;
    const menuBridge = (runtime?.menuBridge && typeof runtime.menuBridge === "object") ? runtime.menuBridge : null;
    const menuCommandMessageType = (typeof runtime?.menuMessageType === "string" && runtime.menuMessageType.trim())
        ? runtime.menuMessageType.trim()
        : "";
    const menuCommandMessageSource = (typeof runtime?.menuMessageSource === "string" && runtime.menuMessageSource.trim())
        ? runtime.menuMessageSource.trim()
        : "";
    const menuPendingValueKey = (typeof runtime?.menuPendingValueKey === "string" && runtime.menuPendingValueKey.trim())
        ? runtime.menuPendingValueKey.trim()
        : "";
    const menuPageToken = (typeof runtime?.menuPageToken === "string" && runtime.menuPageToken.trim())
        ? runtime.menuPageToken.trim()
        : "";
    const MENU_COMMAND_MAX_AGE_MS = 5 * 60 * 1000;
    const MENU_COMMAND_KEYS = Object.freeze({
        quickInput: "quickInput"
    });
    let menuCommandPollTimer = null;
    const handledMenuCommandIds = [];
    const handledMenuCommandIdSet = new Set();

    // ===== ChatGPT 特有功能模块开始：1step Canvas / Web =====

    const TemplateUtils = ShortcutTemplate.utils;
    if (!TemplateUtils?.menu?.createMenuController) {
        console.error('[ChatGPT Shortcut] Template utils.menu not found (update Template core).');
        return;
    }

    const popupMenu = TemplateUtils.menu.createMenuController({
        trigger: {
            selectors: [
                SELECTORS.composerPlusBtn,
                'button[aria-label="Add files and more"]'
            ]
        },
        root: {
            type: "ariaControls",
            requireRole: "menu",
            requireDataState: "open"
        },
        timing: {
            openDelayMs: 250,
            stepDelayMs: 250
        },
        submenus: {
            more: {
                trigger: {
                    searchRoot: "parentRoot",
                    action: "hover",
                    candidates: [
                        { selector: "div[role='menuitem'][data-has-submenu]" },
                        { selector: SELECTORS.moreSubmenuItem, textMatch: "More" }
                    ]
                },
                root: {
                    type: "ariaControls",
                    requireRole: "menu",
                    requireDataState: "open"
                }
            }
        }
    });

    // ===== ChatGPT 快捷输入适配器 =====

    function createChatGPTQuickInputAdapter({ idPrefix = "chatgpt" } = {}) {
        const QuickInput = ShortcutTemplate?.quickInput;
        const dom = QuickInput?.dom;

        const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

        const simulateKeystroke = dom?.simulateKeystroke;
        const isElementVisible = dom?.isElementVisible;
        const dispatchPasteEvent = dom?.dispatchPasteEvent;
        const dispatchDragEvent = dom?.dispatchDragEvent;
        const collectFileInputs = dom?.collectFileInputs;
        const collectFileInputsFromOpenShadows = dom?.collectFileInputsFromOpenShadows;
        const trySetFileInputFiles = dom?.trySetFileInputFiles;
        const waitForObservedState = dom?.waitForObservedState;
        const genericSetInputValue = typeof dom?.setInputValue === "function" ? dom.setInputValue : null;
        const genericClearInputValue = typeof dom?.clearInputValue === "function" ? dom.clearInputValue : null;

        if (
            typeof simulateKeystroke !== "function" ||
            typeof isElementVisible !== "function" ||
            typeof dispatchPasteEvent !== "function" ||
            typeof dispatchDragEvent !== "function" ||
            typeof collectFileInputs !== "function" ||
            typeof collectFileInputsFromOpenShadows !== "function" ||
            typeof trySetFileInputFiles !== "function" ||
            typeof waitForObservedState !== "function"
        ) {
            return null;
        }

        const overlayId = `${String(idPrefix || "").trim() || "chatgpt"}-quick-input-overlay`;
        const CHATGPT_ROOT_URL = "https://chatgpt.com/";
        const NATIVE_NEW_CHAT_LABEL = "CMD+SHIFT+O (原生)";
        const isInsideOverlayTree = typeof dom?.isInsideOverlayTree === "function"
            ? dom.isInsideOverlayTree
            : (target, targetOverlayId) => {
                if (!target || !targetOverlayId) return false;
                let node = target;
                while (node) {
                    if (node.nodeType === 1) {
                        if (node.id === targetOverlayId) return true;
                        try {
                            if (typeof node.closest === "function" && node.closest(`#${targetOverlayId}`)) return true;
                        } catch {}
                    }
                    let next = null;
                    try { next = node.parentNode || null; } catch {}
                    if (!next && typeof node.getRootNode === "function") {
                        try {
                            const root = node.getRootNode();
                            next = root?.host || null;
                        } catch {}
                    }
                    if (!next || next === node) break;
                    node = next;
                }
                return false;
            };

        function isInsideQuickInputOverlay(el) {
            return isInsideOverlayTree(el, overlayId);
        }

        function getRuntimeNow(runtime = null) {
            if (runtime && typeof runtime.now === "function") {
                try { return Number(runtime.now()) || Date.now(); } catch { }
            }
            return Date.now();
        }

        async function runtimeWaitIfPaused(runtime = null, { shouldCancel = null } = {}) {
            const cancelFn = typeof shouldCancel === "function" ? shouldCancel : null;
            if (cancelFn && cancelFn()) return false;
            if (runtime && typeof runtime.waitIfPaused === "function") {
                try {
                    const result = await runtime.waitIfPaused();
                    if (result === false) return false;
                } catch {
                    return false;
                }
            }
            return !(cancelFn && cancelFn());
        }

        async function runtimeSleep(runtime = null, ms = 0, { shouldCancel = null } = {}) {
            const cancelFn = typeof shouldCancel === "function" ? shouldCancel : null;
            if (!(await runtimeWaitIfPaused(runtime, { shouldCancel: cancelFn }))) return false;
            if (runtime && typeof runtime.sleep === "function") {
                try {
                    const result = await runtime.sleep(ms);
                    return result !== false && !(cancelFn && cancelFn());
                } catch {
                    return false;
                }
            }
            await sleep(ms);
            return runtimeWaitIfPaused(runtime, { shouldCancel: cancelFn });
        }

        function getCurrentChatGPTUrl() {
            try { return String(window.location.href || ""); } catch { return ""; }
        }

        function buildChatGPTRootUrlMismatchMessage(currentUrl, { prefix = "" } = {}) {
            const base = `当前 URL 必须精确等于 ${CHATGPT_ROOT_URL}，实际是 ${currentUrl || "(空)"}`;
            return prefix ? `${prefix}${base}` : base;
        }

        function isChatGPTRootUrl(currentUrl = getCurrentChatGPTUrl()) {
            return currentUrl === CHATGPT_ROOT_URL;
        }

        function getChatGPTUrlGuardResult() {
            const currentUrl = getCurrentChatGPTUrl();
            if (isChatGPTRootUrl(currentUrl)) {
                return { ok: true, url: currentUrl };
            }
            return {
                ok: false,
                url: currentUrl,
                message: buildChatGPTRootUrlMismatchMessage(currentUrl)
            };
        }

        function buildChatGPTUrlGuardFailureMessage(urlGuard, { prefix = "" } = {}) {
            const base = String(urlGuard?.message || buildChatGPTRootUrlMismatchMessage(getCurrentChatGPTUrl())).trim();
            return prefix ? `${prefix}${base}` : base;
        }

        // ChatGPT 使用 ProseMirror 编辑器，输入框是 contenteditable div
        const CHATGPT_COMPOSER_SELECTORS = [
            "#prompt-textarea",                          // ProseMirror 主输入框
            "div.ProseMirror[contenteditable='true']",   // ProseMirror contenteditable
            "[data-testid='composer-textarea']",         // 备用选择器
            "textarea[name='prompt-textarea']"           // 隐藏的 fallback textarea
        ];

        function findChatGPTComposerElement() {
            for (const selector of CHATGPT_COMPOSER_SELECTORS) {
                try {
                    const candidates = Array.from(document.querySelectorAll(selector));
                    for (const el of candidates) {
                        if (!el) continue;
                        if (isInsideQuickInputOverlay(el)) continue;
                        if (!isElementVisible(el)) continue;
                        // 优先选择 contenteditable 的元素
                        if (el.isContentEditable || el.tagName === "TEXTAREA") {
                            return el;
                        }
                    }
                } catch { }
            }
            return null;
        }

        function isChatGPTComposerConnected(el) {
            if (!el) return false;
            try {
                if (typeof el.isConnected === "boolean") return el.isConnected;
            } catch { }
            try { return !!document.contains(el); } catch { return false; }
        }

        function resolveChatGPTComposerElement(composerEl, { requireVisible = true } = {}) {
            if (
                composerEl &&
                isChatGPTComposerConnected(composerEl) &&
                !isInsideQuickInputOverlay(composerEl) &&
                (!requireVisible || isElementVisible(composerEl))
            ) {
                return composerEl;
            }
            const current = findChatGPTComposerElement();
            if (current) return current;
            return null;
        }

        // ===== ChatGPT 输出状态检测与新建对话 =====

        function isChatGPTStreaming() {
            // 检测 stop 按钮是否存在（ChatGPT 正在输出回复）
            // stop 按钮特征: data-testid="stop-button" 或 aria-label="Stop streaming"
            try {
                const stopBtn = document.querySelector(
                    'button[data-testid="stop-button"], ' +
                    'button[aria-label="Stop streaming"], ' +
                    'button[aria-label*="Stop"]'
                );
                if (stopBtn && isElementVisible(stopBtn)) {
                    return true;
                }
            } catch { }
            return false;
        }

        async function triggerNativeNewChat({ shouldCancel = null } = {}) {
            const cancelFn = typeof shouldCancel === "function" ? shouldCancel : null;
            if (cancelFn && cancelFn()) return { ok: false, label: NATIVE_NEW_CHAT_LABEL };

            try {
                if (simulateKeystroke("CMD+SHIFT+O", { target: document.body })) {
                    return { ok: true, label: NATIVE_NEW_CHAT_LABEL };
                }
            } catch { }

            return { ok: false, label: NATIVE_NEW_CHAT_LABEL };
        }

        async function triggerNewChatIfStreaming({ shouldCancel = null, runtime = null } = {}) {
            const cancelFn = typeof shouldCancel === "function" ? shouldCancel : null;

            // 检测是否正在输出
            if (!isChatGPTStreaming()) {
                return false; // 没有在输出，不需要新建对话
            }

            // ChatGPT 正在输出，触发新建对话快捷键 CMD+SHIFT+O
            await triggerNativeNewChat({ shouldCancel: cancelFn });

            // 等待页面切换到新对话
            const deadline = getRuntimeNow(runtime) + 5000;
            while (getRuntimeNow(runtime) < deadline) {
                if (cancelFn && cancelFn()) return true;
                const waitOk = await runtimeSleep(runtime, 200, { shouldCancel: cancelFn });
                if (!waitOk) return true;
                // 检查是否已经离开输出状态（stop 按钮消失），并尽量确认已回到根 URL
                if (!isChatGPTStreaming()) {
                    const rootReady = await waitForChatGPTNewChatReady({
                        timeoutMs: 6000,
                        intervalMs: 160,
                        settleMs: 300,
                        shouldCancel: cancelFn,
                        runtime
                    });
                    if (rootReady?.cancelled) return true;
                    if (rootReady?.ok) return true;
                    await runtimeSleep(runtime, 300, { shouldCancel: cancelFn }); // 回退：至少等待 DOM 稳定
                    return true;
                }
            }

            return true; // 即使超时也返回 true，表示已经尝试新建对话
        }

        // ===== ChatGPT 输出状态检测与新建对话结束 =====

        async function focusComposer({ timeoutMs = 2500, intervalMs = 120, shouldCancel = null, checkStreaming = false, runtime = null } = {}) {
            const cancelFn = typeof shouldCancel === "function" ? shouldCancel : null;

            // 如果需要检测输出状态（循环模式），先检查并处理
            if (checkStreaming) {
                await triggerNewChatIfStreaming({ shouldCancel: cancelFn, runtime });
                if (cancelFn && cancelFn()) return null;
            }

            const deadline = getRuntimeNow(runtime) + Math.max(0, Number(timeoutMs) || 0);
            let composer = findChatGPTComposerElement();

            while (!composer && getRuntimeNow(runtime) < deadline) {
                if (cancelFn && cancelFn()) return null;
                const waitOk = await runtimeSleep(runtime, intervalMs, { shouldCancel: cancelFn });
                if (!waitOk) return null;
                composer = findChatGPTComposerElement();
            }

            if (cancelFn && cancelFn()) return null;
            if (!composer) return null;
            try { composer.scrollIntoView?.({ block: "center" }); } catch { }
            try { composer.focus?.(); } catch { }
            try { TemplateUtils?.events?.simulateClick?.(composer, { nativeFallback: true }); } catch { }
            const settleOk = await runtimeSleep(runtime, 20, { shouldCancel: cancelFn });
            if (!settleOk) return null;
            return composer;
        }

        // ===== ChatGPT ProseMirror 输入框适配 =====

        function createChatGPTDataTransfer({ text = "", files = [] } = {}) {
            if (typeof DataTransfer !== "function") return null;
            try {
                const dt = new DataTransfer();
                const plainText = String(text ?? "");
                if (plainText) {
                    try { dt.setData("text/plain", plainText); } catch { }
                }
                for (const file of Array.from(files || [])) {
                    if (!(file instanceof File)) continue;
                    try { dt.items.add(file); } catch { }
                }
                try { dt.effectAllowed = "copy"; } catch { }
                try { dt.dropEffect = "copy"; } catch { }
                return dt;
            } catch {
                return null;
            }
        }

        function getChatGPTComposerPlainText(composerEl) {
            if (!composerEl) return "";
            return String(composerEl.innerText || composerEl.textContent || "")
                .replace(/\u200B/g, "")
                .replace(/\r/g, "")
                .trim();
        }

        function selectAllChatGPTComposerContent(composerEl) {
            if (!composerEl || typeof document.createRange !== "function") return false;
            try {
                composerEl.focus?.();
                const selection = window.getSelection?.();
                if (!selection) return false;
                const range = document.createRange();
                range.selectNodeContents(composerEl);
                selection.removeAllRanges();
                selection.addRange(range);
                return true;
            } catch {
                return false;
            }
        }

        function moveChatGPTComposerCaretToEnd(composerEl) {
            if (!composerEl || typeof document.createRange !== "function") return false;
            try {
                composerEl.focus?.();
                const selection = window.getSelection?.();
                if (!selection) return false;
                const range = document.createRange();
                range.selectNodeContents(composerEl);
                range.collapse(false);
                selection.removeAllRanges();
                selection.addRange(range);
                return true;
            } catch {
                return false;
            }
        }

        function dispatchChatGPTComposerInput(composerEl, { inputType = "insertText", data = null } = {}) {
            if (!composerEl) return false;
            try {
                composerEl.dispatchEvent(new InputEvent("input", {
                    bubbles: true,
                    cancelable: true,
                    inputType,
                    data
                }));
                return true;
            } catch {
                try {
                    composerEl.dispatchEvent(new Event("input", { bubbles: true, cancelable: true }));
                    return true;
                } catch {
                    return false;
                }
            }
        }

        function trySetChatGPTFileInputFiles(input, file) {
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
            try { input.files = dt.files; assigned = true; } catch { }
            if (!assigned) {
                try {
                    Object.defineProperty(input, "files", { value: dt.files, configurable: true });
                    assigned = true;
                } catch { }
            }
            if (!assigned) return false;

            try {
                const init = { bubbles: true, cancelable: true, composed: true };
                input.dispatchEvent(new Event("change", init));
            } catch { }

            try { return (input.files?.length || 0) > 0; } catch { return true; }
        }

        function tryPasteTextIntoChatGPTComposer(composerEl, text) {
            if (!composerEl) return false;
            const plainText = String(text ?? "");
            if (!plainText) return false;

            const dt = createChatGPTDataTransfer({ text: plainText });
            if (!dt) return false;

            try { composerEl.focus?.(); } catch { }
            moveChatGPTComposerCaretToEnd(composerEl);

            const fired = dispatchPasteEvent(composerEl, dt);
            if (fired) {
                dispatchChatGPTComposerInput(composerEl, { inputType: "insertFromPaste", data: plainText });
            }
            return fired;
        }

        function setChatGPTInputValue(composerEl, value) {
            const urlGuard = getChatGPTUrlGuardResult();
            if (!urlGuard.ok) return false;
            const composer = resolveChatGPTComposerElement(composerEl, { requireVisible: false });
            if (!composer) return false;
            const text = String(value ?? "");

            // ChatGPT 使用 ProseMirror (contenteditable div)
            if (composer.isContentEditable || composer.contentEditable === "true") {
                clearChatGPTInputValue(composer);
                if (!text) return true;

                try { composer.focus?.(); } catch { }
                try { TemplateUtils?.events?.simulateClick?.(composer, { nativeFallback: true }); } catch { }

                let inserted = tryPasteTextIntoChatGPTComposer(composer, text);

                if (!inserted && typeof genericSetInputValue === "function") {
                    try { inserted = !!genericSetInputValue(composer, text); } catch { }
                }

                if (!inserted) {
                    try {
                        selectAllChatGPTComposerContent(composer);
                        inserted = !!document.execCommand?.("insertText", false, text);
                    } catch { }
                }

                if (!inserted) {
                    try {
                        composer.textContent = text;
                        inserted = true;
                    } catch { }
                }

                dispatchChatGPTComposerInput(composer, {
                    inputType: inserted ? "insertText" : "insertReplacementText",
                    data: text
                });

                return inserted || !!getChatGPTComposerPlainText(composer);
            }

            // 回退：普通 textarea/input
            try {
                if (typeof genericSetInputValue === "function") {
                    return !!genericSetInputValue(composer, text);
                }
                composer.value = text;
                composer.dispatchEvent(new Event("input", { bubbles: true }));
                composer.dispatchEvent(new Event("change", { bubbles: true }));
                return true;
            } catch {
                return false;
            }
        }

        function clearChatGPTInputValue(composerEl) {
            const composer = resolveChatGPTComposerElement(composerEl, { requireVisible: false });
            if (!composer) return false;

            if (composer.isContentEditable || composer.contentEditable === "true") {
                try { composer.focus?.(); } catch { }
                try { TemplateUtils?.events?.simulateClick?.(composer, { nativeFallback: true }); } catch { }

                let cleared = false;

                try {
                    if (selectAllChatGPTComposerContent(composer)) {
                        cleared = !!document.execCommand?.("delete", false, null);
                        if (!cleared) {
                            cleared = !!document.execCommand?.("insertText", false, "");
                        }
                    }
                } catch { }

                if (!cleared) {
                    try {
                        if (selectAllChatGPTComposerContent(composer)) {
                            window.getSelection?.()?.deleteFromDocument?.();
                            cleared = true;
                        }
                    } catch { }
                }

                if (!cleared && typeof genericClearInputValue === "function") {
                    try { cleared = !!genericClearInputValue(composer); } catch { }
                }

                if (!cleared) {
                    try {
                        composer.textContent = "";
                        cleared = true;
                    } catch { }
                }

                dispatchChatGPTComposerInput(composer, { inputType: "deleteContentBackward", data: null });
                return cleared || !getChatGPTComposerPlainText(composer);
            }

            try {
                if (typeof genericClearInputValue === "function") {
                    return !!genericClearInputValue(composer);
                }
                composer.value = "";
                composer.dispatchEvent(new Event("input", { bubbles: true }));
                composer.dispatchEvent(new Event("change", { bubbles: true }));
                return true;
            } catch {
                return false;
            }
        }

        // ===== ChatGPT ProseMirror 输入框适配结束 =====

        function getChatGPTComposerAncestors(composerEl) {
            let prosemirrorParent = null;
            let form = null;
            let composerContainer = null;

            if (!composerEl) return { prosemirrorParent, form, composerContainer };

            try { prosemirrorParent = composerEl.closest?.("[class*='prosemirror-parent']") || null; } catch { }
            try { form = composerEl.closest?.("form") || null; } catch { }
            try { composerContainer = composerEl.closest?.("[class*='composer']") || null; } catch { }

            return { prosemirrorParent, form, composerContainer };
        }

        function findBestChatGPTDropzone(composerEl) {
            const { prosemirrorParent, form, composerContainer } = getChatGPTComposerAncestors(composerEl);
            if (prosemirrorParent) return prosemirrorParent;
            if (form) return form;
            if (composerContainer) return composerContainer;

            let zones = [];
            try { zones = Array.from(document.querySelectorAll("[class*='prosemirror-parent'], form[class*='composer'], div[class*='composer']")); } catch { zones = []; }
            if (!zones.length) return null;
            if (composerEl) {
                const containing = zones.find(z => z && z.contains(composerEl));
                if (containing) return containing;
            }

            let best = null;
            let bestScore = -Infinity;
            for (const zone of zones) {
                if (!zone) continue;
                if (isInsideQuickInputOverlay(zone)) continue;
                if (!isElementVisible(zone)) continue;
                try {
                    const rect = zone.getBoundingClientRect();
                    const score = rect.bottom / Math.max(1, window.innerHeight);
                    if (score > bestScore) {
                        bestScore = score;
                        best = zone;
                    }
                } catch { }
            }
            return best || zones[0] || null;
        }

        function findChatGPTComposerContainer(composerEl) {
            if (!composerEl) return null;
            const { prosemirrorParent, form, composerContainer } = getChatGPTComposerAncestors(composerEl);
            // ChatGPT 结构: 图片预览在 [grid-area:header]，与 prosemirror-parent 是兄弟关系
            // 需要找到包含两者的父容器（通常是带 corner-superellipse 类的 div）
            if (prosemirrorParent) {
                try {
                    // 向上找包含 header 区域的容器
                    const parent = prosemirrorParent.parentElement?.parentElement;
                    if (parent && (parent.querySelector?.("[class*='grid-area:header']") || parent.querySelector?.("[class*='grid-area\\:header']"))) {
                        return parent;
                    }
                    // 尝试找带有 corner-superellipse 类的容器
                    const cornerContainer = prosemirrorParent.closest?.("[class*='corner-superellipse']");
                    if (cornerContainer) return cornerContainer;
                    // 回退到 prosemirror-parent 的父级
                    if (prosemirrorParent.parentElement?.parentElement) {
                        return prosemirrorParent.parentElement.parentElement;
                    }
                } catch { }
                return prosemirrorParent;
            }
            if (form) return form;
            if (composerContainer) return composerContainer;
            return findBestChatGPTDropzone(composerEl);
        }

        function findChatGPTAttachmentCard(el) {
            if (!el || typeof el.closest !== "function") return null;
            try {
                const groupCard = el.closest(".group.text-token-text-primary.relative.inline-block");
                if (groupCard) return groupCard;
            } catch { }
            try {
                const roundedCard = el.closest("[class*='rounded-2xl']");
                if (roundedCard) return roundedCard;
            } catch { }
            return null;
        }

        function getChatGPTAttachmentScope(containerEl) {
            const container = containerEl || document;
            const headerSelectors = [
                "[class*='grid-area:header']",
                "[class*='grid-area\\:header']"
            ].join(", ");

            try {
                const headers = Array.from(container.querySelectorAll(headerSelectors))
                    .filter(el => el && !isInsideQuickInputOverlay(el))
                    .filter(el => isElementVisible(el));
                for (const header of headers) {
                    try {
                        if (header.querySelector("button[aria-label*='Remove file'], button[aria-label*='Edit image'], [style*='background-image']")) {
                            return header;
                        }
                    } catch { }
                }
                if (headers.length) return headers[0];
            } catch { }

            return container;
        }

        const CHATGPT_ATTACHMENT_OBSERVED_ATTRIBUTES = Object.freeze([
            "class",
            "style",
            "src",
            "aria-label",
            "disabled",
            "aria-disabled",
            "data-state"
        ]);

        const CHATGPT_READY_OBSERVED_ATTRIBUTES = Object.freeze([
            "class",
            "style",
            "src",
            "aria-label",
            "disabled",
            "aria-disabled",
            "data-state"
        ]);

        function getChatGPTObservationRoots({ containerEl = null, composerEl = null } = {}) {
            const roots = [];
            const container = containerEl || (composerEl ? findChatGPTComposerContainer(composerEl) : null);
            if (container) roots.push(container);

            const scope = getChatGPTAttachmentScope(container);
            if (scope) roots.push(scope);

            try {
                const form = composerEl?.closest?.("form");
                if (form) roots.push(form);
            } catch { }

            const sendBtn = composerEl ? findSendButtonNearComposer(composerEl) : null;
            if (sendBtn) {
                roots.push(sendBtn);
                try {
                    const sendScope = sendBtn.closest?.("form");
                    if (sendScope) roots.push(sendScope);
                } catch { }
                try {
                    const sendParent = sendBtn.parentElement;
                    if (sendParent) roots.push(sendParent);
                } catch { }
            }

            return roots;
        }

        function getChatGPTRemoveAttachmentButtons(containerEl) {
            const scope = getChatGPTAttachmentScope(containerEl);
            try {
                return Array.from(scope.querySelectorAll(
                    "button[aria-label*='Remove file'], button[aria-label*='删除文件'], button[aria-label*='移除文件']"
                )).filter(btn => btn && !isInsideQuickInputOverlay(btn) && isElementVisible(btn));
            } catch {
                return [];
            }
        }

        function getChatGPTAttachmentSnapshot(containerEl) {
            const container = containerEl || document;
            const scope = getChatGPTAttachmentScope(container);
            const urls = new Set();
            const cards = new Set();
            let imageCount = 0;
            let fileCount = 0;
            let removeCount = 0;

            try {
                const headerItems = Array.from(scope.querySelectorAll(".group.text-token-text-primary.relative.inline-block"))
                    .filter(card => card && !isInsideQuickInputOverlay(card))
                    .filter(card => isElementVisible(card))
                    .filter(card => {
                        try {
                            return !!card.querySelector("button[aria-label*='Remove file'], button[aria-label*='Edit image'], [style*='background-image']");
                        } catch {
                            return false;
                        }
                    });
                for (const card of headerItems) cards.add(card);
            } catch { }

            try {
                const removeButtons = Array.from(scope.querySelectorAll(
                    "button[aria-label*='Remove file'], button[aria-label*='删除文件'], button[aria-label*='移除文件']"
                ));
                for (const btn of removeButtons) {
                    if (!btn) continue;
                    if (isInsideQuickInputOverlay(btn)) continue;
                    if (!isElementVisible(btn)) continue;
                    removeCount++;
                    const card = findChatGPTAttachmentCard(btn);
                    if (card && isElementVisible(card)) cards.add(card);
                }
            } catch { }

            try {
                const editButtons = Array.from(scope.querySelectorAll(
                    "button[aria-label*='Edit image'], button[aria-label*='编辑图片']"
                ));
                for (const btn of editButtons) {
                    if (!btn) continue;
                    if (isInsideQuickInputOverlay(btn)) continue;
                    if (!isElementVisible(btn)) continue;
                    const card = findChatGPTAttachmentCard(btn);
                    if (card && isElementVisible(card)) cards.add(card);
                }
            } catch { }

            try {
                const previewNodes = Array.from(scope.querySelectorAll("[style*='background-image']"));
                for (const node of previewNodes) {
                    if (!node) continue;
                    if (isInsideQuickInputOverlay(node)) continue;
                    if (!isElementVisible(node)) continue;
                    const style = node.getAttribute?.("style") || "";
                    const match = style.match(/background-image:\s*url\(["']?([^"')]+)["']?\)/i);
                    if (match && match[1]) {
                        urls.add(match[1]);
                        imageCount++;
                    }
                    const card = findChatGPTAttachmentCard(node);
                    if (card && isElementVisible(card)) cards.add(card);
                }
            } catch { }

            if (cards.size === 0) {
                try {
                    const sizeContainers = Array.from(scope.querySelectorAll("[class*='h-14'][class*='w-14'], [class*='h-14.5'][class*='w-14.5']"));
                    for (const el of sizeContainers) {
                        if (!el) continue;
                        if (isInsideQuickInputOverlay(el)) continue;
                        if (!isElementVisible(el)) continue;
                        if (el.closest?.("[class*='grid-area:header'], [class*='grid-area\\:header']") || el.closest?.(".group.text-token-text-primary.relative.inline-block")) {
                            fileCount++;
                        }
                    }
                } catch { }
            }

            if (imageCount === 0) {
                try {
                    const imgSelectors = [
                        "img[alt='Uploaded image']",
                        "[data-testid*='file'] img",
                        "[class*='preview'] img"
                    ].join(", ");
                    const imgs = Array.from(scope.querySelectorAll(imgSelectors));
                    for (const img of imgs) {
                        if (!img) continue;
                        if (isInsideQuickInputOverlay(img)) continue;
                         if (!isElementVisible(img)) continue;
                        const src = String(img.getAttribute?.("src") || img.currentSrc || img.src || "").trim();
                        if (src) {
                            urls.add(src);
                            imageCount++;
                        }
                        const card = findChatGPTAttachmentCard(img);
                        if (card && isElementVisible(card)) cards.add(card);
                    }
                } catch { }
            }

            fileCount = Math.max(fileCount, cards.size, removeCount);
            const attachmentCount = Math.max(imageCount, fileCount, removeCount, cards.size, urls.size);
            return { urls, imageCount, fileCount, removeCount, cardCount: cards.size, attachmentCount };
        }

        function hasChatGPTAttachmentChange(prev, next) {
            if (!prev || !next) return false;
            if ((next.attachmentCount || 0) > (prev.attachmentCount || 0)) return true;
            if (next.imageCount > prev.imageCount) return true;
            if (next.fileCount > prev.fileCount) return true;
            if ((next.removeCount || 0) > (prev.removeCount || 0)) return true;
            if ((next.cardCount || 0) > (prev.cardCount || 0)) return true;
            for (const url of next.urls) {
                if (!prev.urls.has(url)) return true;
            }
            return false;
        }

        async function waitForChatGPTAttachmentChange(containerEl, prevSnapshot, { timeoutMs = 9000, intervalMs = 120, shouldCancel = null, runtime = null, composerEl = null } = {}) {
            const cancelFn = typeof shouldCancel === "function" ? shouldCancel : null;
            let containerRef = containerEl || (composerEl ? findChatGPTComposerContainer(composerEl) : null) || document;

            const computeAttachmentState = () => {
                const nextContainer = containerEl || (composerEl ? findChatGPTComposerContainer(composerEl) : null) || containerRef || document;
                if (nextContainer) containerRef = nextContainer;
                const snapshot = getChatGPTAttachmentSnapshot(containerRef);
                return {
                    container: containerRef,
                    snapshot,
                    stateKey: getChatGPTAttachmentFingerprint(snapshot)
                };
            };

            const observed = await waitForObservedState({
                resolveRoots: () => getChatGPTObservationRoots({ containerEl: containerRef, composerEl }),
                computeState: computeAttachmentState,
                isSatisfied: (state) => hasChatGPTAttachmentChange(prevSnapshot, state?.snapshot),
                timeoutMs,
                settleMs: 0,
                pollFallbackMs: Math.max(1000, Number(intervalMs) || 0),
                attributeFilter: CHATGPT_ATTACHMENT_OBSERVED_ATTRIBUTES,
                shouldCancel: cancelFn,
                runtime
            });

            const snapshot = observed?.state?.snapshot || getChatGPTAttachmentSnapshot(containerRef);
            if (observed?.cancelled) {
                return { ok: false, cancelled: true, snapshot };
            }
            return { ok: !!observed?.ok, cancelled: false, snapshot };
        }

        async function waitForChatGPTAttachmentCount(containerEl, targetCount, { timeoutMs = 6000, intervalMs = 120, shouldCancel = null, runtime = null } = {}) {
            const cancelFn = typeof shouldCancel === "function" ? shouldCancel : null;
            const expected = Math.max(0, Number(targetCount) || 0);
            let containerRef = containerEl || document;

            const computeAttachmentCountState = () => {
                containerRef = containerEl || containerRef || document;
                const snapshot = getChatGPTAttachmentSnapshot(containerRef);
                return {
                    container: containerRef,
                    snapshot,
                    stateKey: getChatGPTAttachmentFingerprint(snapshot)
                };
            };

            const observed = await waitForObservedState({
                resolveRoots: () => getChatGPTObservationRoots({ containerEl: containerRef }),
                computeState: computeAttachmentCountState,
                isSatisfied: (state) => (state?.snapshot?.attachmentCount || 0) === expected,
                timeoutMs,
                settleMs: 0,
                pollFallbackMs: Math.max(1000, Number(intervalMs) || 0),
                attributeFilter: CHATGPT_ATTACHMENT_OBSERVED_ATTRIBUTES,
                shouldCancel: cancelFn,
                runtime
            });

            const snapshot = observed?.state?.snapshot || getChatGPTAttachmentSnapshot(containerRef);
            if (observed?.cancelled) {
                return { ok: false, cancelled: true, snapshot };
            }
            return { ok: !!observed?.ok, cancelled: false, snapshot };
        }

        async function trimChatGPTUnexpectedAttachments(containerEl, expectedCount, { shouldCancel = null, runtime = null } = {}) {
            const cancelFn = typeof shouldCancel === "function" ? shouldCancel : null;
            const expected = Math.max(0, Number(expectedCount) || 0);
            let snapshot = getChatGPTAttachmentSnapshot(containerEl);

            while ((snapshot?.attachmentCount || 0) > expected) {
                if (cancelFn && cancelFn()) return { ok: false, cancelled: true, snapshot };
                const buttons = getChatGPTRemoveAttachmentButtons(containerEl);
                const extraCount = (snapshot?.attachmentCount || 0) - expected;
                if (!buttons.length || extraCount <= 0) break;

                const removeBtn = buttons[buttons.length - 1];
                let clicked = false;
                try {
                    clicked = !!TemplateUtils?.events?.simulateClick?.(removeBtn, { nativeFallback: true });
                } catch { }
                if (!clicked) {
                    try { removeBtn.click(); clicked = true; } catch { }
                }
                if (!clicked) break;

                const waitResult = await waitForChatGPTAttachmentCount(containerEl, (snapshot?.attachmentCount || 0) - 1, {
                    timeoutMs: 5000,
                    intervalMs: 120,
                    shouldCancel: cancelFn,
                    runtime
                });
                snapshot = waitResult?.snapshot || getChatGPTAttachmentSnapshot(containerEl);
                if (waitResult?.cancelled) return { ok: false, cancelled: true, snapshot };
                if (!waitResult?.ok && (snapshot?.attachmentCount || 0) >= expected + extraCount) break;
            }

            snapshot = getChatGPTAttachmentSnapshot(containerEl);
            return { ok: (snapshot?.attachmentCount || 0) === expected, cancelled: false, snapshot };
        }

        async function finalizeChatGPTSingleAttachmentInsert(containerEl, prevSnapshot, { shouldCancel = null, runtime = null } = {}) {
            const cancelFn = typeof shouldCancel === "function" ? shouldCancel : null;
            const expectedCount = Math.max(1, Number(prevSnapshot?.attachmentCount || 0) + 1);
            const snapshot = getChatGPTAttachmentSnapshot(containerEl);
            if ((snapshot?.attachmentCount || 0) <= expectedCount) {
                return { ok: true, cancelled: false, snapshot };
            }
            return trimChatGPTUnexpectedAttachments(containerEl, expectedCount, { shouldCancel: cancelFn, runtime });
        }

        async function clearChatGPTAttachments(composerEl, { shouldCancel = null, runtime = null } = {}) {
            const cancelFn = typeof shouldCancel === "function" ? shouldCancel : null;
            let composer = resolveChatGPTComposerElement(composerEl, { requireVisible: false });
            if (!composer) {
                composer = await focusComposer({ timeoutMs: 4000, intervalMs: 120, shouldCancel: cancelFn, runtime });
            }
            if (!composer) {
                return {
                    ok: false,
                    cancelled: !!(cancelFn && cancelFn()),
                    message: "清空当前图片附件失败：未找到输入框。"
                };
            }

            const container = findChatGPTComposerContainer(composer);
            if (!container) {
                return { ok: false, cancelled: false, message: "清空当前图片附件失败：未找到附件容器。" };
            }

            const initialSnapshot = getChatGPTAttachmentSnapshot(container);
            if ((initialSnapshot?.attachmentCount || 0) <= 0) {
                return { ok: true, cancelled: false, snapshot: initialSnapshot };
            }

            const clearResult = await trimChatGPTUnexpectedAttachments(container, 0, { shouldCancel: cancelFn, runtime });
            const snapshot = clearResult?.snapshot || getChatGPTAttachmentSnapshot(container);
            if (clearResult?.cancelled) {
                return { ok: false, cancelled: true, snapshot };
            }
            if (clearResult?.ok) {
                return { ok: true, cancelled: false, snapshot };
            }

            const remaining = Math.max(0, Number(snapshot?.attachmentCount) || 0);
            const removeButtons = getChatGPTRemoveAttachmentButtons(container);
            const message = remaining > 0
                ? (removeButtons.length
                    ? `清空当前图片附件失败：点击移除后仍识别到 ${remaining} 个附件标记。`
                    : `清空当前图片附件失败：仍识别到 ${remaining} 个附件标记，但未找到可用的移除按钮。`)
                : "清空当前图片附件失败：未能确认附件已全部移除。";
            return { ok: false, cancelled: false, snapshot, message };
        }

        function tryAttachImageViaSimulatedPaste(file, composerEl) {
            if (!composerEl) return false;
            if (typeof DataTransfer !== "function") return false;

            const dt = createChatGPTDataTransfer({ files: [file] });
            if (!dt) return false;

            const target = composerEl;
            if (!target || isInsideQuickInputOverlay(target)) return false;

            try { target.focus?.(); } catch { }

            // ChatGPT 当前版本对图片粘贴更依赖原生 paste；额外补 beforeinput/input 容易造成重复接收同一文件。
            return dispatchPasteEvent(target, dt);
        }

        function tryAttachImageViaDropzone(file, composerEl) {
            if (!composerEl) return false;
            if (typeof DataTransfer !== "function") return false;

            let dt;
            try {
                dt = new DataTransfer();
                dt.items.add(file);
                try { dt.effectAllowed = "copy"; } catch { }
                try { dt.dropEffect = "copy"; } catch { }
            } catch {
                return false;
            }

            // ChatGPT：优先使用 prosemirror-parent 作为 dropzone，只触发一次
            let target = null;
            try {
                target = composerEl.closest?.("[class*='prosemirror-parent']");
            } catch { }
            if (!target) {
                target = findBestChatGPTDropzone(composerEl);
            }
            if (!target) {
                target = composerEl;
            }
            if (!target || isInsideQuickInputOverlay(target)) return false;

            // 只向一个目标触发一次拖放事件序列
            let fired = false;
            fired = dispatchDragEvent(target, "dragenter", dt) || fired;
            fired = dispatchDragEvent(target, "dragover", dt) || fired;
            fired = dispatchDragEvent(target, "drop", dt) || fired;

            return fired;
        }

        function tryAttachImageViaFileInput(file, composerEl, diagnostics) {
            if (!composerEl) return false;
            if (typeof DataTransfer !== "function") return false;

            const container = findChatGPTComposerContainer(composerEl);
            const candidates = [];

            if (container) candidates.push(...collectFileInputs(container, { shouldIgnore: isInsideQuickInputOverlay }));
            candidates.push(...collectFileInputs(document, { shouldIgnore: isInsideQuickInputOverlay }));

            if (candidates.length === 0) {
                if (container) candidates.push(...collectFileInputsFromOpenShadows(container, { maxHosts: 1200, shouldIgnore: isInsideQuickInputOverlay }));
                candidates.push(...collectFileInputsFromOpenShadows(document, { maxHosts: 3500, shouldIgnore: isInsideQuickInputOverlay }));
            }

            const uniq = [];
            const seen = new Set();
            for (const input of candidates) {
                if (!input || seen.has(input)) continue;
                seen.add(input);
                if (isInsideQuickInputOverlay(input)) continue;
                uniq.push(input);
            }

            if (diagnostics && typeof diagnostics === "object") diagnostics.fileInputCandidates = uniq.length;

            const accepted = [];
            const fallback = [];
            for (const input of uniq) {
                const accept = String(input.getAttribute?.("accept") || input.accept || "").toLowerCase();
                if (!accept || accept.includes("image") || accept.includes(".png") || accept.includes(".jpg") || accept.includes(".jpeg") || accept.includes(".webp")) {
                    accepted.push(input);
                } else {
                    fallback.push(input);
                }
            }

            for (const input of [...accepted, ...fallback]) {
                if (trySetChatGPTFileInputFiles(input, file) || trySetFileInputFiles(input, file)) return true;
            }

            return false;
        }

        function reportChatGPTAttachmentDiagnostics(onDiagnostics, diagnostics, extra = null) {
            if (typeof onDiagnostics !== "function") return;
            try {
                onDiagnostics(extra ? { ...diagnostics, ...extra } : diagnostics);
            } catch { }
        }

        async function runChatGPTAttachmentInsertStrategy({
            strategyKey,
            beforeFocusDelayMs = 0,
            fire,
            duplicateMessage,
            composer,
            container,
            prevSnapshot,
            diagnostics,
            onDiagnostics,
            shouldCancel = null,
            runtime = null
        } = {}) {
            const cancelFn = typeof shouldCancel === "function" ? shouldCancel : null;

            if (cancelFn && cancelFn()) {
                diagnostics.finalSnapshot = prevSnapshot;
                reportChatGPTAttachmentDiagnostics(onDiagnostics, diagnostics, { cancelled: true });
                return { ok: false, cancelled: true, snapshot: prevSnapshot };
            }

            diagnostics.attempts[strategyKey] += 1;
            if (beforeFocusDelayMs > 0) {
                const preFocusWaitOk = await runtimeSleep(runtime, beforeFocusDelayMs, { shouldCancel: cancelFn });
                if (!preFocusWaitOk) {
                    diagnostics.finalSnapshot = prevSnapshot;
                    reportChatGPTAttachmentDiagnostics(onDiagnostics, diagnostics, { cancelled: true });
                    return { ok: false, cancelled: true, snapshot: prevSnapshot };
                }
            }

            try { composer.focus?.(); } catch { }
            try { TemplateUtils?.events?.simulateClick?.(composer, { nativeFallback: true }); } catch { }
            const focusSettleOk = await runtimeSleep(runtime, 30, { shouldCancel: cancelFn });
            if (!focusSettleOk) {
                diagnostics.finalSnapshot = prevSnapshot;
                reportChatGPTAttachmentDiagnostics(onDiagnostics, diagnostics, { cancelled: true });
                return { ok: false, cancelled: true, snapshot: prevSnapshot };
            }

            const fired = !!(typeof fire === "function" ? fire() : false);
            if (fired) diagnostics.fired[strategyKey] += 1;
            if (!fired) {
                return { ok: false, cancelled: false, snapshot: prevSnapshot };
            }

            const { ok, cancelled, snapshot } = await waitForChatGPTAttachmentChange(container, prevSnapshot, {
                timeoutMs: 9000,
                intervalMs: 120,
                shouldCancel: cancelFn,
                runtime,
                composerEl: composer
            });
            if (cancelled) {
                diagnostics.finalSnapshot = snapshot;
                reportChatGPTAttachmentDiagnostics(onDiagnostics, diagnostics, { cancelled: true });
                return { ok: false, cancelled: true, snapshot };
            }
            if (!ok) {
                return { ok: false, cancelled: false, snapshot };
            }

            const normalized = await finalizeChatGPTSingleAttachmentInsert(container, prevSnapshot, { shouldCancel: cancelFn, runtime });
            if (normalized?.cancelled) {
                const finalSnapshot = normalized.snapshot || snapshot;
                diagnostics.finalSnapshot = finalSnapshot;
                reportChatGPTAttachmentDiagnostics(onDiagnostics, diagnostics, { cancelled: true });
                return { ok: false, cancelled: true, snapshot: finalSnapshot };
            }
            if (normalized?.ok) {
                return { ok: true, cancelled: false, snapshot: normalized.snapshot || snapshot };
            }

            const finalSnapshot = normalized?.snapshot || snapshot;
            diagnostics.finalSnapshot = finalSnapshot;
            return { ok: false, cancelled: false, snapshot: finalSnapshot, message: duplicateMessage };
        }

        async function attachImageToComposer(file, composerEl, { onDiagnostics, shouldCancel = null, runtime = null } = {}) {
            const cancelFn = typeof shouldCancel === "function" ? shouldCancel : null;
            const urlGuard = getChatGPTUrlGuardResult();

            if (!file || !(file instanceof File)) return { ok: false, cancelled: false };
            if (!String(file.type || "").startsWith("image/")) return { ok: false, cancelled: false };
            if (cancelFn && cancelFn()) return { ok: false, cancelled: true };
            if (!urlGuard.ok) return { ok: false, cancelled: false, message: buildChatGPTUrlGuardFailureMessage(urlGuard, { prefix: "图片插入前 URL 校验失败：" }) };

            let composer = resolveChatGPTComposerElement(composerEl);
            if (!composer) {
                composer = await focusComposer({ timeoutMs: 4000, shouldCancel: cancelFn, runtime });
            }
            if (!composer) return { ok: false, cancelled: !!(cancelFn && cancelFn()) };
            const container = findChatGPTComposerContainer(composer);
            if (!container) return { ok: false, cancelled: false };

            const diagnostics = {
                attempts: { paste: 0, drop: 0, fileInput: 0 },
                fired: { paste: 0, drop: 0, fileInput: 0 },
                fileInputCandidates: 0,
                finalSnapshot: null
            };

            // ChatGPT: 按 paste -> drop -> fileInput 的顺序各尝试一次。
            const strategies = [
                {
                    strategyKey: "paste",
                    duplicateMessage: "图片插入后出现重复附件，自动校正失败。",
                    fire: () => tryAttachImageViaSimulatedPaste(file, composer)
                },
                {
                    strategyKey: "drop",
                    beforeFocusDelayMs: 220,
                    duplicateMessage: "图片拖放后出现重复附件，自动校正失败。",
                    fire: () => tryAttachImageViaDropzone(file, composer)
                },
                {
                    strategyKey: "fileInput",
                    beforeFocusDelayMs: 220,
                    duplicateMessage: "图片文件注入后出现重复附件，自动校正失败。",
                    fire: () => tryAttachImageViaFileInput(file, composer, diagnostics)
                }
            ];

            let prev = getChatGPTAttachmentSnapshot(container);

            for (const strategy of strategies) {
                const result = await runChatGPTAttachmentInsertStrategy({
                    ...strategy,
                    composer,
                    container,
                    prevSnapshot: prev,
                    diagnostics,
                    onDiagnostics,
                    shouldCancel: cancelFn,
                    runtime
                });
                if (result?.cancelled) return { ok: false, cancelled: true };
                if (result?.ok) return { ok: true, cancelled: false };
                prev = result?.snapshot || prev;
                if (result?.message) {
                    return { ok: false, cancelled: false, message: result.message };
                }
            }

            diagnostics.finalSnapshot = prev;
            reportChatGPTAttachmentDiagnostics(onDiagnostics, diagnostics);
            return { ok: false, cancelled: false };
        }

        async function attachImagesToComposer(files, composerEl, { onDiagnostics, shouldCancel = null, runtime = null } = {}) {
            const cancelFn = typeof shouldCancel === "function" ? shouldCancel : null;
            const urlGuard = getChatGPTUrlGuardResult();
            const list = Array.from(files || []).filter(file => file && (file instanceof File) && String(file.type || "").startsWith("image/"));
            if (list.length === 0) return { ok: false, cancelled: false, message: "未检测到图片文件。" };
            if (!urlGuard.ok) return { ok: false, cancelled: false, message: buildChatGPTUrlGuardFailureMessage(urlGuard, { prefix: "图片插入前 URL 校验失败：" }) };

            let composer = resolveChatGPTComposerElement(composerEl);
            if (!composer) {
                composer = await focusComposer({ timeoutMs: 4000, shouldCancel: cancelFn, runtime });
            }
            if (!composer) return { ok: false, cancelled: !!(cancelFn && cancelFn()) };

            for (let i = 0; i < list.length; i++) {
                if (cancelFn && cancelFn()) return { ok: false, cancelled: true };
                const file = list[i];
                const result = await attachImageToComposer(file, composer, {
                    onDiagnostics: (diag) => {
                        if (typeof onDiagnostics !== "function") return;
                        try {
                            onDiagnostics({
                                fileIndex: i,
                                fileName: file?.name || "",
                                fileSize: Number(file?.size) || 0,
                                ...diag
                            });
                        } catch { }
                    },
                    shouldCancel: cancelFn,
                    runtime
                });
                if (result?.cancelled) return { ok: false, cancelled: true };
                if (!result?.ok) {
                    const detail = typeof result?.message === "string" && result.message.trim()
                        ? result.message.trim()
                        : "图片粘贴失败：未检测到输入框内出现图片预览。";
                    return { ok: false, cancelled: false, message: detail };
                }
                const betweenFilesWaitOk = await runtimeSleep(runtime, 120, { shouldCancel: cancelFn });
                if (!betweenFilesWaitOk) return { ok: false, cancelled: true };
            }

            return { ok: true, cancelled: false };
        }

        function findSendButtonNearComposer(composerEl) {
            const candidates = [];
            const scopes = [];
            try {
                const form = composerEl?.closest?.("form");
                if (form) scopes.push(form);
            } catch { }
            scopes.push(document);

            const selectors = [
                "button[data-testid='send-button']",
                "button[aria-label*='Send']",
                "button[aria-label*='发送']",
                "button[type='submit']"
            ];

            for (const scope of scopes) {
                for (const sel of selectors) {
                    try {
                        candidates.push(...Array.from(scope.querySelectorAll(sel)));
                    } catch { }
                }
            }

            for (const btn of candidates) {
                if (!btn) continue;
                if (!isElementVisible(btn)) continue;
                if (isInsideQuickInputOverlay(btn)) continue;
                return btn;
            }
            return null;
        }

        function isAriaDisabled(el) {
            if (!el || typeof el.getAttribute !== "function") return false;
            const value = String(el.getAttribute("aria-disabled") || "").trim().toLowerCase();
            return value === "true";
        }

        function isChatGPTSendButtonDisabled(btn) {
            if (!btn) return true;
            if (btn.disabled) return true;
            if (isAriaDisabled(btn)) return true;
            return false;
        }

        function getChatGPTAttachmentFingerprint(snapshot) {
            if (!snapshot) return "";
            const urls = Array.from(snapshot.urls || []).slice(0, 6).sort().join("|");
            return `${snapshot.attachmentCount || 0};${snapshot.imageCount || 0};${snapshot.fileCount || 0};${snapshot.removeCount || 0};${snapshot.cardCount || 0};${urls}`;
        }

        function hasChatGPTUploadInProgress(containerEl) {
            const container = containerEl || document;
            const scope = getChatGPTAttachmentScope(container);
            const selectors = [
                "[aria-busy='true']",
                "[role='progressbar']",
                "progress",
                "[data-state='loading']",
                "[class*='uploading']",
            ].join(", ");

            try {
                const matches = Array.from(scope.querySelectorAll(selectors));
                for (const el of matches) {
                    if (!el) continue;
                    if (isInsideQuickInputOverlay(el)) continue;
                    if (!isElementVisible(el)) continue;
                    return true;
                }
            } catch { }
            return false;
        }

        function buildChatGPTReadyToSendMessage({ sendReady, hasImage, hasEnoughAttachments, uploadBusy, attachmentCount, minAttachments, textLength }) {
            if (!hasImage) {
                return `未检测到可发送的图片预览（当前识别到 ${attachmentCount} 个附件标记）。`;
            }
            if (!hasEnoughAttachments) {
                return `图片数量未达到预期：当前 ${attachmentCount} 张，期望至少 ${Math.max(0, Number(minAttachments) || 0)} 张。`;
            }
            if (uploadBusy) {
                return `图片已贴入，但仍检测到可见上传指示器，暂不发送。`;
            }
            if (!sendReady) {
                if ((Number(textLength) || 0) <= 0) {
                    return "图片已贴好，但当前输入框文字为空，发送按钮未就绪；页面可能已重建，旧输入框引用失效。";
                }
                return `图片已贴好，但发送按钮仍不可用（当前文字长度 ${textLength}）。`;
            }
            return `发送前稳定检测超时：attachment=${attachmentCount}, text=${textLength}, busy=${uploadBusy ? 1 : 0}, sendReady=${sendReady ? 1 : 0}`;
        }

        async function waitForChatGPTNewChatReady({ timeoutMs = 12000, intervalMs = 160, settleMs = 300, shouldCancel = null, runtime = null } = {}) {
            const cancelFn = typeof shouldCancel === "function" ? shouldCancel : null;
            const deadline = getRuntimeNow(runtime) + Math.max(0, Number(timeoutMs) || 0);
            const settle = Math.max(0, Number(settleMs) || 0);
            let stableSince = 0;

            while (getRuntimeNow(runtime) < deadline) {
                if (cancelFn && cancelFn()) {
                    return { ok: false, cancelled: true, url: getCurrentChatGPTUrl() };
                }

                if (isChatGPTRootUrl()) {
                    if (!stableSince) stableSince = getRuntimeNow(runtime);
                    if (getRuntimeNow(runtime) - stableSince >= settle) {
                        return { ok: true, cancelled: false, url: CHATGPT_ROOT_URL };
                    }
                } else {
                    stableSince = 0;
                }

                const waitOk = await runtimeSleep(runtime, intervalMs, { shouldCancel: cancelFn });
                if (!waitOk) {
                    return { ok: false, cancelled: true, url: getCurrentChatGPTUrl() };
                }
            }

            const currentUrl = getCurrentChatGPTUrl();
            return {
                ok: false,
                cancelled: false,
                url: currentUrl,
                message: buildChatGPTRootUrlMismatchMessage(currentUrl, { prefix: "新对话校验失败：" })
            };
        }

        function getChatGPTReadyToSendState(composerEl, { requireImage = false, minAttachments = 0 } = {}) {
            const container = findChatGPTComposerContainer(composerEl);
            const snapshot = container ? getChatGPTAttachmentSnapshot(container) : null;
            const sendBtn = findSendButtonNearComposer(composerEl);
            const sendReady = !!(sendBtn && !isChatGPTSendButtonDisabled(sendBtn));

            const attachmentCount = snapshot ? (snapshot.attachmentCount || 0) : 0;
            const hasImage = !!(snapshot && (snapshot.imageCount > 0 || snapshot.fileCount > 0));
            const requiredAttachments = Math.max(0, Number(minAttachments) || 0);
            const hasEnoughAttachments = !requireImage || requiredAttachments <= 0 || attachmentCount >= requiredAttachments;
            const uploadBusy = requireImage && container ? hasChatGPTUploadInProgress(container) : false;
            const textLength = getChatGPTComposerPlainText(composerEl).length;
            const ok = sendReady && (!requireImage || (hasImage && hasEnoughAttachments && !uploadBusy));
            const fingerprint = getChatGPTAttachmentFingerprint(snapshot);
            const stateKey = `${fingerprint};send=${sendReady ? 1 : 0};busy=${uploadBusy ? 1 : 0};img=${hasImage ? 1 : 0};count=${attachmentCount};min=${requiredAttachments};text=${textLength}`;

            return {
                container,
                snapshot,
                sendBtn,
                sendReady,
                attachmentCount,
                hasImage,
                hasEnoughAttachments,
                uploadBusy,
                textLength,
                ok,
                stateKey,
                requiredAttachments
            };
        }

        async function waitForChatGPTReadyToSend(composerEl, { requireImage = false, minAttachments = 0, timeoutMs = 45000, intervalMs = 160, settleMs = 600, shouldCancel = null, runtime = null } = {}) {
            const cancelFn = typeof shouldCancel === "function" ? shouldCancel : null;
            let composer = resolveChatGPTComposerElement(composerEl);
            if (!composer) {
                composer = await focusComposer({ timeoutMs: 4000, intervalMs: 120, shouldCancel: cancelFn, runtime });
            }
            if (!composer) return { ok: false, reason: "no-composer", cancelled: !!(cancelFn && cancelFn()) };

            let composerRef = composer;
            let lastState = null;
            const computeReadyState = () => {
                const resolvedComposer = resolveChatGPTComposerElement(composerRef, { requireVisible: false });
                if (resolvedComposer) composerRef = resolvedComposer;
                lastState = getChatGPTReadyToSendState(composerRef, { requireImage, minAttachments });
                return lastState;
            };

            const observed = await waitForObservedState({
                resolveRoots: () => getChatGPTObservationRoots({
                    containerEl: lastState?.container || findChatGPTComposerContainer(composerRef),
                    composerEl: composerRef
                }),
                computeState: computeReadyState,
                isSatisfied: (state) => !!state?.ok,
                timeoutMs,
                settleMs,
                pollFallbackMs: Math.max(1000, Number(intervalMs) || 0),
                attributeFilter: CHATGPT_READY_OBSERVED_ATTRIBUTES,
                shouldCancel: cancelFn,
                runtime
            });

            const state = observed?.state || computeReadyState();
            if (observed?.cancelled) {
                return { ok: false, reason: "cancelled", cancelled: true, snapshot: state.snapshot };
            }
            return {
                ok: !!observed?.ok,
                button: state.sendBtn,
                snapshot: state.snapshot,
                reason: observed?.ok ? "ok" : "timeout",
                cancelled: false,
                message: observed?.ok ? "" : buildChatGPTReadyToSendMessage({
                    sendReady: state.sendReady,
                    hasImage: state.hasImage,
                    hasEnoughAttachments: state.hasEnoughAttachments,
                    uploadBusy: state.uploadBusy,
                    attachmentCount: state.attachmentCount,
                    minAttachments: state.requiredAttachments,
                    textLength: state.textLength
                })
            };
        }

        async function sendChatGPTMessage(composerEl) {
            const urlGuard = getChatGPTUrlGuardResult();
            if (!urlGuard.ok) return false;
            let composer = resolveChatGPTComposerElement(composerEl);
            if (!composer) {
                composer = await focusComposer();
            }
            if (!composer) return false;

            const btn = findSendButtonNearComposer(composer);
            if (btn) {
                if (isChatGPTSendButtonDisabled(btn)) return false;
                try {
                    return !!TemplateUtils?.events?.simulateClick?.(btn, { nativeFallback: true });
                } catch { }
                try { btn.click(); return true; } catch { }
                return false;
            }

            return simulateKeystroke("ENTER", { target: composer });
        }

        return Object.freeze({
            // focusComposer 默认检测输出状态，如果正在输出则自动新建对话
            focusComposer: (opts) => focusComposer({ 
                ...(opts || {}), 
                checkStreaming: true  // 循环模式下自动检测并处理输出状态
            }),
            setInputValue: setChatGPTInputValue,
            clearComposerValue: clearChatGPTInputValue,
            attachImages: attachImagesToComposer,
            clearAttachments: clearChatGPTAttachments,
            waitForReadyToSend: waitForChatGPTReadyToSend,
            waitForNewChatReady: waitForChatGPTNewChatReady,
            triggerNewChat: ({ shouldCancel = null } = {}) => triggerNativeNewChat({ shouldCancel }),
            newChatLabel: NATIVE_NEW_CHAT_LABEL,
            lockNewChatHotkey: true,
            lockedNewChatHotkeyDisplay: NATIVE_NEW_CHAT_LABEL,
            sendMessage: sendChatGPTMessage
        });
    }

    let quickInputController = null;

    function ensureQuickInputController(engine) {
        if (quickInputController) return quickInputController;
        const QuickInput = ShortcutTemplate?.quickInput;
        if (!QuickInput || typeof QuickInput.createController !== "function") {
            console.error("[ChatGPT Shortcut] Template quickInput module not found (update Template core).");
            return null;
        }
        const adapter = createChatGPTQuickInputAdapter({ idPrefix: "chatgpt" });
        if (!adapter) {
            console.error("[ChatGPT Shortcut] ChatGPT quickInput adapter init failed (update Template core).");
            return null;
        }
        quickInputController = QuickInput.createController({
            engine,
            idPrefix: "chatgpt",
            storageKey: QUICK_INPUT_STORAGE_KEY,
            title: "ChatGPT - 快捷输入",
            primaryColor: "#5D5CDE",
            themeMode: "system",
            adapter
        });
        return quickInputController;
    }

    function markMenuCommandHandled(commandId) {
        const id = String(commandId || "").trim();
        if (!id) return true;
        if (handledMenuCommandIdSet.has(id)) return false;
        handledMenuCommandIdSet.add(id);
        handledMenuCommandIds.push(id);
        while (handledMenuCommandIds.length > 120) {
            const staleId = handledMenuCommandIds.shift();
            if (!staleId) continue;
            handledMenuCommandIdSet.delete(staleId);
        }
        return true;
    }

    function handleMenuCommandWithId(engine, commandKey, commandId = "") {
        if (!markMenuCommandHandled(commandId)) return false;
        const key = String(commandKey || "").trim();
        if (!key) return false;

        switch (key) {
            case MENU_COMMAND_KEYS.quickInput:
                ensureQuickInputController(engine)?.open?.();
                return true;
            default:
                return false;
        }
    }

    function normalizePendingMenuEntries(entries) {
        const now = Date.now();
        const normalized = [];
        const seenIds = new Set();
        for (const entry of Array.isArray(entries) ? entries : []) {
            const commandId = typeof entry?.id === "string" ? entry.id.trim() : "";
            const commandKey = typeof entry?.key === "string" ? entry.key.trim() : "";
            const pageToken = typeof entry?.pageToken === "string" ? entry.pageToken.trim() : "";
            const createdAt = Number(entry?.createdAt);
            if (!commandId || !commandKey || !pageToken) continue;
            if (!Number.isFinite(createdAt)) continue;
            if ((now - createdAt) > MENU_COMMAND_MAX_AGE_MS) continue;
            if (seenIds.has(commandId)) continue;
            seenIds.add(commandId);
            normalized.push({ commandId, commandKey, pageToken, createdAt });
        }
        if (normalized.length <= 48) return normalized;
        return normalized.slice(normalized.length - 48);
    }

    function readPendingMenuEntries() {
        if (!menuPendingValueKey) return [];
        return normalizePendingMenuEntries(gmGetValueLocal(menuPendingValueKey, []));
    }

    function writePendingMenuEntries(entries) {
        if (!menuPendingValueKey) return;
        gmSetValueLocal(menuPendingValueKey, normalizePendingMenuEntries(entries).map((entry) => ({
            id: entry.commandId,
            key: entry.commandKey,
            pageToken: entry.pageToken,
            createdAt: entry.createdAt
        })));
    }

    function bindMenuCommandMessages(engine) {
        if (!bootstrapMenuManaged || !menuCommandMessageType || !menuCommandMessageSource) return;
        if (typeof window === "undefined" || !window || typeof window.addEventListener !== "function") return;

        window.addEventListener("message", (event) => {
            const detail = event?.data;
            if (!detail || typeof detail !== "object") return;
            if (detail.source !== menuCommandMessageSource) return;
            if (detail.type !== menuCommandMessageType) return;
            if (detail.siteId !== runtime?.siteId) return;
            if (menuPageToken && detail.pageToken && detail.pageToken !== menuPageToken) return;
            handleMenuCommandWithId(engine, detail.commandKey, detail.commandId);
        });
    }

    function startMenuCommandPolling(engine) {
        if (!bootstrapMenuManaged) return;
        if (typeof window === "undefined" || !window) return;
        const drain = () => {
            consumePendingMenuCommands(engine);
        };

        drain();
        try {
            if (menuCommandPollTimer !== null) {
                clearInterval(menuCommandPollTimer);
            }
        } catch { }
        menuCommandPollTimer = window.setInterval(drain, 350);

        if (typeof window.addEventListener === "function") {
            window.addEventListener("focus", drain);
        }
        if (typeof document !== "undefined" && document && typeof document.addEventListener === "function") {
            document.addEventListener("visibilitychange", () => {
                if (document.visibilityState === "visible") {
                    drain();
                }
            });
        }
    }

    function stopMenuCommandPolling() {
        if (menuCommandPollTimer === null) return;
        try {
            clearInterval(menuCommandPollTimer);
        } catch { }
        menuCommandPollTimer = null;
    }

    function consumePendingMenuCommands(engine) {
        if (!bootstrapMenuManaged) return;
        const pendingEntries = readPendingMenuEntries();
        if (pendingEntries.length === 0) return;
        const remainingEntries = [];
        let didMutatePendingEntries = false;
        for (const entry of pendingEntries) {
            if (entry.pageToken !== menuPageToken) {
                remainingEntries.push(entry);
                continue;
            }
            didMutatePendingEntries = true;
            handleMenuCommandWithId(engine, entry.commandKey, entry.commandId);
        }
        if (didMutatePendingEntries || remainingEntries.length !== pendingEntries.length) {
            writePendingMenuEntries(remainingEntries);
        }
    }

    // ===== ChatGPT 快捷输入适配器结束 =====

    function normalizeMenuToken(value) {
        return String(value ?? "").trim();
    }

    function normalizeSubmenuKey(value) {
        const token = normalizeMenuToken(value).toLowerCase();
        if (!token) return "";
        return token;
    }

    function normalizeMenuAction(value) {
        const token = normalizeMenuToken(value).toLowerCase();
        return token || "onestep";
    }

    function hasValidTextMatch(textMatch) {
        if (typeof textMatch === "string") return !!textMatch.trim();
        if (textMatch instanceof RegExp) return true;
        if (typeof textMatch === "function") return true;
        if (Array.isArray(textMatch)) return textMatch.some(v => hasValidTextMatch(v));
        return false;
    }

    function getChatgptMenuActionSpec(shortcut) {
        const data = shortcut && typeof shortcut.data === "object" && !Array.isArray(shortcut.data) ? shortcut.data : {};
        const rawMenu = data.menu;

        const menu = (rawMenu && typeof rawMenu === "object" && !Array.isArray(rawMenu))
            ? rawMenu
            : (rawMenu !== undefined ? { textMatch: rawMenu } : data);

        const selector = typeof menu.selector === "string" && menu.selector.trim()
            ? menu.selector.trim()
            : SELECTORS.popupMenuItem;

        const fallbackToFirst = !!menu.fallbackToFirst;
        const waitForItem = (menu.waitForItem !== undefined) ? !!menu.waitForItem : true;

        const action = normalizeMenuAction(menu.action);
        const allowFirstItem = !!menu.allowFirstItem;
        let textMatch = (menu.keyword !== undefined) ? menu.keyword : menu.textMatch;

        const openSubmenus = [];
        const searchSubmenus = menu.searchSubmenus;
        const shouldAutoSearchSubmenus = action !== "open" && action !== "submenu" && action !== "click";
        if (searchSubmenus === false) {
            // do nothing
        } else if (typeof searchSubmenus === "string" && searchSubmenus.trim()) {
            openSubmenus.push(searchSubmenus);
        } else if (Array.isArray(searchSubmenus)) {
            openSubmenus.push(...searchSubmenus);
        } else if (typeof menu.openSubmenus !== "undefined") {
            if (Array.isArray(menu.openSubmenus)) openSubmenus.push(...menu.openSubmenus);
        } else if (shouldAutoSearchSubmenus) {
            openSubmenus.push(...Object.keys(popupMenu?.submenus || {}));
        }

        const path = Array.isArray(menu.path) ? menu.path : null;
        if (path && path.length) {
            const parts = path.map(normalizeMenuToken).filter(Boolean);
            if (parts.length) {
                const last = parts[parts.length - 1];
                if ((textMatch === undefined || textMatch === null || textMatch === "") && last) textMatch = last;
                for (const label of parts.slice(0, -1)) openSubmenus.push(label);
            }
        }

        const normalizedOpenSubmenus = Array.from(new Set(openSubmenus.map(normalizeSubmenuKey).filter(Boolean)));
        const submenuKey = normalizeSubmenuKey(menu.submenuKey || (normalizedOpenSubmenus[0] || ""));

        if (action === "submenu" && !submenuKey) {
            console.warn("[ChatGPT Shortcut] chatgptMenu: missing submenuKey; set data.menu.submenuKey (or set data.menu.openSubmenus/searchSubmenus like [\"More\"]).");
            return null;
        }

        if (action !== "open" && action !== "submenu" && !allowFirstItem && !hasValidTextMatch(textMatch)) {
            console.warn("[ChatGPT Shortcut] chatgptMenu: missing keyword; set data.menu = \"Canvas\" (or set data.menu.textMatch / data.menu.keyword), or set data.menu.allowFirstItem=true to click the first item.");
            return null;
        }

        return {
            action,
            selector,
            textMatch: allowFirstItem ? null : textMatch,
            openSubmenus: normalizedOpenSubmenus,
            fallbackToFirst,
            waitForItem,
            submenuKey
        };
    }

    const CUSTOM_ACTIONS = {
        chatgptMenu: ({ shortcut, engine }) => {
            const spec = getChatgptMenuActionSpec(shortcut);
            if (!spec) return false;
            switch (spec.action) {
                case "open": {
                    return popupMenu.ensureOpen({ engine });
                }
                case "submenu": {
                    return popupMenu.ensureSubmenuOpen({ engine }, spec.submenuKey);
                }
                case "click": {
                    return popupMenu.clickInOpenMenus(
                        { engine },
                        { selector: spec.selector, textMatch: spec.textMatch, fallbackToFirst: spec.fallbackToFirst, waitForItem: spec.waitForItem }
                    );
                }
                default: {
                    return popupMenu.oneStepClick(
                        { engine },
                        {
                            selector: spec.selector,
                            textMatch: spec.textMatch,
                            openSubmenus: spec.openSubmenus,
                            fallbackToFirst: spec.fallbackToFirst,
                            waitForItem: spec.waitForItem
                        }
                    );
                }
            }
        },
        quickInput: ({ engine }) => {
            ensureQuickInputController(engine)?.open?.();
        }
    };
    // ===== ChatGPT 特有功能模块结束 =====

    // ===== 模版模块配置与初始化（ShortcutTemplate） =====

    const baseShortcut = {
        url: "",
        urlMethod: "current",
        urlAdvanced: "href",
        selector: "",
        simulateKeys: "",
        icon: defaultIconURL
    };

    const createShortcut = (overrides) => ({ ...baseShortcut, ...overrides });

    // ChatGPT 默认快捷键配置
    const defaultShortcuts = [
        // === ChatGPT 原生快捷键（simulate）===
        createShortcut({
            name: "New Chat",
            actionType: "simulate",
            simulateKeys: "CMD+SHIFT+O",
            hotkey: "CTRL+N"
        }),
        createShortcut({
            name: "Toggle Sidebar",
            actionType: "simulate",
            simulateKeys: "CMD+SHIFT+S",
            hotkey: "CTRL+B"
        }),
        createShortcut({
            name: "Copy Last Code Block",
            actionType: "simulate",
            simulateKeys: "CMD+SHIFT+;",
            hotkey: "CTRL+1"
        }),
        createShortcut({
            name: "Delete Chat",
            actionType: "simulate",
            simulateKeys: "CMD+SHIFT+BACKSPACE",
            hotkey: "CTRL+BACKSPACE"
        }),
        createShortcut({
            name: "Focus chat input",
            actionType: "simulate",
            simulateKeys: "SHIFT+ESC",
            hotkey: "CTRL+/"
        }),
        createShortcut({
            name: "Add photos & files",
            actionType: "simulate",
            simulateKeys: "CMD+U",
            hotkey: "CTRL+F"
        }),

        // === ChatGPT 页面按钮（selector）===
        createShortcut({
            name: "Temporary Chat",
            actionType: "selector",
            selector: "button[aria-label*='temporary chat']",
            hotkey: "CTRL+SHIFT+I"
        }),

        // === URL 跳转（url）===
        createShortcut({
            name: "Model: o3",
            actionType: "url",
            url: "https://chatgpt.com/g/g-YyyyMT9XH-chatgpt-classic?model=o3",
            urlMethod: "spa",
            urlAdvanced: "pushState",
            hotkey: "CTRL+3"
        }),

        // === customAction: "chatgptMenu" ===
        // 只需填写菜单项关键词即可；脚本会自动在主菜单/More 子菜单中查找并点击。
        createShortcut({
            name: "Create image",
            actionType: "custom",
            customAction: "chatgptMenu",
            data: { menu: "Create image" },
            hotkey: "CTRL+I"
        }),
        createShortcut({
            name: "Deep research",
            actionType: "custom",
            customAction: "chatgptMenu",
            data: { menu: "Deep research" },
            hotkey: "CTRL+R"
        }),
        createShortcut({
            name: "Thinking",
            actionType: "custom",
            customAction: "chatgptMenu",
            data: { menu: "Thinking" },
            hotkey: "CTRL+T"
        }),
        createShortcut({
            name: "Canvas",
            actionType: "custom",
            customAction: "chatgptMenu",
            data: { menu: "Canvas" },
            hotkey: "CTRL+C"
        }),
        createShortcut({
            name: "Web",
            actionType: "custom",
            customAction: "chatgptMenu",
            data: { menu: "Web" },
            hotkey: "CTRL+W"
        }),
        createShortcut({
            name: "Quick Input",
            actionType: "custom",
            customAction: "quickInput",
            hotkey: "CTRL+SHIFT+K",
            data: {}
        })
    ];

    // 创建快捷键引擎实例
	    const engine = ShortcutTemplate.createShortcutEngine({
        // 基本配置
        menuCommandLabel: "ChatGPT - 设置快捷键",
        bootstrapMenuManaged,
        menuBridge,
        panelTitle: "ChatGPT - 自定义快捷键",

        // 存储键配置
        storageKeys: {
            shortcuts: "chatgpt_shortcuts_v1",
            iconCachePrefix: "chatgpt_icon_cache_v1::",
            userIcons: "chatgpt_user_icons_v1"
        },

        // UI配置
        ui: {
            idPrefix: "chatgpt"
        },

        // 图标相关配置
        defaultIconURL,
        iconLibrary: defaultIcons,
        protectedIconUrls,

        // 默认快捷键
        defaultShortcuts,

	        // 自定义动作表：将 1step/复杂点击动作纳入引擎
	        customActions: CUSTOM_ACTIONS,

	        // 自定义动作 data 编辑器适配：让用户直接输入关键词（无需 JSON）
	        customActionDataAdapters: {
	            chatgptMenu: {
	                label: "菜单关键词（或粘贴 JSON，高级用法）:",
	                placeholder: "例如: Web / Canvas / Thinking / Create image",
	                format: (data) => {
	                    const raw = (data && typeof data === "object" && !Array.isArray(data)) ? data : {};
	                    const keys = Object.keys(raw);
	                    if (keys.length === 0) return "";

	                    const menu = raw.menu;
	                    if (typeof menu === "string" && menu.trim()) return menu.trim();

	                    if (menu && typeof menu === "object" && !Array.isArray(menu)) {
	                        const menuKeys = Object.keys(menu);
	                        const keyword = (typeof menu.keyword === "string" && menu.keyword.trim())
	                            ? menu.keyword.trim()
	                            : ((typeof menu.textMatch === "string" && menu.textMatch.trim()) ? menu.textMatch.trim() : "");
	                        if (keyword && menuKeys.every(k => ["keyword", "textMatch"].includes(k))) return keyword;
	                    }

	                    if (keys.length === 1 && keys[0] === "textMatch" && typeof raw.textMatch === "string" && raw.textMatch.trim()) {
	                        return raw.textMatch.trim();
	                    }

	                    try {
	                        return JSON.stringify(raw, null, 2);
	                    } catch {
	                        return "";
	                    }
	                },
	                parse: (text) => {
	                    const trimmed = String(text ?? "").trim();
	                    if (!trimmed) return {};
	                    if (trimmed.startsWith("{") || trimmed.startsWith("[")) {
	                        const parsed = JSON.parse(trimmed);
	                        if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) throw new Error("data must be an object");
	                        return parsed;
	                    }
	                    return { menu: trimmed };
	                }
	            }
	        },

	        // 主题颜色 - 使用ChatGPT的主题色
	        colors: {
	            primary: "#5D5CDE"
	        },

        // 控制台标签
        consoleTag: "[ChatGPT Shortcut Script]",

        // 图标缓存策略 - ChatGPT域名绕过缓存
        shouldBypassIconCache: (url) => {
            return url && (url.startsWith('https://chatgpt.com/') || url.startsWith('https://openai.com/'));
        },

        // 其余参数保持默认（Template 内置：URL模版解析、中文文案、响应式断点等）
    });

    // 初始化引擎
    engine.init();
    bindMenuCommandMessages(engine);
    startMenuCommandPolling(engine);
    if (bootstrapMenuManaged && typeof window !== "undefined" && window && typeof window.addEventListener === "function") {
        window.addEventListener("pagehide", stopMenuCommandPolling, { once: true });
        window.addEventListener("beforeunload", stopMenuCommandPolling, { once: true });
    } else {
        gmRegisterMenuCommandLocal("ChatGPT - 快捷输入", () => {
            ensureQuickInputController(engine)?.open?.();
        });
    }
    consumePendingMenuCommands(engine);

    // ===== 模版模块配置与初始化结束 =====
}
