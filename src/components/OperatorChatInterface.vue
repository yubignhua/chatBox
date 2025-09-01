<template>
  <div class="operator-chat-interface">
    <!-- 聊天头部 -->
    <div class="chat-header">
      <div class="user-info">
        <el-button 
          size="small" 
          type="text" 
          icon="el-icon-arrow-left"
          @click="backToMessageList"
        >
          返回消息列表
        </el-button>
        <div class="user-details">
          <el-avatar :size="32">
            <i class="el-icon-user"></i>
          </el-avatar>
          <div class="user-meta">
            <h3>{{ session.userName || '访客' }}</h3>
            <span class="user-id">ID: {{ session.userId || 'unknown' }}</span>
          </div>
        </div>
      </div>
      
      <div class="chat-actions">
        <el-tag :type="sessionStatusType" size="small">
          {{ sessionStatusText }}
        </el-tag>
        <el-tag v-if="isHistoryMode" size="small" type="info">
          已结束
        </el-tag>
        <el-tag v-else-if="session.status === 'waiting'" size="small" type="warning">
          等待接入
        </el-tag>
        <el-tag v-else-if="session.status === 'active'" size="small" type="success">
          进行中
        </el-tag>
        <el-button 
          v-if="canSendMessage"
          size="small" 
          type="danger" 
          @click="endSession"
          :loading="ending"
        >
          结束对话
        </el-button>
      </div>
    </div>

    <!-- 消息区域 -->
    <div class="messages-container" ref="messagesContainer">
      <div class="messages-list">
        <!-- 历史消息 -->
        <div v-if="loadingHistory" class="loading-history">
          <el-loading text="加载历史消息..."></el-loading>
        </div>
        
        <!-- 消息列表 -->
        <div 
          v-for="message in messages" 
          :key="message.id"
          class="message-item"
          :class="{ 
            'message-user': message.senderType === 'user',
            'message-operator': message.senderType === 'operator',
            'message-system': message.senderType === 'system'
          }"
        >
          <div class="message-avatar" v-if="message.senderType === 'user'">
            <el-avatar :size="32">
              <i class="el-icon-user"></i>
            </el-avatar>
          </div>
          
          <div class="message-content">
            <div class="message-bubble">
              <div class="message-text">{{ message.content }}</div>
              <div class="message-time">
                {{ formatMessageTime(message.createdAt) }}
                <i 
                  v-if="message.senderType === 'operator'" 
                  class="message-status"
                  :class="{
                    'el-icon-check': message.isRead,
                    'el-icon-time': !message.isRead
                  }"
                ></i>
              </div>
            </div>
          </div>
          
          <div class="message-avatar" v-if="message.senderType === 'operator'">
            <el-avatar :size="32" :style="{ background: '#409eff' }">
              <i class="el-icon-service"></i>
            </el-avatar>
          </div>
        </div>
        
        <!-- 输入指示器 -->
        <div v-if="userTyping" class="typing-indicator">
          <div class="typing-avatar">
            <el-avatar :size="24">
              <i class="el-icon-user"></i>
            </el-avatar>
          </div>
          <div class="typing-content">
            <div class="typing-dots">
              <span></span>
              <span></span>
              <span></span>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- 输入区域 -->
    <div class="input-area" v-if="canSendMessage">
      <!-- 快速回复 -->
      <div class="quick-replies" v-if="showQuickReplies">
        <div class="quick-replies-header">
          <span>快速回复</span>
          <el-button 
            size="mini" 
            type="text" 
            @click="showQuickReplies = false"
            icon="el-icon-close"
          ></el-button>
        </div>
        <div class="quick-replies-list">
          <el-button 
            v-for="template in quickReplyTemplates" 
            :key="template.id"
            size="small" 
            type="info" 
            plain
            @click="useQuickReply(template.content)"
          >
            {{ template.title }}
          </el-button>
        </div>
      </div>
      
      <!-- 输入框 -->
      <div class="message-input">
        <div class="input-tools">
          <el-button 
            size="small" 
            type="text" 
            @click="showQuickReplies = !showQuickReplies"
            icon="el-icon-chat-dot-square"
          >
            快速回复
          </el-button>
        </div>
        
        <div class="input-wrapper">
          <el-input
            v-model="newMessage"
            type="textarea"
            :rows="3"
            placeholder="输入消息..."
            @keydown.enter.exact="handleEnterKey"
            @keydown.ctrl.enter.exact="sendMessage"
            @input="handleTyping"
            ref="messageInput"
          ></el-input>
          
          <div class="input-actions">
            <div class="input-hint">
              <span>Enter 换行，Ctrl+Enter 发送</span>
            </div>
            <el-button 
              type="primary" 
              @click="sendMessage"
              :disabled="!newMessage.trim()"
              :loading="sending"
            >
              发送
            </el-button>
          </div>
        </div>
      </div>
    </div>
    
    <!-- 会话状态提示 -->
    <div class="session-notice" v-if="!canSendMessage">
      <div class="session-notice-content">
        <i class="el-icon-document" v-if="isHistoryMode"></i>
        <i class="el-icon-time" v-else-if="session.status === 'waiting'"></i>
        <span v-if="isHistoryMode">这是一个已结束的会话记录，无法发送新消息</span>
        <span v-else-if="session.status === 'waiting'">用户正在等待客服接入，请先接入会话</span>
        <el-button 
          v-if="session.status === 'waiting'"
          size="small" 
          type="primary" 
          @click="joinWaitingSession"
          :loading="joiningSession"
        >
          接入会话
        </el-button>
      </div>
    </div>
  </div>
</template>

<script>
import SocketService from '../services/SocketService'

export default {
  name: 'OperatorChatInterface',
  
  props: {
    session: {
      type: Object,
      required: true
    },
    operatorId: {
      type: String,
      required: true
    }
  },
  
  data() {
    return {
      // 消息数据
      messages: [],
      newMessage: '',
      
      // 状态
      loadingHistory: false,
      sending: false,
      ending: false,
      userTyping: false,
      joiningSession: false,
      
      // UI状态
      showQuickReplies: false,
      
      // 输入状态
      typingTimer: null,
      
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
    // 是否为历史会话查看模式（只有真正关闭的会话才是只读的）
    isHistoryMode() {
      // 如果明确标记为历史模式，则为只读
      if (this.session.isHistory === true) {
        return true
      }
      
      // 只有这些状态的会话才是真正关闭的，不能继续对话
      const closedStatuses = ['completed', 'closed', 'timeout', 'cancelled']
      return closedStatuses.includes(this.session.status)
    },
    
    // 是否可以发送消息
    canSendMessage() {
      return !this.isHistoryMode && this.session.status !== 'waiting'
    },
    
    sessionStatusType() {
      const typeMap = {
        'waiting': 'warning',
        'active': 'success',
        'closed': 'info',
        'completed': 'success',
        'timeout': 'warning',
        'cancelled': 'danger'
      }
      return typeMap[this.session.status] || 'info'
    },
    
    sessionStatusText() {
      const textMap = {
        'waiting': '等待中',
        'active': '进行中',
        'closed': '已结束',
        'completed': '已完成',
        'timeout': '超时结束',
        'cancelled': '已取消'
      }
      return textMap[this.session.status] || '未知'
    }
  },
  
  methods: {
    /**
     * 初始化聊天界面
     */
    async initChat() {
      console.log('初始化聊天界面, 会话ID:', this.session.id, '客服ID:', this.operatorId, '历史模式:', this.isHistoryMode)
      
      if (this.isHistoryMode) {
        // 历史会话模式，直接加载消息，不需要Socket连接
        await this.loadMessageHistory()
      } else {
        // 活跃会话模式，需要Socket连接
        this.setupEventListeners()
        
        // 检查Socket连接状态
        if (SocketService.isSocketConnected()) {
          console.log('Socket已连接，确保客服加入会话')
          await this.ensureOperatorJoinedSession()
          await this.loadMessageHistory()
        } else {
          console.log('Socket未连接，尝试连接...')
          this.messages = []
          
          try {
            // 尝试连接Socket
            await SocketService.connect()
            console.log('Socket连接成功，确保客服加入会话')
            await this.ensureOperatorJoinedSession()
            await this.loadMessageHistory()
          } catch (error) {
            console.error('Socket连接失败:', error)
            this.$message.error('连接服务器失败，请刷新页面重试')
            
            // 监听连接状态变化作为备用方案
            const checkConnection = () => {
              if (SocketService.isSocketConnected()) {
                console.log('Socket重连成功，确保客服加入会话')
                this.ensureOperatorJoinedSession().then(() => {
                  this.loadMessageHistory()
                })
                SocketService.off('connected', checkConnection)
              }
            }
            SocketService.on('connected', checkConnection)
          }
        }
      }
      
      // 滚动到底部
      this.$nextTick(() => {
        this.scrollToBottom()
      })
      
      // 聚焦输入框（仅在非历史模式下）
      if (!this.isHistoryMode) {
        this.$nextTick(() => {
          if (this.$refs.messageInput) {
            this.$refs.messageInput.focus()
          }
        })
      }
    },
    
    /**
     * 确保客服已加入会话
     */
    async ensureOperatorJoinedSession() {
      // 如果会话状态是等待中，需要先加入会话
      if (this.session.status === 'waiting') {
        console.log('会话状态为等待中，客服需要加入会话')
        
        try {
          // 发送加入会话请求
          SocketService.emit('operator-join-session', {
            operatorId: this.operatorId,
            sessionId: this.session.id
          })
          
          // 等待加入成功的响应
          await new Promise((resolve, reject) => {
            const timeout = setTimeout(() => {
              SocketService.off('operator-session-joined', handleJoined)
              SocketService.off('chat-error', handleError)
              reject(new Error('加入会话超时'))
            }, 10000)
            
            const handleJoined = (data) => {
              if (data.sessionId === this.session.id) {
                clearTimeout(timeout)
                SocketService.off('operator-session-joined', handleJoined)
                SocketService.off('chat-error', handleError)
                console.log('客服成功加入会话:', data)
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
          
        } catch (error) {
          console.error('确保客服加入会话失败:', error)
          this.$message.error('加入会话失败: ' + error.message)
          throw error
        }
      } else {
        // 如果会话已经是活跃状态，直接通知服务器客服在此会话中
        console.log('会话已是活跃状态，通知服务器客服连接信息')
        SocketService.emit('operator-reconnect-session', {
          operatorId: this.operatorId,
          sessionId: this.session.id
        })
      }
    },
    
    /**
     * 设置事件监听
     */
    setupEventListeners() {
      // 接收新消息
      SocketService.on('message-received', (data) => {
        if (data.sessionId === this.session.id) {
          this.addMessage(data)
          this.scrollToBottom()
        }
      })
      
      // 输入指示器
      SocketService.on('typing-indicator', (data) => {
        if (data.sessionId === this.session.id && data.senderType === 'user') {
          this.showUserTyping()
        }
      })
      
      // 消息已读状态
      SocketService.on('message-read', (data) => {
        if (data.sessionId === this.session.id) {
          this.updateMessageReadStatus(data.messageId)
        }
      })
      
      // 客服加入会话成功
      SocketService.on('operator-session-joined', (data) => {
        if (data.sessionId === this.session.id) {
          console.log('客服成功加入会话:', data)
        }
      })
    },
    
    /**
     * 加载历史消息
     */
    async loadMessageHistory() {
      this.loadingHistory = true
      
      try {
        if (this.isHistoryMode) {
          // 历史会话模式，使用API获取消息
          await this.loadHistoryMessagesFromAPI()
        } else {
          // 活跃会话模式，使用Socket获取消息
          await this.loadActiveSessionMessages()
        }
        
      } catch (error) {
        console.error('加载历史消息失败:', error)
        this.$message.error('加载历史消息失败')
        // 如果加载失败，至少显示空的消息列表
        this.messages = []
      } finally {
        this.loadingHistory = false
      }
    },
    
    /**
     * 从API加载历史会话消息
     */
    async loadHistoryMessagesFromAPI() {
      const ApiService = (await import('../services/ApiService')).default
      
      try {
        const response = await ApiService.getSessionMessages(this.session.id, {
          limit: 100,
          page: 1
        })
        
        if (response.success) {
          this.messages = response.data.messages || []
        } else {
          throw new Error(response.message || '获取历史消息失败')
        }
      } catch (error) {
        console.error('从API加载历史消息失败:', error)
        throw error
      }
    },
    
    /**
     * 加载活跃会话消息
     */
    async loadActiveSessionMessages() {
      try {
        // 优先使用API获取消息历史，更可靠
        const ApiService = (await import('../services/ApiService')).default
        
        const response = await ApiService.getSessionMessages(this.session.id, {
          limit: 50,
          offset: 0,
          order: 'ASC'
        })
        
        if (response.success) {
          this.messages = response.data.messages || []
          console.log(`成功加载 ${this.messages.length} 条历史消息`)
        } else {
          throw new Error(response.message || '获取消息历史失败')
        }
      } catch (error) {
        console.error('API加载消息失败，尝试Socket方式:', error)
        
        // API失败时，回退到Socket方式
        if (SocketService.isSocketConnected()) {
          try {
            await this.loadMessagesViaSocket()
          } catch (socketError) {
            console.error('Socket加载消息也失败:', socketError)
            this.messages = []
          }
        } else {
          console.warn('Socket未连接，无法加载历史消息')
          this.messages = []
        }
      }
    },
    
    /**
     * 通过Socket加载消息（备用方案）
     */
    async loadMessagesViaSocket() {
      // 请求历史消息
      SocketService.emit('get-message-history', {
        sessionId: this.session.id,
        limit: 50
      })
      
      // 等待历史消息响应
      await new Promise((resolve, reject) => {
        const timeout = setTimeout(() => {
          SocketService.off('message-history', handleHistory)
          SocketService.off('chat-error', handleError)
          reject(new Error('获取历史消息超时'))
        }, 10000)
        
        const handleHistory = (data) => {
          if (data.sessionId === this.session.id) {
            clearTimeout(timeout)
            this.messages = data.messages || []
            SocketService.off('message-history', handleHistory)
            SocketService.off('chat-error', handleError)
            resolve()
          }
        }
        
        const handleError = (error) => {
          clearTimeout(timeout)
          SocketService.off('message-history', handleHistory)
          SocketService.off('chat-error', handleError)
          reject(new Error(error.error || '获取历史消息失败'))
        }
        
        SocketService.on('message-history', handleHistory)
        SocketService.on('chat-error', handleError)
      })
    },
    
    /**
     * 发送消息
     */
    async sendMessage() {
      if (!this.newMessage.trim() || this.sending) return
      
      // 检查Socket连接状态
      if (!SocketService.isSocketConnected()) {
        this.$message.error('连接已断开，请重新连接')
        return
      }
      
      this.sending = true
      
      try {
        const messageData = {
          sessionId: this.session.id,
          operatorId: this.operatorId, // 使用 operatorId 而不是 senderId
          content: this.newMessage.trim(),
          messageType: 'text'
        }
        
        console.log('发送消息:', messageData)
        
        // 发送消息
        SocketService.emit('operator-send-message', messageData)
        
        // 先不添加到本地消息列表，等待服务器确认后通过 message-received 事件添加
        // 这样可以确保消息的一致性
        
        // 清空输入框
        this.newMessage = ''
        
        // 滚动到底部
        this.scrollToBottom()
        
      } catch (error) {
        console.error('发送消息失败:', error)
        this.$message.error('发送消息失败')
      } finally {
        this.sending = false
      }
    },
    
    /**
     * 处理Enter键
     */
    handleEnterKey(event) {
      if (!event.ctrlKey) {
        event.preventDefault()
        // 普通Enter键换行，这里不做处理，让默认行为发生
        return
      }
    },
    
    /**
     * 处理输入事件
     */
    handleTyping() {
      // 发送输入指示器
      SocketService.emit('operator-typing', {
        sessionId: this.session.id,
        operatorId: this.operatorId
      })
      
      // 清除之前的定时器
      if (this.typingTimer) {
        clearTimeout(this.typingTimer)
      }
      
      // 设置新的定时器，停止输入指示器
      this.typingTimer = setTimeout(() => {
        SocketService.emit('operator-stop-typing', {
          sessionId: this.session.id,
          operatorId: this.operatorId
        })
      }, 1000)
    },
    
    /**
     * 使用快速回复
     */
    useQuickReply(content) {
      this.newMessage = content
      this.showQuickReplies = false
      this.$nextTick(() => {
        if (this.$refs.messageInput) {
          this.$refs.messageInput.focus()
        }
      })
    },
    
    /**
     * 显示用户正在输入
     */
    showUserTyping() {
      this.userTyping = true
      
      // 3秒后自动隐藏
      setTimeout(() => {
        this.userTyping = false
      }, 3000)
      
      this.scrollToBottom()
    },
    
    /**
     * 添加消息
     */
    addMessage(message) {
      this.messages.push(message)
    },
    
    /**
     * 更新消息已读状态
     */
    updateMessageReadStatus(messageId) {
      const message = this.messages.find(m => m.id === messageId)
      if (message) {
        message.isRead = true
      }
    },
    
    /**
     * 滚动到底部
     */
    scrollToBottom() {
      this.$nextTick(() => {
        const container = this.$refs.messagesContainer
        if (container) {
          container.scrollTop = container.scrollHeight
        }
      })
    },
    
    /**
     * 生成消息ID
     */
    generateMessageId() {
      return 'msg_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9)
    },
    
    /**
     * 格式化消息时间
     */
    formatMessageTime(time) {
      const date = new Date(time)
      return date.toLocaleTimeString('zh-CN', { 
        hour: '2-digit', 
        minute: '2-digit' 
      })
    },
    
    /**
     * 结束会话
     */
    async endSession() {
      try {
        await this.$confirm('确定要结束这个对话吗？', '确认', {
          confirmButtonText: '确定',
          cancelButtonText: '取消',
          type: 'warning'
        })
        
        this.ending = true
        
        // 发送结束会话请求
        SocketService.emit('operator-end-session', {
          sessionId: this.session.id,
          operatorId: this.operatorId
        })
        
        this.$message.success('对话已结束')
        
        // 返回消息列表
        this.backToMessageList()
        
      } catch (error) {
        // 用户取消
      } finally {
        this.ending = false
      }
    },
    
    /**
     * 接入等待中的会话
     */
    async joinWaitingSession() {
      if (!SocketService.isSocketConnected()) {
        this.$message.error('连接已断开，请重新连接')
        return
      }
      
      this.joiningSession = true
      
      try {
        // 发送加入会话请求
        SocketService.emit('operator-join-session', {
          operatorId: this.operatorId,
          sessionId: this.session.id
        })
        
        // 等待加入成功的响应
        await new Promise((resolve, reject) => {
          const timeout = setTimeout(() => {
            SocketService.off('operator-session-joined', handleJoined)
            SocketService.off('chat-error', handleError)
            reject(new Error('接入会话超时'))
          }, 10000)
          
          const handleJoined = (data) => {
            if (data.sessionId === this.session.id) {
              clearTimeout(timeout)
              SocketService.off('operator-session-joined', handleJoined)
              SocketService.off('chat-error', handleError)
              console.log('客服成功接入会话:', data)
              
              // 更新会话状态
              this.session.status = 'active'
              this.session.operatorId = this.operatorId
              
              resolve(data)
            }
          }
          
          const handleError = (error) => {
            clearTimeout(timeout)
            SocketService.off('operator-session-joined', handleJoined)
            SocketService.off('chat-error', handleError)
            reject(new Error(error.error || '接入会话失败'))
          }
          
          SocketService.on('operator-session-joined', handleJoined)
          SocketService.on('chat-error', handleError)
        })
        
        this.$message.success('成功接入会话，现在可以开始对话了')
        
      } catch (error) {
        console.error('接入会话失败:', error)
        this.$message.error(error.message || '接入会话失败')
      } finally {
        this.joiningSession = false
      }
    },
    
    /**
     * 返回消息列表
     */
    backToMessageList() {
      this.$emit('back-to-list')
    }
  },
  
  mounted() {
    this.initChat()
  },
  
  beforeDestroy() {
    // 清除定时器
    if (this.typingTimer) {
      clearTimeout(this.typingTimer)
    }
    
    // 移除事件监听
    SocketService.off('message-received')
    SocketService.off('typing-indicator')
    SocketService.off('message-read')
    SocketService.off('message-history')
  }
}
</script>

<style scoped>
.operator-chat-interface {
  height: 100vh;
  display: flex;
  flex-direction: column;
  background: #f5f7fa;
}

.chat-header {
  background: #fff;
  padding: 16px 20px;
  border-bottom: 1px solid #e4e7ed;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.user-info {
  display: flex;
  align-items: center;
  gap: 16px;
}

.user-details {
  display: flex;
  align-items: center;
  gap: 12px;
}

.user-meta h3 {
  margin: 0;
  font-size: 16px;
  color: #303133;
}

.user-id {
  font-size: 12px;
  color: #909399;
}

.chat-actions {
  display: flex;
  align-items: center;
  gap: 12px;
}

.messages-container {
  flex: 1;
  overflow-y: auto;
  background: #f5f7fa;
}

.messages-list {
  padding: 20px;
  min-height: 100%;
}

.loading-history {
  text-align: center;
  padding: 20px;
}

.message-item {
  display: flex;
  margin-bottom: 16px;
  align-items: flex-end;
}

.message-item.message-user {
  justify-content: flex-start;
}

.message-item.message-operator {
  justify-content: flex-end;
}

.message-item.message-system {
  justify-content: center;
}

.message-avatar {
  margin: 0 8px;
}

.message-content {
  max-width: 60%;
}

.message-bubble {
  background: #fff;
  border-radius: 12px;
  padding: 12px 16px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
  position: relative;
}

.message-user .message-bubble {
  background: #fff;
  border-bottom-left-radius: 4px;
}

.message-operator .message-bubble {
  background: #409eff;
  color: #fff;
  border-bottom-right-radius: 4px;
}

.message-system .message-bubble {
  background: #f4f4f5;
  color: #909399;
  font-size: 12px;
  text-align: center;
}

.message-text {
  line-height: 1.4;
  word-wrap: break-word;
}

.message-time {
  font-size: 11px;
  margin-top: 6px;
  opacity: 0.7;
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 4px;
}

.message-user .message-time {
  color: #909399;
}

.message-operator .message-time {
  color: rgba(255, 255, 255, 0.8);
}

.message-status {
  font-size: 10px;
}

.typing-indicator {
  display: flex;
  align-items: flex-end;
  margin-bottom: 16px;
}

.typing-avatar {
  margin-right: 8px;
}

.typing-content {
  background: #fff;
  border-radius: 12px;
  border-bottom-left-radius: 4px;
  padding: 12px 16px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
}

.typing-dots {
  display: flex;
  gap: 4px;
}

.typing-dots span {
  width: 6px;
  height: 6px;
  background: #c0c4cc;
  border-radius: 50%;
  animation: typing 1.4s infinite ease-in-out;
}

.typing-dots span:nth-child(1) {
  animation-delay: -0.32s;
}

.typing-dots span:nth-child(2) {
  animation-delay: -0.16s;
}

@keyframes typing {
  0%, 80%, 100% {
    transform: scale(0.8);
    opacity: 0.5;
  }
  40% {
    transform: scale(1);
    opacity: 1;
  }
}

.input-area {
  background: #fff;
  border-top: 1px solid #e4e7ed;
}

.quick-replies {
  border-bottom: 1px solid #e4e7ed;
  padding: 12px 20px;
}

.quick-replies-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
  font-size: 12px;
  color: #606266;
}

.quick-replies-list {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.quick-replies-list .el-button {
  font-size: 12px;
  padding: 4px 8px;
}

.message-input {
  padding: 16px 20px;
}

.input-tools {
  margin-bottom: 8px;
}

.input-wrapper {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.input-actions {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.input-hint {
  font-size: 12px;
  color: #909399;
}

/* 滚动条样式 */
.messages-container::-webkit-scrollbar {
  width: 6px;
}

.messages-container::-webkit-scrollbar-track {
  background: #f1f1f1;
}

.messages-container::-webkit-scrollbar-thumb {
  background: #c1c1c1;
  border-radius: 3px;
}

.messages-container::-webkit-scrollbar-thumb:hover {
  background: #a8a8a8;
}

/* 会话状态提示样式 */
.session-notice {
  background: #f4f4f5;
  border-top: 1px solid #e4e7ed;
  padding: 16px 20px;
  text-align: center;
}

.session-notice-content {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12px;
  color: #909399;
  font-size: 14px;
}

.session-notice-content i {
  font-size: 16px;
}

.session-notice-content .el-button {
  margin-left: 8px;
}

/* 响应式设计 */
@media (max-width: 768px) {
  .chat-header {
    padding: 12px 16px;
  }
  
  .user-info {
    gap: 8px;
  }
  
  .messages-list {
    padding: 16px;
  }
  
  .message-content {
    max-width: 80%;
  }
  
  .message-input {
    padding: 12px 16px;
  }
  
  .history-notice {
    padding: 12px 16px;
  }
}
</style>