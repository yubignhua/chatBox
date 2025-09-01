<template>
  <div id="app">
    <el-container>
      <el-header>
        <h1>客服聊天系统</h1>
        <div class="header-actions">
          <el-radio-group v-model="currentMode" size="small" @change="handleModeChange">
            <el-radio-button label="user">用户端</el-radio-button>
            <el-radio-button label="operator">客服端</el-radio-button>
            <el-radio-button label="test">测试模式</el-radio-button>
          </el-radio-group>
        </div>
      </el-header>
      <el-main :class="{ 'no-padding': currentMode === 'operator' }">
        <!-- 用户聊天界面 -->
        <ChatWindow v-if="currentMode === 'user'" />
        
        <!-- 客服工作台 -->
        <OperatorWorkspace v-else-if="currentMode === 'operator'" />
        
        <!-- 测试界面 -->
        <div v-else-if="currentMode === 'test'" class="test-section">
          <h3>系统状态测试</h3>
          <p>Vue2 客服聊天系统客户端已初始化</p>
          <p>Element UI 组件库已集成</p>
          <p>Socket.IO 客户端服务已配置</p>
          
          <div class="connection-status-display">
            <el-tag :type="connectionStatus.type" size="small">
              {{ connectionStatus.text }}
            </el-tag>
          </div>
          
          <div class="button-group">
            <el-button 
              type="primary" 
              @click="testSocketConnection"
              :loading="connecting"
            >
              {{ connecting ? '连接中...' : '测试Socket连接' }}
            </el-button>
            
            <el-button 
              type="danger" 
              @click="disconnectSocket"
              :disabled="!isConnected"
            >
              断开连接
            </el-button>
          </div>

          <div v-if="socketId" class="socket-info">
            <p><strong>Socket ID:</strong> {{ socketId }}</p>
          </div>

          <div v-if="logs.length > 0" class="logs-section">
            <h4>连接日志</h4>
            <div class="logs">
              <div 
                v-for="(log, index) in logs" 
                :key="index" 
                class="log-item"
                :class="log.type"
              >
                <span class="timestamp">{{ log.timestamp }}</span>
                <span class="message">{{ log.message }}</span>
              </div>
            </div>
          </div>
        </div>
      </el-main>
    </el-container>
  </div>
</template>

<script>
import ChatWindow from './components/ChatWindow.vue'
import OperatorWorkspace from './components/OperatorWorkspace.vue'
import SocketService from './services/SocketService'

export default {
  name: 'App',
  components: {
    ChatWindow,
    OperatorWorkspace
  },
  data() {
    return {
      isConnected: false,
      connecting: false,
      socketId: null,
      logs: [],
      currentMode: 'user' // 'user', 'operator', 'test'
    }
  },
  computed: {
    connectionStatus() {
      if (this.isConnected) {
        return { type: 'success', text: '已连接' }
      } else if (this.connecting) {
        return { type: 'warning', text: '连接中' }
      } else {
        return { type: 'danger', text: '未连接' }
      }
    }
  },
  methods: {
    /**
     * 处理模式切换
     */
    handleModeChange(mode) {
      this.currentMode = mode
      
      // 切换模式时断开现有连接
      if (this.isConnected) {
        SocketService.disconnect()
        this.isConnected = false
        this.socketId = null
      }
      
      this.addLog(`切换到${this.getModeText(mode)}`, 'info')
    },
    
    /**
     * 获取模式文本
     */
    getModeText(mode) {
      const modeMap = {
        'user': '用户端',
        'operator': '客服端',
        'test': '测试模式'
      }
      return modeMap[mode] || '未知模式'
    },
    
    async testSocketConnection() {
      this.connecting = true
      this.addLog('开始连接Socket服务器...', 'info')
      
      try {
        await SocketService.connect()
        this.isConnected = true
        this.socketId = SocketService.getSocketId()
        this.addLog('Socket连接成功', 'success')
      } catch (error) {
        this.addLog(`Socket连接失败: ${error.message}`, 'error')
      } finally {
        this.connecting = false
      }
    },
    
    disconnectSocket() {
      SocketService.disconnect()
      this.isConnected = false
      this.socketId = null
      this.addLog('Socket连接已断开', 'info')
    },
    
    addLog(message, type = 'info') {
      this.logs.unshift({
        timestamp: new Date().toLocaleTimeString(),
        message,
        type
      })
      
      // 限制日志数量
      if (this.logs.length > 10) {
        this.logs = this.logs.slice(0, 10)
      }
    },
    
    setupSocketListeners() {
      // 监听Socket连接事件
      SocketService.on('connected', (data) => {
        this.isConnected = true
        this.socketId = data.socketId
        this.addLog('Socket连接已建立', 'success')
      })
      
      SocketService.on('disconnected', (data) => {
        this.isConnected = false
        this.socketId = null
        this.addLog(`Socket连接断开: ${data.reason}`, 'warning')
      })
      
      SocketService.on('reconnected', (data) => {
        this.isConnected = true
        this.socketId = SocketService.getSocketId()
        this.addLog(`Socket重连成功 (尝试 ${data.attemptNumber} 次)`, 'success')
      })
      
      SocketService.on('connect_error', (error) => {
        this.addLog(`连接错误: ${error.message}`, 'error')
      })
    }
  },
  
  mounted() {
    this.setupSocketListeners()
    this.addLog('客服聊天系统已启动', 'info')
    this.addLog(`当前模式: ${this.getModeText(this.currentMode)}`, 'info')
  },
  
  beforeDestroy() {
    // 组件销毁前断开Socket连接
    if (this.isConnected) {
      SocketService.disconnect()
    }
  }
}
</script>

<style>
#app {
  font-family: Avenir, Helvetica, Arial, sans-serif;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  color: #2c3e50;
}

.el-header {
  background-color: #409EFF;
  color: white;
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0 20px;
}

.el-header h1 {
  margin: 0;
}

.header-actions {
  display: flex;
  align-items: center;
  gap: 10px;
}

.connection-status-display {
  margin: 15px 0;
}

.el-main {
  background-color: #f5f5f5;
  color: #333;
  padding: 20px;
}

.el-main.no-padding {
  padding: 0;
}

.test-section {
  max-width: 800px;
  margin: 0 auto;
  text-align: left;
}

.test-section h3 {
  color: #409EFF;
  margin-bottom: 20px;
}

.button-group {
  margin: 20px 0;
}

.button-group .el-button {
  margin-right: 10px;
}

.socket-info {
  background-color: #e8f4fd;
  padding: 15px;
  border-radius: 4px;
  margin: 20px 0;
}

.logs-section {
  margin-top: 30px;
}

.logs-section h4 {
  color: #606266;
  margin-bottom: 15px;
}

.logs {
  background-color: #2c3e50;
  color: #ecf0f1;
  padding: 15px;
  border-radius: 4px;
  max-height: 300px;
  overflow-y: auto;
  font-family: 'Courier New', monospace;
  font-size: 12px;
}

.log-item {
  margin-bottom: 8px;
  display: flex;
  align-items: flex-start;
}

.log-item .timestamp {
  color: #95a5a6;
  margin-right: 10px;
  min-width: 80px;
}

.log-item .message {
  flex: 1;
}

.log-item.success .message {
  color: #2ecc71;
}

.log-item.error .message {
  color: #e74c3c;
}

.log-item.warning .message {
  color: #f39c12;
}

.log-item.info .message {
  color: #3498db;
}
</style>