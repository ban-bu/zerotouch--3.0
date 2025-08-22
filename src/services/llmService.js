// [MODIFIED] Deepbricks LLM处理服务
// Impact: 切换到 Deepbricks API，模型 GPT-4.1-mini
// Backward Compatibility: 保留原有函数/常量命名与请求结构，调用方无需改动

// Deepbricks API配置
const MODELSCOPE_CONFIG = {
  // [MODIFIED]
  baseURL: 'https://api.deepbricks.ai/v1/',
  model: 'GPT-5-Chat',
  apiKey: 'sk-lNVAREVHjj386FDCd9McOL7k66DZCUkTp6IbV0u9970qqdlg'
}

// 日志辅助函数（避免输出过长内容和敏感信息）
const truncateForLog = (text, maxLength = 2000) => {
  if (typeof text !== 'string') return text
  if (text.length <= maxLength) return text
  return text.slice(0, maxLength) + '…(truncated)'
}

const formatMessagesForLog = (messages) => {
  try {
    return messages.map(m => ({
      role: m.role,
      content: truncateForLog(m.content)
    }))
  } catch (_) {
    return '[unserializable messages]'
  }
}

// 调用魔搭API的通用函数
const callModelScopeAPI = async (messages, temperature = 0.7) => {
  try {
    const isDev = typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.DEV
    console.group('[LLM] Request Details')
    console.log('🔹 Model:', MODELSCOPE_CONFIG.model)
    console.log('🔹 Temperature:', temperature)
    console.log('🔹 Total Messages:', messages.length)
    
    // 始终显示完整的prompt内容（格式化后）
    console.group('📝 Complete Prompt Content')
    try {
      messages.forEach((message, index) => {
        console.group(`💬 Message ${index + 1}: [${message.role.toUpperCase()}]`)
        console.log(message.content)
        console.groupEnd()
      })
    } catch (error) {
      console.log('Error displaying messages:', error)
    }
    console.groupEnd()
    
    // 开发环境下额外显示JSON格式
    if (isDev) {
      console.group('🔧 Debug Info (JSON Format)')
      try {
        console.log('messages JSON:', JSON.stringify(messages, null, 2))
      } catch (_) {
        console.log('Failed to serialize messages to JSON')
      }
      console.groupEnd()
    }
    
    console.time('[LLM] ⏱️ Request Latency')
    // [MODIFIED] Deepbricks 兼容 OpenAI Chat Completions 路由
    const response = await fetch(`${MODELSCOPE_CONFIG.baseURL}chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${MODELSCOPE_CONFIG.apiKey}`
      },
      body: JSON.stringify({
        model: MODELSCOPE_CONFIG.model,
        messages: messages,
        temperature: temperature,
        max_tokens: 2000,
        stream: false
      })
    })

    if (!response.ok) {
      console.timeEnd('[LLM] ⏱️ Request Latency')
      console.log('❌ HTTP Status:', response.status, response.statusText)
      console.groupEnd()
      throw new Error(`API调用失败: ${response.status} ${response.statusText}`)
    }

    const data = await response.json()
    const content = data?.choices?.[0]?.message?.content
    
    console.timeEnd('[LLM] ⏱️ Request Latency')
    
    // 显示响应信息
    console.group('📤 Response Details')
    if (data?.usage) {
      console.log('💰 Token Usage:', data.usage)
    }
    console.log('✅ Response Length:', content?.length || 0, 'characters')
    console.groupEnd()
    
    // 显示完整的响应内容
    console.group('📋 Complete Response Content')
    console.log(content || '(Empty response)')
    console.groupEnd()
    
    // 开发环境下显示原始数据
    if (isDev) {
      console.group('🔧 Raw Response Data')
      try { 
        console.log('Full API Response:', JSON.stringify(data, null, 2))
      } catch (_) {
        console.log('Failed to serialize response data')
      }
      console.groupEnd()
    }
    
    console.groupEnd()
    return content
  } catch (error) {
    try { console.groupEnd() } catch (_) {}
    console.groupCollapsed('[LLM] Error')
    console.error('魔搭API调用错误:', error)
    console.groupEnd()
    throw error
  }
}

// 统一清理输出文本，移除影响体验的模板化致歉或引导语
const sanitizeOutput = (text) => {
  if (!text) return text
  const bannedPhrases = [
    '非常抱歉',
    '抱歉',
    '我未能理解',
    '请您详细描述',
    '请提供更多信息',
    '信息不足',
    '若有不符请指正',
    '你好！很高兴能帮助你。',
    '请问你现在是在寻找什么类型的商品',
    '衣服、鞋子还是其他什么小物件',
    '感谢您的反馈',
    '我们非常重视',
    '如果您有任何问题',
    '如需.*帮助',
    '请随时联系',
    '客服团队',
    '支持团队',
    '为您提供满意的解决方案',
    '我们会尽力.*解决',
    '敬请谅解',
    '忽略本次对话',
    '继续浏览其他服务或信息',
    '欢迎.*联系我们'
  ]
  let sanitized = text
  bannedPhrases.forEach((p) => {
    const regex = new RegExp(p, 'g')
    sanitized = sanitized.replace(regex, '')
  })
  return sanitized.trim()
}

// [MODIFIED] 健壮的解析与剥离工具，避免将AI建议再次转译
// Impact: 确保发往方案端(`solution`)的 `llm_request` 仅包含「需求转译」文本
// Backward Compatibility: 不改变对外API，仅增强解析鲁棒性
const findFirstIndex = (text, keywords) => {
  for (const keyword of keywords) {
    const idx = text.indexOf(keyword)
    if (idx !== -1) return { idx, keyword }
  }
  return { idx: -1, keyword: '' }
}

// 构建聊天历史上下文的通用函数，包含详细日志
const buildChatContextWithLogging = (chatHistory, contextType = '聊天历史上下文', maxMessages = 6) => {
  if (!chatHistory || chatHistory.length === 0) {
    console.log('ℹ️ No chat history available for context')
    return ''
  }
  
  // 记录完整的聊天历史到控制台
  console.group('🔍 Chat History Analysis')
  console.log(`📊 Total History Messages: ${chatHistory.length}`)
  console.log(`📝 Using Recent Messages: ${Math.min(chatHistory.length, maxMessages)}`)
  
  const recentHistory = chatHistory.slice(-maxMessages)
  recentHistory.forEach((msg, index) => {
    let role = 'AI处理'
    
    // 增强的角色映射逻辑，包含错误检测和智能推断
    if (msg.type === 'user') {
      if (msg.panel === 'problem') {
        role = '客户'
      } else if (msg.panel === 'solution') {
        role = '企业端'
      } else {
        // 如果panel字段缺失或无效，尝试智能推断
        const content = msg.text?.toLowerCase() || ''
        if (content.includes('退货') || content.includes('投诉') || content.includes('不满') || 
            content.includes('cnm') || content.includes('草') || content.includes('妈')) {
          role = '客户'
        } else {
          role = '企业端'
        }
      }
    } else if (msg.type === 'ai_response') {
      role = msg.panel === 'problem' ? '系统回复给客户' : '系统回复给企业端'
    } else if (msg.type === 'llm_request') {
      role = 'AI需求转译'
    }
    
    const preview = msg.text?.substring(0, 100)
    const truncated = msg.text?.length > 100 ? '...' : ''
    
    // 详细的调试信息
    console.log(`${index + 1}. [${role}]: ${preview}${truncated}`)
    console.log(`   🔍 Debug: type="${msg.type}", panel="${msg.panel}", timestamp="${msg.timestamp}"`)
  })
  console.groupEnd()
  
  const chatContext = `\n\n${contextType}：\n` + 
    recentHistory.map((msg, index) => {
      let role = 'AI处理'
      
      // 增强的角色映射逻辑，包含错误检测和智能推断
      if (msg.type === 'user') {
        if (msg.panel === 'problem') {
          role = '客户'
        } else if (msg.panel === 'solution') {
          role = '企业端'
        } else {
          // 如果panel字段缺失或无效，尝试智能推断
          console.warn(`⚠️ 消息panel字段异常: panel="${msg.panel}", 内容预览: "${msg.text?.substring(0, 50)}..."`)
          // 根据消息内容的特征进行智能判断
          const content = msg.text?.toLowerCase() || ''
          if (content.includes('退货') || content.includes('投诉') || content.includes('不满') || 
              content.includes('cnm') || content.includes('草') || content.includes('妈')) {
            role = '客户'
            console.log(`🔧 智能推断: 根据内容特征判断为客户消息`)
          } else {
            role = '企业端'
          }
        }
      } else if (msg.type === 'ai_response') {
        role = msg.panel === 'problem' ? '系统回复给客户' : '系统回复给企业端'
      } else if (msg.type === 'llm_request') {
        role = 'AI需求转译'
      }
      
      return `${index + 1}. ${role}: ${msg.text}`
    }).join('\n')
  
  return chatContext
}

const parseSectionsRobust = (raw) => {
  const text = typeof raw === 'string' ? raw : ''
  const sections = {
    translation: '',
    solutionsText: '',
    confirmationsText: ''
  }

  // 多标题兼容
  const translationKeys = ['【需求转译】', '【需求翻译】', '【转译结果】', '【需求澄清】', '需求转译', '需求翻译', '转译结果', '需求澄清', '客户需求转译', '用户需求转译']
  const solutionKeys = ['【解决方案建议】', '【建议方案】', '【行动建议】', '解决方案建议', '建议的解决方案', '方案建议', '行动建议']
  const confirmKeys = ['【待确认信息】', '【需确认信息】', '【待确认】', '待确认信息', '需确认信息']

  const t = findFirstIndex(text, translationKeys)
  const s = findFirstIndex(text, solutionKeys)
  const c = findFirstIndex(text, confirmKeys)

  const endOf = (startIdx) => {
    if (startIdx === -1) return text.length
    const candidates = [s.idx, c.idx, text.length].filter((v) => v !== -1 && v > startIdx)
    return Math.min(...candidates)
  }

  // 取需求转译
  if (t.idx !== -1) {
    const start = t.idx + t.keyword.length
    const end = endOf(t.idx)
    sections.translation = text.slice(start, end).trim()
  } else if (s.idx !== -1) {
    // 未找到转译标题，但找到方案标题：取方案之前内容作为转译
    sections.translation = text.slice(0, s.idx).trim()
  }

  // 取方案建议（中介面板展示用）
  if (s.idx !== -1) {
    const start = s.idx + s.keyword.length
    const end = c.idx !== -1 ? c.idx : text.length
    sections.solutionsText = text.slice(start, end).trim()
  }

  // 取待确认信息（中介面板展示用）
  if (c.idx !== -1) {
    const start = c.idx + c.keyword.length
    sections.confirmationsText = text.slice(start).trim()
  }

  // 兜底：若仍未抽取到转译，尽量剥离明显“方案/建议”段落
  if (!sections.translation) {
    const firstSolutionIdx = s.idx !== -1 ? s.idx : text.search(/\n?\s*(方案|选项|建议)\s*[1-9]/)
    if (firstSolutionIdx !== -1 && firstSolutionIdx > 0) {
      sections.translation = text.slice(0, firstSolutionIdx).trim()
    } else {
      const truncated = text.slice(0, 500)
      const split = truncated.split(/\n{2,}/)
      sections.translation = (split[0] || truncated).trim()
    }
  }

  return sections
}

// 处理问题端输入 - 增强版本，支持聊天历史和深度理解
const processProblemInput = async (content, image, scenario, chatHistory = []) => {
  try {
    // 根据场景定制提示词 - 增强版本
    const scenarioPrompts = {
      retail: {
        systemRole: '你是一个专业的AI沟通助手，专门在顾客与企业门店之间提供精准的需求转译和解决方案建议。你的核心职责是：1)准确理解顾客的真实需求和潜在意图 2)将其转化为企业能够理解和执行的专业描述 3)基于企业能力提供具体可行的解决方案选项 4)智能过滤和转化不当表达，确保沟通专业化。',
        context: '场景边界：零售顾客-门店沟通。你需要同时理解双方可能存在的表达偏差：顾客可能表达不清晰或有隐含需求，企业可能用专业术语回复。\n\n核心任务：\n1. 深度理解：分析顾客的显性需求和隐性需求，识别可能的表达偏差\n2. 精准转译：将顾客需求转化为包含产品类型、使用场景、预算范围、规格要求等关键信息的专业描述\n3. 方案建议：基于转译结果，为企业提供2-3个具体可行的解决方案选项，包含产品推荐、服务建议、价格区间等\n4. 语言净化：当遇到不当表达、粗俗语言或情绪化词汇时，需要智能识别其背后的实际意图，转化为专业、中性的表述，绝不直接引用或重复原始不当内容',
        example: '例如：顾客说"我需要一件适合商务场合的衣服" → 转译："顾客需要商务正装，用于重要会议，预算待确认，需要专业形象" → 方案建议："1)推荐经典商务西装套装，价格800-1500元，包含免费修改服务 2)推荐商务休闲装，价格500-800元，适合日常商务场合 3)提供个人形象顾问服务，根据具体需求定制搭配方案"\n\n不当语言处理例如：顾客输入不当表达时 → 转译："客户表达了强烈的情绪，可能对产品、服务或体验存在不满。需要了解具体问题所在，以便提供针对性的解决方案" → 方案建议："1)主动询问具体遇到的问题或困难 2)提供客服专员一对一沟通 3)根据问题性质安排相关部门跟进处理"'
      },
      enterprise: {
        systemRole: '你是一个专业的AI沟通助手，专门在企业跨部门之间提供精准的需求转译和解决方案建议。你的核心职责是：1)准确理解业务部门的需求和技术部门的能力边界 2)消除部门间的沟通偏差 3)提供具体可行的技术解决方案选项 4)智能过滤和转化不当表达，确保沟通专业化。',
        context: '场景边界：企业内部跨部门沟通。你需要理解不同部门的语言差异：业务部门关注效果和时间，技术部门关注可行性和资源。\n\n核心任务：\n1. 需求解析：将业务需求转化为技术可理解的功能要求，包含具体指标、时间期限、资源约束\n2. 方案设计：基于技术能力提供2-3个不同复杂度的解决方案选项\n3. 风险评估：识别实施过程中可能的技术风险和资源需求\n4. 语言净化：当遇到不当表达、粗俗语言或情绪化词汇时，需要智能识别其背后的实际意图，转化为专业、中性的表述，绝不直接引用或重复原始不当内容',
        example: '例如：市场部说"我们需要提升用户体验" → 转译："需要开发用户体验优化功能，目标提升用户留存率，时间3个月内" → 方案建议："1)快速方案：优化现有界面和交互，预计提升10%留存率，需要2周，成本5万 2)中等方案：重新设计核心流程，预计提升25%留存率，需要6周，成本15万 3)深度方案：全面重构用户体验，预计提升40%留存率，需要3个月，成本40万"\n\n不当语言处理例如：部门表达不当情绪时 → 转译："部门表达了对当前项目进展的强烈关切，可能存在沟通协调或资源配置方面的问题。需要明确具体的问题点和改进方向" → 方案建议："1)安排跨部门协调会议，明确各方职责和时间节点 2)评估当前资源配置是否合理，调整人力或预算分配 3)建立定期沟通机制，及时发现和解决问题"'
      },
      education: {
        systemRole: '你是一个专业的AI教学助手，专门在学生与教师之间提供精准的学习需求转译和教学方案建议。你的核心职责是：1)深度理解学生的学习困难和知识盲点 2)将其转化为教师可操作的教学要点 3)提供多样化的教学解决方案选项 4)智能过滤和转化不当表达，确保沟通专业化。',
        context: '场景边界：师生互动的学习沟通。你需要理解学习过程中的认知偏差：学生可能无法准确表达困难点，教师可能用过于专业的语言回复。\n\n核心任务：\n1. 学习诊断：分析学生的具体困难点、知识背景、学习风格\n2. 教学转译：将学习需求转化为包含知识点、难点分析、教学目标的专业描述\n3. 方案建议：提供2-3种不同教学方法的具体实施方案\n4. 语言净化：当遇到不当表达、粗俗语言或情绪化词汇时，需要智能识别其背后的实际意图，转化为专业、中性的表述，绝不直接引用或重复原始不当内容',
        example: '例如：学生说"我不懂这个概念" → 转译："学生对量子物理波粒二象性概念理解困难，需要从基础概念开始，通过实验例子建立认知" → 方案建议："1)实验演示法：通过双缝实验等经典实验，直观展示波粒二象性，适合视觉学习者 2)类比教学法：用水波和弹珠的类比，帮助理解抽象概念，适合逻辑思维强的学生 3)渐进式教学：从光的基本性质开始，逐步引入量子概念，适合基础较弱的学生"\n\n不当语言处理例如：学生表达挫败情绪时 → 转译："学生在学习过程中遇到困难，表现出挫败感和学习压力。需要调整教学方式，提供更多支持和鼓励" → 方案建议："1)降低学习难度，从更基础的知识点开始讲解 2)采用鼓励式教学方法，肯定学生的努力和进步 3)提供个别辅导，针对性解决学习困难"'
      }
    }

    if (!scenario || !scenarioPrompts[scenario]) {
      throw new Error(`无效的场景类型: ${scenario}。支持的场景: ${Object.keys(scenarioPrompts).join(', ')}`)
    }
    const prompt = scenarioPrompts[scenario]
    
    // 构建聊天历史上下文（包含详细日志）
    const chatContext = buildChatContextWithLogging(chatHistory, '聊天历史上下文', 6)
    
    // 为每个场景定制独立的增强指令
    const enhancedInstructions = {
      retail: `增强指令（零售场景专用）：
1. 消费心理洞察：深度理解顾客的购买动机、价格敏感度、品质期望和使用场景
2. 产品价值转译：将技术参数转化为实际使用价值，突出产品如何解决顾客的具体问题
3. 购买决策支持：提供清晰的产品对比、性价比分析和购买建议，降低决策成本
4. 服务体验优化：强调售前咨询、售后保障等服务价值，提升购买信心
5. 个性化推荐：基于顾客需求特征，提供精准的产品推荐和搭配建议
6. 促销策略融入：合理融入优惠信息、限时活动等，创造购买紧迫感
7. 零售风格限制：避免过度推销话术，禁止使用"亲"、"哦"等非正式用语，保持专业友好的零售服务语调
8. 零售场景不当语言处理：将顾客的不满情绪转化为具体的产品或服务改进需求，重点关注退换货、质量问题、价格争议等零售常见问题的专业化表达`,
      
      enterprise: `增强指令（企业场景专用）：
1. 商业价值导向：将技术方案转化为商业收益、成本节约、效率提升等可量化的价值指标
2. 决策层沟通：使用决策者关心的语言，突出ROI、风险控制、竞争优势等关键要素
3. 实施路径规划：提供清晰的项目时间线、里程碑节点、资源配置和风险预案
4. 跨部门协调：考虑不同部门的利益和关切，提供平衡各方需求的解决方案
5. 合规性保障：确保方案符合行业规范、法律法规和企业内部政策要求
6. 可扩展性设计：考虑企业未来发展需求，提供具有前瞻性的解决方案
7. 企业风格限制：使用正式商务语言，避免口语化表达，保持专业严谨的企业沟通风格
8. 企业场景不当语言处理：将部门间的冲突或不满转化为流程优化、资源配置、沟通机制等管理层面的改进建议，避免人际关系层面的直接表达`,
      
      education: `增强指令（教育场景专用）：
1. 学习心理关怀：理解学生的学习压力、认知特点和情感需求，提供温暖支持的表达
2. 知识体系构建：将复杂概念分解为易理解的知识点，建立清晰的学习路径
3. 学习方法指导：根据不同学习风格，提供个性化的学习策略和技巧建议
4. 成长激励导向：强调学习过程中的进步和成就，建立学生的学习信心
5. 家校沟通桥梁：平衡学生需求和家长期望，促进有效的三方沟通
6. 教学资源整合：合理利用教学工具、参考资料和实践机会，丰富学习体验
7. 教育风格限制：使用鼓励性、启发性语言，避免批评或负面表达，保持积极向上的教育语调
8. 教育场景不当语言处理：将学生的挫败感、学习困难转化为具体的学习支持需求，重点关注学习方法调整、心理疏导、个别辅导等教育专业化表达`
    }

    const comprehensivePrompt = [
      {
        role: 'system',
        content: `${prompt.systemRole}

${prompt.instruction}

【重要】输入内容过滤和智能处理规则：
1. 不当言语处理：如果用户输入包含辱骂、粗俗、攻击性词汇，不要重复这些内容，而是：
   - 识别为"用户情绪化表达"或"测试性输入"
   - 理解可能的真实意图（如表达不满、寻求帮助、随意测试等）
   - 以专业、友好的方式回应

2. 无意义输入处理：如果输入是：
   - 随机字母/数字组合（如"cnm"、"123"、"aaa"）
   - 单个词汇没有明确需求含义
   - 明显的测试性输入
   识别为"需要引导的用户"，建议提供真实需求

3. 负面情绪识别：如果输入表达不满或负面情绪，转化为了解问题和提供帮助的机会

请按以下格式输出：

【需求理解】
简明扼要地总结用户的核心需求（不超过30字）
- 对于有效需求：正常总结
- 对于不当输入：说明"用户测试输入"或"用户情绪化表达"
- 对于无意义输入：说明"输入内容不明确，需要引导"

【信息选项】
针对具体需求生成选项，格式：选项名称|询问原因
- 对于有效需求：正常生成3-5个选项
- 对于无效输入：返回"无需收集额外信息"

【需求转译】
转化为专业描述：
- 对于有效需求：正常转译
- 对于不当输入：转译为"顾客可能正在测试系统或表达情绪，建议友好引导其提供具体需求"
- 对于无意义输入：转译为"顾客输入不够明确，建议主动询问可以为其提供什么帮助"`
      },
      {
        role: 'user', 
        content: `用户输入："${content}"${image ? '\n（用户还上传了一张图片）' : ''}${chatContext}

请分析这个输入，如果是不当言语或无意义内容，请进行智能处理。`
      }
    ]
    const resultRaw = await callModelScopeAPI(comprehensivePrompt, 0.1)
    const result = sanitizeOutput(resultRaw)

    // [MODIFIED] 使用健壮解析，避免将AI建议再次转译
    // Impact: 仅将「需求转译」转发给企业端；中介面板仍展示建议和待确认信息
    // Backward Compatibility: 返回结构字段保持一致
    const parsed = parseSectionsRobust(result)

    // 构建详细步骤（给中介面板）
    const steps = [
      {
        name: '需求分析与转译',
        content: parsed.translation
      }
    ]
    if (parsed.solutionsText) {
      steps.push({
        name: '解决方案建议',
        content: parsed.solutionsText
      })
    }
    if (parsed.confirmationsText && parsed.confirmationsText !== '无') {
      steps.push({
        name: '待确认信息',
        content: parsed.confirmationsText
      })
    }

    // 仅将「需求转译」发往方案端
    const translatedMessage = parsed.translation

    console.groupCollapsed('[LLM] Parsed -> problem_input')
    console.log('structuredOutput:', parsed)
    console.log('translatedMessage:', truncateForLog(translatedMessage))
    console.groupEnd()

    return {
      steps,
      translatedMessage,
      structuredOutput: parsed
    }
  } catch (error) {
    console.error('处理问题输入时出错:', error)
    throw error
  }
}

// 处理方案端响应 - 增强版本，支持聊天历史和解决方案优化
const processSolutionResponse = async (content, scenario, chatHistory = []) => {
  try {
    const scenarioPrompts = {
      retail: {
        systemRole: '你是专业的客户沟通专家，负责将企业的专业表述转化为顾客友好、易懂的完整回复。要求be brief，clear，approachable。不要分点写。用完整的句子写。两句话以内，不超过30个字。自然地融入必要的建议。',
        context: '在零售场景中，企业通常会提供产品信息、价格方案、服务条款等专业内容。你的任务是将这些内容转化为客户容易理解和接受的简洁回复，自然地融入行动建议，帮助客户解决问题或做出决策。',
        example: '企业回复："该产品采用进口材料，符合国际标准，批发价格为单价80元，起订量100件。"\n优化后："这款产品进口材料，品质保障。100件以上80元/件，您确认下数量我来报价。"'
      },
      enterprise: {
        systemRole: '你是一位专业的企业服务AI助手，专门负责将技术方案和商业提案转化为决策者易懂的表达，同时智能过滤和转化不当表达，确保沟通专业化。',
        context: '在企业服务场景中，技术团队通常会提供复杂的解决方案、技术规格、实施计划等。你需要将这些内容转化为业务决策者能够理解的语言，突出商业价值和实施路径。',
        example: '企业回复："我们建议采用微服务架构，使用Docker容器化部署，预计开发周期6个月，需要投入3名高级工程师。"\n优化后："我们为您设计了一套灵活可扩展的系统架构，可以支持您业务的快速增长。整个项目大约需要6个月完成，我们会安排3位资深工程师专门负责。建议我们先安排一次详细的需求沟通，为您制定具体的实施计划和时间节点。"'
      },
      education: {
        systemRole: '你是一位专业的教育服务AI助手，专门负责将教学方案和课程安排转化为学生和家长易懂的表达，同时智能过滤和转化不当表达，确保沟通专业化。',
        context: '在教育场景中，教师和教务人员通常会提供课程安排、教学计划、学习要求等专业内容。你需要将这些转化为学生和家长容易理解的语言，突出学习价值和具体安排。',
        example: '企业回复："该课程采用STEAM教学法，包含理论讲解和实践操作，每周2课时，共计24课时，需要准备实验材料。"\n优化后："这门课程会通过动手实践的方式让孩子学习，每周安排2节课，总共12周完成。孩子们会在课堂上进行有趣的实验和项目制作。建议您提前为孩子准备一些基础的实验材料，我们会提供详细的材料清单。"'
      }
    }

    if (!scenario || !scenarioPrompts[scenario]) {
      throw new Error(`无效的场景类型: ${scenario}。支持的场景: ${Object.keys(scenarioPrompts).join(', ')}`)
    }
    const prompt = scenarioPrompts[scenario]
    
    // 构建聊天历史上下文（包含详细日志）
    const chatContext = buildChatContextWithLogging(chatHistory, '聊天历史上下文', 6)
    
    // 为每个场景定制独立的增强指令
    const enhancedInstructions = {
      retail: `增强指令（零售方案优化专用）：
1. 购买体验优化：将企业的产品介绍转化为顾客关心的实际价值和使用体验
2. 价格透明化：清晰说明价格构成、优惠条件和性价比优势，消除价格疑虑
3. 决策便利性：提供简单明了的购买流程和决策支持，降低购买门槛
4. 信任建立：强调品质保证、售后服务、退换货政策等信任要素
5. 个性化关怀：根据顾客特点提供个性化的产品建议和使用指导
6. 零售语言风格：使用亲切但专业的语调，避免过于正式或过于随意的表达
7. 零售场景不当语言净化：将企业端的技术术语或不当表达转化为顾客友好的日常用语`,
      
      enterprise: `增强指令（企业方案优化专用）：
1. 商业价值突出：将技术方案转化为明确的商业收益和竞争优势表述
2. 决策支持强化：提供清晰的方案对比、风险评估和实施建议
3. 沟通效率提升：使用决策者熟悉的商业语言，避免过度技术化的表达
4. 实施可行性：强调方案的可操作性、时间安排和资源需求
5. 长期价值体现：突出方案对企业长期发展的战略价值
6. 企业语言风格：保持正式专业的商务沟通风格，体现权威性和可信度
7. 企业场景不当语言净化：将技术团队的专业术语或不当表达转化为业务友好的管理语言`,
      
      education: `增强指令（教育方案优化专用）：
1. 学习价值传递：将教学安排转化为学生和家长能理解的学习价值和成长收益
2. 学习体验优化：强调教学方法的趣味性、互动性和个性化特点
3. 成长路径清晰：提供明确的学习目标、进度安排和成果预期
4. 家长沟通友好：使用家长容易理解的教育语言，避免过于专业的术语
5. 学生激励导向：强调学习的乐趣和成就感，建立学习信心
6. 教育语言风格：使用温暖鼓励的语调，体现教育的关怀和专业性
7. 教育场景不当语言净化：将教师的专业术语或不当表达转化为学生和家长友好的教育语言`
    }

    const comprehensivePrompt = [
      {
        role: 'system',
        content: `${prompt.systemRole}\n\n${prompt.context}\n\n${prompt.example}\n\n${enhancedInstructions[scenario]}`
      },
      {
        role: 'user',
        content: `企业方案端回复："${content}"${chatContext}\n\n请按照以下结构输出：\n\n【优化回复】\n将企业回复转化为客户友好、易懂的完整表达。如果需要给客户提供行动建议，请直接融入到回复中，使用自然的语言，不要使用"选项1、选项2"这种格式，而是用"您可以..."、"建议您..."、"如果您需要..."这样的自然表达。\n\n【内部备注】\n（仅供系统参考，不发送给客户）记录处理要点和注意事项\n\n【补充说明】\n如有需要单独说明的重要信息，请列出（如无则写"无"）`
      }
    ]
    const resultRaw = await callModelScopeAPI(comprehensivePrompt, 0.1)
    const result = sanitizeOutput(resultRaw)

    // 解析结构化输出
    const optimizedReplyMatch = result.match(/【优化回复】\s*([\s\S]*?)(?=【内部备注】|【补充说明】|$)/)
    const internalNotesMatch = result.match(/【内部备注】\s*([\s\S]*?)(?=【补充说明】|$)/)
    const additionalInfoMatch = result.match(/【补充说明】\s*([\s\S]*?)$/)
    
    const optimizedReply = optimizedReplyMatch ? optimizedReplyMatch[1].trim() : result
    const internalNotes = internalNotesMatch ? internalNotesMatch[1].trim() : ''
    const additionalInfo = additionalInfoMatch ? additionalInfoMatch[1].trim() : ''

    // 构建详细的步骤显示
    const steps = [
      {
        name: '语言优化',
        content: optimizedReply
      }
    ]
    
    if (internalNotes && internalNotes !== '无') {
      steps.push({
        name: '内部备注',
        content: internalNotes
      })
    }
    
    if (additionalInfo && additionalInfo !== '无') {
      steps.push({
        name: '补充说明',
        content: additionalInfo
      })
    }

    // 构建最终的优化消息（发送给客户）
    // 优化回复现在已经包含了自然融入的建议，所以不需要单独添加"选项"格式的内容
    let optimizedMessage = optimizedReply
    if (additionalInfo && additionalInfo !== '无') {
      optimizedMessage += '\n\n' + additionalInfo
    }

    console.groupCollapsed('[LLM] Parsed -> solution_response')
    console.log('structuredOutput:', { optimizedReply, internalNotes, additionalInfo })
    console.log('optimizedMessage:', truncateForLog(optimizedMessage))
    console.groupEnd()

    return {
       steps,
       optimizedMessage,
       structuredOutput: {
         optimizedReply,
         internalNotes,
         additionalInfo
       }
     }
  } catch (error) {
    console.error('处理方案响应时出错:', error)
    throw error
  }
}

// 新增：生成企业端建议
const generateEnterpriseSuggestion = async (content, scenario, chatHistory = []) => {
  try {
    const scenarioPrompts = {
      retail: {
        systemRole: '你是一位专业的零售顾问，专门为企业门店提供销售建议和解决方案，同时智能过滤和转化不当表达，确保沟通专业化。',
        context: '基于客户的需求和企业的情况，提供专业的销售建议，包括产品推荐、价格策略、服务方案等。',
        example: '客户需求："需要商务西装，预算800-1500元"\n建议："建议推荐三款产品：1)经典款A123，售价1280元，意大利面料，免费修改；2)现代款B456，售价1150元，舒适透气；3)高端款C789，售价1350元，时尚剪裁。重点推荐A123，性价比最高，适合商务场合。"'
      },
      enterprise: {
        systemRole: '你是一位专业的企业技术顾问，专门为技术团队提供解决方案建议，同时智能过滤和转化不当表达，确保沟通专业化。',
        context: '基于业务需求和技术现状，提供技术方案建议，包括架构设计、技术选型、实施计划等。',
        example: '业务需求："提升用户体验，3个月内完成"\n建议："建议采用渐进式优化方案：第一阶段(1个月)优化现有界面，第二阶段(1.5个月)重构核心流程，第三阶段(0.5个月)性能优化。预计投入3名开发人员，总成本30万元。"'
      },
      education: {
        systemRole: '你是一位专业的教育顾问，专门为教师提供教学方案建议，同时智能过滤和转化不当表达，确保沟通专业化。',
        context: '基于学生的学习需求和教学现状，提供教学建议，包括教学方法、课程安排、学习指导等。',
        example: '学生需求："理解量子物理波粒二象性"\n建议："建议采用三步教学法：1)通过双缝实验视频建立直观认知；2)用光电效应实验理解粒子性；3)通过计算题巩固理解。预计需要4课时，建议准备实验材料。"'
      }
    }

    if (!scenario || !scenarioPrompts[scenario]) {
      throw new Error(`无效的场景类型: ${scenario}`)
    }
    const prompt = scenarioPrompts[scenario]
    
    // 构建聊天历史上下文（包含详细日志）
    const chatContext = buildChatContextWithLogging(chatHistory, '对话历史', 4)
    
    // 为每个场景定制独立的增强指令
    const enhancedInstructions = {
      retail: `生成建议的指导原则（零售企业专用）：
1. 销售策略优化：基于顾客需求特征，提供精准的产品推荐和销售策略
2. 库存与供应链：考虑商品库存、季节性因素和供应链效率
3. 客户关系管理：提供客户维护、复购促进和口碑营销的具体建议
4. 价格策略制定：平衡利润空间和市场竞争力，提供灵活的定价建议
5. 服务体验提升：优化售前咨询、售中服务和售后保障的全流程体验
6. 零售运营实用性：确保建议符合零售行业特点，易于门店执行
7. 零售场景不当语言处理：将顾客的不满转化为服务改进和产品优化的具体行动方案`,
      
      enterprise: `生成建议的指导原则（企业服务专用）：
1. 商业价值量化：提供可衡量的ROI、成本节约和效率提升指标
2. 技术可行性评估：平衡技术先进性和实施可行性，提供风险控制建议
3. 组织变革管理：考虑人员培训、流程调整和文化适应的变革建议
4. 合规与安全保障：确保建议符合行业规范和企业安全政策要求
5. 分阶段实施规划：提供渐进式实施方案，降低业务中断风险
6. 企业决策支持：使用决策层关心的商业语言，突出战略价值
7. 企业场景不当语言处理：将部门冲突转化为流程优化和协作机制改进建议`,
      
      education: `生成建议的指导原则（教育服务专用）：
1. 学习效果导向：基于学习目标和学生特点，提供个性化的教学建议
2. 教学资源配置：合理利用师资、教材和教学设备，优化资源配置
3. 学习进度管理：提供差异化的学习进度安排和能力提升路径
4. 家校协作促进：建立有效的家校沟通机制，形成教育合力
5. 学习兴趣培养：注重学习动机激发和兴趣维持的方法建议
6. 教育专业性保障：确保建议符合教育规律和学生身心发展特点
7. 教育场景不当语言处理：将学习困难转化为教学方法调整和学习支持优化建议`
    }

    const comprehensivePrompt = [
      {
        role: 'system',
        content: `${prompt.systemRole}\n\n${prompt.context}\n\n${prompt.example}\n\n重要要求：提供详细完整的专业建议，包含具体实施步骤和关键要点，确保内容完整性和实用性。`
      },
      {
        role: 'user',
        content: `当前对话内容："${content}"${chatContext}\n\n请为企业提供一个详细的专业建议，包含具体的实施步骤和建议要点。建议应该完整、实用，长度在100-300字之间。`
      }
    ]
    
    const resultRaw = await callModelScopeAPI(comprehensivePrompt, 0.3)
    const result = sanitizeOutput(resultRaw)

    // 简化处理，直接使用结果
    const suggestionMessage = result.trim()

    // 构建步骤显示
    const steps = [
      {
        name: '建议内容',
        content: suggestionMessage
      }
    ]

    console.groupCollapsed('[LLM] Parsed -> generate_suggestion')
    console.log('suggestionMessage:', truncateForLog(suggestionMessage))
    console.groupEnd()

    return {
      steps,
      suggestionMessage,
      structuredOutput: {
        suggestion: suggestionMessage
      }
    }
  } catch (error) {
    console.error('生成企业建议时出错:', error)
    throw error
  }
}

// 新增：生成企业端追问
const generateEnterpriseFollowUp = async (content, scenario, chatHistory = []) => {
  try {
    const scenarioPrompts = {
      retail: {
        systemRole: '你是一位专业的零售销售专家，专门帮助企业了解客户需求的关键信息，同时智能过滤和转化不当表达，确保沟通专业化。',
        context: '基于当前对话，识别需要进一步了解的关键信息，生成有针对性的追问。',
        example: '客户说："需要商务西装"\n追问："请问您的具体使用场合是什么？预算范围大概是多少？您的身高体重是多少？对颜色和款式有什么偏好吗？"'
      },
      enterprise: {
        systemRole: '你是一位专业的企业需求分析师，专门帮助技术团队深入了解业务需求，同时智能过滤和转化不当表达，确保沟通专业化。',
        context: '基于当前对话，识别技术实现需要的关键信息，生成有针对性的追问。',
        example: '业务方说："需要提升用户体验"\n追问："具体希望提升哪些方面的体验？目标用户群体是谁？当前的痛点是什么？有具体的时间要求吗？预算范围是多少？"'
      },
      education: {
        systemRole: '你是一位专业的教育需求分析师，专门帮助教师了解学生的学习情况，同时智能过滤和转化不当表达，确保沟通专业化。',
        context: '基于当前对话，识别教学需要的关键信息，生成有针对性的追问。',
        example: '学生说："不懂这个概念"\n追问："您之前学过相关的基础知识吗？您更倾向于哪种学习方式？您希望达到什么样的理解程度？有什么具体的学习目标吗？"'
      }
    }

    if (!scenario || !scenarioPrompts[scenario]) {
      throw new Error(`无效的场景类型: ${scenario}`)
    }
    const prompt = scenarioPrompts[scenario]
    
    // 构建聊天历史上下文（包含详细日志）
    const chatContext = buildChatContextWithLogging(chatHistory, '对话历史', 4)
    
    // 为每个场景定制独立的增强指令
    const enhancedInstructions = {
      retail: `追问生成的指导原则（零售企业专用）：
1. 销售机会挖掘：识别顾客潜在需求，生成促进成交的关键追问
2. 产品匹配精准度：通过追问了解顾客具体使用场景和偏好
3. 价格敏感度探测：巧妙了解顾客预算范围和价值认知
4. 竞品对比分析：了解顾客对竞争产品的认知和比较标准
5. 购买决策流程：识别影响购买决策的关键因素和决策人
6. 零售场景适应性：确保追问方式符合零售环境的沟通特点
7. 零售场景不当语言处理：将顾客的抱怨转化为了解真实需求的追问机会`,
      
      enterprise: `追问生成的指导原则（企业服务专用）：
1. 业务需求深度挖掘：通过追问了解企业真实的业务痛点和目标
2. 决策链条识别：了解企业内部决策流程和关键决策人
3. 预算与时间约束：探明项目预算范围和实施时间要求
4. 技术环境评估：了解企业现有技术架构和集成要求
5. 风险承受能力：评估企业对新技术和变革的接受程度
6. 企业级专业性：使用企业决策者熟悉的商业语言进行追问
7. 企业场景不当语言处理：将内部分歧转化为了解各部门需求的追问策略`,
      
      education: `追问生成的指导原则（教育服务专用）：
1. 学习目标明确化：通过追问了解具体的学习目标和期望成果
2. 学习能力评估：了解学生当前水平、学习习惯和能力特点
3. 学习环境分析：探明家庭学习环境和学校教学条件
4. 学习动机激发：了解学生兴趣点和学习动力来源
5. 家长期望管理：平衡家长期望和学生实际能力的差异
6. 教育专业性保障：确保追问符合教育规律和学生心理特点
7. 教育场景不当语言处理：将学习挫折转化为了解学习障碍的追问机会`
    }

    const comprehensivePrompt = [
      {
        role: 'system',
        content: `${prompt.systemRole}\n\n${prompt.context}\n\n${prompt.example}\n\n重要要求：生成的追问必须简洁自然，长度在30-80字之间，直接询问最关键的信息，确保问题具体明确。`
      },
      {
        role: 'user',
        content: `当前对话内容："${content}"${chatContext}\n\n请生成一个简洁明确的追问（30-80字），深入了解关键信息。`
      }
    ]
    
    const resultRaw = await callModelScopeAPI(comprehensivePrompt, 0.3)
    const result = sanitizeOutput(resultRaw)

    // 简化处理，直接使用结果
    const followUpMessage = result.trim()

    // 构建步骤显示
    const steps = [
      {
        name: '追问内容',
        content: followUpMessage
      }
    ]

    console.groupCollapsed('[LLM] Parsed -> generate_followup')
    console.log('followUpMessage:', truncateForLog(followUpMessage))
    console.groupEnd()

    return {
      steps,
      followUpMessage,
      structuredOutput: {
        followUp: followUpMessage
      }
    }
  } catch (error) {
    console.error('生成企业追问时出错:', error)
    throw error
  }
}

// 辅助函数 - 保留用于向后兼容
const analyzeContext = async (content) => {
  const prompt = [
    {
      role: 'system',
      content: '你是一个语境分析专家，请分析用户输入的业务场景和上下文。'
    },
    {
      role: 'user',
      content: `用户输入："${content}"\n\n请分析这个输入可能涉及的业务场景、行业背景或使用环境。`
    }
  ]
  return await callModelScopeAPI(prompt)
}

const conceptualize = async (content) => {
  const prompt = [
    {
      role: 'system',
      content: '你是一个概念设计师，请将用户需求转化为具体的概念和功能点。'
    },
    {
      role: 'user',
      content: `基于用户输入："${content}"\n\n请将其概念化为具体的功能需求或解决方案要点。`
    }
  ]
  return await callModelScopeAPI(prompt)
}

const detectMissingInfo = async (content) => {
  const prompt = [
    {
      role: 'system',
      content: '你是一个需求完整性检查专家，请识别用户输入中可能缺失的关键信息。'
    },
    {
      role: 'user',
      content: `用户输入："${content}"\n\n请识别为了更好地理解和满足用户需求，还需要哪些额外信息？`
    }
  ]
  return await callModelScopeAPI(prompt)
}

const translateToSolution = async (content) => {
  const prompt = [
    {
      role: 'system',
      content: '你是一个需求翻译专家，请将用户的原始输入转化为清晰、专业的需求描述。'
    },
    {
      role: 'user',
      content: `用户原始输入："${content}"\n\n请将其转化为清晰、专业的需求描述，包含具体的功能要求和期望结果。`
    }
  ]
  return await callModelScopeAPI(prompt)
}

const optimizeForUser = async (content) => {
  const prompt = [
    {
      role: 'system',
      content: '你是一个用户体验专家，请将技术方案转化为用户易懂的语言，并提供清晰的行动指南。'
    },
    {
      role: 'user',
      content: `技术方案："${content}"\n\n请将其转化为用户友好的语言，包含清晰的步骤和预期结果。`
    }
  ]
  return await callModelScopeAPI(prompt)
}

// 智能需求分析和信息缺失检测 - 精准版本
const analyzeCustomerNeedsWithMissingInfo = async (content, image, scenario, chatHistory = []) => {
  try {
    const scenarioPrompts = {
      retail: {
        systemRole: '你是专业的零售需求分析专家，能够针对任何产品精准识别具体的关键信息点。',
        instruction: `分析用户需求时，要生成具体的、可操作的信息选项，而不是抽象概念。

例如：
- 用户说"我要买件衣服" → 生成：尺码、颜色、价位、场合、材质
- 用户说"我要买个手机" → 生成：预算、品牌、功能需求、存储容量、颜色
- 用户说"我要装修" → 生成：面积、风格、预算、时间、房间类型

要求：
1. 每个选项名称2-4个字，简洁明了
2. 必须是具体的、可直接询问的信息点
3. 与该产品/服务直接相关，不要抽象概念
4. 按重要性排序，最重要的放前面`
      },
      enterprise: {
        systemRole: '你是专业的企业需求分析专家，能够针对任何业务需求精准识别具体的关键信息点。',
        instruction: `分析业务需求时，要生成具体的、可操作的信息选项，而不是抽象概念。

例如：
- 用户说"我要开发系统" → 生成：预算规模、开发周期、用户数量、核心功能、技术栈
- 用户说"我要做营销" → 生成：目标客群、推广渠道、活动预算、效果期望、时间安排
- 用户说"我要培训员工" → 生成：培训人数、培训内容、时间安排、培训方式、预算范围

要求：
1. 每个选项名称2-4个字，简洁明了
2. 必须是具体的、可直接询问的信息点
3. 与该业务需求直接相关，不要抽象概念
4. 按重要性排序，最重要的放前面`
      },
      education: {
        systemRole: '你是专业的教育需求分析专家，能够针对任何学习需求精准识别具体的关键信息点。',
        instruction: `分析学习需求时，要生成具体的、可操作的信息选项，而不是抽象概念。

例如：
- 用户说"我要学英语" → 生成：当前水平、学习目标、时间安排、学习方式、预算考虑
- 用户说"孩子要补数学" → 生成：年级阶段、薄弱环节、上课时间、期望效果、费用预算
- 用户说"我要考证" → 生成：考试时间、基础情况、学习时间、培训方式、通过目标

要求：
1. 每个选项名称2-4个字，简洁明了
2. 必须是具体的、可直接询问的信息点
3. 与该学习需求直接相关，不要抽象概念
4. 按重要性排序，最重要的放前面`
      }
    }

    const prompt = scenarioPrompts[scenario]
    if (!prompt) {
      throw new Error(`不支持的场景类型: ${scenario}`)
    }

    // 构建聊天历史上下文
    const chatContext = buildChatContextWithLogging(chatHistory, '聊天历史上下文', 6)

    const comprehensivePrompt = [
      {
        role: 'system',
        content: `${prompt.systemRole}

${prompt.instruction}

【重要】输入内容过滤和智能处理规则：
1. 不当言语处理：如果用户输入包含辱骂、粗俗、攻击性词汇，不要重复这些内容，而是：
   - 识别为"用户情绪化表达"或"测试性输入"
   - 理解可能的真实意图（如表达不满、寻求帮助、随意测试等）
   - 以专业、友好的方式回应

2. 无意义输入处理：如果输入是：
   - 随机字母/数字组合（如"cnm"、"123"、"aaa"）
   - 单个词汇没有明确需求含义
   - 明显的测试性输入
   识别为"需要引导的用户"，建议提供真实需求

3. 负面情绪识别：如果输入表达不满或负面情绪，转化为了解问题和提供帮助的机会

请按以下格式输出：

【需求理解】
简明扼要地总结用户的核心需求（不超过30字）
- 对于有效需求：正常总结
- 对于不当输入：说明"用户测试输入"或"用户情绪化表达"
- 对于无意义输入：说明"输入内容不明确，需要引导"

【信息选项】
针对具体需求生成选项，格式：选项名称|询问原因
- 对于有效需求：正常生成3-5个选项
- 对于无效输入：返回"无需收集额外信息"

【需求转译】
转化为专业描述：
- 对于有效需求：正常转译
- 对于不当输入：转译为"顾客可能正在测试系统或表达情绪，建议友好引导其提供具体需求"
- 对于无意义输入：转译为"顾客输入不够明确，建议主动询问可以为其提供什么帮助"`
      },
      {
        role: 'user', 
        content: `用户输入："${content}"${image ? '\n（用户还上传了一张图片）' : ''}${chatContext}

请分析这个输入，如果是不当言语或无意义内容，请进行智能处理。`
      }
    ]

    const result = await callModelScopeAPI(comprehensivePrompt, 0.1)
    const sanitizedResult = sanitizeOutput(result)
    
    // 解析结果
    const needsMatch = sanitizedResult.match(/【需求理解】\s*\n([\s\S]*?)(?=\n【|$)/)
    const optionsMatch = sanitizedResult.match(/【信息选项】\s*\n([\s\S]*?)(?=\n【|$)/)
    const translationMatch = sanitizedResult.match(/【需求转译】\s*\n([\s\S]*?)(?=\n【|$)/)

    const needsUnderstanding = needsMatch ? needsMatch[1].trim() : '需求分析'
    const optionsText = optionsMatch ? optionsMatch[1].trim() : ''
    const translation = translationMatch ? translationMatch[1].trim() : content

    // 解析信息选项
    const missingInfoOptions = []
    if (optionsText) {
      const lines = optionsText.split('\n').filter(line => line.trim())
      for (const line of lines) {
        // 匹配格式：选项名称|说明
        const match = line.match(/^[•\-\*]?\s*([^|]{2,8})\|(.+)$/)
        if (match) {
          missingInfoOptions.push({
            name: match[1].trim(),
            description: match[2].trim(),
            selected: false
          })
        }
      }
    }

    console.log('[LLM] 智能需求分析结果:', {
      needsUnderstanding,
      missingInfoOptions,
      translation
    })

    return {
      needsUnderstanding,
      missingInfoOptions,
      translation,
      structuredOutput: {
        needsUnderstanding,
        missingInfoOptions,
        translation
      }
    }

  } catch (error) {
    console.error('智能需求分析错误:', error)
    throw error
  }
}

// 协商建议处理函数
const negotiateSuggestion = async (content, scenario, chatHistory = []) => {
  try {
    console.log('\n=== 开始协商建议处理 ===')
    console.log('原始建议:', content.originalSuggestion)
    console.log('协商请求:', content.negotiationRequest)
    console.log('场景:', scenario)

    const chatContext = buildChatContextWithLogging(chatHistory, '协商上下文', 4)

    const systemPrompt = `你是一个专业的${scenario}顾问，正在根据客户的协商请求优化之前的建议。

请根据客户的协商要求，对原始建议进行修改和优化。

输出要求：
1. 必须包含【处理步骤】部分，详细说明协商处理过程
2. 必须包含【优化建议】部分，提供修改后的完整建议
3. 建议要具体、可操作、符合客户的协商要求
4. 保持专业性和实用性`

    const userPrompt = `原始建议：
${content.originalSuggestion}

客户协商请求：
${content.negotiationRequest}

请根据客户的协商要求，优化上述建议。${chatContext}`

    const messages = [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt }
    ]

    console.log('发送协商请求到LLM...')
    const response = await callModelScopeAPI(messages, 0.7)
    console.log('LLM协商响应:', truncateForLog(response))

    const sanitized = sanitizeOutput(response)
    const sections = parseSectionsRobust(sanitized)

    const steps = sections['处理步骤'] || ['正在分析协商请求...', '优化原始建议...', '生成协商后建议...']
    const suggestionMessage = sections['优化建议'] || sanitized

    console.log('协商处理完成')
    console.log('处理步骤:', steps)
    console.log('优化建议:', truncateForLog(suggestionMessage))

    return {
      steps,
      suggestionMessage
    }

  } catch (error) {
    console.error('协商建议处理错误:', error)
    throw error
  }
}

// 基于选中的信息生成追问
const generateQuestionsBySelectedInfo = async (originalContent, selectedInfoItems, scenario, chatHistory = []) => {
  try {
    const scenarioPrompts = {
      retail: {
        systemRole: '你是专业的零售销售顾问，擅长根据顾客需求生成自然、友好的追问。',
        questionStyle: '友好亲切，专业但不生硬，让顾客感到被重视和理解'
      },
      enterprise: {
        systemRole: '你是专业的企业服务顾问，擅长根据业务需求生成专业、高效的追问。',
        questionStyle: '专业严谨，逻辑清晰，体现商业洞察力和执行效率'
      },
      education: {
        systemRole: '你是专业的教育咨询顾问，擅长根据学习需求生成温暖、启发性的追问。',
        questionStyle: '温暖鼓励，循循善诱，既了解需求又给予学习信心'
      }
    }

    const prompt = scenarioPrompts[scenario]
    if (!prompt) {
      throw new Error(`不支持的场景类型: ${scenario}`)
    }

    const selectedItems = selectedInfoItems.map(item => `${item.name}：${item.description}`).join('\n')
    const chatContext = buildChatContextWithLogging(chatHistory, '聊天历史上下文', 6)

    const comprehensivePrompt = [
      {
        role: 'system',
        content: `${prompt.systemRole}

风格要求：${prompt.questionStyle}

任务：基于用户的原始需求和企业选中的信息点，生成一个自然的追问。

要求：
1. 追问要自然流畅，像真人对话一样
2. 一次性询问所有选中的信息点，但要组织得自然
3. 体现对顾客需求的理解和专业性
4. 长度控制在80字以内
5. 不要使用"请问"开头，要更自然`
      },
      {
        role: 'user',
        content: `原始需求："${originalContent}"

企业选中的信息点：
${selectedItems}

${chatContext}

请生成一个自然的追问，询问这些信息。`
      }
    ]

    const result = await callModelScopeAPI(comprehensivePrompt, 0.3)
    return sanitizeOutput(result)

  } catch (error) {
    console.error('生成追问错误:', error)
    throw error
  }
}

// 主要的LLM处理函数
export const processWithLLM = async ({ type, content, image, context, scenario, chatHistory = [] }) => {
  try {
    if (type === 'problem_input') {
      return await processProblemInput(content, image, scenario, chatHistory)
    } else if (type === 'analyze_needs_with_missing_info') {
      return await analyzeCustomerNeedsWithMissingInfo(content, image, scenario, chatHistory)
    } else if (type === 'generate_questions_by_selected_info') {
      const { originalContent, selectedInfoItems } = content
      return await generateQuestionsBySelectedInfo(originalContent, selectedInfoItems, scenario, chatHistory)
    } else if (type === 'solution_response') {
      return await processSolutionResponse(content, scenario, chatHistory)
    } else if (type === 'generate_suggestion') {
      return await generateEnterpriseSuggestion(content, scenario, chatHistory)
    } else if (type === 'generate_followup') {
      return await generateEnterpriseFollowUp(content, scenario, chatHistory)
    } else if (type === 'negotiate_suggestion') {
      return await negotiateSuggestion(content, scenario, chatHistory)
    }
    
    throw new Error('未知的处理类型')
  } catch (error) {
    console.error('LLM处理错误:', error)
    throw error
  }
}

// 导出其他可能需要的函数
export {
  callModelScopeAPI,
  analyzeContext,
  conceptualize,
  detectMissingInfo,
  translateToSolution,
  optimizeForUser,
  generateEnterpriseSuggestion,
  generateEnterpriseFollowUp,
  negotiateSuggestion
}
