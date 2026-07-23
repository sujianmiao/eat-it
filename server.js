const http = require('http');
const https = require('https');
const url = require('url');
const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');
const os = require('os');

const PORT = process.env.PORT || 3000;

http.createServer((req, res) => {
  const parsedUrl = url.parse(req.url, true);

  if (parsedUrl.pathname === '/api/baidu/token') {
    // 优先使用环境变量中的密钥，兼容旧的 query 参数方式
    const ak = process.env.BAIDU_AK || parsedUrl.query.ak;
    const sk = process.env.BAIDU_SK || parsedUrl.query.sk;
    if (!ak || !sk) {
      res.writeHead(400, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'missing ak or sk (请配置 BAIDU_AK / BAIDU_SK 环境变量)' }));
      return;
    }

    const tokenUrl = `https://aip.baidubce.com/oauth/2.0/token?grant_type=client_credentials&client_id=${encodeURIComponent(ak)}&client_secret=${encodeURIComponent(sk)}`;

    https.get(tokenUrl, (apiRes) => {
      let body = '';
      apiRes.on('data', (chunk) => body += chunk);
      apiRes.on('end', () => {
        res.writeHead(200, {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        });
        res.end(body);
      });
    }).on('error', (e) => {
      res.writeHead(502, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: e.message }));
    });
    return;
  }

  // DeepSeek API 代理（隐藏 API Key）
  if (parsedUrl.pathname === '/api/deepseek/chat') {
    if (req.method !== 'POST') {
      res.writeHead(405, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'method not allowed' }));
      return;
    }

    const apiKey = process.env.DEEPSEEK_API_KEY;
    if (!apiKey) {
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'DEEPSEEK_API_KEY 环境变量未配置' }));
      return;
    }

    let body = '';
    req.on('data', (chunk) => body += chunk);
    req.on('end', () => {
      const options = {
        hostname: 'api.deepseek.com',
        path: '/v1/chat/completions',
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer ' + apiKey,
          'Content-Length': Buffer.byteLength(body)
        }
      };

      const apiReq = https.request(options, (apiRes) => {
        let respBody = '';
        apiRes.on('data', (chunk) => respBody += chunk);
        apiRes.on('end', () => {
          res.writeHead(apiRes.statusCode, {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*'
          });
          res.end(respBody);
        });
      });

      apiReq.on('error', (e) => {
        res.writeHead(502, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: e.message }));
      });

      apiReq.write(body);
      apiReq.end();
    });
    return;
  }

  if (parsedUrl.pathname === '/api/baidu/dish') {
    if (req.method !== 'POST') {
      res.writeHead(405, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'method not allowed' }));
      return;
    }

    let body = '';
    req.on('data', (chunk) => body += chunk);
    req.on('end', () => {
      const params = new URLSearchParams(body);
      const accessToken = params.get('access_token');
      params.delete('access_token');

      if (!accessToken) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'missing access_token' }));
        return;
      }

      const apiUrl = `https://aip.baidubce.com/rest/2.0/image-classify/v2/dish?access_token=${encodeURIComponent(accessToken)}`;

      const options = {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        }
      };

      const apiReq = https.request(apiUrl, options, (apiRes) => {
        let respBody = '';
        apiRes.on('data', (chunk) => respBody += chunk);
        apiRes.on('end', () => {
          res.writeHead(200, {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*'
          });
          res.end(respBody);
        });
      });

      apiReq.on('error', (e) => {
        res.writeHead(502, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: e.message }));
      });

      apiReq.write(params.toString());
      apiReq.end();
    });
    return;
  }

  // 百度通用物体和场景识别（支持蔬果、水果等通用物体）
  if (parsedUrl.pathname === '/api/baidu/general') {
    if (req.method !== 'POST') {
      res.writeHead(405, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'method not allowed' }));
      return;
    }

    let body = '';
    req.on('data', (chunk) => body += chunk);
    req.on('end', () => {
      const params = new URLSearchParams(body);
      const accessToken = params.get('access_token');
      params.delete('access_token');

      if (!accessToken) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'missing access_token' }));
        return;
      }

      const apiUrl = `https://aip.baidubce.com/rest/2.0/image-classify/v2/advanced_general?access_token=${encodeURIComponent(accessToken)}`;

      const options = {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        }
      };

      const apiReq = https.request(apiUrl, options, (apiRes) => {
        let respBody = '';
        apiRes.on('data', (chunk) => respBody += chunk);
        apiRes.on('end', () => {
          res.writeHead(200, {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*'
          });
          res.end(respBody);
        });
      });

      apiReq.on('error', (e) => {
        res.writeHead(502, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: e.message }));
      });

      apiReq.write(params.toString());
      apiReq.end();
    });
    return;
  }

  // 百度果蔬识别（专门识别水果、蔬菜）
  if (parsedUrl.pathname === '/api/baidu/ingredient') {
    if (req.method !== 'POST') {
      res.writeHead(405, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'method not allowed' }));
      return;
    }

    let body = '';
    req.on('data', (chunk) => body += chunk);
    req.on('end', () => {
      const params = new URLSearchParams(body);
      const accessToken = params.get('access_token');
      params.delete('access_token');

      if (!accessToken) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'missing access_token' }));
        return;
      }

      const apiUrl = `https://aip.baidubce.com/rest/2.0/image-classify/v1/ingredient?access_token=${encodeURIComponent(accessToken)}`;

      const options = {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        }
      };

      const apiReq = https.request(apiUrl, options, (apiRes) => {
        let respBody = '';
        apiRes.on('data', (chunk) => respBody += chunk);
        apiRes.on('end', () => {
          res.writeHead(200, {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*'
          });
          res.end(respBody);
        });
      });

      apiReq.on('error', (e) => {
        res.writeHead(502, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: e.message }));
      });

      apiReq.write(params.toString());
      apiReq.end();
    });
    return;
  }

  // 百度植物识别（识别水果、蔬菜、植物等）
  if (parsedUrl.pathname === '/api/baidu/plant') {
    if (req.method !== 'POST') {
      res.writeHead(405, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'method not allowed' }));
      return;
    }

    let body = '';
    req.on('data', (chunk) => body += chunk);
    req.on('end', () => {
      const params = new URLSearchParams(body);
      const accessToken = params.get('access_token');
      params.delete('access_token');

      if (!accessToken) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'missing access_token' }));
        return;
      }

      const apiUrl = `https://aip.baidubce.com/rest/2.0/image-classify/v1/plant?access_token=${encodeURIComponent(accessToken)}`;

      const options = {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        }
      };

      const apiReq = https.request(apiUrl, options, (apiRes) => {
        let respBody = '';
        apiRes.on('data', (chunk) => respBody += chunk);
        apiRes.on('end', () => {
          res.writeHead(200, {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*'
          });
          res.end(respBody);
        });
      });

      apiReq.on('error', (e) => {
        res.writeHead(502, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: e.message }));
      });

      apiReq.write(params.toString());
      apiReq.end();
    });
    return;
  }

  // 视频截图API - 从抖音链接下载视频并截取关键帧
  if (parsedUrl.pathname === '/api/video/screenshot') {
    if (req.method !== 'POST') {
      res.writeHead(405, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'method not allowed' }));
      return;
    }

    let body = '';
    req.on('data', (chunk) => body += chunk);
    req.on('end', () => {
      const params = new URLSearchParams(body);
      const videoUrl = params.get('url');
      if (!videoUrl) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'missing url' }));
        return;
      }

      const tempDir = os.tmpdir();
      const videoFile = path.join(tempDir, `video_${Date.now()}.mp4`);
      const screenshotFile = path.join(tempDir, `screenshot_${Date.now()}.jpg`);

      downloadVideo(videoUrl, videoFile)
        .then(() => {
          return takeScreenshot(videoFile, screenshotFile);
        })
        .then(() => {
          const imageData = fs.readFileSync(screenshotFile);
          const base64 = 'data:image/jpeg;base64,' + imageData.toString('base64');
          
          cleanupFiles([videoFile, screenshotFile]);
          
          res.writeHead(200, {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*'
          });
          res.end(JSON.stringify({ success: true, image: base64 }));
        })
        .catch((err) => {
          cleanupFiles([videoFile, screenshotFile]);
          res.writeHead(500, {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*'
          });
          res.end(JSON.stringify({ error: err.message }));
        });
    });
    return;
  }

  let filePath = parsedUrl.pathname;
  if (filePath === '/') filePath = '/index.html';

  const decodedPath = decodeURIComponent(filePath);
  const fullPath = path.join(__dirname, decodedPath);
  console.log(`📁 请求资源: ${filePath} -> ${decodedPath} -> ${fullPath}`);
  const ext = path.extname(filePath);

  const mimeTypes = {
    '.html': 'text/html; charset=utf-8',
    '.js': 'application/javascript',
    '.css': 'text/css',
    '.json': 'application/json',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.gif': 'image/gif',
    '.svg': 'image/svg+xml',
    '.ico': 'image/x-icon',
    '.webp': 'image/webp',
    '.mp4': 'video/mp4',
    '.mp3': 'audio/mpeg',
    '.wav': 'audio/wav',
    '.ogg': 'audio/ogg'
  };

  fs.readFile(fullPath, (err, data) => {
    if (err) {
      console.error(`❌ 文件读取失败: ${fullPath}`);
      console.error(`   错误: ${err.message}`);
      res.writeHead(404, { 'Content-Type': 'text/plain' });
      res.end('404 Not Found');
      return;
    }
    res.writeHead(200, { 'Content-Type': mimeTypes[ext] || 'application/octet-stream' });
    res.end(data);
  });

}).listen(PORT, '0.0.0.0', () => {
  console.log(`\n  🚀 服务器已启动: http://localhost:${PORT}\n`);
  console.log(`  📋 路由列表:`);
  console.log(`     GET  /api/baidu/token?ak=xxx&sk=xxx  → 获取access_token`);
  console.log(`     POST /api/baidu/dish                 → 菜品识别`);
  console.log(`     POST /api/baidu/ingredient           → 果蔬识别`);
  console.log(`     POST /api/baidu/plant                → 植物识别`);
  console.log(`     POST /api/baidu/general              → 通用物体识别`);
  console.log(`     POST /api/video/screenshot           → 视频截图\n`);

  // ===== 调试：启动时打印 assest 目录结构 =====
  console.log('========== 启动调试信息 ==========');
  console.log('当前工作目录:', process.cwd());
  console.log('__dirname:', __dirname);
  try {
    console.log('--- 根目录文件 ---');
    fs.readdirSync(__dirname).forEach(f => console.log('  ', f));
    console.log('--- assest/ 目录 ---');
    const assestPath = path.join(__dirname, 'assest');
    if (fs.existsSync(assestPath)) {
      fs.readdirSync(assestPath).forEach(f => console.log('  ', f));
      console.log('--- assest/icons/ 目录 ---');
      const iconPath = path.join(assestPath, 'icons');
      if (fs.existsSync(iconPath)) {
        fs.readdirSync(iconPath).forEach(f => console.log('  ', f));
        console.log('--- assest/icons/healthy/ 文件数 ---');
        const healthPath = path.join(iconPath, 'healthy');
        if (fs.existsSync(healthPath)) {
          const files = fs.readdirSync(healthPath);
          console.log('  文件数:', files.length);
          files.slice(0, 3).forEach(f => console.log('  示例:', f));
        } else {
          console.log('  ❌ healthy 文件夹不存在');
        }
      } else {
        console.log('  ❌ icons 文件夹不存在');
      }
    } else {
      console.log('  ❌ assest 文件夹不存在！');
    }
  } catch (e) {
    console.log('调试出错:', e.message);
  }
  console.log('========== 调试信息结束 ==========\n');
});

function resolveDouyinUrl(url) {
  return new Promise((resolve, reject) => {
    if (url.includes('douyin.com') || url.includes('ixigua.com')) {
      const parsed = url.parse(url);
      https.get({
        hostname: parsed.hostname,
        path: parsed.path,
        headers: {
          'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.0 Mobile/15E148 Safari/604.1',
          'Referer': 'https://www.douyin.com/',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8'
        }
      }, (res) => {
        if (res.statusCode === 301 || res.statusCode === 302) {
          resolve(res.headers.location || url);
          return;
        }
        
        let body = '';
        res.on('data', (chunk) => body += chunk);
        res.on('end', () => {
          let videoUrl = url;
          const playAddrMatch = body.match(/playAddr["']\s*:\s*["']([^"']+)["']/);
          const videoPlayMatch = body.match(/videoPlay["']\s*:\s*["']([^"']+)["']/);
          const srcNoMarkMatch = body.match(/srcNoMark["']\s*:\s*["']([^"']+)["']/);
          const urlListMatch = body.match(/url_list["']\s*:\s*\[["']([^"']+)["']/);
          
          if (playAddrMatch) videoUrl = playAddrMatch[1];
          else if (videoPlayMatch) videoUrl = videoPlayMatch[1];
          else if (srcNoMarkMatch) videoUrl = srcNoMarkMatch[1];
          else if (urlListMatch) videoUrl = urlListMatch[1];
          
          if (videoUrl.includes('http')) {
            resolve(videoUrl.replace(/\\u002F/g, '/').replace(/\\\//g, '/'));
          } else {
            resolve(url);
          }
        });
      }).on('error', () => {
        resolve(url);
      });
    } else {
      resolve(url);
    }
  });
}

function downloadVideo(url, outputPath) {
  return resolveDouyinUrl(url)
    .then(resolvedUrl => {
      console.log(`解析视频链接: ${url} -> ${resolvedUrl}`);
      return new Promise((resolve, reject) => {
        https.get(resolvedUrl, (res) => {
          if (res.statusCode === 301 || res.statusCode === 302) {
            downloadVideo(res.headers.location, outputPath).then(resolve).catch(reject);
            return;
          }
          
          if (res.statusCode !== 200) {
            reject(new Error('下载失败: ' + res.statusCode));
            return;
          }

          const file = fs.createWriteStream(outputPath);
          res.pipe(file);
          file.on('finish', () => {
            file.close(resolve);
          });
          file.on('error', (err) => {
            fs.unlinkSync(outputPath);
            reject(err);
          });
        }).on('error', reject);
      });
    });
}

function takeScreenshot(videoPath, outputPath) {
  return new Promise((resolve, reject) => {
    const cmd = `ffmpeg -i "${videoPath}" -ss 00:00:01 -frames:v 1 -q:v 2 "${outputPath}"`;
    exec(cmd, (error, stdout, stderr) => {
      if (error) {
        reject(new Error('截图失败: ' + error.message));
        return;
      }
      if (fs.existsSync(outputPath)) {
        resolve();
      } else {
        reject(new Error('截图文件未生成'));
      }
    });
  });
}

function cleanupFiles(files) {
  files.forEach(file => {
    try {
      if (fs.existsSync(file)) {
        fs.unlinkSync(file);
      }
    } catch (e) {}
  });
}
