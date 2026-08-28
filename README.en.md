# Illustrator Script Hub

[简体中文](README.md)

> Adobe Illustrator CEP script management panel

## Overview

Illustrator Script Hub is a CEP panel for Adobe Illustrator. It scans the `scripts` folder, displays script names, notes and timestamps, and supports ordering, color labels and one-click execution.

## Features

- Chinese / English interface toggle
- Recursive `.jsx` / `.js` scanning
- Drag-and-drop ordering and color labels
- Usage notes from script header comments
- CEP-to-ExtendScript host bridge
- One-click Windows installation

## Scope

This public repository contains only the CEP panel source, required host bridge and installation files. Business JSX files are excluded. Put your own scripts into the extension's `scripts` folder.

## Installation

1. Enable CEP debug mode for your Adobe version.
2. Copy this folder to `%APPDATA%\\Adobe\\CEP\\extensions\\com.mytools.scriptrunner.ai`.
3. Restart Illustrator and open “General JSX Script Manager” from `Window > Extensions`.

Windows users can also run `运行自动安装.cmd`.

## Development

See [DEVELOPMENT.md](DEVELOPMENT.md) for architecture rules, AI integration keywords and the validation checklist.

## Current Support`r`n`r`nTwo Adobe applications are currently supported: Illustrator and Photoshop.`r`n`r`n## Author

Industrial Design Notes

