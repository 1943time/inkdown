import {observer} from 'mobx-react-lite'
import {configStore} from '../../store/config'
import {Checkbox, Radio, Select, Slider} from 'antd'
import {treeStore} from '../../store/tree'
import {clearAllCodeCache} from '../../editor/plugins/useHighlight'
import {TextHelp} from './Help'
import {EditorFont} from './Font'
import {runInAction} from 'mobx'

export const SetEditor = observer(() => {
  return (
    <div
      className={'divide-y divide-gray-200 dark:divide-gray-200/10 text-gray-600 dark:text-gray-300 px-4 py-2 h-[600px] overflow-y-auto'}>
      <div className={'flex justify-between items-center py-3'}>
        <div className={'text-sm'}>
          <span className={'mr-1'}>{configStore.zh ? '自动重建' : 'Automatic rebuild'}</span> <TextHelp text={
          configStore.zh ? '重命名或移动文件或文件夹时，文档引入的相关链接与图片路径将自动更改' :
            'When renaming or moving files or folders, the relevant links and image paths introduced by the document will automatically change'
        }
        />
        </div>
        <div>
          <Checkbox checked={configStore.config.autoRebuild}
                    onChange={e => configStore.setConfig('autoRebuild', e.target.checked)}/>
        </div>
      </div>
      <div className={'flex justify-between items-center py-3'}>
        <div className={'text-sm'}>
                      <span
                        className={'mr-1'}>{configStore.zh ? '自动下载图片' : 'Automatically download images'}</span>
          <TextHelp text={
            configStore.zh ? '粘贴网页元素或Markdown代码时自动下载网络图像并将其转换为本机地址' :
              'Automatically download and convert network images to local addresses when pasting webpage elements or markdown code'
          }/>
        </div>
        <div>
          <Checkbox checked={configStore.config.autoDownload}
                    onChange={e => configStore.setConfig('autoDownload', e.target.checked)}/>
        </div>
      </div>
      <div className={'flex justify-between items-center py-3'}>
        <div className={'text-sm'}>
                      <span
                        className={'mr-1'}>{configStore.zh ? '失焦检测Markdown' : 'Out of focus detection Markdown'}</span>
          <TextHelp text={
            configStore.zh ? '当光标离开当前段落，自动检测未被转换的markdown文字格式并转换' :
              'When the cursor leaves the current paragraph, automatically detect unconverted markdown text formats and convert them'
          }/>
        </div>
        <div>
          <Checkbox checked={configStore.config.detectionMarkdown}
                    onChange={e => configStore.setConfig('detectionMarkdown', e.target.checked)}/>
        </div>
      </div>
      <div className={'flex justify-between items-center py-3'}>
        <div className={'text-sm'}>
          {configStore.zh ? '拖拽排序' : 'Drag to sort'}
        </div>
        <div>
          <Checkbox checked={configStore.config.dragToSort}
                    onChange={e => configStore.setConfig('dragToSort', e.target.checked)}/>
        </div>
      </div>
      <EditorFont/>
      <div className={'flex justify-between items-center py-3'}>
        <div className={'text-sm'}>
          {configStore.zh ? '段落行高' : 'Paragraph line height'}
        </div>
        <div>
          <Radio.Group
            value={configStore.config.editorLineHeight}
            onChange={e => {
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
          <Checkbox checked={configStore.config.codeLineNumber}
                    onChange={e => configStore.setConfig('codeLineNumber', e.target.checked)}/>
        </div>
      </div>
      <div className={'flex justify-between items-center py-3'}>
        <div className={'text-sm'}>
          {configStore.zh ? '代码段 TabSize' : 'Code tab size'}
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
          {configStore.zh ? '代码风格' : 'Code style'}
        </div>
        <div>
          <Select
            value={configStore.config.codeTheme}
            className={'w-[220px]'}
            onChange={e => {
              configStore.setConfig('codeTheme', e)
              setTimeout(async () => {
                const bg = await window.api.loadCodeTheme(e)
                runInAction(() => {
                  configStore.config.codeBackground = bg
                })
                for (const t of treeStore.tabs) {
                  clearAllCodeCache(t.store.editor)
                  t.store.setState(state => state.pauseCodeHighlight = true)
                  setTimeout(() => {
                    t.store.setState(state => {
                      state.pauseCodeHighlight = false
                      state.refreshHighlight = !state.refreshHighlight
                    })
                  }, 30)
                }
              }, 300)
            }}
            options={Array.from(window.api.themes).map(t => ({label: t, value: t}))}
          />
        </div>
      </div>
      <div className={'flex justify-between items-center py-3'}>
        <div className={'text-sm'}>
          {configStore.zh ? '拼写检查' : 'Spell check'}
        </div>
        <div>
          <Checkbox checked={configStore.config.spellCheck}
                    onChange={e => configStore.setConfig('spellCheck', e.target.checked)}/>
        </div>
      </div>
      <div className={'flex justify-between items-center py-3'}>
        <div className={'text-sm'}>
          <span className={'mr-1'}>{configStore.zh ? '显示浮动栏' : 'Show floating bar'}</span>
          <TextHelp text={
            configStore.zh ? '选中文字不再显示浮动栏，仍然可以可以使用"格式"菜单中的快捷键操作文字格式，或使用Markdown语法转换' :
              'Selecting text will no longer display a floating bar, and you can still use the shortcut keys in the "Format" menu to manipulate text formatting or use Markdown syntax conversion'
          }/>
        </div>
        <div>
          <Checkbox checked={configStore.config.showFloatBar}
                    onChange={e => configStore.setConfig('showFloatBar', e.target.checked)}/>
        </div>
      </div>
      <div className={'flex justify-between items-center py-3'}>
        <div className={'text-sm'}>
          <span className={'mr-1'}>{configStore.zh ? '黏贴文件重命名' : 'Paste file to rename'}</span>
          <TextHelp text={
            configStore.zh ? '黏贴图片至编辑区，显示保存文件重命名弹窗' :
              'Paste the image into the editing area and display the save file rename pop-up window'
          }/>
        </div>
        <div>
          <Checkbox checked={configStore.config.renameFileWhenSaving}
                    onChange={e => configStore.setConfig('renameFileWhenSaving', e.target.checked)}/>
        </div>
      </div>
      <div className={'flex justify-between items-center py-3'}>
        <div className={'text-sm'}>
          {configStore.zh ? '编辑区文字大小' : 'Edit area text size'}
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
    </div>
  )
})
