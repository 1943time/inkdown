import {observer} from 'mobx-react-lite'
import {Checkbox, Modal, Radio, Select, Slider, Tooltip} from 'antd'
import {CloseOutlined, QuestionCircleOutlined} from '@ant-design/icons'
import {configStore} from '../store/config'
import {ReactNode, useCallback, useEffect} from 'react'
import {action} from 'mobx'

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
  useEffect(() => {
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
          className={'min-w-[500px] modal-panel p-4 w-4/5 max-w-[800px]'}
          onClick={(e) => e.stopPropagation()}
        >
          <div className={'flex justify-between text-gray-500 dark:text-gray-400 border-b modal-border pb-2 items-center'}>
            <span>{'Preferences'}</span>
            <div
              className={'p-1 hover:text-gray-700 dark:hover:text-gray-300 duration-200 hover:bg-gray-100 rounded dark:hover:bg-gray-500/30'}
              onClick={close}
            >
              <CloseOutlined />
            </div>
          </div>
          <div className={'divide-y divide-gray-200 dark:divide-gray-200/20 text-gray-600 dark:text-gray-300'}>
            <div className={'flex justify-between items-center py-3'}>
              <div className={'text-sm'}>
                {'Themes'}
              </div>
              <div>
                <Radio.Group
                  value={configStore.config.theme}
                  onChange={e => {
                    configStore.setTheme(e.target.value)
                  }}
                >
                  <Radio.Button value={'system'}>{'System'}</Radio.Button>
                  <Radio.Button value={'light'}>{'Light'}</Radio.Button>
                  <Radio.Button value={'dark'}>{'Dark'}</Radio.Button>
                </Radio.Group>
              </div>
            </div>
            <div className={'flex justify-between items-center py-3'}>
              <div className={'text-sm'}>
                <span className={'mr-1'}>Automatic Rebuild</span> <Help text={'When a file or folder is renamed or moved, its related dependent links or image paths will automatically change'}/>
              </div>
              <div>
                <Checkbox checked={configStore.config.autoRebuild} onChange={e => configStore.setConfig('autoRebuild', e.target.checked)}/>
              </div>
            </div>
            <div className={'flex justify-between items-center py-3'}>
              <div className={'text-sm'}>
                Heading Mark Line
              </div>
              <div>
                <Checkbox checked={configStore.config.headingMarkLine} onChange={e => configStore.setConfig('headingMarkLine', e.target.checked)}/>
              </div>
            </div>
            <div className={'flex justify-between items-center py-3'}>
              <div className={'text-sm'}>
                Drag To Sort
              </div>
              <div>
                <Checkbox checked={configStore.config.dragToSort} onChange={e => configStore.setConfig('dragToSort', e.target.checked)}/>
              </div>
            </div>
            <div className={'flex justify-between items-center py-3'}>
              <div className={'text-sm'}>
                {'Show Code Line Number'}
              </div>
              <div>
                <Checkbox checked={configStore.config.codeLineNumber} onChange={e => configStore.setConfig('codeLineNumber', e.target.checked)}/>
              </div>
            </div>
            <div className={'flex justify-between items-center py-3'}>
              <div className={'text-sm'}>
                {'Displays character statistics'}
              </div>
              <div>
                <Checkbox checked={configStore.config.showCharactersCount} onChange={e => configStore.setConfig('showCharactersCount', e.target.checked)}/>
              </div>
            </div>
            <div className={'flex justify-between items-center py-3'}>
              <div className={'text-sm'}>
                Spell Check
              </div>
              <div>
                <Checkbox checked={configStore.config.spellCheck} onChange={e => configStore.setConfig('spellCheck', e.target.checked)}/>
              </div>
            </div>
            <div className={'flex justify-between items-center py-3'}>
              <div className={'text-sm'}>
                {'Code TabSize'}
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
                {'Code Style'}
              </div>
              <div>
                <Select
                  value={configStore.config.codeTheme}
                  className={'w-[220px]'}
                  onChange={e => {
                    configStore.setConfig('codeTheme', e)
                    modal.info({
                      title: 'Note',
                      content: 'Code style settings will take effect after restarting applications'
                    })
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
                {'Edit area text size'}
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
            <div className={'flex justify-between items-center py-3'}>
              <div className={'text-sm'}>
                {'Show Outline'}
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
                {'Outline extraction level'}
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
        </div>
      </div>
    </div>
  )
})
