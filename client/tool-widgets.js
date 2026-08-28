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

    window.ScriptRunnerWidgets = {
        button: button,
        status: status,
        setStatus: setStatus,
        fieldRow: fieldRow,
        moveItem: moveItem
    };
})();
