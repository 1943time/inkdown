import {useContext, useEffect, useMemo, useState} from 'react'
import {HtmlContext} from './Context'
// import {useSetState} from 'react-use'
// import {Ctx} from '@/utils'

export function Leading(props: {
  schema: any[]
}) {
  const ctx = useContext(HtmlContext)
  const heads = useMemo(() => {
    return props.schema.filter(n => n.level > 1 && n.level < 5 && n.type === 'head').map(h => {
      return {id: h.id, title: h.title, level: h.level}
    })
  }, [])
  return (
    <div
      data-book={ctx.book ? 'true' : undefined}
      id={'outline'}
      className={`leading-container ${ctx.book ? 'xl:block' : 'lg:block'}`}
    >
      <div className={`leading`}>
        {(!!heads.length || !ctx.book) &&
          <div className="leading-title">{ctx.book ? 'On this page' : 'Table of Contents'}</div>
        }
        <div className="leading-list">
          {heads.map((h, i) =>
            <a
              className={`leading-item block`}
              data-id={h.id}
              style={{paddingLeft: (h.level - 2) * 16}}
              key={i}
              href={`#${h.id}`}
            >
              {h.title}
            </a>
          )}
        </div>
      </div>
    </div>
  )
}
