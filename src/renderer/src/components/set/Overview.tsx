import { observer } from 'mobx-react-lite'
import { Button, Checkbox, Modal, Radio, Select, Slider, Space } from 'antd'
import { LinkOutlined } from '@ant-design/icons'
import { useLocalState } from '../../hooks/useLocalState'
import { useEffect } from 'react'
import { TextHelp } from './Help'
import { InterfaceFont } from './Font'
import { useCoreContext } from '../../store/core'
import { useTranslation } from 'react-i18next'

export const Overview = observer(() => {
  const core = useCoreContext()
  const {t} = useTranslation()
  const [state, setState] = useLocalState({
    version: ''
  })
  const [modal, context] = Modal.useModal()
  useEffect(() => {
    window.electron.ipcRenderer.invoke('get-version').then(res => {
      setState({version: res})
    })
  }, [core.config.visible])
  return (
    <div
      className={
        'divide-y divide-gray-200 dark:divide-gray-200/10 text-gray-600 dark:text-gray-300 px-4 py-2 h-[550px] overflow-y-auto'
      }
    >
      {context}
      <div className={'flex justify-between items-center py-3'}>
        <div className={'text-sm'}>
          Version: {state.version}
        </div>
        <div>
          <Button
            icon={<LinkOutlined />}
            onClick={() => {
              window.open('https://github.com/1943time/inkdown/releases')
            }}
          >
            {t('config.releaseRecord')}
          </Button>
        </div>
      </div>
      <div className={'flex justify-between items-center py-3'}>
        <div className={'text-sm'}>{'Language'}</div>
        <div>
          <Select
            value={core.config.config.locale}
            className={'w-36'}
            options={[
              { label: 'English', value: 'en' },
              { label: '简体中文', value: 'zh' }
            ]}
            onChange={(e) => {
              core.config.setConfig('locale', e)
              modal.info({
                title: t('note'),
                content: t('config.changeLocalTip')
              })
            }}
          ></Select>
        </div>
      </div>
      <div className={'flex justify-between items-center py-3'}>
        <div className={'text-sm'}>{t('config.themes')}</div>
        <div>
          <Radio.Group
            value={core.config.config.theme}
            onChange={async (e) => {
              await core.config.setTheme(e.target.value)
              if (core.config.config.codeTheme === 'auto') {
                core.config.reloadHighlighter(true)
              }
            }}
          >
            <Radio.Button value={'system'}>{t('config.theme.system')}</Radio.Button>
            <Radio.Button value={'light'}>{t('config.theme.light')}</Radio.Button>
            <Radio.Button value={'dark'}>{t('config.theme.system')}</Radio.Button>
          </Radio.Group>
        </div>
      </div>
      <InterfaceFont />
      <div className={'flex justify-between items-center py-3'}>
        <div className={'text-sm'}>
          <span className={'mr-1'}>{t('config.showOutline')}</span>
          <TextHelp
            text={t('config.showOutlineTip')}
          />
        </div>
        <div>
          <Checkbox
            checked={core.config.config.showLeading}
            onChange={(e) => {
              core.config.toggleShowLeading()
            }}
          />
        </div>
      </div>
      <div className={'flex justify-between items-center py-3'}>
        <div className={'text-sm'}>{t('config.showHiddenFiles')}</div>
        <div>
          <Checkbox
            checked={core.config.config.showHiddenFiles}
            onChange={(e) => core.config.setConfig('showHiddenFiles', e.target.checked)}
          />
        </div>
      </div>
      <div className={'flex justify-between items-center py-3'}>
        <div className={'text-sm'}>
          <span className={'mr-1'}>
            {t('config.autoOpenSpace')}
          </span>
          <TextHelp
            text={t('config.autoOpenSpaceTip')}
          />
        </div>
        <div>
          <Checkbox
            checked={core.config.config.autoOpenSpace}
            onChange={(e) => core.config.setConfig('autoOpenSpace', e.target.checked)}
          />
        </div>
      </div>
      <div className={'flex justify-between items-center py-3'}>
        <div className={'text-sm'}>
          {t('config.editorWidth')}
        </div>
        <div className={'flex items-center'}>
          <Space.Compact>
            <Slider
              className={'w-64'}
              value={core.config.config.editorWidth}
              min={700}
              max={1000}
              marks={{ 700: 'Recommend', 1000: 'Max' }}
              step={20}
              onChange={(e) => {
                core.config.setConfig('editorWidth', e)
              }}
            />
          </Space.Compact>
        </div>
      </div>
      <div className={'flex justify-between items-center py-3'}>
        <div className={'text-sm'}>{t('config.outlineWidth')}</div>
        <div>
          <Slider
            className={'w-64'}
            value={core.config.config.leadingWidth}
            min={260}
            max={400}
            marks={{ 260: '260', 400: '400' }}
            step={20}
            onChange={(e) => {
              core.config.setConfig('leadingWidth', e)
            }}
          />
        </div>
      </div>
    </div>
  )
})
