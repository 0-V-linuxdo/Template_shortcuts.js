function panelCreateIconLibraryUI(ctx, targetTextarea, targetPreviewImg, getAdaptiveEnabled = null) {
            const { options, uiShared, state, safeGMGet, safeGMSet, setIconImage, ensureThemeAdaptiveIconStored } = ctx;
            const { theme, colors, dialogs } = uiShared;
            const { addThemeChangeListener, removeThemeChangeListener } = theme;
            const { getPrimaryColor, getInputBackgroundColor, getTextColor, getBorderColor, getHoverColor } = colors;
            const { showAlert, showConfirmDialog, showPromptDialog } = dialogs;

            let userIcons = safeGMGet(options.storageKeys.userIcons, []);
            let isExpanded = false;
            let longPressTimer = null;
            const isTargetIconAdaptiveEnabled = () => {
                try {
                    return !!(typeof getAdaptiveEnabled === "function" ? getAdaptiveEnabled() : false);
                } catch {
                    return false;
                }
            };

            const container = document.createElement("div");
            container.style.marginTop = "10px";

            const title = document.createElement("div");
            title.textContent = options?.text?.editor?.labels?.iconLibrary || "或从图库选择:";
            Object.assign(title.style, { fontWeight: "bold", fontSize: "0.9em", marginBottom: "8px" });
            container.appendChild(title);

            const gridWrapper = document.createElement("div");
            gridWrapper.style.position = "relative";
            container.appendChild(gridWrapper);

            const iconGrid = document.createElement("div");
            Object.assign(iconGrid.style, {
                display: "grid",
                gridTemplateColumns: "repeat(auto-fill, minmax(36px, 1fr))",
                gap: "8px",
                padding: "8px",
                borderRadius: "6px",
                border: "1px solid",
                maxHeight: "170px",
                overflowY: "auto",
                transition: "background-color 0.2s ease, border-color 0.2s ease",
            });
            gridWrapper.appendChild(iconGrid);

            const baseButtonStyle = {
                width: "32px", height: "32px", padding: "0",
                cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: "16px", transition: "background-color 0.2s ease, border-color 0.2s ease",
                position: "absolute", zIndex: "2"
            };

            const expandButton = document.createElement("button");
            expandButton.type = "button";
            expandButton.title = options?.text?.editor?.iconLibrary?.expandTitle || "展开/折叠更多图标";
            Object.assign(expandButton.style, baseButtonStyle, {
                border: "1px solid transparent",
                background: "transparent",
                top: "-16px",
                right: "8px",
                transform: "translateY(-50%)"
            });
            expandButton.addEventListener("click", () => {
                isExpanded = !isExpanded;
                iconGrid.querySelectorAll('.extra-icon').forEach(btn => {
                    btn.style.display = isExpanded ? 'flex' : 'none';
                });
                expandButton.textContent = isExpanded ? '▲' : '▼';
            });
            gridWrapper.appendChild(expandButton);

            const addButton = document.createElement("button");
            addButton.type = "button";
            addButton.textContent = "➕";
            addButton.title = options?.text?.editor?.iconLibrary?.addTitle || "将输入框中的图标URL添加到图库";
            Object.assign(addButton.style, baseButtonStyle, {
                border: "1px solid",
                borderRadius: "4px",
                bottom: "8px",
                right: "8px",
            });
            addButton.addEventListener('click', () => {
                const url = targetTextarea.value.trim();
                if (!url) { showAlert(options?.text?.editor?.iconLibrary?.urlRequired || "请输入图标的URL！"); return; }
                if (userIcons.some(icon => icon.url === url) || options.iconLibrary.some(icon => icon.url === url)) { showAlert(options?.text?.editor?.iconLibrary?.alreadyExists || "该图标已存在于图库中。"); return; }
                showPromptDialog(options?.text?.editor?.iconLibrary?.promptName || "请输入图标的名称：", "", (name) => {
                    if (name && name.trim()) {
                        userIcons.push({ name: name.trim(), url: url });
                        safeGMSet(options.storageKeys.userIcons, userIcons);
                        if (isTargetIconAdaptiveEnabled() && typeof ensureThemeAdaptiveIconStored === "function") {
                            ensureThemeAdaptiveIconStored(url);
                        }
                        renderIconGrid();
                    }
                });
            });
            gridWrapper.appendChild(addButton);

            function renderIconGrid() {
                iconGrid.replaceChildren();
                const allIcons = [...options.iconLibrary, ...userIcons];

                allIcons.forEach(iconInfo => {
                    const isProtected = options.protectedIconUrls.includes(iconInfo.url);
                    const isUserAdded = userIcons.some(ui => ui.url === iconInfo.url);

                    const button = document.createElement("button");
                    button.type = "button";
                    button.title = iconInfo.name + (isUserAdded ? (options?.text?.editor?.iconLibrary?.userAddedHint || " (长按删除)") : "");
                    Object.assign(button.style, {
                        width: "36px", height: "36px", padding: "4px", border: "1px solid", borderRadius: "4px",
                        cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center",
                        transition: "background-color 0.2s ease, border-color 0.2s ease", position: "relative"
                    });
                    const img = document.createElement("img");
                    Object.assign(img.style, { width: "24px", height: "24px", objectFit: "contain", pointerEvents: "none" });
                    setIconImage(img, iconInfo.url);
                    button.appendChild(img);

                    if (!isProtected) {
                        button.classList.add('extra-icon');
                        button.style.display = isExpanded ? 'flex' : 'none';
                    }

                    button.addEventListener("click", () => {
                        targetTextarea.value = iconInfo.url;
                        setIconImage(targetPreviewImg, iconInfo.url, "", isTargetIconAdaptiveEnabled());
                        targetTextarea.dispatchEvent(new Event('input', { bubbles: true }));
                    });

                    if (isUserAdded) {
                        button.addEventListener("mousedown", (e) => {
                            if (e.button !== 0) return;
                            longPressTimer = setTimeout(() => {
                                const tpl = options?.text?.editor?.iconLibrary?.confirmDelete || '确定要删除自定义图标 "{name}" 吗?';
                                showConfirmDialog(tpl.replace("{name}", String(iconInfo.name ?? "")), () => {
                                    userIcons = userIcons.filter(icon => icon.url !== iconInfo.url);
                                    safeGMSet(options.storageKeys.userIcons, userIcons);
                                    renderIconGrid();
                                });
                                longPressTimer = null;
                            }, 1000);
                        });
                        const clearLongPress = () => { if (longPressTimer) { clearTimeout(longPressTimer); longPressTimer = null; } };
                        button.addEventListener("mouseup", clearLongPress);
                        button.addEventListener("mouseleave", clearLongPress);
                    }

                    iconGrid.appendChild(button);
                });
                updateTheme(state.isDarkMode);
            }

            const updateTheme = (isDark) => {
                title.style.color = getTextColor(isDark);
                gridWrapper.style.backgroundColor = getInputBackgroundColor(isDark);
                gridWrapper.style.borderColor = getBorderColor(isDark);
                iconGrid.style.borderColor = 'transparent';

                const gridButtons = Array.from(iconGrid.querySelectorAll('button'));

                addButton.style.backgroundColor = getInputBackgroundColor(isDark);
                addButton.style.borderColor = getBorderColor(isDark);
                addButton.style.color = getTextColor(isDark);
                addButton.onmouseover = () => {
                    addButton.style.backgroundColor = getHoverColor(isDark);
                    addButton.style.borderColor = getPrimaryColor();
                };
                addButton.onmouseout = () => {
                    addButton.style.backgroundColor = getInputBackgroundColor(isDark);
                    addButton.style.borderColor = getBorderColor(isDark);
                };

                expandButton.style.color = getTextColor(isDark);
                expandButton.onmouseover = () => {
                    expandButton.style.backgroundColor = getHoverColor(isDark);
                    expandButton.style.borderColor = getPrimaryColor();
                };
                expandButton.onmouseout = () => {
                    expandButton.style.backgroundColor = 'transparent';
                    expandButton.style.borderColor = 'transparent';
                };
                expandButton.dispatchEvent(new Event('mouseout'));

                gridButtons.forEach(btn => {
                    btn.style.backgroundColor = "transparent";
                    btn.style.borderColor = getBorderColor(isDark);
                    btn.style.color = getTextColor(isDark);
                    btn.onmouseover = () => {
                        btn.style.backgroundColor = getHoverColor(isDark);
                        btn.style.borderColor = getPrimaryColor();
                    };
                    btn.onmouseout = () => {
                        btn.style.backgroundColor = "transparent";
                        btn.style.borderColor = getBorderColor(isDark);
                    };
                });
            };

            renderIconGrid();
            expandButton.textContent = isExpanded ? '▲' : '▼';

            addThemeChangeListener(updateTheme);
            updateTheme(state.isDarkMode);

            const destroy = () => {
                removeThemeChangeListener(updateTheme);
            };

            return { container, updateTheme, destroy };
        }

export { panelCreateIconLibraryUI };
