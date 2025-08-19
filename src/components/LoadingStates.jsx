import React from 'react';
import { Loader2, MessageCircle, Brain, Users } from 'lucide-react';

/**
 * 通用加载指示器
 */
export const LoadingSpinner = ({ size = 'medium', className = '' }) => {
  const sizeClasses = {
    small: 'w-4 h-4',
    medium: 'w-6 h-6',
    large: 'w-8 h-8',
  };

  return (
    <Loader2 
      className={`animate-spin ${sizeClasses[size]} ${className}`} 
    />
  );
};

/**
 * 消息发送加载状态
 */
export const MessageSendingLoader = ({ message = '正在发送消息...' }) => {
  return (
    <div className="flex items-center space-x-2 text-gray-500 text-sm">
      <div className="flex space-x-1">
        <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
        <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
        <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
      </div>
      <span>{message}</span>
    </div>
  );
};

/**
 * LLM处理加载状态
 */
export const LLMProcessingLoader = ({ step = '分析中', progress = 0 }) => {
  const steps = [
    { key: 'analyzing', label: '分析问题', icon: MessageCircle },
    { key: 'conceptualizing', label: '概念化处理', icon: Brain },
    { key: 'translating', label: '翻译转换', icon: Users },
    { key: 'optimizing', label: '优化输出', icon: Loader2 },
  ];

  return (
    <div className="bg-gradient-to-r from-purple-50 to-indigo-50 p-4 rounded-lg border border-purple-200">
      <div className="flex items-center space-x-3 mb-3">
        <div className="relative">
          <div className="w-8 h-8 bg-gradient-to-r from-purple-500 to-indigo-500 rounded-full flex items-center justify-center">
            <Brain className="w-4 h-4 text-white animate-pulse" />
          </div>
          <div className="absolute -top-1 -right-1 w-3 h-3 bg-green-500 rounded-full animate-ping"></div>
        </div>
        <div>
          <div className="text-sm font-medium text-purple-900">LLM 正在处理</div>
          <div className="text-xs text-purple-600">{step}</div>
        </div>
      </div>
      
      {/* 进度条 */}
      <div className="w-full bg-purple-200 rounded-full h-2 mb-3">
        <div 
          className="bg-gradient-to-r from-purple-500 to-indigo-500 h-2 rounded-full transition-all duration-500 ease-out"
          style={{ width: `${progress}%` }}
        ></div>
      </div>
      
      {/* 步骤指示器 */}
      <div className="flex justify-between text-xs">
        {steps.map((stepItem, index) => {
          const StepIcon = stepItem.icon;
          const isActive = index <= Math.floor(progress / 25);
          const isCurrent = index === Math.floor(progress / 25);
          
          return (
            <div 
              key={stepItem.key}
              className={`flex flex-col items-center space-y-1 ${
                isActive ? 'text-purple-600' : 'text-gray-400'
              }`}
            >
              <div className={`w-6 h-6 rounded-full flex items-center justify-center ${
                isActive ? 'bg-purple-100' : 'bg-gray-100'
              }`}>
                <StepIcon className={`w-3 h-3 ${
                  isCurrent ? 'animate-pulse' : ''
                }`} />
              </div>
              <span className="text-xs">{stepItem.label}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
};

/**
 * 连接状态加载器
 */
export const ConnectionLoader = ({ status = 'connecting' }) => {
  const statusConfig = {
    connecting: {
      color: 'text-yellow-600',
      bgColor: 'bg-yellow-100',
      message: '正在连接...',
      icon: Loader2,
      animate: 'animate-spin',
    },
    connected: {
      color: 'text-green-600',
      bgColor: 'bg-green-100',
      message: '已连接',
      icon: MessageCircle,
      animate: '',
    },
    disconnected: {
      color: 'text-red-600',
      bgColor: 'bg-red-100',
      message: '连接断开',
      icon: MessageCircle,
      animate: 'animate-pulse',
    },
    reconnecting: {
      color: 'text-blue-600',
      bgColor: 'bg-blue-100',
      message: '重新连接中...',
      icon: Loader2,
      animate: 'animate-spin',
    },
  };

  const config = statusConfig[status] || statusConfig.connecting;
  const Icon = config.icon;

  return (
    <div className={`inline-flex items-center space-x-2 px-3 py-1 rounded-full text-xs font-medium ${config.bgColor} ${config.color}`}>
      <Icon className={`w-3 h-3 ${config.animate}`} />
      <span>{config.message}</span>
    </div>
  );
};

/**
 * 骨架屏加载器
 */
export const SkeletonLoader = ({ lines = 3, className = '' }) => {
  return (
    <div className={`animate-pulse ${className}`}>
      {Array.from({ length: lines }).map((_, index) => (
        <div key={index} className="flex space-x-4 mb-3">
          <div className="rounded-full bg-gray-300 h-8 w-8"></div>
          <div className="flex-1 space-y-2 py-1">
            <div className="h-4 bg-gray-300 rounded w-3/4"></div>
            <div className="h-4 bg-gray-300 rounded w-1/2"></div>
          </div>
        </div>
      ))}
    </div>
  );
};

/**
 * 打字机效果加载器
 */
export const TypingLoader = ({ message = 'AI正在思考' }) => {
  return (
    <div className="flex items-center space-x-2 text-gray-500">
      <span className="text-sm">{message}</span>
      <div className="flex space-x-1">
        <div className="w-1 h-1 bg-gray-400 rounded-full animate-pulse" style={{ animationDelay: '0ms' }}></div>
        <div className="w-1 h-1 bg-gray-400 rounded-full animate-pulse" style={{ animationDelay: '200ms' }}></div>
        <div className="w-1 h-1 bg-gray-400 rounded-full animate-pulse" style={{ animationDelay: '400ms' }}></div>
      </div>
    </div>
  );
};

export default {
  LoadingSpinner,
  MessageSendingLoader,
  LLMProcessingLoader,
  ConnectionLoader,
  SkeletonLoader,
  TypingLoader,
};