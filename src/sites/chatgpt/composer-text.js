/* -------------------------------------------------------------------------- *
 * ChatGPT composer text serialization
 * -------------------------------------------------------------------------- */

export const CHATGPT_TEXT_BLOCK_SELECTOR = "p, li, blockquote, pre, h1, h2, h3, h4, h5, h6";

const CHATGPT_STRUCTURED_TEXT_TAGS = new Set([
    "P",
    "LI",
    "BLOCKQUOTE",
    "PRE",
    "UL",
    "OL",
    "H1",
    "H2",
    "H3",
    "H4",
    "H5",
    "H6"
]);

const CHATGPT_INLINE_SELECTION_CURSOR_ATTRIBUTE = "data-inline-selection-pill-cursor-target";

function getNodeType(node) {
    return Number(node?.nodeType) || 0;
}

function getChildNodes(node) {
    try {
        return Array.from(node?.childNodes || []);
    } catch {
        return [];
    }
}

function getNextSibling(node) {
    if (!node) return null;
    try {
        if ("nextSibling" in node) return node.nextSibling || null;
    } catch { }

    const parent = node.parentNode || null;
    if (!parent) return null;
    const siblings = getChildNodes(parent);
    const index = siblings.indexOf(node);
    return index >= 0 ? (siblings[index + 1] || null) : null;
}

function hasNodeAttribute(node, name) {
    if (!node || getNodeType(node) !== 1) return false;
    try {
        if (typeof node.hasAttribute === "function") return node.hasAttribute(name);
    } catch { }
    try {
        const value = node.getAttribute?.(name);
        return value !== null && value !== undefined;
    } catch {
        return false;
    }
}

function getNodeAttribute(node, name) {
    if (!node || getNodeType(node) !== 1) return null;
    try {
        const value = node.getAttribute?.(name);
        return value === null || value === undefined ? null : String(value);
    } catch {
        return null;
    }
}

function isContentEditableFalse(node) {
    const attributeValue = getNodeAttribute(node, "contenteditable");
    if (attributeValue !== null) return attributeValue.toLowerCase() === "false";
    try {
        return String(node?.contentEditable || "").toLowerCase() === "false";
    } catch {
        return false;
    }
}

export function isChatGPTInlineSelectionCursorTarget(node) {
    return hasNodeAttribute(node, CHATGPT_INLINE_SELECTION_CURSOR_ATTRIBUTE);
}

function findChatGPTInlineSelectionPill(cursorNode) {
    if (!isChatGPTInlineSelectionCursorTarget(cursorNode)) return null;

    let candidate = getNextSibling(cursorNode);
    while (candidate && getNodeType(candidate) === 8) {
        candidate = getNextSibling(candidate);
    }

    if (getNodeType(candidate) !== 1) return null;
    if (isChatGPTInlineSelectionCursorTarget(candidate)) return null;
    return isContentEditableFalse(candidate) ? candidate : null;
}

function stripChatGPTPillSeparator(value) {
    return String(value || "").replace(
        /^([\u200B\u200C\u200D\u2060\uFEFF]*)(?: |\u00A0)/,
        "$1"
    );
}

function collectChatGPTComposerTextFilter(root) {
    const excludedNodes = new Set();
    const separatorTextNodes = new Set();

    const visit = (node) => {
        if (!node) return;

        if (isChatGPTInlineSelectionCursorTarget(node)) {
            excludedNodes.add(node);
            const pill = findChatGPTInlineSelectionPill(node);
            if (pill) {
                excludedNodes.add(pill);
                const separator = getNextSibling(pill);
                if (getNodeType(separator) === 3 && /^[\u200B\u200C\u200D\u2060\uFEFF]*(?: |\u00A0)/.test(String(separator?.nodeValue || ""))) {
                    separatorTextNodes.add(separator);
                }
            }
        }

        for (const child of getChildNodes(node)) {
            visit(child);
        }
    };

    visit(root);
    return {
        excludedNodes,
        separatorTextNodes,
        hasInlineSelectionNodes: excludedNodes.size > 0
    };
}

export function isChatGPTStructuredTextElement(node) {
    return CHATGPT_STRUCTURED_TEXT_TAGS.has(String(node?.tagName || "").toUpperCase());
}

export function isChatGPTTrailingBreak(node) {
    if (!node || String(node.tagName || "").toUpperCase() !== "BR") return false;
    try {
        if (!node.classList?.contains("ProseMirror-trailingBreak")) return false;
    } catch {
        return false;
    }
    const parent = node.parentElement || node.parentNode || null;
    if (!parent) return true;
    const siblings = getChildNodes(parent).filter(Boolean);
    return siblings[siblings.length - 1] === node;
}

function serializeChatGPTInlineText(node, filter, { preserveWhitespace = false } = {}) {
    if (!node || filter.excludedNodes.has(node)) return "";

    const nodeType = getNodeType(node);
    if (nodeType === 3) {
        const value = String(node.nodeValue || "");
        return filter.separatorTextNodes.has(node) ? stripChatGPTPillSeparator(value) : value;
    }
    if (nodeType !== 1) return "";

    const tag = String(node.tagName || "").toUpperCase();
    if (tag === "BR") {
        return isChatGPTTrailingBreak(node) ? "" : "\n";
    }

    const nextPreserveWhitespace = preserveWhitespace || tag === "PRE";
    let text = "";
    for (const child of getChildNodes(node)) {
        text += serializeChatGPTInlineText(child, filter, { preserveWhitespace: nextPreserveWhitespace });
    }
    return text;
}

function serializeChatGPTStructuredText(node, filter) {
    if (!node || filter.excludedNodes.has(node)) return "";

    const nodeType = getNodeType(node);
    if (nodeType === 3) {
        const value = String(node.nodeValue || "");
        return filter.separatorTextNodes.has(node) ? stripChatGPTPillSeparator(value) : value;
    }
    if (nodeType !== 1) return "";

    const tag = String(node.tagName || "").toUpperCase();
    if (tag === "UL" || tag === "OL") {
        const items = Array.from(node.children || [])
            .filter(child => String(child?.tagName || "").toUpperCase() === "LI")
            .map(child => serializeChatGPTStructuredText(child, filter));
        return items.join("\n");
    }

    const structuredChildren = getChildNodes(node)
        .filter(child => isChatGPTStructuredTextElement(child));
    if (structuredChildren.length > 0) {
        return structuredChildren.map(child => serializeChatGPTStructuredText(child, filter)).join("\n");
    }

    return serializeChatGPTInlineText(node, filter, { preserveWhitespace: tag === "PRE" });
}

export function analyzeChatGPTComposerText(composerEl) {
    if (!composerEl) {
        return { text: "", hasInlineSelectionNodes: false };
    }

    const filter = collectChatGPTComposerTextFilter(composerEl);
    const topLevelBlocks = getChildNodes(composerEl)
        .filter(child => isChatGPTStructuredTextElement(child));
    const text = topLevelBlocks.length > 0
        ? topLevelBlocks.map(child => serializeChatGPTStructuredText(child, filter)).join("\n")
        : serializeChatGPTInlineText(composerEl, filter);

    return {
        text,
        hasInlineSelectionNodes: filter.hasInlineSelectionNodes
    };
}

export function serializeChatGPTComposerText(composerEl) {
    return analyzeChatGPTComposerText(composerEl).text;
}
