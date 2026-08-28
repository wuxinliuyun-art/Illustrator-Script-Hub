(function () {
    'use strict';
    var components = {};
    var context = null;
    var loadedTools = [];

    function normalizeScriptPath(value) {
        return String(value || '').replace(/\\/g, '/').replace(/^scripts\//i, '').toLowerCase();
    }

    function ensureDir(fs, dir) {
        var parent;
        if (fs.existsSync(dir)) return;
        parent = context.path.dirname(dir);
        if (parent && parent !== dir) ensureDir(fs, parent);
        try { fs.mkdirSync(dir); } catch (e) { if (!fs.existsSync(dir)) throw e; }
    }

    function readJson(fs, filePath, fallback) {
        try {
            if (fs.existsSync(filePath)) return JSON.parse(fs.readFileSync(filePath, 'utf8'));
        } catch (e) {}
        return fallback;
    }

    function writeJsonWithBackup(fs, filePath, data) {
        ensureDir(fs, context.path.dirname(filePath));
        if (fs.existsSync(filePath)) fs.writeFileSync(filePath + '.bak', fs.readFileSync(filePath));
        fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf8');
    }

    function callHost(functionName, args, callback) {
        var encoded = [];
        var i;
        for (i = 0; i < args.length; i++) encoded.push(JSON.stringify(args[i]));
        context.csInterface.evalScript(functionName + '(' + encoded.join(',') + ')', callback || function () {});
    }

    function loadManifests() {
        var toolsDir = context.path.join(context.extensionPath, 'tools');
        var manifests = [];
        if (!context.fs.existsSync(toolsDir)) return manifests;
        context.fs.readdirSync(toolsDir).forEach(function (name) {
            if (!/\.tool\.json$/i.test(name)) return;
            var item = readJson(context.fs, context.path.join(toolsDir, name), null);
            if (item && item.id && item.component && components[item.component]) manifests.push(item);
        });
        return manifests;
    }

    function activate(viewId) {
        var views = document.querySelectorAll('.tool-view');
        var i;
        for (i = 0; i < views.length; i++) views[i].classList.toggle('active', views[i].id === viewId);
    }

    window.ScriptRunnerTools = {
        register: function (name, factory) { components[name] = factory; },
        handlesScript: function (relPath) {
            var normalized = normalizeScriptPath(relPath);
            var i;
            for (i = 0; i < loadedTools.length; i++) {
                if (normalizeScriptPath(loadedTools[i].script) === normalized) return true;
            }
            return false;
        },
        openByScript: function (relPath) {
            var normalized = normalizeScriptPath(relPath);
            var i;
            for (i = 0; i < loadedTools.length; i++) {
                if (normalizeScriptPath(loadedTools[i].script) === normalized) {
                    activate('tool-view-' + loadedTools[i].id);
                    try { context.csInterface.resizeContent(Math.max(window.innerWidth, 300), Math.max(window.innerHeight, 700)); } catch (resizeError) {}
                    return true;
                }
            }
            return false;
        },
        showScripts: function () { activate('scripts-view'); },
        init: function (options) {
            context = options;
            loadedTools = loadManifests();
            loadedTools.forEach(function (manifest) {
                var view = document.createElement('div');
                view.id = 'tool-view-' + manifest.id;
                view.className = 'tool-view';
                document.getElementById('tool-root').appendChild(view);
                components[manifest.component]({
                    manifest: manifest,
                    root: view,
                    fs: context.fs,
                    path: context.path,
                    extensionPath: context.extensionPath,
                    userDataDir: context.path.join(context.userDataPath, 'IndustrialDesignMeditation', 'ScriptRunnerAI'),
                    readJson: readJson,
                    writeJson: writeJsonWithBackup,
                    callHost: callHost,
                    showScripts: function () { activate('scripts-view'); }
                });
            });
        }
    };
})();
