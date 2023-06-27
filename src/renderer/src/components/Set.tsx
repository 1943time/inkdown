import {observer} from 'mobx-react-lite'
import {Checkbox, Modal, Radio, Select, Slider} from 'antd'
import {CloseOutlined} from '@ant-design/icons'
import {configStore} from '../store/config'
import {useCallback} from 'react'
import {action} from 'mobx'
import {MainApi} from '../api/main'

export const Set = observer(() => {
  const close = useCallback(action(() => {
    configStore.visible = false
  }), [])
  const [modal, context] = Modal.useModal()
  if (!configStore.visible) return null
  return (
    <div className={`fixed inset-0 z-[100] bg-black/50`}>
      {context}
      <div
        className={'w-full h-full flex items-center justify-center overflow-auto'}
        onClick={close}
      >
        <div
          className={'w-[500px] bg-white dark:bg-zinc-900 rounded border-gray-200 dark:border-gray-700 border p-4'}
          onClick={(e) => e.stopPropagation()}
        >
          <div className={'flex justify-between text-gray-500 dark:text-gray-400 border-b border-gray-200 dark:border-gray-700 pb-2 items-center'}>
            <span>偏好设置</span>
            <div
              className={'p-1 hover:text-gray-700 dark:hover:text-gray-300 duration-200 hover:bg-gray-100/60 rounded dark:hover:bg-gray-500/30'}
              onClick={close}
            >
              <CloseOutlined />
            </div>
          </div>
          <div className={'divide-y divide-gray-200 dark:divide-gray-700 text-gray-600 dark:text-gray-300'}>
            <div className={'flex justify-between items-center py-3'}>
              <div className={'text-sm'}>
                颜色模式
              </div>
              <div>
                <Radio.Group
                  value={configStore.config.theme}
                  onChange={e => {
                    configStore.setTheme(e.target.value)
                  }}
                >
                  <Radio.Button value={'system'}>系统</Radio.Button>
                  <Radio.Button value={'light'}>明亮</Radio.Button>
                  <Radio.Button value={'dark'}>暗黑</Radio.Button>
                </Radio.Group>
              </div>
            </div>
            <div className={'flex justify-between items-center py-3'}>
              <div className={'text-sm'}>
                代码段显示行号
              </div>
              <div>
                <Checkbox checked={configStore.config.codeLineNumber} onChange={e => configStore.setConfig('codeLineNumber', e.target.checked)}/>
              </div>
            </div>
            <div className={'flex justify-between items-center py-3'}>
              <div className={'text-sm'}>
                代码段TabSize
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
                代码段风格
              </div>
              <div>
                <Select
                  value={configStore.config.codeTheme}
                  className={'w-[220px]'}
                  onChange={e => {
                    configStore.setConfig('codeTheme', e)
                    modal.confirm({
                      type: 'info',
                      cancelText: '取消',
                      okText: '确定',
                      title: '提示',
                      content: '代码风格设置在重启编辑器后生效，是否立即起重启？',
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
                编辑区文字大小
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
                显示大纲
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
                大纲提取级别
              </div>
              <div>
                <Radio.Group
                  value={configStore.config.leadingLevel}
                  onChange={e => {
                    configStore.setConfig('leadingLevel', e.target.value)
                  }}
                >
                  <Radio value={2}>二级</Radio>
                  <Radio value={3}>三级</Radio>
                  <Radio value={4}>四级</Radio>
                </Radio.Group>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
})
