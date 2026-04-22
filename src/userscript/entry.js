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

const USERSCRIPT_API_RESOLVER_KEY = "__TEMPLATE_SHORTCUTS_GET_USERSCRIPT_API__";
const USERSCRIPT_MENU_BRIDGE_KEY = "__TEMPLATE_SHORTCUTS_MENU_BRIDGE__";

export function renderUserscriptBootstrap({
    siteId = "",
    displayName = "",
    resourceNames = {}
} = {}) {
    const normalizedSiteId = String(siteId || "").trim() || "unknown-site";
    const normalizedDisplayName = String(displayName || "").trim() || normalizedSiteId;
    const normalizedResourceNames = normalizeResourceNames(resourceNames);
    const resourceNamesJson = JSON.stringify(normalizedResourceNames, null, 4);

    return `(() => {
    'use strict';

    const SITE_ID = ${JSON.stringify(normalizedSiteId)};
    const SITE_LABEL = ${JSON.stringify(normalizedDisplayName)};
    const RESOURCE_NAMES = Object.freeze(${resourceNamesJson});

    function getGlobalScope() {
        return typeof globalThis !== 'undefined' ? globalThis : null;
    }

    function getDirectUserscriptApi(name) {
        switch (String(name || "")) {
            case 'GM_getValue':
                return typeof GM_getValue === 'function' ? GM_getValue : null;
            case 'GM_setValue':
                return typeof GM_setValue === 'function' ? GM_setValue : null;
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
        let settingsHandler = null;
        let settingsCommandId = null;
        const settingsLabel = \`\${SITE_LABEL} - 设置快捷键\`;

        const invokeSettingsHandler = () => {
            if (typeof settingsHandler === 'function') {
                try {
                    settingsHandler();
                    return;
                } catch (error) {
                    console.error(\`[\${SITE_LABEL}] settings menu handler failed.\`, error);
                    return;
                }
            }
            console.warn(\`[\${SITE_LABEL}] settings menu clicked before handler was ready.\`);
        };

        if (typeof register === 'function') {
            try {
                settingsCommandId = register(settingsLabel, invokeSettingsHandler);
            } catch (error) {
                console.warn(\`[\${SITE_LABEL}] Failed to register bootstrap settings menu.\`, error);
            }
        }

        const bridge = {
            managedByBootstrap: settingsCommandId !== null && settingsCommandId !== undefined,
            setSettingsHandler(handler) {
                settingsHandler = typeof handler === 'function' ? handler : null;
                return settingsHandler !== null;
            },
            getSettingsCommandId() {
                return settingsCommandId;
            },
            getSettingsLabel() {
                return settingsLabel;
            }
        };

        const scope = getGlobalScope();
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
