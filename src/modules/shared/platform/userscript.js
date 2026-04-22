/* -------------------------------------------------------------------------- *
 * Shared Platform · Userscript helpers
 * -------------------------------------------------------------------------- */

import { getGlobalScope } from "./browser.js";

const USERSCRIPT_API_RESOLVER_KEY = "__TEMPLATE_SHORTCUTS_GET_USERSCRIPT_API__";

function getUserscriptApi(name) {
    const scope = getGlobalScope();
    const resolver = scope?.[USERSCRIPT_API_RESOLVER_KEY];
    if (typeof resolver === "function") {
        try {
            const resolved = resolver(name);
            if (typeof resolved === "function") return resolved;
        } catch {}
    }

    if (!scope) return null;
    const direct = scope[name];
    if (typeof direct === "function") return direct;

    const gm = scope.GM;
    if (gm && typeof gm === "object") {
        const altName = name.replace(/^GM_/, "");
        const gmValue = gm[altName];
        if (typeof gmValue === "function") return gmValue.bind(gm);
        const lowerCamel = altName.charAt(0).toLowerCase() + altName.slice(1);
        const gmLowerValue = gm[lowerCamel];
        if (typeof gmLowerValue === "function") return gmLowerValue.bind(gm);
    }

    return null;
}

export function hasUserscriptApi(name) {
    return typeof getUserscriptApi(name) === "function";
}

export function gmGetValue(key, fallback) {
    const fn = getUserscriptApi("GM_getValue");
    if (typeof fn !== "function") return fallback;
    try {
        return fn(key, fallback);
    } catch {
        return fallback;
    }
}

export function gmSetValue(key, value) {
    const fn = getUserscriptApi("GM_setValue");
    if (typeof fn !== "function") return;
    try {
        fn(key, value);
    } catch {}
}

export function getGmXmlHttpRequest() {
    return getUserscriptApi("GM_xmlhttpRequest");
}

export function gmRegisterMenuCommand(label, handler) {
    const fn = getUserscriptApi("GM_registerMenuCommand");
    if (typeof fn !== "function") return null;
    try {
        return fn(label, handler);
    } catch {
        return null;
    }
}

export function gmUnregisterMenuCommand(commandId) {
    const fn = getUserscriptApi("GM_unregisterMenuCommand");
    if (typeof fn !== "function") return;
    try {
        fn(commandId);
    } catch {}
}
