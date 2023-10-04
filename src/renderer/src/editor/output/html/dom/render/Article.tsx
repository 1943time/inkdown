import {Fragment, createElement, useCallback, CSSProperties} from 'react'
import {Media} from './Media'
import {CodeContainer} from './CodeContainer'
const getText = (node: any, prePath?: string) => {
  let text = node.text
  if (!text) return ''
  if (node.html) return <span dangerouslySetInnerHTML={{__html: text}}></span>
  if (node.inlineMath) return <span className={'inline-math'} data-math={node.text}></span>
  if (!node.bold && !node.code && !node.italic && !node.strikethrough && !node.url) {
    text = text.replace(/\[\^(.+?)]:?/g, (all: string, $1: string) => {
      return `
        <span
          data-fnc="${all.endsWith(':') ? '' : 'fnc'}"
          data-fnd="${all.endsWith(':') ? 'fnd' : ''}"
          data-fnc-name="${all.endsWith(':') ? '' : $1}"
          data-fnd-name="${all.endsWith(':') ? $1 : ''}"
        >
          ${all}
        </span>
      `
    })
    text = <span dangerouslySetInnerHTML={{__html: text}}></span>
  }
  text = <span style={{color: node.highColor}}>{text}</span>
  if (node.strikethrough) text = <del>{text}</del>
  if (node.bold) text = <strong>{text}</strong>
  if (node.code) text = <code className="inline-code">{text}</code>
  if (node.italic) text = <i>{text}</i>
  if (node.url) text = <a
    href={/^[a-zA-Z]:\/\//.test(node.url) ? node.url : `${node.url}`} target={node.url.startsWith('http') ? '_blank' : ''}
    rel={'noreferrer'}
    className={'text-sky-500 dark:hover:text-sky-600 duration-200 hover:text-sky-400'}>{text}</a>
  return text
}

function Render(props: {
  schema: any[]
  prePath?: string
  path: number[]
} = {schema: [], path: []}) {
  return (
    <>
      {props.schema.map((s, i) => {
        const path = [...props.path, i]
        return (
          <Fragment key={i}>
            {s.type === 'paragraph' &&
              <p data-index={path.join('-')}><Render schema={s.children} path={path}/></p>
            }
            {s.type === 'head' &&
              createElement(`h${s.level}`, {
                className: 'heading',
                ['data-index']: path.join('-'),
              }, (
                <>
                  <span className="anchor" id={s.id}></span>
                  <a href={`#${s.id}`} className={'inline-block'}>
                    <Render schema={s.children} path={path}/>
                  </a>
                </>
              ))
            }
            {s.type === 'blockquote' &&
              <blockquote><Render schema={s.children} path={path}/></blockquote>
            }
            {s.type === 'hr' &&
              <hr className={'m-hr'}/>
            }
            {s.type === 'list' &&
              createElement(s.order ? 'ol' : 'ul', {
                className: 'm-list'
              }, <Render schema={s.children} path={path}/>)
            }
            {s.type === 'list-item' &&
              <li className={`m-list-item ${typeof s.checked === 'boolean' ? 'task' : ''}`}>
                {typeof s.checked === 'boolean' &&
                  <span className={'task-check'}>
                  <input
                    type={'checkbox'}
                    defaultChecked={s.checked}
                    className={'w-[14px] h-[14px] align-baseline'}
                  />
                  </span>
                }
                <Render schema={s.children} path={path}/>
              </li>
            }
            {s.type === 'table' &&
              <table>
                <thead>
                <tr>
                  {(s.children[0]?.children || []).map((h: any, i: number) =>
                    <th key={i} data-index={[...path, 0, i].join('-')} style={{textAlign: h.align}}><Render schema={h.children} path={path}/></th>
                  )}
                </tr>
                </thead>
                <tbody>
                  <Render schema={s.children?.slice(1)} path={path}/>
                </tbody>
              </table>
            }
            {s.type === 'table-row' &&
              <tr><Render schema={s.children} path={[...path.slice(0, -1), path[path.length -1] + 1]}/></tr>
            }
            {s.type === 'table-cell' &&
              <td data-index={path.join('-')} style={{textAlign: s.align}}><Render schema={s.children} path={path}/></td>
            }
            {s.type === 'media' &&
              <Media node={s}/>
            }
            {s.type === 'code' &&
              <CodeContainer node={s} path={path}/>
            }
            {s.type === 'footnoteReference' &&
              <span
                data-fnc="fnc"
                data-fnc-name={s.identifier}
              >
                [^{s.identifier}]
              </span>
            }
            {s.type === 'inline-katex' &&
              <span dangerouslySetInnerHTML={{__html: s.html}} className={'inline-block'}></span>
            }
            {s.type === 'footnoteDefinition' &&
              <span
                data-fnd="fnd"
                data-fnd-name={s.identifier}
              >[^{s.identifier}]:</span>
            }
            {!!s.text && getText(s, props.prePath)}
          </Fragment>
        )
      })}
    </>
  )
}

export function Article(props: {
  schema: any[]
  prePath?: string,
} = {schema: []}) {
  return (
    <div>
      <Render schema={props.schema} prePath={props.prePath} path={[]}/>
    </div>
  )
}
