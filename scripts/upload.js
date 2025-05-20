const OSS = require('ali-oss')
const path = require('path')
const fs = require('fs')
const os = require('os')
const args = process.argv.slice(2)
const platform = args[0]
const arch = args[1]

const client = new OSS({
  region: process.env.OSS_ENDPOINT,
  accessKeyId: process.env.OSS_ACCESS_KEY_ID,
  accessKeySecret: process.env.OSS_ACCESS_KEY_SECRET,
  bucket: process.env.OSS_BUCKET
})

const distPath = path.join(__dirname, '../dist', platform, arch)

async function uploadAllFiles() {
  try {
    const files = fs.readdirSync(dirPath)

    for (const file of files) {
      let relativePath = path.relative(distPath, file)
      // 只上传符合 release 定义的文件类型
      if (relativePath.match(/^Inkdown.*\..*$/) || relativePath.match(/^latest.*\.yml$/)) {
        const ossPath = `release/${process.env.REF_NAME}/${platform}/${arch}/${relativePath}`
        await client.put(ossPath, file)
        console.log(`Uploaded: ${relativePath}`)
      }
    }

    console.log('All files uploaded successfully')
  } catch (error) {
    console.error('Upload failed:', error)
    process.exit(1)
  }
}

uploadAllFiles()
