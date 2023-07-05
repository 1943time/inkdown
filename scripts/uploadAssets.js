require('dotenv').config()
const {readdirSync, createReadStream } = require('fs')
const { join } = require('path')
const dir = readdirSync(join(__dirname, '../dist'))

const OSS = require('ali-oss')
const oss = new OSS({
  region: process.env.OSSREGION,
  accessKeyId: process.env.ACCESSKEYID,
  accessKeySecret: process.env.ACCESSKEYSECRET,
  bucket: process.env.OSSBUCKET,
  secure: false,
  timeout: '120s'
})

const upload = async (dir) => {
  for (let f of dir) {
    if (f.startsWith('BlueStone') || f.startsWith('latest')) {
      await oss.put(join('packages', f), join(__dirname, '../dist', f))
    }
  }
}

upload(dir).then(() => {
  console.log('upload assets done')
})
