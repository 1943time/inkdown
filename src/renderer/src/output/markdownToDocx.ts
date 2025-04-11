import { Document, Packer, Paragraph, TextRun, HeadingLevel, TableRow, TableCell, Table, BorderStyle } from 'docx'
import { remark } from 'remark'
import remarkGfm from 'remark-gfm'
import remarkMath from 'remark-math'
import remarkParse from 'remark-parse'
import { visit } from 'unist-util-visit'
import { Node } from 'unist'
import { fileSave } from 'browser-fs-access'
interface MarkdownToDocxOptions {
  filename?: string
  title?: string
  author?: string
}

/**
 * Converts GitHub Flavored Markdown to a docx file
 * @param markdown The markdown content to convert
 * @param options Options for the conversion
 * @returns A Promise that resolves when the docx file is saved
 */
export const markdownToDocx = async (markdown: string, options: MarkdownToDocxOptions = {}): Promise<void> => {
  const { filename = 'document.docx', title = 'Markdown Document', author = 'Generated Document' } = options

  // Parse markdown with GFM and Math support
  const processor = remark().use(remarkParse).use(remarkGfm).use(remarkMath)
  const ast = processor.parse(markdown)

  // Convert AST to docx elements
  const docElements = await processMarkdownAst(ast)

  // Create document
  const doc = new Document({
    creator: author,
    title,
    description: 'Document converted from Markdown using GFM standard',
    sections: [
      {
        properties: {},
        children: docElements
      }
    ]
  })

  // Generate and save docx
  const buffer = await Packer.toBuffer(doc)
  fileSave(new Blob([buffer]), { fileName: filename })
}

/**
 * Process the markdown AST and convert it to docx elements
 */
const processMarkdownAst = async (ast: Node): Promise<Array<any>> => {
  const elements: Array<any> = []

  visit(ast, (node: any) => {
    switch (node.type) {
      case 'heading':
        elements.push(createHeading(node))
        break
      case 'paragraph':
        elements.push(createParagraph(node))
        break
      case 'list':
        elements.push(...createList(node))
        break
      case 'table':
        elements.push(createTable(node))
        break
      case 'code':
        elements.push(createCodeBlock(node))
        break
      case 'blockquote':
        elements.push(...createBlockquote(node))
        break
      case 'math':
        elements.push(createMathBlock(node))
        break
      // Add more node types as needed
    }
  })

  return elements
}

/**
 * Create a heading element
 */
const createHeading = (node: any): Paragraph => {
  const level = node.depth
  const headingLevel =
    level === 1
      ? HeadingLevel.HEADING_1
      : level === 2
        ? HeadingLevel.HEADING_2
        : level === 3
          ? HeadingLevel.HEADING_3
          : level === 4
            ? HeadingLevel.HEADING_4
            : level === 5
              ? HeadingLevel.HEADING_5
              : HeadingLevel.HEADING_6

  return new Paragraph({
    text: getNodeText(node),
    heading: headingLevel
  })
}

/**
 * Create a paragraph element
 */
const createParagraph = (node: any): Paragraph => {
  const children = getTextRuns(node)

  return new Paragraph({
    children
  })
}

/**
 * Create text runs with formatting
 */
const getTextRuns = (node: any): TextRun[] => {
  const runs: TextRun[] = []

  if (!node.children) {
    return [new TextRun(node.value || '')]
  }

  for (const child of node.children) {
    if (child.type === 'text') {
      runs.push(new TextRun(child.value))
    } else if (child.type === 'strong') {
      runs.push(
        new TextRun({
          text: getNodeText(child),
          bold: true
        })
      )
    } else if (child.type === 'emphasis') {
      runs.push(
        new TextRun({
          text: getNodeText(child),
          italics: true
        })
      )
    } else if (child.type === 'delete') {
      runs.push(
        new TextRun({
          text: getNodeText(child),
          strike: true
        })
      )
    } else if (child.type === 'link') {
      runs.push(
        new TextRun({
          text: getNodeText(child),
          style: 'Hyperlink'
          // link: {
          //   url: child.url
          // }
        })
      )
    } else if (child.type === 'inlineCode') {
      runs.push(
        new TextRun({
          text: child.value,
          font: 'Courier New'
        })
      )
    } else if (child.type === 'inlineMath') {
      runs.push(
        new TextRun({
          text: child.value,
          italics: true,
          color: '000080'
        })
      )
    } else {
      runs.push(new TextRun(getNodeText(child)))
    }
  }

  return runs
}

/**
 * Create a list of paragraphs
 */
const createList = (node: any): Paragraph[] => {
  const paragraphs: Paragraph[] = []
  const isOrdered = node.ordered

  // let counter = node.start || 1

  for (const item of node.children) {
    const level = 0
    const paragraph = new Paragraph({
      text: getNodeText(item),
      bullet: isOrdered
        ? {
            level
            // num: counter++
          }
        : {
            level
          }
    })

    paragraphs.push(paragraph)
  }

  return paragraphs
}

/**
 * Create a table element
 */
const createTable = (node: any): Table => {
  const rows: TableRow[] = []

  // Add header row
  if (node.children.length > 0 && node.children[0].type === 'tableRow') {
    const headerRow = createTableRow(node.children[0], true)
    rows.push(headerRow)
  }

  // Add data rows
  for (let i = 1; i < node.children.length; i++) {
    if (node.children[i].type === 'tableRow') {
      const row = createTableRow(node.children[i], false)
      rows.push(row)
    }
  }

  return new Table({
    rows,
    width: {
      size: 100,
      type: 'pct'
    }
  })
}

/**
 * Create a table row
 */
const createTableRow = (node: any, isHeader: boolean): TableRow => {
  const cells: TableCell[] = []

  for (const cell of node.children) {
    if (cell.type === 'tableCell') {
      cells.push(
        new TableCell({
          children: [new Paragraph(getNodeText(cell))],
          shading: isHeader
            ? {
                fill: 'EEEEEE'
              }
            : undefined,
          borders: {
            top: { style: BorderStyle.SINGLE, size: 1, color: 'auto' },
            bottom: { style: BorderStyle.SINGLE, size: 1, color: 'auto' },
            left: { style: BorderStyle.SINGLE, size: 1, color: 'auto' },
            right: { style: BorderStyle.SINGLE, size: 1, color: 'auto' }
          }
        })
      )
    }
  }

  return new TableRow({
    children: cells
  })
}

/**
 * Create a code block
 */
const createCodeBlock = (node: any): Paragraph => {
  return new Paragraph({
    text: node.value,
    // font: 'Courier New',
    spacing: {
      before: 200,
      after: 200
    },
    shading: {
      fill: 'F5F5F5'
    }
  })
}

/**
 * Create a blockquote
 */
const createBlockquote = (node: any): Paragraph[] => {
  const paragraphs: Paragraph[] = []

  visit(node, 'paragraph', (paragraph) => {
    paragraphs.push(
      new Paragraph({
        text: getNodeText(paragraph),
        indent: {
          left: 720 // 0.5 inch in twips
        },
        border: {
          left: {
            color: '#CCCCCC',
            style: BorderStyle.SINGLE,
            size: 2
          }
        },
        spacing: {
          before: 120,
          after: 120
        }
      })
    )
  })

  return paragraphs
}

/**
 * Create a math block
 */
const createMathBlock = (node: any): Paragraph => {
  return new Paragraph({
    text: node.value,
    // italics: true,
    alignment: 'center',
    spacing: {
      before: 200,
      after: 200
    }
    // color: '000080'
  })
}

/**
 * Get text content from a node
 */
const getNodeText = (node: any): string => {
  let text = ''

  if (node.value) {
    return node.value
  }

  if (node.children) {
    for (const child of node.children) {
      text += getNodeText(child)
    }
  }

  return text
}

/**
 * Export markdown string to a docx file
 * @param markdown The markdown content as string
 * @param outputPath The output file path
 */
export const exportMarkdownToDocx = async (markdown: string, options: MarkdownToDocxOptions = {}): Promise<void> => {
  try {
    await markdownToDocx(markdown, options)
    return Promise.resolve()
  } catch (error) {
    return Promise.reject(error)
  }
}
