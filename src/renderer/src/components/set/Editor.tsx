import { observer } from 'mobx-react-lite'
import { Button, Checkbox, Input, Radio, Select, Slider, Space } from 'antd'
import { TextHelp } from './Help'
import { EditorFont } from './Font'
import { codeThemes } from '../../editor/utils/highlight'
import { useEffect } from 'react'
import { useLocalState } from '../../hooks/useLocalState'
import { message$ } from '../../utils'
import { useCoreContext } from '../../store/core'
import { useTranslation } from 'react-i18next'

export const SetEditor = observer(() => {
  const core = useCoreContext()
  const {t} = useTranslation()
  const [state, setState] = useLocalState({
    imgBedRoute: ''
  })
  useEffect(() => {
    setState({
      imgBedRoute: localStorage.getItem('pick-route') || ''
    })
  }, [])
  return (
    <div
      className={
        'divide-y divide-gray-200 dark:divide-gray-200/10 text-gray-600 dark:text-gray-300 px-4 py-2 h-[550px] overflow-y-auto'
      }
    >
      <div className={'flex justify-between items-center py-3'}>
        <div className={'text-sm'}>
          <span className={'mr-1'}>
            {t('autoDownload')}
          </span>
          <TextHelp
            text={t('autoDownloadTip')}
          />
        </div>
        <div>
          <Checkbox
            checked={core.config.config.autoDownload}
            onChange={(e) => core.config.setConfig('autoDownload', e.target.checked)}
          />
        </div>
      </div>
      <EditorFont />
      <div className={'flex justify-between items-center py-3'}>
        <div className={'text-sm'}>{t('lineHeight')}</div>
        <div>
          <Radio.Group
            value={core.config.config.editorLineHeight}
            onChange={(e) => {
              core.config.setConfig('editorLineHeight', e.target.value)
            }}
          >
            <Radio value={'compact'}>{t('lineCompact')}</Radio>
            <Radio value={'default'}>{t('lineDef')}</Radio>
            <Radio value={'loose'}>{t('lineLoose')}</Radio>
          </Radio.Group>
        </div>
      </div>
      <div className={'flex justify-between items-center py-3'}>
        <div className={'text-sm'}>{t('codeTabSize')}</div>
        <div>
          <Radio.Group
            value={core.config.config.codeTabSize}
            onChange={(e) => {
              core.config.setConfig('codeTabSize', e.target.value)
            }}
          >
            <Radio value={2}>2</Radio>
            <Radio value={4}>4</Radio>
          </Radio.Group>
        </div>
      </div>
      <div className={'flex justify-between items-center py-3'}>
        <div className={'text-sm'}>{t('codeStyle')}</div>
        <div>
          <Select
            value={core.config.config.codeTheme}
            className={'w-[220px]'}
            onChange={(e) => {
              core.config.setConfig('codeTheme', e)
              core.config.reloadHighlighter(true)
            }}
            options={[
              { label: 'auto', value: 'auto' },
              ...Array.from(codeThemes).map((v) => ({ label: v, value: v }))
            ]}
          />
        </div>
      </div>
      <div className={'flex justify-between items-center py-3'}>
        <div className={'text-sm'}>{t('codeAutoWrap')}</div>
        <div>
          <Checkbox
            checked={core.config.config.codeAutoBreak}
            onChange={(e) => {
              core.config.setConfig('codeAutoBreak', e.target.checked)
            }}
          ></Checkbox>
        </div>
      </div>
      <div className={'py-3'}>
        <div className={'flex justify-between items-center'}>
          <div className={'text-sm'}>{t('config.imageBed')}</div>
          <div>
            <Checkbox
              checked={core.config.config.turnOnImageBed}
              onChange={(e) => {
                core.config.setConfig('turnOnImageBed', e.target.checked)
                if (!e.target.checked) {
                  setState({ imgBedRoute: '' })
                  localStorage.removeItem('pick-route')
                  core.imageBed.route = ''
                }
              }}
            ></Checkbox>
          </div>
        </div>
        {core.config.config.turnOnImageBed && (
          <div className={'flex items-center mt-3 text-sm'}>
            <div>
              <span className={'mr-1'}>PickGo(PicList)</span>
              <TextHelp
                text={
                  <>
                    <span>An image upload and manage tool</span>
                    <a
                      className={'link mx-1'}
                      href={'https://github.com/Kuingsmile/PicList'}
                      target={'_blank'}
                    >
                      Details.
                    </a>
                    <span>
                      When enabled, adding images will automatically upload and use the network
                      address.
                    </span>
                  </>
                }
              />
            </div>
            <Space.Compact className={'flex-1 ml-4'}>
              <Input
                value={state.imgBedRoute}
                onChange={(e) => {
                  setState({ imgBedRoute: e.target.value })
                }}
                placeholder={'Upload Route: http://127.0.0.1:36677/upload?key=[optional]'}
              />
              <Button
                onClick={() => {
                  if (!state.imgBedRoute || !/^https?:\/\//i.test(state.imgBedRoute)) {
                    message$.next({
                      type: 'warning',
                      content: t('httpInvalid')
                    })
                  } else {
                    localStorage.setItem('pick-route', state.imgBedRoute)
                    message$.next({
                      type: 'success',
                      content: t('saveSuccess')
                    })
                    core.imageBed.initial()
                  }
                }}
              >
                {t('save')}
              </Button>
            </Space.Compact>
          </div>
        )}
      </div>
      <div className={'flex justify-between items-center py-3'}>
        <div className={'text-sm'}>{t('spellCheck')}</div>
        <div>
          <Checkbox
            checked={core.config.config.spellCheck}
            onChange={(e) => core.config.setConfig('spellCheck', e.target.checked)}
          />
        </div>
      </div>
      <div className={'flex justify-between items-center py-3'}>
        <div className={'text-sm'}>{t('editorFontSize')}</div>
        <div className={'w-32'}>
          <Slider
            value={core.config.config.editorTextSize}
            min={14}
            max={18}
            marks={{ 14: '14', 18: '18' }}
            onChange={(e) => {
              core.config.setConfig('editorTextSize', e)
            }}
          />
        </div>
      </div>
    </div>
  )
})
