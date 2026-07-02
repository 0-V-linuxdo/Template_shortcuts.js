/* -------------------------------------------------------------------------- *
 * Site Entry · [DeepSeek] 快捷键跳转
 * -------------------------------------------------------------------------- */

(function() {
    'use strict';

    const ShortcutTemplate = window.ShortcutTemplate;

    if (!ShortcutTemplate || typeof ShortcutTemplate.createShortcutEngine !== 'function') {
        console.error('[DeepSeek Shortcut] Template module not found.');
        return;
    }

    function gmGetValueLocal(key, fallback) {
        if (typeof GM_getValue !== "function") return fallback;
        try {
            const value = GM_getValue(key, fallback);
            if (value && typeof value.then === "function") return fallback;
            return value === undefined ? fallback : value;
        } catch {
            return fallback;
        }
    }

    function gmSetValueLocal(key, value) {
        if (typeof GM_setValue !== "function") return;
        try {
            GM_setValue(key, value);
        } catch { }
    }

    function gmRegisterMenuCommandLocal(label, handler) {
        if (typeof GM_registerMenuCommand !== "function") return null;
        try {
            return GM_registerMenuCommand(label, handler);
        } catch {
            return null;
        }
    }

    function gmUnregisterMenuCommandLocal(commandId) {
        if (typeof GM_unregisterMenuCommand !== "function") return;
        try {
            GM_unregisterMenuCommand(commandId);
        } catch { }
    }

    function getLocalStorageLocal() {
        try {
            return globalThis.localStorage || null;
        } catch {
            return null;
        }
    }

    function getLocalBooleanFallback(key, fallback) {
        const storage = getLocalStorageLocal();
        const storageKey = String(key || "").trim();
        if (!storage || !storageKey) return fallback;
        try {
            const raw = storage.getItem(storageKey);
            if (raw == null) return fallback;
            if (raw === "true" || raw === "1") return true;
            if (raw === "false" || raw === "0") return false;
            const parsed = JSON.parse(raw);
            if (typeof parsed === "boolean") return parsed;
        } catch { }
        return fallback;
    }

    function setLocalBooleanFallback(key, value) {
        const storage = getLocalStorageLocal();
        const storageKey = String(key || "").trim();
        if (!storage || !storageKey) return;
        try {
            storage.setItem(storageKey, JSON.stringify(!!value));
        } catch { }
    }

    const LOG_TAG = "[DeepSeek Shortcut Script]";
    const SHORTCUTS_STORAGE_KEY = "deepseek_shortcuts_v1";
    const ICON_CACHE_PREFIX = "deepseek_icon_cache_v1::";
    const USER_ICONS_STORAGE_KEY = "deepseek_user_icons_v1";
    const DEFAULTS_MIGRATION_KEY = "deepseek_defaults_migrated_20260520_cmdj_adaptive_icons_v1";
    const DELETE_CURRENT_CHAT_SHORTCUT_MIGRATION_KEY = "deepseek_delete_current_chat_shortcut_added_20260702_v1";
    const DEFAULT_EXPERT_MODE_STORAGE_KEY = "deepseek_default_expert_mode_v1";
    const DEFAULT_EXPERT_MODE_ENABLED = true;
    const DEFAULT_EXPERT_MODE_REQUEST_COOLDOWN_MS = 1200;
    const TemplateUtils = ShortcutTemplate?.utils || {};
    const TemplateDomUtils = TemplateUtils?.dom || {};
    const TemplateEventUtils = TemplateUtils?.events || {};

    function cloneShortcutRecord(shortcut) {
        if (!shortcut || typeof shortcut !== "object") return null;
        try {
            return JSON.parse(JSON.stringify(shortcut));
        } catch {
            return { ...shortcut };
        }
    }

    function normalizeDeepSeekToken(value) {
        return String(value ?? "").replace(/\s+/g, " ").trim().toLowerCase();
    }

    function isVisibleElement(element) {
        if (!element || typeof element.getBoundingClientRect !== "function") return false;
        if (typeof TemplateDomUtils.isVisible === "function") {
            try {
                if (!TemplateDomUtils.isVisible(element)) return false;
            } catch { }
        }
        const rect = element.getBoundingClientRect();
        if (!rect || rect.width <= 0 || rect.height <= 0) return false;
        const style = window.getComputedStyle ? window.getComputedStyle(element) : null;
        return !style || (style.display !== "none" && style.visibility !== "hidden" && style.opacity !== "0");
    }

    function safeQuerySelectorAllLocal(selector) {
        const raw = String(selector || "").trim();
        if (!raw) return [];
        if (typeof TemplateDomUtils.safeQuerySelectorAll === "function") {
            try {
                return TemplateDomUtils.safeQuerySelectorAll(document, raw) || [];
            } catch { }
        }
        try {
            return Array.from(document.querySelectorAll(raw));
        } catch {
            return [];
        }
    }

    function getClickableTarget(element) {
        if (!element || typeof element.closest !== "function") return element || null;
        return element.closest("button, a[href], input[type='radio'], input[type='checkbox'], [role='button'], [role='radio'], [role='switch'], [aria-checked], [onclick], label") || element;
    }

    function clickDeepSeekElement(element) {
        const target = getClickableTarget(element);
        if (!target || !isVisibleElement(target)) return false;

        try {
            if (typeof TemplateEventUtils.simulateClick === "function") {
                const ok = TemplateEventUtils.simulateClick(target, { nativeFallback: true });
                if (ok) return true;
            }
        } catch { }

        try {
            if (typeof target.click === "function") {
                target.click();
                return true;
            }
        } catch { }

        try {
            const event = new MouseEvent("click", { bubbles: true, cancelable: true, composed: true, view: window });
            target.dispatchEvent(event);
            return true;
        } catch {
            return false;
        }
    }

    function clickDeepSeekElementNativeFirst(element) {
        const target = getClickableTarget(element);
        if (!target || !isVisibleElement(target)) return false;

        try {
            if (typeof target.click === "function") {
                target.click();
                return true;
            }
        } catch { }

        return clickDeepSeekElement(target);
    }

    function clickCssSelector(selector) {
        const matches = safeQuerySelectorAllLocal(selector);
        for (const match of matches) {
            const target = getClickableTarget(match);
            if (target && isVisibleElement(target) && clickDeepSeekElement(target)) return true;
        }
        return false;
    }

    function getElementLabelText(element) {
        if (!element) return "";
        const parts = [
            element.getAttribute?.("aria-label"),
            element.getAttribute?.("aria-labelledby")
                ?.split(/\s+/)
                .map(id => document.getElementById(id)?.textContent || "")
                .join(" "),
            element.getAttribute?.("title"),
            element.getAttribute?.("value"),
            element.id ? Array.from(document.querySelectorAll("label"))
                .filter(label => label.getAttribute?.("for") === element.id)
                .map(label => label.textContent || "")
                .join(" ") : "",
            element.closest?.("label")?.textContent,
            element.innerText,
            element.textContent
        ].filter(Boolean);
        return parts.join(" ");
    }

    function matchesAnyLabel(element, labels, { exact = true } = {}) {
        const text = normalizeDeepSeekToken(getElementLabelText(element));
        if (!text) return false;
        return labels.some((label) => {
            const expected = normalizeDeepSeekToken(label);
            return exact ? text === expected : text.includes(expected);
        });
    }

    function getInteractiveCandidates() {
        return Array.from(document.querySelectorAll("button, a[href], [role='button'], [aria-pressed], [tabindex]"))
            .filter(isVisibleElement);
    }

    function getVisibleComposerInputs() {
        return Array.from(document.querySelectorAll("textarea, [contenteditable='true'], [role='textbox']"))
            .filter(isVisibleElement)
            .sort((a, b) => {
                const ar = a.getBoundingClientRect();
                const br = b.getBoundingClientRect();
                return ar.top - br.top || ar.left - br.left || (ar.width * ar.height) - (br.width * br.height);
            });
    }

    function getRectCenter(rect) {
        return {
            x: rect.left + (rect.width / 2),
            y: rect.top + (rect.height / 2)
        };
    }

    function findComposerToggle(labels) {
        const candidates = getInteractiveCandidates()
            .map((element) => {
                if (matchesAnyLabel(element, labels, { exact: true })) return { element, exact: true };
                if (matchesAnyLabel(element, labels, { exact: false })) return { element, exact: false };
                return null;
            })
            .filter(Boolean);

        if (!candidates.length) return null;

        const composerInput = getVisibleComposerInputs()[0] || null;
        if (!composerInput) {
            return candidates.find(item => item.exact)?.element || candidates[0].element;
        }

        const anchorRect = composerInput.getBoundingClientRect();
        const anchorCenter = getRectCenter(anchorRect);
        return candidates
            .map(({ element, exact }) => {
                const rect = element.getBoundingClientRect();
                const center = getRectCenter(rect);
                const verticalGap = rect.bottom < anchorRect.top
                    ? anchorRect.top - rect.bottom
                    : rect.top > anchorRect.bottom
                        ? rect.top - anchorRect.bottom
                        : 0;
                const horizontalGap = rect.right < anchorRect.left
                    ? anchorRect.left - rect.right
                    : rect.left > anchorRect.right
                        ? rect.left - anchorRect.right
                        : 0;
                const score = (exact ? 0 : 1000)
                    + (verticalGap * 3)
                    + horizontalGap
                    + Math.abs(center.y - anchorCenter.y)
                    + Math.abs(center.x - anchorCenter.x) * 0.25;
                return { element, score };
            })
            .sort((a, b) => a.score - b.score)[0]?.element || null;
    }

    function findExactTextElement(labels) {
        const expected = labels.map(normalizeDeepSeekToken);
        const elements = Array.from(document.querySelectorAll("button, a[href], [role='button'], [onclick], div, span"));
        return elements
            .filter(isVisibleElement)
            .filter((element) => expected.includes(normalizeDeepSeekToken(element.innerText || element.textContent || "")))
            .sort((a, b) => {
                const ar = a.getBoundingClientRect();
                const br = b.getBoundingClientRect();
                return (ar.width * ar.height) - (br.width * br.height);
            })[0] || null;
    }

    function findTopHeaderIconButton(indexFromLeft = 0) {
        const buttons = getInteractiveCandidates()
            .filter((element) => {
                const rect = element.getBoundingClientRect();
                const text = normalizeDeepSeekToken(element.innerText || element.textContent || element.getAttribute?.("aria-label") || "");
                return rect.top >= 0 && rect.top < 90 && rect.left >= 0 && rect.left < 420
                    && rect.width >= 16 && rect.width <= 56 && rect.height >= 16 && rect.height <= 56
                    && !text;
            })
            .sort((a, b) => a.getBoundingClientRect().left - b.getBoundingClientRect().left);
        return buttons[indexFromLeft] || buttons[0] || buttons[buttons.length - 1] || null;
    }

    function sleepDeepSeek(ms) {
        return new Promise((resolve) => window.setTimeout(resolve, Math.max(0, Number(ms) || 0)));
    }

    function queryDeepSeekAll(selector, root = document) {
        const raw = Array.isArray(selector) ? selector.join(", ") : String(selector || "").trim();
        if (!raw || !root || typeof root.querySelectorAll !== "function") return [];
        try {
            return Array.from(root.querySelectorAll(raw));
        } catch {
            return [];
        }
    }

    function getDeepSeekEventView(element = null) {
        try {
            return element?.ownerDocument?.defaultView || window;
        } catch {
            return window;
        }
    }

    function getDeepSeekEventConstructor(name, element = null) {
        try {
            const view = getDeepSeekEventView(element);
            return view?.[name] || window?.[name] || null;
        } catch {
            return null;
        }
    }

    function getDeepSeekRect(element) {
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

    function getDeepSeekElementArea(element) {
        const rect = getDeepSeekRect(element);
        return rect ? rect.width * rect.height : Number.MAX_SAFE_INTEGER;
    }

    function getDeepSeekCenterPoint(element) {
        const rect = getDeepSeekRect(element);
        if (!rect || rect.width <= 0 || rect.height <= 0) return null;
        const viewportWidth = Math.max(1, Number(window.innerWidth) || Number(document.documentElement?.clientWidth) || 1);
        const viewportHeight = Math.max(1, Number(window.innerHeight) || Number(document.documentElement?.clientHeight) || 1);
        return {
            x: Math.min(Math.max(rect.left + rect.width / 2, 1), viewportWidth - 1),
            y: Math.min(Math.max(rect.top + rect.height / 2, 1), viewportHeight - 1)
        };
    }

    function getDeepSeekElementFromPoint(point, element = null) {
        if (!point) return null;
        try {
            const doc = element?.ownerDocument || document;
            return doc.elementFromPoint?.(point.x, point.y) || null;
        } catch {
            return null;
        }
    }

    function hasDeepSeekLayoutBox(element) {
        const rect = getDeepSeekRect(element);
        if (!rect || rect.width < 2 || rect.height < 2) return false;
        try {
            const style = getComputedStyle(element);
            return style.display !== "none" && style.visibility !== "hidden";
        } catch {
            return true;
        }
    }

    function isDeepSeekDisabledElement(element) {
        if (!element) return true;
        if (element.disabled === true) return true;
        const ariaDisabled = String(element.getAttribute?.("aria-disabled") || "").trim().toLowerCase();
        if (ariaDisabled === "true") return true;
        const dataDisabled = String(element.getAttribute?.("data-disabled") || "").trim().toLowerCase();
        return dataDisabled === "true" || dataDisabled === "1";
    }

    function getDeepSeekClassText(element) {
        const value = element?.getAttribute?.("class") || element?.className || "";
        if (typeof value === "string") return value;
        return value?.baseVal || "";
    }

    function getDeepSeekAttrReferenceText(element, attr) {
        try {
            return String(element?.getAttribute?.(attr) || "")
                .split(/\s+/)
                .map((id) => id && document.getElementById(id))
                .filter(Boolean)
                .map((node) => node.innerText || node.textContent || "")
                .join(" ");
        } catch {
            return "";
        }
    }

    function getDeepSeekDeleteText(element) {
        if (!element) return "";
        return [
            element.getAttribute?.("aria-label"),
            getDeepSeekAttrReferenceText(element, "aria-labelledby"),
            getDeepSeekAttrReferenceText(element, "aria-describedby"),
            element.getAttribute?.("aria-description"),
            element.getAttribute?.("title"),
            element.getAttribute?.("data-testid"),
            element.getAttribute?.("data-test-id"),
            element.getAttribute?.("data-tooltip"),
            element.id ? Array.from(document.querySelectorAll("label"))
                .filter(label => label.getAttribute?.("for") === element.id)
                .map(label => label.textContent || "")
                .join(" ") : "",
            element.closest?.("label")?.textContent,
            element.innerText || element.textContent || ""
        ].filter(Boolean).join(" ");
    }

    function getDeepSeekDeleteTextToken(value) {
        return normalizeDeepSeekToken(value).replace(/\s+/g, " ").trim();
    }

    function getDeepSeekDeleteCompactToken(value) {
        return String(value ?? "").toLowerCase().replace(/[^a-z0-9\u4e00-\u9fff]+/g, "");
    }

    function isRepeatedDeepSeekCompactToken(value, token) {
        if (!value || !token || value.length % token.length !== 0) return false;
        for (let index = 0; index < value.length; index += token.length) {
            if (value.slice(index, index + token.length) !== token) return false;
        }
        return true;
    }

    function deepSeekDeleteLabelMatches(value, labels, { exact = false } = {}) {
        const textValue = getDeepSeekDeleteTextToken(value);
        const compactValue = getDeepSeekDeleteCompactToken(value);
        if (!textValue && !compactValue) return false;
        return (labels || []).some((label) => {
            const textLabel = getDeepSeekDeleteTextToken(label);
            const compactLabel = getDeepSeekDeleteCompactToken(label);
            if (!textLabel && !compactLabel) return false;
            if (exact) {
                return textValue === textLabel
                    || compactValue === compactLabel
                    || isRepeatedDeepSeekCompactToken(compactValue, compactLabel);
            }
            return (textLabel && textValue.includes(textLabel)) || (compactLabel && compactValue.includes(compactLabel));
        });
    }

    function getDeepSeekSvgSignature(element) {
        return normalizeDeepSeekToken([
            element,
            ...queryDeepSeekAll("svg,path,rect,line,polyline,polygon,use,img,[data-icon],[class]", element).slice(0, 80)
        ].map((node) => [
            getDeepSeekClassText(node),
            node?.getAttribute?.("data-icon"),
            node?.getAttribute?.("aria-label"),
            node?.getAttribute?.("title"),
            node?.getAttribute?.("alt"),
            node?.getAttribute?.("src"),
            node?.getAttribute?.("href"),
            node?.getAttribute?.("xlink:href"),
            node?.getAttribute?.("viewBox"),
            node?.getAttribute?.("d"),
            node?.getAttribute?.("width"),
            node?.getAttribute?.("height")
        ].filter(Boolean).join(" ")).join(" "));
    }

    const DEEPSEEK_DELETE_CLICKABLE_SELECTOR = "button,[role='button'],[role='menuitem'],[role='option'],a[href],[aria-haspopup],[tabindex]:not([tabindex='-1']),[class*='button' i],[class*='btn' i]";
    const DEEPSEEK_DELETE_MENU_ITEM_SELECTOR = `${DEEPSEEK_DELETE_CLICKABLE_SELECTOR},div,span`;

    function getDeepSeekDeleteClickableTarget(element) {
        if (!element || typeof element.closest !== "function") return element || null;
        try {
            return element.closest(DEEPSEEK_DELETE_CLICKABLE_SELECTOR) || element;
        } catch {
            return getClickableTarget(element);
        }
    }

    function getDeepSeekDeleteMenuItemTarget(element, root, labels, cancelLabels) {
        const candidates = [];
        for (let node = element, depth = 0; node && node !== document.body && depth < 8; node = node.parentElement, depth += 1) {
            if (root && root !== document && node !== root && !root.contains?.(node)) break;
            if (!isVisibleElement(node) || isDeepSeekDisabledElement(node)) continue;
            const value = getDeepSeekDeleteText(node);
            if (!deepSeekDeleteLabelMatches(value, labels, { exact: true })) continue;
            if (deepSeekDeleteLabelMatches(value, cancelLabels)) continue;
            const target = getDeepSeekDeleteClickableTarget(node) || node;
            if (!target || !isVisibleElement(target) || isDeepSeekDisabledElement(target)) continue;
            if (root && root !== document && target !== root && !root.contains?.(target)) continue;
            const rect = getDeepSeekRect(target);
            if (!rect || rect.width < 24 || rect.height < 14 || rect.width > 520 || rect.height > 140) continue;
            const targetText = getDeepSeekDeleteText(target);
            const targetExact = deepSeekDeleteLabelMatches(targetText, labels, { exact: true });
            candidates.push({
                element: target,
                score: (targetExact ? 300 : 0)
                    + (target.matches?.(DEEPSEEK_DELETE_CLICKABLE_SELECTOR) ? 160 : 0)
                    + Math.min(rect.width * rect.height, 12000) * 0.01
                    - depth,
                top: rect.top,
                area: rect.width * rect.height
            });
        }
        candidates.sort((a, b) => b.score - a.score || a.top - b.top || b.area - a.area);
        return candidates[0]?.element || null;
    }

    function createDeepSeekFakeReactEvent(target, type = "click") {
        let defaultPrevented = false;
        let propagationStopped = false;
        return {
            type,
            target,
            currentTarget: target,
            bubbles: true,
            cancelable: true,
            button: 0,
            buttons: type.includes("down") ? 1 : 0,
            nativeEvent: { type, target, currentTarget: target, button: 0 },
            preventDefault() {
                defaultPrevented = true;
                this.defaultPrevented = true;
            },
            stopPropagation() {
                propagationStopped = true;
            },
            isDefaultPrevented() {
                return defaultPrevented;
            },
            isPropagationStopped() {
                return propagationStopped;
            },
            persist() { },
            defaultPrevented
        };
    }

    function getDeepSeekReactPropBags(element) {
        const bags = [];
        const seen = new Set();
        const addBag = (bag) => {
            if (!bag || typeof bag !== "object" || seen.has(bag)) return;
            seen.add(bag);
            bags.push(bag);
        };
        for (let current = element, depth = 0; current && current !== document && depth < 8; current = current.parentElement, depth += 1) {
            addBag(current);
            let names = [];
            try { names = Object.getOwnPropertyNames(current); } catch { names = []; }
            for (const name of names) {
                if (!/react|props|fiber/i.test(name)) continue;
                let value = null;
                try { value = current[name]; } catch { value = null; }
                addBag(value);
                addBag(value?.memoizedProps);
                addBag(value?.pendingProps);
                for (let fiber = value?.return, fiberDepth = 0; fiber && fiberDepth < 6; fiber = fiber.return, fiberDepth += 1) {
                    addBag(fiber.memoizedProps);
                    addBag(fiber.pendingProps);
                }
            }
        }
        return bags;
    }

    function invokeDeepSeekReactHandlers(element, handlerNames = ["onClick", "onPointerUp", "onMouseUp", "onPointerDown", "onMouseDown"]) {
        const target = getDeepSeekDeleteClickableTarget(element);
        if (!target || isDeepSeekDisabledElement(target)) return false;
        try { target.focus?.({ preventScroll: true }); } catch {
            try { target.focus?.(); } catch { }
        }
        for (const bag of getDeepSeekReactPropBags(target)) {
            for (const handlerName of handlerNames) {
                const handler = bag?.[handlerName];
                if (typeof handler !== "function") continue;
                try {
                    const eventType = handlerName.replace(/^on/, "").toLowerCase() || "click";
                    handler.call(target, createDeepSeekFakeReactEvent(target, eventType));
                    return true;
                } catch { }
            }
        }
        return false;
    }

    function dispatchDeepSeekPointerActivation(target, point = null) {
        if (!target) return false;
        const PointerEventCtor = getDeepSeekEventConstructor("PointerEvent", target);
        const MouseEventCtor = getDeepSeekEventConstructor("MouseEvent", target);
        if (typeof PointerEventCtor !== "function" && typeof MouseEventCtor !== "function") return false;
        const center = point || getDeepSeekCenterPoint(target) || { x: 1, y: 1 };
        const clientX = Number(center.x) || 1;
        const clientY = Number(center.y) || 1;
        const view = getDeepSeekEventView(target);
        const common = {
            bubbles: true,
            cancelable: true,
            composed: true,
            view: view || window,
            clientX,
            clientY,
            screenX: clientX,
            screenY: clientY,
            button: 0
        };
        const pointerCommon = { ...common, pointerId: 1, pointerType: "mouse", isPrimary: true };
        const plans = [
            typeof PointerEventCtor === "function" && { ctor: PointerEventCtor, type: "pointerover", opts: { ...pointerCommon, buttons: 0 } },
            typeof MouseEventCtor === "function" && { ctor: MouseEventCtor, type: "mouseover", opts: { ...common, buttons: 0, detail: 0 } },
            typeof PointerEventCtor === "function" && { ctor: PointerEventCtor, type: "pointerenter", opts: { ...pointerCommon, bubbles: false, buttons: 0 } },
            typeof MouseEventCtor === "function" && { ctor: MouseEventCtor, type: "mouseenter", opts: { ...common, bubbles: false, buttons: 0, detail: 0 } },
            typeof PointerEventCtor === "function" && { ctor: PointerEventCtor, type: "pointermove", opts: { ...pointerCommon, buttons: 0 } },
            typeof MouseEventCtor === "function" && { ctor: MouseEventCtor, type: "mousemove", opts: { ...common, buttons: 0, detail: 0 } },
            typeof PointerEventCtor === "function" && { ctor: PointerEventCtor, type: "pointerdown", opts: { ...pointerCommon, buttons: 1 } },
            typeof MouseEventCtor === "function" && { ctor: MouseEventCtor, type: "mousedown", opts: { ...common, buttons: 1, detail: 1 } },
            typeof PointerEventCtor === "function" && { ctor: PointerEventCtor, type: "pointerup", opts: { ...pointerCommon, buttons: 0 } },
            typeof MouseEventCtor === "function" && { ctor: MouseEventCtor, type: "mouseup", opts: { ...common, buttons: 0, detail: 1 } },
            typeof MouseEventCtor === "function" && { ctor: MouseEventCtor, type: "click", opts: { ...common, buttons: 0, detail: 1 } }
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

    function nativeDeepSeekClick(target) {
        if (!target || typeof target.click !== "function") return false;
        try {
            target.click();
            return true;
        } catch {
            return false;
        }
    }

    function activateDeepSeekElement(element, handlerNames, { allowHidden = false } = {}) {
        const target = getDeepSeekDeleteClickableTarget(element);
        if (!target || isDeepSeekDisabledElement(target)) return false;
        if (allowHidden ? !hasDeepSeekLayoutBox(target) : !isVisibleElement(target)) return false;
        try { target.scrollIntoView?.({ block: "center", inline: "nearest" }); } catch { }
        try { target.focus?.({ preventScroll: true }); } catch {
            try { target.focus?.(); } catch { }
        }
        const point = getDeepSeekCenterPoint(target);
        return invokeDeepSeekReactHandlers(target, handlerNames)
            || dispatchDeepSeekPointerActivation(target, point)
            || nativeDeepSeekClick(target)
            || clickDeepSeekElement(target);
    }

    async function activateDeepSeekElementUntil(element, getter, handlerNames, { allowHidden = false, settleMs = 180 } = {}) {
        const target = getDeepSeekDeleteClickableTarget(element);
        if (!target || isDeepSeekDisabledElement(target)) return null;
        if (allowHidden ? !hasDeepSeekLayoutBox(target) : !isVisibleElement(target)) return null;
        try { target.scrollIntoView?.({ block: "center", inline: "nearest" }); } catch { }
        try { target.focus?.({ preventScroll: true }); } catch {
            try { target.focus?.(); } catch { }
        }

        const getCurrent = () => {
            try {
                return typeof getter === "function" ? getter() : null;
            } catch {
                return null;
            }
        };

        const initial = getCurrent();
        if (initial) return initial;

        const point = getDeepSeekCenterPoint(target);
        const attempts = [
            () => dispatchDeepSeekPointerActivation(target, point),
            () => nativeDeepSeekClick(target),
            () => invokeDeepSeekReactHandlers(target, handlerNames),
            () => clickDeepSeekElement(target)
        ];

        for (const attempt of attempts) {
            try { attempt(); } catch { }
            await sleepDeepSeek(Math.max(40, Number(settleMs) || 40));
            const value = getCurrent();
            if (value) return value;
        }

        return getCurrent();
    }

    async function waitForDeepSeek(getter, timeoutMs = 2500, intervalMs = 120) {
        const deadline = Date.now() + Math.max(0, Number(timeoutMs) || 0);
        while (Date.now() <= deadline) {
            const value = getter();
            if (value) return value;
            await sleepDeepSeek(Math.max(30, Number(intervalMs) || 30));
        }
        return getter();
    }

    function visibleDeepSeekSelectorElements(selector, root = document) {
        return queryDeepSeekAll(selector, root).filter(isVisibleElement);
    }

    function firstVisibleDeepSeekBySelectors(selectors, root = document) {
        for (const selector of selectors || []) {
            const found = visibleDeepSeekSelectorElements(selector, root)[0] || null;
            if (found) return found;
        }
        return null;
    }

    function getDeepSeekChatIdFromHref(value) {
        const match = String(value || "").match(/\/(?:a\/)?chat\/s\/([^/?#]+)/i);
        return match?.[1] || "";
    }

    function getDeepSeekTitleToken(value) {
        const raw = String(value || "")
            .replace(/\s*[-|–]\s*DeepSeek.*$/i, "")
            .replace(/\s*-\s*深度求索.*$/i, "");
        const token = getDeepSeekDeleteCompactToken(raw);
        return /^(deepseek|deepseekintotheunknown|intotheunknown|newchat|新聊天)$/.test(token) ? "" : token;
    }

    function deepSeekChatLinks(root = document) {
        return queryDeepSeekAll("a[href*='/chat/s/'],a[href*='/a/chat/s/']", root)
            .filter((link) => isVisibleElement(link) && getDeepSeekRect(link));
    }

    function getDeepSeekDeleteHints(data = {}) {
        const hrefs = [
            location.href,
            data.currentThreadHref,
            data.currentHref,
            data.cachedHref,
            data.href,
            data.url
        ].filter(Boolean);
        const ids = new Set(hrefs.map(getDeepSeekChatIdFromHref).filter(Boolean));
        const titleTokens = new Set([
            document.title,
            data.currentTitle,
            data.title
        ].map(getDeepSeekTitleToken).filter(Boolean));
        return {
            ids: Array.from(ids),
            titleTokens: Array.from(titleTokens),
            hasTarget: ids.size > 0 || titleTokens.size > 0
        };
    }

    function deepSeekSidebarRootFromLinks() {
        const links = deepSeekChatLinks(document)
            .filter((link) => {
                const rect = getDeepSeekRect(link);
                return rect && rect.left <= 470 && rect.width >= 100 && rect.height >= 20 && rect.height <= 96;
            });
        if (!links.length) return null;
        const currentId = getDeepSeekChatIdFromHref(location.href);
        const current = currentId ? links.find((link) => getDeepSeekChatIdFromHref(link.href || link.getAttribute?.("href")).includes(currentId)) : null;
        const seeds = current ? [current] : links.slice(0, 4);
        const candidates = [];
        const seen = new Set();
        const scoreRoot = (root) => {
            if (!root || !root.isConnected) return null;
            const rect = getDeepSeekRect(root);
            if (!rect || rect.left > 470 || rect.width < 120 || rect.width > 360 || rect.height < 40) return null;
            const rootLinks = deepSeekChatLinks(root).length;
            if (rootLinks < (current ? 1 : 2)) return null;
            const value = getDeepSeekDeleteText(root);
            const className = getDeepSeekClassText(root);
            const hasHistoryText = /today|yesterday|pinned|new chat|今天|昨天|新聊天|置顶/i.test(value);
            const looksScrollable = /scroll|history|sidebar|sider/i.test(className);
            if (!hasHistoryText && !looksScrollable && rootLinks < 3) return null;
            return (looksScrollable ? 900 : 0) + Math.min(rootLinks, 12) * 80 + Math.min(rect.height, 900) * 0.02 - rect.left;
        };
        for (const seed of seeds) {
            for (let node = seed; node && node !== document.body; node = node.parentElement) {
                if (seen.has(node)) continue;
                seen.add(node);
                const score = scoreRoot(node);
                if (score == null) continue;
                candidates.push({ element: node, score, area: getDeepSeekElementArea(node) });
            }
        }
        candidates.sort((a, b) => b.score - a.score || a.area - b.area);
        return candidates[0]?.element || null;
    }

    function deepSeekSidebarRoot() {
        const linkRoot = deepSeekSidebarRootFromLinks();
        if (linkRoot) return linkRoot;
        const roots = visibleDeepSeekSelectorElements([
            "aside",
            "nav",
            "[class*='sidebar' i]",
            "[class*='sider' i]",
            "[class*='history' i]"
        ]).filter((root) => {
            const rect = getDeepSeekRect(root);
            if (!rect || rect.width < 120 || rect.left > 460) return false;
            const value = getDeepSeekDeleteText(root);
            return /today|yesterday|new chat|新聊天|昨天|今天|rename|pin|share|delete|删除/i.test(value);
        });
        roots.sort((a, b) => (getDeepSeekRect(b)?.width || 0) - (getDeepSeekRect(a)?.width || 0));
        return roots[0] || null;
    }

    function findDeepSeekSidebarToggle() {
        const direct = firstVisibleDeepSeekBySelectors([
            "button[aria-label*='sidebar' i]",
            "[role='button'][aria-label*='sidebar' i]",
            "button[title*='sidebar' i]",
            "[role='button'][title*='sidebar' i]",
            "button:has(svg path[d*='M9.67269'])",
            "[role='button']:has(svg path[d*='M9.67269'])"
        ]);
        if (direct) return direct;
        const candidates = visibleDeepSeekSelectorElements("button,[role='button']")
            .map((element) => ({ element, rect: getDeepSeekRect(element), text: getDeepSeekDeleteText(element), svg: getDeepSeekSvgSignature(element) }))
            .filter((item) => item.rect && item.rect.top <= 90 && item.rect.left <= 130 && item.rect.width >= 20 && item.rect.width <= 64 && item.rect.height >= 20 && item.rect.height <= 64)
            .filter((item) => /sidebar|menu|panel|sider|侧边栏|菜单/i.test(item.text) || /sidebar|panel|menu|m9\.67269/i.test(item.svg));
        candidates.sort((a, b) => a.rect.left - b.rect.left || a.rect.top - b.rect.top);
        return candidates[0]?.element || findTopHeaderIconButton(0) || findTopHeaderIconButton(1) || null;
    }

    async function clickDeepSeekSidebarToggleByPoint() {
        const points = [
            { x: 22, y: 28 },
            { x: 22, y: 44 },
            { x: 22, y: 60 },
            { x: 46, y: 28 },
            { x: 46, y: 44 },
            { x: 46, y: 60 }
        ];
        for (const point of points) {
            const target = getDeepSeekElementFromPoint(point);
            const button = getDeepSeekDeleteClickableTarget(target);
            const rect = getDeepSeekRect(button);
            if (!button || !rect || !hasDeepSeekLayoutBox(button) || isDeepSeekDisabledElement(button)) continue;
            if (rect.top > 96 || rect.left > 110 || rect.width > 80 || rect.height > 80) continue;
            if (!dispatchDeepSeekPointerActivation(button, point) && !nativeDeepSeekClick(button) && !activateDeepSeekElement(button, undefined, { allowHidden: true })) continue;
            if (await waitForDeepSeek(deepSeekSidebarRoot, 1400, 100)) return true;
        }
        return false;
    }

    async function ensureDeepSeekSidebarOpen() {
        if (deepSeekSidebarRoot()) return true;
        const toggle = findDeepSeekSidebarToggle();
        if (toggle && activateDeepSeekElement(toggle) && await waitForDeepSeek(deepSeekSidebarRoot, 3200, 120)) return true;
        return clickDeepSeekSidebarToggleByPoint();
    }

    function deepSeekTopicRows(root, hints = getDeepSeekDeleteHints()) {
        const candidates = [];
        const seen = new Set();
        for (const element of queryDeepSeekAll("a,button,[role='button'],li,div", root || document)) {
            if (!element || seen.has(element) || !isVisibleElement(element)) continue;
            const rect = getDeepSeekRect(element);
            if (!rect || rect.left > 470 || rect.width < 120 || rect.height < 26 || rect.height > 96) continue;
            const value = getDeepSeekDeleteText(element);
            const compact = getDeepSeekDeleteCompactToken(value);
            if (!compact || compact.length < 2 || compact.length > 120) continue;
            if (/^(today|yesterday|newchat|threads|history|今天|昨天|新聊天|历史)$/.test(compact)) continue;
            if (/rename|pin|share|delete|cancel|搜索|设置|删除|重命名|分享|置顶/i.test(value)) continue;
            const target = getDeepSeekDeleteClickableTarget(element);
            if (!target || seen.has(target)) continue;
            seen.add(target);
            const href = String(element.href || element.getAttribute?.("href") || target.href || target.getAttribute?.("href") || "");
            const hrefToken = getDeepSeekDeleteCompactToken(href);
            const className = `${getDeepSeekClassText(target)} ${getDeepSeekClassText(element)}`;
            const active = /\b(active|selected|current)\b/i.test(className) || String(target.getAttribute?.("aria-current") || "").toLowerCase() === "page";
            const titleMatch = hints.titleTokens?.some((token) => compact.includes(token) || token.includes(compact));
            const urlMatch = hints.ids?.some((id) => href.includes(id) || hrefToken.includes(getDeepSeekDeleteCompactToken(id)));
            candidates.push({
                element: target,
                score: (urlMatch ? 1100 : 0) + (titleMatch ? 900 : 0) + (active ? 520 : 0) + (rect.top < 180 ? 120 : 0) - rect.top * 0.02,
                rect
            });
        }
        candidates.sort((a, b) => b.score - a.score || a.rect.top - b.rect.top);
        return candidates.filter((item) => item.score >= 500).map((item) => item.element);
    }

    function findDeepSeekCurrentTopicRow(root, hints = getDeepSeekDeleteHints()) {
        const links = deepSeekChatLinks(root || document);
        const currentId = hints.ids?.[0] || getDeepSeekChatIdFromHref(location.href);
        if (currentId) {
            const exact = links.find((link) => getDeepSeekChatIdFromHref(link.href || link.getAttribute?.("href")) === currentId);
            if (exact) return exact;
        }
        const selected = links.find((link) => {
            const className = getDeepSeekClassText(link);
            const ariaCurrent = String(link.getAttribute?.("aria-current") || "").toLowerCase();
            return /\b(active|selected|current)\b/i.test(className) || ariaCurrent === "page";
        });
        if (selected) return selected;
        return deepSeekTopicRows(root, hints)[0] || null;
    }

    function hoverDeepSeekTopicRow(row) {
        const rect = getDeepSeekRect(row);
        if (!rect) return;
        try { row.scrollIntoView?.({ block: "center", inline: "nearest" }); } catch { }
        const point = { x: Math.max(rect.left + 16, Math.min(rect.right - 16, rect.right - 24)), y: rect.top + rect.height / 2 };
        const targets = [];
        for (let node = row; node && node !== document.body && targets.length < 5; node = node.parentElement) targets.push(node);
        for (const target of targets) {
            const PointerEventCtor = getDeepSeekEventConstructor("PointerEvent", target);
            const MouseEventCtor = getDeepSeekEventConstructor("MouseEvent", target);
            for (const type of ["pointerover", "mouseover", "mouseenter", "mousemove", "pointermove"]) {
                try {
                    const EventCtor = type.startsWith("pointer") ? PointerEventCtor : MouseEventCtor;
                    if (typeof EventCtor !== "function") continue;
                    target.dispatchEvent(new EventCtor(type, {
                        bubbles: type !== "mouseenter",
                        cancelable: true,
                        composed: true,
                        view: getDeepSeekEventView(target),
                        pointerId: 1,
                        pointerType: "mouse",
                        isPrimary: true,
                        clientX: point.x,
                        clientY: point.y,
                        screenX: point.x,
                        screenY: point.y
                    }));
                } catch { }
            }
        }
    }

    function deepSeekTopicMoreButton(row) {
        if (!row) return null;
        const rowRect = getDeepSeekRect(row);
        if (!rowRect) return null;
        hoverDeepSeekTopicRow(row);
        const candidates = [];
        const seen = new Set();
        const add = (button, source = "", extraScore = 0) => {
            const target = getDeepSeekDeleteClickableTarget(button);
            if (!target || seen.has(target) || target === row || isDeepSeekDisabledElement(target)) return;
            const rect = getDeepSeekRect(target);
            if (!rect || rect.width < 10 || rect.height < 10 || rect.width > 72 || rect.height > 72) return;
            const overlaps = rect.top < rowRect.bottom + 10 && rect.bottom > rowRect.top - 10;
            const nearRight = rect.left >= rowRect.right - 120 && rect.left <= rowRect.right + 80;
            if (!overlaps || !nearRight) return;
            const value = getDeepSeekDeleteText(target);
            const compact = getDeepSeekDeleteCompactToken(value);
            if (compact && !/more|options|menu|ellipsis|dots|更多|菜单|选项/.test(compact)) return;
            if (String(target.href || target.getAttribute?.("href") || "").match(/\/(?:a\/)?chat\/s\//i)) return;
            const signature = getDeepSeekSvgSignature(target);
            const iconish = !compact || /more|options|menu|ellipsis|dots|circle/.test(signature) || queryDeepSeekAll("circle", target).length >= 2 || rect.width <= 44;
            if (!iconish) return;
            seen.add(target);
            candidates.push({
                element: target,
                score: extraScore
                    + (hasDeepSeekLayoutBox(target) ? 140 : 40)
                    + (!compact ? 180 : 0)
                    + (/more|options|menu|更多|菜单|选项/.test(compact) ? 220 : 0)
                    + (/ellipsis|more|dots|circle/.test(signature) ? 120 : 0)
                    + Math.max(0, 80 - Math.abs((rect.left + rect.right) / 2 - (rowRect.right - 28))),
                right: rect.right,
                source
            });
        };
        const scopes = [];
        for (let node = row; node && node !== document.body && scopes.length < 5; node = node.parentElement) scopes.push(node);
        for (const scope of scopes) {
            for (const button of queryDeepSeekAll("button,[role='button'],[aria-haspopup],[tabindex]:not([tabindex='-1']),[class*='button' i]", scope)) add(button, "scope", 80);
        }
        for (const offset of [8, 18, 32, 48, 64, 84]) {
            const point = { x: Math.max(rowRect.left + 16, rowRect.right - offset), y: rowRect.top + rowRect.height / 2 };
            const pointTarget = getDeepSeekElementFromPoint(point, row);
            if (pointTarget) add(pointTarget, "point", 160 - offset);
            const pointButton = pointTarget && getDeepSeekDeleteClickableTarget(pointTarget);
            if (pointButton) add(pointButton, "point-button", 180 - offset);
        }
        for (const button of queryDeepSeekAll("button,[role='button'],[aria-haspopup],[tabindex]:not([tabindex='-1']),[class*='button' i]", document)) add(button, "nearby", 0);
        candidates.sort((a, b) => b.score - a.score || b.right - a.right);
        return candidates[0]?.element || null;
    }

    const DEEPSEEK_DELETE_MENU_ROOT_SELECTORS = Object.freeze([
        "[role='menu']",
        "[role='listbox']",
        "[role='dialog']",
        "[data-radix-menu-content]",
        "[data-radix-popper-content-wrapper]",
        "[data-floating-ui-portal]",
        "[data-slot='dropdown-menu-content']",
        "[class*='dropdown' i]",
        "[class*='popover' i]",
        "[class*='popper' i]",
        "[class*='menu' i]",
        "body > div"
    ]);

    function deepSeekMenuRootsWithDelete(labels) {
        const roots = visibleDeepSeekSelectorElements(DEEPSEEK_DELETE_MENU_ROOT_SELECTORS)
            .filter((root) => {
                const rect = getDeepSeekRect(root);
                const area = rect ? rect.width * rect.height : 0;
                if (area > 450000) return false;
                const value = getDeepSeekDeleteText(root);
                return deepSeekDeleteLabelMatches(value, labels) || /rename|pin|share|重命名|置顶|分享/i.test(value);
            })
            .sort((a, b) => {
                const ar = getDeepSeekRect(a);
                const br = getDeepSeekRect(b);
                return (br?.right || 0) - (ar?.right || 0) || (ar?.top || 0) - (br?.top || 0);
            });
        const pushRoot = (root) => {
            if (!root || !isVisibleElement(root)) return;
            const rect = getDeepSeekRect(root);
            if (!rect || rect.width < 72 || rect.height < 28 || rect.width > 520 || rect.height > 620) return;
            const value = getDeepSeekDeleteText(root);
            if (!deepSeekDeleteLabelMatches(value, labels) && !/rename|pin|share|重命名|置顶|分享/i.test(value)) return;
            if (!roots.some((item) => item === root || item.contains?.(root) || root.contains?.(item))) roots.push(root);
        };
        for (const item of visibleDeepSeekSelectorElements(DEEPSEEK_DELETE_CLICKABLE_SELECTOR)) {
            if (!deepSeekDeleteLabelMatches(getDeepSeekDeleteText(item), labels)) continue;
            for (let node = item; node && node !== document.body; node = node.parentElement) {
                pushRoot(node);
                if (roots.some((root) => root === node)) break;
            }
        }
        roots.sort((a, b) => {
            const ar = getDeepSeekRect(a);
            const br = getDeepSeekRect(b);
            return (br?.right || 0) - (ar?.right || 0) || (ar?.top || 0) - (br?.top || 0) || getDeepSeekElementArea(a) - getDeepSeekElementArea(b);
        });
        return roots;
    }

    function findDeepSeekDeleteMenuItem(root, labels) {
        const candidates = [];
        const seen = new Set();
        const cancelLabels = ["Cancel", "取消"];
        for (const element of visibleDeepSeekSelectorElements(DEEPSEEK_DELETE_MENU_ITEM_SELECTOR, root || document)) {
            const value = getDeepSeekDeleteText(element);
            if (!deepSeekDeleteLabelMatches(value, labels, { exact: true })) continue;
            if (deepSeekDeleteLabelMatches(value, cancelLabels)) continue;
            const target = getDeepSeekDeleteMenuItemTarget(element, root || document, labels, cancelLabels);
            if (!target || !isVisibleElement(target) || isDeepSeekDisabledElement(target)) continue;
            if (seen.has(target)) continue;
            seen.add(target);
            const rect = getDeepSeekRect(target);
            candidates.push({
                element: target,
                score: (target.matches?.(DEEPSEEK_DELETE_CLICKABLE_SELECTOR) ? 180 : 0)
                    + (deepSeekDeleteLabelMatches(getDeepSeekDeleteText(target), labels, { exact: true }) ? 520 : 420),
                top: rect?.top || 0,
                area: rect ? rect.width * rect.height : 0
            });
        }
        candidates.sort((a, b) => b.score - a.score || a.top - b.top || b.area - a.area);
        return candidates[0]?.element || null;
    }

    async function openDeepSeekTriggerAndClickDelete(trigger, labels, { timeoutMs = 3200, allowHiddenTrigger = false } = {}) {
        if (!trigger || (!allowHiddenTrigger && !isVisibleElement(trigger))) return false;
        const menuReady = () => {
            const root = deepSeekMenuRootsWithDelete(labels)[0] || null;
            return root || findDeepSeekDeleteMenuItem(document, labels);
        };
        const existingRoot = deepSeekMenuRootsWithDelete(labels)[0] || null;
        if (!existingRoot && !await activateDeepSeekElementUntil(
            trigger,
            menuReady,
            ["onClick", "onPointerUp", "onMouseUp", "onPointerDown", "onMouseDown"],
            { allowHidden: allowHiddenTrigger, settleMs: 220 }
        )) return false;
        await sleepDeepSeek(140);
        const deadline = Date.now() + Math.max(0, Number(timeoutMs) || 0);
        while (Date.now() <= deadline) {
            const root = deepSeekMenuRootsWithDelete(labels)[0] || existingRoot;
            const item = root ? findDeepSeekDeleteMenuItem(root, labels) : findDeepSeekDeleteMenuItem(document, labels);
            if (item && activateDeepSeekElement(item, ["onClick", "onPointerUp", "onMouseUp"])) return true;
            await sleepDeepSeek(120);
        }
        return false;
    }

    function deepSeekDeleteDialogTextMatches(value) {
        const text = String(value || "").toLowerCase();
        const token = getDeepSeekDeleteCompactToken(value);
        return /are you sure|chat can(?:'|’)?t be recovered|chat cant be recovered|share links from it will be disabled|recover|recovered|confirm|cancel|cannot be undone|permanently|确定|确认|取消|恢复|不可恢复|无法恢复|不能恢复/.test(text)
            || /areyousure|chatcantberecovered|sharelinksfromitwillbedisabled|recover|recovered|confirm|cancel|cannotbeundone|permanently|确定|确认|取消|恢复|不可恢复|无法恢复|不能恢复/.test(token);
    }

    function deepSeekDeleteDialogConfirmContextMatches(value) {
        const text = String(value || "").toLowerCase();
        const token = getDeepSeekDeleteCompactToken(value);
        return /are you sure|chat can(?:'|’)?t be recovered|chat cant be recovered|share links from it will be disabled|recover|recovered|confirm|cannot be undone|permanently|确定|确认|恢复|不可恢复|无法恢复|不能恢复/.test(text)
            || /areyousure|chatcantberecovered|sharelinksfromitwillbedisabled|recover|recovered|confirm|cannotbeundone|permanently|确定|确认|恢复|不可恢复|无法恢复|不能恢复/.test(token);
    }

    function deepSeekDeleteDialogHasCancel(value) {
        const text = String(value || "").toLowerCase();
        const token = getDeepSeekDeleteCompactToken(value);
        return /cancel|取消/.test(text) || /cancel|取消/.test(token);
    }

    function deepSeekDeleteDialogRoots() {
        return visibleDeepSeekSelectorElements([
            "[role='alertdialog']",
            "[role='dialog']",
            "[data-radix-dialog-content]",
            "[data-state='open']",
            "[class*='modal' i]",
            "body > div"
        ]).filter((root) => {
            const rect = getDeepSeekRect(root);
            const area = rect ? rect.width * rect.height : 0;
            const semantic = (() => {
                try {
                    return root.matches?.("[role='alertdialog'],[role='dialog'],[data-radix-dialog-content]") || false;
                } catch {
                    return false;
                }
            })();
            if (!semantic && (area < 1200 || area > 380000)) return false;
            return deepSeekDeleteDialogTextMatches(getDeepSeekDeleteText(root));
        }).sort((a, b) => getDeepSeekElementArea(a) - getDeepSeekElementArea(b));
    }

    function isDeepSeekDeleteConfirmText(value) {
        const token = getDeepSeekDeleteCompactToken(value);
        if (!token || /cancel|取消|keep|保留/.test(token)) return false;
        return token === "deletechat"
            || token === "delete"
            || token === "confirm"
            || token === "confirmdelete"
            || token === "删除"
            || token === "确认"
            || token === "确认删除"
            || token === "删除聊天";
    }

    function findDeepSeekConfirmDialogFor(node) {
        for (let root = node, depth = 0; root && root !== document.body && depth < 8; root = root.parentElement, depth += 1) {
            if (!isVisibleElement(root)) continue;
            const rootText = getDeepSeekDeleteText(root);
            if (deepSeekDeleteDialogHasCancel(rootText) && deepSeekDeleteDialogConfirmContextMatches(rootText)) return { element: root, text: rootText };
        }
        return null;
    }

    function findDeepSeekDeleteConfirmButtonInfo() {
        const candidates = [];
        for (const node of visibleDeepSeekSelectorElements(`${DEEPSEEK_DELETE_CLICKABLE_SELECTOR},[class*='button' i],[class*='btn' i]`)) {
            if (isDeepSeekDisabledElement(node)) continue;
            const value = getDeepSeekDeleteText(node);
            if (!isDeepSeekDeleteConfirmText(value)) continue;
            const dialog = findDeepSeekConfirmDialogFor(node);
            if (!dialog) continue;
            const target = getDeepSeekDeleteClickableTarget(node);
            if (!target || isDeepSeekDisabledElement(target)) continue;
            const rect = getDeepSeekRect(target);
            const token = getDeepSeekDeleteCompactToken(value);
            candidates.push({
                element: target,
                root: dialog.element,
                score: token === "deletechat" || token === "删除聊天" ? 700 : 0,
                area: rect ? rect.width * rect.height : 0,
                right: rect?.right || 0
            });
        }
        if (!candidates.length) {
            for (const root of deepSeekDeleteDialogRoots()) {
                const rootText = getDeepSeekDeleteText(root);
                if (!deepSeekDeleteDialogTextMatches(rootText)) continue;
                for (const node of visibleDeepSeekSelectorElements(`${DEEPSEEK_DELETE_CLICKABLE_SELECTOR},div`, root)) {
                    if (isDeepSeekDisabledElement(node)) continue;
                    const value = getDeepSeekDeleteText(node);
                    if (!isDeepSeekDeleteConfirmText(value)) continue;
                    const target = getDeepSeekDeleteClickableTarget(node);
                    const rect = getDeepSeekRect(target);
                    candidates.push({
                        element: target,
                        root,
                        score: getDeepSeekDeleteCompactToken(value) === "deletechat" || getDeepSeekDeleteCompactToken(value) === "删除聊天" ? 600 : 0,
                        area: rect ? rect.width * rect.height : 0,
                        right: rect?.right || 0
                    });
                }
            }
        }
        candidates.sort((a, b) => b.score - a.score || a.area - b.area || b.right - a.right);
        return candidates[0] || null;
    }

    function getDeepSeekDeleteConfirmDialogInfo() {
        const info = findDeepSeekDeleteConfirmButtonInfo();
        if (info?.root && isVisibleElement(info.root)) return info;
        const root = deepSeekDeleteDialogRoots()[0] || null;
        return root ? { root, element: null } : null;
    }

    function isDeepSeekEnterKeyEvent(event) {
        return event?.key === "Enter" || event?.code === "Enter" || event?.code === "NumpadEnter";
    }

    function getDeepSeekElementNode(value) {
        return value && value.nodeType === 1 ? value : null;
    }

    function isDeepSeekTextEntryElement(element) {
        const target = getDeepSeekElementNode(element);
        if (!target) return false;
        const tagName = String(target.tagName || "").toLowerCase();
        if (target.isContentEditable || tagName === "textarea") return true;
        if (tagName === "input") {
            const type = String(target.getAttribute?.("type") || target.type || "").toLowerCase();
            return !/^(button|submit|reset|checkbox|radio|range|color|file|image|hidden)$/.test(type);
        }
        try {
            return !!target.closest?.("textarea,input:not([type='button']):not([type='submit']):not([type='reset']):not([type='checkbox']):not([type='radio']):not([type='range']):not([type='color']):not([type='file']):not([type='image']):not([type='hidden']),[contenteditable='true'],[contenteditable='plaintext-only']");
        } catch {
            return false;
        }
    }

    let deepSeekDeleteConfirmEnterShortcutInstalled = false;
    let deepSeekDeleteConfirmEnterHandledAt = 0;

    function shouldHandleDeepSeekDeleteConfirmEnter(event, info) {
        if (!isDeepSeekEnterKeyEvent(event) || event.isComposing) return false;
        if (event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) return false;
        if (!info?.root || !info?.element || !isVisibleElement(info.root) || !isVisibleElement(info.element)) return false;
        return !isDeepSeekTextEntryElement(event.target) && !isDeepSeekTextEntryElement(document.activeElement);
    }

    function stopDeepSeekDeleteConfirmEnterEvent(event) {
        try { event.preventDefault?.(); } catch { }
        try { event.stopPropagation?.(); } catch { }
        try { event.stopImmediatePropagation?.(); } catch { }
    }

    function handleDeepSeekDeleteConfirmEnterKeydown(event) {
        const info = getDeepSeekDeleteConfirmDialogInfo();
        if (!shouldHandleDeepSeekDeleteConfirmEnter(event, info)) return;
        stopDeepSeekDeleteConfirmEnterEvent(event);
        deepSeekDeleteConfirmEnterHandledAt = Date.now();
        activateDeepSeekElement(info.element, ["onClick", "onPointerUp", "onMouseUp", "onPointerDown", "onMouseDown"]);
    }

    function stopDeepSeekDeleteConfirmEnterFollowup(event) {
        if (!isDeepSeekEnterKeyEvent(event) || Date.now() - deepSeekDeleteConfirmEnterHandledAt > 1200) return;
        const info = getDeepSeekDeleteConfirmDialogInfo();
        if (!info?.root || !isVisibleElement(info.root)) return;
        if (isDeepSeekTextEntryElement(event.target) || isDeepSeekTextEntryElement(document.activeElement)) return;
        stopDeepSeekDeleteConfirmEnterEvent(event);
    }

    function installDeepSeekDeleteConfirmEnterShortcut() {
        if (deepSeekDeleteConfirmEnterShortcutInstalled) return;
        deepSeekDeleteConfirmEnterShortcutInstalled = true;
        for (const target of [window, document]) {
            try { target.addEventListener("keydown", handleDeepSeekDeleteConfirmEnterKeydown, true); } catch { }
            try { target.addEventListener("keypress", stopDeepSeekDeleteConfirmEnterFollowup, true); } catch { }
            try { target.addEventListener("keyup", stopDeepSeekDeleteConfirmEnterFollowup, true); } catch { }
        }
    }

    async function waitForDeepSeekDeleteConfirmDialog(timeoutMs = 4200) {
        return await waitForDeepSeek(getDeepSeekDeleteConfirmDialogInfo, timeoutMs, 120);
    }

    function deepSeekDeleteConfirmClosed(root, button) {
        if (button && (!button.isConnected || !isVisibleElement(button))) return true;
        if (root && (!root.isConnected || !isVisibleElement(root))) return true;
        return !findDeepSeekDeleteConfirmButtonInfo();
    }

    async function clickDeepSeekDeleteConfirmIfPresent(timeoutMs = 4200) {
        const deadline = Date.now() + Math.max(0, Number(timeoutMs) || 0);
        let clickedRoot = null;
        let clickedButton = null;
        let clickedAt = 0;
        while (Date.now() <= deadline) {
            if (clickedButton && deepSeekDeleteConfirmClosed(clickedRoot, clickedButton)) return true;
            const info = findDeepSeekDeleteConfirmButtonInfo();
            const button = info?.element || null;
            if (button && (button !== clickedButton || Date.now() - clickedAt > 900) && activateDeepSeekElement(button, ["onClick", "onPointerUp", "onMouseUp"])) {
                clickedRoot = info.root || null;
                clickedButton = button;
                clickedAt = Date.now();
                await sleepDeepSeek(220);
                if (deepSeekDeleteConfirmClosed(clickedRoot, clickedButton)) return true;
            }
            await sleepDeepSeek(120);
        }
        return !!(clickedButton && deepSeekDeleteConfirmClosed(clickedRoot, clickedButton));
    }

    async function deleteCurrentDeepSeekChat({ shortcut = null, engine = null } = {}) {
        const data = shortcut?.data && typeof shortcut.data === "object" ? shortcut.data : {};

        if (getDeepSeekDeleteConfirmDialogInfo()) return true;

        if (!await ensureDeepSeekSidebarOpen()) {
            console.warn(`${LOG_TAG} deleteCurrentChat: sidebar could not be opened.`);
            return false;
        }

        const root = deepSeekSidebarRoot();
        const hints = getDeepSeekDeleteHints(data);
        const row = findDeepSeekCurrentTopicRow(root, hints);
        if (!row) {
            console.warn(`${LOG_TAG} deleteCurrentChat: current topic row not found.`);
            return false;
        }

        const moreButton = await waitForDeepSeek(() => deepSeekTopicMoreButton(row), 1800, 80);
        if (!moreButton) {
            console.warn(`${LOG_TAG} deleteCurrentChat: topic menu trigger not found.`);
            return false;
        }

        const labels = ["Delete", "Delete Chat", "删除", "删除聊天"];
        if (!await openDeepSeekTriggerAndClickDelete(moreButton, labels, { timeoutMs: 3000, allowHiddenTrigger: true })) {
            console.warn(`${LOG_TAG} deleteCurrentChat: delete menu item not found.`);
            return false;
        }

        const confirmDialog = await waitForDeepSeekDeleteConfirmDialog(6500);
        if (!confirmDialog) {
            console.warn(`${LOG_TAG} deleteCurrentChat: delete confirmation dialog did not open.`);
            return false;
        }

        return true;
    }

    function formatDeepSeekTemplateText(text, params = {}) {
        return String(text || "").replace(/\{([^{}]+)\}/g, (match, key) => {
            return Object.prototype.hasOwnProperty.call(params, key) ? String(params[key]) : match;
        });
    }

    function siteMessage(engine, key, params = {}, fallback = "") {
        if (engine?.i18n && typeof engine.i18n.t === "function") {
            try {
                const value = engine.i18n.t(key, params, fallback);
                if (String(value || "").trim()) return value;
            } catch { }
        }
        return formatDeepSeekTemplateText(fallback, params);
    }

    const defaultIconURL = "https://chat.deepseek.com/favicon.svg";

    const defaultIcons = [
        { name: "DeepSeek", url: "https://chat.deepseek.com/favicon.svg" },
        { name: "ChatGPT", url: "https://cdn.oaistatic.com/assets/favicon-o20kmmos.svg" },
        { name: "Claude", url: "https://claude.ai/favicon.ico" },
        { name: "Google", url: "https://www.google.com/favicon.ico" },
        { name: "Bing", url: "https://www.bing.com/favicon.ico" },
        { name: "DuckDuckGo", url: "https://duckduckgo.com/favicon.ico" },
        { name: "Baidu", url: "https://www.baidu.com/favicon.ico" },
        { name: "Wikipedia", url: "https://www.wikipedia.org/static/favicon/wikipedia.ico" },
        { name: "Reddit", url: "https://www.reddit.com/favicon.ico" },
        { name: "Stack Overflow", url: "https://cdn.sstatic.net/Sites/stackoverflow/Img/favicon.ico" },
        { name: "GitHub", url: "https://github.githubassets.com/favicons/favicon.svg" },
        { name: "Twitter / X", url: "https://abs.twimg.com/favicons/twitter.3.ico" },
        { name: "Bilibili", url: "https://www.bilibili.com/favicon.ico" },
        { name: "YouTube", url: "https://www.youtube.com/favicon.ico" },
    ];

    const protectedIconUrls = [
        "https://chat.deepseek.com/favicon.svg"
    ];

    const SITE_MESSAGES = Object.freeze({
        "zh-CN": {
            menuCommandLabel: "DeepSeek - 设置快捷键",
            panelTitle: "DeepSeek - 自定义快捷键",
            defaultExpertModeLabel: "DeepSeek - 默认 Expert 模式: {state}",
            deleteCurrentChatConfirm: "确认删除当前聊天？此操作不可撤销。",
            on: "开",
            off: "关",
            shortcuts: {
                "新聊天": "新聊天",
                "删除当前聊天": "删除当前聊天",
                "Search 按钮": "Search 按钮",
                "DeepThink 按钮": "DeepThink 按钮",
                "侧边栏": "侧边栏"
            }
        },
        "en-US": {
            menuCommandLabel: "DeepSeek - Shortcut settings",
            panelTitle: "DeepSeek - Custom shortcuts",
            defaultExpertModeLabel: "DeepSeek - Default Expert mode: {state}",
            deleteCurrentChatConfirm: "Delete the current chat? This cannot be undone.",
            on: "On",
            off: "Off",
            shortcuts: {
                "新聊天": "New chat",
                "删除当前聊天": "Delete Current Chat",
                "Search 按钮": "Search button",
                "DeepThink 按钮": "DeepThink button",
                "侧边栏": "Sidebar"
            }
        }
    });

    function createDeepSeekSvgIcon(svg) {
        return `data:image/svg+xml,${encodeURIComponent(String(svg || "").trim())}`;
    }

    const DEEPSEEK_NEW_CHAT_ICON = createDeepSeekSvgIcon(`
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 16 16" fill="none">
            <path d="M8 0.599609C3.91309 0.599609 0.599609 3.91309 0.599609 8C0.599609 9.13376 0.855461 10.2098 1.3125 11.1719L1.5918 11.7588L2.76562 11.2012L2.48633 10.6143C2.11034 9.82278 1.90039 8.93675 1.90039 8C1.90039 4.63106 4.63106 1.90039 8 1.90039C11.3689 1.90039 14.0996 4.63106 14.0996 8C14.0996 11.3689 11.3689 14.0996 8 14.0996C7.31041 14.0996 6.80528 14.0514 6.35742 13.9277C5.91623 13.8059 5.49768 13.6021 4.99707 13.2529C4.26492 12.7422 3.21611 12.5616 2.35156 13.1074L2.33789 13.1162L2.32422 13.126L1.58789 13.6436L2.01953 14.9297L3.0459 14.207C3.36351 14.0065 3.83838 14.0294 4.25293 14.3184C4.84547 14.7317 5.39743 15.011 6.01172 15.1807C6.61947 15.3485 7.25549 15.4004 8 15.4004C12.0869 15.4004 15.4004 12.0869 15.4004 8C15.4004 3.91309 12.0869 0.599609 8 0.599609ZM7.34473 4.93945V7.34961H4.93945V8.65039H7.34473V11.0605H8.64551V8.65039H11.0605V7.34961H8.64551V4.93945H7.34473Z" fill="currentColor"/>
        </svg>
    `);

    const DEEPSEEK_DELETE_CURRENT_CHAT_ICON = createDeepSeekSvgIcon(`
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M3 6h18"/>
            <path d="M8 6V4h8v2"/>
            <path d="M6 6l1 14h10l1-14"/>
            <path d="M10 11v6"/>
            <path d="M14 11v6"/>
        </svg>
    `);

    const DEEPSEEK_DEFAULT_SHORTCUTS_BY_KEY = Object.freeze({
        newChat: {
            name: "新聊天",
            actionType: "simulate",
            selector: "",
            simulateKeys: "CMD+J",
            hotkey: "CTRL+N",
            icon: DEEPSEEK_NEW_CHAT_ICON,
            iconAdaptive: true
        },
        deleteCurrentChat: {
            name: "删除当前聊天",
            actionType: "custom",
            customAction: "deleteCurrentChat",
            hotkey: "CTRL+BACKSPACE",
            icon: DEEPSEEK_DELETE_CURRENT_CHAT_ICON,
            iconAdaptive: true
        },
        searchToggle: {
            name: "Search 按钮",
            actionType: "selector",
            selector: "div:has(textarea) button[aria-label*='Search'], div:has(textarea) [role='button'][aria-label*='Search'], div:has([contenteditable='true']) button[aria-label*='Search'], div:has([contenteditable='true']) [role='button'][aria-label*='Search'], button:has(svg path[d*='M7.00003']), [role='button']:has(svg path[d*='M7.00003'])",
            hotkey: "CTRL+W",
            icon: "data:image/svg+xml,%3Csvg%20width%3D%2214%22%20height%3D%2214%22%20viewBox%3D%220%200%2014%2014%22%20fill%3D%22none%22%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%3E%3Cpath%20fill-rule%3D%22evenodd%22%20clip-rule%3D%22evenodd%22%20d%3D%22M7.00003%200.150452C10.7832%200.150452%2013.8496%203.21691%2013.8496%207.00006C13.8496%2010.7832%2010.7832%2013.8497%207.00003%2013.8497C3.21688%2013.8497%200.150421%2010.7832%200.150421%207.00006C0.150421%203.21691%203.21688%200.150452%207.00003%200.150452ZM5.37796%207.59967C5.4267%209.0321%205.64754%2010.2966%205.97366%2011.2198C6.15996%2011.7471%206.36946%2012.1302%206.57327%2012.3702C6.77751%2012.6106%206.92343%2012.6505%207.00003%2012.6505C7.07663%2012.6505%207.22255%2012.6106%207.42679%2012.3702C7.6306%2012.1302%207.8401%2011.7471%208.0264%2011.2198C8.35252%2010.2966%208.57336%209.0321%208.6221%207.59967H5.37796ZM1.38187%207.59967C1.61456%209.80498%203.11593%2011.6305%205.14261%2012.336C5.03268%2012.1129%204.93227%2011.8725%204.8428%2011.6192C4.46342%2010.5452%204.22775%209.13994%204.17874%207.59967H1.38187ZM9.82132%207.59967C9.77232%209.13994%209.53664%2010.5452%209.15726%2011.6192C9.06774%2011.8726%208.96648%2012.1127%208.85648%2012.336C10.8836%2011.6307%2012.3855%209.8053%2012.6182%207.59967H9.82132ZM7.00003%201.34967C6.92343%201.34967%206.77751%201.38955%206.57327%201.62994C6.36946%201.86994%206.15996%202.25297%205.97366%202.78033C5.64754%203.70357%205.4267%204.96802%205.37796%206.40045H8.6221C8.57336%204.96802%208.35252%203.70357%208.0264%202.78033C7.8401%202.25297%207.6306%201.86994%207.42679%201.62994C7.22255%201.38955%207.07663%201.34967%207.00003%201.34967ZM8.85648%201.66315C8.96663%201.88662%209.06763%202.12721%209.15726%202.38092C9.53664%203.45494%209.77232%204.86018%209.82132%206.40045H12.6182C12.3855%204.19471%2010.8837%202.36834%208.85648%201.66315ZM5.14261%201.66315C3.11578%202.36856%201.61457%204.19503%201.38187%206.40045H4.17874C4.22775%204.86018%204.46342%203.45494%204.8428%202.38092C4.93237%202.12736%205.03253%201.88651%205.14261%201.66315Z%22%20fill%3D%22currentColor%22%2F%3E%3C%2Fsvg%3E",
            iconAdaptive: true
        },
        deepThinkToggle: {
            name: "DeepThink 按钮",
            actionType: "selector",
            selector: "div:has(textarea) button[aria-label*='DeepThink'], div:has(textarea) [role='button'][aria-label*='DeepThink'], div:has([contenteditable='true']) button[aria-label*='DeepThink'], div:has([contenteditable='true']) [role='button'][aria-label*='DeepThink'], button:has(svg path[d*='M7.06431']), [role='button']:has(svg path[d*='M7.06431'])",
            hotkey: "CTRL+D",
            icon: "data:image/svg+xml,%3Csvg%20width%3D%2214%22%20height%3D%2214%22%20viewBox%3D%220%200%2014%2014%22%20fill%3D%22none%22%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%3E%3Cpath%20d%3D%22M7.06431%205.93348C7.68763%205.93348%208.19307%206.4391%208.19322%207.06239C8.19322%207.68579%207.68772%208.19129%207.06431%208.19129C6.44099%208.19119%205.9354%207.68573%205.9354%207.06239C5.93555%206.43917%206.44108%205.93359%207.06431%205.93348Z%22%20fill%3D%22currentColor%22%3E%3C%2Fpath%3E%3Cpath%20fill-rule%3D%22evenodd%22%20clip-rule%3D%22evenodd%22%20d%3D%22M8.6815%200.963754C10.1169%200.44708%2011.6266%200.37489%2012.5633%201.31141C13.5%202.24812%2013.4277%203.75782%2012.911%205.19325C12.7126%205.74437%2012.4386%206.31802%2012.0965%206.89735C12.4969%207.54645%2012.8141%208.19024%2013.036%208.80653C13.5527%2010.242%2013.6251%2011.7516%2012.6883%2012.6884C11.7516%2013.6251%2010.242%2013.5527%208.8065%2013.036C8.19022%2012.8141%207.54641%2012.4969%206.89732%2012.0966C6.31797%2012.4386%205.74435%2012.7126%205.19322%2012.911C3.75777%2013.4277%202.2481%2013.5001%201.31138%2012.5634C0.374859%2011.6266%200.447049%2010.1169%200.963724%208.68153C1.17185%208.10345%201.46321%207.50069%201.82896%206.89247C1.52182%206.35717%201.27235%205.82832%201.08872%205.31825C0.572068%203.88284%200.499714%202.37312%201.43638%201.43641C2.37308%200.499716%203.8828%200.572105%205.31822%201.08875C5.82828%201.27238%206.35715%201.52186%206.89243%201.82899C7.50066%201.46324%208.10341%201.17187%208.6815%200.963754ZM11.3573%208.01161C10.9083%208.62259%2010.3901%209.22879%209.80943%209.80946C9.22877%2010.3901%208.62255%2010.9084%208.01158%2011.3573C8.4257%2011.5841%208.8287%2011.7688%209.21275%2011.9071C10.5456%2012.3869%2011.4246%2012.2548%2011.8397%2011.8397C12.2548%2011.4247%2012.3869%2010.5456%2011.9071%209.21278C11.7688%208.82872%2011.5841%208.42574%2011.3573%208.01161ZM2.56529%208.02918C2.37344%208.39328%202.21495%208.74802%202.09263%209.08778C1.61291%2010.4204%201.74512%2011.2996%202.16001%2011.7147C2.57505%2012.1298%203.45415%2012.2619%204.78697%2011.7821C5.11057%2011.6656%205.44786%2011.5164%205.7938%2011.3368C5.249%2010.9223%204.70922%2010.4534%204.19029%209.93446C3.57578%209.31993%203.03169%208.67639%202.56529%208.02918ZM6.90708%203.24696C6.24065%203.70485%205.5646%204.26327%204.91392%204.91395C4.26325%205.56462%203.70482%206.24069%203.24693%206.90711C3.72674%207.63331%204.32777%208.37465%205.03892%209.08582C5.64943%209.69633%206.28183%2010.2265%206.90806%2010.6679C7.59368%2010.2026%208.2908%209.63082%208.96079%208.96082C9.6308%208.29082%2010.2025%207.59372%2010.6678%206.90809C10.2265%206.28186%209.69631%205.64946%209.08579%205.03895C8.37462%204.32779%207.63328%203.72678%206.90708%203.24696ZM11.7147%202.16004C11.2996%201.74515%2010.4204%201.61294%209.08775%202.09266C8.74835%202.21485%208.39382%202.37277%208.03013%202.56434C8.67728%203.03071%209.31995%203.57586%209.93443%204.19032C10.4534%204.70926%2010.9223%205.24902%2011.3368%205.79383C11.5164%205.44791%2011.6656%205.11058%2011.7821%204.787C12.2618%203.45422%2012.1297%202.57508%2011.7147%202.16004ZM4.91197%202.21766C3.57922%201.73794%202.70004%201.87001%202.28501%202.28504C1.87001%202.70009%201.73791%203.57926%202.21763%204.912C2.31709%205.18828%202.44112%205.47433%202.58677%205.76747C3.01931%205.18876%203.51474%204.61586%204.06529%204.06532C4.61584%203.51477%205.18872%203.01934%205.76743%202.5868C5.47431%202.44116%205.18824%202.31712%204.91197%202.21766Z%22%20fill%3D%22currentColor%22%3E%3C%2Fpath%3E%3C%2Fsvg%3E",
            iconAdaptive: true
        },
        sidebarToggle: {
            name: "侧边栏",
            actionType: "selector",
            selector: "button[aria-label*='sidebar' i], [role='button'][aria-label*='sidebar' i], button[title*='sidebar' i], [role='button'][title*='sidebar' i], button:has(svg path[d*='M9.67269']), [role='button']:has(svg path[d*='M9.67269'])",
            hotkey: "CTRL+B",
            icon: "data:image/svg+xml,%3Csvg%20width%3D%2216%22%20height%3D%2216%22%20viewBox%3D%220%200%2016%2016%22%20fill%3D%22none%22%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%3E%3Cpath%20fill-rule%3D%22evenodd%22%20clip-rule%3D%22evenodd%22%20d%3D%22M9.67269%200.522888C10.8339%200.522888%2011.7599%200.522762%2012.4963%200.602541C13.2453%200.683705%2013.8789%200.854296%2014.4263%201.25202C14.7504%201.48744%2015.0354%201.77252%2015.2709%202.09654C15.6686%202.64398%2015.8392%203.27762%2015.9203%204.0266C16.0001%204.76295%2016%205.689%2016%206.85019V9.14991C16%2010.3111%2016.0001%2011.2372%2015.9203%2011.9735C15.8392%2012.7225%2015.6686%2013.3561%2015.2709%2013.9036C15.0354%2014.2276%2014.7504%2014.5127%2014.4263%2014.7481C13.8789%2015.1458%2013.2453%2015.3164%2012.4963%2015.3976C11.7599%2015.4773%2010.8339%2015.4772%209.67269%2015.4772H6.32727C5.16608%2015.4772%204.24003%2015.4773%203.50368%2015.3976C2.75471%2015.3164%202.12106%2015.1458%201.57363%2014.7481C1.2496%2014.5127%200.964519%2014.2276%200.7291%2013.9036C0.331377%2013.3561%200.160786%2012.7225%200.0796224%2011.9735C-0.000156655%2011.2372%20-3.05163e-05%2010.3111%20-3.05163e-05%209.14991V6.85019C-3.05163e-05%205.689%20-0.000156655%204.76295%200.0796224%204.0266C0.160786%203.27762%200.331377%202.64398%200.7291%202.09654C0.964519%201.77252%201.2496%201.48744%201.57363%201.25202C2.12106%200.854296%202.75471%200.683705%203.50368%200.602541C4.24003%200.522762%205.16608%200.522888%206.32727%200.522888H9.67269ZM5.543%201.8872V14.1119C5.78633%2014.1128%206.04706%2014.117%206.32727%2014.117H9.67269C10.8639%2014.117%2011.7032%2014.1165%2012.3492%2014.0465C12.9824%2013.9779%2013.3497%2013.8495%2013.6267%2013.6483C13.8354%2013.4967%2014.0195%2013.3126%2014.171%2013.104C14.3722%2012.8269%2014.5007%2012.4596%2014.5693%2011.8265C14.6393%2011.1804%2014.6398%2010.3411%2014.6398%209.14991V6.85019C14.6398%205.65901%2014.6393%204.81972%2014.5693%204.17365C14.5007%203.54053%2014.3722%203.17323%2014.171%202.89614C14.0195%202.68752%2013.8354%202.50341%2013.6267%202.35184C13.3497%202.15065%2012.9824%202.02217%2012.3492%201.95358C11.7032%201.88362%2010.8639%201.88311%209.67269%201.88311H6.32727C6.04706%201.88311%205.78633%201.88625%205.543%201.8872ZM4.18277%201.91171C3.99122%201.92164%203.81477%201.93582%203.65073%201.95358C3.01761%202.02217%202.65031%202.15065%202.37322%202.35184C2.1646%202.50341%201.98049%202.68752%201.82892%202.89614C1.62773%203.17323%201.49925%203.54053%201.43066%204.17365C1.36071%204.81972%201.3602%205.65901%201.3602%206.85019V9.14991C1.3602%2010.3411%201.36071%2011.1804%201.43066%2011.8265C1.49925%2012.4596%201.62773%2012.8269%201.82892%2013.104C1.98049%2013.3126%202.1646%2013.4967%202.37322%2013.6483C2.65031%2013.8495%203.01761%2013.9779%203.65073%2014.0465C3.81475%2014.0643%203.99124%2014.0774%204.18277%2014.0874V1.91171Z%22%20fill%3D%22currentColor%22%2F%3E%3C%2Fsvg%3E",
            iconAdaptive: true
        }
    });

    const DEEPSEEK_SHORTCUT_KEY_ALIASES = Object.freeze({
        newChat: Object.freeze(["新聊天", "New chat"]),
        deleteCurrentChat: Object.freeze(["删除当前聊天", "删除聊天", "Delete Current Chat", "Delete Chat"]),
        searchToggle: Object.freeze(["Search 按钮", "Search button"]),
        deepThinkToggle: Object.freeze(["DeepThink 按钮", "DeepThink button"]),
        sidebarToggle: Object.freeze(["侧边栏", "Sidebar"])
    });

    const DEEPSEEK_LEGACY_SELECTOR_HINTS = Object.freeze({
        newChat: Object.freeze([".ds-icon", "M8 0.599609", "a[href='/']"]),
        deleteCurrentChat: Object.freeze([]),
        searchToggle: Object.freeze(["_020ab5b", "ec4f5d61", "a567dba3", "M7.00003", "aria-label*='Search'"]),
        deepThinkToggle: Object.freeze(["DeepThink", "M7.06431"]),
        sidebarToggle: Object.freeze(["sidebar", "M9.67269"])
    });

    const DEEPSEEK_LEGACY_DEFAULT_ICONS_BY_KEY = Object.freeze({
        newChat: "https://chat.deepseek.com/favicon.svg"
    });

    function getDeepSeekManagedShortcutKey(shortcut) {
        const key = String(shortcut?.key || "").trim();
        if (key && Object.prototype.hasOwnProperty.call(DEEPSEEK_DEFAULT_SHORTCUTS_BY_KEY, key)) return key;
        const name = normalizeDeepSeekToken(shortcut?.name);
        for (const [managedKey, aliases] of Object.entries(DEEPSEEK_SHORTCUT_KEY_ALIASES)) {
            if (aliases.some(alias => normalizeDeepSeekToken(alias) === name)) return managedKey;
        }
        return "";
    }

    function isDeepSeekLegacyDefaultSelector(shortcut) {
        if (!shortcut || typeof shortcut !== "object") return false;
        if (String(shortcut.actionType || "").trim() !== "selector") return false;
        const managedKey = getDeepSeekManagedShortcutKey(shortcut);
        if (!managedKey) return false;
        const selector = normalizeDeepSeekToken(shortcut.selector);
        if (!selector) return false;
        return DEEPSEEK_LEGACY_SELECTOR_HINTS[managedKey].some(hint => selector.includes(normalizeDeepSeekToken(hint)));
    }

    function normalizeDeepSeekIconValue(value) {
        return String(value || "").trim();
    }

    function getDeepSeekLegacyDefaultIcon(managedKey) {
        return DEEPSEEK_LEGACY_DEFAULT_ICONS_BY_KEY[managedKey] || DEEPSEEK_DEFAULT_SHORTCUTS_BY_KEY[managedKey]?.icon || "";
    }

    function isDeepSeekDefaultIconValue(icon, managedKey) {
        const value = normalizeDeepSeekIconValue(icon);
        if (!value) return true;
        const currentIcon = normalizeDeepSeekIconValue(DEEPSEEK_DEFAULT_SHORTCUTS_BY_KEY[managedKey]?.icon);
        const legacyIcon = normalizeDeepSeekIconValue(getDeepSeekLegacyDefaultIcon(managedKey));
        return value === currentIcon || value === legacyIcon;
    }

    function isDeepSeekLegacyDefaultIconValue(icon, managedKey) {
        const value = normalizeDeepSeekIconValue(icon);
        const legacyIcon = normalizeDeepSeekIconValue(getDeepSeekLegacyDefaultIcon(managedKey));
        return !!value && !!legacyIcon && value === legacyIcon;
    }

    function shouldMigrateDeepSeekShortcut(shortcut, managedKey) {
        if (!managedKey) return false;
        if (isDeepSeekLegacyDefaultSelector(shortcut)) return true;
        const iconDark = String(shortcut?.iconDark || "").trim();
        if (!iconDark && isDeepSeekDefaultIconValue(shortcut?.icon, managedKey) && shortcut?.iconAdaptive !== true) return true;
        if (managedKey === "newChat") {
            if (isDeepSeekLegacyDefaultIconValue(shortcut?.icon, managedKey)) return true;
            const actionType = normalizeDeepSeekToken(shortcut?.actionType);
            const simulateKeys = normalizeDeepSeekToken(shortcut?.simulateKeys).replace(/\s+/g, "");
            if (actionType !== "simulate" || simulateKeys !== "cmd+j") {
                return isDeepSeekDefaultIconValue(shortcut?.icon, managedKey);
            }
        }
        return false;
    }

    function migrateDeepSeekShortcuts() {
        if (gmGetValueLocal(DEFAULTS_MIGRATION_KEY, false) === true) return;
        const stored = gmGetValueLocal(SHORTCUTS_STORAGE_KEY, null);
        if (!Array.isArray(stored) || stored.length === 0) {
            gmSetValueLocal(DEFAULTS_MIGRATION_KEY, true);
            return;
        }

        let changed = false;
        const next = stored.map((shortcut) => {
            const managedKey = getDeepSeekManagedShortcutKey(shortcut);
            if (!managedKey || !shouldMigrateDeepSeekShortcut(shortcut, managedKey)) return shortcut;

            const replacement = cloneShortcutRecord(DEEPSEEK_DEFAULT_SHORTCUTS_BY_KEY[managedKey]);
            if (!replacement) return shortcut;
            const source = shortcut && typeof shortcut === "object" ? shortcut : {};
            const sourceIcon = normalizeDeepSeekIconValue(source.icon);
            const sourceIconDark = String(source.iconDark || "").trim();
            const usesDefaultIcon = isDeepSeekDefaultIconValue(sourceIcon, managedKey);
            const shouldUseAdaptiveIcon = !sourceIconDark && usesDefaultIcon && replacement.iconAdaptive === true;
            changed = true;

            return {
                ...replacement,
                key: managedKey,
                id: String(source.id || replacement.id || "").trim() || replacement.id,
                name: String(source.name || "").trim() || replacement.name,
                hotkey: Object.prototype.hasOwnProperty.call(source, "hotkey")
                    ? String(source.hotkey || "").trim()
                    : replacement.hotkey,
                icon: usesDefaultIcon ? replacement.icon : sourceIcon,
                iconDark: sourceIconDark,
                iconAdaptive: shouldUseAdaptiveIcon
                    ? true
                    : (typeof source.iconAdaptive === "boolean" ? source.iconAdaptive : replacement.iconAdaptive),
                data: source.data && typeof source.data === "object" && !Array.isArray(source.data) ? cloneShortcutRecord(source.data) || {} : (replacement.data || {})
            };
        });

        if (changed) gmSetValueLocal(SHORTCUTS_STORAGE_KEY, next);
        gmSetValueLocal(DEFAULTS_MIGRATION_KEY, true);
    }

    function isDeepSeekDeleteCurrentChatShortcut(shortcut) {
        if (getDeepSeekManagedShortcutKey(shortcut) === "deleteCurrentChat") return true;
        const customAction = normalizeDeepSeekToken(shortcut?.customAction);
        if (customAction === "deletecurrentchat") return true;
        const name = normalizeDeepSeekToken(shortcut?.name);
        return name === normalizeDeepSeekToken("删除当前聊天")
            || name === normalizeDeepSeekToken("删除聊天")
            || name === normalizeDeepSeekToken("Delete Current Chat")
            || name === normalizeDeepSeekToken("Delete Chat");
    }

    function normalizeDeepSeekHotkeyForMigration(value) {
        return String(value || "")
            .replace(/\s+/g, "")
            .toUpperCase()
            .replace(/\bCONTROL\b/g, "CTRL")
            .replace(/\bCOMMAND\b/g, "CMD")
            .replace(/\bOPTION\b/g, "ALT");
    }

    function migrateDeepSeekDeleteCurrentChatShortcut() {
        const migratedRaw = gmGetValueLocal(DELETE_CURRENT_CHAT_SHORTCUT_MIGRATION_KEY, false);
        const migrated = migratedRaw === true || migratedRaw === "true";
        if (migrated) return;

        const stored = gmGetValueLocal(SHORTCUTS_STORAGE_KEY, null);
        if (!Array.isArray(stored)) {
            gmSetValueLocal(DELETE_CURRENT_CHAT_SHORTCUT_MIGRATION_KEY, true);
            return;
        }

        if (stored.some(isDeepSeekDeleteCurrentChatShortcut)) {
            gmSetValueLocal(DELETE_CURRENT_CHAT_SHORTCUT_MIGRATION_KEY, true);
            return;
        }

        const template = cloneShortcutRecord(DEEPSEEK_DEFAULT_SHORTCUTS_BY_KEY.deleteCurrentChat);
        if (!template) {
            gmSetValueLocal(DELETE_CURRENT_CHAT_SHORTCUT_MIGRATION_KEY, true);
            return;
        }

        const hotkeyTaken = stored.some((shortcut) => normalizeDeepSeekHotkeyForMigration(shortcut?.hotkey) === "CTRL+BACKSPACE");
        const next = stored.slice();
        next.push({
            ...template,
            key: "deleteCurrentChat",
            id: "key:deleteCurrentChat",
            selector: "",
            url: "",
            urlMethod: "current",
            urlAdvanced: "href",
            simulateKeys: "",
            hotkey: hotkeyTaken ? "" : template.hotkey,
            data: {}
        });
        gmSetValueLocal(SHORTCUTS_STORAGE_KEY, next);
        gmSetValueLocal(DELETE_CURRENT_CHAT_SHORTCUT_MIGRATION_KEY, true);
    }

    const defaultShortcuts = [
        // === DeepSeek 核心功能快捷键 ===
        {
            key: "newChat",
            name: "新聊天",
            actionType: DEEPSEEK_DEFAULT_SHORTCUTS_BY_KEY.newChat.actionType,
            selector: "",
            url: "",
            urlMethod: "current",
            urlAdvanced: "href",
            simulateKeys: DEEPSEEK_DEFAULT_SHORTCUTS_BY_KEY.newChat.simulateKeys,
            hotkey: DEEPSEEK_DEFAULT_SHORTCUTS_BY_KEY.newChat.hotkey,
            icon: DEEPSEEK_DEFAULT_SHORTCUTS_BY_KEY.newChat.icon,
            iconAdaptive: DEEPSEEK_DEFAULT_SHORTCUTS_BY_KEY.newChat.iconAdaptive
        },
        {
            key: "deleteCurrentChat",
            name: "删除当前聊天",
            actionType: DEEPSEEK_DEFAULT_SHORTCUTS_BY_KEY.deleteCurrentChat.actionType,
            customAction: DEEPSEEK_DEFAULT_SHORTCUTS_BY_KEY.deleteCurrentChat.customAction,
            selector: "",
            url: "",
            urlMethod: "current",
            urlAdvanced: "href",
            simulateKeys: "",
            hotkey: DEEPSEEK_DEFAULT_SHORTCUTS_BY_KEY.deleteCurrentChat.hotkey,
            icon: DEEPSEEK_DEFAULT_SHORTCUTS_BY_KEY.deleteCurrentChat.icon,
            iconAdaptive: DEEPSEEK_DEFAULT_SHORTCUTS_BY_KEY.deleteCurrentChat.iconAdaptive
        },
        {
            key: "searchToggle",
            name: "Search 按钮",
            actionType: "selector",
            selector: DEEPSEEK_DEFAULT_SHORTCUTS_BY_KEY.searchToggle.selector,
            url: "",
            urlMethod: "current",
            urlAdvanced: "href",
            simulateKeys: "",
            hotkey: DEEPSEEK_DEFAULT_SHORTCUTS_BY_KEY.searchToggle.hotkey,
            icon: DEEPSEEK_DEFAULT_SHORTCUTS_BY_KEY.searchToggle.icon,
            iconAdaptive: DEEPSEEK_DEFAULT_SHORTCUTS_BY_KEY.searchToggle.iconAdaptive
        },
        {
            key: "deepThinkToggle",
            name: "DeepThink 按钮",
            actionType: "selector",
            selector: DEEPSEEK_DEFAULT_SHORTCUTS_BY_KEY.deepThinkToggle.selector,
            url: "",
            urlMethod: "current",
            urlAdvanced: "href",
            simulateKeys: "",
            hotkey: DEEPSEEK_DEFAULT_SHORTCUTS_BY_KEY.deepThinkToggle.hotkey,
            icon: DEEPSEEK_DEFAULT_SHORTCUTS_BY_KEY.deepThinkToggle.icon,
            iconAdaptive: DEEPSEEK_DEFAULT_SHORTCUTS_BY_KEY.deepThinkToggle.iconAdaptive
        },
        {
            key: "sidebarToggle",
            name: "侧边栏",
            actionType: "selector",
            selector: DEEPSEEK_DEFAULT_SHORTCUTS_BY_KEY.sidebarToggle.selector,
            url: "",
            urlMethod: "current",
            urlAdvanced: "href",
            simulateKeys: "",
            hotkey: DEEPSEEK_DEFAULT_SHORTCUTS_BY_KEY.sidebarToggle.hotkey,
            icon: DEEPSEEK_DEFAULT_SHORTCUTS_BY_KEY.sidebarToggle.icon,
            iconAdaptive: DEEPSEEK_DEFAULT_SHORTCUTS_BY_KEY.sidebarToggle.iconAdaptive
        }
    ];

    let defaultExpertModeEnabled = getDefaultExpertModeSetting();
    let defaultExpertModeMenuCommandId = null;
    let defaultExpertModeWarmupTimer = null;
    let defaultExpertModeRequestTimer = null;
    let defaultExpertModeLastRequestAt = 0;
    let defaultExpertModeObserver = null;

    function getDefaultExpertModeSetting() {
        const localFallback = getLocalBooleanFallback(DEFAULT_EXPERT_MODE_STORAGE_KEY, DEFAULT_EXPERT_MODE_ENABLED);
        const value = gmGetValueLocal(DEFAULT_EXPERT_MODE_STORAGE_KEY, localFallback);
        if (value === true || value === "true" || value === 1 || value === "1") return true;
        if (value === false || value === "false" || value === 0 || value === "0") return false;
        return !!localFallback;
    }

    function setDefaultExpertModeSetting(value) {
        const enabled = !!value;
        gmSetValueLocal(DEFAULT_EXPERT_MODE_STORAGE_KEY, enabled);
        setLocalBooleanFallback(DEFAULT_EXPERT_MODE_STORAGE_KEY, enabled);
    }

    function getDefaultExpertModeMenuLabel(engine = null) {
        const stateText = siteMessage(engine, defaultExpertModeEnabled ? "on" : "off", {}, defaultExpertModeEnabled ? "开" : "关");
        return siteMessage(engine, "defaultExpertModeLabel", { state: stateText }, `DeepSeek - 默认 Expert 模式: ${stateText}`);
    }

    function registerDefaultExpertModeMenuCommand(engine = null) {
        if (defaultExpertModeMenuCommandId !== null) {
            gmUnregisterMenuCommandLocal(defaultExpertModeMenuCommandId);
            defaultExpertModeMenuCommandId = null;
        }

        defaultExpertModeMenuCommandId = gmRegisterMenuCommandLocal(getDefaultExpertModeMenuLabel(engine), () => {
            setDefaultExpertModePreference(!defaultExpertModeEnabled, engine);
        });
    }

    const DEEPSEEK_MODE_CONTROL_SELECTOR = "input[type='radio'], [role='radio'], button, [role='button'], [aria-checked], [aria-selected], label";

    function matchesDeepSeekSelector(element, selector) {
        if (!element || typeof element.matches !== "function") return false;
        try {
            return element.matches(selector);
        } catch {
            return false;
        }
    }

    function closestDeepSeekSelector(element, selector) {
        if (!element || typeof element.closest !== "function") return null;
        try {
            return element.closest(selector);
        } catch {
            return null;
        }
    }

    function resolveDeepSeekModeControl(element) {
        if (!element) return null;
        if (matchesDeepSeekSelector(element, DEEPSEEK_MODE_CONTROL_SELECTOR)) return element;
        return closestDeepSeekSelector(element, DEEPSEEK_MODE_CONTROL_SELECTOR) || element;
    }

    function parseDeepSeekBooleanAttr(value) {
        const token = String(value ?? "").trim().toLowerCase();
        if (token === "true" || token === "1" || token === "checked" || token === "selected") return true;
        if (token === "false" || token === "0" || token === "unchecked" || token === "unselected") return false;
        return null;
    }

    function getDeepSeekLabelControl(element) {
        if (!element) return null;
        if (String(element.tagName || "").toLowerCase() !== "label") return null;
        try {
            if (element.control) return element.control;
        } catch { }
        const forId = String(element.getAttribute?.("for") || "").trim();
        if (forId) {
            try {
                const byId = document.getElementById(forId);
                if (byId) return byId;
            } catch { }
        }
        try {
            return element.querySelector("input[type='radio'], input[type='checkbox'], [role='radio'], [aria-checked], [aria-selected]");
        } catch {
            return null;
        }
    }

    function readDeepSeekModeOptionSelected(element) {
        const control = resolveDeepSeekModeControl(element);
        if (!control) return null;

        const labelControl = getDeepSeekLabelControl(control);
        if (labelControl && labelControl !== control) {
            const labelState = readDeepSeekModeOptionSelected(labelControl);
            if (labelState !== null) return labelState;
        }

        const tagName = String(control.tagName || "").toLowerCase();
        if ((tagName === "input") && /^(?:radio|checkbox)$/i.test(String(control.type || ""))) {
            return !!control.checked;
        }

        for (const attr of ["aria-checked", "aria-selected", "aria-pressed"]) {
            const parsed = parseDeepSeekBooleanAttr(control.getAttribute?.(attr));
            if (parsed !== null) return parsed;
        }

        const dataState = String(control.getAttribute?.("data-state") || "").trim().toLowerCase();
        if (/^(?:checked|selected|active|on|open)$/.test(dataState)) return true;
        if (/^(?:unchecked|unselected|inactive|off|closed)$/.test(dataState)) return false;

        const dataSelected = parseDeepSeekBooleanAttr(control.getAttribute?.("data-selected"));
        if (dataSelected !== null) return dataSelected;

        const nestedInput = control.querySelector?.("input[type='radio'], input[type='checkbox']");
        if (nestedInput) return !!nestedInput.checked;

        const className = normalizeDeepSeekToken(String(control.className || ""));
        if (/(?:^|\s)(?:checked|selected|active|is-checked|is-selected|is-active)(?:\s|$)/.test(className)) return true;
        if (/(?:^|\s)(?:unchecked|unselected|inactive|is-unchecked|is-unselected|is-inactive)(?:\s|$)/.test(className)) return false;

        return null;
    }

    function getDeepSeekModeClickTarget(element) {
        const control = resolveDeepSeekModeControl(element);
        const labelControl = getDeepSeekLabelControl(control);
        if (labelControl && !isVisibleElement(labelControl) && control && isVisibleElement(control)) return control;
        if (control && isVisibleElement(control)) return control;
        if (element && isVisibleElement(element)) return element;
        return control || element || null;
    }

    function findDeepSeekModeOption(labels) {
        const candidates = Array.from(document.querySelectorAll("[role='radio'], input[type='radio'], [aria-checked], [aria-selected], label, button, [role='button']"))
            .filter(isVisibleElement)
            .map((element) => {
                const control = resolveDeepSeekModeControl(element) || element;
                if (matchesAnyLabel(element, labels, { exact: true }) || matchesAnyLabel(control, labels, { exact: true })) {
                    return { element: control, exact: true };
                }
                if (matchesAnyLabel(element, labels, { exact: false }) || matchesAnyLabel(control, labels, { exact: false })) {
                    return { element: control, exact: false };
                }
                return null;
            })
            .filter(Boolean);

        if (!candidates.length) return resolveDeepSeekModeControl(findExactTextElement(labels));

        const composerInput = getVisibleComposerInputs()[0] || null;
        if (!composerInput) {
            return candidates.find(item => item.exact)?.element || candidates[0].element;
        }

        const anchorRect = composerInput.getBoundingClientRect();
        const anchorCenter = getRectCenter(anchorRect);
        return candidates
            .map(({ element, exact }) => {
                const rect = element.getBoundingClientRect();
                const center = getRectCenter(rect);
                const verticalGap = rect.bottom < anchorRect.top
                    ? anchorRect.top - rect.bottom
                    : rect.top > anchorRect.bottom
                        ? rect.top - anchorRect.bottom
                        : 0;
                const horizontalGap = rect.right < anchorRect.left
                    ? anchorRect.left - rect.right
                    : rect.left > anchorRect.right
                        ? rect.left - anchorRect.right
                        : 0;
                const score = (exact ? 0 : 1000)
                    + (verticalGap * 3)
                    + horizontalGap
                    + Math.abs(center.y - anchorCenter.y)
                    + Math.abs(center.x - anchorCenter.x) * 0.25;
                return { element, score };
            })
            .sort((a, b) => a.score - b.score)[0]?.element || null;
    }

    function isDeepSeekExpertModeSelected() {
        const expertOption = findDeepSeekModeOption(["Expert"]);
        const expertSelected = readDeepSeekModeOptionSelected(expertOption);
        if (expertSelected !== null) return expertSelected;

        const instantOption = findDeepSeekModeOption(["Instant"]);
        const instantSelected = readDeepSeekModeOptionSelected(instantOption);
        if (instantSelected === true) return false;
        if (instantSelected === false && expertOption) return true;
        return null;
    }

    function selectDeepSeekExpertMode() {
        const selected = isDeepSeekExpertModeSelected();
        if (selected === true) return true;

        const expertOption = findDeepSeekModeOption(["Expert"]);
        if (!expertOption) return false;
        const clicked = clickDeepSeekElementNativeFirst(getDeepSeekModeClickTarget(expertOption));
        if (!clicked) return false;

        return isDeepSeekExpertModeSelected() === true;
    }

    function shouldWarmupDefaultExpertMode() {
        return defaultExpertModeEnabled;
    }

    function stopDefaultExpertModeWarmup() {
        if (defaultExpertModeWarmupTimer === null) return;
        try { clearInterval(defaultExpertModeWarmupTimer); } catch { }
        defaultExpertModeWarmupTimer = null;
    }

    function cancelDefaultExpertModeRequest() {
        if (defaultExpertModeRequestTimer === null) return;
        try { clearTimeout(defaultExpertModeRequestTimer); } catch { }
        defaultExpertModeRequestTimer = null;
    }

    function startDefaultExpertModeWarmup({ attempts = 12, intervalMs = 400 } = {}) {
        cancelDefaultExpertModeRequest();
        stopDefaultExpertModeWarmup();
        if (!shouldWarmupDefaultExpertMode()) return;

        let remaining = Math.max(1, Number(attempts) || 1);
        const interval = Math.max(120, Number(intervalMs) || 400);
        const tick = () => {
            if (!shouldWarmupDefaultExpertMode()) return true;
            if (selectDeepSeekExpertMode()) return true;
            remaining -= 1;
            return remaining <= 0;
        };

        if (tick()) return;
        defaultExpertModeWarmupTimer = window.setInterval(() => {
            if (tick()) stopDefaultExpertModeWarmup();
        }, interval);
    }

    function requestDefaultExpertModeWarmup({ attempts = 8, intervalMs = 300, delayMs = 0 } = {}) {
        if (!shouldWarmupDefaultExpertMode()) return;
        const now = Date.now();
        const delay = Math.max(0, Number(delayMs) || 0);
        const cooldown = Math.max(0, DEFAULT_EXPERT_MODE_REQUEST_COOLDOWN_MS - (now - defaultExpertModeLastRequestAt));
        const waitMs = Math.max(delay, cooldown);

        if (defaultExpertModeRequestTimer !== null) return;
        defaultExpertModeRequestTimer = window.setTimeout(() => {
            defaultExpertModeRequestTimer = null;
            defaultExpertModeLastRequestAt = Date.now();
            startDefaultExpertModeWarmup({ attempts, intervalMs });
        }, waitMs);
    }

    function isDefaultExpertModeEventTarget(target) {
        const element = target && typeof target.closest === "function"
            ? target.closest("[role='radio'], input[type='radio'], [aria-checked], button, [role='button'], label")
            : null;
        if (!element) return false;
        const label = normalizeDeepSeekToken(getElementLabelText(element));
        return /\b(?:instant|expert)\b/.test(label);
    }

    function setDefaultExpertModePreference(nextValue, engine = null) {
        defaultExpertModeEnabled = !!nextValue;
        setDefaultExpertModeSetting(defaultExpertModeEnabled);

        if (defaultExpertModeEnabled) {
            requestDefaultExpertModeWarmup({ attempts: 12, intervalMs: 300, delayMs: 0 });
        } else {
            cancelDefaultExpertModeRequest();
            stopDefaultExpertModeWarmup();
        }

        console.info(`${LOG_TAG} default Expert mode is now ${defaultExpertModeEnabled ? "enabled" : "disabled"}.`);
        registerDefaultExpertModeMenuCommand(engine);
        return defaultExpertModeEnabled;
    }

    function setupDefaultExpertModeObserver() {
        if (defaultExpertModeObserver || typeof MutationObserver !== "function") return;
        const root = document.documentElement || document.body;
        if (!root) return;

        defaultExpertModeObserver = new MutationObserver(() => {
            if (!shouldWarmupDefaultExpertMode()) return;
            if (defaultExpertModeRequestTimer !== null || defaultExpertModeWarmupTimer !== null) return;
            if (isDeepSeekExpertModeSelected() === true) return;
            requestDefaultExpertModeWarmup({ attempts: 6, intervalMs: 250, delayMs: 80 });
        });

        try {
            defaultExpertModeObserver.observe(root, {
                childList: true,
                subtree: true,
                attributes: true,
                attributeFilter: ["aria-checked", "aria-selected", "aria-pressed", "data-state", "data-selected", "class"]
            });
        } catch {
            defaultExpertModeObserver = null;
        }
    }

    function setupDefaultExpertModeSelection() {
        setupDefaultExpertModeObserver();

        window.addEventListener("load", () => {
            requestDefaultExpertModeWarmup({ attempts: 14, intervalMs: 350, delayMs: 650 });
        }, { once: true });

        if (document.readyState === "interactive" || document.readyState === "complete") {
            requestDefaultExpertModeWarmup({ attempts: 14, intervalMs: 350, delayMs: 350 });
        }

        let lastUrl = location.href;
        const handlePossibleRouteChange = () => {
            const currentUrl = location.href;
            if (currentUrl === lastUrl) return;
            lastUrl = currentUrl;
            requestDefaultExpertModeWarmup({ attempts: 10, intervalMs: 300, delayMs: 250 });
        };
        const patchHistoryMethod = (methodName) => {
            try {
                const original = window.history?.[methodName];
                if (typeof original !== "function" || original.__deepseekDefaultExpertPatched) return;
                const patched = function (...args) {
                    const result = original.apply(this, args);
                    handlePossibleRouteChange();
                    return result;
                };
                patched.__deepseekDefaultExpertPatched = true;
                patched.__deepseekDefaultExpertOriginal = original;
                window.history[methodName] = patched;
            } catch { }
        };

        patchHistoryMethod("pushState");
        patchHistoryMethod("replaceState");

        window.addEventListener("popstate", handlePossibleRouteChange);
        window.addEventListener("hashchange", handlePossibleRouteChange);
        document.addEventListener("visibilitychange", () => {
            if (document.visibilityState === "visible") {
                requestDefaultExpertModeWarmup({ attempts: 10, intervalMs: 300, delayMs: 200 });
            }
        });
        document.addEventListener("click", (event) => {
            if (event && event.isTrusted === false) return;
            if (!isDefaultExpertModeEventTarget(event.target)) return;
            requestDefaultExpertModeWarmup({ attempts: 6, intervalMs: 220, delayMs: 450 });
        }, true);
    }

    function findDeepSeekSelectorFallback(shortcut) {
        const managedKey = getDeepSeekManagedShortcutKey(shortcut);
        if (managedKey === "searchToggle") {
            return findComposerToggle(["Search"]);
        }
        if (managedKey === "deepThinkToggle") {
            return findComposerToggle(["DeepThink"]);
        }
        if (managedKey === "sidebarToggle") {
            return findTopHeaderIconButton(0) || findTopHeaderIconButton(1);
        }

        const label = normalizeDeepSeekToken(shortcut?.name);
        if (label === normalizeDeepSeekToken("Search 按钮") || label === normalizeDeepSeekToken("Search button")) {
            return findComposerToggle(["Search"]);
        }
        if (label === normalizeDeepSeekToken("DeepThink 按钮") || label === normalizeDeepSeekToken("DeepThink button")) {
            return findComposerToggle(["DeepThink"]);
        }
        if (label === normalizeDeepSeekToken("侧边栏") || label === normalizeDeepSeekToken("Sidebar")) {
            return findTopHeaderIconButton(0) || findTopHeaderIconButton(1);
        }
        return null;
    }

    function handleDeepSeekSelectorAction(shortcut) {
        const selector = String(shortcut?.selector || "").trim();
        if (selector && clickCssSelector(selector)) return true;

        const fallbackElement = findDeepSeekSelectorFallback(shortcut);
        if (fallbackElement && clickDeepSeekElement(fallbackElement)) return true;

        console.warn(`${LOG_TAG} selector action could not locate target:`, shortcut?.name || "(unnamed)");
        return false;
    }

    migrateDeepSeekShortcuts();
    migrateDeepSeekDeleteCurrentChatShortcut();
    installDeepSeekDeleteConfirmEnterShortcut();

    const engine = ShortcutTemplate.createShortcutEngine({
        menuCommandLabel: "DeepSeek - 设置快捷键",
        panelTitle: "DeepSeek - 自定义快捷键",
        storageKeys: {
            shortcuts: SHORTCUTS_STORAGE_KEY,
            iconCachePrefix: ICON_CACHE_PREFIX,
            userIcons: USER_ICONS_STORAGE_KEY
        },
        ui: {
            idPrefix: "deepseek",
            cssPrefix: "deepseek",
            compactBreakpoint: 800
        },
        i18n: {
            messages: SITE_MESSAGES
        },
        customActions: {
            deleteCurrentChat: ({ shortcut, engine }) => deleteCurrentDeepSeekChat({ shortcut, engine })
        },
        actionHandlers: {
            selector: ({ shortcut }) => handleDeepSeekSelectorAction(shortcut)
        },
        allowOverrideBuiltinActions: true,
        actionTypeMeta: {
            selector: {
                label: "元素点击",
                shortLabel: "点击",
                color: "#FF9800",
                builtin: true
            }
        },
        defaultIconURL,
        iconLibrary: defaultIcons,
        protectedIconUrls,
        defaultShortcuts,
        consoleTag: "[DeepSeek Shortcut Script]",
        colors: {
            primary: "#5D5CDE"
        },
        shouldBypassIconCache: (url) => {
            return url && url.startsWith('https://chat.deepseek.com/');
        },
        text: {
            stats: {
                total: "总计",
                url: "URL跳转",
                selector: "元素点击",
                simulate: "按键模拟"
            },
            buttons: {
                addShortcut: "添加新快捷键",
                saveAndClose: "保存并关闭",
                confirm: "确定",
                cancel: "取消",
                delete: "删除",
                edit: "编辑",
                clear: "清除"
            },
            dialogs: {
                alert: "提示",
                confirm: "确认",
                prompt: "输入"
            },
            hints: {
                hotkey: "点击此处，然后按下快捷键组合",
                simulate: "点击此处，然后按下要模拟的按键组合",
                hotkeyHelp: "💡 支持 Ctrl/Shift/Alt/Cmd + 字母/数字/功能键等组合",
                simulateHelp: "⚡ 将模拟这个按键组合发送到网页"
            }
        }
    });

    engine.init();
    registerDefaultExpertModeMenuCommand(engine);
    setupDefaultExpertModeSelection();
    engine.i18n?.addLocaleChangeListener?.(() => registerDefaultExpertModeMenuCommand(engine));
})();
