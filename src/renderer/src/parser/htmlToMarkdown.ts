import * as gfm from 'turndown-plugin-gfm'
import turndown from 'turndown'

export const htmlToMarkdown = (html: string) => {
  const t = new turndown()
  t.use(gfm.gfm)
  // t.addRule('preWithLang', {
  //   filter: ['pre'],
  //   replacement: function(content, node) {
  //     const lang = (node as HTMLElement).getAttribute('data-lang') || ''
  //     return `\n\`\`\`${lang}\n${content}\n\`\`\`\n`
  //   }
  // })
  return t.turndown(html)
}
