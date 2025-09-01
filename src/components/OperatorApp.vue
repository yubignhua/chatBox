<template>
  <div class="operator-app">
    <!-- 消息列表视图 -->
    <OperatorMessageList
      v-if="currentView === 'messageList'"
      @enter-chat="handleEnterChat"
    />
    
    <!-- 聊天界面视图 -->
    <OperatorChatInterface
      v-if="currentView === 'chatInterface'"
      :session="currentSession"
      :operator-id="operatorId"
      @back-to-list="handleBackToList"
    />
  </div>
</template>

<script>
import OperatorMessageList from './OperatorMessageList.vue'
import OperatorChatInterface from './OperatorChatInterface.vue'

export default {
  name: 'OperatorApp',
  
  components: {
    OperatorMessageList,
    OperatorChatInterface
  },
  
  data() {
    return {
      currentView: 'messageList', // 'messageList' | 'chatInterface'
      currentSession: null,
      operatorId: null
    }
  },
  
  methods: {
    /**
     * 处理进入聊天界面
     */
    handleEnterChat(data) {
      this.currentSession = data.session
      this.operatorId = data.operatorId
      this.currentView = 'chatInterface'
    },
    
    /**
     * 处理返回消息列表
     */
    handleBackToList() {
      this.currentView = 'messageList'
      this.currentSession = null
    }
  }
}
</script>

<style scoped>
.operator-app {
  height: 100vh;
  overflow: hidden;
}
</style>