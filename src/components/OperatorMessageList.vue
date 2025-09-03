<template>
  <div class="operator-message-list">
    <!-- 头部 -->
    <!-- <div class="header">
      <div class="title">
        <h2>客服工作台</h2>
        <p>点击会话打开聊天窗口</p>
      </div>
      <div class="operator-info">
        <el-tag :type="statusTagType" size="medium">
          {{ statusText }}
        </el-tag>
        <el-button 
          size="small" 
          :type="isConnected ? 'danger' : 'primary'"
          @click="toggleConnection"
          :loading="connecting"
        >
          {{ isConnected ? '断开连接' : '连接服务' }}
        </el-button>
      </div>
    </div> -->

    <!-- 搜索栏 -->
    <!-- <div class="search-bar">
      <el-input
        v-model="searchKeyword"
        placeholder="搜索用户名或会话ID"
        size="small"
        @keyup.enter="searchSessions"
        clearable
        prefix-icon="el-icon-search"
      >
      </el-input>
      <el-button 
        size="small" 
        type="text" 
        @click="refreshAllSessions"
        :loading="loading"
        icon="el-icon-refresh"
      >
        刷新
      </el-button>
    </div> -->

    <!-- 统一会话列表 -->
    <div class="session-list">
      <!-- 会话项 -->
      <div 
        v-for="session in filteredSessions" 
        :key="session.id"
        class="session-item"
        :class="getSessionClass(session)"
        @click="handleSessionClick(session)"
      >
        <!-- 头像和状态 -->
        <div class="session-avatar">
          <el-avatar :size="48">
            <i class="el-icon-user"></i>
          </el-avatar>
          <!-- <div class="status-indicator" :class="getStatusClass(session.status)"></div> -->
          <!-- 新消息红点 -->
          <div 
            v-if="session.unreadCount > 0" 
            class="unread-badge"
          >
            {{ session.unreadCount > 99 ? '99+' : session.unreadCount }}
          </div>
        </div
        
        <!-- 会话内容 -->
        <div class="session-content">
          <div class="session-header">
            <span class="user-name">{{ session.userName || session.userId.slice(-6) }}</span>
            <!-- <span class="session-time">{{ formatTime(session.updatedAt || session.createdAt) }}</span> -->
          </div>
          <div class="session-preview">
            {{ session.lastMessage || getDefaultMessage(session.status) }}
          </div>
          <div class="session-meta">
            <!-- <el-tag size="mini" :type="getStatusTagType(session.status)">
              {{ getStatusText(session.status) }}
            </el-tag> -->
            <span class="session-id">{{ session.id.slice(-8) }}</span>
            <!-- <span v-if="session.messageCount" class="message-count">{{ session.messageCount }}条消息</span> -->
          </div>
        </div>
        
        <!-- 操作按钮 -->
        <div class="session-actions" v-if="session.status === 'waiting'">
          <el-button 
            size="mini" 
            type="primary" 
            @click.stop="joinSession(session)"
            :loading="joiningSession === session.id"
          >
            接入
          </el-button>
        </div>
      </div>

      <!-- 空状态 -->
      <div v-if="filteredSessions.length === 0 && !loading" class="empty-state">
        <div class="empty-content">
          <i class="el-icon-chat-dot-square"></i>
          <h3>{{ searchKeyword ? '未找到匹配的会话' : '暂无会话' }}</h3>
          <p>{{ searchKeyword ? '尝试使用其他关键词搜索' : '当有用户发起聊天时，会话会显示在这里' }}</p>
          <el-button type="primary" @click="refreshAllSessions" :loading="loading">
            刷新列表
          </el-button>
        </div>
      </div>

      <!-- 加载状态 -->
      <div v-if="loading" class="loading-state">
        <i class="el-icon-loading"></i>
        <span>正在加载会话...</span>
      </div>
    </div>

    <!-- 分页 -->
    <!-- <div class="pagination-wrapper" v-if="pagination.total > 0">
      <el-pagination
        @size-change="handleSizeChange"
        @current-change="handleCurrentChange"
        :current-page="pagination.page"
        :page-sizes="[20, 50, 100]"
        :page-size="pagination.limit"
        layout="total, sizes, prev, pager, next"
        :total="pagination.total"
        small
      >
      </el-pagination>
    </div> -->

    <!-- 聊天弹窗 -->
    <el-dialog
      :visible.sync="chatDialogVisible"
      width="800px"
      :close-on-click-modal="false"
      :close-on-press-escape="false"
      custom-class="chat-dialog"
      @close="handleChatDialogClose"
    >
      <OperatorChatInterface
        v-if="currentChatSession"
        :session="currentChatSession"
        :operator-id="operatorId"
        :is-dialog-mode="true"
        @session-updated="handleSessionUpdated"
        @close-chat="closeChatDialog"
      />
    </el-dialog>
  </div>
</template>

<script>
import SocketService from '../services/SocketService'
import ApiService from '../services/ApiService'
import OperatorChatInterface from './OperatorChatInterface.vue'

export default {
  name: 'OperatorMessageList',
  
  components: {
    OperatorChatInterface
  },
  
  props: {
    // 当前聊天会话ID，用于判断是否需要显示未读计数
    currentChatSessionId: {
      type: String,
      default: null
    }
  },
  
  data() {
    return {
      // 连接状态
      isConnected: false,
      connecting: false,
      operatorId: null,
      operatorStatus: 'offline',
      
      // 统一会话数据
      allSessions: [], // 包含所有类型的会话
      
      // 加载状态
      loading: false,
      joiningSession: null,
      
      // 搜索
      searchKeyword: '',
      
      // 分页
      pagination: {
        page: 1,
        limit: 20,
        total: 0
      },
      
      // 聊天弹窗
      chatDialogVisible: false,
      currentChatSession: null,
   
    }
  },
  
  computed: {
    statusTagType() {
      const typeMap = {
        'online': 'success',
        'offline': 'info',
        'busy': 'warning'
      }
      return typeMap[this.operatorStatus] || 'info'
    },
    
    statusText() {
      const textMap = {
        'online': '在线',
        'offline': '离线',
        'busy': '忙碌'
      }
      return textMap[this.operatorStatus] || '离线'
    },
    
    // 聊天弹窗标题
    chatDialogTitle() {
      if (!this.currentChatSession) return '聊天窗口'
      const userName = this.currentChatSession.userName || '访客'
      const sessionId = this.currentChatSession.id.slice(-8)
      return `与 ${userName} 的对话 (${sessionId})`
    },
    
    // 过滤后的会话列表
    filteredSessions() {
      let sessions = [...this.allSessions]
      
      // 搜索过滤
      if (this.searchKeyword) {
        const keyword = this.searchKeyword.toLowerCase()
        sessions = sessions.filter(session => {
          return (session.userName && session.userName.toLowerCase().includes(keyword)) ||
                 session.id.toLowerCase().includes(keyword)
        })
      }
      
      // 排序：等待中 > 进行中 > 其他状态，然后按时间倒序
      sessions.sort((a, b) => {
        // 状态优先级
        const statusPriority = {
          'waiting': 3,
          'active': 2,
          'completed': 1,
          'closed': 1,
          'timeout': 1,
          'cancelled': 1
        }
        
        const aPriority = statusPriority[a.status] || 0
        const bPriority = statusPriority[b.status] || 0
        
        if (aPriority !== bPriority) {
          return bPriority - aPriority
        }
        
        // 相同状态按时间排序
        const aTime = new Date(a.updatedAt || a.createdAt)
        const bTime = new Date(b.updatedAt || b.createdAt)
        return bTime - aTime
      })
      
      return sessions
    }
  },
  
  methods: {
    /**
     * 生成客服ID
     */
    generateOperatorId() {
      return 'operator_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9)
    },
    
    /**
     * 切换连接状态
     */
    async toggleConnection() {
      if (this.isConnected) {
        await this.disconnect()
      } else {
        await this.connect()
      }
    },
    
    /**
     * 连接到服务器
     */
    async connect() {
      this.connecting = true
      
      try {
        // 生成客服ID
        if (!this.operatorId) {
          this.operatorId = this.generateOperatorId()
        }
        
        console.log('正在连接Socket服务，客服ID:', this.operatorId)
        
        // 连接Socket服务
        await SocketService.connect({
          query: {
            type: 'operator',
            operatorId: this.operatorId
          }
        })
        
        this.isConnected = true
        console.log('Socket连接成功')
        
        // 设置事件监听
        this.setupEventListeners()
        
        // 设置客服在线状态
        this.setOperatorStatus('online')
        
        // 加载所有会话
        await this.loadAllSessions()
        
        console.log('客服端连接成功，客服ID:', this.operatorId)
        this.$message.success('连接成功')
        
      } catch (error) {
        console.error('连接失败:', error)
        this.isConnected = false
        this.$message.error(`连接失败: ${error.message || '请检查网络连接'}`)
      } finally {
        this.connecting = false
      }
    },
    
    /**
     * 断开连接
     */
    async disconnect() {
      try {
        if (this.operatorId) {
          this.setOperatorStatus('offline')
        }
        
        SocketService.disconnect()
        this.isConnected = false
        this.operatorStatus = 'offline'
        
        // 清空数据
        this.allSessions = []
        
        this.$message.info('已断开连接')
        
      } catch (error) {
        console.error('断开连接失败:', error)
      }
    },
    
    /**
     * 设置客服状态
     */
    setOperatorStatus(status) {
      if (!this.isConnected) return
      
      console.log('设置客服状态:', status, '客服ID:', this.operatorId)
      this.operatorStatus = status
      SocketService.emit('operator-status-change', {
        operatorId: this.operatorId,
        status: status
      })
    },
    
    /**
     * 设置事件监听
     */
    setupEventListeners() {
      console.log('🔧 设置Socket事件监听器...')
      
      // 清除之前的监听器，避免重复绑定
      this.removeEventListeners()
      
      // Socket连接状态监听
      SocketService.on('connect', () => {
        console.log('✅ Socket连接成功')
        this.isConnected = true
        this.$message.success('连接已恢复')
      })
      
      SocketService.on('disconnect', (reason) => {
        console.log('❌ Socket连接断开:', reason)
        this.isConnected = false
        if (reason !== 'io client disconnect') {
          this.$message.warning('连接已断开，正在尝试重连...')
        }
      })
      
      SocketService.on('connect_error', (error) => {
        console.error('❌ Socket连接错误:', error)
        this.isConnected = false
        this.$message.error('连接服务器失败')
      })
      
      // 新聊天通知
      SocketService.on('new-chat-notification', (data) => {
        console.log('📢 收到新聊天通知:', data)
        this.addOrUpdateSession(data, 'waiting')
        this.$message({
          message: `新用户发起聊天请求`,
          type: 'info',
          duration: 3000
        })
      })
      
      // 新消息通知 - 这是关键的实时更新事件
      SocketService.on('new-message-notification', (data) => {
        console.log('=============new-message-notification======================')
        console.log('📨 收到新消息通知:', data)
        console.log('📨 消息内容:', data.content)
        console.log('📨 会话ID:', data.sessionId)
        console.log('📨 用户名:', data.userName)
        
        // 立即更新会话消息
        this.updateSessionMessage(data)
        
        // 显示通知消息
        this.$message({
          message: `${data.userName || '访客'}发送了新消息: ${data.content.substring(0, 20)}${data.content.length > 20 ? '...' : ''}`,
          type: 'warning',
          duration: 5000
        })
      })
      
      // 监听消息接收事件 - 处理实时消息更新
      SocketService.on('message-received', (data) => {
        console.log('=============message-received======================')
        // console.log('📨 收到消息接收事件:', data)
        console.log('📨 消息内容:', data.content)
        // console.log('📨 会话ID:', data.sessionId)
        // console.log('📨 发送者类型:', data.senderType)
        
        // 只处理用户发送的消息
        if (data.senderType === 'user') {
          // alert(data.content)
          // 更新会话消息
          this.updateSessionMessage({
            sessionId: data.sessionId,
            content: data.content,
            timestamp: data.timestamp,
            userId: data.senderId,
            userName: '访客' // 这里可以从会话数据中获取真实用户名
          })
          
          // 显示通知消息
          this.$message({
            message: `访客发送了新消息: ${data.content.substring(0, 20)}${data.content.length > 20 ? '...' : ''}`,
            type: 'warning',
            duration: 5000
          })
        }
      })
      
      // 客服状态更新
      SocketService.on('operator-status-updated', (data) => {
        if (data.operatorId === this.operatorId) {
          this.operatorStatus = data.status
          console.log('🔄 客服状态已更新:', data.status)
        }
      })
      
      // 聊天错误
      SocketService.on('chat-error', (data) => {
        console.error('❌ 聊天错误:', data)
        this.$message.error(data.error || '聊天服务出现错误')
      })
      
      console.log('✅ Socket事件监听器设置完成')
    },
    
    /**
     * 移除事件监听器
     */
    removeEventListeners() {
      const events = [
        'connect',
        'disconnect', 
        'connect_error',
        'new-chat-notification',
        'new-message-notification',
        'message-received',
        'operator-status-updated',
        'chat-error'
      ]
      
      events.forEach(event => {
        SocketService.off(event)
      })
    },
    
    
    /**
     * 刷新所有会话
     */
    async refreshAllSessions() {
      await this.loadAllSessions()
    },
    
    /**
     * 搜索会话
     */
    async searchSessions() {
      // 搜索逻辑在computed中处理，这里可以添加额外的搜索逻辑
      this.pagination.page = 1
    },
    
    /**
     * 处理会话点击
     */
    handleSessionClick(session) {
      if (session.status === 'waiting') {
        this.joinSession(session)
      } else {
        this.openChatDialog(session)
      }
    },
    
    /**
     * 加入等待中的会话
     */
    async joinSession(session) {
      if (!this.isConnected) {
        this.$message.warning('请先连接服务')
        return
      }
      
      this.joiningSession = session.id
      
      try {
        // 发送加入会话请求
        SocketService.emit('operator-join-session', {
          operatorId: this.operatorId,
          sessionId: session.id
        })
        
        // 等待服务器响应
        await new Promise((resolve, reject) => {
          const timeout = setTimeout(() => {
            reject(new Error('加入会话超时'))
          }, 10000)
          
          const handleJoined = (data) => {
            if (data.sessionId === session.id) {
              clearTimeout(timeout)
              SocketService.off('operator-session-joined', handleJoined)
              SocketService.off('chat-error', handleError)
              resolve(data)
            }
          }
          
          const handleError = (error) => {
            clearTimeout(timeout)
            SocketService.off('operator-session-joined', handleJoined)
            SocketService.off('chat-error', handleError)
            reject(new Error(error.error || '加入会话失败'))
          }
          
          SocketService.on('operator-session-joined', handleJoined)
          SocketService.on('chat-error', handleError)
        })

        
        // 成功加入会话，更新会话状态并打开聊天弹窗
        this.updateSessionStatus(session.id, 'active')
        this.openChatDialog(session)
        
      } catch (error) {
        console.error('加入会话失败:', error)
        this.$message.error(error.message || '加入会话失败')
      } finally {
        this.joiningSession = null
      }
    },
    
    /**
     * 打开聊天弹窗
     */
    openChatDialog(session) {
      if (!this.isConnected) {
        this.$message.warning('请先连接服务')
        return
      }
      
      // 清除未读计数
      this.clearSessionUnreadCount(session.id)
      
      // 设置当前聊天会话并打开弹窗
      this.currentChatSession = session
      this.chatDialogVisible = true
          },
    
    /**
     * 关闭聊天弹窗
     */
    closeChatDialog() {
      this.chatDialogVisible = false
      this.currentChatSession = null
    },
    
    /**
     * 处理聊天弹窗关闭事件
     */
    handleChatDialogClose() {
      this.closeChatDialog()
    },
    
    /**
     * 处理会话更新事件
     */
    handleSessionUpdated(updatedSession) {
      // 更新会话列表中的会话信息
      const sessionIndex = this.allSessions.findIndex(s => s.id === updatedSession.id)
      if (sessionIndex !== -1) {
        this.$set(this.allSessions, sessionIndex, {
          ...this.allSessions[sessionIndex],
          ...updatedSession
        })
      }
      
      // 更新当前聊天会话
      if (this.currentChatSession && this.currentChatSession.id === updatedSession.id) {
        this.currentChatSession = {
          ...this.currentChatSession,
          ...updatedSession
        }
      }
    },
    
    /**
     * 添加或更新会话
     */
    addOrUpdateSession(data, status = null) {
      const sessionData = {
        id: data.sessionId,
        userName: data.userName || '访客',
        userId: data.userId,
        createdAt: data.timestamp || new Date(),
        updatedAt: data.timestamp || new Date(),
        lastMessage: data.message || this.getDefaultMessage(status || 'waiting'),
        status: status || data.status || 'waiting',
        unreadCount: 1 // 新会话默认有1条未读消息
      }
      
      const existingIndex = this.allSessions.findIndex(s => s.id === sessionData.id)
      
      if (existingIndex !== -1) {
        // 更新现有会话
        const updatedSession = {
          ...this.allSessions[existingIndex],
          ...sessionData,
          unreadCount: (this.allSessions[existingIndex].unreadCount || 0) + 1
        }
        this.$set(this.allSessions, existingIndex, updatedSession)
      } else {
        // 添加新会话到顶部
        this.allSessions.unshift(sessionData)
        console.log(`➕ 添加新会话 ${sessionData.id.slice(-8)}`)
      }
    },
    
    /**
     * 更新会话状态
     */
    updateSessionStatus(sessionId, status) {
      const session = this.allSessions.find(s => s.id === sessionId)
      if (session) {
        session.status = status
        session.updatedAt = new Date()
        if (status === 'active') {
          session.unreadCount = 0
        }
      }
    },
    
    /**
     * 更新会话消息
     */
    updateSessionMessage(data) {
      console.log('🔄 开始更新会话消息:', {
        sessionId: data.sessionId?.slice(-8),
        content: data.content?.substring(0, 30),
        timestamp: data.timestamp
      })
      
      const sessionIndex = this.allSessions.findIndex(s => s.id === data.sessionId)
      
      if (sessionIndex !== -1) {
        // 更新现有会话
        const session = this.allSessions[sessionIndex]
        console.log(`📝 找到现有会话 ${session.id.slice(-8)}, 当前未读数: ${session.unreadCount || 0}`)
        
        const updatedSession = {
          ...session,
          lastMessage: data.content,
          updatedAt: new Date(data.timestamp || new Date())
        }
        
        // 增加未读计数（除非是当前正在聊天的会话）
        if (!this.isCurrentChatSession(session.id)) {
          updatedSession.unreadCount = (session.unreadCount || 0) + 1
          console.log(`📢 会话 ${session.id.slice(-8)} 未读消息数更新为: ${updatedSession.unreadCount}`)
        } else {
          console.log(`💬 当前聊天会话 ${session.id.slice(-8)}, 不增加未读计数`)
        }
        
        // 使用 Vue.set 更新数组元素以确保响应式
        this.$set(this.allSessions, sessionIndex, updatedSession)
        
        // 移到列表顶部
        if (sessionIndex > 0) {
          this.allSessions.splice(sessionIndex, 1)
          this.allSessions.unshift(updatedSession)
          console.log(`⬆️ 会话 ${session.id.slice(-8)} 已移至列表顶部`)
        }
        
        // 强制触发视图更新
        this.$nextTick(() => {
          this.$forceUpdate()
        })
        
        console.log(`✅ 会话 ${data.sessionId.slice(-8)} 更新完成`)
      } else {
        // 如果会话不存在，创建新会话
        console.log('❓ 会话不存在，创建新会话:', data.sessionId?.slice(-8))
        this.addOrUpdateSession({
          sessionId: data.sessionId,
          userId: data.userId,
          userName: data.userName || '访客',
          timestamp: data.timestamp,
          message: data.content
        }, 'waiting')
      }
    },
    
    /**
     * 检查是否是当前聊天会话
     */
    isCurrentChatSession(sessionId) {
      // 通过父组件传递的当前聊天会话ID来判断
      return this.currentChatSessionId === sessionId
    },
    
    /**
     * 清除会话未读计数
     */
    clearSessionUnreadCount(sessionId) {
      const sessionIndex = this.allSessions.findIndex(s => s.id === sessionId)
      if (sessionIndex !== -1 && this.allSessions[sessionIndex].unreadCount > 0) {
        const updatedSession = {
          ...this.allSessions[sessionIndex],
          unreadCount: 0
        }
        this.$set(this.allSessions, sessionIndex, updatedSession)
        console.log(`🔄 清除会话 ${sessionId.slice(-8)} 的未读计数`)
      }
    },
    
    /**
     * 加载所有会话（包括活跃和历史）
     */
    async loadAllSessions() {
      this.loading = true
      
      try {
        console.log('🔍 开始加载所有会话')
        
        let allSessions = []
        
        // 获取活跃会话（等待中和进行中的会话）
        // try {
        //   const activeResponse = await ApiService.getActiveSessions({ limit: 50 })
        //   if (activeResponse.success && activeResponse.data) {
        //     // 处理活跃会话数据
        //     const activeSessions = activeResponse.data.sessions || activeResponse.data || []
        //     allSessions = allSessions.concat(activeSessions.map(session => ({
        //       ...session,
        //       unreadCount: session.unreadCount || 0
        //     })))
        //     console.log(`✅ 加载了 ${activeSessions.length} 个活跃会话`)
        //   }
        // } catch (error) {
        //   console.warn('获取活跃会话失败，尝试使用待处理会话接口:', error.message)
          
        //   // 如果活跃会话接口不存在，尝试使用待处理会话接口
        //   try {
        //     const pendingResponse = await ApiService.getPendingSessions({ limit: 50 })
        //     if (pendingResponse.success && pendingResponse.data) {
        //       const pendingSessions = pendingResponse.data.sessions || pendingResponse.data || []
        //       allSessions = allSessions.concat(pendingSessions.map(session => ({
        //         ...session,
        //         unreadCount: session.unreadCount || 0
        //       })))
        //       console.log(`✅ 加载了 ${pendingSessions.length} 个待处理会话`)
        //     }
        //   } catch (pendingError) {
        //     console.warn('获取待处理会话也失败:', pendingError.message)
        //   }
        // }
        
        // 获取历史会话
        try {
          const historyParams = {
            page: this.pagination.page,
            limit: this.pagination.limit,
            keyword: this.searchKeyword || undefined
          }
          
          const historyResponse = await ApiService.getAllHistorySessions(historyParams)
          if (historyResponse.success && historyResponse.data) {
            const historySessions = historyResponse.data.sessions || []
            allSessions = allSessions.concat(historySessions.map(session => ({
              ...session,
              unreadCount: 0 // 历史会话默认无未读
            })))
            
            this.pagination.total = historyResponse.data.pagination?.total || 0
            console.log(`✅ 加载了 ${historySessions.length} 个历史会话`)
          }
        } catch (error) {
          console.warn('获取历史会话失败:', error.message)
        }
        
        // 去重（以sessionId为准，优先保留活跃状态的会话）
        const sessionMap = new Map()
        allSessions.forEach(session => {
          const existingSession = sessionMap.get(session.id)
          if (!existingSession || 
              (session.status === 'waiting' || session.status === 'active') && 
              (existingSession.status !== 'waiting' && existingSession.status !== 'active')) {
            sessionMap.set(session.id, session)
          }
        })
        
        this.allSessions = Array.from(sessionMap.values())
        
        console.log(`✅ 成功加载 ${this.allSessions.length} 个会话`)
        
      } catch (error) {
        console.error('加载会话失败:', error)
        this.$message.error('加载会话失败: ' + error.message)
      } finally {
        this.loading = false
      }
    },
    
    /**
     * 处理分页大小变化
     */
    handleSizeChange(val) {
      this.pagination.limit = val
      this.pagination.page = 1
      this.loadAllSessions()
    },
    
    /**
     * 处理页码变化
     */
    handleCurrentChange(val) {
      this.pagination.page = val
      this.loadAllSessions()
    },
    
    /**
     * 获取会话样式类
     */
    getSessionClass(session) {
      return {
        'waiting': session.status === 'waiting',
        'active': session.status === 'active',
        'history': ['completed', 'closed', 'timeout', 'cancelled'].includes(session.status),
        'has-unread': session.unreadCount > 0
      }
    },
    
    /**
     * 获取状态指示器样式类
     */
    getStatusClass(status) {
      const classMap = {
        'waiting': 'status-waiting',
        'active': 'status-active',
        'completed': 'status-completed',
        'closed': 'status-closed',
        'timeout': 'status-timeout',
        'cancelled': 'status-cancelled'
      }
      return classMap[status] || 'status-closed'
    },
    
    /**
     * 获取默认消息
     */
    getDefaultMessage(status) {
      const messageMap = {
        'waiting': '用户发起了聊天请求',
        'active': '对话进行中',
        'completed': '对话已完成',
        'closed': '对话已关闭',
        'timeout': '对话超时',
        'cancelled': '对话已取消'
      }
      return messageMap[status] || '暂无消息'
    },
    

    
    /**
     * 获取状态标签类型
     */
    getStatusTagType(status) {
      const typeMap = {
        'waiting': 'warning',
        'active': 'success',
        'completed': 'success',
        'closed': 'info',
        'timeout': 'warning',
        'cancelled': 'danger'
      }
      return typeMap[status] || 'info'
    },
    
    /**
     * 获取状态文本
     */
    getStatusText(status) {
      const textMap = {
        'waiting': '等待中',
        'active': '进行中',
        'completed': '已完成',
        'closed': '已关闭',
        'timeout': '超时',
        'cancelled': '已取消'
      }
      return textMap[status] || '未知'
    },
    
    /**
     * 格式化时间
     */
    formatTime(time) {
      const date = new Date(time)
      const now = new Date()
      const diff = now - date
      
      if (diff < 60000) { // 1分钟内
        return '刚刚'
      } else if (diff < 3600000) { // 1小时内
        return `${Math.floor(diff / 60000)}分钟前`
      } else if (diff < 86400000) { // 24小时内
        return `${Math.floor(diff / 3600000)}小时前`
      } else {
        return date.toLocaleDateString()
      }
    },
    
    /**
     * 外部调用：清除指定会话的未读计数
     */
    clearUnreadCount(sessionId) {
      this.clearSessionUnreadCount(sessionId)
    },
    
    /**
     * 外部调用：刷新会话列表
     */
    refresh() {
      this.loadAllSessions()
    }
  },
  
  watch: {
    // 监听当前聊天会话ID的变化
    currentChatSessionId(newSessionId, oldSessionId) {
      if (newSessionId && newSessionId !== oldSessionId) {
        // 清除新会话的未读计数
        this.clearSessionUnreadCount(newSessionId)
      }
    }
  },
  
  mounted() {
    // 自动连接
    this.connect()
  },
  
  beforeDestroy() {    
    // 清除事件监听器
    this.removeEventListeners()
    if (this.isConnected) {
      this.disconnect()
    }
  }
}
</script>

<style scoped>
.operator-message-list {
  height: 100vh;
  /* background: #f5f7fa; */
  display: flex;
  flex-direction: column;
}

.header {
  background: #fff;
  padding: 20px 24px;
  border-bottom: 1px solid #e4e7ed;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.title h2 {
  margin: 0 0 4px 0;
  color: #303133;
  font-size: 24px;
}

.title p {
  margin: 0;
  color: #909399;
  font-size: 14px;
}

.operator-info {
  display: flex;
  align-items: center;
  gap: 12px;
}

.search-bar {
  background: #fff;
  padding: 16px 24px;
  border-bottom: 1px solid #e4e7ed;
  display: flex;
  align-items: center;
  gap: 12px;
}

.search-bar .el-input {
  flex: 1;
  max-width: 400px;
}

.session-list {
  /* flex: 1; */
  padding: 20px 24px;
  overflow-y: auto;
  display: flex;
  gap: 20px;
  flex-wrap: wrap;
}

.session-item {
  background: #fff;
  border-radius: 12px;
  padding: 16px;
  margin-bottom: 12px;
  display: flex;
  align-items: center;
  cursor: pointer;
  transition: all 0.3s ease;
  border: 1px solid #e4e7ed;
  position: relative;
  width: 250px;
}

.session-item:hover {
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.08);
  transform: translateY(-2px);
}

.session-item.waiting {
  border-left: 4px solid #e6a23c;
  background: linear-gradient(135deg, #fff9e6 0%, #fff 100%);
}

.session-item.active {
  border-left: 4px solid #67c23a;
  /* background: linear-gradient(135deg, #f0f9ff 0%, #fff 100%); */
}

.session-item.history {
  border-left: 4px solid #909399;
  opacity: 0.9;
}

.session-item.has-unread {
  box-shadow: 0 2px 12px rgba(64, 158, 255, 0.15);
}

.session-avatar {
  position: relative;
  margin-right: 16px;
  flex-shrink: 0;
}

.status-indicator {
  position: absolute;
  bottom: 2px;
  right: 2px;
  width: 14px;
  height: 14px;
  border-radius: 50%;
  border: 3px solid #fff;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.2);
}

.status-waiting {
  background: #e6a23c;
}

.status-active {
  background: #67c23a;
}

.status-completed {
  background: #67c23a;
}

.status-closed {
  background: #909399;
}

.status-timeout {
  background: #e6a23c;
}

.status-cancelled {
  background: #f56c6c;
}

.unread-badge {
  position: absolute;
  top: -6px;
  right: -6px;
  background: #f56c6c;
  color: #fff;
  border-radius: 12px;
  padding: 2px 6px;
  font-size: 11px;
  font-weight: bold;
  min-width: 18px;
  height: 18px;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.3);
  animation: pulse 2s infinite;
}

@keyframes pulse {
  0% {
    transform: scale(1);
  }
  50% {
    transform: scale(1.1);
  }
  100% {
    transform: scale(1);
  }
}

.session-content {
  flex: 1;
  min-width: 0;
}

.session-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
}

.user-name {
  font-weight: 600;
  color: #303133;
  font-size: 15px;
}

.session-time {
  font-size: 12px;
  color: #909399;
}

.session-preview {
  color: #606266;
  font-size: 14px;
  line-height: 1.4;
  margin-bottom: 10px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  max-width: 100%;
}

.session-item.has-unread .session-preview {
  font-weight: 500;
  color: #303133;
}

.session-meta {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
}

.session-id {
  font-size: 11px;
  color: #c0c4cc;
  font-family: 'Monaco', 'Menlo', monospace;
  background: #f5f7fa;
  padding: 2px 6px;
  border-radius: 4px;
}

.message-count {
  font-size: 11px;
  color: #909399;
  background: #f0f2f5;
  padding: 2px 6px;
  border-radius: 4px;
}

.session-actions {
  margin-left: 16px;
  flex-shrink: 0;
}

.empty-state {
  display: flex;
  justify-content: center;
  align-items: center;
  height: 400px;
}

.empty-content {
  text-align: center;
  color: #909399;
}

.empty-content i {
  font-size: 64px;
  margin-bottom: 16px;
  opacity: 0.5;
  color: #c0c4cc;
}

.empty-content h3 {
  margin: 0 0 8px 0;
  color: #303133;
  font-size: 18px;
}

.empty-content p {
  margin: 0 0 20px 0;
  font-size: 14px;
  color: #606266;
}

.loading-state {
  display: flex;
  justify-content: center;
  align-items: center;
  height: 200px;
  color: #909399;
  font-size: 14px;
  gap: 8px;
}

.loading-state i {
  font-size: 18px;
}

.pagination-wrapper {
  background: #fff;
  padding: 16px 24px;
  border-top: 1px solid #e4e7ed;
  display: flex;
  justify-content: center;
}

/* 滚动条样式 */
.session-list::-webkit-scrollbar {
  width: 6px;
}

.session-list::-webkit-scrollbar-track {
  background: #f1f1f1;
  border-radius: 3px;
}

.session-list::-webkit-scrollbar-thumb {
  background: #c1c1c1;
  border-radius: 3px;
}

.session-list::-webkit-scrollbar-thumb:hover {
  background: #a8a8a8;
}

/* 响应式设计 */
@media (max-width: 768px) {
  .header {
    flex-direction: column;
    align-items: flex-start;
    gap: 12px;
    padding: 16px;
  }
  
  .search-bar {
    padding: 12px 16px;
    flex-direction: column;
    align-items: stretch;
    gap: 8px;
  }
  
  .search-bar .el-input {
    max-width: none;
  }
  
  .session-list {
    padding: 16px;
  }
  
  .session-item {
    padding: 12px;
  }
  
  .session-avatar {
    margin-right: 12px;
  }
  
  .session-actions {
    margin-left: 8px;
  }
  
  .pagination-wrapper {
    padding: 12px 16px;
  }
}

/* 聊天弹窗样式 */
.chat-dialog {
  border-radius: 12px;
  overflow: hidden;
}

.chat-dialog .el-dialog__header {
  background: linear-gradient(135deg, #409eff 0%, #66b1ff 100%);
  color: white;
  padding: 20px 24px;
  margin: 0;
}

.chat-dialog .el-dialog__title {
  color: white;
  font-weight: 600;
  font-size: 16px;
}

.chat-dialog .el-dialog__headerbtn {
  top: 20px;
  right: 24px;
}

.chat-dialog .el-dialog__headerbtn .el-dialog__close {
  color: white;
  font-size: 18px;
}

.chat-dialog .el-dialog__headerbtn .el-dialog__close:hover {
  color: rgba(255, 255, 255, 0.8);
}

.chat-dialog .el-dialog__body {
  padding: 0;
  height: 600px;
  overflow: hidden;
}

/* 弹窗动画优化 */
.chat-dialog.el-dialog {
  margin-top: 5vh !important;
  margin-bottom: 5vh !important;
}

/* 响应式弹窗 */
@media (max-width: 768px) {
  .chat-dialog {
    width: 95% !important;
    margin: 2.5vh auto !important;
  }
  
  .chat-dialog .el-dialog__body {
    height: 70vh;
  }
}

/* 暗色主题适配 */
@media (prefers-color-scheme: dark) {
  .operator-message-list {
    /* background: #1a1a1a; */
  }
  
  .header,
  .search-bar,
  .pagination-wrapper {
    background: #2d2d2d;
    border-color: #404040;
  }
  
  .session-item {
    /* background: #2d2d2d; */
    /* border-color: #404040; */
  }
  
  .session-item.waiting {
    /* background: linear-gradient(135deg, #2d2d2d 0%, #2a2a2a 100%); */
  }
  
  .session-item.active {
    /* background: linear-gradient(135deg, #2d2d2d 0%, #2a2a2a 100%); */
  }
  
  .chat-dialog .el-dialog__header {
    background: linear-gradient(135deg, #2d2d2d 0%, #404040 100%);
  }
}
</style>