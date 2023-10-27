const webpack = require('webpack')
const path = require('path')
const TerserPlugin = require("terser-webpack-plugin");

webpack({
  mode: "production",
  entry: path.join(__dirname, 'parser.js'),
  target: 'webworker',
  output: {
    filename: "bundle.js",
    path: __dirname,
    library: {
      type: "module",
    },
    chunkFormat: 'module'
  },
  experiments: {
    outputModule: true
  },
  optimization: {
    minimizer: [new TerserPlugin({
      extractComments: false
    })]
  }
}).run()
