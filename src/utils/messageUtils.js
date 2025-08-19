// 消息类型定义
export const MessageTypes = {
  USER: 'user',
  AI_RESPONSE: 'ai_response',
  LLM_REQUEST: 'llm_request',
  PROCESSING: 'processing',
  SYSTEM: 'system',
  ERROR: 'error'
}

// 面板类型定义
export const PanelTypes = {
  PROBLEM: 'problem',
  LLM: 'llm',
  SOLUTION: 'solution'
}

// 处理步骤类型定义
export const ProcessingSteps = {
  INPUT_ANALYSIS: '原始输入分析',
  CONTEXT_READING: '语境解读',
  CONCEPTUALIZATION: '概念化',
  EMOTION_FILTERING: '情感过滤',
  MISSING_INFO_DETECTION: '缺失信息检测',
  RESPONSE_OPTIMIZATION: '响应优化',
  EMOTIONAL_ADJUSTMENT: '情感调整',
  TRANSPARENCY: '透明性'
}

// 创建消息的工厂函数
export const createMessage = (type, content, options = {}) => {
  const baseMessage = {
    id: generateMessageId(),
    type,
    timestamp: new Date().toISOString(),
    ...options
  }

  switch (type) {
    case MessageTypes.USER:
      return {
        ...baseMessage,
        text: content.text || '',
        image: content.image || null
      }
    
    case MessageTypes.AI_RESPONSE:
      return {
        ...baseMessage,
        text: content
      }
    
    case MessageTypes.LLM_REQUEST:
      return {
        ...baseMessage,
        text: content
      }
    
    case MessageTypes.PROCESSING:
      return {
        ...baseMessage,
        title: content.title || '处理中',
        steps: content.steps || [],
        output: content.output || null
      }
    
    case MessageTypes.SYSTEM:
      return {
        ...baseMessage,
        text: content,
        level: options.level || 'info' // info, warning, error
      }
    
    case MessageTypes.ERROR:
      return {
        ...baseMessage,
        text: content,
        error: options.error || null
      }
    
    default:
      return baseMessage
  }
}

// 生成唯一消息ID
export const generateMessageId = () => {
  return `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
}

// 格式化时间戳
export const formatTimestamp = (timestamp, format = 'time') => {
  const date = new Date(timestamp)
  
  switch (format) {
    case 'time':
      return date.toLocaleTimeString('zh-CN', {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
      })
    
    case 'datetime':
      return date.toLocaleString('zh-CN', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit'
      })
    
    case 'relative':
      const now = new Date()
      const diff = now - date
      const seconds = Math.floor(diff / 1000)
      const minutes = Math.floor(seconds / 60)
      const hours = Math.floor(minutes / 60)
      
      if (seconds < 60) return '刚刚'
      if (minutes < 60) return `${minutes}分钟前`
      if (hours < 24) return `${hours}小时前`
      return date.toLocaleDateString('zh-CN')
    
    default:
      return date.toLocaleString('zh-CN')
  }
}

// 消息过滤器
export const filterMessages = (messages, filters = {}) => {
  let filtered = [...messages]
  
  if (filters.type) {
    filtered = filtered.filter(msg => msg.type === filters.type)
  }
  
  if (filters.dateRange) {
    const { start, end } = filters.dateRange
    filtered = filtered.filter(msg => {
      const msgDate = new Date(msg.timestamp)
      return msgDate >= start && msgDate <= end
    })
  }
  
  if (filters.searchText) {
    const searchLower = filters.searchText.toLowerCase()
    filtered = filtered.filter(msg => 
      msg.text?.toLowerCase().includes(searchLower) ||
      msg.title?.toLowerCase().includes(searchLower)
    )
  }
  
  return filtered
}

// 消息统计
export const getMessageStats = (messages) => {
  const stats = {
    total: messages.length,
    byType: {},
    byHour: {},
    averageLength: 0
  }
  
  let totalLength = 0
  
  messages.forEach(msg => {
    // 按类型统计
    stats.byType[msg.type] = (stats.byType[msg.type] || 0) + 1
    
    // 按小时统计
    const hour = new Date(msg.timestamp).getHours()
    stats.byHour[hour] = (stats.byHour[hour] || 0) + 1
    
    // 计算平均长度
    if (msg.text) {
      totalLength += msg.text.length
    }
  })
  
  stats.averageLength = messages.length > 0 ? Math.round(totalLength / messages.length) : 0
  
  return stats
}

// 导出消息到JSON
export const exportMessages = (messages, options = {}) => {
  const exportData = {
    exportTime: new Date().toISOString(),
    version: '1.0',
    messageCount: messages.length,
    messages: messages.map(msg => ({
      ...msg,
      // 移除可能的循环引用
      image: msg.image ? '[Image File]' : null
    }))
  }
  
  if (options.includeStats) {
    exportData.statistics = getMessageStats(messages)
  }
  
  return JSON.stringify(exportData, null, 2)
}

// 验证消息格式
export const validateMessage = (message) => {
  const errors = []
  
  if (!message.id) {
    errors.push('消息缺少ID')
  }
  
  if (!message.type || !Object.values(MessageTypes).includes(message.type)) {
    errors.push('消息类型无效')
  }
  
  if (!message.timestamp) {
    errors.push('消息缺少时间戳')
  }
  
  if (message.type === MessageTypes.USER && !message.text && !message.image) {
    errors.push('用户消息必须包含文本或图片')
  }
  
  return {
    isValid: errors.length === 0,
    errors
  }
}