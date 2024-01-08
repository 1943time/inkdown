import {observer} from 'mobx-react-lite'
import {useLocalState} from '../../hooks/useLocalState'
import js from './langIcons/javascript.svg'
import jsx from './langIcons/react.svg'
import abap from './langIcons/abap.svg'
import actionscript from './langIcons/actionscript.svg'
import ada from './langIcons/ada.svg'
import applescript from './langIcons/applescript.svg'
import astro from './langIcons/astro.svg'
import apex from './langIcons/apex.svg'
import apache from './langIcons/apache.svg'
import apl from './langIcons/apl.svg'
import awk from './langIcons/awk.svg'
import ballerina from './langIcons/ballerina.svg'
import bat from './langIcons/bat.svg'
import bicep from './langIcons/bicep.svg'
import blade from './langIcons/blade.svg'
import c from './langIcons/c.svg'
import cadence from './langIcons/cadence.svg'
import clojure from './langIcons/clojure.svg'
import cmake from './langIcons/cmake.svg'
import cobol from './langIcons/cobol.svg'
import codeql from './langIcons/codeql.svg'
import coffee from './langIcons/coffee.svg'
import cpp from './langIcons/cpp.svg'
import crystal from './langIcons/crystal.svg'
import csharp from './langIcons/csharp.svg'
import css from './langIcons/css.svg'
import d from './langIcons/d.svg'
import dart from './langIcons/dart.svg'
import diff from './langIcons/diff.svg'
import docker from './langIcons/docker.svg'
import elixir from './langIcons/elixir.svg'
import elm from './langIcons/elm.svg'
import erb from './langIcons/erb.svg'
import erlang from './langIcons/erlang.svg'
import fsharp from './langIcons/fsharp.svg'
import gdscript from './langIcons/gdscript.svg'
import glsl from './langIcons/glsl.svg'
import gnuplot from './langIcons/gnuplot.svg'
import go from './langIcons/go.svg'
import graphql from './langIcons/graphql.svg'
import groovy from './langIcons/groovy.svg'
import hack from './langIcons/hack.svg'
import haml from './langIcons/haml.svg'
import handlebars from './langIcons/handlebars.svg'
import haskell from './langIcons/haskell.svg'
import hcl from './langIcons/hcl_light.svg'
import hjson from './langIcons/hjson.svg'
import hlsl from './langIcons/hlsl.svg'
import html from './langIcons/html.svg'
import http from './langIcons/http.svg'
import imba from './langIcons/imba.svg'
import ini from './langIcons/ini.svg'
import java from './langIcons/java.svg'
import jinja from './langIcons/jinja.svg'
import json from './langIcons/json.svg'
import json5 from './langIcons/json5.svg'
import jsonnet from './langIcons/jsonnet.svg'
import julia from './langIcons/julia.svg'
import kotlin from './langIcons/kotlin.svg'
import kusto from './langIcons/kusto.svg'
import tex from './langIcons/tex.svg'
import less from './langIcons/less.svg'
import liquid from './langIcons/liquid.svg'
import lisp from './langIcons/lisp.svg'
import lua from './langIcons/lua.svg'
import make from './langIcons/makefile.svg'
import md from './langIcons/markdown.svg'
import marko from './langIcons/markojs.svg'
import matlab from './langIcons/matlab.svg'
import mdx from './langIcons/mdx.svg'
import mermaid from './langIcons/mermaid.svg'
import mojo from './langIcons/mojo.svg'
import nginx from './langIcons/nginx.svg'
import nim from './langIcons/nim.svg'
import nix from './langIcons/nix.svg'
import oc from './langIcons/objective-c.svg'
import ocpp from './langIcons/objective-cpp.svg'
import ocaml from './langIcons/ocaml.svg'
import pascal from './langIcons/pascal.svg'
import perl from './langIcons/perl.svg'
import php from './langIcons/php.svg'
import sql from './langIcons/database.svg'
import postcss from './langIcons/postcss.svg'
import powershell from './langIcons/powershell.svg'
import prisma from './langIcons/prisma.svg'
import prolog from './langIcons/prolog.svg'
import proto from './langIcons/proto.svg'
import pug from './langIcons/pug.svg'
import puppet from './langIcons/puppet.svg'
import purescript from './langIcons/purescript.svg'
import python from './langIcons/python.svg'
import r from './langIcons/r.svg'
import perl6 from './langIcons/perl6.svg'
import razor from './langIcons/razor.svg'
import ruby from './langIcons/ruby.svg'
import rust from './langIcons/rust.svg'
import sas from './langIcons/sas.svg'
import sass from './langIcons/sass.svg'
import scala from './langIcons/scala.svg'
import scheme from './langIcons/scheme.svg'
import shaderlab from './langIcons/shaderlab.svg'
import shell from './langIcons/console.svg'
import solidity from './langIcons/solidity.svg'
import sparql from './langIcons/sparql.svg'
import stylus from './langIcons/stylus.svg'
import svelte from './langIcons/svelte.svg'
import swift from './langIcons/swift.svg'
import systemverilog from './langIcons/systemverilog.svg'
import tcl from './langIcons/tcl.svg'
import toml from './langIcons/toml.svg'
import tsx from './langIcons/react_ts.svg'
import twig from './langIcons/twig.svg'
import ts from './langIcons/typescript.svg'
import verilog from './langIcons/verilog.svg'
import vhdl from './langIcons/vhdl.svg'
import vim from './langIcons/vim.svg'
import vue from './langIcons/vue.svg'
import wasm from './langIcons/webassembly.svg'
import wenyan from './langIcons/wenyan.svg'
import wgsl from './langIcons/wgsl.svg'
import wolfram from './langIcons/wolframlanguage.svg'
import xml from './langIcons/xml.svg'
import xsl from './langIcons/xsl.svg'
import yaml from './langIcons/yaml.svg'
import zig from './langIcons/zig.svg'
import {useCallback, useEffect, useRef} from 'react'
import {useEditorStore} from '../store'
import {Editor, Element, Transforms} from 'slate'
import {ReactEditor} from 'slate-react'
import {getOffsetLeft, getOffsetTop} from '../utils/dom'
import isHotkey from 'is-hotkey'
import {useSubject} from '../../hooks/subscribe'
import {runInAction} from 'mobx'
import {clearAllCodeCache, codeCache} from '../plugins/useHighlight'

const iconMap = new Map([
  ['zig', zig],
  ['yml', yaml],
  ['yaml', yaml],
  ['xsl', xsl],
  ['xml', xml],
  ['wolfram', wolfram],
  ['wgsl', wgsl],
  ['wenyan', wenyan],
  ['wasm', wasm],
  ['vue', vue],
  ['viml', vim],
  ['vimscript', vim],
  ['vim', vim],
  ['vhdl', vhdl],
  ['verilog', verilog],
  ['ts', ts],
  ['typescript', ts],
  ['twig', twig],
  ['tsx', tsx],
  ['toml', toml],
  ['tcl', tcl],
  ['system-verilog', systemverilog],
  ['swift', swift],
  ['svelte', svelte],
  ['styl', stylus],
  ['stylus', stylus],
  ['sparql', sparql],
  ['solidity', solidity],
  ['shell', shell],
  ['shellsession', shell],
  ['console', shell],
  ['shellscript', shell],
  ['bash', shell],
  ['sh', shell],
  ['zsh', shell],
  ['shader', shaderlab],
  ['shaderlab', shaderlab],
  ['scheme', scheme],
  ['scala', scala],
  ['scss', sass],
  ['sass', sass],
  ['sas', sas],
  ['rs', rust],
  ['rust', rust],
  ['rb', ruby],
  ['ruby', ruby],
  ['razor', razor],
  ['per16', perl6],
  ['raku', perl6],
  ['r', r],
  ['py', python],
  ['python', python],
  ['purescript', purescript],
  ['puppet', puppet],
  ['jade', pug],
  ['pug', pug],
  ['proto', proto],
  ['prolog', prolog],
  ['prisma', prisma],
  ['powershell', powershell],
  ['ps', powershell],
  ['ps1', powershell],
  ['postcss', postcss],
  ['sql', sql],
  ['plsql', sql],
  ['php', php],
  ['perl', perl],
  ['pascal', pascal],
  ['ocaml', ocaml],
  ['objective-cpp', ocpp],
  ['objective-c', oc],
  ['objc', oc],
  ['nix', nix],
  ['nim', nim],
  ['nginx', nginx],
  ['mojo', mojo],
  ['mermaid', mermaid],
  ['mdx', mdx],
  ['matlab', matlab],
  ['marko', marko],
  ['markdown', md],
  ['md', md],
  ['makefile', make],
  ['make', make],
  ['lua', lua],
  ['lisp', lisp],
  ['liquid', liquid],
  ['less', less],
  ['latex', tex],
  ['tex', tex],
  ['kql', kusto],
  ['kusto', kusto],
  ['js', js],
  ['javascript', js],
  ['jsx', jsx],
  ['abap', abap],
  ['actionscript-3', actionscript],
  ['ada', ada],
  ['applescript', applescript],
  ['astro', astro],
  ['apex', apex],
  ['apache', apache],
  ['apl', apl],
  ['awk', awk],
  ['ballerina', ballerina],
  ['bat', bat],
  ['batch', bat],
  ['bicep', bicep],
  ['blade', blade],
  ['c', c],
  ['cadence', cadence],
  ['cdc', cadence],
  ['clojure', clojure],
  ['cjl', clojure],
  ['cmake', cmake],
  ['cobol', cobol],
  ['codeql', codeql],
  ['ql', codeql],
  ['coffee', coffee],
  ['cpp', cpp],
  ['c++', cpp],
  ['crystal', crystal],
  ['csharp', csharp],
  ['c#', csharp],
  ['cs', csharp],
  ['d', d],
  ['dart', dart],
  ['diff', diff],
  ['css', css],
  ['docker', docker],
  ['dockerfile', docker],
  ['elixir', elixir],
  ['elm', elm],
  ['erb', erb],
  ['erlang', erlang],
  ['erl', erlang],
  ['fsharp', fsharp],
  ['f#', fsharp],
  ['fs', fsharp],
  ['gdscript', gdscript],
  ['glsl', glsl],
  ['gnuplot', gnuplot],
  ['go', go],
  ['graphql', graphql],
  ['gql', graphql],
  ['groovy', groovy],
  ['hack', hack],
  ['haml', haml],
  ['handlebars', handlebars],
  ['hbs', handlebars],
  ['haskell', haskell],
  ['hs', haskell],
  ['hcl', hcl],
  ['hjson', hjson],
  ['hlsl', hlsl],
  ['html', html],
  ['http', http],
  ['imba', imba],
  ['ini', ini],
  ['properties', ini],
  ['java', java],
  ['jinja-html', jinja],
  ['json', json],
  ['json5', json5],
  ['jsonnet', jsonnet],
  ['julia', julia],
  ['kotlin', kotlin],
  ['kt', kotlin],
  ['kts', kotlin]
])
const list = Array.from(iconMap).map(item => {
  return {icon: item[1], lang: item[0]}
}).sort((a, b) => a.lang > b.lang ? 1 : -1)
export const LangAutocomplete = observer(() => {
  const store = useEditorStore()
  const dom = useRef<HTMLDivElement>(null)
  const path = useRef<number[]>([])
  const [state, setState] = useLocalState({
    index: -1,
    showOptions: [] as {icon: string, lang: string}[],
    left: 0,
    top: 0,
    text: ''
  })
  const keydown = useCallback((e: KeyboardEvent) => {
    if (state.showOptions.length && (e.key === 'ArrowUp' || e.key === 'ArrowDown')) {
      e.preventDefault()
      if (e.key === 'ArrowUp' && state.index > 0) {
        setState({index: state.index - 1})
        const target = dom.current!.children[state.index] as HTMLDivElement
        if (dom.current!.scrollTop > target.offsetTop) {
          dom.current!.scroll({
            top: dom.current!.scrollTop - 160 + 30
          })
        }
      }
      if (e.key === 'ArrowDown' && state.index < state.showOptions.length - 1) {
        setState({index: state.index + 1})
        const target = dom.current!.children[state.index] as HTMLDivElement
        if (target.offsetTop > dom.current!.scrollTop + dom.current!.clientHeight - 30) {
          dom.current!.scroll({
            top: target.offsetTop
          })
        }
      }
    }
    if (e.key === 'Enter' && store.openLangCompletion) {
      e.preventDefault()
      const current = state.showOptions[state.index]
      createCodeFence(current ? current.lang : state.text)
    }
  }, [])
  useSubject(store.langCompletionText, text => {
    text = text || ''
    setState({
      index: -1,
      text,
      showOptions: list.filter(l => l.lang.startsWith(text.toLowerCase()))
    })
  })
  useEffect(() => {
    if (store.openLangCompletion) {
      try {
        const [node] = Editor.nodes<any>(store.editor, {
          match: n => Element.isElement(n),
          mode: 'lowest'
        })
        path.current = node[1]
        if (node[0].type === 'paragraph') {
          const el = ReactEditor.toDOMNode(store.editor, node[0])
          if (el) {
            let top = getOffsetTop(el, store.container!)
            if (store.container!.scrollTop + window.innerHeight - 186 < top) {
              store.container!.scroll({
                top: top - 100
              })
            }
            setState({
              left: getOffsetLeft(el, store.container!),
              top: top + el.clientHeight
            })
          }
        }
        window.addEventListener('keydown', keydown)
      } catch (e) {
        console.error('openLangCompletion', e)
      }
    } else {
      window.removeEventListener('keydown', keydown)
    }
  }, [store.openLangCompletion])

  const createCodeFence = useCallback((lang: string) => {
    clearAllCodeCache(store.editor)
    Transforms.delete(store.editor, {at: path.current})
    Transforms.insertNodes(store.editor, {
      type: 'code', language: lang, children: [{type: 'code-line', children: [{text: ''}]}]
    }, {at: path.current, select: true})
    runInAction(() => store.openLangCompletion = false)
    ReactEditor.focus(store.editor)
  }, [])
  return (
    <div
      ref={dom}
      className={`
      ${!store.openLangCompletion || !state.showOptions.length ? 'hidden' : ''}
      shadow shadow-slate-500/10 absolute z-50 left-0 top-0 w-40 max-h-40 overflow-y-auto
      border border-slate-100 rounded-lg py-1 bg-white text-gray-700 dark:text-gray-300 dark:bg-zinc-900 dark:border-zinc-800 dark:shadow-zinc-800/10
      `}
      style={{
        left: state.left,
        top: state.top
      }}
    >
      {state.showOptions.map((l, i) =>
        <div
          key={l.lang}
          className={`px-2 py-1.5 flex items-center cursor-pointer
          ${i === state.index ? 'bg-gray-100 dark:bg-gray-300/10' : ''}`}
          onMouseEnter={() => setState({index: i})}
          onClick={(e) => {
            e.preventDefault()
            e.stopPropagation()
            createCodeFence(l.lang)
          }}
        >
          <img src={l.icon} alt="" className={'w-4 h-4 mr-1.5'}/>
          <span>{l.lang}</span>
        </div>
      )}
    </div>
  )
})
