import { io } from 'socket.io-client';

class SocketService {
  constructor() {
    this.socket = null;
    this.isConnected = false;
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 5;
    this.reconnectDelay = 1000;
    this.eventListeners = new Map();
    
//  // 服务器地址配置
//  this.serverUrl = process.env.NODE_ENV === 'production' 
//  ? window.location.origin 
//  : 'http://localhost:3001';
// }

    this.serverUrl = process.env.VUE_APP_SOCKET_URL;
  }

  /**
   * 连接到Socket.IO服务器
   * @param {Object} options - 连接选项
   * @returns {Promise} 连接Promise
   */
  connect(options = {}) {
    return new Promise((resolve, reject) => {
      try {
        // 如果已经连接，直接返回
        if (this.socket && this.isConnected) {
          resolve(this.socket);
          return;
        }

        // 断开现有连接（如果存在）
        if (this.socket) {
          this.socket.disconnect();
          this.socket = null;
        }

        console.log('正在连接到 Socket.IO 服务器:', this.serverUrl);

        // 创建Socket连接
        this.socket = io(this.serverUrl, {
          transports: ['polling', 'websocket'], // 先尝试 polling，再尝试 websocket
          timeout: 20000,
          forceNew: true,
          upgrade: true,
          rememberUpgrade: false,
          autoConnect: true,
          reconnection: true,
          reconnectionAttempts: 5,
          reconnectionDelay: 1000,
          ...options
        });

        // 连接成功事件
        this.socket.on('connect', () => {
          console.log('Socket.IO 连接成功, Socket ID:', this.socket.id);
          this.isConnected = true;
          this.reconnectAttempts = 0;
          
          // 重新绑定所有事件监听器
          this._rebindEventListeners();
          
          this._triggerEvent('connected', { socketId: this.socket.id });
          resolve(this.socket);
        });

        // 连接错误事件
        this.socket.on('connect_error', (error) => {
          console.error('Socket.IO 连接错误:', error);
          this.isConnected = false;
          this._triggerEvent('connect_error', error);
          
          if (this.reconnectAttempts === 0) {
            reject(error);
          }
        });

        // 断开连接事件
        this.socket.on('disconnect', (reason) => {
          console.log('Socket.IO 连接断开:', reason);
          this.isConnected = false;
          this._triggerEvent('disconnected', { reason });
          
          // 如果不是主动断开，尝试重连
          if (reason !== 'io client disconnect') {
            this._attemptReconnect();
          }
        });

        // 重连事件
        this.socket.on('reconnect', (attemptNumber) => {
          console.log('Socket.IO 重连成功, 尝试次数:', attemptNumber);
          this.isConnected = true;
          this.reconnectAttempts = 0;
          this._triggerEvent('reconnected', { attemptNumber });
        });

        // 重连尝试事件
        this.socket.on('reconnect_attempt', (attemptNumber) => {
          console.log('Socket.IO 重连尝试:', attemptNumber);
          this._triggerEvent('reconnect_attempt', { attemptNumber });
        });

        // 重连失败事件
        this.socket.on('reconnect_failed', () => {
          console.error('Socket.IO 重连失败');
          this.isConnected = false;
          this._triggerEvent('reconnect_failed');
        });

      } catch (error) {
        console.error('创建Socket连接时发生错误:', error);
        reject(error);
      }
    });
  }

  /**
   * 断开Socket连接
   */
  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
      this.isConnected = false;
      this.reconnectAttempts = 0;
      console.log('Socket.IO 连接已断开');
    }
  }

  /**
   * 发送事件到服务器
   * @param {string} event - 事件名称
   * @param {*} data - 发送的数据
   * @param {Function} callback - 回调函数
   */
  emit(event, data, callback) {
    if (this.socket && this.isConnected) {
      this.socket.emit(event, data, callback);
    } else {
      console.warn('Socket未连接，无法发送事件:', event);
      if (callback) {
        callback({ error: 'Socket未连接' });
      }
    }
  }

  /**
   * 监听服务器事件
   * @param {string} event - 事件名称
   * @param {Function} callback - 回调函数
   */
  on(event, callback) {
    if (this.socket) {
      this.socket.on(event, callback);
    }
    
    // 保存事件监听器，用于重连后重新绑定
    if (!this.eventListeners.has(event)) {
      this.eventListeners.set(event, []);
    }
    this.eventListeners.get(event).push(callback);
  }

  /**
   * 移除事件监听器
   * @param {string} event - 事件名称
   * @param {Function} callback - 回调函数
   */
  off(event, callback) {
    if (this.socket) {
      this.socket.off(event, callback);
    }
    
    // 从保存的监听器中移除
    if (this.eventListeners.has(event)) {
      const listeners = this.eventListeners.get(event);
      const index = listeners.indexOf(callback);
      if (index > -1) {
        listeners.splice(index, 1);
      }
    }
  }

  /**
   * 监听一次性事件
   * @param {string} event - 事件名称
   * @param {Function} callback - 回调函数
   */
  once(event, callback) {
    if (this.socket) {
      this.socket.once(event, callback);
    }
  }

  /**
   * 获取连接状态
   * @returns {boolean} 是否已连接
   */
  isSocketConnected() {
    return this.isConnected && this.socket && this.socket.connected;
  }

  /**
   * 获取Socket ID
   * @returns {string|null} Socket ID
   */
  getSocketId() {
    return this.socket ? this.socket.id : null;
  }

  /**
   * 尝试重连
   * @private
   */
  _attemptReconnect() {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.error('达到最大重连次数，停止重连');
      this._triggerEvent('max_reconnect_attempts_reached');
      return;
    }

    this.reconnectAttempts++;
    const delay = this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1); // 指数退避

    console.log(`${delay}ms 后尝试第 ${this.reconnectAttempts} 次重连`);
    
    setTimeout(() => {
      if (!this.isConnected) {
        this.connect().catch(error => {
          console.error('重连失败:', error);
        });
      }
    }, delay);
  }

  /**
   * 重新绑定所有事件监听器
   * @private
   */
  _rebindEventListeners() {
    if (!this.socket) return;
    
    this.eventListeners.forEach((callbacks, event) => {
      callbacks.forEach(callback => {
        this.socket.on(event, callback);
      });
    });
    
    console.log(`重新绑定了 ${this.eventListeners.size} 个事件监听器`);
  }

  /**
   * 触发内部事件
   * @private
   * @param {string} event - 事件名称
   * @param {*} data - 事件数据
   */
  _triggerEvent(event, data) {
    // 这里可以添加全局事件处理逻辑
    // 比如更新UI状态、显示通知等
    console.log(`Socket事件: ${event}`, data);
  }

  /**
   * 用户加入聊天
   * @param {string} userId - 用户ID
   * @param {Object} userInfo - 用户信息
   */
  joinChat(userId, userInfo = {}) {
    this.emit('user-join-chat', {
      userId,
      userInfo,
      timestamp: new Date().toISOString()
    });
  }

  /**
   * 用户发送消息
   * @param {Object} messageData - 消息数据
   */
  sendMessage(messageData) {
    this.emit('user-send-message', {
      ...messageData,
      timestamp: new Date().toISOString()
    });
  }

  /**
   * 用户正在输入
   * @param {string} sessionId - 会话ID
   */
  userTyping(sessionId) {
    this.emit('user-typing', {
      sessionId,
      timestamp: new Date().toISOString()
    });
  }

  /**
   * 监听聊天相关事件
   * @param {Object} callbacks - 事件回调对象
   */
  onChatEvents(callbacks) {
    const {
      onSessionCreated,
      onMessageReceived,
      onOperatorJoined,
      onOperatorStatusChanged,
      onTypingIndicator,
      onMessageHistory,
      onChatError
    } = callbacks;

    if (onSessionCreated) {
      this.on('chat-session-created', onSessionCreated);
    }
    
    if (onMessageReceived) {
      this.on('message-received', onMessageReceived);
    }
    
    if (onOperatorJoined) {
      this.on('operator-joined', onOperatorJoined);
    }
    
    if (onOperatorStatusChanged) {
      this.on('operator-status-changed', onOperatorStatusChanged);
    }
    
    if (onTypingIndicator) {
      this.on('typing-indicator', onTypingIndicator);
    }

    if (onMessageHistory) {
      this.on('message-history', onMessageHistory);
    }

    if (onChatError) {
      this.on('chat-error', onChatError);
    }
  }
}

// 创建单例实例
const socketService = new SocketService();

export default socketService;