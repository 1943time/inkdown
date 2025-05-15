const { defineConfig } = require('@lobehub/i18n-cli')
module.exports = defineConfig({
  entry: 'src/renderer/src/locales/zh_CN.json',
  entryLocale: 'zh_CN',
  output: 'src/renderer/src/locales',
  modelName: 'qwen-max',
  reference:
    '这是一个笔记应用，也是一个AI对话应用，根据中文词汇翻译文案，中文中的英文词汇不必再次翻译。',
  outputLocales: ['en_US']
})
