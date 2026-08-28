# Illustrator Script Hub 开发对接说明

## 项目关键词

`Adobe Illustrator` `CEP` `ExtendScript ES3` `CSInterface.evalScript` `host/index.jsx` `client/index.html` `scripts folder` `中文路径` `Windows`

## 架构约定

- `client/`：CEP 前端界面，只使用 CEP 可用的浏览器 JavaScript。
- `host/index.jsx`：通用宿主桥接层，负责调用 Illustrator JSX 文件和转发参数，不写具体业务逻辑。
- `scripts/`：用户业务脚本目录；公开仓库不提交其中的业务 JSX。
- `CSXS/manifest.xml`：声明 Illustrator 宿主、面板入口和 `host/index.jsx`。
- `tools/`：可选的参数化工具注册配置。

## 给 AI 的实现提示词

请在 Illustrator Script Hub 中实现功能：

1. 前端代码放在 `client/`，宿主桥接放在 `host/index.jsx`，业务脚本放在用户本地 `scripts/`，不要把业务 JSX 提交到公开仓库。
2. ExtendScript 必须兼容 ES3：使用 `var`、普通函数和传统循环，禁止 `let`、`const`、箭头函数、Promise 和现代数组方法。
3. 所有 Illustrator 调用通过 CEP 的 `CSInterface.evalScript` 进入 `host/index.jsx`，路径必须兼容中文和空格。
4. 不要把具体业务逻辑塞进通用宿主桥接层；新增复杂工具应通过 `tools/*.tool.json` 注册前端面板。
5. 错误提示采用三段式：发生了什么、可能原因、建议解决办法；保留关键调试日志。
6. 修改 JSX 后必须同步到本机 CEP 安装目录，并运行 Node 语法检查（先移除 `#target` 行）。
7. 保留旧版本脚本，不要未经明确要求删除或覆盖旧入口。

## 验证清单

- 中文路径、空格路径可扫描和运行。
- 面板可在 Illustrator 中加载，脚本列表为空时有明确提示。
- 中英文切换不会改变脚本文件名和用户排序配置。
- 普通 `.jsx` 可一键运行，参数化工具可打开对应面板。
- `host/index.jsx` 和所有业务 JSX 均通过 ES3 兼容检查。
- 公开提交不包含 `scripts/` 下的业务 JSX、用户配置和本机绝对路径。
