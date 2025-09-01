<template>
  <div class="operator-workspace">
    <!-- 客服面板 -->
    <OperatorPanel
      @session-joined="handleSessionJoined"
      @session-switched="handleSessionSwitched"
      @send-quick-reply="handleQuickReply"
      @message-received="handleMessageReceived"
      @message-history="handleMessageHistory"
      @new-chat-notification="handleNewChatNotification"
      ref="operatorPanel"
    />
    
    <!-- 聊天窗口 -->
    <div class="chat-area">
      <OperatorChatWindow
        v-if="currentSession"
        :current-session="currentSession"
        :operator-id="operatorId"
        @session-closed="handleSessionClosed"
        ref="chatWindow"
      />
      
      <!-- 空状态 -->
      <div v-else class="empty-chat-area">
        <div class="empty-content">
          <i class="el-icon-chat-dot-square"></i>
          <h3>欢迎使用客服工作台</h3>
          <p>请从左侧选择一个会话开始服务</p>
          <div class="quick-actions">
            <el-button type="primary" @click="connectToService" :loading="connecting">
              {{ isConnected ? '已连接服务' : '连接客服服务' }}
            </el-button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import OperatorPanel from './OperatorPanel.vue'
import OperatorChatWindow from './OperatorChatWindow.vue'

export default {
  name: 'OperatorWorkspace',
  components: {
    OperatorPanel,
    OperatorChatWindow
  },
  
  data() {
    return {
      currentSession: null,
      operatorId: null,
      isConnected: false,
      connecting: false
    }
  },
  
  methods: {
    /**
     * 连接到客服服务
     */
    async connectToService() {
      if (this.isConnected) return
      
      this.connecting = true
      
      try {
        // 通过客服面板连接
        await this.$refs.operatorPanel.connect()
        this.isConnected = true
        this.operatorId = this.$refs.operatorPanel.operatorId
        
      } catch (error) {
        console.error('连接客服服务失败:', error)
      } finally {
        this.connecting = false
      }
    },
    
    /**
     * 处理会话加入
     */
    handleSessionJoined(sessionData) {
      console.log('处理会话加入:', sessionData)
      
      this.currentSession = {
        id: sessionData.sessionId,
        userId: sessionData.userId || 'unknown',
        userName: sessionData.userName || '访客',
        status: sessionData.sessionStatus || 'active',
        createdAt: sessionData.timestamp || new Date(),
        operatorId: sessionData.operatorId,
        operatorName: sessionData.operatorName
      }
      
      console.log('设置当前会话:', this.currentSession)
      
      // 通知聊天窗口加载消息
      this.$nextTick(() => {
        if (this.$refs.chatWindow) {
          console.log('通知聊天窗口加载消息')
          this.$refs.chatWindow.loadSessionMessages()
        } else {
          console.warn('聊天窗口组件未找到')
        }
      })
    },
    
    /**
     * 处理会话切换
     */
    handleSessionSwitched(session) {
      console.log('切换到会话:', session)
      this.currentSession = session
      
      // 通知聊天窗口加载消息
      this.$nextTick(() => {
        if (this.$refs.chatWindow) {
          console.log('通知聊天窗口加载消息')
          this.$refs.chatWindow.loadSessionMessages()
        }
      })
    },
    
    /**
     * 处理快速回复
     */
    handleQuickReply(replyData) {
      if (this.$refs.chatWindow) {
        this.$refs.chatWindow.newMessage = replyData.content
        this.$refs.chatWindow.sendMessage()
      }
    },
    
    /**
     * 处理接收到的消息
     */
    handleMessageReceived(messageData) {
      if (this.$refs.chatWindow && messageData.sessionId === this.currentSession?.id) {
        this.$refs.chatWindow.receiveMessage(messageData)
      }
      
      // 如果消息不是来自当前会话，显示通知
      if (messageData.sessionId !== this.currentSession?.id && messageData.senderType === 'user') {
        this.$message({
          message: `收到新消息: ${messageData.content.substring(0, 30)}${messageData.content.length > 30 ? '...' : ''}`,
          type: 'info',
          duration: 3000
        })
      }
    },
    
    /**
     * 处理消息历史
     */
    handleMessageHistory(historyData) {
      if (this.$refs.chatWindow && historyData.sessionId === this.currentSession?.id) {
        this.$refs.chatWindow.receiveMessageHistory(historyData)
      }
    },
    
    /**
     * 处理会话关闭
     */
    handleSessionClosed(session) {
      if (session.id === this.currentSession?.id) {
        this.currentSession = null
      }
      
      // 通知客服面板更新会话状态
      if (this.$refs.operatorPanel) {
        this.$refs.operatorPanel.removeActiveSession(session.id)
      }
    },
    
    /**
     * 处理新聊天通知
     */
    handleNewChatNotification(notificationData) {
      // 显示桌面通知（如果浏览器支持）
      if ('Notification' in window && Notification.permission === 'granted') {
        new Notification('新的聊天请求', {
          body: `用户 ${notificationData.userName || '访客'} 发起了聊天请求`,
          icon: '/favicon.ico',
          tag: `chat-${notificationData.sessionId}`
        })
      }
      
      // 播放提示音（可选）
      this.playNotificationSound()
    },
    
    /**
     * 处理窗口大小变化
     */
    handleResize() {
      // 响应式处理逻辑
    },
    
    /**
     * 播放通知提示音
     */
    playNotificationSound() {
      try {
        // 创建简单的提示音
        const audioContext = new (window.AudioContext || window.webkitAudioContext)()
        const oscillator = audioContext.createOscillator()
        const gainNode = audioContext.createGain()
        
        oscillator.connect(gainNode)
        gainNode.connect(audioContext.destination)
        
        oscillator.frequency.setValueAtTime(800, audioContext.currentTime)
        oscillator.frequency.setValueAtTime(600, audioContext.currentTime + 0.1)
        
        gainNode.gain.setValueAtTime(0.3, audioContext.currentTime)
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.3)
        
        oscillator.start(audioContext.currentTime)
        oscillator.stop(audioContext.currentTime + 0.3)
      } catch (error) {
        console.log('无法播放提示音:', error)
      }
    },
    
    /**
     * 请求通知权限
     */
    async requestNotificationPermission() {
      if ('Notification' in window && Notification.permission === 'default') {
        try {
          const permission = await Notification.requestPermission()
          if (permission === 'granted') {
            console.log('通知权限已获得')
          }
        } catch (error) {
          console.log('请求通知权限失败:', error)
        }
      }
    }
  },
  
  mounted() {
    // 监听窗口大小变化
    window.addEventListener('resize', this.handleResize)
    
    // 请求通知权限
    this.requestNotificationPermission()
  },
  
  beforeDestroy() {
    window.removeEventListener('resize', this.handleResize)
  }
}
</script>

<style scoped>
.operator-workspace {
  display: flex;
  height: 100vh;
  background: #f5f5f5;
}

.chat-area {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-width: 0; /* 防止flex子项溢出 */
}

.empty-chat-area {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #fff;
}

.empty-content {
  text-align: center;
  color: #909399;
  max-width: 400px;
  padding: 40px;
}

.empty-content i {
  font-size: 64px;
  margin-bottom: 20px;
  opacity: 0.5;
}

.empty-content h3 {
  margin: 0 0 12px 0;
  font-size: 20px;
  color: #303133;
}

.empty-content p {
  margin: 0 0 24px 0;
  font-size: 14px;
  line-height: 1.5;
}

.quick-actions {
  display: flex;
  justify-content: center;
  gap: 12px;
}

/* 响应式设计 */
@media (max-width: 768px) {
  .operator-workspace {
    flex-direction: column;
  }
  
  .empty-content {
    padding: 20px;
  }
  
  .empty-content i {
    font-size: 48px;
  }
  
  .empty-content h3 {
    font-size: 18px;
  }
}

/* 平板设备 */
@media (max-width: 1024px) and (min-width: 769px) {
  .empty-content {
    max-width: 300px;
  }
  
  .empty-content i {
    font-size: 56px;
  }
}
</style>