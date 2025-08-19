// [MODIFIED] Deepbricks LLM处理服务（旧版文件保持兼容接口）

// Deepbricks API配置
const MODELSCOPE_CONFIG = {
  baseURL: 'https://api.deepbricks.ai/v1/',
  model: 'GPT-5-Chat',
  apiKey: 'sk-lNVAREVHjj386FDCd9McOL7k66DZCUkTp6IbV0u9970qqdlg'
}

// 调用魔搭API的通用函数
const callModelScopeAPI = async (messages, temperature = 0.7) => {
  try {
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
      throw new Error(`API调用失败: ${response.status} ${response.statusText}`)
    }

    const data = await response.json()
    return data.choices[0].message.content
  } catch (error) {
    console.error('魔搭API调用错误:', error)
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
    '衣服、鞋子还是其他什么小物件'
  ]
  let sanitized = text
  bannedPhrases.forEach((p) => {
    const regex = new RegExp(p, 'g')
    sanitized = sanitized.replace(regex, '')
  })
  return sanitized.trim()
}

// 处理问题端输入 - 增强版本，支持聊天历史和深度理解
const processProblemInput = async (content, image, scenario, chatHistory = []) => {
  try {
    // 根据场景定制提示词 - 增强版本
    const scenarioPrompts = {
      retail: {
        systemRole: '你是一个专业的AI沟通助手，专门在顾客与企业门店之间提供精准的需求转译和解决方案建议。你的核心职责是：1)准确理解顾客的真实需求和潜在意图 2)将其转化为企业能够理解和执行的专业描述 3)基于企业能力提供具体可行的解决方案选项。',
        context: '场景边界：零售顾客-门店沟通。你需要同时理解双方可能存在的表达偏差：顾客可能表达不清晰或有隐含需求，企业可能用专业术语回复。\n\n核心任务：\n1. 深度理解：分析顾客的显性需求和隐性需求，识别可能的表达偏差\n2. 精准转译：将顾客需求转化为包含产品类型、使用场景、预算范围、规格要求等关键信息的专业描述\n3. 方案建议：基于转译结果，为企业提供2-3个具体可行的解决方案选项，包含产品推荐、服务建议、价格区间等',
        example: '例如：顾客说"我需要一件适合商务场合的衣服" → 转译："顾客需要商务正装，用于重要会议，预算待确认，需要专业形象" → 方案建议："1)推荐经典商务西装套装，价格800-1500元，包含免费修改服务 2)推荐商务休闲装，价格500-800元，适合日常商务场合 3)提供个人形象顾问服务，根据具体需求定制搭配方案"'
      },
      enterprise: {
        systemRole: '你是一个专业的AI沟通助手，专门在企业跨部门之间提供精准的需求转译和解决方案建议。你的核心职责是：1)准确理解业务部门的需求和技术部门的能力边界 2)消除部门间的沟通偏差 3)提供具体可行的技术解决方案选项。',
        context: '场景边界：企业内部跨部门沟通。你需要理解不同部门的语言差异：业务部门关注效果和时间，技术部门关注可行性和资源。\n\n核心任务：\n1. 需求解析：将业务需求转化为技术可理解的功能要求，包含具体指标、时间期限、资源约束\n2. 方案设计：基于技术能力提供2-3个不同复杂度的解决方案选项\n3. 风险评估：识别实施过程中可能的技术风险和资源需求',
        example: '例如：市场部说"我们需要提升用户体验" → 转译："需要开发用户体验优化功能，目标提升用户留存率，时间3个月内" → 方案建议："1)快速方案：优化现有界面和交互，预计提升10%留存率，需要2周，成本5万 2)中等方案：重新设计核心流程，预计提升25%留存率，需要6周，成本15万 3)深度方案：全面重构用户体验，预计提升40%留存率，需要3个月，成本40万"'
      },
      education: {
        systemRole: '你是一个专业的AI教学助手，专门在学生与教师之间提供精准的学习需求转译和教学方案建议。你的核心职责是：1)深度理解学生的学习困难和知识盲点 2)将其转化为教师可操作的教学要点 3)提供多样化的教学解决方案选项。',
        context: '场景边界：师生互动的学习沟通。你需要理解学习过程中的认知偏差：学生可能无法准确表达困难点，教师可能用过于专业的语言回复。\n\n核心任务：\n1. 学习诊断：分析学生的具体困难点、知识背景、学习风格\n2. 教学转译：将学习需求转化为包含知识点、难点分析、教学目标的专业描述\n3. 方案建议：提供2-3种不同教学方法的具体实施方案',
        example: '例如：学生说"我不懂这个概念" → 转译："学生对量子物理波粒二象性概念理解困难，需要从基础概念开始，通过实验例子建立认知" → 方案建议："1)实验演示法：通过双缝实验等经典实验，直观展示波粒二象性，适合视觉学习者 2)类比教学法：用水波和弹珠的类比，帮助理解抽象概念，适合逻辑思维强的学生 3)渐进式教学：从光的基本性质开始，逐步引入量子概念，适合基础较弱的学生"'
      }
    }

    if (!scenario || !scenarioPrompts[scenario]) {
      throw new Error(`无效的场景类型: ${scenario}。支持的场景: ${Object.keys(scenarioPrompts).join(', ')}`)
    }
    const prompt = scenarioPrompts[scenario]
    
    // 构建聊天历史上下文
    let chatContext = ''
    if (chatHistory && chatHistory.length > 0) {
      chatContext = '\n\n聊天历史上下文：\n' + 
        chatHistory.slice(-6).map((msg, index) => {
          const role = msg.type === 'user' ? '客户' : msg.type === 'ai_response' ? '企业回复' : 'AI处理'
          return `${index + 1}. ${role}: ${msg.text}`
        }).join('\n')
    }
    
    const comprehensivePrompt = [
      {
        role: 'system',
        content: `${prompt.systemRole}\n\n${prompt.context}\n\n${prompt.example}\n\n增强指令：
1. 上下文理解：充分利用聊天历史，理解对话的完整背景和客户的真实需求
2. 深度优化：不仅转化语言，更要优化内容结构，确保客户获得最大价值
3. 行动导向：提供具体的下一步行动建议，帮助客户做出明智决策
4. 体验提升：确保回复友好、专业、有温度，提升整体沟通体验
5. 价值传递：清晰传达方案的价值和好处，帮助客户理解选择的意义
6. 风险预防：识别可能的误解或疑虑，主动提供澄清和保障`
      },
      {
        role: 'user',
        content: `当前用户输入："${content}"${image ? '\n（用户还上传了一张图片）' : ''}${chatContext}\n\n请按照以下结构输出：\n\n【需求转译】\n将用户需求转化为专业、具体的描述，包含所有关键信息\n\n【解决方案建议】\n基于转译结果，提供2-3个具体可行的解决方案选项：\n方案1：[具体方案描述，包含实施建议、预期效果等]\n方案2：[具体方案描述，包含实施建议、预期效果等]\n方案3：[具体方案描述，包含实施建议、预期效果等]\n\n【待确认信息】\n如有需要进一步确认的关键信息，请列出（如无则写"无"）`
      }
    ]
    const resultRaw = await callModelScopeAPI(comprehensivePrompt, 0.1)
    const result = sanitizeOutput(resultRaw)

    // 解析结构化输出
    const sections = {
      translation: '',
      solutions: [],
      confirmations: ''
    }
    
    // 提取需求转译部分
    const translationMatch = result.match(/【需求转译】\s*([\s\S]*?)(?=【解决方案建议】|$)/)
    if (translationMatch) {
      sections.translation = translationMatch[1].trim()
    }
    
    // 提取解决方案建议部分
    const solutionsMatch = result.match(/【解决方案建议】\s*([\s\S]*?)(?=【待确认信息】|$)/)
    if (solutionsMatch) {
      const solutionsText = solutionsMatch[1].trim()
      const solutionMatches = solutionsText.match(/方案[1-3]：([^\n]+)/g)
      if (solutionMatches) {
        sections.solutions = solutionMatches.map(match => match.replace(/方案[1-3]：/, '').trim())
      }
    }
    
    // 提取待确认信息部分
    const confirmationsMatch = result.match(/【待确认信息】\s*([\s\S]*?)$/)
    if (confirmationsMatch) {
      sections.confirmations = confirmationsMatch[1].trim()
    }

    // 构建详细的步骤显示
    const steps = [
      {
        name: '需求分析与转译',
        content: sections.translation || result
      }
    ]
    
    if (sections.solutions.length > 0) {
      steps.push({
        name: '解决方案建议',
        content: sections.solutions.map((solution, index) => `方案${index + 1}：${solution}`).join('\n\n')
      })
    }
    
    if (sections.confirmations && sections.confirmations !== '无') {
      steps.push({
        name: '待确认信息',
        content: sections.confirmations
      })
    }

    // 构建发送给方案端的消息：仅包含需求转译，避免将AI生成的建议再次转译
    const translatedMessage = sections.translation || result

    return {
      steps,
      translatedMessage,
      structuredOutput: sections
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
        systemRole: '你是一位专业的零售业客户服务AI助手，专门负责将企业的专业回复转化为客户友好的表达。',
        context: '在零售场景中，企业通常会提供产品信息、价格方案、服务条款等专业内容。你的任务是将这些内容转化为客户容易理解和接受的语言，同时提供具体的行动建议，帮助客户做出购买决策。',
        example: '企业回复："该产品采用进口材料，符合国际标准，批发价格为单价80元，起订量100件。"\n优化后："这款产品使用的是进口优质材料，品质有保障。如果您需要100件以上，我们可以给您80元/件的优惠价格。建议您可以先确认一下具体需要的数量，我们为您计算总价和配送方案。"'
      },
      enterprise: {
        systemRole: '你是一位专业的企业服务AI助手，专门负责将技术方案和商业提案转化为决策者易懂的表达。',
        context: '在企业服务场景中，技术团队通常会提供复杂的解决方案、技术规格、实施计划等。你需要将这些内容转化为业务决策者能够理解的语言，突出商业价值和实施路径。',
        example: '企业回复："我们建议采用微服务架构，使用Docker容器化部署，预计开发周期6个月，需要投入3名高级工程师。"\n优化后："我们为您设计了一套灵活可扩展的系统架构，可以支持您业务的快速增长。整个项目大约需要6个月完成，我们会安排3位资深工程师专门负责。建议我们先安排一次详细的需求沟通，为您制定具体的实施计划和时间节点。"'
      },
      education: {
        systemRole: '你是一位专业的教育服务AI助手，专门负责将教学方案和课程安排转化为学生和家长易懂的表达。',
        context: '在教育场景中，教师和教务人员通常会提供课程安排、教学计划、学习要求等专业内容。你需要将这些转化为学生和家长容易理解的语言，突出学习价值和具体安排。',
        example: '企业回复："该课程采用STEAM教学法，包含理论讲解和实践操作，每周2课时，共计24课时，需要准备实验材料。"\n优化后："这门课程会通过动手实践的方式让孩子学习，每周安排2节课，总共12周完成。孩子们会在课堂上进行有趣的实验和项目制作。建议您提前为孩子准备一些基础的实验材料，我们会提供详细的材料清单。"'
      }
    }

    if (!scenario || !scenarioPrompts[scenario]) {
      throw new Error(`无效的场景类型: ${scenario}。支持的场景: ${Object.keys(scenarioPrompts).join(', ')}`)
    }
    const prompt = scenarioPrompts[scenario]
    
    // 构建聊天历史上下文
    let chatContext = ''
    if (chatHistory && chatHistory.length > 0) {
      chatContext = '\n\n聊天历史上下文：\n' + 
        chatHistory.slice(-6).map((msg, index) => {
          const role = msg.type === 'user' ? '客户' : msg.type === 'ai_response' ? '企业回复' : msg.type === 'llm_request' ? '需求转译' : 'AI处理'
          return `${index + 1}. ${role}: ${msg.text}`
        }).join('\n')
    }
    
    const comprehensivePrompt = [
      {
        role: 'system',
        content: `${prompt.systemRole}\n\n${prompt.context}\n\n${prompt.example}\n\n增强指令：
1. 上下文理解：充分利用聊天历史，理解对话的完整背景和客户的真实需求
2. 深度优化：不仅转化语言，还要优化内容结构，确保客户获得最大价值
3. 行动导向：提供具体的下一步行动建议，帮助客户做出明智决策
4. 体验提升：确保回复友好、专业、有温度，提升整体沟通体验
5. 价值传递：清晰传达方案的价值和好处，帮助客户理解选择的意义
6. 风险预防：识别可能的误解或疑虑，主动提供澄清和保障`
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
  optimizeForUser
}