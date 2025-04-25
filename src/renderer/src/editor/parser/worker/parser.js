import { unified } from 'unified'
import remarkParse from 'remark-parse'
import remarkGfm from 'remark-gfm'
import remarkMath from 'remark-math'
import remarkFrontmatter from 'remark-frontmatter'
import remarkWikiLink from 'remark-wiki-link'

const parser = unified()
  .use(remarkParse)
  .use(remarkGfm)
  .use(remarkMath, { singleDollarTextMath: true })
  .use(remarkFrontmatter, ['yaml'])
  .use(remarkWikiLink)

export default parser
