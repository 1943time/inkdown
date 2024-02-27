import { observer } from 'mobx-react-lite'
import React, { useCallback, useEffect } from 'react'
import { Tooltip } from 'antd'
import { runInAction } from 'mobx'
import {useLocalState} from '../../hooks/useLocalState'
import {IFileItem} from '../../index'
import {treeStore} from '../../store/tree'

export const Title = observer(({node} : {node?: IFileItem}) => {
  const [state, setState] = useLocalState({
    name: '',
    tip: false
  })
  useEffect(() => {
    setState({name: node?.filename || ''})
  }, [node])

  const save = useCallback(() => {
    if (!state.name) {
      setState({name: node?.filename || ''})
    } else if (node && treeStore.openedNote) {
      // const stack = node.parent ? node.children! : treeStore.tree
      // if (stack.some(s => s.name === state.name && s.id !== node.id)) {
      //   setState({
      //     name: node.filename
      //   })
      // } else {
      //   runInAction(() => {
      //     node.name = state.name
      //     $tree.service.updateDoc(node, {
      //       name: state.name
      //     })
      //   })
      // }
    }
    setState({tip: false})
  }, [node])
  return (
    <Tooltip
      title="There's already a file with the same name"
      color={'gold'}
      open={state.tip}
      placement={'bottom'}
    >
      <div className={'mt-12'}>
        <input
          value={state.name}
          onChange={e => {
            setState({name: e.target.value})
            if (node) {
              // const stack = node.parent ? node.children! : $tree.tree
              // if (stack.some(s => s.name === e.target.value && s.id !== node.id)) {
              //   setState({tip: true})
              // } else {
              //   setState({tip: false})
              // }
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
