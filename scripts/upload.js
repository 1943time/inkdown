const OSS = require('ali-oss')
const path = require('path')
const fs = require('fs')
const os = require('os')

const platform = os.platform()
const arch = process.env.OS_ARCH
const distPath = path.join(__dirname, '..', 'dist', platform, arch)

const client = new OSS({
  region: process.env.OSS_ENDPOINT,
  accessKeyId: process.env.OSS_ACCESS_KEY_ID,
  accessKeySecret: process.env.OSS_ACCESS_KEY_SECRET,
  bucket: process.env.OSS_BUCKET
})

async function uploadAllFiles() {
  try {
    const files = fs.readdirSync(distPath)
    for (const file of files) {
      if (file.match(/^Inkdown.*\..*$/) || file.match(/^latest.*\.yml$/)) {
        const ossPath = `release/${process.env.REF_NAME}/${platform}/${arch}/${file}`
        await client.put(ossPath, path.join(distPath, file))
      }
    }
    console.log('All files uploaded successfully')
  } catch (error) {
    console.error('Upload failed:', error)
    process.exit(1)
  }
}

uploadAllFiles()
