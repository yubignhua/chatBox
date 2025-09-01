import Vue from 'vue';
import ElementUI from 'element-ui';
import 'element-ui/lib/theme-chalk/index.css';
import OperatorApp from './components/OperatorApp.vue';
import store from './store';

Vue.use(ElementUI);

Vue.config.productionTip = false;

// 创建客服端应用
new Vue({
  store,
  render: h => h(OperatorApp),
}).$mount('#app');