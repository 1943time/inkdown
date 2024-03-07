import {observer} from 'mobx-react-lite'
import {configStore} from '../../store/config'
import {Button, Checkbox, Input, Modal, Radio, Select, Slider, Space} from 'antd'
import {LinkOutlined} from '@ant-design/icons'
import {message$} from '../../utils'
import {treeStore} from '../../store/tree'
import {join} from 'path'
import {existsSync, statSync} from 'fs'
import {MainApi} from '../../api/main'
import isHotkey from 'is-hotkey'
import {useLocalState} from '../../hooks/useLocalState'
import {useEffect} from 'react'
import {TextHelp} from './Help'
import {InterfaceFont} from './Font'
import {clearInlineKatex} from '../../editor/plugins/useHighlight'
import {runInAction} from 'mobx'

export const Overview = observer(() => {
  const [state, setState] = useLocalState({
    imagesFolder: '',
    version: ''
  })
  const [modal, context] = Modal.useModal()
  useEffect(() => {
    window.electron.ipcRenderer.invoke('get-version').then(res => {
      setState({version: res})
    })
    setState({imagesFolder: configStore.config.imagesFolder})
  }, [configStore.visible])
  return (
    <div
      className={'divide-y divide-gray-200 dark:divide-gray-200/10 text-gray-600 dark:text-gray-300 px-4 py-2 h-[600px] overflow-y-auto'}>
      {context}
      <div className={'flex justify-between items-center py-3'}>
        <div className={'text-sm'}>
          Version{configStore.mas ? ' (App Store) ' : ''}: {state.version}
        </div>
        <div>
          <Button
            icon={<LinkOutlined/>}
            onClick={() => {
              window.open('https://github.com/1943time/bluestone/releases')
            }}
          >
            {configStore.zh ? '发布记录' : 'Release Record'}
          </Button>
        </div>
      </div>
      <div className={'flex justify-between items-center py-3'}>
        <div className={'text-sm'}>
          {'Language'}
        </div>
        <div>
          <Select
            value={configStore.config.locale}
            className={'w-36'}
            options={[
              {label: 'English', value: 'en'},
              {label: '简体中文', value: 'zh'}
            ]}
            onChange={e => {
              configStore.setConfig('locale', e)
              modal.info({
                title: configStore.zh ? '提示' : 'Notice',
                content: configStore.zh ? '语言切换将在应用重启后完全生效。' : 'The language switch will take full effect after the application restarts.'
              })
            }}
          >
          </Select>
        </div>
      </div>
      <div className={'flex justify-between items-center py-3'}>
        <div className={'text-sm'}>
          {configStore.zh ? '主题' : 'Themes'}
        </div>
        <div>
          <Radio.Group
            value={configStore.config.theme}
            onChange={async e => {
              await configStore.setTheme(e.target.value)
              if (configStore.config.codeTheme === 'auto') {
                configStore.reloadHighlighter(true)
              }
            }}
          >
            <Radio.Button value={'system'}>{configStore.zh ? '系统' : 'System'}</Radio.Button>
            <Radio.Button value={'light'}>{configStore.zh ? '明亮' : 'Light'}</Radio.Button>
            <Radio.Button value={'dark'}>{configStore.zh ? '暗黑' : 'Dark'}</Radio.Button>
          </Radio.Group>
        </div>
      </div>
      <InterfaceFont/>
      <div className={'flex justify-between items-center py-3'}>
        <div className={'text-sm'}>
          {configStore.zh ? '显示隐藏文件' : 'Show hidden files'}
        </div>
        <div>
          <Checkbox checked={configStore.config.showHiddenFiles}
                    onChange={e => configStore.setConfig('showHiddenFiles', e.target.checked)}/>
        </div>
      </div>
      <div className={'flex justify-between items-center py-3'}>
        <div className={'text-sm'}>
          {configStore.zh ? '删除文件确认' : 'Delete file confirmation'}
        </div>
        <div>
          <Checkbox checked={configStore.config.showRemoveFileDialog}
                    onChange={e => configStore.setConfig('showRemoveFileDialog', e.target.checked)}/>
        </div>
      </div>
      <div className={'flex justify-between items-center py-3'}>
        <div className={'text-sm'}>
          <span className={'mr-1'}>{configStore.zh ? '图片存储文件夹' : 'Image storage folder'}</span>
          <TextHelp text={
            configStore.zh ? '在打开文件夹的情况下，黏贴图片的保存位置，如果使用相对路径，则路径相对于当前文档的路径' :
              'The save location for pasting images when opening a folder, if using a relative path, the path is relative to the current document\'s path'
          }/>
        </div>
        <div className={'flex items-center'}>
          <Checkbox checked={configStore.config.relativePathForImageStore}
                    onChange={e => configStore.setConfig('relativePathForImageStore', e.target.checked)}>Relative
            path</Checkbox>
          <Space.Compact style={{width: 300}}>
            <Input placeholder={'folder name'} value={state.imagesFolder}
                   onChange={e => setState({imagesFolder: e.target.value})}/>
            <Button
              type="primary"
              onClick={async () => {
                if (!/^\.?[\w\u4e00-\u9fa5@#*$!\/]+$/.test(state.imagesFolder)) {
                  message$.next({
                    type: 'warning',
                    content: configStore.zh ? '请输入正确文件夹名称' : 'Please enter the correct folder name'
                  })
                }
                if (treeStore.root && !configStore.config.relativePathForImageStore) {
                  const path = join(treeStore.root.filePath, state.imagesFolder)
                  if (existsSync(path)) {
                    if (!statSync(path).isDirectory()) {
                      message$.next({
                        type: 'warning',
                        content: configStore.zh ? '该文件名已存在' : 'The file name already exists'
                      })
                      return
                    } else {
                      treeStore.watcher.onChange('update', path)
                    }
                  } else {
                    await MainApi.mkdirp(path)
                    treeStore.watcher.onChange('update', path)
                  }
                }
                configStore.setConfig('imagesFolder', state.imagesFolder)
                message$.next({
                  type: 'success',
                  content: configStore.zh ? '设置成功' : 'Set successfully'
                })
              }}
            >
              {configStore.zh ? '保存' : 'Save'}
            </Button>
          </Space.Compact>
        </div>
      </div>
      <div className={'flex justify-between items-center py-3'}>
        <div className={'text-sm'}>
          {configStore.zh ? '显示字符统计' : 'Show character statistics'}
        </div>
        <div>
          <Checkbox checked={configStore.config.showCharactersCount}
                    onChange={e => configStore.setConfig('showCharactersCount', e.target.checked)}/>
        </div>
      </div>
      <div className={'flex justify-between items-center py-3'}>
        <div className={'text-sm'}>
          {configStore.zh ? '编辑区最大宽度' : 'Maximum width of the editing area'}
        </div>
        <div className={'flex items-center'}>
          <Space.Compact>
            <Slider
              className={'w-64'}
              value={configStore.config.editorWidth} min={720} max={1000} marks={{720: 'Recommend', 1000: 'Max'}}
              step={20}
              onChange={e => {
                configStore.setConfig('editorWidth', e)
              }}
            />
          </Space.Compact>
        </div>
      </div>
      <div className={'flex justify-between items-center py-3'}>
        <div className={'text-sm'}>
          {configStore.zh ? '显示大纲' : 'Show outline'}
        </div>
        <div>
          <Checkbox
            checked={configStore.config.showLeading}
            onChange={e => {
              configStore.toggleShowLeading()
            }}
          />
        </div>
      </div>
      <div className={'flex justify-between items-center py-3'}>
        <div className={'text-sm'}>
          {configStore.zh ? '大纲宽度' : 'Outline width'}
        </div>
        <div>
          <Slider
            className={'w-64'}
            value={configStore.config.leadingWidth} min={220} max={400} marks={{220: '220', 400: '400'}}
            step={20}
            onChange={e => {
              configStore.setConfig('leadingWidth', e)
            }}
          />
        </div>
      </div>
    </div>
  )
})
