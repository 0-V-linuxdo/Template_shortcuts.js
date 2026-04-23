/* -------------------------------------------------------------------------- *
 * Quick Input · DOM helpers
 * -------------------------------------------------------------------------- */

import { sleep } from "../shared/base.js";
import { simulateClick } from "../core/utils/events.js";
import { sleepWithCancel } from "./config.js";

function clampInt(value, { min = 0, max = 9999, fallback = 0 } = {}) {
            const num = Number.parseInt(String(value ?? ""), 10);
            if (!Number.isFinite(num)) return fallback;
            return Math.min(max, Math.max(min, num));
        }

        function normalizeComposerText(value, { trimTrailingEditorNewlines = false } = {}) {
            let text = String(value ?? "");
            text = text
                .replace(/\r\n?/g, "\n")
                .replace(/[\u200B\u200C\u200D\u2060\uFEFF]/g, "");

            if (trimTrailingEditorNewlines) {
                text = text.replace(/\n+$/g, "");
            }

            return text;
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

            const targetElement = target || globalThis.document?.activeElement || globalThis.document?.body || null;
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
                if (rect.bottom < 0 || rect.top > globalThis.innerHeight) return false;
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
                    const bottomScore = rect.bottom / Math.max(1, globalThis.innerHeight);
                    const widthScore = rect.width / Math.max(1, globalThis.innerWidth);
                    const areaScore = (rect.width * rect.height) / Math.max(1, globalThis.innerWidth * globalThis.innerHeight);
                    const score = bottomScore * 2 + widthScore + areaScore * 0.5;
                    if (score > bestScore) {
                        best = el;
                        bestScore = score;
                    }
                } catch {}
            }
            return best;
        }

        function getComposerText(el) {
            if (!el) return "";

            const tag = (el.tagName || "").toUpperCase();
            if (tag === "TEXTAREA" || tag === "INPUT") {
                try { return String(el.value ?? ""); } catch { }
            }

            if (el.isContentEditable || el.contentEditable === "true") {
                try { return String(el.innerText || el.textContent || ""); } catch { }
            }

            try { return String(el.textContent || ""); } catch { return ""; }
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
                    globalThis.document?.execCommand?.("selectAll", false);
                    globalThis.document?.execCommand?.("insertText", false, text);
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
            const active = globalThis.document?.activeElement || null;
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
                    candidates.push(...Array.from(globalThis.document?.querySelectorAll?.(sel) || []));
                } catch {}
            }
            const filtered = ignore ? candidates.filter(el => !ignore(el)) : candidates;
            return pickBestComposerCandidate(filtered);
        }

        async function focusComposer({ timeoutMs = 2500, intervalMs = 120, shouldCancel = null, shouldIgnore = null, runtime = null } = {}) {
            const cancelFn = typeof shouldCancel === "function" ? shouldCancel : null;
            const ignoreFn = typeof shouldIgnore === "function" ? shouldIgnore : null;
            const runtimeApi = runtime && typeof runtime === "object" ? runtime : null;
            const now = typeof runtimeApi?.now === "function"
                ? () => runtimeApi.now()
                : () => Date.now();
            const waitIfPaused = typeof runtimeApi?.waitIfPaused === "function"
                ? runtimeApi.waitIfPaused.bind(runtimeApi)
                : null;
            const deadline = now() + Math.max(0, Number(timeoutMs) || 0);
            let composer = findComposerElement({ shouldIgnore: ignoreFn });

            while (!composer && now() < deadline) {
                if (cancelFn && cancelFn()) return null;
                if (waitIfPaused) {
                    const pauseOk = await waitIfPaused();
                    if (pauseOk === false) return null;
                }
                const waitMs = Math.min(Math.max(0, deadline - now()), Math.max(0, Number(intervalMs) || 0));
                if (waitMs <= 0) break;
                const waitOk = await sleepWithCancel(waitMs, { shouldCancel: cancelFn, runtime: runtimeApi, chunkMs: intervalMs });
                if (!waitOk) return null;
                composer = findComposerElement({ shouldIgnore: ignoreFn });
            }

            if (cancelFn && cancelFn()) return null;
            if (!composer) return null;
            try { composer.scrollIntoView?.({ block: "center" }); } catch {}
            try { composer.focus?.(); } catch {}
            try { simulateClick(composer, { nativeFallback: true }); } catch {}
            const settleOk = await sleepWithCancel(20, { shouldCancel: cancelFn, runtime: runtimeApi, chunkMs: 20 });
            if (!settleOk) return null;
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

        function isInsideOverlayTree(target, overlayId) {
            const targetId = String(overlayId ?? "").trim();
            if (!target || !targetId) return false;

            let node = target;
            const visited = new Set();
            while (node && !visited.has(node)) {
                visited.add(node);
                if (node.nodeType === 1 && String(node.id || "") === targetId) return true;

                let current = node;
                const chainVisited = new Set();
                while (current && !chainVisited.has(current)) {
                    chainVisited.add(current);
                    if (current.nodeType === 1 && String(current.id || "") === targetId) return true;
                    const parent = current.parentElement || current.parentNode || null;
                    if (!parent || parent === current) break;
                    current = parent;
                }

                const host = node.host || null;
                if (host && host !== node) {
                    node = host;
                    continue;
                }

                let root = null;
                try { root = typeof node.getRootNode === "function" ? node.getRootNode() : null; } catch {}
                const rootHost = root && root !== node ? (root.host || null) : null;
                if (rootHost && rootHost !== node) {
                    node = rootHost;
                    continue;
                }

                break;
            }

            return false;
        }

export {
    clampInt,
    normalizeComposerText,
    normalizeHotkeyString,
    normalizeHotkeyFallback,
    getKeyEventProps,
    simulateKeystroke,
    isElementVisible,
    pickBestComposerCandidate,
    getComposerText,
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
    trySetFileInputFiles,
    isInsideOverlayTree
};
