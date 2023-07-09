# 常见问题

## html渲染

青石使用纯粹的富文本编辑模式，暂时不支持直接编写渲染html 代码，可以使用代码段渲染的方式，例如：

![C1qo4ES-W-B6GO2zB8gpm](../.images/C1qo4ES-W-B6GO2zB8gpm.png)

点击眼睛icon可以让html直接渲染，结果如下：

```html render
<p style="text-align:center;color:cyan;">hello bluestone</p>
```

导出为：

```html
```html render
<p style="text-align:center;color:cyan;">hello bluestone</p>
```

## 代码段性能

青石使用了shiki 高精度着色器，而非代码编辑器来渲染代码片段。在代码数量高出高于500-1000行后，可能会有输入延迟问题，建议不要再一个代码片段中加入超过1000行代码，可以分为多个片段编写。

后续会尝试加入可选择的代码渲染方式，从着色器切换到代码编辑器。