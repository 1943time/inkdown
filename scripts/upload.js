const OSS = require('ali-oss')
const path = require('path')
const fs = require('fs')

const client = new OSS({
  region: process.env.OSS_ENDPOINT,
  accessKeyId: process.env.OSS_ACCESS_KEY_ID,
  accessKeySecret: process.env.OSS_ACCESS_KEY_SECRET,
  bucket: process.env.OSS_BUCKET
})

const distPath = path.join(__dirname, '../dist')

// 递归读取目录下的所有文件
function getAllFiles(dirPath, arrayOfFiles = []) {
  const files = fs.readdirSync(dirPath)

  files.forEach((file) => {
    const fullPath = path.join(dirPath, file)
    if (fs.statSync(fullPath).isDirectory()) {
      arrayOfFiles = getAllFiles(fullPath, arrayOfFiles)
    } else {
      arrayOfFiles.push(fullPath)
    }
  })

  return arrayOfFiles
}

async function uploadAllFiles() {
  try {
    const files = getAllFiles(distPath)

    for (const file of files) {
      let relativePath = path.relative(distPath, file)
      // 只上传符合 release 定义的文件类型
      if (relativePath.match(/^Inkdown.*\..*$/) || relativePath.match(/^latest.*\.yml$/)) {
        if (relativePath.startsWith('latest') && relativePath.endsWith('.yml')) {
          relativePath = relativePath.split('.')[0] + '-' + os.arch() + '.yml'
        }
        const ossPath = `release/${relativePath}`
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
