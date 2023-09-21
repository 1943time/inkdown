import {observer} from 'mobx-react-lite'
import {treeStore} from '../../store/tree'
import {PlusCircleOutlined} from '@ant-design/icons'
import {IFileItem} from '../../index'
import {Fragment, useCallback, useRef} from 'react'
import {action} from 'mobx'
import {MainApi} from '../../api/main'
import {Input} from 'antd'
import {configStore} from '../../store/config'
import ArrowRight from '../../icons/ArrowRight'

export const TreeRender = observer(() => {
  const context = useCallback(() => {
    treeStore.setState({ctxNode: null})
    MainApi.openTreeContextMenu({type: 'rootFolder'})
  }, [])
  return (
    <div
      className={'pt-5'}
      onDrop={e => e.stopPropagation()}
      onDragOver={e => {
        e.stopPropagation()
        if (treeStore.dropNode === treeStore.root) {
          treeStore.setState({dropNode: null})
        }
      }}
    >
      <div
        className={`py-1 mb-1 flex justify-between items-center px-5 dark:text-gray-400 text-gray-500 duration-200 dark:hover:text-gray-300 hover:text-gray-600`}
      >
        <span className={'font-bold text-[15px]'}>{treeStore.root.filename}</span>
        <div
          onClick={context}
        >
          <PlusCircleOutlined className={'cursor-pointer'}/>
        </div>
      </div>
      <div
        className={'px-3'}
        onContextMenu={e => e.stopPropagation()}
      >
        <RenderItem items={treeStore.root.children!} level={0}/>
      </div>
    </div>
  )
})

const RenderItem = observer(({items, level}: {items: IFileItem[], level: number}) => {
  const getClass = useCallback((c: IFileItem) => {
    if (c.mode) return ''
    if (treeStore.dropNode === c) return 'bg-sky-500/10'
    if (treeStore.openNote === c) return 'dark:bg-gray-200/5 bg-gray-300/50'
    return 'dark:hover:bg-gray-400/5 hover:bg-gray-400/10'
  }, [])
  const timer = useRef(0)
  const saveNote = useCallback((item: IFileItem) => {
    clearTimeout(timer.current)
    timer.current = window.setTimeout(() => {
      treeStore.saveNote(item)
    }, 30)
  }, [])
  return (
    <>
      {items.map(c =>
        <Fragment key={c.id}>
          <div
            style={{
              paddingLeft: level * 15,
            }}
            className={`rounded ${getClass(c)}`}
          >
            <div
              className={`${treeStore.openNote === c ? 'dark:text-zinc-100 text-zinc-700' : 'dark:text-zinc-100/80 dark:hover:text-zinc-100/90 text-zinc-600 hover:text-zinc-700'}
              flex items-center text-sm space-x-1 cursor-default select-none h-7 px-2 mb-0.5
              `}
              draggable={!c.mode}
              onDragOver={e => {
                if (c.folder && !c.mode && treeStore.dragNode) {
                  e.preventDefault()
                  treeStore.setState({dropNode: c})
                }
              }}
              onDrop={e => {
                treeStore.moveNode(c)
              }}
              onDragEnd={e => {
                treeStore.setState({dragNode: null, dropNode: null})
              }}
              onDragStart={e => {
                treeStore.setState({dragNode: c})
                if (!c.folder) {
                  e.dataTransfer.setData('text/html', '<span></span>')
                }
              }}
              onContextMenu={(e) => {
                e.stopPropagation()
                if (!c.mode) {
                  treeStore.setState({ctxNode: c})
                  MainApi.openTreeContextMenu({
                    type: c.folder ? 'folder' : 'file',
                    filePath: c.filePath
                  })
                }
              }}
              onClick={action(() => {
                if (!c.folder) treeStore.selectNote(c)
                else c.expand = !c.expand
              })}
            >
              {!!c.mode ?
                <Input
                  size={'small'}
                  autoFocus={true}
                  value={c.editName}
                  onChange={action(e => c.editName = e.target.value)}
                  onBlur={() => saveNote(c)}
                  onKeyDown={e => {
                    e.stopPropagation()
                    if (e.key === 'Enter') saveNote(c)
                  }}
                  placeholder={`${c.folder ? 'enter a folder name' : 'enter a doc name'}`}
                /> :
                <>
                  {c.folder &&
                    <ArrowRight className={`w-[11px] h-[11px] dark:text-gray-500 text-gray-400 duration-200 ${c.folder && c.expand ? 'rotate-90' : ''}`}/>
                  }
                  <span style={{paddingLeft: c.folder ? 0 : 4}} className={'truncate w-[100%_-_10px]'}>
                    {c.filename}
                  </span>
                  {!c.folder && !['md', 'markdown'].includes(c.ext!) &&
                    <sup className={'text-sky-500 ml-0.5 text-[80%]'}>{c.ext}</sup>
                  }
                </>
              }
            </div>
          </div>
          {c.folder && !!c.children?.length && c.expand &&
            <RenderItem items={c.children} level={level + 1}/>
          }
        </Fragment>
      )}
    </>
  )
})
