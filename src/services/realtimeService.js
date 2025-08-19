// 模拟实时通信服务
// 在实际应用中，这里应该使用WebSocket或其他实时通信技术

class RealtimeService {
  constructor() {
    this.listeners = {};
    this.connected = false;
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 5;
    this.reconnectDelay = 2000; // 初始重连延迟（毫秒）
    this.connectionId = null;
    
    // 模拟事件类型
    this.EVENT_TYPES = {
      MESSAGE_RECEIVED: 'message_received',
      MESSAGE_SENT: 'message_sent',
      CONNECTION_STATE_CHANGED: 'connection_state_changed',
      PROCESSING_STARTED: 'processing_started',
      PROCESSING_COMPLETED: 'processing_completed',
      PROCESSING_STEP_UPDATED: 'processing_step_updated',
      ERROR: 'error'
    };
  }

  // 连接到服务器
  connect() {
    if (this.connected) return Promise.resolve(this.connectionId);
    
    return new Promise((resolve, reject) => {
      // 模拟连接延迟
      setTimeout(() => {
        this.connected = true;
        this.connectionId = `conn_${Date.now()}`;
        this.reconnectAttempts = 0;
        
        // 触发连接状态变更事件
        this._triggerEvent(this.EVENT_TYPES.CONNECTION_STATE_CHANGED, { 
          connected: true,
          connectionId: this.connectionId
        });
        
        console.log(`[RealtimeService] Connected with ID: ${this.connectionId}`);
        resolve(this.connectionId);
        
        // 设置心跳检测
        this._setupHeartbeat();
      }, 500);
    });
  }

  // 断开连接
  disconnect() {
    if (!this.connected) return Promise.resolve();
    
    return new Promise((resolve) => {
      // 模拟断开延迟
      setTimeout(() => {
        this.connected = false;
        
        // 清除心跳检测
        if (this.heartbeatInterval) {
          clearInterval(this.heartbeatInterval);
          this.heartbeatInterval = null;
        }
        
        // 触发连接状态变更事件
        this._triggerEvent(this.EVENT_TYPES.CONNECTION_STATE_CHANGED, { 
          connected: false,
          connectionId: this.connectionId
        });
        
        console.log(`[RealtimeService] Disconnected`);
        this.connectionId = null;
        resolve();
      }, 300);
    });
  }

  // 发送消息
  sendMessage(message, targetPanel) {
    if (!this.connected) {
      return Promise.reject(new Error('Not connected to server'));
    }
    
    return new Promise((resolve, reject) => {
      // 模拟网络延迟
      setTimeout(() => {
        // 为消息添加ID和时间戳
        const enhancedMessage = {
          ...message,
          id: message.id || `msg_${Date.now()}`,
          timestamp: message.timestamp || new Date().toISOString(),
          targetPanel: targetPanel
        };
        
        // 触发消息发送事件
        this._triggerEvent(this.EVENT_TYPES.MESSAGE_SENT, enhancedMessage);
        
        console.log(`[RealtimeService] Message sent:`, enhancedMessage);
        resolve(enhancedMessage);
        
        // 模拟服务器确认接收
        this._simulateServerReceipt(enhancedMessage);
      }, Math.random() * 300 + 100); // 随机延迟100-400ms
    });
  }

  // 开始处理
  startProcessing(messageId, steps) {
    if (!this.connected) {
      return Promise.reject(new Error('Not connected to server'));
    }
    
    return new Promise((resolve) => {
      // 模拟处理开始延迟
      setTimeout(() => {
        const processingData = {
          messageId,
          startTime: new Date().toISOString(),
          steps: steps || [],
          currentStep: 0
        };
        
        // 触发处理开始事件
        this._triggerEvent(this.EVENT_TYPES.PROCESSING_STARTED, processingData);
        
        console.log(`[RealtimeService] Processing started for message: ${messageId}`);
        resolve(processingData);
        
        // 如果提供了步骤，模拟步骤进度更新
        if (steps && steps.length > 0) {
          this._simulateProcessingSteps(messageId, steps);
        }
      }, 200);
    });
  }

  // 订阅事件
  subscribe(eventType, callback) {
    if (!this.listeners[eventType]) {
      this.listeners[eventType] = [];
    }
    
    this.listeners[eventType].push(callback);
    
    // 返回取消订阅函数
    return () => {
      this.listeners[eventType] = this.listeners[eventType].filter(cb => cb !== callback);
    };
  }

  // 触发事件
  _triggerEvent(eventType, data) {
    if (!this.listeners[eventType]) return;
    
    this.listeners[eventType].forEach(callback => {
      try {
        callback(data);
      } catch (error) {
        console.error(`[RealtimeService] Error in event listener for ${eventType}:`, error);
      }
    });
  }

  // 设置心跳检测
  _setupHeartbeat() {
    this.heartbeatInterval = setInterval(() => {
      if (!this.connected) {
        clearInterval(this.heartbeatInterval);
        this.heartbeatInterval = null;
        return;
      }
      
      // 模拟随机网络问题
      if (Math.random() < 0.05) { // 5%概率模拟连接问题
        this._handleConnectionLoss();
      }
    }, 10000); // 每10秒检测一次
  }

  // 处理连接丢失
  _handleConnectionLoss() {
    this.connected = false;
    
    // 触发连接状态变更事件
    this._triggerEvent(this.EVENT_TYPES.CONNECTION_STATE_CHANGED, { 
      connected: false,
      connectionId: this.connectionId
    });
    
    console.log(`[RealtimeService] Connection lost. Attempting to reconnect...`);
    
    // 尝试重连
    this._attemptReconnect();
  }

  // 尝试重连
  _attemptReconnect() {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.log(`[RealtimeService] Max reconnect attempts reached. Giving up.`);
      
      // 触发错误事件
      this._triggerEvent(this.EVENT_TYPES.ERROR, { 
        code: 'MAX_RECONNECT_ATTEMPTS',
        message: 'Failed to reconnect after maximum attempts'
      });
      
      return;
    }
    
    this.reconnectAttempts++;
    const delay = this.reconnectDelay * Math.pow(1.5, this.reconnectAttempts - 1); // 指数退避策略
    
    console.log(`[RealtimeService] Reconnecting in ${delay}ms (attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts})`);
    
    setTimeout(() => {
      this.connect()
        .catch(() => {
          // 如果重连失败，继续尝试
          this._attemptReconnect();
        });
    }, delay);
  }

  // 模拟服务器确认接收
  _simulateServerReceipt(message) {
    // 模拟服务器处理延迟
    setTimeout(() => {
      // 模拟服务器回复
      const receipt = {
        originalMessageId: message.id,
        receiptId: `receipt_${Date.now()}`,
        timestamp: new Date().toISOString(),
        status: 'delivered'
      };
      
      // 触发消息接收事件
      this._triggerEvent(this.EVENT_TYPES.MESSAGE_RECEIVED, receipt);
      
      console.log(`[RealtimeService] Server acknowledged message: ${message.id}`);
    }, Math.random() * 500 + 200); // 随机延迟200-700ms
  }

  // 模拟处理步骤进度
  _simulateProcessingSteps(messageId, steps) {
    let currentStep = 0;
    
    const processNextStep = () => {
      if (currentStep >= steps.length) {
        // 所有步骤完成
        this._triggerEvent(this.EVENT_TYPES.PROCESSING_COMPLETED, {
          messageId,
          completionTime: new Date().toISOString(),
          steps: steps
        });
        
        console.log(`[RealtimeService] Processing completed for message: ${messageId}`);
        return;
      }
      
      // 更新当前步骤
      const stepData = {
        messageId,
        currentStep,
        stepName: steps[currentStep].name,
        stepStatus: 'completed',
        timestamp: new Date().toISOString()
      };
      
      // 触发步骤更新事件
      this._triggerEvent(this.EVENT_TYPES.PROCESSING_STEP_UPDATED, stepData);
      
      console.log(`[RealtimeService] Step ${currentStep} (${steps[currentStep].name}) completed for message: ${messageId}`);
      
      // 进入下一步骤
      currentStep++;
      
      // 随机延迟后处理下一步
      setTimeout(processNextStep, Math.random() * 1000 + 500); // 随机延迟500-1500ms
    };
    
    // 开始处理第一个步骤
    setTimeout(processNextStep, Math.random() * 500 + 200); // 随机延迟200-700ms
  }
}

// 创建单例实例
const realtimeService = new RealtimeService();

export default realtimeService;

// 导出事件类型常量
export const REALTIME_EVENTS = {
  MESSAGE_RECEIVED: 'message_received',
  MESSAGE_SENT: 'message_sent',
  CONNECTION_STATE_CHANGED: 'connection_state_changed',
  PROCESSING_STARTED: 'processing_started',
  PROCESSING_COMPLETED: 'processing_completed',
  PROCESSING_STEP_UPDATED: 'processing_step_updated',
  ERROR: 'error'
};