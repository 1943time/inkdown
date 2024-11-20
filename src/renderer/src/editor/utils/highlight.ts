import {bundledLanguages, bundledThemes, getHighlighter, Highlighter} from 'shiki'
import {runInAction} from 'mobx'
import { Core } from '../../store/core'

export const codeThemes = new Set(Object.keys(bundledThemes))
export const allLanguages = Object.keys(bundledLanguages)
export const langSet = new Set(allLanguages)
export let highlighter:Highlighter
export const loadedLanguage = new Set<string>(['tex'])

export const codeReady = async (core: Core, allLanguage = false) => {
  const config = core.config
  if (!codeThemes.has(config.config.codeTheme) && config.config.codeTheme !== 'auto') {
    runInAction(() => {
      config.config.codeTheme = 'auto'
    })
  }
  highlighter = await getHighlighter({
    themes: [
      config.curCodeTheme
    ],
    langs: allLanguage ? allLanguages : ['tex']
  }).then((res) => {
    try {
      const theme = res.getTheme(config.curCodeTheme as any)
      runInAction(() => {
        config.config.codeBackground = theme.bg
        config.codeDark = theme.type === 'dark'
      })
    } catch (e) {}
    return res
  })
}
