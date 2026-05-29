# 部署说明

## 问题说明

若访问 [GitHub Pages](https://lianghaiye.github.io/---MES--CURSOR/) 只看到 README 文字、没有 I-DOMS 系统界面，说明 **完整项目代码尚未推送到 GitHub**（远程仓库目前只有 README）。

## 一次性推送（在本机终端执行）

```bash
cd /Users/jianjianya/CURSOR/i-doms-web

# 拉取远程并合并（若提示冲突，保留本地文件即可）
git pull origin main --allow-unrelated-histories --no-rebase

# 若上一步合并失败，可用强制推送（会覆盖远程仅有 README 的内容）
# git push -u origin main --force

git push -u origin main
```

推送成功后：

1. 打开 https://github.com/lianghaiye/---MES--CURSOR/actions
2. 等待 **Deploy to GitHub Pages** 工作流跑完（绿色 ✓）
3. 打开 https://github.com/lianghaiye/---MES--CURSOR/settings/pages
4. **Source** 选择 **GitHub Actions**（不要选 Deploy from branch）
5. 刷新 https://lianghaiye.github.io/---MES--CURSOR/

## 登录

- 账号：`admin`
- 密码：任意（Mock）

## 本地开发

```bash
npm install
npm run serve
```

访问 http://localhost:8080
