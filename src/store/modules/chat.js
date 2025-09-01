// 聊天状态管理模块
const state = {
  // 当前聊天会话
  currentSession: null,
  // 用户ID
  userId: null,
  // 连接状态
  connectionStatus: 'disconnected', // 'connecting', 'connected', 'disconnected', 'error'
  // 客服在线状态
  operatorOnlineStatus: false,
  // 当前分配的客服信息
  assignedOperator: null,
  // 会话状态
  sessionStatus: 'waiting', // 'waiting', 'active', 'closed'
  // 输入状态
  isTyping: false,
  // 对方输入状态
  operatorTyping: false
}

const mutations = {
  // 设置用户ID
  SET_USER_ID(state, userId) {
    state.userId = userId
  },
  
  // 设置当前会话
  SET_CURRENT_SESSION(state, session) {
    state.currentSession = session
    if (session) {
      state.sessionStatus = session.status || 'waiting'
    }
  },
  
  // 更新连接状态
  SET_CONNECTION_STATUS(state, status) {
    state.connectionStatus = status
  },
  
  // 设置客服在线状态
  SET_OPERATOR_ONLINE_STATUS(state, isOnline) {
    state.operatorOnlineStatus = isOnline
  },
  
  // 设置分配的客服
  SET_ASSIGNED_OPERATOR(state, operator) {
    state.assignedOperator = operator
  },
  
  // 更新会话状态
  SET_SESSION_STATUS(state, status) {
    state.sessionStatus = status
  },
  
  // 设置用户输入状态
  SET_USER_TYPING(state, isTyping) {
    state.isTyping = isTyping
  },
  
  // 设置客服输入状态
  SET_OPERATOR_TYPING(state, isTyping) {
    state.operatorTyping = isTyping
  },
  
  // 重置聊天状态
  RESET_CHAT_STATE(state) {
    state.currentSession = null
    state.assignedOperator = null
    state.sessionStatus = 'waiting'
    state.isTyping = false
    state.operatorTyping = false
  }
}

const actions = {
  // 初始化聊天会话
  async initChatSession({ commit, state }, userId) {
    commit('SET_USER_ID', userId)
    
    try {
      // 这里会调用API服务创建或获取会话
      // 暂时设置一个临时会话ID
      const sessionId = `session_${userId}_${Date.now()}`
      const session = {
        id: sessionId,
        userId: userId,
        status: 'waiting',
        createdAt: new Date()
      }
      
      commit('SET_CURRENT_SESSION', session)
      return session
    } catch (error) {
      console.error('初始化聊天会话失败:', error)
      throw error
    }
  },
  
  // 连接Socket
  connectSocket({ commit }) {
    commit('SET_CONNECTION_STATUS', 'connecting')
  },
  
  // Socket连接成功
  socketConnected({ commit }) {
    commit('SET_CONNECTION_STATUS', 'connected')
  },
  
  // Socket连接断开
  socketDisconnected({ commit }) {
    commit('SET_CONNECTION_STATUS', 'disconnected')
  },
  
  // Socket连接错误
  socketError({ commit }) {
    commit('SET_CONNECTION_STATUS', 'error')
  },
  
  // 客服加入会话
  operatorJoined({ commit }, operator) {
    commit('SET_ASSIGNED_OPERATOR', operator)
    commit('SET_SESSION_STATUS', 'active')
  },
  
  // 更新客服在线状态
  updateOperatorOnlineStatus({ commit }, isOnline) {
    commit('SET_OPERATOR_ONLINE_STATUS', isOnline)
  },
  
  // 开始输入
  startTyping({ commit }) {
    commit('SET_USER_TYPING', true)
  },
  
  // 停止输入
  stopTyping({ commit }) {
    commit('SET_USER_TYPING', false)
  },
  
  // 客服开始输入
  operatorStartTyping({ commit }) {
    commit('SET_OPERATOR_TYPING', true)
  },
  
  // 客服停止输入
  operatorStopTyping({ commit }) {
    commit('SET_OPERATOR_TYPING', false)
  },
  
  // 关闭会话
  closeSession({ commit }) {
    commit('SET_SESSION_STATUS', 'closed')
    commit('RESET_CHAT_STATE')
  }
}

const getters = {
  // 是否已连接
  isConnected: state => state.connectionStatus === 'connected',
  
  // 是否有活跃会话
  hasActiveSession: state => state.currentSession && state.sessionStatus !== 'closed',
  
  // 是否等待客服
  isWaitingForOperator: state => state.sessionStatus === 'waiting',
  
  // 是否有客服在线
  hasOperatorOnline: state => state.operatorOnlineStatus,
  
  // 获取会话信息
  sessionInfo: state => ({
    session: state.currentSession,
    operator: state.assignedOperator,
    status: state.sessionStatus
  }),
  
  // 获取连接状态信息
  connectionInfo: state => ({
    status: state.connectionStatus,
    isConnected: state.connectionStatus === 'connected'
  }),
  
  // 获取输入状态
  typingStatus: state => ({
    userTyping: state.isTyping,
    operatorTyping: state.operatorTyping
  })
}

export default {
  namespaced: true,
  state,
  mutations,
  actions,
  getters
}