import { useEffect, useMemo, useRef } from 'react'
import { useSelStatus } from '../../hooks/editor'
import { EditorUtils } from '../utils/editorUtils'
import { message$, sizeUnit } from '../../utils'
import { AttachNode, ElementProps } from '../../el'
import { isAbsolute, join } from 'path'
import { ILink } from '../../icons/ILink'
import { MainApi } from '../../api/main'
import { existsSync } from 'fs'

export function Attachment({ element, attributes, children }: ElementProps<AttachNode>) {
  const [selected, path, store] = useSelStatus(element)
  const ext = useMemo(() => {
    return element.url.match(/\.(\w+)$/i)?.[1].toUpperCase() || 'FILE'
  }, [])
  return (
    <div
      contentEditable={false}
      className={`attach`}
      data-be={'attach'}
      {...attributes}
      onMouseDown={(e) => {
        e.stopPropagation()
        if (!store.focus) {
          EditorUtils.focus(store.editor)
        }
        EditorUtils.selectMedia(store, path)
      }}
    >
      <div className={`file ${selected ? 'active' : ''}`}>
        <div className={'flex items-center justify-between'}>
          <div className={'flex items-center text-sm'}>
            <div
              className={
                'px-1.5 py-0.5 rounded flex items-center bg-teal-500 text-white text-xs font-semibold'
              }
            >
              {ext}
            </div>
            <div className={'mx-3 break-all'}>{element.name}<span className={'ml-1.5 text-xs text-black/70 dark:text-white/70'}>{sizeUnit(element.size || 0)}</span></div>
          </div>
          <div
            className={
              'p-1 flex items-center rounded text-sm text-black/80 dark:text-white/80 cursor-pointer hover:bg-gray-200 duration-200 dark:hover:bg-white/15'
            }
            onClick={() => {
              if (/\w+:\/\//.test(element.url)) {
                window.open(element.url)
              } else {
                if (isAbsolute(element.url)) {
                  if (!existsSync(element.url)) {
                    message$.next({
                      type: 'info',
                      content: `${element.url} does not exist`
                    })
                  }
                  MainApi.showInFolder(element.url)
                } else {
                  const currentFilePath = store.webview ? store.webviewFilePath : store.openFilePath
                  const filePath = join(currentFilePath || '', '..', element.url)
                  if (!existsSync(filePath)) {
                    message$.next({
                      type: 'info',
                      content: `${filePath} does not exist`
                    })
                  }
                  MainApi.showInFolder(filePath)
                }
              }
            }}
          >
            <ILink/>
          </div>
        </div>
      </div>
      <span className={'h-0 block'}>{children}</span>
    </div>
  )
}
