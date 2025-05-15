import { Form, Select, Input, Popconfirm, InputNumber, Slider, Collapse, Checkbox } from 'antd'
import { useStore } from '@/store/store'
import { useCallback, useEffect, useMemo, useRef } from 'react'
import { useGetSetState } from 'react-use'
import { IClient } from 'types/model'
import { AiModeLabel, openAiModels, providerOptions } from '@/store/llm/data/data'
import { ModelIcon } from '../chat/ModelIcon'
import { CircleCheckBig, CircleX } from 'lucide-react'
import { nid } from '@/utils/common'
import { observer } from 'mobx-react-lite'
import { useLocalState } from '@/hooks/useLocalState'
import { DeleteOutlined, EditOutlined } from '@ant-design/icons'
import { Button, Modal, SortableList } from '@lobehub/ui'
import { useTranslation } from 'react-i18next'

const ModalForm = observer((props: { open: boolean; id: string | null; onClose: () => void }) => {
  const [form] = Form.useForm()
  const store = useStore()
  const { t } = useTranslation()
  const [state, setState] = useGetSetState({
    loading: false,
    error: '',
    checking: false,
    checked: false,
    defaultUrl: '',
    modelOptions: [] as string[]
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
        store.settings.setDefaultModel({ providerId: model.id, model: model.models[0] })
      } else {
        await store.settings.getModels()
        store.chat.setChatModel(
          model.id,
          store.chat.activeClient?.config.model ||
            store.settings.state.defaultModel?.model ||
            model.models[0]
        )
      }
      store.msg.success(t('model.save_success'))
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
            setState({
              defaultUrl: providerOptions.get(model.mode)?.baseUrl || '',
              modelOptions: providerOptions.get(model.mode)?.models || []
            })
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
      title={t('model.add_model')}
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
        <Form.Item label={t('model.name')} name={'id'} hidden={true}>
          <Input />
        </Form.Item>
        <Form.Item label={t('model.name')} name={'name'} rules={[{ required: true }]}>
          <Input placeholder={t('model.custom_name')} />
        </Form.Item>
        <Form.Item
          label={t('model.api_provider')}
          name={'mode'}
          rules={[{ required: true }]}
          tooltip={{
            title: t('model.api_provider_help'),
            styles: {
              root: {
                zIndex: 2210
              }
            }
          }}
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
            onChange={(value) => {
              setState({
                defaultUrl: providerOptions.get(value)?.baseUrl || '',
                modelOptions: providerOptions.get(value)?.models || []
              })
            }}
            dropdownStyle={{ zIndex: 2210 }}
            placeholder={t('model.select_provider')}
          />
        </Form.Item>
        <Form.Item rules={[{ required: true }]} label={t('model.api_key')} name={'apiKey'}>
          <Input placeholder={t('model.enter_api_key')} />
        </Form.Item>
        <Form.Item
          rules={[{ required: true, type: 'array' }]}
          label={t('model.model')}
          name={'models'}
        >
          <Select
            mode="tags"
            dropdownStyle={{ zIndex: 2210 }}
            style={{ width: '100%' }}
            options={state().modelOptions.map((v) => {
              return {
                label: v,
                value: v
              }
            })}
            placeholder={t('model.model_placeholder')}
          />
        </Form.Item>
        <Form.Item rules={[{ type: 'url' }]} label={t('model.api_base_url')} name={'baseUrl'}>
          <Input
            placeholder={`${state().defaultUrl ? `${t('model.default_use')} ${state().defaultUrl}` : ''}`}
          />
        </Form.Item>
        <div className={'flex justify-between items-center space-x-3'}>
          <div>
            {state().checked && (
              <div className={'flex items-center'}>
                <CircleCheckBig className={'w-4 h-4 mr-2 text-green-500'} />
                {t('model.check_passed')}
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
              {t('model.check')}
            </Button>
            <Button size={'middle'} onClick={save} loading={state().loading} type={'primary'}>
              {t('model.save')}
            </Button>
          </div>
        </div>
      </Form>
    </Modal>
  )
})

const ModelItem = observer(
  ({ model, onRemove, onEdit }: { model: IClient; onRemove: () => void; onEdit: () => void }) => {
    const { t } = useTranslation()
    const label = useMemo(() => {
      return (
        <div className={'flex items-center select-none'}>
          {model.mode && <ModelIcon mode={model.mode as any} size={16} />}
          <div className={'flex-1 truncate w-0 ml-1'}>{model.name || t('model.unnamed')}</div>
        </div>
      )
    }, [model])
    return (
      <div className={'flex items-center justify-between'}>
        <div className={'flex-1 w-0'}>{label}</div>
        <div className={'flex items-center space-x-1'}>
          <Button type={'text'} icon={<EditOutlined />} size={'small'} onClick={onEdit}></Button>
          <Popconfirm
            title={t('model.confirm_delete')}
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
  const timer = useRef(0)
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
  const updateSettings = useCallback((key: keyof typeof store.settings.state) => {
    clearTimeout(timer.current)
    timer.current = window.setTimeout(() => {
      store.settings.setSetting(key, store.settings.state[key])
    }, 500)
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
      <div className={'mt-10'}>
        <Form className={'w-full'} layout={'horizontal'} labelAlign={'left'}>
          <Form.Item
            label={'最大对话轮数'}
            tooltip={{
              title: '一次问答视为一轮，超过最大对话轮数将在上下文中忽略更早的对话记录',
              styles: {
                root: {
                  zIndex: 2210
                }
              }
            }}
          >
            <div className={'ml-5'}>
              <Slider
                min={4}
                max={20}
                onChange={(value) => {
                  store.settings.setState((state) => {
                    state.maxMessageRounds = value
                  })
                  updateSettings('maxMessageRounds')
                }}
                value={store.settings.state.maxMessageRounds}
                tooltip={{ zIndex: 2210, arrow: false }}
              />
            </div>
          </Form.Item>
        </Form>
      </div>
      <div className={'mt-5'}>
        <Collapse
          size={'small'}
          items={[
            {
              key: 'more',
              label: '更多设置',
              children: (
                <div>
                  <div className={'text-xs text-gray-500 mb-5 text-center'}>
                    如对参数不是特别了解，不建议配置或勾选
                  </div>
                  <Form
                    layout={'horizontal'}
                    className={'w-full'}
                    labelAlign={'left'}
                    size={'small'}
                    labelCol={{ span: 12 }}
                  >
                    <Form.Item
                      label={'创意活跃度'}
                      tooltip={{
                        title: '数值越大，回答越有创意和想象力；数值越小，回答越严谨',
                        styles: {
                          root: { zIndex: 2210 }
                        }
                      }}
                    >
                      <div className={'flex items-center'}>
                        <Slider
                          min={0}
                          max={2}
                          value={store.settings.state.modelOptions.temperature.value}
                          step={0.1}
                          onChange={(value) => {
                            store.settings.setState((state) => {
                              state.modelOptions.temperature.value = value
                            })
                            updateSettings('modelOptions')
                          }}
                          style={{ width: '120px' }}
                          tooltip={{ zIndex: 2210 }}
                        />
                        <div className={'ml-5'}>
                          <Checkbox
                            checked={store.settings.state.modelOptions.temperature.enable}
                            onChange={(e) => {
                              store.settings.setState((state) => {
                                state.modelOptions.temperature.enable = e.target.checked
                              })
                              updateSettings('modelOptions')
                            }}
                          />
                        </div>
                      </div>
                    </Form.Item>
                    <Form.Item
                      label={'思维开放度 (top_p)'}
                      name={'top_p'}
                      tooltip={{
                        title:
                          '考虑多少种可能性，值越大，接受更多可能的回答；值越小，倾向选择最可能的回答。不推荐和创意活跃度一起更改',
                        styles: { root: { zIndex: 2210 } }
                      }}
                    >
                      <div className={'flex items-center'}>
                        <Slider
                          min={0}
                          max={1}
                          value={store.settings.state.modelOptions.top_p.value}
                          step={0.1}
                          style={{ width: '120px' }}
                          tooltip={{ zIndex: 2210 }}
                          onChange={(value) => {
                            store.settings.setState((state) => {
                              state.modelOptions.top_p.value = value
                            })
                            updateSettings('modelOptions')
                          }}
                        />
                        <div className={'ml-5'}>
                          <Checkbox
                            checked={store.settings.state.modelOptions.top_p.enable}
                            onChange={(e) => {
                              store.settings.setState((state) => {
                                state.modelOptions.top_p.enable = e.target.checked
                              })
                              updateSettings('modelOptions')
                            }}
                          />
                        </div>
                      </div>
                    </Form.Item>
                    <Form.Item
                      label={'表述发散度 (presencePenalty)'}
                      name={'presence_penalty'}
                      tooltip={{
                        title:
                          '值越大，越倾向不同的表达方式，避免概念重复；值越小，越倾向使用重复的概念或叙述，表达更具一致性',
                        styles: { root: { zIndex: 2210 } }
                      }}
                    >
                      <div className={'flex items-center'}>
                        <Slider
                          min={-2}
                          max={2}
                          value={store.settings.state.modelOptions.presence_penalty.value}
                          step={0.1}
                          onChange={(value) => {
                            store.settings.setState((state) => {
                              state.modelOptions.presence_penalty.value = value
                            })
                            updateSettings('modelOptions')
                          }}
                          style={{ width: '120px' }}
                          tooltip={{ zIndex: 2210 }}
                        />
                        <div className={'ml-5'}>
                          <Checkbox
                            checked={store.settings.state.modelOptions.presence_penalty.enable}
                            onChange={(e) => {
                              store.settings.setState((state) => {
                                state.modelOptions.presence_penalty.enable = e.target.checked
                              })
                              updateSettings('modelOptions')
                            }}
                          />
                        </div>
                      </div>
                    </Form.Item>
                    <Form.Item
                      label={'词汇丰富度 (frequencyPenalty)'}
                      name={'frequency_penalty'}
                      tooltip={{
                        title: '值越大，用词越丰富多样；值越低，用词更朴实简单',
                        styles: { root: { zIndex: 2210 } }
                      }}
                    >
                      <div className={'flex items-center'}>
                        <Slider
                          min={-2}
                          max={2}
                          value={store.settings.state.modelOptions.frequency_penalty.value}
                          step={0.1}
                          onChange={(value) => {
                            store.settings.setState((state) => {
                              state.modelOptions.frequency_penalty.value = value
                            })
                            updateSettings('modelOptions')
                          }}
                          style={{ width: '120px' }}
                          tooltip={{ zIndex: 2210 }}
                        />
                        <div className={'ml-5'}>
                          <Checkbox
                            checked={store.settings.state.modelOptions.frequency_penalty.enable}
                            onChange={(e) => {
                              store.settings.setState((state) => {
                                state.modelOptions.frequency_penalty.enable = e.target.checked
                              })
                              updateSettings('modelOptions')
                            }}
                          />
                        </div>
                      </div>
                    </Form.Item>
                  </Form>
                </div>
              )
            }
          ]}
        />
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
