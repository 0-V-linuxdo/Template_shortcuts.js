/* -------------------------------------------------------------------------- *
 * Site Entry · [Notion AI] 快捷键跳转
 * -------------------------------------------------------------------------- */

(function() {
    'use strict';

    const ShortcutTemplate = window.ShortcutTemplate;

    if (!ShortcutTemplate || typeof ShortcutTemplate.createShortcutEngine !== 'function') {
        console.error('[Notion Shortcut] Template module not found.');
        return;
    }

    const defaultIconURL = 'https://www.notion.so/images/favicon.ico';
    const LOG_TAG = "[Notion Shortcut Script]";
    const NOTION_DEFAULT_SHORTCUTS_STORAGE_KEY = "notion_shortcuts_v1";
    const NOTION_QUICK_INPUT_STORAGE_KEY = "notion_quick_input_v1";
    const NOTION_ORIGIN = "https://app.notion.com";
    const NOTION_LEGACY_ORIGIN = "https://www.notion.so";
    const NOTION_AI_HOME_PATH = "/ai";
    const NOTION_AI_NATIVE_FACE_ICON = `${NOTION_ORIGIN}/_assets/9ade71d75a1c0e93.png`;
    const NOTION_NEW_CHAT_TARGET_TTL_MS = 15000;
    const NOTION_QUICK_INPUT_THEME = Object.freeze({
        dark: {
            surface: "#191919",
            surfaceAlt: "#252525",
            headerBg: "#191919",
            actionsBg: "#191919",
            border: "rgba(255,255,255,0.14)",
            text: "#D4D4D4",
            textStrong: "#F1F1EF",
            textMuted: "#9B9B9B",
            hover: "rgba(255,255,255,0.08)",
            accent: "#F1F1EF",
            accentText: "#191919",
            focusRing: "rgba(241,241,239,0.24)",
            focusRingStrong: "rgba(241,241,239,0.34)",
            success: "#4DAB9A",
            warn: "#FFA344",
            error: "#FF7369"
        },
        light: {
            surface: "#FFFFFF",
            surfaceAlt: "#F7F6F3",
            headerBg: "#FBFBFA",
            actionsBg: "#FBFBFA",
            border: "rgba(55,53,47,0.16)",
            text: "rgba(55,53,47,0.86)",
            textStrong: "#37352F",
            textMuted: "#787774",
            hover: "rgba(55,53,47,0.08)",
            accent: "#37352F",
            accentText: "#FFFFFF",
            focusRing: "rgba(55,53,47,0.22)",
            focusRingStrong: "rgba(55,53,47,0.32)",
            success: "#0F7B6C",
            warn: "#D9730D",
            error: "#E03E3E"
        }
    });
    const LEGACY_NEW_CHAT_SIMULATE_KEYS = "CMD+O";
    const LEGACY_SELECT_AI_MODEL_KEY = "selectAiModel";
    const LEGACY_SELECT_AI_MODEL_SELECTOR = '[data-testid="unified-chat-model-button"][role="button"]';

    function notionNativeIcon(name) {
        return `${NOTION_LEGACY_ORIGIN}/icons/${encodeURIComponent(String(name || "").trim())}_gray.svg`;
    }

    function svgDataUri(svgText) {
        return `data:image/svg+xml,${encodeURIComponent(String(svgText || "").trim())}`;
    }

    const NOTION_NATIVE_ICON_LIGHT_COLOR = "#37352F";
    const NOTION_NATIVE_ICON_DARK_COLOR = "#F1F1EF";

    function decodeSvgDataUri(dataUri) {
        const raw = String(dataUri || "").trim();
        const match = raw.match(/^data:image\/svg\+xml(?:;[^,]*)?,([\s\S]*)$/i);
        if (!match) return "";
        try {
            return decodeURIComponent(match[1] || "");
        } catch {
            return match[1] || "";
        }
    }

    function repaintSvgText(svgText, paintColor) {
        const color = String(paintColor || "").trim() || "currentColor";
        return String(svgText || "").trim()
            .replace(/currentColor/g, color)
            .replace(/\b(fill|stroke)=(["'])(.*?)\2/gi, (match, attr, quote, value) => {
                const token = String(value || "").trim();
                if (!token || /^none$/i.test(token) || /^transparent$/i.test(token) || /^url\s*\(/i.test(token)) return match;
                return `${attr}=${quote}${color}${quote}`;
            })
            .replace(/\b(fill|stroke)\s*:\s*([^;"]+)/gi, (match, attr, value) => {
                const token = String(value || "").trim();
                if (!token || /^none$/i.test(token) || /^transparent$/i.test(token) || /^url\s*\(/i.test(token)) return match;
                return `${attr}:${color}`;
            });
    }

    function repaintSvgIconSource(iconSource, paintColor) {
        const source = String(iconSource || "").trim();
        if (!source) return "";
        const svgText = /^<svg[\s>]/i.test(source) ? source : decodeSvgDataUri(source);
        return svgText ? svgDataUri(repaintSvgText(svgText, paintColor)) : source;
    }

    function notionNativeSvgIconInfo(iconSource) {
        return Object.freeze({
            icon: repaintSvgIconSource(iconSource, NOTION_NATIVE_ICON_LIGHT_COLOR),
            iconDark: repaintSvgIconSource(iconSource, NOTION_NATIVE_ICON_DARK_COLOR),
            iconAdaptive: false
        });
    }

    const NOTION_MODEL_AI_FACE_SVG = "<svg xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"0 0 20 20\" fill=\"currentColor\"><path d=\"M12.758 9.976a1.178 1.178 0 1 0 .377-2.326 1.178 1.178 0 0 0-.377 2.326M6.547 8.97a1.178 1.178 0 1 0 .377-2.327 1.178 1.178 0 0 0-.377 2.326\"/><path d=\"M10.573 5.554a3.917 3.917 0 0 1 6.743.035.625.625 0 1 1-1.08.63 2.667 2.667 0 0 0-4.591-.023l-5.398 9.015 4.192.68a.625.625 0 0 1-.2 1.233l-5.102-.827a.625.625 0 0 1-.436-.938zM4.36 3.517a3.92 3.92 0 0 1 5.572.356.625.625 0 1 1-.945.818 2.67 2.67 0 0 0-3.795-.243.625.625 0 1 1-.833-.931\"/></svg>";
    const NOTION_MODEL_AI_FACE_ICON_INFO = notionNativeSvgIconInfo(NOTION_MODEL_AI_FACE_SVG);
    const NOTION_MODEL_AI_FACE_ICON = NOTION_MODEL_AI_FACE_ICON_INFO.icon;
    const NOTION_MODEL_CLAUDE_ICON = svgDataUri("<svg xmlns=\"http://www.w3.org/2000/svg\" aria-hidden=\"true\" role=\"graphics-symbol\" viewBox=\"0 0 20 20\" style=\"--x-width: 20px; --x-height: 20px; width: 16px; height: 16px;\" class=\"claude x1lliihq x1c4vz4f x2lah0s x1plvlek xryxfnj x5lhr3w x16ye13r x1kihv7h x1heor9g\"><g class=\"logo-light-mode\"><g clip-path=\"url(#clip0_16020_144)\"><path fill=\"#D97757\" d=\"m3.908 13.296 3.945-2.206.066-.192-.066-.106H7.66l-.66-.04-2.254-.061-1.954-.081-1.894-.101-.477-.102-.447-.587.046-.293.4-.268.574.05 1.27.086 1.903.132 1.381.08 2.046.213h.325l.045-.131-.111-.081-.087-.081-1.97-1.33-2.13-1.407-1.117-.81-.604-.41-.305-.384-.132-.84.548-.602.737.05.187.051.747.572 1.594 1.23L7.4 7.173l.305.253.122-.086.015-.06-.137-.228-1.132-2.04L5.365 2.94l-.538-.86-.142-.517a2.5 2.5 0 0 1-.086-.607l.624-.845L5.568 0l.833.111.35.304.518 1.179.837 1.857 1.3 2.524.38.749.204.693.076.213h.132v-.122l.107-1.421.197-1.746.193-2.246.066-.633.315-.759.624-.41.488.233.4.572-.055.37-.239 1.542-.467 2.419-.304 1.619h.178l.203-.203.822-1.087 1.38-1.72.61-.684.71-.753.457-.36h.863l.635.941-.284.972-.889 1.123-.736.951-1.056 1.417-.66 1.133.061.091.158-.015 2.386-.506 1.289-.233 1.538-.263.696.324.076.329-.274.673-1.645.405-1.93.384-2.872.678-.036.025.04.051 1.295.121.553.03h1.356l2.523.188.66.435.396.531-.066.405-1.015.516-1.371-.324-3.198-.759-1.097-.273h-.152v.091l.914.89 1.675 1.508 2.097 1.943.106.48-.269.38-.284-.04-1.843-1.381-.71-.623-1.61-1.35h-.106v.141l.37.541 1.96 2.935.101.9-.142.294-.508.177-.558-.101-1.147-1.604-1.183-1.806-.954-1.62-.117.067-.564 6.046-.264.308-.609.233-.507-.384-.27-.623.27-1.23.324-1.603.264-1.275.239-1.584.142-.526-.01-.035-.117.015-1.198 1.64-1.822 2.453-1.442 1.538-.345.137-.6-.309.057-.551.335-.491 1.995-2.53L8 13.074l.777-.906-.006-.132h-.045l-5.3 3.43-.944.122-.406-.38.05-.622.193-.202 1.594-1.093z\"/></g><defs><clipPath id=\"clip0_16020_144\"><rect width=\"20\" height=\"20\" fill=\"#fff\" rx=\"10\"/></clipPath></defs></g></svg>");
    const NOTION_MODEL_GEMINI_ICON = svgDataUri("<svg xmlns=\"http://www.w3.org/2000/svg\" aria-hidden=\"true\" role=\"graphics-symbol\" viewBox=\"0 0 20 20\" style=\"--x-width: 20px; --x-height: 20px; width: 16px; height: 16px;\" class=\"googleGemini x1lliihq x1c4vz4f x2lah0s x1plvlek xryxfnj x5lhr3w x16ye13r x1kihv7h x1heor9g\"><g class=\"logo-light-mode\"><mask id=\"mask0_16020_459\" width=\"20\" height=\"20\" x=\"0\" y=\"0\" maskUnits=\"userSpaceOnUse\" style=\"mask-type: alpha;\"><path fill=\"url(#paint0_linear_16020_459)\" d=\"M10 0c.21 0 .392.143.443.347q.235.934.617 1.82a12.8 12.8 0 0 0 2.728 4.045 12.85 12.85 0 0 0 5.865 3.345.458.458 0 0 1 0 .886q-.934.235-1.82.617a12.8 12.8 0 0 0-4.045 2.728 12.85 12.85 0 0 0-3.345 5.865.458.458 0 0 1-.886 0 12.84 12.84 0 0 0-3.345-5.865 12.85 12.85 0 0 0-5.865-3.345.458.458 0 0 1 0-.886 12.84 12.84 0 0 0 5.865-3.345A12.84 12.84 0 0 0 9.557.347.46.46 0 0 1 10 0\"/></mask><g mask=\"url(#mask0_16020_459)\"><g filter=\"url(#filter0_f_16020_459)\"><path fill=\"#FFE432\" d=\"M-1.806 15.636c2.311.82 4.967-.718 5.933-3.437C5.092 9.48 4.002 6.61 1.69 5.79s-4.967.718-5.933 3.437c-.965 2.719.125 5.588 2.436 6.409\"/></g><g filter=\"url(#filter1_f_16020_459)\"><path fill=\"#FC413D\" d=\"M8.455 6.672c3.174 0 5.748-2.63 5.748-5.875s-2.574-5.875-5.748-5.875S2.706-2.448 2.706.797 5.28 6.672 8.455 6.672\"/></g><g filter=\"url(#filter2_f_16020_459)\"><path fill=\"#00B95C\" d=\"M6.22 25.46c3.315-.163 5.831-3.775 5.621-8.068s-3.066-7.642-6.38-7.48S-.37 13.686-.16 17.98s3.067 7.642 6.38 7.48\"/></g><g filter=\"url(#filter3_f_16020_459)\"><path fill=\"#00B95C\" d=\"M6.22 25.46c3.315-.163 5.831-3.775 5.621-8.068s-3.066-7.642-6.38-7.48S-.37 13.686-.16 17.98s3.067 7.642 6.38 7.48\"/></g><g filter=\"url(#filter4_f_16020_459)\"><path fill=\"#00B95C\" d=\"M9.54 22.862c2.778-1.69 3.522-5.54 1.66-8.599-1.86-3.059-5.621-4.168-8.4-2.477-2.778 1.69-3.521 5.54-1.66 8.599 1.86 3.058 5.621 4.167 8.4 2.477\"/></g><g filter=\"url(#filter5_f_16020_459)\"><path fill=\"#3186FF\" d=\"M20.77 13.25c3.122 0 5.654-2.438 5.654-5.445S23.892 2.36 20.769 2.36c-3.122 0-5.654 2.438-5.654 5.445s2.532 5.445 5.654 5.445\"/></g><g filter=\"url(#filter6_f_16020_459)\"><path fill=\"#FBBC04\" d=\"M-4.027 12.619c2.876 2.186 7.076 1.5 9.382-1.532s1.845-7.264-1.03-9.45C1.45-.55-2.75.135-5.057 3.167s-1.845 7.264 1.03 9.45\"/></g><g filter=\"url(#filter7_f_16020_459)\"><path fill=\"#3186FF\" d=\"M10.707 15.85c3.432 2.36 7.98 1.703 10.16-1.468 2.18-3.17 1.165-7.653-2.267-10.013S10.619 2.667 8.44 5.838c-2.18 3.17-1.165 7.653 2.267 10.012\"/></g><g filter=\"url(#filter8_f_16020_459)\"><path fill=\"#749BFF\" d=\"M16.946-.72c.873 1.187-.25 3.495-2.506 5.155-2.257 1.66-4.795 2.044-5.668.857s.249-3.496 2.506-5.156 4.794-2.043 5.668-.856\"/></g><g filter=\"url(#filter9_f_16020_459)\"><path fill=\"#FC413D\" d=\"M9.778 4.963c3.49-3.238 4.689-7.622 2.676-9.791S5.98-6.133 2.489-2.895-2.199 4.727-.187 6.896c2.013 2.17 6.474 1.305 9.965-1.933\"/></g><g filter=\"url(#filter10_f_16020_459)\"><path fill=\"#FFEE48\" d=\"M2.623 16.592c2.074 1.485 4.456 1.71 5.32.504s-.119-3.388-2.193-4.873c-2.075-1.485-4.457-1.71-5.32-.504-.864 1.207.118 3.388 2.193 4.873\"/></g></g><defs><filter id=\"filter0_f_16020_459\" width=\"12.099\" height=\"13.314\" x=\"-6.107\" y=\"4.056\" color-interpolation-filters=\"sRGB\" filterUnits=\"userSpaceOnUse\"><feFlood flood-opacity=\"0\" result=\"BackgroundImageFix\"/><feBlend in=\"SourceGraphic\" in2=\"BackgroundImageFix\" result=\"shape\"/><feGaussianBlur result=\"effect1_foregroundBlur_16020_459\" stdDeviation=\"0.757\"/></filter><filter id=\"filter1_f_16020_459\" width=\"26.132\" height=\"26.385\" x=\"-4.611\" y=\"-12.395\" color-interpolation-filters=\"sRGB\" filterUnits=\"userSpaceOnUse\"><feFlood flood-opacity=\"0\" result=\"BackgroundImageFix\"/><feBlend in=\"SourceGraphic\" in2=\"BackgroundImageFix\" result=\"shape\"/><feGaussianBlur result=\"effect1_foregroundBlur_16020_459\" stdDeviation=\"3.659\"/></filter><filter id=\"filter2_f_16020_459\" width=\"24.467\" height=\"28\" x=\"-6.393\" y=\"3.686\" color-interpolation-filters=\"sRGB\" filterUnits=\"userSpaceOnUse\"><feFlood flood-opacity=\"0\" result=\"BackgroundImageFix\"/><feBlend in=\"SourceGraphic\" in2=\"BackgroundImageFix\" result=\"shape\"/><feGaussianBlur result=\"effect1_foregroundBlur_16020_459\" stdDeviation=\"3.11\"/></filter><filter id=\"filter3_f_16020_459\" width=\"24.467\" height=\"28\" x=\"-6.393\" y=\"3.686\" color-interpolation-filters=\"sRGB\" filterUnits=\"userSpaceOnUse\"><feFlood flood-opacity=\"0\" result=\"BackgroundImageFix\"/><feBlend in=\"SourceGraphic\" in2=\"BackgroundImageFix\" result=\"shape\"/><feGaussianBlur result=\"effect1_foregroundBlur_16020_459\" stdDeviation=\"3.11\"/></filter><filter id=\"filter4_f_16020_459\" width=\"24.552\" height=\"25.099\" x=\"-6.106\" y=\"4.774\" color-interpolation-filters=\"sRGB\" filterUnits=\"userSpaceOnUse\"><feFlood flood-opacity=\"0\" result=\"BackgroundImageFix\"/><feBlend in=\"SourceGraphic\" in2=\"BackgroundImageFix\" result=\"shape\"/><feGaussianBlur result=\"effect1_foregroundBlur_16020_459\" stdDeviation=\"3.11\"/></filter><filter id=\"filter5_f_16020_459\" width=\"23.131\" height=\"22.712\" x=\"9.204\" y=\"-3.551\" color-interpolation-filters=\"sRGB\" filterUnits=\"userSpaceOnUse\"><feFlood flood-opacity=\"0\" result=\"BackgroundImageFix\"/><feBlend in=\"SourceGraphic\" in2=\"BackgroundImageFix\" result=\"shape\"/><feGaussianBlur result=\"effect1_foregroundBlur_16020_459\" stdDeviation=\"2.956\"/></filter><filter id=\"filter6_f_16020_459\" width=\"24.063\" height=\"24.255\" x=\"-11.882\" y=\"-5\" color-interpolation-filters=\"sRGB\" filterUnits=\"userSpaceOnUse\"><feFlood flood-opacity=\"0\" result=\"BackgroundImageFix\"/><feBlend in=\"SourceGraphic\" in2=\"BackgroundImageFix\" result=\"shape\"/><feGaussianBlur result=\"effect1_foregroundBlur_16020_459\" stdDeviation=\"2.679\"/></filter><filter id=\"filter7_f_16020_459\" width=\"24.294\" height=\"23.881\" x=\"2.506\" y=\"-1.831\" color-interpolation-filters=\"sRGB\" filterUnits=\"userSpaceOnUse\"><feFlood flood-opacity=\"0\" result=\"BackgroundImageFix\"/><feBlend in=\"SourceGraphic\" in2=\"BackgroundImageFix\" result=\"shape\"/><feGaussianBlur result=\"effect1_foregroundBlur_16020_459\" stdDeviation=\"2.392\"/></filter><filter id=\"filter8_f_16020_459\" width=\"17.329\" height=\"15.954\" x=\"4.194\" y=\"-5.691\" color-interpolation-filters=\"sRGB\" filterUnits=\"userSpaceOnUse\"><feFlood flood-opacity=\"0\" result=\"BackgroundImageFix\"/><feBlend in=\"SourceGraphic\" in2=\"BackgroundImageFix\" result=\"shape\"/><feGaussianBlur result=\"effect1_foregroundBlur_16020_459\" stdDeviation=\"2.141\"/></filter><filter id=\"filter9_f_16020_459\" width=\"21.826\" height=\"21.348\" x=\"-4.779\" y=\"-9.64\" color-interpolation-filters=\"sRGB\" filterUnits=\"userSpaceOnUse\"><feFlood flood-opacity=\"0\" result=\"BackgroundImageFix\"/><feBlend in=\"SourceGraphic\" in2=\"BackgroundImageFix\" result=\"shape\"/><feGaussianBlur result=\"effect1_foregroundBlur_16020_459\" stdDeviation=\"1.808\"/></filter><filter id=\"filter10_f_16020_459\" width=\"17.091\" height=\"15.879\" x=\"-4.359\" y=\"6.468\" color-interpolation-filters=\"sRGB\" filterUnits=\"userSpaceOnUse\"><feFlood flood-opacity=\"0\" result=\"BackgroundImageFix\"/><feBlend in=\"SourceGraphic\" in2=\"BackgroundImageFix\" result=\"shape\"/><feGaussianBlur result=\"effect1_foregroundBlur_16020_459\" stdDeviation=\"2.238\"/></filter><linearGradient id=\"paint0_linear_16020_459\" x1=\"5.685\" x2=\"16.073\" y1=\"13.382\" y2=\"4.624\" gradientUnits=\"userSpaceOnUse\"><stop stop-color=\"#4893FC\"/><stop offset=\"0.27\" stop-color=\"#4893FC\"/><stop offset=\"0.777\" stop-color=\"#969DFF\"/><stop offset=\"1\" stop-color=\"#BD99FE\"/></linearGradient></defs></g></svg>");
    const NOTION_MODEL_OPENAI_ICON = svgDataUri("<svg xmlns=\"http://www.w3.org/2000/svg\" aria-hidden=\"true\" role=\"graphics-symbol\" viewBox=\"0 0 20 20\" style=\"--x-width: 20px; --x-height: 20px; width: 16px; height: 16px;\" class=\"openAi x1lliihq x1c4vz4f x2lah0s x1plvlek xryxfnj x5lhr3w x16ye13r x1kihv7h x1heor9g\"><g class=\"logo-light-mode\"><g clip-path=\"url(#clip0_16020_1032)\"><path fill=\"#000\" d=\"M7.894 7.562V5.86c0-.143.053-.25.179-.322l3.424-1.972c.466-.27 1.022-.395 1.595-.395 2.151 0 3.514 1.668 3.514 3.442 0 .126 0 .269-.018.412l-3.55-2.079a.6.6 0 0 0-.645 0zm7.995 6.633v-4.07a.6.6 0 0 0-.323-.555l-4.5-2.617 1.47-.843a.33.33 0 0 1 .359 0l3.424 1.972c.986.574 1.649 1.792 1.649 2.975 0 1.363-.807 2.618-2.08 3.138M6.836 10.61l-1.47-.86a.34.34 0 0 1-.18-.323V5.483c0-1.918 1.47-3.37 3.46-3.37.754 0 1.452.25 2.044.699L7.16 4.856a.6.6 0 0 0-.323.555zM10 12.438l-2.106-1.183v-2.51L10 7.562l2.106 1.183v2.51zm1.353 5.45a3.36 3.36 0 0 1-2.043-.7l3.531-2.043a.6.6 0 0 0 .323-.556V9.391l1.488.86c.125.072.179.18.179.323v3.943c0 1.918-1.488 3.37-3.478 3.37M7.105 13.89 3.68 11.918c-.986-.573-1.65-1.792-1.65-2.975 0-1.38.825-2.618 2.098-3.137v4.087a.6.6 0 0 0 .323.555l4.481 2.6-1.47.842a.33.33 0 0 1-.358 0m-.197 2.94c-2.026 0-3.514-1.524-3.514-3.406 0-.143.018-.287.036-.43l3.532 2.043a.6.6 0 0 0 .645 0l4.5-2.599v1.703a.34.34 0 0 1-.18.323l-3.424 1.972c-.466.268-1.022.394-1.595.394m4.445 2.133a4.48 4.48 0 0 0 4.392-3.585c2.008-.52 3.299-2.402 3.299-4.32a4.53 4.53 0 0 0-1.506-3.352 5 5 0 0 0 .143-1.13c0-2.563-2.08-4.481-4.481-4.481-.484 0-.95.071-1.416.233a4.5 4.5 0 0 0-3.137-1.29 4.48 4.48 0 0 0-4.392 3.584C2.247 5.142.956 7.024.956 8.942c0 1.255.538 2.474 1.506 3.352a5 5 0 0 0-.143 1.13c0 2.563 2.08 4.481 4.481 4.481.484 0 .95-.071 1.416-.233a4.5 4.5 0 0 0 3.137 1.29\"/></g><defs><clipPath id=\"clip0_16020_1032\"><path fill=\"#fff\" d=\"M1 1h18v18H1z\"/></clipPath></defs></g></svg>");
    const NOTION_MODEL_OPENAI_ICON_INFO = notionNativeSvgIconInfo(NOTION_MODEL_OPENAI_ICON);
    const NOTION_MODEL_GROK_ICON_INFO = notionNativeSvgIconInfo("<svg xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"0 0 240 240\" fill=\"currentColor\"><path d=\"m92.7 152.9 79.78-58.97c3.91-2.9 9.5-1.77 11.37 2.72 9.8 23.69 5.42 52.15-14.1 71.69s-46.67 23.82-71.49 14.06l-27.11 12.57c38.89 26.61 86.11 20.03 115.62-9.53 23.41-23.44 30.66-55.39 23.88-84.2l.06.07c-9.83-42.32 2.42-59.24 27.5-93.83Q239.11 6.25 240 5l-33.01 33.05v-.1L92.67 152.92m-16.44 14.31c-27.92-26.7-23.1-68.01.71-91.84 17.61-17.63 46.47-24.83 71.66-14.25l27.05-12.5a78 78 0 0 0-18.29-10A89.75 89.75 0 0 0 59.84 58.3c-25.33 25.36-33.3 64.36-19.62 97.64 10.22 24.87-6.53 42.46-23.4 60.22-5.99 6.3-11.99 12.59-16.82 19.25l76.2-68.15\"/></svg>");
    const NOTION_MODEL_ICON_DEFAULTS = Object.freeze({
        auto: NOTION_MODEL_AI_FACE_ICON_INFO,
        sonnet46: Object.freeze({ icon: NOTION_MODEL_CLAUDE_ICON, iconAdaptive: false }),
        opus47: Object.freeze({ icon: NOTION_MODEL_CLAUDE_ICON, iconAdaptive: false }),
        opus48: Object.freeze({ icon: NOTION_MODEL_CLAUDE_ICON, iconAdaptive: false }),
        gemini31pro: Object.freeze({ icon: NOTION_MODEL_GEMINI_ICON, iconAdaptive: false }),
        gpt52: NOTION_MODEL_OPENAI_ICON_INFO,
        gpt54: NOTION_MODEL_OPENAI_ICON_INFO,
        gpt55: NOTION_MODEL_OPENAI_ICON_INFO,
        grok43: NOTION_MODEL_GROK_ICON_INFO,
        grokBuild01: NOTION_MODEL_GROK_ICON_INFO,
        kimi26: NOTION_MODEL_AI_FACE_ICON_INFO,
        deepseekV4Pro: NOTION_MODEL_AI_FACE_ICON_INFO
    });

    function getNotionDefaultModelIconInfo(targetId) {
        const key = String(targetId || "").trim();
        return NOTION_MODEL_ICON_DEFAULTS[key] || NOTION_MODEL_ICON_DEFAULTS.auto;
    }

    const NOTION_AI_FALLBACK_ICON = NOTION_AI_NATIVE_FACE_ICON;
    const SEARCH_ICON = notionNativeIcon("search");
    const SETTINGS_ICON = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='currentColor'%3E%3Cpath d='M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8zM12 14a2 2 0 1 1 0-4 2 2 0 0 1 0 4z'/%3E%3Cpath d='M12 1L9 4H6a2 2 0 0 0-2 2v3l-3 3 3 3v3a2 2 0 0 0 2 2h3l3 3 3-3h3a2 2 0 0 0 2-2v-3l3-3-3-3V6a2 2 0 0 0-2-2h-3L12 1z'/%3E%3C/svg%3E";
    const NOTION_NATIVE_MODE_DEFAULT_SVG = "<svg xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"2\" stroke-linecap=\"round\" stroke-linejoin=\"round\"><path d=\"m21.64 3.64-1.28-1.28a1.21 1.21 0 0 0-1.72 0L2.36 18.64a1.21 1.21 0 0 0 0 1.72l1.28 1.28a1.2 1.2 0 0 0 1.72 0L21.64 5.36a1.2 1.2 0 0 0 0-1.72\"/><path d=\"m14 7 3 3\"/><path d=\"M5 6v4\"/><path d=\"M19 14v4\"/><path d=\"M10 2v2\"/><path d=\"M7 8H3\"/><path d=\"M21 16h-4\"/><path d=\"M11 3H9\"/></svg>";
    const NOTION_NATIVE_MODE_ASK_SVG = "<svg xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"2\" stroke-linecap=\"round\" stroke-linejoin=\"round\"><path d=\"M7.9 20A9 9 0 1 0 4 16.1L2 22Z\"/></svg>";
    const NOTION_NATIVE_MODE_PLAN_SVG = "<svg xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"2\" stroke-linecap=\"round\" stroke-linejoin=\"round\"><path d=\"M14.106 5.553a2 2 0 0 0 1.788 0l3.659-1.83A1 1 0 0 1 21 4.619v12.764a1 1 0 0 1-.553.894l-4.553 2.277a2 2 0 0 1-1.788 0l-4.212-2.106a2 2 0 0 0-1.788 0l-3.659 1.83A1 1 0 0 1 3 19.382V6.618a1 1 0 0 1 .553-.894l4.553-2.277a2 2 0 0 1 1.788 0z\"/><path d=\"M15 5.764v15\"/><path d=\"M9 3.236v15\"/></svg>";
    const NOTION_NATIVE_RESEARCH_SVG = "<svg xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"2\" stroke-linecap=\"round\" stroke-linejoin=\"round\"><circle cx=\"6\" cy=\"15\" r=\"4\"/><circle cx=\"18\" cy=\"15\" r=\"4\"/><path d=\"M14 15a2 2 0 0 0-4 0\"/><path d=\"M2.5 13 5 7c.7-1.3 1.4-2 3-2\"/><path d=\"M21.5 13 19 7c-.7-1.3-1.5-2-3-2\"/></svg>";
    const NOTION_NATIVE_PLUS_SVG = "<svg xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"0 0 20 20\" fill=\"currentColor\"><path d=\"M10 3.59a.66.66 0 0 1 .66.66v5.09h5.09a.66.66 0 0 1 0 1.32h-5.09v5.09a.66.66 0 0 1-1.32 0v-5.09H4.25a.66.66 0 0 1 0-1.32h5.09V4.25a.66.66 0 0 1 .66-.66\"/></svg>";
    const NOTION_NATIVE_ATTACH_FILE_SVG = "<svg xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"0 0 20 20\" fill=\"currentColor\"><path d=\"M10.184 3.64A3.475 3.475 0 0 1 15.1 8.554l-5.374 5.374a2.05 2.05 0 1 1-2.9-2.9l2.688-2.686a.625.625 0 0 1 .884.884L7.71 11.913a.8.8 0 0 0 1.13 1.131l5.375-5.374a2.225 2.225 0 1 0-3.147-3.146L5.694 9.898a3.65 3.65 0 1 0 5.162 5.161l4.702-4.702a.625.625 0 0 1 .884.884l-4.702 4.702a4.9 4.9 0 1 1-6.93-6.93z\"/></svg>";
    const NOTION_NATIVE_SETTINGS_SLIDERS_SVG = "<svg xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"0 0 20 20\" fill=\"currentColor\"><path d=\"M3 7.375h6.829a2.501 2.501 0 0 0 4.842 0H17a.625.625 0 1 0 0-1.25h-2.329a2.501 2.501 0 0 0-4.842 0H3a.625.625 0 1 0 0 1.25M12.25 5.5a1.25 1.25 0 1 1 0 2.5 1.25 1.25 0 0 1 0-2.5\"/><path fill-rule=\"evenodd\" d=\"M7.75 15.75a2.5 2.5 0 0 0 2.421-1.875H17a.625.625 0 1 0 0-1.25h-6.829a2.5 2.5 0 0 0-4.842 0H3a.625.625 0 1 0 0 1.25h2.329A2.5 2.5 0 0 0 7.75 15.75m0-1.25a1.25 1.25 0 1 0 0-2.5 1.25 1.25 0 0 0 0 2.5\" clip-rule=\"evenodd\"/></svg>";
    const NOTION_NATIVE_GLOBE_SVG = "<svg xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"0 0 20 20\" fill=\"currentColor\"><path d=\"M10 2.375a7.625 7.625 0 1 1 0 15.25 7.625 7.625 0 0 1 0-15.25m-1.863 8.25c.054 1.559.31 2.937.681 3.943.212.572.449.992.68 1.256.232.266.404.318.502.318s.27-.052.502-.318c.231-.264.468-.684.68-1.256.371-1.006.627-2.384.681-3.943zm-4.48 0a6.38 6.38 0 0 0 4.509 5.48 6.5 6.5 0 0 1-.52-1.104c-.431-1.167-.704-2.697-.76-4.376zm9.456 0c-.055 1.679-.327 3.21-.758 4.376-.15.405-.324.779-.522 1.104a6.38 6.38 0 0 0 4.51-5.48zM8.166 3.894a6.38 6.38 0 0 0-4.51 5.481h3.23c.056-1.679.328-3.21.76-4.376.15-.405.322-.78.52-1.105M10 3.858c-.099 0-.27.053-.502.319-.231.264-.468.683-.68 1.255-.371 1.006-.627 2.384-.681 3.943h3.726c-.054-1.559-.31-2.937-.681-3.943-.212-.572-.449-.99-.68-1.255-.232-.266-.404-.319-.502-.319m1.833.036c.198.326.372.7.521 1.105.432 1.167.704 2.697.76 4.376h3.23a6.38 6.38 0 0 0-4.511-5.481\"/></svg>";
    const NOTION_NATIVE_CREATE_IMAGE_SVG = "<svg xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"0 0 20 20\" fill=\"currentColor\"><path d=\"m16.949 3.47-.618.619-1.164-1.165.625-.624a.823.823 0 0 1 1.157 0 .823.823 0 0 1 0 1.157zm-8.526 8.527 7.153-7.153-1.165-1.165-7.16 7.147a1.1 1.1 0 0 0-.247.414l-.303.978c-.055.206.137.4.33.33l.978-.303a.9.9 0 0 0 .414-.248\"/><path d=\"M9.578 5.438q.617 0 1.197.126l1.051-1.004a6.9 6.9 0 0 0-2.248-.372h-.35a6.603 6.603 0 0 0-6.603 6.602v.257c0 1.254.371 2.48 1.067 3.524a9.25 9.25 0 0 0 5.455 3.844l.514.129a.625.625 0 1 0 .303-1.213l-.513-.128a8 8 0 0 1-4.719-3.325 5.1 5.1 0 0 1-.857-2.831v-.257a5.353 5.353 0 0 1 5.353-5.352z\"/><path d=\"M12.444 15.748a6.47 6.47 0 0 1-5.471-1.878l1.387-.433a5.22 5.22 0 0 0 3.92 1.072l.08-.01a3.37 3.37 0 0 0 2.921-3.345 5.7 5.7 0 0 0-1.011-3.248l.904-.885a6.94 6.94 0 0 1 1.357 4.133 4.624 4.624 0 0 1-4.006 4.584z\"/></svg>";
    const NOTION_NATIVE_DELETE_SVG = "<svg xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"0 0 20 20\" fill=\"currentColor\"><path d=\"M8.806 8.505a.55.55 0 0 0-1.1 0v5.979a.55.55 0 1 0 1.1 0zm3.488 0a.55.55 0 0 0-1.1 0v5.979a.55.55 0 1 0 1.1 0z\"/><path d=\"M6.386 3.925v1.464H3.523a.625.625 0 1 0 0 1.25h.897l.393 8.646A2.425 2.425 0 0 0 7.236 17.6h5.528a2.425 2.425 0 0 0 2.422-2.315l.393-8.646h.898a.625.625 0 1 0 0-1.25h-2.863V3.925c0-.842-.683-1.525-1.525-1.525H7.91c-.842 0-1.524.683-1.524 1.525M7.91 3.65h4.18c.15 0 .274.123.274.275v1.464H7.636V3.925c0-.152.123-.275.274-.275m-.9 2.99h7.318l-.39 8.588a1.175 1.175 0 0 1-1.174 1.122H7.236a1.175 1.175 0 0 1-1.174-1.122l-.39-8.589z\"/></svg>";
    const QUICK_INPUT_ICON_SVG = "<svg xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"2\" stroke-linecap=\"round\" stroke-linejoin=\"round\"><rect x=\"3\" y=\"5\" width=\"18\" height=\"14\" rx=\"2\"/><path d=\"M7 9h.01\"/><path d=\"M11 9h.01\"/><path d=\"M15 9h.01\"/><path d=\"M17 15H7\"/></svg>";
    const MODE_DEFAULT_ICON_INFO = notionNativeSvgIconInfo(NOTION_NATIVE_MODE_DEFAULT_SVG);
    const MODE_ASK_ICON_INFO = notionNativeSvgIconInfo(NOTION_NATIVE_MODE_ASK_SVG);
    const MODE_PLAN_ICON_INFO = notionNativeSvgIconInfo(NOTION_NATIVE_MODE_PLAN_SVG);
    const RESEARCH_ICON_INFO = notionNativeSvgIconInfo(NOTION_NATIVE_RESEARCH_SVG);
    const ADD_CONTEXT_ICON_INFO = notionNativeSvgIconInfo(NOTION_NATIVE_PLUS_SVG);
    const ATTACH_FILE_ICON_INFO = notionNativeSvgIconInfo(NOTION_NATIVE_ATTACH_FILE_SVG);
    const SEARCH_SCOPE_ICON_INFO = notionNativeSvgIconInfo(NOTION_NATIVE_SETTINGS_SLIDERS_SVG);
    const WEB_ACCESS_ICON_INFO = notionNativeSvgIconInfo(NOTION_NATIVE_GLOBE_SVG);
    const IMAGE_GENERATION_ICON_INFO = notionNativeSvgIconInfo(NOTION_NATIVE_CREATE_IMAGE_SVG);
    const QUICK_INPUT_ICON_INFO = notionNativeSvgIconInfo(QUICK_INPUT_ICON_SVG);
    const DELETE_TOPIC_ICON_INFO = notionNativeSvgIconInfo(NOTION_NATIVE_DELETE_SVG);
    const RESEARCH_ICON = RESEARCH_ICON_INFO.icon;
    const ADD_CONTEXT_ICON = ADD_CONTEXT_ICON_INFO.icon;
    const ATTACH_FILE_ICON = ATTACH_FILE_ICON_INFO.icon;
    const NEW_CHAT_ICON = NOTION_MODEL_AI_FACE_ICON;
    const SEARCH_SCOPE_ICON = SEARCH_SCOPE_ICON_INFO.icon;
    const WEB_ACCESS_ICON = WEB_ACCESS_ICON_INFO.icon;
    const IMAGE_GENERATION_ICON = IMAGE_GENERATION_ICON_INFO.icon;
    const QUICK_INPUT_ICON = QUICK_INPUT_ICON_INFO.icon;
    const DELETE_TOPIC_ICON = DELETE_TOPIC_ICON_INFO.icon;
    const NOTION_MODE_ICON_DEFAULTS = Object.freeze({
        default: MODE_DEFAULT_ICON_INFO,
        ask: MODE_ASK_ICON_INFO,
        plan: MODE_PLAN_ICON_INFO,
        research: RESEARCH_ICON_INFO
    });

    function getNotionDefaultModeIconInfo(modeId) {
        const key = String(modeId || "").trim();
        return NOTION_MODE_ICON_DEFAULTS[key] || NOTION_MODE_ICON_DEFAULTS.research;
    }

    const defaultIcons = [
        { name: 'Notion', url: defaultIconURL },
        { name: 'AI Assistant', url: NOTION_AI_FALLBACK_ICON },
        { name: 'Search', url: SEARCH_ICON },
        { name: 'Settings', url: SETTINGS_ICON },
        { name: 'Research', url: RESEARCH_ICON },
        { name: 'Mode Default', url: MODE_DEFAULT_ICON_INFO.icon },
        { name: 'Mode Ask', url: MODE_ASK_ICON_INFO.icon },
        { name: 'Mode Plan', url: MODE_PLAN_ICON_INFO.icon },
        { name: 'Mode Research', url: RESEARCH_ICON },
        { name: 'New Chat', url: NEW_CHAT_ICON },
        { name: 'Search Scope', url: SEARCH_SCOPE_ICON },
        { name: 'Web Access', url: WEB_ACCESS_ICON },
        { name: 'Image Generation', url: IMAGE_GENERATION_ICON },
        { name: 'Quick Input', url: QUICK_INPUT_ICON },
        { name: 'Delete Topic', url: DELETE_TOPIC_ICON },
        { name: 'Google', url: 'https://www.google.com/favicon.ico' },
        { name: 'ChatGPT', url: 'https://chat.openai.com/favicon-32x32.png' },
        { name: 'Claude', url: 'https://claude.ai/favicon.ico' },
        { name: 'GitHub', url: 'https://github.githubassets.com/favicons/favicon.svg' }
    ];

    const protectedIconUrls = [
        defaultIconURL,
        NOTION_AI_NATIVE_FACE_ICON
    ];

    const TemplateUtils = ShortcutTemplate.utils || {};
    const domUtils = TemplateUtils.dom || {};
    const eventUtils = TemplateUtils.events || {};
    const sleep = typeof TemplateUtils.sleep === "function"
        ? TemplateUtils.sleep
        : (ms) => new Promise(resolve => setTimeout(resolve, ms));

    function gmGetValueLocal(key, fallback) {
        if (typeof GM_getValue !== "function") return fallback;
        try {
            const value = GM_getValue(key, fallback);
            if (value && typeof value.then === "function") return fallback;
            return value;
        } catch {
            return fallback;
        }
    }

    function gmSetValueLocal(key, value) {
        if (typeof GM_setValue !== "function") return false;
        try {
            GM_setValue(key, value);
            return true;
        } catch {
            return false;
        }
    }

    function gmRegisterMenuCommandLocal(label, handler) {
        if (typeof GM_registerMenuCommand !== "function") return null;
        try {
            return GM_registerMenuCommand(label, handler);
        } catch {
            return null;
        }
    }

    function gmUnregisterMenuCommandLocal(commandId) {
        if (typeof GM_unregisterMenuCommand !== "function") return;
        try {
            GM_unregisterMenuCommand(commandId);
        } catch { }
    }

    function cloneShortcutItem(value) {
        if (!value || typeof value !== "object" || Array.isArray(value)) return null;
        try {
            if (typeof structuredClone === "function") return structuredClone(value);
        } catch { }
        try {
            return JSON.parse(JSON.stringify(value));
        } catch {
            return { ...value };
        }
    }

    function isPlainObject(value) {
        return !!value && typeof value === "object" && !Array.isArray(value);
    }

    const siteText = (key, fallback) => ({ ctx } = {}) => ctx?.i18n?.t?.(key, {}, fallback) || fallback;

    const NOTION_MODEL_TARGETS = Object.freeze({
        auto: Object.freeze({
            id: "auto",
            label: "Auto",
            hotkey: "CTRL+SHIFT+1",
            labelKey: "shortcuts.modelAuto",
            aliases: Object.freeze(["Auto", "Automatic"])
        }),
        sonnet46: Object.freeze({
            id: "sonnet46",
            label: "Claude Sonnet 4.6",
            menuLabel: "Sonnet 4.6",
            hotkey: "CTRL+SHIFT+2",
            labelKey: "shortcuts.modelSonnet46",
            aliases: Object.freeze(["Sonnet 4.6", "Claude Sonnet 4.6"])
        }),
        opus47: Object.freeze({
            id: "opus47",
            label: "Claude Opus 4.7",
            menuLabel: "Opus 4.7",
            hotkey: "CTRL+SHIFT+3",
            labelKey: "shortcuts.modelOpus47",
            aliases: Object.freeze(["Opus 4.7", "Claude Opus 4.7"])
        }),
        opus48: Object.freeze({
            id: "opus48",
            label: "Claude Opus 4.8",
            menuLabel: "Opus 4.8",
            hotkey: "CTRL+SHIFT+4",
            labelKey: "shortcuts.modelOpus48",
            aliases: Object.freeze(["Opus 4.8", "Claude Opus 4.8", "Opus 4.6", "Claude Opus 4.6"])
        }),
        gemini31pro: Object.freeze({
            id: "gemini31pro",
            label: "Gemini 3.1 Pro",
            hotkey: "CTRL+SHIFT+5",
            labelKey: "shortcuts.modelGemini31Pro",
            aliases: Object.freeze(["Gemini 3.1 Pro", "Gemini Pro", "gemini pro"])
        }),
        gpt52: Object.freeze({
            id: "gpt52",
            label: "GPT-5.2",
            hotkey: "CTRL+SHIFT+6",
            labelKey: "shortcuts.modelGpt52",
            aliases: Object.freeze(["GPT-5.2", "GPT 5.2"])
        }),
        gpt54: Object.freeze({
            id: "gpt54",
            label: "GPT-5.4",
            hotkey: "CTRL+SHIFT+7",
            labelKey: "shortcuts.modelGpt54",
            aliases: Object.freeze(["GPT-5.4", "GPT 5.4"])
        }),
        gpt55: Object.freeze({
            id: "gpt55",
            label: "GPT-5.5",
            hotkey: "CTRL+SHIFT+8",
            labelKey: "shortcuts.modelGpt55",
            aliases: Object.freeze(["GPT-5.5", "GPT 5.5"])
        }),
        grok43: Object.freeze({
            id: "grok43",
            label: "Grok 4.3",
            hotkey: "CTRL+SHIFT+9",
            labelKey: "shortcuts.modelGrok43",
            aliases: Object.freeze(["Grok 4.3", "Grok 43", "grok43", "grok 4.3"])
        }),
        grokBuild01: Object.freeze({
            id: "grokBuild01",
            label: "Grok Build 0.1",
            hotkey: "CTRL+SHIFT+0",
            labelKey: "shortcuts.modelGrokBuild01",
            aliases: Object.freeze(["Grok Build 0.1", "Grok Build 01", "Grok Build", "grokbuild01", "grok build 0.1", "grok build 01", "grok build"])
        }),
        kimi26: Object.freeze({
            id: "kimi26",
            label: "Kimi K2.6",
            hotkey: "CTRL+SHIFT+-",
            labelKey: "shortcuts.modelKimi26",
            aliases: Object.freeze(["Kimi K2.6"])
        }),
        deepseekV4Pro: Object.freeze({
            id: "deepseekV4Pro",
            label: "DeepSeek V4 Pro",
            hotkey: "CTRL+SHIFT+=",
            labelKey: "shortcuts.modelDeepSeekV4Pro",
            aliases: Object.freeze(["DeepSeek V4 Pro", "DeepSeek V4", "deepseek v4 pro"])
        })
    });

    const NOTION_MODEL_TARGET_LIST = Object.freeze(Object.values(NOTION_MODEL_TARGETS));
    const NOTION_MODEL_LEGACY_TARGET_IDS = Object.freeze({
        opus46: "opus48"
    });
    const NOTION_PRE_GROK_MODEL_DEFAULT_HOTKEYS = Object.freeze({
        "model-auto": "CTRL+SHIFT+1",
        "model-sonnet46": "CTRL+SHIFT+2",
        "model-opus48": "CTRL+SHIFT+3",
        "model-opus47": "CTRL+SHIFT+4",
        "model-gemini31pro": "CTRL+SHIFT+5",
        "model-gpt52": "CTRL+SHIFT+6",
        "model-gpt54": "CTRL+SHIFT+7",
        "model-gpt55": "CTRL+SHIFT+8",
        "model-kimi26": "CTRL+SHIFT+9",
        "model-deepseekV4Pro": "CTRL+SHIFT+0"
    });
    const NOTION_MODEL_SHORTCUT_KEYS = Object.freeze(NOTION_MODEL_TARGET_LIST.map(target => `model-${target.id}`));
    const NOTION_MODE_TARGETS = Object.freeze({
        default: Object.freeze({
            id: "default",
            key: "modeDefault",
            label: "Mode: Default",
            labelKey: "shortcuts.modeDefault",
            hotkey: "CTRL+D",
            aliases: Object.freeze(["default", "mode default", "默认"])
        }),
        ask: Object.freeze({
            id: "ask",
            key: "modeAsk",
            label: "Mode: Ask",
            labelKey: "shortcuts.modeAsk",
            hotkey: "CTRL+A",
            aliases: Object.freeze(["ask", "mode ask", "提问", "询问"])
        }),
        plan: Object.freeze({
            id: "plan",
            key: "modePlan",
            label: "Mode: Plan",
            labelKey: "shortcuts.modePlan",
            hotkey: "CTRL+SHIFT+P",
            aliases: Object.freeze(["plan", "mode plan", "计划"])
        }),
        research: Object.freeze({
            id: "research",
            key: "toggleResearchMode",
            label: "Mode: Research",
            labelKey: "shortcuts.modeResearch",
            hotkey: "CTRL+R",
            aliases: Object.freeze(["research", "research mode", "deep research", "mode research", "研究", "深度研究"])
        })
    });
    const NOTION_MODE_TARGET_LIST = Object.freeze(Object.values(NOTION_MODE_TARGETS));
    const NOTION_MODE_SHORTCUT_KEYS = Object.freeze(NOTION_MODE_TARGET_LIST.map(target => target.key));
    const NOTION_MANAGED_MODE_SHORTCUT_KEYS = Object.freeze(
        NOTION_MODE_TARGET_LIST
            .filter(target => target.id !== "research")
            .map(target => target.key)
    );
    const NOTION_MANAGED_DEFAULT_SHORTCUT_KEYS = Object.freeze([
        "newChat",
        LEGACY_SELECT_AI_MODEL_KEY,
        ...NOTION_MODEL_SHORTCUT_KEYS,
        ...NOTION_MANAGED_MODE_SHORTCUT_KEYS,
        "toggleWebAccess",
        "toggleImageGeneration",
        "quickInput",
        "deleteTopic"
    ]);
    const NOTION_NEW_CHAT_TRIGGER_SELECTORS = [
        '[data-testid*="new-chat" i]',
        '[data-testid*="new_chat" i]',
        'button[aria-label*="new chat" i]',
        '[role="button"][aria-label*="new chat" i]',
        'a[aria-label*="new chat" i]',
        "button",
        '[role="button"]',
        "a[href]"
    ].join(", ");
    const NOTION_MODEL_TRIGGER_SELECTORS = [
        LEGACY_SELECT_AI_MODEL_SELECTOR,
        '[data-testid="unified-chat-model-button"]',
        '[data-testid*="model" i]',
        '[aria-label*="model" i]',
        '[aria-label*="模型" i]',
        'button[aria-label*="model" i]',
        'button[aria-label*="模型" i]',
        'button[aria-haspopup="menu"]',
        'button[aria-haspopup="listbox"]',
        '[role="button"][aria-label*="model" i]',
        '[role="button"][aria-label*="模型" i]',
        '[role="button"][aria-haspopup="menu"]',
        '[role="button"][aria-haspopup="listbox"]',
        '[role="combobox"]',
        "button"
    ].join(", ");
    const NOTION_MODEL_MENU_ROOT_SELECTOR = [
        '[role="menu"]',
        '[role="listbox"]',
        '[role="dialog"]',
        '[data-radix-menu-content]',
        '[data-radix-popper-content-wrapper]',
        '[data-radix-portal]',
        '[data-floating-ui-portal]',
        '[data-floating-ui-portal] [role="menu"]'
    ].join(", ");
    const NOTION_MODEL_MENU_ITEM_SELECTOR = [
        '[role="menuitem"]',
        '[role="menuitemradio"]',
        '[role="option"]',
        '[role="button"]',
        '[data-model]',
        '[data-value]',
        "button",
        '[tabindex]:not([tabindex="-1"])'
    ].join(", ");
    const MODEL_MENU_TIMING = Object.freeze({
        pollIntervalMs: 120,
        waitTimeoutMs: 3000,
        openDelayMs: 120
    });
    const NOTION_SETTINGS_TRIGGER_SELECTORS = [
        '[data-testid="unified-chat-search-scope-button"][role="button"]',
        '[data-testid="unified-chat-search-scope-button"]',
        '[data-testid*="search-scope" i]',
        '[data-testid*="settings" i]',
        '[data-testid*="source" i]',
        'button[aria-label*="settings" i]',
        'button[aria-label*="设置" i]',
        'button[aria-label*="web access" i]',
        'button[aria-label*="sources" i]',
        'button[aria-label*="options" i]',
        'button[aria-haspopup="menu"]',
        '[role="button"][aria-haspopup="menu"]',
        "button"
    ].join(", ");
    const NOTION_SETTINGS_MENU_ROOT_SELECTOR = [
        '[role="menu"]',
        '[role="dialog"]',
        '[data-radix-menu-content]',
        '[data-floating-ui-portal] [role="menu"]'
    ].join(", ");
    const NOTION_SETTINGS_MENU_ITEM_SELECTOR = [
        '[role="menuitem"]',
        '[role="menuitemcheckbox"]',
        '[role="switch"]',
        "button",
        '[tabindex]:not([tabindex="-1"])'
    ].join(", ");
    const SETTINGS_MENU_TIMING = Object.freeze({
        pollIntervalMs: 120,
        waitTimeoutMs: 3000,
        openDelayMs: 120
    });
    const NOTION_IMAGE_MODE_CLOSE_SELECTOR = '[data-testid="unified-chat-image-mode-pill-close"]';
    const NOTION_CONTEXT_MENU_TRIGGER_SELECTORS = [
        '[data-testid="unified-chat-plus-menu-button"]',
        '[data-testid*="plus-menu" i]',
        '[role="button"][aria-label*="give context" i]',
        '[role="button"][aria-label*="add context" i]',
        'button[aria-label*="give context" i]',
        'button[aria-label*="add context" i]'
    ].join(", ");
    const NOTION_CONTEXT_MENU_ROOT_SELECTOR = [
        '[role="menu"]',
        '[role="dialog"]',
        '[data-radix-menu-content]',
        '[data-floating-ui-portal]'
    ].join(", ");
    const NOTION_CONTEXT_MENU_ITEM_SELECTOR = '[role="menuitem"]';
    const CONTEXT_MENU_TIMING = Object.freeze({
        pollIntervalMs: 120,
        waitTimeoutMs: 3000,
        openDelayMs: 120
    });
    const NOTION_CONVERSATION_MENU_TARGETS = Object.freeze({
        delete: Object.freeze({
            id: "delete",
            label: "Delete",
            aliases: Object.freeze(["Delete", "删除"])
        })
    });
    const NOTION_CONVERSATION_MENU_TRIGGER_SELECTORS = [
        'button[aria-label*="Delete, rename, and more" i]',
        '[role="button"][aria-label*="Delete, rename, and more" i]',
        'button[aria-label*="delete, rename" i]',
        '[role="button"][aria-label*="delete, rename" i]',
        'button[aria-label*="删除、重命名" i]',
        '[role="button"][aria-label*="删除、重命名" i]',
        'button[aria-label*="删除，重命名" i]',
        '[role="button"][aria-label*="删除，重命名" i]',
        'button[aria-label*="删除" i][aria-label*="重命名" i]',
        '[role="button"][aria-label*="删除" i][aria-label*="重命名" i]',
        'button[aria-label*="more" i][aria-haspopup="menu"]',
        '[role="button"][aria-label*="more" i][aria-haspopup="menu"]',
        'button[aria-label*="更多" i][aria-haspopup="menu"]',
        '[role="button"][aria-label*="更多" i][aria-haspopup="menu"]',
        'button[aria-haspopup="menu"]',
        '[role="button"][aria-haspopup="menu"]'
    ].join(", ");
    const NOTION_CONVERSATION_MENU_ROOT_SELECTOR = [
        '[role="menu"]',
        '[data-radix-menu-content]',
        '[data-floating-ui-portal] [role="menu"]'
    ].join(", ");
    const NOTION_CONVERSATION_MENU_ITEM_SELECTOR = [
        '[role="menuitem"]',
        "button",
        '[tabindex]:not([tabindex="-1"])'
    ].join(", ");
    const CONVERSATION_MENU_TIMING = Object.freeze({
        pollIntervalMs: 120,
        waitTimeoutMs: 3000,
        openDelayMs: 120
    });

    const safeQueryAll = typeof domUtils.safeQuerySelectorAll === "function"
        ? domUtils.safeQuerySelectorAll
        : (root, selector) => {
            const base = root && typeof root.querySelectorAll === "function" ? root : document;
            try { return Array.from(base.querySelectorAll(selector)); } catch { return []; }
        };
    const isVisibleElement = typeof domUtils.isVisible === "function"
        ? domUtils.isVisible
        : (element) => {
            if (!element) return false;
            try {
                return !!(element.offsetWidth || element.offsetHeight || element.getClientRects?.().length);
            } catch {
                return false;
            }
        };
    const simulateClickElement = typeof eventUtils.simulateClick === "function"
        ? eventUtils.simulateClick
        : (element) => {
            try {
                element?.click?.();
                return true;
            } catch {
                return false;
            }
        };

    function getEventConstructor(name) {
        try {
            const view = document?.defaultView || window;
            return view?.[name] || window?.[name] || null;
        } catch {
            return null;
        }
    }

    function simulatePointerSequenceAt(target, x, y) {
        if (!target || typeof target.dispatchEvent !== "function") return false;
        const view = document?.defaultView || window;
        const clientX = Number.isFinite(Number(x)) ? Number(x) : 1;
        const clientY = Number.isFinite(Number(y)) ? Number(y) : 1;
        const common = {
            bubbles: true,
            cancelable: true,
            composed: true,
            view: view || null,
            clientX,
            clientY,
            screenX: clientX,
            screenY: clientY,
            button: 0
        };
        const PointerEventCtor = getEventConstructor("PointerEvent");
        const MouseEventCtor = getEventConstructor("MouseEvent");
        const plans = [
            PointerEventCtor && { ctor: PointerEventCtor, type: "pointerdown", opts: { ...common, buttons: 1, pointerId: 1, pointerType: "mouse", isPrimary: true } },
            MouseEventCtor && { ctor: MouseEventCtor, type: "mousedown", opts: { ...common, buttons: 1 } },
            PointerEventCtor && { ctor: PointerEventCtor, type: "pointerup", opts: { ...common, buttons: 0, pointerId: 1, pointerType: "mouse", isPrimary: true } },
            MouseEventCtor && { ctor: MouseEventCtor, type: "mouseup", opts: { ...common, buttons: 0 } },
            MouseEventCtor && { ctor: MouseEventCtor, type: "click", opts: { ...common, buttons: 0, detail: 1 } }
        ].filter(Boolean);

        let dispatched = false;
        for (const plan of plans) {
            try {
                target.dispatchEvent(new plan.ctor(plan.type, plan.opts));
                dispatched = true;
            } catch { }
        }
        return dispatched;
    }

    function simulatePointerActivationAt(target, x, y) {
        if (!target || typeof target.dispatchEvent !== "function") return false;
        const view = document?.defaultView || window;
        const clientX = Number.isFinite(Number(x)) ? Number(x) : 1;
        const clientY = Number.isFinite(Number(y)) ? Number(y) : 1;
        const common = {
            bubbles: true,
            cancelable: true,
            composed: true,
            view: view || null,
            clientX,
            clientY,
            screenX: clientX,
            screenY: clientY,
            button: 0
        };
        const PointerEventCtor = getEventConstructor("PointerEvent");
        const MouseEventCtor = getEventConstructor("MouseEvent");
        const pointerOpts = { pointerId: 1, pointerType: "mouse", isPrimary: true };
        const plans = [
            PointerEventCtor && { ctor: PointerEventCtor, type: "pointerover", opts: { ...common, ...pointerOpts, buttons: 0 } },
            PointerEventCtor && { ctor: PointerEventCtor, type: "pointerenter", opts: { ...common, ...pointerOpts, buttons: 0 } },
            MouseEventCtor && { ctor: MouseEventCtor, type: "mouseover", opts: { ...common, buttons: 0 } },
            MouseEventCtor && { ctor: MouseEventCtor, type: "mouseenter", opts: { ...common, buttons: 0 } },
            PointerEventCtor && { ctor: PointerEventCtor, type: "pointermove", opts: { ...common, ...pointerOpts, buttons: 0 } },
            MouseEventCtor && { ctor: MouseEventCtor, type: "mousemove", opts: { ...common, buttons: 0 } },
            PointerEventCtor && { ctor: PointerEventCtor, type: "pointerdown", opts: { ...common, ...pointerOpts, buttons: 1 } },
            MouseEventCtor && { ctor: MouseEventCtor, type: "mousedown", opts: { ...common, buttons: 1 } },
            PointerEventCtor && { ctor: PointerEventCtor, type: "pointerup", opts: { ...common, ...pointerOpts, buttons: 0 } },
            MouseEventCtor && { ctor: MouseEventCtor, type: "mouseup", opts: { ...common, buttons: 0 } },
            MouseEventCtor && { ctor: MouseEventCtor, type: "click", opts: { ...common, buttons: 0, detail: 1 } }
        ].filter(Boolean);

        let dispatched = false;
        for (const plan of plans) {
            try {
                target.dispatchEvent(new plan.ctor(plan.type, plan.opts));
                dispatched = true;
            } catch { }
        }
        return dispatched;
    }

    function getElementFromPointSafe(x, y) {
        try {
            return document?.elementFromPoint?.(x, y) || null;
        } catch {
            return null;
        }
    }

    function forceNativeClickElement(element) {
        if (!element || typeof element.click !== "function") return false;
        try {
            element.click();
            return true;
        } catch {
            return false;
        }
    }

    function clickModelElement(element) {
        if (!element || !isVisibleElement(element) || isElementDisabled(element)) return false;
        const rect = getElementRect(element);
        const x = rect ? rect.left + rect.width / 2 : 1;
        const y = rect ? rect.top + rect.height / 2 : 1;
        try { element.focus?.({ preventScroll: true }); } catch {
            try { element.focus?.(); } catch { }
        }

        let clicked = false;
        clicked = simulatePointerActivationAt(element, x, y) || clicked;
        clicked = forceNativeClickElement(element) || clicked;
        clicked = simulateClickElement(element, { nativeFallback: true }) || clicked;
        return clicked;
    }

    function clickElementAtPointForClose(element, menuRoot) {
        if (!element) return false;
        const rect = getElementRect(element);
        const x = rect ? rect.left + rect.width / 2 : 1;
        const y = rect ? rect.top + rect.height / 2 : 1;
        const pointElement = getElementFromPointSafe(x, y);
        const targets = Array.from(new Set([
            getClickableActionElement(pointElement),
            pointElement,
            element
        ].filter(Boolean)));

        let clicked = false;
        for (const target of targets) {
            if (!target || !isVisibleElement(target) || isElementDisabled(target)) continue;
            if (menuRoot?.contains?.(target)) continue;
            try { target.focus?.({ preventScroll: true }); } catch {
                try { target.focus?.(); } catch { }
            }
            clicked = forceNativeClickElement(target) || clicked;
            if (!clicked) clicked = simulatePointerSequenceAt(target, x, y) || clicked;
            if (!clicked) clicked = simulateClickElement(target, { nativeFallback: true }) || clicked;
            if (clicked) return true;
        }
        return clicked;
    }

    function normalizeNotionText(value) {
        return String(value ?? "").replace(/\s+/g, " ").trim().toLowerCase();
    }

    function normalizeNotionTargetKey(value) {
        return normalizeNotionText(value).replace(/[^a-z0-9]+/g, "");
    }

    function getElementText(element) {
        if (!element) return "";
        const aria = element.getAttribute?.("aria-label");
        if (aria && String(aria).trim()) return String(aria);
        const title = element.getAttribute?.("title");
        if (title && String(title).trim()) return String(title);
        try {
            return String(element.textContent || "");
        } catch {
            return "";
        }
    }

    function normalizeHotkeyToken(value) {
        return String(value || "").replace(/\s+/g, "").toUpperCase();
    }

    function getElementRect(element) {
        try {
            const rect = element?.getBoundingClientRect?.();
            if (!rect) return null;
            return {
                top: Number(rect.top || 0),
                right: Number(rect.right || 0),
                bottom: Number(rect.bottom || 0),
                left: Number(rect.left || 0),
                width: Math.max(0, Number(rect.width || 0)),
                height: Math.max(0, Number(rect.height || 0))
            };
        } catch {
            return null;
        }
    }

    function getViewportSize() {
        return {
            width: Number(window?.innerWidth || document?.documentElement?.clientWidth || 0),
            height: Number(window?.innerHeight || document?.documentElement?.clientHeight || 0)
        };
    }

    function isLikelyMainComposerRect(rect) {
        if (!rect || rect.width < 280 || rect.height < 40 || rect.height > 280) return false;
        const viewport = getViewportSize();
        if (viewport.width > 0 && rect.right < viewport.width * 0.35) return false;
        if (viewport.height > 0 && rect.bottom < viewport.height * 0.28) return false;
        return true;
    }

    function isLikelyComposerToolbarControl(element, rootRect = null) {
        const rect = getElementRect(element);
        if (!rect || rect.width < 10 || rect.height < 10 || rect.width > 140 || rect.height > 76) return false;

        if (rootRect) {
            if (!isLikelyMainComposerRect(rootRect)) return false;
            const inToolbarY = rect.top >= rootRect.top - 10 && rect.bottom <= rootRect.bottom + 10;
            const nearLeftControls = rect.left >= rootRect.left - 4 &&
                rect.left <= rootRect.left + Math.min(220, Math.max(112, rootRect.width * 0.4));
            return inToolbarY && nearLeftControls;
        }

        const viewport = getViewportSize();
        const minLeft = viewport.width > 0 ? Math.max(240, viewport.width * 0.24) : 240;
        const maxRight = viewport.width > 0 ? viewport.width - Math.max(24, viewport.width * 0.03) : Number.POSITIVE_INFINITY;
        const minTop = viewport.height > 0 ? Math.max(120, viewport.height * 0.28) : 120;
        const maxBottom = viewport.height > 0 ? viewport.height - 16 : Number.POSITIVE_INFINITY;
        return rect.left >= minLeft && rect.right <= maxRight && rect.top >= minTop && rect.bottom <= maxBottom;
    }

    function getElementSearchText(element) {
        if (!element) return "";
        return [
            getElementText(element),
            element.getAttribute?.("aria-label"),
            element.getAttribute?.("title"),
            element.getAttribute?.("data-testid")
        ].filter(Boolean).join(" ");
    }

    function isInsideShortcutUi(element) {
        return !!element?.closest?.([
            "#notion-settings-overlay",
            "#notion-settings-panel",
            "#notion-edit-overlay",
            "#notion-edit-form",
            "#notion-quick-input-overlay"
        ].join(", "));
    }

    function isElementDisabled(element) {
        if (!element) return true;
        if (element.disabled === true) return true;
        const ariaDisabled = String(element.getAttribute?.("aria-disabled") || "").toLowerCase();
        if (ariaDisabled === "true") return true;
        try {
            if (typeof element.matches === "function" && element.matches(":disabled")) return true;
        } catch { }
        return false;
    }

    function getClickableActionElement(element, root = null) {
        let node = element;
        while (node && node.nodeType === 1) {
            if (root && node === root) break;
            if (!isElementDisabled(node)) {
                const tag = String(node.tagName || "").toLowerCase();
                const role = String(node.getAttribute?.("role") || "").toLowerCase();
                const tabIndex = String(node.getAttribute?.("tabindex") || "").trim();
                if (
                    tag === "button" ||
                    tag === "a" ||
                    role === "button" ||
                    role === "menuitem" ||
                    role === "menuitemradio" ||
                    role === "option" ||
                    role === "switch" ||
                    role === "checkbox" ||
                    role === "menuitemcheckbox" ||
                    (tabIndex && tabIndex !== "-1") ||
                    typeof node.onclick === "function"
                ) {
                    return node;
                }
            }
            node = node.parentElement || null;
        }
        return element && !isElementDisabled(element) ? element : null;
    }

    function getTargetComparableLabels(target) {
        if (!target) return [];
        const labels = [target.menuLabel, target.label, ...(target.aliases || [])]
            .map(normalizeNotionText)
            .filter(Boolean);
        return Array.from(new Set(labels));
    }

    function textLooksLikeTarget(text, target) {
        const normalized = normalizeNotionText(text);
        if (!normalized || !target) return false;
        const labels = getTargetComparableLabels(target);
        if (labels.some(label => normalized === label || normalized.includes(label))) return true;

        if (target.id === "gemini31pro") return normalized.includes("gemini") && normalized.includes("pro");
        if (target.id === "opus48") return normalized.includes("opus") && normalized.includes("4.8");
        if (target.id === "opus47") return normalized.includes("opus") && normalized.includes("4.7");
        if (target.id === "sonnet46") return normalized.includes("sonnet") && normalized.includes("4.6");
        if (target.id === "grok43") return normalized.includes("grok") && normalized.includes("4.3");
        if (target.id === "grokBuild01") return normalized.includes("grok") && normalized.includes("build") && normalized.includes("0.1");
        if (target.id === "deepseekV4Pro") return normalized.includes("deepseek") && normalized.includes("v4") && normalized.includes("pro");
        if (target.id === "kimi26") return normalized.includes("kimi") && normalized.includes("k2.6");
        return false;
    }

    function inferModelTargetFromText(value) {
        const text = normalizeNotionText(value);
        const key = normalizeNotionTargetKey(value);
        if (!text && !key) return null;

        for (const target of NOTION_MODEL_TARGET_LIST) {
            if (key === normalizeNotionTargetKey(target.id)) return target;
            if (key === normalizeNotionTargetKey(target.label)) return target;
            if (target.menuLabel && key === normalizeNotionTargetKey(target.menuLabel)) return target;
            if ((target.aliases || []).some(alias => key === normalizeNotionTargetKey(alias))) return target;
        }

        const legacyTargetId = NOTION_MODEL_LEGACY_TARGET_IDS[key];
        if (legacyTargetId && NOTION_MODEL_TARGETS[legacyTargetId]) return NOTION_MODEL_TARGETS[legacyTargetId];

        if (text.includes("gemini") && text.includes("pro")) return NOTION_MODEL_TARGETS.gemini31pro;
        if (text.includes("opus") && text.includes("4.6")) return NOTION_MODEL_TARGETS.opus48;
        if (text.includes("opus") && text.includes("4.8")) return NOTION_MODEL_TARGETS.opus48;
        if (text.includes("opus") && text.includes("4.7")) return NOTION_MODEL_TARGETS.opus47;
        if (text.includes("claude") && text.includes("opus")) return NOTION_MODEL_TARGETS.opus47;
        if (text === "opus") return NOTION_MODEL_TARGETS.opus47;
        if (text.includes("sonnet") && text.includes("4.6")) return NOTION_MODEL_TARGETS.sonnet46;
        if (text.includes("gpt") && text.includes("5.2")) return NOTION_MODEL_TARGETS.gpt52;
        if (text.includes("gpt") && text.includes("5.4")) return NOTION_MODEL_TARGETS.gpt54;
        if (text.includes("gpt") && text.includes("5.5")) return NOTION_MODEL_TARGETS.gpt55;
        if (text.includes("grok") && text.includes("build") && text.includes("0.1")) return NOTION_MODEL_TARGETS.grokBuild01;
        if (text.includes("grok") && text.includes("build")) return NOTION_MODEL_TARGETS.grokBuild01;
        if (text.includes("grok") && text.includes("4.3")) return NOTION_MODEL_TARGETS.grok43;
        if (text.includes("kimi") && text.includes("k2.6")) return NOTION_MODEL_TARGETS.kimi26;
        if (text.includes("deepseek") && text.includes("v4") && text.includes("pro")) return NOTION_MODEL_TARGETS.deepseekV4Pro;
        return null;
    }

    function getModeTargetComparableLabels(target) {
        if (!target) return [];
        const labels = [target.label, ...(target.aliases || [])]
            .map(normalizeNotionText)
            .filter(Boolean);
        return Array.from(new Set(labels));
    }

    function inferModeTargetFromText(value) {
        const text = normalizeNotionText(value);
        const key = normalizeNotionTargetKey(value);
        if (!text && !key) return null;

        for (const target of NOTION_MODE_TARGET_LIST) {
            if (key === normalizeNotionTargetKey(target.id)) return target;
            if (key === normalizeNotionTargetKey(target.key)) return target;
            if (key === normalizeNotionTargetKey(target.label)) return target;
            if ((target.aliases || []).some(alias => key === normalizeNotionTargetKey(alias))) return target;
        }

        if (text.includes("answers only") || text.includes("won't make edits")) return NOTION_MODE_TARGETS.ask;
        if (text.includes("plans first") || text.includes("approval")) return NOTION_MODE_TARGETS.plan;
        if (text.includes("think deeper") || text.includes("thorough analysis")) return NOTION_MODE_TARGETS.research;
        if (text.includes("can search") && text.includes("edit")) return NOTION_MODE_TARGETS.default;
        if (text === "默认" || text.includes("默认模式")) return NOTION_MODE_TARGETS.default;
        if (text.includes("提问") || text.includes("只回答")) return NOTION_MODE_TARGETS.ask;
        if (text.includes("计划") || text.includes("审批")) return NOTION_MODE_TARGETS.plan;
        if (text.includes("研究") || text.includes("深度")) return NOTION_MODE_TARGETS.research;
        return null;
    }

    function getModeTargetByShortcutKey(key) {
        const normalized = String(key || "").trim();
        return NOTION_MODE_TARGET_LIST.find(target => target.key === normalized) || null;
    }

    function textLooksLikeNewChat(value) {
        const text = normalizeNotionText(value);
        return !!text && (
            text.includes("new chat") ||
            text.includes("new conversation") ||
            text.includes("new thread") ||
            text.includes("新建聊天") ||
            text.includes("新对话") ||
            text.includes("开启新话题")
        );
    }

    function scoreNewChatTriggerCandidate(element) {
        if (!element || !isVisibleElement(element) || isInsideShortcutUi(element) || isElementDisabled(element)) return -1;

        const text = getElementText(element);
        const dataTestId = String(element.getAttribute?.("data-testid") || "").toLowerCase();
        const ariaLabel = String(element.getAttribute?.("aria-label") || "");
        const title = String(element.getAttribute?.("title") || "");
        const role = String(element.getAttribute?.("role") || "").toLowerCase();
        const tag = String(element.tagName || "").toLowerCase();
        const combinedText = [text, ariaLabel, title].join(" ");

        let score = 0;
        if (dataTestId.includes("new-chat") || dataTestId.includes("new_chat")) score += 900;
        if (textLooksLikeNewChat(ariaLabel)) score += 620;
        if (textLooksLikeNewChat(title)) score += 520;
        if (textLooksLikeNewChat(text)) score += 480;
        if (/^\s*new chat\b/i.test(combinedText)) score += 120;
        if (combinedText.includes("⌘") || normalizeNotionText(combinedText).includes("cmd")) score += 70;
        if (tag === "button" || role === "button") score += 80;

        const rect = getElementRect(element);
        const viewportHeight = Number(window?.innerHeight || document?.documentElement?.clientHeight || 0);
        if (rect && viewportHeight > 0 && rect.bottom > viewportHeight * 0.55) score += 40;

        return score > 0 ? score : -1;
    }

    function findNewChatTriggerElement() {
        const candidates = [];
        const seen = new Set();
        for (const element of safeQueryAll(document, NOTION_NEW_CHAT_TRIGGER_SELECTORS)) {
            if (!element || seen.has(element)) continue;
            seen.add(element);
            const score = scoreNewChatTriggerCandidate(element);
            if (score < 0) continue;
            const rect = getElementRect(element);
            candidates.push({
                element,
                score,
                bottom: rect ? rect.bottom : 0,
                area: rect ? rect.width * rect.height : Number.MAX_SAFE_INTEGER
            });
        }
        candidates.sort((a, b) => {
            if (b.score !== a.score) return b.score - a.score;
            if (b.bottom !== a.bottom) return b.bottom - a.bottom;
            return a.area - b.area;
        });
        return getClickableActionElement(candidates[0]?.element || null);
    }

    async function triggerNewChatAction() {
        const trigger = findNewChatTriggerElement();
        if (!trigger) return false;
        return simulateClickElement(trigger, { nativeFallback: true });
    }

    function textLooksLikeConversationMenuTrigger(value) {
        const text = normalizeNotionText(value);
        const key = normalizeNotionTargetKey(value);
        if (!text && !key) return false;
        if (key.includes("deleterenameandmore") || key.includes("deleterename")) return true;
        if (text.includes("delete, rename") || text.includes("delete rename")) return true;
        if (text.includes("delete") && text.includes("rename") && text.includes("more")) return true;
        if (text.includes("删除") && text.includes("重命名") && (text.includes("更多") || text.includes("及更多") || text.includes("more"))) return true;
        return false;
    }

    function scoreConversationMenuTriggerCandidate(element) {
        if (!element || !isVisibleElement(element)) return -1;
        if (isInsideShortcutUi(element) || isElementDisabled(element)) return -1;
        if (element.closest?.(NOTION_CONVERSATION_MENU_ROOT_SELECTOR)) return -1;

        const searchText = getElementSearchText(element);
        if (!textLooksLikeConversationMenuTrigger(searchText)) return -1;

        const rect = getElementRect(element);
        const viewport = getViewportSize();
        const role = String(element.getAttribute?.("role") || "").toLowerCase();
        const tag = String(element.tagName || "").toLowerCase();
        const hasMenu = String(element.getAttribute?.("aria-haspopup") || "").toLowerCase() === "menu";

        let score = 0;
        if (normalizeNotionText(searchText).includes("delete, rename")) score += 1000;
        if (hasMenu) score += 120;
        if (tag === "button" || role === "button") score += 80;

        if (rect && viewport.width > 0 && viewport.height > 0) {
            const topLimit = Math.max(72, viewport.height * 0.16);
            const isTopRight = rect.top <= topLimit && rect.right >= viewport.width * 0.58;
            const isMainHeader = rect.top <= Math.max(96, viewport.height * 0.2) && rect.left >= viewport.width * 0.35;
            const isSidebar = rect.right <= viewport.width * 0.38;
            if (isTopRight) score += 900;
            if (isMainHeader) score += 520;
            if (isSidebar) score += 80;
            score += Math.max(0, Math.round(rect.right / 20));
        }

        return score > 0 ? score : -1;
    }

    function findConversationMenuTriggerElement() {
        const candidates = [];
        const seen = new Set();
        for (const element of safeQueryAll(document, NOTION_CONVERSATION_MENU_TRIGGER_SELECTORS)) {
            if (!element || seen.has(element)) continue;
            seen.add(element);
            const score = scoreConversationMenuTriggerCandidate(element);
            if (score < 0) continue;
            const rect = getElementRect(element);
            candidates.push({
                element,
                score,
                top: rect ? rect.top : Number.MAX_SAFE_INTEGER,
                right: rect ? rect.right : 0
            });
        }
        candidates.sort((a, b) => {
            if (b.score !== a.score) return b.score - a.score;
            if (a.top !== b.top) return a.top - b.top;
            return b.right - a.right;
        });
        return getClickableActionElement(candidates[0]?.element || null);
    }

    function scoreConversationMenuRoot(root) {
        if (!root || !isVisibleElement(root) || isInsideShortcutUi(root)) return -1;
        const text = normalizeNotionText(getElementText(root));
        if (!text) return -1;

        let score = 0;
        if (text.includes("delete") || text.includes("删除")) score += 260;
        if (text.includes("rename") || text.includes("重命名")) score += 180;
        if (text.includes("last updated") || text.includes("最后更新")) score += 40;

        const role = String(root.getAttribute?.("role") || "").toLowerCase();
        if (role === "menu") score += 120;
        return score >= 260 ? score : -1;
    }

    function findConversationMenuRoot(triggerEl = null) {
        if (triggerEl) {
            const controlsId = String(triggerEl.getAttribute?.("aria-controls") || "").trim();
            if (controlsId) {
                const controlled = document.getElementById(controlsId);
                if (scoreConversationMenuRoot(controlled) > 0) return controlled;
            }
        }

        const candidates = safeQueryAll(document, NOTION_CONVERSATION_MENU_ROOT_SELECTOR)
            .map(element => ({ element, score: scoreConversationMenuRoot(element), rect: getElementRect(element) }))
            .filter(item => item.score > 0);
        if (candidates.length === 0) return null;
        candidates.sort((a, b) => {
            if (b.score !== a.score) return b.score - a.score;
            return (b.rect?.right || 0) - (a.rect?.right || 0);
        });
        return candidates[0]?.element || null;
    }

    async function ensureConversationMenuOpen(triggerEl, { timeoutMs = CONVERSATION_MENU_TIMING.waitTimeoutMs, intervalMs = CONVERSATION_MENU_TIMING.pollIntervalMs } = {}) {
        const existing = findConversationMenuRoot(triggerEl);
        if (existing) return existing;
        if (!triggerEl) return null;
        if (!simulateClickElement(triggerEl, { nativeFallback: true })) return null;
        if (CONVERSATION_MENU_TIMING.openDelayMs > 0) await sleep(CONVERSATION_MENU_TIMING.openDelayMs);

        const deadline = Date.now() + Math.max(0, Number(timeoutMs) || 0);
        while (Date.now() <= deadline) {
            const root = findConversationMenuRoot(triggerEl);
            if (root) return root;
            await sleep(Math.max(30, Number(intervalMs) || 30));
        }
        return findConversationMenuRoot(triggerEl);
    }

    function resolveConversationMenuTarget(value) {
        const text = normalizeNotionText(value);
        const key = normalizeNotionTargetKey(value);
        if (!text && !key) return null;
        if (
            key === "delete" ||
            key === "remove" ||
            key === "deletetopic" ||
            text === "删除" ||
            text.includes("删除话题")
        ) {
            return NOTION_CONVERSATION_MENU_TARGETS.delete;
        }
        return null;
    }

    function getConversationMenuSpec(shortcut) {
        const data = getShortcutDataObject(shortcut);
        const rawMenu = data.menu;
        const menu = isPlainObject(rawMenu)
            ? rawMenu
            : (rawMenu !== undefined ? { textMatch: rawMenu } : data);

        const rawTextMatch = menu.keyword !== undefined ? menu.keyword : menu.textMatch;
        const path = Array.isArray(menu.path) ? menu.path.map(item => String(item ?? "").trim()).filter(Boolean) : [];
        const pathLast = path.length ? path[path.length - 1] : "";
        const target = resolveConversationMenuTarget(menu.id ?? rawTextMatch ?? pathLast ?? rawMenu ?? shortcut?.name);
        const textMatch = target ? null : (rawTextMatch ?? pathLast);
        const waitForItem = menu.waitForItem !== undefined ? !!menu.waitForItem : true;

        if (!target && !textMatch) {
            console.warn(`${LOG_TAG} conversationMenu: missing target; set data.menu = { id: "delete" } or plain text like "Delete".`);
            return null;
        }

        return { target, textMatch, waitForItem };
    }

    function menuItemTextExactlyMatches(element, values) {
        const labels = Array.isArray(values) ? values : [values];
        const targets = labels.map(normalizeNotionText).filter(Boolean);
        if (targets.length === 0) return false;

        const candidates = [
            getElementText(element),
            element?.getAttribute?.("aria-label"),
            element?.getAttribute?.("title"),
            element?.textContent
        ].map(normalizeNotionText).filter(Boolean);

        return candidates.some(text => targets.some(target => text === target));
    }

    function conversationMenuItemMatches(element, spec) {
        if (!element || !spec) return false;
        if (spec.target) {
            return menuItemTextExactlyMatches(element, [spec.target.label, ...(spec.target.aliases || [])]);
        }
        return menuItemTextExactlyMatches(element, spec.textMatch);
    }

    function findConversationMenuItem(root, spec) {
        if (!root || !spec) return null;
        const candidates = [];
        const seen = new Set();
        for (const element of safeQueryAll(root, NOTION_CONVERSATION_MENU_ITEM_SELECTOR)) {
            if (!element || seen.has(element) || !isVisibleElement(element)) continue;
            seen.add(element);
            candidates.push(element);
        }
        for (const element of candidates) {
            if (conversationMenuItemMatches(element, spec)) return getClickableMenuItem(element, root);
        }

        const fallbackCandidates = safeQueryAll(root, "div, span, button")
            .filter(element => element && !seen.has(element) && isVisibleElement(element));
        for (const element of fallbackCandidates) {
            if (conversationMenuItemMatches(element, spec)) return getClickableMenuItem(element, root);
        }
        return null;
    }

    function shouldSyncDeleteTopicIcon(shortcut, spec) {
        if (getNotionDefaultShortcutKey(shortcut) === "deleteTopic") return true;
        const targetLabels = spec?.target ? [spec.target.label, ...(spec.target.aliases || [])] : [];
        const labels = targetLabels.map(normalizeNotionText).filter(Boolean);
        return labels.includes("delete") || labels.includes("删除");
    }

    async function clickConversationMenuItem({ shortcut, engine } = {}) {
        const spec = getConversationMenuSpec(shortcut);
        if (!spec) return false;

        const trigger = findConversationMenuTriggerElement();
        if (!trigger) {
            console.warn(`${LOG_TAG} conversationMenu: top/right conversation menu trigger not found.`);
            return false;
        }

        const menuRoot = await ensureConversationMenuOpen(trigger);
        if (!menuRoot) {
            console.warn(`${LOG_TAG} conversationMenu: menu root not found after opening trigger.`);
            return false;
        }

        const deadline = Date.now() + CONVERSATION_MENU_TIMING.waitTimeoutMs;
        do {
            const currentRoot = findConversationMenuRoot(trigger) || menuRoot;
            const target = findConversationMenuItem(currentRoot, spec);
            if (target) {
                if (shouldSyncDeleteTopicIcon(shortcut, spec)) {
                    syncNotionDeleteTopicShortcutIconFromElement(engine, target);
                }
                if (simulateClickElement(target, { nativeFallback: true })) return true;
            }
            if (!spec.waitForItem || Date.now() >= deadline) break;
            await sleep(CONVERSATION_MENU_TIMING.pollIntervalMs);
        } while (true);

        console.warn(`${LOG_TAG} conversationMenu: target menu item not found.`);
        return false;
    }

    function textLooksLikeCustomAgentSettings(value) {
        const text = normalizeNotionText(value);
        if (!text) return false;
        const agentContext = text.includes("agent") || text.includes("代理");
        const directSettingsHints = (
            text.includes("agent settings") ||
            text.includes("when should this agent run") ||
            text.includes("what can the agent use") ||
            text.includes("tools and access") ||
            text.includes("trusted urls") ||
            text.includes("run agent") ||
            text.includes("agent instructions")
        );
        if (directSettingsHints) return true;
        if (text.includes("custom agent") && (
            text.includes("instructions") ||
            text.includes("knowledge") ||
            text.includes("tools and access") ||
            text.includes("trusted urls") ||
            text.includes("triggers")
        )) return true;
        return agentContext && (
            text.includes("instructions") ||
            text.includes("knowledge") ||
            text.includes("sources") ||
            text.includes("tools") ||
            text.includes("access") ||
            text.includes("triggers") ||
            text.includes("设置")
        );
    }

    function isInsideCustomAgentSettingsSurface(element) {
        if (!element) return false;
        let node = element;
        while (node && node.nodeType === 1 && node !== document.body) {
            const rect = getElementRect(node);
            const viewport = getViewportSize();
            const role = String(node.getAttribute?.("role") || "").toLowerCase();
            const dataTestId = String(node.getAttribute?.("data-testid") || "").toLowerCase();
            const panelSized = rect &&
                rect.width >= 320 &&
                rect.height >= 160 &&
                (!viewport.width || rect.width <= viewport.width * 0.82) &&
                (!viewport.height || rect.height <= viewport.height * 0.96);
            const surfaceLike = role === "dialog" ||
                role === "region" ||
                dataTestId.includes("side-peek") ||
                dataTestId.includes("side_peek") ||
                dataTestId.includes("agent") ||
                panelSized;
            if (surfaceLike && textLooksLikeCustomAgentSettings([getElementSearchText(node), node.textContent || ""].join(" "))) return true;
            node = node.parentElement || null;
        }
        return false;
    }

    function isModelTriggerNearMainComposer(element, composerRoot = null, composerRect = null) {
        if (!element) return false;
        if (composerRoot?.contains?.(element)) return true;
        const rect = getElementRect(element);
        if (!rect || !composerRect || !isLikelyMainComposerRect(composerRect)) return false;
        const inComposerY = rect.top >= composerRect.top - 12 && rect.bottom <= composerRect.bottom + 12;
        const inComposerX = rect.left >= composerRect.left - 12 && rect.right <= composerRect.right + 12;
        const controlSized = rect.width >= 24 && rect.width <= 180 && rect.height >= 20 && rect.height <= 76;
        return inComposerY && inComposerX && controlSized;
    }

    function scoreModelTriggerCandidate(element, { composerRoot = null, composerRect = null } = {}) {
        if (!element || !isVisibleElement(element)) return -1;
        if (element.closest?.(NOTION_MODEL_MENU_ROOT_SELECTOR)) return -1;
        if (isInsideShortcutUi(element) || isElementDisabled(element)) return -1;
        if (isInsideCustomAgentSettingsSurface(element)) return -1;

        const text = getElementText(element);
        const normalizedText = normalizeNotionText(text);
        const dataTestId = String(element.getAttribute?.("data-testid") || "").toLowerCase();
        const ariaLabel = String(element.getAttribute?.("aria-label") || "");
        const title = String(element.getAttribute?.("title") || "");
        const hasMenu = String(element.getAttribute?.("aria-haspopup") || "").toLowerCase() === "menu";
        const hasListbox = String(element.getAttribute?.("aria-haspopup") || "").toLowerCase() === "listbox";
        const nearMainComposer = isModelTriggerNearMainComposer(element, composerRoot, composerRect);

        let score = 0;
        if (nearMainComposer) score += 900;
        if (composerRoot && !nearMainComposer) score -= 420;
        if (dataTestId === "unified-chat-model-button") score += 1000;
        if (dataTestId.includes("model")) score += 500;
        if (/\bmodel\b|模型/i.test(ariaLabel)) score += 420;
        if (/\bmodel\b|模型/i.test(title)) score += 320;
        if (NOTION_MODEL_TARGET_LIST.some(target => textLooksLikeTarget(text, target))) score += 360;
        if (hasMenu || hasListbox) score += 80;
        if (normalizedText === "auto" || textLooksLikeTarget(text, NOTION_MODEL_TARGETS.auto)) score += 80;
        return score > 0 ? score : -1;
    }

    function textLooksLikeWebAccess(value) {
        const text = normalizeNotionText(value);
        return !!text && (
            text.includes("web access") ||
            text.includes("internet access") ||
            text.includes("联网") ||
            text.includes("网络访问")
        );
    }

    function textLooksLikeComposerPrompt(value) {
        const text = normalizeNotionText(value);
        return !!text && (
            text.includes("do anything with ai") ||
            text.includes("ask anything") ||
            text.includes("what can i help") ||
            text.includes("what should i help") ||
            text.includes("prompt") ||
            text.includes("message") ||
            text.includes("send a message") ||
            text.includes("提问") ||
            text.includes("输入") ||
            text.includes("问我")
        );
    }

    function getComposerCandidateText(element) {
        if (!element) return "";
        return [
            element.getAttribute?.("placeholder"),
            element.getAttribute?.("aria-placeholder"),
            element.getAttribute?.("data-placeholder"),
            getElementText(element)
        ].filter(Boolean).join(" ");
    }

    function findComposerRootElement() {
        const candidates = [];
        const seen = new Set();
        const selector = [
            "textarea",
            '[contenteditable="true"]',
            '[role="textbox"]',
            '[data-placeholder]',
            '[aria-placeholder]',
            "form",
            "div"
        ].join(", ");
        for (const element of safeQueryAll(document, selector)) {
            if (!element || seen.has(element) || !isVisibleElement(element)) continue;
            seen.add(element);
            if (!textLooksLikeComposerPrompt(getComposerCandidateText(element))) continue;

            let node = element;
            let best = element;
            while (node && node.nodeType === 1 && node !== document.body) {
                const rect = getElementRect(node);
                if (rect && rect.width >= 320 && rect.height >= 44 && rect.height <= 260) {
                    best = node;
                }
                node = node.parentElement || null;
            }
            const rect = getElementRect(best);
            const viewportHeight = Number(window?.innerHeight || document?.documentElement?.clientHeight || 0);
            candidates.push({
                element: best,
                bottom: rect ? rect.bottom : 0,
                score: rect && viewportHeight > 0 && rect.bottom > viewportHeight * 0.55 ? 80 : 0
            });
        }

        candidates.sort((a, b) => {
            if (b.score !== a.score) return b.score - a.score;
            return b.bottom - a.bottom;
        });
        return candidates[0]?.element || null;
    }

    function findComposerSettingsTriggerElement() {
        const labelledTrigger = findComposerSettingsTriggerByLabel();
        if (labelledTrigger) return labelledTrigger;

        const root = findComposerRootElement();
        const rootRect = getElementRect(root);
        if (!root || !rootRect || !isLikelyMainComposerRect(rootRect)) return null;

        const buttons = safeQueryAll(root, 'button, [role="button"]')
            .filter(element => element && isVisibleElement(element) && !isElementDisabled(element))
            .map(element => ({ element, rect: getElementRect(element) }))
            .filter(({ rect }) => {
                if (!rect) return false;
                const smallEnough = rect.width <= 96 && rect.height <= 64;
                const inToolbarY = rect.top >= rootRect.top - 8 && rect.bottom <= rootRect.bottom + 8;
                const nearLeftControls = rect.left <= rootRect.left + Math.min(180, Math.max(96, rootRect.width * 0.22));
                return smallEnough && inToolbarY && nearLeftControls && isLikelyComposerToolbarControl({ getBoundingClientRect: () => rect }, rootRect);
            })
            .sort((a, b) => {
                if (a.rect.left !== b.rect.left) return a.rect.left - b.rect.left;
                return a.rect.top - b.rect.top;
            });

        if (buttons.length >= 2) return getClickableActionElement(buttons[1].element, root);
        return null;
    }

    function findComposerSettingsTriggerByLabel() {
        const candidates = [];
        const seen = new Set();
        for (const element of safeQueryAll(document, 'button, [role="button"]')) {
            if (!element || seen.has(element)) continue;
            seen.add(element);
            if (!isVisibleElement(element) || isInsideShortcutUi(element) || isElementDisabled(element)) continue;
            if (element.closest?.(NOTION_SETTINGS_MENU_ROOT_SELECTOR)) continue;
            if (!isLikelyComposerToolbarControl(element)) continue;

            const normalized = normalizeNotionText(getElementSearchText(element));
            if (!normalized || normalized.includes("personalization") || normalized.includes("personalize")) continue;
            if (!(/\bsettings?\b|\boptions?\b|设置/i.test(normalized))) continue;

            const rect = getElementRect(element);
            const exactSettings = normalized === "settings" || normalized === "setting" || normalized === "设置";
            const score = (exactSettings ? 700 : 420) + (rect ? rect.bottom : 0);
            candidates.push({ element: getClickableActionElement(element), score, rect });
        }
        candidates.sort((a, b) => {
            if (b.score !== a.score) return b.score - a.score;
            return (a.rect?.left || 0) - (b.rect?.left || 0);
        });
        return candidates[0]?.element || null;
    }

    function scoreSettingsTriggerCandidate(element) {
        if (!element || !isVisibleElement(element)) return -1;
        if (element.closest?.(NOTION_SETTINGS_MENU_ROOT_SELECTOR)) return -1;
        if (isInsideShortcutUi(element) || isElementDisabled(element)) return -1;
        if (!isLikelyComposerToolbarControl(element)) return -1;

        const text = getElementText(element);
        const dataTestId = String(element.getAttribute?.("data-testid") || "").toLowerCase();
        const ariaLabel = String(element.getAttribute?.("aria-label") || "");
        const title = String(element.getAttribute?.("title") || "");
        const hasMenu = String(element.getAttribute?.("aria-haspopup") || "").toLowerCase() === "menu";

        let score = 0;
        let explicit = false;
        if (dataTestId === "unified-chat-search-scope-button") score += 1000;
        if (dataTestId === "unified-chat-search-scope-button") explicit = true;
        if (dataTestId.includes("search") || dataTestId.includes("scope") || dataTestId.includes("setting") || dataTestId.includes("source")) {
            score += 420;
            explicit = true;
        }
        if (/\bsettings?\b|\boptions?\b|\bsources?\b|设置/i.test(ariaLabel)) {
            score += 520;
            explicit = true;
        }
        if (/\bsettings?\b|\boptions?\b|\bsources?\b|设置/i.test(title)) {
            score += 420;
            explicit = true;
        }
        if (/\bsettings?\b|\boptions?\b|\bsources?\b|设置/i.test(text)) {
            score += 260;
            explicit = true;
        }
        if (textLooksLikeWebAccess(text) || textLooksLikeWebAccess(ariaLabel) || textLooksLikeWebAccess(title)) {
            score += 300;
            explicit = true;
        }
        if (explicit && hasMenu) score += 80;
        return explicit && score > 0 ? score : -1;
    }

    function findSettingsTriggerElement() {
        const candidates = [];
        const seen = new Set();
        const composerSettingsTrigger = findComposerSettingsTriggerElement();
        if (composerSettingsTrigger) return composerSettingsTrigger;

        for (const element of safeQueryAll(document, NOTION_SETTINGS_TRIGGER_SELECTORS)) {
            if (!element || seen.has(element)) continue;
            seen.add(element);
            const score = scoreSettingsTriggerCandidate(element);
            if (score < 0) continue;
            let bottom = 0;
            try { bottom = Number(element.getBoundingClientRect?.().bottom || 0); } catch { }
            candidates.push({ element, score, bottom });
        }
        candidates.sort((a, b) => {
            if (b.score !== a.score) return b.score - a.score;
            return b.bottom - a.bottom;
        });
        return candidates[0]?.element || findComposerSettingsTriggerElement();
    }

    function scoreSettingsMenuRoot(root) {
        if (!root || !isVisibleElement(root)) return -1;
        const text = getElementText(root);
        const normalized = normalizeNotionText(text);
        let score = 0;
        if (textLooksLikeWebAccess(text)) score += 240;
        if (normalized.includes("my sources")) score += 80;
        if (normalized.includes("add sources")) score += 80;
        if (normalized.includes("personalize")) score += 60;
        if (normalized.includes("mode")) score += 40;
        if (normalized.includes("default") && normalized.includes("ask") && normalized.includes("plan")) score += 220;
        if (normalized.includes("answers only") || normalized.includes("plans first") || normalized.includes("think deeper")) score += 100;
        return score >= 160 ? score : -1;
    }

    function findSettingsMenuRoot(triggerEl = null) {
        if (triggerEl) {
            const controlsId = String(triggerEl.getAttribute?.("aria-controls") || "").trim();
            if (controlsId) {
                const controlled = document.getElementById(controlsId);
                if (scoreSettingsMenuRoot(controlled) > 0) return controlled;
            }
        }

        const candidates = safeQueryAll(document, NOTION_SETTINGS_MENU_ROOT_SELECTOR)
            .map(element => ({ element, score: scoreSettingsMenuRoot(element) }))
            .filter(item => item.score > 0);
        if (candidates.length === 0) return null;
        candidates.sort((a, b) => b.score - a.score);
        return candidates[0]?.element || null;
    }

    async function ensureSettingsMenuOpen(triggerEl, { timeoutMs = SETTINGS_MENU_TIMING.waitTimeoutMs, intervalMs = SETTINGS_MENU_TIMING.pollIntervalMs } = {}) {
        const existing = findSettingsMenuRoot(triggerEl);
        if (existing) return existing;
        if (!triggerEl) return null;
        if (!simulateClickElement(triggerEl, { nativeFallback: true })) return null;
        if (SETTINGS_MENU_TIMING.openDelayMs > 0) await sleep(SETTINGS_MENU_TIMING.openDelayMs);

        const deadline = Date.now() + Math.max(0, Number(timeoutMs) || 0);
        while (Date.now() <= deadline) {
            const root = findSettingsMenuRoot(triggerEl);
            if (root) return root;
            await sleep(intervalMs);
        }
        return findSettingsMenuRoot(triggerEl);
    }

    function findWebAccessMenuItem(root) {
        if (!root) return null;
        const candidates = [];
        const seen = new Set();
        for (const element of safeQueryAll(root, NOTION_SETTINGS_MENU_ITEM_SELECTOR)) {
            if (!element || seen.has(element) || !isVisibleElement(element)) continue;
            seen.add(element);
            if (textLooksLikeWebAccess(getElementText(element))) candidates.push(getSettingsMenuRow(element, root));
        }
        for (const element of safeQueryAll(root, "div, span, button")) {
            if (!element || seen.has(element) || !isVisibleElement(element)) continue;
            seen.add(element);
            if (textLooksLikeWebAccess(getElementText(element))) candidates.push(getSettingsMenuRow(element, root));
        }
        const unique = Array.from(new Set(candidates.filter(Boolean)));
        if (unique.length === 0) return null;
        unique.sort((a, b) => {
            const aHasToggle = !!findExplicitWebAccessToggleTarget(a);
            const bHasToggle = !!findExplicitWebAccessToggleTarget(b);
            if (aHasToggle !== bHasToggle) return bHasToggle - aHasToggle;
            const aText = normalizeNotionText(getElementText(a));
            const bText = normalizeNotionText(getElementText(b));
            if (aText === "web access" && bText !== "web access") return 1;
            if (bText === "web access" && aText !== "web access") return -1;
            const aArea = getElementArea(a);
            const bArea = getElementArea(b);
            if (aArea !== bArea) return aArea - bArea;
            return aText.length - bText.length;
        });
        return unique[0] || null;
    }

    function getElementArea(element) {
        try {
            const rect = element.getBoundingClientRect?.();
            return Math.max(0, Number(rect?.width || 0)) * Math.max(0, Number(rect?.height || 0));
        } catch {
            return Number.MAX_SAFE_INTEGER;
        }
    }

    function getSettingsMenuRow(element, root) {
        if (!element) return null;
        const rootArea = getElementArea(root);
        const rootRect = getElementRect(root);
        let bestWithToggle = null;
        let bestRowLike = null;
        let row = element;
        let node = element;
        while (node && node.nodeType === 1) {
            if (root && node !== root && !root.contains?.(node)) break;
            if (!textLooksLikeWebAccess(getElementText(node))) {
                node = node.parentElement || null;
                continue;
            }
            const area = getElementArea(node);
            if (rootArea > 0 && area >= rootArea * 0.85) break;
            if (findExplicitWebAccessToggleTarget(node)) {
                bestWithToggle = node;
                break;
            }
            const rect = getElementRect(node);
            if (rect && rootRect) {
                const rowLike = rect.height >= 28 &&
                    rect.height <= 88 &&
                    rect.width >= Math.min(180, rootRect.width * 0.45);
                if (rowLike) bestRowLike = node;
            }
            row = node;
            node = node.parentElement || null;
        }
        return bestWithToggle || bestRowLike || row;
    }

    function textLooksLikeResearchModeMenuItem(value) {
        const text = normalizeNotionText(value);
        return !!text && (
            text === "research" ||
            text === "research mode" ||
            text === "deep research" ||
            text.startsWith("research ") ||
            text.includes("research mode") ||
            text.includes("deep research") ||
            text.includes("think deeper") ||
            text.includes("thorough analysis") ||
            text.includes("research") ||
            text.includes("研究") ||
            text.includes("深度研究")
        );
    }

    function textLooksLikeModeTargetMenuItem(value, target) {
        const text = normalizeNotionText(value);
        if (!text || !target) return false;

        const labels = getModeTargetComparableLabels(target);
        if (labels.some(label => text === label || text.startsWith(`${label} `))) return true;

        if (target.id === "default") {
            return text.includes("can search") ||
                text.includes("edit, and more") ||
                text.includes("search, edit") ||
                text === "默认" ||
                text.includes("默认");
        }
        if (target.id === "ask") {
            return text.includes("answers only") ||
                text.includes("won't make edits") ||
                text.includes("不会编辑") ||
                text.includes("只回答") ||
                text.includes("提问");
        }
        if (target.id === "plan") {
            return text.includes("plans first") ||
                text.includes("executes after approval") ||
                text.includes("approval") ||
                text.includes("先计划") ||
                text.includes("计划");
        }
        if (target.id === "research") {
            return textLooksLikeResearchModeMenuItem(text);
        }
        return false;
    }

    function scoreModeMenuRoot(root) {
        if (!root || !isVisibleElement(root) || isInsideShortcutUi(root)) return -1;
        const text = normalizeNotionText(getElementText(root));
        if (!text) return -1;

        let score = 0;
        if (text.includes("default")) score += 80;
        if (text.includes("ask")) score += 80;
        if (text.includes("plan")) score += 80;
        if (text.includes("research")) score += 80;
        if (text.includes("默认")) score += 80;
        if (text.includes("提问") || text.includes("询问")) score += 80;
        if (text.includes("计划")) score += 80;
        if (text.includes("研究")) score += 80;
        if (text.includes("answers only") || text.includes("won't make edits")) score += 120;
        if (text.includes("plans first") || text.includes("executes after approval")) score += 120;
        if (text.includes("think deeper") || text.includes("thorough analysis")) score += 120;

        const role = String(root.getAttribute?.("role") || "").toLowerCase();
        if (role === "menu") score += 60;
        return score >= 240 ? score : -1;
    }

    function findOpenModeMenuRoot() {
        const roots = safeQueryAll(document, NOTION_SETTINGS_MENU_ROOT_SELECTOR)
            .filter(root => root && isVisibleElement(root) && !isInsideShortcutUi(root))
            .map(root => ({ root, score: scoreModeMenuRoot(root), rect: getElementRect(root) }))
            .filter(item => item.score > 0);
        if (roots.length === 0) return null;
        roots.sort((a, b) => {
            if (b.score !== a.score) return b.score - a.score;
            return (b.rect?.right || 0) - (a.rect?.right || 0);
        });
        return roots[0]?.root || null;
    }

    function findOpenModeMenuItem(target) {
        if (!target) return null;
        const root = findOpenModeMenuRoot();
        return root ? findSettingsMenuItemByText(root, value => textLooksLikeModeTargetMenuItem(value, target)) : null;
    }

    function getExplicitBooleanState(element) {
        if (!element) return null;
        const explicitTargets = [
            element,
            ...safeQueryAll(element, [
                'input[type="checkbox"]',
                'input[type="radio"]',
                "[aria-checked]",
                "[aria-selected]",
                "[aria-pressed]",
                "[aria-current]",
                "[data-state]",
                "[data-selected]",
                "[data-checked]",
                "[data-active]"
            ].join(", "))
        ];

        let sawFalse = false;
        for (const target of explicitTargets) {
            if (!target) continue;
            const tag = String(target.tagName || "").toLowerCase();
            const type = String(target.type || "").toLowerCase();
            if (tag === "input" && (type === "checkbox" || type === "radio")) {
                if (target.checked) return true;
                sawFalse = true;
                continue;
            }

            for (const attr of ["aria-checked", "aria-selected", "aria-pressed", "data-selected", "data-checked", "data-active"]) {
                const raw = target.getAttribute?.(attr);
                if (raw === null || raw === undefined) continue;
                const value = String(raw).trim().toLowerCase();
                if (value === "true" || value === "1" || value === "yes" || value === "checked" || value === "selected" || value === "active" || value === "on") return true;
                if (value === "false" || value === "0" || value === "no" || value === "unchecked" || value === "unselected" || value === "inactive" || value === "off") sawFalse = true;
            }

            const ariaCurrent = String(target.getAttribute?.("aria-current") || "").trim().toLowerCase();
            if (ariaCurrent && ariaCurrent !== "false") return true;
            if (ariaCurrent === "false") sawFalse = true;

            const dataState = String(target.getAttribute?.("data-state") || "").trim().toLowerCase();
            if (dataState === "checked" || dataState === "on" || dataState === "active" || dataState === "selected" || dataState === "true") return true;
            if (dataState === "unchecked" || dataState === "off" || dataState === "inactive" || dataState === "unselected" || dataState === "false") sawFalse = true;
        }
        return sawFalse ? false : null;
    }

    function getOpenModeMenuItemSelectionState(target) {
        const row = findOpenModeMenuItem(target);
        return row ? getExplicitBooleanState(row) : null;
    }

    function getResearchModeButtonSelectionState() {
        const button = findResearchModeTriggerElement();
        return button ? getExplicitBooleanState(button) : null;
    }

    function getModeSelectionState(target) {
        if (!target) return null;
        const rowState = getOpenModeMenuItemSelectionState(target);
        if (rowState !== null) return rowState;
        if (target.id === "research") return getResearchModeButtonSelectionState();
        return null;
    }

    async function waitForModeSelection(target, {
        trigger = null,
        timeoutMs = SETTINGS_MENU_TIMING.waitTimeoutMs,
        intervalMs = SETTINGS_MENU_TIMING.pollIntervalMs,
        requireMenuClose = false
    } = {}) {
        const deadline = Date.now() + Math.max(0, Number(timeoutMs) || 0);
        const interval = Math.max(30, Number(intervalMs) || SETTINGS_MENU_TIMING.pollIntervalMs);
        while (Date.now() <= deadline) {
            const selected = getModeSelectionState(target) === true;
            const menuClosed = !findSettingsMenuRoot(trigger) && !findOpenModeMenuRoot();
            if (selected && (!requireMenuClose || menuClosed)) return true;
            await sleep(interval);
        }
        const selected = getModeSelectionState(target) === true;
        const menuClosed = !findSettingsMenuRoot(trigger) && !findOpenModeMenuRoot();
        return selected && (!requireMenuClose || menuClosed);
    }

    function textLooksLikeModeMenuItem(value) {
        const text = normalizeNotionText(value);
        return !!text && (
            text === "mode" ||
            text.startsWith("mode ") ||
            text.includes(" mode ") ||
            text === "模式" ||
            text.includes("模式")
        );
    }

    function textLooksLikeMySourcesMenuItem(value) {
        const text = normalizeNotionText(value);
        return !!text && (
            text === "my sources" ||
            text.startsWith("my sources ") ||
            text.includes("my sources") ||
            text === "我的来源" ||
            text.includes("我的来源") ||
            text.includes("我的资料源") ||
            text.includes("我的资源")
        );
    }

    function textLooksLikeAllSourcesMenuItem(value) {
        const text = normalizeNotionText(value);
        return !!text && (
            text === "all sources i can access" ||
            text.includes("all sources i can access") ||
            text.includes("all sources") ||
            text.includes("全部来源") ||
            text.includes("所有来源") ||
            text.includes("全部资料源") ||
            text.includes("所有资料源")
        );
    }

    function getSettingsMenuCandidateRow(element, root, predicate) {
        if (!element || typeof predicate !== "function") return null;
        const rootArea = getElementArea(root);
        const rootRect = getElementRect(root);
        let bestRowLike = null;
        let row = element;
        let node = element;
        while (node && node.nodeType === 1) {
            if (root && node !== root && !root.contains?.(node)) break;
            if (!predicate(getElementSearchText(node))) {
                node = node.parentElement || null;
                continue;
            }
            const area = getElementArea(node);
            if (rootArea > 0 && area >= rootArea * 0.85) break;
            const rect = getElementRect(node);
            if (rect && rootRect) {
                const rowLike = rect.height >= 24 &&
                    rect.height <= 96 &&
                    rect.width >= Math.min(160, rootRect.width * 0.4);
                if (rowLike) bestRowLike = node;
            }
            row = node;
            node = node.parentElement || null;
        }
        return bestRowLike || row;
    }

    function findSettingsMenuItemByText(root, predicate) {
        if (!root || typeof predicate !== "function") return null;
        const candidates = [];
        const seen = new Set();
        const collect = (selector) => {
            for (const element of safeQueryAll(root, selector)) {
                if (!element || seen.has(element) || !isVisibleElement(element) || isElementDisabled(element)) continue;
                seen.add(element);
                if (!predicate(getElementSearchText(element))) continue;
                candidates.push(getSettingsMenuCandidateRow(element, root, predicate));
            }
        };
        collect(NOTION_SETTINGS_MENU_ITEM_SELECTOR);
        collect("div, span, button");

        const unique = Array.from(new Set(candidates.filter(Boolean)));
        if (unique.length === 0) return null;
        unique.sort((a, b) => {
            const aText = normalizeNotionText(getElementSearchText(a));
            const bText = normalizeNotionText(getElementSearchText(b));
            const aExact = predicate(aText) && aText.length <= 32 ? 1 : 0;
            const bExact = predicate(bText) && bText.length <= 32 ? 1 : 0;
            if (aExact !== bExact) return bExact - aExact;
            const aArea = getElementArea(a);
            const bArea = getElementArea(b);
            if (aArea !== bArea) return aArea - bArea;
            return aText.length - bText.length;
        });
        return unique[0] || null;
    }

    function findOpenSettingsMenuItemByText(predicate) {
        const roots = safeQueryAll(document, NOTION_SETTINGS_MENU_ROOT_SELECTOR)
            .filter(root => root && isVisibleElement(root) && !isInsideShortcutUi(root));
        for (const root of roots) {
            const item = findSettingsMenuItemByText(root, predicate);
            if (item) return item;
        }
        return null;
    }

    function findOpenAllSourcesMenuItem() {
        return findOpenSettingsMenuItemByText(textLooksLikeAllSourcesMenuItem);
    }

    function activateSettingsMenuRow(row, root = null) {
        if (!row || !isVisibleElement(row) || isElementDisabled(row)) return false;
        const rect = getElementRect(row);
        const points = rect ? [
            [rect.left + rect.width * 0.52, rect.top + rect.height * 0.5],
            [rect.left + rect.width * 0.88, rect.top + rect.height * 0.5]
        ] : [[1, 1]];
        let activated = false;
        for (const [x, y] of points) {
            const pointElement = getElementFromPointSafe(x, y);
            const targets = Array.from(new Set([
                getClickableActionElement(pointElement, root),
                pointElement,
                getClickableActionElement(row, root),
                row
            ].filter(Boolean)));
            for (const target of targets) {
                if (!target || !isVisibleElement(target) || isElementDisabled(target)) continue;
                try { target.focus?.({ preventScroll: true }); } catch {
                    try { target.focus?.(); } catch { }
                }
                activated = simulatePointerActivationAt(target, x, y) || activated;
                activated = forceNativeClickElement(target) || activated;
                activated = simulateClickElement(target, { nativeFallback: true }) || activated;
                if (activated) return true;
            }
        }
        return activated;
    }

    async function waitForAllSourcesMenuItem() {
        const deadline = Date.now() + SETTINGS_MENU_TIMING.waitTimeoutMs;
        while (Date.now() <= deadline) {
            const row = findOpenAllSourcesMenuItem();
            if (row) return row;
            await sleep(SETTINGS_MENU_TIMING.pollIntervalMs);
        }
        return findOpenAllSourcesMenuItem();
    }

    async function waitForModeMenuItem(target) {
        const deadline = Date.now() + SETTINGS_MENU_TIMING.waitTimeoutMs;
        while (Date.now() <= deadline) {
            const row = findOpenModeMenuItem(target);
            if (row) return row;
            await sleep(SETTINGS_MENU_TIMING.pollIntervalMs);
        }
        return findOpenModeMenuItem(target);
    }

    async function ensureModeMenuOpen(trigger, root, target) {
        const existingTargetRow = findOpenModeMenuItem(target);
        if (existingTargetRow) return existingTargetRow;

        const modeRow = findSettingsMenuItemByText(root, textLooksLikeModeMenuItem) ||
            findOpenSettingsMenuItemByText(textLooksLikeModeMenuItem);
        if (!modeRow) return null;
        if (!activateSettingsMenuRow(modeRow, root)) return null;
        await sleep(SETTINGS_MENU_TIMING.openDelayMs);
        return waitForModeMenuItem(target);
    }

    function findResearchModeTriggerElement() {
        const selectors = [
            '[data-testid="unified-chat-research-mode-button"]',
            'button[aria-label*="research" i]',
            '[role="button"][aria-label*="research" i]',
            'button[title*="research" i]',
            '[role="button"][title*="research" i]',
            'button[aria-label*="研究" i]',
            '[role="button"][aria-label*="研究" i]',
            'button[title*="研究" i]',
            '[role="button"][title*="研究" i]'
        ].join(", ");
        const candidates = safeQueryAll(document, selectors)
            .filter(element => element && isVisibleElement(element) && !isInsideShortcutUi(element) && !isElementDisabled(element))
            .map(element => {
                const dataTestId = String(element.getAttribute?.("data-testid") || "").toLowerCase();
                const label = getElementSearchText(element);
                const exact = dataTestId === "unified-chat-research-mode-button" ? 1000 : 0;
                const toolbar = isLikelyComposerToolbarControl(element) ? 300 : 0;
                const rect = getElementRect(element);
                const score = exact + toolbar + (textLooksLikeResearchModeMenuItem(label) ? 160 : 0);
                return { element: getClickableActionElement(element), score, rect };
            })
            .filter(item => item.element && item.score > 0);
        candidates.sort((a, b) => {
            if (b.score !== a.score) return b.score - a.score;
            return (b.rect?.bottom || 0) - (a.rect?.bottom || 0);
        });
        return candidates[0]?.element || null;
    }

    function findExplicitWebAccessToggleTarget(container) {
        if (!container) return null;
        const rowRole = String(container.getAttribute?.("role") || "").toLowerCase();
        if (rowRole === "switch" || rowRole === "checkbox" || rowRole === "menuitemcheckbox") return container;
        const selectors = [
            '[role="switch"]',
            '[role="checkbox"]',
            '[role="menuitemcheckbox"]',
            'input[type="checkbox"]',
            'button[aria-checked]',
            '[aria-checked]',
            'button[data-state="checked"]',
            'button[data-state="unchecked"]',
            '[data-state="checked"]',
            '[data-state="unchecked"]'
        ].join(", ");
        const targets = safeQueryAll(container, selectors)
            .filter(element => element && isVisibleElement(element) && !isElementDisabled(element))
            .sort((a, b) => {
                const aRect = getElementRect(a);
                const bRect = getElementRect(b);
                return (bRect?.right || 0) - (aRect?.right || 0);
            });
        return targets[0] || null;
    }

    function findWebAccessToggleTarget(row) {
        const explicit = findExplicitWebAccessToggleTarget(row);
        if (explicit) return explicit;
        const rowRect = getElementRect(row);
        if (!row || !rowRect) return null;

        const targets = safeQueryAll(row, 'button, [role="button"], [tabindex]:not([tabindex="-1"]), div, span')
            .filter(element => element && element !== row && isVisibleElement(element) && !isElementDisabled(element))
            .map(element => ({ element, rect: getElementRect(element) }))
            .filter(({ rect }) => {
                if (!rect) return false;
                const rightSide = rect.left >= rowRect.left + rowRect.width * 0.55;
                const sizeLooksLikeSwitch = rect.width >= 24 && rect.width <= 96 && rect.height >= 14 && rect.height <= 48;
                return rightSide && sizeLooksLikeSwitch;
            })
            .sort((a, b) => {
                if (b.rect.right !== a.rect.right) return b.rect.right - a.rect.right;
                return (b.rect.width * b.rect.height) - (a.rect.width * a.rect.height);
            });
        return targets[0]?.element || null;
    }

    function getWebAccessToggleState(target) {
        if (!target) return null;
        const explicitTargets = [target, ...safeQueryAll(target, 'input[type="checkbox"], [aria-checked], [data-state]')];
        for (const element of explicitTargets) {
            if (!element) continue;
            if (element.tagName && String(element.tagName).toLowerCase() === "input" && element.type === "checkbox") {
                return !!element.checked;
            }
            const ariaChecked = String(element.getAttribute?.("aria-checked") || "").toLowerCase();
            if (ariaChecked === "true") return true;
            if (ariaChecked === "false") return false;
            const dataState = String(element.getAttribute?.("data-state") || "").toLowerCase();
            if (dataState === "checked" || dataState === "on" || dataState === "open") return true;
            if (dataState === "unchecked" || dataState === "off" || dataState === "closed") return false;
        }
        return null;
    }

    async function waitForWebAccessToggleChange(trigger, previousState) {
        if (previousState === null) {
            await sleep(SETTINGS_MENU_TIMING.openDelayMs);
            return true;
        }
        const deadline = Date.now() + SETTINGS_MENU_TIMING.waitTimeoutMs;
        while (Date.now() <= deadline) {
            const currentRoot = findSettingsMenuRoot(trigger);
            if (!currentRoot) return true;
            const row = findWebAccessMenuItem(currentRoot);
            const target = findWebAccessToggleTarget(row);
            const currentState = getWebAccessToggleState(target);
            if (currentState !== null && currentState !== previousState) return true;
            await sleep(SETTINGS_MENU_TIMING.pollIntervalMs);
        }
        return false;
    }

    async function waitForAllSourcesToggleChange(previousState) {
        if (previousState === null) {
            await sleep(SETTINGS_MENU_TIMING.openDelayMs);
            return true;
        }
        const deadline = Date.now() + SETTINGS_MENU_TIMING.waitTimeoutMs;
        while (Date.now() <= deadline) {
            const row = findOpenAllSourcesMenuItem();
            if (!row) return true;
            const target = findWebAccessToggleTarget(row);
            const currentState = getWebAccessToggleState(target);
            if (currentState !== null && currentState !== previousState) return true;
            await sleep(SETTINGS_MENU_TIMING.pollIntervalMs);
        }
        return false;
    }

    function dispatchEscapeKey(target) {
        const eventInit = {
            key: "Escape",
            code: "Escape",
            keyCode: 27,
            which: 27,
            bubbles: true,
            cancelable: true,
            composed: true
        };
        try {
            target?.dispatchEvent?.(new KeyboardEvent("keydown", eventInit));
            target?.dispatchEvent?.(new KeyboardEvent("keyup", eventInit));
            return true;
        } catch {
            return false;
        }
    }

    function dispatchSettingsMenuEscape(root) {
        const targets = [
            document.activeElement || null,
            root || null,
            document.body || null,
            document.documentElement || null,
            document,
            window
        ].filter(Boolean);
        let dispatched = false;
        for (const target of targets) {
            dispatched = dispatchEscapeKey(target) || dispatched;
        }
        return dispatched;
    }

    async function waitForSettingsMenuClose(trigger, { timeoutMs = 900, intervalMs = SETTINGS_MENU_TIMING.pollIntervalMs } = {}) {
        const deadline = Date.now() + Math.max(0, Number(timeoutMs) || 0);
        while (Date.now() <= deadline) {
            if (!findSettingsMenuRoot(trigger)) return true;
            await sleep(intervalMs);
        }
        return !findSettingsMenuRoot(trigger);
    }

    function findOutsideSettingsMenuClickTarget(menuRoot) {
        const rootRect = getElementRect(menuRoot);
        const points = [];
        const width = Number(window?.innerWidth || document?.documentElement?.clientWidth || 0);
        const height = Number(window?.innerHeight || document?.documentElement?.clientHeight || 0);
        if (width <= 0 || height <= 0) return null;

        const pushPoint = (x, y) => points.push([Math.max(1, Math.min(width - 1, x)), Math.max(1, Math.min(height - 1, y))]);
        pushPoint(8, 8);
        pushPoint(width - 8, 8);
        pushPoint(8, height - 8);
        pushPoint(width - 8, height - 8);
        pushPoint(width * 0.12, height * 0.1);
        pushPoint(width * 0.88, height * 0.1);
        pushPoint(width * 0.12, height * 0.88);
        pushPoint(width * 0.88, height * 0.88);

        for (const [x, y] of points) {
            const element = document.elementFromPoint?.(x, y);
            if (!element || element === menuRoot || menuRoot?.contains?.(element)) continue;
            if (isInsideShortcutUi(element)) continue;
            const rect = getElementRect(element);
            if (rootRect && rect) {
                const overlapsMenu =
                    rect.left < rootRect.right &&
                    rect.right > rootRect.left &&
                    rect.top < rootRect.bottom &&
                    rect.bottom > rootRect.top;
                if (overlapsMenu) continue;
            }
            return {
                element: getClickableActionElement(element) || element,
                x,
                y
            };
        }
        return null;
    }

    function findOutsideSettingsMenuFocusTarget(menuRoot) {
        const selectors = [
            "textarea",
            '[contenteditable="true"]',
            '[role="textbox"]',
            "input",
            "button"
        ].join(", ");
        const candidates = safeQueryAll(document, selectors)
            .filter(element => {
                if (!element || !isVisibleElement(element) || isElementDisabled(element)) return false;
                if (menuRoot?.contains?.(element) || isInsideShortcutUi(element)) return false;
                return true;
            })
            .map(element => ({ element, rect: getElementRect(element), text: normalizeNotionText(getElementText(element)) }))
            .filter(({ rect }) => !!rect)
            .sort((a, b) => {
                const aComposer = textLooksLikeComposerPrompt(getComposerCandidateText(a.element)) ? 1 : 0;
                const bComposer = textLooksLikeComposerPrompt(getComposerCandidateText(b.element)) ? 1 : 0;
                if (aComposer !== bComposer) return bComposer - aComposer;
                const aNewChat = textLooksLikeNewChat(a.text) ? 1 : 0;
                const bNewChat = textLooksLikeNewChat(b.text) ? 1 : 0;
                if (aNewChat !== bNewChat) return bNewChat - aNewChat;
                return b.rect.bottom - a.rect.bottom;
            });
        return candidates[0]?.element || null;
    }

    async function closeSettingsMenu(trigger, { initialDelayMs = 40 } = {}) {
        await sleep(Math.max(0, Number(initialDelayMs) || 0));

        for (let attempt = 0; attempt < 3; attempt += 1) {
            const root = findSettingsMenuRoot(trigger);
            if (!root) return true;

            const latestTrigger = findSettingsTriggerElement();
            const triggerCandidates = Array.from(new Set([latestTrigger, trigger].filter(Boolean)));
            for (const candidate of triggerCandidates) {
                if (!isVisibleElement(candidate) || root.contains?.(candidate)) continue;
                if (clickElementAtPointForClose(candidate, root)) {
                    if (await waitForSettingsMenuClose(trigger, { timeoutMs: 260 })) return true;
                }
            }

            dispatchSettingsMenuEscape(root);
            try { document.activeElement?.blur?.(); } catch { }
            const focusTarget = findOutsideSettingsMenuFocusTarget(root);
            try { focusTarget?.focus?.({ preventScroll: true }); } catch {
                try { focusTarget?.focus?.(); } catch { }
            }
            if (await waitForSettingsMenuClose(trigger, { timeoutMs: 450 })) return true;

            const outsideTarget = findOutsideSettingsMenuClickTarget(root);
            if (outsideTarget) {
                let outsideClicked = false;
                outsideClicked = simulatePointerSequenceAt(outsideTarget.element, outsideTarget.x, outsideTarget.y) || outsideClicked;
                outsideClicked = simulatePointerSequenceAt(document, outsideTarget.x, outsideTarget.y) || outsideClicked;
                outsideClicked = simulateClickElement(outsideTarget.element, { nativeFallback: true }) || outsideClicked;
                if (outsideClicked) {
                    if (await waitForSettingsMenuClose(trigger, { timeoutMs: 320 })) return true;
                }
            }

            const fallbackTarget = findComposerRootElement() || document.body;
            const fallbackRect = getElementRect(fallbackTarget);
            const fallbackX = fallbackRect ? fallbackRect.left + fallbackRect.width * 0.5 : 1;
            const fallbackY = fallbackRect ? fallbackRect.top + fallbackRect.height * 0.35 : 1;
            if (fallbackTarget) {
                let fallbackClicked = false;
                fallbackClicked = simulatePointerSequenceAt(fallbackTarget, fallbackX, fallbackY) || fallbackClicked;
                fallbackClicked = simulatePointerSequenceAt(document, fallbackX, fallbackY) || fallbackClicked;
                fallbackClicked = simulateClickElement(fallbackTarget, { nativeFallback: true }) || fallbackClicked;
                if (fallbackClicked) {
                    if (await waitForSettingsMenuClose(trigger, { timeoutMs: 320 })) return true;
                }
            }

            await sleep(SETTINGS_MENU_TIMING.pollIntervalMs);
        }
        return false;
    }

    async function toggleWebAccessAction({ engine } = {}) {
        const trigger = findSettingsTriggerElement();
        const root = await ensureSettingsMenuOpen(trigger);
        if (!root) return false;

        const deadline = Date.now() + SETTINGS_MENU_TIMING.waitTimeoutMs;
        do {
            const currentRoot = findSettingsMenuRoot(trigger) || root;
            const row = findWebAccessMenuItem(currentRoot);
            const target = findWebAccessToggleTarget(row);
            if (target) {
                syncNotionWebAccessShortcutIconFromElement(engine, row);
                const previousState = getWebAccessToggleState(target);
                if (!simulateClickElement(target, { nativeFallback: true })) return false;
                const closePromise = closeSettingsMenu(trigger, { initialDelayMs: 30 });
                const changed = await waitForWebAccessToggleChange(trigger, previousState);
                const closed = await closePromise;
                if (!closed) await closeSettingsMenu(findSettingsTriggerElement(), { initialDelayMs: 0 });
                return changed;
            }
            if (Date.now() >= deadline) break;
            await sleep(SETTINGS_MENU_TIMING.pollIntervalMs);
        } while (true);
        return false;
    }

    async function toggleAllSourcesAction({ engine } = {}) {
        const trigger = findSettingsTriggerElement();
        if (!trigger) return false;
        const root = await ensureSettingsMenuOpen(trigger);
        if (!root) return false;

        let row = findOpenAllSourcesMenuItem();
        if (!row) {
            const mySourcesRow = findSettingsMenuItemByText(root, textLooksLikeMySourcesMenuItem);
            if (!activateSettingsMenuRow(mySourcesRow, root)) {
                await closeSettingsMenu(trigger, { initialDelayMs: 0 });
                return false;
            }
            await sleep(SETTINGS_MENU_TIMING.openDelayMs);
            row = await waitForAllSourcesMenuItem();
        }
        if (!row) {
            await closeSettingsMenu(trigger, { initialDelayMs: 0 });
            return false;
        }

        syncNotionShortcutIconFromElement(engine, "selectSearchScope", row);
        const target = findWebAccessToggleTarget(row);
        if (!target) {
            await closeSettingsMenu(trigger, { initialDelayMs: 0 });
            return false;
        }

        const previousState = getWebAccessToggleState(target);
        if (!simulateClickElement(target, { nativeFallback: true })) return false;
        const closePromise = closeSettingsMenu(trigger, { initialDelayMs: 30 });
        const changed = await waitForAllSourcesToggleChange(previousState);
        const closed = await closePromise;
        if (!closed) await closeSettingsMenu(findSettingsTriggerElement(), { initialDelayMs: 0 });
        return changed;
    }

    function resolveModeSelectionTarget(shortcut, targetId = "") {
        const explicitTarget = inferModeTargetFromText(targetId);
        if (explicitTarget) return explicitTarget;

        const data = getShortcutDataObject(shortcut);
        const rawMode = data.mode;
        const mode = isPlainObject(rawMode)
            ? rawMode
            : (rawMode !== undefined ? { id: rawMode } : data);
        const target = inferModeTargetFromText(mode.id ?? mode.target ?? mode.textMatch ?? mode.keyword ?? shortcut?.key ?? shortcut?.name);
        if (target) return target;

        const byKey = getModeTargetByShortcutKey(shortcut?.key);
        if (byKey) return byKey;
        return NOTION_MODE_TARGETS.research;
    }

    async function selectModeAction({ shortcut, engine, targetId = "" } = {}) {
        const target = resolveModeSelectionTarget(shortcut, targetId);
        const trigger = findSettingsTriggerElement();
        if (!trigger) return false;

        const root = await ensureSettingsMenuOpen(trigger);
        if (!root) return false;

        const initialRow = await ensureModeMenuOpen(trigger, root, target);
        if (!initialRow) {
            await closeSettingsMenu(trigger, { initialDelayMs: 0 });
            return false;
        }

        syncNotionModeShortcutIconsFromOpenMenu(engine);
        const row = findOpenModeMenuItem(target) || initialRow;
        if (!row) {
            await closeSettingsMenu(trigger, { initialDelayMs: 0 });
            return false;
        }

        if (!activateSettingsMenuRow(row)) {
            await closeSettingsMenu(trigger, { initialDelayMs: 0 });
            return false;
        }

        const selected = await waitForModeSelection(target, { trigger, requireMenuClose: false });
        syncNotionModeShortcutIconsFromOpenMenu(engine);
        const closed = await closeSettingsMenu(trigger, { initialDelayMs: 30 });
        const settled = selected && closed;
        if (!settled) {
            const label = target?.label || target?.id || "mode";
            console.warn(`${LOG_TAG} selectMode: selection did not settle for ${label}; mode state was not confirmed or the settings menu stayed open.`);
        }
        return settled;
    }

    async function toggleResearchModeAction(args = {}) {
        return selectModeAction({ ...args, targetId: "research" });
    }

    function textLooksLikeCreateImageMenuItem(value) {
        const text = normalizeNotionText(value);
        return (
            text === "create image" ||
            text === "create image new" ||
            text === "create imagenew" ||
            text === "generate image" ||
            text === "generate imagenew" ||
            text === "创建图片" ||
            text === "生成图片" ||
            text === "创建图像" ||
            text === "生成图像"
        );
    }

    function textLooksLikeAttachFileMenuItem(value) {
        const text = normalizeNotionText(value);
        return (
            text === "add images, pdfs, or csvs" ||
            text === "add images pdfs or csvs" ||
            text === "add images, pdfs, csvs" ||
            text === "attach file" ||
            text === "upload file" ||
            text === "上传文件" ||
            text === "添加图片、pdf 或 csv" ||
            text === "添加图片 pdf 或 csv" ||
            text === "添加图片、pdf、csv"
        );
    }

    function findImageModeCloseElement() {
        return safeQueryAll(document, NOTION_IMAGE_MODE_CLOSE_SELECTOR)
            .find(element => element && isVisibleElement(element) && !isElementDisabled(element)) || null;
    }

    function findContextMenuTriggerElement() {
        const candidates = [];
        const seen = new Set();
        for (const element of safeQueryAll(document, NOTION_CONTEXT_MENU_TRIGGER_SELECTORS)) {
            if (!element || seen.has(element)) continue;
            seen.add(element);
            if (!isVisibleElement(element) || isInsideShortcutUi(element) || isElementDisabled(element)) continue;

            const clickable = getClickableActionElement(element) || element;
            const dataTestId = String(element.getAttribute?.("data-testid") || "").toLowerCase();
            const text = normalizeNotionText(getElementSearchText(element));
            let score = 0;
            if (dataTestId === "unified-chat-plus-menu-button") score += 1000;
            if (dataTestId.includes("plus-menu")) score += 700;
            if (text.includes("give context") || text.includes("add context")) score += 420;
            if (isLikelyComposerToolbarControl(clickable)) score += 120;
            candidates.push({ element: clickable, score });
        }
        candidates.sort((a, b) => b.score - a.score);
        return candidates[0]?.element || null;
    }

    function findCreateImageMenuItem(root) {
        if (!root) return null;
        return safeQueryAll(root, NOTION_CONTEXT_MENU_ITEM_SELECTOR)
            .find(element => (
                element &&
                isVisibleElement(element) &&
                !isElementDisabled(element) &&
                textLooksLikeCreateImageMenuItem(getElementText(element))
            )) || null;
    }

    function findAttachFileMenuItem(root) {
        if (!root) return null;
        return safeQueryAll(root, NOTION_CONTEXT_MENU_ITEM_SELECTOR)
            .find(element => (
                element &&
                isVisibleElement(element) &&
                !isElementDisabled(element) &&
                textLooksLikeAttachFileMenuItem(getElementText(element))
            )) || null;
    }

    function findContextMenuRoot(triggerEl = null) {
        if (triggerEl) {
            const controlsId = String(triggerEl.getAttribute?.("aria-controls") || "").trim();
            if (controlsId) {
                const controlled = document.getElementById(controlsId);
                if (findCreateImageMenuItem(controlled) || findAttachFileMenuItem(controlled)) return controlled;
            }
        }

        return safeQueryAll(document, NOTION_CONTEXT_MENU_ROOT_SELECTOR)
            .find(element => element && isVisibleElement(element) && (findCreateImageMenuItem(element) || findAttachFileMenuItem(element))) || null;
    }

    async function ensureContextMenuOpen(triggerEl) {
        const existing = findContextMenuRoot(triggerEl);
        if (existing) return existing;
        if (!triggerEl || !simulateClickElement(triggerEl, { nativeFallback: true })) return null;
        if (CONTEXT_MENU_TIMING.openDelayMs > 0) await sleep(CONTEXT_MENU_TIMING.openDelayMs);

        const deadline = Date.now() + CONTEXT_MENU_TIMING.waitTimeoutMs;
        while (Date.now() <= deadline) {
            const root = findContextMenuRoot(triggerEl);
            if (root) return root;
            await sleep(CONTEXT_MENU_TIMING.pollIntervalMs);
        }
        return findContextMenuRoot(triggerEl);
    }

    async function waitForImageModeState(expectedState) {
        const deadline = Date.now() + CONTEXT_MENU_TIMING.waitTimeoutMs;
        while (Date.now() <= deadline) {
            if (!!findImageModeCloseElement() === !!expectedState) return true;
            await sleep(CONTEXT_MENU_TIMING.pollIntervalMs);
        }
        return !!findImageModeCloseElement() === !!expectedState;
    }

    async function toggleImageGenerationAction({ engine } = {}) {
        const closeElement = findImageModeCloseElement();
        if (closeElement) {
            if (!simulateClickElement(closeElement, { nativeFallback: true })) return false;
            const disabled = await waitForImageModeState(false);
            if (!disabled) console.warn(`${LOG_TAG} toggleImageGeneration: image mode did not turn off.`);
            return disabled;
        }

        const trigger = findContextMenuTriggerElement();
        if (!trigger) {
            console.warn(`${LOG_TAG} toggleImageGeneration: Give context trigger not found.`);
            return false;
        }
        const root = await ensureContextMenuOpen(trigger);
        if (!root) {
            console.warn(`${LOG_TAG} toggleImageGeneration: Give context menu not found.`);
            return false;
        }
        syncNotionAttachFileShortcutIconFromElement(engine, findAttachFileMenuItem(root));
        const item = findCreateImageMenuItem(root);
        if (!item) {
            console.warn(`${LOG_TAG} toggleImageGeneration: Create image menu item not found.`);
            return false;
        }
        syncNotionImageGenerationShortcutIconFromElement(engine, item);
        if (!simulateClickElement(item, { nativeFallback: true })) return false;

        const enabled = await waitForImageModeState(true);
        if (!enabled) console.warn(`${LOG_TAG} toggleImageGeneration: image mode did not turn on.`);
        return enabled;
    }

    function findModelTriggerElement() {
        const candidates = [];
        const seen = new Set();
        const composerRoot = findComposerRootElement();
        const composerRect = getElementRect(composerRoot);
        for (const element of safeQueryAll(document, NOTION_MODEL_TRIGGER_SELECTORS)) {
            if (!element || seen.has(element)) continue;
            seen.add(element);
            const score = scoreModelTriggerCandidate(element, { composerRoot, composerRect });
            if (score < 0) continue;
            let bottom = 0;
            try { bottom = Number(element.getBoundingClientRect?.().bottom || 0); } catch { }
            candidates.push({ element, score, bottom });
        }
        candidates.sort((a, b) => {
            if (b.score !== a.score) return b.score - a.score;
            return b.bottom - a.bottom;
        });
        return candidates[0]?.element || null;
    }

    function scoreModelMenuRoot(root) {
        if (!root || !isVisibleElement(root) || isInsideShortcutUi(root)) return -1;
        const text = getElementText(root);
        const normalized = normalizeNotionText(text);
        let score = 0;
        if (normalized.includes("select a model")) score += 160;
        if (normalized.includes("open models")) score += 80;
        for (const target of NOTION_MODEL_TARGET_LIST) {
            if (textLooksLikeTarget(text, target)) score += 80;
        }
        return score >= 160 ? score : -1;
    }

    function findModelMenuRoot(triggerEl = null) {
        if (triggerEl) {
            const controlsId = String(triggerEl.getAttribute?.("aria-controls") || "").trim();
            if (controlsId) {
                const controlled = document.getElementById(controlsId);
                if (scoreModelMenuRoot(controlled) > 0) return controlled;
            }
        }

        const candidates = safeQueryAll(document, NOTION_MODEL_MENU_ROOT_SELECTOR)
            .map(element => ({ element, score: scoreModelMenuRoot(element) }))
            .filter(item => item.score > 0);
        if (candidates.length === 0) return null;
        candidates.sort((a, b) => b.score - a.score);
        return candidates[0]?.element || null;
    }

    async function ensureModelMenuOpen(triggerEl, { timeoutMs = MODEL_MENU_TIMING.waitTimeoutMs, intervalMs = MODEL_MENU_TIMING.pollIntervalMs } = {}) {
        const existing = findModelMenuRoot(triggerEl);
        if (existing) return existing;
        if (!triggerEl) return null;
        if (!clickModelElement(triggerEl)) return null;
        if (MODEL_MENU_TIMING.openDelayMs > 0) await sleep(MODEL_MENU_TIMING.openDelayMs);

        const deadline = Date.now() + Math.max(0, Number(timeoutMs) || 0);
        while (Date.now() <= deadline) {
            const root = findModelMenuRoot(triggerEl);
            if (root) return root;
            await sleep(intervalMs);
        }
        return findModelMenuRoot(triggerEl);
    }

    function getClickableMenuItem(element, root) {
        let node = element;
        while (node && node !== root && node.nodeType === 1) {
            const tag = String(node.tagName || "").toLowerCase();
            const role = String(node.getAttribute?.("role") || "").toLowerCase();
            const tabIndex = String(node.getAttribute?.("tabindex") || "").trim();
            if (
                tag === "button" ||
                role === "menuitem" ||
                role === "menuitemradio" ||
                role === "option" ||
                (tabIndex && tabIndex !== "-1")
            ) {
                return node;
            }
            node = node.parentElement || null;
        }
        return element;
    }

    function countModelTargetsInText(value) {
        const text = normalizeNotionText(value);
        if (!text) return 0;
        return NOTION_MODEL_TARGET_LIST.reduce((count, target) => count + (textLooksLikeTarget(text, target) ? 1 : 0), 0);
    }

    function modelElementShowsTarget(element, target) {
        if (!target) return true;
        return textLooksLikeTarget(getElementText(element), target);
    }

    function modelMenuItemMatchesSpec(element, { target = null, textMatch = null } = {}) {
        const text = getElementText(element);
        if (target) return textLooksLikeTarget(text, target);
        if (typeof textMatch === "function") {
            try { return !!textMatch(text, element); } catch { return false; }
        }
        if (textMatch instanceof RegExp) {
            try {
                textMatch.lastIndex = 0;
                return textMatch.test(text);
            } catch {
                return false;
            }
        }
        if (Array.isArray(textMatch)) {
            const normalizedText = normalizeNotionText(text);
            return textMatch.some(item => {
                const needle = normalizeNotionText(item);
                return needle ? normalizedText.includes(needle) : false;
            });
        }
        const needle = normalizeNotionText(textMatch);
        return needle ? normalizeNotionText(text).includes(needle) : true;
    }

    function getModelMenuItemRow(element, root, matchesSpec = null) {
        if (!element) return null;
        const rootArea = getElementArea(root);
        const rootRect = getElementRect(root);
        let bestRoleRow = null;
        let bestAction = null;
        let bestRowLike = null;
        let fallback = null;
        let node = element;
        while (node && node.nodeType === 1) {
            if (root && node === root) break;
            if (root && !root.contains?.(node)) break;
            if (!isVisibleElement(node) || isElementDisabled(node)) {
                node = node.parentElement || null;
                continue;
            }
            if (typeof matchesSpec === "function" && !matchesSpec(node)) {
                node = node.parentElement || null;
                continue;
            }

            const text = getElementText(node);
            const targetCount = countModelTargetsInText(text);
            const area = getElementArea(node);
            if (rootArea > 0 && area >= rootArea * 0.85) break;
            if (targetCount > 1) {
                node = node.parentElement || null;
                continue;
            }

            const rect = getElementRect(node);
            const tag = String(node.tagName || "").toLowerCase();
            const role = String(node.getAttribute?.("role") || "").toLowerCase();
            const tabIndex = String(node.getAttribute?.("tabindex") || "").trim();
            const roleRowLike = role === "menuitem" || role === "menuitemradio" || role === "option";
            const actionLike = roleRowLike || tag === "button" || role === "button" || (tabIndex && tabIndex !== "-1");
            const rowLike = rect && rootRect &&
                rect.height >= 22 &&
                rect.height <= 88 &&
                rect.width >= Math.min(120, rootRect.width * 0.38) &&
                rect.width <= rootRect.width + 32;

            if (roleRowLike && !bestRoleRow) bestRoleRow = node;
            if (actionLike && !bestAction) bestAction = node;
            if (rowLike && !bestRowLike) bestRowLike = node;
            if (!fallback) fallback = node;
            node = node.parentElement || null;
        }
        return bestRoleRow || bestAction || bestRowLike || fallback || getClickableMenuItem(element, root);
    }

    function getTextMatchComparableLabels(textMatch) {
        if (typeof textMatch === "string") return [normalizeNotionText(textMatch)].filter(Boolean);
        if (Array.isArray(textMatch)) return Array.from(new Set(textMatch.map(normalizeNotionText).filter(Boolean)));
        return [];
    }

    function scoreModelMenuItemRow(element, spec) {
        if (!element || !isVisibleElement(element) || isElementDisabled(element)) return Number.NEGATIVE_INFINITY;
        const text = getElementText(element);
        const normalizedText = normalizeNotionText(text);
        const role = String(element.getAttribute?.("role") || "").toLowerCase();
        const tag = String(element.tagName || "").toLowerCase();
        const tabIndex = String(element.getAttribute?.("tabindex") || "").trim();
        const targetCount = countModelTargetsInText(text);
        const rect = getElementRect(element);

        let score = 0;
        if (role === "menuitem" || role === "menuitemradio" || role === "option") score += 900;
        if (tag === "button" || role === "button") score += 360;
        if (tabIndex && tabIndex !== "-1") score += 120;
        if (targetCount === 1) score += 260;
        if (targetCount > 1) score -= 700;
        if (modelMenuItemMatchesSpec(element, spec)) score += 420;
        if (spec?.target && textLooksLikeTarget(text, spec.target)) score += 240;

        const comparableLabels = spec?.target ? getTargetComparableLabels(spec.target) : getTextMatchComparableLabels(spec?.textMatch);
        if (comparableLabels.includes(normalizedText)) score += 260;
        if (rect && rect.height >= 24 && rect.height <= 72) score += 100;
        if (rect && rect.width >= 120) score += 40;
        score -= Math.min(160, getElementArea(element) / 6000);
        return score;
    }

    function findModelMenuItem(root, { target = null, textMatch = null, selector = NOTION_MODEL_MENU_ITEM_SELECTOR, fallbackToFirst = false } = {}) {
        if (!root) return null;
        const spec = { target, textMatch };
        const matchesTarget = element => modelMenuItemMatchesSpec(element, spec);

        const rows = [];
        const seen = new Set();
        const seenRows = new Set();
        let firstRow = null;
        const addMatchedRow = (element) => {
            const row = getModelMenuItemRow(element, root, matchesTarget);
            if (!row || seenRows.has(row)) return;
            seenRows.add(row);
            rows.push(row);
        };
        const rememberFirstRow = (element) => {
            if (firstRow) return;
            firstRow = getModelMenuItemRow(element, root);
        };

        for (const element of safeQueryAll(root, selector || NOTION_MODEL_MENU_ITEM_SELECTOR)) {
            if (!element || seen.has(element) || !isVisibleElement(element)) continue;
            seen.add(element);
            rememberFirstRow(element);
            if (matchesTarget(element)) addMatchedRow(element);
        }

        const fallbackCandidates = safeQueryAll(root, "div, span, button")
            .filter(element => element && !seen.has(element) && isVisibleElement(element));
        for (const element of fallbackCandidates) {
            rememberFirstRow(element);
            if (matchesTarget(element)) addMatchedRow(element);
        }

        if (rows.length) {
            rows.sort((a, b) => scoreModelMenuItemRow(b, spec) - scoreModelMenuItemRow(a, spec));
            return rows[0] || null;
        }

        return fallbackToFirst ? firstRow : null;
    }

    function findModelMenuItemPointTarget(element, root, spec) {
        const rect = getElementRect(element);
        if (!rect) return null;
        const x = rect.left + rect.width / 2;
        const y = rect.top + rect.height / 2;
        const pointElement = getElementFromPointSafe(x, y);
        if (!pointElement || !root?.contains?.(pointElement)) return null;
        const matchesTarget = candidate => modelMenuItemMatchesSpec(candidate, spec);
        const row = getModelMenuItemRow(pointElement, root, matchesTarget);
        if (row && root.contains?.(row) && modelMenuItemMatchesSpec(row, spec)) return row;
        const clickable = getClickableMenuItem(pointElement, root);
        if (clickable && root.contains?.(clickable) && modelMenuItemMatchesSpec(clickable, spec)) return clickable;
        return null;
    }

    function getShortcutDataObject(shortcut) {
        return isPlainObject(shortcut?.data) ? shortcut.data : {};
    }

    function getModelPickerSpec(shortcut) {
        const data = getShortcutDataObject(shortcut);
        const rawMenu = data.menu;
        const menu = isPlainObject(rawMenu)
            ? rawMenu
            : (rawMenu !== undefined ? { textMatch: rawMenu } : data);

        const selector = typeof menu.selector === "string" && menu.selector.trim()
            ? menu.selector.trim()
            : NOTION_MODEL_MENU_ITEM_SELECTOR;
        const fallbackToFirst = !!menu.fallbackToFirst;
        const waitForItem = menu.waitForItem !== undefined ? !!menu.waitForItem : true;
        const rawTextMatch = menu.keyword !== undefined ? menu.keyword : menu.textMatch;
        const path = Array.isArray(menu.path) ? menu.path.map(item => String(item ?? "").trim()).filter(Boolean) : [];
        const pathLast = path.length ? path[path.length - 1] : "";
        const target = inferModelTargetFromText(menu.id ?? rawTextMatch ?? pathLast ?? rawMenu ?? shortcut?.name);
        const textMatch = target ? null : (rawTextMatch ?? pathLast);

        if (!target && !textMatch && !fallbackToFirst) {
            console.warn(`${LOG_TAG} modelPicker: missing target; set data.menu = { id: "gemini31pro" } or plain text like "gemini pro".`);
            return null;
        }

        return {
            selector,
            target,
            textMatch,
            fallbackToFirst,
            waitForItem
        };
    }

    async function waitForModelSelection(target, {
        triggerEl = null,
        timeoutMs = MODEL_MENU_TIMING.waitTimeoutMs,
        intervalMs = MODEL_MENU_TIMING.pollIntervalMs,
        requireMenuClose = true
    } = {}) {
        const deadline = Date.now() + Math.max(0, Number(timeoutMs) || 0);
        while (Date.now() <= deadline) {
            const trigger = triggerEl && isVisibleElement(triggerEl) ? triggerEl : findModelTriggerElement();
            const selected = modelElementShowsTarget(trigger, target);
            const menuClosed = !requireMenuClose || !findModelMenuRoot(trigger);
            if (selected && menuClosed) return true;
            await sleep(Math.max(30, Number(intervalMs) || 30));
        }
        const finalTrigger = triggerEl && isVisibleElement(triggerEl) ? triggerEl : findModelTriggerElement();
        return modelElementShowsTarget(finalTrigger, target) && (!requireMenuClose || !findModelMenuRoot(finalTrigger));
    }

    async function clickModelPickerItem({ shortcut, engine }) {
        const spec = getModelPickerSpec(shortcut);
        if (!spec) return false;

        const trigger = findModelTriggerElement();
        if (!trigger) {
            console.warn(`${LOG_TAG} modelPicker: main composer model trigger not found.`);
            return false;
        }
        if (spec.target && modelElementShowsTarget(trigger, spec.target) && !findModelMenuRoot(trigger)) return true;

        const menuRoot = await ensureModelMenuOpen(trigger);
        if (!menuRoot) {
            console.warn(`${LOG_TAG} modelPicker: model menu root not found after opening trigger.`);
            return false;
        }
        syncNotionModelShortcutIconsFromMenuRoot(engine, menuRoot);

        const deadline = Date.now() + MODEL_MENU_TIMING.waitTimeoutMs;
        let retriedPointTarget = false;
        do {
            const currentRoot = findModelMenuRoot(trigger) || menuRoot;
            const target = findModelMenuItem(currentRoot, spec);
            if (target && clickModelElement(target)) {
                if (await waitForModelSelection(spec.target, { triggerEl: trigger, requireMenuClose: true })) return true;
            }
            if (target && !retriedPointTarget) {
                retriedPointTarget = true;
                const retryRoot = findModelMenuRoot(trigger) || currentRoot;
                const pointTarget = retryRoot ? findModelMenuItemPointTarget(target, retryRoot, spec) : null;
                if (pointTarget && clickModelElement(pointTarget)) {
                    if (await waitForModelSelection(spec.target, { triggerEl: trigger, requireMenuClose: true })) return true;
                }
            }
            if (!spec.waitForItem || Date.now() >= deadline) break;
            await sleep(MODEL_MENU_TIMING.pollIntervalMs);
        } while (true);

        const label = spec.target?.menuLabel || spec.target?.label || String(spec.textMatch || "matched item");
        console.warn(`${LOG_TAG} modelPicker: selection did not settle for ${label}; trigger text did not update or the model menu stayed open.`);
        return false;
    }

    async function openModelPickerAction({ engine } = {}) {
        const trigger = findModelTriggerElement();
        if (!trigger) return false;
        const root = await ensureModelMenuOpen(trigger);
        if (root) syncNotionModelShortcutIconsFromMenuRoot(engine, root);
        return !!root;
    }

    function createNotionQuickInputAdapter({ idPrefix = "notion", engine = null } = {}) {
        const QuickInput = ShortcutTemplate?.quickInput;
        const dom = QuickInput?.dom;

        const simulateKeystroke = dom?.simulateKeystroke;
        const dispatchPasteEvent = dom?.dispatchPasteEvent;
        const dispatchBeforeInputFromPaste = dom?.dispatchBeforeInputFromPaste;
        const dispatchInputFromPaste = dom?.dispatchInputFromPaste;
        const dispatchDragEvent = dom?.dispatchDragEvent;
        const collectFileInputs = dom?.collectFileInputs;
        const collectFileInputsFromOpenShadows = dom?.collectFileInputsFromOpenShadows;
        const trySetFileInputFiles = dom?.trySetFileInputFiles;
        const waitForObservedState = dom?.waitForObservedState;
        const genericSetInputValue = typeof dom?.setInputValue === "function" ? dom.setInputValue : null;
        const genericClearInputValue = typeof dom?.clearInputValue === "function" ? dom.clearInputValue : null;
        const genericGetComposerText = typeof dom?.getComposerText === "function" ? dom.getComposerText : null;
        const genericNormalizeComposerText = typeof dom?.normalizeComposerText === "function"
            ? dom.normalizeComposerText
            : (value, { trimTrailingEditorNewlines = false } = {}) => {
                let text = String(value ?? "").replace(/\r\n?/g, "\n").replace(/[\u200B\u200C\u200D\u2060\uFEFF]/g, "");
                if (trimTrailingEditorNewlines) text = text.replace(/\n+$/g, "");
                return text;
            };

        if (
            typeof simulateKeystroke !== "function" ||
            typeof dispatchPasteEvent !== "function" ||
            typeof dispatchBeforeInputFromPaste !== "function" ||
            typeof dispatchInputFromPaste !== "function" ||
            typeof dispatchDragEvent !== "function" ||
            typeof collectFileInputs !== "function" ||
            typeof collectFileInputsFromOpenShadows !== "function" ||
            typeof trySetFileInputFiles !== "function" ||
            typeof waitForObservedState !== "function"
        ) {
            return null;
        }

        const overlayId = `${String(idPrefix || "").trim() || "notion"}-quick-input-overlay`;
        const NOTION_COMPOSER_SELECTORS = Object.freeze([
            "textarea[placeholder]",
            "textarea[aria-label]",
            "textarea[aria-multiline='true']",
            "textarea",
            "input[role='textbox']",
            "[role='textbox'][aria-multiline='true']",
            "[role='textbox'][contenteditable='true']",
            "[role='textbox'][contenteditable='plaintext-only']",
            "[role='textbox']",
            "[contenteditable='plaintext-only'][data-placeholder]",
            "[contenteditable='plaintext-only'][aria-placeholder]",
            "[contenteditable='plaintext-only']",
            "[contenteditable='true'][data-placeholder]",
            "[contenteditable='true'][aria-placeholder]",
            "[contenteditable='true']"
        ]);
        const NOTION_ATTACHMENT_OBSERVED_ATTRIBUTES = Object.freeze([
            "class",
            "src",
            "alt",
            "title",
            "aria-label",
            "aria-busy",
            "aria-disabled",
            "disabled",
            "data-testid",
            "data-state"
        ]);
        const NOTION_READY_OBSERVED_ATTRIBUTES = NOTION_ATTACHMENT_OBSERVED_ATTRIBUTES;
        const NOTION_TEXT_OBSERVED_ATTRIBUTES = Object.freeze([
            "class",
            "style",
            "value",
            "placeholder",
            "data-placeholder",
            "aria-placeholder",
            "aria-valuetext",
            "aria-multiline",
            "role",
            "aria-hidden",
            "hidden"
        ]);

        function qiText(key, vars = {}, fallback = "") {
            return engine?.i18n?.t?.(`quickInput.${key}`, vars, fallback) || fallback;
        }

        function getNotionNewChatLabel() {
            return engine?.i18n?.t?.("shortcuts.newChat", {}, "New Chat") || "New Chat";
        }

        function getCurrentNotionUrl() {
            try {
                return String(window.location.href || "");
            } catch {
                return "";
            }
        }

        function normalizeNotionPathname(pathname = "") {
            const path = String(pathname || "").trim();
            if (!path) return "/";
            if (path === "/") return "/";
            return path.replace(/\/+$/g, "") || "/";
        }

        function isNotionQuickInputHost(hostname = "") {
            const host = String(hostname || "").trim().toLowerCase();
            return host === "app.notion.com" || host === "notion.so" || host.endsWith(".notion.so");
        }

        function isNotionQuickInputUrl(url) {
            return !!(url && url.protocol === "https:" && isNotionQuickInputHost(url.hostname));
        }

        function isCanonicalNotionQuickInputUrl(url) {
            return !!(url && url.protocol === "https:" && String(url.hostname || "").toLowerCase() === "app.notion.com");
        }

        function parseNotionUrl(currentUrl = getCurrentNotionUrl()) {
            const rawUrl = String(currentUrl || "").trim();
            if (!rawUrl) return null;
            try {
                const url = new URL(rawUrl, NOTION_ORIGIN);
                return isNotionQuickInputUrl(url) ? url : null;
            } catch {
                return null;
            }
        }

        function getNotionAiHomeTargetUrl(url = null) {
            const notionUrl = isNotionQuickInputUrl(url) ? url : parseNotionUrl();
            const origin = notionUrl?.hostname === "app.notion.com" ? notionUrl.origin : NOTION_ORIGIN;
            return `${origin}${NOTION_AI_HOME_PATH}`;
        }

        function parseNotionQuickInputTarget(currentUrl = getCurrentNotionUrl()) {
            const url = parseNotionUrl(currentUrl);
            if (!url) return null;

            const pathname = normalizeNotionPathname(url.pathname);
            if (pathname === NOTION_AI_HOME_PATH) {
                const ready = isCanonicalNotionQuickInputUrl(url);
                return {
                    kind: "ai",
                    ready,
                    pathname,
                    targetUrl: getNotionAiHomeTargetUrl(url),
                    url: url.href
                };
            }

            return null;
        }

        function cloneNotionQuickInputTarget(target) {
            if (!target || typeof target !== "object") return null;
            if (!target.targetUrl || !target.url) return null;
            return {
                kind: String(target.kind || "").trim() || "ai",
                ready: !!target.ready,
                pathname: String(target.pathname || "").trim(),
                targetUrl: String(target.targetUrl || "").trim(),
                url: String(target.url || "").trim()
            };
        }

        let pendingNotionNewChatTarget = null;
        let pendingNotionNewChatTargetAt = 0;

        function getPendingNotionNewChatTarget() {
            if (!pendingNotionNewChatTarget) return null;
            const ageMs = Date.now() - pendingNotionNewChatTargetAt;
            if (ageMs >= 0 && ageMs <= NOTION_NEW_CHAT_TARGET_TTL_MS) {
                return cloneNotionQuickInputTarget(pendingNotionNewChatTarget);
            }
            pendingNotionNewChatTarget = null;
            pendingNotionNewChatTargetAt = 0;
            return null;
        }

        function rememberPendingNotionNewChatTarget(target) {
            const nextTarget = cloneNotionQuickInputTarget(target);
            if (!nextTarget) return;
            pendingNotionNewChatTarget = nextTarget;
            pendingNotionNewChatTargetAt = Date.now();
        }

        function clearPendingNotionNewChatTarget(target = null) {
            if (target && pendingNotionNewChatTarget && pendingNotionNewChatTarget.url !== String(target.url || "").trim()) return;
            pendingNotionNewChatTarget = null;
            pendingNotionNewChatTargetAt = 0;
        }

        function getNotionNewChatTriggerTarget() {
            const currentTarget = parseNotionQuickInputTarget();
            if (currentTarget) return currentTarget;
            const pendingTarget = getPendingNotionNewChatTarget();
            if (pendingTarget) return pendingTarget;
            const currentUrl = getCurrentNotionUrl();
            const currentNotionUrl = parseNotionUrl(currentUrl);
            return {
                kind: "ai",
                ready: false,
                pathname: NOTION_AI_HOME_PATH,
                targetUrl: getNotionAiHomeTargetUrl(currentNotionUrl),
                url: currentUrl
            };
        }

        function navigateNotionSpaToTarget(target) {
            const targetUrl = String(target?.targetUrl || "").trim();
            if (!targetUrl) return false;
            try {
                const url = new URL(targetUrl, NOTION_ORIGIN);
                if (!isNotionQuickInputUrl(url)) return false;
                if (normalizeNotionPathname(url.pathname) !== NOTION_AI_HOME_PATH) return false;
                const currentUrl = parseNotionUrl();
                if (!currentUrl || currentUrl.origin !== url.origin) {
                    window.location.assign(url.href);
                    return true;
                }
                window.history.pushState({ url: url.href }, document.title, url.pathname + url.search + url.hash);
                window.dispatchEvent(new PopStateEvent("popstate", { state: { url: url.href } }));
                return true;
            } catch {
                return false;
            }
        }

        function buildNotionTargetUrlMismatchMessage(currentUrl, { target = null, prefix = "" } = {}) {
            const expectedTarget = target || getNotionNewChatTriggerTarget();
            const targetUrl = String(expectedTarget?.targetUrl || getNotionAiHomeTargetUrl());
            const currentText = currentUrl || "(empty)";
            const base = engine?.i18n?.t?.(
                "quickInput.rootUrlMismatch",
                {
                    targetUrl,
                    currentUrl: currentText
                },
                `Current URL must match ${targetUrl}; actual URL is ${currentText}`
            ) || `Current URL must match ${targetUrl}; actual URL is ${currentText}`;
            return prefix ? `${prefix}${base}` : base;
        }

        const isInsideOverlayTree = typeof dom?.isInsideOverlayTree === "function"
            ? dom.isInsideOverlayTree
            : (target, targetOverlayId) => {
                if (!target || !targetOverlayId) return false;
                let node = target;
                while (node) {
                    if (node.nodeType === 1) {
                        if (node.id === targetOverlayId) return true;
                        try {
                            if (typeof node.closest === "function" && node.closest(`#${targetOverlayId}`)) return true;
                        } catch { }
                    }
                    let next = null;
                    try { next = node.parentNode || null; } catch { }
                    if (!next && typeof node.getRootNode === "function") {
                        try {
                            const root = node.getRootNode();
                            next = root?.host || null;
                        } catch { }
                    }
                    if (!next || next === node) break;
                    node = next;
                }
                return false;
            };

        function isInsideQuickInputOverlay(element) {
            return isInsideOverlayTree(element, overlayId);
        }

        function isNotionRoleTextboxElement(element) {
            return String(element?.getAttribute?.("role") || "").toLowerCase() === "textbox";
        }

        function isNotionContentEditableElement(element) {
            if (!element) return false;
            try {
                const editable = String(element.contentEditable || "").toLowerCase();
                return !!(element.isContentEditable || editable === "true" || editable === "plaintext-only");
            } catch {
                return !!element?.isContentEditable;
            }
        }

        function isNotionNativeTextInputElement(element) {
            const tag = String(element?.tagName || "").toUpperCase();
            return tag === "TEXTAREA" || tag === "INPUT";
        }

        function getNotionNativeValueSetter(element) {
            if (!element) return null;

            try {
                const ownDesc = Object.getOwnPropertyDescriptor(element, "value");
                if (typeof ownDesc?.set === "function") return ownDesc.set;
            } catch { }

            const seen = new Set();
            let proto = null;
            try { proto = Object.getPrototypeOf(element); } catch { proto = null; }
            while (proto && !seen.has(proto)) {
                seen.add(proto);
                try {
                    const desc = Object.getOwnPropertyDescriptor(proto, "value");
                    if (typeof desc?.set === "function") return desc.set;
                } catch { }
                try { proto = Object.getPrototypeOf(proto); } catch { proto = null; }
            }
            return null;
        }

        function hasNotionValueProperty(element) {
            if (!element) return false;
            if (isNotionNativeTextInputElement(element)) return true;
            return !!getNotionNativeValueSetter(element);
        }

        function getNotionElementOwnText(element, { trimTrailingEditorNewlines = false } = {}) {
            if (!element) return "";
            const candidates = [];
            const push = (value) => {
                const text = genericNormalizeComposerText(String(value ?? ""), { trimTrailingEditorNewlines });
                if (text) candidates.push(text);
            };

            if (hasNotionValueProperty(element)) {
                try { push(element.value); } catch { }
            }
            push(element.getAttribute?.("aria-valuetext"));
            push(element.getAttribute?.("value"));
            push(element.getAttribute?.("data-value"));
            push(element.getAttribute?.("placeholder"));
            push(element.getAttribute?.("aria-placeholder"));
            push(element.getAttribute?.("data-placeholder"));
            push(element.getAttribute?.("aria-label"));
            push(element.getAttribute?.("title"));

            if (isNotionContentEditableElement(element)) {
                push(serializeContentEditableText(element));
            } else {
                push(getElementText(element));
                push(element.textContent);
            }

            const placeholder = genericNormalizeComposerText(getNotionComposerPlaceholderText(element), { trimTrailingEditorNewlines });
            for (const candidate of candidates) {
                if (!candidate) continue;
                if (placeholder && candidate === placeholder) continue;
                return candidate;
            }
            return "";
        }

        function collectNotionElementsAcrossOpenShadows(rootEl, selectors, { shouldIgnore = null, maxHosts = 2500 } = {}) {
            const ignore = typeof shouldIgnore === "function" ? shouldIgnore : null;
            const selectorList = Array.isArray(selectors) ? selectors : [selectors];
            const trimmedSelectors = selectorList.map(selector => String(selector || "").trim()).filter(Boolean);
            const results = [];
            const seen = new Set();
            const stack = [];
            const push = (node) => {
                if (node && !seen.has(node)) stack.push(node);
            };

            push(rootEl || document);

            let remainingHosts = Math.max(0, Number(maxHosts) || 0);
            while (stack.length && remainingHosts > 0) {
                const node = stack.pop();
                if (!node || seen.has(node)) continue;
                seen.add(node);
                if (ignore && ignore(node)) continue;
                if (typeof node.querySelectorAll !== "function") continue;

                for (const selector of trimmedSelectors) {
                    try {
                        if (typeof node.matches === "function" && node.matches(selector)) results.push(node);
                    } catch { }
                    try {
                        results.push(...Array.from(node.querySelectorAll(selector)));
                    } catch { }
                }

                let descendants = null;
                try { descendants = node.querySelectorAll("*"); } catch { descendants = null; }
                if (!descendants) continue;
                for (const el of descendants) {
                    if (!el) continue;
                    if (ignore && ignore(el)) continue;
                    const shadowRoot = el.shadowRoot;
                    if (!shadowRoot) continue;
                    if (remainingHosts-- <= 0) break;
                    if (!seen.has(shadowRoot)) stack.push(shadowRoot);
                }
            }

            return Array.from(new Set(results.filter(element => element && (!ignore || !ignore(element)))));
        }

        function getRuntimeNow(runtime = null) {
            if (runtime && typeof runtime.now === "function") {
                try { return Number(runtime.now()) || Date.now(); } catch { }
            }
            return Date.now();
        }

        async function runtimeSleep(runtime = null, ms = 0, { shouldCancel = null } = {}) {
            const cancelFn = typeof shouldCancel === "function" ? shouldCancel : null;
            if (cancelFn && cancelFn()) return false;
            if (runtime && typeof runtime.waitIfPaused === "function") {
                try {
                    const pauseOk = await runtime.waitIfPaused();
                    if (pauseOk === false) return false;
                } catch {
                    return false;
                }
            }
            if (runtime && typeof runtime.sleep === "function") {
                try {
                    const result = await runtime.sleep(ms);
                    return result !== false && !(cancelFn && cancelFn());
                } catch {
                    return false;
                }
            }
            await sleep(Math.max(0, Number(ms) || 0));
            return !(cancelFn && cancelFn());
        }

        function isNotionComposerConnected(element) {
            if (!element) return false;
            try {
                if (typeof element.isConnected === "boolean") return element.isConnected;
            } catch { }
            try { return !!document.contains(element); } catch { return false; }
        }

        function getNotionComposerSearchText(element) {
            if (!element) return "";
            const parts = [];
            const push = (value, maxLength = 320) => {
                const text = String(value ?? "").trim();
                if (!text) return;
                parts.push(text.slice(0, Math.max(40, Number(maxLength) || 320)));
            };
            const pushNode = (node, { includeVisibleText = true } = {}) => {
                if (!node || typeof node.getAttribute !== "function") return;
                push(node.getAttribute("role"));
                push(node.getAttribute("placeholder"));
                push(node.getAttribute("aria-placeholder"));
                push(node.getAttribute("data-placeholder"));
                push(node.getAttribute("aria-label"));
                push(node.getAttribute("aria-valuetext"));
                push(node.getAttribute("title"));
                push(node.getAttribute("data-testid"));
                if (includeVisibleText) {
                    push(getElementText(node), 420);
                    push(getNotionElementOwnText(node), 420);
                }
            };

            pushNode(element);
            let parent = null;
            try { parent = element.parentElement || null; } catch { parent = null; }
            for (let depth = 0; parent && depth < 3; depth += 1) {
                pushNode(parent, { includeVisibleText: true });
                parent = parent.parentElement || null;
            }
            return parts.join(" ");
        }

        function isNotionEditableComposerElement(element, { requireVisible = true } = {}) {
            if (!element) return false;
            if (isInsideQuickInputOverlay(element) || isInsideShortcutUi(element)) return false;
            if (!isNotionComposerConnected(element)) return false;
            if (requireVisible && !isVisibleElement(element)) return false;
            if (isElementDisabled(element)) return false;
            const tag = String(element.tagName || "").toUpperCase();
            const editable = tag === "TEXTAREA" ||
                tag === "INPUT" ||
                isNotionContentEditableElement(element) ||
                isNotionRoleTextboxElement(element);
            if (!editable) return false;
            try {
                if (element.getAttribute?.("aria-hidden") === "true") return false;
                if (element.closest?.('[role="menu"], [role="dialog"]:not([data-open])')) return false;
            } catch { }
            return true;
        }

        function scoreNotionComposerCandidate(element) {
            if (!element) return -Infinity;
            const text = normalizeNotionText(getNotionComposerSearchText(element));
            const rect = getElementRect(element);
            let score = 0;

            if (textLooksLikeComposerPrompt(text)) score += 420;
            if (text.includes("notion ai")) score += 180;
            if (text.includes("do anything with ai")) score += 220;
            if (text.includes("submit ai message")) score += 120;
            if (text.includes("ask") || text.includes("message") || text.includes("prompt")) score += 80;
            if (text.includes("输入") || text.includes("提问")) score += 80;
            if (isNotionRoleTextboxElement(element)) score += 160;
            if (isNotionContentEditableElement(element)) score += 120;
            if (hasNotionValueProperty(element)) score += 80;
            if (text.includes("search") && !textLooksLikeComposerPrompt(text)) score -= 180;
            try {
                if (element.closest?.("form")) score += 60;
                if (element.closest?.("[data-testid*='chat' i], [data-testid*='composer' i], [data-testid*='prompt' i]")) score += 80;
            } catch { }
            if (rect) {
                const viewport = getViewportSize();
                if (rect.width >= 260) score += 60;
                if (rect.height >= 28 && rect.height <= 280) score += 40;
                if (viewport.height > 0) score += Math.max(0, Math.min(120, (rect.bottom / viewport.height) * 120));
                if (viewport.width > 0) score += Math.max(0, Math.min(70, (rect.width / viewport.width) * 70));
            }
            return score;
        }

        function pickBestNotionComposerCandidate(candidates, { requireVisible = true } = {}) {
            let best = null;
            let bestScore = -Infinity;
            for (const candidate of Array.from(candidates || [])) {
                if (!isNotionEditableComposerElement(candidate, { requireVisible })) continue;
                const score = scoreNotionComposerCandidate(candidate);
                if (score > bestScore) {
                    best = candidate;
                    bestScore = score;
                }
            }
            return best;
        }

        function findNotionComposerInside(root, { requireVisible = true } = {}) {
            if (!root || typeof root.querySelectorAll !== "function") return null;
            const candidates = collectNotionElementsAcrossOpenShadows(root, NOTION_COMPOSER_SELECTORS, {
                shouldIgnore: element => isInsideQuickInputOverlay(element) || isInsideShortcutUi(element)
            });
            return pickBestNotionComposerCandidate(candidates, { requireVisible });
        }

        function resolveNotionComposerElement(element, { requireVisible = true } = {}) {
            if (isNotionEditableComposerElement(element, { requireVisible })) return element;

            const scopes = [];
            const seen = new Set();
            const pushScope = (scope) => {
                if (!scope || seen.has(scope)) return;
                seen.add(scope);
                scopes.push(scope);
            };

            try { pushScope(element?.closest?.("form") || null); } catch { }
            try { pushScope(element?.closest?.('[data-testid*="chat" i], [data-testid*="composer" i], [data-testid*="prompt" i]') || null); } catch { }
            try { pushScope(element?.parentElement || null); } catch { }
            pushScope(element);
            pushScope(findComposerRootElement());

            for (const scope of scopes) {
                const found = findNotionComposerInside(scope, { requireVisible });
                if (found) return found;
            }
            return null;
        }

        function findNotionComposerElement({ requireVisible = true } = {}) {
            const activeComposer = resolveNotionComposerElement(document.activeElement || null, { requireVisible });
            if (activeComposer) return activeComposer;

            const root = findComposerRootElement();
            const rootComposer = findNotionComposerInside(root, { requireVisible });
            if (rootComposer) return rootComposer;

            const candidates = collectNotionElementsAcrossOpenShadows(document, NOTION_COMPOSER_SELECTORS, {
                shouldIgnore: element => isInsideQuickInputOverlay(element) || isInsideShortcutUi(element),
                maxHosts: 4500
            });
            return pickBestNotionComposerCandidate(candidates, { requireVisible });
        }

        async function focusNotionComposer({ timeoutMs = 2500, intervalMs = 120, shouldCancel = null, runtime = null } = {}) {
            const cancelFn = typeof shouldCancel === "function" ? shouldCancel : null;
            const deadline = getRuntimeNow(runtime) + Math.max(0, Number(timeoutMs) || 0);
            let composer = findNotionComposerElement({ requireVisible: true });

            while (!composer && getRuntimeNow(runtime) < deadline) {
                if (cancelFn && cancelFn()) return null;
                const waitOk = await runtimeSleep(runtime, intervalMs, { shouldCancel: cancelFn });
                if (!waitOk) return null;
                composer = findNotionComposerElement({ requireVisible: true });
            }

            if (cancelFn && cancelFn()) return null;
            if (!composer) return null;
            try { composer.scrollIntoView?.({ block: "center" }); } catch { }
            try { composer.focus?.({ preventScroll: true }); } catch {
                try { composer.focus?.(); } catch { }
            }
            try { simulateClickElement(composer, { nativeFallback: true }); } catch { }
            const settleOk = await runtimeSleep(runtime, 20, { shouldCancel: cancelFn });
            if (!settleOk) return null;
            return composer;
        }

        function serializeContentEditableText(element) {
            if (!element) return "";
            try {
                const cloneText = String(element.innerText || "");
                if (cloneText) return cloneText;
            } catch { }
            try { return String(element.textContent || ""); } catch { return ""; }
        }

        function getNotionComposerPlaceholderText(element) {
            if (!element || typeof element.getAttribute !== "function") return "";
            for (const attr of ["placeholder", "aria-placeholder", "data-placeholder"]) {
                try {
                    const value = String(element.getAttribute(attr) || "").trim();
                    if (value) return value;
                } catch { }
            }
            return "";
        }

        function getNotionComposerTextValue(element, { trimTrailingEditorNewlines = false } = {}) {
            if (!element) return "";
            const candidates = [];
            const push = (value) => {
                const normalized = genericNormalizeComposerText(String(value ?? ""), { trimTrailingEditorNewlines });
                if (normalized) candidates.push(normalized);
            };

            if (hasNotionValueProperty(element)) {
                try { push(element.value); } catch { }
            }
            push(element.getAttribute?.("aria-valuetext"));
            push(element.getAttribute?.("data-value"));

            if (isNotionContentEditableElement(element)) {
                push(serializeContentEditableText(element));
            } else if (isNotionRoleTextboxElement(element)) {
                try { push(element.innerText); } catch { }
                try { push(element.textContent); } catch { }
            }

            const placeholder = genericNormalizeComposerText(getNotionComposerPlaceholderText(element), { trimTrailingEditorNewlines });
            for (const candidate of candidates) {
                if (!candidate) continue;
                if (placeholder && candidate === placeholder) continue;
                if (placeholder && candidate.startsWith(`${placeholder}\n`)) {
                    return candidate.slice(placeholder.length).replace(/^\n+/, "");
                }
                if (placeholder && candidate.startsWith(placeholder) && candidate.length > placeholder.length) {
                    return candidate.slice(placeholder.length).trimStart();
                }
                return candidate;
            }
            return "";
        }

        function getNotionElementDepthWithin(element, root) {
            if (!element || !root || element === root) return 0;
            let depth = 0;
            let node = element;
            while (node && node !== root && node.nodeType === 1 && depth < 40) {
                depth += 1;
                try {
                    node = node.parentElement || node.getRootNode?.()?.host || null;
                } catch {
                    node = null;
                }
            }
            return node === root ? depth : 0;
        }

        function scoreNotionComposerTextTarget(element, root = null) {
            if (!element) return -Infinity;
            let score = 0;
            const textValue = getNotionComposerTextValue(element, { trimTrailingEditorNewlines: true });
            const searchText = normalizeNotionText(getNotionComposerSearchText(element));
            const rect = getElementRect(element);

            if (textValue) score += 900 + Math.min(500, textValue.length);
            if (isNotionNativeTextInputElement(element)) score += 650;
            if (hasNotionValueProperty(element)) score += 520;
            if (isNotionContentEditableElement(element)) score += 440;
            if (isNotionRoleTextboxElement(element)) score += 260;
            if (String(element.getAttribute?.("aria-multiline") || "").toLowerCase() === "true") score += 180;
            if (String(element.getAttribute?.("contenteditable") || "").toLowerCase() === "plaintext-only") score += 180;
            if (element.getAttribute?.("data-placeholder") || element.getAttribute?.("aria-placeholder") || element.getAttribute?.("placeholder")) score += 120;
            if (textLooksLikeComposerPrompt(searchText)) score += 180;
            if (searchText.includes("do anything with ai")) score += 160;

            if (searchText.includes("submit ai message")) score -= 80;
            if (searchText.includes("give context")) score -= 70;
            if (searchText.includes("all sources")) score -= 70;
            if (searchText.includes("start voice recording")) score -= 70;

            if (isVisibleElement(element)) score += 80;
            else if (!textValue) score -= 120;

            if (root && element !== root) {
                try {
                    if (root.contains?.(element)) score += 120 + Math.min(160, getNotionElementDepthWithin(element, root) * 14);
                } catch { }
            }

            if (rect) {
                if (rect.width >= 180) score += 40;
                if (rect.height >= 18 && rect.height <= 260) score += 30;
                if (isLikelyMainComposerRect(rect)) score += 70;
            }

            return score;
        }

        function getNotionComposerTextTargets(element, { requireVisible = false } = {}) {
            const targets = [];
            const scopes = [];
            const seenTargets = new Set();
            const seenScopes = new Set();
            const root = element || null;

            const pushTarget = (candidate) => {
                if (!candidate || seenTargets.has(candidate)) return;
                if (isInsideQuickInputOverlay(candidate) || isInsideShortcutUi(candidate)) return;
                if (!isNotionEditableComposerElement(candidate, { requireVisible })) return;
                seenTargets.add(candidate);
                targets.push(candidate);
            };

            const pushScope = (scope) => {
                if (!scope || seenScopes.has(scope)) return;
                const nodeType = Number(scope.nodeType || 0);
                if (!(nodeType === 1 || nodeType === 9 || nodeType === 11)) return;
                seenScopes.add(scope);
                scopes.push(scope);
            };

            let active = null;
            try { active = document.activeElement || null; } catch { active = null; }
            if (active && !isInsideQuickInputOverlay(active) && !isInsideShortcutUi(active)) {
                pushTarget(active);
                try { pushScope(active.parentElement || null); } catch { }
                try { pushScope(active.closest?.("form") || null); } catch { }
            }

            pushTarget(root);
            pushScope(root);
            try { pushScope(root?.parentElement || null); } catch { }
            try { pushScope(root?.closest?.("form") || null); } catch { }
            try { pushScope(root?.closest?.('[data-testid*="chat" i], [data-testid*="composer" i], [data-testid*="prompt" i], [data-testid*="unified-chat" i]') || null); } catch { }
            try {
                const rootNode = root?.getRootNode?.();
                pushScope(rootNode || null);
                pushScope(rootNode?.host || null);
            } catch { }
            pushScope(findNotionComposerContainer(root));
            pushScope(findComposerRootElement());

            for (const scope of scopes) {
                for (const candidate of collectNotionElementsAcrossOpenShadows(scope, NOTION_COMPOSER_SELECTORS, {
                    shouldIgnore: item => isInsideQuickInputOverlay(item) || isInsideShortcutUi(item),
                    maxHosts: 1800
                })) {
                    pushTarget(candidate);
                }
            }

            if (targets.length === 0) {
                const fallback = findNotionComposerElement({ requireVisible });
                pushTarget(fallback);
            }

            return targets.sort((a, b) => {
                const aScore = scoreNotionComposerTextTarget(a, root);
                const bScore = scoreNotionComposerTextTarget(b, root);
                if (aScore !== bScore) return bScore - aScore;
                const aDepth = getNotionElementDepthWithin(a, root);
                const bDepth = getNotionElementDepthWithin(b, root);
                if (aDepth !== bDepth) return bDepth - aDepth;
                const aRect = getElementRect(a);
                const bRect = getElementRect(b);
                return (bRect?.bottom || 0) - (aRect?.bottom || 0);
            });
        }

        function getNotionComposerPlainText(element, { trimTrailingEditorNewlines = false } = {}) {
            const composer = resolveNotionComposerElement(element, { requireVisible: false }) || findNotionComposerElement({ requireVisible: false });
            if (!composer) return "";
            const targets = getNotionComposerTextTargets(composer, { requireVisible: false });

            for (const target of targets) {
                const text = getNotionComposerTextValue(target, { trimTrailingEditorNewlines });
                if (text) return text;
            }

            for (const target of targets) {
                const selectedText = getNotionComposerSelectionTextValue(target, { trimTrailingEditorNewlines });
                if (selectedText) return selectedText;
            }

            if (!genericGetComposerText) return "";

            for (const target of targets) {
                const fallback = genericNormalizeComposerText(genericGetComposerText(target), { trimTrailingEditorNewlines });
                const placeholder = genericNormalizeComposerText(getNotionComposerPlaceholderText(target), { trimTrailingEditorNewlines });
                if (!fallback || (placeholder && fallback === placeholder)) continue;
                return fallback;
            }
            return "";
        }

        function getNotionTextObservationRoots(composerEl) {
            const roots = [];
            const seen = new Set();
            const pushRoot = (node) => {
                if (!node || seen.has(node)) return;
                const nodeType = Number(node?.nodeType) || 0;
                if (!(nodeType === 1 || nodeType === 9 || nodeType === 11)) return;
                seen.add(node);
                roots.push(node);
            };
            const composer = resolveNotionComposerElement(composerEl, { requireVisible: false }) || composerEl || findNotionComposerElement({ requireVisible: false });
            pushRoot(composer);
            for (const target of getNotionComposerTextTargets(composer, { requireVisible: false })) {
                pushRoot(target);
                try { pushRoot(target?.parentElement || null); } catch { }
                try { pushRoot(target?.closest?.("form") || null); } catch { }
            }
            try { pushRoot(composer?.parentElement || null); } catch { }
            try { pushRoot(composer?.closest?.("form") || null); } catch { }
            try {
                const root = composer?.getRootNode?.();
                pushRoot(root || null);
                pushRoot(root?.host || null);
            } catch { }
            pushRoot(findComposerRootElement());
            pushRoot(document.body || document);
            return roots;
        }

        function selectNotionComposerContent(composer) {
            if (!composer) return false;
            const tag = String(composer.tagName || "").toUpperCase();
            try { composer.focus?.(); } catch { }
            if (tag === "TEXTAREA" || tag === "INPUT") {
                try {
                    composer.setSelectionRange?.(0, String(composer.value || "").length);
                    return true;
                } catch { }
            }
            try {
                if (typeof composer.select === "function") {
                    composer.select();
                    return true;
                }
            } catch { }
            if (isNotionContentEditableElement(composer)) {
                try {
                    const selection = document.defaultView?.getSelection?.() || window.getSelection?.();
                    const range = document.createRange();
                    range.selectNodeContents(composer);
                    selection.removeAllRanges();
                    selection.addRange(range);
                    return true;
                } catch { }
            }
            if (isNotionRoleTextboxElement(composer)) {
                try {
                    const active = document.activeElement || null;
                    const activeInComposer = active && (active === composer || composer.contains?.(active));
                    if (activeInComposer && document.execCommand?.("selectAll", false, null)) return true;
                } catch { }
                try {
                    if (document.execCommand?.("selectAll", false, null)) return true;
                } catch { }
            }
            return false;
        }

        function textLooksLikeNotionPageSelection(value) {
            const text = normalizeNotionText(value);
            if (!text) return false;
            let hits = 0;
            if (text.includes("how can i help you today")) hits += 1;
            if (text.includes("recent chats")) hits += 1;
            if (text.includes("suggested")) hits += 1;
            if (text.includes("new chat")) hits += 1;
            if (text.includes("notion ai")) hits += 1;
            return hits >= 2;
        }

        function getNotionSelectionObject(composer) {
            try {
                const doc = composer?.ownerDocument || document;
                return doc.defaultView?.getSelection?.() || window.getSelection?.() || null;
            } catch {
                return null;
            }
        }

        function collapseNotionComposerSelectionToEnd(composer) {
            if (!composer) return false;
            const selection = getNotionSelectionObject(composer);
            if (!selection || selection.rangeCount <= 0) return false;
            try {
                selection.collapseToEnd();
                return true;
            } catch { }
            try {
                const range = selection.getRangeAt(selection.rangeCount - 1);
                range.collapse(false);
                selection.removeAllRanges();
                selection.addRange(range);
                return true;
            } catch {
                return false;
            }
        }

        function getNotionComposerSelectionTextValue(element, { trimTrailingEditorNewlines = false } = {}) {
            const composer = element || null;
            if (!composer) return "";
            if (!(isNotionContentEditableElement(composer) || isNotionRoleTextboxElement(composer))) return "";

            try { composer.focus?.({ preventScroll: true }); } catch {
                try { composer.focus?.(); } catch { }
            }
            try { simulateClickElement(composer, { nativeFallback: true }); } catch { }

            if (!selectNotionComposerContent(composer)) return "";

            let selectedText = "";
            try {
                selectedText = String(getNotionSelectionObject(composer)?.toString?.() || "");
            } catch {
                selectedText = "";
            }

            collapseNotionComposerSelectionToEnd(composer);

            const normalized = genericNormalizeComposerText(selectedText, { trimTrailingEditorNewlines });
            const placeholder = genericNormalizeComposerText(getNotionComposerPlaceholderText(composer), { trimTrailingEditorNewlines });
            if (!normalized || (placeholder && normalized === placeholder)) return "";
            if (textLooksLikeNotionPageSelection(normalized)) return "";
            return normalized;
        }

        function dispatchNotionComposerInput(composer, { inputType = "insertText", data = null } = {}) {
            if (!composer) return false;
            let dispatched = false;
            try {
                composer.dispatchEvent(new InputEvent("beforeinput", { bubbles: true, cancelable: true, composed: true, inputType, data }));
                dispatched = true;
            } catch { }
            try {
                composer.dispatchEvent(new InputEvent("input", { bubbles: true, cancelable: false, composed: true, inputType, data }));
                dispatched = true;
            } catch {
                try {
                    composer.dispatchEvent(new Event("input", { bubbles: true, cancelable: false, composed: true }));
                    dispatched = true;
                } catch { }
            }
            try { composer.dispatchEvent(new Event("change", { bubbles: true, composed: true })); } catch { }
            return dispatched;
        }

        function setNotionComposerNativeValue(composer, text) {
            if (!composer) return false;
            const value = String(text ?? "");
            const setter = getNotionNativeValueSetter(composer);
            if (setter) {
                try {
                    setter.call(composer, value);
                    return true;
                } catch { }
            }
            if (!isNotionNativeTextInputElement(composer)) return false;
            try {
                composer.value = value;
                return true;
            } catch {
                return false;
            }
        }

        function tryPasteNotionText(composer, text) {
            const dt = createNotionDataTransfer({ text });
            if (!dt || !composer) return false;
            let fired = false;
            fired = dispatchBeforeInputFromPaste(composer, dt) || fired;
            fired = dispatchPasteEvent(composer, dt) || fired;
            fired = dispatchInputFromPaste(composer, dt) || fired;
            return fired;
        }

        function normalizeNotionCommittedText(value) {
            return genericNormalizeComposerText(String(value ?? ""), { trimTrailingEditorNewlines: true });
        }

        function stripNotionMarkdownFenceMarkerLines(value) {
            return String(value ?? "")
                .replace(/\r\n?/g, "\n")
                .split("\n")
                .filter(line => !/^\s*```/.test(String(line ?? "")))
                .join("\n");
        }

        function stripNotionInlineCodeMarkers(value) {
            let text = String(value ?? "");
            let previous = "";
            const inlineCodeMarkerPattern = /(^|[^`])(`{1,2})([^`\n]+)\2(?=[^`]|$)/g;
            while (text !== previous) {
                previous = text;
                text = text.replace(inlineCodeMarkerPattern, "$1$3");
            }
            return text;
        }

        function getNotionCodeMarkerTextVariants(value) {
            const source = normalizeNotionCommittedText(value);
            const variants = [];
            const seen = new Set([source]);
            const pushVariant = (nextValue, { requiresRenderedCode = false } = {}) => {
                const normalized = normalizeNotionCommittedText(nextValue);
                if (!normalized || seen.has(normalized)) return;
                seen.add(normalized);
                variants.push({ text: normalized, requiresRenderedCode: !!requiresRenderedCode });
            };

            if (!source.includes("`")) return variants;

            const withoutFenceMarkers = source.includes("```")
                ? stripNotionMarkdownFenceMarkerLines(source)
                : source;
            pushVariant(withoutFenceMarkers);

            const withoutInlineMarkers = stripNotionInlineCodeMarkers(withoutFenceMarkers);
            pushVariant(withoutInlineMarkers);

            if (withoutInlineMarkers.includes("`")) {
                pushVariant(withoutInlineMarkers.replace(/`/g, ""), { requiresRenderedCode: true });
            }

            return variants;
        }

        function hasNotionRenderedCodeMarkup(composerEl) {
            const composer = resolveNotionComposerElement(composerEl, { requireVisible: false }) || composerEl || null;
            if (!composer || typeof composer.querySelector !== "function") return false;

            try {
                if (composer.querySelector([
                    "pre",
                    "code",
                    "[data-content-type*='code' i]",
                    "[data-block-type*='code' i]",
                    "[data-node-type*='code' i]",
                    "[data-testid*='code' i]",
                    "[class*='code' i]"
                ].join(","))) {
                    return true;
                }
            } catch { }

            let elements = [];
            try { elements = Array.from(composer.querySelectorAll("*")).slice(0, 500); } catch { elements = []; }
            for (const element of elements) {
                if (!normalizeNotionCommittedText(element?.textContent || "")) continue;
                try {
                    const fontFamily = String(globalThis.getComputedStyle?.(element)?.fontFamily || "").toLowerCase();
                    if (
                        fontFamily.includes("monospace") ||
                        fontFamily.includes("menlo") ||
                        fontFamily.includes("consolas") ||
                        fontFamily.includes("sfmono") ||
                        fontFamily.includes("monaco")
                    ) {
                        return true;
                    }
                } catch { }
            }

            return false;
        }

        function isNotionTextCommitMatch({ composer, expectedText, actualText, normalizeText = null } = {}) {
            const normalize = typeof normalizeText === "function" ? normalizeText : normalizeNotionCommittedText;
            const expected = normalize(expectedText);
            const actual = normalize(actualText);
            if (actual === expected) return true;
            if (!expected.includes("`")) return false;

            const renderedCode = hasNotionRenderedCodeMarkup(composer);
            return getNotionCodeMarkerTextVariants(expected).some(variant => {
                if (actual !== variant.text) return false;
                return !variant.requiresRenderedCode || renderedCode;
            });
        }

        function isNotionComposerTextMatch(composer, text) {
            const actual = getNotionComposerPlainText(composer, { trimTrailingEditorNewlines: true });
            return isNotionTextCommitMatch({
                composer,
                expectedText: text,
                actualText: actual,
                normalizeText: normalizeNotionCommittedText
            });
        }

        async function waitForNotionTextMutationSettle(composer, text) {
            if (isNotionComposerTextMatch(composer, text)) return true;
            await sleep(120);
            return isNotionComposerTextMatch(composer, text);
        }

        function getFocusedNotionComposerTarget(fallbackComposer) {
            const fallback = fallbackComposer || null;
            let active = null;
            try { active = document.activeElement || null; } catch { active = null; }
            if (!active || active === fallback || isInsideQuickInputOverlay(active) || isInsideShortcutUi(active)) return fallback;

            const activeComposer = isNotionEditableComposerElement(active, { requireVisible: false })
                ? active
                : resolveNotionComposerElement(active, { requireVisible: false });
            if (!activeComposer) return fallback;
            if (!fallback) return activeComposer;

            try {
                if (fallback.contains?.(activeComposer) || activeComposer.contains?.(fallback)) return activeComposer;
            } catch { }

            const container = findNotionComposerContainer(fallback);
            try {
                if (container?.contains?.(activeComposer)) return activeComposer;
            } catch { }
            return fallback;
        }

        async function trySetNotionInputTarget(composer, value) {
            if (!composer) return false;
            const text = String(value ?? "");
            const inputType = text ? "insertReplacementText" : "deleteContentBackward";
            const isContentEditable = isNotionContentEditableElement(composer);
            const isRoleTextbox = isNotionRoleTextboxElement(composer);
            const hasNativeValue = hasNotionValueProperty(composer);
            const canUseEditing = isContentEditable || isRoleTextbox;

            try { composer.focus?.({ preventScroll: true }); } catch {
                try { composer.focus?.(); } catch { }
            }
            try { simulateClickElement(composer, { nativeFallback: true }); } catch { }

            if (isNotionComposerTextMatch(composer, text)) return true;

            if (hasNativeValue && genericSetInputValue && genericSetInputValue(composer, text) && (await waitForNotionTextMutationSettle(composer, text))) {
                return true;
            }

            if (hasNativeValue) {
                if (setNotionComposerNativeValue(composer, text)) {
                    dispatchNotionComposerInput(composer, { inputType, data: text || null });
                    if (await waitForNotionTextMutationSettle(composer, text)) return true;
                }
            }

            if (canUseEditing) {
                selectNotionComposerContent(composer);
                try {
                    const command = text ? "insertText" : "delete";
                    if (document.execCommand?.(command, false, text)) {
                        dispatchNotionComposerInput(composer, { inputType, data: text || null });
                        if (await waitForNotionTextMutationSettle(composer, text)) return true;
                    }
                } catch { }
            }

            if (text && canUseEditing) {
                selectNotionComposerContent(composer);
                if (tryPasteNotionText(composer, text)) {
                    dispatchNotionComposerInput(composer, { inputType: "insertFromPaste", data: text });
                    if (await waitForNotionTextMutationSettle(composer, text)) return true;
                }
            }

            return false;
        }

        async function setNotionInputValue(composerEl, value) {
            const foundComposer = resolveNotionComposerElement(composerEl, { requireVisible: false }) || findNotionComposerElement({ requireVisible: true });
            if (!foundComposer) return false;
            const text = String(value ?? "");

            try { foundComposer.focus?.({ preventScroll: true }); } catch {
                try { foundComposer.focus?.(); } catch { }
            }
            try { simulateClickElement(foundComposer, { nativeFallback: true }); } catch { }

            const focusedComposer = getFocusedNotionComposerTarget(foundComposer) || foundComposer;
            for (const target of getNotionComposerTextTargets(focusedComposer, { requireVisible: false })) {
                if (await trySetNotionInputTarget(target, text)) return true;
            }

            return false;
        }

        async function clearNotionInputValue(composerEl) {
            const composer = resolveNotionComposerElement(composerEl, { requireVisible: false }) || findNotionComposerElement({ requireVisible: true });
            if (!composer) return false;
            if (genericClearInputValue) {
                for (const target of getNotionComposerTextTargets(composer, { requireVisible: false })) {
                    if (!hasNotionValueProperty(target)) continue;
                    if (genericClearInputValue(target) && (await waitForNotionTextMutationSettle(target, ""))) return true;
                }
            }
            return setNotionInputValue(composer, "");
        }

        function createNotionDataTransfer({ text = "", files = [] } = {}) {
            if (typeof DataTransfer !== "function") return null;
            try {
                const dt = new DataTransfer();
                const plainText = String(text ?? "");
                if (plainText) {
                    try { dt.setData("text/plain", plainText); } catch { }
                }
                for (const file of Array.from(files || [])) {
                    if (!(file instanceof File)) continue;
                    try { dt.items.add(file); } catch { }
                }
                try { dt.effectAllowed = "copy"; } catch { }
                try { dt.dropEffect = "copy"; } catch { }
                return dt;
            } catch {
                return null;
            }
        }

        function scoreNotionComposerContainerCandidate(element, composerEl, index = 0) {
            if (!element || element === document || element === document.body || element.nodeType !== 1) return -Infinity;
            if (isInsideQuickInputOverlay(element) || isInsideShortcutUi(element) || !isVisibleElement(element)) return -Infinity;
            const rect = getElementRect(element);
            if (!rect || rect.width < 260 || rect.height < 36) return -Infinity;

            const composerRect = getElementRect(composerEl);
            if (composerRect) {
                const containsComposer = rect.left <= composerRect.left + 4 &&
                    rect.right >= composerRect.right - 4 &&
                    rect.top <= composerRect.top + 4 &&
                    rect.bottom >= composerRect.bottom - 4;
                if (!containsComposer) return -Infinity;
                if (rect.width + 8 < composerRect.width || rect.height + 8 < composerRect.height) return -Infinity;
            }

            const tag = String(element.tagName || "").toLowerCase();
            const dataTestId = String(element.getAttribute?.("data-testid") || "").toLowerCase();
            const text = normalizeNotionText(getElementSearchText(element));
            const viewport = getViewportSize();
            let score = 0;

            if (tag === "form") score += 220;
            if (dataTestId.includes("composer") || dataTestId.includes("prompt")) score += 220;
            if (dataTestId.includes("unified-chat")) score += 140;
            if (dataTestId.includes("chat")) score += 80;
            if (textLooksLikeComposerPrompt(text)) score += 180;
            if (text.includes("do anything with ai")) score += 120;
            if (composerEl && element.contains?.(composerEl)) score += 100;
            if (safeQueryAll(element, "button, [role='button']").length > 0) score += 45;

            if (composerRect) {
                const extraHeight = rect.height - composerRect.height;
                if (extraHeight >= 24) score += 140 + Math.min(140, extraHeight);
                else score += 35;
            }
            if (rect.width >= 320) score += 60;
            if (rect.height >= 80 && rect.height <= 560) score += 170;
            else if (rect.height > 560) score -= Math.min(700, rect.height - 560);

            if (viewport.height > 0 && rect.height > viewport.height * 0.72) score -= 420;
            if (viewport.width > 0 && viewport.height > 0 && rect.width > viewport.width * 0.96 && rect.height > viewport.height * 0.55) score -= 420;
            return score - Math.max(0, Number(index) || 0) * 3;
        }

        function findNotionComposerContainer(composerEl) {
            const composer = resolveNotionComposerElement(composerEl, { requireVisible: false }) || composerEl || null;
            const scopes = [];
            const push = (node) => {
                if (node && !scopes.includes(node)) scopes.push(node);
            };
            try { push(composer?.closest?.("form") || null); } catch { }
            try { push(composer?.closest?.('[data-testid*="chat" i], [data-testid*="composer" i], [data-testid*="prompt" i], [data-testid*="unified-chat" i]') || null); } catch { }
            try {
                let node = composer?.parentElement || null;
                for (let depth = 0; node && depth < 8; depth += 1) {
                    push(node);
                    node = node.parentElement || null;
                }
            } catch { }
            try {
                const root = composer?.getRootNode?.();
                push(root || null);
                push(root?.host || null);
                push(root?.host?.closest?.("form") || null);
                push(root?.host?.closest?.('[data-testid*="chat" i], [data-testid*="composer" i], [data-testid*="prompt" i], [data-testid*="unified-chat" i]') || null);
            } catch { }
            push(findComposerRootElement());
            push(composer);

            const ranked = scopes
                .map((scope, index) => ({
                    scope,
                    score: scoreNotionComposerContainerCandidate(scope, composer, index)
                }))
                .filter(item => Number.isFinite(item.score))
                .sort((a, b) => b.score - a.score);
            return ranked[0]?.scope || scopes.find(Boolean) || document.body || document;
        }

        function getNotionAttachmentScope(containerEl) {
            const container = containerEl || findNotionComposerContainer();
            if (!container) return document.body || document;
            return container;
        }

        function isLikelyNotionAttachmentPreviewElement(element) {
            if (!element) return false;
            const dataTestId = String(element.getAttribute?.("data-testid") || "").toLowerCase();
            const className = String(element.getAttribute?.("class") || "").toLowerCase();
            return dataTestId.includes("attachment") ||
                dataTestId.includes("file-preview") ||
                dataTestId.includes("upload-preview") ||
                className.includes("attachment") ||
                className.includes("file-preview") ||
                className.includes("upload-preview");
        }

        function isLikelyNotionAttachmentImage(element) {
            if (!element || String(element.tagName || "").toLowerCase() !== "img") return false;
            const src = String(element.getAttribute?.("src") || "").trim();
            if (!src) return false;
            if (/^blob:|^data:image\//i.test(src)) return true;
            if (!/^(?:https?:)?\/\//i.test(src)) return false;

            const rect = getElementRect(element);
            if (!rect) return false;
            const minSide = Math.min(rect.width, rect.height);
            const maxSide = Math.max(rect.width, rect.height);
            if (minSide < 32 || maxSide > 360 || rect.width * rect.height < 1200) return false;

            const label = normalizeNotionText(getElementSearchText(element));
            if (/\b(?:avatar|favicon|logo|icon)\b/.test(label) && maxSide <= 72) return false;
            return true;
        }

        function isNotionAttachmentActionElement(element) {
            if (!element) return false;
            const tag = String(element.tagName || "").toLowerCase();
            const role = String(element.getAttribute?.("role") || "").toLowerCase();
            const isActionElement = tag === "button" || role === "button";
            const text = normalizeNotionText(getElementSearchText(element));
            const dataTestId = String(element.getAttribute?.("data-testid") || "").toLowerCase();
            const className = String(element.getAttribute?.("class") || "").toLowerCase();
            const haystack = `${text} ${dataTestId} ${className}`;

            if (haystack.includes("remove attachment") || haystack.includes("remove file") || haystack.includes("remove image")) return true;
            if (haystack.includes("delete attachment") || haystack.includes("delete file") || haystack.includes("delete image")) return true;
            if (haystack.includes("dismiss attachment") || haystack.includes("dismiss file") || haystack.includes("dismiss image")) return true;
            if (haystack.includes("cancel upload") || haystack.includes("remove upload") || haystack.includes("delete upload")) return true;
            if (haystack.includes("移除") || haystack.includes("删除") || haystack.includes("取消") || haystack.includes("关闭")) return true;
            if (!isActionElement) return false;
            return /\b(?:remove|delete|dismiss|cancel|close)\b/.test(haystack) &&
                /\b(?:attachment|file|image|upload|preview)\b/.test(haystack);
        }

        function isLikelyNotionAttachmentCard(element, scope) {
            if (!element || element === scope || element === document || element === document.body) return false;
            if (isInsideQuickInputOverlay(element) || isInsideShortcutUi(element) || !isVisibleElement(element)) return false;
            const images = safeQueryAll(element, "img").filter(isLikelyNotionAttachmentImage);
            if (isLikelyNotionAttachmentPreviewElement(element)) return images.length <= 1;

            const rect = getElementRect(element);
            if (!rect || rect.width > 520 || rect.height > 320) return false;
            if (images.length !== 1) return false;
            const actions = safeQueryAll(element, "button, [role='button']").filter(isNotionAttachmentActionElement);
            if (actions.length > 0) return true;
            return Math.min(rect.width, rect.height) >= 36 && Math.max(rect.width, rect.height) <= 380;
        }

        function findNotionAttachmentCardElement(element, scope) {
            if (!element) return null;
            let node = element;
            let depth = 0;
            while (node && node.nodeType === 1 && depth < 8) {
                if (isLikelyNotionAttachmentCard(node, scope)) return node;
                if (node === scope || node === document.body) break;
                node = node.parentElement;
                depth += 1;
            }
            return isLikelyNotionAttachmentImage(element) ? element : null;
        }

        function isNotionAttachmentMarker(element) {
            if (!element || isInsideQuickInputOverlay(element) || isInsideShortcutUi(element) || !isVisibleElement(element)) return false;
            const tag = String(element.tagName || "").toLowerCase();
            if (tag === "img") {
                return isLikelyNotionAttachmentImage(element);
            }
            if (isNotionAttachmentActionElement(element)) return true;
            if (isLikelyNotionAttachmentPreviewElement(element)) return true;
            return false;
        }

        function getNotionAttachmentSnapshot(containerEl = null) {
            const scope = getNotionAttachmentScope(containerEl);
            const selectors = [
                "img",
                "img[src^='blob:']",
                "img[src^='data:image/']",
                "[data-testid*='attachment' i]",
                "[data-testid*='file-preview' i]",
                "[data-testid*='upload-preview' i]",
                "[class*='attachment' i]",
                "[class*='file-preview' i]",
                "[class*='upload-preview' i]",
                "button[aria-label*='remove attachment' i]",
                "button[aria-label*='remove file' i]",
                "button[aria-label*='remove image' i]",
                "button[aria-label*='delete attachment' i]",
                "button[aria-label*='delete file' i]",
                "button[aria-label*='delete image' i]",
                "button[aria-label*='dismiss' i]",
                "button[aria-label*='cancel upload' i]",
                "button[aria-label*='close' i]",
                "button[title*='remove attachment' i]",
                "button[title*='remove file' i]",
                "button[title*='remove image' i]",
                "button[title*='delete attachment' i]",
                "button[title*='delete file' i]",
                "button[title*='delete image' i]",
                "button[title*='dismiss' i]",
                "button[title*='cancel upload' i]",
                "button[title*='close' i]",
                "[role='button'][aria-label*='remove attachment' i]",
                "[role='button'][aria-label*='remove file' i]",
                "[role='button'][aria-label*='remove image' i]",
                "[role='button'][aria-label*='delete attachment' i]",
                "[role='button'][aria-label*='delete file' i]",
                "[role='button'][aria-label*='delete image' i]",
                "[role='button'][aria-label*='dismiss' i]",
                "[role='button'][aria-label*='cancel upload' i]",
                "[role='button'][aria-label*='close' i]",
                "button[aria-label*='移除' i]",
                "button[aria-label*='删除' i]",
                "button[aria-label*='取消' i]"
            ].join(", ");
            const markers = collectNotionElementsAcrossOpenShadows(scope, selectors, {
                shouldIgnore: element => isInsideQuickInputOverlay(element) || isInsideShortcutUi(element)
            }).filter(isNotionAttachmentMarker);

            const groups = new Map();
            for (const marker of markers) {
                if (!marker) continue;
                const card = findNotionAttachmentCardElement(marker, scope);
                const markerTag = String(marker.tagName || "").toLowerCase();
                const markerSrc = markerTag === "img" ? String(marker.getAttribute?.("src") || "").trim() : "";
                const key = card || (markerSrc ? `img:${markerSrc}` : marker);
                const existing = groups.get(key) || {
                    root: card || marker,
                    elements: [],
                    hasImage: false,
                    hasRemove: false,
                    hasPreview: false
                };
                existing.elements.push(marker);
                if (isLikelyNotionAttachmentImage(marker)) existing.hasImage = true;
                if (isNotionAttachmentActionElement(marker)) existing.hasRemove = true;
                if (isLikelyNotionAttachmentPreviewElement(marker)) existing.hasPreview = true;
                if (card && card !== marker) {
                    if (!existing.hasImage && safeQueryAll(card, "img").some(isLikelyNotionAttachmentImage)) existing.hasImage = true;
                    if (!existing.hasRemove && safeQueryAll(card, "button, [role='button']").some(isNotionAttachmentActionElement)) existing.hasRemove = true;
                    if (!existing.hasPreview && isLikelyNotionAttachmentPreviewElement(card)) existing.hasPreview = true;
                }
                groups.set(key, existing);
            }

            const unique = Array.from(groups.values());
            const imageCount = unique.filter(group => group.hasImage).length;
            const removeCount = unique.filter(group => group.hasRemove).length;
            const previewCount = unique.length;
            const attachmentCount = Math.max(imageCount, removeCount, previewCount);
            const fingerprint = unique
                .slice(0, 12)
                .map(group => {
                    const root = group.root || group.elements[0] || null;
                    const image = group.elements.find(isLikelyNotionAttachmentImage) ||
                        (root ? safeQueryAll(root, "img").find(isLikelyNotionAttachmentImage) : null);
                    const rect = getElementRect(root);
                    return [
                        String(root?.tagName || "").toLowerCase(),
                        String(root?.getAttribute?.("data-testid") || ""),
                        String(root?.getAttribute?.("aria-label") || ""),
                        String(image?.getAttribute?.("src") || "").slice(0, 80),
                        normalizeNotionText(getElementText(root)).slice(0, 80),
                        rect ? `${Math.round(rect.left)},${Math.round(rect.top)},${Math.round(rect.width)},${Math.round(rect.height)}` : ""
                    ].join(":");
                })
                .join("|");
            return {
                attachmentCount,
                imageCount,
                removeCount,
                previewCount,
                hasAttachment: attachmentCount > 0,
                fingerprint
            };
        }

        function getNotionAttachmentFingerprint(snapshot) {
            if (!snapshot) return "";
            return `${snapshot.attachmentCount || 0};${snapshot.imageCount || 0};${snapshot.removeCount || 0};${snapshot.previewCount || 0};${snapshot.fingerprint || ""}`;
        }

        function hasNotionAttachmentSnapshotChange(previousSnapshot, nextSnapshot) {
            const previousCount = Number(previousSnapshot?.attachmentCount || 0);
            const nextCount = Number(nextSnapshot?.attachmentCount || 0);
            if (nextCount > previousCount) return true;
            if (Number(nextSnapshot?.imageCount || 0) > Number(previousSnapshot?.imageCount || 0)) return true;
            if (Number(nextSnapshot?.removeCount || 0) > Number(previousSnapshot?.removeCount || 0)) return true;
            if (Number(nextSnapshot?.previewCount || 0) > Number(previousSnapshot?.previewCount || 0)) return true;
            return nextCount > 0 && getNotionAttachmentFingerprint(nextSnapshot) !== getNotionAttachmentFingerprint(previousSnapshot);
        }

        async function waitForNotionAttachmentChange(containerEl, previousSnapshot, { timeoutMs = 9000, intervalMs = 120, shouldCancel = null, runtime = null } = {}) {
            const observed = await waitForObservedState({
                resolveRoots: () => [containerEl || findNotionComposerContainer(), document.body || document],
                computeState: () => getNotionAttachmentSnapshot(containerEl),
                isSatisfied: (state) => hasNotionAttachmentSnapshotChange(previousSnapshot, state),
                timeoutMs,
                settleMs: 280,
                pollFallbackMs: Math.max(250, Number(intervalMs) || 120),
                attributeFilter: NOTION_ATTACHMENT_OBSERVED_ATTRIBUTES,
                shouldCancel,
                runtime
            });
            return {
                ok: !!observed?.ok,
                cancelled: !!observed?.cancelled,
                snapshot: observed?.state || getNotionAttachmentSnapshot(containerEl)
            };
        }

        function tryAttachNotionImageViaPaste(file, composerEl) {
            const dt = createNotionDataTransfer({ files: [file] });
            if (!dt || !composerEl) return false;
            let fired = false;
            fired = dispatchPasteEvent(composerEl, dt) || fired;
            fired = dispatchBeforeInputFromPaste(composerEl, dt) || fired;
            fired = dispatchInputFromPaste(composerEl, dt) || fired;
            return fired;
        }

        function tryAttachNotionImageViaDrop(file, composerEl) {
            const dt = createNotionDataTransfer({ files: [file] });
            if (!dt || !composerEl) return false;
            const container = findNotionComposerContainer(composerEl);
            const targets = [container || composerEl, composerEl, document, window];
            let fired = false;
            for (const target of Array.from(new Set(targets.filter(Boolean))).slice(0, 1)) {
                if (isInsideQuickInputOverlay(target)) continue;
                fired = dispatchDragEvent(target, "dragenter", dt) || fired;
                fired = dispatchDragEvent(target, "dragover", dt) || fired;
                fired = dispatchDragEvent(target, "drop", dt) || fired;
            }
            return fired;
        }

        function isNotionImageFileInputCandidate(input) {
            if (!input || String(input.type || "").toLowerCase() !== "file") return false;
            if (input.disabled) return false;
            const accept = String(input.getAttribute?.("accept") || input.accept || "").toLowerCase();
            return !accept ||
                accept.includes("image") ||
                accept.includes(".png") ||
                accept.includes(".jpg") ||
                accept.includes(".jpeg") ||
                accept.includes(".webp") ||
                accept.includes(".gif") ||
                accept.includes(".heic");
        }

        function collectNotionImageFileInputs(containerEl = null) {
            const container = containerEl || findNotionComposerContainer();
            const candidates = [];
            if (container) candidates.push(...collectFileInputs(container, { shouldIgnore: isInsideQuickInputOverlay }));
            candidates.push(...collectFileInputs(document, { shouldIgnore: isInsideQuickInputOverlay }));
            if (candidates.length === 0) {
                if (container) candidates.push(...collectFileInputsFromOpenShadows(container, { maxHosts: 1200, shouldIgnore: isInsideQuickInputOverlay }));
                candidates.push(...collectFileInputsFromOpenShadows(document, { maxHosts: 3500, shouldIgnore: isInsideQuickInputOverlay }));
            }
            return Array.from(new Set(candidates.filter(input => input && !isInsideQuickInputOverlay(input) && isNotionImageFileInputCandidate(input))))
                .sort((a, b) => {
                    const aAccept = String(a.getAttribute?.("accept") || a.accept || "").toLowerCase();
                    const bAccept = String(b.getAttribute?.("accept") || b.accept || "").toLowerCase();
                    const aSpecificImage = aAccept.includes("image");
                    const bSpecificImage = bAccept.includes("image");
                    return Number(bSpecificImage) - Number(aSpecificImage);
                });
        }

        function findNotionFileUploadMenuTrigger(composerEl) {
            const container = findNotionComposerContainer(composerEl);
            const selectors = [
                '[data-testid="unified-chat-plus-menu-button"]',
                '[data-testid*="plus-menu" i]',
                '[data-testid*="context" i][role="button"]',
                '[role="button"][aria-label*="give context" i]',
                '[role="button"][aria-label*="add context" i]',
                'button[aria-label*="give context" i]',
                'button[aria-label*="add context" i]'
            ].join(", ");
            const candidates = [];
            for (const scope of [container, document].filter(Boolean)) {
                candidates.push(...collectNotionElementsAcrossOpenShadows(scope, selectors, {
                    shouldIgnore: element => isInsideQuickInputOverlay(element) || isInsideShortcutUi(element)
                }));
            }
            return Array.from(new Set(candidates))
                .filter(element => element && isVisibleElement(element) && !isElementDisabled(element))
                .map(element => getClickableActionElement(element, container) || element)
                .find(Boolean) || null;
        }

        function findNotionFileUploadMenuItem() {
            const selectors = [
                '[role="menuitem"]',
                '[role="option"]',
                '[role="button"]',
                "button",
                '[tabindex]:not([tabindex="-1"])'
            ].join(", ");
            const roots = collectNotionElementsAcrossOpenShadows(document, [
                '[role="menu"]',
                '[role="dialog"]',
                '[data-radix-menu-content]',
                '[data-floating-ui-portal]'
            ], {
                shouldIgnore: element => isInsideQuickInputOverlay(element) || isInsideShortcutUi(element)
            }).filter(isVisibleElement);
            const candidates = [];
            for (const root of roots.length ? roots : [document]) {
                candidates.push(...collectNotionElementsAcrossOpenShadows(root, selectors, {
                    shouldIgnore: element => isInsideQuickInputOverlay(element) || isInsideShortcutUi(element)
                }));
            }
            return Array.from(new Set(candidates))
                .filter(element => element && isVisibleElement(element) && !isElementDisabled(element))
                .find(element => {
                    const text = normalizeNotionText(getElementSearchText(element));
                    if (!text) return false;
                    if (text.includes("create image") || text.includes("generate image")) return false;
                    if (text.includes("add images") || text.includes("add image")) return true;
                    if (text.includes("pdfs or csvs") && text.includes("image")) return true;
                    if (text.includes("upload") && (text.includes("image") || text.includes("file"))) return true;
                    return /添加|上传/.test(text) && /图片|图像|文件|附件/.test(text);
                }) || null;
        }

        async function openNotionFileUploadInput(composerEl, { shouldCancel = null, runtime = null, diagnostics = null } = {}) {
            const cancelFn = typeof shouldCancel === "function" ? shouldCancel : null;
            const beforeInputs = collectNotionImageFileInputs(findNotionComposerContainer(composerEl));
            if (beforeInputs.length > 0) return beforeInputs[0];

            const trigger = findNotionFileUploadMenuTrigger(composerEl);
            if (!trigger) return null;
            if (diagnostics && typeof diagnostics === "object") diagnostics.fileInputMenuOpened = true;
            simulateClickElement(trigger, { nativeFallback: true });
            if (!(await runtimeSleep(runtime, 180, { shouldCancel: cancelFn }))) return null;

            let item = null;
            const itemDeadline = getRuntimeNow(runtime) + 2500;
            while (!(cancelFn && cancelFn()) && getRuntimeNow(runtime) < itemDeadline) {
                item = findNotionFileUploadMenuItem();
                if (item) break;
                if (!(await runtimeSleep(runtime, 120, { shouldCancel: cancelFn }))) return null;
            }
            if (!item) return null;
            simulateClickElement(item, { nativeFallback: true });

            const inputDeadline = getRuntimeNow(runtime) + 3000;
            let inputs = [];
            while (!(cancelFn && cancelFn()) && getRuntimeNow(runtime) < inputDeadline) {
                inputs = collectNotionImageFileInputs(findNotionComposerContainer(composerEl));
                if (inputs.length > 0) return inputs[0];
                if (!(await runtimeSleep(runtime, 120, { shouldCancel: cancelFn }))) return null;
            }
            return inputs[0] || null;
        }

        async function tryAttachNotionImageViaFileInput(file, composerEl, diagnostics, { shouldCancel = null, runtime = null } = {}) {
            const container = findNotionComposerContainer(composerEl);
            let inputs = collectNotionImageFileInputs(container);
            if (diagnostics && typeof diagnostics === "object") diagnostics.fileInputCandidates = inputs.length;
            if (inputs.length === 0) {
                const openedInput = await openNotionFileUploadInput(composerEl, { shouldCancel, runtime, diagnostics });
                if (openedInput) inputs = [openedInput, ...collectNotionImageFileInputs(container)];
                inputs = Array.from(new Set(inputs.filter(Boolean)));
                if (diagnostics && typeof diagnostics === "object") diagnostics.fileInputCandidates = inputs.length;
            }
            for (const input of inputs) {
                if (trySetFileInputFiles(input, file)) return true;
            }
            return false;
        }

        async function waitForNotionImageAttachAccepted(containerEl, previousSnapshot, { timeoutMs = 30000, intervalMs = 120, shouldCancel = null, runtime = null } = {}) {
            const computeState = () => {
                const snapshot = getNotionAttachmentSnapshot(containerEl);
                const busy = hasNotionUploadInProgress(containerEl);
                return {
                    snapshot,
                    busy,
                    stateKey: `${getNotionAttachmentFingerprint(snapshot)};busy=${busy ? 1 : 0}`
                };
            };
            const observed = await waitForObservedState({
                resolveRoots: () => [containerEl || findNotionComposerContainer(), document.body || document],
                computeState,
                isSatisfied: (state) => {
                    if (state?.busy) return true;
                    return hasNotionAttachmentSnapshotChange(previousSnapshot, state?.snapshot || null);
                },
                timeoutMs,
                settleMs: 240,
                pollFallbackMs: Math.max(160, Number(intervalMs) || 120),
                attributeFilter: NOTION_READY_OBSERVED_ATTRIBUTES,
                shouldCancel,
                runtime
            });
            const state = observed?.state || computeState();
            return {
                ok: !!observed?.ok,
                cancelled: !!observed?.cancelled,
                snapshot: state?.snapshot || getNotionAttachmentSnapshot(containerEl),
                busy: !!state?.busy
            };
        }

        async function attachNotionImage(file, composerEl, { onDiagnostics = null, shouldCancel = null, runtime = null } = {}) {
            const cancelFn = typeof shouldCancel === "function" ? shouldCancel : null;
            if (!file || !(file instanceof File) || !String(file.type || "").startsWith("image/")) return { ok: false, cancelled: false };
            const composer = resolveNotionComposerElement(composerEl, { requireVisible: true }) || await focusNotionComposer({ timeoutMs: 4000, shouldCancel: cancelFn, runtime });
            if (!composer) return { ok: false, cancelled: !!(cancelFn && cancelFn()) };
            const container = findNotionComposerContainer(composer);
            const previousSnapshot = getNotionAttachmentSnapshot(container);
            const diagnostics = { attempts: { paste: 0, drop: 0, fileInput: 0 }, fired: { paste: 0, drop: 0, fileInput: 0 }, fileInputCandidates: 0, accepted: "" };

            const tryPlan = [
                {
                    name: "paste",
                    run: () => {
                        diagnostics.attempts.paste += 1;
                        const fired = tryAttachNotionImageViaPaste(file, composer);
                        if (fired) diagnostics.fired.paste += 1;
                        return fired;
                    }
                },
                {
                    name: "drop",
                    run: () => {
                        diagnostics.attempts.drop += 1;
                        const fired = tryAttachNotionImageViaDrop(file, composer);
                        if (fired) diagnostics.fired.drop += 1;
                        return fired;
                    }
                },
                {
                    name: "fileInput",
                    run: async () => {
                        diagnostics.attempts.fileInput += 1;
                        const fired = await tryAttachNotionImageViaFileInput(file, composer, diagnostics, {
                            shouldCancel: cancelFn,
                            runtime
                        });
                        if (fired) diagnostics.fired.fileInput += 1;
                        return fired;
                    }
                }
            ];

            for (const plan of tryPlan) {
                if (cancelFn && cancelFn()) return { ok: false, cancelled: true };
                try { composer.focus?.({ preventScroll: true }); } catch {
                    try { composer.focus?.(); } catch { }
                }
                try { simulateClickElement(composer, { nativeFallback: true }); } catch { }
                if (!(await runtimeSleep(runtime, 30, { shouldCancel: cancelFn }))) return { ok: false, cancelled: true };

                const fired = await plan.run();
                if (!fired) continue;
                const accepted = await waitForNotionImageAttachAccepted(container, previousSnapshot, {
                    timeoutMs: 30000,
                    intervalMs: 120,
                    shouldCancel: cancelFn,
                    runtime
                });
                if (accepted.cancelled) return { ok: false, cancelled: true };
                if (accepted.ok) {
                    diagnostics.accepted = plan.name;
                    return {
                        ok: true,
                        cancelled: false,
                        snapshot: accepted.snapshot || null,
                        uploadBusy: !!accepted.busy,
                        acceptedStrategy: plan.name
                    };
                }

                const failedSnapshot = accepted.snapshot || getNotionAttachmentSnapshot(container);
                const uploadBusy = !!accepted.busy || hasNotionUploadInProgress(container);
                const recoverableResidue = uploadBusy || hasNotionAttachmentSnapshotChange(previousSnapshot, failedSnapshot);
                if (recoverableResidue) {
                    if (typeof onDiagnostics === "function") {
                        try {
                            onDiagnostics({
                                ...diagnostics,
                                level: "error",
                                message: `Image upload event fired via ${plan.name}, but Notion left a partial attachment or upload-busy state; clearing attachments before retry.`
                            });
                        } catch { }
                    }
                    return {
                        ok: false,
                        cancelled: false,
                        recoverable: true,
                        snapshot: failedSnapshot,
                        uploadBusy,
                        failedStrategy: plan.name
                    };
                }

                if (typeof onDiagnostics === "function") {
                    try {
                        onDiagnostics({
                            ...diagnostics,
                            level: "warn",
                            message: `Image upload event fired via ${plan.name}, but Notion did not expose an upload indicator or attachment preview before timeout; trying the next upload strategy.`
                        });
                    } catch { }
                }
            }

            const finalSnapshot = getNotionAttachmentSnapshot(container);
            const uploadBusy = hasNotionUploadInProgress(container);
            if (typeof onDiagnostics === "function") {
                try {
                    onDiagnostics({
                        ...diagnostics,
                        level: "error",
                        message: "Image upload strategies did not produce a confirmed Notion attachment."
                    });
                } catch { }
            }
            return {
                ok: false,
                cancelled: false,
                recoverable: true,
                snapshot: finalSnapshot,
                uploadBusy
            };
        }

        async function attachNotionImages(files, composerEl, { onDiagnostics = null, shouldCancel = null, runtime = null } = {}) {
            const cancelFn = typeof shouldCancel === "function" ? shouldCancel : null;
            const list = Array.from(files || []).filter(file => file && file instanceof File && String(file.type || "").startsWith("image/"));
            if (list.length === 0) return { ok: false, cancelled: false, message: qiText("noImageFiles", {}, "No image files detected.") };
            const composer = resolveNotionComposerElement(composerEl, { requireVisible: true }) || await focusNotionComposer({ timeoutMs: 4000, shouldCancel: cancelFn, runtime });
            if (!composer) return { ok: false, cancelled: !!(cancelFn && cancelFn()) };

            for (let i = 0; i < list.length; i += 1) {
                const file = list[i];
                const result = await attachNotionImage(file, composer, {
                    shouldCancel: cancelFn,
                    runtime,
                    onDiagnostics: (diag) => {
                        if (typeof onDiagnostics !== "function") return;
                        try {
                            onDiagnostics({ fileIndex: i, fileName: file?.name || "", ...diag });
                        } catch { }
                    }
                });
                if (result.cancelled) return { ok: false, cancelled: true };
                if (!result.ok) {
                    return {
                        ok: false,
                        cancelled: false,
                        recoverable: result.recoverable !== false,
                        snapshot: result.snapshot || null,
                        attachmentCount: Number(result.snapshot?.attachmentCount || 0),
                        uploadBusy: !!result.uploadBusy,
                        message: result.message || qiText("attachFailed", {}, "Image paste failed: no image preview was detected in the input box.")
                    };
                }
                if (!(await runtimeSleep(runtime, 120, { shouldCancel: cancelFn }))) return { ok: false, cancelled: true };
            }
            return { ok: true, cancelled: false };
        }

        function findNotionAttachmentRemoveButtons(containerEl = null) {
            const scope = getNotionAttachmentScope(containerEl);
            const selectors = [
                "button[aria-label*='remove attachment' i]",
                "button[aria-label*='remove file' i]",
                "button[aria-label*='remove image' i]",
                "button[aria-label*='delete attachment' i]",
                "button[aria-label*='delete file' i]",
                "button[aria-label*='delete image' i]",
                "button[aria-label*='dismiss' i]",
                "button[aria-label*='cancel upload' i]",
                "button[aria-label*='close' i]",
                "button[title*='remove attachment' i]",
                "button[title*='remove file' i]",
                "button[title*='remove image' i]",
                "button[title*='delete attachment' i]",
                "button[title*='delete file' i]",
                "button[title*='delete image' i]",
                "button[title*='dismiss' i]",
                "button[title*='cancel upload' i]",
                "button[title*='close' i]",
                "button[title*='移除' i]",
                "button[title*='删除' i]",
                "button[title*='取消' i]",
                "[role='button'][aria-label*='remove attachment' i]",
                "[role='button'][aria-label*='remove file' i]",
                "[role='button'][aria-label*='remove image' i]",
                "[role='button'][aria-label*='delete attachment' i]",
                "[role='button'][aria-label*='delete file' i]",
                "[role='button'][aria-label*='delete image' i]",
                "[role='button'][aria-label*='dismiss' i]",
                "[role='button'][aria-label*='cancel upload' i]",
                "[role='button'][aria-label*='close' i]",
                "[role='button'][aria-label*='移除' i]",
                "[role='button'][aria-label*='删除' i]",
                "[role='button'][aria-label*='取消' i]",
                "[data-testid*='remove' i]",
                "[data-testid*='delete' i]",
                "[data-testid*='dismiss' i]",
                "[data-testid*='cancel' i]",
                "[data-testid*='close' i]"
            ].join(", ");
            return collectNotionElementsAcrossOpenShadows(scope, selectors, {
                shouldIgnore: element => isInsideQuickInputOverlay(element) || isInsideShortcutUi(element)
            })
                .map(element => getClickableActionElement(element, scope))
                .filter(element => element &&
                    isVisibleElement(element) &&
                    !isElementDisabled(element) &&
                    !isInsideQuickInputOverlay(element) &&
                    (isNotionAttachmentActionElement(element) || !!findNotionAttachmentCardElement(element, scope)));
        }

        async function clearNotionAttachments(composerEl, { shouldCancel = null, runtime = null } = {}) {
            const cancelFn = typeof shouldCancel === "function" ? shouldCancel : null;
            const composer = resolveNotionComposerElement(composerEl, { requireVisible: false }) || findNotionComposerElement({ requireVisible: true });
            const container = findNotionComposerContainer(composer);
            let snapshot = getNotionAttachmentSnapshot(container);
            if (!snapshot.hasAttachment) return { ok: true, cancelled: false };

            for (let attempt = 0; attempt < 4; attempt += 1) {
                if (cancelFn && cancelFn()) return { ok: false, cancelled: true };
                const buttons = findNotionAttachmentRemoveButtons(container);
                if (!buttons.length) {
                    return { ok: false, cancelled: false, message: "Failed to clear current image attachments: no usable remove button was found." };
                }
                for (const button of buttons) {
                    if (cancelFn && cancelFn()) return { ok: false, cancelled: true };
                    simulateClickElement(button, { nativeFallback: true });
                    await runtimeSleep(runtime, 100, { shouldCancel: cancelFn });
                }
                const observed = await waitForObservedState({
                    resolveRoots: () => [container, document.body || document],
                    computeState: () => getNotionAttachmentSnapshot(container),
                    isSatisfied: (state) => !state?.hasAttachment,
                    timeoutMs: 1800,
                    settleMs: 200,
                    pollFallbackMs: 160,
                    attributeFilter: NOTION_ATTACHMENT_OBSERVED_ATTRIBUTES,
                    shouldCancel: cancelFn,
                    runtime
                });
                snapshot = observed?.state || getNotionAttachmentSnapshot(container);
                if (observed?.cancelled) return { ok: false, cancelled: true };
                if (!snapshot.hasAttachment) return { ok: true, cancelled: false };
            }
            return { ok: false, cancelled: false, message: "Failed to clear current image attachments: could not confirm that all attachments were removed." };
        }

        function findNotionSendButtonNearComposer(composerEl) {
            const composer = resolveNotionComposerElement(composerEl, { requireVisible: false }) || composerEl || null;
            const composerContainer = findNotionComposerContainer(composer);
            const composerRect = getElementRect(composerContainer) || getElementRect(composer);
            const scopes = [];
            const push = (scope) => {
                if (scope && !scopes.includes(scope)) scopes.push(scope);
            };
            try { push(composer?.closest?.("form") || null); } catch { }
            push(composerContainer);
            push(document);
            const selectors = [
                "button[type='submit']",
                "button[aria-label*='submit ai message' i]",
                "button[title*='submit ai message' i]",
                "button[data-testid*='submit' i]",
                "button[aria-label*='submit' i]",
                "button[aria-label*='send' i]",
                "button[title*='send' i]",
                "button[data-testid*='send' i]",
                "button[aria-label*='发送' i]",
                "[role='button'][aria-label*='submit ai message' i]",
                "[role='button'][aria-label*='submit' i]",
                "[role='button'][aria-label*='send' i]",
                "[role='button'][data-testid*='send' i]"
            ].join(", ");
            const candidates = [];
            const seen = new Set();
            for (const scope of scopes) {
                for (const element of collectNotionElementsAcrossOpenShadows(scope, selectors, {
                    shouldIgnore: item => isInsideQuickInputOverlay(item) || isInsideShortcutUi(item)
                })) {
                    if (!element || seen.has(element)) continue;
                    seen.add(element);
                    if (isInsideQuickInputOverlay(element) || !isVisibleElement(element)) continue;
                    const rect = getElementRect(element);
                    if (composerRect && rect) {
                        const nearY = rect.top >= composerRect.top - 96 && rect.bottom <= composerRect.bottom + 96;
                        const nearX = rect.left >= composerRect.left - 160 && rect.right <= composerRect.right + 180;
                        if (!nearY || !nearX) continue;
                    }
                    candidates.push(element);
                }
            }
            candidates.sort((a, b) => {
                const aText = normalizeNotionText(getElementSearchText(a));
                const bText = normalizeNotionText(getElementSearchText(b));
                const score = (text) => {
                    let value = 0;
                    if (text === "send" || text === "发送") value += 700;
                    if (text.includes("submit ai message")) value += 650;
                    if (text.includes("submit")) value += 260;
                    if (text.includes("send") || text.includes("发送")) value += 220;
                    return value;
                };
                const aScore = score(aText);
                const bScore = score(bText);
                if (aScore !== bScore) return bScore - aScore;
                const aRect = getElementRect(a);
                const bRect = getElementRect(b);
                return (bRect?.right || 0) - (aRect?.right || 0);
            });
            return candidates[0] || null;
        }

        function isNotionSendButtonDisabled(button) {
            if (!button) return true;
            if (isElementDisabled(button)) return true;
            const dataState = String(button.getAttribute?.("data-state") || "").toLowerCase();
            if (dataState === "disabled") return true;
            return false;
        }

        function hasNotionUploadInProgress(containerEl) {
            const scope = getNotionAttachmentScope(containerEl);
            const selectors = [
                "[aria-busy='true']",
                "[role='progressbar']",
                "progress",
                "[data-testid*='uploading' i]",
                "[data-testid*='upload' i]",
                "[class*='uploading' i]",
                "[class*='spinner' i]"
            ].join(", ");
            return collectNotionElementsAcrossOpenShadows(scope, selectors, {
                shouldIgnore: element => isInsideQuickInputOverlay(element) || isInsideShortcutUi(element)
            }).some(element => {
                if (!element || !isVisibleElement(element)) return false;
                if (findNotionAttachmentCardElement(element, scope)) return true;
                if (isLikelyNotionAttachmentPreviewElement(element)) return true;
                const tag = String(element.tagName || "").toLowerCase();
                const role = String(element.getAttribute?.("role") || "").toLowerCase();
                const ariaBusy = String(element.getAttribute?.("aria-busy") || "").toLowerCase() === "true";
                const text = normalizeNotionText(getElementSearchText(element));
                const dataTestId = String(element.getAttribute?.("data-testid") || "").toLowerCase();
                const className = String(element.getAttribute?.("class") || "").toLowerCase();
                const ariaLabel = String(element.getAttribute?.("aria-label") || "").toLowerCase();
                const title = String(element.getAttribute?.("title") || "").toLowerCase();
                const haystack = `${text} ${dataTestId} ${className} ${ariaLabel} ${title}`;
                const uploadContext = /\b(?:upload|uploading|attachment|file-preview|upload-preview|file|image|preview)\b/.test(haystack) ||
                    /上传|附件|图片|图像|文件|预览/.test(haystack);
                if (uploadContext) return true;
                if (!(ariaBusy || role === "progressbar" || tag === "progress")) return false;

                let node = element.parentElement || null;
                for (let depth = 0; node && depth < 4; depth += 1) {
                    if (node === scope || node === document.body) break;
                    if (findNotionAttachmentCardElement(node, scope) || isLikelyNotionAttachmentPreviewElement(node)) return true;
                    const parentHaystack = `${normalizeNotionText(getElementSearchText(node))} ${String(node.getAttribute?.("data-testid") || "").toLowerCase()} ${String(node.getAttribute?.("class") || "").toLowerCase()} ${String(node.getAttribute?.("aria-label") || "").toLowerCase()}`;
                    if (/\b(?:upload|uploading|attachment|file-preview|upload-preview|file|image|preview)\b/.test(parentHaystack) || /上传|附件|图片|图像|文件|预览/.test(parentHaystack)) return true;
                    node = node.parentElement || null;
                }
                return false;
            });
        }

        function getNotionImagesReadyState(composerEl, { requireImage = true, minAttachments = 0 } = {}) {
            const composer = resolveNotionComposerElement(composerEl, { requireVisible: false }) || findNotionComposerElement({ requireVisible: true });
            const container = findNotionComposerContainer(composer);
            const snapshot = getNotionAttachmentSnapshot(container);
            const requiredAttachments = Math.max(0, Number(minAttachments) || 0);
            const attachmentCount = Number(snapshot?.attachmentCount || 0);
            const hasRequiredAttachments = !requireImage || (attachmentCount > 0 && attachmentCount >= requiredAttachments);
            const uploadBusy = requireImage && hasNotionUploadInProgress(container);
            return {
                composer,
                container,
                snapshot,
                attachmentCount,
                requiredAttachments,
                uploadBusy,
                ok: !!(composer && hasRequiredAttachments && !uploadBusy),
                stateKey: `${getNotionAttachmentFingerprint(snapshot)};busy=${uploadBusy ? 1 : 0};min=${requiredAttachments}`
            };
        }

        async function waitForNotionImagesReady(composerEl, { requireImage = true, minAttachments = 0, timeoutMs = 45000, intervalMs = 160, settleMs = 600, shouldCancel = null, runtime = null } = {}) {
            const cancelFn = typeof shouldCancel === "function" ? shouldCancel : null;
            let composerRef = resolveNotionComposerElement(composerEl, { requireVisible: true }) || await focusNotionComposer({ timeoutMs: 4000, shouldCancel: cancelFn, runtime });
            if (!composerRef) return { ok: false, reason: "no-composer", cancelled: !!(cancelFn && cancelFn()) };
            let lastState = null;
            const computeState = () => {
                const resolved = resolveNotionComposerElement(composerRef, { requireVisible: false }) || composerRef;
                if (resolved) composerRef = resolved;
                lastState = getNotionImagesReadyState(composerRef, { requireImage, minAttachments });
                return lastState;
            };
            const observed = await waitForObservedState({
                resolveRoots: () => [lastState?.container || findNotionComposerContainer(composerRef), composerRef, document.body || document],
                computeState,
                isSatisfied: (state) => !!state?.ok,
                timeoutMs,
                settleMs,
                pollFallbackMs: Math.max(160, Number(intervalMs) || 160),
                attributeFilter: NOTION_READY_OBSERVED_ATTRIBUTES,
                shouldCancel: cancelFn,
                runtime
            });
            const state = observed?.state || computeState();
            if (observed?.cancelled) {
                return {
                    ok: false,
                    reason: "cancelled",
                    cancelled: true,
                    composer: state?.composer || composerRef,
                    snapshot: state?.snapshot || null,
                    attachmentCount: Number(state?.attachmentCount || 0),
                    requiredAttachments: Number(state?.requiredAttachments || 0),
                    uploadBusy: !!state?.uploadBusy
                };
            }
            return {
                ok: !!observed?.ok,
                composer: state?.composer || composerRef,
                snapshot: state?.snapshot || null,
                attachmentCount: Number(state?.attachmentCount || 0),
                requiredAttachments: Number(state?.requiredAttachments || 0),
                uploadBusy: !!state?.uploadBusy,
                reason: observed?.ok ? "ok" : "timeout",
                cancelled: false,
                message: observed?.ok ? "" : `Notion images not ready: attachment=${state?.attachmentCount || 0}, busy=${state?.uploadBusy ? 1 : 0}`
            };
        }

        function getNotionReadyToSendState(composerEl, { requireImage = false, minAttachments = 0 } = {}) {
            const composer = resolveNotionComposerElement(composerEl, { requireVisible: false }) || findNotionComposerElement({ requireVisible: true });
            const container = findNotionComposerContainer(composer);
            const snapshot = getNotionAttachmentSnapshot(container);
            const textLength = getNotionComposerPlainText(composer, { trimTrailingEditorNewlines: true }).trim().length;
            const sendButton = findNotionSendButtonNearComposer(composer);
            const sendReady = sendButton ? !isNotionSendButtonDisabled(sendButton) : textLength > 0;
            const requiredAttachments = Math.max(0, Number(minAttachments) || 0);
            const attachmentCount = Number(snapshot?.attachmentCount || 0);
            const hasEnoughAttachments = !requireImage || requiredAttachments <= 0 || attachmentCount >= requiredAttachments;
            const uploadBusy = requireImage && hasNotionUploadInProgress(container);
            const ok = !!(composer && sendReady && (!requireImage || (attachmentCount > 0 && hasEnoughAttachments && !uploadBusy)));
            return {
                composer,
                container,
                snapshot,
                sendButton,
                sendReady,
                attachmentCount,
                requiredAttachments,
                hasEnoughAttachments,
                uploadBusy,
                textLength,
                ok,
                stateKey: `${getNotionAttachmentFingerprint(snapshot)};send=${sendReady ? 1 : 0};busy=${uploadBusy ? 1 : 0};text=${textLength};min=${requiredAttachments}`
            };
        }

        async function waitForNotionReadyToSend(composerEl, { requireImage = false, minAttachments = 0, timeoutMs = 45000, intervalMs = 160, settleMs = 600, shouldCancel = null, runtime = null } = {}) {
            const cancelFn = typeof shouldCancel === "function" ? shouldCancel : null;
            let composerRef = resolveNotionComposerElement(composerEl, { requireVisible: true }) || await focusNotionComposer({ timeoutMs: 4000, shouldCancel: cancelFn, runtime });
            if (!composerRef) return { ok: false, reason: "no-composer", cancelled: !!(cancelFn && cancelFn()) };
            let lastState = null;
            const computeState = () => {
                const resolved = resolveNotionComposerElement(composerRef, { requireVisible: false }) || composerRef;
                if (resolved) composerRef = resolved;
                lastState = getNotionReadyToSendState(composerRef, { requireImage, minAttachments });
                return lastState;
            };
            const observed = await waitForObservedState({
                resolveRoots: () => [lastState?.container || findNotionComposerContainer(composerRef), composerRef, document.body || document],
                computeState,
                isSatisfied: (state) => !!state?.ok,
                timeoutMs,
                settleMs,
                pollFallbackMs: Math.max(1000, Number(intervalMs) || 0),
                attributeFilter: NOTION_READY_OBSERVED_ATTRIBUTES,
                shouldCancel: cancelFn,
                runtime
            });
            const state = observed?.state || computeState();
            if (observed?.cancelled) {
                return {
                    ok: false,
                    reason: "cancelled",
                    cancelled: true,
                    composer: state?.composer || composerRef,
                    button: state?.sendButton || null,
                    snapshot: state?.snapshot || null,
                    attachmentCount: Number(state?.attachmentCount || 0),
                    requiredAttachments: Number(state?.requiredAttachments || 0),
                    uploadBusy: !!state?.uploadBusy,
                    sendReady: !!state?.sendReady
                };
            }
            return {
                ok: !!observed?.ok,
                composer: state?.composer || composerRef,
                button: state?.sendButton || null,
                snapshot: state?.snapshot || null,
                attachmentCount: Number(state?.attachmentCount || 0),
                requiredAttachments: Number(state?.requiredAttachments || 0),
                uploadBusy: !!state?.uploadBusy,
                sendReady: !!state?.sendReady,
                reason: observed?.ok ? "ok" : "timeout",
                cancelled: false,
                message: observed?.ok ? "" : `Notion composer not ready: attachment=${state?.attachmentCount || 0}, text=${state?.textLength || 0}, busy=${state?.uploadBusy ? 1 : 0}, sendReady=${state?.sendReady ? 1 : 0}`
            };
        }

        function getNotionNewChatZeroStateText(composerEl = null, containerEl = null) {
            const parts = [];
            const push = (value, maxLength = 32000) => {
                const text = String(value ?? "").trim();
                if (!text) return;
                parts.push(text.slice(0, Math.max(120, Number(maxLength) || 32000)));
            };

            push(getNotionComposerSearchText(composerEl), 1800);
            push(getElementSearchText(containerEl), 4800);
            try { push(document.body?.innerText, 42000); } catch { }
            if (parts.length === 0) {
                try { push(document.body?.textContent, 42000); } catch { }
            }
            return normalizeNotionText(parts.join(" "));
        }

        function getNotionNewChatZeroStateSignals(composerEl = null, containerEl = null) {
            const text = getNotionNewChatZeroStateText(composerEl, containerEl);
            const hasWelcome = text.includes("how can i help you today");
            const hasRecentChats = text.includes("recent chats");
            const hasSuggested = text.includes("suggested");
            const hasComposerPrompt = text.includes("do anything with ai");
            const hasSuggestedAction = (
                text.includes("create custom agent") ||
                text.includes("write meeting agenda") ||
                text.includes("analyze pdfs or images")
            );
            const score = (hasWelcome ? 3 : 0) +
                (hasRecentChats ? 1 : 0) +
                (hasSuggested ? 1 : 0) +
                (hasComposerPrompt ? 1 : 0) +
                (hasSuggestedAction ? 1 : 0);
            return {
                hasWelcome,
                hasRecentChats,
                hasSuggested,
                hasComposerPrompt,
                hasSuggestedAction,
                ready: (hasWelcome && score >= 4) || (hasRecentChats && hasSuggested && hasComposerPrompt)
            };
        }

        function getNotionNewChatZeroStateReadiness(composerEl, containerEl, snapshot) {
            const composer = resolveNotionComposerElement(composerEl, { requireVisible: false }) || composerEl || null;
            const composerTextLength = composer
                ? getNotionComposerPlainText(composer, { trimTrailingEditorNewlines: true }).trim().length
                : 0;
            const composerBlank = !!(composer && composerTextLength === 0);
            const attachmentCount = Number(snapshot?.attachmentCount || 0);
            const uploadBusy = hasNotionUploadInProgress(containerEl);
            const signals = getNotionNewChatZeroStateSignals(composer, containerEl);
            return {
                composerTextLength,
                composerBlank,
                attachmentCount,
                uploadBusy,
                zeroStateTextReady: !!signals.ready,
                zeroStateReady: !!(composerBlank && attachmentCount === 0 && !uploadBusy && signals.ready),
                zeroStateSignals: signals
            };
        }

        function getNotionNewChatReadyState() {
            const currentUrl = getCurrentNotionUrl();
            const currentTarget = parseNotionQuickInputTarget(currentUrl);
            const pendingTarget = getPendingNotionNewChatTarget();
            const composer = findNotionComposerElement({ requireVisible: true });
            const container = findNotionComposerContainer(composer);
            const snapshot = getNotionAttachmentSnapshot(container);
            const routeReady = !!currentTarget?.ready;
            const pendingRouteChanged = !pendingTarget || String(currentUrl || "").trim() !== String(pendingTarget.url || "").trim();
            const zeroState = getNotionNewChatZeroStateReadiness(composer, container, snapshot);
            return {
                composer,
                container,
                currentUrl,
                currentTarget,
                pendingTarget,
                routeReady,
                pendingRouteChanged,
                attachmentCount: zeroState.attachmentCount,
                composerBlank: zeroState.composerBlank,
                composerTextLength: zeroState.composerTextLength,
                uploadBusy: zeroState.uploadBusy,
                zeroStateReady: zeroState.zeroStateReady,
                zeroStateTextReady: zeroState.zeroStateTextReady,
                zeroStateSignals: zeroState.zeroStateSignals,
                ok: !!(composer && routeReady && (pendingRouteChanged || zeroState.zeroStateReady))
            };
        }

        async function waitForNotionNewChatReady({ timeoutMs = 12000, intervalMs = 160, settleMs = 300, shouldCancel = null, runtime = null } = {}) {
            const cancelFn = typeof shouldCancel === "function" ? shouldCancel : null;
            const observed = await waitForObservedState({
                resolveRoots: () => [document.body || document],
                computeState: getNotionNewChatReadyState,
                isSatisfied: (state) => !!state?.ok,
                timeoutMs,
                settleMs,
                pollFallbackMs: Math.max(200, Number(intervalMs) || 160),
                attributeFilter: NOTION_TEXT_OBSERVED_ATTRIBUTES,
                shouldCancel: cancelFn,
                runtime
            });
            const state = observed?.state || getNotionNewChatReadyState();
            if (observed?.cancelled) return { ok: false, cancelled: true };
            if (observed?.ok) clearPendingNotionNewChatTarget(state?.pendingTarget || null);
            const failureMessage = (() => {
                if (!state?.currentTarget?.ready) {
                    return buildNotionTargetUrlMismatchMessage(state?.currentUrl || getCurrentNotionUrl(), {
                        prefix: engine?.i18n?.t?.("quickInput.newChatVerifyPrefix", {}, "Notion AI route verification failed: ") || "Notion AI route verification failed: "
                    });
                }
                return `Notion new chat not ready: url=${state?.currentUrl || ""}, route=${state?.currentTarget?.kind || "unknown"}, routeChanged=${state?.pendingRouteChanged ? 1 : 0}, composer=${state?.composer ? 1 : 0}, composerBlank=${state?.composerBlank ? 1 : 0}, zeroState=${state?.zeroStateReady ? 1 : 0}, zeroText=${state?.zeroStateTextReady ? 1 : 0}, attachment=${state?.attachmentCount || 0}, busy=${state?.uploadBusy ? 1 : 0}`;
            })();
            return {
                ok: !!observed?.ok,
                cancelled: false,
                message: observed?.ok ? "" : failureMessage
            };
        }

        async function triggerNotionNewChat({ shouldCancel = null, fallbackTrigger = null } = {}) {
            const cancelFn = typeof shouldCancel === "function" ? shouldCancel : null;
            if (cancelFn && cancelFn()) return { ok: false, label: getNotionNewChatLabel() };
            const currentTarget = parseNotionQuickInputTarget();
            const expectedTarget = getNotionNewChatTriggerTarget();
            if ((!currentTarget || !currentTarget.ready) && navigateNotionSpaToTarget(expectedTarget)) {
                clearPendingNotionNewChatTarget();
                return { ok: true, label: getNotionNewChatLabel() };
            }
            let ok = false;
            try {
                ok = !!(await triggerNewChatAction());
            } catch {
                ok = false;
            }
            if (!ok && typeof fallbackTrigger === "function") {
                try { ok = !!(await fallbackTrigger()); } catch { ok = false; }
            }
            if (ok && currentTarget) {
                rememberPendingNotionNewChatTarget(currentTarget);
            } else {
                clearPendingNotionNewChatTarget();
            }
            return { ok, label: getNotionNewChatLabel() };
        }

        async function sendNotionMessage(composerEl) {
            const composer = resolveNotionComposerElement(composerEl, { requireVisible: true }) || await focusNotionComposer();
            if (!composer) return false;
            const button = findNotionSendButtonNearComposer(composer);
            if (button) {
                if (!isNotionSendButtonDisabled(button)) {
                    try {
                        if (simulateClickElement(button, { nativeFallback: true })) return true;
                    } catch { }
                    try { button.click?.(); return true; } catch { }
                }
            }
            try {
                return !!simulateKeystroke("ENTER", { target: composer });
            } catch {
                return false;
            }
        }

        return Object.freeze({
            focusComposer: focusNotionComposer,
            setInputValue: setNotionInputValue,
            clearComposerValue: clearNotionInputValue,
            getComposerText: getNotionComposerPlainText,
            isTextCommitMatch: isNotionTextCommitMatch,
            getTextObservationRoots: getNotionTextObservationRoots,
            attachImages: attachNotionImages,
            clearAttachments: clearNotionAttachments,
            waitForImagesReady: waitForNotionImagesReady,
            waitForReadyToSend: waitForNotionReadyToSend,
            waitForNewChatReady: waitForNotionNewChatReady,
            triggerNewChat: triggerNotionNewChat,
            newChatLabel: getNotionNewChatLabel,
            lockNewChatHotkey: true,
            lockedNewChatHotkeyDisplay: getNotionNewChatLabel,
            sendMessage: sendNotionMessage
        });
    }

    function formatMenuDataAdapter(data) {
        const raw = isPlainObject(data) ? data : {};
        const keys = Object.keys(raw);
        if (keys.length === 0) return "";

        const menu = raw.menu;
        if (typeof menu === "string" && menu.trim()) return menu.trim();
        if (isPlainObject(menu)) {
            const value = ["id", "keyword", "textMatch"]
                .map(key => typeof menu[key] === "string" && menu[key].trim() ? menu[key].trim() : "")
                .find(Boolean);
            if (value && Object.keys(menu).every(key => ["id", "keyword", "textMatch"].includes(key))) return value;
        }

        try {
            return JSON.stringify(raw, null, 2);
        } catch {
            return "";
        }
    }

    function parseMenuDataAdapter(text) {
        const trimmed = String(text ?? "").trim();
        if (!trimmed) return {};
        if (trimmed.startsWith("{") || trimmed.startsWith("[")) {
            const parsed = JSON.parse(trimmed);
            if (!isPlainObject(parsed)) throw new Error("data must be an object");
            return parsed;
        }
        return { menu: trimmed };
    }

    function createMenuDataAdapter({ label, placeholder } = {}) {
        return {
            label,
            placeholder,
            format: formatMenuDataAdapter,
            parse: parseMenuDataAdapter
        };
    }

    const SITE_MESSAGES = Object.freeze({
        "zh-CN": {
            menuCommandLabel: "Notion - 设置快捷键",
            panelTitle: "Notion - 自定义快捷键",
            quickInputTitle: "Notion - 快捷输入",
            shortcuts: {
                newChat: "新建聊天",
                selectAiModel: "选择 AI 模型",
                modelAuto: "模型：Auto",
                modelSonnet46: "模型：Claude Sonnet 4.6",
                modelOpus47: "模型：Claude Opus 4.7",
                modelOpus48: "模型：Claude Opus 4.8",
                modelGemini31Pro: "模型：Gemini 3.1 Pro",
                modelGpt52: "模型：GPT-5.2",
                modelGpt54: "模型：GPT-5.4",
                modelGpt55: "模型：GPT-5.5",
                modelGrok43: "模型：Grok 4.3",
                modelGrokBuild01: "模型：Grok Build 0.1",
                modelKimi26: "模型：Kimi K2.6",
                modelDeepSeekV4Pro: "模型：DeepSeek V4 Pro",
                modeDefault: "模式：Default",
                modeAsk: "模式：Ask",
                modePlan: "模式：Plan",
                modeResearch: "模式：Research",
                toggleResearchMode: "模式：Research",
                selectSearchScope: "切换全部来源",
                toggleWebAccess: "切换联网",
                toggleImageGeneration: "切换图片生成",
                deleteTopic: "删除话题",
                addContext: "添加上下文",
                attachFile: "附加文件",
                quickInput: "快捷输入"
            },
            dataAdapters: {
                modelPicker: {
                    label: "模型 ID / 关键词（或粘贴 JSON，高级用法）:",
                    placeholder: "例如: grok 4.3 / grok build / opus 4.8 / {\"menu\":{\"id\":\"grok43\"}}"
                },
                conversationMenu: {
                    label: "会话菜单项 ID / 关键词（或粘贴 JSON，高级用法）:",
                    placeholder: "例如: delete / Delete / {\"menu\":{\"id\":\"delete\"}}"
                }
            },
            quickInput: {
                title: "Notion - 快捷输入",
                rootUrlMismatch: "当前 Notion AI 页面必须回到 app.notion.com/ai，目标是 {targetUrl}，实际是 {currentUrl}",
                newChatVerifyPrefix: "Notion AI 路由校验失败："
            }
        },
        "en-US": {
            menuCommandLabel: "Notion - Shortcut settings",
            panelTitle: "Notion - Custom shortcuts",
            quickInputTitle: "Notion - Quick Input",
            shortcuts: {
                newChat: "New Chat",
                selectAiModel: "Select AI Model",
                modelAuto: "Model: Auto",
                modelSonnet46: "Model: Claude Sonnet 4.6",
                modelOpus47: "Model: Claude Opus 4.7",
                modelOpus48: "Model: Claude Opus 4.8",
                modelGemini31Pro: "Model: Gemini 3.1 Pro",
                modelGpt52: "Model: GPT-5.2",
                modelGpt54: "Model: GPT-5.4",
                modelGpt55: "Model: GPT-5.5",
                modelGrok43: "Model: Grok 4.3",
                modelGrokBuild01: "Model: Grok Build 0.1",
                modelKimi26: "Model: Kimi K2.6",
                modelDeepSeekV4Pro: "Model: DeepSeek V4 Pro",
                modeDefault: "Mode: Default",
                modeAsk: "Mode: Ask",
                modePlan: "Mode: Plan",
                modeResearch: "Mode: Research",
                toggleResearchMode: "Mode: Research",
                selectSearchScope: "Toggle All Sources",
                toggleWebAccess: "Toggle Web Access",
                toggleImageGeneration: "Toggle Image Generation",
                deleteTopic: "Delete Topic",
                quickInput: "Quick Input"
            },
            dataAdapters: {
                modelPicker: {
                    label: "Model ID / keyword (or paste JSON, advanced):",
                    placeholder: "Example: grok 4.3 / grok build / opus 4.8 / {\"menu\":{\"id\":\"grok43\"}}"
                },
                conversationMenu: {
                    label: "Conversation menu item ID / keyword (or paste JSON, advanced):",
                    placeholder: "Example: delete / Delete / {\"menu\":{\"id\":\"delete\"}}"
                }
            },
            quickInput: {
                title: "Notion - Quick Input",
                rootUrlMismatch: "Current Notion AI page must return to app.notion.com/ai. Target: {targetUrl}; actual URL: {currentUrl}",
                newChatVerifyPrefix: "Notion AI route verification failed: "
            }
        }
    });

    const baseShortcut = Object.freeze({
        actionType: 'selector',
        url: '',
        urlMethod: 'current',
        urlAdvanced: 'href',
        selector: '',
        simulateKeys: '',
        customAction: '',
        data: {},
        icon: defaultIconURL,
        iconDark: ""
    });

    const createShortcut = (overrides) => ({ ...baseShortcut, ...overrides });

    function createModelShortcut(target) {
        const iconInfo = getNotionDefaultModelIconInfo(target?.id);
        return createShortcut({
            key: `model-${target.id}`,
            name: target.label,
            labelKey: target.labelKey,
            actionType: "custom",
            customAction: "modelPicker",
            hotkey: target.hotkey,
            icon: iconInfo.icon,
            iconDark: iconInfo.iconDark || "",
            iconAdaptive: iconInfo.iconAdaptive,
            data: { menu: { id: target.id } }
        });
    }

    const defaultModelShortcuts = NOTION_MODEL_TARGET_LIST.map(createModelShortcut);

    function createModeShortcut(target) {
        const iconInfo = getNotionDefaultModeIconInfo(target?.id);
        return createShortcut({
            key: target.key,
            name: target.label,
            labelKey: target.labelKey,
            actionType: "custom",
            customAction: "selectMode",
            hotkey: target.hotkey,
            icon: iconInfo.icon,
            iconDark: iconInfo.iconDark || "",
            iconAdaptive: iconInfo.iconAdaptive,
            data: { mode: { id: target.id } }
        });
    }

    const defaultModeShortcuts = NOTION_MODE_TARGET_LIST.map(createModeShortcut);

    const defaultShortcuts = [
        createShortcut({
            key: 'newChat',
            name: 'New Chat',
            labelKey: 'shortcuts.newChat',
            actionType: 'custom',
            customAction: 'newChat',
            hotkey: 'CTRL+N',
            icon: NEW_CHAT_ICON,
            iconDark: NOTION_MODEL_AI_FACE_ICON_INFO.iconDark,
            iconAdaptive: NOTION_MODEL_AI_FACE_ICON_INFO.iconAdaptive
        }),
        createShortcut({
            key: LEGACY_SELECT_AI_MODEL_KEY,
            name: 'Select AI Model',
            labelKey: 'shortcuts.selectAiModel',
            actionType: 'custom',
            customAction: 'openModelPicker',
            hotkey: 'CTRL+M',
            icon: getNotionDefaultModelIconInfo("auto").icon,
            iconDark: getNotionDefaultModelIconInfo("auto").iconDark || "",
            iconAdaptive: getNotionDefaultModelIconInfo("auto").iconAdaptive
        }),
        ...defaultModelShortcuts,
        ...defaultModeShortcuts,
        createShortcut({
            key: 'selectSearchScope',
            name: 'Toggle All Sources',
            labelKey: 'shortcuts.selectSearchScope',
            actionType: 'custom',
            customAction: 'toggleAllSources',
            hotkey: 'CTRL+S',
            icon: SEARCH_SCOPE_ICON,
            iconDark: SEARCH_SCOPE_ICON_INFO.iconDark,
            iconAdaptive: SEARCH_SCOPE_ICON_INFO.iconAdaptive
        }),
        createShortcut({
            key: 'toggleWebAccess',
            name: 'Toggle Web Access',
            labelKey: 'shortcuts.toggleWebAccess',
            actionType: 'custom',
            customAction: 'toggleWebAccess',
            hotkey: 'CTRL+W',
            icon: WEB_ACCESS_ICON,
            iconDark: WEB_ACCESS_ICON_INFO.iconDark,
            iconAdaptive: WEB_ACCESS_ICON_INFO.iconAdaptive
        }),
        createShortcut({
            key: 'toggleImageGeneration',
            name: 'Toggle Image Generation',
            labelKey: 'shortcuts.toggleImageGeneration',
            actionType: 'custom',
            customAction: 'toggleImageGeneration',
            hotkey: 'CTRL+I',
            icon: IMAGE_GENERATION_ICON,
            iconDark: IMAGE_GENERATION_ICON_INFO.iconDark,
            iconAdaptive: IMAGE_GENERATION_ICON_INFO.iconAdaptive
        }),
        createShortcut({
            key: 'quickInput',
            name: 'Quick Input',
            labelKey: 'shortcuts.quickInput',
            actionType: 'custom',
            customAction: 'quickInput',
            hotkey: 'CTRL+SHIFT+K',
            icon: QUICK_INPUT_ICON,
            iconDark: QUICK_INPUT_ICON_INFO.iconDark,
            iconAdaptive: QUICK_INPUT_ICON_INFO.iconAdaptive
        }),
        createShortcut({
            key: 'deleteTopic',
            name: 'Delete Topic',
            labelKey: 'shortcuts.deleteTopic',
            actionType: 'custom',
            customAction: 'conversationMenu',
            hotkey: 'CTRL+BACKSPACE',
            icon: DELETE_TOPIC_ICON,
            iconDark: DELETE_TOPIC_ICON_INFO.iconDark,
            iconAdaptive: DELETE_TOPIC_ICON_INFO.iconAdaptive,
            data: { menu: { id: "delete" } }
        }),
        createShortcut({
            key: 'addContext',
            name: 'Add Context',
            selector: '[data-testid="unified-chat-add-context-button"]',
            hotkey: 'CTRL+SHIFT+C',
            icon: ADD_CONTEXT_ICON,
            iconDark: ADD_CONTEXT_ICON_INFO.iconDark,
            iconAdaptive: ADD_CONTEXT_ICON_INFO.iconAdaptive
        }),
        createShortcut({
            key: 'attachFile',
            name: 'Attach File',
            selector: 'button[aria-label="Attach file"]',
            hotkey: 'CTRL+SHIFT+F',
            icon: ATTACH_FILE_ICON,
            iconDark: ATTACH_FILE_ICON_INFO.iconDark,
            iconAdaptive: ATTACH_FILE_ICON_INFO.iconAdaptive
        })
    ];

    const NOTION_DEFAULT_SHORTCUT_BY_KEY = Object.freeze(defaultShortcuts.reduce((acc, shortcut) => {
        const key = String(shortcut?.key || "").trim();
        if (key) acc[key] = shortcut;
        return acc;
    }, {}));
    const NOTION_DEFAULT_SHORTCUT_KEY_SET = new Set(Object.keys(NOTION_DEFAULT_SHORTCUT_BY_KEY));
    const NOTION_MODEL_ICON_SHORTCUT_KEYS = Object.freeze([
        LEGACY_SELECT_AI_MODEL_KEY,
        ...NOTION_MODEL_SHORTCUT_KEYS
    ]);
    const NOTION_MODEL_ICON_SHORTCUT_KEY_SET = new Set(NOTION_MODEL_ICON_SHORTCUT_KEYS);
    const NOTION_MODE_SHORTCUT_KEY_SET = new Set(NOTION_MODE_SHORTCUT_KEYS);
    const NOTION_DEFAULT_ACTION_MIGRATION_KEY_SET = new Set([
        ...NOTION_MODE_SHORTCUT_KEYS,
        "selectSearchScope"
    ]);

    function createDefaultShortcutByKey(key) {
        const shortcutKey = String(key || "").trim();
        if (!shortcutKey) return null;
        const shortcut = NOTION_DEFAULT_SHORTCUT_BY_KEY[shortcutKey] || null;
        return cloneShortcutItem(shortcut);
    }

    function getNotionDefaultShortcutKey(shortcut) {
        if (!shortcut || typeof shortcut !== "object" || Array.isArray(shortcut)) return "";
        const key = String(shortcut.key || "").trim();
        if (NOTION_DEFAULT_SHORTCUT_KEY_SET.has(key)) return key;

        const selector = String(shortcut.selector || "").trim();
        const customAction = String(shortcut.customAction || "").trim();
        const actionType = String(shortcut.actionType || "").trim().toLowerCase();
        const name = normalizeNotionText(shortcut.name);

        if (customAction === "newChat" || isLegacyNewChatShortcut(shortcut)) return "newChat";
        if (
            customAction === "openModelPicker" ||
            selector === LEGACY_SELECT_AI_MODEL_SELECTOR ||
            isLegacySelectAiModelShortcut(shortcut)
        ) {
            return LEGACY_SELECT_AI_MODEL_KEY;
        }
        if ((!actionType || actionType === "custom") && (!customAction || customAction === "modelPicker")) {
            const data = isPlainObject(shortcut.data) ? shortcut.data : {};
            const menu = isPlainObject(data.menu) ? data.menu : data;
            const target = inferModelTargetFromText(menu.id ?? menu.textMatch ?? menu.keyword ?? shortcut.name);
            if (target) return `model-${target.id}`;
        }
        if (customAction === "selectMode" || customAction === "toggleResearchMode") {
            const target = resolveModeSelectionTarget(shortcut, customAction === "toggleResearchMode" ? "research" : "");
            if (target) return target.key;
        }
        const modeTarget = inferModeTargetFromText(shortcut.name);
        if (modeTarget) return modeTarget.key;
        if (selector.includes('data-testid="unified-chat-research-mode-button"') || name === "toggle research mode" || name === "切换研究模式") {
            return "toggleResearchMode";
        }
        if (
            customAction === "toggleAllSources" ||
            customAction === "selectSearchScope" ||
            selector.includes('data-testid="unified-chat-search-scope-button"') ||
            name === "select search scope" ||
            name === "toggle all sources" ||
            name === "选择搜索范围" ||
            name === "切换全部来源"
        ) {
            return "selectSearchScope";
        }
        if (
            customAction === "toggleWebAccess" ||
            name === "toggle web access"
        ) {
            return "toggleWebAccess";
        }
        if (
            customAction === "toggleImageGeneration" ||
            name === "toggle image generation"
        ) {
            return "toggleImageGeneration";
        }
        if (customAction === "quickInput" || name === "quick input") return "quickInput";
        if (customAction === "conversationMenu" || name === "delete topic") {
            const data = isPlainObject(shortcut.data) ? shortcut.data : {};
            const menu = isPlainObject(data.menu) ? data.menu : data;
            if (resolveConversationMenuTarget(menu.id ?? menu.textMatch ?? menu.keyword ?? shortcut.name)) return "deleteTopic";
        }
        if (selector.includes('data-testid="unified-chat-add-context-button"') || name === "add context") {
            return "addContext";
        }
        if (selector === 'button[aria-label="Attach file"]' || name === "attach file") {
            return "attachFile";
        }
        return "";
    }

    function applyNotionDefaultIconFields(shortcut) {
        if (!shortcut || typeof shortcut !== "object" || Array.isArray(shortcut)) return false;
        const shortcutKey = getNotionDefaultShortcutKey(shortcut);
        const defaultShortcut = shortcutKey ? NOTION_DEFAULT_SHORTCUT_BY_KEY[shortcutKey] : null;
        if (!defaultShortcut) return false;

        let changed = false;
        if (!String(shortcut.key || "").trim()) {
            shortcut.key = shortcutKey;
            changed = true;
        }

        if (NOTION_DEFAULT_ACTION_MIGRATION_KEY_SET.has(shortcutKey)) {
            const legacyDefaultNames = {
                modeDefault: ["mode: default", "模式：default", "模式: default"],
                modeAsk: ["mode: ask", "模式：ask", "模式: ask"],
                modePlan: ["mode: plan", "模式：plan", "模式: plan"],
                toggleResearchMode: ["toggle research mode", "切换研究模式", "mode: research", "模式：research", "模式: research"],
                selectSearchScope: ["select search scope", "选择搜索范围", "toggle all sources", "切换全部来源"]
            };
            const currentName = normalizeNotionText(shortcut.name);
            const defaultName = String(defaultShortcut.name || "").trim();
            const shouldUpdateName = !currentName || (legacyDefaultNames[shortcutKey] || []).includes(currentName);
            if (defaultName && shouldUpdateName && String(shortcut.name || "") !== defaultName) {
                shortcut.name = defaultName;
                changed = true;
            }
            if (defaultShortcut.labelKey && String(shortcut.labelKey || "") !== String(defaultShortcut.labelKey || "")) {
                shortcut.labelKey = defaultShortcut.labelKey;
                changed = true;
            }

            const actionFields = ["actionType", "customAction", "selector", "simulateKeys", "url", "urlMethod", "urlAdvanced"];
            for (const field of actionFields) {
                const defaultValue = defaultShortcut[field];
                const currentValue = shortcut[field];
                if (defaultValue === undefined || defaultValue === null || defaultValue === "") {
                    if (currentValue !== undefined && currentValue !== null && currentValue !== "") {
                        delete shortcut[field];
                        changed = true;
                    }
                    continue;
                }
                if (currentValue !== defaultValue) {
                    shortcut[field] = defaultValue;
                    changed = true;
                }
            }

            if (NOTION_MODE_SHORTCUT_KEY_SET.has(shortcutKey)) {
                const defaultData = cloneShortcutItem(defaultShortcut.data) || {};
                const currentData = isPlainObject(shortcut.data) ? shortcut.data : {};
                let shouldReplaceData = true;
                try {
                    shouldReplaceData = JSON.stringify(currentData) !== JSON.stringify(defaultData);
                } catch { }
                if (shouldReplaceData) {
                    shortcut.data = defaultData;
                    changed = true;
                }
            }
        }

        const defaultIcon = String(defaultShortcut.icon || "").trim();
        const defaultIconDark = String(defaultShortcut.iconDark || "").trim();
        const currentIcon = String(shortcut.icon || "").trim();
        const currentIconDark = String(shortcut.iconDark || "").trim();
        const preserveRuntimeModelIcon = NOTION_MODEL_ICON_SHORTCUT_KEY_SET.has(shortcutKey) &&
            currentIcon &&
            currentIcon !== defaultIcon &&
            currentIcon !== NOTION_AI_NATIVE_FACE_ICON &&
            currentIcon !== NOTION_AI_FALLBACK_ICON &&
            isNotionNativeRuntimeAssetIconSource(currentIcon);
        const preserveRuntimeModeIcon = NOTION_MODE_SHORTCUT_KEY_SET.has(shortcutKey) &&
            currentIcon &&
            currentIcon !== defaultIcon &&
            !isLegacyNotionModeFallbackIconSource(currentIcon) &&
            isNotionModeRuntimeSvgIconSource(currentIcon);
        const preserveRuntimeIcon = preserveRuntimeModelIcon || preserveRuntimeModeIcon;

        if (!preserveRuntimeIcon && currentIcon !== defaultIcon) {
            shortcut.icon = defaultIcon;
            changed = true;
        }

        if (!preserveRuntimeIcon && currentIconDark !== defaultIconDark) {
            shortcut.iconDark = defaultIconDark;
            changed = true;
        }

        const targetIconAdaptive = preserveRuntimeIcon ? isSvgIconSource(currentIcon) : !!defaultShortcut.iconAdaptive;
        if (!!shortcut.iconAdaptive !== targetIconAdaptive) {
            shortcut.iconAdaptive = targetIconAdaptive;
            changed = true;
        }

        return changed;
    }

    function isNotionNativeRuntimeAssetIconSource(source) {
        const value = String(source || "").trim();
        if (!value || /^data:image\/svg\+xml/i.test(value)) return false;
        try {
            const url = new URL(value, window?.location?.href || NOTION_ORIGIN);
            const host = String(url.hostname || "").toLowerCase();
            return host === "app.notion.com" && String(url.pathname || "").startsWith("/_assets/");
        } catch {
            return false;
        }
    }

    function isNotionModeRuntimeSvgIconSource(source) {
        const value = String(source || "").trim();
        if (!/^data:image\/svg\+xml/i.test(value)) return false;
        const svgText = decodeSvgDataUri(value);
        return /<svg[\s>]/i.test(svgText) && /color=(["'])#37352F\1/i.test(svgText);
    }

    function isLegacyNotionModeFallbackIconSource(source) {
        const svgText = decodeSvgDataUri(source);
        return (
            (svgText.includes("18.125 7.188") && svgText.includes("2.813 2.187")) ||
            svgText.includes("m12.166 5.625") ||
            svgText.includes("M17.5 9.375c0 4.24") ||
            svgText.includes("M11.25 3.75") ||
            svgText.includes("M.625 7.188v1.875")
        );
    }

    function isLegacyNewChatShortcut(shortcut) {
        if (!shortcut || typeof shortcut !== "object" || Array.isArray(shortcut)) return false;
        const key = String(shortcut.key || "").trim();
        const name = String(shortcut.name || "").trim();
        const actionType = String(shortcut.actionType || "").trim().toLowerCase();
        const simulateKeys = normalizeHotkeyToken(shortcut.simulateKeys);
        const selector = String(shortcut.selector || "").trim();
        const customAction = String(shortcut.customAction || "").trim();
        const hotkey = normalizeHotkeyToken(shortcut.hotkey);
        const data = isPlainObject(shortcut.data) ? shortcut.data : {};
        return (
            (key === "newChat" || name === "New Chat") &&
            actionType === "simulate" &&
            simulateKeys === LEGACY_NEW_CHAT_SIMULATE_KEYS &&
            !selector &&
            !customAction &&
            hotkey === "CTRL+N" &&
            Object.keys(data).length === 0
        );
    }

    function isLegacySelectAiModelShortcut(shortcut) {
        if (!shortcut || typeof shortcut !== "object" || Array.isArray(shortcut)) return false;
        const key = String(shortcut.key || "").trim();
        const name = String(shortcut.name || "").trim();
        const actionType = String(shortcut.actionType || "").trim().toLowerCase();
        const selector = String(shortcut.selector || "").trim();
        const customAction = String(shortcut.customAction || "").trim();
        const hotkey = normalizeHotkeyToken(shortcut.hotkey);
        const data = isPlainObject(shortcut.data) ? shortcut.data : {};
        return (
            (key === LEGACY_SELECT_AI_MODEL_KEY || name === "Select AI Model") &&
            (!actionType || actionType === "selector") &&
            selector === LEGACY_SELECT_AI_MODEL_SELECTOR &&
            !customAction &&
            hotkey === "CTRL+M" &&
            Object.keys(data).length === 0
        );
    }

    function isLegacyOpus46ModelShortcut(shortcut) {
        if (!shortcut || typeof shortcut !== "object" || Array.isArray(shortcut)) return false;
        const key = String(shortcut.key || "").trim();
        const actionType = String(shortcut.actionType || "").trim().toLowerCase();
        const customAction = String(shortcut.customAction || "").trim();
        const data = isPlainObject(shortcut.data) ? shortcut.data : {};
        const menu = isPlainObject(data.menu) ? data.menu : data;
        const target = inferModelTargetFromText(menu.id ?? menu.textMatch ?? menu.keyword ?? shortcut.name);
        return (
            (key === "model-opus46" || normalizeNotionTargetKey(menu.id) === "opus46") &&
            (!actionType || actionType === "custom") &&
            (!customAction || customAction === "modelPicker") &&
            target?.id === "opus48"
        );
    }

    function getShortcutModelDefaultKey(shortcut) {
        const key = getNotionDefaultShortcutKey(shortcut);
        return NOTION_MODEL_ICON_SHORTCUT_KEY_SET.has(key) && key !== LEGACY_SELECT_AI_MODEL_KEY ? key : "";
    }

    function syncNotionDefaultModelHotkeyOrder(shortcuts, { forceKeys = null } = {}) {
        if (!Array.isArray(shortcuts)) return false;
        const forcedKeySet = forceKeys instanceof Set ? forceKeys : new Set();
        let changed = false;
        const modelShortcuts = shortcuts
            .map(shortcut => ({ shortcut, key: getShortcutModelDefaultKey(shortcut) }))
            .filter(item => item.key);

        const modelShortcutSet = new Set(modelShortcuts.map(item => item.shortcut));
        const hotkeysInUse = new Map();
        for (const shortcut of shortcuts) {
            if (modelShortcutSet.has(shortcut)) continue;
            const hotkey = normalizeHotkeyToken(shortcut?.hotkey);
            if (hotkey) hotkeysInUse.set(hotkey, shortcut);
        }

        for (const { shortcut, key } of modelShortcuts) {
            const currentHotkey = normalizeHotkeyToken(shortcut.hotkey);
            const oldDefaultHotkey = normalizeHotkeyToken(NOTION_PRE_GROK_MODEL_DEFAULT_HOTKEYS[key]);
            const newDefault = createDefaultShortcutByKey(key);
            const newDefaultHotkey = normalizeHotkeyToken(newDefault?.hotkey);
            if (!newDefaultHotkey) {
                if (currentHotkey) hotkeysInUse.set(currentHotkey, shortcut);
                continue;
            }

            if (!currentHotkey && !forcedKeySet.has(key)) {
                continue;
            }

            if (currentHotkey && oldDefaultHotkey && currentHotkey !== oldDefaultHotkey && currentHotkey !== newDefaultHotkey) {
                if (currentHotkey) hotkeysInUse.set(currentHotkey, shortcut);
                continue;
            }

            const conflict = hotkeysInUse.get(newDefaultHotkey);
            const nextHotkey = conflict && conflict !== shortcut ? "" : newDefaultHotkey;
            if (currentHotkey !== nextHotkey) {
                shortcut.hotkey = nextHotkey;
                changed = true;
                if (!nextHotkey) {
                    console.warn(`${LOG_TAG} migration: hotkey ${newDefaultHotkey} is already used; kept ${shortcut.name || key} without a default hotkey.`);
                }
            }
            if (nextHotkey) hotkeysInUse.set(nextHotkey, shortcut);
        }

        return changed;
    }

    function syncNotionDefaultModelShortcutOrder(shortcuts) {
        if (!Array.isArray(shortcuts)) return false;
        const modelByKey = new Map();
        const withoutManagedModels = [];
        let insertIndex = -1;

        for (const shortcut of shortcuts) {
            const key = getShortcutModelDefaultKey(shortcut);
            if (key && !modelByKey.has(key)) {
                if (insertIndex < 0) insertIndex = withoutManagedModels.length;
                modelByKey.set(key, shortcut);
                continue;
            }
            withoutManagedModels.push(shortcut);
        }

        if (insertIndex < 0 || modelByKey.size < 2) return false;

        const orderedModels = NOTION_MODEL_SHORTCUT_KEYS
            .map(key => modelByKey.get(key))
            .filter(Boolean);
        const reordered = [
            ...withoutManagedModels.slice(0, insertIndex),
            ...orderedModels,
            ...withoutManagedModels.slice(insertIndex)
        ];

        if (reordered.length !== shortcuts.length) return false;
        const changed = reordered.some((shortcut, index) => shortcut !== shortcuts[index]);
        if (changed) shortcuts.splice(0, shortcuts.length, ...reordered);
        return changed;
    }

    function migrateNotionManagedModelShortcuts() {
        const stored = gmGetValueLocal(NOTION_DEFAULT_SHORTCUTS_STORAGE_KEY, null);
        if (!Array.isArray(stored)) return;

        let changed = false;
        const next = [];
        const newlyAddedKeys = new Set();
        const originalKeys = new Set(stored.map(shortcut => String(shortcut?.key || "").trim()).filter(Boolean));

        for (const shortcut of stored) {
            if (isLegacySelectAiModelShortcut(shortcut)) {
                const replacement = createDefaultShortcutByKey(LEGACY_SELECT_AI_MODEL_KEY);
                if (replacement) {
                    next.push({
                        ...replacement,
                        id: String(shortcut.id || replacement.id || "").trim() || replacement.id,
                        hotkey: String(shortcut.hotkey || replacement.hotkey || "").trim() || replacement.hotkey
                    });
                }
                changed = true;
                continue;
            }
            if (isLegacyNewChatShortcut(shortcut)) {
                const replacement = createDefaultShortcutByKey("newChat");
                if (replacement) {
                    next.push({
                        ...replacement,
                        id: String(shortcut.id || replacement.id || "").trim() || replacement.id,
                        hotkey: String(shortcut.hotkey || replacement.hotkey || "").trim() || replacement.hotkey
                    });
                    changed = true;
                    continue;
                }
            }
            if (isLegacyOpus46ModelShortcut(shortcut)) {
                if (originalKeys.has("model-opus48")) {
                    changed = true;
                    continue;
                }
                const replacement = createDefaultShortcutByKey("model-opus48");
                if (replacement) {
                    next.push({
                        ...replacement,
                        id: String(shortcut.id || replacement.id || "").trim() || replacement.id,
                        hotkey: String(shortcut.hotkey || replacement.hotkey || "").trim() || replacement.hotkey
                    });
                    changed = true;
                    continue;
                }
            }
            next.push(shortcut);
        }

        const existingKeys = new Set(next.map(shortcut => String(shortcut?.key || "").trim()).filter(Boolean));
        const existingHotkeys = new Map();
        for (const shortcut of next) {
            const hotkey = normalizeHotkeyToken(shortcut?.hotkey);
            if (hotkey) existingHotkeys.set(hotkey, shortcut);
        }

        for (const key of NOTION_MANAGED_DEFAULT_SHORTCUT_KEYS) {
            if (existingKeys.has(key)) continue;
            const shortcut = createDefaultShortcutByKey(key);
            if (!shortcut) continue;
            const hotkey = normalizeHotkeyToken(shortcut.hotkey);
            const conflict = hotkey ? existingHotkeys.get(hotkey) : null;
            if (conflict) {
                shortcut.hotkey = "";
                console.warn(`${LOG_TAG} migration: hotkey ${hotkey} is already used; added ${shortcut.name || key} without a default hotkey.`);
            } else if (hotkey) {
                existingHotkeys.set(hotkey, shortcut);
            }
            next.push(shortcut);
            existingKeys.add(key);
            newlyAddedKeys.add(key);
            changed = true;
        }

        for (const shortcut of next) {
            if (applyNotionDefaultIconFields(shortcut)) changed = true;
        }
        if (syncNotionDefaultModelHotkeyOrder(next, { forceKeys: newlyAddedKeys })) changed = true;
        if (syncNotionDefaultModelShortcutOrder(next)) changed = true;

        if (changed) gmSetValueLocal(NOTION_DEFAULT_SHORTCUTS_STORAGE_KEY, next);
    }

    migrateNotionManagedModelShortcuts();

    let quickInputController = null;
    function ensureQuickInputController(engineApi) {
        if (quickInputController) return quickInputController;
        const QuickInput = ShortcutTemplate?.quickInput;
        if (!QuickInput || typeof QuickInput.createController !== "function") {
            console.error("[Notion Shortcut] Template quickInput module not found (update Template core).");
            return null;
        }
        const adapter = createNotionQuickInputAdapter({ idPrefix: "notion", engine: engineApi });
        if (!adapter) {
            console.error("[Notion Shortcut] Notion quickInput adapter init failed (update Template core).");
            return null;
        }
        quickInputController = QuickInput.createController({
            engine: engineApi,
            idPrefix: "notion",
            storageKey: NOTION_QUICK_INPUT_STORAGE_KEY,
            title: "Notion - Quick Input",
            titleKey: "quickInputTitle",
            primaryColor: "#2f3437",
            themeColors: NOTION_QUICK_INPUT_THEME,
            themeMode: "system",
            adapter
        });
        return quickInputController;
    }

    function getElementsIncludingRoot(root, selector) {
        const elements = [];
        if (!root || !selector) return elements;
        try {
            if (typeof root.matches === "function" && root.matches(selector)) elements.push(root);
        } catch { }
        return elements.concat(safeQueryAll(root, selector));
    }

    function getResolvedIconUrl(rawValue) {
        const raw = String(rawValue || "").trim();
        if (!raw || raw.startsWith("blob:")) return "";
        if (/^data:image\//i.test(raw)) return raw;
        try {
            const url = new URL(raw, window?.location?.href || NOTION_ORIGIN);
            if (url.protocol === "http:" || url.protocol === "https:") return url.href;
        } catch { }
        return "";
    }

    function getImageIconSource(img) {
        if (!img) return "";
        return getResolvedIconUrl(
            img.currentSrc ||
            img.src ||
            img.getAttribute?.("src") ||
            img.getAttribute?.("data-src") ||
            img.getAttribute?.("data-original-src")
        );
    }

    function getCssImageUrl(value) {
        const raw = String(value || "").trim();
        if (!raw || raw === "none") return "";
        const match = raw.match(/url\((["']?)(.*?)\1\)/i);
        return match ? getResolvedIconUrl(match[2]) : "";
    }

    function getCssIconSource(element) {
        if (!element || typeof window?.getComputedStyle !== "function") return "";
        const pseudos = ["", "::before", "::after"];
        for (const pseudo of pseudos) {
            let style = null;
            try { style = window.getComputedStyle(element, pseudo || undefined); } catch { style = null; }
            if (!style) continue;
            const candidates = [
                style.backgroundImage,
                style.maskImage,
                style.webkitMaskImage
            ];
            for (const candidate of candidates) {
                const source = getCssImageUrl(candidate);
                if (source) return source;
            }
        }
        return "";
    }

    function isPreservedSvgPaintValue(value) {
        const raw = String(value || "").trim();
        return !raw || /^none$/i.test(raw) || /^url\s*\(/i.test(raw) || /^transparent$/i.test(raw);
    }

    function normalizeNotionSvgStyle(styleText, forcePaintColor, paintColor = "currentColor") {
        const declarations = String(styleText || "").split(";");
        const normalized = [];
        for (const rawDeclaration of declarations) {
            const declaration = String(rawDeclaration || "").trim();
            if (!declaration) continue;
            const separatorIndex = declaration.indexOf(":");
            if (separatorIndex <= 0) continue;
            const name = declaration.slice(0, separatorIndex).trim().toLowerCase();
            const value = declaration.slice(separatorIndex + 1).trim();
            if (!name || !value) continue;
            if (name.startsWith("--x-")) continue;
            if ((name === "fill" || name === "stroke") && forcePaintColor && !isPreservedSvgPaintValue(value)) {
                normalized.push(`${name}:${paintColor}`);
            } else {
                normalized.push(`${name}:${value}`);
            }
        }
        return normalized.join(";");
    }

    function removeNotionDuplicateLogoThemeGroups(svg) {
        if (!svg) return;
        try {
            for (const group of Array.from(svg.querySelectorAll(".logo-dark-mode"))) {
                group.remove();
            }
        } catch { }
    }

    function getSvgClassName(svg) {
        if (!svg) return "";
        const rawClass = svg.getAttribute?.("class") || svg.className || "";
        if (typeof rawClass === "string") return rawClass;
        return String(rawClass?.baseVal || "");
    }

    function getNotionModelSvgPaintMode(svg) {
        const className = getSvgClassName(svg);
        return /\b(?:claude|googleGemini)\b/i.test(className) ? "original" : "adaptive";
    }

    function sanitizeNotionNativeSvgIcon(svg, { paintMode = "adaptive", paintColor = "currentColor" } = {}) {
        if (!svg) return null;
        let clone = null;
        try {
            clone = svg.cloneNode(true);
        } catch {
            clone = null;
        }
        if (!clone) return null;

        try {
            const forcePaintColor = paintMode !== "original";
            if (!clone.getAttribute("xmlns")) clone.setAttribute("xmlns", "http://www.w3.org/2000/svg");
            removeNotionDuplicateLogoThemeGroups(clone);
            if (forcePaintColor) {
                clone.setAttribute("fill", paintColor);
                clone.setAttribute("color", paintColor);
            } else {
                clone.removeAttribute("fill");
                clone.removeAttribute("color");
            }
            clone.removeAttribute("class");
            clone.removeAttribute("style");

            const paintTags = new Set(["path", "circle", "rect", "ellipse", "line", "polyline", "polygon", "text"]);
            const skipTags = new Set([
                "defs", "clippath", "mask", "lineargradient", "radialgradient",
                "stop", "pattern", "filter", "image", "foreignobject",
                "style", "script", "metadata", "title", "desc", "symbol", "use"
            ]);
            const nodes = Array.from(clone.querySelectorAll("*"));
            for (const node of nodes) {
                const tag = String(node.tagName || "").toLowerCase();
                if (!tag || skipTags.has(tag)) continue;

                node.removeAttribute("class");
                node.removeAttribute("data-testid");

                let blockedByPaintAncestor = false;
                try {
                    const ancestor = node.closest("defs,clipPath,mask,linearGradient,radialGradient,pattern,filter,symbol");
                    blockedByPaintAncestor = !!ancestor && ancestor !== node;
                } catch { }

                const fill = node.getAttribute("fill");
                if (forcePaintColor && !blockedByPaintAncestor && fill !== null && !isPreservedSvgPaintValue(fill)) {
                    node.setAttribute("fill", paintColor);
                }

                const stroke = node.getAttribute("stroke");
                if (forcePaintColor && !blockedByPaintAncestor && stroke !== null && !isPreservedSvgPaintValue(stroke)) {
                    node.setAttribute("stroke", paintColor);
                }

                if (node.hasAttribute("style")) {
                    const nextStyle = normalizeNotionSvgStyle(node.getAttribute("style"), forcePaintColor && !blockedByPaintAncestor, paintColor);
                    if (nextStyle) node.setAttribute("style", nextStyle);
                    else node.removeAttribute("style");
                }

                const hasPaint = node.hasAttribute("fill") || node.hasAttribute("stroke");
                if (forcePaintColor && !blockedByPaintAncestor && !hasPaint && paintTags.has(tag)) {
                    node.setAttribute("fill", paintColor);
                }
            }
        } catch { }

        return clone;
    }

    function serializeSvgIconSource(svg, options = {}) {
        if (!svg) return "";
        const clone = sanitizeNotionNativeSvgIcon(svg, options);
        if (!clone) return "";
        try {
            const markup = new XMLSerializer().serializeToString(clone);
            return markup ? `data:image/svg+xml,${encodeURIComponent(markup)}` : "";
        } catch {
            return "";
        }
    }

    function isSvgIconSource(source) {
        const value = String(source || "").trim();
        return /^data:image\/svg\+xml/i.test(value) || /\.svg(?:[?#]|$)/i.test(value);
    }

    function extractNotionNativeIconInfoFromElement(root, { paintMode = "adaptive" } = {}) {
        if (!root || isInsideShortcutUi(root)) return null;

        for (const img of getElementsIncludingRoot(root, "img")) {
            if (!img || isInsideShortcutUi(img) || !isVisibleElement(img)) continue;
            const source = getImageIconSource(img);
            if (source) return { icon: source, iconAdaptive: false };
        }

        for (const svg of getElementsIncludingRoot(root, "svg")) {
            if (!svg || isInsideShortcutUi(svg) || !isVisibleElement(svg)) continue;
            if (paintMode === "original") {
                const source = serializeSvgIconSource(svg, { paintMode });
                if (source) return { icon: source, iconDark: "", iconAdaptive: false };
                continue;
            }
            const source = serializeSvgIconSource(svg, { paintMode, paintColor: NOTION_NATIVE_ICON_LIGHT_COLOR });
            const darkSource = serializeSvgIconSource(svg, { paintMode, paintColor: NOTION_NATIVE_ICON_DARK_COLOR });
            if (source) return { icon: source, iconDark: darkSource, iconAdaptive: false };
        }

        for (const element of getElementsIncludingRoot(root, "[role='img'], span, div, button, [role='button']")) {
            if (!element || isInsideShortcutUi(element) || !isVisibleElement(element)) continue;
            const source = getCssIconSource(element);
            if (source) return { icon: source, iconAdaptive: isSvgIconSource(source) };
        }

        return null;
    }

    function extractNotionNativeIconSourceFromElement(root, options = {}) {
        return extractNotionNativeIconInfoFromElement(root, options)?.icon || "";
    }

    function findNotionAiFaceIconSource() {
        const candidates = safeQueryAll(document, "img, [role='img'], [alt*='Notion AI' i], [aria-label*='Notion AI' i]")
            .filter((element) => {
                if (!element || isInsideShortcutUi(element) || !isVisibleElement(element)) return false;
                const label = normalizeNotionText([
                    element.getAttribute?.("alt"),
                    element.getAttribute?.("aria-label"),
                    element.getAttribute?.("title")
                ].filter(Boolean).join(" "));
                return label.includes("notion ai") && (label.includes("face") || label.includes("notion ai"));
            })
            .map((element) => ({ element, source: extractNotionNativeIconSourceFromElement(element), rect: getElementRect(element) }))
            .filter((item) => !!item.source);

        candidates.sort((a, b) => {
            const aFace = normalizeNotionText(a.element.getAttribute?.("alt")).includes("face") ? 1 : 0;
            const bFace = normalizeNotionText(b.element.getAttribute?.("alt")).includes("face") ? 1 : 0;
            if (aFace !== bFace) return bFace - aFace;
            return (b.rect?.width || 0) * (b.rect?.height || 0) - (a.rect?.width || 0) * (a.rect?.height || 0);
        });
        return candidates[0]?.source || NOTION_AI_NATIVE_FACE_ICON;
    }

    function updateNotionShortcutIcons(engineApi, updatesByKey) {
        if (!engineApi || typeof engineApi.getShortcuts !== "function" || typeof engineApi.setShortcuts !== "function") return false;
        const updates = updatesByKey && typeof updatesByKey === "object" ? updatesByKey : null;
        if (!updates) return false;

        const shortcuts = engineApi.getShortcuts();
        if (!Array.isArray(shortcuts) || shortcuts.length === 0) return false;

        let changed = false;
        const next = shortcuts.map((shortcut) => {
            const shortcutKey = getNotionDefaultShortcutKey(shortcut);
            const update = shortcutKey ? updates[shortcutKey] : null;
            if (!update || !update.icon) return shortcut;

            const nextShortcut = { ...shortcut };
            let itemChanged = false;
            if (!String(nextShortcut.key || "").trim()) {
                nextShortcut.key = shortcutKey;
                itemChanged = true;
            }
            if (String(nextShortcut.icon || "").trim() !== update.icon) {
                nextShortcut.icon = update.icon;
                itemChanged = true;
            }
            if (Object.prototype.hasOwnProperty.call(update, "iconDark") && String(nextShortcut.iconDark || "").trim() !== String(update.iconDark || "").trim()) {
                nextShortcut.iconDark = String(update.iconDark || "").trim();
                itemChanged = true;
            }
            if (typeof update.iconAdaptive === "boolean" && !!nextShortcut.iconAdaptive !== update.iconAdaptive) {
                nextShortcut.iconAdaptive = update.iconAdaptive;
                itemChanged = true;
            }
            if (!itemChanged) return shortcut;
            changed = true;
            return nextShortcut;
        });

        if (changed) engineApi.setShortcuts(next);
        return changed;
    }

    function findVisibleNativeElement(selector) {
        return safeQueryAll(document, selector)
            .find(element => element && isVisibleElement(element) && !isInsideShortcutUi(element) && !isElementDisabled(element)) || null;
    }

    function setNotionIconUpdateFromElement(updates, key, element, options = {}) {
        if (!updates || !key || !element) return false;
        const iconInfo = extractNotionNativeIconInfoFromElement(element, options);
        if (!iconInfo?.icon) return false;
        updates[key] = iconInfo;
        return true;
    }

    function getNotionModeIconInfoFromMenuRow(row) {
        if (!row || isInsideShortcutUi(row)) return null;
        const rowRect = getElementRect(row);
        const candidates = getElementsIncludingRoot(row, "svg")
            .map(element => ({ element, rect: getElementRect(element) }))
            .filter(({ element, rect }) => {
                if (!element || !rect || isInsideShortcutUi(element) || !isVisibleElement(element)) return false;
                if (!rowRect) return true;
                return rect.left <= rowRect.left + Math.min(120, rowRect.width * 0.42);
            })
            .sort((a, b) => {
                if (a.rect.left !== b.rect.left) return a.rect.left - b.rect.left;
                return (a.rect.top || 0) - (b.rect.top || 0);
            });
        const svg = candidates[0]?.element || null;
        return extractNotionNativeIconInfoFromElement(svg || row, { paintMode: "adaptive" });
    }

    function setNotionModeIconUpdatesFromOpenMenu(updates) {
        if (!updates) return false;
        let changed = false;
        for (const target of NOTION_MODE_TARGET_LIST) {
            const row = findOpenModeMenuItem(target);
            const iconInfo = getNotionModeIconInfoFromMenuRow(row);
            if (!iconInfo?.icon) continue;
            updates[target.key] = iconInfo;
            changed = true;
        }
        return changed;
    }

    function syncNotionModeShortcutIconsFromOpenMenu(engineApi) {
        const updates = {};
        setNotionModeIconUpdatesFromOpenMenu(updates);
        return Object.keys(updates).length > 0 && updateNotionShortcutIcons(engineApi, updates);
    }

    function getNotionModelIconInfoFromMenuRow(row) {
        if (!row || isInsideShortcutUi(row)) return null;
        const svg = getElementsIncludingRoot(row, "svg")
            .find(element => element && !isInsideShortcutUi(element) && isVisibleElement(element)) || null;
        const paintMode = svg ? getNotionModelSvgPaintMode(svg) : "adaptive";
        return extractNotionNativeIconInfoFromElement(row, { paintMode });
    }

    function setNotionModelIconUpdatesFromMenuRoot(updates, root) {
        if (!updates || !root || isInsideShortcutUi(root)) return false;
        let changed = false;
        for (const target of NOTION_MODEL_TARGET_LIST) {
            const row = findModelMenuItem(root, { target });
            const iconInfo = getNotionModelIconInfoFromMenuRow(row);
            if (!iconInfo?.icon) continue;
            updates[`model-${target.id}`] = iconInfo;
            if (target.id === "auto") updates[LEGACY_SELECT_AI_MODEL_KEY] = iconInfo;
            changed = true;
        }
        return changed;
    }

    function syncNotionModelShortcutIconsFromMenuRoot(engineApi, root) {
        const updates = {};
        setNotionModelIconUpdatesFromMenuRoot(updates, root);
        return Object.keys(updates).length > 0 && updateNotionShortcutIcons(engineApi, updates);
    }

    function syncNotionModelShortcutIconsFromOpenMenu(engineApi) {
        const trigger = findModelTriggerElement();
        const root = findModelMenuRoot(trigger) || findModelMenuRoot();
        return syncNotionModelShortcutIconsFromMenuRoot(engineApi, root);
    }

    function syncNotionVisibleNativeShortcutIcons(engineApi) {
        const updates = {};

        const modelTrigger = findModelTriggerElement();
        const modelRoot = findModelMenuRoot(modelTrigger) || findModelMenuRoot();
        const settingsTrigger = findSettingsTriggerElement();
        const settingsRoot = findSettingsMenuRoot(settingsTrigger) || findSettingsMenuRoot();
        const contextTrigger = findContextMenuTriggerElement();
        const contextRoot = findContextMenuRoot(contextTrigger) || findContextMenuRoot();
        setNotionModelIconUpdatesFromMenuRoot(updates, modelRoot);
        setNotionModeIconUpdatesFromOpenMenu(updates);
        setNotionIconUpdateFromElement(updates, "newChat", findNewChatTriggerElement());
        setNotionIconUpdateFromElement(updates, "selectSearchScope", findOpenAllSourcesMenuItem());
        setNotionIconUpdateFromElement(updates, "toggleWebAccess", findWebAccessMenuItem(settingsRoot));
        setNotionIconUpdateFromElement(updates, "addContext", contextTrigger);
        setNotionIconUpdateFromElement(updates, "attachFile", findAttachFileMenuItem(contextRoot) || findVisibleNativeElement('button[aria-label="Attach file"]'));
        setNotionIconUpdateFromElement(updates, "toggleImageGeneration", findCreateImageMenuItem(contextRoot));

        return Object.keys(updates).length > 0 && updateNotionShortcutIcons(engineApi, updates);
    }

    function syncNotionShortcutIconFromElement(engineApi, key, element) {
        const updates = {};
        setNotionIconUpdateFromElement(updates, key, element);
        return Object.keys(updates).length > 0 && updateNotionShortcutIcons(engineApi, updates);
    }

    function syncNotionImageGenerationShortcutIconFromElement(engineApi, element) {
        return syncNotionShortcutIconFromElement(engineApi, "toggleImageGeneration", element);
    }

    function syncNotionAttachFileShortcutIconFromElement(engineApi, element) {
        return syncNotionShortcutIconFromElement(engineApi, "attachFile", element);
    }

    function syncNotionWebAccessShortcutIconFromElement(engineApi, element) {
        return syncNotionShortcutIconFromElement(engineApi, "toggleWebAccess", element);
    }

    function syncNotionDeleteTopicShortcutIconFromElement(engineApi, element) {
        return syncNotionShortcutIconFromElement(engineApi, "deleteTopic", element);
    }

    function scheduleNotionRuntimeNativeIconSync(engineApi) {
        if (!engineApi) return;
        const sync = () => syncNotionVisibleNativeShortcutIcons(engineApi);
        sync();

        [600, 1600, 3600, 8000].forEach((delay) => {
            try { setTimeout(sync, delay); } catch { }
        });

        const MutationObserverCtor = window?.MutationObserver || null;
        const root = document.body || document.documentElement;
        if (typeof MutationObserverCtor !== "function" || !root) return;

        let timer = null;
        const observer = new MutationObserverCtor(() => {
            if (timer !== null) return;
            timer = setTimeout(() => {
                timer = null;
                sync();
            }, 160);
        });

        try {
            observer.observe(root, {
                childList: true,
                subtree: true,
                attributes: true,
                attributeFilter: ["alt", "src", "srcset", "aria-label", "title"]
            });
            setTimeout(() => {
                try { observer.disconnect(); } catch { }
                if (timer !== null) {
                    clearTimeout(timer);
                    timer = null;
                }
            }, 20000);
        } catch { }
    }

    const engine = ShortcutTemplate.createShortcutEngine({
        menuCommandLabel: "Notion - 设置快捷键",
        panelTitle: "Notion - 自定义快捷键",
        storageKeys: {
            shortcuts: NOTION_DEFAULT_SHORTCUTS_STORAGE_KEY,
            iconCachePrefix: "notion_icon_cache_v1::",
            userIcons: "notion_user_icons_v1"
        },
        ui: {
            idPrefix: "notion",
            cssPrefix: "notion",
            compactBreakpoint: 800
        },
        i18n: {
            messages: SITE_MESSAGES
        },
        defaultIconURL,
        iconLibrary: defaultIcons,
        protectedIconUrls,
        defaultShortcuts,
        customActions: {
            newChat: triggerNewChatAction,
            openModelPicker: openModelPickerAction,
            modelPicker: clickModelPickerItem,
            selectMode: selectModeAction,
            toggleResearchMode: toggleResearchModeAction,
            toggleAllSources: toggleAllSourcesAction,
            selectSearchScope: toggleAllSourcesAction,
            toggleWebAccess: toggleWebAccessAction,
            toggleImageGeneration: toggleImageGenerationAction,
            conversationMenu: clickConversationMenuItem,
            quickInput: ({ engine }) => {
                ensureQuickInputController(engine)?.toggle?.();
            }
        },
        customActionDataAdapters: {
            modelPicker: createMenuDataAdapter({
                label: siteText("dataAdapters.modelPicker.label", "Model ID / keyword (or paste JSON, advanced):"),
                placeholder: siteText("dataAdapters.modelPicker.placeholder", 'Example: gemini pro / opus 4.7 / {"menu":{"id":"opus47"}}')
            }),
            conversationMenu: createMenuDataAdapter({
                label: siteText("dataAdapters.conversationMenu.label", "Conversation menu item ID / keyword (or paste JSON, advanced):"),
                placeholder: siteText("dataAdapters.conversationMenu.placeholder", 'Example: delete / Delete / {"menu":{"id":"delete"}}')
            })
        },
        consoleTag: LOG_TAG,
        colors: {
            primary: "#2f3437"
        },
        shouldBypassIconCache: (url) => {
            const value = String(url || "");
            return value.startsWith(`${NOTION_LEGACY_ORIGIN}/`) || value.startsWith(`${NOTION_ORIGIN}/`);
        },
        text: {
            menuLabelFallback: "打开快捷键设置"
        }
    });

    engine.init();
    scheduleNotionRuntimeNativeIconSync(engine);

    let quickInputMenuCommandId = null;
    function registerNotionQuickInputMenuCommand(engineApi) {
        if (quickInputMenuCommandId !== null) {
            gmUnregisterMenuCommandLocal(quickInputMenuCommandId);
            quickInputMenuCommandId = null;
        }
        quickInputMenuCommandId = gmRegisterMenuCommandLocal(
            engineApi.i18n?.t?.("quickInputTitle", {}, "Notion - Quick Input") || "Notion - Quick Input",
            () => {
                ensureQuickInputController(engineApi)?.open?.();
            }
        );
    }

    registerNotionQuickInputMenuCommand(engine);
    engine.i18n?.addLocaleChangeListener?.(() => registerNotionQuickInputMenuCommand(engine));
})();
