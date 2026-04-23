/* -------------------------------------------------------------------------- *
 * Quick Input · Public facade
 * -------------------------------------------------------------------------- */

import { createController } from "./controller.js";
import { safeStoreGet, safeStoreSet } from "./storage.js";
import { clampInt, normalizeComposerText, normalizeHotkeyString, normalizeHotkeyFallback, getKeyEventProps, simulateKeystroke, isElementVisible, pickBestComposerCandidate, getComposerText, findComposerElement, focusComposer, setInputValue, clearInputValue, dispatchPasteEvent, dispatchBeforeInputFromPaste, dispatchInputFromPaste, dispatchDragEvent, collectFileInputs, collectFileInputsFromOpenShadows, trySetFileInputFiles, isInsideOverlayTree } from "./dom.js";
import { waitForObservedState, executeEngineShortcutByHotkey } from "./runtime.js";

export const quickInput = Object.freeze({
    createController,
    adapters: Object.freeze({}),
    storage: Object.freeze({
        safeGet: safeStoreGet,
        safeSet: safeStoreSet
    }),
    dom: Object.freeze({
        clampInt,
        normalizeComposerText,
        normalizeHotkeyString,
        normalizeHotkeyFallback,
        getKeyEventProps,
        simulateKeystroke,
        isElementVisible,
        pickBestComposerCandidate,
        getComposerText,
        findComposerElement,
        focusComposer,
        setInputValue,
        clearInputValue,
        dispatchPasteEvent,
        dispatchBeforeInputFromPaste,
        dispatchInputFromPaste,
        dispatchDragEvent,
        collectFileInputs,
        collectFileInputsFromOpenShadows,
        trySetFileInputFiles,
        waitForObservedState,
        isInsideOverlayTree
    }),
    engine: Object.freeze({
        executeShortcutByHotkey: executeEngineShortcutByHotkey
    })
});
