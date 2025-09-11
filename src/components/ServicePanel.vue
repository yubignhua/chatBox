<template>
  <div class="service-panel">
    <!-- Service Guide -->
    <div class="panel-section">
      <h3 class="panel-title">
        <i class="el-icon-guide"></i>
        <span>服务指南</span>
      </h3>
      <div class="guide-content">
        <div class="guide-item">
          <span>在线人工服务:</span>
          <span class="guide-value"> 工作日：8:30 - 22:30</span>
        </div>
        <div class="guide-item">
          <span>电话服务热线:</span>
          <span class="guide-value">010-95558</span>
        </div>
      </div>
    </div>

    <!-- Quick Services -->
    <div class="panel-section">
      <h3 class="panel-title">
        <i class="el-icon-s-promotion"></i>
        <span>快捷服务</span>
      </h3>
      <div class="quick-service-grid">
        <button class="quick-service-item" @click="showScreenShareCode">
          <div class="item-icon-wrapper screen-share-icon">
            <i class="el-icon-monitor"></i>
          </div>
          <span class="item-text">同屏服务</span>
        </button>
        <button class="quick-service-item">
          <div class="item-icon-wrapper">
            <i class="el-icon-document"></i>
          </div>
          <span class="item-text"> 知识库 </span>
        </button>
        <button class="quick-service-item">
          <div class="item-icon-wrapper">
            <i class="el-icon-chat-dot-round"></i>
          </div>
          <span class="item-text">AI智能客服</span>
        </button>
        <button class="quick-service-item">
          <div class="item-icon-wrapper">
            <i class="el-icon-refresh-left"></i>
          </div>
          <span class="item-text">Ai智能助理</span>
        </button>
      </div>
    </div>
  </div>
</template>

<script>
export default {
  name: 'ServicePanel',
  methods: {
    showScreenShareCode() {
      const code = Math.floor(100000 + Math.random() * 900000);
      this.$alert(`您的同屏服务密码是：<strong class="code-highlight">${code}</strong>`, '同屏服务密码', {
        dangerouslyUseHTMLString: true,
        confirmButtonText: '确定',
        customClass: 'code-alert'
      });
    }
  }
}
</script>

<style scoped>
.service-panel {
  padding: 14px;
  background-color: #f8f9fa;
  height: 100%;
  font-family: 'Inter', system-ui, sans-serif;
  display: flex;
  flex-direction: column;
  gap: 24px;
}

.panel-section {
  background: #fff;
  padding: 10px;
  border-radius: 12px;
  box-shadow: 0 2px 8px rgba(0,0,0,0.06);
  width: 220px;
}

.panel-title {
  display: flex;
  align-items: center;
  font-size: 16px;
  font-weight: 600;
  color: #303133;
  margin: 0 0 20px 0;
}

.panel-title i {
  color: #165DFF;
  font-size: 18px;
  margin-right: 8px;
}

.guide-content {
  font-size: 14px;
  color: #606266;
}

.guide-item {
  display: flex;
  /* justify-content: space-between; */
  /* align-items: center; */
  flex-direction: column;
  padding: 8px 0;
  gap: 10px;
}

.guide-item:not(:last-child) {
  border-bottom: 1px solid #f0f2f5;
}

.guide-value {
  font-weight: 500;
  color: #303133;
}

.quick-service-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 12px;
}

.quick-service-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 16px 8px;
  background: #f8f9fa;
  border-radius: 8px;
  border: 1px solid transparent;
  cursor: pointer;
  transition: all 0.2s ease;
}

.quick-service-item:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0,0,0,0.08);
  background: #fff;
  border-color: #165DFF;
}

.item-icon-wrapper {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  background-color: rgba(22, 93, 255, 0.1);
  color: #165DFF;
  font-size: 20px;
  margin-bottom: 8px;
}

.quick-service-item:hover .item-icon-wrapper {
  background-color: #165DFF;
  color: #fff;
}

.item-icon-wrapper.screen-share-icon {
  background-color: rgba(54, 207, 201, 0.1);
  color: #36CFC9;
}

.quick-service-item:hover .screen-share-icon {
  background-color: #36CFC9;
  color: #fff;
}

.item-text {
  font-size: 12px;
  color: #303133;
  font-weight: 500;
}
</style>

<style>
/* Global style for the alert */
.code-alert .code-highlight {
  color: #165DFF;
  font-size: 20px;
  letter-spacing: 2px;
}
</style>