<h1><img src="resources/icon.png" width="25"/> Bluestone Markdown</h1>
Improve markdown reading and editing experience, and facilitate network sharing.

[Documentation](https://doc.bluemd.me/book/docs/introduction) | [中文文档](https://doc.bluemd.me/book/zh-docs/introduction) | [👻 Try Online >>>](https://online.bluemd.me/editor)

|                                                                                      ![](./docs/assets/mac-pass-sm.png)                                                                                       |                                                                                  ![](./docs/assets/windows-pass-sm.png)                                                                                  |                                                                                                                                                                                                                             ![](./docs/assets/linux-pass-sm.png)                                                                                                                                                                                                                              |
|:-------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------:|:--------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------:|:---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------:|
| [mac-arm64](https://github.com/1943time/bluestone/releases/latest/download/Bluestone-mac-arm64.dmg)<br/> [mac-x64](https://github.com/1943time/bluestone/releases/latest/download/Bluestone-mac-x64.dmg)<br/> | [win-arm64](https://github.com/1943time/bluestone/releases/latest/download/Bluestone-win-arm64.exe)<br/> [win-x64](https://github.com/1943time/bluestone/releases/latest/download/Bluestone-win-x64.exe) |    [linux-amd64.deb](https://github.com/1943time/bluestone/releases/latest/download/Bluestone-linux-amd64.deb) \| [linux-x86_64.AppImage](https://github.com/1943time/bluestone/releases/latest/download/Bluestone-linux-x86_64.AppImage) <br/> [linux-arm64.AppImage](https://github.com/1943time/bluestone/releases/latest/download/Bluestone-linux-arm64.AppImage) \| [linux-arm64.deb](https://github.com/1943time/bluestone/releases/latest/download/Bluestone-linux-arm64.deb)    |

OR <a href="https://apps.apple.com/us/app/bluestone-markdown/id6451391474"><img src="docs/assets/mac-store.svg" style="width:120px;margin-left:10px"/><a>

> The release time of mac store will be delayed by 1-3 days

***

# Introduction
Bluestone is an WYSIWYG Markdown editor，use [GFM](https://github.github.com/gfm/) syntax，expanded [Mermaid](https://mermaid.js.org/) graphics [Katex](https://katex.org/) formula，
Supports light and dark color theme. and generate your Markdown files into online documents in the easiest and fastest way.

As a document publisher, markdown source code mode is undoubtedly efficient and free,
but as a note, it is not conducive to reading.
The table element of markdown is not conducive to writing,
and the double-column mode is not conducive to focusing,
so the Bluestone Editor was developed. It combines rich text with markdown editing habits to help you record daily,
and saves it in standard markdown format, which allows your notes to be used anywhere and backed up in any way.

![](./docs/assets/d1.png)

![](./docs/assets/syntax.gif)

## Features
- The rich text editing mode is used, while also compatible with Markdown syntax conversion and editing habits. When using the search function, Markdown symbols will not be searched.
- Automatically record and clear file history, can be viewed and rolled back at any time.
- Using [shiki](https://github.com/shikijs/shiki) as a code shader to make code highlights more fine-grained and aesthetically pleasing.
- Provides a powerful sharing program, Linux server required [doc](https://doc.bluemd.me/book/docs/service).
- Enhanced table operations, allowing for easy adjustment of the order and quantity of rows and columns in the table, and the ability to wrap within the table.
- Support the editing and display of block and inline [Katex](https://katex.org/) formulas
- Supports [mermaid](https://mermaid.js.org/) graphic syntax.
- The file path link can be automatically reconstructed, and when a file or folder is renamed or moved, the local path of the links or images that the document depends on will be automatically changed.
- Support exporting HTML and PDF.
- You can freely drag and adjust the order of document elements.
- Supports multi tab editing mode
- Support pasting HTML, plain text, and markdown code. When pasting HTML and markdown code, it can be configured to automatically download network images to the local machine and convert paths during pasting.
