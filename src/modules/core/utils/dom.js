/* -------------------------------------------------------------------------- *
 * Core Utils · DOM helpers
 * -------------------------------------------------------------------------- */

import { sleep } from "../../shared/base.js";
import {
    createDocumentFragment,
    createTreeWalker,
    getDocument,
    getDomConstructor,
    getTrustedTypes
} from "../../shared/platform/browser.js";

const DEFAULT_TIMING = Object.freeze({
            pollIntervalMs: 120,
            waitTimeoutMs: 3000,
            openDelayMs: 250,
            stepDelayMs: 250
        });

        function safeQuerySelector(root, selector) {
            const base = root && typeof root.querySelector === "function" ? root : getDocument();
            if (!base || !selector) return null;
            try {
                return base.querySelector(selector);
            } catch {
                return null;
            }
        }

        function safeQuerySelectorAll(root, selector) {
            const base = root && typeof root.querySelectorAll === "function" ? root : getDocument();
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
                const trustedTypes = getTrustedTypes();
                if (!trustedTypes || typeof trustedTypes.createPolicy !== "function") return null;
                trustedHtmlPolicy = trustedTypes.createPolicy(TRUSTED_TYPES_POLICY_NAME, {
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
                const NodeFilterCtor = getDomConstructor("NodeFilter");
                const walker = NodeFilterCtor
                    ? createTreeWalker(fragment, NodeFilterCtor.SHOW_ELEMENT, null)
                    : null;
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
                const DOMParserCtor = getDomConstructor("DOMParser");
                const parser = DOMParserCtor ? new DOMParserCtor() : null;
                if (!parser) throw new Error("DOMParser unavailable");
                const parsed = parser.parseFromString(value, "text/html");
                const fragment = createDocumentFragment();
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

export {
    DEFAULT_TIMING,
    safeQuerySelector,
    safeQuerySelectorAll,
    isVisible,
    escapeForAttributeSelector,
    normalizeText,
    matchText,
    getElementLabelText,
    findFirst,
    waitFor,
    waitForElement,
    waitForMatch,
    setTrustedHTML
};
