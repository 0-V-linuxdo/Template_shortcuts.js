/* -------------------------------------------------------------------------- *
 * Template_shortcuts · ESM entry
 * -------------------------------------------------------------------------- */

import { TEMPLATE_VERSION, URL_METHODS } from "./core/constants.js";
import { createShortcutEngine } from "./core/engine/create-shortcut-engine.js";
import { Utils } from "./core/utils/index.js";
import { quickInput } from "./quick-input/index.js";

export const VERSION = TEMPLATE_VERSION;
export { URL_METHODS, createShortcutEngine, quickInput };
export const utils = Utils;

const ShortcutTemplate = Object.freeze({
    VERSION,
    URL_METHODS,
    createShortcutEngine,
    utils: Utils,
    quickInput
});

export default ShortcutTemplate;
