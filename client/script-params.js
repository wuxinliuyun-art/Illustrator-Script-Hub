(function () {
    'use strict';

    // ============================================================
    // 普通脚本的轻量参数机制（⚙ 整页设置页）：
    // - 从脚本头部注释解析 @param 单行 JSON 声明（number/bool/text/color）
    // - ⚙ 打开整页设置视图（与脚本列表切换），改动即时保存
    // - 用户值保存在 CEP 用户数据目录 script-params.json（写前留 .bak）
    // - 运行时经宿主 runDynamicJSXTool 注入 __SCRIPT_RUNNER_TOOL_PAYLOAD__
    // ============================================================

    var ctx = null;          // { fs, path, csInterface, userDataPath }
    var stateFile = '';
    var state = null;        // { version:1, params:{ <relPath>:{ key:value } } }
    var declared = {};       // <relPath> -> 参数声明数组（每次刷新列表时重新注册）

    var TYPES = { number: true, bool: true, text: true, color: true };
    var PARAM_LINE = /^@param\s*(\{.+\})\s*$/;

    // ---- 声明解析：按类型补全默认值 ----
    function normalizeDeclaration(def) {
        var out = { key: String(def.key), type: def.type, label: String(def.label || def.key) };
        var min = (typeof def.min === 'number') ? def.min : null;
        var max = (typeof def.max === 'number') ? def.max : null;
        var d;
        if (def.type === 'number') {
            d = parseFloat(def.default);
            if (isNaN(d)) d = (min !== null) ? min : 0;
            if (min !== null && d < min) d = min;
            if (max !== null && d > max) d = max;
            out.min = min;
            out.max = max;
            out.step = (typeof def.step === 'number' && def.step > 0) ? def.step : 1;
            out.default = d;
        } else if (def.type === 'bool') {
            out.default = (def.default === true);
        } else if (def.type === 'color') {
            out.default = (typeof def.default === 'string' && /^[0-9a-fA-F]{6}$/.test(def.default.replace(/^#/, '')))
                ? ('#' + def.default.replace(/^#/, '').toUpperCase())
                : '#FF0000';
        } else {
            out.default = (typeof def.default === 'string') ? def.default : '';
        }
        return out;
    }

    // 从头部注释文本中提取 @param 声明，并把这些行从说明文字里过滤掉
    function parseDesc(desc) {
        var result = { params: [], desc: '' };
        var text = String(desc || '');
        if (!text) return result;
        var lines = text.split(/\r?\n/);
        var kept = [];
        var i, m, def;
        for (i = 0; i < lines.length; i++) {
            m = lines[i].match(PARAM_LINE);
            if (m) {
                def = null;
                try { def = JSON.parse(m[1]); } catch (e) {}
                if (def && def.key && TYPES[def.type]) {
                    result.params.push(normalizeDeclaration(def));
                    continue;
                }
                console.warn('[ScriptRunnerParams] 忽略无法解析的 @param 行: ' + lines[i]);
            }
            kept.push(lines[i]);
        }
        result.desc = kept.join('\n').trim();
        return result;
    }

    // ---- 状态文件读写（与 tool-framework.js 同范式：递归建目录、写前留 .bak） ----
    function ensureDir(dir) {
        var parent;
        if (ctx.fs.existsSync(dir)) return;
        parent = ctx.path.dirname(dir);
        if (parent && parent !== dir) ensureDir(parent);
        try { ctx.fs.mkdirSync(dir); } catch (e) { if (!ctx.fs.existsSync(dir)) throw e; }
    }

    function loadState() {
        if (state) return state;
        state = { version: 1, params: {} };
        try {
            if (ctx.fs.existsSync(stateFile)) state = JSON.parse(ctx.fs.readFileSync(stateFile, 'utf8'));
        } catch (e) {
            console.warn('[ScriptRunnerParams] 状态文件读取失败，使用空状态: ' + e);
            state = { version: 1, params: {} };
        }
        if (!state.params || typeof state.params !== 'object') state.params = {};
        return state;
    }

    function saveState() {
        try {
            loadState(); // 确保没有未加载就写盘的情况
            ensureDir(ctx.path.dirname(stateFile));
            if (ctx.fs.existsSync(stateFile)) ctx.fs.writeFileSync(stateFile + '.bak', ctx.fs.readFileSync(stateFile));
            ctx.fs.writeFileSync(stateFile, JSON.stringify(state, null, 2), 'utf8');
            return { ok: true };
        } catch (e) {
            return {
                ok: false,
                message: '❌ 参数保存失败。\n可能原因：CEP 用户数据目录不可写。\n建议：检查磁盘空间和目录权限后重试。\n详细信息：' + e
            };
        }
    }

    function saveValue(relPath, key, value) {
        var st = loadState();
        if (!st.params[relPath]) st.params[relPath] = {};
        st.params[relPath][key] = value;
        return saveState();
    }

    function clampNumber(v, def) {
        if (typeof def.min === 'number' && v < def.min) return def.min;
        if (typeof def.max === 'number' && v > def.max) return def.max;
        return v;
    }

    function validHex(value) {
        var hex = String(value || '').replace(/^\s+|\s+$/g, '').replace(/^#/, '');
        return /^[0-9a-fA-F]{6}$/.test(hex) ? ('#' + hex.toUpperCase()) : null;
    }

    // 生效值 = 已保存值（按当前声明合并、校验），未保存的项回落到声明默认值
    function getValues(relPath) {
        var defs = declared[relPath] || [];
        var saved = ctx ? (loadState().params[relPath] || {}) : {};
        var values = {};
        var i, def, v;
        for (i = 0; i < defs.length; i++) {
            def = defs[i];
            v = saved[def.key];
            if (def.type === 'number') {
                values[def.key] = (typeof v === 'number' && isFinite(v)) ? clampNumber(v, def) : def.default;
            } else if (def.type === 'bool') {
                values[def.key] = (typeof v === 'boolean') ? v : def.default;
            } else if (def.type === 'color') {
                values[def.key] = (typeof v === 'string' && validHex(v)) ? validHex(v) : def.default;
            } else {
                values[def.key] = (typeof v === 'string') ? v : def.default;
            }
        }
        return values;
    }

    // ---- 整页设置视图 ----
    function activate(viewId) {
        var views = document.querySelectorAll('.tool-view');
        var i;
        for (i = 0; i < views.length; i++) views[i].classList.toggle('active', views[i].id === viewId);
    }

    function persistValue(relPath, key, value, statusEl) {
        var res = saveValue(relPath, key, value);
        var W = window.ScriptRunnerWidgets;
        if (!W || !statusEl) return;
        if (res.ok) W.setStatus(statusEl, '✓ 已保存');
        else W.setStatus(statusEl, res.message, true);
    }

    function buildRow(def, currentValue, relPath, statusEl) {
        var W = window.ScriptRunnerWidgets;
        var control;
        var change = function (v) { persistValue(relPath, def.key, v, statusEl); };
        if (def.type === 'bool') {
            control = W.toggle(currentValue, change);
        } else if (def.type === 'number') {
            control = W.numberInput(currentValue, def.min, def.max, def.step, change);
        } else if (def.type === 'color') {
            control = W.colorInput(currentValue, change);
        } else {
            // text：标签独占一行，文本域整宽
            var block = document.createElement('div');
            block.className = 'sr-text-block';
            var lab = document.createElement('label');
            lab.className = 'tool-field-label';
            lab.textContent = def.label;
            block.appendChild(lab);
            block.appendChild(W.textArea(currentValue, change));
            return block;
        }
        return W.fieldRow(def.label, control);
    }

    function openPage(relPath, title) {
        if (!ctx) return;
        var defs = declared[relPath] || [];
        if (defs.length === 0) return;
        var root = document.getElementById('params-view');
        if (!root) return;
        var W = window.ScriptRunnerWidgets;
        var values = getValues(relPath);
        var statusEl = W.status('');
        var i;

        root.innerHTML = '';

        var toolbar = document.createElement('div');
        toolbar.className = 'tool-toolbar';
        toolbar.appendChild(W.button('← 脚本列表', '', function () { activate('scripts-view'); }));
        root.appendChild(toolbar);

        var header = document.createElement('div');
        header.className = 'sr-params-title';
        header.textContent = title + ' · 参数设置';
        root.appendChild(header);

        var panel = document.createElement('div');
        panel.className = 'tool-panel';
        for (i = 0; i < defs.length; i++) {
            panel.appendChild(buildRow(defs[i], values[defs[i].key], relPath, statusEl));
        }
        panel.appendChild(statusEl);
        root.appendChild(panel);

        // 底部"保存"按钮：显式确认入口。改动本就即时写盘，这里统一再写一次并提示。
        var saveBar = document.createElement('div');
        saveBar.className = 'sr-save-bar';
        saveBar.appendChild(W.button('保存', 'primary', function () {
            var res = saveState();
            if (res.ok) W.setStatus(statusEl, '✓ 已保存');
            else W.setStatus(statusEl, res.message, true);
        }));
        root.appendChild(saveBar);

        activate('params-view');
    }

    window.ScriptRunnerParams = {
        init: function (options) {
            ctx = options;
            stateFile = ctx.path.join(ctx.userDataPath, 'IndustrialDesignMeditation', 'ScriptRunnerAI', 'script-params.json');
            state = null;
        },
        parseDesc: parseDesc,
        registerDeclarations: function (relPath, params) { declared[relPath] = params || []; },
        hasParams: function (relPath) { return (declared[relPath] || []).length > 0; },
        getPayloadEncoded: function (relPath) { return encodeURIComponent(JSON.stringify(getValues(relPath))); },
        openPage: openPage
    };
})();
