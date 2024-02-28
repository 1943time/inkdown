import { observer } from 'mobx-react-lite'
import React, { useCallback, useEffect } from 'react'
import { Tooltip } from 'antd'
import { runInAction } from 'mobx'
import {useLocalState} from '../../hooks/useLocalState'
import {IFileItem} from '../../index'
import {treeStore} from '../../store/tree'
import {readdirSync} from 'fs'
import {join} from 'path'
import {configStore} from '../../store/config'
import {updateFilePath} from '../utils/updateNode'

export const Title = observer(({node} : {node: IFileItem}) => {
  const [state, setState] = useLocalState({
    name: '',
    tip: false
  })
  useEffect(() => {
    setState({name: node?.filename || ''})
  }, [node])
  const detectRename = useCallback(() => {
    if (node.parent && node.parent.children!.some(s => s.cid !== node.cid && s.filename === state.name)) {
      setState({tip: true})
      return false
    }
    if (!node.parent && state.name !== node.filename) {
      const files = readdirSync(join(node.filePath, '..'))
      if (files.some(f => f === state.name)) {
        setState({tip: true})
        return false
      }
    }
    setState({tip: false})
    return true
  }, [])
  const save = useCallback(() => {
    if (!state.name) {
      setState({name: node.filename || ''})
    } else if (node) {
      if (detectRename()) {
        updateFilePath(node, join(node.filePath, '..', state.name + '.' + node.ext))
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
          onBlur={save}
          placeholder={'Untitled'}
          className={'page-title'}
        />
      </div>
    </Tooltip>
  )
})
