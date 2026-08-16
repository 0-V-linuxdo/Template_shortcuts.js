/* -------------------------------------------------------------------------- *
 * ChatGPT conversation-history rate-limit dialog detection
 * -------------------------------------------------------------------------- */

const CHATGPT_RATE_LIMIT_MODAL_TOKEN = "modal-conversation-history-rate-limit";
const CHATGPT_RATE_LIMIT_ROOT_SELECTOR = [
    `#${CHATGPT_RATE_LIMIT_MODAL_TOKEN}`,
    `[data-testid="${CHATGPT_RATE_LIMIT_MODAL_TOKEN}"]`
].join(", ");
const CHATGPT_DIALOG_SELECTOR = [
    "dialog",
    '[role="dialog"]',
    '[role="alertdialog"]',
    '[aria-modal="true"]'
].join(", ");
const DEFAULT_QUICK_INPUT_OVERLAY_ID = "chatgpt-quick-input-overlay";
const OBSERVED_VISIBILITY_ATTRIBUTES = Object.freeze([
    "aria-hidden",
    "aria-modal",
    "data-state",
    "data-testid",
    "hidden",
    "id",
    "open",
    "role"
]);
const SETTLED_RESCAN_DELAYS_MS = Object.freeze([50, 300]);
const CHATGPT_RATE_LIMIT_CANDIDATE_SELECTOR = [
    CHATGPT_RATE_LIMIT_ROOT_SELECTOR,
    CHATGPT_DIALOG_SELECTOR
].join(", ");

function normalizeRateLimitText(value) {
    return String(value ?? "")
        .replace(/[\u2018\u2019]/g, "'")
        .replace(/\s+/g, " ")
        .trim()
        .toLowerCase();
}

function getElementText(element) {
    if (!element) return "";
    const parts = [];
    try { parts.push(element.getAttribute?.("aria-label") || ""); } catch {}
    try { parts.push(element.getAttribute?.("title") || ""); } catch {}
    try { parts.push(element.textContent || ""); } catch {}
    return normalizeRateLimitText(parts.filter(Boolean).join(" "));
}

function hasRateLimitTitle(text) {
    return normalizeRateLimitText(text).includes("too many requests");
}

function hasStrongRateLimitBody(text) {
    const normalized = normalizeRateLimitText(text);
    return normalized.includes("making requests too quickly")
        && normalized.includes("temporarily limited access to your conversations");
}

function matchesKnownRateLimitText(element) {
    const text = getElementText(element);
    if (!text) return false;
    return hasRateLimitTitle(text) && hasStrongRateLimitBody(text);
}

function matchesSelector(element, selector) {
    if (!element || typeof element.matches !== "function") return false;
    try { return !!element.matches(selector); } catch { return false; }
}

function querySelectorAllSafe(root, selector) {
    if (!root || typeof root.querySelectorAll !== "function") return [];
    try { return Array.from(root.querySelectorAll(selector) || []); } catch { return []; }
}

function collectCandidates(root, selector) {
    const candidates = [];
    if (matchesSelector(root, selector)) candidates.push(root);
    candidates.push(...querySelectorAllSafe(root, selector));
    return Array.from(new Set(candidates.filter(Boolean)));
}

function closestSafe(element, selector) {
    if (!element || typeof element.closest !== "function") return null;
    try { return element.closest(selector); } catch { return null; }
}

function getElementForNode(node) {
    if (!node) return null;
    if (Number(node.nodeType) === 1) return node;
    try { return node.parentElement || null; } catch { return null; }
}

function touchesRateLimitCandidate(node) {
    const element = getElementForNode(node);
    if (!element) return false;
    if (matchesSelector(element, CHATGPT_RATE_LIMIT_CANDIDATE_SELECTOR)) return true;
    if (closestSafe(element, CHATGPT_RATE_LIMIT_CANDIDATE_SELECTOR)) return true;
    return querySelectorAllSafe(element, CHATGPT_RATE_LIMIT_CANDIDATE_SELECTOR).length > 0;
}

function shouldScanMutation(record) {
    if (!record) return true;
    if (touchesRateLimitCandidate(record.target)) return true;
    if (String(record.type || "") !== "childList") return false;

    for (const node of Array.from(record.addedNodes || [])) {
        if (touchesRateLimitCandidate(node)) return true;
    }
    for (const node of Array.from(record.removedNodes || [])) {
        if (touchesRateLimitCandidate(node)) return true;
    }
    return false;
}

function getParentNode(node) {
    if (!node) return null;
    try { return node.parentElement || node.parentNode || null; } catch { return null; }
}

function isInsideOverlay(element, overlayId) {
    const expectedId = String(overlayId || "").trim();
    if (!element || !expectedId) return false;

    let node = element;
    while (node) {
        try {
            if (String(node.id || node.getAttribute?.("id") || "") === expectedId) return true;
        } catch {}

        let next = getParentNode(node);
        if (!next && typeof node.getRootNode === "function") {
            try { next = node.getRootNode()?.host || null; } catch {}
        }
        if (!next || next === node) break;
        node = next;
    }
    return false;
}

function isNodeVisiblyOpen(node) {
    if (!node || Number(node.nodeType) !== 1) return true;
    try {
        if (node.hidden) return false;
        if (node.getAttribute?.("hidden") !== null) return false;
        if (String(node.tagName || "").toUpperCase() === "DIALOG" && !node.hasAttribute?.("open")) return false;
        if (normalizeRateLimitText(node.getAttribute?.("aria-hidden")) === "true") return false;
        if (normalizeRateLimitText(node.getAttribute?.("data-state")) === "closed") return false;
    } catch {}

    try {
        const inlineStyle = node.style || null;
        if (inlineStyle) {
            const display = normalizeRateLimitText(inlineStyle.display);
            const visibility = normalizeRateLimitText(inlineStyle.visibility);
            const opacity = normalizeRateLimitText(inlineStyle.opacity);
            if (display === "none" || visibility === "hidden" || visibility === "collapse" || opacity === "0") return false;
        }
    } catch {}

    const getComputedStyleFn = globalThis.getComputedStyle;
    if (typeof getComputedStyleFn === "function") {
        try {
            const style = getComputedStyleFn(node);
            const display = normalizeRateLimitText(style?.display);
            const visibility = normalizeRateLimitText(style?.visibility);
            const opacity = normalizeRateLimitText(style?.opacity);
            if (display === "none" || visibility === "hidden" || visibility === "collapse" || opacity === "0") return false;
        } catch {}
    }

    return true;
}

function isVisibleDialog(element, { visibilityRoot = null, isVisible = null } = {}) {
    if (!element) return false;
    try {
        if (element.isConnected === false) return false;
    } catch {}

    let node = element;
    while (node) {
        if (!isNodeVisiblyOpen(node)) return false;
        if (node === visibilityRoot) break;
        const next = getParentNode(node);
        if (!next || next === node) break;
        node = next;
    }

    if (typeof isVisible === "function") {
        try { return !!isVisible(element); } catch { return false; }
    }

    if (typeof element.getBoundingClientRect === "function") {
        try {
            const rect = element.getBoundingClientRect();
            if (!rect || Number(rect.width) <= 0 || Number(rect.height) <= 0) return false;
        } catch { return false; }
    }

    return true;
}

function findDialogWithinExactRoot(exactRoot, options) {
    if (!exactRoot) return null;
    const dialogCandidates = collectCandidates(exactRoot, CHATGPT_DIALOG_SELECTOR);
    for (const dialog of dialogCandidates) {
        if (isInsideOverlay(dialog, options.overlayId)) continue;
        if (!isVisibleDialog(dialog, { visibilityRoot: options.visibilityRoot, isVisible: options.isVisible })) continue;
        return dialog;
    }
    return null;
}

/**
 * Return the currently visible ChatGPT request-rate-limit dialog, or null.
 */
export function findChatGPTRateLimitDialog(root = globalThis.document, {
    overlayId = DEFAULT_QUICK_INPUT_OVERLAY_ID,
    isVisible = null
} = {}) {
    if (!root) return null;
    const options = { overlayId, isVisible, visibilityRoot: root };

    for (const exactRoot of collectCandidates(root, CHATGPT_RATE_LIMIT_ROOT_SELECTOR)) {
        if (isInsideOverlay(exactRoot, overlayId)) continue;
        const dialog = findDialogWithinExactRoot(exactRoot, options);
        if (dialog) return dialog;
    }

    for (const dialog of collectCandidates(root, CHATGPT_DIALOG_SELECTOR)) {
        if (isInsideOverlay(dialog, overlayId)) continue;
        if (!matchesKnownRateLimitText(dialog)) continue;
        if (!isVisibleDialog(dialog, { visibilityRoot: root, isVisible })) continue;
        return dialog;
    }

    return null;
}

function getObservationTarget(root) {
    if (!root) return null;
    if (Number(root.nodeType) === 9) {
        try { return root.body || root.documentElement || root; } catch { return root; }
    }
    return root;
}

/**
 * Install a passive observer that reports each newly visible matching dialog.
 * Returns a cleanup function. The callback is never used to dismiss or resume it.
 */
export function installChatGPTRateLimitDialogObserver({
    root = globalThis.document,
    overlayId = DEFAULT_QUICK_INPUT_OVERLAY_ID,
    onDetected = null,
    isVisible = null,
    MutationObserverCtor = globalThis.MutationObserver,
    setTimeoutFn = globalThis.setTimeout,
    clearTimeoutFn = globalThis.clearTimeout
} = {}) {
    if (!root || typeof onDetected !== "function") return () => {};

    let active = true;
    let observer = null;
    let lastDetectedDialog = null;
    const settledRescanTimers = new Set();

    const scan = () => {
        if (!active) return null;
        const dialog = findChatGPTRateLimitDialog(root, { overlayId, isVisible });
        if (!dialog) {
            lastDetectedDialog = null;
            return null;
        }
        if (dialog === lastDetectedDialog) return dialog;

        lastDetectedDialog = dialog;
        try { onDetected(dialog); } catch {}
        return dialog;
    };

    const clearSettledRescans = () => {
        for (const timerId of settledRescanTimers) {
            try { clearTimeoutFn?.(timerId); } catch {}
        }
        settledRescanTimers.clear();
    };

    const scheduleSettledRescans = () => {
        if (!active || typeof setTimeoutFn !== "function") return;
        // Radix may insert the surface at opacity 0, then reveal it via CSS only.
        clearSettledRescans();
        for (const delayMs of SETTLED_RESCAN_DELAYS_MS) {
            let timerId = null;
            try {
                timerId = setTimeoutFn(() => {
                    settledRescanTimers.delete(timerId);
                    scan();
                }, delayMs);
                settledRescanTimers.add(timerId);
            } catch {}
        }
    };

    const observationTarget = getObservationTarget(root);
    if (observationTarget && typeof MutationObserverCtor === "function") {
        try {
            observer = new MutationObserverCtor((records = []) => {
                const mutationList = Array.from(records || []);
                if (mutationList.length === 0 || mutationList.some(shouldScanMutation)) {
                    scan();
                    scheduleSettledRescans();
                }
            });
            observer.observe(observationTarget, {
                childList: true,
                subtree: true,
                characterData: true,
                attributes: true,
                attributeFilter: Array.from(OBSERVED_VISIBILITY_ATTRIBUTES)
            });
        } catch {
            try { observer?.disconnect?.(); } catch {}
            observer = null;
        }
    }

    scan();
    scheduleSettledRescans();

    return () => {
        if (!active) return;
        active = false;
        lastDetectedDialog = null;
        clearSettledRescans();
        try { observer?.disconnect?.(); } catch {}
        observer = null;
    };
}
