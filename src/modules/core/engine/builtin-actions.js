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
                    const nextUrl = urlObj.pathname + urlObj.search + urlObj.hash;
                    const title = document.title;

                    if (urlObj.origin !== location.origin) {
                        window.location.href = urlObj.href;
                        return;
                    }

                    const link = findSameOriginSpaLink(urlObj);
                    if (link && clickSpaLink(link)) return;

                    const pagesRouter = getPagesRouter();
                    if (pagesRouter && typeof pagesRouter.push === "function") {
                        try {
                            if (advanced === "replaceState" && typeof pagesRouter.replace === "function") {
                                pagesRouter.replace(nextUrl);
                            } else {
                                pagesRouter.push(nextUrl);
                            }
                            return;
                        } catch (routerError) {
                            console.warn(`${consoleTag} next.router.push failed:`, routerError);
                        }
                    }

                    const prevState = window.history.state;
                    const nextJs = isNextJsHistoryState(prevState);
                    // Next.js App Router hard-reloads when popstate carries a foreign {url}
                    // payload. Clone the existing __NA state and still dispatch popstate so
                    // pages without an in-page <a> (e.g. grok.com/imagine) client-route.
                    const state = nextJs && prevState && typeof prevState === "object" && !Array.isArray(prevState)
                        ? { ...prevState }
                        : { url };

                    if (advanced === "replaceState") {
                        window.history.replaceState(state, title, nextUrl);
                    } else {
                        window.history.pushState(state, title, nextUrl);
                    }
                    window.dispatchEvent(new PopStateEvent("popstate", { state }));
                } catch (e) {
                    console.warn(`${consoleTag} SPA navigation failed, fallback to location.href:`, e);
                    window.location.href = url;
                }
            }

            function cssEscapeHref(value) {
                const text = String(value ?? "");
                if (typeof CSS !== "undefined" && typeof CSS.escape === "function") {
                    return CSS.escape(text);
                }
                return text.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
            }

            function isNextJsHistoryState(state) {
                if (!state || typeof state !== "object" || Array.isArray(state)) return false;
                if (state.__NA === true) return true;
                if (Object.prototype.hasOwnProperty.call(state, "__PRIVATE_NEXTJS_INTERNALS_TREE")) return true;
                if (Object.prototype.hasOwnProperty.call(state, "__N")) return true;
                return false;
            }

            function getPagesRouter() {
                try {
                    const router = window.next?.router;
                    return router && typeof router === "object" ? router : null;
                } catch {
                    return null;
                }
            }

            function findSameOriginSpaLink(urlObj) {
                const nextUrl = urlObj.pathname + urlObj.search + urlObj.hash;
                const hrefs = [];
                const add = (href) => {
                    const value = String(href ?? "").trim();
                    if (value && !hrefs.includes(value)) hrefs.push(value);
                };
                add(nextUrl);
                add(urlObj.pathname);
                add(urlObj.href);
                add(urlObj.origin + nextUrl);
                add(urlObj.origin + urlObj.pathname);
                if (urlObj.pathname !== "/" && !urlObj.pathname.endsWith("/")) {
                    add(`${urlObj.pathname}/${urlObj.search}${urlObj.hash}`);
                }
                if (urlObj.pathname === "/") {
                    add("/");
                    add(urlObj.origin);
                    add(`${urlObj.origin}/`);
                }

                for (const href of hrefs) {
                    let matches = [];
                    try {
                        matches = Array.from(document.querySelectorAll(`a[href="${cssEscapeHref(href)}"]`));
                    } catch {
                        continue;
                    }
                    const visible = matches.find(isVisible);
                    if (visible) return visible;
                    if (matches[0]) return matches[0];
                }
                return null;
            }

            function clickSpaLink(link) {
                if (!link) return false;
                try {
                    link.click();
                    return true;
                } catch {}
                return simulateClick(link, { nativeFallback: true });
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
                    composed: true,
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
