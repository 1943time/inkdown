import { Store, StoreContext } from '@/store/store'
import { ErrorBoundary, ErrorFallback } from '@/ui/error/ErrorBoundary'
import { observer } from 'mobx-react-lite'
import { useCallback, useEffect, useLayoutEffect, useMemo } from 'react'
import { Editable, Slate } from 'slate-react'
import { EditorUtils } from './utils/editorUtils'
import { Title } from './tools/Title'
import { useHighlight } from './plugins/useHighlight'
import { MElement, MLeaf } from './elements'
import { ThemeProvider } from '@lobehub/ui'
import { TabContext } from '@/store/note/TabCtx'
import { useUpdate } from 'react-use'
import { IDoc } from 'types/model'
import { File } from 'lucide-react'

export const Webview = observer((props: { doc: IDoc }) => {
  const update = useUpdate()
  const store = useMemo(() => {
    const store = new Store()
    store.note.createTab()
    return store
  }, [])
  useLayoutEffect(() => {
    if (props.doc) {
      store.note.openDoc(props.doc)
      if (props.doc.schema) {
        EditorUtils.reset(store.note.state.currentTab.editor, props.doc.schema)
      }
      update()
    }
  }, [props.doc])

  const tab = store.note.state.currentTab
  const high = useHighlight(tab)
  const renderElement = useCallback(
    (props: any) => <MElement {...props} children={props.children} />,
    []
  )
  const renderLeaf = useCallback((props: any) => <MLeaf {...props} children={props.children} />, [])
  return (
    <StoreContext value={store}>
      <TabContext value={tab}>
        <div className={'content'}>
          <ErrorBoundary fallback={(e) => <ErrorFallback error={e} />}>
            <Slate editor={tab.editor} initialValue={[EditorUtils.p]}>
              <div
                className={`${store.settings.state.reduceFileName ? 'mini mt-4 flex items-baseline mb-6 ' : 'mt-6 mb-4'}`}
              >
                {store.settings.state.reduceFileName && (
                  <File
                    className={
                      'mr-1 relative top-0.5 text-sm flex-shrink-0 w-4 h-4 dark:text-white/60 text-black/60'
                    }
                  />
                )}
                <div
                  contentEditable={false}
                  spellCheck={false}
                  suppressContentEditableWarning={true}
                  className={`page-title`}
                >
                  {props.doc.name}
                </div>
              </div>
              <Editable
                decorate={high}
                onDragOver={(e) => e.preventDefault()}
                spellCheck={false}
                readOnly={true}
                className={`edit-area ${tab.state.focus ? 'focus' : ''}`}
                style={{ fontSize: 16 }}
                onContextMenu={(e) => e.stopPropagation()}
                renderElement={renderElement}
                renderLeaf={renderLeaf}
              />
            </Slate>
          </ErrorBoundary>
        </div>
      </TabContext>
    </StoreContext>
  )
})
