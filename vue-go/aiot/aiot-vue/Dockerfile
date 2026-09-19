# 第一阶段：构建 Vue 应用
FROM node:18-alpine AS builder

WORKDIR /app

# 复制依赖文件并安装
COPY package*.json ./
RUN npm install

# 复制全部源码
COPY . .

# 构建 Vue 项目（输出到 dist/）
RUN npm run build

# ================================
# 第二阶段：使用 Nginx 提供服务
# ================================

FROM nginx:latest

# 将构建好的 Vue 静态文件复制到 Nginx 默认 html 目录
COPY --from=builder /app/dist /usr/share/nginx/html

# 将你自己定义的 nginx.conf 复制到容器内 nginx 的配置目录
COPY nginx.conf /etc/nginx/conf.d/default.conf

# 暴露 80 端口
EXPOSE 80

# 启动 nginx
CMD ["nginx", "-g", "daemon off;"]