# JSX 脚本项目开发规范手册（PS + AI 统一版）

> 适用项目：`com.mytools.scriptrunner.ps`（Photoshop）和 `com.mytools.scriptrunner.ai`（Illustrator）
> 核心目标：作为两个插件共享的 JSX 业务脚本统一书写标准，确保代码风格一致、可维护、健壮。

---

## 一、运行环境与核心语法规范

### 1.1 严格遵循 ES3 标准

Photoshop 和 Illustrator 的 ExtendScript 引擎底层均基于 ECMAScript 3（ES3），**严禁使用任何 ES5+ / ES6+ 及现代 JavaScript 语法**。

| 禁止项 | 原因 | 正确写法 |
|--------|------|----------|
| `let` / `const` | 引擎不支持 | 全程使用 `var` |
| 箭头函数 `() => {}` | 引擎不支持 | `function () {}` |
| 模板字符串 `` ` `` | 引擎不支持 | 用 `+` 拼接字符串 |
| 解构赋值 `var {a,b} = obj` | 引擎不支持 | 逐属性读取 `obj.a` |
| 展开运算符 `...arr` | 引擎不支持 | 用循环替代 |
| `Array.prototype.indexOf` | 未实现 | 用 `for` 循环手动查找 |
| `Array.prototype.forEach` | 未实现 | 用 `for (var i=0;i<len;i++)` |
| `Array.prototype.map` / `filter` | 未实现 | 用循环手动构建新数组 |

### 1.2 代码结构与作用域

- **IIFE 封装（推荐）**：业务脚本最外层使用 `(function() { ... })();` 包裹，防止变量污染全局 ExtendScript 环境。
- **备选：`#target` 指令 + 顶层函数**：Illustrator 脚本可使用 `#target illustrator` 声明，并直接在顶层定义 `function main()`，在文件末尾调用 `main();`。
- **严禁**：裸写在全局作用域的变量和逻辑（容易与其他脚本冲突）。

---

## 二、项目架构规范

### 2.1 目录结构（PS 和 AI 一致）

```
com.mytools.scriptrunner.{ps|ai}/
├── client/
│   ├── index.html          # 前端 UI（ES6 可用）
│   └── CSInterface.js      # Adobe CEP 通信库（框架文件）
├── CSXS/
│   └── manifest.xml        # CEP 插件清单
├── host/
│   └── index.jsx           # 后端执行沙盒（框架文件，不写业务逻辑）
└── scripts/
    └── *.jsx               # 业务脚本（核心产出，遵循本规范）
```

### 2.2 host/index.jsx 职责

- 这是**纯框架层**，绝不可在其中编写任何业务功能。
- 唯一职责：接收前端传入的脚本文件路径，通过 `$.evalFile()` 安全加载执行。
- 顶层提供 `runDynamicJSXFile(filePath)` 函数供前端调用。
- 错误兜底：`try...catch` 捕获执行异常，弹出 `alert` 提示用户。

### 2.3 前端（client/index.html）职责

- 扫描 `scripts/` 目录，将 `.jsx` 文件列表展示为可点击按钮。
- 通过 `CSInterface.evalScript('runDynamicJSXFile("' + path + '")')` 调用后端执行脚本。
- 前端 UI 使用 ES6+ 语法不受限制（Chromium 嵌入式浏览器，非 ExtendScript 引擎）。

### 2.4 两平台差异要点

| 维度 | Photoshop (PS) | Illustrator (AI) |
|------|----------------|-------------------|
| Host Name | `PHXS` | `ILST` |
| 文档模型 | `app.documents`, 图层树（`layers`/`layerSets`/`artLayers`） | `app.documents`, `textFrames`/`pathItems`/`layers` |
| 脚本指令提示 | 无（任何代码都能作为脚本） | 可选 `#target illustrator` |
| 智能对象 | 支持（`placedLayerEditContents`） | 不支持 |
| PNG 导出 | `ExportOptionsSaveForWeb` | 不支持同样 API，需用 `exportFile()` |
| 坐标系统 | 左上角原点 | `CoordinateSystem.DOCUMENTCOORDINATESYSTEM`（画板坐标） |

---

## 三、脚本文件规范

### 3.1 头部注释

由于 Photoshop 脚本选择窗口的提示区域高度极小，**头部说明必须精简至 1-2 行**，用 `/* */` 块注释。

**正确示例**：
```javascript
/* 说明：打开PSD运行脚本，自动检索名称含"替换"的智能对象进行素材替换并导出PNG。 */
```

**错误示例**（信息无效）：
```javascript
// Created by Zhang San
// Date: 2024-01-01
// Version: 1.0
```

### 3.2 文件命名

- **使用清晰的功能名称**，允许中文、英文和数字，如 `统一图片宽度v1.0.jsx`、`cmd标注线v1.2.jsx`。
- **不再添加人工排序前缀**：禁止仅为排序使用 `a.`、`b.` 等前缀；CEP 面板已能方便地浏览和运行脚本。
- 持续迭代且需要区分版本时，可在功能名称后添加版本号，如 `页码生成器v2.0.jsx`；无需区分版本时可省略。
- 文件名要能在列表中让用户一眼看懂功能，并确保脚本代码兼容中文、空格路径。

### 3.3 函数定义风格

**禁止**在函数定义之前使用（函数表达式的问题）。统一使用函数声明（hoisting 安全），且主要逻辑函数应放在文件末尾或顶部集中定义。

**AI 脚本**：推荐顶层 `function main() { ... }` 统一入口。
**PS 脚本**：推荐 IIFE `(function() { ... })();` 直接启动。

### 3.4 面板参数声明（@param）

在脚本**第一个块注释**内用 `@param` 行声明可在 CEP 面板中调整的参数；面板会在该脚本条目右侧显示 ⚙ 按钮，点击**切换到整页设置视图**（与脚本列表互切，页面随面板尺寸伸缩），改动即时保存到 CEP 用户数据目录，之后一键运行自动注入。

**格式**：每条声明独占一行，`@param` + 单行 JSON，字段如下：

| 字段 | 必填 | 说明 |
| --- | --- | --- |
| `key` | 是 | 参数名，与脚本内变量对应 |
| `type` | 是 | `number`（数值输入）、`bool`（开关）、`text`（多行文本域）、`color`（HEX 色值 + 色块预览） |
| `label` | 否 | 设置页中显示的标签（默认用 key） |
| `min` / `max` / `step` | 否 | 仅 number：数值范围与步长 |
| `default` | 否 | 默认值；number 取 min（无 min 取 0），bool 取 false，text 取空串，color 取 `#RRGGBB`（非法值回落 `#FF0000`） |

**示例**（数值/开关见 `scripts/b.cmf标注线v1.2.jsx`，文本/色值见 `scripts/CMF标注线v1.5.jsx`）：
```javascript
/*
 * 用途说明……
 * @param {"key":"baseCircleRadius","type":"number","label":"起点圆圈半径(pt)","min":1,"max":20,"step":0.5,"default":3}
 * @param {"key":"mirror","type":"bool","label":"奇偶画板镜像对齐","default":false}
 * @param {"key":"text","type":"text","label":"默认文本内容","default":"名称：\n材质：\n颜色：PANTONE"}
 * @param {"key":"lineColor","type":"color","label":"标注线颜色","default":"#FF0000"}
 */
```

**脚本侧接收模板**（ES3，双击独立运行时无载荷、自动回落脚本内默认值）：
```javascript
function readPanelParams() {
    var encoded;
    try { encoded = $.global.__SCRIPT_RUNNER_TOOL_PAYLOAD__; } catch (e) { return null; }
    if (!encoded) return null;
    try { return eval("(" + decodeURIComponent(String(encoded)) + ")"); } catch (e2) { return null; }
}

// 使用处：
var panelParams = readPanelParams();
if (panelParams && typeof panelParams.baseCircleRadius === "number") {
    baseCircleRadius = panelParams.baseCircleRadius;
}
```

**注意事项**：
- `@param` 行必须写在第一个块注释内且单行完整（JSON 内不能换行）；面板会自动把这些行从 ℹ 说明区过滤掉。
- 声明的 `default` 应与脚本内默认值保持一致，避免“未调整即改变行为”。
- text 的默认值用 JSON 转义 `\n` 表示换行（文件里是两个字符，解析后变真实换行）；color 值统一保存为 `#RRGGBB` 大写形式，面板端校验非法输入不落盘。
- 已注册 `.tool.json` 完整面板的脚本不走此机制（参数由其面板管理），不显示 ⚙。
- JSON 解析失败的声明行会被忽略并在控制台警告，不影响脚本运行。

---

## 四、Photoshop（PS）专项规范

### 4.1 目标图层/图层组的选择策略（容错机制）

查找目标对象时，遵循**三级降级后备逻辑**：

1. **名称匹配（首选）**：遍历图层树，匹配名称中包含特定关键词（如"替换"）的图层或图层组。
2. **状态匹配（后备）**：若未找到，使用 `app.activeDocument.activeLayer`（用户当前选中的图层）。
3. **安全中断（兜底）**：以上两者均不满足时，弹出清晰的 `alert` 提示并安全退出，**绝不静默失败**。

```javascript
var targetGroup = findGroupByName(doc, KEYWORD);
if (!targetGroup) {
    var activeLyr = doc.activeLayer;
    if (activeLyr && activeLyr.typename === "LayerSet") {
        targetGroup = activeLyr;
    }
}
if (!targetGroup) {
    alert("未找到目标图层组！请确保组名称包含\"" + KEYWORD + "\"，或手动选中后重试。");
    return;
}
```

### 4.2 图层安全删除机制

Photoshop 规定任何文档**必须至少保留一个可见图层**。

- **"先建后删"原则**：先将新素材粘贴/创建进文档，再遍历删除旧图层。
- **`remove()` 必须包裹 `try...catch(e){}`**：防止删到锁定图层或最后一个图层时整体崩溃。

```javascript
// 先建后删
soDoc.paste();
var newLayer = soDoc.activeLayer;

for (var k = 0; k < oldLayers.length; k++) {
    try { oldLayers[k].remove(); } catch (errRemove) {}
}
```

### 4.3 智能对象处理机制

#### 打开智能对象内部文档
```javascript
function openSmartObjectInternal() {
    var id5 = stringIDToTypeID("placedLayerEditContents");
    var desc = new ActionDescriptor();
    try {
        executeAction(id5, desc, DialogModes.NO);
        return app.activeDocument;
    } catch(e) {
        return null;
    }
}
```

#### 修改后保存并关回主文档
```javascript
soDoc.close(SaveOptions.SAVECHANGES);
app.activeDocument = app.documents[mainDocName];
```

#### 强制重绘缓存（解决导出全黑/旧画面 BUG）
```javascript
app.refresh(); // 必须在切回主文档后立即调用
```

### 4.4 ActionDescriptor 强制聚焦

仅通过 `doc.activeLayer = targetLayer` 修改选中状态，有时无法在图层面板中真正触发选中，导致后续底层命令（如编辑智能对象）失效。

**规范**：对涉及系统级菜单命令的操作，必须通过 `ActionDescriptor` 强制选中：

```javascript
function selectLayerByName(layerName) {
    var idslct = charIDToTypeID("slct");
    var desc = new ActionDescriptor();
    var idnull = charIDToTypeID("null");
    var ref = new ActionReference();
    ref.putName(charIDToTypeID("Lyr "), layerName);
    desc.putReference(idnull, ref);
    executeAction(idslct, desc, DialogModes.NO);
}
```

### 4.5 尺寸读取与中心点计算

- 图层的 `bounds` 属性返回 `[left, top, right, bottom]`，**必须带 `.value`** 才能做数学计算。
- 中心点公式：`centerX = (bounds[0].value + bounds[2].value) / 2`
- 位移：`layer.translate(deltaX, deltaY)`，参数为差值而非绝对坐标。

### 4.6 PNG 导出（PS 专用 API）

```javascript
function exportDocumentAsPNG(docObj, outputFile) {
    var opts = new ExportOptionsSaveForWeb();
    opts.format = SaveDocumentType.PNG;
    opts.PNG8 = false;
    opts.transparency = true;
    opts.interlaced = false;
    docObj.exportDocument(outputFile, ExportType.SAVEFORWEB, opts);
}
```

---

## 五、Illustrator（AI）专项规范

### 5.1 脚本声明

AI 脚本文件第一行建议添加 `#target illustrator`：
```javascript
#target illustrator
```

### 5.2 坐标系统

AI 脚本中涉及位置计算时，**必须**显式声明坐标系统并事后恢复：

```javascript
var originalCoord = app.coordinateSystem;
app.coordinateSystem = CoordinateSystem.DOCUMENTCOORDINATESYSTEM;
// ... 执行坐标相关操作 ...
app.coordinateSystem = originalCoord;
```

### 5.3 画板操作

- 获取当前画板：`var abIdx = doc.artboards.getActiveArtboardIndex();`
- 获取画板矩形：`var rect = doc.artboards[i].artboardRect;` 返回 `[left, top, right, bottom]`
- **注意**：AI 画板的 Y 轴是**顶部 > 底部**（`top > bottom`），如 `[0, 500, 400, 0]`
- 画板宽度 = `rect[2] - rect[0]`，画板高度 = `rect[1] - rect[3]`

### 5.4 图层操作

- 查找或创建专属图层：
```javascript
var targetLayer;
try {
    targetLayer = doc.layers.getByName("Guides_Layout");
} catch (e) {
    targetLayer = doc.layers.add();
    targetLayer.name = "Guides_Layout";
}
targetLayer.locked = false;
```

- 移动对象到指定图层：`obj.move(targetLayer, ElementPlacement.PLACEATEND);`

### 5.5 单位换算

AI 内部单位为 `pt`，毫米换算系数：`1 mm = 2.83464567 pt`

```javascript
function toPt(valStr, unit) {
    var val = parseFloat(valStr);
    if (isNaN(val)) return 0;
    try {
        return Number(UnitValue(val, unit).as("pt"));
    } catch (e) {
        return val;
    }
}
```

### 5.6 颜色创建

```javascript
var strokeColor = new RGBColor();
strokeColor.red = 255;
strokeColor.green = 0;
strokeColor.blue = 0;
```

### 5.7 AI 特有的文件操作

- 打开文件：`app.open(File对象)` 返回文档对象
- 关闭不保存：`doc.close(SaveOptions.DONOTSAVECHANGES)`
- 跨文档复制对象：`sourceObj.duplicate(targetLayer, ElementPlacement.PLACEATBEGINNING)`

### 5.8 文本操作注意事项

- 点状文本（PointText）转换为区域文本时使用字符串赋值：`baseTemplate.kind = "TextFrameKind.AREATEXT";`
- 通过 `createOutline()` 转曲后获取精准物理宽度

### 5.9 页码等跨画板文本的精准定位

页码、页眉、页脚等需要跨画板复制的文本，应遵循“先确定文本属性，再测量真实几何，最后绝对定位”的顺序。不得依赖文本框在修改内容或段落对齐前的坐标和宽度。

#### 5.9.1 绑定样板所在画板

不得默认使用 `doc.artboards[0]` 作为相对坐标参照。应通过几何检测找到样板文本实际所在的“母体画板”，再从该画板提取相对边距。

```javascript
var templatePos = templateFrame.position;
var templateX = templatePos[0];
var templateY = templatePos[1];
var parentBoardIndex = -1;

for (var a = 0; a < doc.artboards.length; a++) {
    var abRect = doc.artboards[a].artboardRect;
    if (templateX >= abRect[0] && templateX <= abRect[2] &&
            templateY <= abRect[1] && templateY >= abRect[3]) {
        parentBoardIndex = a;
        break;
    }
}

if (parentBoardIndex < 0) {
    alert("无法确定样板文本所在的画板。\n\n" +
        "可能原因：样板文本的定位点位于所有画板之外。\n" +
        "建议：将样板文本移入目标画板后重试。");
    return;
}

var parentAbRect = doc.artboards[parentBoardIndex].artboardRect;
```

#### 5.9.2 严格执行三步定位时序

1. **属性定性**：先写入新的 `.contents`，再根据版式设置 `.justification`。此时文本框发生原点偏移属于正常现象。
2. **动态测量**：复制当前文本并调用 `.createOutline()`，获取当前字符和对齐状态下的真实几何宽度及内部偏差；测量后立即删除临时转曲对象。
3. **刚性归位**：根据真实几何结果计算目标坐标，使用 `.position = [x, y]` 完成最终定位。不要再依赖 `.left`、`.top` 或修改属性前记录的文本宽度。

临时测量对象必须在异常分支中清理，避免脚本出错后在文档中残留转曲对象。

#### 5.9.3 奇偶镜像以画板序号为准

左右页判定应使用画板在文档中的物理序号 `artboardIndex + 1`，不得使用页码文本内容的奇偶性。起始页码可能与起始画板序号不同，混用会导致左右页反向。

- `(artboardIndex + 1) % 2 !== 0`：右手页，保持右对齐并锁定到画板右侧。
- `(artboardIndex + 1) % 2 === 0`：左手页，切换左对齐并锁定到画板左侧。

#### 5.9.4 图层、坐标系与循环隔离

- 生成结果应放入独立专用图层；写入前确保图层存在、未锁定且可见。
- 获取或写入坐标前切换到 `CoordinateSystem.DOCUMENTCOORDINATESYSTEM`，并在正常结束和异常分支中恢复原坐标系。
- 修改 `.contents`、`.justification` 和创建轮廓等易失败操作时，应在单个画板的循环内部捕获异常并记录上下文，避免一个画板失败导致整个批处理终止。
- 脚本头部仍遵循 3.1 的精简原则；复杂操作步骤应放在使用说明或面板帮助中，不在 JSX 头部堆叠长篇说明。

---

## 六、文件系统与导出规范

### 6.1 跨平台路径处理

- 使用正斜杠 `/` 拼接路径（ExtendScript 自动处理 Windows/macOS 兼容性）：
  ```javascript
  var exportFolder = new Folder(folder.fsName + "/" + EXPORT_FOLDER_NAME);
  ```

### 6.2 文件夹自动创建

写入文件前必须检查目录是否存在：
```javascript
if (!exportFolder.exists) {
    exportFolder.create();
}
```

### 6.3 防覆盖机制

不同功能导出的文件必须写入独立的子文件夹（如 `PNG_Exported`、`PNG_Groups_Exported`）。

### 6.4 扩展名安全匹配

读取文件夹素材时，图片后缀的正则匹配**必须强制开启 `/i` 忽略大小写**：
```javascript
if (/\.(jpg|jpeg|png|tif|tiff|psd|webp|bmp)$/i.test(name)) { ... }
```

否则极易漏掉 `.JPG`、`.PNG` 等大写后缀文件。

### 6.5 文件名解码

Windows 系统中文文件名需通过 `decodeURI()` 解码：
```javascript
var name = decodeURI(file.name).toLowerCase();
```

---

## 七、数组排序规范 -- 自然数排序（Natural Sort）

### 7.1 问题背景

JavaScript / ExtendScript 默认的 `Array.prototype.sort()` 是按 ASCII 字符编码逐字比较的，不是像 Windows 资源管理器那样使用自然数逻辑（Natural Sort）。

**默认排序下的错误结果**：
```
10.jpg  →  排在 2.jpg 前面（因为字符 "1" 的编码 < "2"）
图层10  →  排在 图层2 前面
```

这导致批量处理素材时的顺序与用户预期不符。

### 7.2 规范要求

**任何涉及文件名、图层名排序的地方，必须使用自然数排序算法（兼容 ES3）**。

### 7.3 实现代码（标准模板）

```javascript
/**
 * 自然排序比较函数（兼容 ES3，匹配 Windows/Mac 资源管理器的文件排序逻辑）
 * @param {String} a - 比较字符串 A
 * @param {String} b - 比较字符串 B
 * @return {Number} 负值表示 a < b，正值表示 a > b，0 表示相等
 */
function naturalCompare(a, b) {
    var ax = [], bx = [];

    a.replace(/(\d+)|(\D+)/g, function (_, $1, $2) {
        ax.push([$1 || Infinity, $2 || ""]);
    });
    b.replace(/(\d+)|(\D+)/g, function (_, $1, $2) {
        bx.push([$1 || Infinity, $2 || ""]);
    });

    while (ax.length && bx.length) {
        var an = ax.shift();
        var bn = bx.shift();
        var nn = (an[0] - bn[0]) || an[1].localeCompare(bn[1]);
        if (nn) return nn;
    }

    return ax.length - bx.length;
}
```

### 7.4 使用示例

```javascript
fileList.sort(function (a, b) {
    return naturalCompare(decodeURI(a.name), decodeURI(b.name));
});
```

### 7.5 适用范围

- 文件夹素材文件列表排序
- 按数字命名的图层/图层组排序
- 任何涉及数字序号（如 `1, 2, 10, 20`）正确排序的场景

---

## 八、UI 界面规范（ScriptUI）

### 8.1 通用结构模板（PS 和 AI 通用）

```javascript
var dialog = new Window("dialog", "窗口标题");
dialog.orientation = "column";
dialog.alignChildren = ["fill", "top"];
dialog.spacing = 15;
dialog.margins = 20;

// 输入区
var inputPanel = dialog.add("panel", undefined, "参数设置");
inputPanel.orientation = "column";
inputPanel.alignChildren = ["left", "center"];
inputPanel.margins = 15;
inputPanel.spacing = 10;

var row1 = inputPanel.add("group");
row1.add("statictext", undefined, "参数名:");
var edit1 = row1.add("edittext", undefined, "默认值");
edit1.characters = 10;

// 按钮区
var btnGroup = dialog.add("group");
btnGroup.alignment = "center";
var okBtn = btnGroup.add("button", undefined, "确认", {name: "ok"});
var cancelBtn = btnGroup.add("button", undefined, "取消", {name: "cancel"});

if (dialog.show() === 1) {
    // 用户点击确认后的执行逻辑
}
```

### 8.2 数值输入验证

```javascript
var value = parseInt(input.text, 10);  // 必须指定基数 10
if (isNaN(value) || value < 1 || value > max) {
    alert("请输入有效的数值（范围 1-" + max + "）！");
    return;
}
```

### 8.3 错误提示格式（三段式）

错误提示应包含：发生了什么 → 可能原因 → 建议解决办法。

```javascript
alert("读取源文档信息失败。\n\n" +
    "可能原因：文件损坏、格式不受支持或没有访问权限。\n" +
    "建议：确认文件能在 Photoshop 中正常打开后重试。\n\n" +
    "详细信息：" + e.message);
```

---

## 九、状态管理与异常处理

### 9.1 测量单位/首选项的保护与恢复

不同用户的默认设置不同（厘米、英寸、像素），会直接导致数值计算错误。

**PS 脚本规范**：
```javascript
var originalRulerUnits = app.preferences.rulerUnits;
app.preferences.rulerUnits = Units.PIXELS;

// ... 脚本主体 ...

// 正常退出恢复
app.preferences.rulerUnits = originalRulerUnits;

// catch 异常分支也恢复
try { app.preferences.rulerUnits = originalRulerUnits; } catch(e) {}
```

**AI 脚本规范**：
```javascript
var originalCoord = app.coordinateSystem;
app.coordinateSystem = CoordinateSystem.DOCUMENTCOORDINATESYSTEM;

// ... 脚本主体 ...

app.coordinateSystem = originalCoord;
```

### 9.2 UI 界面状态的无损还原

- 批量独占导出时（如隐藏其他图层组，只显示当前组），**操作前**通过数组记录所有图层的初始 `visible` 状态。
- **操作完成后**，利用记录的数组将文档恢复为运行脚本前的原始状态，做到"无痕运行"。

```javascript
// 记录初始状态
var originalVisibilities = [];
for (var i = 0; i < doc.layers.length; i++) {
    originalVisibilities.push(doc.layers[i].visible);
}

// ... 执行操作 ...

// 还原
for (var n = 0; n < doc.layers.length; n++) {
    doc.layers[n].visible = originalVisibilities[n];
}
```

### 9.3 全局错误捕获

- **主循环内部**（遍历素材、遍历图层组）必须包含 `try...catch`。
- 某个文件的处理失败只能通过 `$.writeln()` 输出日志或跳过，**绝对不允许**中断整个批处理流程。
- 循环末尾要尝试恢复焦点文档：
  ```javascript
  try { app.activeDocument = app.documents[mainDocName]; } catch(r) {}
  ```

### 9.4 锁定的图层/对象处理

操作前主动解锁：
```javascript
try {
    targetLayer.locked = false;
} catch(e) {}
```

---

## 十、调试与日志规范

### 10.1 控制台日志

使用 `$.writeln()` 输出结构化日志到 ExtendScript Toolkit 控制台，日志应包含上下文信息：

```javascript
$.writeln("[处理] 文件：" + decodeURI(imageFile.name) + "，序号：" + (i + 1));
$.writeln("[错误] 处理失败：" + imageFile.name + "，" + e.message);
```

### 10.2 调试开关建议

```javascript
var DEBUG = false; // 发布时改为 false

function log(msg) {
    if (DEBUG) $.writeln(msg);
}
```

---

## 十一、命名与代码风格规范

### 11.1 变量命名

- `camelCase`：变量名、函数名使用驼峰命名。
- 常量使用大写蛇形：`var KEYWORD = "替换";`、`var EXPORT_FOLDER_NAME = "PNG_Exported";`
- 循环索引：外层用 `i`、`j`、`k`，内层不混用。

### 11.2 字符串拼接

- 中文提示务必使用可维护的拼接方式，变量用 `+` 接续。
- 示例：`"成功导出 " + successCount + " 张图片至:\n" + exportFolder.fsName`

### 11.3 等号风格

- JavaScript 里推荐用 `===` / `!==` 进行严格比较。
- 注意：ES3 支持 `===`，放心使用。

### 11.4 函数定义位置

- 辅助函数统一放在文件末尾（IIFE 内部或 `main()` 之后），主逻辑在前，方便阅读。
- 每个辅助函数加一行简短注释说明其用途。

---

## 附录：常见踩坑记录

1. **PS 导出全黑 BUG**：智能对象更新后必须立即调用 `app.refresh()` 再导出。
2. **AI 坐标 Y 轴反转**：AI 画板的 `top` 值 > `bottom` 值，计算高度需用 `Math.abs()`。
3. **`bounds` 值必须带 `.value`**：图层的 `bounds` 返回 UnitValue 对象，直接计算会得到 `NaN`。
4. **`parseInt` 必须带基数**：`parseInt("08")` 在 ES3 中可能解析为 0（八进制），必须写成 `parseInt("08", 10)`。
5. **编码问题**：Windows 中文路径下的文件操作务必用 `decodeURI()` 处理文件名。
6. **AI `for...in` 谨慎使用**：遍历对象属性时不要用来遍历数组，用标准 `for` 循环。
7. **PS 锁定图层不可删**：`remove()` 前必须确认图层不是最后一个可见图层，且应包裹在 `try...catch` 中。
8. **自然排序必须用专用算法**：JS 默认 `sort()` 对数字字符串排序不符合人类直觉，必须使用 `naturalCompare()` 函数。
