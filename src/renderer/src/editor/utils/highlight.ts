import {bundledLanguages, bundledThemes, getHighlighter, Highlighter} from 'shiki'
import {configStore} from '../../store/config'
import {runInAction} from 'mobx'

export const codeThemes = new Set(Object.keys(bundledThemes))
export const allLanguages = Object.keys(bundledLanguages)
export const langSet = new Set(allLanguages)
export let highlighter:Highlighter
export const loadedLanguage = new Set<string>(['tex'])

export const codeReady = async (allLanguage = false) => {
  if (!codeThemes.has(configStore.config.codeTheme)) {
    runInAction(() => {
      configStore.config.codeTheme = 'one-dark-pro'
    })
  }
  highlighter = await getHighlighter({
    themes: [
      configStore.config.codeTheme
    ],
    langs: allLanguage ? allLanguages : ['tex']
  }).then((res) => {
    try {
      const theme = res.getTheme(configStore.config.codeTheme as any)
      runInAction(() => {
        configStore.config.codeBackground = theme.bg
        configStore.codeDark = theme.type === 'dark'
      })
    } catch (e) {}
    return res
  })
}
