import { makeAutoObservable } from 'mobx'
import { Store } from '../store'
import { copy, nid } from '@/utils/common'
import { IDoc } from 'types/model'
export interface ImportTree {
  id: string
  name: string
  path: string
  sort?: number
  folder: boolean
  schema?: any[]
  parentId: string
  isset: boolean
  children?: ImportTree[]
}

const getFileText = async (file: File) => {
  const enc = new TextDecoder('utf-8')
  return enc.decode(await file.arrayBuffer())
}

export class LocalFile {
  downLoadTotal = 0
  downloaded = 0
  rewriteNode = new Set<string>()
  manualWritePath: null | string = null
  constructor(private readonly store: Store) {
    makeAutoObservable(this)
  }
  get writePath() {
    return this.manualWritePath || this.store.note.state.currentSpace?.writeFolderPath
  }
  get saveLocal() {
    return Boolean(this.writePath)
  }

  getMdParser() {
    return import('@/editor/parser/worker').then((res) => res.parse)
  }
  getDocLocalPath(doc: IDoc) {
    const { join } = window.api.path
    return join(
      this.writePath!,
      this.store.note.getDocPath(doc).join('/') + (doc.folder ? '' : '.md')
    )
  }
  async deleteDocByIds(docs: string[]) {
    if (this.saveLocal) {
      try {
        // const space = await db.space.get(spaceCid)
        // if (this.store.desktop && space?.filePath) {
        //   for (const cid of docs) {
        //     const path = await this.getDocPath(cid)
        //     if (path) {
        //       const filePath = window.api.path.join(space.filePath, path)
        //       if (window.api.fs.existsSync(filePath)) {
        //         window.api.fs.moveToTrash(filePath)
        //       }
        //     }
        //   }
        // }
      } catch (e) {
        console.error(e)
      }
    }
  }

  chooseLocalFolder(defaultFilePath?: string) {
    return this.store.system.showOpenDialog({
      defaultPath: defaultFilePath,
      properties: ['openDirectory', 'createDirectory']
    })
  }

  private async parseLocalNodes(node: IDoc) {
    this.rewriteNode.clear()
    const path = this.getDocLocalPath(node)
    if (node.folder) {
      window.api.fs.mkdirSync(path, { recursive: true })
      if (node.children?.length) {
        for (const item of node.children) {
          // await this.localWriteNode(item)
        }
      }
    } else {
      this.rewriteNode.add(node.id)
      // const depLinks = this.store.tree.depMap.get(node.cid)
      // if (depLinks?.size) {
      //   for (const item of depLinks) {
      //     this.rewriteNode.add(item)
      //   }
      // }
    }
  }

  async localDeleteAssetsFile(name: string) {
    if (!this.saveLocal) return
    const { join } = window.api.path
    const path = join(this.writePath!, '.files', name)
    if (window.api.fs.existsSync(path)) {
      window.api.fs.moveToTrash(path)
    }
  }

  async localSaveFile(path: string, name: string) {
    if (!this.saveLocal) return
    const { join } = window.api.path
    const filePath = join(this.writePath!, '.files', name)
    if (!window.api.fs.existsSync(filePath)) {
      window.api.fs.cp(path, filePath)
    }
  }

  localRename(from: string, node: IDoc) {
    if (!this.saveLocal) return
    const to = this.getDocLocalPath(node)
    from = window.api.path.join(this.writePath!, from + (node.folder ? '' : '.md'))
    if (window.api.fs.existsSync(from)) {
      const parent = window.api.path.join(to, '..')
      if (!window.api.fs.existsSync(parent)) {
        window.api.fs.mkdirSync(parent, { recursive: true })
      }
      window.api.fs.rename(from, to)
    }
  }

  async showInFinder(doc: IDoc) {
    if (!this.saveLocal) {
      this.store.note.openConfirmDialog$.next({
        title: '提示',
        description: '设置工作区绑定文件夹后，您可以使用"在访达中显示"功能',
        okText: '前往设置',
        okType: 'primary',
        onConfirm: () => {
          this.store.note.openEditSpace$.next(this.store.note.state.currentSpace?.id!)
        }
      })
    } else {
      const path = this.store.note.getDocPath(doc)
      window.api.fs.showInFinder(window.api.path.join(this.writePath!, path.join('/') + '.md'))
    }
  }

  public async copyFile(filePath: string) {
    const name = nid() + window.api.path.extname(filePath)
    // @ts-ignore
    return new File([(await window.api.fs.readFile(filePath)).buffer], name, {
      type: window.api.fs.lookup(filePath) || undefined
    })
  }

  async newDocFromlocal(parentNode: IDoc) {
    try {
      let md = '',
        name = ''
      const res = await this.store.system.showOpenDialog({
        filters: [{ name: 'md', extensions: ['md'] }]
      })
      if (!res.filePaths.length) {
        throw new Error()
      }
      md = window.api.fs.readFileSync(res.filePaths[0], { encoding: 'utf-8' })
      name = window.api.path.basename(res.filePaths[0])
      // const schema = await this.getSingleDocSchemaByMd(md)
      name = name.replace(/\.md$/, '')
      // name = this.store.menu.getCreateName(parentNode, name)
      // this.store.menu.createDoc({
      //   parent: parentNode,
      //   newName: name,
      //   schema
      // })
    } catch (e) {}
  }

  async writeDoc(node: IDoc) {
    if (!this.saveLocal) return
    const path = this.getDocLocalPath(node)
    const parent = window.api.path.join(path, '..')
    if (!window.api.fs.existsSync(parent)) {
      window.api.fs.mkdirSync(parent, { recursive: true })
    }
    const res = await this.store.worker.toMarkdown({
      schema: node.schema || [],
      doc: {
        id: node.id,
        name: node.name,
        folder: node.folder,
        parentId: node.parentId,
        updated: node.updated
      },
      exportRootPath: this.writePath!
    })
    await window.api.fs.writeFile(path, res.md, { encoding: 'utf-8' })
  }
  async initialRewrite(nodes: Record<string, IDoc>, force = false) {
    if (this.saveLocal) {
      try {
        const { join } = window.api.path
        window.api.fs.readdirSync(this.writePath!)
        const assetsPath = await this.store.system.getAssetsPath()
        const nMap = this.store.worker.getSpaceNodes()
        for (const node of Object.values(nodes)) {
          if (!node.folder) {
            try {
              if (!node.schema) {
                const res = await this.store.model.getDoc(node.id)
                if (res) {
                  node.schema = res.schema
                }
              }
              const target = join(
                this.writePath!,
                this.store.note.getDocPath(node).join('/') + '.md'
              )
              if (force || !window.api.fs.existsSync(target)) {
                const parent = join(target, '..')
                if (!window.api.fs.existsSync(parent)) {
                  window.api.fs.mkdirSync(parent, { recursive: true })
                }

                const res = await this.store.worker.toMarkdown({
                  schema: node.schema || [],
                  doc: nMap[node.id],
                  nodes: nMap,
                  exportRootPath: this.writePath!
                })
                if (res.medias) {
                  if (!window.api.fs.existsSync(join(this.writePath!, '.files'))) {
                    window.api.fs.mkdirSync(join(this.writePath!, '.files'), { recursive: true })
                  }
                  for (const media of res.medias) {
                    await window.api.fs.cp(
                      join(assetsPath, media),
                      join(this.writePath!, '.files', media)
                    )
                  }
                }
                await window.api.fs.writeFile(target, res.md, { encoding: 'utf-8' })
              }
            } catch (e) {
              console.error('write err', e)
            }
          }
        }
      } catch (e) {
        console.error(e)
      }
    }
  }
}
