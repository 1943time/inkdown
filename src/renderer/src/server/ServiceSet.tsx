import {observer} from 'mobx-react-lite'
import {Alert, Button, Form, Input, Modal, Radio} from 'antd'
import {useLocalState} from '../hooks/useLocalState'
import {message$} from '../utils'
import {useCallback, useEffect} from 'react'
import {runInAction} from 'mobx'
import {configStore} from '../store/config'
import {AceCode} from '../components/AceCode'
import {CaretRightOutlined} from '@ant-design/icons'
import {db} from '../store/db'

const scriptInitialValue = `/**
 * Custom synchronization requires the implementation of the following methods
 * After uploading, it is necessary to ensure that {domain}/{name} is accessible
 * Get plain text: buffer.toString('utf-8'）
 */
class Service {
  constructor({got, mimeTypes}) {
    this.got = got
    this.mime = mimeTypes
  }
  /**
   * Upload JavaScript and CSS files
   * @param {string} name // fileName for example: lib/script.js
   * @param {Buffer} buffer // file content
   */
  async uploadDependencyLibrary(name, buffer) {

  }
\t/**
   * Will be called when uploading documents, random name, for example: doc/xxx.html
   * @param {{
   *   json: object
   *   randomName: string
   *   filePath: string
   *   htmlBuffer: Buffer
   * }} ctx
   * @returns {{name: string}}
   */
\tasync uploadDoc(ctx) {

\t\treturn {name: ctx.randomName}
\t}
  /**
   * Will be called when deleting a document
   * @param {{
   *   name: string
   *   filePath: string
   * }} ctx
   * @returns {{success: true}}
   */
\tasync removeFile(ctx) {

\t\treturn {success: true}
\t}
}

module.exports = {Service}`
export const ServiceSet = observer((props: {
  open: boolean
  onClose: () => void
}) => {
  const [state, setState] = useLocalState({
    error: '',
    testPassed: false,
    loading: false,
    testing: false,
    tab: 'ssh'
  })
  const [form] = Form.useForm()
  useEffect(() => {
    if (props.open) {
      setState({
        testing: false,
        testPassed: false,
        tab: 'ssh'
      })
      window.electron.ipcRenderer.invoke('get-service-config').then(res => {
        if (res) {
          form.setFieldsValue(res)
          setState({tab: res.type})
        } else {
          form.resetFields()
        }
      })
    }
  }, [props.open])
  const setSuccess = useCallback(async (value: any) => {
    value.domain = value.domain.replace(/\/+$/,'')
    const config = await window.electron.ipcRenderer.invoke('get-service-config')
    if (config && (config.domain !== value.domain || config.type !== value.type)) {
      db.shareNote.clear()
    }
    await window.electron.ipcRenderer.invoke('set-service-config', value)
    if (value.type === 'ssh') {
      await window.api.service.initialSsh(value)
    } else {
      window.api.service.script.initial()
    }
    setState({error: ''})
    message$.next({
      type: 'success',
      content: 'Setup successful'
    })
    runInAction(() => {
      configStore.serviceConfig = value
    })
    props.onClose()
  }, [])
  return (
    <Modal
      open={props.open}
      width={700}
      title={'Shared Service Settings'}
      confirmLoading={state.loading}
      onOk={async () => {
        const value = form.getFieldsValue()
        value.domain = value.domain.replace(/\/+$/,'')
        if (state.tab === 'custom') {
          if (!state.testPassed) {
            message$.next({
              type: 'warning',
              content: 'Please test the service script first'
            })
          } else {
            await setSuccess(value)
          }
          return
        }
        setState({loading: true})
        try {
          await setSuccess(value)
        } catch (e: any) {
          console.error(e)
          setState({error: e.toString()})
          window.electron.ipcRenderer.invoke('set-service-config', null)
        } finally {
          setState({loading: false})
        }
      }}
      onCancel={props.onClose}
    >
      <Form form={form} layout={'horizontal'} labelCol={{span: 6}} className={'mt-4'}>
        <Form.Item label={'Synchronous mode'} name={'type'} initialValue={'ssh'}>
          <Radio.Group onChange={e => setState({tab: e.target.value, testPassed: false})}>
            <Radio value={'ssh'}>SSH</Radio>
            <Radio value={'custom'}>Custom</Radio>
          </Radio.Group>
        </Form.Item>
        {state.tab === 'ssh' &&
          <>
            <Form.Item
              label={'Host'} name={['host']}
              rules={[{required: true, message: 'Please enter the correct host address'}]}>
              <Input/>
            </Form.Item>
            <Form.Item
              label={'Username'} name={['username']}
              rules={[{required: true, message: 'Please enter username'}]}>
              <Input/>
            </Form.Item>
            <Form.Item
              label={'Password'} name={['password']}
              rules={[{required: true, message: 'Please enter password'}]}>
              <Input type={'password'}/>
            </Form.Item>
            <Form.Item
              initialValue={'22'}
              label={'Port'} name={['port']}>
              <Input/>
            </Form.Item>
            <Form.Item
              rules={[{required: true, message: 'Please enter the storage folder path'}]}
              label={'Storage directory'} name={['target']}>
              <Input/>
            </Form.Item>
            <Form.Item
              rules={[{required: true, message: 'Please enter domain'}]}
              label={'Domain'} name={['domain']}>
              <Input placeholder={'for example: https://www.bluemd.me'}/>
            </Form.Item>
          </>
        }
        {state.tab === 'custom' &&
          <>
            <Form.Item
              labelCol={{span: 3}}
              rules={[{required: true, message: 'Please enter domain'}]}
              label={'Domain'} name={['domain']}>
              <Input placeholder={'for example: https://www.bluemd.me'}/>
            </Form.Item>
            <Form.Item
              labelCol={{span: 3}}
              rules={[{required: true, message: 'Please enter the control script', validateTrigger: 'submit'}]}
              initialValue={scriptInitialValue}
              label={'Script'} name={['script']}>
              <AceCode mode={'javascript'} height={'500px'}/>
            </Form.Item>
            <Form.Item label={' '} colon={false} labelCol={{span: 3}}>
              <div>
                <Button
                  loading={state.testing}
                  icon={<CaretRightOutlined />} size={'small'}
                  onClick={async () => {
                    let domain = form.getFieldValue('domain') as string
                    if (!domain) return message$.next({
                      type: 'warning',
                      content: 'Please enter domain'
                    })
                    await form.validateFields()
                    domain = domain.replace(/\/+$/,'')
                    try {
                      setState({testing: true})
                      await window.api.service.script.saveScript(form.getFieldValue('script'), domain)
                      setState({error: '', testPassed: true})
                      message$.next({
                        type: 'success',
                        content: 'Test passed'
                      })
                    } catch (e: any) {
                      setState({error: e.stack})
                      console.error(e)
                    } finally {
                      setState({testing: false})
                    }
                  }}
                >
                  run test
                </Button>
              </div>
            </Form.Item>
          </>
        }
      </Form>
      {state.error &&
        <Alert message={state.error} type={'error'} className={'mt-4 whitespace-pre overflow-auto'}/>
      }
    </Modal>
  )
})
