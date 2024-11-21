import {observer} from 'mobx-react-lite'
import {Select} from 'antd'
import {useMemo} from 'react'
import {isMac} from '../../utils'
import { useCoreContext } from '../../store/core'
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
  const core = useCoreContext()
  const showFonts = useMemo(() => {
    return isMac ? macOptions : winOptions
  }, [])
  if (core.config.config.isLinux) return null
  return (
    <div className={'flex justify-between items-center py-3'}>
      <div className={'text-sm'}>
        {core.config.zh ? '界面字体' : 'Interface Font'}
      </div>
      <div>
        <Select
          value={core.config.config.interfaceFont}
          className={'w-[220px]'}
          onChange={e => {
            core.config.setInterfaceFont(e)
          }}
          options={showFonts}
        />
      </div>
    </div>
  )
})

export const EditorFont = observer(() => {
  const core = useCoreContext()
  const showFonts = useMemo(() => {
    return isMac ? macOptions : winOptions
  }, [])
  if (core.config.config.isLinux) return null
  return (
    <div className={'flex justify-between items-center py-3'}>
      <div className={'text-sm'}>
        {core.config.zh ? '编辑区字体' : 'Edit area font'}
      </div>
      <div>
        <Select
          value={core.config.config.editorFont}
          className={'w-[220px]'}
          onChange={e => {
            core.config.setConfig('editorFont', e)
          }}
          options={showFonts}
        />
      </div>
    </div>
  )
})
