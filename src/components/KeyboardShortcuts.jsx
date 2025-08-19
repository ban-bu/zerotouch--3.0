import { useEffect } from 'react'
import { showInfo } from './NotificationSystem'

const KeyboardShortcuts = ({ onClearMessages, onToggleSettings, onFocusInput }) => {
  useEffect(() => {
    const handleKeyDown = (event) => {
      // 检查是否按下了修饰键
      const isCtrlOrCmd = event.ctrlKey || event.metaKey
      const isShift = event.shiftKey
      const isAlt = event.altKey

      // 防止在输入框中触发快捷键
      const isInputFocused = ['INPUT', 'TEXTAREA'].includes(event.target.tagName)
      
      // Ctrl/Cmd + K: 清空所有消息
      if (isCtrlOrCmd && event.key === 'k' && !isInputFocused) {
        event.preventDefault()
        onClearMessages()
        showInfo('已清空所有消息', { duration: 2000 })
        return
      }

      // Ctrl/Cmd + ,: 打开设置
      if (isCtrlOrCmd && event.key === ',' && !isInputFocused) {
        event.preventDefault()
        onToggleSettings()
        return
      }

      // Ctrl/Cmd + /: 显示快捷键帮助
      if (isCtrlOrCmd && event.key === '/' && !isInputFocused) {
        event.preventDefault()
        showShortcutsHelp()
        return
      }

      // Ctrl/Cmd + 1: 聚焦到问题端输入框
      if (isCtrlOrCmd && event.key === '1' && !isInputFocused) {
        event.preventDefault()
        onFocusInput('problem')
        return
      }

      // Ctrl/Cmd + 3: 聚焦到方案端输入框
      if (isCtrlOrCmd && event.key === '3' && !isInputFocused) {
        event.preventDefault()
        onFocusInput('solution')
        return
      }

      // Esc: 取消当前操作或关闭模态框
      if (event.key === 'Escape') {
        // 这里可以添加取消操作的逻辑
        const modals = document.querySelectorAll('[data-modal]')
        modals.forEach(modal => {
          if (modal.style.display !== 'none') {
            modal.style.display = 'none'
          }
        })
        return
      }

      // F1: 显示帮助
      if (event.key === 'F1') {
        event.preventDefault()
        showShortcutsHelp()
        return
      }
    }

    // 添加事件监听器
    document.addEventListener('keydown', handleKeyDown)

    // 清理函数
    return () => {
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [onClearMessages, onToggleSettings, onFocusInput])

  return null // 这个组件不渲染任何内容
}

// 显示快捷键帮助
const showShortcutsHelp = () => {
  const shortcuts = [
    { key: 'Ctrl/Cmd + K', description: '清空所有消息' },
    { key: 'Ctrl/Cmd + ,', description: '打开设置' },
    { key: 'Ctrl/Cmd + /', description: '显示快捷键帮助' },
    { key: 'Ctrl/Cmd + 1', description: '聚焦到问题端输入框' },
    { key: 'Ctrl/Cmd + 3', description: '聚焦到方案端输入框' },
    { key: 'Esc', description: '取消当前操作' },
    { key: 'F1', description: '显示帮助' }
  ]

  const helpText = shortcuts
    .map(s => `${s.key}: ${s.description}`)
    .join('\n')

  // 创建帮助模态框
  const modal = document.createElement('div')
  modal.setAttribute('data-modal', 'shortcuts-help')
  modal.className = 'fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50'
  modal.innerHTML = `
    <div class="bg-white rounded-lg p-6 max-w-md w-full mx-4 shadow-xl">
      <div class="flex items-center justify-between mb-4">
        <h3 class="text-lg font-semibold text-gray-900">键盘快捷键</h3>
        <button class="text-gray-400 hover:text-gray-600" onclick="this.closest('[data-modal]').remove()">
          <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
          </svg>
        </button>
      </div>
      <div class="space-y-3">
        ${shortcuts.map(s => `
          <div class="flex items-center justify-between py-2 border-b border-gray-100 last:border-b-0">
            <span class="text-sm text-gray-600">${s.description}</span>
            <kbd class="px-2 py-1 text-xs font-mono bg-gray-100 rounded border">${s.key}</kbd>
          </div>
        `).join('')}
      </div>
      <div class="mt-6 text-center">
        <button 
          class="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
          onclick="this.closest('[data-modal]').remove()"
        >
          关闭
        </button>
      </div>
    </div>
  `

  // 点击背景关闭模态框
  modal.addEventListener('click', (e) => {
    if (e.target === modal) {
      modal.remove()
    }
  })

  // 添加到页面
  document.body.appendChild(modal)

  // 3秒后自动关闭（如果用户没有手动关闭）
  setTimeout(() => {
    if (document.body.contains(modal)) {
      modal.remove()
    }
  }, 10000)
}

export default KeyboardShortcuts