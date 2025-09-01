import Vue from 'vue'
import Vuex from 'vuex'
import chat from './modules/chat'
import messages from './modules/messages'

Vue.use(Vuex)

export default new Vuex.Store({
  modules: {
    chat,
    messages
  },
  strict: process.env.NODE_ENV !== 'production'
})