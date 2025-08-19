import { useState, useCallback } from 'react'
import { processWithLLM } from '../services/llmService'

export const useMessageFlow = (currentScenario) => {
  const [messages, setMessages] = useState({
    problem: [],
    llm: [],
    solution: []
  })
  const [llmProcessing, setLlmProcessing] = useState(false)
  const [iterationProcessing, setIterationProcessing] = useState(false) // 新增：迭代处理状态
  const [iterationMode, setIterationMode] = useState(false) // 新增：迭代模式状态
  const [pendingResponse, setPendingResponse] = useState(null) // 新增：待发送的响应

  const addMessage = useCallback((panel, message) => {
    setMessages(prev => ({
      ...prev,
      [panel]: [...prev[panel], message]
    }))
  }, [])

  const clearMessages = useCallback(() => {
    setMessages({
      problem: [],
      llm: [],
      solution: []
    })
    setIterationMode(false)
    setPendingResponse(null)
  }, [])

  const sendProblemMessage = useCallback(async (messageData) => {
    // 添加用户消息到问题端
    const userMessage = {
      type: 'user',
      text: messageData.text,
      image: messageData.image,
      timestamp: messageData.timestamp
    }
    addMessage('problem', userMessage)

    // 开始LLM处理
    setLlmProcessing(true)

    try {
      // 构建完整的聊天历史 - 包含所有真实的对话内容
      const chatHistory = [
        // 问题端的所有消息：用户输入 + AI优化后的回复
        ...messages.problem
          .filter(msg => msg.type === 'user' || msg.type === 'ai_response')
          .map(msg => ({ ...msg, panel: 'problem' })),
        // 方案端的所有消息：AI转译的请求 + 企业用户输入 + AI回复
        ...messages.solution
          .filter(msg => msg.type === 'llm_request' || msg.type === 'user' || msg.type === 'ai_response')
          .map(msg => ({ ...msg, panel: 'solution' })),
        userMessage // 包含当前消息（用户）
      ].sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp))

      // 处理用户输入
      const llmResult = await processWithLLM({
        type: 'problem_input',
        content: messageData.text,
        image: messageData.image,
        context: 'problem_to_solution',
        scenario: currentScenario,
        chatHistory: chatHistory
      })

      // 添加LLM处理过程到中介面板
      const llmMessage = {
        type: 'processing',
        title: '处理问题端输入',
        steps: llmResult.steps,
        output: llmResult.translatedMessage,
        timestamp: new Date().toISOString()
      }
      addMessage('llm', llmMessage)

      // 添加翻译后的消息到方案端
      const translatedMessage = {
        type: 'llm_request',
        text: llmResult.translatedMessage,
        timestamp: new Date().toISOString()
      }
      addMessage('solution', translatedMessage)

    } catch (error) {
      console.error('LLM处理错误:', error)
      // 添加错误消息
      const errorMessage = {
        type: 'processing',
        title: '处理出错',
        steps: [{
          name: '错误信息',
          content: '抱歉，处理过程中出现了错误，请稍后重试。'
        }],
        timestamp: new Date().toISOString()
      }
      addMessage('llm', errorMessage)
    } finally {
      setLlmProcessing(false)
    }
  }, [addMessage, currentScenario, messages.problem, messages.solution])

  const sendSolutionMessage = useCallback(async (messageData) => {
    // 添加用户消息到方案端
    const userMessage = {
      type: 'user',
      text: messageData.text,
      timestamp: messageData.timestamp
    }
    addMessage('solution', userMessage)

    // 开始LLM处理
    setLlmProcessing(true)

    try {
      // 构建完整的聊天历史 - 包含所有真实的对话内容
      const chatHistory = [
        // 问题端的所有消息：用户输入 + AI优化后的回复
        ...messages.problem
          .filter(msg => msg.type === 'user' || msg.type === 'ai_response')
          .map(msg => ({ ...msg, panel: 'problem' })),
        // 方案端的所有消息：AI转译的请求 + 企业用户输入 + AI回复
        ...messages.solution
          .filter(msg => msg.type === 'llm_request' || msg.type === 'user' || msg.type === 'ai_response')
          .map(msg => ({ ...msg, panel: 'solution' })),
        userMessage // 包含当前消息（企业方输入）
      ].sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp))

      // 处理方案端响应
      const llmResult = await processWithLLM({
        type: 'solution_response',
        content: messageData.text,
        context: 'solution_to_problem',
        scenario: currentScenario,
        chatHistory: chatHistory
      })

      // 添加LLM处理过程到中介面板
      const llmMessage = {
        type: 'processing',
        title: '处理方案端响应',
        steps: llmResult.steps,
        output: llmResult.optimizedMessage,
        timestamp: new Date().toISOString()
      }
      addMessage('llm', llmMessage)

      // 添加优化后的响应到问题端
      const optimizedMessage = {
        type: 'ai_response',
        text: llmResult.optimizedMessage,
        timestamp: new Date().toISOString()
      }
      addMessage('problem', optimizedMessage)

    } catch (error) {
      console.error('LLM处理错误:', error)
      // 添加错误消息
      const errorMessage = {
        type: 'processing',
        title: '处理出错',
        steps: [{
          name: '错误信息',
          content: '抱歉，处理过程中出现了错误，请稍后重试。'
        }],
        timestamp: new Date().toISOString()
      }
      addMessage('llm', errorMessage)
    } finally {
      setLlmProcessing(false)
    }
  }, [addMessage, currentScenario, messages.problem, messages.solution])

  // 新增：生成企业端建议
  const generateSuggestion = useCallback(async () => {
    if (iterationProcessing) return

    setIterationProcessing(true)

    try {
      // 获取最新的对话内容
      const recentMessages = [
        ...messages.problem.filter(m => m.type === 'user' || m.type === 'ai_response').slice(-2),
        ...messages.solution.filter(m => m.type === 'user' || m.type === 'ai_response').slice(-2)
      ].sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp))

      const currentContent = recentMessages.map(msg => msg.text).join('\n')

      // 构建完整的聊天历史 - 包含所有真实的对话内容
      const chatHistory = [
        // 问题端的所有消息：用户输入 + AI优化后的回复
        ...messages.problem
          .filter(msg => msg.type === 'user' || msg.type === 'ai_response')
          .map(msg => ({ ...msg, panel: 'problem' })),
        // 方案端的所有消息：AI转译的请求 + 企业用户输入 + AI回复
        ...messages.solution
          .filter(msg => msg.type === 'llm_request' || msg.type === 'user' || msg.type === 'ai_response')
          .map(msg => ({ ...msg, panel: 'solution' }))
      ].sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp))

      // 生成建议
      const llmResult = await processWithLLM({
        type: 'generate_suggestion',
        content: currentContent,
        scenario: currentScenario,
        chatHistory: chatHistory
      })

      // 添加LLM处理过程到中介面板
      const llmMessage = {
        type: 'processing',
        title: '生成企业端建议',
        steps: llmResult.steps,
        output: llmResult.suggestionMessage,
        timestamp: new Date().toISOString()
      }
      addMessage('llm', llmMessage)

      // 将建议添加到方案端（作为迭代内容）
      const suggestionMessage = {
        type: 'suggestion',
        text: llmResult.suggestionMessage,
        timestamp: new Date().toISOString()
      }
      addMessage('solution', suggestionMessage)

      // 进入迭代模式
      setIterationMode(true)
      setPendingResponse(llmResult.suggestionMessage)

    } catch (error) {
      console.error('生成建议错误:', error)
      const errorMessage = {
        type: 'processing',
        title: '生成建议出错',
        steps: [{
          name: '错误信息',
          content: '抱歉，生成建议时出现了错误，请稍后重试。'
        }],
        timestamp: new Date().toISOString()
      }
      addMessage('llm', errorMessage)
    } finally {
      setIterationProcessing(false)
    }
  }, [addMessage, currentScenario, messages.problem, messages.solution, iterationProcessing])

  // 新增：生成企业端追问
  const generateFollowUp = useCallback(async () => {
    if (iterationProcessing) return

    setIterationProcessing(true)

    try {
      // 获取最新的对话内容
      const recentMessages = [
        ...messages.problem.filter(m => m.type === 'user' || m.type === 'ai_response').slice(-2),
        ...messages.solution.filter(m => m.type === 'user' || m.type === 'ai_response').slice(-2)
      ].sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp))

      const currentContent = recentMessages.map(msg => msg.text).join('\n')

      // 构建完整的聊天历史 - 包含所有真实的对话内容
      const chatHistory = [
        // 问题端的所有消息：用户输入 + AI优化后的回复
        ...messages.problem
          .filter(msg => msg.type === 'user' || msg.type === 'ai_response')
          .map(msg => ({ ...msg, panel: 'problem' })),
        // 方案端的所有消息：AI转译的请求 + 企业用户输入 + AI回复
        ...messages.solution
          .filter(msg => msg.type === 'llm_request' || msg.type === 'user' || msg.type === 'ai_response')
          .map(msg => ({ ...msg, panel: 'solution' }))
      ].sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp))

      // 生成追问
      const llmResult = await processWithLLM({
        type: 'generate_followup',
        content: currentContent,
        scenario: currentScenario,
        chatHistory: chatHistory
      })

      // 添加LLM处理过程到中介面板
      const llmMessage = {
        type: 'processing',
        title: '生成企业端追问',
        steps: llmResult.steps,
        output: llmResult.followUpMessage,
        timestamp: new Date().toISOString()
      }
      addMessage('llm', llmMessage)

      // 将追问添加到方案端（作为迭代内容）
      const followUpMessage = {
        type: 'followup',
        text: llmResult.followUpMessage,
        timestamp: new Date().toISOString()
      }
      addMessage('solution', followUpMessage)

      // 进入迭代模式
      setIterationMode(true)
      setPendingResponse(llmResult.followUpMessage)

    } catch (error) {
      console.error('生成追问错误:', error)
      const errorMessage = {
        type: 'processing',
        title: '生成追问出错',
        steps: [{
          name: '错误信息',
          content: '抱歉，生成追问时出现了错误，请稍后重试。'
        }],
        timestamp: new Date().toISOString()
      }
      addMessage('llm', errorMessage)
    } finally {
      setIterationProcessing(false)
    }
  }, [addMessage, currentScenario, messages.problem, messages.solution, iterationProcessing])

  // 新增：确认发送最终响应
  const confirmSendResponse = useCallback(async (finalResponse) => {
    if (llmProcessing) return

    setLlmProcessing(true)

    try {
      // 构建完整的聊天历史 - 包含所有真实的对话内容
      const chatHistory = [
        // 问题端的所有消息：用户输入 + AI优化后的回复
        ...messages.problem
          .filter(msg => msg.type === 'user' || msg.type === 'ai_response')
          .map(msg => ({ ...msg, panel: 'problem' })),
        // 方案端的所有消息：AI转译的请求 + 企业用户输入 + AI回复
        ...messages.solution
          .filter(msg => msg.type === 'llm_request' || msg.type === 'user' || msg.type === 'ai_response')
          .map(msg => ({ ...msg, panel: 'solution' }))
      ].sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp))

      // 处理最终响应
      const llmResult = await processWithLLM({
        type: 'solution_response',
        content: finalResponse,
        context: 'solution_to_problem',
        scenario: currentScenario,
        chatHistory: chatHistory
      })

      // 添加LLM处理过程到中介面板
      const llmMessage = {
        type: 'processing',
        title: '处理最终响应',
        steps: llmResult.steps,
        output: llmResult.optimizedMessage,
        timestamp: new Date().toISOString()
      }
      addMessage('llm', llmMessage)

      // 添加优化后的响应到问题端
      const optimizedMessage = {
        type: 'ai_response',
        text: llmResult.optimizedMessage,
        timestamp: new Date().toISOString()
      }
      addMessage('problem', optimizedMessage)

      // 退出迭代模式
      setIterationMode(false)
      setPendingResponse(null)

    } catch (error) {
      console.error('确认发送错误:', error)
      const errorMessage = {
        type: 'processing',
        title: '处理最终响应出错',
        steps: [{
          name: '错误信息',
          content: '抱歉，处理最终响应时出现了错误，请稍后重试。'
        }],
        timestamp: new Date().toISOString()
      }
      addMessage('llm', errorMessage)
    } finally {
      setLlmProcessing(false)
    }
  }, [addMessage, currentScenario, messages.problem, messages.solution, llmProcessing])

  // 新增：取消迭代模式
  const cancelIteration = useCallback(() => {
    setIterationMode(false)
    setPendingResponse(null)
  }, [])

  return {
    messages,
    llmProcessing,
    iterationProcessing,
    iterationMode,
    pendingResponse,
    sendProblemMessage,
    sendSolutionMessage,
    generateSuggestion,
    generateFollowUp,
    confirmSendResponse,
    cancelIteration,
    clearMessages
  }
}