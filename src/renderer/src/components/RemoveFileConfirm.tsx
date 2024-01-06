import {observer} from 'mobx-react-lite'
import {Button, Checkbox, Modal, Space} from 'antd'
import isHotkey from 'is-hotkey'
import {treeStore} from '../store/tree'
import {useLocalState} from '../hooks/useLocalState'
import {useCallback, useEffect} from 'react'
import {Dialog} from './Dialog'
import logo from '../../public/logo.svg'
import {configStore} from '../store/config'
export const RemoveFileConfirm = observer(() => {
  const [state, setState] = useLocalState({
    open: false,
    save: false
  })
  const remove = useCallback(() => {
    if (treeStore.selectItem || treeStore.ctxNode) {
      treeStore.moveToTrash(treeStore.selectItem || treeStore.ctxNode!, true)
      if (state.save) {
        configStore.setConfig('showRemoveFileDialog', false)
      }
      setState({open: false})
    }
  }, [])
  useEffect(() => {
    window.addEventListener('keydown', e => {
      if (treeStore.selectItem && isHotkey('mod+backspace', e)) {
        if (configStore.config.showRemoveFileDialog) {
          setState({open: true})
        } else {
          treeStore.moveToTrash(treeStore.selectItem)
        }
      }
    })
    window.electron.ipcRenderer.on('showRemoveFileDialog', () => {
      if (treeStore.selectItem || treeStore.ctxNode) {
        setState({open: true})
      }
    })
  }, [])
  return (
    <Dialog
      open={state.open}
      onClose={() => setState({open: false})}
    >
      <div className={'w-[260px] p-4 flex flex-col items-center text-center'}>
        <img src={logo} alt="" className={'w-12 h-12 mb-4'}/>
        <div className={'font-semibold mb-2 text-sm dark:text-gray-200'}>{`Are you sure you want to delete '${treeStore.selectItem?.filename}'`}</div>
        <div className={'text-gray-500 text-xs mb-4 dark:text-gray-400'}>You can restore this file from the Trash.</div>
        <Button type={'primary'} block={true} className={'mb-3'} onClick={remove}>Move To Trash</Button>
        <Button block={true} className={'mb-6'} onClick={() => setState({open: false})}>Cancel</Button>
        <Checkbox checked={state.save} onChange={e => setState({save: e.target.checked})}>Dot ask me again</Checkbox>
      </div>
    </Dialog>
  )
})
