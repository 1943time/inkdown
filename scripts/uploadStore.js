import { execa } from 'execa'
import { readFile } from 'fs/promises'
// node script/xcrun-wrapper.mjs dist/mas-universal/LosslessCut-mac-universal.pkg ${{ secrets.api_key_id }} ${{ secrets.api_key_issuer_id }} 1505323402 no.mifi.losslesscut-mac
// we need a wrapper script because altool tends to error out very often
// https://developer.apple.com/forums/thread/698477
// and it errors if binary already exists, we want it to just silently fail in that case

const args = process.argv.slice(2)

const filePath = args[0]
const apiKey = args[1]
const apiIssuer = args[2]
const appleId = args[3]
const bundleId = args[4]

// seems to be the same
const ascPublicId = apiIssuer

const packageJson = JSON.parse(await readFile(new URL('../package.json', import.meta.url)))

console.log('Using version', packageJson.version)

const packageVersion = packageJson.version

const bundleVersion = packageVersion
const bundleShortVersionString = packageVersion

async function runAttempt () {
  // const xcrunArgs = ['altool', '--list-apps', '--output-format', 'json', '--apiKey', apiKey, '--apiIssuer', apiIssuer];

  const xcrunArgs = [
    'altool',
    '--output-format', 'json',
    '--upload-package', filePath, '--type', 'macos',
    '--apiKey', apiKey, '--apiIssuer', apiIssuer,
    '--asc-public-id', ascPublicId,
    '--apple-id', appleId,
    '--bundle-id', bundleId,
    '--bundle-version', bundleVersion,
    '--bundle-short-version-string', bundleShortVersionString
  ]

  try {
    const { stdout } = await execa('xcrun', xcrunArgs)
    console.log('stdout', stdout)
    return false
  } catch (err) {
    if (err.exitCode === 1 && err.stdout) {
      const errorJson = JSON.parse(err.stdout)
      const productErrors = errorJson['product-errors']
      // Unable to authenticate
      if (productErrors.some((error) => error.code === -19209)) {
        console.log(productErrors)
        return true // retry
      }
      // "The bundle version, x.y.z, must be a higher than the previously uploaded version."
      if (productErrors.some((error) => error.code === -19210)) {
        console.log(productErrors)
        // ignore
        return false
      }
    }
    throw err
  }
}

const maxRetries = 3

async function run () {
  for (let i = 0; i < maxRetries; i += 1) {
    const wantRetry = await runAttempt()
    if (!wantRetry) return
    console.log('Retrying soon')
    await new Promise((resolve) => setTimeout(resolve, 1000))
  }
  console.log('gave up')
  process.exitCode = 1
}

await run()
