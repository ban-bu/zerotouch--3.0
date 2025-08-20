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
    
    const comprehensivePrompt = [
      {
        role: 'system',
        content: `${prompt.systemRole}\n\n${prompt.context}\n\n${prompt.example}\n\n增强指令：
1. 上下文理解：充分利用聊天历史，理解对话的完整背景和客户的真实需求
2. 深度优化：不仅转化语言，更要优化内容结构，确保客户获得最大价值
3. 行动导向：提供具体的下一步行动建议，帮助客户做出明智决策
4. 体验提升：确保回复友好、专业、有温度，提升整体沟通体验
5. 价值传递：清晰传达方案的价值和好处，帮助客户理解选择的意义
6. 风险预防：识别可能的误解或疑虑，主动提供澄清和保障
7. 风格限制：严格禁止输出任何客服话术或模板化表达（如"感谢您的反馈/我们非常重视/如需帮助请联系/联系我们的客服团队/为您提供满意的解决方案/敬请谅解/忽略本次对话/继续浏览"等），禁止道歉或致谢套话；只围绕当前场景内容进行事实性与可执行性表述，不输出联系渠道或平台政策信息。
8. 不当语言处理：严格禁止在转译结果中直接引用、重复或输出客户的任何粗俗语言、不当表达或情绪化词汇。当遇到此类输入时，应理解其背后的情绪意图，将其转化为专业、客观的问题描述，重点分析可能的不满原因和解决方向，绝不将原始不当内容传递给企业方。`
      },
      {
        role: 'user',
        content: `当前用户输入："${content}"${image ? '\n（用户还上传了一张图片）' : ''}${chatContext}\n\n请按照以下结构输出：\n\n【需求转译】\n将用户需求转化为专业、具体的描述，包含所有关键信息\n\n【解决方案建议】\n基于转译结果，提供2-3个具体可行的解决方案选项：\n方案1：[具体方案描述，包含实施建议、预期效果等]\n方案2：[具体方案描述，包含实施建议、预期效果等]\n方案3：[具体方案描述，包含实施建议、预期效果等]\n\n【待确认信息】\n如有需要进一步确认的关键信息，请列出（如无则写"无"）`
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
        systemRole: '你是话术转译者，负责将企业的文字表述转化为顾客听得懂的理解，be brief，clear，approachable。不要分点写。用完整的句子写。两句话以内，不超过30个字。',
        context: '在零售场景中，企业通常会提供产品信息、价格方案、服务条款等专业内容。你的任务是将这些内容转化为客户容易理解和接受的语言，同时提供具体的行动建议，帮助客户做出购买决策。',
        example: '企业回复："该产品采用进口材料，符合国际标准，批发价格为单价80元，起订量100件。"\n优化后："这款产品使用的是进口优质材料，品质有保障。如果您需要100件以上，我们可以给您80元/件的优惠价格。建议您可以先确认一下具体需要的数量，我们为您计算总价和配送方案。"'
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
    
    const comprehensivePrompt = [
      {
        role: 'system',
        content: `${prompt.systemRole}\n\n${prompt.context}\n\n${prompt.example}\n\n增强指令：
1. 上下文理解：读取聊天记录，理解和预测客户的真实需求
2. 行动导向：提供下一步行动建议（以'需要我这边......吗？'为开头），启发客户做出决策
3. 转译后的内容需要简洁、make-sense，有温度
4. 识别可能的误解或疑虑，主动提供澄清和保障
5. 不当语言处理：严格禁止在优化回复中直接引用、重复或输出企业端的任何粗俗语言、不当表达或情绪化词汇。当遇到此类输入时，应理解其背后的情绪意图，将其转化为专业、客观的表述，绝不将原始不当内容传递给客户。`
      },
      {
        role: 'user',
        content: `企业方案端回复："${content}"${chatContext}\n\n请按照以下结构输出：\n\n【优化回复】\n将企业回复转化为客户友好、易懂的表达，包含关键信息和价值点\n\n【行动建议】\n基于当前情况，为客户提供2-3个具体的下一步行动选项：\n选项1：[具体行动描述，包含预期结果]\n选项2：[具体行动描述，包含预期结果]\n选项3：[具体行动描述，包含预期结果]\n\n【补充说明】\n如有需要补充的重要信息或注意事项，请列出（如无则写"无"）`
      }
    ]
    const resultRaw = await callModelScopeAPI(comprehensivePrompt, 0.1)
    const result = sanitizeOutput(resultRaw)

    // 解析结构化输出
    const optimizedReplyMatch = result.match(/【优化回复】\s*([\s\S]*?)(?=【行动建议】|$)/)
    const actionSuggestionsMatch = result.match(/【行动建议】\s*([\s\S]*?)(?=【补充说明】|$)/)
    const additionalInfoMatch = result.match(/【补充说明】\s*([\s\S]*?)$/)
    
    const optimizedReply = optimizedReplyMatch ? optimizedReplyMatch[1].trim() : result
    const actionSuggestions = actionSuggestionsMatch ? actionSuggestionsMatch[1].trim() : ''
    const additionalInfo = additionalInfoMatch ? additionalInfoMatch[1].trim() : ''

    // 构建详细的步骤显示
    const steps = [
      {
        name: '语言优化',
        content: optimizedReply
      }
    ]
    
    if (actionSuggestions && actionSuggestions !== '无') {
      steps.push({
        name: '行动建议',
        content: actionSuggestions
      })
    }
    
    if (additionalInfo && additionalInfo !== '无') {
      steps.push({
        name: '补充说明',
        content: additionalInfo
      })
    }

    // 构建最终的优化消息
    let optimizedMessage = optimizedReply
    if (actionSuggestions && actionSuggestions !== '无') {
      optimizedMessage += '\n\n' + actionSuggestions
    }
    if (additionalInfo && additionalInfo !== '无') {
      optimizedMessage += '\n\n' + additionalInfo
    }

    console.groupCollapsed('[LLM] Parsed -> solution_response')
    console.log('structuredOutput:', { optimizedReply, actionSuggestions, additionalInfo })
    console.log('optimizedMessage:', truncateForLog(optimizedMessage))
    console.groupEnd()

    return {
       steps,
       optimizedMessage,
       structuredOutput: {
         optimizedReply,
         actionSuggestions,
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
    
    const comprehensivePrompt = [
      {
        role: 'system',
        content: `${prompt.systemRole}\n\n${prompt.context}\n\n${prompt.example}\n\n生成建议的指导原则：\n1. 基于当前对话内容，提供具体可行的建议\n2. 考虑企业能力和资源限制\n3. 提供多个选项供企业选择\n4. 包含具体的实施步骤和预期效果\n5. 避免过于理论化的建议，注重实用性\n6. 风格限制：禁止输出任何客服模板话术或联系/投诉引导语，只专注于专业建议与实施细节。\n7. 不当语言处理：严格禁止在建议中直接引用、重复或输出任何粗俗语言、不当表达或情绪化词汇。当遇到此类输入时，应理解其背后的情绪意图，将其转化为专业、客观的建议内容。`
      },
      {
        role: 'user',
        content: `当前对话内容："${content}"${chatContext}\n\n请为企业提供专业的建议，包括：\n\n【核心建议】\n基于当前情况的主要建议\n\n【具体方案】\n提供2-3个具体的实施方案\n\n【实施要点】\n关键的实施步骤和注意事项`
      }
    ]
    
    const resultRaw = await callModelScopeAPI(comprehensivePrompt, 0.3)
    const result = sanitizeOutput(resultRaw)

    // 解析结构化输出
    const coreSuggestionMatch = result.match(/【核心建议】\s*([\s\S]*?)(?=【具体方案】|$)/)
    const specificPlansMatch = result.match(/【具体方案】\s*([\s\S]*?)(?=【实施要点】|$)/)
    const implementationMatch = result.match(/【实施要点】\s*([\s\S]*?)$/)
    
    const coreSuggestion = coreSuggestionMatch ? coreSuggestionMatch[1].trim() : result
    const specificPlans = specificPlansMatch ? specificPlansMatch[1].trim() : ''
    const implementation = implementationMatch ? implementationMatch[1].trim() : ''

    // 构建步骤显示
    const steps = [
      {
        name: '核心建议',
        content: coreSuggestion
      }
    ]
    
    if (specificPlans) {
      steps.push({
        name: '具体方案',
        content: specificPlans
      })
    }
    
    if (implementation) {
      steps.push({
        name: '实施要点',
        content: implementation
      })
    }

    // 构建完整的建议消息
    let suggestionMessage = coreSuggestion
    if (specificPlans) {
      suggestionMessage += '\n\n' + specificPlans
    }
    if (implementation) {
      suggestionMessage += '\n\n' + implementation
    }

    console.groupCollapsed('[LLM] Parsed -> generate_suggestion')
    console.log('structuredOutput:', { coreSuggestion, specificPlans, implementation })
    console.log('suggestionMessage:', truncateForLog(suggestionMessage))
    console.groupEnd()

    return {
      steps,
      suggestionMessage,
      structuredOutput: {
        coreSuggestion,
        specificPlans,
        implementation
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
    
    const comprehensivePrompt = [
      {
        role: 'system',
        content: `${prompt.systemRole}\n\n${prompt.context}\n\n${prompt.example}\n\n生成追问的指导原则：\n1. 基于当前对话内容，识别信息缺口\n2. 生成3-5个有针对性的追问\n3. 追问要具体、明确，避免模糊表达\n4. 按照重要性排序\n5. 使用友好的语气，避免过于直接\n6. 风格限制：禁止输出"感谢您的反馈/我们非常重视/如需帮助请联系"等客服模板话术，只专注于针对性信息澄清。\n7. 不当语言处理：严格禁止在追问中直接引用、重复或输出任何粗俗语言、不当表达或情绪化词汇。当遇到此类输入时，应理解其背后的情绪意图，将其转化为专业、客观的追问内容。`
      },
      {
        role: 'user',
        content: `当前对话内容："${content}"${chatContext}\n\n请生成有针对性的追问，帮助更好地了解需求：\n\n【关键信息缺口】\n识别当前对话中缺失的关键信息\n\n【追问建议】\n提供3-5个具体的追问问题\n\n【追问策略】\n建议的追问顺序和方式`
      }
    ]
    
    const resultRaw = await callModelScopeAPI(comprehensivePrompt, 0.3)
    const result = sanitizeOutput(resultRaw)

    // 解析结构化输出
    const infoGapsMatch = result.match(/【关键信息缺口】\s*([\s\S]*?)(?=【追问建议】|$)/)
    const followUpQuestionsMatch = result.match(/【追问建议】\s*([\s\S]*?)(?=【追问策略】|$)/)
    const strategyMatch = result.match(/【追问策略】\s*([\s\S]*?)$/)
    
    const infoGaps = infoGapsMatch ? infoGapsMatch[1].trim() : ''
    const followUpQuestions = followUpQuestionsMatch ? followUpQuestionsMatch[1].trim() : result
    const strategy = strategyMatch ? strategyMatch[1].trim() : ''

    // 构建步骤显示
    const steps = [
      {
        name: '信息缺口分析',
        content: infoGaps || '基于当前对话分析需要进一步了解的信息'
      }
    ]
    
    if (followUpQuestions) {
      steps.push({
        name: '追问建议',
        content: followUpQuestions
      })
    }
    
    if (strategy) {
      steps.push({
        name: '追问策略',
        content: strategy
      })
    }

    // 构建完整的追问消息
    let followUpMessage = followUpQuestions
    if (strategy) {
      followUpMessage += '\n\n' + strategy
    }

    console.groupCollapsed('[LLM] Parsed -> generate_followup')
    console.log('structuredOutput:', { infoGaps, followUpQuestions, strategy })
    console.log('followUpMessage:', truncateForLog(followUpMessage))
    console.groupEnd()

    return {
      steps,
      followUpMessage,
      structuredOutput: {
        infoGaps,
        followUpQuestions,
        strategy
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

// 主要的LLM处理函数
export const processWithLLM = async ({ type, content, image, context, scenario, chatHistory = [] }) => {
  try {
    if (type === 'problem_input') {
      return await processProblemInput(content, image, scenario, chatHistory)
    } else if (type === 'solution_response') {
      return await processSolutionResponse(content, scenario, chatHistory)
    } else if (type === 'generate_suggestion') {
      return await generateEnterpriseSuggestion(content, scenario, chatHistory)
    } else if (type === 'generate_followup') {
      return await generateEnterpriseFollowUp(content, scenario, chatHistory)
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
  generateEnterpriseFollowUp
}
