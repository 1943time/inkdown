# Common problem

## html rendering

Qingshi uses a pure rich text editing mode, and does not support directly writing and rendering html code for the time being, and will add code snippets to render html in the future



## code snippet performance

Bluestone uses the shiki high precision shader instead of the code editor to render code fragments. After the number of codes is higher than 500-1000 lines, there may be an input delay problem. It is recommended not to add more than 1000 lines of code to a code segment, which can be divided into multiple segments.

In the future, we will try to add an optional code rendering method, switching from the shader to the code editor.