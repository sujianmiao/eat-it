FROM node:18-slim

# 安装 ffmpeg（视频识别截图需要）
RUN apt-get update && apt-get install -y ffmpeg && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# 复制项目文件
COPY . .

EXPOSE 3000

CMD ["node", "server.js"]
