import axios from 'axios';

class ApiService {
  constructor() {
    // 配置基础URL
    this.baseURL = process.env.NODE_ENV === 'production' 
      ? window.location.origin 
      : 'http://localhost:3001';
    
    // 创建axios实例
    this.client = axios.create({
      baseURL: this.baseURL,
      timeout: 10000,
      headers: {
        'Content-Type': 'application/json'
      }
    });

    // 请求拦截器
    this.client.interceptors.request.use(
      config => {
        console.log('API请求:', config.method?.toUpperCase(), config.url);
        return config;
      },
      error => {
        console.error('API请求错误:', error);
        return Promise.reject(error);
      }
    );

    // 响应拦截器
    this.client.interceptors.response.use(
      response => {
        console.log('API响应:', response.status, response.config.url);
        return response.data;
      },
      error => {
        console.error('API响应错误:', error.response?.status, error.response?.data);
        return Promise.reject(error);
      }
    );
  }

  /**
   * 获取用户聊天会话列表
   * @param {string} userId - 用户ID
   * @returns {Promise} API响应
   */
  async getUserSessions(userId) {
    try {
      return await this.client.get(`/api/chat/sessions/${userId}`);
    } catch (error) {
      throw this._handleError(error, '获取用户会话列表失败');
    }
  }

  /**
   * 创建新的聊天会话
   * @param {Object} sessionData - 会话数据
   * @returns {Promise} API响应
   */
  async createSession(sessionData) {
    try {
      return await this.client.post('/api/chat/sessions', sessionData);
    } catch (error) {
      throw this._handleError(error, '创建聊天会话失败');
    }
  }

  /**
   * 关闭聊天会话
   * @param {string} sessionId - 会话ID
   * @returns {Promise} API响应
   */
  async closeSession(sessionId) {
    try {
      return await this.client.put(`/api/chat/sessions/${sessionId}/close`);
    } catch (error) {
      throw this._handleError(error, '关闭聊天会话失败');
    }
  }

  /**
   * 获取会话消息历史
   * @param {string} sessionId - 会话ID
   * @param {Object} options - 查询选项 (page, limit, startDate, endDate)
   * @returns {Promise} API响应
   */
  async getSessionMessages(sessionId, options = {}) {
    try {
      const params = new URLSearchParams();
      
      // 添加分页参数
      if (options.page) params.append('page', options.page);
      if (options.limit) params.append('limit', options.limit);
      
      // 添加时间范围参数
      if (options.startDate) params.append('startDate', options.startDate);
      if (options.endDate) params.append('endDate', options.endDate);
      
      // 添加消息类型过滤
      if (options.messageType) params.append('messageType', options.messageType);
      
      const url = `/api/chat/messages/${sessionId}${params.toString() ? '?' + params.toString() : ''}`;
      return await this.client.get(url);
    } catch (error) {
      throw this._handleError(error, '获取消息历史失败');
    }
  }

  /**
   * 获取消息历史（支持分页）
   * @param {string} sessionId - 会话ID
   * @param {number} page - 页码
   * @param {number} limit - 每页数量
   * @returns {Promise} API响应
   */
  async getMessageHistory(sessionId, page = 1, limit = 50) {
    return this.getSessionMessages(sessionId, { page, limit });
  }

  /**
   * 搜索消息
   * @param {string} sessionId - 会话ID
   * @param {string} keyword - 搜索关键词
   * @param {Object} options - 搜索选项
   * @returns {Promise} API响应
   */
  async searchMessages(sessionId, keyword, options = {}) {
    try {
      const params = new URLSearchParams({
        keyword,
        ...options
      });
      
      return await this.client.get(`/api/chat/messages/${sessionId}/search?${params.toString()}`);
    } catch (error) {
      throw this._handleError(error, '搜索消息失败');
    }
  }

  /**
   * 获取在线客服列表
   * @param {Object} options - 查询选项
   * @returns {Promise} API响应
   */
  async getOnlineOperators(options = {}) {
    try {
      const params = new URLSearchParams();
      if (options.includeStats) params.append('includeStats', 'true');
      
      const url = `/api/operators/online${params.toString() ? '?' + params.toString() : ''}`;
      return await this.client.get(url);
    } catch (error) {
      throw this._handleError(error, '获取在线客服失败');
    }
  }

  /**
   * 获取可用客服列表
   * @returns {Promise} API响应
   */
  async getAvailableOperators() {
    try {
      return await this.client.get('/api/operators/available');
    } catch (error) {
      throw this._handleError(error, '获取可用客服失败');
    }
  }

  /**
   * 更新客服状态
   * @param {string} operatorId - 客服ID
   * @param {string} status - 状态 ('online', 'offline', 'busy')
   * @returns {Promise} API响应
   */
  async updateOperatorStatus(operatorId, status) {
    try {
      return await this.client.put(`/api/operators/${operatorId}/status`, { status });
    } catch (error) {
      throw this._handleError(error, '更新客服状态失败');
    }
  }

  /**
   * 获取客服的活跃会话
   * @param {string} operatorId - 客服ID
   * @returns {Promise} API响应
   */
  async getOperatorSessions(operatorId) {
    try {
      return await this.client.get(`/api/operators/${operatorId}/sessions`);
    } catch (error) {
      throw this._handleError(error, '获取客服会话失败');
    }
  }

  /**
   * 分配客服到会话
   * @param {string} operatorId - 客服ID
   * @param {string} sessionId - 会话ID
   * @returns {Promise} API响应
   */
  async assignOperatorToSession(operatorId, sessionId) {
    try {
      return await this.client.post(`/api/operators/${operatorId}/assign-session`, { sessionId });
    } catch (error) {
      throw this._handleError(error, '分配客服失败');
    }
  }

  /**
   * 获取待处理会话列表
   * @param {Object} options - 查询选项
   * @returns {Promise} API响应
   */
  async getPendingSessions(options = {}) {
    try {
      const params = new URLSearchParams();
      if (options.limit) params.append('limit', options.limit);
      if (options.offset) params.append('offset', options.offset);
      
      const url = `/api/operators/pending-sessions${params.toString() ? '?' + params.toString() : ''}`;
      return await this.client.get(url);
    } catch (error) {
      throw this._handleError(error, '获取待处理会话失败');
    }
  }

  /**
   * 获取活跃会话列表（等待中和进行中的会话）
   * @param {Object} options - 查询选项
   * @returns {Promise} API响应
   */
  async getActiveSessions(options = {}) {
    try {
      const params = new URLSearchParams();
      if (options.limit) params.append('limit', options.limit);
      if (options.offset) params.append('offset', options.offset);
      
      const url = `/api/chat/sessions/active${params.toString() ? '?' + params.toString() : ''}`;
      return await this.client.get(url);
    } catch (error) {
      throw this._handleError(error, '获取活跃会话失败');
    }
  }

  /**
   * 获取所有历史会话列表
   * @param {Object} options - 查询选项
   * @returns {Promise} API响应
   */
  async getAllHistorySessions(options = {}) {
    try {
      const params = new URLSearchParams();
      // 设置默认值，确保获取最新的100条记录
      params.append('page', options.page || 1);
      params.append('limit', options.limit || 100);
      if (options.keyword) params.append('keyword', options.keyword);
      if (options.status) params.append('status', options.status);
      if (options.startDate) params.append('startDate', options.startDate);
      if (options.endDate) params.append('endDate', options.endDate);
      
      const url = `/api/chat/sessions/history?${params.toString()}`;
      return await this.client.get(url);
    } catch (error) {
      throw this._handleError(error, '获取历史会话失败');
    }
  }

  /**
   * 获取客服统计信息
   * @returns {Promise} API响应
   */
  async getOperatorStats() {
    try {
      return await this.client.get('/api/operators/stats');
    } catch (error) {
      throw this._handleError(error, '获取客服统计失败');
    }
  }

  /**
   * 智能分配客服
   * @param {Object} options - 分配选项
   * @returns {Promise} API响应
   */
  async assignOperator(options = {}) {
    try {
      return await this.client.post('/api/operators/assign', options);
    } catch (error) {
      throw this._handleError(error, '智能分配客服失败');
    }
  }

  /**
   * 获取所有客服列表
   * @returns {Promise} API响应
   */
  async getAllOperators() {
    try {
      return await this.client.get('/api/operators');
    } catch (error) {
      throw this._handleError(error, '获取客服列表失败');
    }
  }

  /**
   * 获取客服状态
   * @param {string} operatorId - 客服ID
   * @returns {Promise} API响应
   */
  async getOperatorStatus(operatorId) {
    try {
      return await this.client.get(`/api/operators/${operatorId}/status`);
    } catch (error) {
      throw this._handleError(error, '获取客服状态失败');
    }
  }

  /**
   * 获取会话详情
   * @param {string} sessionId - 会话ID
   * @returns {Promise} API响应
   */
  async getSessionDetails(sessionId) {
    try {
      return await this.client.get(`/api/chat/sessions/details/${sessionId}`);
    } catch (error) {
      throw this._handleError(error, '获取会话详情失败');
    }
  }

  /**
   * 更新会话状态
   * @param {string} sessionId - 会话ID
   * @param {string} status - 新状态
   * @returns {Promise} API响应
   */
  async updateSessionStatus(sessionId, status) {
    try {
      return await this.client.put(`/api/chat/sessions/${sessionId}/status`, { status });
    } catch (error) {
      throw this._handleError(error, '更新会话状态失败');
    }
  }

  /**
   * 标记消息为已读
   * @param {string} sessionId - 会话ID
   * @param {string} messageId - 消息ID
   * @returns {Promise} API响应
   */
  async markMessageAsRead(sessionId, messageId) {
    try {
      return await this.client.put(`/api/chat/messages/${messageId}/read`);
    } catch (error) {
      throw this._handleError(error, '标记消息已读失败');
    }
  }

  /**
   * 批量标记消息为已读
   * @param {string} sessionId - 会话ID
   * @param {Array} messageIds - 消息ID数组
   * @returns {Promise} API响应
   */
  async markMessagesAsRead(sessionId, messageIds) {
    try {
      return await this.client.put(`/api/chat/sessions/${sessionId}/messages/read`, { messageIds });
    } catch (error) {
      throw this._handleError(error, '批量标记消息已读失败');
    }
  }

  /**
   * 获取未读消息数量
   * @param {string} sessionId - 会话ID
   * @returns {Promise} API响应
   */
  async getUnreadCount(sessionId) {
    try {
      return await this.client.get(`/api/chat/sessions/${sessionId}/unread-count`);
    } catch (error) {
      throw this._handleError(error, '获取未读消息数量失败');
    }
  }

  /**
   * 发送文件消息
   * @param {string} sessionId - 会话ID
   * @param {File} file - 文件对象
   * @param {string} messageType - 消息类型 (image, file)
   * @returns {Promise} API响应
   */
  async sendFileMessage(sessionId, file, messageType = 'file') {
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('sessionId', sessionId);
      formData.append('messageType', messageType);
      
      return await this.client.post('/api/chat/messages/file', formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        },
        timeout: 30000 // 文件上传超时时间更长
      });
    } catch (error) {
      throw this._handleError(error, '发送文件消息失败');
    }
  }

  /**
   * 获取系统配置
   * @returns {Promise} API响应
   */
  async getSystemConfig() {
    try {
      return await this.client.get('/api/system/config');
    } catch (error) {
      throw this._handleError(error, '获取系统配置失败');
    }
  }

  /**
   * 检查服务器健康状态
   * @returns {Promise} API响应
   */
  async checkHealth() {
    try {
      return await this.client.get('/api/health');
    } catch (error) {
      throw this._handleError(error, '检查服务器状态失败');
    }
  }

  /**
   * 获取用户信息
   * @param {string} userId - 用户ID
   * @returns {Promise} API响应
   */
  async getUserInfo(userId) {
    try {
      return await this.client.get(`/api/users/${userId}`);
    } catch (error) {
      throw this._handleError(error, '获取用户信息失败');
    }
  }

  /**
   * 更新用户信息
   * @param {string} userId - 用户ID
   * @param {Object} userData - 用户数据
   * @returns {Promise} API响应
   */
  async updateUserInfo(userId, userData) {
    try {
      return await this.client.put(`/api/users/${userId}`, userData);
    } catch (error) {
      throw this._handleError(error, '更新用户信息失败');
    }
  }

  /**
   * 获取会话统计信息
   * @param {string} sessionId - 会话ID
   * @returns {Promise} API响应
   */
  async getSessionStats(sessionId) {
    try {
      return await this.client.get(`/api/chat/sessions/${sessionId}/stats`);
    } catch (error) {
      throw this._handleError(error, '获取会话统计失败');
    }
  }

  /**
   * 提交会话评价
   * @param {string} sessionId - 会话ID
   * @param {Object} rating - 评价数据
   * @returns {Promise} API响应
   */
  async submitRating(sessionId, rating) {
    try {
      return await this.client.post(`/api/chat/sessions/${sessionId}/rating`, rating);
    } catch (error) {
      throw this._handleError(error, '提交评价失败');
    }
  }

  /**
   * 处理API错误
   * @private
   * @param {Error} error - 错误对象
   * @param {string} defaultMessage - 默认错误消息
   * @returns {Error} 处理后的错误
   */
  _handleError(error, defaultMessage) {
    // 创建错误对象，包含更详细的信息
    const errorInfo = {
      message: defaultMessage,
      originalError: error,
      timestamp: new Date().toISOString()
    };

    if (error.response) {
      // 服务器响应错误
      const { status, data, statusText } = error.response;
      
      // 根据状态码提供更具体的错误信息
      let message = defaultMessage;
      
      switch (status) {
        case 400:
          message = data?.error?.message || data?.message || '请求参数错误';
          break;
        case 401:
          message = '未授权访问，请重新登录';
          break;
        case 403:
          message = '访问被拒绝，权限不足';
          break;
        case 404:
          message = '请求的资源不存在';
          break;
        case 408:
          message = '请求超时，请重试';
          break;
        case 429:
          message = '请求过于频繁，请稍后再试';
          break;
        case 500:
          message = '服务器内部错误，请稍后重试';
          break;
        case 502:
          message = '服务器网关错误';
          break;
        case 503:
          message = '服务暂时不可用，请稍后重试';
          break;
        default:
          message = data?.error?.message || data?.message || `${defaultMessage} (状态码: ${status})`;
      }
      
      errorInfo.status = status;
      errorInfo.statusText = statusText;
      errorInfo.message = message;
      errorInfo.data = data;
      
    } else if (error.request) {
      // 网络错误
      if (error.code === 'ECONNABORTED') {
        errorInfo.message = '请求超时，请检查网络连接';
      } else if (error.code === 'NETWORK_ERROR') {
        errorInfo.message = '网络连接失败，请检查网络设置';
      } else {
        errorInfo.message = '网络连接失败，请检查网络设置';
      }
      errorInfo.code = error.code;
      
    } else {
      // 其他错误
      errorInfo.message = error.message || defaultMessage;
    }

    // 创建自定义错误对象
    const customError = new Error(errorInfo.message);
    customError.errorInfo = errorInfo;
    
    // 在开发环境下打印详细错误信息
    if (process.env.NODE_ENV === 'development') {
      console.error('API错误详情:', errorInfo);
    }
    
    return customError;
  }

  /**
   * 重试机制包装器
   * @private
   * @param {Function} apiCall - API调用函数
   * @param {number} maxRetries - 最大重试次数
   * @param {number} delay - 重试延迟时间(ms)
   * @returns {Promise} API响应
   */
  async _withRetry(apiCall, maxRetries = 3, delay = 1000) {
    let lastError;
    
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        return await apiCall();
      } catch (error) {
        lastError = error;
        
        // 如果是客户端错误(4xx)，不进行重试
        if (error.errorInfo?.status >= 400 && error.errorInfo?.status < 500) {
          throw error;
        }
        
        // 最后一次尝试失败，抛出错误
        if (attempt === maxRetries) {
          throw error;
        }
        
        // 等待后重试
        await new Promise(resolve => setTimeout(resolve, delay * attempt));
      }
    }
    
    throw lastError;
  }

  /**
   * 带重试的获取在线客服列表
   * @returns {Promise} API响应
   */
  async getOnlineOperatorsWithRetry() {
    return this._withRetry(() => this.getOnlineOperators());
  }

  /**
   * 带重试的获取消息历史
   * @param {string} sessionId - 会话ID
   * @param {Object} options - 查询选项
   * @returns {Promise} API响应
   */
  async getSessionMessagesWithRetry(sessionId, options = {}) {
    return this._withRetry(() => this.getSessionMessages(sessionId, options));
  }
}

// 创建单例实例
const apiService = new ApiService();

export default apiService;