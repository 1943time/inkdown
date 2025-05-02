import { observer } from 'mobx-react-lite'
import { Checkbox, Radio, Slider } from 'antd'
import { useStore } from '@/store/store'
import { TextHelp } from '../common/HelpText'

export const SetEditor = observer(() => {
  const store = useStore()
  return (
    <div className={'divide-y divide-gray-200 dark:divide-gray-200/10 px-2'}>
      <div className={'flex justify-between items-center py-3'}>
        <div className={'text-sm'}>
          <span className={'mr-1'}>主题</span>
        </div>
        <div>
          <Radio.Group
            value={store.settings.state.theme}
            onChange={(e) => {
              store.settings.setSetting('theme', e.target.value)
            }}
            options={[
              {
                label: '系统',
                value: 'system'
              },
              {
                label: '亮色',
                value: 'light'
              },
              {
                label: '暗色',
                value: 'dark'
              }
            ]}
          />
        </div>
      </div>
      <div className={'flex justify-between items-center py-3'}>
        <div className={'text-sm flex items-center'}>
          <span className={'mr-1'}>显示大纲</span>
          <TextHelp
            text={
              'The document level 1-4 headings will be generated as an outline on the right side of the editing area.'
            }
          />
        </div>
        <div>
          <Checkbox
            checked={store.settings.state.showHeading}
            onChange={(e) => {
              store.settings.setSetting('showHeading', e.target.checked)
            }}
          />
        </div>
      </div>
      <div className={'flex justify-between items-center py-3'}>
        <div className={'text-sm'}>大纲最大宽度</div>
        <div>
          <Slider
            className={'w-64'}
            value={store.settings.state.headingWidth}
            min={260}
            max={400}
            tooltip={{
              overlayStyle: { zIndex: 2210 }
            }}
            marks={{ 260: '260', 400: '400' }}
            step={20}
            onChange={(e) => {
              store.settings.setSetting('headingWidth', e)
            }}
          />
        </div>
      </div>
      <div className={'flex justify-between items-center py-3'}>
        <div className={'text-sm'}>
          <span>减小编辑器中文件名的输入框大小</span>
        </div>
        <div>
          <Checkbox
            checked={store.settings.state.reduceFileName}
            onChange={(e) => {
              store.settings.setSetting('reduceFileName', e.target.checked)
            }}
          />
        </div>
      </div>
      <div className={'flex justify-between items-center py-3'}>
        <div className={'text-sm'}>{'代码围栏 TabSize'}</div>
        <div>
          <Radio.Group
            value={store.settings.state.codeTabSize}
            onChange={(e) => {
              store.settings.setSetting('codeTabSize', e.target.value)
            }}
          >
            <Radio value={2}>2</Radio>
            <Radio value={4}>4</Radio>
          </Radio.Group>
        </div>
      </div>
      <div className={'flex justify-between items-center py-3'}>
        <div className={'text-sm'}>{'代码自动换行'}</div>
        <div>
          <Checkbox
            checked={store.settings.state.codeAutoBreak}
            onChange={(e) => {
              store.settings.setSetting('codeAutoBreak', e.target.checked)
            }}
          ></Checkbox>
        </div>
      </div>
      <div className={'flex justify-between items-center py-3'}>
        <div className={'text-sm'}>拼写检查</div>
        <div>
          <Checkbox
            checked={store.settings.state.spellCheck}
            onChange={(e) => {
              store.settings.setSetting('spellCheck', e.target.checked)
            }}
          />
        </div>
      </div>
      <div className={'flex justify-between items-center py-3'}>
        <div className={'text-sm flex items-center'}>
          <span className={'mr-1'}>{'Use $ to convert inline formulas'}</span>
          <TextHelp
            text={
              'Enter $content$ and convert the content into an inline formula using the last $ character.'
            }
          />
        </div>
        <div>
          <Checkbox
            checked={store.settings.state.autoConvertInlineFormula}
            onChange={(e) =>
              store.settings.setSetting('autoConvertInlineFormula', e.target.checked)
            }
          />
        </div>
      </div>
    </div>
  )
})
