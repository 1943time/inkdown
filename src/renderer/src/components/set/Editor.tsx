import { observer } from 'mobx-react-lite'
import { configStore } from '../../store/config'
import { Button, Checkbox, Input, Radio, Select, Slider, Space } from 'antd'
import { TextHelp } from './Help'
import { EditorFont } from './Font'
import { codeThemes } from '../../editor/utils/highlight'
import { useEffect } from 'react'
import { useLocalState } from '../../hooks/useLocalState'
import { message$ } from '../../utils'
import { imageBed } from '../../utils/imageBed'

export const SetEditor = observer(() => {
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
          <span className={'mr-1'}>{configStore.zh ? '自动重建' : 'Automatic rebuild'}</span>{' '}
          <TextHelp
            text={
              configStore.zh
                ? '重命名或移动文件或文件夹时，文档引入的相关链接与图片路径将自动更改'
                : 'When renaming or moving files or folders, the relevant links and image paths introduced by the document will automatically change'
            }
          />
        </div>
        <div>
          <Checkbox
            checked={configStore.config.autoRebuild}
            onChange={(e) => configStore.setConfig('autoRebuild', e.target.checked)}
          />
        </div>
      </div>
      <div className={'flex justify-between items-center py-3'}>
        <div className={'text-sm'}>
          <span className={'mr-1'}>
            {configStore.zh ? '自动下载图片' : 'Automatically download images'}
          </span>
          <TextHelp
            text={
              configStore.zh
                ? '粘贴网页元素或Markdown代码时自动下载网络图像并将其转换为本机地址'
                : 'Automatically download and convert network images to local addresses when pasting webpage elements or markdown code'
            }
          />
        </div>
        <div>
          <Checkbox
            checked={configStore.config.autoDownload}
            onChange={(e) => configStore.setConfig('autoDownload', e.target.checked)}
          />
        </div>
      </div>
      <div className={'flex justify-between items-center py-3'}>
        <div className={'text-sm'}>{configStore.zh ? '拖拽排序' : 'Drag to sort'}</div>
        <div>
          <Checkbox
            checked={configStore.config.dragToSort}
            onChange={(e) => configStore.setConfig('dragToSort', e.target.checked)}
          />
        </div>
      </div>
      <EditorFont />
      <div className={'flex justify-between items-center py-3'}>
        <div className={'text-sm'}>{configStore.zh ? '段落行高' : 'Paragraph line height'}</div>
        <div>
          <Radio.Group
            value={configStore.config.editorLineHeight}
            onChange={(e) => {
              configStore.setConfig('editorLineHeight', e.target.value)
            }}
          >
            <Radio value={'compact'}>{configStore.zh ? '紧凑' : 'Compact'}</Radio>
            <Radio value={'default'}>{configStore.zh ? '默认' : 'Default'}</Radio>
            <Radio value={'loose'}>{configStore.zh ? '宽松' : 'Loose'}</Radio>
          </Radio.Group>
        </div>
      </div>
      <div className={'flex justify-between items-center py-3'}>
        <div className={'text-sm'}>
          {configStore.zh ? '显示代码段行号' : 'Show code line number'}
        </div>
        <div>
          <Checkbox
            checked={configStore.config.codeLineNumber}
            onChange={(e) => configStore.setConfig('codeLineNumber', e.target.checked)}
          />
        </div>
      </div>
      <div className={'flex justify-between items-center py-3'}>
        <div className={'text-sm'}>{configStore.zh ? '代码段 TabSize' : 'Code tab size'}</div>
        <div>
          <Radio.Group
            value={configStore.config.codeTabSize}
            onChange={(e) => {
              configStore.setConfig('codeTabSize', e.target.value)
            }}
          >
            <Radio value={2}>2</Radio>
            <Radio value={4}>4</Radio>
          </Radio.Group>
        </div>
      </div>
      <div className={'flex justify-between items-center py-3'}>
        <div className={'text-sm'}>{configStore.zh ? '代码风格' : 'Code style'}</div>
        <div>
          <Select
            value={configStore.config.codeTheme}
            className={'w-[220px]'}
            onChange={(e) => {
              configStore.setConfig('codeTheme', e)
              configStore.reloadHighlighter(true)
            }}
            options={[
              { label: 'auto', value: 'auto' },
              ...Array.from(codeThemes).map((v) => ({ label: v, value: v }))
            ]}
          />
        </div>
      </div>
      <div className={'py-3'}>
        <div className={'flex justify-between items-center'}>
          <div className={'text-sm'}>{configStore.zh ? '图床工具' : 'Image bed tool'}</div>
          <div>
            <Checkbox
              checked={configStore.config.turnOnImageBed}
              onChange={(e) => {
                configStore.setConfig('turnOnImageBed', e.target.checked)
                if (!e.target.checked) {
                  setState({ imgBedRoute: '' })
                  localStorage.removeItem('pick-route')
                  imageBed.route = ''
                }
              }}
            ></Checkbox>
          </div>
        </div>
        {configStore.config.turnOnImageBed && (
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
                      content: configStore.zh
                        ? '请输入正确http地址'
                        : 'Please enter the correct HTTP address'
                    })
                  } else {
                    localStorage.setItem('pick-route', state.imgBedRoute)
                    message$.next({
                      type: 'success',
                      content: configStore.zh ? '保存成功' : 'Successfully saved'
                    })
                    imageBed.initial()
                  }
                }}
              >
                {configStore.zh ? '保存' : 'Save'}
              </Button>
            </Space.Compact>
          </div>
        )}
      </div>
      <div className={'flex justify-between items-center py-3'}>
        <div className={'text-sm'}>{configStore.zh ? '拼写检查' : 'Spell check'}</div>
        <div>
          <Checkbox
            checked={configStore.config.spellCheck}
            onChange={(e) => configStore.setConfig('spellCheck', e.target.checked)}
          />
        </div>
      </div>
      <div className={'flex justify-between items-center py-3'}>
        <div className={'text-sm'}>
          <span className={'mr-1'}>{configStore.zh ? '高亮符号' : 'Highlight symbols'}</span>
          <TextHelp
            text={
              configStore.zh
                ? '括号和[@#$￥]等符号将高亮显示'
                : 'Brackets and symbols such as [@#$￥] will be highlighted'
            }
          />
        </div>
        <div>
          <Checkbox
            checked={configStore.config.symbolHighlight}
            onChange={(e) => configStore.setConfig('symbolHighlight', e.target.checked)}
          />
        </div>
      </div>
      <div className={'flex justify-between items-center py-3'}>
        <div className={'text-sm'}>{configStore.zh ? '编辑区文字大小' : 'Edit area text size'}</div>
        <div className={'w-32'}>
          <Slider
            value={configStore.config.editorTextSize}
            min={14}
            max={18}
            marks={{ 14: '14', 18: '18' }}
            onChange={(e) => {
              configStore.setConfig('editorTextSize', e)
            }}
          />
        </div>
      </div>
    </div>
  )
})
