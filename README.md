# solar-system-observatory

真实数据优先、来源透明、模型分级明确的太阳系观测学习网站。  
技术栈：`Next.js App Router + TypeScript + Tailwind CSS + Three.js / React Three Fiber + Zustand + zod`。

## 当前状态

- 首页 `/`
- 太阳系总览 `/solar-system`
- 系统页 `/system/[slug]`
- 天体详情 `/body/[slug]`
- 学习页 `/learn`
- 来源页 `/sources`
- 本地搜索与 5 个 API routes
- `data/normalized` + `data/generated/orbits/<preset>/<body>.json` + `orbit-manifest.json`
- `scripts/` 中已接入 JPL SSD / Horizons 在线同步逻辑，并保留离线 fallback

当前仓库快照统计：

- 174 个天体条目
- 8 个系统入口
- 25 个当前已生成的 preset 轨道缓存文件

说明：

- 仓库默认可以离线直接运行。
- 当执行 `sync:all` 时，脚本会优先拉取 JPL SSD / Horizons；失败时回退到已有 raw cache 或现有 normalized snapshot。
- 这个终端环境无法连通 JPL，因此本次提交验证的是“在线同步代码路径 + 离线 fallback + manifest/preset 架构”都可工作；若要得到真正的 Horizons 缓存，需要在可联网环境执行一次 `pnpm sync:all`。

## 快速启动

### 1. 安装依赖

```bash
pnpm install
```

如果本机没有全局 `pnpm`：

```bash
npx pnpm@10 install
```

### 2. 直接启动

仓库已经包含一份可运行的 `normalized` / `generated` 快照。

```bash
pnpm dev
```

打开 [http://localhost:3000](http://localhost:3000)。

### 2.1 Windows 零环境配置发布版（推荐给朋友）

你可以直接发给别人一个安装文件（不需要对方有 Node、pnpm、Python、Git、Docker），安装后双击运行即可。

```bash
pnpm desktop:build
```

或者（无 pnpm 本地安装）：

```bash
npx --yes pnpm@10 run desktop:build
```

> 说明：Windows 安装包请在 Windows 机器上执行打包流程，或使用 GitHub Actions/Windows Runner 自动构建，避免跨平台打包兼容问题。

打包输出：

- `dist-desktop/solar-system-observatory-Setup-<version>-x64.exe`（安装版）
- `dist-desktop/solar-system-observatory-<version>-portable.exe`（便携版）
- `dist-desktop/win-unpacked/`（调试产物）

运行/开发调试命令：

```bash
pnpm desktop:dev      # 本地启动 Next 开发服务器 + Electron 客户端（调试）
pnpm desktop:run      # 运行已打包前的开发版入口（依赖 node_modules 中的 electron）
pnpm desktop:pack:win # 强制只生成 Windows 打包产物
```

分享方式不再依赖域名，只要在发布页放“安装包直链”：

```
https://github.com/ZhengWei0000/solar-system-observatory/releases/latest
```

用户下载 `.exe` 安装后打开 `Solar System Observatory`，直接访问：

- `首页 /`
- `太阳系总览 /solar-system`
- `系统页 /system/earth`
- `详情页 /body/earth`
- `学习页 /learn`
- `来源页 /sources`

### 2.2 上传到 GitHub（推荐）

仓库已添加远端：

```text
origin = https://github.com/ZhengWei0000/solar-system-observatory.git
```

推荐用 GitHub PAT（推荐 scope：`repo`）一键推送：

```bash
export GITHUB_TOKEN=<你的_GITHUB_PAT>
./scripts/push-to-github.sh main origin https://github.com/ZhengWei0000/solar-system-observatory.git
# 或
npm run git:push -- main origin https://github.com/ZhengWei0000/solar-system-observatory.git
```

也可用 SSH（长期推荐）：

```bash
ssh-keygen -t ed25519 -C "you@example.com"   # 如未创建过
cat ~/.ssh/id_ed25519.pub
# 将公钥加入 GitHub -> Settings -> SSH and GPG keys
git remote set-url origin git@github.com:ZhengWei0000/solar-system-observatory.git
git push -u origin main
```

### 2.3 没有自己的域名也能共享

可以不买域名直接发公开链接给别人，先启动站点后，再执行公开隧道命令：

```bash
npx --yes pnpm@10 dev
```

另开一个终端执行：

```bash
npx --yes pnpm@10 share
```

常用命令：

- `npx --yes pnpm@10 share`：默认优先尝试 `cloudflared`，无可用时回退到 `localtunnel`。
- `npx --yes pnpm@10 share:lt`：强制使用 `localtunnel`。
- `npx --yes pnpm@10 share:cloudflared`：优先使用 `cloudflared`。
- 你也可以固定隧道子域名（防止每次链接变化）：
  - `SHARE_SUBDOMAIN=my-solar-ship npx --yes pnpm@10 share`

更稳的分享方式（建议用于对外演示）：

```bash
# 直接启动生产态并共享（脚本会先做健康检查）
AUTO_START_SERVER=true FORCE_BUILD_SHARED_SITE=true npx --yes pnpm@10 share --prod

# 或先手动启动生产服务，再共享
npx --yes pnpm@10 build && npx --yes pnpm@10 start
npx --yes pnpm@10 share
```

说明：

- `--prod` 会在后端服务未检测到时自动用 `next start` 提供服务，比 `next dev` 在隧道环境下更稳定。
- 生产态共享前会先校验：
  - `/api/health`
  - `/api/bodies`
  - `/api/orbits?bodyId=earth&preset=overview-current`
  - `/api/search?q=earth`
  - `/solar-system`

如果机器上还没有隧道客户端，可先安装其中任意一个：

```bash
npm i -g localtunnel
# 或安装 cloudflared（不同系统可按官方文档安装）
```

两个命令会打印一个 `https://xxxx.trycloudflare.com` 或 `https://xxxx.loca.lt` 的公网链接，别人打开后可直接访问。

### 3. 部署（给别人发固定链接）

如果你有一台可公开访问的服务器，建议按下文部署到云主机后再绑定固定域名；否则临时分享隧道可直接用于演示和验收。

当前已为你的域名预置参考入口：

- https://zhengwei.bond
- https://www.zhengwei.bond

## 生产发布（给别人发链接直接可用）

当前默认发布方式改为 **阿里云 ECS + Docker**（不依赖 Vercel CLI）。

### 0）环境准备（可选）

- 已安装 Docker Engine / Docker Compose。
- 已完成代码依赖准备与质量门禁（见后文）。
- 准备一台 ECS（推荐 2C4G 起步）用于跑服务。
- 如果本机无 `pnpm`，项目也可用 `npx --yes pnpm@10` 运行脚本；镜像构建无需全局 pnpm。

### 1）部署（最少步骤）

```bash
# 复制并填充部署环境变量
cp deploy/.env.example deploy/.env.production
edit deploy/.env.production

# 一键构建镜像 + 启动容器（含健康检查）
pnpm docker:run

# 或者分步运行
npx --yes pnpm@10 docker:build
docker run -d --name solar-system-observatory \
  --env-file deploy/.env.production \
  -p 3000:3000 \
  solar-system-observatory:latest
```

镜像启动后，可直接访问：

- `http://<你的服务器IP或域名>:3000/`（直接端口方式）
- 首次部署建议先访问 `http://<你的服务器IP>:3000/api/health` 验证启动。

### 2）Nginx 反向代理（80 / 443）

项目附带 `deploy/nginx/default.conf`，示例用途：

- 将域名流量转发到 `127.0.0.1:3000`。
- 80 自动转 443，443 配合 `certbot` 证书。
- 推荐绑定到 ECS 上，结合你自己的证书路径。

如果你希望直接用 Compose 一键启动，可执行：

```bash
pnpm docker:compose
```

并参考 `deploy/alicloud/README.md` 获取完整 ECS/域名/证书步骤。

当前项目默认会把 `deploy/.env.example` 的 `NEXT_PUBLIC_SITE_URL` 指向 `https://zhengwei.bond`，可按需修改为你最终绑定域名。

### 3）健康检查和可达性

- 健康检查接口：`/api/health`
- 可公开访问入口建议：
  - `/`
  - `/solar-system`
  - `/system/earth`
  - `/body/earth`
  - `/learn`
  - `/sources`

典型 API 校验：

- `/api/orbits?bodyId=earth&preset=overview-current`
- `/api/search?q=earth`

### 4）回退策略

- 每次更新都打上新镜像 tag（如 `v0.1.0`）。
- 回退时停止新容器并启动上一版镜像即可。

### 5）Vercel 兼容方案（可选）

- 你之前的 Vercel 流水线仍可用：项目保留 `app/api/health`、`robots`、`sitemap`，可继续作为备选部署目标。

### 6）配置同步与更新流程

```bash
pnpm sync:all
```

等价顺序：

```bash
pnpm sync:catalog
pnpm sync:physical
pnpm sync:assets
pnpm build:orbits
pnpm build:search
```

### 7）在 Compose 下启动（可选）

```bash
cd deploy/docker
docker compose -f docker-compose.alicloud.yml up -d --build
```

## 验证命令

```bash
pnpm typecheck
pnpm lint
pnpm test
pnpm build
```

备注：

- 在这个沙箱里 `next build` 的 Turbopack 会因为进程端口限制 panic；项目本身已通过 `next build --webpack` 验证。
- 如果本地 `npx pnpm@10` 受网络影响，可以直接使用已安装依赖运行等价本地命令。

## 数据与轨道策略

### 数据源

- 轨道真值：JPL Horizons API
- 目录基线：JPL SSD Planetary Satellite Discovery Circumstances
- 物理参数：JPL SSD Planetary Physical Parameters / Planetary Satellite Physical Parameters
- 形状与模型来源：NASA 3D Resources / PDS Shape Models / 科学近似模型 fallback

### 轨道缓存分层

- `horizons_sampled`
  - 来自 Horizons `VECTORS` 状态向量，离线采样并缓存到仓库
- `mean_elements_reference`
  - 来自平均轨道参数的教学参考轨道
- `manual_reference`
  - 非轨道对象或手工说明字段

### `orbitAvailability`

- `horizons_cached`
  - 仓库中已有官方轨迹缓存
- `reference_only`
  - 当前只提供参考轨道
- `unresolved`
  - 当前没有官方缓存，也没有足够的参考轨道参数

### 当前 preset 规划

- `overview-current`
  - 八大行星，Sun-centered
- `earth-system-current`
  - Moon，Earth-centered
- `mars-system-current`
  - Phobos / Deimos，Mars-centered
- `jupiter-system-current`
  - 伽利略卫星优先走 Horizons，其余木星卫星保留参考轨道 fallback
- `saturn-system-current`
  - Titan / Enceladus 优先走 Horizons，其余土星卫星保留参考轨道 fallback
- `pluto-system-current`
  - Charon / Nix / Hydra 优先走 Horizons，其余冥王星系统成员保留 fallback

### Moon 特例

JPL SSD 的卫星发现页当前统计 459 个 planetary satellites，包含 Pluto 系统但不包含 Earth。  
因此月球由 `data/curated` 层单独并入规范化目录，而不是假装它来自 SSD 卫星发现页。

## 目录结构

```text
app/
  (site)/
  api/
components/
  body/
  layout/
  scene/
  search/
  system/
  ui/
lib/
  adapters/
    horizons/
    jpl-ssd/
  content/
  data/
  orbits/
  utils/
scripts/
  syncCatalog.ts
  syncPhysicalParams.ts
  syncFeaturedAssets.ts
  buildOrbitSamples.ts
  buildSearchIndex.ts
  catalog-pipeline.ts
data/
  curated/
  raw/
  normalized/
  generated/
public/
  models/
  textures/
  thumbnails/
types/
tests/
```

## API

### `GET /api/bodies`

返回本地规范化天体列表。

### `GET /api/bodies/[slug]`

返回单个天体详情。

### `GET /api/systems/[slug]`

返回系统聚合数据与成员列表。

### `GET /api/search?q=`

返回本地 JSON 搜索索引的匹配结果。

### `GET /api/orbits?bodyId=&preset=`

返回本地缓存轨道样本。

返回字段包含：

- `status`
- `source`
- `orbitDataKind`
- `orbitAvailability`
- `preset`
- `centerBodyId`
- `coverage`
- `points`

没有缓存时返回 `status: "missing"`，不会伪造“看起来像真的”轨道。

## 脚本说明

### `pnpm sync:catalog`

- 抓取 JPL SSD 卫星发现页
- 写入 `data/raw/jpl/ssd/discovery.html`
- 合并 `data/curated/*` 与现有 normalized snapshot
- 生成新的 `data/normalized/bodies.json` / `systems.json`

### `pnpm sync:physical`

- 抓取行星与卫星物理参数页
- 写入 `data/raw/jpl/ssd/planets-physical.html`
- 写入 `data/raw/jpl/ssd/satellites-physical.html`
- 回填半径、质量、密度、重力等字段

### `pnpm sync:assets`

- 读取当前 normalized bodies 与 `data/curated/planet-appearance.json`
- 写出 `data/generated/asset-manifest.json`
- 输出 `renderMode / bundledRasterMaps / fallbackMaps / bundledModelPath / maxDetailTier / textureFormat / mipTiers / postFxTier / usesOfficialMesh`

### `pnpm build:textures`

- 生成本地离线行星栅格贴图到 `public/textures/planets/*`
- 优先读取 `data/curated/official-planet-textures.json`，从 NASA 官方纹理页 / Photojournal / 官方 3D 模型包同步主纹理到 `data/raw/planet-textures/*`
- 覆盖 Mercury / Venus / Earth / Mars / Jupiter / Saturn / Uranus / Neptune / Pluto
- 主贴图格式为本地 `PNG`，`SVG` 仅保留为 fallback
- 默认生成 `1K / 2K / 4K` 多级贴图
- Earth / Mars / Jupiter / Saturn 会额外生成 `8K` 详情贴图
- Rocky planets 会生成 `albedo + roughness + normal`
- Earth 会额外生成 `clouds + night-lights + specular`
- Saturn 会额外生成 `ring-color + ring-alpha + ring-roughness`
- 当前主 albedo 优先级：
  - Mercury / Venus / Mars / Jupiter / Pluto: 官方观测或官方发布全球图
  - Earth / Saturn / Uranus: 官方 3D 模型内嵌纹理
  - Neptune: 官方解释型纹理页资源

### `pnpm build:orbits`

- 读取 `lib/orbits/presets.ts`
- 优先为 preset 重点对象抓取 Horizons vectors
- 原始响应写入 `data/raw/jpl/horizons/vectors/*`
- 解析后写入 `data/generated/orbits/<preset>/<body>.json`
- 同步生成 `data/generated/orbit-manifest.json`
- 对无官方缓存对象生成或保留参考轨道

### `pnpm build:search`

- 基于 normalized bodies/systems 重建本地搜索索引

## 如何添加新模型

### 1. 放置资源

把模型或贴图放到：

- `public/models`
- `public/textures`
- `public/thumbnails`

行星外观升级优先写入 `data/curated/planet-appearance.json`，不要把多张贴图路径直接塞进 `Body`。

### 2. 更新 curated 覆盖层

优先修改 `data/curated/body-overrides.json`：

- `modelPath`
- `texturePath`
- `thumbnailPath`
- `shapeSource`
- `modelGrade`
- `hasHighFidelityShape`

### 3. 重新生成资产清单

```bash
pnpm build:textures
pnpm sync:assets
```

## 行星外观说明

- 所有主要行星都支持本地离线外观配置，配置文件位于 `data/curated/planet-appearance.json`
- 当前详情页优先展示高质量科学近似材质：真实尺寸参数 + 本地高精贴图 + 云层/夜光/大气层/环系统
- `overview/system` 场景默认优先使用 `2K` 级贴图，移动端自动降到 `1K`
- `detail` 场景默认优先使用 `4K`，Earth / Mars / Jupiter / Saturn 支持 `8K`
- `textureSource` / `visualAppearanceSource` 会和 `shapeSource` 分开显示，避免把高质量贴图误说成真实形状模型
- 页面中的 `Appearance References` 指向对应官方页面；运行时主 albedo 会优先读取从官方源导出的本地 PNG，多数辅助贴图仍是站内派生结果，`SVG` 仅作为 fallback
- 视觉真实感增强不等同于真实形状模型升级
- 只有在本地真正接入可追溯官方/科研 mesh 时，`modelGrade` 才允许升级到 `S / A`

### 模型等级约定

- `S`: 官方/科研级真实模型
- `A`: 真实形状数据二次处理模型
- `B`: 科学近似模型
- `C`: 占位近似模型

如果只是球体 + 真实尺寸/颜色近似，不要标成 `S` 或 `A`。

## 如何扩展真实轨迹覆盖范围

1. 在 `lib/orbits/presets.ts` 增加新的 preset 或扩大 `bodyIds`
2. 为目标对象补充 `horizonsId` / `naifId` 到 `data/curated/body-overrides.json`
3. 运行 `pnpm build:orbits`
4. 检查 `data/generated/orbit-manifest.json` 中的 `orbitAvailability`
5. 在 `/sources` 与详情页确认 `preset / centerBody / coverage / generatedAt` 已展示

## 如何升级到更高精度方案

### 从当前架构继续往上走

1. 继续扩大 Horizons 缓存覆盖对象
2. 为关键系统生成更长时间窗与更细步长的 preset
3. 接入 NAIF/SPICE / SPK 作为更高精度离线预计算层
4. 按 barycentric / body-centered 分开生成轨道缓存

### 代码入口

- JPL SSD 解析器：
  - `lib/adapters/jpl-ssd/parse-discovery.ts`
  - `lib/adapters/jpl-ssd/parse-planet-physical.ts`
  - `lib/adapters/jpl-ssd/parse-satellite-physical.ts`
- Horizons：
  - `lib/adapters/horizons/lookup.ts`
  - `lib/adapters/horizons/vectors.ts`
- 数据仓库：
  - `lib/data/repository.ts`

## 已验证

- `tsc --noEmit`
- `eslint .`
- `vitest run`
- `next build --webpack`

## 备注

- 项目默认不在前端直连 JPL。
- 即使在无外网环境中，站点也会稳定读取仓库内置快照。
- 真正的 Horizons 轨迹缓存生成依赖可访问 JPL 的网络环境；脚本已经实现，运行环境恢复连通后即可直接刷新。
