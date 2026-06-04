import { isVisible, safeQuerySelectorAll } from "../utils/dom.js";
import { simulateClick } from "../utils/events.js";

/* -------------------------------------------------------------------------- *
 * Module 03 · Built-in actions (URL jump / selector click / key simulation)
 * -------------------------------------------------------------------------- */

        function createBuiltinActionTools(ctx = {}) {
            const { options, URL_METHODS, hotkeys, showAlert } = ctx;
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
                if (!methodConfig) return options?.text?.builtins?.unknownUrlMethod || "Unknown jump method";
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
                        const tpl = options?.text?.builtins?.invalidUrlOrError || "Invalid jump URL or error: {url}";
                        showAlert(formatMessage(tpl, { url: targetUrl }));
                    }
                }
            }

            function resolveSelectorCandidates(selector) {
                if (Array.isArray(selector)) {
                    return selector.flatMap(resolveSelectorCandidates);
                }
                if (selector && typeof selector === "object") {
                    if (Array.isArray(selector.selectors)) return resolveSelectorCandidates(selector.selectors);
                    if (selector.selector !== undefined) return resolveSelectorCandidates(selector.selector);
                    if (selector.fallback !== undefined) return resolveSelectorCandidates(selector.fallback);
                    return [];
                }
                const sel = (typeof selector === "string") ? selector.trim() : "";
                return sel ? [sel] : [];
            }

            function clickElement(selector) {
                const selectors = resolveSelectorCandidates(selector);
                if (selectors.length === 0) return;

                let element = null;
                let fallbackElement = null;
                for (const sel of selectors) {
                    const matches = safeQuerySelectorAll(document, sel);
                    const visible = matches.find(isVisible) || null;
                    if (visible) {
                        element = visible;
                        break;
                    }
                    if (!fallbackElement && matches[0]) fallbackElement = matches[0];
                }
                if (!element) element = fallbackElement;

                if (!element) {
                    if (typeof showAlert === "function") {
                        const tpl = options?.text?.builtins?.elementNotFound || "Element not found: {selector}";
                        showAlert(formatMessage(tpl, { selector: selectors.join(", ") }));
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

                const ok = simulateClick(element, { nativeFallback: true });
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
                    const selectorLabel = selectors.join(", ");
                    console.error(`${consoleTag} Failed to dispatch click event on element: ${selectorLabel}`, eventError);
                    if (typeof showAlert === "function") {
                        const tpl = options?.text?.builtins?.clickFailed || "Could not simulate click on element: {selector}";
                        showAlert(formatMessage(tpl, { selector: selectorLabel }));
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

export { createBuiltinActionTools };
