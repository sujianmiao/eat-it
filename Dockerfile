FROM node:18-slim

# 安装 ffmpeg（视频识别截图需要）
RUN apt-get update && apt-get install -y ffmpeg && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# 复制项目文件
COPY . .

# 调试：列出 assest 文件夹内容，确认文件已复制
RUN ls -la assest/ && echo "=== assest/图标/ ===" && ls -la assest/图标/ 2>&1 || echo "图标文件夹不存在"

EXPOSE 3000

CMD ["node", "server.js"]
