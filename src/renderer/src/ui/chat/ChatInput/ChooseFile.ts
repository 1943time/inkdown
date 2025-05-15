import { excelToCsv } from '@/parser/excelParser'
import { PDFParser } from '@/parser/pdfParser'
import { WordParser } from '@/parser/wordParser'
import { IMessageFile } from 'types/model'
import { fileOpen } from 'browser-fs-access'
import { nanoid } from 'nanoid'
import { nid } from '@/utils/common'

const programmingFileExtensions = [
  '.py',
  '.pyi',
  '.pyx', // Python
  '.java', // Java（排除.class、.jar）
  '.c',
  '.h',
  '.C', // C语言
  '.cpp',
  '.cxx',
  '.cc',
  '.hpp', // C++
  '.js',
  '.jsx',
  '.mjs', // JavaScript/TypeScript
  '.ts',
  '.tsx',
  '.d.ts', // TypeScript
  '.cs',
  '.csproj', // C#
  '.php',
  '.php3',
  '.php4',
  '.php5',
  '.phtml', // PHP
  '.rb',
  '.rake',
  '.erb',
  '.slim', // Ruby
  '.swift',
  '.playground', // Swift
  '.go', // Go
  '.rs', // Rust
  '.kt',
  '.kts', // Kotlin
  '.scala',
  '.sc', // Scala
  '.pl',
  '.pm',
  '.t', // Perl
  '.sh',
  '.bash',
  '.zsh', // Shell
  '.sql',
  '.ddl',
  '.dml',
  '.plsql', // SQL/PLSQL
  '.dart', // Dart
  '.lua', // Lua
  '.R',
  '.r',
  '.rds', // R语言
  '.m',
  '.mlx', // MATLAB/Octave
  '.html',
  '.htm',
  '.css', // HTML/CSS
  '.jsx', // React JSX
  '.vue', // Vue.js
  '.hs',
  '.lhs', // Haskell
  '.ml',
  '.mli', // OCaml
  '.fs',
  '.fsi',
  '.fsx', // F#
  '.pro',
  '.pl', // Prolog
  '.erl',
  '.hrl', // Erlang
  '.ex',
  '.exs', // Elixir
  '.clj',
  '.cljs',
  '.cljc', // Clojure
  '.jl', // Julia
  '.asm',
  '.s', // 汇编语言
  '.d', // D语言
  '.zig', // Zig
  '.vim', // Vim脚本
  '.el', // Emacs Lisp
  '.hx', // Haxe
  '.coffee', // CoffeeScript
  '.sass',
  '.scss',
  '.less',
  '.styl', // CSS预处理器
  '.jinja', // Jinja模板
  '.ps1',
  '.psm1', // PowerShell
  '.vbs', // VBScript
  '.vb', // VB.NET
  '.f',
  '.f90',
  '.f95', // Fortran
  '.cob',
  '.cbl', // COBOL
  '.pas',
  '.p', // Pascal
  '.adb',
  '.ads', // Ada
  '.raku',
  '.pl6', // Raku（前称Perl6）
  '.thrift', // Thrift接口定义
  '.graphql',
  '.gql', // GraphQL
  '.sol', // Solidity（以太坊智能合约）

  // 配置与模板文件（非代码但相关）
  '.json', // JSON配置
  '.yaml',
  '.yml', // YAML配置
  '.xml', // XML配置/数据
  '.md',
  '.markdown', // Markdown文档
  '.ini', // INI配置
  '.properties' // Java属性文件
]

export const chooseFile = async (onParsed: (id: string, content: string | null) => void) => {
  const file = await fileOpen({
    extensions: ['.csv', '.xlsx', '.xls', '.pdf', '.docx', ...programmingFileExtensions],
    multiple: false
  })
  const contents: IMessageFile[] = []
  const runTask = async (items: IMessageFile[]) => {
    for (let i = 0; i < items.length; i++) {
      const item = items[i]
      try {
        if (item.content) {
          continue
        }
        if (/\.(pdf)$/.test(item.name)) {
          const res = await PDFParser.parsePDF(file)
          onParsed(item.id, res.text)
        } else if (/\.(xlsx|xls|csv)$/.test(item.name)) {
          const res = await excelToCsv(file, { format: 'markdown' })
          onParsed(item.id, res.map((v) => v.content).join('\n\n'))
        } else if (/\.docx$/.test(item.name)) {
          const res = await WordParser.processForLLM(file)
          onParsed(item.id, res)
        }
      } catch (error) {
        console.error(`Parse file ${item.name} error`, error)
        onParsed(item.id, null)
      }
    }
  }
  const extension = file.name.split('.').pop()
  const content = programmingFileExtensions.includes(`.${extension}`) ? await file.text() : ''
  contents.push({
    id: nid(),
    name: file.name,
    size: file.size,
    status: 'pending',
    content
  })
  runTask(contents)
  return contents
}
