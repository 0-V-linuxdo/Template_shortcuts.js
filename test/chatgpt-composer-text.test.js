import test from "node:test";
import assert from "node:assert/strict";

import {
    analyzeChatGPTComposerText,
    serializeChatGPTComposerText
} from "../src/sites/chatgpt/composer-text.js";

function text(value) {
    return {
        nodeType: 3,
        nodeValue: String(value),
        parentNode: null,
        parentElement: null,
        get nextSibling() {
            const siblings = this.parentNode?.childNodes || [];
            const index = siblings.indexOf(this);
            return index >= 0 ? (siblings[index + 1] || null) : null;
        }
    };
}

function element(tagName, attributes = {}, childNodes = []) {
    const attributeMap = new Map(
        Object.entries(attributes).map(([name, value]) => [String(name), String(value)])
    );
    const node = {
        nodeType: 1,
        tagName: String(tagName).toUpperCase(),
        childNodes: [],
        children: [],
        parentNode: null,
        parentElement: null,
        contentEditable: attributeMap.get("contenteditable") || "inherit",
        classList: {
            contains(className) {
                return String(attributeMap.get("class") || "")
                    .split(/\s+/)
                    .filter(Boolean)
                    .includes(className);
            }
        },
        hasAttribute(name) {
            return attributeMap.has(String(name));
        },
        getAttribute(name) {
            return attributeMap.has(String(name)) ? attributeMap.get(String(name)) : null;
        },
        appendChild(child) {
            child.parentNode = this;
            child.parentElement = this;
            this.childNodes.push(child);
            if (child.nodeType === 1) this.children.push(child);
            return child;
        },
        get nextSibling() {
            const siblings = this.parentNode?.childNodes || [];
            const index = siblings.indexOf(this);
            return index >= 0 ? (siblings[index + 1] || null) : null;
        }
    };

    for (const child of childNodes) node.appendChild(child);
    return node;
}

function inlineSelectionPill(label = "Create image", separatorAndPrompt = " ") {
    const cursor = element("span", {
        "data-inline-selection-pill-cursor-target": "",
        "aria-hidden": "true",
        contenteditable: "false"
    }, [text("\uFEFF")]);
    const pill = element("span", {
        contenteditable: "false",
        class: "data-[system-hint-type=glaux]:cursor-pointer"
    }, [
        element("svg", { "aria-hidden": "true" }),
        element("span", { class: "truncate" }, [text(label)])
    ]);
    return [cursor, pill, text(separatorAndPrompt)];
}

function composer(...children) {
    return element("div", { contenteditable: "true" }, children);
}

test("omits a ChatGPT inline-selection pill and its owned separator", () => {
    const root = composer(element("p", {}, inlineSelectionPill("Create image", " ")));

    assert.deepEqual(analyzeChatGPTComposerText(root), {
        text: "",
        hasInlineSelectionNodes: true
    });
});

test("matches the observed lifecycle where a newly selected tool is rendered before the existing prompt", () => {
    const root = composer(element("p", {}, inlineSelectionPill(
        "Create image",
        " Draw a lighthouse"
    )));

    assert.equal(serializeChatGPTComposerText(root), "Draw a lighthouse");
});

test("also removes one non-breaking system separator", () => {
    const root = composer(element("p", {}, inlineSelectionPill(
        "Create image",
        "\u00A0Prompt"
    )));

    assert.equal(serializeChatGPTComposerText(root), "Prompt");
});

test("removes one system separator while preserving user-leading whitespace", () => {
    const root = composer(element("p", {}, inlineSelectionPill(
        "Create image",
        "  indented prompt"
    )));

    assert.equal(serializeChatGPTComposerText(root), " indented prompt");
});

test("recognizes the pill structurally rather than by its label", () => {
    const root = composer(element("p", {}, inlineSelectionPill(
        "创建图像（新版名称）",
        " 提示词"
    )));

    assert.equal(serializeChatGPTComposerText(root), "提示词");
});

test("treats native atomic @ mentions as semantic pills while preserving literal @ text", () => {
    const root = composer(element("p", {}, [
        ...inlineSelectionPill("@My GPT", " "),
        text("Ask @My GPT in plain text")
    ]));

    assert.equal(serializeChatGPTComposerText(root), "Ask @My GPT in plain text");
});

test("preserves literal @ text and unrelated contenteditable=false nodes", () => {
    const root = composer(element("p", {}, [
        text("@Create image "),
        element("span", { contenteditable: "false" }, [text("manual atom")])
    ]));

    assert.deepEqual(analyzeChatGPTComposerText(root), {
        text: "@Create image manual atom",
        hasInlineSelectionNodes: false
    });
});

test("preserves ordinary prompt text that starts with a tool label", () => {
    const root = composer(element("p", {}, [text("Create image comparisons")]));
    assert.equal(serializeChatGPTComposerText(root), "Create image comparisons");
});

test("handles multiple pills before a prompt", () => {
    const root = composer(element("p", {}, [
        ...inlineSelectionPill("Create image", " "),
        ...inlineSelectionPill("Search", " Find current examples")
    ]));

    assert.equal(serializeChatGPTComposerText(root), "Find current examples");
});

test("preserves multiline structure and ignores a trailing ProseMirror break", () => {
    const root = composer(
        element("p", {}, inlineSelectionPill("Create image", " First line")),
        element("p", {}, [
            text("Second line"),
            element("br", { class: "ProseMirror-trailingBreak" })
        ])
    );

    assert.equal(serializeChatGPTComposerText(root), "First line\nSecond line");
});

test("detects top-level pill nodes even when text lives in a separate block", () => {
    const root = composer(
        ...inlineSelectionPill("Create image", " "),
        element("p", {}, [text("Prompt in its own block")])
    );

    assert.deepEqual(analyzeChatGPTComposerText(root), {
        text: "Prompt in its own block",
        hasInlineSelectionNodes: true
    });
});

test("keeps an orphan cursor marker visible to clear-state checks", () => {
    const cursor = inlineSelectionPill()[0];
    const root = composer(element("p", {}, [cursor, text("Prompt")]));

    assert.deepEqual(analyzeChatGPTComposerText(root), {
        text: "Prompt",
        hasInlineSelectionNodes: true
    });
});
