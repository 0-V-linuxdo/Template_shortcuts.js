import { getDocument, getWindow } from "../../shared/platform/browser.js";

/* -------------------------------------------------------------------------- *
 * Module 04 · Keyboard handling (hotkey parsing, matching, action dispatch)
 * -------------------------------------------------------------------------- */

        function createKeyboardLayer(ctx = {}) {
            const { state, core, options } = ctx;
            const consoleTag = options?.consoleTag || "[ShortcutEngine]";
            const keyboardOptions = (options?.keyboard && typeof options.keyboard === "object") ? options.keyboard : {};
            const allowedInputTags = Array.isArray(keyboardOptions.allowedInputTags)
                ? keyboardOptions.allowedInputTags.map((t) => String(t || "").toUpperCase()).filter(Boolean)
                : ['INPUT', 'TEXTAREA', 'SELECT'];
            const allowedInputTagSet = new Set(allowedInputTags);
            const allowContentEditable = keyboardOptions.allowContentEditable !== false;
            const blockUnlistedModifierShortcutsInInputsWhenPanelOpen =
                keyboardOptions.blockUnlistedModifierShortcutsInInputsWhenPanelOpen !== false;
            const CAPTURE_DATASET_KEY = "shortcutCapture";
            const CAPTURE_DATASET_VALUE = "1";

            function isHotkeyCaptureElement(element) {
                return !!(element && element.dataset && element.dataset[CAPTURE_DATASET_KEY] === CAPTURE_DATASET_VALUE);
            }

            function isInHotkeyCaptureMode(eventTarget = null) {
                const element = eventTarget || getDocument()?.activeElement || null;
                return isHotkeyCaptureElement(element);
            }

            function isInAllowedInputElement(eventTarget = null) {
                const activeEl = eventTarget || getDocument()?.activeElement || null;
                if (!activeEl) return false;
                const isAllowedTag = allowedInputTagSet.has(activeEl.tagName);
                const isContentEditable = allowContentEditable && !!activeEl.isContentEditable;
                const isHotkeyCapturer = isInHotkeyCaptureMode(activeEl);
                return (isAllowedTag || isContentEditable) && !isHotkeyCapturer;
            }

            function defaultIsAllowedShortcut(e) {
                const key = String(e.key || "").toLowerCase();
                const code = String(e.code || "");

                if (['F1', 'F2', 'F3', 'F4', 'F5', 'F6', 'F7', 'F8', 'F9', 'F10', 'F11', 'F12'].includes(code)) {
                    return true;
                }

                if (e.ctrlKey || e.metaKey) {
                    if (['c', 'v', 'x', 'a', 'z', 'y', 's'].includes(key) && !e.altKey) {
                        return true;
                    }
                    if ((key === 'i' && e.shiftKey) ||
                        (key === 'j' && e.shiftKey) ||
                        (key === 'c' && e.shiftKey) ||
                        (key === 'u')) {
                        return true;
                    }
                    if (key === 'r' ||
                        (key === 'r' && e.shiftKey) ||
                        key === 'w' ||
                        key === 't' ||
                        (key === 't' && e.shiftKey) ||
                        key === 'l' ||
                        key === 'd' ||
                        key === 'h' ||
                        key === 'j' ||
                        (key === 'n' && e.shiftKey)) {
                        return true;
                    }
                    if (key === '=' || key === '+' ||
                        key === '-' ||
                        key === '0') {
                        return true;
                    }
                    if (['1', '2', '3', '4', '5', '6', '7', '8', '9'].includes(key)) {
                        return true;
                    }
                }

                if (e.altKey) {
                    if (['ArrowLeft', 'ArrowRight'].includes(code) ||
                        key === 'd' ||
                        key === 'f4') {
                        return true;
                    }
                }

                if (code === 'F11') {
                    return true;
                }

                return false;
            }

            function isAllowedShortcutWhenPanelOpen(e) {
                const custom = keyboardOptions.isAllowedShortcutWhenPanelOpen;
                if (typeof custom === "function") {
                    try {
                        const result = custom(e, {
                            options,
                            state,
                            core,
                            defaultIsAllowedShortcut
                        });
                        if (typeof result === "boolean") return result;
                    } catch (err) {
                        console.warn(`${consoleTag} keyboard.isAllowedShortcutWhenPanelOpen error`, err);
                    }
                }
                return defaultIsAllowedShortcut(e);
            }

            function onKeydown(e) {
                if (!e) return;

                if (state.isSettingsPanelOpen) {
                    if (isInHotkeyCaptureMode(e.target)) {
                        return;
                    }
                    if (isAllowedShortcutWhenPanelOpen(e)) {
                        return;
                    }
                    if (isInAllowedInputElement(e.target)) {
                        if (blockUnlistedModifierShortcutsInInputsWhenPanelOpen && (e.ctrlKey || e.altKey || e.metaKey)) {
                            e.preventDefault();
                            e.stopPropagation();
                            return;
                        }
                        return;
                    }
                    e.preventDefault();
                    e.stopPropagation();
                    return;
                }

                const target = e.target;
                const tagName = target && target.tagName ? target.tagName : '';
                const isInput = tagName === 'INPUT' || tagName === 'TEXTAREA' || !!target?.isContentEditable;
                const isModifierHeavy = e.ctrlKey || e.altKey || e.metaKey;
                if (isInput && !isModifierHeavy) {
                    if (!(e.key === 'Escape' && e.shiftKey)) {
                        return;
                    }
                }

                const mainKey = core?.hotkeys?.getMainKeyFromEvent ? core.hotkeys.getMainKeyFromEvent(e) : "";
                if (!core?.hotkeys?.isAllowedMainKey || !core.hotkeys.isAllowedMainKey(mainKey)) return;

                const combined = core?.hotkeys?.fromEvent ? core.hotkeys.fromEvent(e) : "";
                if (!combined) return;

                const item = core.getShortcutByHotkeyNorm(combined);
                if (item) {
                    e.preventDefault();
                    e.stopPropagation();
                    core.executeShortcutAction(item, e);
                }
            }

            function init() {
                getWindow()?.addEventListener?.("keydown", onKeydown, true);
            }

            function destroy() {
                getWindow()?.removeEventListener?.("keydown", onKeydown, true);
            }

            return Object.freeze({ init, destroy, onKeydown });
        }

export { createKeyboardLayer };
