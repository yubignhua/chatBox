<template>
  <div class="operator-chat-window">
    <!-- 聊天头部 -->
    <div class="chat-header">
      <div class="session-info">
        <div class="user-info">
          <el-avatar :size="32">
            <i class="el-icon-user-solid"></i>
          </el-avatar>
          <div class="user-details">
            <h4>{{ currentSession?.userName || '访客' }}</h4>
            <span class="session-id">会话ID: {{ currentSession?.id }}</span>
          </div>
        </div>
        <div class="session-status">
          <el-tag :type="sessionStatusType" size="small">
            {{ sessionStatusText }}
          </el-tag>
        </div>
      </div>
      <div class="chat-actions">
        <el-button size="small" type="text" @click="showSessionInfo = !showSessionInfo">
          <i class="el-icon-info"></i>
          会话信息
        </el-button>
        <el-button size="small" type="text" @click="closeSession" :disabled="!currentSession">
          <i class="el-icon-close"></i>
          结束会话
        </el-button>
      </div>
    </div>

    <!-- 会话信息面板 -->
    <div v-if="showSessionInfo" class="session-info-panel">
      <div class="info-item">
        <label>用户ID:</label>
        <span>{{ currentSession?.userId || '-' }}</span>
      </div>
      <div class="info-item">
        <label>开始时间:</label>
        <span>{{ formatDateTime(currentSession?.createdAt) }}</span>
      </div>
      <div class="info-item">
        <label>会话状态:</label>
        <span>{{ sessionStatusText }}</span>
      </div>
      <div class="info-item">
        <label>消息数量:</label>
        <span>{{ messages.length }} 条</span>
      </div>
    </div>

    <!-- 消息区域 -->
    <div class="messages-area" ref="messagesArea">
      <div class="messages-container" ref="messagesContainer">
        <div v-if="messages.length === 0" class="empty-messages">
          <i class="el-icon-chat-dot-square"></i>
          <p>暂无消息记录</p>
        </div>
        
        <!-- 历史消息加载提示 -->
        <div v-if="hasMoreHistory" class="load-more-history">
          <el-button 
            size="mini" 
            type="text" 
            @click="loadMoreHistory"
            :loading="loadingHistory"
          >
            加载更多历史消息
          </el-button>
        </div>
        
        <!-- 消息列表 -->
        <div 
          v-for="message in messages" 
          :key="message.id"
          class="message-wrapper"
          :class="message.senderType"
        >
          <div class="message-item">
            <div class="message-avatar">
              <el-avatar :size="28">
                <i :class="message.senderType === 'user' ? 'el-icon-user' : 'el-icon-service'"></i>
              </el-avatar>
            </div>
            <div class="message-content">
              <div class="message-header">
                <span class="sender-name">
                  {{ getSenderName(message) }}
                </span>
                <span class="message-time">
                  {{ formatTime(message.timestamp || message.createdAt) }}
                </span>
              </div>
              <div class="message-body" :class="message.messageType">
                <div v-if="message.messageType === 'text'" class="text-message">
                  {{ message.content }}
                </div>
                <div v-else-if="message.messageType === 'image'" class="image-message">
                  <img :src="message.content" alt="图片" @click="previewImage(message.content)" />
                </div>
                <div v-else-if="message.messageType === 'system'" class="system-message">
                  <i class="el-icon-info"></i>
                  {{ message.content }}
                </div>
                <div v-else class="unknown-message">
                  {{ message.content }}
                </div>
              </div>
              <div v-if="message.status" class="message-status">
                <i v-if="message.status === 'sending'" class="el-icon-loading"></i>
                <i v-else-if="message.status === 'sent'" class="el-icon-check"></i>
                <i v-else-if="message.status === 'failed'" class="el-icon-close" style="color: #f56c6c;"></i>
              </div>
            </div>
          </div>
        </div>
        
        <!-- 正在输入指示器 -->
        <div v-if="userTyping" class="typing-indicator">
          <div class="typing-avatar">
            <el-avatar :size="28">
              <i class="el-icon-user"></i>
            </el-avatar>
          </div>
          <div class="typing-content">
            <div class="typing-dots">
              <span></span>
              <span></span>
              <span></span>
            </div>
            <span class="typing-text">用户正在输入...</span>
          </div>
        </div>
      </div>
    </div>

    <!-- 输入区域 -->
    <div class="input-area">
      <!-- 工具栏 -->
      <div class="input-toolbar">
        <div class="toolbar-left">
          <el-button size="mini" type="text" @click="showEmojiPicker = !showEmojiPicker">
            <i class="el-icon-sunny"></i>
          </el-button>
          <el-button size="mini" type="text" @click="$refs.fileInput.click()">
            <i class="el-icon-paperclip"></i>
          </el-button>
          <input 
            ref="fileInput" 
            type="file" 
            style="display: none" 
            @change="handleFileUpload"
            accept="image/*"
          />
        </div>
        <div class="toolbar-right">
          <el-button 
            size="mini" 
            type="text" 
            @click="showQuickReplies = !showQuickReplies"
          >
            <i class="el-icon-chat-dot-square"></i>
            快速回复
          </el-button>
        </div>
      </div>

      <!-- 快速回复面板 -->
      <div v-if="showQuickReplies" class="quick-replies-panel">
        <div class="quick-reply-item" v-for="template in quickReplyTemplates" :key="template.id">
          <el-button 
            size="small" 
            type="info" 
            plain
            @click="insertQuickReply(template.content)"
          >
            {{ template.title }}
          </el-button>
        </div>
      </div>

      <!-- 表情面板 -->
      <div v-if="showEmojiPicker" class="emoji-panel">
        <div class="emoji-grid">
          <span 
            v-for="emoji in commonEmojis" 
            :key="emoji"
            class="emoji-item"
            @click="insertEmoji(emoji)"
          >
            {{ emoji }}
          </span>
        </div>
      </div>

      <!-- 消息输入框 -->
      <div class="message-input-container">
        <el-input
          v-model="newMessage"
          type="textarea"
          :rows="3"
          placeholder="输入回复消息..."
          :disabled="!currentSession || currentSession.status === 'closed'"
          @keydown.enter.exact="handleEnterKey"
          @input="handleTyping"
          resize="none"
          maxlength="1000"
          show-word-limit
          ref="messageInput"
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
            发送 (Ctrl+Enter)
          </el-button>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import SocketService from '../services/SocketService'

export default {
  name: 'OperatorChatWindow',
  props: {
    currentSession: {
      type: Object,
      default: null
    },
    operatorId: {
      type: String,
      required: true
    }
  },
  
  data() {
    return {
      messages: [],
      newMessage: '',
      sending: false,
      userTyping: false,
      
      // UI状态
      showSessionInfo: false,
      showQuickReplies: false,
      showEmojiPicker: false,
      
      // 历史消息
      loadingHistory: false,
      hasMoreHistory: true,
      
      // 输入状态
      typingTimer: null,
      
      // 快速回复模板
      quickReplyTemplates: [
        { id: 1, title: '问候语', content: '您好！我是客服，有什么可以帮助您的吗？' },
        { id: 2, title: '稍等', content: '请稍等，我来为您处理这个问题。' },
        { id: 3, title: '感谢', content: '感谢您的咨询，还有其他问题吗？' },
        { id: 4, title: '转接', content: '我需要为您转接到专业客服，请稍等。' },
        { id: 5, title: '结束', content: '如果没有其他问题，本次服务就到这里，祝您生活愉快！' },
        { id: 6, title: '道歉', content: '非常抱歉给您带来不便，我们会尽快处理。' },
        { id: 7, title: '确认', content: '好的，我已经记录了您的问题，稍后会有专人跟进。' },
        { id: 8, title: '解释', content: '根据我们的政策规定，这种情况需要...' }
      ],
      
      // 常用表情
      commonEmojis: [
        '😊', '😄', '😃', '😀', '😆', '😅', '😂', '🤣',
        '😉', '😌', '😍', '🥰', '😘', '😗', '😙', '😚',
        '🤗', '🤔', '😐', '😑', '😶', '🙄', '😏', '😣',
        '😥', '😮', '🤐', '😯', '😪', '😫', '🥱', '😴',
        '👍', '👎', '👌', '✌️', '🤞', '🤟', '🤘', '🤙',
        '👏', '🙌', '👐', '🤲', '🤝', '🙏', '✍️', '💪'
      ]
    }
  },
  
  computed: {
    canSendMessage() {
      return this.currentSession && 
             this.currentSession.status !== 'closed' &&
             this.newMessage.trim().length > 0 && 
             !this.sending
    },
    
    sessionStatusType() {
      const typeMap = {
        'waiting': 'warning',
        'active': 'success',
        'closed': 'info'
      }
      return typeMap[this.currentSession?.status] || 'info'
    },
    
    sessionStatusText() {
      const textMap = {
        'waiting': '等待中',
        'active': '进行中',
        'closed': '已结束'
      }
      return textMap[this.currentSession?.status] || '未知'
    }
  },
  
  watch: {
    currentSession: {
      handler(newSession, oldSession) {
        if (newSession && newSession.id !== oldSession?.id) {
          this.loadSessionMessages()
        }
      },
      immediate: true
    }
  },
  
  methods: {
    /**
     * 加载会话消息
     */
    async loadSessionMessages() {
      if (!this.currentSession) {
        this.messages = []
        return
      }
      
      try {
        console.log('加载会话消息，会话ID:', this.currentSession.id)
        
        // 清空现有消息
        this.messages = []
        
        // 通过Socket请求消息历史
        SocketService.emit('get-message-history', {
          sessionId: this.currentSession.id,
          limit: 50,
          offset: 0
        })
        
        console.log('已请求消息历史')
        
      } catch (error) {
        console.error('加载会话消息失败:', error)
        this.$message.error('加载消息失败')
      }
    },
    
    /**
     * 加载更多历史消息
     */
    async loadMoreHistory() {
      if (this.loadingHistory || !this.hasMoreHistory) return
      
      this.loadingHistory = true
      
      try {
        // 这里应该调用API加载更多历史消息
        await new Promise(resolve => setTimeout(resolve, 1000))
        
        // 暂时设置为没有更多历史消息
        this.hasMoreHistory = false
        
      } catch (error) {
        console.error('加载历史消息失败:', error)
        this.$message.error('加载历史消息失败')
      } finally {
        this.loadingHistory = false
      }
    },
    
    /**
     * 发送消息
     */
    async sendMessage() {
      if (!this.canSendMessage) return
      
      const messageContent = this.newMessage.trim()
      this.sending = true
      
      try {
        // 创建临时消息对象
        const tempMessage = {
          id: this.generateMessageId(),
          sessionId: this.currentSession.id,
          senderId: this.operatorId,
          senderType: 'operator',
          content: messageContent,
          messageType: 'text',
          timestamp: new Date(),
          status: 'sending'
        }
        
        // 立即显示消息
        this.addMessage(tempMessage)
        
        // 发送到服务器
        SocketService.emit('operator-send-message', {
          content: messageContent,
          messageType: 'text'
        })
        
        // 清空输入框
        this.newMessage = ''
        this.scrollToBottom()
        
        // 更新消息状态为已发送
        setTimeout(() => {
          tempMessage.status = 'sent'
        }, 500)
        
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
      if (event.ctrlKey) {
        event.preventDefault()
        this.sendMessage()
      }
    },
    
    /**
     * 处理输入事件
     */
    handleTyping() {
      // 清除之前的定时器
      if (this.typingTimer) {
        clearTimeout(this.typingTimer)
      }
      
      // 发送正在输入事件（可选）
      // SocketService.emit('operator-typing', { sessionId: this.currentSession.id })
      
      // 设置定时器，停止输入状态
      this.typingTimer = setTimeout(() => {
        // 发送停止输入事件
      }, 1000)
    },
    
    /**
     * 插入快速回复
     */
    insertQuickReply(content) {
      this.newMessage = content
      this.showQuickReplies = false
      this.$refs.messageInput.focus()
    },
    
    /**
     * 插入表情
     */
    insertEmoji(emoji) {
      this.newMessage += emoji
      this.showEmojiPicker = false
      this.$refs.messageInput.focus()
    },
    
    /**
     * 处理文件上传
     */
    async handleFileUpload(event) {
      const file = event.target.files[0]
      if (!file) return
      
      // 检查文件大小（限制5MB）
      if (file.size > 5 * 1024 * 1024) {
        this.$message.error('文件大小不能超过5MB')
        return
      }
      
      // 检查文件类型
      if (!file.type.startsWith('image/')) {
        this.$message.error('只支持图片文件')
        return
      }
      
      try {
        // 这里应该上传文件到服务器
        // 暂时使用本地预览
        const reader = new FileReader()
        reader.onload = (e) => {
          const imageUrl = e.target.result
          
          // 创建图片消息
          const imageMessage = {
            id: this.generateMessageId(),
            sessionId: this.currentSession.id,
            senderId: this.operatorId,
            senderType: 'operator',
            content: imageUrl,
            messageType: 'image',
            timestamp: new Date(),
            status: 'sent'
          }
          
          this.addMessage(imageMessage)
          
          // 发送到服务器
          SocketService.emit('operator-send-message', {
            content: imageUrl,
            messageType: 'image'
          })
        }
        reader.readAsDataURL(file)
        
      } catch (error) {
        console.error('文件上传失败:', error)
        this.$message.error('文件上传失败')
      }
      
      // 清空文件输入
      event.target.value = ''
    },
    
    /**
     * 预览图片
     */
    previewImage(imageUrl) {
      // 这里可以使用Element UI的图片预览组件
      window.open(imageUrl, '_blank')
    },
    
    /**
     * 结束会话
     */
    async closeSession() {
      if (!this.currentSession) return
      
      try {
        await this.$confirm('确定要结束当前会话吗？', '提示', {
          confirmButtonText: '确定',
          cancelButtonText: '取消',
          type: 'warning'
        })
        
        // 发送结束会话请求
        // 这里应该调用API结束会话
        
        this.$message.success('会话已结束')
        this.$emit('session-closed', this.currentSession)
        
      } catch (error) {
        // 用户取消
      }
    },
    
    /**
     * 添加消息到列表
     */
    addMessage(message) {
      console.log('添加消息到列表:', message)
      this.messages.push(message)
      this.$nextTick(() => {
        this.scrollToBottom()
      })
    },
    
    /**
     * 接收消息
     */
    receiveMessage(messageData) {
      console.log('OperatorChatWindow 接收消息:', messageData)
      
      // 避免重复添加自己发送的消息
      if (messageData.senderId === this.operatorId && messageData.senderType === 'operator') {
        console.log('忽略自己发送的消息')
        return
      }
      
      const message = {
        id: messageData.id || this.generateMessageId(),
        sessionId: messageData.sessionId,
        senderId: messageData.senderId,
        senderType: messageData.senderType,
        content: messageData.content,
        messageType: messageData.messageType || 'text',
        timestamp: messageData.timestamp || new Date(),
        status: 'delivered'
      }
      
      this.addMessage(message)
    },
    
    /**
     * 接收消息历史
     */
    receiveMessageHistory(historyData) {
      console.log('接收消息历史:', historyData)
      
      if (historyData.sessionId !== this.currentSession?.id) {
        console.log('会话ID不匹配，忽略历史消息')
        return
      }
      
      // 清空现有消息
      this.messages = []
      
      // 添加历史消息
      if (historyData.messages && historyData.messages.length > 0) {
        console.log(`加载 ${historyData.messages.length} 条历史消息`)
        
        historyData.messages.forEach(msg => {
          const message = {
            id: msg.id,
            sessionId: msg.sessionId,
            senderId: msg.senderId,
            senderType: msg.senderType,
            content: msg.content,
            messageType: msg.messageType || 'text',
            timestamp: msg.createdAt || msg.timestamp,
            status: 'delivered'
          }
          
          this.messages.push(message)
        })
        
        // 滚动到底部
        this.$nextTick(() => {
          this.scrollToBottom()
        })
      } else {
        console.log('没有历史消息')
      }
      
      // 更新分页信息
      if (historyData.pagination) {
        this.hasMoreHistory = historyData.pagination.hasMore
      }
    },
    
    /**
     * 设置用户输入状态
     */
    setUserTyping(isTyping) {
      this.userTyping = isTyping
      if (isTyping) {
        this.scrollToBottom()
        // 3秒后自动隐藏
        setTimeout(() => {
          this.userTyping = false
        }, 3000)
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
     * 获取发送者名称
     */
    getSenderName(message) {
      switch (message.senderType) {
        case 'user':
          return this.currentSession?.userName || '访客'
        case 'operator':
          return '客服'
        case 'system':
          return '系统'
        default:
          return '未知'
      }
    },
    
    /**
     * 格式化时间
     */
    formatTime(time) {
      const date = new Date(time)
      return date.toLocaleTimeString('zh-CN', { 
        hour12: false,
        hour: '2-digit',
        minute: '2-digit'
      })
    },
    
    /**
     * 格式化日期时间
     */
    formatDateTime(time) {
      if (!time) return '-'
      const date = new Date(time)
      return date.toLocaleString('zh-CN')
    },
    
    /**
     * 生成消息ID
     */
    generateMessageId() {
      return 'msg_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9)
    }
  },
  
  mounted() {
    // 监听点击事件，关闭弹出面板
    document.addEventListener('click', (e) => {
      if (!this.$el.contains(e.target)) {
        this.showQuickReplies = false
        this.showEmojiPicker = false
      }
    })
  }
}
</script>

<style scoped>
.operator-chat-window {
  display: flex;
  flex-direction: column;
  height: 100vh;
  background: #fff;
}

.chat-header {
  padding: 16px 20px;
  border-bottom: 1px solid #e4e7ed;
  background: #f8f9fa;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.session-info {
  display: flex;
  align-items: center;
  gap: 12px;
}

.user-info {
  display: flex;
  align-items: center;
  gap: 8px;
}

.user-details h4 {
  margin: 0;
  font-size: 16px;
  color: #303133;
}

.session-id {
  font-size: 12px;
  color: #909399;
}

.chat-actions {
  display: flex;
  gap: 8px;
}

.session-info-panel {
  padding: 12px 20px;
  background: #ecf5ff;
  border-bottom: 1px solid #e4e7ed;
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 8px;
}

.info-item {
  display: flex;
  align-items: center;
  font-size: 12px;
}

.info-item label {
  color: #606266;
  margin-right: 8px;
  min-width: 60px;
}

.info-item span {
  color: #303133;
}

.messages-area {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.messages-container {
  flex: 1;
  padding: 16px 20px;
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

.load-more-history {
  text-align: center;
  margin-bottom: 16px;
}

.message-wrapper {
  margin-bottom: 16px;
}

.message-wrapper.user .message-item {
  flex-direction: row;
}

.message-wrapper.operator .message-item {
  flex-direction: row-reverse;
}

.message-wrapper.system .message-item {
  justify-content: center;
}

.message-item {
  display: flex;
  align-items: flex-start;
  gap: 8px;
}

.message-avatar {
  flex-shrink: 0;
}

.message-content {
  max-width: 70%;
  position: relative;
}

.message-wrapper.operator .message-content {
  text-align: right;
}

.message-wrapper.system .message-content {
  text-align: center;
  max-width: 100%;
}

.message-header {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 4px;
  font-size: 12px;
  color: #909399;
}

.message-wrapper.operator .message-header {
  flex-direction: row-reverse;
}

.sender-name {
  font-weight: 500;
}

.message-body {
  background: #fff;
  padding: 8px 12px;
  border-radius: 8px;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.1);
  word-wrap: break-word;
}

.message-wrapper.operator .message-body {
  background: #409eff;
  color: white;
}

.message-wrapper.system .message-body {
  background: #f4f4f5;
  color: #606266;
  font-size: 12px;
  display: inline-flex;
  align-items: center;
  gap: 4px;
}

.text-message {
  line-height: 1.4;
}

.image-message img {
  max-width: 200px;
  max-height: 200px;
  border-radius: 4px;
  cursor: pointer;
}

.message-status {
  position: absolute;
  bottom: -16px;
  right: 0;
  font-size: 12px;
  color: #909399;
}

.typing-indicator {
  display: flex;
  align-items: flex-start;
  gap: 8px;
  margin-bottom: 16px;
}

.typing-content {
  background: #fff;
  padding: 8px 12px;
  border-radius: 8px;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.1);
  display: flex;
  align-items: center;
  gap: 8px;
}

.typing-dots {
  display: flex;
  gap: 2px;
}

.typing-dots span {
  width: 4px;
  height: 4px;
  border-radius: 50%;
  background: #909399;
  animation: typing 1.4s infinite ease-in-out;
}

.typing-dots span:nth-child(1) { animation-delay: -0.32s; }
.typing-dots span:nth-child(2) { animation-delay: -0.16s; }

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

.typing-text {
  font-size: 12px;
  color: #606266;
}

.input-area {
  border-top: 1px solid #e4e7ed;
  background: #fff;
}

.input-toolbar {
  padding: 8px 16px;
  border-bottom: 1px solid #f0f0f0;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.toolbar-left,
.toolbar-right {
  display: flex;
  gap: 4px;
}

.quick-replies-panel {
  padding: 12px 16px;
  border-bottom: 1px solid #f0f0f0;
  background: #fafafa;
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.quick-reply-item .el-button {
  font-size: 12px;
  padding: 4px 8px;
}

.emoji-panel {
  padding: 12px 16px;
  border-bottom: 1px solid #f0f0f0;
  background: #fafafa;
}

.emoji-grid {
  display: grid;
  grid-template-columns: repeat(8, 1fr);
  gap: 8px;
}

.emoji-item {
  padding: 4px;
  text-align: center;
  cursor: pointer;
  border-radius: 4px;
  transition: background-color 0.2s;
}

.emoji-item:hover {
  background: #e4e7ed;
}

.message-input-container {
  padding: 16px;
  position: relative;
}

.input-actions {
  display: flex;
  justify-content: flex-end;
  margin-top: 8px;
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

/* 响应式设计 */
@media (max-width: 768px) {
  .session-info-panel {
    grid-template-columns: 1fr;
  }
  
  .message-content {
    max-width: 85%;
  }
  
  .emoji-grid {
    grid-template-columns: repeat(6, 1fr);
  }
}
</style>