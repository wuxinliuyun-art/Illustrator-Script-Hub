# Illustrator Script Hub

[English](README.en.md)

> Adobe Illustrator CEP 脚本管理面板

## 简介

Illustrator Script Hub 是一个面向 Adobe Illustrator 的 CEP 脚本管理面板。它扫描 `scripts` 文件夹，显示脚本名称、说明和更新时间，并支持排序、颜色标记与一键运行。

## 功能

- 面板左侧中英文切换
- 递归扫描 `.jsx` / `.js` 脚本
- 拖拽排序和颜色标记
- 读取脚本头部使用说明
- CEP 到 ExtendScript 的宿主桥接
- Windows 一键安装

## 发布范围

本公开仓库只包含 CEP 面板源码、必要的宿主桥接和安装文件，不包含业务 JSX。请将自己的脚本放入扩展目录下的 `scripts` 文件夹。

## 安装

1. 为对应 Adobe 版本启用 CEP 调试模式。
2. 将本目录复制到 `%APPDATA%\\Adobe\\CEP\\extensions\\com.mytools.scriptrunner.ai`。
3. 重启 Illustrator，在“窗口 > 扩展”中打开“通用 JSX 脚本管理器”。

Windows 用户也可以运行 `运行自动安装.cmd`。

## 开发

请阅读 [DEVELOPMENT.md](DEVELOPMENT.md)，其中包含架构约定、AI 对接关键词和验证清单。

## 当前支持

目前支持两种 Adobe 软件：Illustrator 和 Photoshop。

## 作者

工业设计沉思录


