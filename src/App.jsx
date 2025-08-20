import React, { useState, useCallback, useEffect, useRef } from 'react'
import { Settings, Users, GraduationCap, ShoppingBag } from 'lucide-react'
import AnimatedTransition from './components/AnimatedTransition'
import { ConnectionLoader } from './components/LoadingStates'
import ProblemPanel from './components/ProblemPanel'
import LLMPanel from './components/LLMPanel'
import SolutionPanel from './components/SolutionPanel'
import ScenarioSelector from './components/ScenarioSelector'
import NotificationSystem from './components/NotificationSystem'
import KeyboardShortcuts from './components/KeyboardShortcuts'
import SettingsPanel from './components/SettingsPanel'
import { useMessageFlow } from './hooks/useMessageFlow'
import realtimeService, { REALTIME_EVENTS } from './services/realtimeService'
import { showSuccess, showError, showInfo } from './components/NotificationSystem'

const scenarios = {
  retail: {
    id: 'retail',
    name: '零售场景',
    icon: ShoppingBag,
    description: '顾客与企业门店的沟通',
    problemRole: '顾客/消费者',
    solutionRole: '企业门店/销售代表',
    example: '我下周要去参加AOM国际会议做主旨演讲，需要一套正式但现代的商务西装，预算在800-1500元之间，身高175cm，希望能显得专业又有活力。'
  },
  enterprise: {
    id: 'enterprise',
    name: '企业场景',
    icon: Users,
    description: '企业跨部门沟通',
    problemRole: '市场部经理',
    solutionRole: '研发部技术人员',
    example: '我们的移动APP用户留存率只有30%，需要在3个月内开发个性化推荐功能来提升至45%，目标用户是18-35岁，预算50万元。'
  },
  education: {
    id: 'education',
    name: '教育场景',
    icon: GraduationCap,
    description: '学生与教师的互动',
    problemRole: '学生',
    solutionRole: '教师',
    example: '我在学习量子物理时，对波粒二象性概念理解困难，特别是为什么光既是波又是粒子，希望通过具体实验例子来理解这个概念。'
  }
}

function App() {
  const [currentScenario, setCurrentScenario] = useState('retail')
  const [isSettingsOpen, setIsSettingsOpen] = useState(false)
  const [isConnected, setIsConnected] = useState(false)
  const [settings, setSettings] = useState({
    darkMode: window.matchMedia('(prefers-color-scheme: dark)').matches,
    fontSize: 'medium',
    soundEnabled: true,
    autoScroll: true,
    showTimestamps: true,
    language: 'zh-CN',
    apiEndpoint: 'https://api.example.com/v1',
    maxMessagesPerPanel: 50
  })
  
  // 输入框引用
  const problemInputRef = useRef(null)
  const solutionInputRef = useRef(null)
  
  const {
    messages,
    llmProcessing,
    iterationProcessing,
    iterationMode,
    pendingResponse,
    // 新增的状态和方法
    missingInfoOptions,
    showMissingInfoPanel,
    currentNeedsAnalysis,
    toggleMissingInfoOption,
    generateFollowUpBySelectedInfo,
    skipInfoCollection,
    // 原有方法
    sendProblemMessage,
    sendSolutionMessage,
    generateSuggestion,
    generateFollowUp,
    confirmSendResponse,
    cancelIteration,
    clearMessages
  } = useMessageFlow(currentScenario)
  
  // 初始化实时服务连接
  useEffect(() => {
    const initializeConnection = async () => {
      try {
        await realtimeService.connect()
        setIsConnected(true)
        showSuccess('已连接到服务器', { duration: 3000 })
      } catch (error) {
        console.error('Failed to connect to realtime service:', error)
        showError('连接服务器失败', { duration: 5000 })
      }
    }
    
    initializeConnection()
    
    // 订阅连接状态变化
    const unsubscribeConnection = realtimeService.subscribe(
      REALTIME_EVENTS.CONNECTION_STATE_CHANGED,
      (data) => {
        setIsConnected(data.connected)
        if (data.connected) {
          showSuccess('已重新连接到服务器', { duration: 3000 })
        } else {
          showError('与服务器连接断开', { duration: 5000 })
        }
      }
    )
    
    // 订阅错误事件
    const unsubscribeError = realtimeService.subscribe(
      REALTIME_EVENTS.ERROR,
      (error) => {
        console.error('Realtime service error:', error)
        showError(`连接错误: ${error.message}`, { duration: 5000 })
      }
    )
    
    // 清理函数
    return () => {
      unsubscribeConnection()
      unsubscribeError()
      realtimeService.disconnect()
    }
  }, [])
  
  // 应用设置变化
  useEffect(() => {
    // 应用深色模式
    if (settings.darkMode) {
      document.documentElement.classList.add('dark')
    } else {
      document.documentElement.classList.remove('dark')
    }
    
    // 应用字体大小
    const fontSizeClasses = {
      small: 'text-sm',
      medium: 'text-base',
      large: 'text-lg'
    }
    
    // 移除之前的字体大小类
    Object.values(fontSizeClasses).forEach(cls => {
      document.documentElement.classList.remove(cls)
    })
    
    // 添加新的字体大小类
    document.documentElement.classList.add(fontSizeClasses[settings.fontSize])
  }, [settings])
  
  // 处理设置更新
  const handleUpdateSettings = (newSettings) => {
    setSettings(newSettings)
    // 在实际应用中，这里应该保存到localStorage或服务器
    localStorage.setItem('app-settings', JSON.stringify(newSettings))
  }
  
  // 从localStorage加载设置
  useEffect(() => {
    const savedSettings = localStorage.getItem('app-settings')
    if (savedSettings) {
      try {
        const parsed = JSON.parse(savedSettings)
        setSettings(prev => ({ ...prev, ...parsed }))
      } catch (error) {
        console.error('Failed to parse saved settings:', error)
      }
    }
  }, [])
  
  // 键盘快捷键处理函数
  const handleClearMessages = () => {
    clearMessages()
  }
  
  const handleToggleSettings = () => {
    setIsSettingsOpen(prev => !prev)
  }
  
  const handleFocusInput = (panel) => {
    if (panel === 'problem' && problemInputRef.current) {
      problemInputRef.current.focus()
    } else if (panel === 'solution' && solutionInputRef.current) {
      solutionInputRef.current.focus()
    }
  }

  const handleScenarioChange = useCallback((scenarioId) => {
    setCurrentScenario(scenarioId)
    clearMessages()
  }, [clearMessages])

  const scenario = scenarios[currentScenario]

  return (
    <>
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 dark:from-gray-900 dark:via-blue-900 dark:to-indigo-900 transition-colors duration-300">
        {/* Header */}
        <header className="glass-effect shadow-lg border-b border-white/20 backdrop-blur-md" style={{zIndex: 100, position: 'relative'}}>
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between items-center h-16">
              <div className="flex items-center space-x-4">
                <h1 className="text-2xl font-bold text-gray-900">
                  GenAI ZeroTouch Services
                </h1>
                <span className="text-sm text-gray-500">
                  零摩擦沟通系统
                </span>
              </div>
              
              <div className="flex items-center space-x-4">
                <ScenarioSelector
                  scenarios={scenarios}
                  currentScenario={currentScenario}
                  onScenarioChange={handleScenarioChange}
                />
                
                <div className="flex items-center space-x-2">
                  {/* 连接状态指示器 */}
                  <ConnectionLoader status={isConnected ? 'connected' : 'disconnected'} />
                  
                  <button 
                    onClick={handleToggleSettings}
                    className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                    title="设置 (Ctrl+,)"
                  >
                    <Settings className="w-5 h-5" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        </header>

        {/* Main Content */}
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Scenario Info */}
          <AnimatedTransition type="slide-down" show={true}>
            <div className="mb-6 p-6 glass-effect rounded-xl shadow-lg border border-white/20">
              <div className="flex items-center space-x-4">
                <div className="p-3 bg-gradient-to-r from-blue-500 to-purple-600 rounded-xl shadow-lg">
                  <scenario.icon className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                    {scenario.name}
                  </h2>
                  <p className="text-sm text-gray-600 dark:text-gray-300 mt-1">
                    {scenario.description}
                  </p>
                </div>
              </div>
            </div>
          </AnimatedTransition>

          {/* Three Panel Layout */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
            {/* Problem Panel */}
            <AnimatedTransition type="slide-left" show={true}>
              <div className="panel">
                <ProblemPanel
                  scenario={scenario}
                  messages={messages.problem}
                  onSendMessage={sendProblemMessage}
                  isProcessing={llmProcessing}
                  inputRef={problemInputRef}
                  settings={settings}
                />
              </div>
            </AnimatedTransition>

            {/* LLM Panel */}
            <AnimatedTransition type="scale" show={true}>
              <div className="panel">
                <LLMPanel
                  processing={llmProcessing}
                  messages={messages.llm}
                  settings={settings}
                />
              </div>
            </AnimatedTransition>

            {/* Solution Panel */}
            <AnimatedTransition type="slide-right" show={true}>
              <div className="panel">
                <SolutionPanel
                  scenario={scenario}
                  messages={messages.solution}
                  onSendMessage={sendSolutionMessage}
                  isProcessing={llmProcessing}
                  iterationMode={iterationMode}
                  pendingResponse={pendingResponse}
                  onGenerateSuggestion={generateSuggestion}
                  onGenerateFollowUp={generateFollowUp}
                  onConfirmSend={confirmSendResponse}
                  onCancelIteration={cancelIteration}
                  inputRef={solutionInputRef}
                  settings={settings}
                  iterationProcessing={iterationProcessing}
                  // 新增：勾选框相关props
                  missingInfoOptions={missingInfoOptions}
                  showMissingInfoPanel={showMissingInfoPanel}
                  onToggleMissingInfoOption={toggleMissingInfoOption}
                  onGenerateFollowUpBySelectedInfo={generateFollowUpBySelectedInfo}
                  onSkipInfoCollection={skipInfoCollection}
                />
              </div>
            </AnimatedTransition>
          </div>

          {/* Clear Messages Button */}
          <div className="text-center">
            <button
              onClick={clearMessages}
              className="px-6 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg transition-colors"
            >
              清空对话
            </button>
          </div>
        </main>
      </div>
      
      {/* 通知系统 */}
      <NotificationSystem />
      
      {/* 键盘快捷键 */}
      <KeyboardShortcuts
        onClearMessages={handleClearMessages}
        onToggleSettings={handleToggleSettings}
        onFocusInput={handleFocusInput}
      />
      
      {/* 设置面板 */}
      <SettingsPanel
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        settings={settings}
        onUpdateSettings={handleUpdateSettings}
      />
    </>
  )
}

export default App