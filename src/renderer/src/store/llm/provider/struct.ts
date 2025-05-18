import { IMessageModel } from 'types/model'
import { CompletionOptions, ModelConfig } from '../type'

abstract class BaseModel {
  abstract config: ModelConfig
  abstract completion<T = any>(
    messages: IMessageModel[],
    opts?: CompletionOptions
  ): Promise<[string, T]>
  abstract completionStream(messages: IMessageModel[], opts: StreamPipeOptions): Promise<any>
}

export { BaseModel }
