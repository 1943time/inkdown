import {observer} from 'mobx-react-lite'
import {Button, Checkbox, Input, message, Modal, Radio, Select, Slider, Space, Tooltip} from 'antd'
import {CloseOutlined, LinkOutlined, QuestionCircleOutlined} from '@ant-design/icons'
import {configStore} from '../store/config'
import {ReactNode, useCallback, useEffect} from 'react'
import {action, runInAction} from 'mobx'
import {treeStore} from '../store/tree'
import {ReactEditor} from 'slate-react'
import {clearAllCodeCache, codeCache} from '../editor/plugins/useHighlight'
import {useLocalState} from '../hooks/useLocalState'
import {message$} from '../utils'
import {existsSync, mkdirSync, statSync} from 'fs'
import {join} from 'path'
import isHotkey from 'is-hotkey'

function Help(props: {
  text: string | ReactNode
}) {
  return (
    <Tooltip title={props.text}>
      <QuestionCircleOutlined/>
    </Tooltip>
  )
}

export const Set = observer(() => {
  const close = useCallback(action(() => {
    configStore.visible = false
  }), [])

  const [state, setState] = useLocalState({
    imagesFolder: '',
    tab: 'Appearance' as 'Appearance' | 'Editor' | 'General',
    editorMaxWidth: configStore.config.editorMaxWidth as number | null,
    version: ''
  })

  useEffect(() => {
    if (configStore.visible) {
      for (let t of treeStore.tabs) {
        ReactEditor.blur(t.store.editor)
      }
    }
    window.electron.ipcRenderer.invoke('get-version').then(res => {
      setState({version: res})
    })
    setState({imagesFolder: configStore.config.imagesFolder, editorMaxWidth: configStore.config.editorMaxWidth})
    const esc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        close()
      }
    }
    if (configStore.visible) {
      window.addEventListener('keydown', esc)
    } else {
      window.removeEventListener('keydown', esc)
    }
  }, [configStore.visible])

  const [modal, context] = Modal.useModal()
  if (!configStore.visible) return null
  return (
    <div className={`fixed inset-0 z-[300] dark:bg-black/30 bg-black/10`}>
      {context}
      <div
        className={'w-full h-full flex items-center justify-center overflow-auto py-10 flex-wrap'}
        onClick={close}
      >
        <div
          className={'min-w-[500px] modal-panel w-4/5 max-w-[900px] relative overflow-hidden'}
          onClick={(e) => e.stopPropagation()}
        >
          <div
            className={'z-[10] p-1 dark:text-gray-400 text-gray-500 duration-200 hover:bg-gray-100 rounded dark:hover:bg-gray-500/30 absolute right-3 top-3'}
            onClick={close}
          >
            <CloseOutlined/>
          </div>
          <div className={'flex'}>
            <div className={'py-4 px-2 w-[230px] border-r b1 tree-bg rounded-tl-lg rounded-bl-lg'}>
              <div className={'mb-4 px-2 text-gray-500'}>{'Preferences'}</div>
              <div
                onClick={() => setState({tab: 'General'})}
                className={`py-1 cursor-default px-3 text-sm mb-1 rounded  ${state.tab === 'General' ? 'bg-sky-500/80 text-gray-100' : 'dark:hover:bg-gray-400/10 hover:bg-gray-500/10 text-gray-600 dark:text-gray-200'}`}
              >
                General
              </div>
              <div
                onClick={() => setState({tab: 'Appearance'})}
                className={`py-1 cursor-default px-3 text-sm mb-1 rounded ${state.tab === 'Appearance' ? 'bg-sky-500/80 text-gray-100' : 'dark:hover:bg-gray-400/10 hover:bg-gray-500/10 text-gray-600 dark:text-gray-200'}`}
              >
                Appearance
              </div>
              <div
                onClick={() => setState({tab: 'Editor'})}
                className={`py-1 cursor-default px-3 text-sm rounded ${state.tab === 'Editor' ? 'bg-sky-500/80 text-gray-100' : 'dark:hover:bg-gray-400/10 hover:bg-gray-500/10 text-gray-600 dark:text-gray-200'}`}>Editor
              </div>
            </div>
            <div className={'flex-1 dark:bg-zinc-900 bg-white'}>
              <div className={'border-b text-base font-medium h-12 items-center flex dark:text-gray-200 text-gray-700 b1 relative px-4'}>
                <div>
                  {state.tab}
                </div>
              </div>
              {state.tab === 'General' &&
                <div
                  className={'divide-y divide-gray-200 dark:divide-gray-200/10 text-gray-600 dark:text-gray-300 px-4 py-2 h-[600px] overflow-y-auto'}>
                  <div className={'flex justify-between items-center py-3'}>
                    <div className={'text-sm'}>
                      Version{configStore.mas ? '(App Store)' : ''}: {state.version}
                    </div>
                    <div>
                      <Button
                        icon={<LinkOutlined />}
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
                      <Radio.Group
                        value={configStore.config.locale}
                        onChange={e => {
                          configStore.setConfig('locale', e.target.value)
                          modal.info({
                            title: configStore.zh ? '提示' : 'Note',
                            content: configStore.zh ? '语言切换将在应用重启后完全生效。' : 'The language switch will take full effect after the application restarts.'
                          })
                        }}
                      >
                        <Radio.Button value={'en'}>{'English'}</Radio.Button>
                        <Radio.Button value={'zh'}>{'简体中文'}</Radio.Button>
                      </Radio.Group>
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
                      <Help text={
                        configStore.zh ? '在打开文件夹的情况下，黏贴图片的保存位置' :
                          'Save location for pasting images when opening a folder'
                      }/>
                    </div>
                    <div>
                      <Space.Compact style={{width: '100%'}}>
                        <Input placeholder={'folder name'} value={state.imagesFolder}
                               onChange={e => setState({imagesFolder: e.target.value})}/>
                        <Button
                          type="primary"
                          onClick={() => {
                            if (!/^\.?[\w\u4e00-\u9fa5@#*$!]+$/.test(state.imagesFolder)) {
                              message$.next({
                                type: 'warning',
                                content: configStore.zh ? '请输入正确文件夹名称' : 'Please enter the correct folder name'
                              })
                            }
                            if (treeStore.root) {
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
                                mkdirSync(path)
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
                </div>
              }
              {state.tab === 'Appearance' &&
                <div
                  className={'divide-y divide-gray-200 dark:divide-gray-200/10 text-gray-600 dark:text-gray-300 px-4 py-2 h-[600px] overflow-y-auto'}>
                  <div className={'flex justify-between items-center py-3'}>
                    <div className={'text-sm'}>
                      {configStore.zh ? '主题' : 'Themes'}
                    </div>
                    <div>
                      <Radio.Group
                        value={configStore.config.theme}
                        onChange={e => {
                          configStore.setTheme(e.target.value)
                        }}
                      >
                        <Radio.Button value={'system'}>{configStore.zh ? '系统' : 'System'}</Radio.Button>
                        <Radio.Button value={'light'}>{configStore.zh ? '明亮' : 'Light'}</Radio.Button>
                        <Radio.Button value={'dark'}>{configStore.zh ? '暗黑' : 'Dark'}</Radio.Button>
                      </Radio.Group>
                    </div>
                  </div>
                  <div className={'flex justify-between items-center py-3'}>
                    <div className={'text-sm'}>
                      {configStore.zh ? '显示字符统计' : 'Displays character statistics'}
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
                        <Input
                          placeholder={'Unit pixel >= 800'}
                          value={state.editorMaxWidth || ''}
                          onKeyDown={e => {
                            if (e.key.length === 1 && !/^\d$/.test(e.key)) {
                              e.preventDefault()
                            }
                            if (isHotkey('enter', e)) {
                              let width = Number(state.editorMaxWidth)
                              width = width < 800 ? 800 : width
                              width = width > 5000 ? 5000 : width
                              configStore.setConfig('editorMaxWidth', width)
                              setState({editorMaxWidth: width})
                            }
                          }}
                          onChange={e => setState({editorMaxWidth: (+e.target.value) || null})}
                        />
                        <Button
                          onClick={() => {
                            configStore.setConfig('editorMaxWidth', 900)
                            setState({editorMaxWidth: 900})
                          }}
                        >
                          {configStore.zh ? '重置' : 'Reset'}
                        </Button>
                      </Space.Compact>
                    </div>
                  </div>
                  <div className={'flex justify-between items-center py-3'}>
                    <div className={'text-sm'}>
                      {configStore.zh ? '显示大纲' : 'Show Outline'}
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
                      {configStore.zh ? '大纲提取级别' : 'Outline extraction level'}
                    </div>
                    <div>
                      <Radio.Group
                        value={configStore.config.leadingLevel}
                        onChange={e => {
                          configStore.setConfig('leadingLevel', e.target.value)
                        }}
                      >
                        <Radio value={2}>{'Level 2'}</Radio>
                        <Radio value={3}>{'Level 3'}</Radio>
                        <Radio value={4}>{'Level 4'}</Radio>
                      </Radio.Group>
                    </div>
                  </div>
                </div>
              }
              {state.tab === 'Editor' &&
                <div
                  className={'divide-y divide-gray-200 dark:divide-gray-200/10 text-gray-600 dark:text-gray-300 px-4 py-2 h-[600px] overflow-y-auto'}>
                  <div className={'flex justify-between items-center py-3'}>
                    <div className={'text-sm'}>
                      <span className={'mr-1'}>{configStore.zh ? '自动重建' : 'Automatic Rebuild'}</span> <Help text={
                      configStore.zh ? '重命名或移动文件或文件夹时，文档引入的相关链接与图片路径将自动更改' :
                        'When renaming or moving files or folders, the relevant links and image paths introduced by the document will automatically change'
                    }
                    />
                    </div>
                    <div>
                      <Checkbox checked={configStore.config.autoRebuild}
                                onChange={e => configStore.setConfig('autoRebuild', e.target.checked)}/>
                    </div>
                  </div>
                  <div className={'flex justify-between items-center py-3'}>
                    <div className={'text-sm'}>
                      <span className={'mr-1'}>{configStore.zh ? '自动下载图片' : 'Automatically Download Images'}</span>
                      <Help text={
                        configStore.zh ? '粘贴网页元素或Markdown代码时自动下载网络图像并将其转换为本机地址' :
                          'Automatically download and convert network images to local addresses when pasting webpage elements or markdown code'
                      }/>
                    </div>
                    <div>
                      <Checkbox checked={configStore.config.autoDownload}
                                onChange={e => configStore.setConfig('autoDownload', e.target.checked)}/>
                    </div>
                  </div>
                  <div className={'flex justify-between items-center py-3'}>
                    <div className={'text-sm'}>
                      {configStore.zh ? '拖拽排序' : 'Drag To Sort'}
                    </div>
                    <div>
                      <Checkbox checked={configStore.config.dragToSort}
                                onChange={e => configStore.setConfig('dragToSort', e.target.checked)}/>
                    </div>
                  </div>
                  <div className={'flex justify-between items-center py-3'}>
                    <div className={'text-sm'}>
                      {configStore.zh ? '显示代码段行号' : 'Show Code Line Number'}
                    </div>
                    <div>
                      <Checkbox checked={configStore.config.codeLineNumber}
                                onChange={e => configStore.setConfig('codeLineNumber', e.target.checked)}/>
                    </div>
                  </div>
                  <div className={'flex justify-between items-center py-3'}>
                    <div className={'text-sm'}>
                      {configStore.zh ? '代码段 TabSize' : 'Code TabSize'}
                    </div>
                    <div>
                      <Radio.Group
                        value={configStore.config.codeTabSize}
                        onChange={e => {
                          configStore.setConfig('codeTabSize', e.target.value)
                        }}
                      >
                        <Radio value={2}>2</Radio>
                        <Radio value={4}>4</Radio>
                      </Radio.Group>
                    </div>
                  </div>
                  <div className={'flex justify-between items-center py-3'}>
                    <div className={'text-sm'}>
                      {configStore.zh ? '代码风格' : 'Code Style'}
                    </div>
                    <div>
                      <Select
                        value={configStore.config.codeTheme}
                        className={'w-[220px]'}
                        onChange={e => {
                          configStore.setConfig('codeTheme', e)
                          setTimeout(async () => {
                            await window.api.loadCodeTheme(e)
                            for (const t of treeStore.tabs) {
                              clearAllCodeCache(t.store.editor)
                              t.store.setState(state => state.pauseCodeHighlight = true)
                              setTimeout(() => {
                                t.store.setState(state => {
                                  state.pauseCodeHighlight = false
                                  state.refreshHighlight = !state.refreshHighlight
                                })
                              }, 30)
                            }
                          }, 300)
                        }}
                        options={[
                          {label: 'dracula', value: 'dracula'},
                          {label: 'css-variables', value: 'css-variables'},
                          {label: 'dark-plus', value: 'dark-plus'},
                          {label: 'github-dark', value: 'github-dark'},
                          {label: 'github-dark-dimmed', value: 'github-dark-dimmed'},
                          {label: 'material-theme', value: 'material-theme'},
                          {label: 'material-theme-darker', value: 'material-theme-darker'},
                          {label: 'material-theme-ocean', value: 'material-theme-ocean'},
                          {label: 'material-theme-palenight', value: 'material-theme-palenight'},
                          {label: 'min-dark', value: 'min-dark'},
                          {label: 'monokai', value: 'monokai'},
                          {label: 'one-dark-pro', value: 'one-dark-pro'},
                          {label: 'vitesse-dark', value: 'vitesse-dark'},
                        ]}
                      />
                    </div>
                  </div>
                  <div className={'flex justify-between items-center py-3'}>
                    <div className={'text-sm'}>
                      {configStore.zh ? '拼写检查' : 'Spell Check'}
                    </div>
                    <div>
                      <Checkbox checked={configStore.config.spellCheck}
                                onChange={e => configStore.setConfig('spellCheck', e.target.checked)}/>
                    </div>
                  </div>
                  <div className={'flex justify-between items-center py-3'}>
                    <div className={'text-sm'}>
                      <span className={'mr-1'}>{configStore.zh ? '显示浮动栏' : 'Show floating bar'}</span>
                      <Help text={
                        configStore.zh ? '选中文字不再显示浮动栏，仍然可以可以使用"格式"菜单中的快捷键操作文字格式，或使用Markdown语法转换' :
                          'Selecting text will no longer display a floating bar, and you can still use the shortcut keys in the "Format" menu to manipulate text formatting or use Markdown syntax conversion'
                      }/>
                    </div>
                    <div>
                      <Checkbox checked={configStore.config.showFloatBar}
                                onChange={e => configStore.setConfig('showFloatBar', e.target.checked)}/>
                    </div>
                  </div>
                  <div className={'flex justify-between items-center py-3'}>
                    <div className={'text-sm'}>
                      <span className={'mr-1'}>{configStore.zh ? '黏贴文件重命名' : 'Paste file to rename'}</span>
                      <Help text={
                        configStore.zh ? '黏贴图片至编辑区，显示保存文件重命名弹窗' :
                          'Paste the image into the editing area and display the save file rename pop-up window'
                      }/>
                    </div>
                    <div>
                      <Checkbox checked={configStore.config.renameFileWhenSaving}
                                onChange={e => configStore.setConfig('renameFileWhenSaving', e.target.checked)}/>
                    </div>
                  </div>
                  <div className={'flex justify-between items-center py-3'}>
                    <div className={'text-sm'}>
                      {configStore.zh ? '编辑区文字大小' : 'Edit area text size'}
                    </div>
                    <div className={'w-32'}>
                      <Slider
                        value={configStore.config.editorTextSize} min={14} max={18} marks={{14: '14', 18: '18'}}
                        onChange={e => {
                          configStore.setConfig('editorTextSize', e)
                        }}
                      />
                    </div>
                  </div>
                </div>
              }
            </div>
          </div>
        </div>
      </div>
    </div>
  )
})
