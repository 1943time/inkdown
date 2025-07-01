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
  return t.turndown(html).replace(/\\\[/g, '[').replace(/\\\]/g, ']')
}
