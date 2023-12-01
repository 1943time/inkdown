# Bluestone Markdown
A WYSIWYG markdown editor. improving the Markdown reading and editing experience [Download](https://github.com/1943time/bluestone/releases/latest) or

<a href="https://apps.apple.com/us/app/bluestone-markdown/id6451391474"><img src="docs/assets/mac-store.svg" style="width:120px"/><a>

[Documentation](https://doc.bluemd.me/book/docs/introduction) | [中文文档](https://doc.bluemd.me/book/zh-docs/introduction)

> The release time of mac store will be delayed by 1-3 days

***

# Introduction

Bluestone is an WYSIWYG Markdown editor，use [GFM](https://github.github.com/gfm/) syntax，expanded [Mermaid](https://mermaid.js.org/) graphics [Katex](https://katex.org/) formula，
Supports light and dark color theme. and generate your Markdown files into online documents in the easiest and fastest way.

Unlike source code mode, Bluestone is more like a rich text editor, and it uses Markdown as the host.
The reason for this is that bluestone wants to maintain the universality and cross-platform features of Markdown,
and add a rich text editing experience on this basis.

![](./docs/assets/d1.png)

![](./docs/assets/syntax.gif)

## Features
- The rich text editing mode is used, while also compatible with Markdown syntax conversion and editing habits. When using the search function, Markdown symbols will not be searched.
- Automatically record and clear file history, can be viewed and rolled back at any time.
- Using [shiki](https://github.com/shikijs/shiki) as a code shader to make code highlights more fine-grained and aesthetically pleasing.
- Enhanced table operations, allowing for easy adjustment of the order and quantity of rows and columns in the table, and the ability to wrap within the table.
- Support the editing and display of block and inline [Katex](https://katex.org/) formulas
- Supports [mermaid](https://mermaid.js.org/) graphic syntax.
- The file path link can be automatically reconstructed, and when a file or folder is renamed or moved, the local path of the links or images that the document depends on will be automatically changed.
- Support exporting HTML and PDF.
- You can freely drag and adjust the order of document elements.
- Supports multi tab editing mode
- Support pasting HTML, plain text, and markdown code. When pasting HTML and markdown code, it can be configured to automatically download network images to the local machine and convert paths during pasting.
- Provides a powerful sharing program, Linux server required.[details](https://doc.bluemd.me/book/docs/service)

## Drag
![](./docs/assets/drag.gif)

## Format

Text format can be converted with floating bar or syntax

![](./docs/assets/text.png)

![](./docs/assets/test1.gif)

## Link
Links and images support file paths, usually imported files can be dragged in from the file tree, or directly use ctrl + v
![](./docs/assets/link.gif)



