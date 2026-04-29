/* -------------------------------------------------------------------------- *
 * Shared i18n helpers
 * -------------------------------------------------------------------------- */

import { clone, deepMerge } from "./base.js";

export const FALLBACK_LOCALE = "zh-CN";
export const SUPPORTED_LOCALES = Object.freeze(["zh-CN", "en-US"]);
export const AUTO_LOCALE_MODE = "auto";

export function normalizeLocale(value, fallback = FALLBACK_LOCALE) {
    const raw = String(value ?? "").trim();
    if (!raw) return fallback;
    const token = raw.replace(/_/g, "-").toLowerCase();
    if (token === "zh" || token.startsWith("zh-")) return "zh-CN";
    if (token === "cn" || token === "zhcn" || token === "zhhans") return "zh-CN";
    if (token === "en" || token.startsWith("en-")) return "en-US";
    if (token === "enus") return "en-US";
    return fallback;
}

export function normalizeLocaleMode(value, fallback = AUTO_LOCALE_MODE) {
    const raw = String(value ?? "").trim();
    if (!raw) return fallback;
    if (raw.toLowerCase() === AUTO_LOCALE_MODE) return AUTO_LOCALE_MODE;
    return normalizeLocale(raw, fallback === AUTO_LOCALE_MODE ? FALLBACK_LOCALE : fallback);
}

export function detectLocale({ fallback = FALLBACK_LOCALE } = {}) {
    const candidates = [];
    try {
        const htmlLang = globalThis.document?.documentElement?.getAttribute?.("lang");
        if (htmlLang) candidates.push(htmlLang);
    } catch {}
    try {
        const navLanguages = globalThis.navigator?.languages;
        if (Array.isArray(navLanguages)) candidates.push(...navLanguages);
    } catch {}
    try {
        const navLanguage = globalThis.navigator?.language;
        if (navLanguage) candidates.push(navLanguage);
    } catch {}

    for (const candidate of candidates) {
        const normalized = normalizeLocale(candidate, "");
        if (SUPPORTED_LOCALES.includes(normalized)) return normalized;
    }
    return normalizeLocale(fallback, FALLBACK_LOCALE);
}

export function formatMessage(template, vars = {}) {
    let out = String(template ?? "");
    for (const [key, value] of Object.entries(vars || {})) {
        out = out.split(`{${key}}`).join(String(value ?? ""));
    }
    return out;
}

export function getMessageAtPath(messages, path) {
    const parts = String(path || "").split(".").filter(Boolean);
    let current = messages;
    for (const part of parts) {
        if (!current || typeof current !== "object") return undefined;
        current = current[part];
    }
    return current;
}

export function mergeLocaleMessages(...sources) {
    const merged = {};
    for (const source of sources) {
        if (!source || typeof source !== "object") continue;
        for (const [localeKey, messages] of Object.entries(source)) {
            const locale = normalizeLocale(localeKey, "");
            if (!locale || !messages || typeof messages !== "object") continue;
            if (!merged[locale]) merged[locale] = {};
            deepMerge(merged[locale], messages);
        }
    }
    return merged;
}

export function createI18nContext({
    localeMode = AUTO_LOCALE_MODE,
    fallbackLocale = FALLBACK_LOCALE,
    messages = {},
    onChange = null
} = {}) {
    let mode = normalizeLocaleMode(localeMode);
    const fallback = normalizeLocale(fallbackLocale, FALLBACK_LOCALE);
    const dictionaries = mergeLocaleMessages(messages);
    const listeners = [];

    function getLocaleMode() {
        return mode;
    }

    function getEffectiveLocale() {
        return mode === AUTO_LOCALE_MODE ? detectLocale({ fallback }) : normalizeLocale(mode, fallback);
    }

    function getMessages(locale = getEffectiveLocale()) {
        const effective = normalizeLocale(locale, fallback);
        const base = clone(dictionaries[fallback] || {});
        if (effective !== fallback) deepMerge(base, dictionaries[effective] || {});
        return base;
    }

    function t(path, vars = {}, fallbackValue = "") {
        const value = getMessageAtPath(getMessages(), path);
        const finalValue = value === undefined || value === null || value === "" ? fallbackValue : value;
        return formatMessage(finalValue, vars);
    }

    function setLocaleMode(nextMode) {
        const normalized = normalizeLocaleMode(nextMode);
        if (normalized === mode) return false;
        mode = normalized;
        if (typeof onChange === "function") {
            try { onChange(mode, getEffectiveLocale()); } catch {}
        }
        listeners.slice().forEach((listener) => {
            try { listener(mode, getEffectiveLocale()); } catch {}
        });
        return true;
    }

    function addLocaleChangeListener(listener) {
        if (typeof listener !== "function" || listeners.includes(listener)) return () => {};
        listeners.push(listener);
        return () => {
            const index = listeners.indexOf(listener);
            if (index >= 0) listeners.splice(index, 1);
        };
    }

    return Object.freeze({
        getLocaleMode,
        getEffectiveLocale,
        getMessages,
        t,
        setLocaleMode,
        addLocaleChangeListener,
        supportedLocales: SUPPORTED_LOCALES.slice(),
        fallbackLocale: fallback
    });
}
