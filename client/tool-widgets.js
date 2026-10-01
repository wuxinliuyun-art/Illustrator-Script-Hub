(function () {
    'use strict';

    function button(text, className, handler) {
        var el = document.createElement('button');
        el.type = 'button';
        el.className = 'tool-btn' + (className ? ' ' + className : '');
        el.textContent = text;
        if (handler) el.addEventListener('click', handler);
        return el;
    }

    function status(message) {
        var el = document.createElement('div');
        el.className = 'tool-status';
        el.textContent = message || '';
        return el;
    }

    function setStatus(el, message, isError) {
        el.textContent = message;
        el.className = 'tool-status' + (isError ? ' error' : '');
    }

    function fieldRow(labelText, control) {
        var row = document.createElement('div');
        var label = document.createElement('label');
        row.className = 'tool-row';
        label.textContent = labelText;
        row.appendChild(label);
        row.appendChild(control);
        return row;
    }

    function moveItem(items, index, delta) {
        var target = index + delta;
        var temp;
        if (target < 0 || target >= items.length) return false;
        temp = items[index]; items[index] = items[target]; items[target] = temp;
        return true;
    }

    function toggle(checked, onChange) {
        var label = document.createElement('label');
        var input = document.createElement('input');
        var slider = document.createElement('span');
        label.className = 'sr-switch';
        input.type = 'checkbox';
        input.checked = !!checked;
        slider.className = 'sr-switch-slider';
        label.appendChild(input);
        label.appendChild(slider);
        label.srSetValue = function (value) { input.checked = !!value; };
        if (onChange) input.addEventListener('change', function () { onChange(input.checked); });
        return label;
    }

    function numberInput(value, min, max, step, onChange) {
        var input = document.createElement('input');
        var fallback = value;
        input.type = 'number';
        input.className = 'tool-input tool-number';
        input.value = value;
        if (typeof min === 'number') input.min = min;
        if (typeof max === 'number') input.max = max;
        if (typeof step === 'number' && step > 0) input.step = step;
        input.srSetValue = function (value) { fallback = value; input.value = value; };
        if (onChange) {
            input.addEventListener('change', function () {
                var v = parseFloat(input.value);
                if (isNaN(v)) v = fallback;
                if (typeof min === 'number' && v < min) v = min;
                if (typeof max === 'number' && v > max) v = max;
                fallback = v;
                input.value = v;
                onChange(v);
            });
        }
        return input;
    }

    function textArea(value, onChange) {
        var el = document.createElement('textarea');
        el.className = 'tool-input sr-text';
        el.value = (value === null || value === undefined) ? '' : String(value);
        el.srSetValue = function (v) { el.value = (v === null || v === undefined) ? '' : String(v); };
        if (onChange) el.addEventListener('change', function () { onChange(el.value); });
        return el;
    }

    function validHex(value) {
        var hex = String(value || '').replace(/^\s+|\s+$/g, '').replace(/^#/, '');
        return /^[0-9a-fA-F]{6}$/.test(hex) ? ('#' + hex.toUpperCase()) : null;
    }

    function colorInput(value, onChange) {
        var line = document.createElement('div');
        var input = document.createElement('input');
        var swatch = document.createElement('span');
        line.className = 'sr-color-line';
        input.type = 'text';
        input.className = 'tool-input sr-hex';
        input.value = (value === null || value === undefined) ? '' : String(value);
        swatch.className = 'sr-swatch';
        function paint() {
            var norm = validHex(input.value);
            swatch.style.backgroundColor = norm || '#333333';
            input.classList.toggle('invalid', norm === null);
            return norm;
        }
        input.addEventListener('input', paint);
        input.addEventListener('change', function () {
            var norm = paint();
            if (norm && onChange) onChange(norm);
        });
        line.srSetValue = function (v) { input.value = (v === null || v === undefined) ? '' : String(v); paint(); };
        line.appendChild(input);
        line.appendChild(swatch);
        paint();
        return line;
    }

    window.ScriptRunnerWidgets = {
        button: button,
        status: status,
        setStatus: setStatus,
        fieldRow: fieldRow,
        moveItem: moveItem,
        toggle: toggle,
        numberInput: numberInput,
        textArea: textArea,
        colorInput: colorInput
    };
})();
