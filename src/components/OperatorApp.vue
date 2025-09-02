<template>
  <div class="operator-app">
    <!-- 消息列表视图 -->
    <OperatorMessageList
      v-if="currentView === 'messageList'"
      :current-chat-session-id="currentSession?.id"
      @enter-chat="handleEnterChat"
    />
  </div>
</template>

<script>
import OperatorMessageList from './OperatorMessageList.vue'

export default {
  name: 'OperatorApp',
  
  components: {
    OperatorMessageList,
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
    
   
  }
}
</script>

<style scoped>
.operator-app {
  height: 100vh;
  overflow: hidden;
}
</style>