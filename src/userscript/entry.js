/* -------------------------------------------------------------------------- *
 * Userscript Entry · Bootstrap template renderer
 * -------------------------------------------------------------------------- */

function normalizeResourceNames(resourceNames = {}) {
    const core = typeof resourceNames?.core === "string" && resourceNames.core.trim()
        ? resourceNames.core.trim()
        : "template-core";
    const site = typeof resourceNames?.site === "string" && resourceNames.site.trim()
        ? resourceNames.site.trim()
        : "site-entry";

    return Object.freeze({ core, site });
}

function normalizeBootstrapMenuCommands(menuCommands = []) {
    const normalized = [];
    const seenKeys = new Set();

    for (const command of Array.isArray(menuCommands) ? menuCommands : []) {
        const key = typeof command?.key === "string" ? command.key.trim() : "";
        const label = typeof command?.label === "string" ? command.label.trim() : "";
        if (!key || !label || seenKeys.has(key)) continue;
        seenKeys.add(key);
        normalized.push(Object.freeze({ key, label }));
    }

    return Object.freeze(normalized);
}

const USERSCRIPT_API_RESOLVER_KEY = "__TEMPLATE_SHORTCUTS_GET_USERSCRIPT_API__";
const USERSCRIPT_MENU_BRIDGE_KEY = "__TEMPLATE_SHORTCUTS_MENU_BRIDGE__";
const USERSCRIPT_MENU_EVENT_NAME = "__templateShortcutsMenuCommand";
const USERSCRIPT_MENU_MESSAGE_SOURCE = "template-shortcuts-userscript";
const USERSCRIPT_MENU_VALUE_KEY_PREFIX = "__templateShortcutsMenuPendingValue::";

export function renderUserscriptBootstrap({
    siteId = "",
    displayName = "",
    resourceNames = {},
    bootstrapMenuCommands = []
} = {}) {
    const normalizedSiteId = String(siteId || "").trim() || "unknown-site";
    const normalizedDisplayName = String(displayName || "").trim() || normalizedSiteId;
    const normalizedResourceNames = normalizeResourceNames(resourceNames);
    const normalizedBootstrapMenuCommands = normalizeBootstrapMenuCommands(bootstrapMenuCommands);
    const resourceNamesJson = JSON.stringify(normalizedResourceNames, null, 4);
    const bootstrapMenuCommandsJson = JSON.stringify(normalizedBootstrapMenuCommands, null, 4);

    return `(() => {
    'use strict';

    const SITE_ID = ${JSON.stringify(normalizedSiteId)};
    const SITE_LABEL = ${JSON.stringify(normalizedDisplayName)};
    const RESOURCE_NAMES = Object.freeze(${resourceNamesJson});
    const BOOTSTRAP_MENU_COMMANDS = Object.freeze(${bootstrapMenuCommandsJson});
    const MENU_MESSAGE_SOURCE = ${JSON.stringify(USERSCRIPT_MENU_MESSAGE_SOURCE)};
    const MENU_PENDING_VALUE_KEY = ${JSON.stringify(`${USERSCRIPT_MENU_VALUE_KEY_PREFIX}${normalizedSiteId}`)};
    const MENU_PAGE_TOKEN = Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 10);
    const MENU_COMMAND_MAX_AGE_MS = 5 * 60 * 1000;

    function getGlobalScope() {
        return typeof globalThis !== 'undefined' ? globalThis : null;
    }

    function getDirectUserscriptApi(name) {
        switch (String(name || "")) {
            case 'GM_getValue':
                return typeof GM_getValue === 'function' ? GM_getValue : null;
            case 'GM_setValue':
                return typeof GM_setValue === 'function' ? GM_setValue : null;
            case 'GM_addValueChangeListener':
                return typeof GM_addValueChangeListener === 'function' ? GM_addValueChangeListener : null;
            case 'GM_removeValueChangeListener':
                return typeof GM_removeValueChangeListener === 'function' ? GM_removeValueChangeListener : null;
            case 'GM_xmlhttpRequest':
                return typeof GM_xmlhttpRequest === 'function' ? GM_xmlhttpRequest : null;
            case 'GM_getResourceURL':
                return typeof GM_getResourceURL === 'function' ? GM_getResourceURL : null;
            case 'GM_registerMenuCommand':
                return typeof GM_registerMenuCommand === 'function' ? GM_registerMenuCommand : null;
            case 'GM_unregisterMenuCommand':
                return typeof GM_unregisterMenuCommand === 'function' ? GM_unregisterMenuCommand : null;
            default:
                return null;
        }
    }

    function getUserscriptApi(name) {
        const directBinding = getDirectUserscriptApi(name);
        if (typeof directBinding === 'function') return directBinding;

        const scope = getGlobalScope();
        if (!scope) return null;

        const direct = scope[name];
        if (typeof direct === 'function') return direct.bind(scope);

        const gm = scope.GM;
        if (gm && typeof gm === 'object') {
            const altName = name.replace(/^GM_/, '');
            const directGm = gm[altName];
            if (typeof directGm === 'function') return directGm.bind(gm);

            const lowerCamel = altName.charAt(0).toLowerCase() + altName.slice(1);
            const camelGm = gm[lowerCamel];
            if (typeof camelGm === 'function') return camelGm.bind(gm);
        }

        return null;
    }

    function gmGetValueSafe(key, fallback) {
        const fn = getUserscriptApi('GM_getValue');
        if (typeof fn !== 'function') return fallback;
        try {
            const value = fn(key, fallback);
            return value === undefined ? fallback : value;
        } catch {
            return fallback;
        }
    }

    function gmSetValueSafe(key, value) {
        const fn = getUserscriptApi('GM_setValue');
        if (typeof fn !== 'function') return false;
        try {
            fn(key, value);
            return true;
        } catch {
            return false;
        }
    }

    function exposeUserscriptApiResolver() {
        const scope = getGlobalScope();
        if (!scope) return;

        try {
            Object.defineProperty(scope, ${JSON.stringify(USERSCRIPT_API_RESOLVER_KEY)}, {
                value: getUserscriptApi,
                configurable: true,
                enumerable: false,
                writable: true
            });
            return;
        } catch {}

        try {
            scope[${JSON.stringify(USERSCRIPT_API_RESOLVER_KEY)}] = getUserscriptApi;
        } catch {}
    }

    function createMenuBridge() {
        const register = getUserscriptApi('GM_registerMenuCommand');
        const unregister = getUserscriptApi('GM_unregisterMenuCommand');
        let settingsHandler = null;
        const commands = new Map();
        const scope = getGlobalScope();
        const dispatchTarget = scope?.document && typeof scope.document.dispatchEvent === 'function'
            ? scope.document
            : (scope && typeof scope.dispatchEvent === 'function' ? scope : null);

        function normalizeCommandKey(commandKey) {
            return String(commandKey || "").trim();
        }

        function createCommandId(commandKey) {
            const key = normalizeCommandKey(commandKey) || 'menu';
            return key + ':' + Date.now().toString(36) + ':' + Math.random().toString(36).slice(2, 10);
        }

        function normalizePendingEntries(entries) {
            const now = Date.now();
            const normalized = [];
            const seenIds = new Set();

            for (const entry of Array.isArray(entries) ? entries : []) {
                const id = typeof entry?.id === 'string' ? entry.id.trim() : '';
                const key = normalizeCommandKey(entry?.key);
                const pageToken = typeof entry?.pageToken === 'string' ? entry.pageToken.trim() : '';
                const createdAt = Number(entry?.createdAt);
                if (!id || !key || !pageToken) continue;
                if (!Number.isFinite(createdAt)) continue;
                if ((now - createdAt) > MENU_COMMAND_MAX_AGE_MS) continue;
                if (seenIds.has(id)) continue;
                seenIds.add(id);
                normalized.push(Object.freeze({ id, key, pageToken, createdAt }));
            }

            if (normalized.length <= 48) return normalized;
            return normalized.slice(normalized.length - 48);
        }

        function readPendingEntries() {
            return normalizePendingEntries(gmGetValueSafe(MENU_PENDING_VALUE_KEY, []));
        }

        function writePendingEntries(entries) {
            return gmSetValueSafe(MENU_PENDING_VALUE_KEY, normalizePendingEntries(entries));
        }

        function queuePendingCommand(commandKey, commandId) {
            const key = normalizeCommandKey(commandKey);
            const id = String(commandId || "").trim() || createCommandId(key);
            if (!key || !id) return null;
            const pendingEntries = readPendingEntries();
            pendingEntries.push(Object.freeze({
                id,
                key,
                pageToken: MENU_PAGE_TOKEN,
                createdAt: Date.now()
            }));
            return writePendingEntries(pendingEntries) ? id : null;
        }

        function dispatchCommand(commandKey, commandId) {
            const key = normalizeCommandKey(commandKey);
            if (!key) return false;
            const id = String(commandId || "").trim() || createCommandId(key);
            const payload = Object.freeze({
                type: ${JSON.stringify(USERSCRIPT_MENU_EVENT_NAME)},
                source: MENU_MESSAGE_SOURCE,
                siteId: SITE_ID,
                pageToken: MENU_PAGE_TOKEN,
                commandKey: key,
                commandId: id
            });
            try {
                if (scope && typeof scope.postMessage === 'function') {
                    scope.postMessage(payload, '*');
                    return true;
                }
            } catch {}
            if (!dispatchTarget || typeof CustomEvent !== 'function') return false;
            try {
                dispatchTarget.dispatchEvent(new CustomEvent(${JSON.stringify(USERSCRIPT_MENU_EVENT_NAME)}, {
                    detail: payload
                }));
                return true;
            } catch {
                return false;
            }
        }

        function invokeCommand(commandKey) {
            const key = normalizeCommandKey(commandKey);
            const commandId = createCommandId(key);
            const queuedCommandId = queuePendingCommand(key, commandId);
            const effectiveCommandId = queuedCommandId || commandId;
            const dispatched = dispatchCommand(key, effectiveCommandId);
            if (queuedCommandId || dispatched) return;

            if (key === "settings" && typeof settingsHandler === 'function') {
                try {
                    settingsHandler();
                    return;
                } catch (error) {
                    console.error(\`[\${SITE_LABEL}] settings menu handler failed.\`, error);
                    return;
                }
            }

            if (key === "settings") {
                console.warn(\`[\${SITE_LABEL}] settings menu clicked before handler was ready.\`);
            }
        }

        function registerCommand(commandKey, label) {
            const key = normalizeCommandKey(commandKey);
            const text = String(label || "").trim();
            if (!key || !text || typeof register !== 'function') return null;

            const existing = commands.get(key) || null;
            if (existing && existing.label === text && existing.commandId !== null && existing.commandId !== undefined) {
                return existing.commandId;
            }

            if (existing && existing.commandId !== null && existing.commandId !== undefined && typeof unregister === 'function') {
                try { unregister(existing.commandId); } catch {}
            }

            let commandId = null;
            try {
                commandId = register(text, () => invokeCommand(key));
            } catch (error) {
                console.warn(\`[\${SITE_LABEL}] Failed to register bootstrap menu "\${text}".\`, error);
                commandId = null;
            }

            commands.set(key, { label: text, commandId });
            return commandId;
        }

        function unregisterCommand(commandKey) {
            const key = normalizeCommandKey(commandKey);
            if (!key) return false;
            const existing = commands.get(key) || null;
            if (!existing) return false;
            if (existing.commandId !== null && existing.commandId !== undefined && typeof unregister === 'function') {
                try { unregister(existing.commandId); } catch {}
            }
            commands.delete(key);
            return true;
        }

        function consumePending(commandKey) {
            const key = normalizeCommandKey(commandKey);
            if (!key) return 0;
            const pendingEntries = readPendingEntries();
            if (pendingEntries.length === 0) return 0;
            let count = 0;
            const remainingEntries = [];
            for (const entry of pendingEntries) {
                if (entry.key === key && entry.pageToken === MENU_PAGE_TOKEN) {
                    count += 1;
                    continue;
                }
                remainingEntries.push(entry);
            }
            writePendingEntries(remainingEntries);
            return count;
        }

        registerCommand("settings", \`\${SITE_LABEL} - 设置快捷键\`);
        for (const command of BOOTSTRAP_MENU_COMMANDS) {
            if (command?.key === "settings") continue;
            registerCommand(command?.key, command?.label);
        }

        const bridge = {
            managedByBootstrap: typeof register === 'function',
            eventName: ${JSON.stringify(USERSCRIPT_MENU_EVENT_NAME)},
            registerCommand,
            unregisterCommand,
            consumePending,
            dispatchCommand,
            setSettingsHandler(handler) {
                settingsHandler = typeof handler === 'function' ? handler : null;
                return settingsHandler !== null;
            },
            getSettingsCommandId() {
                return commands.get("settings")?.commandId ?? null;
            },
            getSettingsLabel() {
                return commands.get("settings")?.label || \`\${SITE_LABEL} - 设置快捷键\`;
            }
        };

        if (scope) {
            try {
                Object.defineProperty(scope, ${JSON.stringify(USERSCRIPT_MENU_BRIDGE_KEY)}, {
                    value: bridge,
                    configurable: true,
                    enumerable: false,
                    writable: true
                });
            } catch {
                try {
                    scope[${JSON.stringify(USERSCRIPT_MENU_BRIDGE_KEY)}] = bridge;
                } catch {}
            }
        }

        return Object.freeze(bridge);
    }

    async function getResourceUrl(name) {
        const fn = getUserscriptApi('GM_getResourceURL');
        if (typeof fn !== 'function') {
            throw new Error(\`GM_getResourceURL is unavailable for resource "\${name}"\`);
        }

        const value = await Promise.resolve(fn(name));
        const url = typeof value === 'string' ? value.trim() : '';
        if (!url) {
            throw new Error(\`GM_getResourceURL returned an empty URL for resource "\${name}"\`);
        }
        return url;
    }

    async function prepareModuleUrl(name) {
        const rawUrl = await getResourceUrl(name);

        try {
            const response = await fetch(rawUrl);
            if (!response.ok) {
                throw new Error(\`HTTP \${response.status}\`);
            }

            const source = await response.text();
            const blob = new Blob([source], { type: 'text/javascript;charset=utf-8' });
            return {
                rawUrl,
                moduleUrl: URL.createObjectURL(blob)
            };
        } catch (error) {
            console.warn(\`[\${SITE_LABEL}] Failed to rewrap resource "\${name}" as a module blob URL. Falling back to the original resource URL.\`, error);
            return {
                rawUrl,
                moduleUrl: rawUrl
            };
        }
    }

    exposeUserscriptApiResolver();
    const menuBridge = createMenuBridge();

    async function main() {
        const preparedCore = await prepareModuleUrl(RESOURCE_NAMES.core);
        const preparedSite = await prepareModuleUrl(RESOURCE_NAMES.site);
        const resourceUrls = Object.freeze({
            core: preparedCore.rawUrl,
            site: preparedSite.rawUrl
        });
        const moduleUrls = Object.freeze({
            core: preparedCore.moduleUrl,
            site: preparedSite.moduleUrl
        });

        const siteModule = await import(moduleUrls.site);
        const startSite = typeof siteModule?.startSite === 'function'
            ? siteModule.startSite
            : (typeof siteModule?.default === 'function' ? siteModule.default : null);

        if (typeof startSite !== 'function') {
            throw new Error('Site module must export startSite(runtime).');
        }

        await startSite(Object.freeze({
            siteId: SITE_ID,
            displayName: SITE_LABEL,
            resourceNames: RESOURCE_NAMES,
            resourceUrls,
            moduleUrls,
            bootstrapMenuManaged: BOOTSTRAP_MENU_COMMANDS.length > 0,
            menuMessageType: ${JSON.stringify(USERSCRIPT_MENU_EVENT_NAME)},
            menuMessageSource: ${JSON.stringify(USERSCRIPT_MENU_MESSAGE_SOURCE)},
            menuPendingValueKey: MENU_PENDING_VALUE_KEY,
            menuPageToken: MENU_PAGE_TOKEN,
            menuBridge,
            getUserscriptApi,
            getResourceUrl
        }));
    }

    void main().catch((error) => {
        console.error(\`[\${SITE_LABEL}] userscript bootstrap failed.\`, error);
    });
})();`;
}
