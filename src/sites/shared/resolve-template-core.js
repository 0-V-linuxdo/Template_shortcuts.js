/* -------------------------------------------------------------------------- *
 * Site Shared · ShortcutTemplate resolver
 * -------------------------------------------------------------------------- */

export async function resolveShortcutTemplate(runtime = {}) {
    const directTemplate = runtime?.templateCore;
    if (directTemplate && typeof directTemplate === "object") {
        return directTemplate;
    }

    const preloadedCoreModule = runtime?.coreModule;
    if (preloadedCoreModule && typeof preloadedCoreModule === "object") {
        return preloadedCoreModule?.default || preloadedCoreModule || null;
    }

    const coreUrl = typeof runtime?.moduleUrls?.core === "string" ? runtime.moduleUrls.core.trim() : "";
    if (!coreUrl) return null;

    const importedCoreModule = await import(coreUrl);
    return importedCoreModule?.default || importedCoreModule || null;
}
