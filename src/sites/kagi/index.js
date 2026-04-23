/* -------------------------------------------------------------------------- *
 * Site Entry · [Kagi] 快捷键跳转
 * -------------------------------------------------------------------------- */

(function() {
    'use strict';

    const ShortcutTemplate = window.ShortcutTemplate;

    if (!ShortcutTemplate || typeof ShortcutTemplate.createShortcutEngine !== 'function') {
        console.error('[Kagi Shortcut] Template module not found.');
        return;
    }

    const LOG_TAG = "[Kagi Shortcut Script]";
    const defaultIconURL = "https://kagi.com/favicon-32x32.png";
    const kagiTranslateLightIconDataURL = "data:image/svg+xml,%3Csvg%20width%3D%2218.92%22%20height%3D%2218.92%22%20viewBox%3D%220%200%2018.92%2018.92%22%20fill%3D%22none%22%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%3E%0A%20%20%3Cg%20clip-path%3D%22url(%23clip0)%22%3E%0A%20%20%20%20%3Cg%20transform%3D%22translate(-69.5864%20-5.79022)%22%3E%0A%20%20%20%20%20%20%3Cpath%20d%3D%22M71.2966%2019.3925C71.299%2019.9998%2071.5413%2020.5814%2071.9706%2021.0108C72.4%2021.4402%2072.9817%2021.6824%2073.5889%2021.6848H75.0103%22%20stroke%3D%22%2318181A%22%20stroke-width%3D%220.88%22%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%2F%3E%0A%20%20%20%20%20%20%3Cpath%20d%3D%22M75.6796%2021.684L74.4574%2020.1416%22%20stroke%3D%22%2318181A%22%20stroke-width%3D%220.88%22%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%2F%3E%0A%20%20%20%20%20%20%3Cpath%20d%3D%22M75.6796%2021.6843L74.4574%2023.2266%22%20stroke%3D%22%2318181A%22%20stroke-width%3D%220.88%22%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%2F%3E%0A%20%20%20%20%20%20%3Cpath%20d%3D%22M86.2522%2010.2939C86.2522%209.68399%2086.0101%209.09901%2085.579%208.66752C85.1479%208.23602%2084.5632%207.99331%2083.9532%207.99272H82.543%22%20stroke%3D%22%2318181A%22%20stroke-width%3D%220.88%22%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%2F%3E%0A%20%20%20%20%20%20%3Cpath%20d%3D%22M81.8715%207.99272L83.0915%209.5373%22%20stroke%3D%22%2318181A%22%20stroke-width%3D%220.88%22%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%2F%3E%0A%20%20%20%20%20%20%3Cpath%20d%3D%22M81.8715%207.99574L83.0915%206.45116%22%20stroke%3D%22%2318181A%22%20stroke-width%3D%220.88%22%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%2F%3E%0A%20%20%20%20%20%20%3Cpath%20fill-rule%3D%22evenodd%22%20clip-rule%3D%22evenodd%22%20d%3D%22M87.9702%2015.6488V20.8779C87.9705%2021.2578%2087.8959%2021.634%2087.7507%2021.9851C87.6055%2022.3361%2087.3924%2022.655%2087.1238%2022.9237C86.8552%2023.1923%2086.5363%2023.4053%2086.1852%2023.5505C85.8342%2023.6958%2085.458%2023.7704%2085.0781%2023.7701H81.218C80.4512%2023.7694%2079.7159%2023.4645%2079.1737%2022.9223C78.6314%2022.38%2078.3265%2021.6448%2078.3259%2020.8779V15.6488C78.3259%2014.8815%2078.6306%2014.1457%2079.1729%2013.6029C79.7152%2013.0602%2080.4508%2012.755%2081.218%2012.7543H85.0781C85.8454%2012.755%2086.581%2013.0602%2087.1233%2013.6029C87.6656%2014.1457%2087.9702%2014.8815%2087.9702%2015.6488Z%22%20fill%3D%22%2374BD44%22%20stroke%3D%22%2318181A%22%20stroke-width%3D%221.1%22%2F%3E%0A%20%20%20%20%20%20%3Cpath%20d%3D%22M81.2157%2020.9341V16.9341C81.2157%2016.4207%2081.4196%2015.9283%2081.7827%2015.5652C82.1457%2015.2022%2082.6381%2014.9982%2083.1516%2014.9982C83.665%2014.9982%2084.1574%2015.2022%2084.5204%2015.5652C84.8834%2015.9283%2085.0874%2016.4207%2085.0874%2016.9341V20.9341%22%20stroke%3D%22%2318181A%22%20stroke-width%3D%220.88%22%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%2F%3E%0A%20%20%20%20%20%20%3Cpath%20d%3D%22M81.2181%2018.688H85.0899%22%20stroke%3D%22%2318181A%22%20stroke-width%3D%220.88%22%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%2F%3E%0A%20%20%20%20%20%20%3Cpath%20fill-rule%3D%22evenodd%22%20clip-rule%3D%22evenodd%22%20d%3D%22M79.7556%209.84415V15.0733C79.7556%2015.8405%2079.451%2016.5764%2078.9087%2017.1192C78.3663%2017.6619%2077.6307%2017.9671%2076.8635%2017.9677H73.0034C72.237%2017.9659%2071.5026%2017.6601%2070.9613%2017.1175C70.42%2016.5749%2070.116%2015.8397%2070.116%2015.0733V9.84415C70.1157%209.46426%2070.1903%209.08805%2070.3355%208.73702C70.4807%208.38599%2070.6938%208.06705%2070.9624%207.79843C71.231%207.52981%2071.5499%207.31679%2071.901%207.17155C72.252%207.02632%2072.6282%206.95172%2073.0081%206.95203H76.8565C77.6233%206.95264%2078.3586%207.25755%2078.9008%207.79979C79.4431%208.34204%2079.748%209.0773%2079.7486%209.84415H79.7556Z%22%20fill%3D%22white%22%20stroke%3D%22%2318181A%22%20stroke-width%3D%221.1%22%20stroke-linejoin%3D%22round%22%2F%3E%0A%20%20%20%20%20%20%3Cpath%20d%3D%22M74.8671%209.18591L76.8169%2013.6524L75.6064%2013.5964%22%20stroke%3D%22%2318181A%22%20stroke-width%3D%220.88%22%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%2F%3E%0A%20%20%20%20%20%20%3Cpath%20d%3D%22M77.1995%209.75357L72.4298%2010.3786%22%20stroke%3D%22%2318181A%22%20stroke-width%3D%220.88%22%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%2F%3E%0A%20%20%20%20%20%20%3Cpath%20d%3D%22M77.0804%2015.439H74.1417C73.7204%2015.439%2073.3164%2015.2717%2073.0185%2014.9738C72.7207%2014.6759%2072.5533%2014.2719%2072.5533%2013.8507%22%20stroke%3D%22%2318181A%22%20stroke-width%3D%220.88%22%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%2F%3E%0A%20%20%20%20%20%20%3Cpath%20d%3D%22M77.442%2011.5177L72.6816%2012.1428%22%20stroke%3D%22%2318181A%22%20stroke-width%3D%220.88%22%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%2F%3E%0A%20%20%20%20%3C%2Fg%3E%0A%20%20%3C%2Fg%3E%0A%20%20%3Cdefs%3E%0A%20%20%20%20%3CclipPath%20id%3D%22clip0%22%3E%0A%20%20%20%20%20%20%3Crect%20width%3D%2218.92%22%20height%3D%2218.92%22%20fill%3D%22white%22%2F%3E%0A%20%20%20%20%3C%2FclipPath%3E%0A%20%20%3C%2Fdefs%3E%0A%3C%2Fsvg%3E";
    const kagiTranslateDarkIconDataURL = "data:image/svg+xml,%3Csvg%20width%3D%2218.92%22%20height%3D%2218.92%22%20viewBox%3D%220%200%2018.92%2018.92%22%20fill%3D%22none%22%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%3E%0A%20%20%3Cg%20clip-path%3D%22url(%23clip0)%22%3E%0A%20%20%20%20%3Cg%20transform%3D%22translate(-69.5865%20-5.79022)%22%3E%0A%20%20%20%20%20%20%3Cpath%20d%3D%22M71.2967%2019.3925C71.2991%2019.9998%2071.5413%2020.5814%2071.9707%2021.0108C72.4001%2021.4402%2072.9817%2021.6824%2073.589%2021.6848H75.0104%22%20stroke%3D%22white%22%20stroke-width%3D%220.88%22%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%2F%3E%0A%20%20%20%20%20%20%3Cpath%20d%3D%22M75.6797%2021.684L74.4575%2020.1416%22%20stroke%3D%22white%22%20stroke-width%3D%220.88%22%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%2F%3E%0A%20%20%20%20%20%20%3Cpath%20d%3D%22M75.6797%2021.6843L74.4575%2023.2266%22%20stroke%3D%22white%22%20stroke-width%3D%220.88%22%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%2F%3E%0A%20%20%20%20%20%20%3Cpath%20d%3D%22M86.2523%2010.2939C86.2523%209.68399%2086.0102%209.09901%2085.5791%208.66752C85.148%208.23602%2084.5633%207.99331%2083.9533%207.99272H82.5431%22%20stroke%3D%22white%22%20stroke-width%3D%220.88%22%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%2F%3E%0A%20%20%20%20%20%20%3Cpath%20d%3D%22M81.8715%207.99272L83.0915%209.5373%22%20stroke%3D%22white%22%20stroke-width%3D%220.88%22%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%2F%3E%0A%20%20%20%20%20%20%3Cpath%20d%3D%22M81.8715%207.99574L83.0915%206.45116%22%20stroke%3D%22white%22%20stroke-width%3D%220.88%22%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%2F%3E%0A%20%20%20%20%20%20%3Cpath%20fill-rule%3D%22evenodd%22%20clip-rule%3D%22evenodd%22%20d%3D%22M87.9703%2015.6488V20.8779C87.9706%2021.2578%2087.896%2021.634%2087.7508%2021.9851C87.6055%2022.3361%2087.3925%2022.655%2087.1239%2022.9237C86.8553%2023.1923%2086.5363%2023.4053%2086.1853%2023.5505C85.8343%2023.6958%2085.4581%2023.7704%2085.0782%2023.7701H81.2181C80.4513%2023.7694%2079.716%2023.4645%2079.1738%2022.9223C78.6315%2022.38%2078.3266%2021.6448%2078.326%2020.8779V15.6488C78.326%2014.8815%2078.6306%2014.1457%2079.1729%2013.6029C79.7153%2013.0602%2080.4509%2012.755%2081.2181%2012.7543H85.0782C85.8454%2012.755%2086.581%2013.0602%2087.1233%2013.6029C87.6657%2014.1457%2087.9703%2014.8815%2087.9703%2015.6488Z%22%20fill%3D%22%2374BD44%22%20stroke%3D%22%2318181A%22%20stroke-width%3D%221.1%22%2F%3E%0A%20%20%20%20%20%20%3Cpath%20d%3D%22M81.2158%2020.9341V16.9341C81.2158%2016.4207%2081.4197%2015.9283%2081.7827%2015.5652C82.1458%2015.2022%2082.6382%2014.9982%2083.1516%2014.9982C83.665%2014.9982%2084.1574%2015.2022%2084.5205%2015.5652C84.8835%2015.9283%2085.0875%2016.4207%2085.0875%2016.9341V20.9341%22%20stroke%3D%22%2318181A%22%20stroke-width%3D%220.88%22%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%2F%3E%0A%20%20%20%20%20%20%3Cpath%20d%3D%22M81.2181%2018.688H85.0898%22%20stroke%3D%22%2318181A%22%20stroke-width%3D%220.88%22%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%2F%3E%0A%20%20%20%20%20%20%3Cpath%20fill-rule%3D%22evenodd%22%20clip-rule%3D%22evenodd%22%20d%3D%22M79.7557%209.84415V15.0733C79.7557%2015.8405%2079.451%2016.5764%2078.9087%2017.1192C78.3664%2017.6619%2077.6308%2017.9671%2076.8636%2017.9677H73.0035C72.2371%2017.9659%2071.5026%2017.6601%2070.9613%2017.1175C70.42%2016.5749%2070.116%2015.8397%2070.116%2015.0733V9.84415C70.1157%209.46426%2070.1903%209.08805%2070.3356%208.73702C70.4808%208.38599%2070.6938%208.06705%2070.9624%207.79843C71.2311%207.52981%2071.55%207.31679%2071.901%207.17155C72.2521%207.02632%2072.6283%206.95172%2073.0082%206.95203H76.8566C77.6234%206.95264%2078.3587%207.25755%2078.9009%207.79979C79.4432%208.34204%2079.7481%209.0773%2079.7487%209.84415H79.7557Z%22%20fill%3D%22white%22%20stroke%3D%22%2318181A%22%20stroke-width%3D%221.1%22%20stroke-linejoin%3D%22round%22%2F%3E%0A%20%20%20%20%20%20%3Cpath%20d%3D%22M74.8671%209.18591L76.8169%2013.6524L75.6064%2013.5964%22%20stroke%3D%22%2318181A%22%20stroke-width%3D%220.88%22%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%2F%3E%0A%20%20%20%20%20%20%3Cpath%20d%3D%22M77.1995%209.75357L72.4298%2010.3786%22%20stroke%3D%22%2318181A%22%20stroke-width%3D%220.88%22%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%2F%3E%0A%20%20%20%20%20%20%3Cpath%20d%3D%22M77.0804%2015.439H74.1417C73.7204%2015.439%2073.3164%2015.2717%2073.0185%2014.9738C72.7207%2014.6759%2072.5533%2014.2719%2072.5533%2013.8507%22%20stroke%3D%22%2318181A%22%20stroke-width%3D%220.88%22%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%2F%3E%0A%20%20%20%20%20%20%3Cpath%20d%3D%22M77.4419%2011.5177L72.6816%2012.1428%22%20stroke%3D%22%2318181A%22%20stroke-width%3D%220.88%22%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%2F%3E%0A%20%20%20%20%3C%2Fg%3E%0A%20%20%3C%2Fg%3E%0A%20%20%3Cdefs%3E%0A%20%20%20%20%3CclipPath%20id%3D%22clip0%22%3E%0A%20%20%20%20%20%20%3Crect%20width%3D%2218.92%22%20height%3D%2218.92%22%20fill%3D%22white%22%2F%3E%0A%20%20%20%20%3C%2FclipPath%3E%0A%20%20%3C%2Fdefs%3E%0A%3C%2Fsvg%3E";

    const defaultIcons = [
        { name: "Kagi Search", url: "https://kagi.com/favicon-32x32.png" },
        { name: "Kagi Assistant", url: "https://kagi.com/favicon-assistant-32x32.png" },
        { name: "Kagi Translate", url: kagiTranslateLightIconDataURL },
        { name: "Google", url: "https://www.google.com/favicon.ico" },
        { name: "Bing", url: "https://www.bing.com/favicon.ico" },
        { name: "DuckDuckGo", url: "https://duckduckgo.com/favicon.ico" },
        { name: "Baidu", url: "https://www.baidu.com/favicon.ico" },
        { name: "Wikipedia", url: "https://www.wikipedia.org/static/favicon/wikipedia.ico" },
        { name: "Reddit", url: "https://www.reddit.com/favicon.ico" },
        { name: "Stack Overflow", url: "https://cdn.sstatic.net/Sites/stackoverflow/Img/favicon.ico" },
        { name: "GitHub", url: "https://github.githubassets.com/favicons/favicon.svg" },
        { name: "Twitter / X", url: "https://abs.twimg.com/favicons/twitter.3.ico" },
        { name: "Bilibili", url: "https://www.bilibili.com/favicon.ico" },
        { name: "YouTube", url: "https://www.youtube.com/favicon.ico" }
    ];

    const protectedIconUrls = [
        "https://kagi.com/favicon-32x32.png",
        "https://kagi.com/favicon-assistant-32x32.png",
        kagiTranslateLightIconDataURL
    ];

    const baseShortcut = Object.freeze({
        url: "",
        urlMethod: "current",
        urlAdvanced: "href",
        selector: "",
        simulateKeys: "",
        customAction: "",
        data: {},
        icon: defaultIconURL
    });

    function deriveShortcutKeyFromName(name) {
        const raw = String(name ?? "").trim();
        if (!raw) return "";
        const words = raw.split(/[\s_-]+/g).filter(Boolean);
        const cleaned = words
            .map(word => word.replace(/[^a-zA-Z0-9]/g, ""))
            .filter(Boolean);
        if (cleaned.length === 0) return "";

        const [first, ...rest] = cleaned;
        const head = first.toLowerCase();
        const tail = rest
            .map(word => word.toLowerCase())
            .map(word => word ? word[0].toUpperCase() + word.slice(1) : "")
            .filter(Boolean)
            .join("");
        return head + tail;
    }

    const createShortcut = (overrides) => {
        const shortcut = { ...baseShortcut, ...(overrides || {}) };
        const existingKey = (typeof shortcut.key === "string") ? shortcut.key.trim() : "";
        if (!existingKey && typeof shortcut.name === "string") {
            const derived = deriveShortcutKeyFromName(shortcut.name);
            if (derived) shortcut.key = derived;
        }
        return shortcut;
    };

    const defaultShortcuts = [
        {
            name: "All Search",
            actionType: "url",
            url: "https://kagi.com/search?q=%s",
            urlMethod: "current",
            urlAdvanced: "href",
            selector: "",
            simulateKeys: "",
            hotkey: "CTRL+K",
            icon: "https://kagi.com/favicon-32x32.png"
        },
        {
            name: "Images Search",
            actionType: "url",
            url: "https://kagi.com/images?q=%s",
            urlMethod: "current",
            urlAdvanced: "href",
            selector: "",
            simulateKeys: "",
            hotkey: "CTRL+I",
            icon: "https://kagi.com/favicon-32x32.png"
        },
        {
            name: "Videos Search",
            actionType: "url",
            url: "https://kagi.com/videos?q=%s",
            urlMethod: "current",
            urlAdvanced: "href",
            selector: "",
            simulateKeys: "",
            hotkey: "CTRL+SHIFT+V",
            icon: "https://kagi.com/favicon-32x32.png"
        },
        {
            name: "News Search",
            actionType: "url",
            url: "https://kagi.com/news?q=%s",
            urlMethod: "current",
            urlAdvanced: "href",
            selector: "",
            simulateKeys: "",
            hotkey: "CTRL+SHIFT+N",
            icon: "https://kagi.com/favicon-32x32.png"
        },
        {
            name: "Podcasts Search",
            actionType: "url",
            url: "https://kagi.com/podcasts?q=%s",
            urlMethod: "current",
            urlAdvanced: "href",
            selector: "",
            simulateKeys: "",
            hotkey: "CTRL+P",
            icon: "https://kagi.com/favicon-32x32.png"
        },
        {
            name: "Maps Search",
            actionType: "url",
            url: "https://kagi.com/maps?q=%s",
            urlMethod: "current",
            urlAdvanced: "href",
            selector: "",
            simulateKeys: "",
            hotkey: "CTRL+SHIFT+M",
            icon: "https://kagi.com/favicon-32x32.png"
        },
        {
            name: "Toggle Sidebar",
            actionType: "simulate",
            selector: "",
            url: "",
            urlMethod: "current",
            urlAdvanced: "href",
            simulateKeys: "CMD+SHIFT+S",
            hotkey: "CTRL+B",
            icon: "https://kagi.com/favicon-assistant-32x32.png"
        },
        {
            name: "New Thread",
            actionType: "simulate",
            selector: "",
            url: "",
            urlMethod: "current",
            urlAdvanced: "href",
            simulateKeys: "CMD+K",
            hotkey: "CTRL+N",
            icon: "https://kagi.com/favicon-assistant-32x32.png"
        },
        {
            name: "Delete Current Thread",
            actionType: "simulate",
            selector: "",
            url: "",
            urlMethod: "current",
            urlAdvanced: "href",
            simulateKeys: "CMD+SHIFT+BACKSPACE",
            hotkey: "CTRL+BACKSPACE",
            icon: "https://kagi.com/favicon-assistant-32x32.png"
        },
        {
            name: "Toggle Web Access",
            actionType: "selector",
            selector: 'input[type="checkbox"][aria-label="Web access"]',
            url: "",
            urlMethod: "current",
            urlAdvanced: "href",
            simulateKeys: "",
            hotkey: "CTRL+W",
            icon: "https://kagi.com/favicon-assistant-32x32.png"
        },
        {
            name: "Upload Files",
            actionType: "selector",
            selector: 'label[for="fileInput"]',
            url: "",
            urlMethod: "current",
            urlAdvanced: "href",
            simulateKeys: "",
            hotkey: "CTRL+F",
            icon: "https://kagi.com/favicon-assistant-32x32.png"
        },
        {
            name: "Voice Input",
            actionType: "selector",
            selector: 'button[aria-label="Voice input"]',
            url: "",
            urlMethod: "current",
            urlAdvanced: "href",
            simulateKeys: "",
            hotkey: "CTRL+SHIFT+V",
            icon: "https://kagi.com/favicon-assistant-32x32.png"
        },
        {
            name: "Model Chooser",
            actionType: "selector",
            selector: 'button[id="profile-select"]',
            url: "",
            urlMethod: "current",
            urlAdvanced: "href",
            simulateKeys: "",
            hotkey: "CTRL+M",
            icon: "https://kagi.com/favicon-assistant-32x32.png"
        },
        {
            name: "Lens Select",
            actionType: "selector",
            selector: 'button[id="lens-select"]',
            url: "",
            urlMethod: "current",
            urlAdvanced: "href",
            simulateKeys: "",
            hotkey: "CTRL+L",
            icon: "https://kagi.com/favicon-assistant-32x32.png"
        },
        {
            name: "Go to Search",
            actionType: "url",
            url: "https://kagi.com/",
            urlMethod: "current",
            urlAdvanced: "href",
            selector: "",
            simulateKeys: "",
            hotkey: "CTRL+1",
            icon: "https://kagi.com/favicon-32x32.png"
        },
        {
            name: "Go to Assistant",
            actionType: "url",
            url: "https://kagi.com/assistant",
            urlMethod: "current",
            urlAdvanced: "href",
            selector: "",
            simulateKeys: "",
            hotkey: "CTRL+2",
            icon: "https://kagi.com/favicon-assistant-32x32.png"
        },
        {
            name: "Go to Summarizer",
            actionType: "url",
            url: "https://kagi.com/summarizer",
            urlMethod: "current",
            urlAdvanced: "href",
            selector: "",
            simulateKeys: "",
            hotkey: "CTRL+3",
            icon: "https://kagi.com/favicon-32x32.png"
        },
        {
            name: "Go to FastGPT",
            actionType: "url",
            url: "https://kagi.com/fastgpt",
            urlMethod: "current",
            urlAdvanced: "href",
            selector: "",
            simulateKeys: "",
            hotkey: "CTRL+4",
            icon: "https://kagi.com/favicon-32x32.png"
        },
        {
            name: "Go to Translate",
            actionType: "url",
            url: "https://translate.kagi.com",
            urlMethod: "current",
            urlAdvanced: "replace",
            selector: "",
            simulateKeys: "",
            hotkey: "CTRL+5",
            icon: kagiTranslateLightIconDataURL,
            iconDark: kagiTranslateDarkIconDataURL
        },
        {
            name: "billing",
            actionType: "url",
            url: "https://kagi.com/settings/billing",
            urlMethod: "current",
            selector: "",
            simulateKeys: "",
            hotkey: "CTRL+SHIFT+B",
            icon: "data:image/svg+xml,%3Csvg%20width%3D%2224%22%20height%3D%2224%22%20viewBox%3D%220%200%2024%2024%22%20fill%3D%22none%22%20xmlns%3D%22http://www.w3.org/2000/svg%22%3E%3Cpath%20d%3D%22M3%2010H21M7%2015H7.01M11%2015H13M3%208A3%203%200%20016%205H18A3%203%200%200121%208V16A3%203%200%200118%2019H6A3%203%200%20013%2016V8Z%22%20stroke%3D%22currentColor%22%20stroke-width%3D%221.5%22%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22/%3E%3C/svg%3E"
        },
        {
            name: "Ki -Flag",
            actionType: "url",
            url: "https://kagi.com/flag/ki_lime_pie",
            urlMethod: "current",
            selector: "",
            simulateKeys: "",
            hotkey: "CTRL+SHIFT+K",
            icon: ""
        }
    ].map(createShortcut);

    const CUSTOM_ACTIONS = {};

    const engine = ShortcutTemplate.createShortcutEngine({
        menuCommandLabel: "Kagi - 设置快捷键",
        panelTitle: "Kagi - 自定义快捷键",
        storageKeys: {
            shortcuts: "kagi_shortcuts_v1",
            iconCachePrefix: "kagi_icon_cache_v1::",
            userIcons: "kagi_user_icons_v1"
        },
        ui: {
            idPrefix: "kagi",
            cssPrefix: "kagi",
            compactBreakpoint: 800
        },
        defaultIconURL,
        iconLibrary: defaultIcons,
        protectedIconUrls,
        defaultShortcuts,
        customActions: CUSTOM_ACTIONS,
        consoleTag: LOG_TAG,
        colors: {
            primary: "#0066cc"
        },
        shouldBypassIconCache: (url) => {
            return url && (url.startsWith('https://kagi.com/') || url.startsWith('https://translate.kagi.com/'));
        },
        getCurrentSearchTerm: () => {
            const urlParams = new URL(location.href).searchParams;
            return urlParams.get("q");
        },
        resolveUrlTemplate: (targetUrl, { getCurrentSearchTerm, placeholderToken }) => {
            const placeholder = placeholderToken || '%s';
            if (!targetUrl.includes(placeholder)) return targetUrl;
            let currentKeyword = null;
            try {
                currentKeyword = typeof getCurrentSearchTerm === 'function'
                    ? getCurrentSearchTerm()
                    : (new URL(location.href).searchParams.get("q"));
            } catch (err) {
                console.warn(`${LOG_TAG} resolveUrlTemplate error`, err);
            }
            if (currentKeyword !== null && currentKeyword !== undefined) {
                return targetUrl.replaceAll(placeholder, encodeURIComponent(currentKeyword));
            }
            if (placeholder === '%s' && targetUrl.includes('?')) {
                return targetUrl.substring(0, targetUrl.indexOf('?'));
            }
            return targetUrl.replaceAll(placeholder, '');
        },
        text: {
            stats: {
                total: "总计",
                url: "URL跳转",
                selector: "元素点击",
                simulate: "按键模拟"
            },
            buttons: {
                addShortcut: "添加新快捷键",
                saveAndClose: "保存并关闭",
                confirm: "确定",
                cancel: "取消",
                delete: "删除",
                edit: "编辑",
                clear: "清除"
            },
            dialogs: {
                alert: "提示",
                confirm: "确认",
                prompt: "输入"
            },
            hints: {
                hotkey: "点击此处，然后按下快捷键组合",
                simulate: "点击此处，然后按下要模拟的按键组合",
                hotkeyHelp: "💡 支持 Ctrl/Shift/Alt/Cmd + 字母/数字/功能键等组合",
                simulateHelp: "⚡ 将模拟这个按键组合发送到网页"
            }
        }
    });

    engine.init();
})();
