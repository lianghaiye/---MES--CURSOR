# 阿里云整站部署（前端 + 泵小智代理）

演示机示例 IP：`140.249.201.28`（CentOS 7）。  
页面与代理都在同一台机器，Nginx 提供静态资源并反代 `/agent-api`。

## 一次安装

```bash
# Node（推荐 nvm）
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.1/install.sh | bash
source ~/.bashrc
nvm install 20

sudo yum install -y git nginx
sudo npm install -g pm2   # 若 npm 来自 nvm，可能不需要 sudo

cd /opt
sudo git clone <仓库地址> i-doms-web
sudo chown -R "$USER":"$USER" /opt/i-doms-web
cd /opt/i-doms-web
npm ci
VUE_APP_PUBLIC_PATH=/ npm run build

cd agent-proxy
cp .env.example .env
# 编辑 .env：COZE_PAT、COZE_BOT_ID 等
npm install
pm2 start server.js --name bxz-agent
pm2 save
pm2 startup   # 按提示执行输出的命令

sudo cp /opt/i-doms-web/deploy/nginx-aliyun.conf /etc/nginx/conf.d/i-doms.conf
# 按需改 server_name、root
sudo nginx -t && sudo systemctl enable nginx && sudo systemctl reload nginx
```

安全组放行 **TCP 80**（有 HTTPS 再放 443）。`3100` 建议只本机访问，不必对公网开放。

## 验证

```bash
curl -s http://127.0.0.1:3100/health
curl -I http://127.0.0.1/          # 或公网 IP
```

浏览器打开 `http://140.249.201.28` → 登录 → 泵小智提问。

## 日常更新

```bash
cd /opt/i-doms-web
git pull
npm ci
VUE_APP_PUBLIC_PATH=/ npm run build

# 仅当 agent-proxy 有变更时：
cd agent-proxy && npm install && pm2 restart bxz-agent
```

## 与 GitHub Pages 的关系

| 环境         | publicPath                     | 泵小智地址                                      |
| ------------ | ------------------------------ | ----------------------------------------------- |
| GitHub Pages | 默认 `/---MES--CURSOR/`        | 需 Secret `VUE_APP_AGENT_BASE_URL` 指向公网代理 |
| 阿里云整站   | 构建时 `VUE_APP_PUBLIC_PATH=/` | 同域 `/agent-api`（见 nginx 配置）              |
