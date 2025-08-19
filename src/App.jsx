import React, { useState, useRef } from 'react'
import { AppProvider } from './contexts/AppContext'
import ScenarioSelector from './components/ScenarioSelector'
import ProblemPanel from './components/ProblemPanel'
import LLMPanel from './components/LLMPanel'
import SolutionPanel from './components/SolutionPanel'
import SettingsPanel from './components/SettingsPanel'
import KeyboardShortcuts from './components/KeyboardShortcuts'
import NotificationSystem from './components/NotificationSystem'
import { useMessageFlow } from './hooks/useMessageFlow'
import { ENV_CONFIG } from './config/env'

const SCENARIOS = {
  retail: {
    id: 'retail',
    name: '零售场景',
    icon: 'fas fa-shopping-bag',
    description: '顾客与企业门店的沟通',
    problemRole: '顾客/消费者',
    solutionRole: '企业门店/销售代表',
    example: '我下周要去参加AOM国际会议做主旨演讲，需要一套正式但现代的商务西装，预算在800-1500元之间，身高175cm，希望能显得专业又有活力。'
  },
  enterprise: {
    id: 'enterprise',
    name: '企业场景',
    icon: 'fas fa-users',
    description: '企业跨部门沟通',
    problemRole: '市场部经理',
    solutionRole: '研发部技术人员',
    example: '我们的移动APP用户留存率只有30%，需要在3个月内开发个性化推荐功能来提升至45%，目标用户是18-35岁，预算50万元。'
  },
  education: {
    id: 'education',
    name: '教育场景',
    icon: 'fas fa-graduation-cap',
    description: '学生与教师的互动',
    problemRole: '学生',
    solutionRole: '教师',
    example: '我在学习量子物理时，对波粒二象性概念理解困难，特别是为什么光既是波又是粒子，希望通过具体实验例子来理解这个概念。'
  }
}

function App() {
  const [currentScenario, setCurrentScenario] = useState('retail')
  const [showSettings, setShowSettings] = useState(false)
  
  const {
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
  } = useMessageFlow(currentScenario)

  const handleScenarioChange = (scenarioId) => {
    setCurrentScenario(scenarioId)
    clearMessages()
  }

  const scenario = SCENARIOS[currentScenario]

  if (ENV_CONFIG.ENABLE_DEBUG) {
    console.log('Current scenario:', scenario)
    console.log('Messages:', messages)
  }

  return (
    <AppProvider>
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        {/* Header */}
        <header className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 sticky top-0 z-40">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between h-16">
              <div className="flex items-center space-x-4">
                <h1 className="text-xl font-bold text-gray-900 dark:text-white">
                  {ENV_CONFIG.APP_TITLE}
                </h1>
                <div className="text-sm text-gray-500 dark:text-gray-400">
                  v{ENV_CONFIG.APP_VERSION}
                </div>
              </div>
              
              <div className="flex items-center space-x-4">
                <ScenarioSelector 
                  scenarios={SCENARIOS}
                  currentScenario={currentScenario}
                  onScenarioChange={handleScenarioChange}
                />
                
                <button
                  onClick={() => setShowSettings(true)}
                  className="btn-ghost"
                  title="设置"
                >
                  <i className="fas fa-cog"></i>
                </button>
                
                <button
                  onClick={clearMessages}
                  className="btn-ghost"
                  title="清空所有消息"
                >
                  <i className="fas fa-trash"></i>
                </button>
              </div>
            </div>
          </div>
        </header>

        {/* Main Content */}
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-[calc(100vh-8rem)]">
            {/* Problem Panel */}
            <div className="panel">
              <ProblemPanel
                scenario={scenario}
                messages={messages.problem}
                onSendMessage={sendProblemMessage}
                isProcessing={llmProcessing}
              />
            </div>

            {/* LLM Panel */}
            <div className="panel">
              <LLMPanel
                processing={llmProcessing}
                messages={messages.llm}
              />
            </div>

            {/* Solution Panel */}
            <div className="panel">
              <SolutionPanel
                scenario={scenario}
                messages={messages.solution}
                onSendMessage={sendSolutionMessage}
                isProcessing={llmProcessing}
                iterationProcessing={iterationProcessing}
                iterationMode={iterationMode}
                pendingResponse={pendingResponse}
                onGenerateSuggestion={generateSuggestion}
                onGenerateFollowUp={generateFollowUp}
                onConfirmSend={confirmSendResponse}
                onCancelIteration={cancelIteration}
              />
            </div>
          </div>
        </main>

        {/* Settings Panel */}
        {showSettings && (
          <SettingsPanel onClose={() => setShowSettings(false)} />
        )}

        {/* Keyboard Shortcuts */}
        <KeyboardShortcuts
          onClearMessages={clearMessages}
          onToggleSettings={() => setShowSettings(!showSettings)}
        />

        {/* Notification System */}
        <NotificationSystem />
      </div>
    </AppProvider>
  )
}

export default App
