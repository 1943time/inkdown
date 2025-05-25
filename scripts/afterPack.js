const path = require('path')
const os = require('os')
const fs = require('fs')
exports.default = async function (context) {
  const resorce =
    os.platform() === 'darwin'
      ? path.join(context.appOutDir, 'Inkdown.app/Contents/Resources')
      : path.join(context.appOutDir, 'resources')
  const onnBin = path.join(resorce, 'app.asar.unpacked/node_modules/onnxruntime-node/bin/napi-v3')
  console.log('onnBin', onnBin)

  if (fs.existsSync(path.join(onnBin, 'linux'))) {
    fs.rmSync(path.join(onnBin, 'linux'), { recursive: true, force: true })
  }
  if (os.platform() === 'darwin') {
    if (fs.existsSync(path.join(onnBin, 'win32'))) {
      fs.rmSync(path.join(onnBin, 'win32'), { recursive: true, force: true })
    }
    if (os.arch() === 'arm64') {
      if (fs.existsSync(path.join(onnBin, 'darwin/x64'))) {
        fs.rmSync(path.join(onnBin, 'darwin/x64'), { recursive: true, force: true })
      }
    } else {
      if (fs.existsSync(path.join(onnBin, 'darwin/arm64'))) {
        fs.rmSync(path.join(onnBin, 'darwin/arm64'), { recursive: true, force: true })
      }
    }
  }
  if (os.platform() === 'win32') {
    if (fs.existsSync(path.join(onnBin, 'darwin'))) {
      fs.rmSync(path.join(onnBin, 'darwin'), { recursive: true, force: true })
    }
    if (os.arch() === 'arm64') {
      if (fs.existsSync(path.join(onnBin, 'win32/x64'))) {
        fs.rmSync(path.join(onnBin, 'win32/x64'), { recursive: true, force: true })
      }
    } else {
      if (fs.existsSync(path.join(onnBin, 'win32/arm64'))) {
        fs.rmSync(path.join(onnBin, 'win32/arm64'), { recursive: true, force: true })
      }
    }
  }
}
