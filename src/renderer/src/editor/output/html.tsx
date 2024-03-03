import {renderToString} from 'react-dom/server'
import {ipcRenderer} from 'electron'
import {join, parse} from 'path'
import {IFileItem} from '../../index'
import {MainApi, saveDialog} from '../../api/main'
import {transformSchema} from './html/transform'
import {Doc} from './html/dom/Doc'
import {HtmlContext} from './html/dom/Context'
import {configStore} from '../../store/config'

const icon = 'data:image/png;base64,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'
const getAssets = async () => {
  const env = await ipcRenderer.invoke('get-env') as {webPath: string}
  const fs = window.api.fs
  const files = await fs.readdir(env.webPath)
  const scriptPath = files.find(f => f.endsWith('.js'))
  const cssPath = files.find(f => f === 'style.css')
  const katexPath = files.find(f => f === 'katex.min.css')
  return {
    script: await fs.readFile(join(env.webPath, scriptPath!), {encoding:'utf-8'}),
    katexCss: await fs.readFile(join(env.webPath, katexPath!), {encoding:'utf-8'}),
    css: await fs.readFile(join(env.webPath, cssPath!), {encoding:'utf-8'})
  }
}
const exportToHtmlString = async (node: IFileItem, web = false) => {
  const tree = node.schema || []
  const title = parse(node.filePath).name
  const {script, css} = await getAssets()
  const schema = await transformSchema(tree, node.filePath)
  const content = renderToString(
    <HtmlContext.Provider value={{
      codeTabSize: configStore.config.codeTabSize,
      book: false,
      showCodeLineNum: configStore.config.codeLineNumber
    }}>
      <Doc schema={schema} title={title}/>
    </HtmlContext.Provider>
  )
  return `<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <link rel="icon" href="${web ? '/lib/favicon.png' : icon}">
  <title>${title}</title>
  ${web ? '<link href="/lib/style.css" crossorigin="" rel="stylesheet"/>' : `<style>${css}</style>`}
  ${web ? '<script src="/lib/script.js"></script>' : ''}
</head>
<body>
<div id="root">${content}</div>
${web ? '' : `<script>${script}</script>`}
</body>
</html>
  `
}
export const exportHtml = async (node: IFileItem, web = false) => {
  const html = await exportToHtmlString(node, web)
  const save = await saveDialog({
    filters: [{name: 'html', extensions: ['html']}]
  })
  if (save.filePath) {
    await window.api.fs.writeFile(save.filePath, html, {encoding: 'utf-8'})
    MainApi.openInFolder(save.filePath)
  }
}
