/* -------------------------------------------------------------------------- *
 * Shared Base (zero-dependency helpers shared by utils / engine / quick-input)
 * -------------------------------------------------------------------------- */

export const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

export function clampInt(value, { min = 0, max = 9999, fallback = 0 } = {}) {
    const num = Number.parseInt(String(value ?? ""), 10);
    if (!Number.isFinite(num)) return fallback;
    return Math.min(max, Math.max(min, num));
}

export function normalizeHotkeyString(raw) {
    return String(raw ?? "").trim().replace(/s+/g, "");
}

export function normalizeHotkeyFallback(raw) {
    const cleaned = normalizeHotkeyString(raw).toUpperCase();
    if (!cleaned) return "";
    const parts = cleaned.split("+").map((s) => s.trim()).filter(Boolean);
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

export function deepMerge(target, source) {
    if (!source) return target;
    Object.keys(source).forEach((key) => {
        const value = source[key];
        if (Array.isArray(value)) {
            target[key] = value.slice();
        } else if (value && typeof value === "object") {
            if (!target[key] || typeof target[key] !== "object") target[key] = {};
            deepMerge(target[key], value);
        } else {
            target[key] = value;
        }
    });
    return target;
}

export function clone(obj) {
    if (Array.isArray(obj)) return obj.map((item) => clone(item));
    if (obj && typeof obj === "object") {
        const res = {};
        Object.keys(obj).forEach((key) => {
            res[key] = clone(obj[key]);
        });
        return res;
    }
    return obj;
}
