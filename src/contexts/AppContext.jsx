import React, { createContext, useContext, useReducer, useCallback } from 'react'

// 初始状态
const initialState = {
  currentScenario: 'retail',
  messages: {
    problem: [],
    llm: [],
    solution: []
  },
  processing: {
    llm: false,
    problem: false,
    solution: false
  },
  settings: {
    autoScroll: true,
    showTimestamps: true,
    enableNotifications: true
  },
  statistics: {
    totalMessages: 0,
    totalProcessingTime: 0,
    averageResponseTime: 0
  }
}

// Action类型
const ActionTypes = {
  SET_SCENARIO: 'SET_SCENARIO',
  ADD_MESSAGE: 'ADD_MESSAGE',
  CLEAR_MESSAGES: 'CLEAR_MESSAGES',
  SET_PROCESSING: 'SET_PROCESSING',
  UPDATE_SETTINGS: 'UPDATE_SETTINGS',
  UPDATE_STATISTICS: 'UPDATE_STATISTICS'
}

// Reducer函数
const appReducer = (state, action) => {
  switch (action.type) {
    case ActionTypes.SET_SCENARIO:
      return {
        ...state,
        currentScenario: action.payload
      }
    
    case ActionTypes.ADD_MESSAGE:
      const { panel, message } = action.payload
      return {
        ...state,
        messages: {
          ...state.messages,
          [panel]: [...state.messages[panel], message]
        },
        statistics: {
          ...state.statistics,
          totalMessages: state.statistics.totalMessages + 1
        }
      }
    
    case ActionTypes.CLEAR_MESSAGES:
      return {
        ...state,
        messages: {
          problem: [],
          llm: [],
          solution: []
        },
        statistics: {
          ...state.statistics,
          totalMessages: 0
        }
      }
    
    case ActionTypes.SET_PROCESSING:
      const { panel: processingPanel, isProcessing } = action.payload
      return {
        ...state,
        processing: {
          ...state.processing,
          [processingPanel]: isProcessing
        }
      }
    
    case ActionTypes.UPDATE_SETTINGS:
      return {
        ...state,
        settings: {
          ...state.settings,
          ...action.payload
        }
      }
    
    case ActionTypes.UPDATE_STATISTICS:
      return {
        ...state,
        statistics: {
          ...state.statistics,
          ...action.payload
        }
      }
    
    default:
      return state
  }
}

// 创建Context
const AppContext = createContext()

// Context Provider组件
export const AppProvider = ({ children }) => {
  const [state, dispatch] = useReducer(appReducer, initialState)

  // Action creators
  const setScenario = useCallback((scenarioId) => {
    dispatch({
      type: ActionTypes.SET_SCENARIO,
      payload: scenarioId
    })
  }, [])

  const addMessage = useCallback((panel, message) => {
    dispatch({
      type: ActionTypes.ADD_MESSAGE,
      payload: { panel, message }
    })
  }, [])

  const clearMessages = useCallback(() => {
    dispatch({
      type: ActionTypes.CLEAR_MESSAGES
    })
  }, [])

  const setProcessing = useCallback((panel, isProcessing) => {
    dispatch({
      type: ActionTypes.SET_PROCESSING,
      payload: { panel, isProcessing }
    })
  }, [])

  const updateSettings = useCallback((newSettings) => {
    dispatch({
      type: ActionTypes.UPDATE_SETTINGS,
      payload: newSettings
    })
  }, [])

  const updateStatistics = useCallback((newStats) => {
    dispatch({
      type: ActionTypes.UPDATE_STATISTICS,
      payload: newStats
    })
  }, [])

  // 计算派生状态
  const derivedState = {
    isAnyProcessing: Object.values(state.processing).some(Boolean),
    totalMessagesCount: Object.values(state.messages).reduce(
      (total, messages) => total + messages.length, 0
    ),
    hasMessages: Object.values(state.messages).some(
      messages => messages.length > 0
    )
  }

  const value = {
    // 状态
    ...state,
    ...derivedState,
    
    // Actions
    setScenario,
    addMessage,
    clearMessages,
    setProcessing,
    updateSettings,
    updateStatistics
  }

  return (
    <AppContext.Provider value={value}>
      {children}
    </AppContext.Provider>
  )
}

// 自定义Hook
export const useApp = () => {
  const context = useContext(AppContext)
  if (!context) {
    throw new Error('useApp must be used within an AppProvider')
  }
  return context
}

// 导出Action类型供其他组件使用
export { ActionTypes }