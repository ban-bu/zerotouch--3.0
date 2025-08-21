import React, { useState, useRef, useEffect } from 'react'
import { Send, User, Bot, Image as ImageIcon } from 'lucide-react'
import { MessageSendingLoader, TypingLoader } from './LoadingStates'
import AnimatedTransition from './AnimatedTransition'

const ProblemPanel = ({ scenario, messages, onSendMessage, isProcessing }) => {
  const [input, setInput] = useState('')
  const [imageFile, setImageFile] = useState(null)
  const messagesEndRef = useRef(null)
  const fileInputRef = useRef(null)

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  const handleSubmit = (e) => {
    e.preventDefault()
    if (!input.trim() && !imageFile) return

    onSendMessage({
      text: input.trim(),
      image: imageFile,
      timestamp: new Date().toISOString()
    })

    setInput('')
    setImageFile(null)
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  const handleImageUpload = (e) => {
    const file = e.target.files[0]
    if (file && file.type.startsWith('image/')) {
      setImageFile(file)
    }
  }

  const removeImage = () => {
    setImageFile(null)
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  const insertExample = () => {
    setInput(scenario.example)
  }

  return (
    <>
      <div className="panel-header glass-effect" style={{background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.15) 0%, rgba(37, 99, 235, 0.12) 100%)', backdropFilter: 'blur(20px) saturate(1.3)', borderRadius: '20px 20px 0 0', border: '1px solid rgba(255, 255, 255, 0.2)', borderBottom: '1px solid rgba(255, 255, 255, 0.1)'}}>
        <div className="flex items-center space-x-3">
          <div className="p-2 bg-blue-100/70 dark:bg-blue-900/50 rounded-2xl backdrop-blur-sm">
            <User className="w-5 h-5 text-blue-600 dark:text-blue-400" />
          </div>
          <div>
            <h3 className="font-semibold text-gray-900 dark:text-white">问题端</h3>
            <p className="text-xs text-gray-600 dark:text-gray-400">{scenario.problemRole}</p>
          </div>
        </div>
        <button
          onClick={insertExample}
          className="btn-ghost text-xs"
        >
          插入示例
        </button>
      </div>

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto space-y-3 mb-4">
        {(!messages || messages.length === 0) && (
          <div className="text-center text-gray-500 py-8">
            <div className="p-4 bg-gradient-to-r from-blue-100/80 to-sky-100/80 dark:from-blue-900/30 dark:to-sky-900/30 rounded-full shadow-inner backdrop-blur-sm mx-auto mb-3 w-fit">
              <User className="w-8 h-8 text-blue-600 dark:text-blue-400" />
            </div>
            <p className="text-sm">在这里输入您的需求或问题</p>
            <p className="text-xs text-gray-400 mt-1">
              支持文本和图片输入
            </p>
          </div>
        )}
        
        {messages && messages.map((message, index) => (
          <div key={index} className="space-y-2">
            {message.type === 'user' && (
              <AnimatedTransition type="slide-right" show={true}>
                <div className="message-bubble message-user slide-in-right">
                  {message.image && (
                    <div className="mb-2">
                      <img 
                        src={URL.createObjectURL(message.image)} 
                        alt="用户上传" 
                        className="max-w-full h-auto rounded-lg shadow-md"
                      />
                    </div>
                  )}
                  <div className="flex items-start space-x-2">
                    <User className="w-4 h-4 text-white mt-0.5 flex-shrink-0" />
                    <div className="flex-1">
                      {/* [MODIFIED] 为单条长消息提供滚动容器 */}
                      <div className="message-content">
                        <p className="whitespace-pre-wrap">{message.text}</p>
                      </div>
                      <div className="text-xs text-blue-100 mt-1 opacity-75">
                        {new Date(message.timestamp).toLocaleTimeString()}
                      </div>
                    </div>
                  </div>
                </div>
              </AnimatedTransition>
            )}
            
            {message.type === 'ai_response' && (
              <AnimatedTransition type="slide-left" show={true}>
                <div className="message-bubble message-ai slide-in-left">
                  <div className="flex items-start space-x-2">
                    <Bot className="w-4 h-4 text-gray-600 dark:text-gray-400 mt-0.5 flex-shrink-0" />
                    <div className="flex-1">
                      {/* [MODIFIED] 为单条长消息提供滚动容器 */}
                      <div className="message-content">
                        <p className="whitespace-pre-wrap">{message.text}</p>
                      </div>
                      <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                        {new Date(message.timestamp).toLocaleTimeString()}
                      </div>
                    </div>
                  </div>
                </div>
              </AnimatedTransition>
            )}
          </div>
        ))}
        
        {isProcessing && (
          <div className="message-bubble message-ai">
            <div className="flex items-center space-x-2">
              <Bot className="w-4 h-4 text-gray-600" />
              <TypingLoader message="AI正在分析您的问题" />
            </div>
          </div>
        )}
        
        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div className="p-4 border-t border-white/20 dark:border-white/10 glass-effect rounded-b-2xl">
        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="flex space-x-3">
            <div className="flex-1">
              <textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder={`作为${scenario.problemRole}，请描述您的需求...`}
                className="input-field resize-none transition-all duration-200 focus:shadow-md"
                rows={3}
                disabled={isProcessing}
              />
              
              {/* Image preview */}
              {imageFile && (
                <AnimatedTransition type="scale" show={true}>
                  <div className="mt-3 relative inline-block">
                    <img 
                      src={URL.createObjectURL(imageFile)} 
                      alt="预览" 
                      className="max-w-xs h-auto rounded-lg border border-gray-300 shadow-md"
                    />
                    <button
                      type="button"
                      onClick={removeImage}
                      className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 text-white rounded-full text-xs hover:bg-red-600 shadow-lg transition-all duration-200 hover:scale-110"
                    >
                      ×
                    </button>
                  </div>
                </AnimatedTransition>
              )}
              
              {/* Sending indicator */}
              {isProcessing && (
                <div className="mt-2">
                  <MessageSendingLoader message="正在发送消息..." />
                </div>
              )}
            </div>
            
            <div className="flex items-end space-x-2">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleImageUpload}
                className="hidden"
                id="image-upload"
              />
              {/* 隐藏图片上传功能 */}
              {/* <label
                htmlFor="image-upload"
                className="btn-ghost p-3 transition-all duration-200 hover:scale-105 cursor-pointer"
                title="上传图片"
              >
                <ImageIcon className="w-5 h-5" />
              </label> */}
              
              <button
                type="submit"
                disabled={(!input.trim() && !imageFile) || isProcessing}
                className="btn-primary p-3 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
                title="发送消息"
              >
                <Send className="w-5 h-5" />
              </button>
            </div>
          </div>
        </form>
      </div>
    </>
  )
}

export default ProblemPanel