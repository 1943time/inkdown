import {createContext} from 'react'

export const HtmlContext = createContext({
  codeTabSize: 2,
  book: false,
  showCodeLineNum: false
})
