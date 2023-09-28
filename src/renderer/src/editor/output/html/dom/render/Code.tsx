import {useContext, useMemo} from 'react'
import {CheckOutlined} from '@ant-design/icons'
import Copy from '../icons/Copy'
import {HtmlContext} from '../Context'

export function Code({node, path}: {
  node: any
  path: number[]
}) {
  const ctx = useContext(HtmlContext)
  const lines = useMemo(() => {
    return node.code.split('\n') as string[]
  }, [])
  return (
    <div
      className={`group tab-${ctx.codeTabSize} code-highlight`}>
      <div
        className={`absolute z-10 right-2 top-1 flex items-center select-none group-hover:hidden`}>
        <div
          className={'duration-200 hover:text-sky-500 cursor-pointer text-gray-400 text-xs'}
        >
          {node.language ?
            <span>{node.katex ? 'formula' : node.language}</span> :
            <span>{''}</span>
          }
        </div>
      </div>
      <div className={'absolute right-2 top-2 z-10 opacity-0 group-hover:opacity-100 duration-200'}>
        <div
          data-event={'copy'}
          className={`duration-200 hover:border-gray-200/50 border-gray-200/30 text-gray-400
        flex items-center justify-center w-7 h-7 border rounded cursor-pointer`}>
          <div
            className={`duration-200 absolute -translate-x-full top-1/2 -translate-y-1/2 text-sm text-gray-400 pointer-events-none opacity-0`}
            data-copied-text={true}>Copied</div>
            <CheckOutlined data-copied={true} className={'hidden'}/>
            <Copy className={'w-4 h-4'} data-copy={true}/>
        </div>
      </div>
      {ctx.showCodeLineNum &&
        <div className={'code-line-list'}>
          {lines.map((c, i) =>
            <div key={i}/>
          )}
        </div>
      }
      {node.html ?
        <pre
          className={'text-gray-200'}
          style={{
            paddingLeft: ctx.showCodeLineNum ? 24 : 0,
          }}
          dangerouslySetInnerHTML={{__html: node.html}}
        /> :
        <pre
          className={'text-gray-200'}
        >
          <code>{node.code}</code>
        </pre>
      }
      <div className={'absolute top-3 w-full left-0 pointer-events-none'}>
        {lines.map((l, i) =>
          <figure key={i} className={'h-[22px]'} data-index={[...path, i].join('-')} data-text={l}></figure>
        )}
      </div>
    </div>
  )
}
