'use client'
import {Code} from './Code'

export function CodeContainer({node, path}: {node: any, path: number[]}) {
  return (
    <>
      {node.language === 'mermaid' &&
        <div className={`mermaid-container pre`} dangerouslySetInnerHTML={{__html: node.html}}></div>
      }
      {node.language !== 'mermaid' && !node.katex && !node.render && node.html &&
        <Code node={node} path={path}/>
      }
      {node.language === 'html' && node.render &&
        <div className={'mb-3 overflow-auto'} dangerouslySetInnerHTML={{__html: node.code}}></div>
      }
      {node.katex && node.html &&
        <div className={'mb-4'} dangerouslySetInnerHTML={{__html: node.html}}></div>
      }
    </>
  )
}
