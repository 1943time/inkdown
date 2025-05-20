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
      // 获取相对路径作为OSS存储路径
      const relativePath = path.relative(distPath, file)
      const ossPath = `release/${process.env.REF_NAME}/${relativePath}`

      await client.put(ossPath, file)
    }

    console.log('All files uploaded successfully')
  } catch (error) {
    console.error('Upload failed:', error)
    process.exit(1)
  }
}

uploadAllFiles()
