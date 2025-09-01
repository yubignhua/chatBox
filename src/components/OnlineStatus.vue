<template>
  <div class="online-status">
    <!-- 连接状态指示器 -->
    <div class="connection-status" :class="connectionStatusClass">
      <div class="status-indicator">
        <div class="status-dot" :class="connectionDotClass"></div>
        <span class="status-text">{{ connectionStatusText }}</span>
      </div>
    </div>
    
    <!-- 客服在线状态 -->
    <div class="operator-status" v-if="isConnected">
      <div class="operator-indicator" :class="operatorStatusClass">
        <i class="status-icon" :class="operatorIconClass"></i>
        <span class="operator-text">{{ operatorStatusText }}</span>
      </div>
    </div>
  </div>
</template>

<script>
export default {
  name: 'OnlineStatus',
  props: {
    isConnected: {
      type: Boolean,
      default: false
    },
    operatorOnline: {
      type: Boolean,
      default: false
    },
    reconnecting: {
      type: Boolean,
      default: false
    },
    operatorName: {
      type: String,
      default: ''
    },
    lastSeen: {
      type: String,
      default: ''
    }
  },
  computed: {
    connectionStatusClass() {
      if (this.reconnecting) {
        return 'reconnecting'
      } else if (this.isConnected) {
        return 'connected'
      } else {
        return 'disconnected'
      }
    },
    
    connectionDotClass() {
      if (this.reconnecting) {
        return 'reconnecting-dot'
      } else if (this.isConnected) {
        return 'connected-dot'
      } else {
        return 'disconnected-dot'
      }
    },
    
    connectionStatusText() {
      if (this.reconnecting) {
        return '重新连接中...'
      } else if (this.isConnected) {
        return '已连接'
      } else {
        return '连接断开'
      }
    },
    
    operatorStatusClass() {
      return {
        'operator-online': this.operatorOnline,
        'operator-offline': !this.operatorOnline
      }
    },
    
    operatorIconClass() {
      return this.operatorOnline ? 'el-icon-user' : 'el-icon-user-solid'
    },
    
    operatorStatusText() {
      if (this.operatorOnline) {
        return this.operatorName ? `${this.operatorName} 在线` : '客服在线'
      } else {
        if (this.lastSeen) {
          return `客服离线 (${this.formatLastSeen(this.lastSeen)})`
        } else {
          return '等待客服接入...'
        }
      }
    }
  },
  methods: {
    formatLastSeen(timestamp) {
      try {
        const date = new Date(timestamp)
        const now = new Date()
        const diffInMinutes = Math.floor((now - date) / (1000 * 60))
        
        if (diffInMinutes < 1) {
          return '刚刚离线'
        } else if (diffInMinutes < 60) {
          return `${diffInMinutes}分钟前离线`
        } else if (diffInMinutes < 1440) {
          const hours = Math.floor(diffInMinutes / 60)
          return `${hours}小时前离线`
        } else {
          return '较早离线'
        }
      } catch (error) {
        return '离线'
      }
    }
  }
}
</script>

<style scoped>
.online-status {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 4px;
}

.connection-status,
.operator-status {
  display: flex;
  align-items: center;
}

.status-indicator,
.operator-indicator {
  display: flex;
  align-items: center;
  padding: 4px 8px;
  border-radius: 12px;
  font-size: 12px;
  font-weight: 500;
  transition: all 0.3s ease;
}

/* 连接状态样式 */
.connection-status.connected .status-indicator {
  background: rgba(103, 194, 58, 0.1);
  color: #67c23a;
  border: 1px solid rgba(103, 194, 58, 0.2);
}

.connection-status.disconnected .status-indicator {
  background: rgba(245, 108, 108, 0.1);
  color: #f56c6c;
  border: 1px solid rgba(245, 108, 108, 0.2);
}

.connection-status.reconnecting .status-indicator {
  background: rgba(230, 162, 60, 0.1);
  color: #e6a23c;
  border: 1px solid rgba(230, 162, 60, 0.2);
}

/* 状态指示点 */
.status-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  margin-right: 6px;
  transition: all 0.3s ease;
}

.connected-dot {
  background: #67c23a;
  box-shadow: 0 0 0 2px rgba(103, 194, 58, 0.3);
}

.disconnected-dot {
  background: #f56c6c;
  box-shadow: 0 0 0 2px rgba(245, 108, 108, 0.3);
}

.reconnecting-dot {
  background: #e6a23c;
  animation: pulse 1.5s infinite;
}

/* 客服状态样式 */
.operator-indicator.operator-online {
  background: rgba(64, 158, 255, 0.1);
  color: #409eff;
  border: 1px solid rgba(64, 158, 255, 0.2);
}

.operator-indicator.operator-offline {
  background: rgba(144, 147, 153, 0.1);
  color: #909399;
  border: 1px solid rgba(144, 147, 153, 0.2);
}

/* 图标样式 */
.status-icon {
  margin-right: 4px;
  font-size: 12px;
}

/* 文本样式 */
.status-text,
.operator-text {
  white-space: nowrap;
  font-size: 11px;
}

/* 动画效果 */
@keyframes pulse {
  0% {
    box-shadow: 0 0 0 0 rgba(230, 162, 60, 0.7);
  }
  70% {
    box-shadow: 0 0 0 6px rgba(230, 162, 60, 0);
  }
  100% {
    box-shadow: 0 0 0 0 rgba(230, 162, 60, 0);
  }
}

/* 连接成功动画 */
.connected-dot {
  animation: connectSuccess 0.6s ease-out;
}

@keyframes connectSuccess {
  0% {
    transform: scale(0.8);
    opacity: 0.5;
  }
  50% {
    transform: scale(1.2);
    opacity: 1;
  }
  100% {
    transform: scale(1);
    opacity: 1;
  }
}

/* 悬停效果 */
.status-indicator:hover,
.operator-indicator:hover {
  transform: translateY(-1px);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

/* 响应式设计 */
@media (max-width: 768px) {
  .online-status {
    align-items: center;
    flex-direction: row;
    gap: 8px;
  }
  
  .status-indicator,
  .operator-indicator {
    padding: 3px 6px;
    font-size: 11px;
  }
  
  .status-text,
  .operator-text {
    font-size: 10px;
  }
  
  .status-dot {
    width: 6px;
    height: 6px;
    margin-right: 4px;
  }
}

/* 紧凑模式 */
.online-status.compact {
  flex-direction: row;
  gap: 6px;
}

.online-status.compact .status-indicator,
.online-status.compact .operator-indicator {
  padding: 2px 6px;
  font-size: 10px;
}

/* 详细模式 */
.online-status.detailed .operator-indicator {
  flex-direction: column;
  align-items: flex-start;
  padding: 6px 10px;
}

.online-status.detailed .operator-text {
  margin-top: 2px;
  font-size: 10px;
  opacity: 0.8;
}

/* 状态变化过渡动画 */
.status-indicator,
.operator-indicator {
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

/* 错误状态 */
.connection-status.error .status-indicator {
  background: rgba(245, 108, 108, 0.15);
  color: #f56c6c;
  border: 1px solid rgba(245, 108, 108, 0.3);
  animation: shake 0.5s ease-in-out;
}

@keyframes shake {
  0%, 100% {
    transform: translateX(0);
  }
  25% {
    transform: translateX(-2px);
  }
  75% {
    transform: translateX(2px);
  }
}

/* 加载状态 */
.status-indicator.loading {
  position: relative;
  overflow: hidden;
}

.status-indicator.loading::after {
  content: '';
  position: absolute;
  top: 0;
  left: -100%;
  width: 100%;
  height: 100%;
  background: linear-gradient(
    90deg,
    transparent,
    rgba(255, 255, 255, 0.3),
    transparent
  );
  animation: loading 1.5s infinite;
}

@keyframes loading {
  0% {
    left: -100%;
  }
  100% {
    left: 100%;
  }
}

/* 高对比度模式支持 */
@media (prefers-contrast: high) {
  .status-indicator,
  .operator-indicator {
    border-width: 2px;
  }
  
  .status-dot {
    border: 1px solid currentColor;
  }
}

/* 减少动画模式支持 */
@media (prefers-reduced-motion: reduce) {
  .status-dot,
  .status-indicator,
  .operator-indicator {
    animation: none;
    transition: none;
  }
}
</style>