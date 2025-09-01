// 消息状态管理模块
const state = {
  // 当前会话的消息列表
  messageList: [],
  // 消息发送状态
  sendingMessages: new Set(), // 存储正在发送的消息ID
  // 历史消息加载状态
  loadingHistory: false,
  // 是否还有更多历史消息
  hasMoreHistory: true,
  // 消息分页信息
  pagination: {
    page: 1,
    limit: 50,
    total: 0
  },
  // 未读消息数量
  unreadCount: 0,
  // 最后一条消息的时间戳
  lastMessageTime: null
}

const mutations = {
  // 添加消息到列表
  ADD_MESSAGE(state, message) {
    // 避免重复添加
    const existingIndex = state.messageList.findIndex(msg => msg.id === message.id)
    if (existingIndex === -1) {
      state.messageList.push({
        ...message,
        timestamp: message.createdAt || new Date(),
        isRead: message.senderType === 'user' ? true : message.isRead || false
      })
      
      // 按时间排序
      state.messageList.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp))
      
      // 更新最后消息时间
      state.lastMessageTime = message.createdAt || new Date()
      
      // 如果是客服消息且未读，增加未读计数
      if (message.senderType === 'operator' && !message.isRead) {
        state.unreadCount++
      }
    }
  },
  
  // 批量添加历史消息
  ADD_HISTORY_MESSAGES(state, messages) {
    const newMessages = messages.filter(msg => 
      !state.messageList.some(existingMsg => existingMsg.id === msg.id)
    )
    
    const formattedMessages = newMessages.map(msg => ({
      ...msg,
      timestamp: msg.createdAt || new Date(),
      isRead: msg.senderType === 'user' ? true : msg.isRead || false
    }))
    
    state.messageList.unshift(...formattedMessages)
    state.messageList.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp))
  },
  
  // 更新消息状态
  UPDATE_MESSAGE_STATUS(state, { messageId, status }) {
    const messageIndex = state.messageList.findIndex(msg => msg.id === messageId)
    if (messageIndex !== -1) {
      state.messageList[messageIndex] = {
        ...state.messageList[messageIndex],
        status: status
      }
    }
  },
  
  // 标记消息为已读
  MARK_MESSAGE_READ(state, messageId) {
    const messageIndex = state.messageList.findIndex(msg => msg.id === messageId)
    if (messageIndex !== -1 && !state.messageList[messageIndex].isRead) {
      state.messageList[messageIndex].isRead = true
      if (state.messageList[messageIndex].senderType === 'operator') {
        state.unreadCount = Math.max(0, state.unreadCount - 1)
      }
    }
  },
  
  // 标记所有消息为已读
  MARK_ALL_MESSAGES_READ(state) {
    state.messageList.forEach(msg => {
      if (!msg.isRead && msg.senderType === 'operator') {
        msg.isRead = true
      }
    })
    state.unreadCount = 0
  },
  
  // 设置消息发送状态
  SET_MESSAGE_SENDING(state, messageId) {
    state.sendingMessages.add(messageId)
  },
  
  // 移除消息发送状态
  REMOVE_MESSAGE_SENDING(state, messageId) {
    state.sendingMessages.delete(messageId)
  },
  
  // 设置历史消息加载状态
  SET_LOADING_HISTORY(state, loading) {
    state.loadingHistory = loading
  },
  
  // 设置是否还有更多历史消息
  SET_HAS_MORE_HISTORY(state, hasMore) {
    state.hasMoreHistory = hasMore
  },
  
  // 更新分页信息
  UPDATE_PAGINATION(state, pagination) {
    state.pagination = { ...state.pagination, ...pagination }
  },
  
  // 清空消息列表
  CLEAR_MESSAGES(state) {
    state.messageList = []
    state.sendingMessages.clear()
    state.unreadCount = 0
    state.lastMessageTime = null
    state.pagination = {
      page: 1,
      limit: 50,
      total: 0
    }
    state.hasMoreHistory = true
  },
  
  // 设置未读消息数量
  SET_UNREAD_COUNT(state, count) {
    state.unreadCount = count
  }
}

const actions = {
  // 发送消息
  async sendMessage({ commit, rootState }, { content, messageType = 'text' }) {
    const tempId = `temp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    const userId = rootState.chat.userId
    const sessionId = rootState.chat.currentSession?.id
    
    if (!sessionId) {
      throw new Error('没有活跃的聊天会话')
    }
    
    // 创建临时消息对象
    const tempMessage = {
      id: tempId,
      sessionId: sessionId,
      senderId: userId,
      senderType: 'user',
      messageType: messageType,
      content: content,
      createdAt: new Date(),
      status: 'sending'
    }
    
    // 立即添加到消息列表
    commit('ADD_MESSAGE', tempMessage)
    commit('SET_MESSAGE_SENDING', tempId)
    
    try {
      // 这里会通过Socket.IO发送消息
      // 实际的Socket发送逻辑会在组件中处理
      return tempMessage
    } catch (error) {
      // 发送失败，更新消息状态
      commit('UPDATE_MESSAGE_STATUS', { messageId: tempId, status: 'failed' })
      commit('REMOVE_MESSAGE_SENDING', tempId)
      throw error
    }
  },
  
  // 接收消息
  receiveMessage({ commit }, message) {
    commit('ADD_MESSAGE', {
      ...message,
      status: 'delivered'
    })
  },
  
  // 消息发送成功
  messageSent({ commit }, { tempId, realMessage }) {
    commit('REMOVE_MESSAGE_SENDING', tempId)
    
    // 移除临时消息，添加真实消息
    const messageIndex = state.messageList.findIndex(msg => msg.id === tempId)
    if (messageIndex !== -1) {
      commit('UPDATE_MESSAGE_STATUS', { messageId: tempId, status: 'sent' })
      
      // 如果有真实消息ID，更新消息
      if (realMessage && realMessage.id !== tempId) {
        state.messageList[messageIndex] = {
          ...state.messageList[messageIndex],
          ...realMessage,
          status: 'delivered'
        }
      }
    }
  },
  
  // 消息发送失败
  messageFailed({ commit }, tempId) {
    commit('UPDATE_MESSAGE_STATUS', { messageId: tempId, status: 'failed' })
    commit('REMOVE_MESSAGE_SENDING', tempId)
  },
  
  // 加载历史消息
  async loadHistoryMessages({ commit, state }, { sessionId, page = 1 }) {
    if (state.loadingHistory) return
    
    commit('SET_LOADING_HISTORY', true)
    
    try {
      // 这里会调用API服务获取历史消息
      // 暂时返回空数组
      const messages = []
      const hasMore = messages.length === state.pagination.limit
      
      commit('ADD_HISTORY_MESSAGES', messages)
      commit('SET_HAS_MORE_HISTORY', hasMore)
      commit('UPDATE_PAGINATION', { 
        page: page,
        total: state.messageList.length 
      })
      
      return messages
    } catch (error) {
      console.error('加载历史消息失败:', error)
      throw error
    } finally {
      commit('SET_LOADING_HISTORY', false)
    }
  },
  
  // 标记消息为已读
  markMessageAsRead({ commit }, messageId) {
    commit('MARK_MESSAGE_READ', messageId)
  },
  
  // 标记所有消息为已读
  markAllMessagesAsRead({ commit }) {
    commit('MARK_ALL_MESSAGES_READ')
  },
  
  // 重试发送失败的消息
  async retryMessage({ commit, dispatch }, message) {
    if (message.status !== 'failed') return
    
    commit('UPDATE_MESSAGE_STATUS', { messageId: message.id, status: 'sending' })
    commit('SET_MESSAGE_SENDING', message.id)
    
    try {
      // 重新发送消息
      await dispatch('sendMessage', {
        content: message.content,
        messageType: message.messageType
      })
    } catch (error) {
      commit('UPDATE_MESSAGE_STATUS', { messageId: message.id, status: 'failed' })
      commit('REMOVE_MESSAGE_SENDING', message.id)
      throw error
    }
  },
  
  // 清空当前会话消息
  clearCurrentMessages({ commit }) {
    commit('CLEAR_MESSAGES')
  }
}

const getters = {
  // 获取所有消息
  allMessages: state => state.messageList,
  
  // 获取未读消息数量
  unreadCount: state => state.unreadCount,
  
  // 获取最后一条消息
  lastMessage: state => {
    return state.messageList.length > 0 
      ? state.messageList[state.messageList.length - 1] 
      : null
  },
  
  // 获取正在发送的消息
  sendingMessages: state => {
    return state.messageList.filter(msg => state.sendingMessages.has(msg.id))
  },
  
  // 获取发送失败的消息
  failedMessages: state => {
    return state.messageList.filter(msg => msg.status === 'failed')
  },
  
  // 是否正在加载历史消息
  isLoadingHistory: state => state.loadingHistory,
  
  // 是否还有更多历史消息
  hasMoreHistory: state => state.hasMoreHistory,
  
  // 获取分页信息
  paginationInfo: state => state.pagination,
  
  // 按日期分组的消息
  messagesByDate: state => {
    const grouped = {}
    state.messageList.forEach(message => {
      const date = new Date(message.timestamp).toDateString()
      if (!grouped[date]) {
        grouped[date] = []
      }
      grouped[date].push(message)
    })
    return grouped
  },
  
  // 获取用户消息
  userMessages: state => state.messageList.filter(msg => msg.senderType === 'user'),
  
  // 获取客服消息
  operatorMessages: state => state.messageList.filter(msg => msg.senderType === 'operator')
}

export default {
  namespaced: true,
  state,
  mutations,
  actions,
  getters
}