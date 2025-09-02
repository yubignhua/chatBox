import Vue from 'vue'
import VueRouter from 'vue-router'
import ChatWindow from '../components/ChatWindow.vue'
import OperatorApp from '../components/OperatorApp.vue'
import OperatorWorkspace from '../components/OperatorWorkspace.vue'

Vue.use(VueRouter)

const routes = [
  {
    path: '/',
    name: 'Home',
    component: ChatWindow,
    meta: { title: '用户聊天' }
  },
  {
    path: '/user',
    name: 'UserChat',
    component: ChatWindow,
    meta: { title: '用户聊天' }
  },
  {
    path: '/operator',
    name: 'Operator',
    component: OperatorApp,
    meta: { title: '客服工作台' }
  },
  {
    path: '/operator-workspace',
    name: 'OperatorWorkspace',
    component: OperatorWorkspace,
    meta: { title: '客服工作台 (旧版)' }
  },
  {
    path: '*',
    redirect: '/'
  }
]

const router = new VueRouter({
  mode: 'hash', // 使用 hash 模式，适合单页应用
  base: process.env.BASE_URL || '/',
  routes
})

// 路由守卫 - 设置页面标题
router.beforeEach((to, from, next) => {
  if (to.meta.title) {
    document.title = `${to.meta.title} - 客服系统`
  }
  next()
})

export default router