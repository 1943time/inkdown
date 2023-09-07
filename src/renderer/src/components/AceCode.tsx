import AceEditor from 'react-ace'
import "ace-builds/src-noconflict/mode-json";
import "ace-builds/src-noconflict/theme-cloud9_night";
import "ace-builds/src-noconflict/theme-cloud9_day";
import {configStore} from '../store/config'
export function AceCode(props: {
  value?: string
  onChange?: (v: string) => void
}) {
  return (
    <div className={'pt-2'}>
      <AceEditor
        mode={'json'}
        setOptions={{
          showGutter: false,
          highlightActiveLine: false,
          useWorker: false
        }}
        theme={configStore.config.dark ? 'cloud9_night' : 'cloud9_day'}
        height={'400px'}
        width={'100%'}
        tabSize={2}
        value={props.value}
        onChange={props.onChange}
        editorProps={{ $blockScrolling: true}}
      />
    </div>
  )
}
