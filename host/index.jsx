// ============================================================================
// 【通用后端执行大脑】
// 此文件为纯净框架资产，绝不包含任何硬编码的具体业务功能。
// 仅作为一个底层安全执行沙盒，负责接收路径并执行对应的 JSX 脚本。
// 底层完全基于 ECMAScript 3 (ES3) 严谨标准开发，确保完美兼容
// ============================================================================

/**
 * 通用动态 JSX 文件执行器
 * @param {String} filePath - 需要运行的 JSX 脚本的本地绝对路径
 */
function runDynamicJSXFile(filePath) {
    try {
        var scriptFile = new File(filePath);
        if (scriptFile.exists) {
            // 安全读取并评估执行
            $.evalFile(scriptFile);
        } else {
            alert("❌ 错误：找不到脚本文件\n路径: " + filePath);
        }
    } catch (error) {
        alert("⚠️ 脚本执行中发生异常：\n" + error.toString() + "\n\n行号: " + error.line);
    }
}

/**
 * 通用参数化 JSX 工具执行器。
 * payloadEncoded 为前端 encodeURIComponent 后的 JSON，不包含具体业务规则。
 */
function runDynamicJSXTool(filePath, payloadEncoded) {
    var previousPayload;
    var hadPrevious = false;
    try {
        try {
            previousPayload = $.global.__SCRIPT_RUNNER_TOOL_PAYLOAD__;
            hadPrevious = typeof previousPayload !== "undefined";
        } catch (readError) {}

        $.global.__SCRIPT_RUNNER_TOOL_PAYLOAD__ = payloadEncoded;
        var scriptFile = new File(filePath);
        if (!scriptFile.exists) {
            return '{"ok":false,"message":"工具脚本不存在。\\n可能原因：插件更新不完整。\\n建议：重新运行一键安装脚本。"}';
        }
        return String($.evalFile(scriptFile));
    } catch (error) {
        return '{"ok":false,"message":"工具执行失败。\\n可能原因：Illustrator 当前状态不允许执行。\\n建议：检查文档和选区后重试。\\n详细信息：' + escapeToolJson(error.toString()) + '（行号：' + error.line + '）"}';
    } finally {
        try {
            if (hadPrevious) $.global.__SCRIPT_RUNNER_TOOL_PAYLOAD__ = previousPayload;
            else delete $.global.__SCRIPT_RUNNER_TOOL_PAYLOAD__;
        } catch (restoreError) {}
    }
}

// 转义宿主返回 JSON 中的特殊字符。
function escapeToolJson(value) {
    return String(value).replace(/\\/g, "\\\\").replace(/"/g, '\\"').replace(/\r/g, "\\r").replace(/\n/g, "\\n");
}
