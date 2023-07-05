const { notarize } = require('@electron/notarize')
require('dotenv').config()
exports.default = async function notarizing(context) {
  const { electronPlatformName, appOutDir } = context;
  const appName = context.packager.appInfo.productFilename

  if (electronPlatformName !== 'darwin') {
    return;
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
    console.error(error)
  }

  console.log(`done notarizing`)
}
