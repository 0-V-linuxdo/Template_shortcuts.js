/* -------------------------------------------------------------------------- *
 * Site Manifest · Legacy userscript build targets
 * -------------------------------------------------------------------------- */

export const RELEASE_PUBLISH_CONFIG = Object.freeze({
    githubOwner: "0-V-linuxdo",
    repository: "Template_shortcuts.js",
    releaseBranch: "release",
    gitUserName: "0-V-linuxdo",
    gitUserEmail: "0_v@linux.do"
});

export const MAIN_RAW_BASE_URL = `https://github.com/${RELEASE_PUBLISH_CONFIG.githubOwner}/${RELEASE_PUBLISH_CONFIG.repository}/raw/refs/heads/main`;
export const RELEASE_RAW_BASE_URL = `https://github.com/${RELEASE_PUBLISH_CONFIG.githubOwner}/${RELEASE_PUBLISH_CONFIG.repository}/raw/refs/heads/${RELEASE_PUBLISH_CONFIG.releaseBranch}`;
export const RELEASE_TEMPLATE_CORE_FILE = "[Template] shortcut core.js";

function normalizeReleaseAssetPath(filePath = "") {
    const normalizedPath = String(filePath || "")
        .trim()
        .replace(/\\/g, "/")
        .replace(/^(?:\.\/)+/, "")
        .replace(/^\/+/, "");

    if (!normalizedPath) return "";
    if (normalizedPath.split("/").some((segment) => segment === "..")) {
        throw new Error(`Release asset path must not traverse parent directories: ${filePath}`);
    }
    return normalizedPath;
}

function encodeAssetPath(normalizedPath = "") {
    const pathValue = String(normalizedPath || "").trim();
    if (!pathValue) return "";
    return pathValue.split("/").map((segment) => encodeURIComponent(segment)).join("/");
}

function releaseAsset(relativePath = "") {
    const normalizedPath = normalizeReleaseAssetPath(relativePath);
    const encodedPath = encodeAssetPath(normalizedPath);
    return encodedPath ? `${RELEASE_RAW_BASE_URL}/${encodedPath}` : RELEASE_RAW_BASE_URL;
}

function mainAsset(relativePath = "") {
    const normalizedPath = normalizeReleaseAssetPath(relativePath);
    const encodedPath = encodeAssetPath(normalizedPath);
    return encodedPath ? `${MAIN_RAW_BASE_URL}/${encodedPath}` : MAIN_RAW_BASE_URL;
}

const RELEASE_ICON_BASE_URL = releaseAsset("Site_Icon");

export function releaseTemplateJs(relativePath = "") {
    const normalizedPath = normalizeReleaseAssetPath(relativePath);
    return normalizedPath ? releaseAsset(`Template_JS/${normalizedPath}`) : releaseAsset("Template_JS");
}

export function releaseTemplateCore() {
    return releaseTemplateJs(RELEASE_TEMPLATE_CORE_FILE);
}

function releaseIcon(fileName) {
    return releaseAsset(`Site_Icon/${fileName}`);
}

function mainIcon(fileName) {
    return mainAsset(`Site_Icon/${fileName}`);
}

function svgDataUrl(svgText) {
    const normalizedSvg = String(svgText || "").trim().replace(/\s+/g, " ");
    return normalizedSvg ? `data:image/svg+xml,${encodeURIComponent(normalizedSvg)}` : "";
}

const CHATGPT_KEYCAP_ICON = svgDataUrl(`
<svg viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" role="img" preserveAspectRatio="xMidYMid meet" class="chatgpt-keycap-icon">
  <style>
    :root { color-scheme: light dark; }
    .chatgpt-keycap-icon { color: #000000; }
    @media (prefers-color-scheme: dark) { .chatgpt-keycap-icon { color: #FFFFFF; } }
  </style>
  <g id="SVGRepo_bgCarrier" stroke-width="0"></g>
  <g id="SVGRepo_tracerCarrier" stroke-linecap="round" stroke-linejoin="round"></g>
  <g id="SVGRepo_iconCarrier">
    <path d="M52 2H12C6.478 2 2 6.477 2 11.999V52c0 5.522 4.478 10 10 10h40c5.522 0 10-4.478 10-10V11.999C62 6.477 57.522 2 52 2zm5 43.666A8.333 8.333 0 0 1 48.667 54H15.333A8.333 8.333 0 0 1 7 45.666V12.333A8.332 8.332 0 0 1 15.333 4h33.334A8.332 8.332 0 0 1 57 12.333v33.333z" fill="currentColor" fill-rule="evenodd" clip-rule="evenodd"></path>
  </g>
  <svg x="11.5" y="9" width="41" height="41" fill="currentColor" fill-rule="evenodd" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><title>OpenAI</title><path d="M21.55 10.004a5.416 5.416 0 00-.478-4.501c-1.217-2.09-3.662-3.166-6.05-2.66A5.59 5.59 0 0010.831 1C8.39.995 6.224 2.546 5.473 4.838A5.553 5.553 0 001.76 7.496a5.487 5.487 0 00.691 6.5 5.416 5.416 0 00.477 4.502c1.217 2.09 3.662 3.165 6.05 2.66A5.586 5.586 0 0013.168 23c2.443.006 4.61-1.546 5.361-3.84a5.553 5.553 0 003.715-2.66 5.488 5.488 0 00-.693-6.497v.001zm-8.381 11.558a4.199 4.199 0 01-2.675-.954c.034-.018.093-.05.132-.074l4.44-2.53a.71.71 0 00.364-.623v-6.176l1.877 1.069c.02.01.033.029.036.05v5.115c-.003 2.274-1.87 4.118-4.174 4.123zM4.192 17.78a4.059 4.059 0 01-.498-2.763c.032.02.09.055.131.078l4.44 2.53c.225.13.504.13.73 0l5.42-3.088v2.138a.068.068 0 01-.027.057L9.9 19.288c-1.999 1.136-4.552.46-5.707-1.51h-.001zM3.023 8.216A4.15 4.15 0 015.198 6.41l-.002.151v5.06a.711.711 0 00.364.624l5.42 3.087-1.876 1.07a.067.067 0 01-.063.005l-4.489-2.559c-1.995-1.14-2.679-3.658-1.53-5.63h-.001zm15.417 3.54l-5.42-3.088L14.896 7.6a.067.067 0 01.063-.006l4.489 2.557c1.998 1.14 2.683 3.662 1.529 5.633a4.163 4.163 0 01-2.174 1.807V12.38a.71.71 0 00-.363-.623zm1.867-2.773a6.04 6.04 0 00-.132-.078l-4.44-2.53a.731.731 0 00-.729 0l-5.42 3.088V7.325a.068.068 0 01.027-.057L14.1 4.713c2-1.137 4.555-.46 5.707 1.513.487.833.664 1.809.499 2.757h.001zm-11.741 3.81l-1.877-1.068a.065.065 0 01-.036-.051V6.559c.001-2.277 1.873-4.122 4.181-4.12.976 0 1.92.338 2.671.954-.034.018-.092.05-.131.073l-4.44 2.53a.71.71 0 00-.365.623l-.003 6.173v.002zm1.02-2.168L12 9.25l2.414 1.375v2.75L12 14.75l-2.415-1.375v-2.75z"></path></svg>
</svg>
`);

const KEYCAP_FRAME_PATH = "M52 2H12C6.478 2 2 6.477 2 11.999V52c0 5.522 4.478 10 10 10h40c5.522 0 10-4.478 10-10V11.999C62 6.477 57.522 2 52 2zm5 43.666A8.333 8.333 0 0 1 48.667 54H15.333A8.333 8.333 0 0 1 7 45.666V12.333A8.332 8.332 0 0 1 15.333 4h33.334A8.332 8.332 0 0 1 57 12.333v33.333z";

function themeAdaptiveKeycapIcon(className, innerMarkup) {
    const safeClassName = String(className || "theme-keycap-icon").trim() || "theme-keycap-icon";
    return svgDataUrl(`
<svg viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" role="img" preserveAspectRatio="xMidYMid meet" class="${safeClassName}">
  <style>
    :root { color-scheme: light dark; }
    .${safeClassName} { color: #000000; }
    @media (prefers-color-scheme: dark) { .${safeClassName} { color: #FFFFFF; } }
  </style>
  <path d="${KEYCAP_FRAME_PATH}" fill="currentColor" fill-rule="evenodd" clip-rule="evenodd"></path>
  ${innerMarkup}
</svg>
`);
}

const GROK_KEYCAP_ICON = themeAdaptiveKeycapIcon(
    "grok-keycap-icon",
    `<g transform="translate(13,10) scale(0.16)" fill="currentColor" fill-rule="evenodd"><path d="m92.7 152.9 79.78 -58.97c3.91 -2.9 9.5 -1.77 11.37 2.72 9.8 23.69 5.42 52.15 -14.1 71.69s-46.67 23.82 -71.49 14.06l-27.11 12.57c38.89 26.61 86.11 20.03 115.62 -9.53 23.41 -23.44 30.66 -55.39 23.88 -84.2l0.06 0.07c-9.83 -42.32 2.42 -59.24 27.5 -93.83Q239.11 6.25 240 5l-33.01 33.05v-0.1L92.67 152.92m-16.44 14.31c-27.92 -26.7 -23.1 -68.01 0.71 -91.84 17.61 -17.63 46.47 -24.83 71.66 -14.25l27.05 -12.5a78 78 0 0 0 -18.29 -10A89.75 89.75 0 0 0 59.84 58.3c-25.33 25.36 -33.3 64.36 -19.62 97.64 10.22 24.87 -6.53 42.46 -23.4 60.22 -5.99 6.3 -11.99 12.59 -16.82 19.25l76.2 -68.15"></path></g>`
);

const PERPLEXITY_KEYCAP_ICON = themeAdaptiveKeycapIcon(
    "perplexity-keycap-icon",
    `<path d="m42.78 14.56-10.791 9.131h10.79zm-10.791 9.131-9.961-9.13v9.13zm0-10.791v34.032m9.96-13.28-9.96-9.961v12.7l9.96 8.881zm-19.921 0 9.96-9.961v12.444l-9.96 9.137zm-4.15-9.961v13.281h4.15v-3.32l9.96-9.961zm14.11 0 9.962 9.96v3.32h4.15v-13.28z" stroke="currentColor" stroke-width="1.66" stroke-miterlimit="10" fill="none"></path>`
);

const BILIBILI_KEYCAP_ICON = themeAdaptiveKeycapIcon(
    "bilibili-keycap-icon",
    `<g transform="translate(12, 12) scale(1.666)"><path fill="none" d="M0 0h24v24H0z"></path><path d="M7.172 2.757L10.414 6h3.171l3.243-3.242a1 1 0 0 1 1.415 1.415l-1.829 1.827L18.5 6A3.5 3.5 0 0 1 22 9.5v8a3.5 3.5 0 0 1-3.5 3.5h-13A3.5 3.5 0 0 1 2 17.5v-8A3.5 3.5 0 0 1 5.5 6h2.085L5.757 4.171a1 1 0 0 1 1.415-1.415zM18.5 8h-13a1.5 1.5 0 0 0-1.493 1.356L4 9.5v8a1.5 1.5 0 0 0 1.356 1.493L5.5 19h13a1.5 1.5 0 0 0 1.493-1.356L20 17.5v-8A1.5 1.5 0 0 0 18.5 8zM8 11a1 1 0 0 1 1 1v2a1 1 0 0 1-2 0v-2a1 1 0 0 1 1-1zm8 0a1 1 0 0 1 1 1v2a1 1 0 0 1-2 0v-2a1 1 0 0 1 1-1z" fill="currentColor"></path></g>`
);

const CLAUDE_KEYCAP_ICON = themeAdaptiveKeycapIcon(
    "claude-keycap-icon",
    `<path fill="#d97757" d="m19.798 35.671 7.822-4.389.131-.38-.131-.213h-.381l-1.307-.08-4.47-.121-3.876-.161-3.755-.202-.945-.2-.886-1.17.091-.582.795-.534 1.138.099 2.515.172 3.774.26 2.738.161 4.056.422h.644l.092-.26-.22-.162-.172-.16-3.906-2.648-4.228-2.797-2.214-1.61-1.197-.816-.604-.765-.26-1.67 1.086-1.197 1.46.1.374.099 1.479 1.138 3.16 2.445 4.125 3.039.604.502.242-.172.03-.12-.272-.454-2.244-4.056-2.394-4.126-1.066-1.71-.282-1.025c-.1-.422-.172-.776-.172-1.208l1.238-1.68.684-.22 1.651.22.695.603 1.026 2.346 1.661 3.694 2.577 5.022.754 1.49.403 1.38.15.421h.26v-.241l.213-2.83.392-3.473.38-4.47.132-1.259.623-1.508L35.25 9.8l.966.462.795 1.138-.11.735-.473 3.071-.926 4.81-.604 3.222h.352l.402-.403 1.63-2.164 2.738-3.422 1.208-1.358 1.409-1.5.904-.715h1.71l1.26 1.871-.564 1.933-1.761 2.233-1.46 1.892-2.094 2.819-1.308 2.255.121.18.312-.03 4.73-1.007 2.555-.461 3.05-.524 1.379.645.15.655-.542 1.339-3.261.805-3.826.765-5.696 1.348-.07.05.081.1 2.566.242 1.098.059h2.687l5.004.373 1.307.864.784 1.058-.132.805-2.013 1.026-2.716-.645-6.34-1.508-2.175-.542h-.3v.18l1.811 1.771 3.32 2.998 4.159 3.866.212.955-.535.755-.563-.08-3.654-2.75-1.409-1.237-3.191-2.687h-.212v.282l.735 1.076 3.884 5.839.202 1.79-.282.582-1.007.352-1.106-.201-2.273-3.192-2.347-3.594-1.892-3.221-.23.131L32.58 47.92l-.524.614-1.208.462-1.006-.765-.535-1.237.535-2.446.644-3.192.523-2.536.473-3.152.281-1.046-.018-.07-.231.03-2.376 3.26-3.613 4.883-2.859 3.06-.684.272-1.187-.615.11-1.098.664-.977 3.956-5.033 2.387-3.12 1.54-1.8-.01-.26h-.092l-10.509 6.823-1.87.241-.806-.754.1-1.237.38-.403 3.16-2.174-.01.01Z"></path>`
);

const DEEPSEEK_KEYCAP_ICON = themeAdaptiveKeycapIcon(
    "deepseek-keycap-icon",
    `<g transform="translate(32,32) scale(1.5) translate(-12,-13.5)"><path d="M23.748 4.482c-.254-.124-.364.113-.512.234-.051.039-.094.09-.137.136-.372.397-.806.657-1.373.626-.829-.046-1.537.214-2.163.848-.133-.782-.575-1.248-1.247-1.548-.352-.156-.708-.311-.955-.65-.172-.241-.219-.51-.305-.774-.055-.16-.11-.323-.293-.35-.2-.031-.278.136-.356.276-.313.572-.434 1.202-.422 1.84.027 1.436.633 2.58 1.838 3.393.137.093.172.187.129.323-.082.28-.18.552-.266.833-.055.179-.137.217-.329.14a5.526 5.526 0 01-1.736-1.18c-.857-.828-1.631-1.742-2.597-2.458a11.365 11.365 0 00-.689-.471c-.985-.957.13-1.743.388-1.836.27-.098.093-.432-.779-.428-.872.004-1.67.295-2.687.684a3.055 3.055 0 01-.465.137 9.597 9.597 0 00-2.883-.102c-1.885.21-3.39 1.102-4.497 2.623C.082 8.606-.231 10.684.152 12.85c.403 2.284 1.569 4.175 3.36 5.653 1.858 1.533 3.997 2.284 6.438 2.14 1.482-.085 3.133-.284 4.994-1.86.47.234.962.327 1.78.397.63.059 1.236-.03 1.705-.128.735-.156.684-.837.419-.961-2.155-1.004-1.682-.595-2.113-.926 1.096-1.296 2.746-2.642 3.392-7.003.05-.347.007-.565 0-.845-.004-.17.035-.237.23-.256a4.173 4.173 0 001.545-.475c1.396-.763 1.96-2.015 2.093-3.517.02-.23-.004-.467-.247-.588zM11.581 18c-2.089-1.642-3.102-2.183-3.52-2.16-.392.024-.321.471-.235.763.09.288.207.486.371.739.114.167.192.416-.113.603-.673.416-1.842-.14-1.897-.167-1.361-.802-2.5-1.86-3.301-3.307-.774-1.393-1.224-2.887-1.298-4.482-.02-.386.093-.522.477-.592a4.696 4.696 0 011.529-.039c2.132.312 3.946 1.265 5.468 2.774.868.86 1.525 1.887 2.202 2.891.72 1.066 1.494 2.082 2.48 2.914.348.292.625.514.891.677-.802.09-2.14.11-3.054-.614zm1-6.44a.306.306 0 01.415-.287.302.302 0 01.2.288.306.306 0 01-.31.307.303.303 0 01-.304-.308zm3.11 1.596c-.2.081-.399.151-.59.16a1.245 1.245 0 01-.798-.254c-.274-.23-.47-.358-.552-.758a1.73 1.73 0 01.016-.588c.07-.327-.008-.537-.239-.727-.187-.156-.426-.199-.688-.199a.559.559 0 01-.254-.078c-.11-.054-.2-.19-.114-.358.028-.054.16-.186.192-.21.356-.202.767-.136 1.146.016.352.144.618.408 1.001.782.391.451.462.576.685.914.176.265.336.537.445.848.067.195-.019.354-.25.452z" fill="#4D6BFE"></path></g>`
);

const GEMINI_KEYCAP_ICON = themeAdaptiveKeycapIcon(
    "gemini-keycap-icon",
    `<svg x="13" y="11" width="38" height="38" viewBox="0 0 24 24"><defs><linearGradient gradientUnits="userSpaceOnUse" id="gemini-keycap-gradient-0" x1="7" x2="11" y1="15.5" y2="12"><stop stop-color="#08B962"></stop><stop offset="1" stop-color="#08B962" stop-opacity="0"></stop></linearGradient><linearGradient gradientUnits="userSpaceOnUse" id="gemini-keycap-gradient-1" x1="8" x2="11.5" y1="5.5" y2="11"><stop stop-color="#F94543"></stop><stop offset="1" stop-color="#F94543" stop-opacity="0"></stop></linearGradient><linearGradient gradientUnits="userSpaceOnUse" id="gemini-keycap-gradient-2" x1="3.5" x2="17.5" y1="13.5" y2="12"><stop stop-color="#FABC12"></stop><stop offset=".46" stop-color="#FABC12" stop-opacity="0"></stop></linearGradient></defs><path d="M20.616 10.835a14.147 14.147 0 01-4.45-3.001 14.111 14.111 0 01-3.678-6.452.503.503 0 00-.975 0 14.134 14.134 0 01-3.679 6.452 14.155 14.155 0 01-4.45 3.001c-.65.28-1.318.505-2.002.678a.502.502 0 000 .975c.684.172 1.35.397 2.002.677a14.147 14.147 0 014.45 3.001 14.112 14.112 0 013.679 6.453.502.502 0 00.975 0c.172-.685.397-1.351.677-2.003a14.145 14.145 0 013.001-4.45 14.113 14.113 0 016.453-3.678.503.503 0 000-.975 13.245 13.245 0 01-2.003-.678z" fill="#3186FF"></path><path d="M20.616 10.835a14.147 14.147 0 01-4.45-3.001 14.111 14.111 0 01-3.678-6.452.503.503 0 00-.975 0 14.134 14.134 0 01-3.679 6.452 14.155 14.155 0 01-4.45 3.001c-.65.28-1.318.505-2.002.678a.502.502 0 000 .975c.684.172 1.35.397 2.002.677a14.147 14.147 0 014.45 3.001 14.112 14.112 0 013.679 6.453.502.502 0 00.975 0c.172-.685.397-1.351.677-2.003a14.145 14.145 0 013.001-4.45 14.113 14.113 0 016.453-3.678.503.503 0 000-.975 13.245 13.245 0 01-2.003-.678z" fill="url(#gemini-keycap-gradient-0)"></path><path d="M20.616 10.835a14.147 14.147 0 01-4.45-3.001 14.111 14.111 0 01-3.678-6.452.503.503 0 00-.975 0 14.134 14.134 0 01-3.679 6.452 14.155 14.155 0 01-4.45 3.001c-.65.28-1.318.505-2.002.678a.502.502 0 000 .975c.684.172 1.35.397 2.002.677a14.147 14.147 0 014.45 3.001 14.112 14.112 0 013.679 6.453.502.502 0 00.975 0c.172-.685.397-1.351.677-2.003a14.145 14.145 0 013.001-4.45 14.113 14.113 0 016.453-3.678.503.503 0 000-.975 13.245 13.245 0 01-2.003-.678z" fill="url(#gemini-keycap-gradient-1)"></path><path d="M20.616 10.835a14.147 14.147 0 01-4.45-3.001 14.111 14.111 0 01-3.678-6.452.503.503 0 00-.975 0 14.134 14.134 0 01-3.679 6.452 14.155 14.155 0 01-4.45 3.001c-.65.28-1.318.505-2.002.678a.502.502 0 000 .975c.684.172 1.35.397 2.002.677a14.147 14.147 0 014.45 3.001 14.112 14.112 0 013.679 6.453.502.502 0 00.975 0c.172-.685.397-1.351.677-2.003a14.145 14.145 0 013.001-4.45 14.113 14.113 0 016.453-3.678.503.503 0 000-.975 13.245 13.245 0 01-2.003-.678z" fill="url(#gemini-keycap-gradient-2)"></path></svg>`
);

const KAGI_KEYCAP_ICON = themeAdaptiveKeycapIcon(
    "kagi-keycap-icon",
    `<path d="M35.262 38.36H28.51c-1.855 0-2.138-1.99-1.792-2.789.165-.379.539-.927.892-1.376a9.06 9.06 0 0 0 4.389 1.13 9.13 9.13 0 0 0 9.12-9.122 9.1 9.1 0 0 0-3.022-6.775l.21-.212a2.32 2.32 0 0 1 1.9-.68l1.097.116v-4.47h-1.918a5.21 5.21 0 0 0-4.833 3.267 9.1 9.1 0 0 0-2.559-.366 9.13 9.13 0 0 0-6.446 2.674 9.13 9.13 0 0 0-2.675 6.446 9.08 9.08 0 0 0 1.774 5.402l-.54.416a4 4 0 0 0-.267.229c-1.848 1.723-2.695 3.98-2.211 6.49.265 1.376 1.433 2.804 2.621 3.561a5.35 5.35 0 0 0 2.823.82l7.569-.306a2.49 2.49 0 0 1 2.109 1.155l.989 1.785 4.692-1.568-.803-1.748a7.01 7.01 0 0 0-6.367-4.079m-3.263-16.519a4.367 4.367 0 0 1 4.36 4.36 4.367 4.367 0 0 1-4.36 4.359 4.367 4.367 0 0 1-4.36-4.36A4.367 4.367 0 0 1 32 21.842" fill="#FFB319"></path>`
);

const LINUX_DO_KEYCAP_ICON = themeAdaptiveKeycapIcon(
    "linux-do-keycap-icon",
    `<defs><clipPath id="linux-do-keycap-clip"><circle cx="60" cy="60" r="47"></circle></clipPath></defs><g transform="translate(12 7) scale(0.3333)"><circle fill="#f0f0f0" cx="60" cy="60" r="50"></circle><rect fill="#1c1c1e" clip-path="url(#linux-do-keycap-clip)" x="10" y="10" width="100" height="30"></rect><rect fill="#f0f0f0" clip-path="url(#linux-do-keycap-clip)" x="10" y="40" width="100" height="40"></rect><rect fill="#ffb003" clip-path="url(#linux-do-keycap-clip)" x="10" y="80" width="100" height="30"></rect></g>`
);

const LE_CHAT_KEYCAP_ICON = themeAdaptiveKeycapIcon(
    "le-chat-keycap-icon",
    `<g transform="translate(15.2, 13.4) scale(1.4)"><path d="M3.428 3.4h3.429v3.428H3.428V3.4zm13.714 0h3.43v3.428h-3.43V3.4z" fill="gold"></path><path d="M3.428 6.828h6.857v3.429H3.429V6.828zm10.286 0h6.857v3.429h-6.857V6.828z" fill="#FFAF00"></path><path d="M3.428 10.258h17.144v3.428H3.428v-3.428z" fill="#FF8205"></path><path d="M3.428 13.686h3.429v3.428H3.428v-3.428zm6.858 0h3.429v3.428h-3.429v-3.428zm6.856 0h3.43v3.428h-3.43v-3.428z" fill="#FA500F"></path><path d="M0 17.114h10.286v3.429H0v-3.429zm13.714 0H24v3.429H13.714v-3.429z" fill="#E10500"></path></g>`
);

const NOTION_KEYCAP_ICON = themeAdaptiveKeycapIcon(
    "notion-keycap-icon",
    `<g transform="translate(14, 11) scale(2.4)" fill="currentColor"><path d="M3.25781 3.11684C3.67771 3.45796 3.83523 3.43193 4.62369 3.37933L12.0571 2.93299C12.2147 2.93299 12.0836 2.77571 12.0311 2.74957L10.7965 1.85711C10.56 1.67347 10.2448 1.46315 9.64083 1.51576L2.44308 2.04074C2.18059 2.06677 2.12815 2.19801 2.2327 2.30322L3.25781 3.11684ZM3.7041 4.84917V12.6704C3.7041 13.0907 3.91415 13.248 4.38693 13.222L12.5562 12.7493C13.0292 12.7233 13.0819 12.4341 13.0819 12.0927V4.32397C13.0819 3.98306 12.9508 3.79921 12.6612 3.82545L4.12422 4.32397C3.80918 4.35044 3.7041 4.50803 3.7041 4.84917ZM11.7688 5.26872C11.8212 5.50518 11.7688 5.74142 11.5319 5.76799L11.1383 5.84641V11.6205C10.7965 11.8042 10.4814 11.9092 10.2188 11.9092C9.79835 11.9092 9.69305 11.7779 9.37812 11.3844L6.80345 7.34249V11.2532L7.61816 11.437C7.61816 11.437 7.61816 11.9092 6.96086 11.9092L5.14879 12.0143C5.09615 11.9092 5.14879 11.647 5.33259 11.5944L5.80546 11.4634V6.29276L5.1489 6.24015C5.09625 6.00369 5.22739 5.66278 5.5954 5.63631L7.53935 5.50528L10.2188 9.5998V5.97765L9.53564 5.89924C9.4832 5.61018 9.69305 5.40028 9.95576 5.37425L11.7688 5.26872ZM1.83874 1.33212L9.32557 0.780787C10.245 0.701932 10.4815 0.754753 11.0594 1.17452L13.4492 2.85424C13.8436 3.14309 13.975 3.22173 13.975 3.53661V12.7493C13.975 13.3266 13.7647 13.6681 13.0293 13.7203L4.33492 14.2454C3.78291 14.2717 3.52019 14.193 3.23111 13.8253L1.47116 11.5419C1.1558 11.1216 1.02466 10.8071 1.02466 10.4392V2.25041C1.02466 1.77825 1.23504 1.38441 1.83874 1.33212Z"></path></g>`
);

const TELEGRAM_KEYCAP_ICON = themeAdaptiveKeycapIcon(
    "telegram-keycap-icon",
    `<g transform="translate(7.168 4.168) scale(0.097)" fill="currentColor"><path d="M199 404c-11 0-10-4-13-14l-32-105 245-144"></path><path d="M199 404c7 0 11-4 16-8l45-43-56-34"></path><path d="M204 319l135 99c14 9 26 4 30-14l55-258c5-22-9-32-24-25L79 245c-21 8-21 21-4 26l83 26 190-121c9-5 17-3 11 4"></path></g>`
);

export const SITE_MANIFEST = Object.freeze([
    {
        siteId: "chatgpt",
        displayName: "[ChatGPT] 快捷键跳转",
        sourceEntry: "src/sites/chatgpt/index.js",
        metadata: {
            name: "[ChatGPT] 快捷键跳转 [20260511] v1.1.0",
            namespace: "https://github.com/0-V-linuxdo/Template_shortcuts.js",
            description: "为 ChatGPT 提供可视化自定义快捷键：支持 URL/按钮/按键动作、工具菜单（Web/Canvas/Thinking/Deep research/Create image）一键触发，以及快捷输入（文本+图片、循环发送、自动新建对话）。",
            version: "[20260511] v1.1.0",
            updateLog: "1.1.0: 修复 ChatGPT Project 场景下 Quick Input 循环运行一段时间后掉回普通 ChatGPT 的问题；现在会在面板打开期间持续保留 Project 目标，并在校验失败时自动跳回同一 Project。",
            localized: {
                "en-US": {
                    name: "[ChatGPT] Shortcut Jump [20260511] v1.1.0",
                    description: "Visual custom shortcuts for ChatGPT: URL/button/key actions, one-step tool menu triggers, and Quick Input for text, images, loops, and automatic new chats.",
                    updateLog: "1.1.0: Fixed ChatGPT Quick Input Project loops drifting back to regular ChatGPT after running for a while; Project targets are now kept while the panel is open and recovered with a jump back to the same Project when verification fails."
                }
            },
            match: [
                "https://chatgpt.com/*"
            ],
            grant: [
                "GM_registerMenuCommand",
                "GM_getValue",
                "GM_setValue",
                "GM_xmlhttpRequest"
            ],
            connect: [
                "*"
            ],
            icon: CHATGPT_KEYCAP_ICON
        }
    },
    {
        siteId: "claude",
        displayName: "[Claude] 快捷键跳转",
        sourceEntry: "src/sites/claude/index.js",
        metadata: {
            name: "[Claude] 快捷键跳转 [20260508] v1.0.0",
            namespace: "https://github.com/0-V-linuxdo/Template_shortcuts.js",
            description: "为 Claude AI 添加自定义快捷键(跳转/点击/模拟按键), 支持自定义 图标/快捷键/选择器/模拟按键, 适配暗黑模式。新增: 预设图标库(可折叠/自定义添加/长按删除)。功能包括: 侧边栏切换、新建话题、历史记录等快捷操作。基于Template模块重构。",
            version: "[20260508] v1.0.0",
            updateLog: "1.0.0: 保留原键帽样式，将 Claude 脚本图标键帽改为普通模式黑色、黑暗模式白色自适应。",
            localized: {
                "en-US": {
                    name: "[Claude] Shortcut Jump [20260508] v1.0.0",
                    description: "Adds visual custom shortcuts for Claude AI, including URL jumps, clicks, simulated keys, custom icons, dark mode, and a reusable icon library.",
                    updateLog: "1.0.0: Kept the original keycap style and made the Claude script icon keycap adapt to black in light mode and white in dark mode."
                }
            },
            match: [
                "https://claude.ai/*"
            ],
            grant: [
                "GM_registerMenuCommand",
                "GM_getValue",
                "GM_setValue",
                "GM_xmlhttpRequest"
            ],
            connect: [
                "*"
            ],
            icon: CLAUDE_KEYCAP_ICON
        }
    },
    {
        siteId: "deepseek",
        displayName: "[DeepSeek] 快捷键跳转",
        sourceEntry: "src/sites/deepseek/index.js",
        metadata: {
            name: "[DeepSeek] 快捷键跳转 [20260508] v1.0.0",
            namespace: "0_V userscripts/[DeepSeek] shortcut",
            description: "为 DeepSeek Chat 添加自定义快捷键(跳转/点击/模拟按键、可视化设置面板、按类型筛选、深色模式、自适应布局、图标缓存、快捷键捕获等功能)，基于模版重构。#refactor2025",
            version: "[20260508] v1.0.0",
            updateLog: "1.0.0: 保留原键帽样式，将 DeepSeek 脚本图标键帽改为普通模式黑色、黑暗模式白色自适应。",
            localized: {
                "en-US": {
                    name: "[DeepSeek] Shortcut Jump [20260508] v1.0.0",
                    description: "Adds custom shortcuts for DeepSeek Chat with URL jumps, clicks, simulated keys, a visual settings panel, filters, dark mode, responsive layout, icon cache, and shortcut capture.",
                    updateLog: "1.0.0: Kept the original keycap style and made the DeepSeek script icon keycap adapt to black in light mode and white in dark mode."
                }
            },
            match: [
                "https://chat.deepseek.com/*"
            ],
            grant: [
                "GM_registerMenuCommand",
                "GM_getValue",
                "GM_setValue",
                "GM_xmlhttpRequest"
            ],
            connect: [
                "*"
            ],
            icon: DEEPSEEK_KEYCAP_ICON
        }
    },
    {
        siteId: "gemini",
        displayName: "[Gemini] 快捷键跳转",
        sourceEntry: "src/sites/gemini/index.js",
        metadata: {
            name: "[Gemini] 快捷键跳转 [20260512] v1.2.2",
            namespace: "https://github.com/0-V-linuxdo/Template_shortcuts.js",
            description: "为 Gemini 提供可视化自定义快捷键：快速新建会话、切换模型、打开工具、Pin/Delete 对话与快捷输入发送，支持按键和图标自定义。",
            version: "[20260512] v1.2.2",
            updateLog: "1.2.2: 增强 Gemini Notebook Quick Input 新对话校验：Notebook 场景改为最多 3 次重试、每次等待 45 秒、重试间隔 2 秒，以适应 Thinking 状态较久的循环。",
            localized: {
                "en-US": {
                    name: "[Gemini] Shortcut Jump [20260512] v1.2.2",
                    description: "Visual custom shortcuts for Gemini: new chats, model switching, tools, pin/delete conversation actions, Quick Input, and customizable keys and icons.",
                    updateLog: "1.2.2: Strengthened Gemini Notebook Quick Input new-chat verification with up to 3 retries, 45 seconds per check, and a 2-second retry delay for long Thinking states."
                }
            },
            match: [
                "https://gemini.google.com/*"
            ],
            grant: [
                "GM_registerMenuCommand",
                "GM_unregisterMenuCommand",
                "GM_getValue",
                "GM_setValue",
                "GM_xmlhttpRequest"
            ],
            connect: [
                "*"
            ],
            icon: GEMINI_KEYCAP_ICON
        }
    },
    {
        siteId: "grok",
        displayName: "[Grok] 快捷键跳转",
        sourceEntry: "src/sites/grok/index.js",
        metadata: {
            name: "[Grok] 快捷键跳转 [20260518] v1.1.8",
            namespace: "0_V userscripts/[Grok] 快捷键跳转",
            description: "为Grok网站添加快捷键功能，支持自定义按键和图标，以及自动选择，完美适配暗黑模式。新增: 动作类型系统(URL跳转/元素点击/按键模拟)、预设图标库(可折叠/自定义添加/长按删除)、图标缓存机制。使用Template模块重构。",
            version: "[20260518] v1.1.8",
            updateLog: "1.1.8: 修复 Delete Chat 菜单项未被真实激活的问题，新增带坐标的 pointer 点击、键盘激活兜底与菜单关闭校验。",
            localized: {
                "en-US": {
                    name: "[Grok] Shortcut Jump [20260518] v1.1.8",
                    description: "Adds custom shortcuts for Grok with configurable keys and icons, dark mode support, action types, a preset icon library, and icon caching.",
                    updateLog: "1.1.8: Fixed the Delete Chat menu item not being truly activated by adding coordinate pointer clicks, keyboard fallback, and menu-dismiss verification."
                }
            },
            match: [
                "https://grok.dairoot.cn/*",
                "https://grok.com/*"
            ],
            grant: [
                "GM_registerMenuCommand",
                "GM_unregisterMenuCommand",
                "GM_getValue",
                "GM_setValue",
                "GM_xmlhttpRequest"
            ],
            connect: [
                "*"
            ],
            icon: GROK_KEYCAP_ICON
        }
    },
    {
        siteId: "kagi",
        displayName: "[Kagi] 快捷键跳转",
        sourceEntry: "src/sites/kagi/index.js",
        metadata: {
            name: "[Kagi] 快捷键跳转 [20260508] v1.0.0",
            namespace: "0_V userscripts/[Kagi] shortcut",
            description: "为 Kagi Assistant 与 Kagi Search 提供自定义快捷键、可视化设置面板、图标库、按类型筛选、深色模式适配等增强功能（依赖 Template 模块）。#refactor2025",
            version: "[20260508] v1.0.0",
            updateLog: "1.0.0: 保留原键帽样式，将 Kagi 脚本图标键帽改为普通模式黑色、黑暗模式白色自适应。",
            localized: {
                "en-US": {
                    name: "[Kagi] Shortcut Jump [20260508] v1.0.0",
                    description: "Custom shortcuts for Kagi Assistant and Kagi Search with a visual settings panel, icon library, type filters, and dark mode support.",
                    updateLog: "1.0.0: Kept the original keycap style and made the Kagi script icon keycap adapt to black in light mode and white in dark mode."
                }
            },
            match: [
                "https://*.kagi.com/*"
            ],
            grant: [
                "GM_registerMenuCommand",
                "GM_getValue",
                "GM_setValue",
                "GM_xmlhttpRequest"
            ],
            connect: [
                "*"
            ],
            icon: KAGI_KEYCAP_ICON
        }
    },
    {
        siteId: "linux-do",
        displayName: "[LINUX DO] 快捷键跳转",
        sourceEntry: "src/sites/linux-do/index.js",
        metadata: {
            name: "[LINUX DO] 快捷键跳转 [20260508] v1.0.0",
            namespace: "https://github.com/0-V-linuxdo/Template_shortcuts.js",
            description: "为 Linux Do 提供可视化快捷键中心：支持 URL 跳转、元素点击、按键模拟、搜索模板变量与图标库管理，并适配 Discourse 的 SPA 导航场景。",
            version: "[20260508] v1.0.0",
            updateLog: "1.0.0: 保留原键帽样式，将 Linux Do 脚本图标键帽改为普通模式黑色、黑暗模式白色自适应。",
            localized: {
                "en-US": {
                    name: "[LINUX DO] Shortcut Jump [20260508] v1.0.0",
                    description: "A visual shortcut center for Linux Do with URL jumps, element clicks, key simulation, search template variables, icon library management, and Discourse SPA navigation support.",
                    updateLog: "1.0.0: Kept the original keycap style and made the Linux Do script icon keycap adapt to black in light mode and white in dark mode."
                }
            },
            match: [
                "https://linux.do/*"
            ],
            grant: [
                "GM_registerMenuCommand",
                "GM_getValue",
                "GM_setValue",
                "GM_xmlhttpRequest"
            ],
            connect: [
                "*"
            ],
            icon: LINUX_DO_KEYCAP_ICON
        }
    },
    {
        siteId: "le-chat",
        displayName: "[Le Chat] 快捷键跳转",
        sourceEntry: "src/sites/le-chat/index.js",
        metadata: {
            name: "[Le Chat] 快捷键跳转 [20260508] v1.0.0",
            namespace: "0_V userscripts/[Le Chat] 快捷键跳转",
            description: "为 Le Chat 添加自定义快捷键，依托通用模板实现快捷面板、图标库、统计筛选、暗黑模式、自适应布局、事件隔离、快捷键捕获等功能。",
            version: "[20260508] v1.0.0",
            updateLog: "1.0.0: 保留原键帽样式，将 Le Chat 脚本图标键帽改为普通模式黑色、黑暗模式白色自适应。",
            localized: {
                "en-US": {
                    name: "[Le Chat] Shortcut Jump [20260508] v1.0.0",
                    description: "Adds custom shortcuts for Le Chat with a shortcut panel, icon library, stats filters, dark mode, responsive layout, event isolation, and shortcut capture.",
                    updateLog: "1.0.0: Kept the original keycap style and made the Le Chat script icon keycap adapt to black in light mode and white in dark mode."
                }
            },
            match: [
                "https://chat.mistral.ai/*"
            ],
            grant: [
                "GM_registerMenuCommand",
                "GM_getValue",
                "GM_setValue",
                "GM_xmlhttpRequest"
            ],
            connect: [
                "*"
            ],
            icon: LE_CHAT_KEYCAP_ICON
        }
    },
    {
        siteId: "notion",
        displayName: "[Notion] 快捷键跳转",
        sourceEntry: "src/sites/notion/index.js",
        metadata: {
            name: "[Notion] 快捷键跳转 [20260518] v1.0.5",
            namespace: "https://github.com/0-V-linuxdo/Template_shortcuts.js",
            description: "为 Notion AI 提供当前 Template 架构的可视化自定义快捷键：支持新建聊天、快捷输入、联网开关、直接选择 Auto/Claude/Gemini/GPT/Kimi/DeepSeek 等模型，并保留研究模式、搜索范围、添加上下文与附件快捷动作。",
            version: "[20260518] v1.0.5",
            updateLog: "1.0.5: 修复 Notion AI Quick Input 真实输入框读取链路；当 DOM value/text 为空时改用聚焦选择后的 Selection 文本校验，并让 role=textbox 继续走真实编辑命令写入。",
            localized: {
                "en-US": {
                    name: "[Notion] Shortcut Jump [20260518] v1.0.5",
                    description: "Template-based visual custom shortcuts for Notion AI, with new chat, quick input, web access toggle, direct model shortcuts for Auto/Claude/Gemini/GPT/Kimi/DeepSeek, and research, search scope, context, and attachment actions.",
                    updateLog: "1.0.5: Fixed Notion AI Quick Input's real composer read path; when DOM value/text is empty it now verifies focused selection text, and role=textbox continues through real editing commands for insertion."
                }
            },
            match: [
                "https://*.notion.so/*",
                "https://notion.so/*"
            ],
            grant: [
                "GM_registerMenuCommand",
                "GM_unregisterMenuCommand",
                "GM_getValue",
                "GM_setValue",
                "GM_xmlhttpRequest"
            ],
            connect: [
                "*"
            ],
            icon: NOTION_KEYCAP_ICON
        }
    },
    {
        siteId: "perplexity",
        displayName: "[Perplexity] 快捷键跳转",
        sourceEntry: "src/sites/perplexity/index.js",
        metadata: {
            name: "[Perplexity] 快捷键跳转 [20260508] v1.0.0",
            namespace: "0_V userscripts/[Perplexity] shortcut",
            description: "为 Perplexity.ai 添加自定义快捷键(跳转/点击/模拟按键), 支持自定义 图标/快捷键/选择器/模拟按键, 适配暗黑模式。新增: 预设图标库(可折叠/自定义添加/长按删除)、图标缓存、用户体验优化等功能。（基于 Template 模块重构）",
            version: "[20260508] v1.0.0",
            updateLog: "1.0.0: 保留原键帽样式，将 Perplexity 脚本图标内联到脚本头，普通模式使用黑色配色，黑暗模式使用白色配色。",
            localized: {
                "en-US": {
                    name: "[Perplexity] Shortcut Jump [20260508] v1.0.0",
                    description: "Adds custom shortcuts for Perplexity.ai with URL jumps, clicks, simulated keys, custom icons, selectors, dark mode, an icon library, icon caching, and UX improvements.",
                    updateLog: "1.0.0: Kept the original keycap style, inlined the Perplexity script icon in the userscript header, and used black in light mode and white in dark mode."
                }
            },
            match: [
                "https://www.perplexity.ai/*"
            ],
            grant: [
                "GM_registerMenuCommand",
                "GM_getValue",
                "GM_setValue",
                "GM_xmlhttpRequest"
            ],
            connect: [
                "*"
            ],
            icon: PERPLEXITY_KEYCAP_ICON
        }
    },
    {
        siteId: "poe",
        displayName: "[Poe] 快捷键跳转",
        sourceEntry: "src/sites/poe/index.js",
        metadata: {
            name: "[Poe] 快捷键跳转 [20260423] v1.0.5",
            namespace: "https://github.com/0-V-linuxdo/Template_shortcuts.js",
            description: "为 Poe 提供可视化快捷键中心：支持 URL 跳转、元素点击、按键模拟、自定义动作，并内置消息复制/编辑、重命名保存与侧边栏切换等站点专属操作。",
            version: "[20260423] v1.0.5",
            updateLog: "1.0.5: 恢复 legacy require 架构，移除桥接式启动链。",
            localized: {
                "en-US": {
                    name: "[Poe] Shortcut Jump [20260423] v1.0.5",
                    description: "A visual shortcut center for Poe with URL jumps, element clicks, key simulation, custom actions, message copy/edit, rename save, and sidebar toggles.",
                    updateLog: "1.0.5: Restored the legacy require architecture and removed the bridged startup chain."
                }
            },
            match: [
                "https://poe.com/*"
            ],
            grant: [
                "GM_registerMenuCommand",
                "GM_unregisterMenuCommand",
                "GM_getValue",
                "GM_setValue",
                "GM_xmlhttpRequest"
            ],
            connect: [
                "*"
            ],
            icon: "https://psc2.cf2.poecdn.net/assets/favicon.svg"
        }
    },
    {
        siteId: "telegram",
        displayName: "[Telegram] 快捷键跳转",
        sourceEntry: "src/sites/telegram/index.js",
        metadata: {
            name: "[Telegram] 快捷键跳转 [20260508] v1.0.0",
            namespace: "https://github.com/0-V-linuxdo/Template_shortcuts.js",
            description: "为 Telegram 网页客户端提供 Template 架构的可视化快捷键中心。支持 URL 跳转、元素点击、按键模拟与图标库管理，并兼容旧版存储键与 Telegram 哈希路由跳转。",
            version: "[20260508] v1.0.0",
            updateLog: "1.0.0: 保留原键帽样式，将 Telegram 脚本图标键帽改为普通模式黑色、黑暗模式白色自适应。",
            localized: {
                "en-US": {
                    name: "[Telegram] Shortcut Jump [20260508] v1.0.0",
                    description: "A Template-based visual shortcut center for Telegram Web with URL jumps, element clicks, key simulation, icon library management, legacy storage compatibility, and hash-route navigation.",
                    updateLog: "1.0.0: Kept the original keycap style and made the Telegram script icon keycap adapt to black in light mode and white in dark mode."
                }
            },
            match: [
                "https://web.telegram.org/a/*"
            ],
            grant: [
                "GM_registerMenuCommand",
                "GM_getValue",
                "GM_setValue",
                "GM_xmlhttpRequest"
            ],
            connect: [
                "*"
            ],
            icon: TELEGRAM_KEYCAP_ICON
        }
    },
    {
        siteId: "bilibili",
        displayName: "[哔哩哔哩] 快捷键跳转",
        sourceEntry: "src/sites/bilibili/index.js",
        metadata: {
            name: "[哔哩哔哩] 快捷键跳转 [20260508] v1.0.0",
            namespace: "0_V userscripts/bilibiliSearch Shortcuts",
            description: "在 Bilibili 搜索页面，通过快捷键快速切换到对应的搜索分类，支持多种操作类型（URL跳转/元素点击/按键模拟），包含图标库管理、完善暗黑模式支持、智能事件隔离、滚动锁定等高级功能。基于模版架构全面升级。",
            version: "[20260508] v1.0.0",
            updateLog: "1.0.0: 保留原键帽样式，将哔哩哔哩脚本图标内联到脚本头，普通模式使用黑色配色，黑暗模式使用白色配色。",
            localized: {
                "en-US": {
                    name: "[Bilibili] Shortcut Jump [20260508] v1.0.0",
                    description: "Quickly switch Bilibili search categories with shortcuts. Supports URL jumps, element clicks, key simulation, icon library management, dark mode, event isolation, and scroll lock.",
                    updateLog: "1.0.0: Kept the original keycap style, inlined the Bilibili script icon in the userscript header, and used black in light mode and white in dark mode."
                }
            },
            match: [
                "https://*.bilibili.com/*"
            ],
            grant: [
                "GM_registerMenuCommand",
                "GM_getValue",
                "GM_setValue",
                "GM_xmlhttpRequest"
            ],
            connect: [
                "*"
            ],
            icon: BILIBILI_KEYCAP_ICON
        }
    }
]);

export const RELEASE_SITE_ICON_FILES = Object.freeze(
    Array.from(
        new Set(
            SITE_MANIFEST.map((entry) => String(entry?.metadata?.icon || ""))
                .filter((icon) => icon.startsWith(`${RELEASE_ICON_BASE_URL}/`))
                .map((icon) => icon.slice(`${RELEASE_ICON_BASE_URL}/`.length))
        )
    ).sort()
);
