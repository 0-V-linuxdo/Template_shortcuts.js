/* -------------------------------------------------------------------------- *
 * Module 05 · Panel Filter (search + current-view predicate shared by panel/dnd)
 * -------------------------------------------------------------------------- */

        function panelNormalizeActionType(shortcut) {
            const type = shortcut && typeof shortcut.actionType === "string" ? shortcut.actionType.trim() : "";
            return type || "unknown";
        }

        function panelBuildShortcutSearchHaystack(shortcut) {
            if (!shortcut || typeof shortcut !== "object") return "";
            let dataText = "";
            try {
                if (shortcut.data && typeof shortcut.data === "object") {
                    dataText = JSON.stringify(shortcut.data);
                }
            } catch {}

            return [
                shortcut.name,
                shortcut.url,
                shortcut.selector,
                shortcut.simulateKeys,
                shortcut.customAction,
                shortcut.actionType,
                dataText
            ]
                .filter(Boolean)
                .join(" ")
                .toLowerCase();
        }

        function panelMatchesSearchQuery(shortcut, queryLower) {
            const query = typeof queryLower === "string" ? queryLower : "";
            if (!query) return true;
            return panelBuildShortcutSearchHaystack(shortcut).includes(query);
        }

        function panelMatchesCurrentView(ctx, shortcut) {
            if (!shortcut) return false;
            const filterType = String(ctx?.state?.currentFilter || "all");
            if (filterType !== "all" && panelNormalizeActionType(shortcut) !== filterType) return false;
            const queryLower = String(ctx?.state?.searchQuery || "").trim().toLowerCase();
            return panelMatchesSearchQuery(shortcut, queryLower);
        }

export {
    panelNormalizeActionType,
    panelBuildShortcutSearchHaystack,
    panelMatchesSearchQuery,
    panelMatchesCurrentView
};
