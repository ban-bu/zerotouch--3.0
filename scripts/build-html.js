#!/usr/bin/env node
// 构建脚本 - 将环境变量注入到app.html中
// 用于Railway等部署平台的生产构建

import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const projectRoot = path.join(__dirname, '..')

// 从环境变量读取配置
const config = {
  MODELSCOPE_API_URL: process.env.VITE_MODELSCOPE_API_URL || 'https://api-inference.modelscope.cn/v1',
  MODELSCOPE_API_KEY: process.env.VITE_MODELSCOPE_API_KEY || 'ms-150d583e-ed00-46d3-ab35-570f03555599',
  DEEPBRICKS_API_URL: process.env.VITE_DEEPBRICKS_API_URL || 'https://api.deepbricks.ai/v1/',
  DEEPBRICKS_MODEL: process.env.VITE_DEEPBRICKS_MODEL || 'GPT-5-Chat',
  DEEPBRICKS_API_KEY: process.env.VITE_DEEPBRICKS_API_KEY || 'sk-lNVAREVHjj386FDCd9McOL7k66DZCUkTp6IbV0u9970qqdlg',
  APP_TITLE: process.env.VITE_APP_TITLE || 'ZeroTouch AI中介服务',
  NODE_ENV: process.env.NODE_ENV || 'production'
}

console.log('🔧 开始构建app.html...')
console.log('📊 使用配置:')
console.log(`   NODE_ENV: ${config.NODE_ENV}`)
console.log(`   ModelScope API: ${config.MODELSCOPE_API_URL}`)
console.log(`   ModelScope Key: ${config.MODELSCOPE_API_KEY ? '***configured***' : 'not set'}`)
console.log(`   Deepbricks API: ${config.DEEPBRICKS_API_URL}`)
console.log(`   Deepbricks Key: ${config.DEEPBRICKS_API_KEY ? '***configured***' : 'not set'}`)

try {
  // 读取原始app.html
  const appHtmlPath = path.join(projectRoot, 'app.html')
  let htmlContent = fs.readFileSync(appHtmlPath, 'utf8')

  // 替换API配置
  // 替换ModelScope配置
  htmlContent = htmlContent.replace(
    /apiEndpoint:\s*'[^']*'/g,
    `apiEndpoint: '${config.MODELSCOPE_API_URL}'`
  )

  htmlContent = htmlContent.replace(
    /baseURL:\s*'[^']*'/g,
    `baseURL: '${config.MODELSCOPE_API_URL}'`
  )

  htmlContent = htmlContent.replace(
    /apiKey:\s*'[^']*'/g,
    `apiKey: '${config.MODELSCOPE_API_KEY}'`
  )

  // 替换页面标题
  htmlContent = htmlContent.replace(
    /<title>[^<]*<\/title>/g,
    `<title>${config.APP_TITLE}</title>`
  )

  // 添加环境标识注释
  const envComment = `<!-- Built for ${config.NODE_ENV} environment at ${new Date().toISOString()} -->\n`
  htmlContent = envComment + htmlContent

  // 创建dist目录如果不存在
  const distDir = path.join(projectRoot, 'dist')
  if (!fs.existsSync(distDir)) {
    fs.mkdirSync(distDir, { recursive: true })
  }

  // 写入到dist目录
  const outputPath = path.join(distDir, 'app.html')
  fs.writeFileSync(outputPath, htmlContent)

  console.log('✅ app.html构建完成!')
  console.log(`📁 输出路径: ${outputPath}`)

  // 验证输出文件
  const stats = fs.statSync(outputPath)
  console.log(`📦 文件大小: ${(stats.size / 1024).toFixed(2)} KB`)

} catch (error) {
  console.error('❌ 构建app.html时发生错误:', error.message)
  process.exit(1)
}
