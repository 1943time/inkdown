import {renderToString} from 'react-dom/server'
import { Node } from 'slate'
import { Core } from '../store/core'
import { IFileItem } from '../types'
import { CustomLeaf, Elements } from '../types/el'
import { createElement, Fragment, ReactNode } from 'react'
import { mediaType } from '../editor/utils/dom'

const render = (schema: any[]) => {
  if (!schema?.length) {
    return <></>
  }
  const els:any[] = []
  for (const item of schema) {
    if (!item.type && item.text) {
      const leaf = item as CustomLeaf
      let text: ReactNode = leaf.text
      if (leaf.url) {
        text = <a href={leaf.url}>{text}</a>
      }
      if (leaf.bold) text = <strong>{text}</strong>
      if (leaf.italic) text = <i>{text}</i>
      if (leaf.strikethrough) text = <s>{text}</s>
      if (leaf.code) text = <code>{text}</code>
      els.push(text)
    }
    switch (item.type) {
      case 'paragraph':
        els.push(<p>{render(item.children)}</p>)
        break
      case 'attach':
        <a href={item.url}>{item.name}</a>
        break
      case 'blockquote':
        els.push(<blockquote>{render(item.children)}</blockquote>)
        break
      case 'code':
        els.push((
          <pre>
            <code>{item.children?.map((c) => Node.string(c)).join('\n')}</code>
          </pre>
        ))
        break
      case 'break':
        els.push(<hr />)
        break
      case 'head':
        els.push(createElement(`h${item.level}`, {}, render(item.children)))
        break
      case 'media':
        const type = mediaType(item.url)
        switch (type) {
          case 'audio':
            els.push(<audio src={item.url} />)
            break
          case 'image':
            els.push(<img src={item.url} />)
            break
          case 'video':
            els.push(<video src={item.url}></video>)
            break
          default:
            els.push(<iframe src={item.url} />)
            break
        }
        break
      case 'inline-katex':
        els.push(`$${item.children?.[0].text}$`)
        break
      case 'table':
        const top = item.children[0]
        const body = item.children.slice(1)
        els.push((
          <table>
            <thead>
              <tr>
                {top.children.map((c: any, i: number) => <th key={i}>{render(c.children)}</th>)}
              </tr>
            </thead>
            <tbody>
              {body.map(t => {
                return (
                  <tr>
                    {t.children.map((c: any, i: number) => <td key={i}>{render(c.children)}</td>)}
                  </tr>
                )
              })}
            </tbody>
          </table>
        ))
        break
      case 'list':
        els.push(createElement(`${item.order ? 'o' : 'u'}l`, {start: item.order ? item.start || 1 : undefined}, render(item.children)))
        break
      case 'list-item':
        els.push(<li>{render(item.children)}</li>)
        break
    }
  }
  return (<>
    {els.map((e, i) => <Fragment key={i}>{e}</Fragment>)}
  </>)
}
export const toHtml = (node: IFileItem) => {
  if (node.schema) {
    const elements = render(node.schema)
    return renderToString(elements)
  }
  return ''
}
