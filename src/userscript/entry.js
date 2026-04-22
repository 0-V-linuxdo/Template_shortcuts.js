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

    function getUserscriptApi(name) {
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
            getUserscriptApi,
            getResourceUrl
        }));
    }

    void main().catch((error) => {
        console.error(\`[\${SITE_LABEL}] userscript bootstrap failed.\`, error);
    });
})();`;
}
