import ext from 'ace-builds/src-noconflict/ext-modelist'
import 'ace-builds/src-noconflict/theme-cloud_editor'
import 'ace-builds/src-noconflict/theme-cloud_editor_dark'
// import 'ace-builds/src-noconflict/mode-tsx'
// import 'ace-builds/src-noconflict/mode-javascript'
// import 'ace-builds/src-noconflict/mode-typescript'
// import 'ace-builds/src-noconflict/mode-swift'
// import 'ace-builds/src-noconflict/mode-objectivec'
// import 'ace-builds/src-noconflict/mode-kotlin'
// import 'ace-builds/src-noconflict/mode-java'
// import 'ace-builds/src-noconflict/mode-scala'
// import 'ace-builds/src-noconflict/mode-json'
// import 'ace-builds/src-noconflict/mode-json5'
// import 'ace-builds/src-noconflict/mode-hjson'
// import 'ace-builds/src-noconflict/mode-vue'
// import 'ace-builds/src-noconflict/mode-xml'
// import 'ace-builds/src-noconflict/mode-yaml'
// import 'ace-builds/src-noconflict/mode-zig'
// import 'ace-builds/src-noconflict/mode-vbscript'
// import 'ace-builds/src-noconflict/mode-nginx'
// import 'ace-builds/src-noconflict/mode-prisma'
// import 'ace-builds/src-noconflict/mode-sql'
// import 'ace-builds/src-noconflict/mode-html'
// import 'ace-builds/src-noconflict/mode-ruby'
// import 'ace-builds/src-noconflict/mode-rust'
// import 'ace-builds/src-noconflict/mode-basic'
// import 'ace-builds/src-noconflict/mode-jsx'
// import 'ace-builds/src-noconflict/mode-coffee'
// import 'ace-builds/src-noconflict/mode-tex'
// import 'ace-builds/src-noconflict/mode-latex'
// import 'ace-builds/src-noconflict/mode-toml'
// import 'ace-builds/src-noconflict/mode-svg'
// import 'ace-builds/src-noconflict/mode-stylus'
// import 'ace-builds/src-noconflict/mode-sh'
// import 'ace-builds/src-noconflict/mode-tcl'
// import 'ace-builds/src-noconflict/mode-scss'
// import 'ace-builds/src-noconflict/mode-sass'
// import 'ace-builds/src-noconflict/mode-less'
// import 'ace-builds/src-noconflict/mode-css'
// import 'ace-builds/src-noconflict/mode-csharp'
// import 'ace-builds/src-noconflict/mode-rhtml'
// import 'ace-builds/src-noconflict/mode-r'
// import 'ace-builds/src-noconflict/mode-raku'
// import 'ace-builds/src-noconflict/mode-razor'
// import 'ace-builds/src-noconflict/mode-abap'
// import 'ace-builds/src-noconflict/mode-abc'
// import 'ace-builds/src-noconflict/mode-actionscript'
// import 'ace-builds/src-noconflict/mode-ada'
// import 'ace-builds/src-noconflict/mode-apache_conf'
// import 'ace-builds/src-noconflict/mode-apex'
// import 'ace-builds/src-noconflict/mode-applescript'
// import 'ace-builds/src-noconflict/mode-aql'
// import 'ace-builds/src-noconflict/mode-asl'
// import 'ace-builds/src-noconflict/mode-asciidoc'
// import 'ace-builds/src-noconflict/mode-assembly_x86'
// import 'ace-builds/src-noconflict/mode-astro'
// import 'ace-builds/src-noconflict/mode-c_cpp'
// import 'ace-builds/src-noconflict/mode-cirru'
// import 'ace-builds/src-noconflict/mode-clojure'
// import 'ace-builds/src-noconflict/mode-python'
// import 'ace-builds/src-noconflict/mode-julia'
// import 'ace-builds/src-noconflict/mode-haskell'
// import 'ace-builds/src-noconflict/mode-graphqlschema'
// import 'ace-builds/src-noconflict/mode-ini'
// import 'ace-builds/src-noconflict/mode-haml'
// import 'ace-builds/src-noconflict/mode-handlebars'
// import 'ace-builds/src-noconflict/mode-groovy'
// import 'ace-builds/src-noconflict/mode-dockerfile'
// import 'ace-builds/src-noconflict/mode-livescript'
// import 'ace-builds/src-noconflict/mode-vhdl'
// import 'ace-builds/src-noconflict/mode-twig'
// import 'ace-builds/src-noconflict/mode-dot'
// import 'ace-builds/src-noconflict/mode-verilog'
// import 'ace-builds/src-noconflict/mode-sparql'
// import 'ace-builds/src-noconflict/mode-scheme'
// import 'ace-builds/src-noconflict/mode-perl'
// import 'ace-builds/src-noconflict/mode-r'
// import 'ace-builds/src-noconflict/mode-protobuf'
// import 'ace-builds/src-noconflict/mode-puppet'
// import 'ace-builds/src-noconflict/mode-jade'
// import 'ace-builds/src-noconflict/mode-prolog'
// import 'ace-builds/src-noconflict/mode-powershell'
// import 'ace-builds/src-noconflict/mode-php'
// import 'ace-builds/src-noconflict/mode-pascal'
// import 'ace-builds/src-noconflict/mode-ocaml'
// import 'ace-builds/src-noconflict/mode-nix'
// import 'ace-builds/src-noconflict/mode-nim'
// import 'ace-builds/src-noconflict/mode-markdown'
// import 'ace-builds/src-noconflict/mode-matlab'
// import 'ace-builds/src-noconflict/mode-makefile'
// import 'ace-builds/src-noconflict/mode-lua'
// import 'ace-builds/src-noconflict/mode-lisp'
// import 'ace-builds/src-noconflict/mode-liquid'
// import 'ace-builds/src-noconflict/mode-cobol'
// import 'ace-builds/src-noconflict/mode-crystal'
// import 'ace-builds/src-noconflict/mode-d'
// import 'ace-builds/src-noconflict/mode-dart'
// import 'ace-builds/src-noconflict/mode-diff'
// import 'ace-builds/src-noconflict/mode-elixir'
// import 'ace-builds/src-noconflict/mode-elm'
// import 'ace-builds/src-noconflict/mode-erlang'
// import 'ace-builds/src-noconflict/mode-fsharp'
// import 'ace-builds/src-noconflict/mode-glsl'
// import 'ace-builds/src-noconflict/mode-golang'

export const modeMap = new Map([
  ['ts', 'typescript'],
  ['js', 'javascript'],
  ['c', 'c_cpp'],
  ['c++', 'c_cpp'],
  ['cpp', 'c_cpp'],
  ['objective-c', 'objectivec'],
  ['objc', 'objectivec'],
  ['yml', 'yaml'],
  ['styl', 'stylus'],
  ['shell', 'sh'],
  ['shellsession', 'sh'],
  ['console', 'sh'],
  ['bash', 'sh'],
  ['zsh', 'sh'],
  ['py', 'python'],
  ['proto', 'protobuf'],
  ['ps', 'powershell'],
  ['md', 'markdown'],
  ['make', 'makefile'],
  ['apach', 'apache_conf'],
  ['cjl', 'clojure'],
  ['c#', 'csharp'],
  ['cs', 'csharp'],
  ['docker', 'dockerfile'],
  ['erl', 'erlang'],
  ['f#', 'fsharp'],
  ['fs', 'fsharp'],
  ['go', 'golang'],
  ['graphql', 'graphqlschema'],
  ['hbs', 'handlebars'],
  ['hs', 'haskell'],
  ['kt', 'kotlin'],
  ['kts', 'kotlin']
])

export const aceLangs = new Set(ext.modes.map((m: any) => m.name))
