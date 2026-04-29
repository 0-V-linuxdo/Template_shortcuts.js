/* -------------------------------------------------------------------------- *
 * Module 05 · Panel I/O (import/export, clipboard)
 * -------------------------------------------------------------------------- */

	        function panelGetExportPayload(ctx, { schemaVersion = 1 } = {}) {
            const { options, core, safeGMGet } = ctx;
            const shortcuts = core.getShortcuts();
            const userIcons = safeGMGet(options.storageKeys.userIcons, []);
            return {
                schemaVersion,
                exportedAt: new Date().toISOString(),
                shortcuts,
                userIcons
            };
        }

	        async function panelTryCopyToClipboard(text) {
            const value = String(text ?? "");
            try {
                if (navigator.clipboard && typeof navigator.clipboard.writeText === "function") {
                    await navigator.clipboard.writeText(value);
                    return true;
                }
            } catch {}
            try {
                const ta = document.createElement("textarea");
                ta.value = value;
                ta.style.position = "fixed";
                ta.style.top = "-1000px";
                ta.style.left = "-1000px";
                document.body.appendChild(ta);
                ta.focus();
                ta.select();
                const ok = document.execCommand && document.execCommand("copy");
                document.body.removeChild(ta);
                return !!ok;
            } catch {
                return false;
            }
        }

	        function panelOpenExportDialog(ctx, { overlay } = {}) {
            const { options, uiShared, classes } = ctx;
            const { style, dialogs } = uiShared;
            const { styleInputField, styleButton } = style;
            const { showAlert } = dialogs;

            if (!overlay) return;

            const payload = panelGetExportPayload(ctx);
            const json = JSON.stringify(payload, null, 2);

            const ioOverlay = document.createElement("div");
            ioOverlay.className = classes?.overlay || "";
            ioOverlay.style.zIndex = "999999";
            ioOverlay.onclick = (e) => { if (e.target === ioOverlay) close(); };

            const box = document.createElement("div");
            box.className = classes?.panel || "";
            Object.assign(box.style, {
                width: "100%",
                maxWidth: "820px",
                maxHeight: "90vh",
                overflow: "auto",
                padding: "16px"
            });
            box.onclick = (e) => e.stopPropagation();

            const titleEl = document.createElement("h3");
            titleEl.textContent = options.text.buttons.export || "Export";
            Object.assign(titleEl.style, { margin: "0 0 10px 0", fontSize: "1.05em" });
            box.appendChild(titleEl);

            const textarea = document.createElement("textarea");
            textarea.value = json;
            textarea.readOnly = true;
            Object.assign(textarea.style, { height: "360px", resize: "vertical" });
            styleInputField(textarea);
            box.appendChild(textarea);

            const btnRow = document.createElement("div");
            Object.assign(btnRow.style, {
                display: "flex",
                justifyContent: "flex-end",
                gap: "10px",
                marginTop: "12px",
                flexWrap: "wrap"
            });

            const copyBtn = document.createElement("button");
            copyBtn.textContent = options.text.buttons.copy || "Copy";
            copyBtn.onclick = async () => {
                const ok = await panelTryCopyToClipboard(textarea.value);
                if (ok) showAlert(options?.text?.io?.copySuccess || "Copied to clipboard.");
                else showAlert(options?.text?.io?.copyFail || "Copy failed. Please copy manually.");
            };
            styleButton(copyBtn, "#2196F3", "#1e88e5");
            btnRow.appendChild(copyBtn);

            const closeBtn = document.createElement("button");
            closeBtn.textContent = options.text.buttons.close || "Close";
            closeBtn.onclick = close;
            styleButton(closeBtn, "#9E9E9E", "#757575");
            btnRow.appendChild(closeBtn);

            box.appendChild(btnRow);
            ioOverlay.appendChild(box);
            overlay.appendChild(ioOverlay);

            function close() {
                try { ioOverlay.remove(); } catch {}
            }
        }

	        function panelOpenImportDialog(ctx, { overlay, renderShortcutsList, updateStatsDisplay } = {}) {
            const { options, uiShared, state, core, safeGMSet, classes } = ctx;
            const { style, dialogs } = uiShared;
            const { styleInputField, styleButton } = style;
            const { showAlert } = dialogs;

            if (!overlay) return;

            const ioOverlay = document.createElement("div");
            ioOverlay.className = classes?.overlay || "";
            ioOverlay.style.zIndex = "999999";
            ioOverlay.onclick = (e) => { if (e.target === ioOverlay) close(); };

            const box = document.createElement("div");
            box.className = classes?.panel || "";
            Object.assign(box.style, {
                width: "100%",
                maxWidth: "820px",
                maxHeight: "90vh",
                overflow: "auto",
                padding: "16px"
            });
            box.onclick = (e) => e.stopPropagation();

            const titleEl = document.createElement("h3");
            titleEl.textContent = options.text.buttons.import || "Import";
            Object.assign(titleEl.style, { margin: "0 0 10px 0", fontSize: "1.05em" });
            box.appendChild(titleEl);

            const tip = document.createElement("div");
            tip.textContent = options?.text?.io?.importTip || "Supports importing { shortcuts: [...], userIcons?: [...] } or a shortcuts array directly.";
            Object.assign(tip.style, { fontSize: "12px", opacity: "0.75", marginBottom: "8px", lineHeight: "1.4" });
            box.appendChild(tip);

            const textarea = document.createElement("textarea");
            textarea.placeholder = options?.text?.io?.importPlaceholder || "Paste JSON here...";
            Object.assign(textarea.style, { height: "360px", resize: "vertical" });
            styleInputField(textarea);
            box.appendChild(textarea);

            const btnRow = document.createElement("div");
            Object.assign(btnRow.style, {
                display: "flex",
                justifyContent: "flex-end",
                gap: "10px",
                marginTop: "12px",
                flexWrap: "wrap"
            });

            const confirmBtn = document.createElement("button");
            confirmBtn.textContent = options.text.buttons.confirm || "OK";
            confirmBtn.onclick = () => {
                let parsed = null;
                try {
                    parsed = JSON.parse(textarea.value);
                } catch {
                    showAlert(options?.text?.io?.importJsonParseFailed || "Failed to parse JSON. Please check the format.");
                    return;
                }

                const shortcutsRaw = Array.isArray(parsed)
                    ? parsed
                    : (Array.isArray(parsed?.shortcuts) ? parsed.shortcuts : null);
                if (!Array.isArray(shortcutsRaw)) {
                    showAlert(options?.text?.io?.importMissingShortcuts || "No shortcuts array found in the imported data.");
                    return;
                }

                const normalized = shortcutsRaw.map((sc) => core.normalizeShortcut(sc));
                const hotkeyMap = new Map();
                const duplicates = [];
                for (const sc of normalized) {
                    const hk = String(sc?.hotkey || "");
                    if (!hk) continue;
                    if (hotkeyMap.has(hk)) {
                        duplicates.push([hk, hotkeyMap.get(hk), sc.name || ""]);
                    } else {
                        hotkeyMap.set(hk, sc.name || "");
                    }
                }
                if (duplicates.length > 0) {
                    const lines = duplicates.slice(0, 12).map(([hk, a, b]) => `${hk}: ${a} / ${b}`).join("\n");
                    const prefix = options?.text?.io?.importDuplicateHotkeysPrefix || "Import failed: duplicate shortcuts found (fix them in JSON first):";
                    showAlert(`${prefix}\n${lines}${duplicates.length > 12 ? "\n..." : ""}`);
                    return;
                }

                core.setShortcuts(normalized, { persist: false });

                if (!Array.isArray(parsed)) {
                    const iconsRaw = Array.isArray(parsed?.userIcons) ? parsed.userIcons : null;
                    if (iconsRaw) {
                        const cleaned = iconsRaw
                            .map((it) => ({
                                name: typeof it?.name === "string" ? it.name.trim() : "",
                                url: typeof it?.url === "string" ? it.url.trim() : ""
                            }))
                            .filter((it) => it.name && it.url);
                        safeGMSet(options.storageKeys.userIcons, cleaned);
                    }
                }

                if (typeof renderShortcutsList === "function") renderShortcutsList(state.isDarkMode);
                if (typeof updateStatsDisplay === "function") updateStatsDisplay();
                close();
            };
            styleButton(confirmBtn, "#2196F3", "#1e88e5");
            btnRow.appendChild(confirmBtn);

            const cancelBtn = document.createElement("button");
            cancelBtn.textContent = options.text.buttons.cancel || "Cancel";
            cancelBtn.onclick = close;
            styleButton(cancelBtn, "#9E9E9E", "#757575");
            btnRow.appendChild(cancelBtn);

            box.appendChild(btnRow);
            ioOverlay.appendChild(box);
            overlay.appendChild(ioOverlay);

            function close() {
                try { ioOverlay.remove(); } catch {}
            }
        }

export {
    panelGetExportPayload,
    panelTryCopyToClipboard,
    panelOpenExportDialog,
    panelOpenImportDialog
};
