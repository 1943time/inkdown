import {observer} from 'mobx-react-lite'
import React, {useCallback, useEffect, useRef} from 'react'
import {useLocalState} from '../hooks/useLocalState'
import {db, IQuickOpen} from '../store/db'
import {treeStore} from '../store/tree'
import {existsSync} from 'fs'
import {configStore} from '../store/config'
import {sep} from 'path'
import {runInAction} from 'mobx'

export const QuickOpen = observer(() => {
  const [state, setState] = useLocalState({
    records: [] as {id: string, filePath: string, name: string}[],
    filterRecords: [] as {id: string, filePath: string, name: string}[],
    activeIndex: 0,
    open: false,
    query: ''
  })
  const scrollRef = useRef<HTMLDivElement>(null)
  const keydown = useCallback((e: KeyboardEvent | React.KeyboardEvent) => {
    e.stopPropagation()
    const scroll = state.filterRecords.length > 1
    if (['ArrowDown', 'ArrowUp'].includes(e.key) && scroll) {
      if (e.key === 'ArrowDown') {
        const index = state.activeIndex === state.filterRecords.length - 1 ? 0 : state.activeIndex + 1
        setState({activeIndex: index})
      }
      if (e.key === 'ArrowUp') {
        const index = state.activeIndex === 0 ? state.filterRecords.length - 1 : state.activeIndex - 1
        setState({activeIndex: index})
      }
      const target = scrollRef.current!.children[state.activeIndex] as HTMLDivElement
      const {scrollTop, clientHeight} = scrollRef.current!
      if (target.offsetTop > scrollTop + clientHeight - 36) {
        scrollRef.current!.scroll({
          top: target.offsetTop
        })
      }
      if (target.offsetTop < scrollTop) {
        scrollRef.current!.scroll({
          top: target.offsetTop - 30
        })
      }
    }
    if (e.key === 'Enter' && state.filterRecords.length) {
      close()
      treeStore.openNote(state.filterRecords[state.activeIndex].filePath)
    }
    if (e.key === 'Escape') {
      close()
    }
  }, [])

  const initial = useCallback(async () => {
    if (!treeStore.root) return
    const res = await db.quickOpen.where('dirPath').equals(treeStore.root.filePath).toArray()
    const data = res.filter(r => {
      try {
        return existsSync(r.filePath)
      } catch (e) {
        db.quickOpen.where('id').equals(r.id!).delete()
        return false
      }
    })
      .sort((a, b) => a.time > b.time ? -1 : 1)
      .map(d => {
        return {id: d.id!, filePath: d.filePath, name: d.filePath.replace(d.dirPath + sep, '').replace(/\.\w+$/, '')}
      })
    setState({
      records: data,
      filterRecords: data.filter(q => !state.query || q.name.includes(state.query)),
      open: true,
      activeIndex: 0
    })
    runInAction(() => treeStore.openQuickly = true)
    window.addEventListener('keydown', keydown)
  }, [])

  const close = useCallback(() => {
    window.removeEventListener('keydown', keydown)
    setState({open: false})
    runInAction(() => treeStore.openQuickly = false)
  }, [])

  useEffect(() => {
    window.electron.ipcRenderer.on('open-quickly', initial)
    return () => {
      window.electron.ipcRenderer.removeListener('open-quickly', initial)
    }
  }, [])
  if (!state.open) return null
  return (
    <div className={'z-[1000] fixed inset-0 dark:bg-black/30 bg-black/10'} onClick={close}>
      <div
        className={'mt-20 w-[600px] modal-panel rounded-lg mx-auto'}
        onClick={e => e.stopPropagation()}
      >
        <input
          className={'bg-transparent outline-none h-10 w-full px-4 dark:text-gray-200 text-gray-600 dark:placeholder-gray-200/30 placeholder-gray-300'}
          placeholder={'Find recent open note'}
          autoFocus={true}
          value={state.query}
          onKeyDown={keydown}
          onChange={e => {
            const query = e.target.value
            setState({query, filterRecords: state.records.filter(q => q.name.includes(query)), activeIndex: 0})
          }}
        />
        <div className={'h-[1px] bg-gray-200 dark:bg-gray-200/20'}/>
        <div
          className={`p-2 relative overflow-y-auto max-h-[300px] ${!!state.filterRecords.length ? '' : 'hidden'}`}
          ref={scrollRef}>
          {state.filterRecords.map((r, i) =>
            <div
              onMouseEnter={() => {
                setState({activeIndex: i})
              }}
              onClick={() => {
                close()
                treeStore.openNote(r.filePath)
              }}
              className={`cursor-default px-3 py-1 rounded dark:text-gray-300 text-gray-600 text-sm ${state.activeIndex === i ? 'dark:bg-gray-200/10 bg-gray-200/60' : ''}`}
              key={r.id}>
              {r.name}
            </div>
          )}
        </div>
        <div className={`px-4 py-2 ${!state.filterRecords.length ? '' : 'hidden'}`}>
          <div className={'text-gray-500 text-center text-sm'}>{configStore.zh ? '没有最近打开的记录' : 'No recently opened history'}</div>
        </div>
      </div>
    </div>
  )
})
