import test from "node:test";
import assert from "node:assert/strict";

import {
    findChatGPTRateLimitDialog,
    installChatGPTRateLimitDialogObserver
} from "../src/sites/chatgpt/rate-limit-dialog.js";

function selectorParts(selector) {
    return String(selector || "").split(",").map(part => part.trim()).filter(Boolean);
}

function matchesOneSelector(element, selector) {
    if (/^[a-z][\w-]*$/i.test(selector)) return element.tagName === selector.toUpperCase();
    const idMatch = selector.match(/^#(.+)$/);
    if (idMatch) return element.getAttribute("id") === idMatch[1];

    const attributeMatch = selector.match(/^\[([\w-]+)="([^"]*)"\]$/);
    if (attributeMatch) return element.getAttribute(attributeMatch[1]) === attributeMatch[2];
    return false;
}

class FakeElement {
    constructor(tagName = "div", attributes = {}, text = "") {
        this.nodeType = 1;
        this.tagName = String(tagName).toUpperCase();
        this.attributes = new Map(Object.entries(attributes).map(([name, value]) => [String(name), String(value)]));
        this.children = [];
        this.parentNode = null;
        this.parentElement = null;
        this.hidden = false;
        this.isConnected = true;
        this.style = {};
        this.ownText = String(text);
        this.rect = { width: 500, height: 240, top: 20, bottom: 260, left: 20, right: 520 };
    }

    get id() {
        return this.getAttribute("id") || "";
    }

    get textContent() {
        return [this.ownText, ...this.children.map(child => child.textContent)].filter(Boolean).join(" ");
    }

    setAttribute(name, value) {
        this.attributes.set(String(name), String(value));
    }

    removeAttribute(name) {
        this.attributes.delete(String(name));
    }

    getAttribute(name) {
        return this.attributes.has(String(name)) ? this.attributes.get(String(name)) : null;
    }

    hasAttribute(name) {
        return this.attributes.has(String(name));
    }

    appendChild(child) {
        child.parentNode = this;
        child.parentElement = this;
        this.children.push(child);
        return child;
    }

    matches(selector) {
        return selectorParts(selector).some(part => matchesOneSelector(this, part));
    }

    closest(selector) {
        let element = this;
        while (element) {
            if (element.matches(selector)) return element;
            element = element.parentElement;
        }
        return null;
    }

    querySelectorAll(selector) {
        const matches = [];
        const visit = (element) => {
            for (const child of element.children) {
                if (child.matches(selector)) matches.push(child);
                visit(child);
            }
        };
        visit(this);
        return matches;
    }

    querySelector(selector) {
        return this.querySelectorAll(selector)[0] || null;
    }

    getBoundingClientRect() {
        return { ...this.rect };
    }
}

class FakeDocument {
    constructor() {
        this.nodeType = 9;
        this.documentElement = new FakeElement("html");
        this.body = this.documentElement.appendChild(new FakeElement("body"));
    }

    querySelectorAll(selector) {
        const matches = [];
        if (this.documentElement.matches(selector)) matches.push(this.documentElement);
        matches.push(...this.documentElement.querySelectorAll(selector));
        return matches;
    }
}

class FakeMutationObserver {
    static instances = [];

    constructor(callback) {
        this.callback = callback;
        this.target = null;
        this.options = null;
        this.disconnected = false;
        FakeMutationObserver.instances.push(this);
    }

    observe(target, options) {
        this.target = target;
        this.options = options;
    }

    disconnect() {
        this.disconnected = true;
    }

    trigger(records = []) {
        this.callback(records, this);
    }
}

const LIVE_BODY = "You’re making requests too quickly. We’ve temporarily limited access to your conversations to protect your data. Please wait a few minutes before trying again.";

function appendLiveDialog(document, {
    rootAttribute = "id",
    role = "dialog",
    state = "open",
    title = "Too many requests",
    body = LIVE_BODY
} = {}) {
    const modalRoot = document.body.appendChild(new FakeElement("div", {
        [rootAttribute]: "modal-conversation-history-rate-limit"
    }));
    const dialog = modalRoot.appendChild(new FakeElement("div", { role, "data-state": state }));
    dialog.appendChild(new FakeElement("h2", {}, title));
    dialog.appendChild(new FakeElement("div", {}, body));
    dialog.appendChild(new FakeElement("button", {}, "Got it"));
    return { modalRoot, dialog };
}

test("finds the observed ChatGPT rate-limit modal by id and live text", () => {
    const document = new FakeDocument();
    const { dialog } = appendLiveDialog(document);

    assert.equal(findChatGPTRateLimitDialog(document), dialog);
});

test("finds the observed modal by data-testid and tolerates split whitespace", () => {
    const document = new FakeDocument();
    const { dialog } = appendLiveDialog(document, {
        rootAttribute: "data-testid",
        title: " Too\n many\t requests ",
        body: "You’re making requests too quickly."
    });

    assert.equal(findChatGPTRateLimitDialog(document), dialog);
});

test("the dedicated rate-limit modal selector survives localized or revised copy", () => {
    const document = new FakeDocument();
    const { dialog } = appendLiveDialog(document, { title: "请求过多", body: "请稍后重试。" });

    assert.equal(findChatGPTRateLimitDialog(document), dialog);
});

test("generic role-dialog fallback requires both the title and strong body signals", () => {
    const document = new FakeDocument();
    const dialog = document.body.appendChild(new FakeElement("div", { role: "dialog", "data-state": "open" }));
    dialog.appendChild(new FakeElement("h2", {}, "Too many requests"));
    dialog.appendChild(new FakeElement("p", {}, LIVE_BODY));

    assert.equal(findChatGPTRateLimitDialog(document), dialog);
});

test("does not match a generic dialog from the title alone", () => {
    const document = new FakeDocument();
    document.body.appendChild(new FakeElement("div", { role: "dialog" }, "Too many requests Got it"));

    assert.equal(findChatGPTRateLimitDialog(document), null);
});

test("does not match ordinary conversation content quoting the complete error", () => {
    const document = new FakeDocument();
    document.body.appendChild(new FakeElement("article", {}, `Too many requests ${LIVE_BODY}`));

    assert.equal(findChatGPTRateLimitDialog(document), null);
});

test("rejects hidden, closed, and QuickInput-owned matching dialogs", () => {
    const hiddenDocument = new FakeDocument();
    const hidden = appendLiveDialog(hiddenDocument);
    hidden.dialog.hidden = true;
    assert.equal(findChatGPTRateLimitDialog(hiddenDocument), null);

    const closedDocument = new FakeDocument();
    appendLiveDialog(closedDocument, { state: "closed" });
    assert.equal(findChatGPTRateLimitDialog(closedDocument), null);

    const overlayDocument = new FakeDocument();
    const overlay = overlayDocument.body.appendChild(new FakeElement("div", { id: "chatgpt-quick-input-overlay" }));
    const modalRoot = overlay.appendChild(new FakeElement("div", { id: "modal-conversation-history-rate-limit" }));
    modalRoot.appendChild(new FakeElement("div", { role: "dialog" }, `Too many requests ${LIVE_BODY}`));
    assert.equal(findChatGPTRateLimitDialog(overlayDocument), null);
});

test("observer initial-scans and uses the required mutation and visibility options", () => {
    FakeMutationObserver.instances = [];
    const document = new FakeDocument();
    const { dialog } = appendLiveDialog(document);
    const detected = [];

    const cleanup = installChatGPTRateLimitDialogObserver({
        root: document,
        onDetected: candidate => detected.push(candidate),
        MutationObserverCtor: FakeMutationObserver
    });

    assert.deepEqual(detected, [dialog]);
    assert.equal(FakeMutationObserver.instances.length, 1);
    const observer = FakeMutationObserver.instances[0];
    assert.equal(observer.target, document.body);
    assert.equal(observer.options.childList, true);
    assert.equal(observer.options.subtree, true);
    assert.equal(observer.options.characterData, true);
    assert.equal(observer.options.attributes, true);
    assert.ok(observer.options.attributeFilter.includes("aria-hidden"));
    assert.ok(observer.options.attributeFilter.includes("data-state"));

    cleanup();
    assert.equal(observer.disconnected, true);
});

test("observer detects later insertion once and reports the same dialog again only after it is hidden", () => {
    FakeMutationObserver.instances = [];
    const document = new FakeDocument();
    const detected = [];
    const cleanup = installChatGPTRateLimitDialogObserver({
        root: document,
        onDetected: candidate => detected.push(candidate),
        MutationObserverCtor: FakeMutationObserver
    });
    const observer = FakeMutationObserver.instances[0];

    const unrelated = document.body.appendChild(new FakeElement("article", {}, "ordinary response"));
    observer.trigger([{ type: "childList", target: document.body, addedNodes: [unrelated], removedNodes: [] }]);
    assert.deepEqual(detected, []);

    const { modalRoot, dialog } = appendLiveDialog(document);
    observer.trigger([{ type: "childList", target: document.body, addedNodes: [modalRoot], removedNodes: [] }]);
    observer.trigger([{ type: "characterData", target: dialog.children[0], addedNodes: [], removedNodes: [] }]);
    assert.deepEqual(detected, [dialog]);

    dialog.setAttribute("aria-hidden", "true");
    observer.trigger([{ type: "attributes", target: dialog, addedNodes: [], removedNodes: [] }]);
    dialog.removeAttribute("aria-hidden");
    observer.trigger([{ type: "attributes", target: dialog, addedNodes: [], removedNodes: [] }]);
    assert.deepEqual(detected, [dialog, dialog]);

    cleanup();
    observer.trigger();
    assert.deepEqual(detected, [dialog, dialog]);
});

test("observer performs bounded settled rescans for a dialog that fades in after insertion", () => {
    FakeMutationObserver.instances = [];
    const document = new FakeDocument();
    const { dialog } = appendLiveDialog(document);
    dialog.style.opacity = "0";
    const detected = [];
    const timers = [];

    const cleanup = installChatGPTRateLimitDialogObserver({
        root: document,
        onDetected: candidate => detected.push(candidate),
        MutationObserverCtor: FakeMutationObserver,
        setTimeoutFn: (callback, delayMs) => {
            const timer = { callback, delayMs, cleared: false };
            timers.push(timer);
            return timer;
        },
        clearTimeoutFn: timer => {
            timer.cleared = true;
        }
    });

    assert.deepEqual(detected, []);
    assert.deepEqual(timers.map(timer => timer.delayMs), [50, 300]);

    dialog.style.opacity = "1";
    timers[0].callback();
    assert.deepEqual(detected, [dialog]);

    cleanup();
    assert.equal(timers[1].cleared, true);
});

test("observer detects a mounted native dialog when its open attribute is toggled", () => {
    FakeMutationObserver.instances = [];
    const document = new FakeDocument();
    const modalRoot = document.body.appendChild(new FakeElement("div", {
        id: "modal-conversation-history-rate-limit"
    }));
    const dialog = modalRoot.appendChild(new FakeElement("dialog"));
    dialog.appendChild(new FakeElement("h2", {}, "Too many requests"));
    const detected = [];

    const cleanup = installChatGPTRateLimitDialogObserver({
        root: document,
        onDetected: candidate => detected.push(candidate),
        MutationObserverCtor: FakeMutationObserver
    });
    const observer = FakeMutationObserver.instances[0];

    assert.equal(findChatGPTRateLimitDialog(document), null);
    assert.deepEqual(detected, []);
    assert.ok(observer.options.attributeFilter.includes("open"));

    dialog.setAttribute("open", "");
    observer.trigger([{ type: "attributes", target: dialog, addedNodes: [], removedNodes: [] }]);
    assert.deepEqual(detected, [dialog]);

    cleanup();
});
