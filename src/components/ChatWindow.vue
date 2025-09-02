<template>
  <div class="chat-window">
    <div class="chat-header">
      <div class="chat-title">
        <i class="el-icon-chat-dot-round"></i>
        <span>客服聊天</span>
      </div>
      <div class="chat-status">
        <OnlineStatus :is-connected="isConnected" :operator-online="operatorOnline" />
      </div>
    </div>

    <div class="chat-body" ref="chatBody">
      <div class="messages-container" ref="messagesContainer">
        <div v-if="messages.length === 0" class="empty-messages">
          <i class="el-icon-chat-dot-square"></i>
          <p>开始对话吧！我们的客服将为您提供帮助。</p>
        </div>
        
        <MessageItem
          v-for="message in messages"
          :key="message.id"
          :message="message"
          :is-own-message="message.senderType === 'user'"
        />
        
        <div v-if="isTyping" class="typing-indicator">
          <div class="typing-dots">
            <span></span>
            <span></span>
            <span></span>
          </div>
          <span class="typing-text">客服正在输入...</span>
        </div>
      </div>
    </div>

    <div class="chat-footer">
      <div class="message-input-container">
        <el-input
          v-model="newMessage"
          type="textarea"
          :rows="2"
          placeholder="请输入您的消息..."
          :disabled="!isConnected"
          @keydown.enter.exact="handleEnterKey"
          @input="handleTyping"
          resize="none"
          maxlength="500"
          show-word-limit
        />
        <div class="input-actions">
          <el-button
            type="primary"
            size="small"
            :disabled="!canSendMessage"
            :loading="sending"
            @click="sendMessage"
          >
            <i class="el-icon-s-promotion"></i>
            发送
          </el-button>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import MessageItem from './MessageItem.vue'
import OnlineStatus from './OnlineStatus.vue'
import SocketService from '../services/SocketService'

export default {
  name: 'ChatWindow',
  components: {
    MessageItem,
    OnlineStatus
  },
  data() {
    return {
      messages: [],
      newMessage: '',
      isConnected: false,
      operatorOnline: false,
      isTyping: false,
      sending: false,
      sessionId: null,
      userId: null,
      typingTimer: null
    }
  },
  computed: {
    canSendMessage() {
      return this.isConnected && 
             this.newMessage.trim().length > 0 && 
             !this.sending
    }
  },
  methods: {
    /**
     * 初始化聊天会话
     */
    async initializeChat() {
      try {
        // 生成用户ID（实际项目中应该从认证系统获取）
        this.userId = this.generateUserId()
        
        // 连接Socket服务
        await SocketService.connect()
        this.isConnected = true
        
        // 加入聊天
        SocketService.joinChat(this.userId, {
          name: '访客',
          timestamp: new Date().toISOString()
        })
        
        // 设置聊天事件监听
        this.setupChatListeners()
        
      } catch (error) {
        console.error('初始化聊天失败:', error)
        this.$message.error('连接聊天服务失败，请刷新页面重试')
      }
    },
    
    /**
     * 设置聊天事件监听
     */
    setupChatListeners() {
      SocketService.onChatEvents({
        onSessionCreated: (data) => {
          this.sessionId = data.sessionId
          this.addSystemMessage('聊天会话已创建，请等待客服接入...')
          console.log('Chat session created:', data)
        },
        
        onMessageReceived: (data) => {
          // 避免重复显示自己发送的消息
          if (data.senderId !== this.userId || data.senderType !== 'user') {
            this.addMessage({
              id: data.id || this.generateMessageId(),
              content: data.content,
              senderType: data.senderType,
              senderId: data.senderId,
              timestamp: data.timestamp || new Date().toISOString(),
              isRead: false
            })
            this.scrollToBottom()
          }
        },
        
        onOperatorJoined: (data) => {
          this.operatorOnline = true
          this.addSystemMessage(`客服 ${data.operatorName || '客服'} 已加入对话`)
        },
        
        onOperatorStatusChanged: (data) => {
          this.operatorOnline = data.status === 'online'
        },
        
        onTypingIndicator: (data) => {
          if (data.senderType === 'operator') {
            this.showTypingIndicator()
          }
        },

        onMessageHistory: (data) => {
          console.log('Received message history:', data)
          if (data.messages && data.messages.length > 0) {
            // 清空现有消息，加载历史消息
            this.messages = []
            data.messages.forEach(msg => {
              this.addMessage({
                id: msg.id,
                content: msg.content,
                senderType: msg.senderType,
                senderId: msg.senderId,
                timestamp: msg.createdAt || msg.timestamp,
                isRead: msg.isRead
              })
            })
            this.scrollToBottom()
          }
        },

        onChatError: (data) => {
          console.error('Chat error:', data)
          this.$message.error(data.error || '聊天服务出现错误')
        }
      })
      
      // 监听连接状态变化
      SocketService.on('connected', () => {
        this.isConnected = true
      })
      
      SocketService.on('disconnected', () => {
        this.isConnected = false
        this.operatorOnline = false
      })
    },
    
    /**
     * 发送消息
     */
    async sendMessage() {
      if (!this.canSendMessage) return
      
      const messageContent = this.newMessage.trim()
      this.sending = true
      
      try {
        // 创建消息对象
        const message = {
          id: this.generateMessageId(),
          sessionId: this.sessionId,
          content: messageContent,
          senderType: 'user',
          senderId: this.userId,
          timestamp: new Date().toISOString()
        }
        
        // 立即显示消息（乐观更新）
        this.addMessage(message)
        
        // 发送到服务器
        SocketService.sendMessage({
          sessionId: this.sessionId,
          content: messageContent,
          messageType: 'text'
        })
        
        // 清空输入框
        this.newMessage = ''
        this.scrollToBottom()
        
      } catch (error) {
        console.error('发送消息失败:', error)
        this.$message.error('消息发送失败，请重试')
      } finally {
        this.sending = false
      }
    },
    
    /**
     * 处理回车键发送
     */
    handleEnterKey(event) {
      if (!event.shiftKey) {
        event.preventDefault()
        this.sendMessage()
      }
    },
    
    /**
     * 处理输入事件（显示正在输入状态）
     */
    handleTyping() {
      if (this.sessionId && this.isConnected) {
        // 清除之前的定时器
        if (this.typingTimer) {
          clearTimeout(this.typingTimer)
        }
        
        // 发送正在输入事件
        SocketService.userTyping(this.sessionId)
        
        // 设置定时器，停止输入状态
        this.typingTimer = setTimeout(() => {
          // 可以发送停止输入事件
        }, 1000)
      }
    },
    
    /**
     * 添加消息到列表
     */
    addMessage(message) {
      this.messages.push(message)
      this.$nextTick(() => {
        this.scrollToBottom()
      })
    },
    
    /**
     * 添加系统消息
     */
    addSystemMessage(content) {
      this.addMessage({
        id: this.generateMessageId(),
        content,
        senderType: 'system',
        senderId: 'system',
        timestamp: new Date().toISOString(),
        isRead: true
      })
    },
    
    /**
     * 显示正在输入指示器
     */
    showTypingIndicator() {
      this.isTyping = true
      this.scrollToBottom()
      
      // 3秒后自动隐藏
      setTimeout(() => {
        this.isTyping = false
      }, 3000)
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
     * 生成用户ID
     */
    generateUserId() {
      return 'user_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9)
    },
    
    /**
     * 生成消息ID
     */
    generateMessageId() {
      return 'msg_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9)
    }
  },
  
  async mounted() {
    await this.initializeChat()
  },
  
  beforeDestroy() {
    // 清理定时器
    if (this.typingTimer) {
      clearTimeout(this.typingTimer)
    }
    
    // 断开Socket连接
    if (this.isConnected) {
      SocketService.disconnect()
    }
  }
}
</script>

<style scoped>
.chat-window {
  display: flex;
  flex-direction: column;
  height: 90vh;
  max-width: 800px;
  margin: 0 auto;
  border: 1px solid #e4e7ed;
  border-radius: 8px;
  background: #fff;
  box-shadow: 0 2px 12px 0 rgba(0, 0, 0, 0.1);
}

.chat-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px 20px;
  background: #409eff;
  color: white;
  border-radius: 8px 8px 0 0;
}

.chat-title {
  display: flex;
  align-items: center;
  font-size: 16px;
  font-weight: 500;
}

.chat-title i {
  margin-right: 8px;
  font-size: 18px;
}

.chat-body {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.messages-container {
  flex: 1;
  padding: 16px;
  overflow-y: auto;
  background: #f8f9fa;
}

.empty-messages {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100%;
  color: #909399;
  text-align: center;
}

.empty-messages i {
  font-size: 48px;
  margin-bottom: 16px;
  opacity: 0.5;
}

.empty-messages p {
  margin: 0;
  font-size: 14px;
}

.typing-indicator {
  display: flex;
  align-items: center;
  margin: 8px 0;
  padding: 8px 12px;
  background: #e4e7ed;
  border-radius: 18px;
  max-width: 200px;
}

.typing-dots {
  display: flex;
  margin-right: 8px;
}

.typing-dots span {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: #909399;
  margin: 0 1px;
  animation: typing 1.4s infinite ease-in-out;
}

.typing-dots span:nth-child(1) {
  animation-delay: -0.32s;
}

.typing-dots span:nth-child(2) {
  animation-delay: -0.16s;
}

.typing-text {
  font-size: 12px;
  color: #606266;
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

.chat-footer {
  padding: 16px;
  border-top: 1px solid #e4e7ed;
  background: #fff;
  border-radius: 0 0 8px 8px;
}

.message-input-container {
  position: relative;
}

.input-actions {
  display: flex;
  justify-content: flex-end;
  margin-top: 8px;
}

/* 响应式设计 */
@media (max-width: 768px) {
  .chat-window {
    height: 80vh;
    max-width: 100%;
    border-radius: 0;
    border: none;
  }
  
  .chat-header {
    border-radius: 0;
  }
  
  .chat-footer {
    border-radius: 0;
  }
}

/* 滚动条样式 */
.messages-container::-webkit-scrollbar {
  width: 6px;
}

.messages-container::-webkit-scrollbar-track {
  background: #f1f1f1;
  border-radius: 3px;
}

.messages-container::-webkit-scrollbar-thumb {
  background: #c1c1c1;
  border-radius: 3px;
}

.messages-container::-webkit-scrollbar-thumb:hover {
  background: #a8a8a8;
}
</style>