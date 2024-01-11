import {observer} from 'mobx-react-lite'
import {MainApi} from '../api/main'
import {treeStore} from '../store/tree'
import {join, parse} from 'path'
import {existsSync} from 'fs'
import {message$} from '../utils'
import {configStore} from '../store/config'
import {ReactEditor} from 'slate-react'
import {Input, Modal} from 'antd'
import React, {useCallback, useEffect} from 'react'
import {EditorStore} from './store'
import {useLocalState} from '../hooks/useLocalState'
import isHotkey from 'is-hotkey'

export const RenamePasteFile = observer(({open, file, onClose, store}: {
  open: boolean
  file: File
  onClose: () => void
  store: EditorStore
}) => {
  const [state, setState] = useLocalState({
    saveFileName: '',
    ext: ''
  })
  useEffect(() => {
    if (open) {
      const ext = file.name.match(/\.\w+$/)
      setState({
        saveFileName: Date.now().toString(16),
        ext: ext?.[0] || ''
      })
      setTimeout(() => {
        (document.querySelector('.rename-input input') as HTMLInputElement)?.select()
      })
    }
  }, [open])

  const save = useCallback(async () => {
    if (/^[\w\u4e00-\u9fa5]+$/.test(state.saveFileName)) {
      const name = state.saveFileName + state.ext
      const path = await MainApi.getCachePath()
      let targetPath = ''
      if (treeStore.root) {
        const imageDir = configStore.config.relativePathForImageStore ? join(treeStore.openedNote!.filePath, '..', configStore.config.imagesFolder) : join(treeStore.root!.filePath, configStore.config.imagesFolder)
        targetPath = join(imageDir, name)
      } else {
        targetPath = join(path, 'images', name)
      }
      if (existsSync(targetPath)) {
        return message$.next({
          type: 'warning',
          content: configStore.zh ? '文件名已存在' : 'The file name already exists'
        })
      }
      const mediaPath = await store.saveFile({
        name,
        buffer: await file.arrayBuffer()
      })
      onClose()
      ReactEditor.focus(store.editor)
      store.insertInlineNode(mediaPath)
    } else {
      message$.next({
        type: 'warning',
        content: configStore.zh ? '请输入正确文件名称' : 'Please enter the correct file name'
      })
      return Promise.reject()
    }
  }, [file, store])
  return (
    <Modal
      width={400}
      onCancel={onClose}
      open={open}
      onOk={save}
      title={configStore.zh ? '插入图片' : 'Insert Image'}
    >
      <Input
        autoFocus={true}
        className={'rename-input'}
        onKeyDown={e => {
          if (isHotkey('enter', e)) {
            save()
          }
        }}
        placeholder={configStore.zh ? '请输入文件名' : 'Please enter file name'} addonAfter={state.ext}
        value={state.saveFileName}
        onChange={e => setState({saveFileName: e.target.value})}
      />
    </Modal>
  )
})
