/* -------------------------------------------------------------------------- *
 * Shared Platform · Browser accessors
 * -------------------------------------------------------------------------- */

export function getGlobalScope() {
    return typeof globalThis !== "undefined" ? globalThis : null;
}

export function getUnsafeWindow() {
    const scope = getGlobalScope();
    return scope && typeof scope.unsafeWindow === "object" ? scope.unsafeWindow : null;
}

export function getWindow() {
    const scope = getGlobalScope();
    if (!scope) return null;
    return scope.window || getUnsafeWindow() || scope;
}

export function getDocument() {
    const win = getWindow();
    return win?.document || null;
}

export function getDocumentHead() {
    return getDocument()?.head || null;
}

export function getDocumentBody() {
    return getDocument()?.body || null;
}

export function getDocumentElement() {
    return getDocument()?.documentElement || null;
}

export function getLocalStorage() {
    return getGlobalScope()?.localStorage || null;
}

export function getNavigator() {
    return getGlobalScope()?.navigator || null;
}

export function getCrypto() {
    return getGlobalScope()?.crypto || null;
}

export function getTrustedTypes() {
    return getGlobalScope()?.trustedTypes || null;
}

export function getMatchMedia(query) {
    const win = getWindow();
    if (!win || typeof win.matchMedia !== "function") return null;
    try {
        return win.matchMedia(query);
    } catch {
        return null;
    }
}

export function matchesMedia(query) {
    return !!getMatchMedia(query)?.matches;
}

export function getComputedStyleSafe(element) {
    const win = getWindow();
    if (!win || !element || typeof win.getComputedStyle !== "function") return null;
    try {
        return win.getComputedStyle(element);
    } catch {
        return null;
    }
}

export function getDomConstructor(name) {
    const scope = getGlobalScope();
    return scope?.[name] || null;
}

export function createDomElement(tagName) {
    return getDocument()?.createElement?.(tagName) || null;
}

export function createDomElementNS(namespace, tagName) {
    return getDocument()?.createElementNS?.(namespace, tagName) || null;
}

export function createDocumentFragment() {
    return getDocument()?.createDocumentFragment?.() || null;
}

export function createTreeWalker(root, whatToShow, filter = null) {
    return getDocument()?.createTreeWalker?.(root, whatToShow, filter) || null;
}

export function requestAnimationFrameSafe(callback) {
    const scope = getGlobalScope();
    if (scope && typeof scope.requestAnimationFrame === "function") {
        return scope.requestAnimationFrame(callback);
    }
    return setTimeoutSafe(() => callback(Date.now()), 16);
}

export function cancelAnimationFrameSafe(id) {
    const scope = getGlobalScope();
    if (scope && typeof scope.cancelAnimationFrame === "function") {
        scope.cancelAnimationFrame(id);
        return;
    }
    clearTimeoutSafe(id);
}

export function setTimeoutSafe(callback, delay = 0, ...args) {
    const scope = getGlobalScope();
    if (scope && typeof scope.setTimeout === "function") {
        return scope.setTimeout(callback, delay, ...args);
    }
    return setTimeout(callback, delay, ...args);
}

export function clearTimeoutSafe(timerId) {
    const scope = getGlobalScope();
    if (scope && typeof scope.clearTimeout === "function") {
        scope.clearTimeout(timerId);
        return;
    }
    clearTimeout(timerId);
}

export function setIntervalSafe(callback, delay = 0, ...args) {
    const scope = getGlobalScope();
    if (scope && typeof scope.setInterval === "function") {
        return scope.setInterval(callback, delay, ...args);
    }
    return setInterval(callback, delay, ...args);
}

export function clearIntervalSafe(timerId) {
    const scope = getGlobalScope();
    if (scope && typeof scope.clearInterval === "function") {
        scope.clearInterval(timerId);
        return;
    }
    clearInterval(timerId);
}
