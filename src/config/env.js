// 环境变量配置
// 这个文件处理所有环境变量的读取和默认值设置

export const ENV_CONFIG = {
  // LLM API 配置 - ModelScope (用于app.html)
  MODELSCOPE_API_URL: import.meta.env.VITE_MODELSCOPE_API_URL || 'https://api-inference.modelscope.cn/v1',
  MODELSCOPE_API_KEY: import.meta.env.VITE_MODELSCOPE_API_KEY || 'ms-150d583e-ed00-46d3-ab35-570f03555599',

  // LLM API 配置 - Deepbricks (用于React组件)
  DEEPBRICKS_API_URL: import.meta.env.VITE_DEEPBRICKS_API_URL || 'https://api.deepbricks.ai/v1/',
  DEEPBRICKS_MODEL: import.meta.env.VITE_DEEPBRICKS_MODEL || 'GPT-5-Chat',
  DEEPBRICKS_API_KEY: import.meta.env.VITE_DEEPBRICKS_API_KEY || 'sk-lNVAREVHjj386FDCd9McOL7k66DZCUkTp6IbV0u9970qqdlg',

  // 应用配置
  APP_TITLE: import.meta.env.VITE_APP_TITLE || 'ZeroTouch AI中介服务',
  APP_VERSION: import.meta.env.VITE_APP_VERSION || '2.0.0',

  // 部署配置
  NODE_ENV: import.meta.env.NODE_ENV || 'development',
  PORT: import.meta.env.PORT || 3000,

  // 功能开关
  ENABLE_DEBUG: import.meta.env.VITE_ENABLE_DEBUG === 'true',
  ENABLE_SOUND: import.meta.env.VITE_ENABLE_SOUND !== 'false', // 默认启用
  ENABLE_AUTO_SCROLL: import.meta.env.VITE_ENABLE_AUTO_SCROLL !== 'false', // 默认启用

  // API限制配置
  MAX_MESSAGE_LENGTH: parseInt(import.meta.env.VITE_MAX_MESSAGE_LENGTH) || 2000,
  REQUEST_TIMEOUT: parseInt(import.meta.env.VITE_REQUEST_TIMEOUT) || 30000,

  // 开发环境检测
  IS_DEVELOPMENT: import.meta.env.DEV,
  IS_PRODUCTION: import.meta.env.PROD,
}

// 导出常用的配置检查函数
export const isProduction = () => ENV_CONFIG.IS_PRODUCTION
export const isDevelopment = () => ENV_CONFIG.IS_DEVELOPMENT

// 调试信息（仅在开发环境输出）
if (isDevelopment() && ENV_CONFIG.ENABLE_DEBUG) {
  console.group('🔧 Environment Configuration')
  console.log('NODE_ENV:', ENV_CONFIG.NODE_ENV)
  console.log('API URL:', ENV_CONFIG.MODELSCOPE_API_URL)
  console.log('API Key:', ENV_CONFIG.MODELSCOPE_API_KEY ? '***configured***' : 'not set')
  console.log('Features:', {
    sound: ENV_CONFIG.ENABLE_SOUND,
    autoScroll: ENV_CONFIG.ENABLE_AUTO_SCROLL,
    debug: ENV_CONFIG.ENABLE_DEBUG
  })
  console.groupEnd()
}
