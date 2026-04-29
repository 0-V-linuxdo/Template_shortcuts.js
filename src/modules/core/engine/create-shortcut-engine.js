import { clone, deepMerge } from "../../shared/base.js";
import { createI18nContext, getMessageAtPath, mergeLocaleMessages, normalizeLocaleMode } from "../../shared/i18n.js";
import { getCrypto } from "../../shared/platform/browser.js";
import { getGmXmlHttpRequest, gmGetValue, gmSetValue } from "../../shared/platform/userscript.js";
import { DEFAULT_CORE_I18N_MESSAGES, DEFAULT_OPTIONS, URL_METHODS } from "../constants.js";
import { setTrustedHTML } from "../utils/dom.js";
import { createActionRegistry } from "./action-registry.js";
import { createBuiltinActionTools } from "./builtin-actions.js";
import { createHotkeysToolkit } from "./hotkeys.js";
import { createIconManager } from "./icons.js";
import { createUiSharedLayer } from "./ui-shared.js";
import { createEngineApi } from "./api.js";
import { panelNormalizeActionType, panelBuildShortcutSearchHaystack, panelMatchesSearchQuery, panelMatchesCurrentView } from "../../panel/filter.js";

/* -------------------------------------------------------------------------- *
 * Module 03 · Engine core (factory, storage, state wiring)
 * -------------------------------------------------------------------------- */

    /* ------------------------------------------------------------------
     * 2. 核心创建函数
     * ------------------------------------------------------------------ */

	    function createShortcutEngine(userOptions = {}) {
	        const options = deepMerge(deepMerge({}, DEFAULT_OPTIONS), userOptions || {});
	        options.colors = deepMerge(deepMerge({}, DEFAULT_OPTIONS.colors), userOptions.colors || {});
	        options.ui = deepMerge(deepMerge({}, DEFAULT_OPTIONS.ui), userOptions.ui || {});
	        options.text = deepMerge(deepMerge({}, DEFAULT_OPTIONS.text), userOptions.text || {});
        options.iconLibrary = Array.isArray(options.iconLibrary) ? options.iconLibrary.slice() : [];
        options.protectedIconUrls = Array.isArray(options.protectedIconUrls) ? options.protectedIconUrls.slice() : [];
        options.defaultShortcuts = Array.isArray(options.defaultShortcuts) ? clone(options.defaultShortcuts) : [];

        const idPrefix = options.ui.idPrefix || 'shortcut';
        const cssPrefix = options.ui.cssPrefix || idPrefix;
        const storageKeys = options.storageKeys && typeof options.storageKeys === "object" ? options.storageKeys : {};
        const rawUiPrefsKey = userOptions?.storageKeys?.uiPrefs;
        const rawIconThemeAdaptedKey = userOptions?.storageKeys?.iconThemeAdapted;
        const fallbackUiPrefsKeyBase = (typeof storageKeys.shortcuts === "string" && storageKeys.shortcuts.trim())
            ? storageKeys.shortcuts.trim()
            : idPrefix;
        const fallbackUiPrefsKey = `${fallbackUiPrefsKeyBase}::uiPrefs_v1`;
        const fallbackIconThemeAdaptedKey = `${fallbackUiPrefsKeyBase}::iconThemeAdapted_v2`;
        storageKeys.uiPrefs = (typeof rawUiPrefsKey === "string" && rawUiPrefsKey.trim())
            ? rawUiPrefsKey.trim()
            : fallbackUiPrefsKey;
        storageKeys.iconThemeAdapted = (typeof rawIconThemeAdaptedKey === "string" && rawIconThemeAdaptedKey.trim())
            ? rawIconThemeAdaptedKey.trim()
            : fallbackIconThemeAdaptedKey;
        options.storageKeys = storageKeys;

        const ids = {
            settingsOverlay: `${idPrefix}-settings-overlay`,
            settingsPanel: `${idPrefix}-settings-panel`,
            stats: `${idPrefix}-shortcut-stats`,
            tableBody: `${idPrefix}-shortcut-tbody`,
            editOverlay: `${idPrefix}-edit-overlay`,
            editForm: `${idPrefix}-edit-form`
        };

        const classes = {
            overlay: `${cssPrefix}-overlay`,
            panel: `${cssPrefix}-panel`,
            filterButton: `${cssPrefix}-filter-button`,
            filterLabel: `${cssPrefix}-filter-label`,
            filterCount: `${cssPrefix}-filter-count`,
            compactContainer: `${cssPrefix}-compact-container`,
            compactCard: `${cssPrefix}-compact-card`
        };

	        const state = {
	            isSettingsPanelOpen: false,
	            isCompactMode: false,
	            scrollLock: {
	                isLocked: false,
                originalBodyOverflow: '',
                originalBodyPosition: '',
                originalBodyTop: '',
                originalBodyLeft: '',
                originalBodyWidth: '',
                scrollTop: 0,
	                scrollLeft: 0
	            },
                themeMode: "auto",
                localeMode: "auto",
                effectiveLocale: "zh-CN",
                legacyIconAdaptiveEnabled: false,
	            isDarkMode: false,
	            currentFilter: 'all',
	            searchQuery: '',
	            currentPanelOverlay: null,
	            currentPanelCloser: null,
	            currentEditCloser: null,
	            destroyResponsiveListener: null,
	            destroyDarkModeObserver: null,
	            destroyDragCss: null,
	            destroyBaseCss: null,
	            menuCommandRegistered: false,
	            menuCommandId: null,
                localeChangedEventName: `${idPrefix}-localeChanged`,
	            filterChangedEventName: `${idPrefix}-filterChanged`
	        };

	        const GMX = getGmXmlHttpRequest();

        const hotkeys = createHotkeysToolkit();

        let engineApi = null;

        /* ------------------ 通用工具函数 ------------------ */

	        function normalizeThemeMode(value) {
	            const token = String(value ?? "").trim().toLowerCase();
	            if (token === "dark") return "dark";
	            if (token === "light") return "light";
	            return "auto";
	        }

        function normalizeBoolean(value, fallback = false) {
            if (typeof value === "boolean") return value;
            const token = String(value ?? "").trim().toLowerCase();
            if (!token) return fallback;
            if (["1", "true", "yes", "on"].includes(token)) return true;
            if (["0", "false", "no", "off"].includes(token)) return false;
            return fallback;
        }

        function safeGMGet(key, fallback) {
            try {
                return gmGetValue(key, fallback);
            } catch (err) {
                console.warn(`${options.consoleTag} GM_getValue error`, err);
            }
            return fallback;
        }

	        function safeGMSet(key, value) {
	            try {
	                gmSetValue(key, value);
	            } catch (err) {
	                console.warn(`${options.consoleTag} GM_setValue error`, err);
	            }
	        }

        const uiPrefsRaw = safeGMGet(options.storageKeys.uiPrefs, null);
        const uiPrefs = (uiPrefsRaw && typeof uiPrefsRaw === "object" && !Array.isArray(uiPrefsRaw)) ? uiPrefsRaw : {};
        state.themeMode = normalizeThemeMode(uiPrefs.themeMode);
        state.localeMode = normalizeLocaleMode(uiPrefs.localeMode || userOptions.locale || options.locale || "auto");
        state.legacyIconAdaptiveEnabled = normalizeBoolean(uiPrefs.iconAdaptiveEnabled, false);
        if (state.themeMode === "dark") state.isDarkMode = true;
        if (state.themeMode === "light") state.isDarkMode = false;

        const localeMessages = mergeLocaleMessages(
            DEFAULT_CORE_I18N_MESSAGES,
            userOptions?.i18n?.messages || {}
        );
        if (userOptions?.text && typeof userOptions.text === "object") {
            localeMessages["zh-CN"] = deepMerge(localeMessages["zh-CN"] || {}, userOptions.text);
        }
        if (userOptions.menuCommandLabel) {
            localeMessages["zh-CN"] = deepMerge(localeMessages["zh-CN"] || {}, {
                menuCommandLabel: userOptions.menuCommandLabel
            });
        }
        if (userOptions.panelTitle) {
            localeMessages["zh-CN"] = deepMerge(localeMessages["zh-CN"] || {}, {
                panelTitle: userOptions.panelTitle
            });
        }
        const i18n = createI18nContext({
            localeMode: state.localeMode,
            fallbackLocale: "zh-CN",
            messages: localeMessages
        });

        function localizeUrlMethods(baseMethods = URL_METHODS, text = options.text) {
            const localized = {};
            const urlText = text?.urlMethods && typeof text.urlMethods === "object" ? text.urlMethods : {};
            for (const [methodKey, methodConfig] of Object.entries(baseMethods || {})) {
                const methodText = urlText[methodKey] || {};
                const nextOptions = {};
                for (const [optionKey, optionConfig] of Object.entries(methodConfig?.options || {})) {
                    const optionText = methodText?.options?.[optionKey] || {};
                    nextOptions[optionKey] = {
                        ...optionConfig,
                        ...optionText
                    };
                }
                localized[methodKey] = {
                    ...methodConfig,
                    ...methodText,
                    options: nextOptions
                };
            }
            return localized;
        }

        let localizedUrlMethods = {};

        function replaceLocalizedUrlMethods(nextMethods) {
            for (const key of Object.keys(localizedUrlMethods)) delete localizedUrlMethods[key];
            Object.assign(localizedUrlMethods, nextMethods || {});
        }

        function applyLocaleToOptions() {
            state.localeMode = i18n.getLocaleMode();
            state.effectiveLocale = i18n.getEffectiveLocale();
            options.locale = state.localeMode;
            options.text = i18n.getMessages(state.effectiveLocale);
            options.menuCommandLabel = options.text.menuCommandLabel || userOptions.menuCommandLabel || DEFAULT_OPTIONS.menuCommandLabel;
            options.panelTitle = options.text.panelTitle || userOptions.panelTitle || DEFAULT_OPTIONS.panelTitle;
            replaceLocalizedUrlMethods(localizeUrlMethods(URL_METHODS, options.text));
        }

        applyLocaleToOptions();

        function generateShortcutId() {
            try {
                const cryptoApi = getCrypto();
                if (cryptoApi && typeof cryptoApi.randomUUID === "function") {
                    return cryptoApi.randomUUID();
                }
            } catch {}
            return `sc_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;
        }

        function normalizeShortcutLabelToken(value, fallback = "") {
            const token = String(value ?? "").trim();
            return token || fallback;
        }

        function createDefaultShortcutLabelKey(shortcut, index) {
            const explicit = normalizeShortcutLabelToken(shortcut?.labelKey);
            if (explicit) return explicit;
            const key = normalizeShortcutLabelToken(shortcut?.key);
            if (key) return `shortcuts.${key}`;
            const name = normalizeShortcutLabelToken(shortcut?.name);
            if (name) return `shortcuts.${name}`;
            return `shortcuts.default_${index + 1}`;
        }

        const defaultShortcutLabelMap = new Map();
        const defaultShortcutLabelNameMap = new Map();
        options.defaultShortcuts = options.defaultShortcuts.map((shortcut, index) => {
            const next = shortcut && typeof shortcut === "object" ? { ...shortcut } : {};
            const labelKey = createDefaultShortcutLabelKey(next, index);
            if (labelKey && !next.labelKey) next.labelKey = labelKey;
            const lookupKey = normalizeShortcutLabelToken(next.key || next.id);
            if (lookupKey && labelKey) {
                const knownNames = new Set();
                if (next.name) knownNames.add(String(next.name).trim());
                for (const locale of i18n.supportedLocales || []) {
                    const translated = getMessageAtPath(i18n.getMessages(locale), labelKey);
                    if (typeof translated === "string" && translated.trim()) knownNames.add(translated.trim());
                }
                defaultShortcutLabelMap.set(lookupKey, {
                    labelKey,
                    name: String(next.name || ""),
                    knownNames
                });
            }
            if (labelKey) {
                const nameEntry = {
                    labelKey,
                    name: String(next.name || ""),
                    knownNames: new Set()
                };
                if (next.name) nameEntry.knownNames.add(String(next.name).trim());
                for (const locale of i18n.supportedLocales || []) {
                    const translated = getMessageAtPath(i18n.getMessages(locale), labelKey);
                    if (typeof translated === "string" && translated.trim()) nameEntry.knownNames.add(translated.trim());
                }
                for (const knownName of nameEntry.knownNames) {
                    if (knownName && !defaultShortcutLabelNameMap.has(knownName)) {
                        defaultShortcutLabelNameMap.set(knownName, nameEntry);
                    }
                }
            }
            return next;
        });

        function resolveShortcutLabelMetadata(shortcut) {
            const rawLabelKey = normalizeShortcutLabelToken(shortcut?.labelKey);
            if (rawLabelKey) return { labelKey: rawLabelKey, name: String(shortcut?.name || "") };

            const lookupKey = normalizeShortcutLabelToken(shortcut?.key || shortcut?.id);
            const defaults = (lookupKey ? defaultShortcutLabelMap.get(lookupKey) : null)
                || defaultShortcutLabelNameMap.get(String(shortcut?.name || "").trim());
            if (!defaults) return { labelKey: "", name: String(shortcut?.name || "") };

            const rawName = String(shortcut?.name || "").trim();
            if (!rawName || defaults.knownNames.has(rawName)) {
                return { labelKey: defaults.labelKey, name: defaults.name || rawName };
            }
            return { labelKey: "", name: String(shortcut?.name || "") };
        }

        function getShortcutDisplayName(shortcut) {
            const labelKey = normalizeShortcutLabelToken(shortcut?.labelKey);
            const fallback = String(shortcut?.name || "");
            if (!labelKey) return fallback;
            return i18n.t(labelKey, {}, fallback) || fallback;
        }

        function persistUiPrefsPatch(patch = {}) {
            const key = options?.storageKeys?.uiPrefs;
            if (!key) return;
            const raw = safeGMGet(key, null);
            const prev = (raw && typeof raw === "object" && !Array.isArray(raw)) ? raw : {};
            safeGMSet(key, { ...prev, ...patch });
        }

        function setLocaleMode(nextMode, { persist = true, refreshPanel = true } = {}) {
            const changed = i18n.setLocaleMode(nextMode);
            applyLocaleToOptions();
            if (persist) persistUiPrefsPatch({ localeMode: state.localeMode });
            if (engineApi && typeof engineApi.refreshMenuCommand === "function") {
                engineApi.refreshMenuCommand();
            }
            try {
                document.dispatchEvent(new CustomEvent(state.localeChangedEventName, {
                    detail: { localeMode: state.localeMode, effectiveLocale: state.effectiveLocale }
                }));
            } catch {}
            if (refreshPanel && changed && engineApi && typeof engineApi.reopenSettingsPanel === "function") {
                engineApi.reopenSettingsPanel();
            }
            return changed;
        }

        function ensureUniqueShortcutIds(list) {
            if (!Array.isArray(list) || list.length === 0) return;
            const seen = new Set();
            for (const shortcut of list) {
                if (!shortcut || typeof shortcut !== "object") continue;
                const idRaw = typeof shortcut.id === "string" ? shortcut.id.trim() : "";
                let id = idRaw;
                if (!id || seen.has(id)) {
                    id = generateShortcutId();
                    shortcut.id = id;
                }
                seen.add(id);
            }
        }

        function normalizeShortcut(raw) {
            const shortcut = raw && typeof raw === 'object' ? raw : {};
            const key = (typeof shortcut.key === "string") ? shortcut.key.trim() : "";
            let id = (typeof shortcut.id === "string") ? shortcut.id.trim() : "";
            if (!id) {
                id = key ? `key:${key}` : generateShortcutId();
            }
            const dataRaw = shortcut && typeof shortcut.data === "object" && !Array.isArray(shortcut.data) ? shortcut.data : null;
            const normalizeHotkey = typeof hotkeys?.normalize === "function" ? hotkeys.normalize : (v) => String(v || "");
            const labelMeta = resolveShortcutLabelMetadata(shortcut);
            return {
                id,
                key,
                name: labelMeta.name || shortcut.name || "",
                labelKey: labelMeta.labelKey || "",
                actionType: shortcut.actionType || (shortcut.url ? 'url' : (shortcut.selector ? 'selector' : (shortcut.simulateKeys ? 'simulate' : (shortcut.customAction ? 'custom' : '')))),
                url: shortcut.url || "",
                urlMethod: shortcut.urlMethod || "current",
                urlAdvanced: shortcut.urlAdvanced || "href",
                selector: shortcut.selector || "",
                simulateKeys: normalizeHotkey(shortcut.simulateKeys || ""),
                customAction: shortcut.customAction || "",
                hotkey: normalizeHotkey(shortcut.hotkey || ""),
                icon: shortcut.icon || "",
                iconDark: shortcut.iconDark || "",
                iconAdaptive: normalizeBoolean(shortcut.iconAdaptive, state.legacyIconAdaptiveEnabled),
                data: dataRaw ? clone(dataRaw) : {}
            };
        }

        function loadShortcuts() {
            const stored = safeGMGet(options.storageKeys.shortcuts, options.defaultShortcuts);
            const list = Array.isArray(stored) ? stored : [];
            return list.map(normalizeShortcut);
        }

        let shortcuts = loadShortcuts();
        ensureUniqueShortcutIds(shortcuts);

        function saveShortcuts() {
            safeGMSet(options.storageKeys.shortcuts, shortcuts);
        }

        const uiShared = createUiSharedLayer({ options, state, ids, idPrefix, cssPrefix });
        const debounce = uiShared?.utils?.debounce || ((fn) => fn);
        const iconManager = createIconManager({ options, state, safeGMGet, safeGMSet, GMX });
                const builtinActions = createBuiltinActionTools({
            options,
            URL_METHODS: localizedUrlMethods,
            hotkeys,
            showAlert: uiShared?.dialogs?.showAlert
        });

        function executeCustomAction(item, event) {
            const key = (item && item.customAction) ? String(item.customAction) : "";
            if (!key) {
                console.warn(`${options.consoleTag} Shortcut "${item?.name || ''}" is type 'custom' but has no customAction defined.`);
                return;
            }
            const actions = options.customActions && typeof options.customActions === 'object' ? options.customActions : null;
            const fn = actions ? actions[key] : null;
            if (typeof fn !== 'function') {
                console.warn(`${options.consoleTag} Custom action "${key}" not found or not a function.`);
                return;
            }
            try {
                const res = fn({ shortcut: item, event, engine: engineApi });
                if (res && typeof res.then === 'function') {
                    res.catch(err => console.warn(`${options.consoleTag} Custom action "${key}" rejected:`, err));
                }
            } catch (err) {
                console.warn(`${options.consoleTag} Custom action "${key}" failed:`, err);
            }
        }

        function createCoreLayer() {
            let hotkeyIndex = new Map();
            let coreApi = null;
            const actions = createActionRegistry({ consoleTag: options.consoleTag });

            const BUILTIN_ACTION_TYPES = Object.freeze(["url", "selector", "simulate", "custom"]);

            function registerBuiltInActions() {
                actions.register("url", ({ shortcut }) => {
                    if (shortcut?.url) {
                        builtinActions.jumpToUrl(shortcut.url, shortcut.urlMethod, shortcut.urlAdvanced);
                    } else {
                        console.warn(`${options.consoleTag} Shortcut "${shortcut?.name || ""}" is type 'url' but has no URL defined.`);
                    }
                }, { label: options?.text?.stats?.url || "URL jump", shortLabel: "URL", color: "#4CAF50", builtin: true });

                actions.register("selector", ({ shortcut }) => {
                    if (shortcut?.selector) {
                        builtinActions.clickElement(shortcut.selector);
                    } else {
                        console.warn(`${options.consoleTag} Shortcut "${shortcut?.name || ""}" is type 'selector' but has no selector defined.`);
                    }
                }, { label: options?.text?.stats?.selector || "Element click", shortLabel: options?.text?.actionTypes?.selectorShortLabel || "Click", color: "#FF9800", builtin: true });

                actions.register("simulate", ({ shortcut }) => {
                    if (shortcut?.simulateKeys) {
                        builtinActions.simulateKeystroke(shortcut.simulateKeys);
                    } else {
                        console.warn(`${options.consoleTag} Shortcut "${shortcut?.name || ""}" is type 'simulate' but has no simulateKeys defined.`);
                    }
                }, { label: options?.text?.stats?.simulate || "Key simulation", shortLabel: options?.text?.actionTypes?.simulateShortLabel || "Keys", color: "#9C27B0", builtin: true });

                actions.register("custom", ({ shortcut, event }) => {
                    executeCustomAction(shortcut, event);
                }, { label: options?.text?.stats?.custom || "Custom action", shortLabel: options?.text?.actionTypes?.customShortLabel || "Custom", color: "#607D8B", builtin: true });
            }

            function registerUserActionHandlers() {
                const handlers = options.actionHandlers && typeof options.actionHandlers === "object" ? options.actionHandlers : null;
                if (!handlers) return;
                const allowOverrideBuiltin = !!options.allowOverrideBuiltinActions;
                for (const [type, handler] of Object.entries(handlers)) {
                    if (!type) continue;
                    if (BUILTIN_ACTION_TYPES.includes(type) && !allowOverrideBuiltin) {
                        console.warn(`${options.consoleTag} actionHandlers attempted to override built-in action "${type}". Set allowOverrideBuiltinActions=true to allow.`);
                        continue;
                    }
                    const meta = options.actionTypeMeta && typeof options.actionTypeMeta === "object" ? options.actionTypeMeta[type] : null;
                    const finalMeta = meta && typeof meta === "object" ? { ...meta } : {};
                    if (BUILTIN_ACTION_TYPES.includes(type) && typeof finalMeta.builtin !== "boolean") {
                        finalMeta.builtin = false;
                    }
                    actions.register(type, handler, finalMeta);
                }
            }

            registerBuiltInActions();
            registerUserActionHandlers();

            function rebuildHotkeyIndex() {
                const next = new Map();
                for (let i = 0; i < shortcuts.length; i++) {
                    const item = shortcuts[i];
                    if (!item || !item.hotkey) continue;
                    const norm = hotkeys.normalize(item.hotkey);
                    if (!norm) continue;
                    if (!next.has(norm)) next.set(norm, i);
                }
                hotkeyIndex = next;
            }

            function getShortcutByHotkeyNorm(hotkeyNorm) {
                const index = hotkeyIndex.get(hotkeyNorm);
                if (index == null) return null;
                return shortcuts[index] || null;
            }

            function executeShortcutAction(item, event) {
                if (!item) return null;
                const type = String(item.actionType || "").trim();
                const entry = type ? actions.get(type) : null;
                if (!entry || typeof entry.handler !== "function") {
                    console.warn(`${options.consoleTag} Shortcut "${item?.name || ""}" has unknown actionType: ${type}`);
                    return null;
                }
                try {
                    const res = entry.handler({ shortcut: item, event, engine: engineApi, core: coreApi, options });
                    if (res && typeof res.then === "function") {
                        res.catch((err) => console.warn(`${options.consoleTag} Action "${type}" rejected:`, err));
                    }
                    return res;
                } catch (err) {
                    console.warn(`${options.consoleTag} Action "${type}" failed:`, err);
                    return null;
                }
            }

            function setShortcutsList(newShortcuts, { persist = true } = {}) {
                if (!Array.isArray(newShortcuts)) return;
                shortcuts = newShortcuts.map(normalizeShortcut);
                ensureUniqueShortcutIds(shortcuts);
                rebuildHotkeyIndex();
                if (persist) saveShortcuts();
            }

            function mutateShortcuts(mutator, { persist = false } = {}) {
                if (typeof mutator !== 'function') return;
                mutator(shortcuts);
                ensureUniqueShortcutIds(shortcuts);
                rebuildHotkeyIndex();
                if (persist) saveShortcuts();
            }

            function getShortcutsSnapshot() {
                return shortcuts.slice();
            }

            rebuildHotkeyIndex();

            const actionApi = Object.freeze({
                register: actions.register,
                unregister: actions.unregister,
                has: actions.has,
                get: actions.get,
                list: actions.list,
                builtins: BUILTIN_ACTION_TYPES.slice()
            });

            coreApi = Object.freeze({
                setShortcuts: setShortcutsList,
                mutateShortcuts,
                persistShortcuts: saveShortcuts,
                getShortcuts: getShortcutsSnapshot,
                getShortcutDisplayName,
                rebuildHotkeyIndex,
                getShortcutByHotkeyNorm,
                executeShortcutAction,
                actions: actionApi,
                hotkeys: Object.freeze({
                    normalize: hotkeys.normalize,
                    modifierOrder: hotkeys.modifierOrder,
                    fromEvent: hotkeys.fromEvent,
                    getMainKeyFromEvent: hotkeys.getMainKeyFromEvent,
                    isAllowedMainKey: hotkeys.isAllowedMainKey,
                    isAllowedSimulateMainKey: hotkeys.isAllowedSimulateMainKey,
                    formatForDisplay: hotkeys.formatForDisplay,
                    formatModifierToken: hotkeys.formatModifierToken,
                    formatKeyToken: hotkeys.formatKeyToken
                }),
                normalizeHotkey: hotkeys.normalize,
                normalizeShortcut,
                setLocaleMode,
                getLocaleMode: () => state.localeMode,
                getEffectiveLocale: () => state.effectiveLocale,
                i18n
            });
            return coreApi;
        }

        const core = createCoreLayer();

        const ctx = {
            options,
            state,
            core,
            uiShared,
            idPrefix,
            cssPrefix,
            ids,
            classes,
            URL_METHODS: localizedUrlMethods,
            i18n,
            setLocaleMode,
            getUrlMethodDisplayText: builtinActions.getUrlMethodDisplayText,
            setIconImage: iconManager.setIconImage,
            ensureThemeAdaptiveIconStored: iconManager.ensureThemeAdaptiveIconStored,
            setTrustedHTML,
            panelFilter: Object.freeze({
                normalizeActionType: panelNormalizeActionType,
                buildShortcutSearchHaystack: (shortcut) => panelBuildShortcutSearchHaystack({
                    ...(shortcut || {}),
                    name: getShortcutDisplayName(shortcut)
                }),
                matchesSearchQuery: (shortcut, queryLower) => {
                    const query = typeof queryLower === "string" ? queryLower : "";
                    if (!query) return true;
                    return panelBuildShortcutSearchHaystack({
                        ...(shortcut || {}),
                        name: getShortcutDisplayName(shortcut)
                    }).includes(query);
                },
                matchesCurrentView: (viewCtx, shortcut) => {
                    if (!shortcut) return false;
                    const filterType = String(viewCtx?.state?.currentFilter || "all");
                    if (filterType !== "all" && panelNormalizeActionType(shortcut) !== filterType) return false;
                    const queryLower = String(viewCtx?.state?.searchQuery || "").trim().toLowerCase();
                    if (!queryLower) return true;
                    return panelBuildShortcutSearchHaystack({
                        ...(shortcut || {}),
                        name: getShortcutDisplayName(shortcut)
                    }).includes(queryLower);
                }
            }),
            safeGMGet,
            safeGMSet,
            debounce
        };

        uiShared?.theme?.applyThemeCssVariables?.(state.isDarkMode);

	        engineApi = createEngineApi(ctx);
	        return engineApi;
	    }

export { createShortcutEngine };
