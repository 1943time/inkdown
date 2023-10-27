import {unified} from 'unified'
import remarkParse from 'remark-parse'
import remarkGfm from 'remark-gfm'
import remarkMath from 'remark-math'
import remarkFrontmatter from 'remark-frontmatter'


const parser = unified()
  .use(remarkParse)
  .use(remarkGfm)
  .use(remarkMath, {singleDollarTextMath: true})
  .use(remarkFrontmatter, ['yaml'])

export default parser
