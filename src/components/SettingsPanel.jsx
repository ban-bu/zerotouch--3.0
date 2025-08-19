import React, { useState, useEffect, useRef } from 'react'
import { X, Moon, Sun, Volume2, VolumeX, Settings as SettingsIcon } from 'lucide-react'
import { showSuccess } from './NotificationSystem'

const SettingsPanel = ({ isOpen, onClose, settings, onUpdateSettings }) => {
  const [localSettings, setLocalSettings] = useState(settings)
  const panelRef = useRef(null)

  // 当settings prop变化时更新本地状态
  useEffect(() => {
    setLocalSettings(settings)
  }, [settings])

  // 处理点击外部关闭
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (panelRef.current && !panelRef.current.contains(event.target) && isOpen) {
        onClose()
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isOpen, onClose])

  // 处理设置变更
  const handleChange = (key, value) => {
    setLocalSettings(prev => ({
      ...prev,
      [key]: value
    }))
  }

  // 保存设置
  const handleSave = () => {
    onUpdateSettings(localSettings)
    showSuccess('设置已保存', { duration: 2000 })
    onClose()
  }

  // 重置设置
  const handleReset = () => {
    const defaultSettings = {
      darkMode: window.matchMedia('(prefers-color-scheme: dark)').matches,
      fontSize: 'medium',
      soundEnabled: true,
      autoScroll: true,
      showTimestamps: true,
      language: 'zh-CN',
      apiEndpoint: 'https://api.example.com/v1',
      maxMessagesPerPanel: 50
    }
    setLocalSettings(defaultSettings)
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center">
      <div 
        ref={panelRef}
        className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-md mx-4 overflow-hidden transition-all duration-300 transform scale-100"
      >
        {/* 标题栏 */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center space-x-2">
            <SettingsIcon className="w-5 h-5 text-primary-600 dark:text-primary-400" />
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">设置</h2>
          </div>
          <button 
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        
        {/* 设置内容 */}
        <div className="px-6 py-4 max-h-[70vh] overflow-y-auto">
          <div className="space-y-6">
            {/* 外观设置 */}
            <div>
              <h3 className="text-sm font-medium text-gray-900 dark:text-gray-100 mb-3">外观</h3>
              <div className="space-y-4">
                {/* 深色模式 */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    {localSettings.darkMode ? 
                      <Moon className="w-5 h-5 text-gray-600 dark:text-gray-300" /> : 
                      <Sun className="w-5 h-5 text-yellow-500" />
                    }
                    <span className="text-sm text-gray-700 dark:text-gray-300">深色模式</span>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input 
                      type="checkbox" 
                      className="sr-only peer" 
                      checked={localSettings.darkMode}
                      onChange={(e) => handleChange('darkMode', e.target.checked)}
                    />
                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary-300 dark:peer-focus:ring-primary-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-primary-600"></div>
                  </label>
                </div>
                
                {/* 字体大小 */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm text-gray-700 dark:text-gray-300">字体大小</span>
                    <span className="text-xs text-gray-500 dark:text-gray-400 capitalize">{localSettings.fontSize}</span>
                  </div>
                  <select
                    value={localSettings.fontSize}
                    onChange={(e) => handleChange('fontSize', e.target.value)}
                    className="block w-full px-3 py-2 text-sm bg-gray-50 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                  >
                    <option value="small">小</option>
                    <option value="medium">中</option>
                    <option value="large">大</option>
                  </select>
                </div>
              </div>
            </div>
            
            {/* 行为设置 */}
            <div>
              <h3 className="text-sm font-medium text-gray-900 dark:text-gray-100 mb-3">行为</h3>
              <div className="space-y-4">
                {/* 声音提示 */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    {localSettings.soundEnabled ? 
                      <Volume2 className="w-5 h-5 text-gray-600 dark:text-gray-300" /> : 
                      <VolumeX className="w-5 h-5 text-gray-600 dark:text-gray-300" />
                    }
                    <span className="text-sm text-gray-700 dark:text-gray-300">声音提示</span>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input 
                      type="checkbox" 
                      className="sr-only peer" 
                      checked={localSettings.soundEnabled}
                      onChange={(e) => handleChange('soundEnabled', e.target.checked)}
                    />
                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary-300 dark:peer-focus:ring-primary-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-primary-600"></div>
                  </label>
                </div>
                
                {/* 自动滚动 */}
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-700 dark:text-gray-300">自动滚动到最新消息</span>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input 
                      type="checkbox" 
                      className="sr-only peer" 
                      checked={localSettings.autoScroll}
                      onChange={(e) => handleChange('autoScroll', e.target.checked)}
                    />
                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary-300 dark:peer-focus:ring-primary-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-primary-600"></div>
                  </label>
                </div>
                
                {/* 显示时间戳 */}
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-700 dark:text-gray-300">显示消息时间戳</span>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input 
                      type="checkbox" 
                      className="sr-only peer" 
                      checked={localSettings.showTimestamps}
                      onChange={(e) => handleChange('showTimestamps', e.target.checked)}
                    />
                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary-300 dark:peer-focus:ring-primary-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-primary-600"></div>
                  </label>
                </div>
              </div>
            </div>
            
            {/* 高级设置 */}
            <div>
              <h3 className="text-sm font-medium text-gray-900 dark:text-gray-100 mb-3">高级设置</h3>
              <div className="space-y-4">
                {/* 语言 */}
                <div>
                  <label className="block text-sm text-gray-700 dark:text-gray-300 mb-2">语言</label>
                  <select
                    value={localSettings.language}
                    onChange={(e) => handleChange('language', e.target.value)}
                    className="block w-full px-3 py-2 text-sm bg-gray-50 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                  >
                    <option value="zh-CN">简体中文</option>
                    <option value="en-US">English (US)</option>
                  </select>
                </div>
                
                {/* API端点 */}
                <div>
                  <label className="block text-sm text-gray-700 dark:text-gray-300 mb-2">API端点</label>
                  <input
                    type="text"
                    value={localSettings.apiEndpoint}
                    onChange={(e) => handleChange('apiEndpoint', e.target.value)}
                    className="block w-full px-3 py-2 text-sm bg-gray-50 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                    placeholder="https://api.example.com/v1"
                  />
                </div>
                
                {/* 每个面板最大消息数 */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="block text-sm text-gray-700 dark:text-gray-300">每个面板最大消息数</label>
                    <span className="text-xs text-gray-500 dark:text-gray-400">{localSettings.maxMessagesPerPanel}</span>
                  </div>
                  <input
                    type="range"
                    min="10"
                    max="100"
                    step="10"
                    value={localSettings.maxMessagesPerPanel}
                    onChange={(e) => handleChange('maxMessagesPerPanel', parseInt(e.target.value))}
                    className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer dark:bg-gray-700"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
        
        {/* 底部按钮 */}
        <div className="px-6 py-4 bg-gray-50 dark:bg-gray-750 border-t border-gray-200 dark:border-gray-700 flex justify-between">
          <button
            onClick={handleReset}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 dark:bg-gray-700 dark:text-gray-300 dark:border-gray-600 dark:hover:bg-gray-650"
          >
            重置
          </button>
          <div className="space-x-2">
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 dark:bg-gray-700 dark:text-gray-300 dark:border-gray-600 dark:hover:bg-gray-650"
            >
              取消
            </button>
            <button
              onClick={handleSave}
              className="px-4 py-2 text-sm font-medium text-white bg-primary-600 border border-transparent rounded-md shadow-sm hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 dark:bg-primary-700 dark:hover:bg-primary-600"
            >
              保存
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default SettingsPanel