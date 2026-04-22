/* -------------------------------------------------------------------------- *
 * Core Utils · Public facade
 * -------------------------------------------------------------------------- */

import { sleep } from "../../shared/base.js";
import { DEFAULT_TIMING, safeQuerySelector, safeQuerySelectorAll, isVisible, escapeForAttributeSelector, normalizeText, matchText, findFirst, waitFor, waitForElement, waitForMatch, setTrustedHTML } from "./dom.js";
import { resolveEventView, simulateClick, simulateHover } from "./events.js";
import { getShortcuts, findShortcutByName, findShortcutByKey, findShortcutById, resolveShortcutField } from "./shortcuts.js";
import { createOneStepExecutor } from "./one-step.js";
import { createMenuController, buildMenuActions } from "./menu.js";
import { buildSvgElementsIconDataUrl, buildPathsIconDataUrl, buildPathIconDataUrl, buildThemeAdaptivePathsIconDataUrl, buildThemeAdaptivePathIconDataUrl, normalizeSvgCssColorToken } from "./svg.js";

export const Utils = Object.freeze({
    timing: DEFAULT_TIMING,
    sleep,
    dom: Object.freeze({
        safeQuerySelector,
        safeQuerySelectorAll,
        isVisible,
        escapeForAttributeSelector,
        normalizeText,
        matchText,
        findFirst,
        waitFor,
        waitForElement,
        waitForMatch,
        setTrustedHTML
    }),
    svg: Object.freeze({
        normalizeSvgCssColorToken,
        buildSvgElementsIconDataUrl,
        buildPathsIconDataUrl,
        buildPathIconDataUrl,
        buildThemeAdaptivePathsIconDataUrl,
        buildThemeAdaptivePathIconDataUrl
    }),
    events: Object.freeze({
        resolveEventView,
        simulateClick,
        simulateHover
    }),
    shortcuts: Object.freeze({
        getShortcuts,
        findShortcutByName,
        findShortcutByKey,
        findShortcutById,
        resolveShortcutField
    }),
    oneStep: Object.freeze({
        createOneStepExecutor
    }),
    menu: Object.freeze({
        createMenuController,
        buildMenuActions
    })
});
