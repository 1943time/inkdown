import AceEditor from 'react-ace'

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
        theme="cloud9_night"
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
