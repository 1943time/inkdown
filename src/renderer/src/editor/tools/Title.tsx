import { observer } from 'mobx-react-lite'
import { useCallback, useEffect, useRef } from 'react'
import { Tooltip } from 'antd'
import { useLocalState } from '../../hooks/useLocalState'
import { IFileItem } from '../../index'
import { readdirSync } from 'fs'
import { join } from 'path'
import { configStore } from '../../store/config'
import { updateFilePath } from '../utils/updateNode'
import isHotkey from 'is-hotkey'
import { ReactEditor } from 'slate-react'
import { useEditorStore } from '../store'
import { Editor, Transforms } from 'slate'
import { treeStore } from '../../store/tree'
import { runInAction } from 'mobx'
import { MainApi } from '../../api/main'

export const Title = observer(({ node }: { node: IFileItem }) => {
  const store = useEditorStore()
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
              updateFilePath(node, res.filePath)
            } else {
              setName(node.filename)
            }
          })
        }
        setState({ tip: false })
      } else if (treeStore.root && treeStore.nodeMap.get(node.cid)) {
        if (detectRename()) {
          if (node.spaceId && treeStore.root) {
            const oldPath = node.filePath
            await updateFilePath(node, join(node.filePath, '..', name + '.' + node.ext))
            if (node.spaceId) {
              treeStore.refactor.refactorDepOnLink(node, oldPath)
            }
          }
          setState({ tip: false })
        }
      }
    }
  }, [node])
  return (
    <Tooltip
      title={configStore.zh ? '已经有一个同名的文件' : `There's already a file with the same name`}
      color={'magenta'}
      open={state.tip}
      placement={'bottom'}
    >
      <div className={'mt-12'}>
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
    </Tooltip>
  )
})
