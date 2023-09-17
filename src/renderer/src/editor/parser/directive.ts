// import {directiveFromMarkdown} from 'mdast-util-directive'
// import {directiveContainer} from './container/container'
// @ts-ignore
import {codes} from 'micromark-util-symbol'
export function remarkDirective() {
  // @ts-ignore
  const data = this.data()

  add('micromarkExtensions', {
    // flow: {[codes.colon]: [directiveContainer]}
  })
  // add('fromMarkdownExtensions', directiveFromMarkdown)
  // add('toMarkdownExtensions', directiveToMarkdown)
  // add('fromMarkdownExtensions', directiveFromMarkdown())
  /**
   * @param {string} field
   * @param {unknown} value
   */
  function add(field, value) {
    const list = /** @type {unknown[]} */ (
      // Other extensions
      /* c8 ignore next 2 */
      data[field] ? data[field] : (data[field] = [])
    )

    list.push(value)
  }
}
