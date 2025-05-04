import Worker from './output?worker'
import { nanoid } from 'nanoid'
import { INode } from './output'
import { Store } from '@/store/store'
export class WorkerHandle {
  private worker = new Worker()
  private callbacks = new Map<string, Function>()
  constructor(private readonly store: Store) {
    this.worker.onmessage = this.handleMessage.bind(this)
  }
  getSpaceNodes() {
    const nodes: Record<string, INode> = {}
    for (const node of Object.values(this.store.note.state.nodes)) {
      nodes[node.id] = {
        folder: node.folder,
        id: node.id,
        name: node.name,
        parentId: node.parentId,
        updated: node.updated
      }
    }
    return nodes
  }
  async getSchemaText(schema: any[] = []): Promise<string> {
    const id = nanoid()
    this.worker.postMessage({
      type: 'getSchemaText',
      schema,
      id
    })
    return new Promise((resolve) => {
      this.callbacks.set(id, resolve)
    })
  }
  private handleMessage(e: MessageEvent) {
    const { id, data } = e.data
    const callback = this.callbacks.get(id)
    if (callback) {
      callback(data)
    }
  }
  async getChunks(
    schema: any[],
    doc: INode
  ): Promise<{ text: string; path: number; type: string }[]> {
    const id = nanoid()
    this.worker.postMessage({
      type: 'getChunks',
      schema,
      doc,
      nodes: this.getSpaceNodes(),
      id
    })
    return new Promise((resolve) => {
      this.callbacks.set(id, resolve)
    })
  }
  async toMarkdown(
    schema: any[],
    doc: INode,
    nodes: INode[],
    exportRootPath?: string
  ): Promise<{ md: string; medias: Record<string, string> }> {
    const id = nanoid()
    this.worker.postMessage({
      type: 'toMarkdown',
      schema,
      doc,
      nodes,
      exportRootPath,
      id
    })
    return new Promise((resolve) => {
      this.callbacks.set(id, resolve)
    })
  }
}
