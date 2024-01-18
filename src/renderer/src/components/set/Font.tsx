import {observer} from 'mobx-react-lite'
import {configStore} from '../../store/config'
import {Select} from 'antd'
import {useMemo} from 'react'
import {isMac} from '../../utils'
const fonts = [
  {label: 'System', value: 'system', platform: ['mac', 'win']},
  {label: 'Lucida', value: 'lucida', platform: ['mac', 'win']},
  {label: 'Helvetica', value: 'helvetica', platform: ['mac']},
  {label: 'Hiragino Sans GB', value: 'hiragino-sans-gb', platform: ['mac']},
  {label: 'Heiti SC', value: 'heiti-sc', platform: ['mac']},
  {label: 'Times New Roman', value: 'times-new-roman', platform: ['mac']},
  {label: 'PingFang SC', value: 'pingfang-sc', platform: ['mac']},
  {label: 'Microsoft Yahei', value: 'microsoft-yahei', platform: ['win']},
  {label: 'Tahoma', value: 'tahoma', platform: ['win']},
  {label: 'SimSun', value: 'simsun', platform: ['win']},
  {label: 'Arial', value: 'arial', platform: ['win']},
  {label: 'Verdana', value: 'verdana', platform: ['win']}
]
const winOptions = fonts.filter(f => f.platform.includes('win')).map(f => ({label: f.label, value: f.value}))
const macOptions = fonts.filter(f => f.platform.includes('mac')).map(f => ({label: f.label, value: f.value}))
export const InterfaceFont = observer(() => {
  const showFonts = useMemo(() => {
    return isMac ? macOptions : winOptions
  }, [])
  if (configStore.config.isLinux) return null
  return (
    <div className={'flex justify-between items-center py-3'}>
      <div className={'text-sm'}>
        {configStore.zh ? '界面字体' : 'Interface Font'}
      </div>
      <div>
        <Select
          value={configStore.config.interfaceFont}
          className={'w-[220px]'}
          onChange={e => {
            configStore.setInterfaceFont(e)
          }}
          options={showFonts}
        />
      </div>
    </div>
  )
})

export const EditorFont = observer(() => {
  const showFonts = useMemo(() => {
    return isMac ? macOptions : winOptions
  }, [])
  if (configStore.config.isLinux) return null
  return (
    <div className={'flex justify-between items-center py-3'}>
      <div className={'text-sm'}>
        {configStore.zh ? '编辑区字体' : 'Edit area font'}
      </div>
      <div>
        <Select
          value={configStore.config.editorFont}
          className={'w-[220px]'}
          onChange={e => {
            configStore.setConfig('editorFont', e)
          }}
          options={showFonts}
        />
      </div>
    </div>
  )
})
