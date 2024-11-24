import { observer } from 'mobx-react-lite'
import { useCallback, useEffect, useRef } from 'react'
import { Tooltip } from 'antd'
import { useLocalState } from '../../hooks/useLocalState'
import { readdirSync } from 'fs'
import { join } from 'path'
import isHotkey from 'is-hotkey'
import { ReactEditor } from 'slate-react'
import { useEditorStore } from '../store'
import { Editor, Transforms } from 'slate'
import { runInAction } from 'mobx'
import { MainApi } from '../../api/main'
import { useCoreContext } from '../../store/core'
import { useTranslation } from 'react-i18next'
import { IFileItem } from '../../types'
import INote from '../../icons/INote'
import { IMini } from '../../icons/IMini'
import { IMax } from '../../icons/IMax'

export const Title = observer(({ node }: { node: IFileItem }) => {
  const core = useCoreContext()
  const store = useEditorStore()
  const { t } = useTranslation()
  const [state, setState] = useLocalState({
    name: '',
    tip: false
  })
  const inputRef = useRef<HTMLDivElement>(null)
  useEffect(() => {
    setName(node?.filename)
    setState({ tip: false })
  }, [node])
  const setName = useCallback((name: string = '') => {
    if (inputRef.current) {
      inputRef.current.innerText = name
    }
    setState({ name })
  }, [])
  const getName = useCallback(() => {
    return (inputRef.current?.innerText || '').trim().replace(/\n/g, '')
  }, [])
  const detectRename = useCallback(() => {
    const name = getName()
    if (
      node.parent &&
      node.parent.children!.some((s) => s.cid !== node.cid && s.filename === name)
    ) {
      setState({ tip: true })
      return false
    }
    if (!node.parent && name !== node.filename) {
      const files = readdirSync(join(node.filePath, '..'))
      if (files.some((f) => f === name)) {
        setState({ tip: true })
        return false
      }
    }
    setState({ tip: false })
    return true
  }, [node])

  const save = useCallback(async () => {
    const name = getName()
    if (!name) {
      setName(node.filename)
      setState({ tip: false })
    } else if (node) {
      if (node.ghost) {
        runInAction(() => (node.filename = name))
      } else if (!node.parent && !node.spaceId) {
        const oldPath = node.filePath
        if (oldPath !== state.name) {
          MainApi.saveDialog({
            filters: [{ name: 'md', extensions: ['md'] }],
            properties: ['createDirectory'],
            defaultPath: state.name
          }).then((res) => {
            if (res.filePath && oldPath !== res.filePath) {
              core.node.updateFilePath(node, res.filePath)
            } else {
              setName(node.filename)
            }
          })
        }
        setState({ tip: false })
      } else if (core.tree.root && core.tree.nodeMap.get(node.cid)) {
        if (detectRename()) {
          if (node.spaceId && core.tree.root) {
            const oldPath = node.filePath
            await core.node.updateFilePath(node, join(node.filePath, '..', name + '.' + node.ext))
            if (node.spaceId) {
              core.refactor.refactorDepOnLink(node, oldPath)
            }
          }
          setState({ tip: false })
        }
      }
    }
  }, [node])
  return (
    <Tooltip title={t('nameConflict')} color={'magenta'} open={state.tip} placement={'bottom'}>
      <div className={`${core.config.config.miniTitle ? 'mt-10 mb-6 mini-title' : 'mt-12'} relative group`}>
        {core.config.config.miniTitle ? (
          <div className={'flex items-baseline select-none'} contentEditable={false}>
            <INote className={'mr-0.5 relative top-0.5'}/>
            <div
              contentEditable={true}
              ref={inputRef}
              suppressContentEditableWarning={true}
              onKeyDown={(e) => {
                if (e.key.toLowerCase() === 'enter') {
                  e.preventDefault()
                }
                if (isHotkey('mod+s', e)) {
                  e.preventDefault()
                  save()
                }
                if (isHotkey('enter', e) || isHotkey('down', e)) {
                  e.preventDefault()
                  try {
                    ReactEditor.focus(store.editor)
                    Transforms.select(store.editor, Editor.start(store.editor, []))
                  } catch (e) {
                    console.error(e)
                  }
                }
              }}
              onBlur={save}
              className={'page-title mini'}
            />
          </div>
        ) : (
          <div>
            <div
            contentEditable={true}
            ref={inputRef}
            suppressContentEditableWarning={true}
            onKeyDown={(e) => {
              if (e.key.toLowerCase() === 'enter') {
                e.preventDefault()
              }
              if (isHotkey('mod+s', e)) {
                e.preventDefault()
                save()
              }
              if (isHotkey('enter', e) || isHotkey('down', e)) {
                e.preventDefault()
                try {
                  ReactEditor.focus(store.editor)
                  Transforms.select(store.editor, Editor.start(store.editor, []))
                } catch (e) {
                  console.error(e)
                }
              }
            }}
            onBlur={save}
            className={'page-title'}
          />
          </div>
        )}
        <div
          style={{transitionProperty: 'background-color'}}
          className={`hidden group-hover:block absolute right-1 ${core.config.config.miniTitle ? 'top-1' : 'top-4'} rounded dark:bg-white/5 p-1 cursor-pointer hover:dark:bg-white/10 duration-200 bg-gray-100 hover:bg-gray-200/80`}
          onClick={async () => {
            const text = inputRef.current?.innerText
            core.config.setConfig('miniTitle', !core.config.config.miniTitle)
            setTimeout(() => {
              if (inputRef.current) {
                inputRef.current.innerText = text || ''
              }
            }, 30)
          }}
        >
          {core.config.config.miniTitle ? (
            <IMax/>
          ): (
            <IMini/>
          )}
        </div>
      </div>
    </Tooltip>
  )
})
