# 客服接入流程实现文档

## 功能概述

本项目实现了完整的客服接入流程，包括：

1. **后台管理系统通知功能** - 实时通知客服有新的用户会话
2. **客服加入会话功能** - 客服可以接入用户会话进行服务
3. **客服回复消息功能** - 客服可以回复用户消息，支持文本、图片等

## 项目结构

```
chatBox/
├── src/
│   ├── components/
│   │   ├── OperatorPanel.vue          # 客服面板组件
│   │   ├── OperatorChatWindow.vue     # 客服聊天窗口
│   │   ├── OperatorWorkspace.vue      # 客服工作台
│   │   └── ChatWindow.vue             # 用户聊天窗口
│   ├── services/
│   │   ├── SocketService.js           # Socket通信服务
│   │   └── ApiService.js              # API调用服务
│   ├── main.js                        # 用户端入口
│   └── operator-main.js               # 客服端入口
├── test-operator-workspace.html       # 客服端测试页面
└── test-chat-flow.html               # 用户端测试页面
```

## 核心功能实现

### 1. 客服面板 (OperatorPanel.vue)

- **连接管理**: 客服可以连接/断开Socket服务
- **状态管理**: 支持在线/离线/忙碌状态切换
- **会话通知**: 实时显示待处理的用户会话
- **活跃会话**: 管理当前客服的所有活跃会话
- **快速回复**: 提供常用回复模板

### 2. 客服聊天窗口 (OperatorChatWindow.vue)

- **消息显示**: 显示会话的完整消息历史
- **消息发送**: 支持文本、图片消息发送
- **快速回复**: 内置快速回复模板
- **表情支持**: 常用表情快速插入
- **会话管理**: 查看会话信息，结束会话

### 3. Socket事件处理

#### 客服端事件
- `operator-status-change`: 客服状态变更
- `operator-join-session`: 客服加入会话
- `operator-send-message`: 客服发送消息

#### 服务端响应事件
- `operator-session-joined`: 客服成功加入会话
- `operator-status-updated`: 客服状态更新确认
- `message-received`: 接收新消息
- `message-history`: 接收消息历史

## 使用说明

### 启动服务

1. 启动后端服务器:
```bash
cd screenServer
npm start
```

2. 启动前端开发服务器:
```bash
cd chatBox
npm run dev
```

### 测试流程

1. **客服端测试**:
   - 访问 `http://localhost:8080/operator.html`
   - 点击"连接服务"连接到Socket服务器
   - 客服状态会显示为"在线"

2. **用户端测试**:
   - 访问 `http://localhost:8080`
   - 切换到"用户端"模式
   - 发送消息创建会话

3. **完整流程测试**:
   - 用户发送消息后，客服端会收到新会话通知
   - 客服点击"接入"按钮加入会话
   - 双方可以进行实时消息交流

## API接口

### 客服相关接口

- `GET /api/operators/online` - 获取在线客服列表
- `GET /api/operators/available` - 获取可用客服列表
- `PUT /api/operators/:id/status` - 更新客服状态
- `GET /api/operators/:id/sessions` - 获取客服活跃会话
- `POST /api/operators/:id/assign-session` - 分配客服到会话
- `GET /api/operators/pending-sessions` - 获取待处理会话
- `GET /api/operators/stats` - 获取客服统计信息

### 聊天相关接口

- `POST /api/chat/sessions` - 创建聊天会话
- `GET /api/chat/messages/:sessionId` - 获取消息历史
- `PUT /api/chat/sessions/:sessionId/close` - 关闭会话

## 技术特性

- **实时通信**: 基于Socket.IO的实时双向通信
- **状态管理**: 使用Vuex管理应用状态
- **响应式设计**: 支持桌面端和移动端
- **错误处理**: 完善的错误处理和重连机制
- **消息持久化**: 消息存储到数据库
- **多会话支持**: 客服可以同时处理多个会话

## 部署说明

### 生产环境构建

```bash
cd chatBox
npm run build
```

### 环境配置

- 开发环境: Socket服务器地址为 `http://localhost:3001`
- 生产环境: 自动使用当前域名

### 数据库配置

确保MySQL数据库已配置并运行，相关表结构会自动创建。

## 扩展功能

- 文件上传支持
- 消息已读状态
- 客服工作量统计
- 会话质量评价
- 自动分配算法优化