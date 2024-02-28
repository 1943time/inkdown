import {observer} from 'mobx-react-lite'
import React, {Fragment, MutableRefObject, ReactNode, useLayoutEffect, useRef, useState} from 'react'
import {createRoot} from 'react-dom/client'
import Command from '../icons/keyboard/Command'
import Option from '../icons/keyboard/Option'
import Shift from '../icons/keyboard/Shift'
import Backspace from '../icons/keyboard/Backspace'
import Enter from '../icons/keyboard/Enter'
import Click from '../icons/keyboard/Click'
import ArrowRight from '../icons/ArrowRight'
import {useLocalState} from '../hooks/useLocalState'
import {getOffsetLeft, getOffsetTop} from '../editor/utils/dom'

export type IMenu = {
  text?: string | ReactNode
  type?: string
  hr?: boolean
  click?: Function
  key?: string
  disabled?: boolean
  children?: IMenu[]
  role?: string[]
}
const keyIconClass = 'w-[13px] h-[13px]'
const isMac = /macintosh|mac os x/i.test(navigator.userAgent)
const transformKey = (key: string) => {
  if (key === 'cmd') return !isMac ? 'Ctrl' : <Command className={keyIconClass}/>
  if (key === 'option') return <Option className={keyIconClass}/>
  if (key === 'shift') return <Shift className={keyIconClass}/>
  if (key === 'backspace') return <Backspace className={keyIconClass}/>
  if (key === 'enter') return <Enter className={keyIconClass}/>
  if (key === 'click') return <Click className={keyIconClass}/>
  if (key.length > 1) {
    return key[0].toUpperCase() + key.slice(1)
  }
  return key.toUpperCase()
}
const MenuRender = observer((props: {
  top?: boolean
  menus: IMenu[]
  root: HTMLDivElement
  boxRef: MutableRefObject<HTMLDivElement | null>
}) => {
  const currentDom = useRef<HTMLDivElement>()
  const [state, setState] = useLocalState({
    subMenuVisible: false,
    subMenus: [] as IMenu[],
    visibleIndex: -1
  })
  return (
    <div
      className={'context'}
    >
      <div>
        {props.menus.map((m, i) =>
          <Fragment key={i}>
            {m.hr ? (
              <div className={'w-[calc(100%_-_12px)] mx-auto h-[1px] dark:bg-gray-200/10 bg-gray-300/80 my-1'}></div>
            ) : (
              <div
                onMouseEnter={e => {
                  if (m.disabled) return
                  if (!m.children && state.subMenuVisible) {
                    setState({visibleIndex: -1})
                  }
                  if (m.children?.length) {
                    currentDom.current = e.target as HTMLDivElement
                    setState({
                      visibleIndex: i,
                      subMenus: m.children
                    })
                  }
                }}
                onMouseLeave={e => {
                  setState({visibleIndex:  - 1})
                }}
                className={`whitespace-nowrap relative group py-0.5 px-2 cursor-pointer
                ${m.disabled ? 'cursor-not-allowed dark:cursor-not-allowed text-gray-300 dark:text-gray-500' : 'dark:hover:bg-blue-600 hover:bg-blue-500 hover:text-gray-100 dark:hover:text-gray-100 text-gray-700 dark:text-gray-300'}
                rounded flex items-center justify-between select-none`}
                onClick={(e) => {
                  if (m.disabled) {
                    e.stopPropagation()
                  } else {
                    m.click?.(e)
                  }
                }}
              >
                <span>
                  {m.text}
                </span>
                <span className={'flex items-center space-x-0.5 ml-4'}>
                  {!!m.key && m.key.split('+').map((k, i) =>
                    <span key={i} className={'text-center'}>{transformKey(k)}</span>
                  )
                  }
                  {m.children?.length &&
                    <ArrowRight className={'text-gray-400 text-xs group-hover:text-white'}/>
                  }
                  {state.visibleIndex === i &&
                    <Menu menus={state.subMenus} root={props.root} parent={currentDom.current}/>
                  }
                </span>
              </div>
            )}
          </Fragment>
        )}
      </div>
    </div>
  )
})

const Menu = observer((props: {
  e?: MouseEvent | React.MouseEvent,
  parent?: HTMLDivElement
  menus: IMenu[]
  root: HTMLDivElement
  onClose?: (e: React.MouseEvent) => void
}) => {
  const ref = useRef<HTMLDivElement>(null)
  const [state, setState] = useLocalState({
    x: 0, y: 0
  })
  useLayoutEffect(() => {
    const dom = ref.current!
    if (props.e) {
      let x = props.e.pageX, y = props.e.pageY
      if (x + dom.clientWidth > window.innerWidth && x - dom.clientWidth > 0) x -= dom.clientWidth
      if (y + dom.clientHeight > window.innerHeight && y - dom.clientHeight > 0) y -= dom.clientHeight
      setState({x, y})
    }
    if (props.parent) {
      let left = props.parent.clientWidth - 2
      let top = -5
      const offsetLeft = getOffsetLeft(props.parent, props.root)
      const offsetTop = getOffsetTop(props.parent, props.root)
      if (offsetLeft + dom.clientWidth + props.parent.clientWidth > window.innerWidth && offsetLeft - dom.clientWidth > 0) {
        left = -dom.clientWidth - 2
      }
      if (offsetTop + dom.clientHeight - 5 > window.innerHeight && offsetTop - dom.clientHeight + props.parent.clientHeight > 0) {
        top = -dom.clientHeight + props.parent.clientHeight + 5
      }
      setState({x: left, y: top})
    }
  }, [props.parent])
  return (
    <div
      ref={ref}
      style={{left: state.x, top: state.y, zIndex: 10}}
      className={`context-menu`}
    >
      <MenuRender menus={props.menus} root={props.root} boxRef={ref}/>
    </div>
  )
})

const Entry = observer((props: {
  onClose: () => void
  e: MouseEvent | React.MouseEvent,
  menus: IMenu[]
  root: HTMLDivElement
  onCallback?: () => void
}) => {
  const [show, setShow] = useState(true)
  return (
    <div
      className={`inset-0 drag-none z-[2000] fixed ${show ? '' : 'animate-hide'}`}
      onClick={(e) => {
        e.stopPropagation()
        setShow(false)
        props.onCallback?.()
        setTimeout(() => {
          props.onClose()
        }, 200)
      }}
    >
      <Menu
        e={props.e}
        root={props.root}
        menus={props.menus}
      />
    </div>
  )
})
export const openMenus = (e: MouseEvent | React.MouseEvent, menus: IMenu[], cb?: () => void) => {
  const div = window.document.createElement('div')
  const root = createRoot(div)
  window.document.body.append(div)
  div.onmousedown = e => e.preventDefault()
  root.render((
    <Entry
      e={e}
      menus={menus}
      root={div}
      onCallback={cb}
      onClose={() => {
        root.unmount()
        window.document.body.removeChild(div)
      }}
    />
  ))
}
