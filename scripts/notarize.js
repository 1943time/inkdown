const { notarize } = require('@electron/notarize')
const dotenv = require('dotenv')
dotenv.config()
exports.default = async function notarizing(context) {
  const { electronPlatformName, appOutDir } = context
  const appName = context.packager.appInfo.productFilename

  if (electronPlatformName !== 'darwin') {
    return
  }

  // 检查必要的环境变量
  if (!process.env.APPLEID || !process.env.APPLEIDPASS || !process.env.APPLETEAMID) {
    console.error('Missing required environment variables. Please check your .env file')
    return
  }

  try {
    await notarize({
      appBundleId: 'bluestone',
      appPath: `${appOutDir}/${appName}.app`,
      appleId: process.env.APPLEID,
      appleIdPassword: process.env.APPLEIDPASS,
      teamId: process.env.APPLETEAMID
    })
  } catch (error) {
    console.error('Notarization error:', error)
  }

  console.log(`done notarizing`)
}
