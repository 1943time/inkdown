import * as XLSX from 'xlsx'

interface ExcelParserOptions {
  sheetName?: string
  sheetIndex?: number
  headerRow?: number
  format?: 'csv' | 'markdown'
}

/**
 * 将Excel或CSV文件解析为CSV或Markdown格式
 * @param file Excel或CSV文件
 * @param options 解析选项
 * @returns Promise<{sheet: string, content: string}[]> 返回CSV或Markdown格式的字符串数组，每个元素包含sheet名称和内容
 */
export async function excelToCsv(file: File, options: ExcelParserOptions = {}): Promise<{ sheet: string; content: string }[]> {
  const { sheetName, sheetIndex, headerRow = 0, format = 'csv' } = options

  return new Promise((resolve, reject) => {
    const reader = new FileReader()

    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer)

        // 检测文件类型
        const fileType = file.type.toLowerCase()
        const fileName = file.name.toLowerCase()
        const isCSV = fileType === 'text/csv' || fileName.endsWith('.csv')

        let sheets: { name: string; worksheet: XLSX.WorkSheet }[] = []

        if (isCSV) {
          // 处理CSV文件
          const csvText = new TextDecoder().decode(data)
          const worksheet = XLSX.utils.aoa_to_sheet(csvText.split('\n').map((row) => row.split(',').map((cell) => cell.trim())))
          sheets = [
            {
              name: fileName.replace('.csv', ''),
              worksheet
            }
          ]
        } else {
          // 处理Excel文件
          const workbook = XLSX.read(data, { type: 'array' })

          if (sheetName) {
            const worksheet = workbook.Sheets[sheetName]
            if (!worksheet) {
              throw new Error(`Sheet "${sheetName}" not found`)
            }
            sheets = [{ name: sheetName, worksheet }]
          } else if (typeof sheetIndex === 'number') {
            const sheetNames = workbook.SheetNames
            if (sheetIndex >= sheetNames.length) {
              throw new Error(`Sheet index ${sheetIndex} out of range`)
            }
            const name = sheetNames[sheetIndex]
            sheets = [{ name, worksheet: workbook.Sheets[name] }]
          } else {
            // 处理所有工作表
            sheets = workbook.SheetNames.map((name) => ({
              name,
              worksheet: workbook.Sheets[name]
            }))
          }
        }

        // 处理每个工作表
        const results = sheets.map(({ name, worksheet }) => {
          // 将工作表转换为JSON数组
          const jsonData = XLSX.utils.sheet_to_json<any>(worksheet, {
            header: 'A',
            range: headerRow
          })

          if (jsonData.length === 0) {
            return {
              sheet: name,
              content: `Sheet: ${name}\nNo data found in sheet`
            }
          }
          const maxColumns = jsonData
            .map((item) => {
              return Object.keys(item)
                .sort((a, b) => (a.charCodeAt(0) < b.charCodeAt(0) ? 1 : -1))[0]
                .charCodeAt(0)
            })
            .reduce((a, b) => {
              return a > b ? a : b
            })
          const columns = Array.from({ length: maxColumns - 64 }, (_, i) => String.fromCharCode(i + 65))

          // 生成CSV内容
          let content = 'Table: ' + name + '\n'

          if (format === 'markdown') {
            // Markdown格式
            content += '| ' + columns.map((col) => jsonData[0][col]).join(' | ') + ' |\n'
            content += '| ' + columns.map(() => '---').join(' | ') + ' |\n'

            // 数据行
            jsonData.slice(1).forEach((row) => {
              content +=
                '| ' +
                columns
                  .map((col) => {
                    const value = row[col] || ''
                    return value.toString().replace(/\|/g, '\\|')
                  })
                  .join(' | ') +
                ' |\n'
            })
          } else {
            // CSV格式
            content += columns.map((col) => jsonData[0][col]).join(',') + '\n'

            // 数据行
            jsonData.slice(1).forEach((row) => {
              content +=
                columns
                  .map((col) => {
                    const value = row[col] || ''
                    // 如果值包含逗号、换行符或引号，需要用引号包裹并转义
                    if (typeof value === 'string' && (value.includes(',') || value.includes('\n') || value.includes('"'))) {
                      return `"${value.replace(/"/g, '""')}"`
                    }
                    return value
                  })
                  .join(',') + '\n'
            })
          }

          return {
            sheet: name,
            content
          }
        })

        resolve(results)
      } catch (error) {
        reject(error)
      }
    }

    reader.onerror = (error) => reject(error)
    reader.readAsArrayBuffer(file)
  })
}
