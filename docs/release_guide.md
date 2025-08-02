# Cardity 发布和部署指南

本指南介绍如何发布 Cardity 编译器，让开发者可以像使用 Solidity 那样开发 Cardinals 协议。

## 🚀 发布策略

### 1. 核心编译器发布

#### 预编译二进制包

```bash
# 为不同平台编译
# Linux x64
docker run --rm -v $(pwd):/src -w /src ubuntu:20.04 bash -c "
  apt-get update && apt-get install -y build-essential cmake libcurl4-openssl-dev libarchive-dev nlohmann-json3-dev
  mkdir build && cd build
  cmake .. && make -j$(nproc)
  tar -czf cardity-linux-x64.tar.gz cardity cardity_cli cardity_runtime cardity_abi cardityc
"

# macOS x64
mkdir build && cd build
cmake .. && make -j$(nproc)
tar -czf cardity-macos-x64.tar.gz cardity cardity_cli cardity_runtime cardity_abi cardityc

# Windows x64
mkdir build && cd build
cmake .. -G "Visual Studio 16 2019" -A x64
cmake --build . --config Release
tar -czf cardity-windows-x64.tar.gz Release/cardity.exe Release/cardity_cli.exe Release/cardity_runtime.exe Release/cardity_abi.exe Release/cardityc.exe
```

#### 包管理器集成

```bash
# Homebrew (macOS)
brew tap cardity/cardity
brew install cardity

# apt (Ubuntu/Debian)
curl -fsSL https://packages.cardity.dev/gpg | sudo apt-key add -
echo "deb https://packages.cardity.dev/ubuntu focal main" | sudo tee /etc/apt/sources.list.d/cardity.list
sudo apt update
sudo apt install cardity

# yum (CentOS/RHEL)
curl -fsSL https://packages.cardity.dev/gpg | sudo rpm --import -
sudo tee /etc/yum.repos.d/cardity.repo << EOF
[cardity]
name=Cardity Repository
baseurl=https://packages.cardity.dev/centos/\$releasever/\$basearch
enabled=1
gpgcheck=1
gpgkey=https://packages.cardity.dev/gpg
EOF
sudo yum install cardity
```

### 2. 包注册表部署

#### 注册表服务器

```bash
# 部署到云服务器
docker run -d \
  --name cardity-registry \
  -p 80:80 \
  -p 443:443 \
  -v /var/lib/cardity-registry:/data \
  -e REGISTRY_STORAGE_FILESYSTEM_ROOTDIRECTORY=/data \
  cardity/registry:latest

# 配置 Nginx
server {
    listen 80;
    server_name registry.cardity.dev;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name registry.cardity.dev;
    
    ssl_certificate /etc/letsencrypt/live/registry.cardity.dev/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/registry.cardity.dev/privkey.pem;
    
    location / {
        proxy_pass http://localhost:5000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

#### 包搜索和文档网站

```bash
# 部署搜索网站
docker run -d \
  --name cardity-search \
  -p 3000:3000 \
  -e REGISTRY_URL=https://registry.cardity.dev \
  cardity/search:latest

# 部署文档网站
docker run -d \
  --name cardity-docs \
  -p 8080:80 \
  -v /var/lib/cardity-docs:/usr/share/nginx/html \
  nginx:alpine
```

### 3. 开发工具集成

#### IDE 插件

```bash
# VS Code 插件
# 发布到 VS Code Marketplace
vsce package
vsce publish

# IntelliJ IDEA 插件
# 发布到 JetBrains Marketplace
./gradlew buildPlugin
./gradlew publishPlugin
```

#### 在线编辑器

```bash
# 部署 Monaco Editor 在线版本
docker run -d \
  --name cardity-playground \
  -p 3001:3000 \
  -e REGISTRY_URL=https://registry.cardity.dev \
  cardity/playground:latest
```

## 📦 包生态系统

### 1. 官方包

#### 标准库 (@cardity/standard)

```bash
# 发布标准库
cd packages/standard
cardity publish

# 版本管理
cardity version patch  # 1.0.0 -> 1.0.1
cardity version minor  # 1.0.1 -> 1.1.0
cardity version major  # 1.1.0 -> 2.0.0
```

#### 工具库 (@cardity/utils)

```bash
# 发布工具库
cd packages/utils
cardity publish

# 包含的工具函数
- Hash: sha256, keccak256, ripemd160
- Math: add, sub, mul, div, mod, pow
- String: concat, split, replace, trim
- Time: now, format, parse
- Array: push, pop, shift, unshift, slice
- Object: keys, values, entries, assign
```

#### 测试框架 (@cardity/test)

```bash
# 发布测试框架
cd packages/test
cardity publish

# 测试功能
- 单元测试
- 集成测试
- 性能测试
- 覆盖率报告
```

### 2. 社区包

#### 模板包

```bash
# 创建模板包
cardity init --template @cardity/template-defi
cardity init --template @cardity/template-nft
cardity init --template @cardity/template-dao
```

#### 工具包

```bash
# 常用工具包
cardity install @cardity/security  # 安全工具
cardity install @cardity/audit      # 审计工具
cardity install @cardity/deploy     # 部署工具
```

## 🔧 开发者体验

### 1. 快速开始

#### 一键安装

```bash
# 安装 Cardity
curl -fsSL https://install.cardity.dev | bash

# 验证安装
cardity --version
```

#### 项目模板

```bash
# 使用模板创建项目
cardity create my-protocol --template defi
cd my-protocol

# 安装依赖
cardity install

# 开发
cardity dev

# 构建
cardity build

# 测试
cardity test

# 部署
cardity deploy
```

### 2. 开发工具

#### VS Code 扩展

```json
{
  "name": "cardity",
  "displayName": "Cardity",
  "description": "Cardity language support for VS Code",
  "version": "1.0.0",
  "engines": {
    "vscode": "^1.60.0"
  },
  "categories": ["Programming Languages"],
  "activationEvents": ["onLanguage:cardity"],
  "main": "./out/extension.js",
  "contributes": {
    "languages": [{
      "id": "cardity",
      "aliases": ["Cardity", "cardity"],
      "extensions": [".cardity"],
      "configuration": "./language-configuration.json"
    }],
    "grammars": [{
      "language": "cardity",
      "scopeName": "source.cardity",
      "path": "./syntaxes/cardity.tmLanguage.json"
    }],
    "snippets": [{
      "language": "cardity",
      "path": "./snippets/cardity.json"
    }]
  }
}
```

#### 在线 Playground

```html
<!DOCTYPE html>
<html>
<head>
    <title>Cardity Playground</title>
    <script src="https://unpkg.com/monaco-editor@latest/min/vs/loader.js"></script>
</head>
<body>
    <div id="container" style="width:800px;height:600px;border:1px solid grey"></div>
    <script>
        require.config({ paths: { 'vs': 'https://unpkg.com/monaco-editor@latest/min/vs' }});
        require(['vs/editor/editor.main'], function() {
            var editor = monaco.editor.create(document.getElementById('container'), {
                value: 'protocol HelloCardity {\n  version: "1.0.0";\n  owner: "doge1...";\n  \n  state {\n    message: string = "Hello, Cardity!";\n  }\n  \n  method get_message() {\n    return state.message;\n  }\n}',
                language: 'cardity',
                theme: 'vs-dark'
            });
        });
    </script>
</body>
</html>
```

### 3. 文档和教程

#### 官方文档

```bash
# 部署文档网站
cd docs
mkdocs build
mkdocs gh-deploy

# 文档结构
docs/
├── getting-started/
│   ├── installation.md
│   ├── quick-start.md
│   └── first-protocol.md
├── language/
│   ├── syntax.md
│   ├── types.md
│   ├── events.md
│   └── methods.md
├── packages/
│   ├── package-management.md
│   ├── standard-library.md
│   └── publishing.md
├── deployment/
│   ├── local-testing.md
│   ├── testnet-deployment.md
│   └── mainnet-deployment.md
└── api/
    ├── compiler-api.md
    ├── runtime-api.md
    └── package-api.md
```

#### 视频教程

```bash
# 录制教程视频
- 安装和配置 (5分钟)
- 第一个协议 (10分钟)
- 包管理 (8分钟)
- 测试和部署 (12分钟)
- 高级特性 (15分钟)
```

## 🌐 社区建设

### 1. 开发者社区

#### Discord 服务器

```bash
# 创建 Discord 服务器
- #general - 一般讨论
- #help - 帮助和支持
- #showcase - 项目展示
- #development - 开发讨论
- #announcements - 官方公告
```

#### GitHub 组织

```bash
# 创建 GitHub 组织
github.com/cardity
├── cardity-core          # 核心编译器
├── cardity-standard      # 标准库
├── cardity-utils         # 工具库
├── cardity-test          # 测试框架
├── cardity-docs          # 文档
├── cardity-examples      # 示例项目
└── cardity-templates     # 项目模板
```

### 2. 内容创作

#### 博客文章

```markdown
# 博客主题
- "Cardity vs Solidity: 为什么选择 Cardity 开发 Cardinals 协议"
- "使用 Cardity 构建你的第一个 DeFi 协议"
- "Cardity 包管理系统深度解析"
- "从零开始：Cardity 协议开发完整指南"
- "Cardity 最佳实践和设计模式"
```

#### 技术分享

```bash
# 会议和活动
- Ethereum Devcon
- Bitcoin Conference
- Web3 Summit
- Local Meetups
- Online Webinars
```

### 3. 生态系统

#### 合作伙伴

```bash
# 技术合作伙伴
- Dogecoin Foundation
- Bitcoin Core Developers
- Ethereum Foundation
- Web3 Foundation

# 工具集成
- MetaMask
- WalletConnect
- The Graph
- IPFS
```

#### 开发者激励

```bash
# 赏金计划
- Bug 赏金
- 功能开发赏金
- 文档改进赏金
- 社区贡献赏金

# 开发者计划
- 早期采用者计划
- 大使计划
- 导师计划
```

## 📊 监控和分析

### 1. 使用统计

```bash
# 安装统计
- 下载量统计
- 平台分布
- 版本使用情况

# 使用统计
- 活跃用户数
- 协议部署数
- 包下载量
- 错误报告
```

### 2. 性能监控

```bash
# 系统监控
- 服务器性能
- 响应时间
- 错误率
- 可用性

# 用户反馈
- 用户满意度
- 功能请求
- Bug 报告
- 改进建议
```

## 🔄 持续集成

### 1. 自动化发布

```yaml
# .github/workflows/release.yml
name: Release
on:
  push:
    tags: ['v*']

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - name: Build
        run: |
          mkdir build && cd build
          cmake .. && make -j$(nproc)
      - name: Create Release
        uses: actions/create-release@v1
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
        with:
          tag_name: ${{ github.ref }}
          release_name: Release ${{ github.ref }}
          body: |
            Changes in this Release:
            ${{ github.event.head_commit.message }}
          draft: false
          prerelease: false
      - name: Upload Assets
        uses: actions/upload-release-asset@v1
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
        with:
          upload_url: ${{ steps.create_release.outputs.upload_url }}
          asset_path: ./build/cardity
          asset_name: cardity-${{ runner.os }}-${{ runner.arch }}
          asset_content_type: application/octet-stream
```

### 2. 包发布自动化

```yaml
# .github/workflows/publish.yml
name: Publish Package
on:
  push:
    tags: ['@cardity/*']

jobs:
  publish:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - name: Install Cardity
        run: |
          curl -fsSL https://install.cardity.dev | bash
      - name: Install dependencies
        run: cardity install
      - name: Build
        run: cardity build
      - name: Test
        run: cardity test
      - name: Publish
        run: cardity publish
        env:
          CARDITY_API_KEY: ${{ secrets.CARDITY_API_KEY }}
```

## 🎯 成功指标

### 1. 技术指标

```bash
# 编译器指标
- 编译速度
- 内存使用
- 错误率
- 支持的语言特性

# 运行时指标
- 执行速度
- 内存效率
- 错误处理
- 兼容性
```

### 2. 用户指标

```bash
# 采用指标
- 活跃开发者数
- 协议部署数
- 包下载量
- 社区贡献

# 满意度指标
- 用户评分
- 推荐率
- 留存率
- 反馈质量
```

### 3. 生态系统指标

```bash
# 生态健康度
- 包数量和质量
- 社区活跃度
- 合作伙伴数量
- 集成项目数
```

## 📈 路线图

### 短期目标 (3-6个月)

- [ ] 发布 v1.0.0 稳定版
- [ ] 建立包注册表
- [ ] 发布官方包
- [ ] 开发 IDE 插件
- [ ] 建立开发者社区

### 中期目标 (6-12个月)

- [ ] 支持更多语言特性
- [ ] 优化编译性能
- [ ] 扩展包生态系统
- [ ] 增加部署工具
- [ ] 建立合作伙伴关系

### 长期目标 (1-2年)

- [ ] 成为 Cardinals 协议开发标准
- [ ] 建立完整的开发者生态
- [ ] 支持跨链协议开发
- [ ] 集成更多区块链平台
- [ ] 建立企业级解决方案

通过这个完整的发布和部署策略，Cardity 将成为 Cardinals 协议开发的首选工具，让开发者能够像使用 Solidity 那样轻松开发 Cardinals 协议。 