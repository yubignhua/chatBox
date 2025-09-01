<template>
  <div class="message-item" :class="messageClasses">
    <div class="message-avatar" v-if="!isOwnMessage">
      <div class="avatar-circle">
        <i class="el-icon-service"></i>
      </div>
    </div>
    
    <div class="message-content">
      <div class="message-bubble" :class="bubbleClasses">
        <div class="message-text" v-if="message.messageType !== 'system'">
          {{ message.content }}
        </div>
        <div class="system-message" v-else>
          <i class="el-icon-info"></i>
          {{ message.content }}
        </div>
      </div>
      
      <div class="message-meta">
        <span class="message-time">{{ formattedTime }}</span>
        <span class="message-status" v-if="isOwnMessage && message.messageType !== 'system'">
          <i class="el-icon-check" v-if="message.isRead"></i>
          <i class="el-icon-time" v-else></i>
        </span>
      </div>
    </div>
    
    <div class="message-avatar" v-if="isOwnMessage">
      <div class="avatar-circle user-avatar">
        <i class="el-icon-user"></i>
      </div>
    </div>
  </div>
</template>

<script>
export default {
  name: 'MessageItem',
  props: {
    message: {
      type: Object,
      required: true,
      validator(value) {
        return value && 
               typeof value.id === 'string' &&
               typeof value.content === 'string' &&
               typeof value.senderType === 'string' &&
               typeof value.timestamp === 'string'
      }
    },
    isOwnMessage: {
      type: Boolean,
      default: false
    }
  },
  computed: {
    messageClasses() {
      return {
        'own-message': this.isOwnMessage,
        'other-message': !this.isOwnMessage,
        'system-message': this.message.senderType === 'system'
      }
    },
    
    bubbleClasses() {
      return {
        'user-bubble': this.isOwnMessage,
        'operator-bubble': !this.isOwnMessage && this.message.senderType === 'operator',
        'system-bubble': this.message.senderType === 'system'
      }
    },
    
    formattedTime() {
      try {
        const date = new Date(this.message.timestamp)
        const now = new Date()
        const diffInMinutes = Math.floor((now - date) / (1000 * 60))
        
        if (diffInMinutes < 1) {
          return '刚刚'
        } else if (diffInMinutes < 60) {
          return `${diffInMinutes}分钟前`
        } else if (diffInMinutes < 1440) { // 24小时
          const hours = Math.floor(diffInMinutes / 60)
          return `${hours}小时前`
        } else {
          // 超过24小时显示具体时间
          const isToday = date.toDateString() === now.toDateString()
          const isYesterday = date.toDateString() === new Date(now.getTime() - 24 * 60 * 60 * 1000).toDateString()
          
          if (isToday) {
            return date.toLocaleTimeString('zh-CN', { 
              hour: '2-digit', 
              minute: '2-digit' 
            })
          } else if (isYesterday) {
            return '昨天 ' + date.toLocaleTimeString('zh-CN', { 
              hour: '2-digit', 
              minute: '2-digit' 
            })
          } else {
            return date.toLocaleDateString('zh-CN', {
              month: 'short',
              day: 'numeric',
              hour: '2-digit',
              minute: '2-digit'
            })
          }
        }
      } catch (error) {
        console.error('时间格式化错误:', error)
        return '时间未知'
      }
    }
  },
  
  mounted() {
    // 组件挂载后自动滚动到视图中（用于新消息）
    if (this.isNewMessage) {
      this.$nextTick(() => {
        this.$el.scrollIntoView({ 
          behavior: 'smooth', 
          block: 'end' 
        })
      })
    }
  }
}
</script>

<style scoped>
.message-item {
  display: flex;
  margin-bottom: 16px;
  align-items: flex-end;
  animation: fadeInUp 0.3s ease-out;
}

.message-item.own-message {
  flex-direction: row-reverse;
}

.message-item.system-message {
  justify-content: center;
  margin: 8px 0;
}

.message-avatar {
  flex-shrink: 0;
  margin: 0 8px;
}

.avatar-circle {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  background: #e4e7ed;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #909399;
  font-size: 16px;
}

.avatar-circle.user-avatar {
  background: #409eff;
  color: white;
}

.message-content {
  flex: 1;
  max-width: 70%;
  min-width: 0;
}

.own-message .message-content {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
}

.system-message .message-content {
  max-width: 80%;
  text-align: center;
}

.message-bubble {
  padding: 12px 16px;
  border-radius: 18px;
  word-wrap: break-word;
  word-break: break-word;
  position: relative;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.1);
}

.user-bubble {
  background: #409eff;
  color: white;
  border-bottom-right-radius: 6px;
}

.operator-bubble {
  background: white;
  color: #303133;
  border: 1px solid #e4e7ed;
  border-bottom-left-radius: 6px;
}

.system-bubble {
  background: #f4f4f5;
  color: #606266;
  border-radius: 12px;
  padding: 8px 12px;
  font-size: 12px;
  border: 1px solid #e4e7ed;
}

.message-text {
  font-size: 14px;
  line-height: 1.5;
  margin: 0;
  white-space: pre-wrap;
}

.system-message {
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 12px;
  color: #909399;
}

.system-message i {
  margin-right: 4px;
  font-size: 14px;
}

.message-meta {
  display: flex;
  align-items: center;
  margin-top: 4px;
  font-size: 11px;
  color: #c0c4cc;
}

.own-message .message-meta {
  justify-content: flex-end;
}

.system-message .message-meta {
  justify-content: center;
}

.message-time {
  margin-right: 4px;
}

.message-status {
  display: flex;
  align-items: center;
}

.message-status i {
  font-size: 12px;
}

.message-status .el-icon-check {
  color: #67c23a;
}

.message-status .el-icon-time {
  color: #e6a23c;
}

/* 长文本处理 */
.message-text {
  max-width: 100%;
  overflow-wrap: break-word;
  hyphens: auto;
}

/* 链接样式 */
.message-text a {
  color: inherit;
  text-decoration: underline;
}

.user-bubble .message-text a {
  color: #b3d8ff;
}

.operator-bubble .message-text a {
  color: #409eff;
}

/* 动画效果 */
@keyframes fadeInUp {
  from {
    opacity: 0;
    transform: translateY(10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

/* 消息气泡悬停效果 */
.message-bubble:hover {
  transform: translateY(-1px);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
  transition: all 0.2s ease;
}

.system-bubble:hover {
  transform: none;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.1);
}

/* 响应式设计 */
@media (max-width: 768px) {
  .message-content {
    max-width: 85%;
  }
  
  .message-bubble {
    padding: 10px 14px;
    font-size: 14px;
  }
  
  .avatar-circle {
    width: 32px;
    height: 32px;
    font-size: 14px;
  }
  
  .message-meta {
    font-size: 10px;
  }
}

/* 选中文本样式 */
.message-text::selection {
  background: rgba(64, 158, 255, 0.3);
}

.user-bubble .message-text::selection {
  background: rgba(255, 255, 255, 0.3);
}

/* 消息状态指示器动画 */
.message-status .el-icon-time {
  animation: pulse 2s infinite;
}

@keyframes pulse {
  0% {
    opacity: 1;
  }
  50% {
    opacity: 0.5;
  }
  100% {
    opacity: 1;
  }
}

/* 系统消息特殊样式 */
.system-message .message-item {
  margin: 12px 0;
}

.system-bubble {
  display: inline-block;
  max-width: none;
}

/* 消息时间分组 */
.message-item + .message-item.system-message {
  margin-top: 20px;
}

.message-item.system-message + .message-item {
  margin-top: 16px;
}

/* 连续消息优化 */
.message-item + .message-item.own-message .message-bubble {
  margin-top: -4px;
}

.message-item + .message-item.other-message .message-bubble {
  margin-top: -4px;
}

/* 错误消息样式 */
.message-bubble.error-message {
  background: #fef0f0;
  border: 1px solid #fbc4c4;
  color: #f56c6c;
}

/* 加载状态 */
.message-bubble.loading {
  opacity: 0.6;
  pointer-events: none;
}
</style>