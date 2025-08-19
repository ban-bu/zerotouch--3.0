# Railway 快速部署配置

## 🚀 环境变量配置清单

在Railway项目控制台的Variables选项卡中添加以下环境变量：

### 必需变量
```bash
NODE_ENV=production
PORT=8080
```

### 可选变量（根据项目需要）
```bash
# 如果项目使用外部API
VITE_API_BASE_URL=https://your-api-domain.com

# 如果需要LLM服务
VITE_OPENAI_API_KEY=your-openai-key

# 日志级别
LOG_LEVEL=info
```

## 📋 部署检查清单

- [x] `railway.toml` 配置文件已创建
- [x] `Dockerfile.railway` 专用Docker文件已创建  
- [x] `package.json` 脚本已优化
- [x] `vite.config.js` 已配置生产环境
- [x] `.railwayignore` 已设置

## 🔧 部署命令

```bash
# 方法1：通过GitHub（推荐）
# 1. 将代码推送到GitHub
# 2. 在Railway控制台选择"Deploy from GitHub repo"
# 3. 设置环境变量
# 4. 自动部署

# 方法2：使用Railway CLI
npm install -g @railway/cli
railway login
railway init
railway up
```

## 🌐 访问应用

部署成功后，Railway会提供一个类似这样的URL：
`https://your-project-name.up.railway.app`

## ⚡ 性能优化特性

本配置包含以下优化：
- ✅ 多阶段Docker构建（减少镜像体积）
- ✅ Nginx静态资源缓存
- ✅ Gzip压缩
- ✅ 代码分割和资源优化
- ✅ SPA路由支持
- ✅ 健康检查配置

## 📊 监控建议

部署后建议监控：
- CPU和内存使用率
- 响应时间
- 错误率

可在Railway控制台的Metrics页面查看详细信息。
