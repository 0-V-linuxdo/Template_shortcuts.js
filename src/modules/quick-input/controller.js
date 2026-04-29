/* -------------------------------------------------------------------------- *
 * Quick Input · Controller
 * -------------------------------------------------------------------------- */

import { sleep, deepMerge } from "../shared/base.js";
import { createI18nContext, mergeLocaleMessages } from "../shared/i18n.js";
import { cancelAnimationFrameSafe, getDomConstructor, getGlobalScope, requestAnimationFrameSafe } from "../shared/platform/browser.js";
import { getDraftStorageKey, loadDraft, saveDraft, readFileAsDataUrl, dataUrlToFile, normalizeDraftImageEntry, normalizeDraftImages, normalizeImageFiles } from "./storage.js";
import { clampInt, normalizeComposerText, normalizeHotkeyFallback, getComposerText, getKeyEventProps, simulateKeystroke, isElementVisible, pickBestComposerCandidate, findComposerElement, focusComposer, setInputValue, clearInputValue, dispatchPasteEvent, dispatchBeforeInputFromPaste, dispatchInputFromPaste, dispatchDragEvent, collectFileInputs, collectFileInputsFromOpenShadows, trySetFileInputFiles, isInsideOverlayTree } from "./dom.js";
import { STEP_DELAY_MAX_MS, LOOP_DELAY_MAX_MS, DELAY_UNIT_FACTORS, DELAY_UNIT_LABELS, QUICK_INPUT_SVG_NS, DEFAULT_LABELS, DEFAULT_LABEL_MESSAGES, DEFAULT_CONFIG, normalizeImageRecovery, normalizeDelayUnit, inferDelayUnitFromMs, convertDelayInputToMs, clampDelayMs, formatDelayInputValue, formatDelayWithUnit, loadConfig, saveConfig } from "./config.js";
import { executeEngineShortcutByHotkey, sleepWithCancel, waitForObservedState } from "./runtime.js";
import { ensureQuickInputStyle } from "./style.js";

export function createController(userOptions = {}) {
            const options = userOptions && typeof userOptions === "object" ? userOptions : {};
            const engine = options.engine;
            if (!engine || typeof engine !== "object") throw new Error("[QuickInput] createController: missing engine");

            const idPrefix = String(options.idPrefix || "").trim() || "quick-input";
            const storageKey = String(options.storageKey || `${idPrefix}_quick_input_v1`).trim() || `${idPrefix}_quick_input_v1`;
            const draftStorageKey = getDraftStorageKey(storageKey);
            const primaryColor = String(options.primaryColor || "#4285F4").trim() || "#4285F4";
            const overlayId = `${idPrefix}-quick-input-overlay`;
            const themeMode = normalizeThemeMode(options.themeMode);
            const logTag = "[QuickInput]";

            const engineI18n = engine?.i18n && typeof engine.i18n === "object" ? engine.i18n : null;
            const quickI18n = createI18nContext({
                localeMode: engineI18n?.getLocaleMode?.() || options.locale || "auto",
                fallbackLocale: "zh-CN",
                messages: mergeLocaleMessages(DEFAULT_LABEL_MESSAGES, options?.i18n?.labels || {})
            });

            function getEffectiveLocale() {
                return engineI18n?.getEffectiveLocale?.() || quickI18n.getEffectiveLocale();
            }

            function resolveLabels() {
                const effectiveLocale = getEffectiveLocale();
                const nextLabels = deepMerge({}, quickI18n.getMessages(effectiveLocale));
                if (effectiveLocale === "zh-CN" && options.labels && typeof options.labels === "object") {
                    deepMerge(nextLabels, options.labels);
                }
                return nextLabels;
            }

            function resolveTitleText() {
                const titleKey = String(options.titleKey || "").trim();
                const localeLabels = quickI18n.getMessages(getEffectiveLocale());
                const fallback = String(options.title || localeLabels.title || "Quick Input").trim();
                if (titleKey && engineI18n?.t) {
                    return String(engineI18n.t(titleKey, {}, fallback) || fallback).trim() || fallback;
                }
                return fallback || String(localeLabels.title || "Quick Input").trim() || "Quick Input";
            }

            let labels = resolveLabels();
            let titleText = resolveTitleText();
            const defaults = deepMerge(deepMerge({}, DEFAULT_CONFIG), options.defaults || {});

            const rawAdapter = options.adapter && typeof options.adapter === "object" ? options.adapter : {};
            const adapter = Object.freeze({
                focusComposer: typeof rawAdapter.focusComposer === "function" ? rawAdapter.focusComposer : (opts) =>
                    focusComposer({ ...(opts || {}), shouldIgnore: (el) => isInsideOverlay(el) }),
                setInputValue: typeof rawAdapter.setInputValue === "function" ? rawAdapter.setInputValue : setInputValue,
                clearComposerValue: typeof rawAdapter.clearComposerValue === "function" ? rawAdapter.clearComposerValue : clearInputValue,
                getComposerText: typeof rawAdapter.getComposerText === "function" ? rawAdapter.getComposerText : getComposerText,
                getTextObservationRoots: typeof rawAdapter.getTextObservationRoots === "function" ? rawAdapter.getTextObservationRoots : null,
                attachImages: typeof rawAdapter.attachImages === "function" ? rawAdapter.attachImages : null,
                clearAttachments: typeof rawAdapter.clearAttachments === "function" ? rawAdapter.clearAttachments : null,
                waitForReadyToSend: typeof rawAdapter.waitForReadyToSend === "function" ? rawAdapter.waitForReadyToSend : null,
                waitForNewChatReady: typeof rawAdapter.waitForNewChatReady === "function" ? rawAdapter.waitForNewChatReady : null,
                triggerNewChat: typeof rawAdapter.triggerNewChat === "function"
                    ? rawAdapter.triggerNewChat
                    : (typeof rawAdapter.triggerNewChatRetry === "function"
                        ? rawAdapter.triggerNewChatRetry
                        : async ({ hotkey }) => executeEngineShortcutByHotkey(engine, hotkey)),
                newChatLabel: (typeof rawAdapter.newChatLabel === "string" || typeof rawAdapter.newChatLabel === "function")
                    ? rawAdapter.newChatLabel
                    : ((typeof rawAdapter.retryNewChatLabel === "string" || typeof rawAdapter.retryNewChatLabel === "function") ? rawAdapter.retryNewChatLabel : ""),
                sendMessage: typeof rawAdapter.sendMessage === "function" ? rawAdapter.sendMessage : async (composerEl) =>
                    simulateKeystroke("ENTER", { target: composerEl })
            });
            const hasCustomNewChatTrigger = typeof rawAdapter.triggerNewChat === "function" || typeof rawAdapter.triggerNewChatRetry === "function";
            const lockNewChatHotkey = !!rawAdapter.lockNewChatHotkey;
            const lockedNewChatHotkeyDisplay = rawAdapter.lockedNewChatHotkeyDisplay;

            let overlayEl = null;
            let overlayRootEl = null;
            let backdropEl = null;
            let panelEl = null;
            let headerEl = null;
            let logEl = null;
            let inputBodyEl = null;
            let inputActionsEl = null;
            let logActionsEl = null;
            let runConfigGroupEl = null;
            let activeLoopLogGroupEl = null;
            let activeLoopLogBodyEl = null;
            let fileInputEl = null;
            let previewRowEl = null;
            let imagePreviewShellEl = null;
            let clearAllImagesBtnEl = null;
            let imagePreviewListEl = null;
            let imageDropEl = null;
            let textEl = null;
            let hotkeyListEl = null;
            let addHotkeyBtnEl = null;
            const hotkeyInputs = [];
            let newChatHotkeyEl = null;
            let loopEl = null;
            let stepDelayEl = null;
            let stepDelayUnitEl = null;
            let loopDelayEl = null;
            let loopDelayUnitEl = null;
            let clearBeforeRunEl = null;
            const stopButtons = [];
            const playPauseButtons = [];
            let activeTab = "input";
            let setActiveTab = null;

            let imageFiles = [];
            let draftImageEntries = [];
            let imageObjectUrls = [];
            let running = false;
            let cancelRun = false;
            let paused = false;
            let pauseStartedAtMs = 0;
            let accumulatedPausedMs = 0;
            let runFinalStatus = "idle";
            let lastTerminalStatus = "idle";
            let pendingFinalStatusDetail = "";
            let draftPersistToken = 0;
            let draftRestorePromise = null;
            let draftWriteChain = Promise.resolve(null);
            let panelLayoutRaf = 0;
            let pendingLogScrollToBottom = false;
            if (engineI18n && typeof engineI18n.addLocaleChangeListener === "function") {
                engineI18n.addLocaleChangeListener(() => refreshLocale());
            }

            let dragPointerId = null;
            let dragOffsetX = 0;
            let dragOffsetY = 0;
            let dragWidth = 0;
            let dragHeight = 0;
            let dragStartLeft = 0;
            let dragStartTop = 0;
            let dragMoved = false;
            let dragRaf = 0;
            const PANEL_VIEWPORT_MARGIN_PX = 36;
            let dragNextLeft = 0;
            let dragNextTop = 0;
            let dragRestore = null;

            let usesShadowUi = false;
            let themeSyncCleanup = null;

            function isInsideOverlay(el) {
                return isInsideOverlayTree(el, overlayId);
            }

            function warnQuickInput(message, error = null) {
                try {
                    if (error) console.warn(`${logTag} ${message}`, error);
                    else console.warn(`${logTag} ${message}`);
                } catch {}
            }

            function queueDraftWrite(task) {
                const runTask = async () => {
                    try {
                        return await task();
                    } catch (error) {
                        warnQuickInput("Failed to write QuickInput draft.", error);
                        return null;
                    }
                };

                const next = draftWriteChain.then(runTask, runTask);
                draftWriteChain = next.then(() => null, () => null);
                return next;
            }

            async function waitForDraftRestore() {
                const pending = draftRestorePromise;
                if (!pending || typeof pending.then !== "function") return;
                try {
                    await pending;
                } catch {}
            }

            function getFileCtor() {
                return getDomConstructor("File");
            }

            function isImageFileLike(file) {
                if (!file || typeof file !== "object") return false;
                const type = String(file.type || "").trim();
                if (!type.startsWith("image/")) return false;
                const FileCtor = getFileCtor();
                if (FileCtor && file instanceof FileCtor) return true;
                return typeof file.name === "string" && typeof file.size === "number";
            }

            function getUrlApi() {
                const scope = getGlobalScope();
                return scope?.URL || (typeof URL !== "undefined" ? URL : null);
            }

            function createObjectUrlSafe(file) {
                try {
                    return getUrlApi()?.createObjectURL?.(file) || "";
                } catch {
                    return "";
                }
            }

            function revokeObjectUrlSafe(url) {
                if (!url) return;
                try { getUrlApi()?.revokeObjectURL?.(url); } catch {}
            }

            function resetPauseTracking() {
                paused = false;
                pauseStartedAtMs = 0;
                accumulatedPausedMs = 0;
            }

            function getPauseAwareNow() {
                const wallNow = Date.now();
                const currentPauseDuration = paused && pauseStartedAtMs
                    ? Math.max(0, wallNow - pauseStartedAtMs)
                    : 0;
                return wallNow - accumulatedPausedMs - currentPauseDuration;
            }

            async function waitWhilePaused({ pollMs = 80 } = {}) {
                const waitMs = Math.max(20, Number(pollMs) || 80);
                while (paused) {
                    if (cancelRun) return false;
                    await sleep(waitMs);
                }
                return !cancelRun;
            }

            const runtimeTiming = Object.freeze({
                now: () => getPauseAwareNow(),
                waitIfPaused: () => waitWhilePaused()
            });

            const runRuntime = Object.freeze({
                isPaused: () => paused,
                waitIfPaused: runtimeTiming.waitIfPaused,
                sleep: (ms) => sleepWithCancel(ms, {
                    shouldCancel: () => cancelRun,
                    runtime: runtimeTiming,
                    chunkMs: 160
                }),
                now: runtimeTiming.now
            });

            const TEXT_COMMIT_SETTLE_MS = 200;
            const TEXT_COMMIT_POLL_MS = 120;
            const TEXT_COMMIT_OBSERVED_ATTRIBUTES = Object.freeze([
                "class",
                "style",
                "value",
                "placeholder",
                "data-state",
                "aria-hidden",
                "hidden"
            ]);

            function isComposerNodeConnected(node) {
                if (!node) return false;
                try {
                    if (typeof node.isConnected === "boolean") return node.isConnected;
                } catch { }
                try { return !!globalThis.document?.contains?.(node); } catch { return false; }
            }

            function resolveComposerForTextRead(composerEl) {
                if (
                    composerEl &&
                    !isInsideOverlay(composerEl) &&
                    isComposerNodeConnected(composerEl) &&
                    isElementVisible(composerEl)
                ) {
                    return composerEl;
                }
                const fallback = findComposerElement({ shouldIgnore: (el) => isInsideOverlay(el) });
                return fallback || composerEl || null;
            }

            function readComposerTextForVerification(composerEl) {
                const resolvedComposer = resolveComposerForTextRead(composerEl);
                try {
                    return String(adapter.getComposerText?.(resolvedComposer) ?? "");
                } catch {
                    return "";
                }
            }

            function getTextObservationRootsForVerification(composerEl) {
                const roots = [];
                const seen = new Set();
                const resolvedComposer = resolveComposerForTextRead(composerEl);
                const pushRoot = (node) => {
                    if (!node || seen.has(node)) return;
                    const nodeType = Number(node?.nodeType) || 0;
                    if (!(nodeType === 1 || nodeType === 9 || nodeType === 11)) return;
                    seen.add(node);
                    roots.push(node);
                };

                pushRoot(resolvedComposer);
                try { pushRoot(resolvedComposer?.parentElement || null); } catch { }
                try { pushRoot(resolvedComposer?.closest?.("form") || null); } catch { }

                if (typeof adapter.getTextObservationRoots === "function") {
                    let customRoots = null;
                    try {
                        customRoots = adapter.getTextObservationRoots(resolvedComposer);
                    } catch { }
                    for (const root of Array.isArray(customRoots) ? customRoots : [customRoots]) {
                        pushRoot(root);
                    }
                }

                pushRoot(globalThis.document?.body || globalThis.document || null);
                return roots;
            }

            function getTextCommitTimeoutMs(text) {
                const length = normalizeComposerText(text).length;
                return Math.max(1500, Math.min(8000, 800 + length * 2));
            }

            function normalizeTextCommitValue(text) {
                return normalizeComposerText(text, { trimTrailingEditorNewlines: true });
            }

            function appendRuntimeLog(text, options = {}) {
                if (!text) return;
                if (activeLoopLogBodyEl) {
                    appendLoopLog(text, options);
                    return;
                }
                appendGlobalLog(text, options);
            }

            function getPrimaryButtonAction() {
                if (!running) return lastTerminalStatus === "ok" ? "replay" : "run";
                return paused ? "resume" : "pause";
            }

            async function handlePrimaryAction() {
                if (!running) {
                    await runMacro({ sourceAction: getPrimaryButtonAction() });
                    return;
                }
                togglePause();
            }

            function getPlayerActionLabel(action) {
                const normalized = String(action ?? "").trim().toLowerCase();
                switch (normalized) {
                    case "replay":
                        return labels.buttons?.replay || DEFAULT_LABELS.buttons.replay;
                    case "stop":
                        return labels.buttons?.stop || DEFAULT_LABELS.buttons.stop;
                    case "pause":
                        return labels.buttons?.pause || DEFAULT_LABELS.buttons.pause;
                    case "resume":
                        return labels.buttons?.resume || DEFAULT_LABELS.buttons.resume;
                    default:
                        return labels.buttons?.run || DEFAULT_LABELS.buttons.run;
                }
            }

            function createPlayerActionSvgNode(tag, attrs = {}) {
                const node = globalThis.document.createElementNS(QUICK_INPUT_SVG_NS, tag);
                Object.entries(attrs).forEach(([name, value]) => {
                    if (value == null) return;
                    node.setAttribute(name, String(value));
                });
                return node;
            }

            function createPlayerActionIcon(action) {
                const normalized = String(action ?? "").trim().toLowerCase();
                const svg = createPlayerActionSvgNode("svg", {
                    viewBox: "0 0 24 24",
                    fill: "none",
                    "aria-hidden": "true",
                    focusable: "false"
                });

                if (normalized === "stop") {
                    svg.appendChild(createPlayerActionSvgNode("rect", {
                        x: "3.98",
                        y: "3.98",
                        width: "16.04",
                        height: "16.04",
                        rx: "2.8",
                        fill: "currentColor"
                    }));
                    return svg;
                }

                if (normalized === "pause") {
                    svg.appendChild(createPlayerActionSvgNode("rect", {
                        x: "6.61",
                        y: "5.51",
                        width: "4.07",
                        height: "12.98",
                        rx: "1.54",
                        fill: "currentColor"
                    }));
                    svg.appendChild(createPlayerActionSvgNode("rect", {
                        x: "13.32",
                        y: "5.51",
                        width: "4.07",
                        height: "12.98",
                        rx: "1.54",
                        fill: "currentColor"
                    }));
                    return svg;
                }

                if (normalized === "replay") {
                    svg.appendChild(createPlayerActionSvgNode("path", {
                        d: "M12 5V1L7 6L12 11V7C15.31 7 18 9.69 18 13S15.31 19 12 19C9.03 19 6.57 16.84 6.09 14H4.07C4.57 17.95 7.93 21 12 21C16.42 21 20 17.42 20 13S16.42 5 12 5Z",
                        fill: "currentColor"
                    }));
                    return svg;
                }

                svg.appendChild(createPlayerActionSvgNode("path", {
                    d: "M8.55 6.9C8.55 6.35 9.15 6 9.63 6.3L17.32 11.12C17.78 11.41 17.78 12.59 17.32 12.88L9.63 17.7C9.15 18 8.55 17.65 8.55 17.1V6.9Z",
                    transform: "translate(13.165 12) scale(1.2) translate(-13.165 -12)",
                    fill: "currentColor"
                }));
                return svg;
            }

            function setPlayerActionButtonVisual(btn, action) {
                if (!btn) return;
                const normalized = String(action ?? "").trim().toLowerCase();
                const label = getPlayerActionLabel(normalized);
                btn.setAttribute("data-action", normalized || "run");
                btn.title = label;
                btn.setAttribute("aria-label", label);
                btn.classList.remove("qi-btn-primary", "qi-btn-danger");
                if (normalized === "stop") {
                    btn.classList.add("qi-btn-danger");
                } else if (normalized === "resume" || normalized === "run" || normalized === "replay") {
                    btn.classList.add("qi-btn-primary");
                }
                btn.replaceChildren(createPlayerActionIcon(normalized));
            }

            function createPlayerActionButton(action, onClick, { disabled = false } = {}) {
                const btn = globalThis.document.createElement("button");
                btn.type = "button";
                btn.className = "qi-btn qi-player-btn";
                btn.disabled = !!disabled;
                setPlayerActionButtonVisual(btn, action);
                if (typeof onClick === "function") btn.addEventListener("click", onClick);
                return btn;
            }

            function createPlayerActionsBar() {
                const actionsEl = globalThis.document.createElement("div");
                actionsEl.className = "qi-actions";

                const stopBtn = createPlayerActionButton("stop", stopMacro, { disabled: true });
                stopBtn.hidden = !running;
                stopBtn.setAttribute("aria-hidden", running ? "false" : "true");
                stopBtn.style.display = running ? "" : "none";
                stopButtons.push(stopBtn);

                const playPauseBtn = createPlayerActionButton(getPrimaryButtonAction(), handlePrimaryAction);
                playPauseButtons.push(playPauseBtn);

                actionsEl.appendChild(stopBtn);
                actionsEl.appendChild(playPauseBtn);
                return actionsEl;
            }

            function syncRunControls() {
                const isBusy = running;
                const isCancelling = isBusy && cancelRun;
                for (const btn of stopButtons) {
                    if (!btn) continue;
                    btn.disabled = !isBusy || isCancelling;
                    btn.hidden = !isBusy;
                    btn.setAttribute("aria-hidden", isBusy ? "false" : "true");
                    btn.style.display = isBusy ? "" : "none";
                }
                for (const btn of playPauseButtons) {
                    if (!btn) continue;
                    btn.disabled = isCancelling;
                    setPlayerActionButtonVisual(btn, getPrimaryButtonAction());
                }
                for (const input of hotkeyInputs) {
                    if (input) input.disabled = isBusy;
                }
                if (addHotkeyBtnEl) addHotkeyBtnEl.disabled = isBusy;
                try {
                    const delButtons = hotkeyListEl?.querySelectorAll?.("button.qi-hotkey-del") || [];
                    for (const btn of delButtons) {
                        if (btn) btn.disabled = isBusy;
                    }
                } catch {}
                if (loopEl) loopEl.disabled = isBusy;
                if (stepDelayEl) stepDelayEl.disabled = isBusy;
                if (stepDelayUnitEl) stepDelayUnitEl.disabled = isBusy;
                if (loopDelayEl) loopDelayEl.disabled = isBusy;
                if (loopDelayUnitEl) loopDelayUnitEl.disabled = isBusy;
                if (clearBeforeRunEl) clearBeforeRunEl.disabled = isBusy;
                if (newChatHotkeyEl) newChatHotkeyEl.disabled = isBusy;
                if (textEl) textEl.disabled = isBusy;
                if (imageDropEl) {
                    imageDropEl.style.opacity = isBusy ? "0.7" : "1";
                    imageDropEl.setAttribute("data-disabled", isBusy ? "1" : "0");
                    imageDropEl.tabIndex = isBusy ? -1 : 0;
                }
                if (imagePreviewShellEl) {
                    imagePreviewShellEl.setAttribute("data-disabled", isBusy ? "1" : "0");
                }
                if (clearAllImagesBtnEl) {
                    const hasImages = (imageFiles?.length || 0) > 0;
                    clearAllImagesBtnEl.disabled = isBusy || !hasImages;
                }
                try {
                    const delButtons = imagePreviewListEl?.querySelectorAll?.("button.qi-preview-del") || [];
                    for (const btn of delButtons) {
                        if (btn) btn.disabled = isBusy;
                    }
                } catch {}
            }

            function setPausedState(nextPaused, { log = true } = {}) {
                if (!running) return;
                const targetPaused = !!nextPaused;
                if (paused === targetPaused) return;

                if (targetPaused) {
                    paused = true;
                    pauseStartedAtMs = Date.now();
                    if (log) {
                        appendRuntimeLog(labels.messages?.paused || DEFAULT_LABELS.messages.paused, { level: "warn" });
                    }
                    setActiveTab?.("log");
                } else {
                    if (pauseStartedAtMs) {
                        accumulatedPausedMs += Math.max(0, Date.now() - pauseStartedAtMs);
                    }
                    pauseStartedAtMs = 0;
                    paused = false;
                    if (log) {
                        appendRuntimeLog(labels.messages?.resumed || DEFAULT_LABELS.messages.resumed, { level: "ok" });
                    }
                }

                syncRunControls();
            }

            function pauseRun() {
                if (!running || cancelRun) return;
                setPausedState(true);
            }

            function resumeRun() {
                if (!running || cancelRun) return;
                setPausedState(false);
            }

            function togglePause() {
                if (!running || cancelRun) return;
                if (paused) {
                    resumeRun();
                    return;
                }
                pauseRun();
            }

            function normalizeThemeMode(value) {
                const token = String(value ?? "").trim().toLowerCase();
                if (token === "dark" || token === "light" || token === "page") return token;
                return "system";
            }

            function getNewChatTriggerLabel(hotkey) {
                const label = resolveDynamicText(adapter.newChatLabel, "");
                return label || String(hotkey || "").trim();
            }

            function getLockedNewChatHotkeyDisplay(cfg = null) {
                const value = String(
                    (cfg && typeof cfg.newChatHotkey === "string") ? cfg.newChatHotkey : defaults.newChatHotkey
                );
                return resolveDynamicText(lockedNewChatHotkeyDisplay, "") || getNewChatTriggerLabel(value);
            }

            function resolveDynamicText(value, fallback = "") {
                let raw = value;
                if (typeof raw === "function") {
                    try {
                        raw = raw({
                            engine,
                            i18n: engineI18n || quickI18n,
                            labels,
                            locale: getEffectiveLocale()
                        });
                    } catch {
                        raw = fallback;
                    }
                }
                const text = String(raw ?? fallback).trim();
                return text || String(fallback || "").trim();
            }

            function getDelayUnitLabels() {
                return (labels.delayUnits && typeof labels.delayUnits === "object")
                    ? { ...DELAY_UNIT_LABELS, ...labels.delayUnits }
                    : DELAY_UNIT_LABELS;
            }

            function getDelayFallbackUnit(unit, fallbackMs) {
                return normalizeDelayUnit(unit) || inferDelayUnitFromMs(fallbackMs);
            }

            function syncDelayInputConstraints(inputEl, unitEl, maxMs) {
                if (!inputEl) return;
                const unit = normalizeDelayUnit(unitEl?.value) || inferDelayUnitFromMs(maxMs);
                inputEl.min = "0";
                inputEl.step = "any";
                inputEl.max = formatDelayInputValue(maxMs, unit);
                const formattedMax = formatDelayWithUnit(maxMs, unit, getDelayUnitLabels());
                inputEl.title = labels.messages?.maxDelayTitle
                    ? labels.messages.maxDelayTitle(formattedMax)
                    : DEFAULT_LABELS.messages.maxDelayTitle(formattedMax);
            }

            function setDelayControlValue(inputEl, unitEl, delayMs, unit, maxMs) {
                if (!inputEl || !unitEl) return;
                const normalizedUnit = normalizeDelayUnit(unit) || inferDelayUnitFromMs(delayMs);
                unitEl.value = normalizedUnit;
                unitEl.dataset.prevUnit = normalizedUnit;
                syncDelayInputConstraints(inputEl, unitEl, maxMs);
                inputEl.value = formatDelayInputValue(delayMs, normalizedUnit);
            }

            function readDelayControlValue(inputEl, unitEl, { fallbackMs = 0, fallbackUnit = "", maxMs = 0 } = {}) {
                const safeFallbackMs = clampDelayMs(fallbackMs, maxMs, fallbackMs);
                const unit = normalizeDelayUnit(unitEl?.value) || getDelayFallbackUnit(fallbackUnit, safeFallbackMs);
                const rawMs = convertDelayInputToMs(inputEl?.value, unit);
                return {
                    ms: clampDelayMs(rawMs, maxMs, safeFallbackMs),
                    unit
                };
            }

            function persistDelayControls() {
                saveConfig(storageKey, readConfigFromUi(), defaults);
            }

            function handleDelayInputChange({ inputEl, unitEl, fallbackMs, fallbackUnit, maxMs }) {
                const next = readDelayControlValue(inputEl, unitEl, { fallbackMs, fallbackUnit, maxMs });
                setDelayControlValue(inputEl, unitEl, next.ms, next.unit, maxMs);
                persistDelayControls();
            }

            function handleDelayUnitChange({ inputEl, unitEl, fallbackMs, fallbackUnit, maxMs }) {
                if (!unitEl) return;
                const safeFallbackMs = clampDelayMs(fallbackMs, maxMs, fallbackMs);
                const prevUnit = normalizeDelayUnit(unitEl.dataset.prevUnit) || getDelayFallbackUnit(fallbackUnit, safeFallbackMs);
                const nextUnit = normalizeDelayUnit(unitEl.value) || prevUnit;
                const rawMs = convertDelayInputToMs(inputEl?.value, prevUnit);
                const nextMs = clampDelayMs(rawMs, maxMs, safeFallbackMs);
                setDelayControlValue(inputEl, unitEl, nextMs, nextUnit, maxMs);
                persistDelayControls();
            }

            function getNewChatHotkeyConfigValueFromUi() {
                if (!lockNewChatHotkey) return String(newChatHotkeyEl?.value ?? "");
                const cfg = loadConfig(storageKey, defaults);
                if (cfg && typeof cfg.newChatHotkey === "string") return cfg.newChatHotkey;
                return typeof defaults.newChatHotkey === "string" ? defaults.newChatHotkey : "";
            }

            async function triggerNewChatAction({ hotkey, phase = "primary", attempt = 1, shouldCancel = null, runtime = null } = {}) {
                const fallbackHotkey = String(hotkey || "").trim();
                const triggerLabel = getNewChatTriggerLabel(fallbackHotkey);
                if (!fallbackHotkey && !hasCustomNewChatTrigger) return { ok: false, label: triggerLabel };

                try {
                    const result = await adapter.triggerNewChat({
                        hotkey: fallbackHotkey,
                        phase,
                        attempt,
                        shouldCancel,
                        runtime,
                        fallbackTrigger: () => fallbackHotkey ? executeEngineShortcutByHotkey(engine, fallbackHotkey) : false
                    });
                    if (result && typeof result === "object") {
                        const resolvedLabel = String(result.label || "").trim() || triggerLabel;
                        return { ok: !!result.ok, label: resolvedLabel };
                    }
                    return { ok: !!result, label: triggerLabel };
                } catch {
                    return { ok: false, label: triggerLabel };
                }
            }

            async function ensureNewChatReady({ newChatHotkey, shouldCancel, runtime = null, maxNewChatRetries = 1, onRetry = null } = {}) {
                const cancelFn = typeof shouldCancel === "function" ? shouldCancel : null;
                const runtimeApi = runtime && typeof runtime === "object" ? runtime : null;
                const safeRetryCount = Math.max(0, Number.parseInt(String(maxNewChatRetries ?? 1), 10) || 0);
                const totalAttempts = safeRetryCount + 1;
                let okNewChat = false;
                let verificationMessage = "";
                let attemptsUsed = 0;
                let usedNewChatLabel = getNewChatTriggerLabel(newChatHotkey);

                for (let attemptIndex = 0; attemptIndex < totalAttempts; attemptIndex++) {
                    attemptsUsed = attemptIndex + 1;
                    const triggerResult = await triggerNewChatAction({
                        hotkey: newChatHotkey,
                        phase: attemptIndex === 0 ? "primary" : "retry",
                        attempt: attemptIndex + 1,
                        shouldCancel: cancelFn,
                        runtime: runtimeApi
                    });
                    const triggerLabel = String(triggerResult?.label || newChatHotkey || "").trim() || String(newChatHotkey || "").trim();
                    usedNewChatLabel = triggerLabel;
                    let attemptOk = !!triggerResult?.ok;
                    let attemptMessage = "";

                    if (attemptOk && adapter.waitForNewChatReady) {
                        const verification = await adapter.waitForNewChatReady({
                            hotkey: triggerLabel,
                            timeoutMs: 12000,
                            intervalMs: 160,
                            shouldCancel: cancelFn,
                            runtime: runtimeApi
                        });
                        if (verification && typeof verification === "object") {
                            if (verification.cancelled) {
                                return { cancelled: true, okNewChat: false, attemptsUsed, usedNewChatLabel, verificationMessage };
                            }
                            attemptOk = !!verification.ok;
                            attemptMessage = typeof verification.message === "string" ? verification.message.trim() : "";
                        } else {
                            attemptOk = !!verification;
                        }
                    }

                    if (attemptOk) {
                        okNewChat = true;
                        verificationMessage = attemptMessage;
                        break;
                    }

                    verificationMessage = attemptMessage;
                    if (attemptIndex >= totalAttempts - 1) break;

                    if (typeof onRetry === "function") {
                        try {
                            onRetry({
                                hotkey: getNewChatTriggerLabel(newChatHotkey),
                                attempt: attemptIndex + 1,
                                maxRetries: safeRetryCount
                            });
                        } catch {}
                    }

                    const retryWaitOk = await sleepWithCancel(800, { shouldCancel: cancelFn, chunkMs: 160, runtime: runtimeApi });
                    if (!retryWaitOk) {
                        return { cancelled: true, okNewChat: false, attemptsUsed, usedNewChatLabel, verificationMessage };
                    }
                }

                return {
                    cancelled: !!(cancelFn && cancelFn()),
                    okNewChat,
                    attemptsUsed,
                    usedNewChatLabel,
                    verificationMessage
                };
            }

            function getPanelViewportHeightPx() {
                const visualHeight = Number(globalThis.visualViewport?.height);
                if (Number.isFinite(visualHeight) && visualHeight > 0) return visualHeight;
                const innerHeight = Number(globalThis.innerHeight);
                if (Number.isFinite(innerHeight) && innerHeight > 0) return innerHeight;
                return 0;
            }

            function getPanelMaxHeightPx() {
                const viewportHeight = getPanelViewportHeightPx();
                if (!viewportHeight) return 0;
                return Math.max(0, Math.round(viewportHeight - PANEL_VIEWPORT_MARGIN_PX));
            }

            function clampPanelHeightPx(value) {
                const num = Number(value);
                if (!Number.isFinite(num) || num <= 0) return 0;
                const max = getPanelMaxHeightPx();
                if (!Number.isFinite(max) || max <= 0) return Math.round(num);
                return Math.round(Math.min(num, max));
            }

            function measureElementHeightPx(el) {
                const value = Number(el?.offsetHeight);
                if (!Number.isFinite(value) || value <= 0) return 0;
                return Math.round(value);
            }

            function measureScrollableElementHeightPx(el) {
                const value = Number(el?.scrollHeight);
                if (!Number.isFinite(value) || value <= 0) return 0;
                return Math.round(value);
            }

            function getActiveTabDesiredHeightPx() {
                const headerHeight = measureElementHeightPx(headerEl);
                const panelBorderHeight = Math.max(0, Math.round((Number(panelEl?.offsetHeight) || 0) - (Number(panelEl?.clientHeight) || 0)));

                if (activeTab === "log") {
                    const logHeight = measureScrollableElementHeightPx(logEl);
                    const actionsHeight = measureElementHeightPx(logActionsEl);
                    return headerHeight + logHeight + actionsHeight + panelBorderHeight;
                }

                const bodyHeight = measureScrollableElementHeightPx(inputBodyEl);
                const actionsHeight = measureElementHeightPx(inputActionsEl);
                return headerHeight + bodyHeight + actionsHeight + panelBorderHeight;
            }

            function syncPanelHeight() {
                if (!panelEl) return;
                const maxHeight = getPanelMaxHeightPx();
                if (maxHeight > 0) {
                    panelEl.style.maxHeight = `${maxHeight}px`;
                }
                const desiredHeight = getActiveTabDesiredHeightPx();
                const fallbackHeight = Number(panelEl.scrollHeight);
                const next = clampPanelHeightPx(desiredHeight || fallbackHeight);
                if (!next) return;
                panelEl.style.height = `${next}px`;
            }

            function flushScheduledPanelLayout() {
                panelLayoutRaf = 0;
                syncPanelHeight();
                if (pendingLogScrollToBottom && logEl && activeTab === "log" && overlayEl?.getAttribute?.("data-open") === "1") {
                    logEl.scrollTop = logEl.scrollHeight;
                    pendingLogScrollToBottom = false;
                }
            }

            function schedulePanelLayout({ scrollLogToBottom = false } = {}) {
                if (scrollLogToBottom) pendingLogScrollToBottom = true;
                if (panelLayoutRaf) return;
                panelLayoutRaf = requestAnimationFrameSafe(() => {
                    flushScheduledPanelLayout();
                });
            }

            function setImportantStyle(el, name, value) {
                if (!el?.style?.setProperty) return;
                try { el.style.setProperty(name, value, "important"); } catch {}
            }

            function applyOverlayHostBaseStyles() {
                if (!overlayEl) return;
                setImportantStyle(overlayEl, "all", "initial");
                setImportantStyle(overlayEl, "position", "fixed");
                setImportantStyle(overlayEl, "inset", "0");
                setImportantStyle(overlayEl, "z-index", "2147483646");
                setImportantStyle(overlayEl, "display", "none");
                setImportantStyle(overlayEl, "margin", "0");
                setImportantStyle(overlayEl, "padding", "0");
                setImportantStyle(overlayEl, "border", "0");
                setImportantStyle(overlayEl, "background", "transparent");
                setImportantStyle(overlayEl, "pointer-events", "auto");
                setImportantStyle(overlayEl, "font-family", 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif');
                setImportantStyle(overlayEl, "font-size", "13px");
                setImportantStyle(overlayEl, "line-height", "1.4");
                setImportantStyle(overlayEl, "-webkit-text-size-adjust", "100%");
                setImportantStyle(overlayEl, "text-size-adjust", "100%");
            }

            function setOverlayVisibility(isOpen) {
                if (!overlayEl) return;
                overlayEl.setAttribute("data-open", isOpen ? "1" : "0");
                setImportantStyle(overlayEl, "display", isOpen ? "block" : "none");
            }

            function getLogTimestamp(date = new Date()) {
                return `${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}:${String(date.getSeconds()).padStart(2, "0")}`;
            }

            function scrollLogToBottom() {
                if (!logEl) return;
                schedulePanelLayout({ scrollLogToBottom: true });
            }

            function clearActiveLoopLogTarget() {
                activeLoopLogGroupEl = null;
                activeLoopLogBodyEl = null;
            }

            function normalizeLogStatus(status) {
                const token = String(status ?? "").trim().toLowerCase();
                if (token === "ok" || token === "success" || token === "finished") return "ok";
                if (token === "error" || token === "failed" || token === "failure") return "error";
                if (token === "warn" || token === "warning" || token === "cancelled" || token === "canceled" || token === "stopped") return "warn";
                return "info";
            }

            function setLogGroupStatus(groupEl, status) {
                if (!groupEl) return;
                const normalized = normalizeLogStatus(status);
                groupEl.classList.remove("qi-log-group-status-info", "qi-log-group-status-ok", "qi-log-group-status-error", "qi-log-group-status-warn");
                groupEl.classList.add(`qi-log-group-status-${normalized}`);

                const summaryEl = groupEl.querySelector?.(".qi-log-group-summary");
                const tagEl = summaryEl?.querySelector?.(".qi-log-group-status-tag") || null;
                try { tagEl?.remove?.(); } catch {}
            }

            function setCollapsibleOpenState(rootEl, open, { scheduleLayout = false } = {}) {
                if (!rootEl) return;
                const nextOpen = !!open;
                try { rootEl.setAttribute("data-open", nextOpen ? "1" : "0"); } catch {}
                const toggleEl = rootEl.__qiToggleButton || null;
                const bodyEl = rootEl.__qiToggleBody || null;
                try { toggleEl?.setAttribute?.("aria-expanded", nextOpen ? "true" : "false"); } catch {}
                try {
                    if (bodyEl) bodyEl.hidden = !nextOpen;
                } catch {}
                if (scheduleLayout) schedulePanelLayout();
            }

            function initCollapsibleRoot(rootEl, toggleEl, bodyEl, { open = false } = {}) {
                if (!rootEl || !toggleEl || !bodyEl) return;
                rootEl.__qiToggleButton = toggleEl;
                rootEl.__qiToggleBody = bodyEl;
                setCollapsibleOpenState(rootEl, open);
                toggleEl.addEventListener("click", (event) => {
                    event.preventDefault();
                    event.stopPropagation();
                    const currentOpen = rootEl.getAttribute?.("data-open") === "1";
                    setCollapsibleOpenState(rootEl, !currentOpen, { scheduleLayout: true });
                });
            }

            function createLogLineElement(text, { level = "info", time = getLogTimestamp() } = {}) {
                const lineEl = globalThis.document?.createElement?.("div");
                const timeEl = globalThis.document?.createElement?.("span");
                const messageEl = globalThis.document?.createElement?.("span");
                if (!lineEl || !timeEl || !messageEl) return null;
                lineEl.className = "qi-log-line";
                if (level === "error") lineEl.classList.add("qi-error");
                if (level === "ok") lineEl.classList.add("qi-ok");
                timeEl.className = "qi-log-time";
                timeEl.textContent = `[${time}]`;
                messageEl.className = "qi-log-message";
                messageEl.textContent = String(text ?? "");
                lineEl.appendChild(timeEl);
                lineEl.appendChild(messageEl);
                return lineEl;
            }

            function appendLogToContainer(container, text, { level = "info", time = getLogTimestamp() } = {}) {
                if (!container) return;
                const lineEl = createLogLineElement(text, { level, time });
                if (!lineEl) return;
                container.appendChild(lineEl);
                scrollLogToBottom();
            }

            function createStatusLogElement(text, { level = "info", time = getLogTimestamp(), detail = "", collapsible = false, open = true } = {}) {
                const detailText = String(detail ?? "").trim();
                const useCollapsible = !!(collapsible && detailText);
                const lineEl = globalThis.document?.createElement?.("div");
                const headerEl = globalThis.document?.createElement?.(useCollapsible ? "button" : "div");
                const timeEl = globalThis.document?.createElement?.("span");
                const dividerEl = globalThis.document?.createElement?.("span");
                const messageEl = globalThis.document?.createElement?.("span");
                if (!lineEl || !headerEl || !timeEl || !dividerEl || !messageEl) return null;

                const normalized = normalizeLogStatus(level);
                lineEl.className = `qi-log-status-card qi-log-status-${normalized}`;
                if (useCollapsible) {
                    lineEl.classList.add("qi-log-status-collapsible");
                    try {
                        headerEl.type = "button";
                        headerEl.setAttribute("aria-expanded", open ? "true" : "false");
                    } catch {}
                }
                headerEl.className = useCollapsible ? "qi-log-status-summary" : "qi-log-status-header";
                timeEl.className = "qi-log-status-time";
                timeEl.textContent = `[${time}]`;
                dividerEl.className = "qi-log-status-divider";
                messageEl.className = "qi-log-status-divider-label";
                messageEl.textContent = String(text ?? "");
                dividerEl.appendChild(messageEl);
                headerEl.appendChild(timeEl);
                headerEl.appendChild(dividerEl);

                if (useCollapsible) {
                    const bodyEl = globalThis.document?.createElement?.("div");
                    const detailEl = globalThis.document?.createElement?.("div");
                    if (!bodyEl || !detailEl) return null;

                    bodyEl.className = "qi-log-status-body";
                    detailEl.className = "qi-log-status-detail";
                    detailEl.textContent = detailText;
                    bodyEl.appendChild(detailEl);
                    lineEl.appendChild(headerEl);
                    lineEl.appendChild(bodyEl);
                    initCollapsibleRoot(lineEl, headerEl, bodyEl, { open });
                    return lineEl;
                }

                lineEl.appendChild(headerEl);

                if (detailText) {
                    const bodyEl = globalThis.document?.createElement?.("div");
                    const detailEl = globalThis.document?.createElement?.("div");
                    if (bodyEl && detailEl) {
                        bodyEl.className = "qi-log-status-body";
                        detailEl.className = "qi-log-status-detail";
                        detailEl.textContent = detailText;
                        bodyEl.appendChild(detailEl);
                        lineEl.appendChild(bodyEl);
                    }
                }
                return lineEl;
            }

            function appendStatusLog(text, { level = "info", time = getLogTimestamp(), detail = "", collapsible = false, open = true } = {}) {
                if (!logEl) return;
                const lineEl = createStatusLogElement(text, { level, time, detail, collapsible, open });
                if (!lineEl) return;
                logEl.appendChild(lineEl);
                scrollLogToBottom();
            }

            function collapseOpenLoopLogGroups() {
                if (!logEl) return;
                let groups = [];
                try {
                    groups = Array.from(logEl.querySelectorAll(".qi-log-group-loop[data-open='1']"));
                } catch {
                    groups = [];
                }
                for (const group of groups) {
                    setCollapsibleOpenState(group, false);
                }
                if (groups.length) schedulePanelLayout();
            }

            function normalizeLogGroupLabel(title) {
                const raw = String(title ?? "").trim();
                if (!raw) return "";
                const stripped = raw
                    .replace(/^[\s\-–—_·•|]+/, "")
                    .replace(/[\s\-–—_·•|]+$/, "")
                    .trim();
                return stripped || raw;
            }

            function createLogGroup(title, { variant = "", open = false } = {}) {
                const groupEl = globalThis.document?.createElement?.("div");
                const summaryEl = globalThis.document?.createElement?.("button");
                const timeEl = globalThis.document?.createElement?.("span");
                const dividerEl = globalThis.document?.createElement?.("span");
                const labelEl = globalThis.document?.createElement?.("span");
                const bodyEl = globalThis.document?.createElement?.("div");
                if (!groupEl || !summaryEl || !timeEl || !dividerEl || !labelEl || !bodyEl) return null;

                const time = getLogTimestamp();
                groupEl.className = `qi-log-group${variant ? ` qi-log-group-${variant}` : ""}`;
                try {
                    summaryEl.type = "button";
                    summaryEl.setAttribute("aria-expanded", open ? "true" : "false");
                } catch {}

                summaryEl.className = "qi-log-group-summary";
                timeEl.className = "qi-log-group-time";
                timeEl.textContent = `[${time}]`;

                dividerEl.className = "qi-log-group-divider";
                labelEl.className = "qi-log-group-divider-label";
                labelEl.textContent = normalizeLogGroupLabel(title);
                dividerEl.appendChild(labelEl);

                bodyEl.className = "qi-log-group-body";

                summaryEl.appendChild(timeEl);
                summaryEl.appendChild(dividerEl);
                groupEl.appendChild(summaryEl);
                groupEl.appendChild(bodyEl);
                initCollapsibleRoot(groupEl, summaryEl, bodyEl, { open });
                return { groupEl, bodyEl, time };
            }

            function createLogGroupDetailElement(text, { level = "info" } = {}) {
                const detailEl = globalThis.document?.createElement?.("div");
                if (!detailEl) return null;
                detailEl.className = "qi-log-group-detail";
                if (level === "error") detailEl.classList.add("qi-error");
                if (level === "ok") detailEl.classList.add("qi-ok");
                detailEl.textContent = String(text ?? "");
                return detailEl;
            }

            function createLogGroupDetailRowsElement(rows, { level = "info" } = {}) {
                const detailEl = globalThis.document?.createElement?.("div");
                if (!detailEl) return null;
                detailEl.className = "qi-log-group-detail qi-log-group-detail-rows";
                if (level === "error") detailEl.classList.add("qi-error");
                if (level === "ok") detailEl.classList.add("qi-ok");

                const list = Array.isArray(rows) ? rows : [];
                for (const item of list) {
                    if (!item) continue;
                    const rowEl = globalThis.document?.createElement?.("div");
                    const labelEl = globalThis.document?.createElement?.("span");
                    const valueEl = globalThis.document?.createElement?.("span");
                    if (!rowEl || !labelEl || !valueEl) continue;

                    const label = (item && typeof item === "object")
                        ? String(item.label ?? "")
                        : "";
                    const value = (item && typeof item === "object")
                        ? String(item.value ?? "")
                        : String(item ?? "");

                    rowEl.className = "qi-log-group-detail-row";
                    labelEl.className = "qi-log-group-detail-label";
                    valueEl.className = "qi-log-group-detail-value";
                    labelEl.textContent = label;
                    valueEl.textContent = value;
                    rowEl.appendChild(labelEl);
                    rowEl.appendChild(valueEl);
                    detailEl.appendChild(rowEl);
                }

                return detailEl;
            }

            function appendConfigLogGroup(title, textOrRows, { level = "info", open = false } = {}) {
                if (!logEl) return;
                const group = createLogGroup(title, { variant: "config", open });
                if (!group?.groupEl || !group?.bodyEl) return;
                const detailEl = Array.isArray(textOrRows)
                    ? createLogGroupDetailRowsElement(textOrRows, { level })
                    : createLogGroupDetailElement(textOrRows, { level });
                if (detailEl) group.bodyEl.appendChild(detailEl);
                setLogGroupStatus(group.groupEl, "info");
                logEl.appendChild(group.groupEl);
                scrollLogToBottom();
                return group.groupEl;
            }

            function startLoopLogGroup(title) {
                if (!logEl) return;
                collapseOpenLoopLogGroups();

                const group = createLogGroup(title, { variant: "loop", open: true });
                if (!group?.groupEl || !group?.bodyEl) return;

                logEl.appendChild(group.groupEl);

                activeLoopLogGroupEl = group.groupEl;
                activeLoopLogBodyEl = group.bodyEl;
                scrollLogToBottom();
            }

            function appendLog(text, { level = "info", scope = "globalThis" } = {}) {
                const container = (scope === "loop")
                    ? (activeLoopLogBodyEl || logEl)
                    : logEl;
                appendLogToContainer(container, text, { level });
            }

            function appendGlobalLog(text, options = {}) {
                appendLog(text, { ...(options || {}), scope: "globalThis" });
            }

            function appendLoopLog(text, options = {}) {
                appendLog(text, { ...(options || {}), scope: "loop" });
            }

            function clearLog() {
                if (!logEl) return;
                logEl.textContent = "";
                runConfigGroupEl = null;
                pendingFinalStatusDetail = "";
                clearActiveLoopLogTarget();
                schedulePanelLayout();
            }

            function revokeImageUrls() {
                for (const url of imageObjectUrls) {
                    if (!url) continue;
                    revokeObjectUrlSafe(url);
                }
                imageObjectUrls = [];
            }

            function persistDraftSnapshot({ text = null, images = null } = {}) {
                const snapshot = {
                    text: text == null ? String(textEl?.value ?? "") : String(text),
                    images: Array.isArray(images) ? images : draftImageEntries
                };

                return queueDraftWrite(async () => {
                    const result = await saveDraft(draftStorageKey, snapshot);
                    draftImageEntries = Array.isArray(result?.storedImages) ? result.storedImages : [];
                    return result;
                });
            }

            async function persistDraftImagesFromFiles(files) {
                const token = ++draftPersistToken;
                const list = Array.from(files || []).filter(isImageFileLike);
                const serialized = [];

                for (let index = 0; index < list.length; index++) {
                    const file = list[index];
                    let dataUrl = "";
                    try {
                        dataUrl = await readFileAsDataUrl(file);
                    } catch {
                        dataUrl = "";
                    }
                    if (token !== draftPersistToken) return false;

                    const entry = normalizeDraftImageEntry({
                        name: file.name,
                        type: file.type,
                        size: file.size,
                        lastModified: file.lastModified,
                        dataUrl
                    }, index);
                    if (entry) serialized.push(entry);
                }

                if (token !== draftPersistToken) return false;
                const result = await persistDraftSnapshot({ images: serialized });
                return !!result?.ok;
            }

            function persistDraftText() {
                void persistDraftSnapshot();
            }

            function clearDraftImagesState({ preserveText = true } = {}) {
                draftImageEntries = [];
                draftPersistToken += 1;
                try {
                    setImageFiles([], { skipDraftPersist: true });
                } catch (error) {
                    warnQuickInput("Error while clearing image draft state.", error);
                }
                void persistDraftSnapshot({
                    text: preserveText ? String(textEl?.value ?? "") : "",
                    images: []
                });
            }

            async function restoreDraftFromStorage() {
                let storedDraft = { text: "", images: [] };
                try {
                    storedDraft = await loadDraft(draftStorageKey);
                } catch (error) {
                    warnQuickInput("Failed to read saved draft; ignored it.", error);
                }
                if (textEl) textEl.value = String(storedDraft.text ?? "");

                if (!storedDraft.images.length) {
                    clearDraftImagesState({ preserveText: true });
                    return;
                }

                try {
                    const restoredFiles = [];
                    const restoredEntries = [];
                    storedDraft.images.forEach((entry, index) => {
                        const normalized = normalizeDraftImageEntry(entry, index);
                        if (!normalized) return;
                        const file = dataUrlToFile(normalized.dataUrl, normalized);
                        if (!file || !isImageFileLike(file)) return;
                        restoredFiles.push(file);
                        restoredEntries.push(normalized);
                    });

                    draftImageEntries = restoredEntries;
                    draftPersistToken += 1;
                    setImageFiles(restoredFiles, { draftEntries: restoredEntries, skipDraftPersist: true });

                    if (restoredEntries.length !== storedDraft.images.length) {
                        void persistDraftSnapshot({ text: String(textEl?.value ?? ""), images: restoredEntries });
                    }
                } catch (error) {
                    warnQuickInput("Failed to restore image draft; skipped corrupted image draft data.", error);
                    clearDraftImagesState({ preserveText: true });
                }
            }

            function setImageFiles(nextFiles, { draftEntries = null, skipDraftPersist = false } = {}) {
                revokeImageUrls();
                imageFiles = Array.isArray(nextFiles) ? nextFiles.filter(Boolean) : [];
                const normalizedDraftEntries = Array.isArray(draftEntries) ? normalizeDraftImages(draftEntries) : null;
                if (normalizedDraftEntries) draftImageEntries = normalizedDraftEntries;

                if (imagePreviewListEl) {
                    imagePreviewListEl.textContent = "";
                    let previewCount = 0;
                    imageFiles.forEach((file, index) => {
                        if (!isImageFileLike(file)) return;
                        const url = createObjectUrlSafe(file);
                        if (url) imageObjectUrls.push(url);
                        const wrap = globalThis.document.createElement("div");
                        wrap.className = "qi-preview-wrap";
                        wrap.title = file.name || "";
                        const img = globalThis.document.createElement("img");
                        img.className = "qi-preview-item";
                        if (url) img.src = url;
                        img.alt = file.name || "image";
                        wrap.appendChild(img);

                        const delBtn = globalThis.document.createElement("button");
                        delBtn.type = "button";
                        delBtn.className = "qi-preview-del";
                        delBtn.textContent = "×";
                        delBtn.title = labels.buttons?.delete || DEFAULT_LABELS.buttons.delete;
                        delBtn.setAttribute("aria-label", labels.aria?.deleteImage || DEFAULT_LABELS.aria.deleteImage);
                        delBtn.disabled = running;
                        delBtn.addEventListener("click", (e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            if (running) return;
                            const next = imageFiles.filter((_, i) => i !== index);
                            setImageFiles(next);
                            const label = file.name ? `：${file.name}` : ` #${index + 1}`;
                            appendGlobalLog(labels.messages?.imageDeleted
                                ? labels.messages.imageDeleted(label, next.length)
                                : DEFAULT_LABELS.messages.imageDeleted(label, next.length), { level: "ok" });
                        });
                        wrap.appendChild(delBtn);

                        imagePreviewListEl.appendChild(wrap);
                        previewCount += 1;
                    });
                    const hasItems = previewCount > 0;
                    if (imagePreviewShellEl) imagePreviewShellEl.setAttribute("data-has-items", hasItems ? "1" : "0");
                    if (imageDropEl) {
                        imageDropEl.textContent = hasItems
                            ? (labels.placeholders?.imageDropMore || DEFAULT_LABELS.placeholders.imageDropMore)
                            : (labels.placeholders?.imageDrop || DEFAULT_LABELS.placeholders.imageDrop);
                    }
                    if (clearAllImagesBtnEl) {
                        clearAllImagesBtnEl.disabled = running || !hasItems;
                    }
                    if (previewRowEl) previewRowEl.style.display = hasItems ? "" : "none";
                }

                if (skipDraftPersist) return;

                if (normalizedDraftEntries) {
                    draftPersistToken += 1;
                    void persistDraftSnapshot({ images: normalizedDraftEntries });
                    return;
                }
                if (imageFiles.length === 0) {
                    draftPersistToken += 1;
                    draftImageEntries = [];
                    void persistDraftSnapshot({ images: [] });
                    return;
                }
                void persistDraftImagesFromFiles(imageFiles);
            }

            function extractImageFilesFromTransfer(dataTransfer) {
                if (!dataTransfer) return [];

                const directFiles = Array.from(dataTransfer.files || [])
                    .filter(Boolean)
                    .filter((file) => String(file?.type || "").startsWith("image/"));
                if (directFiles.length) return directFiles;

                return Array.from(dataTransfer.items || [])
                    .filter((item) => item && item.kind === "file" && String(item.type || "").startsWith("image/"))
                    .map((item) => item.getAsFile?.())
                    .filter(Boolean);
            }

            function transferHasImageFiles(dataTransfer) {
                if (!dataTransfer) return false;
                if (Array.from(dataTransfer.files || []).some((file) => String(file?.type || "").startsWith("image/"))) {
                    return true;
                }
                return Array.from(dataTransfer.items || []).some((item) =>
                    item && item.kind === "file" && String(item.type || "").startsWith("image/")
                );
            }

            function setImageDropTargetActive(targetEl, active) {
                if (!targetEl) return;
                targetEl.setAttribute("data-drag-over", active ? "1" : "0");
            }

            function bindImageTransferTarget(targetEl, { enableClick = false, enablePaste = false, focusText = true } = {}) {
                if (!targetEl) return;
                let dragDepth = 0;

                const resetDragState = () => {
                    dragDepth = 0;
                    setImageDropTargetActive(targetEl, false);
                };

                const tryActivateDragState = (dataTransfer) => {
                    if (running) return false;
                    if (!transferHasImageFiles(dataTransfer)) return false;
                    setImageDropTargetActive(targetEl, true);
                    return true;
                };

                if (enableClick) {
                    targetEl.addEventListener("click", () => {
                        if (running) return;
                        try { fileInputEl?.click?.(); } catch {}
                    });
                }

                targetEl.addEventListener("dragenter", (e) => {
                    if (!tryActivateDragState(e.dataTransfer)) return;
                    e.preventDefault();
                    dragDepth += 1;
                });
                targetEl.addEventListener("dragover", (e) => {
                    if (!tryActivateDragState(e.dataTransfer)) return;
                    e.preventDefault();
                    if (dragDepth === 0) dragDepth = 1;
                    try {
                        if (e.dataTransfer) e.dataTransfer.dropEffect = "copy";
                    } catch {}
                });
                targetEl.addEventListener("dragleave", () => {
                    if (dragDepth > 0) dragDepth -= 1;
                    if (dragDepth <= 0) resetDragState();
                });
                targetEl.addEventListener("drop", (e) => {
                    const files = extractImageFilesFromTransfer(e.dataTransfer);
                    resetDragState();
                    if (running || files.length === 0) return;
                    e.preventDefault();
                    e.stopPropagation();
                    onPickFiles(files);
                    clearImageDropFocus({ focusText });
                });
                if (enablePaste) {
                    targetEl.addEventListener("paste", (e) => {
                        if (running) return;
                        const files = extractImageFilesFromTransfer(e.clipboardData);
                        if (files.length === 0) return;
                        onPickFiles(files);
                        clearImageDropFocus({ focusText });
                    });
                }
            }

            function onPickFiles(fileList) {
                if (running) return;
                const files = Array.from(fileList || []).filter(Boolean);
                const images = files.filter(f => String(f?.type || "").startsWith("image/"));
                if (images.length === 0) {
                    appendGlobalLog(labels.messages?.noImagesDetected || DEFAULT_LABELS.messages.noImagesDetected, { level: "error" });
                    return;
                }

                const existingImages = Array.isArray(imageFiles) ? imageFiles.filter(Boolean) : [];
                const nextImages = normalizeImageFiles(existingImages.concat(images));
                const renamedCount = images.reduce((sum, file, offset) => {
                    const nextFile = nextImages[existingImages.length + offset];
                    const originalName = String(file?.name || "").trim();
                    const nextName = String(nextFile?.name || "").trim();
                    return sum + (nextName && nextName !== originalName ? 1 : 0);
                }, 0);

                setImageFiles(nextImages);
                const kb = images.reduce((sum, file) => sum + (Number(file?.size) || 0), 0) / 1024;
                const totalCount = nextImages.length;
                const msg = labels.messages?.imagesLoaded
                    ? labels.messages.imagesLoaded(images.length, Math.round(kb), totalCount, renamedCount)
                    : DEFAULT_LABELS.messages.imagesLoaded(images.length, Math.round(kb), totalCount, renamedCount);
                appendGlobalLog(msg, { level: "ok" });
            }

            function handleTextInputPaste(e) {
                if (running) return;
                const files = extractImageFilesFromTransfer(e?.clipboardData);
                if (files.length === 0) return;
                try { e.preventDefault(); } catch {}
                try { e.stopPropagation(); } catch {}
                onPickFiles(files);
                try { textEl?.focus?.(); } catch {}
            }

            function clearImageDropFocus({ focusText = true } = {}) {
                try { imageDropEl?.blur?.(); } catch {}
                try { imagePreviewShellEl?.blur?.(); } catch {}
                try { fileInputEl?.blur?.(); } catch {}

                if (!focusText) return;
                if (activeTab !== "input") return;
                if (!overlayEl || overlayEl.getAttribute("data-open") !== "1") return;
                try { textEl?.focus?.(); } catch {}
            }

            function setRunning(nextRunning) {
                running = !!nextRunning;
                if (!running) resetPauseTracking();
                syncRunControls();
            }

            function isColorDark(colorStr) {
                if (!colorStr || colorStr === "transparent") {
                    return !!(globalThis.matchMedia && globalThis.matchMedia("(prefers-color-scheme: dark)").matches);
                }
                try {
                    let r, g, b, a = 1;
                    const value = String(colorStr);
                    if (value.startsWith("rgba")) {
                        const parts = value.match(/rgba?\s*\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*(?:,\s*([\d.]+))?\s*\)\s*$/i);
                        if (!parts) return false;
                        [, r, g, b, a] = parts.map(Number);
                        a = Number.isFinite(a) ? a : 1;
                        if (a < 0.5) return false;
                    } else if (value.startsWith("rgb")) {
                        const parts = value.match(/rgb\s*\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*\)\s*$/i);
                        if (!parts) return false;
                        [, r, g, b] = parts.map(Number);
                    } else if (value.startsWith("#")) {
                        let hex = value.slice(1);
                        if (hex.length === 3) hex = hex.split("").map(c => c + c).join("");
                        if (hex.length === 4) hex = hex.split("").map(c => c + c).join("");
                        if (hex.length === 8) a = parseInt(hex.slice(6, 8), 16) / 255;
                        if (hex.length !== 6 && hex.length !== 8) return false;
                        r = parseInt(hex.slice(0, 2), 16);
                        g = parseInt(hex.slice(2, 4), 16);
                        b = parseInt(hex.slice(4, 6), 16);
                        if (a < 0.5) return false;
                    } else {
                        return false;
                    }
                    const luminance = (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
                    return luminance < 0.5;
                } catch {
                    return false;
                }
            }

            function detectPageTheme() {
                const htmlEl = globalThis.document?.documentElement;
                const bodyEl = globalThis.document?.body;
                const htmlTheme = htmlEl?.getAttribute?.("data-theme");
                const bodyTheme = bodyEl?.getAttribute?.("data-theme");

                if (htmlEl?.classList?.contains?.("dark") || bodyEl?.classList?.contains?.("dark")) return "dark";
                if (htmlTheme === "dark" || bodyTheme === "dark") return "dark";
                if (htmlEl?.classList?.contains?.("light") || bodyEl?.classList?.contains?.("light")) return "light";
                if (htmlTheme === "light" || bodyTheme === "light") return "light";

                try {
                    const bgColor = globalThis.getComputedStyle(bodyEl || htmlEl).backgroundColor;
                    if (isColorDark(bgColor)) return "dark";
                    return "light";
                } catch {}

                return (globalThis.matchMedia && globalThis.matchMedia("(prefers-color-scheme: dark)").matches) ? "dark" : "light";
            }

            function normalizeTheme(value) {
                return String(value ?? "").trim().toLowerCase() === "light" ? "light" : "dark";
            }

            function getSystemTheme() {
                return (globalThis.matchMedia && globalThis.matchMedia("(prefers-color-scheme: dark)").matches) ? "dark" : "light";
            }

            function getConfiguredTheme() {
                if (themeMode === "page") return detectPageTheme();
                if (themeMode === "light" || themeMode === "dark") return themeMode;
                return getSystemTheme();
            }

            function applyTheme(theme) {
                if (!overlayEl) return;
                const normalized = normalizeTheme(theme);
                overlayEl.setAttribute("data-theme", normalized);
                setImportantStyle(overlayEl, "color-scheme", normalized);
            }

            function stopThemeAutoSync() {
                const cleanup = themeSyncCleanup;
                themeSyncCleanup = null;
                if (typeof cleanup !== "function") return;
                try { cleanup(); } catch {}
            }

            function startThemeAutoSync() {
                stopThemeAutoSync();
                refreshTheme();
                if (!overlayEl) return;
                if (themeMode === "light" || themeMode === "dark") return;

                if (themeMode === "system") {
                    const media = globalThis.matchMedia?.("(prefers-color-scheme: dark)");
                    if (!media) return;
                    const handleChange = () => {
                        if (!overlayEl || overlayEl.getAttribute("data-open") !== "1") return;
                        refreshTheme();
                    };
                    if (typeof media.addEventListener === "function") {
                        media.addEventListener("change", handleChange);
                        themeSyncCleanup = () => {
                            try { media.removeEventListener("change", handleChange); } catch {}
                        };
                        return;
                    }
                    if (typeof media.addListener === "function") {
                        media.addListener(handleChange);
                        themeSyncCleanup = () => {
                            try { media.removeListener(handleChange); } catch {}
                        };
                    }
                    return;
                }

                const timerId = globalThis.setInterval(() => {
                    if (!overlayEl || overlayEl.getAttribute("data-open") !== "1") return;
                    refreshTheme();
                }, 800);
                themeSyncCleanup = () => {
                    try { globalThis.clearInterval(timerId); } catch {}
                };
            }

            function refreshTheme() {
                applyTheme(getConfiguredTheme());
            }

            function clampPanelPos(left, top, width, height) {
                const margin = 8;
                const w = Math.max(0, Number(width) || 0);
                const h = Math.max(0, Number(height) || 0);
                const maxLeft = Math.max(margin, globalThis.innerWidth - w - margin);
                const maxTop = Math.max(margin, globalThis.innerHeight - h - margin);
                return {
                    left: Math.min(maxLeft, Math.max(margin, left)),
                    top: Math.min(maxTop, Math.max(margin, top))
                };
            }

            function readConfigFromUi() {
                const defaultStepDelayMs = clampInt(defaults.stepDelayMs, { min: 0, max: STEP_DELAY_MAX_MS, fallback: 1000 });
                const defaultLoopDelayMs = clampInt(defaults.loopDelayMs, { min: 0, max: LOOP_DELAY_MAX_MS, fallback: 20000 });
                const stepDelay = readDelayControlValue(stepDelayEl, stepDelayUnitEl, {
                    fallbackMs: defaultStepDelayMs,
                    fallbackUnit: defaults.stepDelayUnit,
                    maxMs: STEP_DELAY_MAX_MS
                });
                const loopDelay = readDelayControlValue(loopDelayEl, loopDelayUnitEl, {
                    fallbackMs: defaultLoopDelayMs,
                    fallbackUnit: defaults.loopDelayUnit,
                    maxMs: LOOP_DELAY_MAX_MS
                });
                const toolHotkeys = hotkeyInputs
                    .map(input => String(input?.value ?? "").trim())
                    .filter(Boolean);
                return {
                    toolHotkeys,
                    toolHotkey: toolHotkeys[0] || "",
                    newChatHotkey: getNewChatHotkeyConfigValueFromUi(),
                    loopCount: clampInt(loopEl?.value, { min: 1, max: 999, fallback: clampInt(defaults.loopCount, { min: 1, max: 999, fallback: 1 }) }),
                    stepDelayMs: stepDelay.ms,
                    stepDelayUnit: stepDelay.unit,
                    loopDelayMs: loopDelay.ms,
                    loopDelayUnit: loopDelay.unit,
                    clearBeforeRun: !!clearBeforeRunEl?.checked
                };
            }

            function persistPanelPos(left, top, { force = false } = {}) {
                const current = loadConfig(storageKey, defaults);
                const prev = current?.panelPos;
                const next = { left, top };
                if (!force && prev && Math.abs(prev.left - left) < 0.5 && Math.abs(prev.top - top) < 0.5) return;
                saveConfig(storageKey, { ...readConfigFromUi(), panelPos: next }, defaults);
            }

            function applyStoredPanelPos() {
                if (!panelEl) return;
                const cfg = loadConfig(storageKey, defaults);
                const pos = cfg?.panelPos;
                if (!pos) {
                    panelEl.style.left = "";
                    panelEl.style.top = "";
                    panelEl.style.transform = "";
                    return;
                }

                const rect = panelEl.getBoundingClientRect();
                const clamped = clampPanelPos(pos.left, pos.top, rect.width, rect.height);
                panelEl.style.left = `${clamped.left}px`;
                panelEl.style.top = `${clamped.top}px`;
                panelEl.style.transform = "none";
                if (clamped.left !== pos.left || clamped.top !== pos.top) persistPanelPos(clamped.left, clamped.top, { force: true });
            }

            function stopDrag() {
                if (dragRaf) {
                    cancelAnimationFrameSafe(dragRaf);
                    dragRaf = 0;
                }
                if (dragPointerId === null) return;
                dragPointerId = null;
                dragMoved = false;
                globalThis.removeEventListener("pointermove", onDragPointerMove, true);
                globalThis.removeEventListener("pointerup", onDragPointerUp, true);
                globalThis.removeEventListener("pointercancel", onDragPointerUp, true);
                if (dragRestore) {
                    try { globalThis.document.body.style.userSelect = dragRestore.userSelect; } catch {}
                    try { globalThis.document.body.style.cursor = dragRestore.cursor; } catch {}
                    dragRestore = null;
                }
            }

            function onHeaderPointerDown(e) {
                if (!e || dragPointerId !== null) return;
                if (e.button !== 0) return;
                if (e.target && typeof e.target.closest === "function" && e.target.closest(".qi-close, .qi-tabs, .qi-tab")) return;
                if (!overlayEl || overlayEl.getAttribute("data-open") !== "1") return;
                if (!panelEl) return;

                const rect = panelEl.getBoundingClientRect();
                dragPointerId = e.pointerId;
                dragOffsetX = e.clientX - rect.left;
                dragOffsetY = e.clientY - rect.top;
                dragWidth = rect.width;
                dragHeight = rect.height;
                dragStartLeft = rect.left;
                dragStartTop = rect.top;
                dragNextLeft = rect.left;
                dragNextTop = rect.top;
                dragMoved = false;

                globalThis.addEventListener("pointermove", onDragPointerMove, true);
                globalThis.addEventListener("pointerup", onDragPointerUp, true);
                globalThis.addEventListener("pointercancel", onDragPointerUp, true);
                try { e.currentTarget?.setPointerCapture?.(e.pointerId); } catch {}
                try { e.preventDefault(); } catch {}
            }

            function onDragPointerMove(e) {
                if (dragPointerId === null || e.pointerId !== dragPointerId) return;
                if (!panelEl) return;

                const left = e.clientX - dragOffsetX;
                const top = e.clientY - dragOffsetY;

                if (!dragMoved) {
                    const dx = Math.abs(left - dragStartLeft);
                    const dy = Math.abs(top - dragStartTop);
                    if (dx + dy < 3) return;
                    dragMoved = true;
                    dragRestore = { userSelect: globalThis.document.body.style.userSelect, cursor: globalThis.document.body.style.cursor };
                    try { globalThis.document.body.style.userSelect = "none"; } catch {}
                    try { globalThis.document.body.style.cursor = "move"; } catch {}
                    panelEl.style.left = `${dragStartLeft}px`;
                    panelEl.style.top = `${dragStartTop}px`;
                    panelEl.style.transform = "none";
                }

                const clamped = clampPanelPos(left, top, dragWidth, dragHeight);
                dragNextLeft = clamped.left;
                dragNextTop = clamped.top;
                if (dragRaf) return;
                dragRaf = requestAnimationFrameSafe(() => {
                    dragRaf = 0;
                    if (!panelEl) return;
                    panelEl.style.left = `${dragNextLeft}px`;
                    panelEl.style.top = `${dragNextTop}px`;
                });
            }

            function onDragPointerUp(e) {
                if (dragPointerId === null || e.pointerId !== dragPointerId) return;
                const moved = dragMoved;
                stopDrag();
                if (!moved || !panelEl) return;

                const rect = panelEl.getBoundingClientRect();
                const clamped = clampPanelPos(rect.left, rect.top, rect.width, rect.height);
                panelEl.style.left = `${clamped.left}px`;
                panelEl.style.top = `${clamped.top}px`;
                panelEl.style.transform = "none";
                persistPanelPos(clamped.left, clamped.top, { force: true });
            }

            function normalizeEngineHotkey(value) {
                const raw = String(value ?? "").trim().replace(/\s+/g, "");
                if (!raw) return "";
                const normalize = engine?.core?.hotkeys?.normalize || engine?.core?.normalizeHotkey || null;
                if (typeof normalize === "function") {
                    try {
                        return normalize(raw) || "";
                    } catch {}
                }
                return normalizeHotkeyFallback(raw);
            }

            function formatHotkeyLabel(value) {
                const raw = String(value ?? "").trim();
                if (!raw) return "";
                const formatter = engine?.core?.hotkeys?.formatForDisplay || null;
                if (typeof formatter === "function") {
                    try {
                        const formatted = String(formatter(raw) || "").trim();
                        if (formatted) return formatted;
                    } catch {}
                }
                return normalizeEngineHotkey(raw) || raw;
            }

            function getShortcutOptionName(shortcut) {
                const fallback = String(shortcut?.name || shortcut?.key || shortcut?.id || "").trim();
                const getDisplayName = engine?.core?.getShortcutDisplayName || null;
                if (typeof getDisplayName === "function") {
                    try {
                        return String(getDisplayName(shortcut) || fallback).trim() || fallback;
                    } catch {}
                }
                return fallback;
            }

            function isQuickInputShortcut(shortcut) {
                return String(shortcut?.customAction || "").trim() === "quickInput";
            }

            function getHotkeyEmptyOptionLabel() {
                return labels.placeholders?.hotkeyEmpty
                    || DEFAULT_LABELS.placeholders.hotkeyEmpty
                    || labels.placeholders?.hotkeyPrimary
                    || DEFAULT_LABELS.placeholders.hotkeyPrimary;
            }

            function getMissingHotkeyOptionLabel(value) {
                const display = formatHotkeyLabel(value) || String(value ?? "").trim();
                if (typeof labels.messages?.savedHotkeyMissing === "function") {
                    return labels.messages.savedHotkeyMissing(display);
                }
                if (typeof DEFAULT_LABELS.messages.savedHotkeyMissing === "function") {
                    return DEFAULT_LABELS.messages.savedHotkeyMissing(display);
                }
                return display;
            }

            function collectHotkeySelectOptions(selectedValue = "") {
                const optionsList = [];
                const seen = new Set();
                const selectedRaw = String(selectedValue ?? "").trim();
                const selectedNorm = normalizeEngineHotkey(selectedRaw);
                const shortcuts = (typeof engine?.getShortcuts === "function") ? engine.getShortcuts() : [];
                if (Array.isArray(shortcuts)) {
                    for (const shortcut of shortcuts) {
                        if (!shortcut || isQuickInputShortcut(shortcut)) continue;
                        const hotkey = normalizeEngineHotkey(shortcut.hotkey);
                        if (!hotkey || seen.has(hotkey)) continue;
                        seen.add(hotkey);
                        const hotkeyLabel = formatHotkeyLabel(hotkey);
                        const name = getShortcutOptionName(shortcut);
                        optionsList.push({
                            value: hotkey,
                            label: name ? `${hotkeyLabel || hotkey} ${name}` : (hotkeyLabel || hotkey)
                        });
                    }
                }

                if (selectedRaw && (!selectedNorm || !seen.has(selectedNorm))) {
                    optionsList.push({
                        value: selectedRaw,
                        label: getMissingHotkeyOptionLabel(selectedRaw)
                    });
                }

                return optionsList;
            }

            function appendSelectOption(select, value, label) {
                if (!select) return;
                const option = globalThis.document.createElement("option");
                option.value = String(value ?? "");
                option.textContent = String(label ?? "");
                select.appendChild(option);
            }

            function refreshHotkeySelectOptions(select, selectedValue = "") {
                if (!select) return;
                const selectedRaw = String(selectedValue ?? "").trim();
                const selectedNorm = normalizeEngineHotkey(selectedRaw);
                const optionsList = collectHotkeySelectOptions(selectedRaw);
                const knownValues = new Set(optionsList.map(item => item.value));

                while (select.firstChild) {
                    try { select.removeChild(select.firstChild); } catch { break; }
                }

                appendSelectOption(select, "", getHotkeyEmptyOptionLabel());
                for (const option of optionsList) {
                    appendSelectOption(select, option.value, option.label);
                }

                if (selectedNorm && knownValues.has(selectedNorm)) {
                    select.value = selectedNorm;
                } else if (selectedRaw && knownValues.has(selectedRaw)) {
                    select.value = selectedRaw;
                } else {
                    select.value = "";
                }
            }

            function refreshHotkeySelects() {
                hotkeyInputs.forEach((select) => {
                    if (!select) return;
                    refreshHotkeySelectOptions(select, select.value);
                });
            }

            function createHotkeyInputItem({ value = "" } = {}) {
                const item = globalThis.document.createElement("div");
                item.className = "qi-hotkey-item";

                const selectWrap = globalThis.document.createElement("div");
                selectWrap.className = "qi-select-wrap qi-hotkey-select-wrap";
                const input = globalThis.document.createElement("select");
                input.disabled = running;
                refreshHotkeySelectOptions(input, value);
                input.addEventListener("change", () => {
                    saveConfig(storageKey, readConfigFromUi(), defaults);
                });
                const caret = globalThis.document.createElement("span");
                caret.className = "qi-select-caret";
                caret.setAttribute("aria-hidden", "true");
                selectWrap.appendChild(input);
                selectWrap.appendChild(caret);

                const delBtn = globalThis.document.createElement("button");
                delBtn.type = "button";
                delBtn.className = "qi-hotkey-del";
                delBtn.textContent = "×";
                delBtn.title = labels.buttons?.delete || DEFAULT_LABELS.buttons.delete;
                delBtn.setAttribute("aria-label", labels.aria?.deleteHotkey || DEFAULT_LABELS.aria.deleteHotkey);
                delBtn.disabled = running;
                delBtn.addEventListener("click", (e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    if (running) return;

                    const idx = hotkeyInputs.indexOf(input);
                    if (idx === -1) return;

                    if (hotkeyInputs.length <= 1) {
                        input.value = "";
                        refreshHotkeySelects();
                        saveConfig(storageKey, readConfigFromUi(), defaults);
                        return;
                    }

                    hotkeyInputs.splice(idx, 1);
                    try { item.remove(); } catch {}
                    refreshHotkeySelects();
                    saveConfig(storageKey, readConfigFromUi(), defaults);
                });

                item.appendChild(selectWrap);
                item.appendChild(delBtn);

                return { item, input };
            }

            function appendHotkeyInput(value) {
                if (!hotkeyListEl) return null;
                const { item, input } = createHotkeyInputItem({ value });
                hotkeyListEl.appendChild(item);
                hotkeyInputs.push(input);
                refreshHotkeySelects();
                return input;
            }

            function createDelayUnitSelectControl() {
                const wrap = globalThis.document.createElement("div");
                wrap.className = "qi-select-wrap";
                const select = globalThis.document.createElement("select");
                const unitLabels = getDelayUnitLabels();
                for (const unit of Object.keys(DELAY_UNIT_FACTORS)) {
                    const option = globalThis.document.createElement("option");
                    option.value = unit;
                    option.textContent = unitLabels[unit] || DELAY_UNIT_LABELS[unit] || unit;
                    select.appendChild(option);
                }
                const caret = globalThis.document.createElement("span");
                caret.className = "qi-select-caret";
                caret.setAttribute("aria-hidden", "true");
                wrap.appendChild(select);
                wrap.appendChild(caret);
                return { wrap, select };
            }

            function writeConfigToUi(cfg) {
                if (!cfg) return;
                const rawToolHotkeys = Array.isArray(cfg.toolHotkeys)
                    ? cfg.toolHotkeys
                    : ((typeof cfg.toolHotkey === "string") ? [cfg.toolHotkey] : []);
                const toolHotkeys = rawToolHotkeys.map(value => String(value ?? "").trim()).filter(Boolean);
                const desired = toolHotkeys.length ? toolHotkeys : [""];

                if (hotkeyListEl) {
                    while (hotkeyInputs.length < desired.length) {
                        appendHotkeyInput("");
                    }
                    while (hotkeyInputs.length > desired.length) {
                        const input = hotkeyInputs.pop();
                        const item = input?.closest?.(".qi-hotkey-item") || input?.parentElement || input;
                        try { item?.remove?.(); } catch {}
                    }
                    hotkeyInputs.forEach((input, idx) => {
                        if (!input) return;
                        refreshHotkeySelectOptions(input, desired[idx] ?? "");
                    });
                    refreshHotkeySelects();
                }
                if (newChatHotkeyEl) {
                    newChatHotkeyEl.value = lockNewChatHotkey
                        ? getLockedNewChatHotkeyDisplay(cfg)
                        : ((typeof cfg.newChatHotkey === "string") ? cfg.newChatHotkey : defaults.newChatHotkey);
                }
                if (loopEl) loopEl.value = String(clampInt(cfg.loopCount, { min: 1, max: 999, fallback: clampInt(defaults.loopCount, { min: 1, max: 999, fallback: 1 }) }));
                setDelayControlValue(
                    stepDelayEl,
                    stepDelayUnitEl,
                    clampInt(cfg.stepDelayMs, { min: 0, max: STEP_DELAY_MAX_MS, fallback: clampInt(defaults.stepDelayMs, { min: 0, max: STEP_DELAY_MAX_MS, fallback: 1000 }) }),
                    cfg.stepDelayUnit || defaults.stepDelayUnit,
                    STEP_DELAY_MAX_MS
                );
                setDelayControlValue(
                    loopDelayEl,
                    loopDelayUnitEl,
                    clampInt(cfg.loopDelayMs, { min: 0, max: LOOP_DELAY_MAX_MS, fallback: clampInt(defaults.loopDelayMs, { min: 0, max: LOOP_DELAY_MAX_MS, fallback: 20000 }) }),
                    cfg.loopDelayUnit || defaults.loopDelayUnit,
                    LOOP_DELAY_MAX_MS
                );
                if (clearBeforeRunEl) clearBeforeRunEl.checked = cfg.clearBeforeRun !== false;
            }

            async function transitionToNextLoop({ loopDelayMs, loopDelayUnit, newChatHotkey, shouldCancel, sendCompletedAtMs, runtime = null }) {
                const cancelFn = typeof shouldCancel === "function" ? shouldCancel : null;
                const runtimeApi = runtime && typeof runtime === "object" ? runtime : null;
                const now = typeof runtimeApi?.now === "function"
                    ? () => runtimeApi.now()
                    : () => Date.now();
                const delayMs = Math.max(0, Number(loopDelayMs) || 0);
                const sendAt = Number(sendCompletedAtMs);
                const delayDeadline = (Number.isFinite(sendAt) ? sendAt : now()) + delayMs;
                const remainMs = Math.max(0, delayDeadline - now());

                if (delayMs > 0) {
                    const formattedDelay = formatDelayWithUnit(delayMs, loopDelayUnit, getDelayUnitLabels());
                    const waitingMsg = labels.messages?.loopDelayBeforeNewChat
                        ? labels.messages.loopDelayBeforeNewChat(delayMs, formattedDelay)
                        : (DEFAULT_LABELS.messages.loopDelayBeforeNewChat
                            ? DEFAULT_LABELS.messages.loopDelayBeforeNewChat(delayMs, formattedDelay)
                            : "");
                    if (waitingMsg) appendLoopLog(waitingMsg);
                }

                const waitOk = await sleepWithCancel(remainMs, { shouldCancel: cancelFn, chunkMs: 160, runtime: runtimeApi });
                if (!waitOk) return { cancelled: true, okNewChat: false };

                const maxNewChatRetries = 1;
                const totalAttempts = maxNewChatRetries + 1;
                let okNewChat = false;
                let verificationMessage = "";
                let attemptsUsed = 0;
                let usedNewChatLabel = getNewChatTriggerLabel(newChatHotkey);

                for (let attemptIndex = 0; attemptIndex < totalAttempts; attemptIndex++) {
                    attemptsUsed = attemptIndex + 1;
                    const triggerResult = await triggerNewChatAction({
                        hotkey: newChatHotkey,
                        phase: attemptIndex === 0 ? "primary" : "retry",
                        attempt: attemptIndex + 1,
                        shouldCancel: cancelFn,
                        runtime: runtimeApi
                    });
                    const triggerLabel = String(triggerResult?.label || newChatHotkey || "").trim() || String(newChatHotkey || "").trim();
                    usedNewChatLabel = triggerLabel;
                    let attemptOk = !!triggerResult?.ok;
                    let attemptMessage = "";

                    if (attemptOk && adapter.waitForNewChatReady) {
                        const verification = await adapter.waitForNewChatReady({
                            hotkey: triggerLabel,
                            timeoutMs: 12000,
                            intervalMs: 160,
                            shouldCancel: cancelFn,
                            runtime: runtimeApi
                        });
                        if (verification && typeof verification === "object") {
                            if (verification.cancelled) {
                                return { cancelled: true, okNewChat: false };
                            }
                            attemptOk = !!verification.ok;
                            attemptMessage = typeof verification.message === "string" ? verification.message.trim() : "";
                        } else {
                            attemptOk = !!verification;
                        }
                    }

                    if (attemptOk) {
                        okNewChat = true;
                        verificationMessage = attemptMessage;
                        break;
                    }

                    verificationMessage = attemptMessage;
                    if (attemptIndex >= totalAttempts - 1) break;

                    const retryNewChatLabel = getNewChatTriggerLabel(newChatHotkey);
                    const retryMsg = labels.messages?.newChatRetrying
                        ? labels.messages.newChatRetrying(retryNewChatLabel, attemptIndex + 1, maxNewChatRetries)
                        : (DEFAULT_LABELS.messages.newChatRetrying
                            ? DEFAULT_LABELS.messages.newChatRetrying(retryNewChatLabel, attemptIndex + 1, maxNewChatRetries)
                            : "");
                    if (retryMsg) appendLoopLog(retryMsg);

                    const retryWaitOk = await sleepWithCancel(800, { shouldCancel: cancelFn, chunkMs: 160, runtime: runtimeApi });
                    if (!retryWaitOk) return { cancelled: true, okNewChat: false };
                }

                const newChatMsg = labels.messages?.newChatTriggered
                    ? labels.messages.newChatTriggered(usedNewChatLabel, okNewChat)
                    : DEFAULT_LABELS.messages.newChatTriggered(usedNewChatLabel, okNewChat);
                appendLoopLog(newChatMsg, { level: okNewChat ? "ok" : "error" });
                if (!okNewChat && verificationMessage) {
                    appendLoopLog(verificationMessage, { level: "error" });
                }

                return { cancelled: !!(cancelFn && cancelFn()), okNewChat, attemptsUsed };
            }

            async function runMacro({ sourceAction = "run" } = {}) {
                if (running) return;
                await waitForDraftRestore();
                const requestedAction = String(sourceAction ?? "run").trim().toLowerCase();
                const isReplayRun = requestedAction === "replay";
                const previousTerminalStatus = lastTerminalStatus;
                cancelRun = false;
                resetPauseTracking();
                runFinalStatus = "running";
                setRunning(true);
                clearLog();

                const cfg = readConfigFromUi();
                saveConfig(storageKey, cfg, defaults);

                const promptText = String(textEl?.value ?? "");
                const images = Array.isArray(imageFiles) ? imageFiles.filter(Boolean) : [];
                const toolHotkeys = Array.isArray(cfg.toolHotkeys)
                    ? cfg.toolHotkeys.map(value => String(value ?? "").trim()).filter(Boolean)
                    : [];
                const newChatHotkey = String(cfg.newChatHotkey ?? "").trim();
                const newChatDisplayLabel = getNewChatTriggerLabel(newChatHotkey);

                if (!newChatHotkey && !hasCustomNewChatTrigger) {
                    appendGlobalLog(labels.messages?.missingNewChatHotkey || DEFAULT_LABELS.messages.missingNewChatHotkey, { level: "error" });
                    setRunning(false);
                    return;
                }

                if (images.length === 0 && !promptText.trim()) {
                    appendGlobalLog(labels.messages?.missingInput || DEFAULT_LABELS.messages.missingInput, { level: "error" });
                    setRunning(false);
                    return;
                }

                const shouldCancel = () => cancelRun;
                const runtime = runRuntime;
                const waitStep = async (ms, chunkMs = 160) => sleepWithCancel(ms, {
                    shouldCancel,
                    runtime,
                    chunkMs
                });
                const getStageLabel = (key, suffix = "") => {
                    const base = String(labels.stages?.[key] || DEFAULT_LABELS.stages?.[key] || key).trim();
                    return `${base}${suffix || ""}`;
                };
                setActiveTab?.("log");
                const startRows = labels.messages?.startRows
                    ? labels.messages.startRows(cfg.loopCount, toolHotkeys, newChatDisplayLabel, images.length)
                    : DEFAULT_LABELS.messages.startRows(cfg.loopCount, toolHotkeys, newChatDisplayLabel, images.length);
                const startMsg = labels.messages?.start
                    ? labels.messages.start(cfg.loopCount, toolHotkeys, newChatDisplayLabel, images.length)
                    : DEFAULT_LABELS.messages.start(cfg.loopCount, toolHotkeys, newChatDisplayLabel, images.length);
                const startSummary = (() => {
                    if (typeof labels.messages?.startSummary === "string" && labels.messages.startSummary.trim()) {
                        return labels.messages.startSummary.trim();
                    }
                    if (typeof DEFAULT_LABELS.messages.startSummary === "string" && DEFAULT_LABELS.messages.startSummary.trim()) {
                        return DEFAULT_LABELS.messages.startSummary.trim();
                    }
                    return DEFAULT_LABELS.messages.startSummary || "Run configuration";
                })();
                runConfigGroupEl = appendConfigLogGroup(
                    startSummary,
                    Array.isArray(startRows) && startRows.length ? startRows : startMsg
                );

                const markRunFailed = () => {
                    if (runFinalStatus === "cancelled") return;
                    runFinalStatus = "failed";
                };

                const markRunCancelled = () => {
                    if (runFinalStatus === "failed") return;
                    runFinalStatus = "cancelled";
                };

                if (isReplayRun) {
                    const replayTransition = await ensureNewChatReady({
                        newChatHotkey,
                        shouldCancel,
                        runtime,
                        maxNewChatRetries: 1,
                        onRetry: ({ hotkey, attempt, maxRetries }) => {
                            const retryMsg = labels.messages?.replayNewChatRetrying
                                ? labels.messages.replayNewChatRetrying(hotkey, attempt, maxRetries)
                                : (DEFAULT_LABELS.messages.replayNewChatRetrying
                                    ? DEFAULT_LABELS.messages.replayNewChatRetrying(hotkey, attempt, maxRetries)
                                    : "");
                            if (retryMsg) appendRuntimeLog(retryMsg, { level: "warn" });
                        }
                    });

                    if (replayTransition?.cancelled) {
                        if (runConfigGroupEl) setLogGroupStatus(runConfigGroupEl, "warn");
                        appendStatusLog(labels.messages?.stopped || DEFAULT_LABELS.messages.stopped, { level: "warn" });
                        pendingFinalStatusDetail = "";
                        lastTerminalStatus = previousTerminalStatus;
                        runFinalStatus = "idle";
                        setRunning(false);
                        return;
                    }

                    const replayLabel = String(replayTransition?.usedNewChatLabel || newChatDisplayLabel || "").trim() || newChatDisplayLabel;
                    if (!replayTransition?.okNewChat) {
                        const replayMsg = labels.messages?.replayNewChatTriggered
                            ? labels.messages.replayNewChatTriggered(replayLabel, false)
                            : DEFAULT_LABELS.messages.replayNewChatTriggered(replayLabel, false);
                        if (replayMsg) appendRuntimeLog(replayMsg, { level: "error" });

                        const replayNotReadyMsg = labels.messages?.replayNewChatNotReady || DEFAULT_LABELS.messages.replayNewChatNotReady;
                        if (replayNotReadyMsg) appendRuntimeLog(replayNotReadyMsg, { level: "error" });

                        const replayDetail = String(replayTransition?.verificationMessage || "").trim();
                        if (replayDetail) appendRuntimeLog(replayDetail, { level: "error" });

                        if (runConfigGroupEl) setLogGroupStatus(runConfigGroupEl, "error");
                        appendStatusLog(labels.messages?.failed || DEFAULT_LABELS.messages.failed, { level: "error" });
                        pendingFinalStatusDetail = "";
                        lastTerminalStatus = previousTerminalStatus;
                        runFinalStatus = "idle";
                        setRunning(false);
                        return;
                    }
                }

                lastTerminalStatus = "idle";

                async function verifyInputUrlReady(stageLabel = "") {
                    if (!adapter.waitForNewChatReady) return true;

                    let verification = await adapter.waitForNewChatReady({
                        hotkey: newChatHotkey,
                        timeoutMs: 240,
                        intervalMs: 60,
                        settleMs: 0,
                        shouldCancel,
                        runtime
                    });
                    if (verification && typeof verification === "object" && verification.cancelled) return "cancelled";

                    let ok = (verification && typeof verification === "object") ? !!verification.ok : !!verification;
                    if (ok) return true;

                    const retryNewChatLabel = getNewChatTriggerLabel(newChatHotkey);
                    const recoveringMsg = labels.messages?.inputUrlRecovering
                        ? labels.messages.inputUrlRecovering(stageLabel, retryNewChatLabel)
                        : (typeof DEFAULT_LABELS.messages.inputUrlRecovering === "function"
                            ? DEFAULT_LABELS.messages.inputUrlRecovering(stageLabel, retryNewChatLabel)
                            : DEFAULT_LABELS.messages.inputUrlRecovering);
                    if (recoveringMsg) appendLoopLog(recoveringMsg, { level: "error" });

                    const retryTrigger = await triggerNewChatAction({
                        hotkey: newChatHotkey,
                        phase: "retry",
                        attempt: 1,
                        shouldCancel,
                        runtime
                    });
                    if (retryTrigger.ok && adapter.waitForNewChatReady) {
                        verification = await adapter.waitForNewChatReady({
                            hotkey: retryTrigger.label || retryNewChatLabel,
                            timeoutMs: 12000,
                            intervalMs: 160,
                            settleMs: 300,
                            shouldCancel,
                            runtime
                        });
                        if (verification && typeof verification === "object" && verification.cancelled) return "cancelled";
                        ok = (verification && typeof verification === "object") ? !!verification.ok : !!verification;
                        if (ok) {
                            const recoverOkMsg = labels.messages?.newChatTriggered
                                ? labels.messages.newChatTriggered(retryTrigger.label || retryNewChatLabel, true)
                                : DEFAULT_LABELS.messages.newChatTriggered(retryTrigger.label || retryNewChatLabel, true);
                            appendLoopLog(recoverOkMsg, { level: "ok" });
                            return true;
                        }
                    }

                    cancelRun = true;
                    markRunFailed();
                    const title = labels.messages?.inputUrlNotReady
                        ? labels.messages.inputUrlNotReady(stageLabel)
                        : (typeof DEFAULT_LABELS.messages.inputUrlNotReady === "function"
                            ? DEFAULT_LABELS.messages.inputUrlNotReady(stageLabel)
                            : DEFAULT_LABELS.messages.inputUrlNotReady);
                    appendLoopLog(title, { level: "error" });

                    const detail = (verification && typeof verification === "object" && typeof verification.message === "string")
                        ? verification.message.trim()
                        : "";
                    if (detail) appendLoopLog(detail, { level: "error" });
                    return false;
                }

                function handleImageAttachDiagnostics(diag) {
                    if (!diag) return;
                    if (typeof diag === "string") {
                        appendLoopLog(diag, { level: "error" });
                        return;
                    }
                    if (diag && typeof diag === "object") {
                        const level = String(diag.level || "").toLowerCase() === "ok" ? "ok" : "error";
                        if (typeof diag.message === "string" && diag.message.trim()) {
                            appendLoopLog(diag.message, { level });
                            return;
                        }
                        try {
                            const json = JSON.stringify(diag);
                            const diagMsg = labels.messages?.diagnostics
                                ? labels.messages.diagnostics(json)
                                : DEFAULT_LABELS.messages.diagnostics(json);
                            appendLoopLog(diagMsg, { level: "error" });
                        } catch {}
                    }
                }

                async function attachImageFiles(fileList, composerEl) {
                    return await adapter.attachImages(fileList, composerEl, {
                        shouldCancel,
                        runtime,
                        onDiagnostics: handleImageAttachDiagnostics
                    });
                }

                async function clearImageAttachments(composerEl) {
                    return await adapter.clearAttachments(composerEl, {
                        shouldCancel,
                        runtime
                    });
                }

                function getReadyAttachmentCount(readyState) {
                    const count = Number(readyState?.snapshot?.attachmentCount);
                    return Number.isFinite(count) && count > 0 ? count : 0;
                }

                function buildImageReadyFailureDetail(readyState, expectedCount) {
                    const direct = (readyState && typeof readyState === "object" && typeof readyState.message === "string")
                        ? readyState.message.trim()
                        : "";
                    if (direct) return direct;

                    const expected = Math.max(0, Number(expectedCount) || 0);
                    const current = getReadyAttachmentCount(readyState);
                    if (expected > 0 && current < expected) {
                        return labels.messages?.imageCountNotReady
                            ? labels.messages.imageCountNotReady(current, expected)
                            : DEFAULT_LABELS.messages.imageCountNotReady(current, expected);
                    }

                    const reason = String(readyState?.reason || "").trim().toLowerCase();
                    if (reason === "no-composer") {
                        return labels.messages?.composerNotFound || DEFAULT_LABELS.messages.composerNotFound;
                    }
                    if (reason === "timeout") {
                        return labels.messages?.imageUploadTimeout
                            ? labels.messages.imageUploadTimeout(current)
                            : DEFAULT_LABELS.messages.imageUploadTimeout(current);
                    }
                    return "";
                }

                function buildTextCommitFailureDetail(stageLabel, state, expectedText) {
                    if (!state?.composer) {
                        return labels.messages?.composerNotFound || DEFAULT_LABELS.messages.composerNotFound;
                    }
                    const actualLength = String(state?.actualText || "").length;
                    const expectedLength = String(expectedText || "").length;
                    return labels.messages?.textVerifyFailed
                        ? labels.messages.textVerifyFailed(stageLabel, actualLength, expectedLength)
                        : DEFAULT_LABELS.messages.textVerifyFailed(stageLabel, actualLength, expectedLength);
                }

                async function attemptSetPromptText(composerEl, text) {
                    try {
                        return await adapter.setInputValue(composerEl, text);
                    } catch {
                        return false;
                    }
                }

                async function attemptClearPromptText(composerEl) {
                    try {
                        return await adapter.clearComposerValue(composerEl);
                    } catch {
                        return false;
                    }
                }

                async function prepareComposerForRun(composerEl) {
                    let composerRef = composerEl;

                    if (adapter.clearAttachments) {
                        const clearResult = await clearImageAttachments(composerRef);
                        if (clearResult?.cancelled) {
                            return {
                                ok: false,
                                cancelled: true,
                                composer: composerRef,
                                message: String(clearResult?.message || "").trim()
                            };
                        }
                        if (!clearResult?.ok) {
                            const failedMsg = String(clearResult?.message || "").trim()
                                || labels.messages?.clearAttachmentsFailed
                                || DEFAULT_LABELS.messages.clearAttachmentsFailed;
                            return {
                                ok: false,
                                cancelled: false,
                                composer: composerRef,
                                message: failedMsg
                            };
                        }

                        composerRef = await adapter.focusComposer({
                            timeoutMs: 4000,
                            intervalMs: 120,
                            shouldCancel,
                            runtime
                        }) || composerRef;
                    }

                    await attemptClearPromptText(composerRef);
                    return { ok: true, cancelled: false, composer: composerRef };
                }

                async function waitForPromptCommit(composerEl, prompt, { stageLabel = "" } = {}) {
                    const expectedText = normalizeTextCommitValue(prompt);
                    let composerRef = composerEl;
                    let lastState = null;

                    const computeState = () => {
                        const resolvedComposer = resolveComposerForTextRead(composerRef);
                        if (resolvedComposer) composerRef = resolvedComposer;
                        const actualText = normalizeTextCommitValue(readComposerTextForVerification(composerRef));
                        lastState = {
                            composer: composerRef,
                            actualText,
                            expectedText,
                            ok: actualText === expectedText,
                            stateKey: `${actualText.length}:${actualText === expectedText ? 1 : 0}`
                        };
                        return lastState;
                    };

                    const observed = await waitForObservedState({
                        resolveRoots: () => getTextObservationRootsForVerification(composerRef),
                        computeState,
                        isSatisfied: (state) => !!state?.ok,
                        timeoutMs: getTextCommitTimeoutMs(prompt),
                        settleMs: TEXT_COMMIT_SETTLE_MS,
                        pollFallbackMs: TEXT_COMMIT_POLL_MS,
                        attributeFilter: TEXT_COMMIT_OBSERVED_ATTRIBUTES,
                        shouldCancel,
                        runtime
                    });

                    const state = observed?.state || computeState();
                    if (observed?.cancelled) {
                        return {
                            ok: false,
                            cancelled: true,
                            composer: state?.composer || composerRef,
                            state,
                            expectedText
                        };
                    }

                    return {
                        ok: !!observed?.ok,
                        cancelled: false,
                        composer: state?.composer || composerRef,
                        state,
                        expectedText,
                        message: observed?.ok ? "" : buildTextCommitFailureDetail(stageLabel, state, expectedText)
                    };
                }

                async function ensurePromptCommitted(composerEl, prompt, {
                    stageLabel = "",
                    shouldInsertFirst = false,
                    successLog = "",
                    recoveryFocusTimeoutMs = 6000
                } = {}) {
                    let composerRef = composerEl;

                    if (shouldInsertFirst) {
                        await attemptSetPromptText(composerRef, prompt);
                    }

                    let verification = await waitForPromptCommit(composerRef, prompt, { stageLabel });
                    if (verification?.composer) composerRef = verification.composer;
                    if (verification?.cancelled) {
                        return { ok: false, cancelled: true, composer: composerRef };
                    }
                    if (verification?.ok) {
                        if (successLog) appendLoopLog(successLog, { level: "ok" });
                        return { ok: true, cancelled: false, composer: composerRef };
                    }

                    const retryMsg = labels.messages?.textRetrying
                        ? labels.messages.textRetrying(stageLabel, 1, 1)
                        : (typeof DEFAULT_LABELS.messages.textRetrying === "function"
                            ? DEFAULT_LABELS.messages.textRetrying(stageLabel, 1, 1)
                            : DEFAULT_LABELS.messages.textRetrying);
                    if (retryMsg) appendLoopLog(retryMsg, { level: "warn" });

                    composerRef = await adapter.focusComposer({
                        timeoutMs: recoveryFocusTimeoutMs,
                        intervalMs: 120,
                        shouldCancel,
                        runtime
                    }) || composerRef;

                    if (!composerRef) {
                        return {
                            ok: false,
                            cancelled: !!cancelRun,
                            composer: composerEl,
                            message: labels.messages?.composerNotFound || DEFAULT_LABELS.messages.composerNotFound
                        };
                    }

                    await attemptClearPromptText(composerRef);
                    if (!(await waitStep(60, 40))) {
                        return { ok: false, cancelled: true, composer: composerRef };
                    }

                    await attemptSetPromptText(composerRef, prompt);
                    verification = await waitForPromptCommit(composerRef, prompt, { stageLabel });
                    if (verification?.composer) composerRef = verification.composer;
                    if (verification?.cancelled) {
                        return { ok: false, cancelled: true, composer: composerRef };
                    }
                    if (verification?.ok) {
                        if (successLog) appendLoopLog(successLog, { level: "ok" });
                        return { ok: true, cancelled: false, composer: composerRef, recovered: true };
                    }

                    const notReadyMsg = labels.messages?.textNotReady
                        ? labels.messages.textNotReady(stageLabel)
                        : (typeof DEFAULT_LABELS.messages.textNotReady === "function"
                            ? DEFAULT_LABELS.messages.textNotReady(stageLabel)
                            : DEFAULT_LABELS.messages.textNotReady);
                    if (notReadyMsg) appendLoopLog(notReadyMsg, { level: "error" });

                    const detail = String(verification?.message || "").trim();
                    if (detail) appendLoopLog(detail, { level: "error" });

                    return {
                        ok: false,
                        cancelled: false,
                        composer: composerRef,
                        message: notReadyMsg || detail
                    };
                }

                function pickImagesForRepair(allImages, currentCount, missingCount) {
                    const list = Array.isArray(allImages) ? allImages.filter(Boolean) : [];
                    const need = Math.max(0, Math.min(list.length, Number(missingCount) || 0));
                    if (need <= 0 || list.length === 0) return [];

                    const safeCurrent = Math.max(0, Math.min(list.length, Number(currentCount) || 0));
                    const preferred = list.slice(safeCurrent, safeCurrent + need);
                    if (preferred.length >= need) return preferred;

                    const fallback = list.slice(Math.max(0, list.length - need));
                    if (fallback.length >= need) return fallback;

                    return list.slice(0, need);
                }

                async function waitForImagesReadyWithReset(composerEl, expectedCount) {
                    const expected = Math.max(0, Number(expectedCount) || 0);
                    const imageRecovery = normalizeImageRecovery(defaults?.imageRecovery);
                    const maxRepairAttempts = imageRecovery.maxRepairAttempts;
                    const maxResetAttempts = imageRecovery.maxResetAttempts;
                    let composerRef = composerEl;
                    let repairAttempt = 0;
                    let resetAttempt = 0;

                    while (true) {
                        const waitingMsg = labels.messages?.waitingUploads
                            ? labels.messages.waitingUploads(expected)
                            : DEFAULT_LABELS.messages.waitingUploads(expected);
                        appendLoopLog(waitingMsg);

                        if (!adapter.waitForReadyToSend) {
                            const fallbackWaitOk = await waitStep(Math.max(800, cfg.stepDelayMs));
                            return fallbackWaitOk
                                ? { ok: true, composer: composerRef }
                                : { ok: false, cancelled: true, composer: composerRef };
                        }

                        const ready = await adapter.waitForReadyToSend(composerRef, {
                            requireImage: true,
                            minAttachments: expected,
                            timeoutMs: 45000,
                            intervalMs: 160,
                            settleMs: 600,
                            shouldCancel,
                            runtime
                        });
                        if (ready?.cancelled) return { ok: false, cancelled: true, composer: composerRef, ready };
                        if (ready?.ok) return { ok: true, composer: composerRef, ready };

                        const reason = String(ready?.reason || "").trim().toLowerCase();
                        if (reason === "timeout" && resetAttempt < maxResetAttempts && adapter.clearAttachments && adapter.attachImages) {
                            resetAttempt += 1;
                            const currentCount = getReadyAttachmentCount(ready);
                            const resetMsg = labels.messages?.resettingImages
                                ? labels.messages.resettingImages(currentCount, expected, resetAttempt, maxResetAttempts)
                                : DEFAULT_LABELS.messages.resettingImages(currentCount, expected, resetAttempt, maxResetAttempts);
                            appendLoopLog(resetMsg, { level: "error" });

                            const beforeResetReady = await verifyInputUrlReady(getStageLabel("beforeReset", `#${resetAttempt}`));
                            if (beforeResetReady === "cancelled") {
                                return { ok: false, cancelled: true, composer: composerRef, ready };
                            }
                            if (beforeResetReady !== true) {
                                return { ok: false, cancelled: false, composer: composerRef, ready };
                            }

                            composerRef = await adapter.focusComposer({ timeoutMs: 6000, intervalMs: 120, shouldCancel, runtime }) || composerRef;
                            if (!composerRef) {
                                return {
                                    ok: false,
                                    cancelled: !!cancelRun,
                                    composer: composerEl,
                                    ready,
                                    message: labels.messages?.composerNotFound || DEFAULT_LABELS.messages.composerNotFound
                                };
                            }

                            const clearResult = await clearImageAttachments(composerRef);
                            if (clearResult?.cancelled) {
                                return { ok: false, cancelled: true, composer: composerRef, ready: clearResult };
                            }
                            if (!clearResult?.ok) {
                                const clearFailedMsg = labels.messages?.clearAttachmentsFailed || DEFAULT_LABELS.messages.clearAttachmentsFailed;
                                if (clearFailedMsg) appendLoopLog(clearFailedMsg, { level: "error" });
                                return {
                                    ok: false,
                                    cancelled: false,
                                    composer: composerRef,
                                    ready: clearResult,
                                    message: (typeof clearResult?.message === "string" && clearResult.message.trim())
                                        ? clearResult.message.trim()
                                        : clearFailedMsg
                                };
                            }

                            const clearWaitOk = await waitStep(cfg.stepDelayMs);
                            if (!clearWaitOk) return { ok: false, cancelled: true, composer: composerRef, ready: clearResult };

                            const reuploadResult = await attachImageFiles(images, composerRef);
                            if (reuploadResult?.cancelled) {
                                return { ok: false, cancelled: true, composer: composerRef, ready: reuploadResult };
                            }
                            if (!reuploadResult?.ok) {
                                return {
                                    ok: false,
                                    cancelled: false,
                                    composer: composerRef,
                                    ready: reuploadResult,
                                    message: (typeof reuploadResult?.message === "string" && reuploadResult.message.trim())
                                        ? reuploadResult.message.trim()
                                        : (labels.messages?.imageReuploadFailed || DEFAULT_LABELS.messages.imageReuploadFailed)
                                };
                            }

                            const reuploadedMsg = labels.messages?.reuploadedImages
                                ? labels.messages.reuploadedImages(images.length, expected)
                                : DEFAULT_LABELS.messages.reuploadedImages(images.length, expected);
                            appendLoopLog(reuploadedMsg, { level: "ok" });
                            const reuploadWaitOk = await waitStep(cfg.stepDelayMs);
                            if (!reuploadWaitOk) return { ok: false, cancelled: true, composer: composerRef, ready: reuploadResult };
                            continue;
                        }

                        const currentCount = getReadyAttachmentCount(ready);
                        const missingCount = Math.max(0, expected - currentCount);
                        if (!(missingCount > 0 && repairAttempt < maxRepairAttempts && !adapter.clearAttachments && adapter.attachImages)) {
                            return { ok: false, cancelled: false, composer: composerRef, ready };
                        }

                        repairAttempt += 1;
                        const repairFiles = pickImagesForRepair(images, currentCount, missingCount);
                        if (repairFiles.length === 0) {
                            return { ok: false, cancelled: false, composer: composerRef, ready };
                        }

                        const repairMsg = labels.messages?.repairingImages
                            ? labels.messages.repairingImages(missingCount, currentCount, expected, repairAttempt, maxRepairAttempts)
                            : DEFAULT_LABELS.messages.repairingImages(missingCount, currentCount, expected, repairAttempt, maxRepairAttempts);
                        appendLoopLog(repairMsg, { level: "error" });

                        const beforeRepairReady = await verifyInputUrlReady(getStageLabel("beforeRepair", `#${repairAttempt}`));
                        if (beforeRepairReady === "cancelled") {
                            return { ok: false, cancelled: true, composer: composerRef, ready };
                        }
                        if (beforeRepairReady !== true) {
                            return { ok: false, cancelled: false, composer: composerRef, ready };
                        }

                        composerRef = await adapter.focusComposer({ timeoutMs: 6000, intervalMs: 120, shouldCancel, runtime }) || composerRef;
                        if (!composerRef) {
                            return {
                                ok: false,
                                cancelled: !!cancelRun,
                                composer: composerEl,
                                ready,
                                message: labels.messages?.composerNotFound || DEFAULT_LABELS.messages.composerNotFound
                            };
                        }

                        const repairResult = await attachImageFiles(repairFiles, composerRef);
                        if (repairResult?.cancelled) {
                            return { ok: false, cancelled: true, composer: composerRef, ready: repairResult };
                        }
                        if (!repairResult?.ok) {
                            return {
                                ok: false,
                                cancelled: false,
                                composer: composerRef,
                                ready: repairResult,
                                message: (typeof repairResult?.message === "string" && repairResult.message.trim())
                                    ? repairResult.message.trim()
                                    : buildImageReadyFailureDetail(ready, expected)
                            };
                        }

                        const repairedMsg = labels.messages?.repairedImages
                            ? labels.messages.repairedImages(repairFiles.length, expected)
                            : DEFAULT_LABELS.messages.repairedImages(repairFiles.length, expected);
                        appendLoopLog(repairedMsg, { level: "ok" });
                        const repairWaitOk = await waitStep(cfg.stepDelayMs);
                        if (!repairWaitOk) return { ok: false, cancelled: true, composer: composerRef, ready };
                    }
                }

                for (let i = 0; i < cfg.loopCount; i++) {
                    if (cancelRun) break;
                    const marker = labels.messages?.loopMarker
                        ? labels.messages.loopMarker(i + 1, cfg.loopCount)
                        : DEFAULT_LABELS.messages.loopMarker(i + 1, cfg.loopCount);
                    startLoopLogGroup(marker);

                    const loopUrlReady = await verifyInputUrlReady(getStageLabel("loopStart"));
                    if (loopUrlReady !== true) {
                        if (loopUrlReady === "cancelled") markRunCancelled();
                        break;
                    }

                    let composer = await adapter.focusComposer({ timeoutMs: 15000, intervalMs: 160, shouldCancel, runtime });
                    if (!composer) {
                        if (cancelRun) {
                            markRunCancelled();
                            break;
                        }
                        markRunFailed();
                        appendLoopLog(labels.messages?.composerNotFound || DEFAULT_LABELS.messages.composerNotFound, { level: "error" });
                        break;
                    }

                    const focusedUrlReady = await verifyInputUrlReady(getStageLabel("afterComposerFocus"));
                    if (focusedUrlReady !== true) {
                        if (focusedUrlReady === "cancelled") markRunCancelled();
                        break;
                    }

                    if (cfg.clearBeforeRun) {
                        const prepareResult = await prepareComposerForRun(composer);
                        if (prepareResult?.composer) composer = prepareResult.composer;
                        if (prepareResult?.cancelled) {
                            markRunCancelled();
                            break;
                        }
                        if (!prepareResult?.ok) {
                            markRunFailed();
                            cancelRun = true;
                            appendLoopLog(
                                String(
                                    prepareResult?.message
                                    || labels.messages?.clearAttachmentsFailed
                                    || DEFAULT_LABELS.messages.clearAttachmentsFailed
                                ),
                                { level: "error" }
                            );
                            break;
                        }
                    }
                    if (!(await waitStep(cfg.stepDelayMs))) {
                        markRunCancelled();
                        break;
                    }

                    if (images.length) {
                        const beforeImagesReady = await verifyInputUrlReady(getStageLabel("beforeImages"));
                        if (beforeImagesReady !== true) {
                            if (beforeImagesReady === "cancelled") markRunCancelled();
                            break;
                        }

                        if (!adapter.attachImages) {
                            markRunFailed();
                            cancelRun = true;
                            appendLoopLog(labels.messages?.missingAttachAdapter || DEFAULT_LABELS.messages.missingAttachAdapter, { level: "error" });
                            break;
                        }

                        const result = await attachImageFiles(images, composer);
                        if (result?.cancelled) {
                            markRunCancelled();
                            break;
                        }
                        if (!result?.ok) {
                            markRunFailed();
                            cancelRun = true;
                            const msg = typeof result?.message === "string" && result.message.trim()
                                ? result.message.trim()
                                : (labels.messages?.imageInsertFailed || DEFAULT_LABELS.messages.imageInsertFailed);
                            appendLoopLog(msg, { level: "error" });
                            break;
                        }
                        const insertedMsg = labels.messages?.imagesInserted
                            ? labels.messages.imagesInserted(images.length)
                            : DEFAULT_LABELS.messages.imagesInserted(images.length);
                        appendLoopLog(insertedMsg, { level: "ok" });
                        if (!(await waitStep(cfg.stepDelayMs))) {
                            markRunCancelled();
                            break;
                        }
                    }

                    if (promptText.trim()) {
                        const beforeTextReady = await verifyInputUrlReady(getStageLabel("beforeText"));
                        if (beforeTextReady !== true) {
                            if (beforeTextReady === "cancelled") markRunCancelled();
                            break;
                        }

                        const textInsertedMsg = labels.messages?.textInserted
                            ? labels.messages.textInserted(true)
                            : DEFAULT_LABELS.messages.textInserted(true);
                        const textCommitResult = await ensurePromptCommitted(composer, promptText, {
                            stageLabel: getStageLabel("afterText"),
                            shouldInsertFirst: true,
                            successLog: textInsertedMsg
                        });
                        if (textCommitResult?.composer) composer = textCommitResult.composer;
                        if (textCommitResult?.cancelled) {
                            markRunCancelled();
                            break;
                        }
                        if (!textCommitResult?.ok) {
                            markRunFailed();
                            cancelRun = true;
                            break;
                        }
                        if (!(await waitStep(cfg.stepDelayMs))) {
                            markRunCancelled();
                            break;
                        }
                    }

                    if (toolHotkeys.length) {
                        for (const hotkey of toolHotkeys) {
                            if (cancelRun) break;
                            const beforeToolReady = await verifyInputUrlReady(getStageLabel("beforeTool", `:${hotkey}`));
                            if (beforeToolReady !== true) {
                                if (beforeToolReady === "cancelled") markRunCancelled();
                                break;
                            }
                            const okHotkey = await executeEngineShortcutByHotkey(engine, hotkey);
                            const msg = labels.messages?.hotkeyTriggered
                                ? labels.messages.hotkeyTriggered(hotkey, okHotkey)
                                : DEFAULT_LABELS.messages.hotkeyTriggered(hotkey, okHotkey);
                            appendLoopLog(msg, { level: okHotkey ? "ok" : "error" });
                            if (!(await waitStep(cfg.stepDelayMs))) {
                                markRunCancelled();
                                break;
                            }
                        }
                        if (cancelRun) break;
                    }

                    if (images.length) {
                        const readyResult = await waitForImagesReadyWithReset(composer, images.length);
                        if (readyResult?.composer) composer = readyResult.composer;
                        if (readyResult?.cancelled) {
                            markRunCancelled();
                            break;
                        }
                        if (!readyResult?.ok) {
                            markRunFailed();
                            cancelRun = true;
                            appendLoopLog(labels.messages?.uploadNotReady || DEFAULT_LABELS.messages.uploadNotReady, { level: "error" });
                            const detail = (readyResult && typeof readyResult === "object" && typeof readyResult.message === "string" && readyResult.message.trim())
                                ? readyResult.message.trim()
                                : buildImageReadyFailureDetail(readyResult?.ready, images.length);
                            if (detail) appendLoopLog(detail, { level: "error" });
                            break;
                        }

                        appendLoopLog(labels.messages?.imageReady || DEFAULT_LABELS.messages.imageReady, { level: "ok" });
                        if (!(await waitStep(Math.min(300, cfg.stepDelayMs), 80))) {
                            markRunCancelled();
                            break;
                        }
                    }

                    if (cancelRun) break;
                    const beforeSendReady = await verifyInputUrlReady(getStageLabel("beforeSend"));
                    if (beforeSendReady !== true) {
                        if (beforeSendReady === "cancelled") markRunCancelled();
                        break;
                    }
                    if (promptText.trim()) {
                        const textCommitResult = await ensurePromptCommitted(composer, promptText, {
                            stageLabel: getStageLabel("beforeSend")
                        });
                        if (textCommitResult?.composer) composer = textCommitResult.composer;
                        if (textCommitResult?.cancelled) {
                            markRunCancelled();
                            break;
                        }
                        if (!textCommitResult?.ok) {
                            markRunFailed();
                            cancelRun = true;
                            break;
                        }
                    }
                    const okSend = await adapter.sendMessage(composer);
                    const sendCompletedAtMs = runtime.now();
                    const sendMsg = labels.messages?.sendAttempted
                        ? labels.messages.sendAttempted(okSend)
                        : DEFAULT_LABELS.messages.sendAttempted(okSend);
                    appendLoopLog(sendMsg, { level: okSend ? "ok" : "error" });

                    if (i < cfg.loopCount - 1) {
                        const transition = await transitionToNextLoop({
                            loopDelayMs: cfg.loopDelayMs,
                            loopDelayUnit: cfg.loopDelayUnit,
                            newChatHotkey,
                            shouldCancel,
                            sendCompletedAtMs,
                            runtime
                        });
                        if (transition.cancelled) {
                            markRunCancelled();
                            break;
                        }
                        if (!transition.okNewChat) {
                            markRunFailed();
                            cancelRun = true;
                            appendLoopLog(labels.messages?.newChatNotReady || DEFAULT_LABELS.messages.newChatNotReady, { level: "error" });
                            break;
                        }
                    }
                }

                collapseOpenLoopLogGroups();
                clearActiveLoopLogTarget();
                const finalLevel = (runFinalStatus === "failed")
                    ? "error"
                    : ((runFinalStatus === "cancelled" || cancelRun) ? "warn" : "ok");
                const finalMessage = (finalLevel === "error")
                    ? (labels.messages?.failed || DEFAULT_LABELS.messages.failed)
                    : ((finalLevel === "warn")
                        ? (labels.messages?.stopped || DEFAULT_LABELS.messages.stopped)
                        : (labels.messages?.finished || DEFAULT_LABELS.messages.finished));
                const finalDetail = (finalLevel === "warn")
                    ? String(pendingFinalStatusDetail || "").trim()
                    : "";
                if (runConfigGroupEl) setLogGroupStatus(runConfigGroupEl, finalLevel);
                appendStatusLog(finalMessage, {
                    level: finalLevel,
                    detail: finalDetail,
                    collapsible: finalLevel === "warn" && !!finalDetail,
                    open: !(finalLevel === "warn" && !!finalDetail)
                });
                pendingFinalStatusDetail = "";
                lastTerminalStatus = finalLevel;
                runFinalStatus = "idle";
                setRunning(false);
            }

            function stopMacro() {
                if (!running) return;
                if (runFinalStatus !== "failed") runFinalStatus = "cancelled";
                cancelRun = true;
                setActiveTab?.("log");
                pendingFinalStatusDetail = labels.messages?.stopRequested || DEFAULT_LABELS.messages.stopRequested;
                syncRunControls();
            }

            function ensureUi() {
                if (overlayEl) return;
                labels = resolveLabels();
                titleText = resolveTitleText();
                try { globalThis.document?.getElementById?.(overlayId)?.remove?.(); } catch {}

                overlayEl = globalThis.document.createElement("div");
                overlayEl.id = overlayId;
                usesShadowUi = typeof overlayEl.attachShadow === "function";
                if (usesShadowUi) {
                    try {
                        overlayRootEl = overlayEl.attachShadow({ mode: "open" });
                    } catch {
                        usesShadowUi = false;
                        overlayRootEl = overlayEl;
                    }
                } else {
                    overlayRootEl = overlayEl;
                }
                applyOverlayHostBaseStyles();
                setOverlayVisibility(false);
                ensureQuickInputStyle({ overlayRootEl, usesShadowUi, overlayId, primaryColor });
                refreshTheme();

                backdropEl = globalThis.document.createElement("div");
                backdropEl.className = "qi-backdrop";
                backdropEl.addEventListener("click", (e) => {
                    if (e.target === backdropEl) close();
                });

                panelEl = globalThis.document.createElement("div");
                panelEl.className = "qi-panel";
                panelEl.addEventListener("click", (e) => e.stopPropagation());

                headerEl = globalThis.document.createElement("div");
                headerEl.className = "qi-header";
                headerEl.addEventListener("pointerdown", onHeaderPointerDown);
                const title = globalThis.document.createElement("div");
                title.className = "qi-title";
                title.textContent = titleText;
                const closeBtn = globalThis.document.createElement("button");
                closeBtn.className = "qi-close";
                closeBtn.type = "button";
                closeBtn.textContent = "×";
                closeBtn.title = labels.aria?.close || DEFAULT_LABELS.aria.close;
                closeBtn.setAttribute("aria-label", labels.aria?.close || DEFAULT_LABELS.aria.close);
                closeBtn.addEventListener("click", () => close());
                headerEl.appendChild(title);
                headerEl.appendChild(closeBtn);

                const tabs = globalThis.document.createElement("div");
                tabs.className = "qi-tabs";

                const tabInputBtn = globalThis.document.createElement("button");
                tabInputBtn.type = "button";
                tabInputBtn.className = "qi-tab";
                tabInputBtn.textContent = labels.tabs?.input || DEFAULT_LABELS.tabs.input;
                tabInputBtn.setAttribute("data-active", "1");

                const tabLogBtn = globalThis.document.createElement("button");
                tabLogBtn.type = "button";
                tabLogBtn.className = "qi-tab";
                tabLogBtn.textContent = labels.tabs?.log || DEFAULT_LABELS.tabs.log;
                tabLogBtn.setAttribute("data-active", "0");

                tabs.appendChild(tabInputBtn);
                tabs.appendChild(tabLogBtn);
                headerEl.insertBefore(tabs, closeBtn);

                const content = globalThis.document.createElement("div");
                content.className = "qi-content";

                const inputPanel = globalThis.document.createElement("div");
                inputPanel.className = "qi-tab-panel";
                inputPanel.setAttribute("data-active", "1");

                inputBodyEl = globalThis.document.createElement("div");
                inputBodyEl.className = "qi-body";

                const imageRow = globalThis.document.createElement("div");
                imageRow.className = "qi-row";
                const imageLabelStack = globalThis.document.createElement("div");
                imageLabelStack.className = "qi-label-stack";
                const imageLabel = globalThis.document.createElement("label");
                imageLabel.textContent = labels.fields?.images || DEFAULT_LABELS.fields.images;
                imageLabelStack.appendChild(imageLabel);
                const imageBox = globalThis.document.createElement("div");
                imageBox.className = "qi-image-stack";
                imageDropEl = globalThis.document.createElement("div");
                imageDropEl.className = "qi-drop";
                imageDropEl.tabIndex = 0;
                imageDropEl.textContent = labels.placeholders?.imageDrop || DEFAULT_LABELS.placeholders.imageDrop;
                imageDropEl.setAttribute("data-drag-over", "0");
                imageDropEl.setAttribute("data-disabled", "0");

                imagePreviewListEl = globalThis.document.createElement("div");
                imagePreviewListEl.className = "qi-preview-list";

                imagePreviewShellEl = globalThis.document.createElement("div");
                imagePreviewShellEl.className = "qi-preview-shell";
                imagePreviewShellEl.setAttribute("data-has-items", "0");
                imagePreviewShellEl.setAttribute("data-drag-over", "0");
                imagePreviewShellEl.setAttribute("data-disabled", "0");
                imagePreviewShellEl.setAttribute("data-drop-hint", labels.placeholders?.imageDropOverlay || DEFAULT_LABELS.placeholders.imageDropOverlay);

                fileInputEl = globalThis.document.createElement("input");
                fileInputEl.type = "file";
                fileInputEl.accept = "image/*";
                fileInputEl.multiple = true;
                fileInputEl.style.display = "none";
                fileInputEl.addEventListener("change", (e) => {
                    if (e && e.isTrusted === false) return;
                    if (running) {
                        try { fileInputEl.value = ""; } catch {}
                        return;
                    }
                    onPickFiles(fileInputEl.files);
                    clearImageDropFocus();
                    try { fileInputEl.value = ""; } catch {}
                });

                bindImageTransferTarget(imageDropEl, { enableClick: true, enablePaste: true, focusText: true });
                bindImageTransferTarget(imagePreviewShellEl, { focusText: true });

                clearAllImagesBtnEl = globalThis.document.createElement("button");
                clearAllImagesBtnEl.type = "button";
                clearAllImagesBtnEl.className = "qi-preview-clear";
                clearAllImagesBtnEl.textContent = "🗑️";
                clearAllImagesBtnEl.title = labels.buttons?.clearImages || DEFAULT_LABELS.buttons.clearImages;
                clearAllImagesBtnEl.setAttribute("aria-label", labels.aria?.clearImages || DEFAULT_LABELS.aria.clearImages);
                clearAllImagesBtnEl.disabled = true;
                clearAllImagesBtnEl.addEventListener("click", (e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    if (running) return;
                    setImageFiles([]);
                    appendGlobalLog(labels.messages?.imagesCleared || DEFAULT_LABELS.messages.imagesCleared);
                });
                imagePreviewShellEl.appendChild(imageDropEl);
                imagePreviewShellEl.appendChild(clearAllImagesBtnEl);
                imagePreviewShellEl.appendChild(imagePreviewListEl);

                imageBox.appendChild(imagePreviewShellEl);
                imageBox.appendChild(fileInputEl);

                imageRow.appendChild(imageLabelStack);
                imageRow.appendChild(imageBox);

                const textRow = globalThis.document.createElement("div");
                textRow.className = "qi-row";
                const textLabel = globalThis.document.createElement("label");
                textLabel.textContent = labels.fields?.text || DEFAULT_LABELS.fields.text;
                textEl = globalThis.document.createElement("textarea");
                textEl.rows = 3;
                textEl.placeholder = labels.placeholders?.text || DEFAULT_LABELS.placeholders.text;
                textEl.addEventListener("input", persistDraftText);
                textEl.addEventListener("change", persistDraftText);
                textEl.addEventListener("paste", handleTextInputPaste);
                textRow.appendChild(textLabel);
                textRow.appendChild(textEl);

                const hotkeyRow = globalThis.document.createElement("div");
                hotkeyRow.className = "qi-row";
                const hotkeyLabel = globalThis.document.createElement("label");
                hotkeyLabel.textContent = labels.fields?.hotkeys || DEFAULT_LABELS.fields.hotkeys;
                const hotkeyStack = globalThis.document.createElement("div");
                hotkeyStack.style.display = "grid";
                hotkeyStack.style.gap = "8px";

                hotkeyListEl = globalThis.document.createElement("div");
                hotkeyListEl.style.display = "grid";
                hotkeyListEl.style.gap = "8px";

                addHotkeyBtnEl = globalThis.document.createElement("button");
                addHotkeyBtnEl.type = "button";
                addHotkeyBtnEl.className = "qi-btn";
                addHotkeyBtnEl.textContent = labels.buttons?.addHotkey || DEFAULT_LABELS.buttons.addHotkey;
                addHotkeyBtnEl.addEventListener("click", () => {
                    if (running) return;
                    const input = appendHotkeyInput("");
                    try { input?.focus?.(); } catch {}
                });

                hotkeyStack.appendChild(hotkeyListEl);
                hotkeyStack.appendChild(addHotkeyBtnEl);

                hotkeyRow.appendChild(hotkeyLabel);
                hotkeyRow.appendChild(hotkeyStack);

                const loopRow = globalThis.document.createElement("div");
                loopRow.className = "qi-row";
                const loopLabel = globalThis.document.createElement("label");
                loopLabel.textContent = labels.fields?.loopCount || DEFAULT_LABELS.fields.loopCount;
                loopEl = globalThis.document.createElement("input");
                loopEl.className = "qi-number-input";
                loopEl.type = "number";
                loopEl.min = "1";
                loopEl.max = "999";
                loopEl.step = "1";
                loopEl.inputMode = "numeric";

                loopRow.appendChild(loopLabel);
                loopRow.appendChild(loopEl);

                const newChatRow = globalThis.document.createElement("div");
                newChatRow.className = "qi-row";
                const newChatLabel = globalThis.document.createElement("label");
                newChatLabel.textContent = labels.fields?.newChatHotkey || DEFAULT_LABELS.fields.newChatHotkey;
                newChatHotkeyEl = globalThis.document.createElement("input");
                newChatHotkeyEl.type = "text";
                newChatHotkeyEl.placeholder = labels.placeholders?.newChatHotkey || DEFAULT_LABELS.placeholders.newChatHotkey;
                if (lockNewChatHotkey) {
                    newChatHotkeyEl.readOnly = true;
                    newChatHotkeyEl.setAttribute("aria-readonly", "true");
                    newChatHotkeyEl.tabIndex = -1;
                    newChatHotkeyEl.style.cursor = "default";
                    newChatHotkeyEl.title = getLockedNewChatHotkeyDisplay();
                }
                newChatRow.appendChild(newChatLabel);
                newChatRow.appendChild(newChatHotkeyEl);

                const delayRow = globalThis.document.createElement("div");
                delayRow.className = "qi-row";
                const stepDelayLabel = globalThis.document.createElement("label");
                stepDelayLabel.textContent = labels.fields?.stepDelay || DEFAULT_LABELS.fields.stepDelay;
                const stepDelayControl = globalThis.document.createElement("div");
                stepDelayControl.className = "qi-delay-control";
                stepDelayEl = globalThis.document.createElement("input");
                stepDelayEl.className = "qi-number-input";
                stepDelayEl.type = "number";
                stepDelayEl.min = "0";
                stepDelayEl.step = "any";
                stepDelayEl.inputMode = "decimal";
                const stepDelayUnitControl = createDelayUnitSelectControl();
                stepDelayUnitEl = stepDelayUnitControl.select;
                stepDelayControl.appendChild(stepDelayEl);
                stepDelayControl.appendChild(stepDelayUnitControl.wrap);
                const loopDelayLabel = globalThis.document.createElement("label");
                loopDelayLabel.textContent = labels.fields?.loopDelay || DEFAULT_LABELS.fields.loopDelay;
                const loopDelayControl = globalThis.document.createElement("div");
                loopDelayControl.className = "qi-delay-control";
                loopDelayEl = globalThis.document.createElement("input");
                loopDelayEl.className = "qi-number-input";
                loopDelayEl.type = "number";
                loopDelayEl.min = "0";
                loopDelayEl.step = "any";
                loopDelayEl.inputMode = "decimal";
                const loopDelayUnitControl = createDelayUnitSelectControl();
                loopDelayUnitEl = loopDelayUnitControl.select;
                loopDelayControl.appendChild(loopDelayEl);
                loopDelayControl.appendChild(loopDelayUnitControl.wrap);

                delayRow.appendChild(stepDelayLabel);
                delayRow.appendChild(stepDelayControl);
                delayRow.appendChild(loopDelayLabel);
                delayRow.appendChild(loopDelayControl);

                stepDelayEl.addEventListener("input", persistDelayControls);
                stepDelayEl.addEventListener("change", () => handleDelayInputChange({
                    inputEl: stepDelayEl,
                    unitEl: stepDelayUnitEl,
                    fallbackMs: defaults.stepDelayMs,
                    fallbackUnit: defaults.stepDelayUnit,
                    maxMs: STEP_DELAY_MAX_MS
                }));
                stepDelayUnitEl.addEventListener("change", () => handleDelayUnitChange({
                    inputEl: stepDelayEl,
                    unitEl: stepDelayUnitEl,
                    fallbackMs: defaults.stepDelayMs,
                    fallbackUnit: defaults.stepDelayUnit,
                    maxMs: STEP_DELAY_MAX_MS
                }));

                loopDelayEl.addEventListener("input", persistDelayControls);
                loopDelayEl.addEventListener("change", () => handleDelayInputChange({
                    inputEl: loopDelayEl,
                    unitEl: loopDelayUnitEl,
                    fallbackMs: defaults.loopDelayMs,
                    fallbackUnit: defaults.loopDelayUnit,
                    maxMs: LOOP_DELAY_MAX_MS
                }));
                loopDelayUnitEl.addEventListener("change", () => handleDelayUnitChange({
                    inputEl: loopDelayEl,
                    unitEl: loopDelayUnitEl,
                    fallbackMs: defaults.loopDelayMs,
                    fallbackUnit: defaults.loopDelayUnit,
                    maxMs: LOOP_DELAY_MAX_MS
                }));

                const optionsRow = globalThis.document.createElement("div");
                optionsRow.className = "qi-row";
                const optionsLabel = globalThis.document.createElement("label");
                optionsLabel.textContent = labels.fields?.options || DEFAULT_LABELS.fields.options;
                const optionsBox = globalThis.document.createElement("div");
                optionsBox.className = "qi-inline";
                const cbWrap = globalThis.document.createElement("label");
                cbWrap.className = "qi-option-check";
                clearBeforeRunEl = globalThis.document.createElement("input");
                clearBeforeRunEl.type = "checkbox";
                clearBeforeRunEl.checked = true;
                const cbText = globalThis.document.createElement("span");
                cbText.textContent = labels.options?.clearBeforeRun || DEFAULT_LABELS.options.clearBeforeRun;
                cbWrap.appendChild(clearBeforeRunEl);
                cbWrap.appendChild(cbText);
                optionsBox.appendChild(cbWrap);

                clearBeforeRunEl.addEventListener("change", () => {
                    saveConfig(storageKey, readConfigFromUi(), defaults);
                });
                optionsRow.appendChild(optionsLabel);
                optionsRow.appendChild(optionsBox);

                const hint = globalThis.document.createElement("div");
                hint.className = "qi-hint";
                hint.textContent = labels.hints?.flow || DEFAULT_LABELS.hints.flow;

                inputBodyEl.appendChild(imageRow);
                inputBodyEl.appendChild(textRow);
                inputBodyEl.appendChild(hotkeyRow);
                inputBodyEl.appendChild(loopRow);
                inputBodyEl.appendChild(newChatRow);
                inputBodyEl.appendChild(delayRow);
                inputBodyEl.appendChild(optionsRow);
                inputBodyEl.appendChild(hint);

                inputActionsEl = createPlayerActionsBar();

                inputPanel.appendChild(inputBodyEl);
                inputPanel.appendChild(inputActionsEl);

                const logPanel = globalThis.document.createElement("div");
                logPanel.className = "qi-tab-panel";
                logPanel.setAttribute("data-active", "0");

                logEl = globalThis.document.createElement("div");
                logEl.className = "qi-log";

                logActionsEl = createPlayerActionsBar();

                logPanel.appendChild(logEl);
                logPanel.appendChild(logActionsEl);

                content.appendChild(inputPanel);
                content.appendChild(logPanel);

                activeTab = "input";
                setActiveTab = (nextTab) => {
                    const key = String(nextTab || "").trim().toLowerCase();
                    const next = (key === "log") ? "log" : "input";
                    activeTab = next;
                    const inputActive = next === "input";
                    tabInputBtn.setAttribute("data-active", inputActive ? "1" : "0");
                    tabLogBtn.setAttribute("data-active", inputActive ? "0" : "1");
                    inputPanel.setAttribute("data-active", inputActive ? "1" : "0");
                    logPanel.setAttribute("data-active", inputActive ? "0" : "1");
                    schedulePanelLayout({ scrollLogToBottom: !inputActive });
                };
                tabInputBtn.addEventListener("click", () => setActiveTab?.("input"));
                tabLogBtn.addEventListener("click", () => setActiveTab?.("log"));

                panelEl.appendChild(headerEl);
                panelEl.appendChild(content);

                backdropEl.appendChild(panelEl);
                overlayRootEl.appendChild(backdropEl);
                globalThis.document.body.appendChild(overlayEl);

                globalThis.document.addEventListener("keydown", (e) => {
                    if (!overlayEl || overlayEl.getAttribute("data-open") !== "1") return;
                    if (e.key === "Escape") {
                        e.preventDefault();
                        close();
                    }
                }, true);

                try {
                    writeConfigToUi(loadConfig(storageKey, defaults));
                } catch (error) {
                    warnQuickInput("Failed to read QuickInput config; fell back to defaults.", error);
                    writeConfigToUi(defaults);
                }
                draftRestorePromise = restoreDraftFromStorage().catch((error) => {
                    warnQuickInput("Failed to restore QuickInput draft; continuing with corrupted draft data ignored.", error);
                    clearDraftImagesState({ preserveText: true });
                });
                try {
                    syncRunControls();
                } catch (error) {
                    warnQuickInput("Failed to sync QuickInput run controls.", error);
                }
            }

            function open() {
                labels = resolveLabels();
                titleText = resolveTitleText();
                ensureUi();
                refreshHotkeySelects();
                stopDrag();
                setOverlayVisibility(true);
                startThemeAutoSync();
                requestAnimationFrameSafe(() => {
                    applyStoredPanelPos();
                    schedulePanelLayout({ scrollLogToBottom: activeTab === "log" });
                });
                try { if (activeTab === "input") imageDropEl?.focus?.(); } catch {}
            }

            function isOpen() {
                return !!overlayEl && overlayEl.getAttribute("data-open") === "1";
            }

            function close() {
                if (!overlayEl) return;
                if (dragPointerId !== null && dragMoved && panelEl) {
                    const rect = panelEl.getBoundingClientRect();
                    const clamped = clampPanelPos(rect.left, rect.top, rect.width, rect.height);
                    persistPanelPos(clamped.left, clamped.top, { force: true });
                }
                if (running && !cancelRun && !paused) pauseRun();
                stopDrag();
                void persistDraftText();
                stopThemeAutoSync();
                setOverlayVisibility(false);
            }

            function resetUiRefs() {
                overlayEl = null;
                overlayRootEl = null;
                backdropEl = null;
                panelEl = null;
                headerEl = null;
                logEl = null;
                inputBodyEl = null;
                inputActionsEl = null;
                logActionsEl = null;
                runConfigGroupEl = null;
                activeLoopLogGroupEl = null;
                activeLoopLogBodyEl = null;
                fileInputEl = null;
                previewRowEl = null;
                imagePreviewShellEl = null;
                clearAllImagesBtnEl = null;
                imagePreviewListEl = null;
                imageDropEl = null;
                textEl = null;
                hotkeyListEl = null;
                addHotkeyBtnEl = null;
                hotkeyInputs.length = 0;
                newChatHotkeyEl = null;
                loopEl = null;
                stepDelayEl = null;
                stepDelayUnitEl = null;
                loopDelayEl = null;
                loopDelayUnitEl = null;
                clearBeforeRunEl = null;
                stopButtons.length = 0;
                playPauseButtons.length = 0;
                setActiveTab = null;
                usesShadowUi = false;
            }

            function refreshLocale() {
                labels = resolveLabels();
                titleText = resolveTitleText();
                if (!overlayEl) return;
                if (running) return;
                const wasOpen = isOpen();
                stopDrag();
                stopThemeAutoSync();
                try { overlayEl.remove(); } catch {}
                resetUiRefs();
                if (wasOpen) open();
            }

            function toggle() {
                if (isOpen()) {
                    close();
                    return;
                }
                open();
            }

            return Object.freeze({ open, close, isOpen, toggle });
}
