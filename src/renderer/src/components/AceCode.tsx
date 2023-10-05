import AceEditor from 'react-ace'
import "ace-builds/src-noconflict/mode-json";
import "ace-builds/src-noconflict/mode-javascript.js";
import "ace-builds/src-noconflict/theme-cloud9_night";
import "ace-builds/src-noconflict/theme-cloud9_day";
import {configStore} from '../store/config'
export function AceCode(props: {
  value?: string
  mode: 'json' | 'javascript'
  height?: string
  onChange?: (v: string) => void
}) {
  return (
    <div className={'pt-2'}>
      <AceEditor
        mode={props.mode}
        setOptions={{
          highlightActiveLine: false,
          useWorker: false
        }}
        theme={configStore.config.dark ? 'cloud9_night' : 'cloud9_day'}
        onLoad={editor => {
          editor.renderer.setPadding(10)
          editor.renderer.setScrollMargin(10, 0, 0, 0)
        }}
        height={props.height || '400px'}
        width={'100%'}
        tabSize={2}
        value={props.value}
        onChange={props.onChange}
        editorProps={{ $blockScrolling: true}}
      />
    </div>
  )
}
