(function () {
    'use strict';

    function trim(value) { return String(value || '').replace(/^\s+|\s+$/g, ''); }
    function normalizeHex(value) {
        var hex = trim(value).replace(/^#/, '');
        return /^[0-9a-fA-F]{6}$/.test(hex) ? '#' + hex.toUpperCase() : null;
    }

    window.ScriptRunnerTools.register('cmfAnnotationV15', function (ctx) {
        var widgets = window.ScriptRunnerWidgets;
        var dataPath = ctx.path.join(ctx.userDataDir, ctx.manifest.dataFile);
        var scriptPath = ctx.path.join(ctx.extensionPath, ctx.manifest.script).replace(/\\/g, '/');
        var defaults = {version: 2, text: '名称：\n材质：\n颜色：PANTONE', fontSize: 9, lineColor: '#FF0000', textColor: '#FF0000'};
        var state = ctx.readJson(ctx.fs, dataPath, defaults) || defaults;
        var status;
        var textInput;
        var fontSizeInput;
        var lineColorInput;
        var textColorInput;

        normalizeState();
        build();

        function normalizeState() {
            if (!trim(state.text)) state.text = defaults.text;
            state.fontSize = parseFloat(state.fontSize);
            if (isNaN(state.fontSize) || state.fontSize < 1 || state.fontSize > 300) state.fontSize = defaults.fontSize;
            state.lineColor = normalizeHex(state.lineColor) || defaults.lineColor;
            state.textColor = normalizeHex(state.textColor) || defaults.textColor;
        }

        function build() {
            var toolbar = document.createElement('div');
            var header = document.createElement('div');
            var contentPanel = document.createElement('div');
            var appearancePanel = document.createElement('div');
            var textLabel = document.createElement('label');
            var textHelp = document.createElement('div');
            var generateBar = document.createElement('div');

            toolbar.className = 'tool-toolbar';
            toolbar.appendChild(widgets.button('脚本列表', '', ctx.showScripts));
            ctx.root.appendChild(toolbar);

            header.className = 'cmf-v15-header';
            header.innerHTML = '<div class="cmf-v15-kicker">ANNOTATION TOOL</div><div class="cmf-v15-title">CMF 标注线 <span>1.5</span></div><div class="cmf-v15-subtitle">准备三条垂直参考线并选中母折线，然后设置标注内容与样式。</div>';
            ctx.root.appendChild(header);

            status = widgets.status('');
            ctx.root.appendChild(status);

            contentPanel.className = 'tool-panel cmf-v15-section';
            contentPanel.innerHTML = '<div class="cmf-v15-section-title"><span>01</span> 标注内容</div>';
            textLabel.textContent = '默认文本内容';
            textLabel.className = 'tool-field-label';
            contentPanel.appendChild(textLabel);
            textInput = document.createElement('textarea');
            textInput.className = 'tool-input cmf-v15-text';
            textInput.value = state.text;
            contentPanel.appendChild(textInput);
            textHelp.className = 'cmf-v15-help';
            textHelp.textContent = '每行生成一行文字，可直接增删或修改内容。';
            contentPanel.appendChild(textHelp);
            ctx.root.appendChild(contentPanel);

            appearancePanel.className = 'tool-panel cmf-v15-section';
            appearancePanel.innerHTML = '<div class="cmf-v15-section-title"><span>02</span> 外观设置</div>';

            fontSizeInput = document.createElement('input');
            fontSizeInput.className = 'tool-input tool-number cmf-v15-number';
            fontSizeInput.type = 'number';
            fontSizeInput.min = '1';
            fontSizeInput.max = '300';
            fontSizeInput.step = '0.5';
            fontSizeInput.value = state.fontSize;
            appearancePanel.appendChild(buildNumberRow('文字字号', fontSizeInput, 'pt'));

            lineColorInput = document.createElement('input');
            lineColorInput.className = 'tool-input cmf-v15-hex';
            lineColorInput.value = state.lineColor;
            appearancePanel.appendChild(buildColorRow('标注线颜色', lineColorInput));

            textColorInput = document.createElement('input');
            textColorInput.className = 'tool-input cmf-v15-hex';
            textColorInput.value = state.textColor;
            appearancePanel.appendChild(buildColorRow('文字颜色', textColorInput));
            ctx.root.appendChild(appearancePanel);

            generateBar.className = 'tool-toolbar cmf-v15-generate';
            generateBar.appendChild(widgets.button('生成 CMF 标注', 'primary cmf-v15-primary', generate));
            ctx.root.appendChild(generateBar);

            textInput.addEventListener('change', save);
            fontSizeInput.addEventListener('change', save);
            lineColorInput.addEventListener('change', save);
            textColorInput.addEventListener('change', save);
        }

        function buildNumberRow(labelText, input, unit) {
            var row = widgets.fieldRow(labelText, input);
            var suffix = document.createElement('span');
            suffix.className = 'cmf-v15-unit';
            suffix.textContent = unit;
            row.className += ' cmf-v15-control-row';
            row.appendChild(suffix);
            return row;
        }

        function buildColorRow(labelText, input) {
            var row = document.createElement('div');
            var label = document.createElement('label');
            var control = document.createElement('div');
            var choices = document.createElement('div');
            var customLine = document.createElement('div');
            var swatch = document.createElement('span');
            var normalized = normalizeHex(input.value) || '#FF0000';
            var initialMode = normalized === '#000000' ? 'black' : (normalized === '#FF0000' ? 'red' : 'custom');
            var groupName = ctx.manifest.id + '-' + (labelText === '标注线颜色' ? 'line' : 'text');

            row.className = 'tool-row cmf-v15-control-row cmf-v15-color-row';
            label.textContent = labelText;
            control.className = 'cmf-v15-color-control';
            choices.className = 'cmf-v15-color-choices';
            addChoice('black', '黑色', '#000000');
            addChoice('red', '红色', '#FF0000');
            addChoice('custom', '自定义', null);
            customLine.className = 'cmf-v15-custom-line';
            input.disabled = initialMode !== 'custom';
            customLine.appendChild(input);
            swatch.className = 'cmf-v15-swatch';
            swatch.style.backgroundColor = normalized;
            customLine.appendChild(swatch);
            control.appendChild(choices);
            control.appendChild(customLine);
            row.appendChild(label);
            row.appendChild(control);

            input.addEventListener('input', function () {
                var color = normalizeHex(input.value);
                swatch.style.backgroundColor = color || 'transparent';
                swatch.classList.toggle('invalid', !color);
            });
            return row;

            function addChoice(value, text, presetColor) {
                var option = document.createElement('label');
                var radio = document.createElement('input');
                var caption = document.createElement('span');
                radio.type = 'radio';
                radio.name = groupName;
                radio.value = value;
                radio.checked = value === initialMode;
                caption.textContent = text;
                option.className = 'cmf-v15-color-choice';
                option.appendChild(radio);
                option.appendChild(caption);
                choices.appendChild(option);
                radio.addEventListener('change', function () {
                    if (!radio.checked) return;
                    input.disabled = value !== 'custom';
                    if (presetColor) input.value = presetColor;
                    var color = normalizeHex(input.value);
                    swatch.style.backgroundColor = color || 'transparent';
                    swatch.classList.toggle('invalid', !color);
                    if (value === 'custom') input.focus();
                    save();
                });
            }
        }

        function collect() {
            var lineColor = normalizeHex(lineColorInput.value);
            var textColor = normalizeHex(textColorInput.value);
            var fontSize = parseFloat(fontSizeInput.value);
            var text = trim(textInput.value);
            if (!text) throw new Error('默认文本内容不能为空。');
            if (isNaN(fontSize) || fontSize < 1 || fontSize > 300) throw new Error('字号必须是 1–300 pt 之间的数字。');
            if (!lineColor || !textColor) throw new Error('颜色必须是类似 #FF0000 的 6 位 HEX 字符串。');
            lineColorInput.value = lineColor;
            textColorInput.value = textColor;
            return {command: 'generate', text: textInput.value, fontSize: fontSize, lineColor: lineColor, textColor: textColor};
        }

        function save() {
            try {
                var payload = collect();
                state.text = payload.text;
                state.fontSize = payload.fontSize;
                state.lineColor = payload.lineColor;
                state.textColor = payload.textColor;
                ctx.writeJson(ctx.fs, dataPath, state);
                widgets.setStatus(status, '', false);
                return true;
            } catch (e) {
                widgets.setStatus(status, '设置未保存。\n可能原因：输入内容格式不正确。\n建议：' + e.message, true);
                return false;
            }
        }

        function generate() {
            var payload;
            try { payload = collect(); } catch (e) {
                widgets.setStatus(status, '无法生成 CMF 标注。\n可能原因：设置尚未填写完整。\n建议：' + e.message, true);
                return;
            }
            state.text = payload.text;
            state.fontSize = payload.fontSize;
            state.lineColor = payload.lineColor;
            state.textColor = payload.textColor;
            ctx.writeJson(ctx.fs, dataPath, state);
            widgets.setStatus(status, '正在 Illustrator 中生成标注…', false);
            ctx.callHost('runDynamicJSXTool', [scriptPath, encodeURIComponent(JSON.stringify(payload))], function (raw) {
                var result;
                try { result = JSON.parse(raw); } catch (e) {
                    widgets.setStatus(status, '生成失败。\n可能原因：宿主返回格式异常。\n建议：重新打开面板后重试。\n详细信息：' + raw, true);
                    return;
                }
                widgets.setStatus(status, result.message, !result.ok);
            });
        }
    });
})();
