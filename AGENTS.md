# 项目协作记录

## 项目目标

为 Illustrator 提供易安装、可视化、支持中文路径的 CEP 脚本管理器（Illustrator Script Hub），并逐步承载需要复杂参数配置的可扩展工具。

关键词：`Adobe Illustrator`、`CEP`、`ExtendScript ES3`、`CSInterface.evalScript`、`中文路径`、`Windows`。

## 当前架构

- `client/`：CEP 前端界面，只使用 CEP 可用的浏览器 JavaScript。
  - `client/index.html`：普通 JSX 列表；声明了 CEP 模组的脚本在对应条目右侧显示“面板”按钮。
  - `client/tool-framework.js`：读取 `tools/*.tool.json`、注册工具页、管理通用宿主调用与用户数据读写。
  - `client/tool-widgets.js`：可复用的表单、按钮、状态、排序、开关（`toggle`）和数值输入（`numberInput`）基础组件。
  - `client/script-params.js`：普通脚本的轻量参数机制；解析脚本头部注释 `@param` 声明，⚙ 打开整页设置视图（bool=开关、number=数值输入、text=多行文本、color=HEX 色值），用户值持久化并经 `runDynamicJSXTool` 注入运行。
  - `client/cmf-tool.js`、`client/cmf-v15-tool.js`：旧 `.tool.json` 工具面板组件，2026-09 迁移统一到 ⚙ 机制后不再有清单加载，文件保留备查。
- `host/index.jsx`：通用宿主桥接层，负责调用 Illustrator JSX 文件和转发参数载荷，不写具体业务。
- `scripts/`：用户本地业务脚本目录，存放 Illustrator ES3 业务执行器（`*.jsx`）。
- `tools/`：可选的参数化工具注册配置（`*.tool.json`）。
- `CSXS/manifest.xml`：声明 Illustrator 宿主、面板入口和 `host/index.jsx`。

## 架构决策

- 复杂设置使用 CEP，Illustrator 绘图使用 JSX；不在 JSX ScriptUI 中维护大型词库界面。
- 参数化工具由 `.tool.json` 声明，前端组件注册后加载，普通 JSX 仍保持一键运行。
- 普通脚本的可调参数由脚本头部注释 `@param` 单行 JSON 声明（规范见 `jsx规范（报错时核对即可）.md` §3.4）：bool 渲染为开关、number 为数值输入、text 为多行文本、color 为色值；无声明则界面与运行方式完全不变。
- `@param` 参数的用户值保存在 CEP 用户数据目录 `ScriptRunnerAI/script-params.json`（写入留 `.bak`），复用宿主 `runDynamicJSXTool` 通道注入，宿主文件不为此改动。
- 已注册 `.tool.json` 面板的脚本不显示 ⚙ 参数按钮，参数由其面板统一管理。
- 参数化工具不占用面板顶部独立入口；从对应 JSX 条目进入，并可返回脚本列表。
- 用户词库和标签保存在 CEP 用户数据目录，不放在插件安装目录，避免更新覆盖。
- 面板脚本排序与颜色标记保存在 CEP 用户数据目录 `ScriptRunnerAI/panel-config.json`（写前留 `.bak`）；CEP 的 localStorage 在部分环境重启后会丢数据，只作旧数据兼容读取，不再作为主存储。
- CMF 界面保持轻量，不提供导入、导出或手动恢复入口；配置写入时仍自动保留 `.bak`。
- 一键安装过程不显示进度条；完成后仅列出业务 JSX 名称及前后更新时间。
- CMF 只支持生成前编辑；生成后成为普通 Illustrator 编组，由用户手动编辑和缩放。
- 旧版本长期保留：CMF v1.3 作为可直接运行的兼容旧版保留，新增 v2.0 或后续版本时不得自动删除旧版；任何旧入口未经用户明确要求不得删除或覆盖。

## ⚙ 参数设置规则（@param 声明）

普通脚本通过头部注释声明可调参数，条目右侧显示 ⚙，点击切换到**整页设置视图**（与脚本列表互切，页面随面板尺寸伸缩，无大小限制）。代码模板见 `jsx规范（报错时核对即可）.md` §3.4；已接入示例：`scripts/b.cmf标注线v1.2.jsx`（数值）、`scripts/CMF标注线v1.5.jsx`（文本/数值/色值）。

**声明规则**：

- 写在脚本第一个 `/* */` 块注释内，每个参数独占一行，`@param` 后跟单行 JSON，例如：
  `@param {"key":"baseCircleRadius","type":"number","label":"起点圆圈半径(pt)","min":1,"max":20,"step":0.5,"default":3}`
- `type` 支持 `number`（数值输入）、`bool`（开关）、`text`（多行文本域）、`color`（HEX 色值+色块）；`label`、`min`、`max`、`step`、`default` 可省略（`min`/`max`/`step` 仅对 number 有义）。
- `default` 缺省时 number 取 `min`（无 min 取 0）、bool 取 false、text 取空串、color 非法回落 `#FF0000`；**声明的默认值必须与脚本内默认值一致**，避免“未调整即改变行为”。
- JSON 必须单行完整（不能换行，text 的换行用 `\n` 转义）；解析失败的行会被忽略并在控制台警告，不影响脚本运行。
- `@param` 行会自动从 ℹ 说明区过滤，不显示给用户。

**行为规则**：

- 只有“声明了 `@param` 且未注册 `.tool.json` 面板”的脚本才显示 ⚙；其余脚本的界面与运行方式完全不变。
- 设置页改动即时写盘并显示“✓ 已保存”；底部仅一个“保存”按钮作显式确认；不提供“恢复默认”，回默认值由用户手动改回。
- 用户值保存于 CEP 用户数据目录 `IndustrialDesignMeditation/ScriptRunnerAI/script-params.json`，以脚本 relPath 为键，写前自动留 `.bak`；插件更新不会覆盖该文件。
- 一键运行改走宿主现成的 `runDynamicJSXTool` 通道：payload 为 `encodeURIComponent(JSON.stringify(当前生效值))`，经 `$.global.__SCRIPT_RUNNER_TOOL_PAYLOAD__` 注入；宿主文件不为该机制改动。
- 脚本侧统一用 `readPanelParams()` 接收（ES3 模板见规范 §3.4）：无载荷返回 null 并回落脚本内默认值，保证双击独立运行行为不变；覆盖前必须做类型校验（如 `typeof panelParams.xxx === "number"`）。
- 数值输入由 min/max 钳制，留空回退上一个有效值；色值统一存 `#RRGGBB` 大写、非法输入不落盘；脚本删改参数声明后，状态文件里的旧键不生效（读取时按当前声明合并）。

**2026-09 统一迁移记录**：CMF 标注线 v1.5 从 `.tool.json` 完整面板页迁移到 ⚙ 机制（payload 键名 text/fontSize/lineColor/textColor 与其 `readPanelSettings` 契约一致）；`tools/` 下两个 `.tool.json` 已删除（含指向不存在 v2.0 的死配置），tool-framework 的清单加载机制保留，未来复杂工具仍可启用。

## 编码与工作流约定

- ExtendScript 必须兼容 ES3：使用 `var`、普通函数和传统循环，禁止 `let`、`const`、箭头函数、Promise 和现代数组方法。
- 所有 Illustrator 调用通过 CEP 的 `CSInterface.evalScript` 进入 `host/index.jsx`，路径必须兼容中文和空格。
- 错误提示采用三段式：发生了什么、可能原因、建议解决办法；保留关键调试日志。
- 修改 JSX 后必须同步到本机 CEP 安装目录，并运行 Node 语法检查（先移除 `#target` 行）。
- 公开提交不包含 `scripts/` 下的业务 JSX、用户配置和本机绝对路径。

## 验证清单

- 中文路径、空格路径可扫描和运行。
- 面板可在 Illustrator 中加载，脚本列表为空时有明确提示。
- 普通 `.jsx` 可一键运行，参数化工具可打开对应面板。
- 声明 `@param` 的脚本：条目右侧出现 ⚙，弹卡修改值即时保存并显示"已保存"，重开面板仍保持，一键运行按保存值执行；双击独立运行仍用脚本内默认值。
- 未声明 `@param` 的脚本与已注册工具面板的脚本（如 CMF v1.5）不出现 ⚙，行为不变。
- `host/index.jsx` 和所有业务 JSX 均通过 ES3 兼容检查。

## TODO

- 在真实 Illustrator/CEP 环境完成 CMF 多节点视觉验收。
- 后续工具优先复用工具注册层和通用控件，不直接向 `index.html` 堆叠业务代码。

## 已知问题/踩坑记录

- Windows Robocopy 的源目录参数不能以反斜杠结束后紧接引号，否则会吞并目标参数；安装脚本应先移除 `%~dp0` 末尾反斜杠。
