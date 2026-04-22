/* -------------------------------------------------------------------------- *
 * Module 03 · Hotkeys (normalize, capture, display, key-event mapping)
 * -------------------------------------------------------------------------- */

        const HOTKEY_MODIFIER_ORDER = Object.freeze(["CTRL", "SHIFT", "ALT", "CMD"]);
        const HOTKEY_MODIFIER_ALIASES = Object.freeze({
            CTRL: "CTRL",
            CONTROL: "CTRL",
            SHIFT: "SHIFT",
            ALT: "ALT",
            OPTION: "ALT",
            OPT: "ALT",
            CMD: "CMD",
            COMMAND: "CMD",
            META: "CMD",
            WIN: "CMD",
            WINDOWS: "CMD"
        });

        const HOTKEY_MODIFIER_DISPLAY = Object.freeze({
            CTRL: "Ctrl",
            SHIFT: "Shift",
            ALT: "Alt",
            CMD: "Cmd"
        });

        const SHIFTED_SYMBOL_TO_BASE_KEY = Object.freeze({
            "!": "1",
            "@": "2",
            "#": "3",
            "$": "4",
            "%": "5",
            "^": "6",
            "&": "7",
            "*": "8",
            "(": "9",
            ")": "0",
            "_": "-",
            "+": "=",
            "{": "[",
            "}": "]",
            "|": "\\",
            ":": ";",
            "\"": "'",
            "<": ",",
            ">": ".",
            "?": "/",
            "~": "`"
        });

        const HOTKEY_CODE_MAP = {
            'KeyA': { display: 'A', standard: 'A' },
            'KeyB': { display: 'B', standard: 'B' },
            'KeyC': { display: 'C', standard: 'C' },
            'KeyD': { display: 'D', standard: 'D' },
            'KeyE': { display: 'E', standard: 'E' },
            'KeyF': { display: 'F', standard: 'F' },
            'KeyG': { display: 'G', standard: 'G' },
            'KeyH': { display: 'H', standard: 'H' },
            'KeyI': { display: 'I', standard: 'I' },
            'KeyJ': { display: 'J', standard: 'J' },
            'KeyK': { display: 'K', standard: 'K' },
            'KeyL': { display: 'L', standard: 'L' },
            'KeyM': { display: 'M', standard: 'M' },
            'KeyN': { display: 'N', standard: 'N' },
            'KeyO': { display: 'O', standard: 'O' },
            'KeyP': { display: 'P', standard: 'P' },
            'KeyQ': { display: 'Q', standard: 'Q' },
            'KeyR': { display: 'R', standard: 'R' },
            'KeyS': { display: 'S', standard: 'S' },
            'KeyT': { display: 'T', standard: 'T' },
            'KeyU': { display: 'U', standard: 'U' },
            'KeyV': { display: 'V', standard: 'V' },
            'KeyW': { display: 'W', standard: 'W' },
            'KeyX': { display: 'X', standard: 'X' },
            'KeyY': { display: 'Y', standard: 'Y' },
            'KeyZ': { display: 'Z', standard: 'Z' },
            'Digit0': { display: '0', standard: '0' },
            'Digit1': { display: '1', standard: '1' },
            'Digit2': { display: '2', standard: '2' },
            'Digit3': { display: '3', standard: '3' },
            'Digit4': { display: '4', standard: '4' },
            'Digit5': { display: '5', standard: '5' },
            'Digit6': { display: '6', standard: '6' },
            'Digit7': { display: '7', standard: '7' },
            'Digit8': { display: '8', standard: '8' },
            'Digit9': { display: '9', standard: '9' },
            'F1': { display: 'F1', standard: 'F1' },
            'F2': { display: 'F2', standard: 'F2' },
            'F3': { display: 'F3', standard: 'F3' },
            'F4': { display: 'F4', standard: 'F4' },
            'F5': { display: 'F5', standard: 'F5' },
            'F6': { display: 'F6', standard: 'F6' },
            'F7': { display: 'F7', standard: 'F7' },
            'F8': { display: 'F8', standard: 'F8' },
            'F9': { display: 'F9', standard: 'F9' },
            'F10': { display: 'F10', standard: 'F10' },
            'F11': { display: 'F11', standard: 'F11' },
            'F12': { display: 'F12', standard: 'F12' },
            'Space': { display: 'Space', standard: 'SPACE' },
            'Enter': { display: 'Enter', standard: 'ENTER' },
            'Escape': { display: 'Esc', standard: 'ESC' },
            'Backspace': { display: 'Backspace', standard: 'BACKSPACE' },
            'Delete': { display: 'Delete', standard: 'DELETE' },
            'Tab': { display: 'Tab', standard: 'TAB' },
            'Insert': { display: 'Insert', standard: 'INSERT' },
            'Home': { display: 'Home', standard: 'HOME' },
            'End': { display: 'End', standard: 'END' },
            'PageUp': { display: 'Page Up', standard: 'PAGEUP' },
            'PageDown': { display: 'Page Down', standard: 'PAGEDOWN' },
            'ArrowUp': { display: '↑', standard: 'ARROWUP' },
            'ArrowDown': { display: '↓', standard: 'ARROWDOWN' },
            'ArrowLeft': { display: '←', standard: 'ARROWLEFT' },
            'ArrowRight': { display: '→', standard: 'ARROWRIGHT' },
            'Semicolon': { display: ';', standard: ';' },
            'Equal': { display: '=', standard: '=' },
            'Comma': { display: ',', standard: ',' },
            'Minus': { display: '-', standard: '-' },
            'Period': { display: '.', standard: '.' },
            'Slash': { display: '/', standard: '/' },
            'Backquote': { display: '`', standard: '`' },
            'BracketLeft': { display: '[', standard: '[' },
            'Backslash': { display: '\\', standard: '\\' },
            'BracketRight': { display: ']', standard: ']' },
            'Quote': { display: "'", standard: "'" },
            'Numpad0': { display: 'Num 0', standard: 'NUMPAD0' },
            'Numpad1': { display: 'Num 1', standard: 'NUMPAD1' },
            'Numpad2': { display: 'Num 2', standard: 'NUMPAD2' },
            'Numpad3': { display: 'Num 3', standard: 'NUMPAD3' },
            'Numpad4': { display: 'Num 4', standard: 'NUMPAD4' },
            'Numpad5': { display: 'Num 5', standard: 'NUMPAD5' },
            'Numpad6': { display: 'Num 6', standard: 'NUMPAD6' },
            'Numpad7': { display: 'Num 7', standard: 'NUMPAD7' },
            'Numpad8': { display: 'Num 8', standard: 'NUMPAD8' },
            'Numpad9': { display: 'Num 9', standard: 'NUMPAD9' },
            'NumpadAdd': { display: 'Num +', standard: 'NUMPADADD' },
            'NumpadSubtract': { display: 'Num -', standard: 'NUMPADSUBTRACT' },
            'NumpadMultiply': { display: 'Num *', standard: 'NUMPADMULTIPLY' },
            'NumpadDivide': { display: 'Num /', standard: 'NUMPADDIVIDE' },
            'NumpadDecimal': { display: 'Num .', standard: 'NUMPADDECIMAL' },
            'NumpadEnter': { display: 'Num Enter', standard: 'NUMPADENTER' },
        };

        const HOTKEY_STANDARD_DISPLAY_MAP = (() => {
            const map = Object.create(null);
            for (const info of Object.values(HOTKEY_CODE_MAP)) {
                if (!info || !info.standard || !info.display) continue;
                if (!map[info.standard]) map[info.standard] = info.display;
            }
            return Object.freeze(map);
        })();

        const KEY_EVENT_MAP = (() => {
            const map = Object.create(null);
            const add = (standard, key, code) => { map[standard] = { key, code }; };

            for (let charCode = 65; charCode <= 90; charCode++) {
                const letter = String.fromCharCode(charCode);
                add(letter, letter.toLowerCase(), `Key${letter}`);
            }

            for (let digit = 0; digit <= 9; digit++) {
                add(String(digit), String(digit), `Digit${digit}`);
            }

            for (let f = 1; f <= 24; f++) {
                add(`F${f}`, `F${f}`, `F${f}`);
            }

            add('SPACE', ' ', 'Space');
            add('ENTER', 'Enter', 'Enter');
            add('RETURN', 'Enter', 'Enter');
            add('ESC', 'Escape', 'Escape');
            add('ESCAPE', 'Escape', 'Escape');
            add('BACKSPACE', 'Backspace', 'Backspace');
            add('DELETE', 'Delete', 'Delete');
            add('TAB', 'Tab', 'Tab');
            add('INSERT', 'Insert', 'Insert');
            add('HOME', 'Home', 'Home');
            add('END', 'End', 'End');
            add('PAGEUP', 'PageUp', 'PageUp');
            add('PAGEDOWN', 'PageDown', 'PageDown');
            add('ARROWUP', 'ArrowUp', 'ArrowUp');
            add('ARROWDOWN', 'ArrowDown', 'ArrowDown');
            add('ARROWLEFT', 'ArrowLeft', 'ArrowLeft');
            add('ARROWRIGHT', 'ArrowRight', 'ArrowRight');
            add('CAPSLOCK', 'CapsLock', 'CapsLock');
            add('PRINTSCREEN', 'PrintScreen', 'PrintScreen');
            add('SCROLLLOCK', 'ScrollLock', 'ScrollLock');
            add('PAUSE', 'Pause', 'Pause');
            add('CONTEXTMENU', 'ContextMenu', 'ContextMenu');

            add(';', ';', 'Semicolon');
            add('=', '=', 'Equal');
            add(',', ',', 'Comma');
            add('-', '-', 'Minus');
            add('.', '.', 'Period');
            add('/', '/', 'Slash');
            add('`', '`', 'Backquote');
            add('[', '[', 'BracketLeft');
            add('\\', '\\', 'Backslash');
            add(']', ']', 'BracketRight');
            add("'", "'", 'Quote');

            for (let n = 0; n <= 9; n++) {
                add(`NUMPAD${n}`, String(n), `Numpad${n}`);
            }
            add('NUMPADADD', '+', 'NumpadAdd');
            add('NUMPADSUBTRACT', '-', 'NumpadSubtract');
            add('NUMPADMULTIPLY', '*', 'NumpadMultiply');
            add('NUMPADDIVIDE', '/', 'NumpadDivide');
            add('NUMPADDECIMAL', '.', 'NumpadDecimal');
            add('NUMPADENTER', 'Enter', 'NumpadEnter');

            return Object.freeze(map);
        })();

        function normalizeMainKeyToken(rawKey, modifiers) {
            if (!rawKey) return "";
            const token = String(rawKey).toUpperCase();
            if (HOTKEY_MODIFIER_ALIASES[token]) return "";

            let mainKey = token;
            if (mainKey === "ESCAPE") mainKey = "ESC";
            if (mainKey === "SPACEBAR") mainKey = "SPACE";
            if (mainKey === "DEL") mainKey = "DELETE";

            const shiftedBase = SHIFTED_SYMBOL_TO_BASE_KEY[mainKey];
            if (shiftedBase) {
                if (modifiers && typeof modifiers.add === "function") modifiers.add("SHIFT");
                mainKey = shiftedBase;
            }

            return mainKey;
        }

        function normalizeHotkey(hotkeyStr) {
            if (!hotkeyStr || typeof hotkeyStr !== 'string') return "";
            const raw = hotkeyStr.replace(/\s+/g, "");
            if (!raw) return "";

            const parts = raw.split("+").filter(Boolean);
            if (parts.length === 0) return "";

            const modifiers = new Set();
            let mainKey = "";

            for (const part of parts) {
                const token = String(part || "").trim();
                if (!token) continue;
                const upper = token.toUpperCase();
                const mod = HOTKEY_MODIFIER_ALIASES[upper];
                if (mod) {
                    modifiers.add(mod);
                    continue;
                }
                mainKey = upper;
            }

            mainKey = normalizeMainKeyToken(mainKey, modifiers);
            if (!mainKey) return "";

            const orderedMods = [];
            for (const mod of HOTKEY_MODIFIER_ORDER) {
                if (modifiers.has(mod)) orderedMods.push(mod);
            }

            return orderedMods.length ? [...orderedMods, mainKey].join("+") : mainKey;
        }

        function getStandardKeyFromKeyboardEvent(e) {
            if (!e) return "";
            const code = String(e.code || "");
            const fromCode = code ? HOTKEY_CODE_MAP[code] : null;
            if (fromCode && fromCode.standard) return fromCode.standard;

            const keyRaw = String(e.key || "");
            if (!keyRaw) return "";
            if (keyRaw === " ") return "SPACE";

            let key = keyRaw.toUpperCase();
            if (key === "ESCAPE") key = "ESC";
            if (key === "SPACEBAR") key = "SPACE";
            if (key === "DEL") key = "DELETE";

            const shiftedBase = SHIFTED_SYMBOL_TO_BASE_KEY[key];
            if (shiftedBase) key = shiftedBase;
            return key;
        }

        function getHotkeyFromKeyboardEvent(e) {
            if (!e) return "";
            const modifiers = new Set();
            if (e.ctrlKey) modifiers.add("CTRL");
            if (e.shiftKey) modifiers.add("SHIFT");
            if (e.altKey) modifiers.add("ALT");
            if (e.metaKey) modifiers.add("CMD");

            const mainKey = getStandardKeyFromKeyboardEvent(e);
            if (!mainKey) return "";

            const orderedMods = [];
            for (const mod of HOTKEY_MODIFIER_ORDER) {
                if (modifiers.has(mod)) orderedMods.push(mod);
            }

            return orderedMods.length ? [...orderedMods, mainKey].join("+") : mainKey;
        }

        function isAllowedHotkeyMainKey(mainKey) {
            const key = String(mainKey || "");
            if (!key) return false;
            if (key === "SPACE" || key === "ESC" || key === "BACKSPACE" || key === "DELETE") return true;
            if (/^F\d+$/.test(key)) return true;
            if (/^NUMPAD\d$/.test(key)) return true;
            if (["NUMPADADD", "NUMPADSUBTRACT", "NUMPADMULTIPLY", "NUMPADDIVIDE", "NUMPADDECIMAL"].includes(key)) return true;
            if (key.length !== 1) return false;
            return /^[A-Z0-9~!@#$%^&*()_=[\]{}|\\;:'",./<>?-]$/.test(key);
        }

        function isAllowedSimulateMainKey(mainKey) {
            const normalized = normalizeMainKeyToken(String(mainKey || "").toUpperCase(), null);
            if (!normalized) return false;
            return !!KEY_EVENT_MAP[normalized];
        }

        function formatHotkeyModifierToken(token) {
            const upper = String(token || "").toUpperCase();
            const canonical = HOTKEY_MODIFIER_ALIASES[upper] || upper;
            return HOTKEY_MODIFIER_DISPLAY[canonical] || canonical;
        }

        function formatHotkeyMainKeyDisplayToken(token) {
            const normalized = normalizeMainKeyToken(String(token || "").toUpperCase(), null);
            if (!normalized) return "";
            return HOTKEY_STANDARD_DISPLAY_MAP[normalized] || normalized;
        }

        function formatHotkeyForDisplay(hotkeyStr) {
            const norm = normalizeHotkey(hotkeyStr);
            if (!norm) return "";
            const parts = norm.split("+").filter(Boolean);
            return parts
                .map((part) => (HOTKEY_MODIFIER_ALIASES[part] ? formatHotkeyModifierToken(part) : formatHotkeyMainKeyDisplayToken(part)))
                .join(" + ");
        }

        function createHotkeysToolkit() {
            function getKeyEventProps(standardMainKey) {
                const key = String(standardMainKey || "").toUpperCase();
                return KEY_EVENT_MAP[key] || null;
            }

            return Object.freeze({
                normalize: normalizeHotkey,
                fromEvent: getHotkeyFromKeyboardEvent,
                getMainKeyFromEvent: getStandardKeyFromKeyboardEvent,
                isAllowedMainKey: isAllowedHotkeyMainKey,
                isAllowedSimulateMainKey,
                formatForDisplay: formatHotkeyForDisplay,
                formatModifierToken: formatHotkeyModifierToken,
                formatKeyToken: formatHotkeyMainKeyDisplayToken,
                modifierOrder: HOTKEY_MODIFIER_ORDER,
                getKeyEventProps
            });
        }

export { createHotkeysToolkit };
