(function () {
    'use strict';

    function clone(value) { return JSON.parse(JSON.stringify(value)); }
    function trim(value) { return String(value || '').replace(/^\s+|\s+$/g, ''); }
    function unique(values) {
        var result = [];
        values.forEach(function (value) { value = trim(value); if (value && result.indexOf(value) === -1) result.push(value); });
        return result;
    }

    window.ScriptRunnerTools.register('cmfAnnotation', function (ctx) {
        var widgets = window.ScriptRunnerWidgets;
        var dataPath = ctx.path.join(ctx.userDataDir, ctx.manifest.dataFile);
        var scriptPath = ctx.path.join(ctx.extensionPath, ctx.manifest.script).replace(/\\/g, '/');
        var state = ctx.readJson(ctx.fs, dataPath, null) || {version: 1, defaultFontSize: 9, dictionary: [], templates: []};
        var points = [];
        var cards = [];
        var editor;
        var settings;
        var cardsRoot;
        var status;
        var fontInput;
        var editingDictionaryIndex = null;

        normalizeState();
        buildShell();

        function normalizeState() {
            if (!state.dictionary || !(state.dictionary instanceof Array)) state.dictionary = [];
            if (!state.templates || !(state.templates instanceof Array)) state.templates = [];
            if (!state.defaultFontSize || state.defaultFontSize < 1) state.defaultFontSize = 9;
        }

        function saveState() {
            state.defaultFontSize = parseFloat(fontInput ? fontInput.value : state.defaultFontSize) || 9;
            ctx.writeJson(ctx.fs, dataPath, state);
        }

        function setStatus(message, isError) {
            widgets.setStatus(status, message, isError);
        }

        function button(text, className, handler) {
            return widgets.button(text, className, handler);
        }

        function buildShell() {
            var toolbar = document.createElement('div');
            toolbar.className = 'tool-toolbar';
            toolbar.appendChild(button('脚本列表', '', ctx.showScripts));
            toolbar.appendChild(button('读取母路径', 'primary', inspectSelection));
            toolbar.appendChild(button('词条库', '', toggleSettings));
            ctx.root.appendChild(toolbar);

            var usage = document.createElement('div');
            usage.className = 'tool-usage';
            usage.textContent = '使用方法：准备左、中、右 3 条垂直参考线，选中多节点母路径；读取后按词条库生成空字段，再到画布编辑。';
            ctx.root.appendChild(usage);

            status = widgets.status('');
            ctx.root.appendChild(status);

            editor = document.createElement('div');
            editor.className = 'cmf-editor';
            editor.innerHTML = '<div class="tool-panel"><div class="tool-row"><label>默认字号</label><input id="cmf-font-size" class="tool-input tool-number" type="number" min="1" max="300" step="0.5"><span>pt</span></div></div>';
            ctx.root.appendChild(editor);
            fontInput = editor.querySelector('#cmf-font-size');
            fontInput.value = state.defaultFontSize;
            fontInput.addEventListener('change', saveState);

            cardsRoot = document.createElement('div');
            cardsRoot.className = 'cmf-empty';
            cardsRoot.textContent = '尚未读取标注点。';
            editor.appendChild(cardsRoot);

            var generateBar = document.createElement('div');
            generateBar.className = 'tool-toolbar';
            generateBar.appendChild(button('生成 CMF 标注', 'primary', generateAnnotations));
            editor.appendChild(generateBar);

            settings = document.createElement('div');
            settings.className = 'cmf-settings';
            ctx.root.appendChild(settings);
            renderSettings();
        }

        function toggleSettings() {
            var open = !settings.classList.contains('active');
            settings.classList.toggle('active', open);
            editor.classList.toggle('hidden', open);
            if (open) renderSettings();
        }

        function inspectSelection() {
            setStatus('正在读取 Illustrator 选区…', false);
            ctx.callHost('runDynamicJSXTool', [scriptPath, encodeURIComponent(JSON.stringify({command: 'inspect'}))], function (raw) {
                var result;
                try { result = JSON.parse(raw); } catch (e) { setStatus('读取失败。\n可能原因：宿主脚本未正确返回数据。\n建议：重新打开 CEP 面板后重试。\n详细信息：' + raw, true); return; }
                if (!result.ok) { setStatus(compactError(result.message), true); return; }
                points = result.points || [];
                cards = [];
                renderGenerationSummary();
                setStatus('已读取 ' + points.length + ' 个节点。', false);
            });
        }

        function renderGenerationSummary() {
            cardsRoot.className = points.length ? 'cmf-generation-summary' : 'cmf-empty';
            cardsRoot.textContent = points.length ? '将为 ' + points.length + ' 个节点分别生成 ' + state.dictionary.length + ' 个空字段。' : '尚未读取标注点。';
        }

        function renderCards() {
            cardsRoot.className = '';
            cardsRoot.innerHTML = '';
            cards.forEach(function (card, cardIndex) {
                var point = points[cardIndex];
                var box = document.createElement('div');
                var title = document.createElement('div');
                var templateRow = document.createElement('div');
                var templateSelect = document.createElement('select');
                var linesRoot = document.createElement('div');
                box.className = 'cmf-card';
                title.className = 'cmf-card-title';
                title.innerHTML = '<span>节点 ' + (cardIndex + 1) + '</span><span>' + (point.side === 'left' ? '左侧' : '右侧') + '</span>';
                box.appendChild(title);
                templateRow.className = 'tool-row';
                templateRow.appendChild(document.createTextNode('标签 '));
                templateSelect.className = 'tool-select';
                fillTemplateSelect(templateSelect);
                templateSelect.addEventListener('change', function () {
                    if (!templateSelect.value) return;
                    var tpl = findTemplate(templateSelect.value);
                    if (tpl) { cards[cardIndex].lines = clone(tpl.lines); renderCards(); }
                });
                templateRow.appendChild(templateSelect);
                templateRow.appendChild(button('保存当前', '', function () { saveCardAsTemplate(cardIndex); }));
                box.appendChild(templateRow);
                card.lines.forEach(function (line, lineIndex) { linesRoot.appendChild(buildLine(cardIndex, lineIndex, line)); });
                box.appendChild(linesRoot);
                box.appendChild(button('＋ 新增行', '', function () { cards[cardIndex].lines.push({field: '', value: ''}); renderCards(); }));
                cardsRoot.appendChild(box);
            });
        }

        function buildLine(cardIndex, lineIndex, line) {
            var row = document.createElement('div');
            var field = document.createElement('select');
            var value = document.createElement('input');
            var list = document.createElement('datalist');
            var actions = document.createElement('div');
            var listId = 'cmf-values-' + cardIndex + '-' + lineIndex;
            row.className = 'cmf-line';
            field.className = 'tool-select';
            field.appendChild(new Option('选择词条…', ''));
            state.dictionary.forEach(function (item) { field.appendChild(new Option(item.name, item.name)); });
            field.value = line.field;
            field.addEventListener('change', function () { line.field = field.value; fillValueList(list, line.field); });
            value.className = 'tool-input';
            value.placeholder = '选择或输入值';
            value.value = line.value;
            value.setAttribute('list', listId);
            value.addEventListener('input', function () { line.value = value.value; });
            list.id = listId;
            fillValueList(list, line.field);
            actions.className = 'cmf-line-actions';
            actions.appendChild(button('↑', 'cmf-mini', function () { moveLine(cardIndex, lineIndex, -1); }));
            actions.appendChild(button('↓', 'cmf-mini', function () { moveLine(cardIndex, lineIndex, 1); }));
            actions.appendChild(button('×', 'cmf-mini danger', function () { if (cards[cardIndex].lines.length > 1) cards[cardIndex].lines.splice(lineIndex, 1); renderCards(); }));
            row.appendChild(field); row.appendChild(value); row.appendChild(actions); row.appendChild(list);
            return row;
        }

        function fillValueList(list, fieldName) {
            var item = findDictionary(fieldName);
            list.innerHTML = '';
            if (item) item.values.forEach(function (value) { list.appendChild(new Option(value, value)); });
        }

        function moveLine(cardIndex, lineIndex, delta) {
            var lines = cards[cardIndex].lines;
            if (widgets.moveItem(lines, lineIndex, delta)) renderCards();
        }

        function findDictionary(name) {
            var i; for (i = 0; i < state.dictionary.length; i++) if (state.dictionary[i].name === name) return state.dictionary[i]; return null;
        }
        function findTemplate(name) {
            var i; for (i = 0; i < state.templates.length; i++) if (state.templates[i].name === name) return state.templates[i]; return null;
        }
        function fillTemplateSelect(select) {
            select.appendChild(new Option('选择完整标签…', ''));
            state.templates.forEach(function (item) { select.appendChild(new Option(item.name, item.name)); });
        }

        function saveCardAsTemplate(index) {
            var name = trim(window.prompt('请输入标签名称：', ''));
            var existing;
            if (!name) return;
            if (!cards[index].lines.every(function (line) { return trim(line.field) && trim(line.value); })) {
                setStatus('无法保存完整标签。\n可能原因：当前卡片存在空词条或空值。\n建议：补全每一行后重试。', true);
                return;
            }
            existing = findTemplate(name);
            if (existing && !window.confirm('同名标签已存在，是否覆盖？')) return;
            if (existing) existing.lines = clone(cards[index].lines);
            else state.templates.push({name: name, lines: clone(cards[index].lines)});
            saveState(); renderCards(); setStatus('已保存完整标签：“' + name + '”。', false);
        }

        function collectPayload() {
            var fontSize = parseFloat(fontInput.value);
            var fieldLines;
            var payloadCards = [];
            var i;
            if (!points.length) throw new Error('请先读取选中的母路径。');
            if (!state.dictionary.length) throw new Error('词条库为空，请先创建词条。');
            if (isNaN(fontSize) || fontSize < 1 || fontSize > 300) throw new Error('字号必须在 1–300 pt 之间。');
            fieldLines = state.dictionary.map(function (item) { return {field: trim(item.name), value: ''}; });
            for (i = 0; i < points.length; i++) payloadCards.push({lines: clone(fieldLines)});
            return {command: 'generate', fontSize: fontSize, cards: payloadCards};
        }

        function generateAnnotations() {
            var payload;
            try { payload = collectPayload(); } catch (e) {
                setStatus('无法生成 CMF 标注。\n可能原因：配置尚未填写完整。\n建议：补全提示中的内容后重试。\n详细信息：' + e.message, true); return;
            }
            saveState(); setStatus('正在 Illustrator 中生成空字段标注…', false);
            ctx.callHost('runDynamicJSXTool', [scriptPath, encodeURIComponent(JSON.stringify(payload))], function (raw) {
                var result;
                try { result = JSON.parse(raw); } catch (e) { setStatus('生成失败。\n可能原因：宿主返回格式异常。\n建议：重新打开面板并检查调试日志。\n详细信息：' + raw, true); return; }
                setStatus(result.ok ? result.message : compactError(result.message), !result.ok);
            });
        }

        function compactError(message) {
            var firstLine = String(message || '操作失败。').split(/\r?\n/)[0];
            return firstLine.replace(/^Error:\s*/i, '');
        }

        function renderSettings() {
            settings.innerHTML = '<div class="tool-panel"><div class="dict-head"><strong>词条库</strong><button id="cmf-new-dict" class="tool-btn primary" type="button">＋ 新建词条</button></div><div id="cmf-dict-list" class="dict-list"></div><div id="cmf-dict-editor"></div><div class="tool-toolbar" style="margin-top:8px"><button id="cmf-settings-back" class="tool-btn" type="button">返回</button></div></div>';
            var list = settings.querySelector('#cmf-dict-list');
            var dictEditor = settings.querySelector('#cmf-dict-editor');
            settings.querySelector('#cmf-new-dict').addEventListener('click', function () { editingDictionaryIndex = -1; renderSettings(); });
            settings.querySelector('#cmf-settings-back').addEventListener('click', toggleSettings);

            if (!state.dictionary.length) {
                list.innerHTML = '<div class="dict-empty">还没有词条，请创建一个词条。</div>';
            }
            state.dictionary.forEach(function (item, index) {
                var box = document.createElement('div'); var summary = document.createElement('div'); var actions = document.createElement('div');
                var up = button('上移', '', function () { moveDictionary(index, -1); });
                var down = button('下移', '', function () { moveDictionary(index, 1); });
                box.className = 'dict-item';
                summary.className = 'dict-summary';
                summary.innerHTML = '<strong></strong><span></span>';
                summary.querySelector('strong').textContent = item.name;
                summary.querySelector('span').textContent = item.values.length ? item.values.join('、') : '暂无选项';
                actions.className = 'dict-actions';
                up.disabled = index === 0;
                down.disabled = index === state.dictionary.length - 1;
                actions.appendChild(up);
                actions.appendChild(down);
                actions.appendChild(button('编辑', '', function () { editingDictionaryIndex = index; renderSettings(); }));
                actions.appendChild(button('删除', 'danger', function () { if (window.confirm('删除词条“' + item.name + '”？')) { state.dictionary.splice(index, 1); editingDictionaryIndex = null; saveState(); renderSettings(); if (points.length) renderGenerationSummary(); } }));
                box.appendChild(summary); box.appendChild(actions); list.appendChild(box);
            });
            if (editingDictionaryIndex !== null) renderDictionaryEditor(dictEditor, editingDictionaryIndex);
        }

        function renderDictionaryEditor(root, index) {
            var item = index >= 0 ? state.dictionary[index] : {name: '', values: []};
            var originalName = item.name;
            var panel = document.createElement('div');
            var name = document.createElement('input');
            var values = document.createElement('textarea');
            var actions = document.createElement('div');
            panel.className = 'dict-editor';
            name.className = 'tool-input';
            name.value = item.name;
            name.placeholder = '词条名称，例如：材质';
            values.className = 'tool-input dict-values';
            values.value = item.values.join('\n');
            values.placeholder = '可选值，每行一个';
            actions.className = 'tool-toolbar';
            actions.appendChild(button('取消', '', function () { editingDictionaryIndex = null; renderSettings(); }));
            actions.appendChild(button(index >= 0 ? '保存修改' : '保存词条', 'primary', function () {
                var nextName = trim(name.value);
                var nextValues = unique(values.value.split(/\r?\n/));
                var duplicate = state.dictionary.some(function (entry, entryIndex) { return entryIndex !== index && trim(entry.name).toLowerCase() === nextName.toLowerCase(); });
                if (!nextName) { setStatus('保存失败。\n可能原因：词条名称为空。\n建议：填写词条名称后重试。', true); return; }
                if (duplicate) { setStatus('保存失败。\n可能原因：词条名称重复。\n建议：使用其他名称后重试。', true); return; }
                if (index >= 0) {
                    state.dictionary[index] = {name: nextName, values: nextValues};
                    renameDictionaryReferences(originalName, nextName);
                } else {
                    state.dictionary.push({name: nextName, values: nextValues});
                }
                editingDictionaryIndex = null;
                saveState(); renderSettings(); if (points.length) renderGenerationSummary(); setStatus('', false);
            }));
            panel.appendChild(name);
            panel.appendChild(values);
            panel.appendChild(actions);
            root.appendChild(panel);
            name.focus();
        }

        function renameDictionaryReferences(oldName, newName) {
            if (!oldName || oldName === newName) return;
            cards.forEach(function (card) { card.lines.forEach(function (line) { if (line.field === oldName) line.field = newName; }); });
            state.templates.forEach(function (template) { template.lines.forEach(function (line) { if (line.field === oldName) line.field = newName; }); });
        }

        function moveDictionary(index, delta) {
            if (widgets.moveItem(state.dictionary, index, delta)) { editingDictionaryIndex = null; saveState(); renderSettings(); if (points.length) renderGenerationSummary(); }
        }

        function renderTemplateSettings(root) {
            if (!state.templates.length) { root.textContent = '暂无已保存标签。'; return; }
            state.templates.forEach(function (item, index) {
                var row = document.createElement('div'); row.className = 'template-item';
                var name = document.createElement('input'); name.className = 'tool-input'; name.value = item.name;
                row.appendChild(name);
                row.appendChild(button('改名', '', function () { var next = trim(name.value); if (!next || (findTemplate(next) && next !== item.name)) return; item.name = next; saveState(); renderSettings(); }));
                row.appendChild(button('删除', 'danger', function () { if (window.confirm('删除标签“' + item.name + '”？')) { state.templates.splice(index, 1); saveState(); renderSettings(); } }));
                root.appendChild(row);
            });
        }

    });
})();
