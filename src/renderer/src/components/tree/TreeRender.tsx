import {observer} from 'mobx-react-lite'
import {treeStore} from '../../store/tree'
import {PlusCircleOutlined} from '@ant-design/icons'
import {IFileItem} from '../../index'
import {Fragment, useCallback, useEffect, useRef} from 'react'
import {action} from 'mobx'
import {MainApi} from '../../api/main'
import {Input} from 'antd'
import ArrowRight from '../../icons/ArrowRight'

const getClass = (c: IFileItem) => {
  if (c.mode) return ''
  if (treeStore.dropNode === c) return 'bg-sky-500/10'
  if (treeStore.openedNote === c) return 'dark:bg-gray-200/5 bg-gray-300/50'
  return 'dark:hover:bg-gray-400/5 hover:bg-gray-400/10'
}

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

const Item = observer((
  {item, level, onSave}: {
    item: IFileItem,
    level: number
    onSave: (item: IFileItem) => void
  }
) => {
  useEffect(() => {
    if (item.mode === 'create' || item.mode === 'edit') {
      try {
        const input = document.querySelector(`[data-eid="${item.id}"] input`) as HTMLInputElement
        if (input) input.select()
      } catch (e) {}
    }
  }, [item.mode])
  return (
    <Fragment key={item.id}>
      <div
        data-eid={item.id}
        style={{
          paddingLeft: level * 15,
        }}
        className={`rounded ${getClass(item)}`}
      >
        <div
          className={`${treeStore.openedNote === item ? 'dark:text-zinc-100 text-zinc-700' : 'dark:text-zinc-100/80 dark:hover:text-zinc-100/90 text-zinc-600 hover:text-zinc-700'}
              flex items-center text-sm space-x-1 cursor-default select-none h-7 px-2 mb-0.5
              `}
          draggable={!item.mode}
          onDragOver={e => {
            if (item.folder && !item.mode && treeStore.dragNode) {
              e.preventDefault()
              treeStore.setState({dropNode: item})
            }
          }}
          onDrop={e => {
            treeStore.moveNode(item)
          }}
          onDragEnd={e => {
            treeStore.setState({dragNode: null, dropNode: null})
          }}
          onDragStart={e => {
            treeStore.setState({dragNode: item})
            if (!item.folder) {
              e.dataTransfer.setData('text/html', '<span></span>')
            }
          }}
          onContextMenu={(e) => {
            e.stopPropagation()
            if (!item.mode) {
              treeStore.setState({ctxNode: item})
              MainApi.openTreeContextMenu({
                type: item.folder ? 'folder' : 'file',
                filePath: item.filePath
              })
            }
          }}
          onClick={action((e) => {
            if (!item.folder) {
              if (e.metaKey || e.ctrlKey) {
                treeStore.appendTab(item)
              } else {
                treeStore.openNote(item)
              }
            } else {
              item.expand = !item.expand
            }
          })}
        >
          {!!item.mode ?
            <Input
              size={'small'}
              autoFocus={true}
              value={item.editName}
              onClick={e => e.stopPropagation()}
              onChange={action(e => item.editName = e.target.value)}
              onBlur={() => onSave(item)}
              onKeyDown={e => {
                e.stopPropagation()
                if (e.key === 'Enter') onSave(item)
              }}
              placeholder={`${item.folder ? 'enter a folder name' : 'enter a doc name'}`}
            /> :
            <>
              {item.folder &&
                <ArrowRight className={`w-[11px] h-[11px] dark:text-gray-500 text-gray-400 duration-200 ${item.folder && item.expand ? 'rotate-90' : ''}`}/>
              }
              <span style={{paddingLeft: item.folder ? 0 : 4}} className={'truncate w-[100%_-_10px]'}>
                    {item.filename}
                  </span>
              {!item.folder && !['md', 'markdown'].includes(item.ext!) &&
                <sup className={'text-sky-500 ml-0.5 text-[80%]'}>{item.ext}</sup>
              }
            </>
          }
        </div>
      </div>
      {item.folder && !!item.children?.length && item.expand &&
        <RenderItem items={item.children} level={level + 1}/>
      }
    </Fragment>
  )
})

const RenderItem = observer(({items, level}: {items: IFileItem[], level: number}) => {
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
        <Item
          key={c.id}
          item={c}
          level={level}
          onSave={saveNote}
        />
      )}
    </>
  )
})
