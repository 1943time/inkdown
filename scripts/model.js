import { fileURLToPath } from 'url'
import { dirname, join } from 'path'
import { writeFileSync } from 'fs'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

fetch('https://openrouter.ai/api/v1/models')
  .then((res) => res.json())
  .then((data) => {
    const imageModels = data.data
      .filter((m) => m.architecture?.input_modalities?.includes('image'))
      .map((item) => {
        return item.id.split('/').pop()
      })
    writeFileSync(
      join(__dirname, '../src/renderer/src/store/llm/data/image-models.json'),
      JSON.stringify(imageModels, null, 2),
      { encoding: 'utf-8' }
    )
  })
