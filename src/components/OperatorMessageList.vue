<template>
  <div class="operator-message-list">
    <!-- 头部 -->
    <div class="header">
      <div class="title">
        <h2>客服工作台</h2>
        <p>点击消息进入聊天</p>
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
    </div>

    <!-- 统计信息 -->
    <div class="stats">
      <div class="stat-item">
        <div class="stat-number">{{ waitingSessions.length }}</div>
        <div class="stat-label">等待中</div>
      </div>
      <div class="stat-item">
        <div class="stat-number">{{ activeSessions.length }}</div>
        <div class="stat-label">进行中</div>
      </div>
      <div class="stat-item">
        <div class="stat-number">{{ totalHistorySessions }}</div>
        <div class="stat-label">历史会话</div>
      </div>
    </div>

    <!-- 消息列表 -->
    <div class="message-list">
      <!-- 标签页切换 -->
      <el-tabs v-model="activeTab" @tab-click="handleTabClick">
        <el-tab-pane label="待处理消息" name="pending">
          <div class="list-header">
            <h3>待处理消息</h3>
            <el-button 
              size="mini" 
              type="text" 
              @click="refreshMessages"
              :loading="loading"
              icon="el-icon-refresh"
            >
              刷新
            </el-button>
          </div>
        </el-tab-pane>
        <el-tab-pane label="历史会话" name="history">
          <div class="list-header">
            <h3>历史会话</h3>
            <div class="header-actions">
              <el-input
                v-model="searchKeyword"
                placeholder="搜索用户名或会话ID"
                size="mini"
                style="width: 200px; margin-right: 10px;"
                @keyup.enter="searchHistorySessions"
                clearable
              >
                <el-button 
                  slot="append" 
                  icon="el-icon-search"
                  @click="searchHistorySessions"
                ></el-button>
              </el-input>
              <el-button 
                size="mini" 
                type="text" 
                @click="refreshHistorySessions"
                :loading="historyLoading"
                icon="el-icon-refresh"
              >
                刷新
              </el-button>
            </div>
          </div>
        </el-tab-pane>
      </el-tabs>

      <!-- 待处理消息内容 -->
      <div v-if="activeTab === 'pending'">
        <!-- 等待中的会话 -->
        <div class="waiting-sessions" v-if="waitingSessions.length > 0">
          <div 
            v-for="session in waitingSessions" 
            :key="session.id"
            class="message-item waiting"
            @click="handleSessionClick(session)"
          >
            <div class="message-avatar">
              <el-avatar :size="40">
                <i class="el-icon-user"></i>
              </el-avatar>
              <div class="status-dot waiting"></div>
            </div>
            
            <div class="message-content">
              <div class="message-header">
                <span class="user-name">{{ session.userName || '访客' }}</span>
                <span class="message-time">{{ formatTime(session.createdAt) }}</span>
              </div>
              <div class="message-preview">
                {{ session.lastMessage || '用户发起了聊天请求' }}
              </div>
              <div class="message-meta">
                <el-tag size="mini" type="warning">等待接入</el-tag>
                <span class="session-id">{{ session.id.slice(-8) }}</span>
              </div>
            </div>
            
            <div class="message-actions">
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
        </div>

        <!-- 进行中的会话 -->
        <div class="active-sessions" v-if="activeSessions.length > 0">
          <div class="section-title">进行中的对话</div>
          <div 
            v-for="session in activeSessions" 
            :key="session.id"
            class="message-item active"
            @click="handleSessionClick(session)"
          >
            <div class="message-avatar">
              <el-avatar :size="40">
                <i class="el-icon-user"></i>
              </el-avatar>
              <div class="status-dot active"></div>
            </div>
            
            <div class="message-content">
              <div class="message-header">
                <span class="user-name">{{ session.userName || '访客' }}</span>
                <span class="message-time">{{ formatTime(session.updatedAt) }}</span>
              </div>
              <div class="message-preview">
                {{ session.lastMessage || '暂无消息' }}
              </div>
              <div class="message-meta">
                <el-tag size="mini" type="success">进行中</el-tag>
                <span class="session-id">{{ session.id.slice(-8) }}</span>
              </div>
            </div>
            
            <div class="message-actions">
              <el-badge :value="session.unreadCount" :hidden="!session.unreadCount">
                <el-button 
                  size="mini" 
                  type="success" 
                  @click.stop="continueSession(session)"
                >
                  继续
                </el-button>
              </el-badge>
            </div>
          </div>
        </div>

        <!-- 空状态 -->
        <div v-if="waitingSessions.length === 0 && activeSessions.length === 0" class="empty-state">
          <div class="empty-content">
            <i class="el-icon-chat-dot-square"></i>
            <h3>暂无待处理消息</h3>
            <p>当有用户发起聊天时，消息会显示在这里</p>
            <el-button type="primary" @click="refreshMessages" :loading="loading">
              刷新消息
            </el-button>
          </div>
        </div>
      </div>

      <!-- 历史会话内容 -->
      <div v-if="activeTab === 'history'">
        <!-- 历史会话列表 -->
        <div class="history-sessions" v-if="historySessions.length > 0">
          <div 
            v-for="session in historySessions" 
            :key="session.id"
            class="message-item history"
            @click="viewHistorySession(session)"
          >
            <div class="message-avatar">
              <el-avatar :size="40">
                <i class="el-icon-user"></i>
              </el-avatar>
              <div class="status-dot" :class="getHistoryStatusClass(session.status)"></div>
            </div>
            
            <div class="message-content">
              <div class="message-header">
                <span class="user-name">{{ session.userName || '访客' }}</span>
                <span class="message-time">{{ formatTime(session.updatedAt) }}</span>
              </div>
              <div class="message-preview">
                {{ session.lastMessage || '暂无消息' }}
              </div>
              <div class="message-meta">
                <el-tag size="mini" :type="getStatusTagType(session.status)">
                  {{ getStatusText(session.status) }}
                </el-tag>
                <span class="session-id">{{ session.id.slice(-8) }}</span>
                <span class="message-count">{{ session.messageCount || 0 }}条消息</span>
              </div>
            </div>
            
            <div class="message-actions">
              <el-button 
                size="mini" 
                type="info" 
                @click.stop="viewHistorySession(session)"
              >
                查看
              </el-button>
            </div>
          </div>
        </div>

        <!-- 分页 -->
        <div class="pagination-wrapper" v-if="historyPagination.total > 0">
          <el-pagination
            @size-change="handleHistorySizeChange"
            @current-change="handleHistoryCurrentChange"
            :current-page="historyPagination.page"
            :page-sizes="[50, 100, 200, 500]"
            :page-size="historyPagination.limit"
            layout="total, sizes, prev, pager, next, jumper"
            :total="historyPagination.total"
          >
          </el-pagination>
        </div>

        <!-- 历史会话空状态 -->
        <div v-if="historySessions.length === 0 && !historyLoading" class="empty-state">
          <div class="empty-content">
            <i class="el-icon-document"></i>
            <h3>暂无历史会话</h3>
            <p>历史会话记录会显示在这里</p>
            <el-button type="primary" @click="refreshHistorySessions" :loading="historyLoading">
              刷新列表
            </el-button>
          </div>
        </div>

        <!-- 加载状态 -->
        <div v-if="historyLoading" class="loading-state">
          <el-loading-text>正在加载历史会话...</el-loading-text>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import SocketService from '../services/SocketService'
import ApiService from '../services/ApiService'

export default {
  name: 'OperatorMessageList',
  
  data() {
    return {
      // 连接状态
      isConnected: false,
      connecting: false,
      operatorId: null,
      operatorStatus: 'offline',
      
      // 标签页状态
      activeTab: 'pending',
      
      // 会话数据
      waitingSessions: [],
      activeSessions: [],
      historySessions: [],
      
      // 加载状态
      loading: false,
      historyLoading: false,
      joiningSession: null,
      
      // 搜索
      searchKeyword: '',
      
      // 分页
      historyPagination: {
        page: 1,
        limit: 100,
        total: 0
      },
      
      // 统计数据
      totalHistorySessions: 0,
      
      // 定时器
      historyRefreshTimer: null
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
        
        // 加载消息列表
        await this.loadMessages()
        
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
        this.waitingSessions = []
        this.activeSessions = []
        
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
      // Socket连接状态监听
      SocketService.on('connected', () => {
        console.log('Socket重新连接成功')
        this.isConnected = true
        this.$message.success('连接已恢复')
      })
      
      SocketService.on('disconnected', (data) => {
        console.log('Socket连接断开:', data.reason)
        this.isConnected = false
        if (data.reason !== 'io client disconnect') {
          this.$message.warning('连接已断开，正在尝试重连...')
        }
      })
      
      SocketService.on('connect_error', (error) => {
        console.error('Socket连接错误:', error)
        this.isConnected = false
        this.$message.error('连接服务器失败')
      })
      
      // 新聊天通知
      SocketService.on('new-chat-notification', (data) => {
        console.log('收到新聊天通知:', data)
        this.addWaitingSession(data)
        this.$message({
          message: `新用户发起聊天请求`,
          type: 'info',
          duration: 3000
        })
      })
      
      // 新消息通知
      SocketService.on('new-message-notification', (data) => {
        console.log('收到新消息通知:', data)
        this.updateSessionMessage(data)
        this.$message({
          message: `用户发送了新消息: ${data.content.substring(0, 20)}${data.content.length > 20 ? '...' : ''}`,
          type: 'warning',
          duration: 5000
        })
      })
      
      // 客服状态更新
      SocketService.on('operator-status-updated', (data) => {
        if (data.operatorId === this.operatorId) {
          this.operatorStatus = data.status
          console.log('客服状态已更新:', data.status)
        }
      })
      
      // 聊天错误
      SocketService.on('chat-error', (data) => {
        console.error('聊天错误:', data)
        this.$message.error(data.error || '聊天服务出现错误')
      })
    },
    
    /**
     * 加载消息列表
     */
    async loadMessages() {
      this.loading = true
      
      try {
        // 这里应该调用API获取待处理的会话
        // 暂时使用模拟数据
        await new Promise(resolve => setTimeout(resolve, 500))
        
        // 实际项目中应该从API获取
        // const response = await ApiService.getOperatorSessions(this.operatorId)
        // this.waitingSessions = response.waiting || []
        // this.activeSessions = response.active || []
        
      } catch (error) {
        console.error('加载消息失败:', error)
        this.$message.error('加载消息失败')
      } finally {
        this.loading = false
      }
    },
    
    /**
     * 刷新消息
     */
    async refreshMessages() {
      await this.loadMessages()
    },
    
    /**
     * 处理会话点击
     */
    handleSessionClick(session) {
      if (session.status === 'waiting') {
        this.joinSession(session)
      } else {
        this.continueSession(session)
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
        
        // 成功加入会话，跳转到聊天界面
        this.moveToActiveSession(session)
        this.enterChatInterface(session)
        
      } catch (error) {
        console.error('加入会话失败:', error)
        this.$message.error(error.message || '加入会话失败')
      } finally {
        this.joiningSession = null
      }
    },
    
    /**
     * 继续进行中的会话
     */
    continueSession(session) {
      if (!this.isConnected) {
        this.$message.warning('请先连接服务')
        return
      }
      
      this.enterChatInterface(session)
    },
    
    /**
     * 进入聊天界面
     */
    enterChatInterface(session) {
      // 通知父组件切换到聊天界面
      this.$emit('enter-chat', {
        session: session,
        operatorId: this.operatorId
      })
    },
    
    /**
     * 添加等待中的会话
     */
    addWaitingSession(data) {
      const session = {
        id: data.sessionId,
        userName: data.userName || '访客',
        userId: data.userId,
        createdAt: data.timestamp || new Date(),
        lastMessage: data.message || '用户发起了聊天请求',
        status: 'waiting'
      }
      
      // 避免重复添加
      if (!this.waitingSessions.find(s => s.id === session.id)) {
        this.waitingSessions.unshift(session)
      }
    },
    
    /**
     * 将等待会话移动到活跃会话
     */
    moveToActiveSession(session) {
      // 从等待列表中移除
      const waitingIndex = this.waitingSessions.findIndex(s => s.id === session.id)
      if (waitingIndex !== -1) {
        this.waitingSessions.splice(waitingIndex, 1)
      }
      
      // 添加到活跃列表
      const activeSession = {
        ...session,
        status: 'active',
        unreadCount: 0,
        updatedAt: new Date()
      }
      
      if (!this.activeSessions.find(s => s.id === session.id)) {
        this.activeSessions.unshift(activeSession)
      }
    },
    
    /**
     * 更新会话消息
     */
    updateSessionMessage(data) {
      // 更新等待中的会话
      const waitingSession = this.waitingSessions.find(s => s.id === data.sessionId)
      if (waitingSession) {
        waitingSession.lastMessage = data.content
        waitingSession.updatedAt = new Date(data.timestamp)
        return
      }
      
      // 更新活跃会话
      const activeSession = this.activeSessions.find(s => s.id === data.sessionId)
      if (activeSession) {
        activeSession.lastMessage = data.content
        activeSession.updatedAt = new Date(data.timestamp)
        activeSession.unreadCount = (activeSession.unreadCount || 0) + 1
        
        // 移到列表顶部
        const index = this.activeSessions.indexOf(activeSession)
        if (index > 0) {
          this.activeSessions.splice(index, 1)
          this.activeSessions.unshift(activeSession)
        }
        return
      }
      
      // 如果会话不存在于任何列表中，创建新的等待会话
      console.log('会话不存在，创建新的等待会话:', data.sessionId)
      this.addWaitingSession({
        sessionId: data.sessionId,
        userId: data.userId,
        userName: data.userName || '访客',
        timestamp: data.timestamp,
        message: data.content
      })
    },
    
    /**
     * 处理标签页切换
     */
    handleTabClick(tab) {
      if (tab.name === 'history') {
        // 每次切换到历史会话标签页都刷新数据，确保显示最新的历史记录
        this.loadHistorySessions()
      }
    },
    
    /**
     * 加载历史会话
     */
    async loadHistorySessions() {
      this.historyLoading = true
      
      try {
        const params = {
          page: this.historyPagination.page,
          limit: this.historyPagination.limit, // 默认100条
          keyword: this.searchKeyword || undefined
        }
        
        console.log('🔍 加载历史会话，参数:', params)
        
        // 调用API获取历史会话
        const response = await ApiService.getAllHistorySessions(params)
        
        if (response.success) {
          this.historySessions = response.data.sessions || []
          this.historyPagination.total = response.data.pagination?.total || 0
          this.totalHistorySessions = response.data.pagination?.total || 0
          
          console.log(`✅ 成功加载 ${this.historySessions.length} 条历史会话，总计 ${this.totalHistorySessions} 条`)
        } else {
          this.$message.error('加载历史会话失败')
        }
        
      } catch (error) {
        console.error('加载历史会话失败:', error)
        this.$message.error('加载历史会话失败')
      } finally {
        this.historyLoading = false
      }
    },
    
    /**
     * 刷新历史会话
     */
    async refreshHistorySessions() {
      this.historyPagination.page = 1
      await this.loadHistorySessions()
    },
    
    /**
     * 搜索历史会话
     */
    async searchHistorySessions() {
      this.historyPagination.page = 1
      await this.loadHistorySessions()
    },
    
    /**
     * 处理历史会话分页大小变化
     */
    handleHistorySizeChange(val) {
      this.historyPagination.limit = val
      this.historyPagination.page = 1
      this.loadHistorySessions()
    },
    
    /**
     * 处理历史会话页码变化
     */
    handleHistoryCurrentChange(val) {
      this.historyPagination.page = val
      this.loadHistorySessions()
    },
    
    /**
     * 查看历史会话
     */
    viewHistorySession(session) {
      // 进入聊天界面查看会话
      // 不再强制标记为历史模式，让组件根据会话状态自动判断
      this.enterChatInterface({
        ...session,
        // 移除 isHistory: true，让组件根据status自动判断
      })
    },
    
    /**
     * 获取历史会话状态样式类
     */
    getHistoryStatusClass(status) {
      const classMap = {
        'completed': 'completed',
        'closed': 'closed',
        'timeout': 'timeout',
        'cancelled': 'cancelled'
      }
      return classMap[status] || 'closed'
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
    }
  },
  
  mounted() {
    // 自动连接
    this.connect()
    
    // 设置定时刷新历史会话（每30秒）
    this.historyRefreshTimer = setInterval(() => {
      if (this.activeTab === 'history' && !this.historyLoading) {
        console.log('🔄 自动刷新历史会话列表')
        this.loadHistorySessions()
      }
    }, 30000)
  },
  
  beforeDestroy() {
    if (this.isConnected) {
      this.disconnect()
    }
    
    // 清除定时器
    if (this.historyRefreshTimer) {
      clearInterval(this.historyRefreshTimer)
    }
  }
}
</script>

<style scoped>
.operator-message-list {
  height: 100vh;
  background: #f5f7fa;
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

.stats {
  background: #fff;
  padding: 16px 24px;
  border-bottom: 1px solid #e4e7ed;
  display: flex;
  gap: 40px;
}

.stat-item {
  text-align: center;
}

.stat-number {
  font-size: 24px;
  font-weight: bold;
  color: #409eff;
  margin-bottom: 4px;
}

.stat-label {
  font-size: 12px;
  color: #909399;
}

.message-list {
  flex: 1;
  padding: 20px 24px;
  overflow-y: auto;
}

.list-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
}

.list-header h3 {
  margin: 0;
  color: #303133;
  font-size: 18px;
}

.section-title {
  margin: 24px 0 12px 0;
  font-size: 16px;
  font-weight: 500;
  color: #606266;
}

.message-item {
  background: #fff;
  border-radius: 8px;
  padding: 16px;
  margin-bottom: 12px;
  display: flex;
  align-items: center;
  cursor: pointer;
  transition: all 0.2s;
  border: 1px solid #e4e7ed;
}

.message-item:hover {
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.1);
  transform: translateY(-1px);
}

.message-item.waiting {
  border-left: 4px solid #e6a23c;
}

.message-item.active {
  border-left: 4px solid #67c23a;
}

.message-avatar {
  position: relative;
  margin-right: 12px;
}

.status-dot {
  position: absolute;
  bottom: 2px;
  right: 2px;
  width: 12px;
  height: 12px;
  border-radius: 50%;
  border: 2px solid #fff;
}

.status-dot.waiting {
  background: #e6a23c;
}

.status-dot.active {
  background: #67c23a;
}

.message-content {
  flex: 1;
  min-width: 0;
}

.message-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 6px;
}

.user-name {
  font-weight: 500;
  color: #303133;
  font-size: 14px;
}

.message-time {
  font-size: 12px;
  color: #909399;
}

.message-preview {
  color: #606266;
  font-size: 13px;
  line-height: 1.4;
  margin-bottom: 8px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.message-meta {
  display: flex;
  align-items: center;
  gap: 8px;
}

.session-id {
  font-size: 11px;
  color: #c0c4cc;
  font-family: monospace;
}

.message-actions {
  margin-left: 12px;
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
}

.empty-content h3 {
  margin: 0 0 8px 0;
  color: #303133;
}

.empty-content p {
  margin: 0 0 20px 0;
  font-size: 14px;
}

/* 滚动条样式 */
.message-list::-webkit-scrollbar {
  width: 6px;
}

.message-list::-webkit-scrollbar-track {
  background: #f1f1f1;
}

.message-list::-webkit-scrollbar-thumb {
  background: #c1c1c1;
  border-radius: 3px;
}

.message-list::-webkit-scrollbar-thumb:hover {
  background: #a8a8a8;
}

/* 历史会话样式 */
.message-item.history {
  border-left: 4px solid #909399;
}

.message-item.history:hover {
  border-left-color: #409eff;
}

.status-dot.completed {
  background: #67c23a;
}

.status-dot.closed {
  background: #909399;
}

.status-dot.timeout {
  background: #e6a23c;
}

.status-dot.cancelled {
  background: #f56c6c;
}

.message-count {
  font-size: 11px;
  color: #c0c4cc;
  margin-left: 8px;
}

.header-actions {
  display: flex;
  align-items: center;
}

.pagination-wrapper {
  margin-top: 20px;
  text-align: center;
}

.loading-state {
  display: flex;
  justify-content: center;
  align-items: center;
  height: 200px;
  color: #909399;
}

/* 标签页样式 */
.el-tabs {
  margin-top: -20px;
}

.el-tabs__header {
  margin: 0 0 20px 0;
}

.el-tabs__content {
  padding: 0;
}

/* 响应式设计 */
@media (max-width: 768px) {
  .header {
    flex-direction: column;
    align-items: flex-start;
    gap: 12px;
  }
  
  .stats {
    justify-content: space-around;
  }
  
  .message-list {
    padding: 16px;
  }
  
  .message-item {
    padding: 12px;
  }
  
  .header-actions {
    flex-direction: column;
    align-items: stretch;
    gap: 8px;
  }
  
  .header-actions .el-input {
    width: 100% !important;
    margin-right: 0 !important;
    margin-bottom: 8px;
  }
}
</style>