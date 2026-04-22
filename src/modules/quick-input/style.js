/* -------------------------------------------------------------------------- *
 * Quick Input · Style helpers
 * -------------------------------------------------------------------------- */

export function ensureQuickInputStyle({ overlayRootEl, usesShadowUi, overlayId, primaryColor } = {}) {
                if (!overlayRootEl) return;
                let style = overlayRootEl.querySelector?.("style[data-quick-input-style='1']") || null;
                if (!style) {
                    style = globalThis.document?.createElement?.("style");
                    if (!style) return;
                    style.setAttribute("data-quick-input-style", "1");
                    overlayRootEl.appendChild(style);
                }
                const hostSelector = usesShadowUi ? ":host" : `#${overlayId}`;
                const lightSelector = usesShadowUi ? ":host([data-theme='light'])" : `#${overlayId}[data-theme='light']`;
                style.textContent = `
                ${hostSelector} {
                    --qi-surface: #1a1a1a;
                    --qi-surface-alt: #2d2d2d;
                    --qi-header-bg: #1a1a1a;
                    --qi-actions-bg: #1a1a1a;
                    --qi-border: #404040;
                    --qi-text: rgba(255,255,255,0.85);
                    --qi-text-strong: #ffffff;
                    --qi-text-muted: rgba(255,255,255,0.72);
                    --qi-overlay: rgba(0, 0, 0, 0.7);
                    --qi-hover: rgba(255,255,255,0.08);
                    --qi-error: #fca5a5;
                    --qi-success: #86efac;
                    --qi-warn: #fdba74;
                    --qi-danger-bg: rgba(239, 68, 68, 0.92);
                    --qi-danger-border: rgba(255,255,255,0.18);
                    --qi-icon-btn-bg: rgba(255,255,255,0.08);
                    --qi-icon-btn-hover: rgba(255,255,255,0.16);
                    --qi-icon-btn-border: rgba(255,255,255,0.16);
                    --qi-icon-btn-color: rgba(255,255,255,0.76);
                    --qi-icon-btn-danger-bg: rgba(239,68,68,0.18);
                    --qi-icon-btn-danger-hover: rgba(239,68,68,0.26);
                    --qi-icon-btn-danger-border: rgba(248,113,113,0.34);
                    --qi-icon-btn-danger-color: #fecaca;
                    --qi-player-stop-bg: color-mix(in srgb, ${primaryColor} 18%, var(--qi-surface-alt));
                    --qi-player-stop-border: color-mix(in srgb, ${primaryColor} 26%, var(--qi-border));
                    --qi-player-stop-color: color-mix(in srgb, ${primaryColor} 82%, white 18%);
                    --qi-player-stop-hover-bg: color-mix(in srgb, ${primaryColor} 24%, var(--qi-surface-alt));
                    --qi-player-stop-hover-border: color-mix(in srgb, ${primaryColor} 34%, var(--qi-border));
                    --qi-player-stop-hover-color: color-mix(in srgb, ${primaryColor} 88%, white 12%);
                    --qi-player-btn-shadow: 0 10px 22px rgba(0,0,0,0.28);
                    --qi-player-btn-hover-shadow: 0 14px 30px rgba(0,0,0,0.34);
                    box-sizing: border-box;
                    font-family: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
                    font-size: 13px;
                    line-height: 1.4;
                    color-scheme: dark;
                    color: var(--qi-text);
                    -webkit-text-size-adjust: 100%;
                    text-size-adjust: 100%;
                }
                ${lightSelector} {
                    --qi-surface: #ffffff;
                    --qi-surface-alt: rgba(17, 24, 39, 0.06);
                    --qi-header-bg: rgba(17, 24, 39, 0.03);
                    --qi-actions-bg: rgba(17, 24, 39, 0.03);
                    --qi-border: rgba(17, 24, 39, 0.16);
                    --qi-text: rgba(17, 24, 39, 0.78);
                    --qi-text-strong: rgba(17, 24, 39, 0.85);
                    --qi-text-muted: rgba(17, 24, 39, 0.65);
                    --qi-overlay: rgba(0, 0, 0, 0.32);
                    --qi-hover: rgba(17, 24, 39, 0.08);
                    --qi-error: #b91c1c;
                    --qi-success: #15803d;
                    --qi-warn: #c2410c;
                    --qi-danger-border: rgba(185, 28, 28, 0.35);
                    --qi-icon-btn-bg: rgba(17,24,39,0.08);
                    --qi-icon-btn-hover: rgba(17,24,39,0.14);
                    --qi-icon-btn-border: rgba(17,24,39,0.14);
                    --qi-icon-btn-color: rgba(17,24,39,0.72);
                    --qi-icon-btn-danger-bg: rgba(220,38,38,0.08);
                    --qi-icon-btn-danger-hover: rgba(220,38,38,0.14);
                    --qi-icon-btn-danger-border: rgba(220,38,38,0.2);
                    --qi-icon-btn-danger-color: #b91c1c;
                    --qi-player-stop-bg: color-mix(in srgb, ${primaryColor} 12%, white);
                    --qi-player-stop-border: color-mix(in srgb, ${primaryColor} 22%, var(--qi-border));
                    --qi-player-stop-color: color-mix(in srgb, ${primaryColor} 88%, black 12%);
                    --qi-player-stop-hover-bg: color-mix(in srgb, ${primaryColor} 18%, white);
                    --qi-player-stop-hover-border: color-mix(in srgb, ${primaryColor} 30%, var(--qi-border));
                    --qi-player-stop-hover-color: color-mix(in srgb, ${primaryColor} 92%, black 8%);
                    --qi-player-btn-shadow: 0 10px 22px rgba(15,23,42,0.12);
                    --qi-player-btn-hover-shadow: 0 14px 28px rgba(15,23,42,0.18);
                    color-scheme: light;
                }
                ${hostSelector},
                ${hostSelector} *,
                ${hostSelector} *::before,
                ${hostSelector} *::after {
                    box-sizing: border-box;
                }
                ${hostSelector} button,
                ${hostSelector} input,
                ${hostSelector} textarea,
                ${hostSelector} select {
                    margin: 0;
                    font: inherit;
                    color: inherit;
                    letter-spacing: inherit;
                }
                ${hostSelector} button {
                    -webkit-appearance: none;
                    appearance: none;
                }
                ${hostSelector} .qi-backdrop {
                    position: fixed;
                    inset: 0;
                    background: var(--qi-overlay);
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    padding: 18px;
                    box-sizing: border-box;
                }
                ${hostSelector} .qi-panel {
                    position: fixed;
                    left: 50%;
                    top: 50%;
                    transform: translate(-50%, -50%);
                    width: min(330px, 96vw);
                    max-height: min(86vh, 860px);
                    overflow: hidden;
                    background: var(--qi-surface);
                    color: var(--qi-text-strong);
                    border: 1px solid var(--qi-border);
                    border-radius: 14px;
                    box-shadow: 0 18px 60px rgba(0,0,0,0.55);
                    display: flex;
                    flex-direction: column;
                }
                ${hostSelector} .qi-header {
                    display: flex;
                    align-items: center;
                    justify-content: space-between;
                    gap: 10px;
                    padding: 10px 14px;
                    border-bottom: 1px solid var(--qi-border);
                    background: var(--qi-header-bg);
                    cursor: move;
                    user-select: none;
                    -webkit-user-select: none;
                    touch-action: none;
                }
                ${hostSelector} .qi-title {
                    font-size: 14px;
                    font-weight: 700;
                    letter-spacing: 0.2px;
                    color: var(--qi-text-strong);
                }
                ${hostSelector} .qi-close {
                    position: relative;
                    border: 1px solid transparent;
                    background: transparent;
                    color: var(--qi-text);
                    font-size: 0;
                    line-height: 0;
                    cursor: pointer;
                    width: 32px;
                    height: 32px;
                    padding: 0;
                    display: inline-flex;
                    align-items: center;
                    justify-content: center;
                    flex: 0 0 32px;
                    border-radius: 50%;
                }
                ${hostSelector} .qi-close::before,
                ${hostSelector} .qi-close::after {
                    content: "";
                    position: absolute;
                    top: 50%;
                    left: 50%;
                    width: 14px;
                    height: 2px;
                    background: currentColor;
                    border-radius: 999px;
                    transform-origin: center;
                }
                ${hostSelector} .qi-close::before { transform: translate(-50%, -50%) rotate(45deg); }
                ${hostSelector} .qi-close::after { transform: translate(-50%, -50%) rotate(-45deg); }
                ${hostSelector} .qi-close:hover { background: var(--qi-hover); color: var(--qi-text-strong); }
                ${hostSelector} .qi-tabs {
                    display: flex;
                    gap: 8px;
                    flex: 1;
                    justify-content: center;
                    padding: 0;
                }
                ${hostSelector} .qi-tab {
                    flex: 1;
                    border: 1px solid var(--qi-border);
                    background: var(--qi-surface-alt);
                    color: var(--qi-text);
                    padding: 6px 10px;
                    border-radius: 999px;
                    cursor: pointer;
                    font-size: 12px;
                    font-weight: 650;
                }
                ${hostSelector} .qi-tab:hover { border-color: ${primaryColor}; }
                ${hostSelector} .qi-tab[data-active="1"] {
                    background: ${primaryColor};
                    border-color: ${primaryColor};
                    color: #fff;
                }
                ${hostSelector} .qi-content {
                    flex: 1;
                    display: flex;
                    flex-direction: column;
                    overflow: hidden;
                    min-height: 0;
                }
                ${hostSelector} .qi-tab-panel {
                    flex: 1;
                    display: none;
                    flex-direction: column;
                    overflow: hidden;
                    min-height: 0;
                }
                ${hostSelector} .qi-tab-panel[data-active="1"] { display: flex; }
                ${hostSelector} .qi-actions {
                    padding: 4px 8px 5px;
                    border-top: 1px solid var(--qi-border);
                    background: var(--qi-actions-bg);
                    display: flex;
                    justify-content: flex-end;
                    align-items: center;
                    gap: 7px;
                }
                ${hostSelector} .qi-actions .qi-btn {
                    font-size: 12px;
                    line-height: 1;
                }
                ${hostSelector} .qi-actions .qi-player-btn {
                    width: 38px;
                    height: 38px;
                    min-width: 38px;
                    padding: 0;
                    border-radius: 999px;
                    display: inline-flex;
                    align-items: center;
                    justify-content: center;
                    position: relative;
                    overflow: hidden;
                    box-shadow: var(--qi-player-btn-shadow);
                    transition:
                        transform 160ms ease,
                        box-shadow 160ms ease,
                        background 160ms ease,
                        border-color 160ms ease,
                        color 160ms ease,
                        filter 160ms ease;
                }
                ${hostSelector} .qi-actions .qi-player-btn[hidden] {
                    display: none !important;
                }
                ${hostSelector} .qi-actions .qi-player-btn svg {
                    width: 22px;
                    height: 22px;
                    display: block;
                    pointer-events: none;
                    flex: 0 0 auto;
                    position: relative;
                    z-index: 1;
                }
                ${hostSelector} .qi-actions .qi-player-btn:focus-visible {
                    outline: none;
                    border-color: ${primaryColor};
                    box-shadow: 0 0 0 2px ${primaryColor}33, var(--qi-player-btn-hover-shadow);
                }
                ${hostSelector} .qi-body {
                    padding: 14px;
                    overflow: auto;
                    display: grid;
                    gap: 12px;
                    flex: 1;
                    min-height: 0;
                }
                ${hostSelector} .qi-row {
                    display: grid;
                    grid-template-columns: 110px 1fr;
                    gap: 10px;
                    align-items: center;
                }
                ${hostSelector} .qi-row > label,
                ${hostSelector} .qi-label-stack > label {
                    font-size: 14px;
                    font-weight: 600;
                    line-height: 1.35;
                    color: var(--qi-text-strong);
                    white-space: pre-line;
                }
                ${hostSelector} input[type="text"],
                ${hostSelector} input[type="number"],
                ${hostSelector} textarea,
                ${hostSelector} select {
                    -webkit-appearance: none;
                    -moz-appearance: none;
                    appearance: none;
                    width: 100%;
                    padding: 8px 10px;
                    border-radius: 10px;
                    border: 1px solid var(--qi-border);
                    background: var(--qi-surface-alt);
                    background-clip: padding-box;
                    color: var(--qi-text-strong);
                    outline: none;
                    font-size: 13px;
                    box-shadow: none;
                }
                ${hostSelector} input[type="number"],
                ${hostSelector} .qi-number-input {
                    -webkit-appearance: textfield;
                    -moz-appearance: textfield;
                    appearance: textfield;
                }
                ${hostSelector} input[type="number"]::-webkit-outer-spin-button,
                ${hostSelector} input[type="number"]::-webkit-inner-spin-button,
                ${hostSelector} .qi-number-input::-webkit-outer-spin-button,
                ${hostSelector} .qi-number-input::-webkit-inner-spin-button {
                    -webkit-appearance: none;
                    margin: 0;
                }
                ${hostSelector} .qi-delay-control {
                    display: grid;
                    grid-template-columns: minmax(0, 1fr) auto;
                    gap: 8px;
                    align-items: center;
                }
                ${hostSelector} .qi-select-wrap {
                    position: relative;
                    min-width: 76px;
                    width: auto;
                }
                ${hostSelector} .qi-select-wrap select {
                    display: block;
                    -webkit-appearance: none !important;
                    -moz-appearance: none !important;
                    appearance: none !important;
                    padding-right: 28px;
                    background-image: none !important;
                    width: 100%;
                    min-width: 76px;
                }
                ${hostSelector} .qi-select-wrap select::-ms-expand {
                    display: none;
                }
                ${hostSelector} .qi-select-caret {
                    position: absolute;
                    right: 11px;
                    top: 50%;
                    width: 0;
                    height: 0;
                    transform: translateY(-30%);
                    pointer-events: none;
                    border-left: 4px solid transparent;
                    border-right: 4px solid transparent;
                    border-top: 5px solid currentColor;
                    color: var(--qi-text-strong);
                }
                ${hostSelector} .qi-hotkey-item {
                    position: relative;
                }
                ${hostSelector} .qi-hotkey-item input[type="text"] {
                    padding-right: 34px;
                }
                ${hostSelector} .qi-hotkey-del {
                    position: absolute;
                    top: 50%;
                    right: 6px;
                    width: 20px;
                    height: 20px;
                    margin: 0;
                    padding: 0;
                    box-sizing: border-box;
                    border-radius: 999px;
                    border: 1px solid var(--qi-icon-btn-border);
                    background: var(--qi-icon-btn-bg);
                    color: var(--qi-icon-btn-color);
                    cursor: pointer;
                    display: inline-flex;
                    align-items: center;
                    justify-content: center;
                    font-size: 0;
                    line-height: 0;
                    user-select: none;
                    -webkit-user-select: none;
                    touch-action: manipulation;
                    transform: translateY(-50%);
                }
                ${hostSelector} .qi-hotkey-del::before,
                ${hostSelector} .qi-hotkey-del::after {
                    content: "";
                    position: absolute;
                    top: 50%;
                    left: 50%;
                    width: 12px;
                    height: 2px;
                    background: currentColor;
                    border-radius: 999px;
                    transform-origin: center;
                }
                ${hostSelector} .qi-hotkey-del::before { transform: translate(-50%, -50%) rotate(45deg); }
                ${hostSelector} .qi-hotkey-del::after { transform: translate(-50%, -50%) rotate(-45deg); }
                ${hostSelector} .qi-hotkey-del:hover { background: var(--qi-icon-btn-hover); }
                ${hostSelector} .qi-hotkey-del:disabled { opacity: 0.55; cursor: not-allowed; }
                ${hostSelector} input[type="text"]:focus,
                ${hostSelector} input[type="number"]:focus,
                ${hostSelector} textarea:focus,
                ${hostSelector} select:focus {
                    border-color: ${primaryColor};
                    box-shadow: 0 0 0 1px ${primaryColor};
                }
                ${hostSelector} textarea {
                    min-height: calc(4.05em + 18px);
                    line-height: 1.35;
                    resize: vertical;
                }
                ${hostSelector} .qi-label-stack {
                    display: flex;
                    flex-direction: column;
                    gap: 4px;
                    align-items: flex-start;
                }
                ${hostSelector} .qi-drop {
                    position: relative;
                    border: 1px dashed var(--qi-border);
                    border-radius: 12px;
                    min-height: 88px;
                    padding: 14px 16px;
                    font-size: 12px;
                    line-height: 1.25;
                    color: var(--qi-text);
                    background: var(--qi-surface-alt);
                    cursor: pointer;
                    user-select: none;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    text-align: center;
                    transition:
                        border-color 140ms ease,
                        background 140ms ease,
                        box-shadow 140ms ease,
                        transform 140ms ease,
                        opacity 140ms ease;
                }
                ${hostSelector} .qi-drop:hover,
                ${hostSelector} .qi-drop[data-drag-over="1"] {
                    border-color: ${primaryColor};
                    background: color-mix(in srgb, ${primaryColor} 8%, var(--qi-surface-alt));
                    box-shadow: 0 0 0 1px ${primaryColor}33;
                }
                ${hostSelector} .qi-drop[data-disabled="1"] {
                    opacity: 0.68;
                    cursor: not-allowed;
                }
                ${hostSelector} .qi-drop:focus { outline: none; }
                ${hostSelector} .qi-preview-list {
                    width: 100%;
                    display: none;
                    flex-wrap: wrap;
                    gap: 8px;
                    padding: 0;
                    border-radius: 0;
                    border: 1px solid transparent;
                    background: transparent;
                    transition:
                        border-color 140ms ease,
                        background 140ms ease,
                        box-shadow 140ms ease,
                        opacity 140ms ease;
                }
                ${hostSelector} .qi-preview-list:not(:empty) { display: flex; }
                ${hostSelector} .qi-preview-shell {
                    width: 100%;
                    position: relative;
                    display: grid;
                    gap: 8px;
                    min-width: 0;
                    padding: 0;
                    border-radius: 14px;
                    transition:
                        border-color 140ms ease,
                        background 140ms ease,
                        box-shadow 140ms ease,
                        opacity 140ms ease;
                }
                ${hostSelector} .qi-preview-shell[data-has-items="1"] {
                    padding: 10px;
                    border: 1px solid var(--qi-border);
                    background: var(--qi-surface-alt);
                }
                ${hostSelector} .qi-preview-shell[data-has-items="1"] .qi-drop {
                    min-height: 0;
                    padding: 0 34px 0 0;
                    border: none;
                    border-radius: 0;
                    background: transparent;
                    box-shadow: none;
                    justify-content: flex-start;
                    text-align: left;
                    font-size: 11px;
                    font-weight: 600;
                    line-height: 1.2;
                    color: var(--qi-text-muted);
                }
                ${hostSelector} .qi-preview-shell[data-has-items="1"] .qi-drop:hover,
                ${hostSelector} .qi-preview-shell[data-has-items="1"] .qi-drop[data-drag-over="1"] {
                    background: transparent;
                    box-shadow: none;
                    transform: none;
                    border-color: transparent;
                    color: ${primaryColor};
                }
                ${hostSelector} .qi-preview-shell[data-has-items="1"] .qi-preview-list {
                    cursor: default;
                }
                ${hostSelector} .qi-preview-shell[data-drag-over="1"] {
                    border-color: ${primaryColor};
                    background: color-mix(in srgb, ${primaryColor} 8%, var(--qi-surface-alt));
                    box-shadow: 0 0 0 1px ${primaryColor}33;
                }
                ${hostSelector} .qi-preview-shell[data-has-items="1"][data-drag-over="1"] {
                    border-style: dashed;
                }
                ${hostSelector} .qi-preview-shell[data-has-items="1"][data-drag-over="1"]::after {
                    content: attr(data-drop-hint);
                    position: absolute;
                    inset: 0;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    padding: 16px;

                    border: none;
                    border-radius: inherit;
                    background: color-mix(in srgb, ${primaryColor} 12%, var(--qi-surface-alt));
                    color: ${primaryColor};
                    font-size: 12px;
                    font-weight: 700;
                    line-height: 1.35;
                    text-align: center;
                    letter-spacing: 0.01em;
                    pointer-events: none;
                    z-index: 1;
                }
                ${hostSelector} .qi-preview-shell[data-has-items="1"][data-drag-over="1"] .qi-drop,
                ${hostSelector} .qi-preview-shell[data-has-items="1"][data-drag-over="1"] .qi-preview-list {
                    opacity: 0.3;
                }
                ${hostSelector} .qi-preview-shell[data-disabled="1"] .qi-preview-list {
                    opacity: 0.68;
                    cursor: not-allowed;
                }
                ${hostSelector} .qi-preview-shell[data-disabled="1"] .qi-drop {
                    opacity: 0.68;
                    cursor: not-allowed;
                }
                ${hostSelector} .qi-preview-clear {
                    position: absolute;
                    top: 6px;
                    right: 6px;
                    min-width: 28px;
                    height: 28px;
                    padding: 0;
                    border-radius: 999px;
                    border: 1px solid transparent;
                    background: transparent;
                    cursor: pointer;
                    display: none;
                    align-items: center;
                    justify-content: center;
                    font-size: 15px;
                    line-height: 1;
                    font-family: "Apple Color Emoji", "Segoe UI Emoji", "Noto Color Emoji", sans-serif;
                    user-select: none;
                    -webkit-user-select: none;
                    touch-action: manipulation;
                    z-index: 2;
                    transition:
                        background 120ms ease,
                        border-color 120ms ease,
                        transform 120ms ease;
                }
                ${hostSelector} .qi-preview-shell[data-has-items="1"] .qi-preview-clear { display: inline-flex; }
                ${hostSelector} .qi-preview-clear:hover {
                    background: transparent;
                    border-color: color-mix(in srgb, var(--qi-icon-btn-danger-color) 36%, transparent);
                    transform: scale(1.03);
                }
                ${hostSelector} .qi-preview-clear:disabled { opacity: 0.55; cursor: not-allowed; }
                ${hostSelector} .qi-preview-wrap {
                    position: relative;
                    width: 72px;
                    height: 72px;
                    flex: 0 0 auto;
                }
                ${hostSelector} .qi-preview-item {
                    width: 100%;
                    height: 100%;
                    display: block;
                    object-fit: cover;
                    border-radius: 10px;
                    border: 1px solid var(--qi-border);
                }
                ${hostSelector} .qi-preview-del {
                    position: absolute;
                    top: -4px;
                    right: -4px;
                    width: 20px;
                    height: 20px;
                    padding: 0;
                    border-radius: 999px;
                    border: 1px solid var(--qi-icon-btn-danger-border);
                    background: color-mix(in srgb, var(--qi-icon-btn-danger-bg) 88%, var(--qi-surface) 12%);
                    color: var(--qi-icon-btn-danger-color);
                    cursor: pointer;
                    display: inline-flex;
                    align-items: center;
                    justify-content: center;
                    font-size: 0;
                    line-height: 0;
                    user-select: none;
                    -webkit-user-select: none;
                    touch-action: manipulation;
                    z-index: 2;
                    box-shadow: 0 4px 10px rgba(0,0,0,0.16);
                    backdrop-filter: blur(4px);
                    transition:
                        background 120ms ease,
                        border-color 120ms ease,
                        box-shadow 120ms ease,
                        transform 120ms ease;
                }
                ${hostSelector} .qi-preview-del::before,
                ${hostSelector} .qi-preview-del::after {
                    content: "";
                    position: absolute;
                    top: 50%;
                    left: 50%;
                    width: 10px;
                    height: 2px;
                    background: currentColor;
                    border-radius: 999px;
                    transform-origin: center;
                }
                ${hostSelector} .qi-preview-del::before { transform: translate(-50%, -50%) rotate(45deg); }
                ${hostSelector} .qi-preview-del::after { transform: translate(-50%, -50%) rotate(-45deg); }
                ${hostSelector} .qi-preview-del:hover {
                    background: var(--qi-icon-btn-danger-hover);
                    border-color: color-mix(in srgb, var(--qi-icon-btn-danger-color) 28%, var(--qi-icon-btn-danger-border));
                    box-shadow: 0 6px 14px rgba(0,0,0,0.2);
                    transform: scale(1.03);
                }
                ${hostSelector} .qi-preview-del:disabled { opacity: 0.55; cursor: not-allowed; }
                ${hostSelector} .qi-btn {
                    padding: 8px 14px;
                    border-radius: 10px;
                    border: 1px solid var(--qi-border);
                    background: var(--qi-surface-alt);
                    color: var(--qi-text-strong);
                    cursor: pointer;
                    font-size: 13px;
                    font-weight: 650;
                }
                ${hostSelector} .qi-btn:not(.qi-btn-primary):not(.qi-btn-danger):hover { background: var(--qi-hover); }
                ${hostSelector} .qi-btn-primary {
                    background: ${primaryColor};
                    border-color: ${primaryColor};
                    color: #fff;
                }
                ${hostSelector} .qi-btn-danger {
                    background: var(--qi-icon-btn-danger-bg);
                    border-color: var(--qi-icon-btn-danger-border);
                    color: var(--qi-icon-btn-danger-color);
                }
                ${hostSelector} .qi-actions .qi-player-btn.qi-btn-danger[data-action="stop"] {
                    background: var(--qi-player-stop-bg);
                    border-color: var(--qi-player-stop-border);
                    color: var(--qi-player-stop-color);
                }
                ${hostSelector} .qi-actions .qi-player-btn.qi-btn-danger[data-action="stop"]:not(:disabled):hover {
                    background: var(--qi-player-stop-hover-bg);
                    border-color: var(--qi-player-stop-hover-border);
                    color: var(--qi-player-stop-hover-color);
                }
                ${hostSelector} .qi-actions .qi-player-btn.qi-btn-danger[data-action="stop"]:not(:disabled):focus-visible {
                    background: var(--qi-player-stop-hover-bg);
                    border-color: var(--qi-player-stop-hover-border);
                    color: var(--qi-player-stop-hover-color);
                }
                ${hostSelector} .qi-btn-danger:not(.qi-player-btn):hover { background: var(--qi-icon-btn-danger-hover); }
                ${hostSelector} .qi-btn:disabled { opacity: 0.55; cursor: not-allowed; }
                ${hostSelector} .qi-actions .qi-player-btn:disabled {
                    transform: none;
                    box-shadow: none;
                    filter: none;
                }
                ${hostSelector} .qi-hint {
                    font-size: 12px;
                    font-weight: 500;
                    line-height: 1.4;
                    color: var(--qi-text-muted);
                }
                ${hostSelector} .qi-option-check {
                    display: inline-flex;
                    align-items: center;
                    gap: 8px;
                    font-size: 13px;
                    font-weight: 500;
                    line-height: 1.25;
                    color: var(--qi-text);
                }
                ${hostSelector} .qi-option-check input[type="checkbox"] {
                    width: 16px;
                    height: 16px;
                    margin: 0;
                    flex: 0 0 auto;
                    display: block;
                    vertical-align: middle;
                    accent-color: ${primaryColor};
                }
                ${hostSelector} .qi-option-check span {
                    display: block;
                }
                ${hostSelector} .qi-log {
                    padding: 10px 14px;
                    font-size: 12px;
                    color: var(--qi-text);
                    overflow: auto;
                    flex: 1;
                    min-height: 0;
                    white-space: pre-wrap;
                    line-height: 1.35;
                    display: flex;
                    flex-direction: column;
                    gap: 6px;
                }
                ${hostSelector} .qi-log-line {
                    display: grid;
                    grid-template-columns: max-content minmax(0, 1fr);
                    column-gap: 10px;
                    align-items: start;
                    white-space: normal;
                }
                ${hostSelector} .qi-log-time {
                    white-space: nowrap;
                    font-variant-numeric: tabular-nums;
                }
                ${hostSelector} .qi-log-message {
                    min-width: 0;
                    white-space: pre-wrap;
                    word-break: break-word;
                }
                ${hostSelector} .qi-log-group {
                    margin: 0;
                    border: 1px solid var(--qi-border);
                    border-radius: 12px;
                    background: var(--qi-surface-alt);
                    overflow: hidden;
                }
                ${hostSelector} .qi-log-group.qi-log-group-config {
                    border-color: var(--qi-border);
                    border-color: color-mix(in srgb, ${primaryColor} 32%, var(--qi-border));
                    background: var(--qi-surface-alt);
                    background: color-mix(in srgb, ${primaryColor} 8%, var(--qi-surface-alt));
                }
                ${hostSelector} .qi-log-group.qi-log-group-status-info {
                    border-color: color-mix(in srgb, ${primaryColor} 32%, var(--qi-border));
                    background: color-mix(in srgb, ${primaryColor} 8%, var(--qi-surface-alt));
                }
                ${hostSelector} .qi-log-group.qi-log-group-status-ok {
                    border-color: color-mix(in srgb, var(--qi-success) 32%, var(--qi-border));
                    background: color-mix(in srgb, var(--qi-success) 9%, var(--qi-surface-alt));
                }
                ${hostSelector} .qi-log-group.qi-log-group-status-error {
                    border-color: color-mix(in srgb, var(--qi-error) 30%, var(--qi-border));
                    background: color-mix(in srgb, var(--qi-error) 8%, var(--qi-surface-alt));
                }
                ${hostSelector} .qi-log-group.qi-log-group-status-warn {
                    border-color: color-mix(in srgb, var(--qi-warn) 34%, var(--qi-border));
                    background: color-mix(in srgb, var(--qi-warn) 10%, var(--qi-surface-alt));
                }
                ${hostSelector} .qi-log-group-summary {
                    position: relative;
                    display: flex;
                    align-items: center;
                    gap: 10px;
                    padding: 9px 16px;
                    cursor: pointer;
                    list-style: none;
                    font-weight: 650;
                    color: var(--qi-text-strong);
                    user-select: none;
                    -webkit-user-select: none;
                    transition: background 120ms ease;
                }
                ${hostSelector} .qi-log-group.qi-log-group-config .qi-log-group-summary {
                    color: ${primaryColor};
                }
                ${hostSelector} .qi-log-group.qi-log-group-status-info .qi-log-group-summary {
                    color: ${primaryColor};
                }
                ${hostSelector} .qi-log-group.qi-log-group-status-ok .qi-log-group-summary {
                    color: var(--qi-success);
                }
                ${hostSelector} .qi-log-group.qi-log-group-status-error .qi-log-group-summary {
                    color: var(--qi-error);
                }
                ${hostSelector} .qi-log-group.qi-log-group-status-warn .qi-log-group-summary {
                    color: var(--qi-warn);
                }
                ${hostSelector} .qi-log-group-summary::-webkit-details-marker {
                    display: none;
                }
                ${hostSelector} .qi-log-group-summary:hover {
                    background: var(--qi-hover);
                }
                ${hostSelector} .qi-log-group.qi-log-group-config .qi-log-group-summary:hover {
                    background: var(--qi-hover);
                    background: color-mix(in srgb, ${primaryColor} 10%, var(--qi-hover));
                }
                ${hostSelector} .qi-log-group.qi-log-group-status-info .qi-log-group-summary:hover {
                    background: color-mix(in srgb, ${primaryColor} 10%, var(--qi-hover));
                }
                ${hostSelector} .qi-log-group.qi-log-group-status-ok .qi-log-group-summary:hover {
                    background: color-mix(in srgb, var(--qi-success) 10%, var(--qi-hover));
                }
                ${hostSelector} .qi-log-group.qi-log-group-status-error .qi-log-group-summary:hover {
                    background: color-mix(in srgb, var(--qi-error) 10%, var(--qi-hover));
                }
                ${hostSelector} .qi-log-group.qi-log-group-status-warn .qi-log-group-summary:hover {
                    background: color-mix(in srgb, var(--qi-warn) 12%, var(--qi-hover));
                }
                ${hostSelector} .qi-log-group-time {
                    flex: 0 0 auto;
                    white-space: nowrap;
                    font-variant-numeric: tabular-nums;
                }
                ${hostSelector} .qi-log-group-divider {
                    min-width: 0;
                    flex: 1 1 auto;
                    display: flex;
                    align-items: center;
                    gap: 12px;
                }
                ${hostSelector} .qi-log-group-divider::before,
                ${hostSelector} .qi-log-group-divider::after {
                    content: "";
                    flex: 1 1 0;
                    min-width: 18px;
                    height: 1px;
                    background: currentColor;
                    opacity: 0.42;
                }
                ${hostSelector} .qi-log-group-divider-label {
                    flex: 0 1 auto;
                    min-width: 0;
                    text-align: center;
                    white-space: nowrap;
                    overflow: hidden;
                    text-overflow: ellipsis;
                }
                ${hostSelector} .qi-log-group[open] .qi-log-group-summary {
                    border-bottom: 1px solid var(--qi-border);
                }
                ${hostSelector} .qi-log-group.qi-log-group-config[open] .qi-log-group-summary {
                    border-bottom-color: color-mix(in srgb, ${primaryColor} 28%, var(--qi-border));
                }
                ${hostSelector} .qi-log-group.qi-log-group-status-info[open] .qi-log-group-summary {
                    border-bottom-color: color-mix(in srgb, ${primaryColor} 28%, var(--qi-border));
                }
                ${hostSelector} .qi-log-group.qi-log-group-status-ok[open] .qi-log-group-summary {
                    border-bottom-color: color-mix(in srgb, var(--qi-success) 28%, var(--qi-border));
                }
                ${hostSelector} .qi-log-group.qi-log-group-status-error[open] .qi-log-group-summary {
                    border-bottom-color: color-mix(in srgb, var(--qi-error) 24%, var(--qi-border));
                }
                ${hostSelector} .qi-log-group.qi-log-group-status-warn[open] .qi-log-group-summary {
                    border-bottom-color: color-mix(in srgb, var(--qi-warn) 28%, var(--qi-border));
                }
                ${hostSelector} .qi-log-group-body {
                    padding: 8px 12px 10px 20px;
                    display: flex;
                    flex-direction: column;
                    gap: 4px;
                }
                ${hostSelector} .qi-log-group.qi-log-group-config .qi-log-group-body {
                    padding: 10px 12px 12px 16px;
                    background: var(--qi-surface);
                    background: color-mix(in srgb, ${primaryColor} 4%, var(--qi-surface));
                }
                ${hostSelector} .qi-log-group.qi-log-group-status-info .qi-log-group-body {
                    background: color-mix(in srgb, ${primaryColor} 4%, var(--qi-surface));
                }
                ${hostSelector} .qi-log-group.qi-log-group-status-ok .qi-log-group-body {
                    background: color-mix(in srgb, var(--qi-success) 4%, var(--qi-surface));
                }
                ${hostSelector} .qi-log-group.qi-log-group-status-error .qi-log-group-body {
                    background: color-mix(in srgb, var(--qi-error) 4%, var(--qi-surface));
                }
                ${hostSelector} .qi-log-group.qi-log-group-status-warn .qi-log-group-body {
                    background: color-mix(in srgb, var(--qi-warn) 5%, var(--qi-surface));
                }
                ${hostSelector} .qi-log-group-detail {
                    min-width: 0;
                    white-space: pre-wrap;
                    word-break: break-word;
                    line-height: 1.45;
                    color: var(--qi-text);
                }
                ${hostSelector} .qi-log-group-detail.qi-log-group-detail-rows {
                    display: grid;
                    grid-template-columns: max-content minmax(0, 1fr);
                    align-items: start;
                    justify-items: start;
                    column-gap: 10px;
                    row-gap: 6px;
                    white-space: normal;
                }
                ${hostSelector} .qi-log-group-detail-row {
                    display: contents;
                }
                ${hostSelector} .qi-log-group-detail-label {
                    white-space: nowrap;
                    font-weight: 650;
                    color: var(--qi-text-strong);
                }
                ${hostSelector} .qi-log-group-detail-value {
                    min-width: 0;
                    text-align: left;
                    white-space: pre-wrap;
                    word-break: break-word;
                }
                ${hostSelector} .qi-log-group-detail.qi-error { color: var(--qi-error); }
                ${hostSelector} .qi-log-group-detail.qi-ok { color: var(--qi-success); }
                ${hostSelector} .qi-log-status-card {
                    border-radius: 12px;
                    border: 1px solid var(--qi-border);
                    background: var(--qi-surface-alt);
                    color: var(--qi-text-strong);
                }
                ${hostSelector} .qi-log-status-card:not(.qi-log-status-collapsible) {
                    overflow: hidden;
                }
                ${hostSelector} .qi-log-status-card.qi-log-status-collapsible {
                    overflow: hidden;
                }
                ${hostSelector} .qi-log-status-header,
                ${hostSelector} .qi-log-status-summary {
                    position: relative;
                    display: flex;
                    align-items: center;
                    gap: 10px;
                    padding: 9px 16px;
                    list-style: none;
                    user-select: none;
                    -webkit-user-select: none;
                }
                ${hostSelector} .qi-log-status-summary {
                    cursor: pointer;
                }
                ${hostSelector} .qi-log-status-summary::-webkit-details-marker {
                    display: none;
                }
                ${hostSelector} .qi-log-status-summary::marker {
                    content: "";
                }
                ${hostSelector} .qi-log-status-summary:hover {
                    background: var(--qi-hover);
                }
                ${hostSelector} .qi-log-status-divider {
                    min-width: 0;
                    flex: 1 1 auto;
                    display: flex;
                    align-items: center;
                    gap: 12px;
                }
                ${hostSelector} .qi-log-status-divider::before,
                ${hostSelector} .qi-log-status-divider::after {
                    content: "";
                    flex: 1 1 0;
                    min-width: 18px;
                    height: 1px;
                    background: currentColor;
                    opacity: 0.42;
                }
                ${hostSelector} .qi-log-status-time {
                    flex: 0 0 auto;
                    white-space: nowrap;
                    font-variant-numeric: tabular-nums;
                    font-weight: 700;
                }
                ${hostSelector} .qi-log-status-divider-label {
                    flex: 0 1 auto;
                    min-width: 0;
                    text-align: center;
                    white-space: nowrap;
                    overflow: hidden;
                    text-overflow: ellipsis;
                    font-weight: 650;
                }
                ${hostSelector} .qi-log-status-body {
                    display: block;
                    padding: 0 16px 12px 16px;
                }
                ${hostSelector} .qi-log-status-detail {
                    min-width: 0;
                    white-space: pre-wrap;
                    word-break: break-word;
                    font-weight: 500;
                    color: color-mix(in srgb, currentColor 82%, var(--qi-text));
                }
                ${hostSelector} .qi-log-status-card.qi-log-status-ok {
                    color: var(--qi-success);
                    border-color: color-mix(in srgb, var(--qi-success) 32%, var(--qi-border));
                    background: color-mix(in srgb, var(--qi-success) 9%, var(--qi-surface-alt));
                }
                ${hostSelector} .qi-log-status-card.qi-log-status-error {
                    color: var(--qi-error);
                    border-color: color-mix(in srgb, var(--qi-error) 30%, var(--qi-border));
                    background: color-mix(in srgb, var(--qi-error) 8%, var(--qi-surface-alt));
                }
                ${hostSelector} .qi-log-status-card.qi-log-status-warn {
                    color: var(--qi-warn);
                    border-color: color-mix(in srgb, var(--qi-warn) 34%, var(--qi-border));
                    background: color-mix(in srgb, var(--qi-warn) 10%, var(--qi-surface-alt));
                }
                ${hostSelector} .qi-log-status-card.qi-log-status-ok .qi-log-status-summary:hover {
                    background: color-mix(in srgb, var(--qi-success) 13%, var(--qi-hover));
                }
                ${hostSelector} .qi-log-status-card.qi-log-status-error .qi-log-status-summary:hover {
                    background: color-mix(in srgb, var(--qi-error) 11%, var(--qi-hover));
                }
                ${hostSelector} .qi-log-status-card.qi-log-status-warn .qi-log-status-summary:hover {
                    background: color-mix(in srgb, var(--qi-warn) 14%, var(--qi-hover));
                }
                ${hostSelector} .qi-log .qi-error { color: var(--qi-error); }
                ${hostSelector} .qi-log .qi-ok { color: var(--qi-success); }
                ${hostSelector} .qi-inline {
                    display: inline-flex;
                    gap: 10px;
                    align-items: center;
                    flex-wrap: wrap;
                }
                ${hostSelector} .qi-image-stack {
                    display: grid;
                    gap: 0;
                    width: 100%;
                    min-width: 0;
                }
                `;
            }
