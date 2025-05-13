import { Form, Select, Input, Popconfirm } from 'antd'
import { useStore } from '@/store/store'
import { useCallback, useEffect, useMemo } from 'react'
import { useGetSetState } from 'react-use'
import { IClient } from 'types/model'
import { AiModeLabel, openAiModels } from '@/store/llm/data/data'
import { ModelIcon } from '../chat/ModelIcon'
import { CircleCheckBig, CircleX } from 'lucide-react'
import { nid } from '@/utils/common'
import { observer } from 'mobx-react-lite'
import { useLocalState } from '@/hooks/useLocalState'
import { DeleteOutlined, EditOutlined } from '@ant-design/icons'
import { Button, Modal, SortableList } from '@lobehub/ui'
const ModalForm = observer((props: { open: boolean; id: string | null; onClose: () => void }) => {
  const [form] = Form.useForm()
  const store = useStore()
  const [state, setState] = useGetSetState({
    loading: false,
    error: '',
    checking: false,
    checked: false
  })
  const check = useCallback(() => {
    form.validateFields().then((data) => {
      setState({ checking: true })
      store.chat
        .checkLLMApiConnection({
          provider: openAiModels.has(data.mode) ? 'openai' : data.mode,
          baseUrl: data.baseUrl,
          apiKey: data.apiKey,
          model: data.models[0],
          mode: data.mode
        })
        .then(async (res) => {
          if (res.success) {
            setState({ checked: true, error: '' })
          } else {
            setState({ error: res.message, checked: false })
          }
        })
        .finally(() => {
          setState({ checking: false })
        })
    })
  }, [form])
  const save = useCallback(() => {
    const { models } = store.settings.state
    form.validateFields().then(async (data) => {
      const model: any = {
        name: data.name,
        mode: data.mode,
        baseUrl: data.baseUrl || undefined,
        apiKey: data.apiKey,
        models: data.models,
        id: props.id,
        sort: data.sort || models.length
      }
      if (props.id) {
        await store.model.updateClient(props.id, model)
      } else {
        model.id = nid()
        await store.model.createClient(model)
      }
      const target = models.find((item) => item.id === model.id)
      if (!target) {
        store.settings.setState((state) => {
          state.models = [...models, model]
        })
        store.settings.setDefaultModel(model.id, model.models[0])
      } else {
        await store.settings.getModels()
        store.chat.setChatModel(
          model.id,
          store.chat.activeClient?.config.model ||
            store.settings.state.defaultModel?.model ||
            model.models[0]
        )
      }
      store.msg.success('保存成功')
      props.onClose()
    })
  }, [form, props.id])

  useEffect(() => {
    if (props.open) {
      form.resetFields()
      setState({
        checked: false,
        error: '',
        loading: false,
        checking: false
      })
      if (props.id) {
        store.model.getClient(props.id).then((model) => {
          if (model) {
            form.setFieldsValue({
              name: model.name,
              mode: model.mode,
              baseUrl: model.baseUrl,
              apiKey: model.apiKey,
              models: model.models,
              sort: model.sort
            })
          }
        })
      }
    }
  }, [props.id, props.open])

  return (
    <Modal
      title={'添加模型'}
      open={props.open}
      footer={null}
      width={500}
      onCancel={props.onClose}
      styles={{
        wrapper: { zIndex: 2210 },
        mask: { zIndex: 2200 }
      }}
    >
      <Form form={form} layout={'vertical'} labelAlign={'right'} size={'middle'}>
        <Form.Item label={'名称'} name={'id'} hidden={true}>
          <Input />
        </Form.Item>
        <Form.Item label={'名称'} name={'name'} rules={[{ required: true }]}>
          <Input placeholder={'自定义名称'} />
        </Form.Item>
        <Form.Item
          label={'Api 提供方'}
          name={'mode'}
          rules={[{ required: true }]}
          tooltip={'很多模型都与OpenAi 的api兼容，如果未列出您所使用的模型，可以考虑使用OpenAi模式'}
        >
          <Select
            options={Array.from(AiModeLabel.entries()).map(([key, value]) => ({
              label: (
                <div className={'flex items-center gap-2'}>
                  {' '}
                  <ModelIcon mode={key} size={16} /> <span>{value}</span>
                </div>
              ),
              value: key
            }))}
            dropdownStyle={{ zIndex: 2210 }}
            placeholder={'请选择Api 提供方'}
          />
        </Form.Item>
        <Form.Item rules={[{ required: true }]} label={'Api Key'} name={'apiKey'}>
          <Input placeholder={'请输入Api Key'} />
        </Form.Item>
        <Form.Item rules={[{ required: true, type: 'array' }]} label={'模型'} name={'models'}>
          <Select
            mode="tags"
            dropdownStyle={{ zIndex: 2210 }}
            style={{ width: '100%' }}
            placeholder="使用回车添加模型，可添加多个"
          />
        </Form.Item>
        <Form.Item rules={[{ type: 'url' }]} label={'Api Base Url'} name={'baseUrl'}>
          <Input placeholder={'Default use: https://api.openai.com'} />
        </Form.Item>
        <div className={'flex justify-between items-center space-x-3'}>
          <div>
            {state().checked && (
              <div className={'flex items-center'}>
                <CircleCheckBig className={'w-4 h-4 mr-2 text-green-500'} />
                检查通过
              </div>
            )}
            {!state().checked && !!state().error && (
              <div className={'text-red-500 flex items-center'}>
                <CircleX className={'w-4 h-4 mr-2 text-red-500'} />
                {state().error || ''}
              </div>
            )}
          </div>
          <div className={'space-x-3 flex-shrink-0 flex items-center'}>
            <Button type={'default'} size={'middle'} onClick={check} loading={state().checking}>
              检查
            </Button>
            <Button size={'middle'} onClick={save} loading={state().loading} type={'primary'}>
              保存
            </Button>
          </div>
        </div>
      </Form>
    </Modal>
  )
})

const ModelItem = observer(
  ({ model, onRemove, onEdit }: { model: IClient; onRemove: () => void; onEdit: () => void }) => {
    const label = useMemo(() => {
      return (
        <div className={'flex items-center select-none'}>
          {model.mode && <ModelIcon mode={model.mode as any} size={16} />}
          <div className={'flex-1 truncate w-0 ml-1'}>{model.name || '未命名'}</div>
        </div>
      )
    }, [model])
    return (
      <div className={'flex items-center justify-between'}>
        <div className={'flex-1 w-0'}>{label}</div>
        <div className={'flex items-center space-x-1'}>
          <Button type={'text'} icon={<EditOutlined />} size={'small'} onClick={onEdit}></Button>
          <Popconfirm
            title={'确定删除吗？'}
            onConfirm={() => onRemove()}
            styles={{ root: { zIndex: 2200 } }}
          >
            <Button type={'text'} icon={<DeleteOutlined />} size={'small'}></Button>
          </Popconfirm>
        </div>
      </div>
    )
  }
)

export const ModelSettings = observer(() => {
  const store = useStore()
  const [state, setState] = useLocalState({
    openEdit: false,
    selectedId: null as string | null
  })
  const models = store.settings.state.models
  const remove = useCallback((id: string) => {
    if (models.find((m) => m.id === id)) {
      store.settings.removeModel(id)
    }
  }, [])
  return (
    <div className={'py-5 max-w-[500px] mx-auto'}>
      <div className={'space-y-5'}>
        <SortableList
          gap={2}
          items={models}
          className={'w-full'}
          onChange={(items: IClient[]) => {
            store.settings.setState((state) => {
              state.models = items
            })
            store.model.sortClients(items.map((m) => m.id!))
          }}
          renderItem={(m: IClient) => (
            <SortableList.Item id={m.id}>
              <SortableList.DragHandle />
              <div className={'flex-1'}>
                <ModelItem
                  key={m.id}
                  model={m}
                  onRemove={() => remove(m.id!)}
                  onEdit={() => {
                    setState({
                      openEdit: true,
                      selectedId: m.id
                    })
                  }}
                />
              </div>
            </SortableList.Item>
          )}
        />
      </div>
      <div className={'mt-6 px-20'}>
        <Button
          block={true}
          type={'primary'}
          onClick={() => {
            setState({
              openEdit: true,
              selectedId: null
            })
          }}
        >
          添加模型
        </Button>
      </div>
      <ModalForm
        open={state.openEdit}
        id={state.selectedId}
        onClose={() => {
          setState({
            openEdit: false,
            selectedId: null
          })
        }}
      />
    </div>
  )
})
