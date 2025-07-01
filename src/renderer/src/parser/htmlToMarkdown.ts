import * as gfm from 'turndown-plugin-gfm'
import turndown from 'turndown'

export const htmlToMarkdown = (html: string) => {
  const t = new turndown()
  t.use(gfm.gfm)
  t.addRule('preWithLang', {
    filter: ['pre'],
    replacement: function (content, node) {
      const classes = Array.from((node as HTMLElement).classList)
      const code = node.querySelector('code') as HTMLElement
      classes.push(...Array.from(code?.classList || []))
      const lang = classes.find((c) => c.startsWith('language-'))?.replace('language-', '') || ''
      return `\n\`\`\`${lang}\n${content}\n\`\`\`\n`
    }
  })
  t.addRule('image', {
    filter: ['img'],
    replacement: function (content, node) {
      const img = node as HTMLImageElement
      const src = img.src || img.getAttribute('src') || ''
      const alt = img.alt || img.getAttribute('alt') || ''
      const height = img.height || img.getAttribute('height') || ''
      const align = img.getAttribute('data-align') || ''
      if (height) {
        return `<img src="${src}" alt="${alt}" height="${height}" ${align ? `data-align="${align}"` : ''}/>`
      } else if (align) {
        return `<img src="${src}" alt="${alt}" ${align ? `data-align="${align}"` : ''}/>`
      } else {
        return `![${alt}](${src})`
      }
    }
  })
  return t.turndown(html).replace(/\\\[/g, '[').replace(/\\\]/g, ']')
}
