function panelCreateInputField(ctx, labelText, value, type = "text", placeholder = "") {
            const { uiShared } = ctx;
            const { layout } = uiShared;
            const { autoResizeTextarea } = layout;

            const label = document.createElement("label");
            Object.assign(label.style, { display: "block", margin: "12px 0 4px", fontWeight: "bold", fontSize: "0.9em" });
            label.appendChild(document.createTextNode(labelText));

            const input = type === "textarea" ? document.createElement("textarea") : document.createElement("input");
            if (type !== "textarea") input.type = type;
            input.value = value;
            input.placeholder = placeholder;
            input.style.display = 'block';

            if (type === "textarea") {
                input.rows = 1;
                Object.assign(input.style, {
                    minHeight: "36px",
                    resize: "vertical",
                    overflowY: "hidden"
                });
                input.addEventListener("input", function() { autoResizeTextarea(this); });
                requestAnimationFrame(() => autoResizeTextarea(input));
            }
            label.appendChild(input);
            return { label, input };
        }

        function panelCreateIconField(ctx, labelText, value, darkValue = "") {
            const { uiShared, state, options } = ctx;
            const { theme, colors } = uiShared;
            const { addThemeChangeListener, removeThemeChangeListener } = theme;
            const { getBorderColor, getInputBackgroundColor } = colors;
            const { autoResizeTextarea } = uiShared.layout;

            const label = document.createElement("label");
            Object.assign(label.style, { display: "block", margin: "12px 0 4px", fontWeight: "bold", fontSize: "0.9em" });
            label.appendChild(document.createTextNode(labelText));

            const wrap = document.createElement("div");
            Object.assign(wrap.style, {
                display: "flex",
                flexDirection: "column",
                gap: "8px"
            });

            const lightRow = document.createElement("div");
            Object.assign(lightRow.style, {
                display: "grid",
                gridTemplateColumns: "minmax(0, 1fr) 36px",
                alignItems: "flex-start",
                columnGap: "8px",
                width: "100%"
            });

            const textarea = document.createElement("textarea");
            textarea.value = value || "";
            textarea.placeholder = options?.text?.editor?.placeholders?.icon || "Paste a URL here, or choose from the library below";
            textarea.rows = 1;
            Object.assign(textarea.style, {
                minHeight: "36px",
                resize: "vertical",
                overflowY: "hidden",
                width: "100%",
                boxSizing: "border-box",
                flex: "1 1 auto",
                minWidth: "0"
            });

            const darkLabel = document.createElement("div");
            darkLabel.textContent = options?.text?.editor?.labels?.iconDark || "Dark-mode icon URL:";
            Object.assign(darkLabel.style, {
                marginTop: "2px",
                fontSize: "1em",
                fontWeight: "inherit",
                lineHeight: "1.4"
            });

            const darkTextarea = document.createElement("textarea");
            darkTextarea.value = darkValue || "";
            darkTextarea.placeholder = options?.text?.editor?.placeholders?.iconDark || "Optional: dark-mode icon URL";
            darkTextarea.rows = 1;
            Object.assign(darkTextarea.style, {
                minHeight: "36px",
                resize: "vertical",
                overflowY: "hidden",
                width: "100%",
                boxSizing: "border-box",
                flex: "1 1 auto",
                minWidth: "0"
            });

            const darkRow = document.createElement("div");
            Object.assign(darkRow.style, {
                display: "grid",
                gridTemplateColumns: "minmax(0, 1fr) 36px",
                alignItems: "flex-start",
                columnGap: "8px",
                width: "100%"
            });

            const preview = document.createElement("img");
            Object.assign(preview.style, { width: "36px", height: "36px", objectFit: "contain", borderRadius: "4px", flexShrink: "0" });

            const darkPreview = document.createElement("img");
            Object.assign(darkPreview.style, {
                width: "36px",
                height: "36px",
                objectFit: "contain",
                borderRadius: "4px",
                flexShrink: "0",
                display: "none"
            });

            requestAnimationFrame(() => autoResizeTextarea(textarea));
            requestAnimationFrame(() => autoResizeTextarea(darkTextarea));
            lightRow.appendChild(textarea);
            lightRow.appendChild(preview);
            darkRow.appendChild(darkTextarea);
            darkRow.appendChild(darkPreview);
            wrap.appendChild(lightRow);
            wrap.appendChild(darkLabel);
            wrap.appendChild(darkRow);
            label.appendChild(wrap);

            const updatePreviewTheme = (isDark) => {
                preview.style.border = `1px solid ${getBorderColor(isDark)}`;
                preview.style.backgroundColor = getInputBackgroundColor(isDark);
                darkPreview.style.border = `1px solid ${getBorderColor(isDark)}`;
                darkPreview.style.backgroundColor = getInputBackgroundColor(isDark);
            };
            addThemeChangeListener(updatePreviewTheme);
            updatePreviewTheme(state.isDarkMode);

            const destroy = () => {
                removeThemeChangeListener(updatePreviewTheme);
            };

            return {
                label,
                input: textarea,
                darkInput: darkTextarea,
                darkLabel,
                darkRow,
                preview,
                darkPreview,
                destroy
            };
        }

export {
    panelCreateInputField,
    panelCreateIconField
};
