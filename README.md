# 客服聊天系统 - Vue2 客户端

基于 Vue2 + Element UI 的客服实时聊天系统客户端。

## 技术栈

- Vue 2.7.14
- Element UI 2.15.14
- Socket.IO Client 4.7.5
- Webpack 5
- Babel

## 开发环境设置

### 安装依赖

```bash
npm install
```

### 启动开发服务器

```bash
npm run dev
```

开发服务器将在 http://localhost:8080 启动

### 构建生产版本

```bash
npm run build
```

## 项目结构

```
chatBox/
├── public/
│   └── index.html          # HTML 模板
├── src/
│   ├── components/         # Vue 组件
│   ├── services/          # 服务层 (API, Socket.IO)
│   ├── store/             # 状态管理
│   ├── assets/            # 静态资源
│   ├── App.vue            # 根组件
│   └── main.js            # 应用入口
├── package.json
├── webpack.config.js      # Webpack 配置
└── .babelrc              # Babel 配置
```

## 功能特性

- 实时聊天界面
- Socket.IO 实时通信
- 响应式设计
- Element UI 组件库
- 消息历史记录
- 在线状态显示