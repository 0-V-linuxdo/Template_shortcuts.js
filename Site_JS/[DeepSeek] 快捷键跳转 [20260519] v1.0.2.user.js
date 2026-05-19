// ==UserScript==
// @name           [DeepSeek] 快捷键跳转 [20260519] v1.0.2
// @name:en        [DeepSeek] Shortcut Jump [20260519] v1.0.2
// @namespace      0_V userscripts/[DeepSeek] shortcut
// @description    为 DeepSeek Chat 添加自定义快捷键(跳转/点击/模拟按键、可视化设置面板、按类型筛选、深色模式、自适应布局、图标缓存、快捷键捕获等功能)，基于模版重构。#refactor2025
// @description:en Adds custom shortcuts for DeepSeek Chat with URL jumps, clicks, simulated keys, a visual settings panel, filters, dark mode, responsive layout, icon cache, and shortcut capture.

// @version        [20260519] v1.0.2
// @update-log     1.0.2: 新增默认 Expert 模式开关，页面加载、路由变化和可见性恢复时自动选中 Expert，交互方式参考 Gemini 固定 sidebar。
// @update-log:en  1.0.2: Added a default Expert mode switch that auto-selects Expert on load, route changes, and visibility restore, following the Gemini keep-sidebar interaction pattern.

// @match          https://chat.deepseek.com/*

// @grant          GM_registerMenuCommand
// @grant          GM_getValue
// @grant          GM_setValue
// @grant          GM_xmlhttpRequest
// @grant          GM_unregisterMenuCommand

// @connect        *

// @icon           data:image/svg+xml,%3Csvg%20viewBox%3D%220%200%2064%2064%22%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20aria-hidden%3D%22true%22%20role%3D%22img%22%20preserveAspectRatio%3D%22xMidYMid%20meet%22%20class%3D%22deepseek-keycap-icon%22%3E%20%3Cstyle%3E%20%3Aroot%20%7B%20color-scheme%3A%20light%20dark%3B%20%7D%20.deepseek-keycap-icon%20%7B%20color%3A%20%23000000%3B%20%7D%20%40media%20(prefers-color-scheme%3A%20dark)%20%7B%20.deepseek-keycap-icon%20%7B%20color%3A%20%23FFFFFF%3B%20%7D%20%7D%20%3C%2Fstyle%3E%20%3Cpath%20d%3D%22M52%202H12C6.478%202%202%206.477%202%2011.999V52c0%205.522%204.478%2010%2010%2010h40c5.522%200%2010-4.478%2010-10V11.999C62%206.477%2057.522%202%2052%202zm5%2043.666A8.333%208.333%200%200%201%2048.667%2054H15.333A8.333%208.333%200%200%201%207%2045.666V12.333A8.332%208.332%200%200%201%2015.333%204h33.334A8.332%208.332%200%200%201%2057%2012.333v33.333z%22%20fill%3D%22currentColor%22%20fill-rule%3D%22evenodd%22%20clip-rule%3D%22evenodd%22%3E%3C%2Fpath%3E%20%3Cg%20transform%3D%22translate(32%2C32)%20scale(1.5)%20translate(-12%2C-13.5)%22%3E%3Cpath%20d%3D%22M23.748%204.482c-.254-.124-.364.113-.512.234-.051.039-.094.09-.137.136-.372.397-.806.657-1.373.626-.829-.046-1.537.214-2.163.848-.133-.782-.575-1.248-1.247-1.548-.352-.156-.708-.311-.955-.65-.172-.241-.219-.51-.305-.774-.055-.16-.11-.323-.293-.35-.2-.031-.278.136-.356.276-.313.572-.434%201.202-.422%201.84.027%201.436.633%202.58%201.838%203.393.137.093.172.187.129.323-.082.28-.18.552-.266.833-.055.179-.137.217-.329.14a5.526%205.526%200%2001-1.736-1.18c-.857-.828-1.631-1.742-2.597-2.458a11.365%2011.365%200%2000-.689-.471c-.985-.957.13-1.743.388-1.836.27-.098.093-.432-.779-.428-.872.004-1.67.295-2.687.684a3.055%203.055%200%2001-.465.137%209.597%209.597%200%2000-2.883-.102c-1.885.21-3.39%201.102-4.497%202.623C.082%208.606-.231%2010.684.152%2012.85c.403%202.284%201.569%204.175%203.36%205.653%201.858%201.533%203.997%202.284%206.438%202.14%201.482-.085%203.133-.284%204.994-1.86.47.234.962.327%201.78.397.63.059%201.236-.03%201.705-.128.735-.156.684-.837.419-.961-2.155-1.004-1.682-.595-2.113-.926%201.096-1.296%202.746-2.642%203.392-7.003.05-.347.007-.565%200-.845-.004-.17.035-.237.23-.256a4.173%204.173%200%20001.545-.475c1.396-.763%201.96-2.015%202.093-3.517.02-.23-.004-.467-.247-.588zM11.581%2018c-2.089-1.642-3.102-2.183-3.52-2.16-.392.024-.321.471-.235.763.09.288.207.486.371.739.114.167.192.416-.113.603-.673.416-1.842-.14-1.897-.167-1.361-.802-2.5-1.86-3.301-3.307-.774-1.393-1.224-2.887-1.298-4.482-.02-.386.093-.522.477-.592a4.696%204.696%200%20011.529-.039c2.132.312%203.946%201.265%205.468%202.774.868.86%201.525%201.887%202.202%202.891.72%201.066%201.494%202.082%202.48%202.914.348.292.625.514.891.677-.802.09-2.14.11-3.054-.614zm1-6.44a.306.306%200%2001.415-.287.302.302%200%2001.2.288.306.306%200%2001-.31.307.303.303%200%2001-.304-.308zm3.11%201.596c-.2.081-.399.151-.59.16a1.245%201.245%200%2001-.798-.254c-.274-.23-.47-.358-.552-.758a1.73%201.73%200%2001.016-.588c.07-.327-.008-.537-.239-.727-.187-.156-.426-.199-.688-.199a.559.559%200%2001-.254-.078c-.11-.054-.2-.19-.114-.358.028-.054.16-.186.192-.21.356-.202.767-.136%201.146.016.352.144.618.408%201.001.782.391.451.462.576.685.914.176.265.336.537.445.848.067.195-.019.354-.25.452z%22%20fill%3D%22%234D6BFE%22%3E%3C%2Fpath%3E%3C%2Fg%3E%20%3C%2Fsvg%3E
// @require        https://github.com/0-V-linuxdo/Template_shortcuts.js/raw/refs/heads/release/Template_JS/%5BTemplate%5D%20shortcut%20core.js?v=20260519.1.0.0
// ==/UserScript==

/* ===================== IMPORTANT · NOTICE · START =====================
 *
 * 1. [编辑指引 | Edit Guidance]
 *    • ⚠️ 这是一个自动生成的文件：请不要直接修改当前产物。
 *    • ⚠️ 源码真源位于当前仓库 `main` 分支的 `src/modules/` 与 `src/sites/`；站点元数据位于 `src/sites/manifest.js`；Template 头部元数据位于 `src/userscript/header.txt`。
 *    • ⚠️ 在 `main` 分支运行 `npm run build` 会刷新本地 `Template_JS/` 与 `Site_JS/`。
 *    • ⚠️ 最新发布物应同步到当前仓库的 `release` 分支；release userscript 通过 `@require` 加载 `Template_JS/[Template] shortcut core.js`；`archive/` 仅保存历史归档与参考资料，不参与当前运行时加载。
 *    • ⚠️ This is a generated artifact. Do not edit this file directly. The source of truth lives in the current repository's `main` branch under `src/modules/`, `src/sites/`, `src/sites/manifest.js`, and `src/userscript/header.txt`. Run `npm run build` on `main` to refresh local `Template_JS/` and `Site_JS/` outputs, then stage release assets for the repository's `release` branch.
 *
 * ----------------------------------------------------------------------
 *
 * 2. [安全提示 | Safety Reminder]
 *    • ✅ 必须使用 `setTrustedHTML`，不得使用 `innerHTML`。
 *    • ✅ Always call `setTrustedHTML`; never rely on `innerHTML`.
 *
 * ====================== IMPORTANT · NOTICE · END ======================
 */

(() => {
  // src/sites/deepseek/index.js
  (function() {
    "use strict";
    const ShortcutTemplate = window.ShortcutTemplate;
    if (!ShortcutTemplate || typeof ShortcutTemplate.createShortcutEngine !== "function") {
      console.error("[DeepSeek Shortcut] Template module not found.");
      return;
    }
    function gmGetValueLocal(key, fallback) {
      if (typeof GM_getValue !== "function") return fallback;
      try {
        const value = GM_getValue(key, fallback);
        if (value && typeof value.then === "function") return fallback;
        return value === void 0 ? fallback : value;
      } catch {
        return fallback;
      }
    }
    function gmSetValueLocal(key, value) {
      if (typeof GM_setValue !== "function") return;
      try {
        GM_setValue(key, value);
      } catch {
      }
    }
    function gmRegisterMenuCommandLocal(label, handler) {
      if (typeof GM_registerMenuCommand !== "function") return null;
      try {
        return GM_registerMenuCommand(label, handler);
      } catch {
        return null;
      }
    }
    function gmUnregisterMenuCommandLocal(commandId) {
      if (typeof GM_unregisterMenuCommand !== "function") return;
      try {
        GM_unregisterMenuCommand(commandId);
      } catch {
      }
    }
    function getLocalStorageLocal() {
      try {
        return globalThis.localStorage || null;
      } catch {
        return null;
      }
    }
    function getLocalBooleanFallback(key, fallback) {
      const storage = getLocalStorageLocal();
      const storageKey = String(key || "").trim();
      if (!storage || !storageKey) return fallback;
      try {
        const raw = storage.getItem(storageKey);
        if (raw == null) return fallback;
        if (raw === "true" || raw === "1") return true;
        if (raw === "false" || raw === "0") return false;
        const parsed = JSON.parse(raw);
        if (typeof parsed === "boolean") return parsed;
      } catch {
      }
      return fallback;
    }
    function setLocalBooleanFallback(key, value) {
      const storage = getLocalStorageLocal();
      const storageKey = String(key || "").trim();
      if (!storage || !storageKey) return;
      try {
        storage.setItem(storageKey, JSON.stringify(!!value));
      } catch {
      }
    }
    const LOG_TAG = "[DeepSeek Shortcut Script]";
    const SHORTCUTS_STORAGE_KEY = "deepseek_shortcuts_v1";
    const ICON_CACHE_PREFIX = "deepseek_icon_cache_v1::";
    const USER_ICONS_STORAGE_KEY = "deepseek_user_icons_v1";
    const DEFAULTS_MIGRATION_KEY = "deepseek_defaults_migrated_20260519_v1";
    const DEFAULT_EXPERT_MODE_STORAGE_KEY = "deepseek_default_expert_mode_v1";
    const DEFAULT_EXPERT_MODE_ENABLED = true;
    const DEFAULT_EXPERT_MODE_REQUEST_COOLDOWN_MS = 1200;
    const TemplateUtils = ShortcutTemplate?.utils || {};
    const TemplateDomUtils = TemplateUtils?.dom || {};
    const TemplateEventUtils = TemplateUtils?.events || {};
    function cloneShortcutRecord(shortcut) {
      if (!shortcut || typeof shortcut !== "object") return null;
      try {
        return JSON.parse(JSON.stringify(shortcut));
      } catch {
        return { ...shortcut };
      }
    }
    function normalizeDeepSeekToken(value) {
      return String(value ?? "").replace(/\s+/g, " ").trim().toLowerCase();
    }
    function isVisibleElement(element) {
      if (!element || typeof element.getBoundingClientRect !== "function") return false;
      if (typeof TemplateDomUtils.isVisible === "function") {
        try {
          if (!TemplateDomUtils.isVisible(element)) return false;
        } catch {
        }
      }
      const rect = element.getBoundingClientRect();
      if (!rect || rect.width <= 0 || rect.height <= 0) return false;
      const style = window.getComputedStyle ? window.getComputedStyle(element) : null;
      return !style || style.display !== "none" && style.visibility !== "hidden" && style.opacity !== "0";
    }
    function safeQuerySelectorAllLocal(selector) {
      const raw = String(selector || "").trim();
      if (!raw) return [];
      if (typeof TemplateDomUtils.safeQuerySelectorAll === "function") {
        try {
          return TemplateDomUtils.safeQuerySelectorAll(document, raw) || [];
        } catch {
        }
      }
      try {
        return Array.from(document.querySelectorAll(raw));
      } catch {
        return [];
      }
    }
    function getClickableTarget(element) {
      if (!element || typeof element.closest !== "function") return element || null;
      return element.closest("button, a[href], [role='button'], [onclick], label") || element;
    }
    function clickDeepSeekElement(element) {
      const target = getClickableTarget(element);
      if (!target || !isVisibleElement(target)) return false;
      try {
        if (typeof TemplateEventUtils.simulateClick === "function") {
          const ok = TemplateEventUtils.simulateClick(target, { nativeFallback: true });
          if (ok) return true;
        }
      } catch {
      }
      try {
        if (typeof target.click === "function") {
          target.click();
          return true;
        }
      } catch {
      }
      try {
        const event = new MouseEvent("click", { bubbles: true, cancelable: true, composed: true, view: window });
        target.dispatchEvent(event);
        return true;
      } catch {
        return false;
      }
    }
    function clickCssSelector(selector) {
      const matches = safeQuerySelectorAllLocal(selector);
      for (const match of matches) {
        const target = getClickableTarget(match);
        if (target && isVisibleElement(target) && clickDeepSeekElement(target)) return true;
      }
      return false;
    }
    function getElementLabelText(element) {
      if (!element) return "";
      const parts = [
        element.getAttribute?.("aria-label"),
        element.getAttribute?.("title"),
        element.innerText,
        element.textContent
      ].filter(Boolean);
      return parts.join(" ");
    }
    function matchesAnyLabel(element, labels, { exact = true } = {}) {
      const text = normalizeDeepSeekToken(getElementLabelText(element));
      if (!text) return false;
      return labels.some((label) => {
        const expected = normalizeDeepSeekToken(label);
        return exact ? text === expected : text.includes(expected);
      });
    }
    function getInteractiveCandidates() {
      return Array.from(document.querySelectorAll("button, a[href], [role='button'], [aria-pressed], [tabindex]")).filter(isVisibleElement);
    }
    function getVisibleComposerInputs() {
      return Array.from(document.querySelectorAll("textarea, [contenteditable='true'], [role='textbox']")).filter(isVisibleElement).sort((a, b) => {
        const ar = a.getBoundingClientRect();
        const br = b.getBoundingClientRect();
        return ar.top - br.top || ar.left - br.left || ar.width * ar.height - br.width * br.height;
      });
    }
    function getRectCenter(rect) {
      return {
        x: rect.left + rect.width / 2,
        y: rect.top + rect.height / 2
      };
    }
    function findComposerToggle(labels) {
      const candidates = getInteractiveCandidates().map((element) => {
        if (matchesAnyLabel(element, labels, { exact: true })) return { element, exact: true };
        if (matchesAnyLabel(element, labels, { exact: false })) return { element, exact: false };
        return null;
      }).filter(Boolean);
      if (!candidates.length) return null;
      const composerInput = getVisibleComposerInputs()[0] || null;
      if (!composerInput) {
        return candidates.find((item) => item.exact)?.element || candidates[0].element;
      }
      const anchorRect = composerInput.getBoundingClientRect();
      const anchorCenter = getRectCenter(anchorRect);
      return candidates.map(({ element, exact }) => {
        const rect = element.getBoundingClientRect();
        const center = getRectCenter(rect);
        const verticalGap = rect.bottom < anchorRect.top ? anchorRect.top - rect.bottom : rect.top > anchorRect.bottom ? rect.top - anchorRect.bottom : 0;
        const horizontalGap = rect.right < anchorRect.left ? anchorRect.left - rect.right : rect.left > anchorRect.right ? rect.left - anchorRect.right : 0;
        const score = (exact ? 0 : 1e3) + verticalGap * 3 + horizontalGap + Math.abs(center.y - anchorCenter.y) + Math.abs(center.x - anchorCenter.x) * 0.25;
        return { element, score };
      }).sort((a, b) => a.score - b.score)[0]?.element || null;
    }
    function findExactTextElement(labels) {
      const expected = labels.map(normalizeDeepSeekToken);
      const elements = Array.from(document.querySelectorAll("button, a[href], [role='button'], [onclick], div, span"));
      return elements.filter(isVisibleElement).filter((element) => expected.includes(normalizeDeepSeekToken(element.innerText || element.textContent || ""))).sort((a, b) => {
        const ar = a.getBoundingClientRect();
        const br = b.getBoundingClientRect();
        return ar.width * ar.height - br.width * br.height;
      })[0] || null;
    }
    function findTopHeaderIconButton(indexFromLeft = 0) {
      const buttons = getInteractiveCandidates().filter((element) => {
        const rect = element.getBoundingClientRect();
        const text = normalizeDeepSeekToken(element.innerText || element.textContent || element.getAttribute?.("aria-label") || "");
        return rect.top >= 0 && rect.top < 90 && rect.left >= 0 && rect.left < 420 && rect.width >= 16 && rect.width <= 56 && rect.height >= 16 && rect.height <= 56 && !text;
      }).sort((a, b) => a.getBoundingClientRect().left - b.getBoundingClientRect().left);
      return buttons[indexFromLeft] || buttons[0] || buttons[buttons.length - 1] || null;
    }
    function navigateToDeepSeekHome() {
      try {
        const home = `${location.origin}/`;
        if (location.href !== home) {
          location.assign(home);
          return true;
        }
      } catch {
      }
      return false;
    }
    function formatDeepSeekTemplateText(text, params = {}) {
      return String(text || "").replace(/\{([^{}]+)\}/g, (match, key) => {
        return Object.prototype.hasOwnProperty.call(params, key) ? String(params[key]) : match;
      });
    }
    function siteMessage(engine2, key, params = {}, fallback = "") {
      if (engine2?.i18n && typeof engine2.i18n.t === "function") {
        try {
          const value = engine2.i18n.t(key, params, fallback);
          if (String(value || "").trim()) return value;
        } catch {
        }
      }
      return formatDeepSeekTemplateText(fallback, params);
    }
    const defaultIconURL = "https://chat.deepseek.com/favicon.svg";
    const defaultIcons = [
      { name: "DeepSeek", url: "https://chat.deepseek.com/favicon.svg" },
      { name: "ChatGPT", url: "https://cdn.oaistatic.com/assets/favicon-o20kmmos.svg" },
      { name: "Claude", url: "https://claude.ai/favicon.ico" },
      { name: "Google", url: "https://www.google.com/favicon.ico" },
      { name: "Bing", url: "https://www.bing.com/favicon.ico" },
      { name: "DuckDuckGo", url: "https://duckduckgo.com/favicon.ico" },
      { name: "Baidu", url: "https://www.baidu.com/favicon.ico" },
      { name: "Wikipedia", url: "https://www.wikipedia.org/static/favicon/wikipedia.ico" },
      { name: "Reddit", url: "https://www.reddit.com/favicon.ico" },
      { name: "Stack Overflow", url: "https://cdn.sstatic.net/Sites/stackoverflow/Img/favicon.ico" },
      { name: "GitHub", url: "https://github.githubassets.com/favicons/favicon.svg" },
      { name: "Twitter / X", url: "https://abs.twimg.com/favicons/twitter.3.ico" },
      { name: "Bilibili", url: "https://www.bilibili.com/favicon.ico" },
      { name: "YouTube", url: "https://www.youtube.com/favicon.ico" }
    ];
    const protectedIconUrls = [
      "https://chat.deepseek.com/favicon.svg"
    ];
    const SITE_MESSAGES = Object.freeze({
      "zh-CN": {
        menuCommandLabel: "DeepSeek - 设置快捷键",
        panelTitle: "DeepSeek - 自定义快捷键",
        defaultExpertModeLabel: "DeepSeek - 默认 Expert 模式: {state}",
        on: "开",
        off: "关",
        shortcuts: {
          "新聊天": "新聊天",
          "Search 按钮": "Search 按钮",
          "DeepThink 按钮": "DeepThink 按钮",
          "侧边栏": "侧边栏"
        }
      },
      "en-US": {
        menuCommandLabel: "DeepSeek - Shortcut settings",
        panelTitle: "DeepSeek - Custom shortcuts",
        defaultExpertModeLabel: "DeepSeek - Default Expert mode: {state}",
        on: "On",
        off: "Off",
        shortcuts: {
          "新聊天": "New chat",
          "Search 按钮": "Search button",
          "DeepThink 按钮": "DeepThink button",
          "侧边栏": "Sidebar"
        }
      }
    });
    const DEEPSEEK_DEFAULT_SHORTCUTS_BY_KEY = Object.freeze({
      newChat: {
        name: "新聊天",
        actionType: "selector",
        selector: "button[aria-label*='New'], button[title*='New'], a[href='/'], a[href='/chat'], a[href='/a/chat']",
        hotkey: "CTRL+N",
        icon: "https://chat.deepseek.com/favicon.svg"
      },
      searchToggle: {
        name: "Search 按钮",
        actionType: "selector",
        selector: "div:has(textarea) button[aria-label*='Search'], div:has(textarea) [role='button'][aria-label*='Search'], div:has([contenteditable='true']) button[aria-label*='Search'], div:has([contenteditable='true']) [role='button'][aria-label*='Search'], button:has(svg path[d*='M7.00003']), [role='button']:has(svg path[d*='M7.00003'])",
        hotkey: "CTRL+W",
        icon: "data:image/svg+xml,%3Csvg%20width%3D%2214%22%20height%3D%2214%22%20viewBox%3D%220%200%2014%2014%22%20fill%3D%22none%22%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%3E%3Cpath%20fill-rule%3D%22evenodd%22%20clip-rule%3D%22evenodd%22%20d%3D%22M7.00003%200.150452C10.7832%200.150452%2013.8496%203.21691%2013.8496%207.00006C13.8496%2010.7832%2010.7832%2013.8497%207.00003%2013.8497C3.21688%2013.8497%200.150421%2010.7832%200.150421%207.00006C0.150421%203.21691%203.21688%200.150452%207.00003%200.150452ZM5.37796%207.59967C5.4267%209.0321%205.64754%2010.2966%205.97366%2011.2198C6.15996%2011.7471%206.36946%2012.1302%206.57327%2012.3702C6.77751%2012.6106%206.92343%2012.6505%207.00003%2012.6505C7.07663%2012.6505%207.22255%2012.6106%207.42679%2012.3702C7.6306%2012.1302%207.8401%2011.7471%208.0264%2011.2198C8.35252%2010.2966%208.57336%209.0321%208.6221%207.59967H5.37796ZM1.38187%207.59967C1.61456%209.80498%203.11593%2011.6305%205.14261%2012.336C5.03268%2012.1129%204.93227%2011.8725%204.8428%2011.6192C4.46342%2010.5452%204.22775%209.13994%204.17874%207.59967H1.38187ZM9.82132%207.59967C9.77232%209.13994%209.53664%2010.5452%209.15726%2011.6192C9.06774%2011.8726%208.96648%2012.1127%208.85648%2012.336C10.8836%2011.6307%2012.3855%209.8053%2012.6182%207.59967H9.82132ZM7.00003%201.34967C6.92343%201.34967%206.77751%201.38955%206.57327%201.62994C6.36946%201.86994%206.15996%202.25297%205.97366%202.78033C5.64754%203.70357%205.4267%204.96802%205.37796%206.40045H8.6221C8.57336%204.96802%208.35252%203.70357%208.0264%202.78033C7.8401%202.25297%207.6306%201.86994%207.42679%201.62994C7.22255%201.38955%207.07663%201.34967%207.00003%201.34967ZM8.85648%201.66315C8.96663%201.88662%209.06763%202.12721%209.15726%202.38092C9.53664%203.45494%209.77232%204.86018%209.82132%206.40045H12.6182C12.3855%204.19471%2010.8837%202.36834%208.85648%201.66315ZM5.14261%201.66315C3.11578%202.36856%201.61457%204.19503%201.38187%206.40045H4.17874C4.22775%204.86018%204.46342%203.45494%204.8428%202.38092C4.93237%202.12736%205.03253%201.88651%205.14261%201.66315Z%22%20fill%3D%22currentColor%22%2F%3E%3C%2Fsvg%3E"
      },
      deepThinkToggle: {
        name: "DeepThink 按钮",
        actionType: "selector",
        selector: "div:has(textarea) button[aria-label*='DeepThink'], div:has(textarea) [role='button'][aria-label*='DeepThink'], div:has([contenteditable='true']) button[aria-label*='DeepThink'], div:has([contenteditable='true']) [role='button'][aria-label*='DeepThink'], button:has(svg path[d*='M7.06431']), [role='button']:has(svg path[d*='M7.06431'])",
        hotkey: "CTRL+D",
        icon: "data:image/svg+xml,%3Csvg%20width%3D%2214%22%20height%3D%2214%22%20viewBox%3D%220%200%2014%2014%22%20fill%3D%22none%22%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%3E%3Cpath%20d%3D%22M7.06431%205.93348C7.68763%205.93348%208.19307%206.4391%208.19322%207.06239C8.19322%207.68579%207.68772%208.19129%207.06431%208.19129C6.44099%208.19119%205.9354%207.68573%205.9354%207.06239C5.93555%206.43917%206.44108%205.93359%207.06431%205.93348Z%22%20fill%3D%22currentColor%22%3E%3C%2Fpath%3E%3Cpath%20fill-rule%3D%22evenodd%22%20clip-rule%3D%22evenodd%22%20d%3D%22M8.6815%200.963754C10.1169%200.44708%2011.6266%200.37489%2012.5633%201.31141C13.5%202.24812%2013.4277%203.75782%2012.911%205.19325C12.7126%205.74437%2012.4386%206.31802%2012.0965%206.89735C12.4969%207.54645%2012.8141%208.19024%2013.036%208.80653C13.5527%2010.242%2013.6251%2011.7516%2012.6883%2012.6884C11.7516%2013.6251%2010.242%2013.5527%208.8065%2013.036C8.19022%2012.8141%207.54641%2012.4969%206.89732%2012.0966C6.31797%2012.4386%205.74435%2012.7126%205.19322%2012.911C3.75777%2013.4277%202.2481%2013.5001%201.31138%2012.5634C0.374859%2011.6266%200.447049%2010.1169%200.963724%208.68153C1.17185%208.10345%201.46321%207.50069%201.82896%206.89247C1.52182%206.35717%201.27235%205.82832%201.08872%205.31825C0.572068%203.88284%200.499714%202.37312%201.43638%201.43641C2.37308%200.499716%203.8828%200.572105%205.31822%201.08875C5.82828%201.27238%206.35715%201.52186%206.89243%201.82899C7.50066%201.46324%208.10341%201.17187%208.6815%200.963754ZM11.3573%208.01161C10.9083%208.62259%2010.3901%209.22879%209.80943%209.80946C9.22877%2010.3901%208.62255%2010.9084%208.01158%2011.3573C8.4257%2011.5841%208.8287%2011.7688%209.21275%2011.9071C10.5456%2012.3869%2011.4246%2012.2548%2011.8397%2011.8397C12.2548%2011.4247%2012.3869%2010.5456%2011.9071%209.21278C11.7688%208.82872%2011.5841%208.42574%2011.3573%208.01161ZM2.56529%208.02918C2.37344%208.39328%202.21495%208.74802%202.09263%209.08778C1.61291%2010.4204%201.74512%2011.2996%202.16001%2011.7147C2.57505%2012.1298%203.45415%2012.2619%204.78697%2011.7821C5.11057%2011.6656%205.44786%2011.5164%205.7938%2011.3368C5.249%2010.9223%204.70922%2010.4534%204.19029%209.93446C3.57578%209.31993%203.03169%208.67639%202.56529%208.02918ZM6.90708%203.24696C6.24065%203.70485%205.5646%204.26327%204.91392%204.91395C4.26325%205.56462%203.70482%206.24069%203.24693%206.90711C3.72674%207.63331%204.32777%208.37465%205.03892%209.08582C5.64943%209.69633%206.28183%2010.2265%206.90806%2010.6679C7.59368%2010.2026%208.2908%209.63082%208.96079%208.96082C9.6308%208.29082%2010.2025%207.59372%2010.6678%206.90809C10.2265%206.28186%209.69631%205.64946%209.08579%205.03895C8.37462%204.32779%207.63328%203.72678%206.90708%203.24696ZM11.7147%202.16004C11.2996%201.74515%2010.4204%201.61294%209.08775%202.09266C8.74835%202.21485%208.39382%202.37277%208.03013%202.56434C8.67728%203.03071%209.31995%203.57586%209.93443%204.19032C10.4534%204.70926%2010.9223%205.24902%2011.3368%205.79383C11.5164%205.44791%2011.6656%205.11058%2011.7821%204.787C12.2618%203.45422%2012.1297%202.57508%2011.7147%202.16004ZM4.91197%202.21766C3.57922%201.73794%202.70004%201.87001%202.28501%202.28504C1.87001%202.70009%201.73791%203.57926%202.21763%204.912C2.31709%205.18828%202.44112%205.47433%202.58677%205.76747C3.01931%205.18876%203.51474%204.61586%204.06529%204.06532C4.61584%203.51477%205.18872%203.01934%205.76743%202.5868C5.47431%202.44116%205.18824%202.31712%204.91197%202.21766Z%22%20fill%3D%22currentColor%22%3E%3C%2Fpath%3E%3C%2Fsvg%3E"
      },
      sidebarToggle: {
        name: "侧边栏",
        actionType: "selector",
        selector: "button[aria-label*='sidebar' i], [role='button'][aria-label*='sidebar' i], button[title*='sidebar' i], [role='button'][title*='sidebar' i], button:has(svg path[d*='M9.67269']), [role='button']:has(svg path[d*='M9.67269'])",
        hotkey: "CTRL+B",
        icon: "data:image/svg+xml,%3Csvg%20width%3D%2216%22%20height%3D%2216%22%20viewBox%3D%220%200%2016%2016%22%20fill%3D%22none%22%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%3E%3Cpath%20fill-rule%3D%22evenodd%22%20clip-rule%3D%22evenodd%22%20d%3D%22M9.67269%200.522888C10.8339%200.522888%2011.7599%200.522762%2012.4963%200.602541C13.2453%200.683705%2013.8789%200.854296%2014.4263%201.25202C14.7504%201.48744%2015.0354%201.77252%2015.2709%202.09654C15.6686%202.64398%2015.8392%203.27762%2015.9203%204.0266C16.0001%204.76295%2016%205.689%2016%206.85019V9.14991C16%2010.3111%2016.0001%2011.2372%2015.9203%2011.9735C15.8392%2012.7225%2015.6686%2013.3561%2015.2709%2013.9036C15.0354%2014.2276%2014.7504%2014.5127%2014.4263%2014.7481C13.8789%2015.1458%2013.2453%2015.3164%2012.4963%2015.3976C11.7599%2015.4773%2010.8339%2015.4772%209.67269%2015.4772H6.32727C5.16608%2015.4772%204.24003%2015.4773%203.50368%2015.3976C2.75471%2015.3164%202.12106%2015.1458%201.57363%2014.7481C1.2496%2014.5127%200.964519%2014.2276%200.7291%2013.9036C0.331377%2013.3561%200.160786%2012.7225%200.0796224%2011.9735C-0.000156655%2011.2372%20-3.05163e-05%2010.3111%20-3.05163e-05%209.14991V6.85019C-3.05163e-05%205.689%20-0.000156655%204.76295%200.0796224%204.0266C0.160786%203.27762%200.331377%202.64398%200.7291%202.09654C0.964519%201.77252%201.2496%201.48744%201.57363%201.25202C2.12106%200.854296%202.75471%200.683705%203.50368%200.602541C4.24003%200.522762%205.16608%200.522888%206.32727%200.522888H9.67269ZM5.543%201.8872V14.1119C5.78633%2014.1128%206.04706%2014.117%206.32727%2014.117H9.67269C10.8639%2014.117%2011.7032%2014.1165%2012.3492%2014.0465C12.9824%2013.9779%2013.3497%2013.8495%2013.6267%2013.6483C13.8354%2013.4967%2014.0195%2013.3126%2014.171%2013.104C14.3722%2012.8269%2014.5007%2012.4596%2014.5693%2011.8265C14.6393%2011.1804%2014.6398%2010.3411%2014.6398%209.14991V6.85019C14.6398%205.65901%2014.6393%204.81972%2014.5693%204.17365C14.5007%203.54053%2014.3722%203.17323%2014.171%202.89614C14.0195%202.68752%2013.8354%202.50341%2013.6267%202.35184C13.3497%202.15065%2012.9824%202.02217%2012.3492%201.95358C11.7032%201.88362%2010.8639%201.88311%209.67269%201.88311H6.32727C6.04706%201.88311%205.78633%201.88625%205.543%201.8872ZM4.18277%201.91171C3.99122%201.92164%203.81477%201.93582%203.65073%201.95358C3.01761%202.02217%202.65031%202.15065%202.37322%202.35184C2.1646%202.50341%201.98049%202.68752%201.82892%202.89614C1.62773%203.17323%201.49925%203.54053%201.43066%204.17365C1.36071%204.81972%201.3602%205.65901%201.3602%206.85019V9.14991C1.3602%2010.3411%201.36071%2011.1804%201.43066%2011.8265C1.49925%2012.4596%201.62773%2012.8269%201.82892%2013.104C1.98049%2013.3126%202.1646%2013.4967%202.37322%2013.6483C2.65031%2013.8495%203.01761%2013.9779%203.65073%2014.0465C3.81475%2014.0643%203.99124%2014.0774%204.18277%2014.0874V1.91171Z%22%20fill%3D%22currentColor%22%2F%3E%3C%2Fsvg%3E"
      }
    });
    const DEEPSEEK_SHORTCUT_KEY_ALIASES = Object.freeze({
      newChat: Object.freeze(["新聊天", "New chat"]),
      searchToggle: Object.freeze(["Search 按钮", "Search button"]),
      deepThinkToggle: Object.freeze(["DeepThink 按钮", "DeepThink button"]),
      sidebarToggle: Object.freeze(["侧边栏", "Sidebar"])
    });
    const DEEPSEEK_LEGACY_SELECTOR_HINTS = Object.freeze({
      newChat: Object.freeze([".ds-icon", "M8 0.599609", "a[href='/']"]),
      searchToggle: Object.freeze(["_020ab5b", "ec4f5d61", "a567dba3", "M7.00003", "aria-label*='Search'"]),
      deepThinkToggle: Object.freeze(["DeepThink", "M7.06431"]),
      sidebarToggle: Object.freeze(["sidebar", "M9.67269"])
    });
    function getDeepSeekManagedShortcutKey(shortcut) {
      const key = String(shortcut?.key || "").trim();
      if (key && Object.prototype.hasOwnProperty.call(DEEPSEEK_DEFAULT_SHORTCUTS_BY_KEY, key)) return key;
      const name = normalizeDeepSeekToken(shortcut?.name);
      for (const [managedKey, aliases] of Object.entries(DEEPSEEK_SHORTCUT_KEY_ALIASES)) {
        if (aliases.some((alias) => normalizeDeepSeekToken(alias) === name)) return managedKey;
      }
      return "";
    }
    function isDeepSeekLegacyDefaultSelector(shortcut) {
      if (!shortcut || typeof shortcut !== "object") return false;
      if (String(shortcut.actionType || "").trim() !== "selector") return false;
      const managedKey = getDeepSeekManagedShortcutKey(shortcut);
      if (!managedKey) return false;
      const selector = normalizeDeepSeekToken(shortcut.selector);
      if (!selector) return false;
      return DEEPSEEK_LEGACY_SELECTOR_HINTS[managedKey].some((hint) => selector.includes(normalizeDeepSeekToken(hint)));
    }
    function migrateDeepSeekShortcuts() {
      if (gmGetValueLocal(DEFAULTS_MIGRATION_KEY, false) === true) return;
      const stored = gmGetValueLocal(SHORTCUTS_STORAGE_KEY, null);
      if (!Array.isArray(stored) || stored.length === 0) {
        gmSetValueLocal(DEFAULTS_MIGRATION_KEY, true);
        return;
      }
      let changed = false;
      const next = stored.map((shortcut) => {
        const managedKey = getDeepSeekManagedShortcutKey(shortcut);
        if (!managedKey || !isDeepSeekLegacyDefaultSelector(shortcut)) return shortcut;
        const replacement = cloneShortcutRecord(DEEPSEEK_DEFAULT_SHORTCUTS_BY_KEY[managedKey]);
        if (!replacement) return shortcut;
        const source = shortcut && typeof shortcut === "object" ? shortcut : {};
        changed = true;
        return {
          ...replacement,
          key: managedKey,
          id: String(source.id || replacement.id || "").trim() || replacement.id,
          name: String(source.name || "").trim() || replacement.name,
          hotkey: Object.prototype.hasOwnProperty.call(source, "hotkey") ? String(source.hotkey || "").trim() : replacement.hotkey,
          icon: String(source.icon || "").trim() || replacement.icon,
          iconDark: String(source.iconDark || "").trim(),
          iconAdaptive: typeof source.iconAdaptive === "boolean" ? source.iconAdaptive : replacement.iconAdaptive,
          data: source.data && typeof source.data === "object" && !Array.isArray(source.data) ? cloneShortcutRecord(source.data) || {} : replacement.data || {}
        };
      });
      if (changed) gmSetValueLocal(SHORTCUTS_STORAGE_KEY, next);
      gmSetValueLocal(DEFAULTS_MIGRATION_KEY, true);
    }
    const defaultShortcuts = [
      // === DeepSeek 核心功能快捷键 ===
      {
        key: "newChat",
        name: "新聊天",
        actionType: "selector",
        selector: DEEPSEEK_DEFAULT_SHORTCUTS_BY_KEY.newChat.selector,
        url: "",
        urlMethod: "current",
        urlAdvanced: "href",
        simulateKeys: "",
        hotkey: DEEPSEEK_DEFAULT_SHORTCUTS_BY_KEY.newChat.hotkey,
        icon: DEEPSEEK_DEFAULT_SHORTCUTS_BY_KEY.newChat.icon
      },
      {
        key: "searchToggle",
        name: "Search 按钮",
        actionType: "selector",
        selector: DEEPSEEK_DEFAULT_SHORTCUTS_BY_KEY.searchToggle.selector,
        url: "",
        urlMethod: "current",
        urlAdvanced: "href",
        simulateKeys: "",
        hotkey: DEEPSEEK_DEFAULT_SHORTCUTS_BY_KEY.searchToggle.hotkey,
        icon: DEEPSEEK_DEFAULT_SHORTCUTS_BY_KEY.searchToggle.icon
      },
      {
        key: "deepThinkToggle",
        name: "DeepThink 按钮",
        actionType: "selector",
        selector: DEEPSEEK_DEFAULT_SHORTCUTS_BY_KEY.deepThinkToggle.selector,
        url: "",
        urlMethod: "current",
        urlAdvanced: "href",
        simulateKeys: "",
        hotkey: DEEPSEEK_DEFAULT_SHORTCUTS_BY_KEY.deepThinkToggle.hotkey,
        icon: DEEPSEEK_DEFAULT_SHORTCUTS_BY_KEY.deepThinkToggle.icon
      },
      {
        key: "sidebarToggle",
        name: "侧边栏",
        actionType: "selector",
        selector: DEEPSEEK_DEFAULT_SHORTCUTS_BY_KEY.sidebarToggle.selector,
        url: "",
        urlMethod: "current",
        urlAdvanced: "href",
        simulateKeys: "",
        hotkey: DEEPSEEK_DEFAULT_SHORTCUTS_BY_KEY.sidebarToggle.hotkey,
        icon: DEEPSEEK_DEFAULT_SHORTCUTS_BY_KEY.sidebarToggle.icon
      }
    ];
    let defaultExpertModeEnabled = getDefaultExpertModeSetting();
    let defaultExpertModeMenuCommandId = null;
    let defaultExpertModeWarmupTimer = null;
    let defaultExpertModeRequestTimer = null;
    let defaultExpertModeLastRequestAt = 0;
    function getDefaultExpertModeSetting() {
      const localFallback = getLocalBooleanFallback(DEFAULT_EXPERT_MODE_STORAGE_KEY, DEFAULT_EXPERT_MODE_ENABLED);
      const value = gmGetValueLocal(DEFAULT_EXPERT_MODE_STORAGE_KEY, localFallback);
      if (value === true || value === "true" || value === 1 || value === "1") return true;
      if (value === false || value === "false" || value === 0 || value === "0") return false;
      return !!localFallback;
    }
    function setDefaultExpertModeSetting(value) {
      const enabled = !!value;
      gmSetValueLocal(DEFAULT_EXPERT_MODE_STORAGE_KEY, enabled);
      setLocalBooleanFallback(DEFAULT_EXPERT_MODE_STORAGE_KEY, enabled);
    }
    function getDefaultExpertModeMenuLabel(engine2 = null) {
      const stateText = siteMessage(engine2, defaultExpertModeEnabled ? "on" : "off", {}, defaultExpertModeEnabled ? "开" : "关");
      return siteMessage(engine2, "defaultExpertModeLabel", { state: stateText }, `DeepSeek - 默认 Expert 模式: ${stateText}`);
    }
    function registerDefaultExpertModeMenuCommand(engine2 = null) {
      if (defaultExpertModeMenuCommandId !== null) {
        gmUnregisterMenuCommandLocal(defaultExpertModeMenuCommandId);
        defaultExpertModeMenuCommandId = null;
      }
      defaultExpertModeMenuCommandId = gmRegisterMenuCommandLocal(getDefaultExpertModeMenuLabel(engine2), () => {
        setDefaultExpertModePreference(!defaultExpertModeEnabled, engine2);
      });
    }
    function findDeepSeekModeOption(labels) {
      const candidates = Array.from(document.querySelectorAll("[role='radio'], input[type='radio'], [aria-checked], button, [role='button']")).filter(isVisibleElement).map((element) => {
        if (matchesAnyLabel(element, labels, { exact: true })) return { element, exact: true };
        if (matchesAnyLabel(element, labels, { exact: false })) return { element, exact: false };
        return null;
      }).filter(Boolean);
      if (!candidates.length) return findExactTextElement(labels);
      const composerInput = getVisibleComposerInputs()[0] || null;
      if (!composerInput) {
        return candidates.find((item) => item.exact)?.element || candidates[0].element;
      }
      const anchorRect = composerInput.getBoundingClientRect();
      const anchorCenter = getRectCenter(anchorRect);
      return candidates.map(({ element, exact }) => {
        const rect = element.getBoundingClientRect();
        const center = getRectCenter(rect);
        const verticalGap = rect.bottom < anchorRect.top ? anchorRect.top - rect.bottom : rect.top > anchorRect.bottom ? rect.top - anchorRect.bottom : 0;
        const horizontalGap = rect.right < anchorRect.left ? anchorRect.left - rect.right : rect.left > anchorRect.right ? rect.left - anchorRect.right : 0;
        const score = (exact ? 0 : 1e3) + verticalGap * 3 + horizontalGap + Math.abs(center.y - anchorCenter.y) + Math.abs(center.x - anchorCenter.x) * 0.25;
        return { element, score };
      }).sort((a, b) => a.score - b.score)[0]?.element || null;
    }
    function selectDeepSeekExpertMode() {
      const expertOption = findDeepSeekModeOption(["Expert"]);
      if (!expertOption) return false;
      return clickDeepSeekElement(expertOption);
    }
    function shouldWarmupDefaultExpertMode() {
      return defaultExpertModeEnabled;
    }
    function stopDefaultExpertModeWarmup() {
      if (defaultExpertModeWarmupTimer === null) return;
      try {
        clearInterval(defaultExpertModeWarmupTimer);
      } catch {
      }
      defaultExpertModeWarmupTimer = null;
    }
    function cancelDefaultExpertModeRequest() {
      if (defaultExpertModeRequestTimer === null) return;
      try {
        clearTimeout(defaultExpertModeRequestTimer);
      } catch {
      }
      defaultExpertModeRequestTimer = null;
    }
    function startDefaultExpertModeWarmup({ attempts = 12, intervalMs = 400 } = {}) {
      cancelDefaultExpertModeRequest();
      stopDefaultExpertModeWarmup();
      if (!shouldWarmupDefaultExpertMode()) return;
      let remaining = Math.max(1, Number(attempts) || 1);
      const interval = Math.max(120, Number(intervalMs) || 400);
      const tick = () => {
        if (!shouldWarmupDefaultExpertMode()) return true;
        if (selectDeepSeekExpertMode()) return true;
        remaining -= 1;
        return remaining <= 0;
      };
      if (tick()) return;
      defaultExpertModeWarmupTimer = window.setInterval(() => {
        if (tick()) stopDefaultExpertModeWarmup();
      }, interval);
    }
    function requestDefaultExpertModeWarmup({ attempts = 8, intervalMs = 300, delayMs = 0 } = {}) {
      if (!shouldWarmupDefaultExpertMode()) return;
      const now = Date.now();
      const delay = Math.max(0, Number(delayMs) || 0);
      const cooldown = Math.max(0, DEFAULT_EXPERT_MODE_REQUEST_COOLDOWN_MS - (now - defaultExpertModeLastRequestAt));
      const waitMs = Math.max(delay, cooldown);
      if (defaultExpertModeRequestTimer !== null) return;
      defaultExpertModeRequestTimer = window.setTimeout(() => {
        defaultExpertModeRequestTimer = null;
        defaultExpertModeLastRequestAt = Date.now();
        startDefaultExpertModeWarmup({ attempts, intervalMs });
      }, waitMs);
    }
    function isDefaultExpertModeEventTarget(target) {
      const element = target && typeof target.closest === "function" ? target.closest("[role='radio'], input[type='radio'], [aria-checked], button, [role='button'], label") : null;
      if (!element) return false;
      const label = normalizeDeepSeekToken(getElementLabelText(element));
      return /\b(?:instant|expert)\b/.test(label);
    }
    function setDefaultExpertModePreference(nextValue, engine2 = null) {
      defaultExpertModeEnabled = !!nextValue;
      setDefaultExpertModeSetting(defaultExpertModeEnabled);
      if (defaultExpertModeEnabled) {
        requestDefaultExpertModeWarmup({ attempts: 12, intervalMs: 300, delayMs: 0 });
      } else {
        cancelDefaultExpertModeRequest();
        stopDefaultExpertModeWarmup();
      }
      console.info(`${LOG_TAG} default Expert mode is now ${defaultExpertModeEnabled ? "enabled" : "disabled"}.`);
      registerDefaultExpertModeMenuCommand(engine2);
      return defaultExpertModeEnabled;
    }
    function setupDefaultExpertModeSelection() {
      window.addEventListener("load", () => {
        requestDefaultExpertModeWarmup({ attempts: 14, intervalMs: 350, delayMs: 650 });
      }, { once: true });
      if (document.readyState === "interactive" || document.readyState === "complete") {
        requestDefaultExpertModeWarmup({ attempts: 14, intervalMs: 350, delayMs: 350 });
      }
      let lastUrl = location.href;
      const handlePossibleRouteChange = () => {
        const currentUrl = location.href;
        if (currentUrl === lastUrl) return;
        lastUrl = currentUrl;
        requestDefaultExpertModeWarmup({ attempts: 10, intervalMs: 300, delayMs: 250 });
      };
      const patchHistoryMethod = (methodName) => {
        try {
          const original = window.history?.[methodName];
          if (typeof original !== "function" || original.__deepseekDefaultExpertPatched) return;
          const patched = function(...args) {
            const result = original.apply(this, args);
            handlePossibleRouteChange();
            return result;
          };
          patched.__deepseekDefaultExpertPatched = true;
          patched.__deepseekDefaultExpertOriginal = original;
          window.history[methodName] = patched;
        } catch {
        }
      };
      patchHistoryMethod("pushState");
      patchHistoryMethod("replaceState");
      window.addEventListener("popstate", handlePossibleRouteChange);
      window.addEventListener("hashchange", handlePossibleRouteChange);
      document.addEventListener("visibilitychange", () => {
        if (document.visibilityState === "visible") {
          requestDefaultExpertModeWarmup({ attempts: 10, intervalMs: 300, delayMs: 200 });
        }
      });
      document.addEventListener("click", (event) => {
        if (event && event.isTrusted === false) return;
        if (!isDefaultExpertModeEventTarget(event.target)) return;
        requestDefaultExpertModeWarmup({ attempts: 6, intervalMs: 220, delayMs: 450 });
      }, true);
    }
    function findDeepSeekSelectorFallback(shortcut) {
      const managedKey = getDeepSeekManagedShortcutKey(shortcut);
      if (managedKey === "searchToggle") {
        return findComposerToggle(["Search"]);
      }
      if (managedKey === "deepThinkToggle") {
        return findComposerToggle(["DeepThink"]);
      }
      if (managedKey === "newChat") {
        return findExactTextElement(["New chat", "新聊天"]) || findTopHeaderIconButton(0);
      }
      if (managedKey === "sidebarToggle") {
        return findTopHeaderIconButton(0) || findTopHeaderIconButton(1);
      }
      const label = normalizeDeepSeekToken(shortcut?.name);
      if (label === normalizeDeepSeekToken("Search 按钮") || label === normalizeDeepSeekToken("Search button")) {
        return findComposerToggle(["Search"]);
      }
      if (label === normalizeDeepSeekToken("DeepThink 按钮") || label === normalizeDeepSeekToken("DeepThink button")) {
        return findComposerToggle(["DeepThink"]);
      }
      if (label === normalizeDeepSeekToken("新聊天") || label === normalizeDeepSeekToken("New chat")) {
        return findExactTextElement(["New chat", "新聊天"]) || findTopHeaderIconButton(0);
      }
      if (label === normalizeDeepSeekToken("侧边栏") || label === normalizeDeepSeekToken("Sidebar")) {
        return findTopHeaderIconButton(0) || findTopHeaderIconButton(1);
      }
      return null;
    }
    function handleDeepSeekSelectorAction(shortcut) {
      const selector = String(shortcut?.selector || "").trim();
      if (selector && clickCssSelector(selector)) return true;
      const fallbackElement = findDeepSeekSelectorFallback(shortcut);
      if (fallbackElement && clickDeepSeekElement(fallbackElement)) return true;
      if (getDeepSeekManagedShortcutKey(shortcut) === "newChat") {
        return navigateToDeepSeekHome();
      }
      console.warn(`${LOG_TAG} selector action could not locate target:`, shortcut?.name || "(unnamed)");
      return false;
    }
    migrateDeepSeekShortcuts();
    const engine = ShortcutTemplate.createShortcutEngine({
      menuCommandLabel: "DeepSeek - 设置快捷键",
      panelTitle: "DeepSeek - 自定义快捷键",
      storageKeys: {
        shortcuts: SHORTCUTS_STORAGE_KEY,
        iconCachePrefix: ICON_CACHE_PREFIX,
        userIcons: USER_ICONS_STORAGE_KEY
      },
      ui: {
        idPrefix: "deepseek",
        cssPrefix: "deepseek",
        compactBreakpoint: 800
      },
      i18n: {
        messages: SITE_MESSAGES
      },
      actionHandlers: {
        selector: ({ shortcut }) => handleDeepSeekSelectorAction(shortcut)
      },
      allowOverrideBuiltinActions: true,
      actionTypeMeta: {
        selector: {
          label: "元素点击",
          shortLabel: "点击",
          color: "#FF9800",
          builtin: true
        }
      },
      defaultIconURL,
      iconLibrary: defaultIcons,
      protectedIconUrls,
      defaultShortcuts,
      consoleTag: "[DeepSeek Shortcut Script]",
      colors: {
        primary: "#5D5CDE"
      },
      shouldBypassIconCache: (url) => {
        return url && url.startsWith("https://chat.deepseek.com/");
      },
      text: {
        stats: {
          total: "总计",
          url: "URL跳转",
          selector: "元素点击",
          simulate: "按键模拟"
        },
        buttons: {
          addShortcut: "添加新快捷键",
          saveAndClose: "保存并关闭",
          confirm: "确定",
          cancel: "取消",
          delete: "删除",
          edit: "编辑",
          clear: "清除"
        },
        dialogs: {
          alert: "提示",
          confirm: "确认",
          prompt: "输入"
        },
        hints: {
          hotkey: "点击此处，然后按下快捷键组合",
          simulate: "点击此处，然后按下要模拟的按键组合",
          hotkeyHelp: "💡 支持 Ctrl/Shift/Alt/Cmd + 字母/数字/功能键等组合",
          simulateHelp: "⚡ 将模拟这个按键组合发送到网页"
        }
      }
    });
    engine.init();
    registerDefaultExpertModeMenuCommand(engine);
    setupDefaultExpertModeSelection();
    engine.i18n?.addLocaleChangeListener?.(() => registerDefaultExpertModeMenuCommand(engine));
  })();
})();
