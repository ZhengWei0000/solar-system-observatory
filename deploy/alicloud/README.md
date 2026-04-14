# 阿里云 ECS 部署手册（不使用 Vercel CLI）

本项目默认支持两种运行模式：
- 直接访问容器端口（`3000`）
- 通过 Nginx 反代到 `80/443`（推荐）

已绑定域名场景可直接使用：`https://zhengwei.bond`

> 说明：项目业务代码不变，部署层只做运行时容器化，适合直接复用现有同步脚本与本地 JSON 缓存。

## 1）环境准备

1. 在阿里云 ECS 新建一台 Ubuntu 或 CentOS 实例（建议至少 2C4G）。
2. 安装 Docker 与 Compose 插件。
3. 放行安全组端口：
   - `80/TCP`、`443/TCP`（若直接端口访问可选 `3000/TCP`）
4. 准备域名并解析到实例公网 IP。
   - 你当前域名：`zhengwei.bond`
   - 推荐 DNS 服务器：`dns3.hichina.com`、`dns4.hichina.com`
   - 在阿里云域名控制台设置：
     - `A 记录`：`@` 指向 ECS 的公网 IPv4
     - `A 记录`：`www` 指向 ECS 的公网 IPv4（可选）
     - 如已配置 DNS 解析，等待解析生效后再进行下一步

## 2）获取代码与环境变量

在实例上执行：

```bash
git clone <your-repo-url> solar-system-observatory
cd solar-system-observatory
cp deploy/.env.example deploy/.env.production
vim deploy/.env.production   # 设置 NEXT_PUBLIC_SITE_URL、可选的同步参数
```

`deploy/.env.production` 示例关键字段：

- `NEXT_PUBLIC_SITE_URL`
- `NEXT_PUBLIC_APP_VERSION`
- `JPL_HORIZONS_API_URL`
- `JPL_HORIZONS_LOOKUP_API_URL`
- `JPL_SSD_BASE_URL`
- `SYNC_TIMEOUT_MS`
- `SYNC_CONCURRENCY`

## 3）一键构建与启动（推荐）

```bash
pnpm docker:run
```

脚本将会：

1. 以 `deploy/.env.production` 注入环境变量
2. 构建 `solar-system-observatory:latest`
3. 重建并启动容器
4. 调用 `/api/health` 进行启动健康检查

启动成功后可访问：

- `http://<实例IP>:3000/`
- `https://zhengwei.bond/`

`deploy/.env.production` 建议固定值：

```ini
NEXT_PUBLIC_SITE_URL=https://zhengwei.bond
NEXT_PUBLIC_APP_VERSION=0.1.0
```

## 4）Nginx 反代（公开域名推荐）

仓库提供 `deploy/nginx/default.conf`，默认反代到容器 `3000` 端口。

```bash
cd deploy/docker
mkdir -p nginx/certs
docker compose -f docker-compose.alicloud.yml up -d
```

证书获取建议（Debian/Ubuntu）：

```bash
sudo certbot --nginx -d zhengwei.bond -d www.zhengwei.bond
```

续期：

```bash
sudo certbot renew --quiet && sudo systemctl reload nginx
```

证书文件放置到：
- `deploy/docker/nginx/certs/fullchain.pem`
- `deploy/docker/nginx/certs/privkey.pem`

若使用 Certbot 自动签发且 nginx 已配置 HTTPS，可在 `/etc/letsencrypt/live/zhengwei.bond/` 找到证书并复制到：

```bash
mkdir -p deploy/docker/nginx/certs
cp /etc/letsencrypt/live/zhengwei.bond/fullchain.pem deploy/docker/nginx/certs/fullchain.pem
cp /etc/letsencrypt/live/zhengwei.bond/privkey.pem deploy/docker/nginx/certs/privkey.pem
```

Nginx 配置文件位于：
- `deploy/nginx/default.conf`

## 5）可达性验收清单

```bash
curl -I https://zhengwei.bond/          # 首屏返回
curl -I https://zhengwei.bond/api/health
curl "https://zhengwei.bond/api/orbits?bodyId=earth&preset=overview-current"
curl "https://zhengwei.bond/api/search?q=earth"
curl -I https://zhengwei.bond/solar-system
```

建议额外打开：

- `/`
- `/solar-system`
- `/system/earth`
- `/body/earth`
- `/learn`
- `/sources`

若 HTTPS 证书未生效，可先用 HTTP 回环验证：

```bash
curl -I http://<实例IP>/api/health
```

## 6）更新与回滚

### 更新数据快照（推荐）

```bash
pnpm sync:all
git add data/normalized data/generated
git commit -m "chore: update sync snapshots"
git push
```

ECS 服务器 `git pull + pnpm docker:run` 即可发布新快照。

### 回滚

保留历史镜像 tag（例如 `v0.1.0`、`v0.1.1`）：

```bash
docker run ... solar-system-observatory:v0.1.0
```

切换为稳定镜像即可恢复。

## 7）当前可直接使用的公开入口（域名就绪后）

只要 DNS 与容器全部正常，外部固定共享链接即为：

- https://zhengwei.bond
- https://www.zhengwei.bond
## 8）可选：阿里云 FC 容器化方案

若不想维护 ECS，可直接将同一镜像推送到 ACR 后在 FC 的自定义镜像函数运行：

1. 先用 Docker 构建镜像并推送到 ACR
2. 在 FC 创建自定义运行时容器函数
3. 绑定自定义域名与 HTTPS

与 ECS 方案相比，FC 成本弹性更高，但冷启动和并发容量需要额外调参。
