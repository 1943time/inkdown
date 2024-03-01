import {observer} from 'mobx-react-lite'
import React, {useCallback, useEffect} from 'react'
import {Tooltip} from 'antd'
import {useLocalState} from '../../hooks/useLocalState'
import {IFileItem} from '../../index'
import {readdirSync} from 'fs'
import {join} from 'path'
import {configStore} from '../../store/config'
import {updateFilePath} from '../utils/updateNode'
import isHotkey from 'is-hotkey'
import {ReactEditor} from 'slate-react'
import {useEditorStore} from '../store'
import {Editor, Transforms} from 'slate'

export const Title = observer(({node} : {node: IFileItem}) => {
  const store = useEditorStore()
  const [state, setState] = useLocalState({
    name: '',
    tip: false
  })
  useEffect(() => {
    setState({name: node?.filename || ''})
  }, [node])

  const detectRename = useCallback(() => {
    const name = state.name.trim()
    if (node.parent && node.parent.children!.some(s => s.cid !== node.cid && s.filename === name)) {
      setState({tip: true})
      return false
    }
    if (!node.parent && name !== node.filename) {
      const files = readdirSync(join(node.filePath, '..'))
      if (files.some(f => f === name)) {
        setState({tip: true})
        return false
      }
    }
    setState({tip: false})
    return true
  }, [node])

  const save = useCallback(() => {
    const name = state.name.trim()
    if (!name) {
      setState({name: node.filename || ''})
    } else if (node) {
      if (detectRename()) {
        updateFilePath(node, join(node.filePath, '..', name + '.' + node.ext))
      } else {
        setState({name: node.filename})
      }
    }
    setState({tip: false})
  }, [node])
  return (
    <Tooltip
      title={configStore.zh ? '已经有一个同名的文件' : `There's already a file with the same name`}
      color={'gold'}
      open={state.tip}
      placement={'bottom'}
    >
      <div className={'mt-12'}>
        <input
          value={state.name}
          onChange={e => {
            setState({name: e.target.value})
            detectRename()
          }}
          onKeyDown={e => {
            e.preventDefault()
            if (isHotkey('enter', e) || isHotkey('down', e)) {
              try {
                ReactEditor.focus(store.editor)
                Transforms.select(store.editor, Editor.start(store.editor, []))
              } catch (e) {
                console.error(e)
              }
            }
          }}
          onBlur={save}
          placeholder={'Untitled'}
          className={'page-title'}
        />
      </div>
    </Tooltip>
  )
})
