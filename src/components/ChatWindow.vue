<template>
  <div class="chat-view-wrapper">
    <div class="chat-window">
      <div class="chat-header">
        <div class="chat-title">
          <i class="el-icon-chat-dot-round"></i>
          <span>智能客服中心</span>
        </div>
        <div class="chat-status">
          <OnlineStatus
            :is-connected="isConnected"
            :operator-online="operatorOnline"
          />
        </div>
      </div>
      <div style="display: flex; height: 77%">
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
              <div class="typing-bubble">
                <div class="typing-dots">
                  <span></span>
                  <span></span>
                  <span></span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div class="service-panel-container">
          <ServicePanel />
        </div>
      </div>

      <div class="chat-footer">
        <div class="input-toolbar">
          <button title="表情"><i class="el-icon-sunrise-1"></i></button>
          <button title="图片"><i class="el-icon-picture-outline"></i></button>
          <button title="文件"><i class="el-icon-folder-opened"></i></button>
        </div>
        <div class="message-input-wrapper">
          <el-input
            v-model="newMessage"
            type="textarea"
            :rows="1"
            placeholder="请输入您的问题..."
            :disabled="!isConnected"
            @keydown.enter.exact="handleEnterKey"
            @input="handleTyping"
            resize="none"
            maxlength="500"
            class="chat-input"
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
            </el-button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import MessageItem from './MessageItem.vue'
import OnlineStatus from './OnlineStatus.vue'
import SocketService from '../services/SocketService'
import ServicePanel from './ServicePanel.vue'

export default {
  name: 'ChatWindow',
  components: {
    MessageItem,
    OnlineStatus,
    ServicePanel,
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
      typingTimer: null,
    }
  },
  computed: {
    canSendMessage() {
      return (
        this.isConnected && this.newMessage.trim().length > 0 && !this.sending
      )
    },
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
          timestamp: new Date().toISOString(),
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
              isRead: false,
            })
            this.scrollToBottom()
          }
        },

        onOperatorJoined: (data) => {
          this.operatorOnline = true
          this.addSystemMessage(
            `客服 ${data.operatorName || '客服'} 已加入对话`
          )
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
            data.messages.forEach((msg) => {
              this.addMessage({
                id: msg.id,
                content: msg.content,
                senderType: msg.senderType,
                senderId: msg.senderId,
                timestamp: msg.createdAt || msg.timestamp,
                isRead: msg.isRead,
              })
            })
            this.scrollToBottom()
          }
        },

        onChatError: (data) => {
          console.error('Chat error:', data)
          this.$message.error(data.error || '聊天服务出现错误')
        },
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
          timestamp: new Date().toISOString(),
        }

        // 立即显示消息（乐观更新）
        this.addMessage(message)

        // 发送到服务器
        SocketService.sendMessage({
          sessionId: this.sessionId,
          content: messageContent,
          messageType: 'text',
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
        isRead: true,
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
      return (
        'user_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9)
      )
    },

    /**
     * 生成消息ID
     */
    generateMessageId() {
      return 'msg_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9)
    },
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
  },
}
</script>

<style scoped>
@import url('https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css');

.chat-view-wrapper {
  display: flex;
  width: 100%;
  height: 90vh;
  max-width: 1200px;
  margin: auto;
  border-radius: 1rem;
  box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1),
    0 10px 10px -5px rgba(0, 0, 0, 0.04);
  overflow: hidden;
  font-family: 'Inter', system-ui, sans-serif;
  animation: fadeIn 0.3s ease forwards;
}

.chat-window {
  flex: 1;
  display: flex;
  flex-direction: column;
  background: #fff;
  border-right: 1px solid #e4e7ed;
  min-width: 0; /* Important for flexbox shrinking */
}

.service-panel-container {
  width: 268px;
  flex-shrink: 0;
  background-color: #f8f9fa;
}

@keyframes fadeIn {
  from {
    opacity: 0;
    transform: translateY(10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.chat-header {
  background: linear-gradient(to right, #165dff, #722ed1);
  color: white;
  padding: 1.25rem;
  display: flex;
  justify-content: space-between;
  align-items: center;
  position: relative;
  overflow: hidden;
  border-radius: 0;
  border-bottom: 1px solid transparent;
  flex-shrink: 0;
}

.chat-header::before {
  content: '';
  position: absolute;
  top: 0;
  right: 0;
  width: 16rem;
  height: 16rem;
  background: rgba(255, 255, 255, 0.1);
  border-radius: 50%;
  margin-right: -8rem;
  margin-top: -8rem;
  filter: blur(50px);
}

.chat-header::after {
  content: '';
  position: absolute;
  bottom: 0;
  left: 2.5rem;
  width: 8rem;
  height: 8rem;
  background: rgba(255, 255, 255, 0.1);
  border-radius: 50%;
  margin-bottom: -4rem;
  filter: blur(40px);
}

.chat-title {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  position: relative;
  z-index: 10;
  font-size: 1.25rem;
  font-weight: 700;
  text-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.chat-title i {
  background: rgba(255, 255, 255, 0.2);
  backdrop-filter: blur(4px);
  padding: 0.5rem;
  border-radius: 50%;
  font-size: 1.25rem;
  margin-right: 0;
}

.chat-status {
  position: relative;
  z-index: 10;
  left: -100px;
}

.chat-body {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  background: #f2f3f5;
}

.messages-container {
  flex: 1;
  padding: 1.5rem;
  overflow-y: auto;
  background: transparent;
  -ms-overflow-style: none;
  scrollbar-width: none;
}

.messages-container::-webkit-scrollbar {
  display: none;
}

.empty-messages {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100%;
  color: #4e5969;
  text-align: center;
  opacity: 0.7;
}

.empty-messages i {
  font-size: 48px;
  margin-bottom: 16px;
  opacity: 0.5;
  color: #165dff;
}

.typing-indicator {
  display: flex;
  align-items: flex-start;
  margin: 1.5rem 0;
  padding: 0;
  background: transparent;
  max-width: none;
  border-radius: 0;
}

.typing-indicator .typing-bubble {
  background: white;
  padding: 0.75rem;
  border-radius: 0.75rem;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
  display: flex;
  align-items: center;
}

.typing-dots {
  display: flex;
  margin-right: 0;
}

.typing-dots span {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background-color: #165dff;
  margin: 0 2px;
  animation: typing-bounce 1.4s infinite ease-in-out both;
}

.typing-dots span:nth-child(1) {
  animation-delay: -0.32s;
}
.typing-dots span:nth-child(2) {
  animation-delay: -0.16s;
}

.typing-text {
  display: none;
}

@keyframes typing-bounce {
  0%,
  80%,
  100% {
    transform: scale(0);
  }
  40% {
    transform: scale(1);
  }
}

.chat-footer {
  padding: 1rem;
  border-top: 1px solid #f2f3f5;
  background: #fff;
  border-radius: 0;
  flex-shrink: 0;
}

.input-toolbar {
  display: flex;
  align-items: center;
  margin-bottom: 0.5rem;
}

.input-toolbar button {
  background: none;
  border: none;
  cursor: pointer;
  padding: 0.5rem;
  color: #4e5969;
  transition: color 0.2s ease;
  font-size: 1.2rem;
}

.input-toolbar button:hover {
  color: #165dff;
}

.message-input-wrapper {
  display: flex;
  align-items: center;
}

.input-actions {
  display: flex;
  align-items: center;
  margin-top: 0;
  margin-left: 0.75rem;
}

:deep(.online-status .status-indicator) {
  width: 8px;
  height: 8px;
}
:deep(.online-status .status-text) {
  color: rgba(255, 255, 255, 0.8);
  font-size: 0.875rem;
}

:deep(.el-textarea__inner) {
  border-radius: 0.75rem !important;
  border: 1px solid #e5e7eb !important;
  padding: 0.75rem 1rem !important;
  transition: all 0.2s ease;
  background-color: #f2f3f5 !important;
  resize: none !important;
  min-height: 48px !important;
  line-height: 1.5;
}

:deep(.el-textarea__inner:focus) {
  border-color: #165dff !important;
  box-shadow: 0 0 0 3px rgba(22, 93, 255, 0.2) !important;
  background-color: #fff !important;
}

:deep(.el-input__count) {
  display: none;
}

:deep(.el-button--primary) {
  width: 48px;
  height: 48px;
  border-radius: 50% !important;
  background-color: #165dff !important;
  border-color: #165dff !important;
  box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1),
    0 2px 4px -1px rgba(0, 0, 0, 0.06);
  transition: all 0.2s ease;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0;
}

:deep(.el-button--primary:hover) {
  background-color: #0045e0 !important;
  border-color: #0045e0 !important;
  transform: translateY(-2px);
  box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1),
    0 4px 6px -2px rgba(0, 0, 0, 0.05);
}

:deep(.el-button--primary.is-disabled) {
  background-color: #a0cfff !important;
  border-color: #a0cfff !important;
  transform: none;
  box-shadow: none;
}

:deep(.el-button span) {
  display: flex;
  align-items: center;
  justify-content: center;
}

:deep(.el-button i) {
  font-size: 1.25rem;
  margin: 0 !important;
}

:deep(.el-button span > i + span) {
  display: none;
}

/* Responsive layout */
@media (max-width: 1024px) {
  .chat-view-wrapper {
    flex-direction: column;
    height: auto;
    max-width: 100%;
    border-radius: 0;
    box-shadow: none;
  }
  .service-panel-container {
    display: none;
  }
  .chat-window {
    border-right: none;
  }
}
</style>
