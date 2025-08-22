import React, { useRef, useEffect, useState } from 'react'
import { Bot, Sparkles, Lightbulb, Zap, Layers, Filter, ArrowRight } from 'lucide-react'
import { LLMProcessingLoader, TypingLoader } from './LoadingStates'
import AnimatedTransition from './AnimatedTransition'

const LLMPanel = ({ processing, messages }) => {
  const messagesEndRef = useRef(null)

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  const getProcessingIcon = (title) => {
    if (title.includes('问题端')) {
      return <Layers className="w-4 h-4 text-blue-600" />
    } else if (title.includes('方案端')) {
      return <Zap className="w-4 h-4 text-green-600" />
    } else if (title.includes('建议')) {
      return <Lightbulb className="w-4 h-4 text-purple-600" />
    } else if (title.includes('追问')) {
      return <Filter className="w-4 h-4 text-orange-600" />
    } else if (title.includes('最终')) {
      return <ArrowRight className="w-4 h-4 text-indigo-600" />
    }
    return <Bot className="w-4 h-4 text-gray-600" />
  }

  const getProcessingStatus = (title) => {
    if (title.includes('问题端')) {
      return '正在分析客户需求...'
    } else if (title.includes('方案端')) {
      return '正在优化企业回复...'
    } else if (title.includes('建议')) {
      return '正在生成专业建议...'
    } else if (title.includes('追问')) {
      return '正在生成追问问题...'
    } else if (title.includes('最终')) {
      return '正在处理最终回复...'
    }
    return '正在处理...'
  }

  return (
    <>
      {/* Header */}
      <div className="panel-header">
        <div className="flex items-center space-x-3">
          <div className="p-2 bg-gradient-to-br from-purple-500/90 to-indigo-600/90 rounded-2xl backdrop-blur-sm">
            <Bot className="w-5 h-5 text-white" />
          </div>
          <div>
            <h3 className="font-semibold text-gray-900 dark:text-white">AI 中介处理</h3>
            <p className="text-sm text-gray-600 dark:text-gray-300">智能分析和方案生成</p>
          </div>
        </div>
      </div>

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto space-y-4 mb-4 p-4">
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full text-center text-gray-500 dark:text-gray-400 space-y-4">
            <AnimatedTransition type="fade" show={true}>
              <div className="p-4 rounded-full shadow-inner div-with-background">
                <Sparkles className="w-8 h-8 text-purple-600 dark:text-purple-400" />
              </div>
            </AnimatedTransition>
            <p className="text-lg">LLM中介将在这里处理您的请求</p>
            <div className="grid grid-cols-3 gap-4 mt-4 max-w-md">
              <AnimatedTransition type="slide-up" show={true} delay={100}>
                <div className="p-4 div-with-background rounded-2xl shadow-sm hover:shadow-md transition-all duration-200 flex flex-col items-center text-sm">
                  <Lightbulb className="w-6 h-6 mb-2 text-amber-500" />
                  <span className="text-gray-800 dark:text-gray-200">分析需求</span>
                </div>
              </AnimatedTransition>
              <AnimatedTransition type="slide-up" show={true} delay={200}>
                <div className="p-4 div-with-background rounded-2xl shadow-sm hover:shadow-md transition-all duration-200 flex flex-col items-center text-sm">
                  <Zap className="w-6 h-6 mb-2 text-blue-500" />
                  <span className="text-gray-800 dark:text-gray-200">生成方案</span>
                </div>
              </AnimatedTransition>
              <AnimatedTransition type="slide-up" show={true} delay={300}>
                <div className="p-4 div-with-background rounded-2xl shadow-sm hover:shadow-md transition-all duration-200 flex flex-col items-center text-sm">
                  <Layers className="w-6 h-6 mb-2 text-green-500" />
                  <span className="text-gray-800 dark:text-gray-200">优化结果</span>
                </div>
              </AnimatedTransition>
            </div>
          </div>
        )}
        
        {/* 统一的处理状态显示区域 */}
        {(messages.length > 0 || processing) && (
          <AnimatedTransition type="fade" show={true}>
            <div className="p-4 glass-effect div-with-background">
              <div className="flex items-center space-x-3">
                <Bot className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                <div className="flex-1">
                  <div className="flex items-center space-x-2">
                    {processing ? (
                      <>
                        <div className="flex space-x-1">
                          <div className="w-2 h-2 bg-purple-400 rounded-full animate-bounce"></div>
                          <div className="w-2 h-2 bg-purple-400 rounded-full animate-bounce" style={{animationDelay: '0.1s'}}></div>
                          <div className="w-2 h-2 bg-purple-400 rounded-full animate-bounce" style={{animationDelay: '0.2s'}}></div>
                        </div>
                        <span className="text-sm text-purple-700 dark:text-purple-300">AI正在处理中...</span>
                      </>
                    ) : (
                      <>
                        <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                        <span className="text-sm text-purple-700 dark:text-purple-300">处理完成</span>
                      </>
                    )}
                  </div>
                  {messages.length > 0 && (
                    <div className="text-xs text-purple-600 dark:text-purple-400 mt-1">
                      已处理 {messages.length} 个请求
                    </div>
                  )}
                </div>
              </div>
            </div>
          </AnimatedTransition>
        )}

        
        <div ref={messagesEndRef} />
      </div>
    </>
  )
}

export default LLMPanel