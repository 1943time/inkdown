import {observer} from 'mobx-react-lite'
import {Checkbox, Modal, Radio, Select, Slider} from 'antd'
import {CloseOutlined} from '@ant-design/icons'
import {configStore} from '../store/config'
import {useCallback, useEffect} from 'react'
import {action} from 'mobx'
import {MainApi} from '../api/main'

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
    <div className={`fixed inset-0 z-[100] dark:bg-black/30 bg-black/10`}>
      {context}
      <div
        className={'w-full h-full flex items-center justify-center overflow-auto'}
        onClick={close}
      >
        <div
          className={'w-[500px] modal-panel p-4'}
          onClick={(e) => e.stopPropagation()}
        >
          <div className={'flex justify-between text-gray-500 dark:text-gray-400 border-b modal-border pb-2 items-center'}>
            <span>{configStore.isZh ? '偏好设置' : 'Preferences'}</span>
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
                {configStore.isZh ? '语言环境' : 'Locale'}
              </div>
              <div>
                <Radio.Group
                  value={configStore.config.locale}
                  onChange={e => {
                    configStore.setConfig('locale', e.target.value)
                    modal.confirm({
                      type: 'info',
                      title: configStore.isZh ? '提示' : 'Prompt',
                      content: configStore.isZh ? '语言模式设置在重启编辑器后生效，是否立即起重启？' : 'The Locale setting takes effect after restarting the editor, whether to restart immediately?',
                      onOk: () => {
                        MainApi.relaunch()
                      }
                    })
                  }}
                >
                  <Radio.Button value={'en'}>{configStore.isZh ? '英文' : 'English'}</Radio.Button>
                  <Radio.Button value={'zh'}>{configStore.isZh ? '中文' : 'Chinese'}</Radio.Button>
                </Radio.Group>
              </div>
            </div>
            <div className={'flex justify-between items-center py-3'}>
              <div className={'text-sm'}>
                {configStore.isZh ? '颜色模式' : 'Themes'}
              </div>
              <div>
                <Radio.Group
                  value={configStore.config.theme}
                  onChange={e => {
                    configStore.setTheme(e.target.value)
                  }}
                >
                  <Radio.Button value={'system'}>{configStore.isZh ? '系统' : 'System'}</Radio.Button>
                  <Radio.Button value={'light'}>{configStore.isZh ? '明亮' : 'Light'}</Radio.Button>
                  <Radio.Button value={'dark'}>{configStore.isZh ? '暗黑' : 'Dark'}</Radio.Button>
                </Radio.Group>
              </div>
            </div>
            <div className={'flex justify-between items-center py-3'}>
              <div className={'text-sm'}>
                {configStore.isZh ? '代码段显示行号' : 'Show Code Line Number'}
              </div>
              <div>
                <Checkbox checked={configStore.config.codeLineNumber} onChange={e => configStore.setConfig('codeLineNumber', e.target.checked)}/>
              </div>
            </div>
            <div className={'flex justify-between items-center py-3'}>
              <div className={'text-sm'}>
                {configStore.isZh ? '显示字符统计' : 'Displays character statistics'}
              </div>
              <div>
                <Checkbox checked={configStore.config.showCharactersCount} onChange={e => configStore.setConfig('showCharactersCount', e.target.checked)}/>
              </div>
            </div>
            <div className={'flex justify-between items-center py-3'}>
              <div className={'text-sm'}>
                {configStore.isZh ? '代码段TabSize' : 'Code TabSize'}
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
                {configStore.isZh ? '代码段风格' : 'Code Style'}
              </div>
              <div>
                <Select
                  value={configStore.config.codeTheme}
                  className={'w-[220px]'}
                  onChange={e => {
                    configStore.setConfig('codeTheme', e)
                    modal.confirm({
                      type: 'info',
                      title: configStore.isZh ? '提示' : 'Prompt',
                      content: configStore.isZh ? '代码风格设置在重启编辑器后生效，是否立即起重启？' : 'The code style setting takes effect after restarting the editor, do you want to restart immediately?',
                      onOk: () => {
                        MainApi.relaunch()
                      }
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
                {configStore.isZh ? '编辑区文字大小' : 'Edit area text size'}
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
                {configStore.isZh ? '显示大纲' : 'Display the Outline'}
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
                {configStore.isZh ? '大纲提取级别' : 'Outline extraction level'}

              </div>
              <div>
                <Radio.Group
                  value={configStore.config.leadingLevel}
                  onChange={e => {
                    configStore.setConfig('leadingLevel', e.target.value)
                  }}
                >
                  <Radio value={2}>{configStore.isZh ? '二级' : 'Level 2'}</Radio>
                  <Radio value={3}>{configStore.isZh ? '三级' : 'Level 3'}</Radio>
                  <Radio value={4}>{configStore.isZh ? '四级' : 'Level 4'}</Radio>
                </Radio.Group>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
})
