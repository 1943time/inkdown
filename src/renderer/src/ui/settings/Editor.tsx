import { observer } from 'mobx-react-lite'
import { Checkbox, Radio, Slider } from 'antd'
import { useStore } from '@/store/store'
import { TextHelp } from '../common/HelpText'
import { useTranslation } from 'react-i18next'

export const SetEditor = observer(() => {
  const store = useStore()
  const { t } = useTranslation()
  return (
    <div className={'divide-y divide-gray-200 dark:divide-gray-200/10 px-2'}>
      <div className={'flex justify-between items-center py-3'}>
        <div className={'text-sm'}>
          <span className={'mr-1'}>{t('settings.theme')}</span>
        </div>
        <div>
          <Radio.Group
            value={store.settings.state.theme}
            onChange={(e) => {
              store.settings.setSetting('theme', e.target.value)
            }}
            options={[
              {
                label: t('settings.theme_system'),
                value: 'system'
              },
              {
                label: t('settings.theme_light'),
                value: 'light'
              },
              {
                label: t('settings.theme_dark'),
                value: 'dark'
              }
            ]}
          />
        </div>
      </div>
      <div className={'flex justify-between items-center py-3'}>
        <div className={'text-sm flex items-center'}>
          <span className={'mr-1'}>{t('settings.show_outline')}</span>
          <TextHelp text={t('settings.show_outline_help')} />
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
        <div className={'text-sm'}>{t('settings.outline_max_width')}</div>
        <div>
          <Slider
            className={'w-64'}
            value={store.settings.state.headingWidth}
            min={260}
            max={400}
            styles={{
              root: { zIndex: 2210 }
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
          <span>{t('settings.reduce_filename_input')}</span>
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
        <div className={'text-sm'}>{t('settings.code_fence_tabsize')}</div>
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
        <div className={'text-sm'}>{t('settings.code_auto_break')}</div>
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
        <div className={'text-sm'}>{t('settings.spell_check')}</div>
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
          <span className={'mr-1'}>{t('settings.use_dollar_formula')}</span>
          <TextHelp text={t('settings.use_dollar_formula_help')} />
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
