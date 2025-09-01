<template>
  <div class="operator-panel">
    <!-- 客服状态栏 -->
    <div class="operator-header">
      <div class="operator-info">
        <el-avatar :size="40" :src="operatorAvatar">
          <i class="el-icon-user-solid"></i>
        </el-avatar>
        <div class="operator-details">
          <h3>{{ operatorName }}</h3>
          <el-tag 
            :type="statusTagType" 
            size="small"
            @click="toggleStatus"
            style="cursor: pointer"
          >
            {{ statusText }}
          </el-tag>
        </div>
      </div>
      <div class="operator-actions">
        <el-button 
          size="small" 
          :type="isConnected ? 'danger' : 'primary'"
          @click="toggleConnection"
          :loading="connecting"
        >
          {{ isConnected ? '断开连接' : '连接服务' }}
        </el-button>
      </div>
    </div>

    <!-- 会话通知区域 -->
    <div class="notifications-section">
      <div class="section-header">
        <h4>
          <i class="el-icon-bell"></i>
          待处理会话
          <el-badge :value="pendingSessions.length" :hidden="pendingSessions.length === 0" />
        </h4>
        <el-button 
          size="mini" 
          type="text" 
          @click="refreshPendingSessions"
          :loading="loadingPending"
        >
          刷新
        </el-button>
      </div>
      
      <div class="pending-sessions">
        <div v-if="pendingSessions.length === 0" class="empty-state">
          <i class="el-icon-chat-dot-square"></i>
          <p>暂无待处理会话</p>
        </div>
        
        <div 
          v-for="session in pendingSessions" 
          :key="session.id"
          class="session-notification"
          @click="joinSession(session)"
        >
          <div class="session-info">
            <div class="session-user">
              <i class="el-icon-user"></i>
              <span>{{ session.userName || '访客' }}</span>
            </div>
            <div class="session-time">
              {{ formatTime(session.createdAt) }}
            </div>
          </div>
          <div class="session-preview">
            {{ session.lastMessage || '用户发起了聊天请求' }}
          </div>
          <div class="session-actions">
            <el-button size="mini" type="primary" @click.stop="joinSession(session)">
              接入
            </el-button>
          </div>
        </div>
      </div>
    </div>

    <!-- 活跃会话列表 -->
    <div class="active-sessions-section">
      <div class="section-header">
        <h4>
          <i class="el-icon-chat-line-round"></i>
          活跃会话
          <el-badge :value="activeSessions.length" :hidden="activeSessions.length === 0" />
        </h4>
      </div>
      
      <div class="active-sessions">
        <div v-if="activeSessions.length === 0" class="empty-state">
          <i class="el-icon-chat-dot-round"></i>
          <p>暂无活跃会话</p>
        </div>
        
        <div 
          v-for="session in activeSessions" 
          :key="session.id"
          class="session-item"
          :class="{ active: currentSessionId === session.id }"
          @click="switchToSession(session)"
        >
          <div class="session-info">
            <div class="session-user">
              <i class="el-icon-user"></i>
              <span>{{ session.userName || '访客' }}</span>
            </div>
            <div class="session-time">
              {{ formatTime(session.updatedAt) }}
            </div>
          </div>
          <div class="session-preview">
            {{ session.lastMessage || '暂无消息' }}
          </div>
          <div class="unread-indicator" v-if="session.unreadCount > 0">
            {{ session.unreadCount }}
          </div>
        </div>
      </div>
    </div>

    <!-- 快速回复模板 -->
    <div class="quick-replies-section">
      <div class="section-header">
        <h4>
          <i class="el-icon-chat-dot-square"></i>
          快速回复
        </h4>
      </div>
      
      <div class="quick-replies">
        <el-button 
          v-for="template in quickReplyTemplates" 
          :key="template.id"
          size="small" 
          type="info" 
          plain
          @click="sendQuickReply(template.content)"
          :disabled="!currentSessionId"
        >
          {{ template.title }}
        </el-button>
      </div>
    </div>
  </div>
</template>

<script>
import SocketService from '../services/SocketService'

export default {
  name: 'OperatorPanel',
  data() {
    return {
      // 客服信息
      operatorId: null,
      operatorName: '客服',
      operatorAvatar: '',
      operatorStatus: 'offline', // 'online', 'offline', 'busy'
      
      // 连接状态
      isConnected: false,
      connecting: false,
      
      // 会话数据
      pendingSessions: [],
      activeSessions: [],
      currentSessionId: null,
      
      // 加载状态
      loadingPending: false,
      
      // 快速回复模板
      quickReplyTemplates: [
        { id: 1, title: '问候语', content: '您好！我是客服，有什么可以帮助您的吗？' },
        { id: 2, title: '稍等', content: '请稍等，我来为您处理这个问题。' },
        { id: 3, title: '感谢', content: '感谢您的咨询，还有其他问题吗？' },
        { id: 4, title: '转接', content: '我需要为您转接到专业客服，请稍等。' },
        { id: 5, title: '结束', content: '如果没有其他问题，本次服务就到这里，祝您生活愉快！' }
      ]
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
        
        // 连接Socket服务
        await SocketService.connect()
        this.isConnected = true
        
        // 设置客服在线状态
        this.setOperatorStatus('online')
        
        // 设置事件监听
        this.setupOperatorListeners()
        
        // 加载待处理会话
        await this.loadPendingSessions()
        
        this.$message.success('连接成功')
        
      } catch (error) {
        console.error('连接失败:', error)
        this.$message.error('连接失败，请重试')
      } finally {
        this.connecting = false
      }
    },
    
    /**
     * 断开连接
     */
    async disconnect() {
      try {
        // 设置客服离线状态
        if (this.operatorId) {
          this.setOperatorStatus('offline')
        }
        
        // 断开Socket连接
        SocketService.disconnect()
        this.isConnected = false
        this.operatorStatus = 'offline'
        
        // 清空会话数据
        this.pendingSessions = []
        this.activeSessions = []
        this.currentSessionId = null
        
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
      
      this.operatorStatus = status
      SocketService.emit('operator-status-change', {
        operatorId: this.operatorId,
        status: status
      })
    },
    
    /**
     * 切换客服状态
     */
    toggleStatus() {
      if (!this.isConnected) return
      
      const nextStatus = {
        'online': 'busy',
        'busy': 'online',
        'offline': 'online'
      }
      
      this.setOperatorStatus(nextStatus[this.operatorStatus] || 'online')
    },
    
    /**
     * 设置客服事件监听
     */
    setupOperatorListeners() {
      // 客服状态更新
      SocketService.on('operator-status-updated', (data) => {
        if (data.operatorId === this.operatorId) {
          this.operatorStatus = data.status
        }
      })
      
      // 客服成功加入会话
      SocketService.on('operator-session-joined', (data) => {
        this.currentSessionId = data.sessionId
        this.$message.success(`已加入会话 ${data.sessionId}`)
        
        // 从待处理列表移除，添加到活跃列表
        this.movePendingToActive(data.sessionId)
        
        // 通知父组件切换到聊天界面
        this.$emit('session-joined', data)
      })
      
      // 接收消息
      SocketService.on('message-received', (data) => {
        // 更新会话的最后消息
        this.updateSessionLastMessage(data.sessionId, data.content, data.senderType)
        
        // 如果不是当前会话，增加未读计数
        if (data.sessionId !== this.currentSessionId && data.senderType === 'user') {
          this.incrementUnreadCount(data.sessionId)
        }
        
        // 通知父组件有新消息
        this.$emit('message-received', data)
      })
      
      // 接收消息历史
      SocketService.on('message-history', (data) => {
        this.$emit('message-history', data)
      })
      
      // 用户加入聊天（新的待处理会话）
      SocketService.on('chat-session-created', (data) => {
        this.addPendingSession(data)
        this.$message({
          message: `新用户 ${data.userName || '访客'} 发起聊天请求`,
          type: 'info',
          duration: 3000
        })
      })
      
      // 聊天错误
      SocketService.on('chat-error', (data) => {
        console.error('聊天错误:', data)
        this.$message.error(data.error || '聊天服务出现错误')
      })
      
      // 连接断开
      SocketService.on('disconnected', () => {
        this.isConnected = false
        this.operatorStatus = 'offline'
      })
    },
    
    /**
     * 加载待处理会话
     */
    async loadPendingSessions() {
      this.loadingPending = true
      
      try {
        // 这里应该调用API获取待处理会话
        // 暂时使用模拟数据
        await new Promise(resolve => setTimeout(resolve, 500))
        
        // 实际项目中应该从API获取
        this.pendingSessions = []
        
      } catch (error) {
        console.error('加载待处理会话失败:', error)
        this.$message.error('加载待处理会话失败')
      } finally {
        this.loadingPending = false
      }
    },
    
    /**
     * 刷新待处理会话
     */
    async refreshPendingSessions() {
      await this.loadPendingSessions()
    },
    
    /**
     * 加入会话
     */
    async joinSession(session) {
      if (!this.isConnected) {
        this.$message.warning('请先连接服务')
        return
      }
      
      try {
        SocketService.emit('operator-join-session', {
          operatorId: this.operatorId,
          sessionId: session.id
        })
        
      } catch (error) {
        console.error('加入会话失败:', error)
        this.$message.error('加入会话失败')
      }
    },
    
    /**
     * 切换到指定会话
     */
    switchToSession(session) {
      this.currentSessionId = session.id
      
      // 清除未读计数
      this.clearUnreadCount(session.id)
      
      // 通知父组件切换会话
      this.$emit('session-switched', session)
    },
    
    /**
     * 发送快速回复
     */
    sendQuickReply(content) {
      if (!this.currentSessionId) {
        this.$message.warning('请先选择一个会话')
        return
      }
      
      this.$emit('send-quick-reply', {
        sessionId: this.currentSessionId,
        content: content
      })
    },
    
    /**
     * 添加待处理会话
     */
    addPendingSession(sessionData) {
      const session = {
        id: sessionData.sessionId,
        userName: sessionData.userName || '访客',
        createdAt: sessionData.timestamp || new Date(),
        lastMessage: sessionData.lastMessage || '用户发起了聊天请求'
      }
      
      // 避免重复添加
      if (!this.pendingSessions.find(s => s.id === session.id)) {
        this.pendingSessions.unshift(session)
      }
    },
    
    /**
     * 将待处理会话移动到活跃会话
     */
    movePendingToActive(sessionId) {
      const sessionIndex = this.pendingSessions.findIndex(s => s.id === sessionId)
      if (sessionIndex !== -1) {
        const session = this.pendingSessions.splice(sessionIndex, 1)[0]
        session.unreadCount = 0
        this.activeSessions.unshift(session)
      }
    },
    
    /**
     * 从活跃会话中移除会话
     */
    removeActiveSession(sessionId) {
      const sessionIndex = this.activeSessions.findIndex(s => s.id === sessionId)
      if (sessionIndex !== -1) {
        this.activeSessions.splice(sessionIndex, 1)
      }
      
      // 如果是当前会话，清空当前会话ID
      if (this.currentSessionId === sessionId) {
        this.currentSessionId = null
      }
    },
    
    /**
     * 更新会话最后消息
     */
    updateSessionLastMessage(sessionId, content, senderType) {
      // 更新活跃会话
      const activeSession = this.activeSessions.find(s => s.id === sessionId)
      if (activeSession) {
        activeSession.lastMessage = content
        activeSession.updatedAt = new Date()
        
        // 将会话移到列表顶部
        const index = this.activeSessions.indexOf(activeSession)
        if (index > 0) {
          this.activeSessions.splice(index, 1)
          this.activeSessions.unshift(activeSession)
        }
      }
      
      // 更新待处理会话
      const pendingSession = this.pendingSessions.find(s => s.id === sessionId)
      if (pendingSession) {
        pendingSession.lastMessage = content
      }
    },
    
    /**
     * 增加未读计数
     */
    incrementUnreadCount(sessionId) {
      const session = this.activeSessions.find(s => s.id === sessionId)
      if (session) {
        session.unreadCount = (session.unreadCount || 0) + 1
      }
    },
    
    /**
     * 清除未读计数
     */
    clearUnreadCount(sessionId) {
      const session = this.activeSessions.find(s => s.id === sessionId)
      if (session) {
        session.unreadCount = 0
      }
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
    }
  },
  
  mounted() {
    // 组件挂载时自动连接
    // this.connect()
  },
  
  beforeDestroy() {
    // 组件销毁前断开连接
    if (this.isConnected) {
      this.disconnect()
    }
  }
}
</script>

<style scoped>
.operator-panel {
  width: 320px;
  height: 100vh;
  background: #fff;
  border-right: 1px solid #e4e7ed;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.operator-header {
  padding: 16px;
  border-bottom: 1px solid #e4e7ed;
  background: #f8f9fa;
}

.operator-info {
  display: flex;
  align-items: center;
  margin-bottom: 12px;
}

.operator-details {
  margin-left: 12px;
  flex: 1;
}

.operator-details h3 {
  margin: 0 0 4px 0;
  font-size: 16px;
  color: #303133;
}

.operator-actions {
  display: flex;
  justify-content: flex-end;
}

.notifications-section,
.active-sessions-section,
.quick-replies-section {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-height: 0;
}

.section-header {
  padding: 12px 16px;
  border-bottom: 1px solid #e4e7ed;
  background: #fafafa;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.section-header h4 {
  margin: 0;
  font-size: 14px;
  color: #606266;
  display: flex;
  align-items: center;
  gap: 6px;
}

.pending-sessions,
.active-sessions {
  flex: 1;
  overflow-y: auto;
  padding: 8px;
}

.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 40px 20px;
  color: #909399;
  text-align: center;
}

.empty-state i {
  font-size: 32px;
  margin-bottom: 8px;
  opacity: 0.5;
}

.empty-state p {
  margin: 0;
  font-size: 12px;
}

.session-notification,
.session-item {
  padding: 12px;
  margin-bottom: 8px;
  border: 1px solid #e4e7ed;
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.2s;
  position: relative;
}

.session-notification:hover,
.session-item:hover {
  border-color: #409eff;
  box-shadow: 0 2px 8px rgba(64, 158, 255, 0.1);
}

.session-item.active {
  border-color: #409eff;
  background: #ecf5ff;
}

.session-info {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 6px;
}

.session-user {
  display: flex;
  align-items: center;
  font-size: 14px;
  font-weight: 500;
  color: #303133;
}

.session-user i {
  margin-right: 4px;
  color: #909399;
}

.session-time {
  font-size: 12px;
  color: #909399;
}

.session-preview {
  font-size: 12px;
  color: #606266;
  line-height: 1.4;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  margin-bottom: 8px;
}

.session-actions {
  display: flex;
  justify-content: flex-end;
}

.unread-indicator {
  position: absolute;
  top: 8px;
  right: 8px;
  background: #f56c6c;
  color: white;
  font-size: 10px;
  padding: 2px 6px;
  border-radius: 10px;
  min-width: 16px;
  text-align: center;
}

.quick-replies-section {
  flex: none;
  border-top: 1px solid #e4e7ed;
}

.quick-replies {
  padding: 12px;
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.quick-replies .el-button {
  font-size: 12px;
  padding: 4px 8px;
}

/* 滚动条样式 */
.pending-sessions::-webkit-scrollbar,
.active-sessions::-webkit-scrollbar {
  width: 4px;
}

.pending-sessions::-webkit-scrollbar-track,
.active-sessions::-webkit-scrollbar-track {
  background: #f1f1f1;
}

.pending-sessions::-webkit-scrollbar-thumb,
.active-sessions::-webkit-scrollbar-thumb {
  background: #c1c1c1;
  border-radius: 2px;
}

.pending-sessions::-webkit-scrollbar-thumb:hover,
.active-sessions::-webkit-scrollbar-thumb:hover {
  background: #a8a8a8;
}

/* 响应式设计 */
@media (max-width: 768px) {
  .operator-panel {
    width: 100%;
  }
}
</style>