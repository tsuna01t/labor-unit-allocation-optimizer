/* 勞作單元最佳化頁面腳本 */

const defaultRes = [
    {
        name: "燃素碳石",
        icon: "img/PHC.png",
        need: 100,
        base: 640,
        eff: 16,
        stock: 3624,
        limit: 600
    },
    {
        name: "碎石礦礫",
        icon: "img/GVL.png",
        need: 200,
        base: 480,
        eff: 16,
        stock: 1016939,
        limit: 600
    },
    {
        name: "隕金",
        icon: "img/STG.png",
        need: 100,
        base: 480,
        eff: 16,
        stock: 971762,
        limit: 600
    },
    {
        name: "催化劑",
        icon: "img/CAT.png",
        need: 400,
        base: 1000,
        eff: 100,
        stock: 3791,
        limit: 40
    }
];

/** 產生資源列標題（圖示 + 名稱）之 HTML */
function resourceLabelHtml(r) {
    return (
        '<span class="res-label">' +
        '<img class="res-icon" src="' +
        r.icon +
        '" width="24" height="24" alt="" decoding="async">' +
        '<span class="res-label__text">' +
        r.name +
        "</span></span>"
    );
}

const OPTIMIZER_STORAGE_KEY = "laborUnitOptimizer.form.v1";

function loadOptimizerInputs() {
    try {
        const raw = localStorage.getItem(OPTIMIZER_STORAGE_KEY);
        if (!raw) {
            return null;
        }
        return JSON.parse(raw);
    } catch (e) {
        return null;
    }
}

function saveOptimizerInputs() {
    const resources = defaultRes.map(function (_, i) {
        return {
            need: document.getElementById("need_" + i).value,
            base: document.getElementById("base_" + i).value,
            eff: document.getElementById("eff_" + i).value,
            limit: document.getElementById("limit_" + i).value,
            stock: document.getElementById("stock_" + i).value
        };
    });
    const payload = {
        goalProfit: document.getElementById("goalProfit").value,
        itemPrice: document.getElementById("itemPrice").value,
        totalUnits: document.getElementById("totalUnits").value,
        resources: resources
    };
    try {
        localStorage.setItem(OPTIMIZER_STORAGE_KEY, JSON.stringify(payload));
    } catch (e) {
        console.warn("無法儲存表單狀態（可能為私人模式或空間不足）", e);
    }
}

function applySavedOptimizerInputs(saved) {
    if (!saved) {
        return;
    }
    const topIds = ["goalProfit", "itemPrice", "totalUnits"];
    topIds.forEach(function (id) {
        if (
            saved[id] !== undefined &&
            saved[id] !== null &&
            saved[id] !== ""
        ) {
            document.getElementById(id).value = saved[id];
        }
    });
    if (!Array.isArray(saved.resources)) {
        return;
    }
    saved.resources.forEach(function (row, i) {
        if (!row) {
            return;
        }
        [
            ["need", "need_" + i],
            ["base", "base_" + i],
            ["eff", "eff_" + i],
            ["limit", "limit_" + i],
            ["stock", "stock_" + i]
        ].forEach(function (pair) {
            const key = pair[0];
            const elId = pair[1];
            const v = row[key];
            if (v !== undefined && v !== null && v !== "") {
                const el = document.getElementById(elId);
                if (el) {
                    el.value = v;
                }
            }
        });
    });
}

function scrollToPanelResult() {
    const el = document.getElementById("panel-result");
    if (el && typeof el.scrollIntoView === "function") {
        el.scrollIntoView({ behavior: "smooth", block: "start" });
    }
}

/**
 * 檢查計算前必填數字欄位是否已輸入且為有效數值。
 * @returns {{ message: string, focusId: string } | null} 有誤時回傳錯誤物件，通過則為 null
 */
function validateOptimizerInputs() {
    const checks = [
        {
            id: "goalProfit",
            label: "目標總收益",
            integer: false,
            minExclusive: null,
            minInclusive: 0
        },
        {
            id: "itemPrice",
            label: "商品單價",
            integer: false,
            minExclusive: 0,
            minInclusive: null
        },
        {
            id: "totalUnits",
            label: "總勞作單元",
            integer: true,
            minExclusive: null,
            minInclusive: 0
        }
    ];

    for (let c = 0; c < checks.length; c++) {
        const cfg = checks[c];
        const el = document.getElementById(cfg.id);
        if (!el) {
            continue;
        }
        const raw = String(el.value).trim();
        if (raw === "") {
            return {
                message: cfg.label + "為必填，請輸入數字。",
                focusId: cfg.id
            };
        }
        if (cfg.integer && !/^-?\d+$/.test(raw)) {
            return {
                message: cfg.label + "必須為整數（請勿留白或小數）。",
                focusId: cfg.id
            };
        }
        const num = cfg.integer ? parseInt(raw, 10) : parseFloat(raw);
        if (!Number.isFinite(num)) {
            return {
                message: cfg.label + "必須為有效數字。",
                focusId: cfg.id
            };
        }
        if (
            cfg.minExclusive !== null &&
            !(num > cfg.minExclusive)
        ) {
            return {
                message: cfg.label + "必須大於 " + cfg.minExclusive + "。",
                focusId: cfg.id
            };
        }
        if (
            cfg.minInclusive !== null &&
            num < cfg.minInclusive
        ) {
            return {
                message:
                    cfg.label + "不可小於 " + cfg.minInclusive + "。",
                focusId: cfg.id
            };
        }
    }

    const resourceFieldSpecs = [
        { suffix: "need", label: "合成需求" },
        { suffix: "base", label: "基礎產出" },
        { suffix: "eff", label: "單元效率" },
        { suffix: "limit", label: "投入上限" },
        { suffix: "stock", label: "當前庫存" }
    ];

    for (let i = 0; i < defaultRes.length; i++) {
        const resName = defaultRes[i].name;
        for (let f = 0; f < resourceFieldSpecs.length; f++) {
            const spec = resourceFieldSpecs[f];
            const id = spec.suffix + "_" + i;
            const el = document.getElementById(id);
            if (!el) {
                continue;
            }
            const raw = String(el.value).trim();
            if (raw === "") {
                return {
                    message:
                        "資源「" +
                        resName +
                        "」的「" +
                        spec.label +
                        "」為必填，請輸入數字。",
                    focusId: id
                };
            }
            const isLimit = spec.suffix === "limit";
            if (isLimit && !/^-?\d+$/.test(raw)) {
                return {
                    message:
                        "資源「" +
                        resName +
                        "」的「投入上限」必須為非負整數。",
                    focusId: id
                };
            }
            const num = isLimit ? parseInt(raw, 10) : parseFloat(raw);
            if (!Number.isFinite(num)) {
                return {
                    message:
                        "資源「" +
                        resName +
                        "」的「" +
                        spec.label +
                        "」必須為有效數字。",
                    focusId: id
                };
            }
            if (isLimit && num < 0) {
                return {
                    message:
                        "資源「" +
                        resName +
                        "」的「投入上限」不可小於 0。",
                    focusId: id
                };
            }
            if (!isLimit && num < 0) {
                return {
                    message:
                        "資源「" +
                        resName +
                        "」的「" +
                        spec.label +
                        "」不可小於 0。",
                    focusId: id
                };
            }
        }
    }

    return null;
}

function init() {
    const container = document.getElementById("resContainer");
    defaultRes.forEach(function (r, i) {
        container.insertAdjacentHTML(
            "beforeend",
            '<div class="res-card">' +
                "<h3>" +
                resourceLabelHtml(r) +
                "</h3>" +
                '<div class="input-group"><label>合成需求 / 基礎產出</label>' +
                '<div class="input-row">' +
                '<input type="number" id="need_' +
                i +
                '" step="100" min="0" value="' +
                r.need +
                '">' +
                '<input type="number" id="base_' +
                i +
                '" step="10" min="0" value="' +
                r.base +
                '">' +
                "</div></div>" +
                '<div class="input-group"><label>單元效率 / 投入上限</label>' +
                '<div class="input-row">' +
                '<input type="number" id="eff_' +
                i +
                '" value="' +
                r.eff +
                '">' +
                '<input type="number" id="limit_' +
                i +
                '" value="' +
                r.limit +
                '">' +
                "</div></div>" +
                '<div class="input-group"><label>當前庫存</label>' +
                '<input type="number" id="stock_' +
                i +
                '" value="' +
                r.stock +
                '">' +
                "</div></div>"
        );
    });
    applySavedOptimizerInputs(loadOptimizerInputs());

    const btn = document.getElementById("calcBtn");
    if (btn) {
        btn.addEventListener("click", calculateBest);
    }
}

function calculateBest() {
    const validationError = validateOptimizerInputs();
    if (validationError) {
        window.alert(validationError.message);
        const focusEl = document.getElementById(validationError.focusId);
        if (focusEl && typeof focusEl.focus === "function") {
            focusEl.focus();
        }
        return;
    }

    const goal = document.getElementById("goalProfit").value;
    const price = document.getElementById("itemPrice").value;
    const units = parseInt(document.getElementById("totalUnits").value, 10);
    const targetItems = goal / price;

    const res = defaultRes.map(function (r, i) {
        return {
            name: r.name,
            icon: r.icon,
            need: parseFloat(document.getElementById("need_" + i).value),
            base: parseFloat(document.getElementById("base_" + i).value),
            eff: parseFloat(document.getElementById("eff_" + i).value),
            limit: parseInt(document.getElementById("limit_" + i).value, 10),
            stock: parseFloat(document.getElementById("stock_" + i).value),
            alloc: 0,
            gap: 0
        };
    });

    res.forEach(function (r) {
        r.gap = Math.max(0, targetItems * r.need - r.stock);
    });

    for (let u = 0; u < units; u++) {
        let maxTime = -1;
        let candidateIdx = -1;

        for (let i = 0; i < res.length; i++) {
            const r = res[i];
            if (r.alloc >= r.limit) {
                continue;
            }

            const currentRate = r.base + r.alloc * r.eff;
            const currentTime = r.gap / currentRate;

            if (currentTime > maxTime) {
                maxTime = currentTime;
                candidateIdx = i;
            }
        }

        if (candidateIdx !== -1) {
            res[candidateIdx].alloc++;
        } else {
            break;
        }
    }

    const tbody = document.getElementById("resTable");
    tbody.innerHTML = "";
    let finalMaxTime = 0;

    res.forEach(function (r) {
        const finalRate = r.base + r.alloc * r.eff;
        const finalTime = r.gap / finalRate;
        if (finalTime > finalMaxTime) {
            finalMaxTime = finalTime;
        }

        tbody.insertAdjacentHTML(
            "beforeend",
            "<tr>" +
                '<td data-label="資源">' +
                resourceLabelHtml(r) +
                "</td>" +
                '<td data-label="當前缺口">' +
                Math.ceil(r.gap).toLocaleString() +
                "</td>" +
                '<td class="best-alloc" data-label="分配勞作單元">' +
                r.alloc +
                "</td>" +
                '<td data-label="每分鐘總產量">' +
                finalRate.toLocaleString() +
                "</td>" +
                '<td data-label="該項需時">' +
                formatWaitMinutes(finalTime) +
                "</td>" +
                "</tr>"
        );
    });

    const targetItemsCeil = Math.ceil(targetItems);
    const maxMinsCeil = Math.ceil(finalMaxTime);
    const waitText = formatWaitMinutes(maxMinsCeil);
    const collectAt = new Date(Date.now() + maxMinsCeil * 60000);
    const collectStr = collectAt.toLocaleString("zh-TW", {
        dateStyle: "medium",
        timeStyle: "short",
        hour12: false
    });

    document.getElementById("timeSummary").innerHTML =
        "目標產量：<b>" +
        targetItemsCeil +
        "</b> 個 | 預計最快 " +
        waitText +
        " 後可湊齊所有材料。" +
        "<br>可收取時間：<b>" +
        collectStr +
        "</b>";

    document.getElementById("resultEmpty").hidden = true;
    document.getElementById("resultContent").hidden = false;
    scrollToPanelResult();

    saveOptimizerInputs();
}

function formatWaitMinutes(totalMins) {
    const T = Math.ceil(totalMins);
    if (T <= 60) {
        return T + " 分鐘";
    }
    const h = Math.floor(T / 60);
    const m = T % 60;
    return h + "小時" + m + "分鐘";
}

window.addEventListener("DOMContentLoaded", init);
