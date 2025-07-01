import { Store } from '../store'
import { IDoc } from 'types/model'
import { mb, nid } from '@/utils/common'
import { Node } from 'slate'
import { isLink } from '@/editor/utils'
import { EditorUtils } from '@/editor/utils/editorUtils'

type ImportDoc = IDoc & { path: string; isset: boolean }
export class ImportNote {
  private dataCache?: {
    root: string
    linkMap: Map<string, { links: any[]; wikiLinks: any[]; medias: any[] }>
    insertNodes: ImportDoc[]
    pathMap: Map<string, IDoc>
  }
  private udpateNodes: IDoc[] = []
  async delayUpdate() {
    const now = Date.now()
    for (const doc of this.udpateNodes) {
      try {
        if (doc.spaceId !== this.store.note.state.currentSpace?.id) continue
        const node = this.store.note.state.nodes[doc.id]
        if (!node) continue
        await this.store.model.updateDoc(
          doc.id,
          {
            updated: now,
            spaceId: doc.spaceId
          },
          {
            chunks: await this.store.worker.getChunks(node.schema || doc.schema!, {
              folder: false,
              id: doc.id,
              name: doc.name,
              parentId: doc.parentId,
              updated: now
            })
          }
        )
      } catch (e) {
        console.error(e)
      }
    }
    this.udpateNodes = []
  }
  constructor(private readonly store: Store) {}
  findDocLinks(
    schema: any[],
    ctx: {
      root: string
      spacePath: string
    }
  ) {
    const stack = schema.slice()
    const links: any[] = []
    const wikiLinks: any[] = []
    const medias: any[] = []
    const { join, isAbsolute } = window.api.path
    const { existsSync } = window.api.fs
    while (stack.length) {
      const item = stack.pop()
      if (item.children?.length) {
        stack.push(...item.children)
      }
      if (item.text && item.url) {
        links.push(item)
      }
      if (item.type === 'wiki-link') {
        try {
          wikiLinks.push(item)
        } catch (e) {
          console.error(e)
        }
      }
      if (item.type === 'media') {
        if (!isLink(item.url)) {
          if (isAbsolute(item.url)) {
            if (existsSync(item.url)) {
              const size = window.api.fs.statSync(item.url)?.size || 0
              if (size < 100 * mb) {
                medias.push(item)
              }
            } else if (existsSync(join(ctx.root, item.url))) {
              item.url = join(ctx.root, item.url)
              const size = window.api.fs.statSync(item.url)?.size || 0
              if (size < 100 * mb) {
                medias.push(item)
              }
            }
          } else {
            console.log('item.url', ctx.root, ctx.spacePath, item.url)

            if (existsSync(join(ctx.root, ctx.spacePath, '..', item.url))) {
              item.url = join(ctx.root, ctx.spacePath, '..', item.url)
              const size = window.api.fs.statSync(item.url)?.size || 0
              if (size < 100 * mb) {
                medias.push(item)
              }
            }
          }
        }
      }
    }
    return { links, wikiLinks, medias }
  }
  async insertFiles() {
    const { insertNodes, linkMap, pathMap } = this.dataCache!
    const { join, isAbsolute, extname } = window.api.path
    const { existsSync } = window.api.fs
    const assetsPath = await this.store.system.getAssetsPath()
    const deepDenceLink = new Map<string, string[]>()
    const deepMedias = new Map<string, string[]>()
    const insertedMap = new Map<string, string>()
    for (const [path, links] of linkMap) {
      if (links.links.length) {
        for (const item of links.links) {
          if (!isLink(item.url)) {
            const urlPath = item.url.replace(/\.md$/i, '')
            const node = pathMap.get(isAbsolute(urlPath) ? urlPath : join(path, '..', urlPath))
            if (node) {
              item.docId = node.id
              delete item.url
              deepDenceLink.set(pathMap.get(path)!.id, [
                ...(deepDenceLink.get(pathMap.get(path)!.id) || []),
                node.id
              ])
            }
          }
        }
      }
      if (links.wikiLinks.length) {
        for (const item of links.wikiLinks) {
          const text = Node.string(item)
          const res = EditorUtils.parseWikiLink(text)
          if (res?.docName) {
            const node = Array.from(pathMap).find(([path, node]) => {
              if (res.docName.includes('/')) {
                return path === res.docName
              } else {
                return node.name === res.docName
              }
            })
            if (node) {
              deepDenceLink.set(pathMap.get(path)!.id, [
                ...(deepDenceLink.get(pathMap.get(path)!.id) || []),
                node[1].id
              ])
            }
          }
        }
      }

      if (links.medias.length) {
        for (const item of links.medias) {
          const name = item.url.split(window.api.path.sep).pop()
          const target = join(assetsPath, name)
          if (existsSync(target)) {
            item.id = name
            deepMedias.set(pathMap.get(path)!.id, [
              ...(deepMedias.get(pathMap.get(path)!.id) || []),
              name
            ])
            delete item.url
          } else {
            let id = ''
            if (insertedMap.has(item.url)) {
              id = insertedMap.get(item.url)!
              item.id = id
            } else {
              const id = nid() + extname(name)
              item.id = id
              const filePath = join(assetsPath, id)
              await window.api.fs.cp(item.url, filePath)
              await this.store.model.createFiles([
                {
                  name: id,
                  spaceId: this.store.note.state.currentSpace!.id,
                  created: Date.now(),
                  size: window.api.fs.statSync(filePath)?.size || 0
                }
              ])
              insertedMap.set(item.url, id)
            }
            delete item.url
            deepMedias.set(pathMap.get(path)!.id, [
              ...(deepMedias.get(pathMap.get(path)!.id) || []),
              id
            ])
          }
        }
      }
    }
    for (const doc of insertNodes) {
      if (doc.isset) {
        continue
      }
      await this.store.model.createDoc({
        id: doc.id,
        name: doc.name,
        spaceId: this.store.note.state.currentSpace!.id,
        created: doc.created,
        updated: doc.updated,
        parentId: doc.parentId,
        folder: doc.folder,
        sort: doc.sort,
        schema: doc.schema,
        links: deepDenceLink.get(doc.id) || [],
        medias: deepMedias.get(doc.id) || []
      })

      if (!doc.folder) {
        this.udpateNodes.push(doc)
      }
    }
    await this.store.note.selectSpace(this.store.note.state.currentSpace!.id)
    await this.delayUpdate()
  }
  async importFolder(parentDoc?: IDoc | null) {
    const parent = parentDoc || this.store.note.state.root
    const pathMap = new Map(
      Object.values(this.store.note.state.nodes).map((item) => [
        this.store.note.getDocPath(item).join('/'),
        item
      ])
    )
    const res = await this.store.system.showOpenDialog({
      properties: ['openDirectory']
    })
    if (!res.filePaths.length) return
    this.dataCache = undefined
    const root = res.filePaths[0]
    const { join } = window.api.path
    const insertNodes: ImportDoc[] = []
    const spaceId = this.store.note.state.currentSpace!.id
    const now = Date.now()
    const allMedias: any[] = []
    const linkMap = new Map<string, { links: any[]; wikiLinks: any[]; medias: any[] }>()
    const parentPath = this.store.note.getDocPath(parent).join(window.api.path.sep)
    const readDir = async (dir: string, parent: IDoc) => {
      const files = window.api.fs.readdirSync(dir)
      for (const f of files) {
        if (f.startsWith('.')) continue
        const target = join(dir, f)
        const stat = window.api.fs.statSync(target)
        let spacePath = join(parentPath, target.replace(join(root) + window.api.path.sep, ''))
        if (stat?.folder) {
          if (!pathMap.get(spacePath)?.folder) {
            const node: ImportDoc = {
              id: nid(),
              name: f,
              spaceId,
              sort: 0,
              updated: now,
              parentId: parent.id,
              folder: true,
              created: now,
              path: spacePath,
              isset: pathMap.has(spacePath)
            }
            pathMap.set(spacePath, node)
            insertNodes.push(node)
            await readDir(target, node)
          } else {
            await readDir(target, pathMap.get(spacePath)!)
            insertNodes.push({
              ...pathMap.get(spacePath)!,
              path: spacePath,
              isset: pathMap.has(spacePath)
            })
          }
        } else if (/\.md$/i.test(f) && stat?.size && stat.size < 1 * mb) {
          spacePath = spacePath.replace(/\.md$/i, '')
          const node: ImportDoc = {
            id: nid(),
            name: f.replace(/\.md$/, ''),
            spaceId,
            sort: parent.children?.length || 1,
            updated: now,
            parentId: parent.id,
            folder: false,
            created: now,
            path: spacePath,
            isset: pathMap.has(spacePath)
          }
          const schema = await this.store.worker.parseMarkdown(
            await window.api.fs.readFile(target, { encoding: 'utf-8' })
          )
          const { links, wikiLinks, medias } = this.findDocLinks(schema, {
            root,
            spacePath
          })
          allMedias.push(...medias)
          linkMap.set(spacePath, { links, wikiLinks, medias })
          node.schema = schema
          pathMap.set(spacePath, node)
          insertNodes.push(node)
        }
      }
    }
    await readDir(root, parent)
    const top: ImportDoc[] = []
    const foldersMap = new Map<string, ImportDoc[]>()
    const folders: ImportDoc[] = []
    for (const node of insertNodes) {
      if (node.parentId === parent.id) {
        top.push(node)
      } else {
        foldersMap.set(node.parentId, [...(foldersMap.get(node.parentId) || []), node])
      }
      if (node.folder) {
        folders.push(node)
      }
    }
    folders.map((folder) => {
      const children = foldersMap.get(folder.id) || []
      folder.children = children
    })
    this.dataCache = {
      root,
      linkMap,
      insertNodes,
      pathMap
    }

    return {
      tree: top,
      docs: insertNodes.reduce((a, b) => a + (!b.folder && !b.isset ? 1 : 0), 0),
      images: allMedias.length
    }
  }
}
