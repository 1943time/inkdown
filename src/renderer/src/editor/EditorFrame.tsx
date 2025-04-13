import { MEditor } from './Editor'
import { Heading } from './tools/Leading'
// import { Empty } from '../components/Empty'
import React, { useCallback, useEffect, useMemo, useRef } from 'react'
import { FloatBar } from './tools/FloatBar'
import { Search } from './tools/Search'
import { LangAutocomplete } from './tools/LangAutocomplete'
import { InsertAutocomplete } from './tools/InsertAutocomplete'
// import { InsertLink } from './tools/InsertLink'
import { PhotoSlider } from 'react-photo-view'
import { useStore } from '@/store/store'
import { isMod } from '@/utils/common'
import { TabContext } from '@/store/note/TabCtx'
import { useShallow } from 'zustand/react/shallow'
export function EditorFrame({ id }: { id: string }) {
  const timer = useRef(0)
  const store = useStore()
  const tab = useMemo(() => store.note.tabStoreMap.get(id)!, [id])
  const startDragging = tab.useStatus((state) => state.startDragging)
  const doc = tab.useDoc()
  const [editorWidth] = store.settings.useState(useShallow((state) => [state.editorWidth]))
  const click = useCallback((e: React.MouseEvent) => {
    if (isMod(e) && e.target) {
      const el = (e.target as HTMLDivElement).parentElement
      if (!el) return
      if (el.dataset.fnc) {
        const target = document.querySelector(`[data-fnd-name="${el.dataset.fncName}"]`)
        target?.scrollIntoView({ behavior: 'smooth' })
      }
      if (el.dataset.fnd) {
        const target = document.querySelector(`[data-fnc-name="${el.dataset.fndName}"]`)
        target?.scrollIntoView({ behavior: 'smooth' })
      }
    }
  }, [])

  return (
    <TabContext value={tab}>
      <div
        className={`flex-1 h-full overflow-y-auto items-start relative ${startDragging ? 'dragging' : ''}`}
        onScroll={(e) => {
          clearTimeout(timer.current)
        }}
        ref={(dom) => {
          tab.container = dom as HTMLDivElement
        }}
      >
        <Search tab={tab} />
        {!!doc && (
          <>
            <div className={`items-start min-h-[calc(100vh_-_40px)] relative`} onClick={click}>
              <div
                style={{ transitionProperty: 'padding' }}
                className={`flex-1 duration-200 flex justify-center items-start h-full`}
              >
                <div
                  style={{ maxWidth: editorWidth + 96 || 816 }}
                  className={`flex-1 content px-12`}
                >
                  <MEditor tab={tab} doc={doc} />
                </div>
              </div>
            </div>
          </>
        )}
        {/* {!tab.docIds[tab.index] && <Empty />} */}
        <FloatBar />
        {/* <InsertLink /> */}
        <LangAutocomplete tab={tab} />
        <InsertAutocomplete />
      </div>
      {/* <PhotoSlider
        maskOpacity={0.5}
        className={core.desktop ? 'desktop-img-view' : ''}
        images={tab.store.viewImages.map((src) => ({ src, key: src }))}
        visible={tab.store.openViewImage}
        onClose={action(() => (tab.store.openViewImage = false))}
        index={tab.store.viewImageIndex}
        onIndexChange={action((i) => (tab.store.viewImageIndex = i))}
      /> */}
    </TabContext>
  )
}
