# Illustrator Script Hub

Illustrator Script Hub 是一个面向 Adobe Illustrator 的 CEP 脚本管理面板。
它扫描用户指定的 `scripts` 文件夹，显示脚本名称、说明、更新时间，并支持排序、颜色标记和一键运行。

## English

Illustrator Script Hub is a CEP panel for Adobe Illustrator.
It scans a user-selected `scripts` folder, shows script names, notes and timestamps, and supports sorting, color markers and one-click execution.

## Features / 功能

- 中文 / English interface toggle
- Recursive `.jsx` / `.js` scanning
- Drag-and-drop ordering and color labels
- Usage notes from the script header comment
- CEP-to-ExtendScript host bridge
- Windows one-click installation command

本仓库只发布 CEP 面板源码和必要的宿主桥接代码，不附带业务 JSX 脚本。请将自己的脚本放入扩展目录下的 `scripts` 文件夹。

This repository intentionally excludes business JSX files. Put your own scripts into the extension's `scripts` folder.

## Installation / 安装

1. Enable CEP debug mode for your Adobe version.
2. Copy this folder to `%APPDATA%\\Adobe\\CEP\\extensions\\com.mytools.scriptrunner.ai`.
3. Restart Illustrator and open `Window > Extensions > 通用 JSX 脚本管理器`.

On Windows, `运行自动安装.cmd` can copy the panel to the per-user CEP extensions directory.

## Development

See [DEVELOPMENT.md](DEVELOPMENT.md) for the AI-oriented development contract and integration keywords.

作者 / Author: 工业设计沉思录
