# Cardity 包管理系统

Cardity 包管理系统让开发者可以像使用 Solidity 和 npm 那样开发 Cardinals 协议，提供完整的包管理、依赖解析、构建和发布功能。

## 🚀 快速开始

### 安装 Cardity CLI

```bash
# 从源码编译安装
git clone https://github.com/cardity/cardity-core.git
cd cardity-core
mkdir build && cd build
cmake ..
make
sudo make install

# 验证安装
cardity --version
```

### 创建新项目

```bash
# 初始化新项目
cardity init

# 按提示填写项目信息
Project name: my-protocol
Version: 1.0.0
Description: My first Cardity protocol
Author: Your Name
License: MIT
```

### 安装依赖

```bash
# 安装标准库
cardity install @cardity/standard

# 安装 GitHub 包
cardity install github:user/repo

# 安装特定版本
cardity install @cardity/utils@1.2.0
```

### 构建项目

```bash
# 构建项目
cardity build

# 运行测试
cardity test

# 发布包
cardity publish
```

## 📦 包管理命令

### 基本命令

```bash
# 初始化项目
cardity init

# 安装包
cardity install <package>

# 卸载包
cardity uninstall <package>

# 列出已安装的包
cardity list

# 搜索包
cardity search <query>

# 更新包
cardity update

# 清理缓存
cardity cache clean
```

### 项目命令

```bash
# 构建项目
cardity build

# 运行测试
cardity test

# 运行脚本
cardity run <script>

# 发布包
cardity publish

# 验证包
cardity validate
```

### 用户管理

```bash
# 登录注册表
cardity login

# 登出
cardity logout

# 查看用户信息
cardity whoami
```

## 📁 项目结构

```
my-protocol/
├── cardity.json          # 包配置文件
├── src/                  # 源代码目录
│   ├── main.cardity     # 主协议文件
│   ├── utils.cardity    # 工具函数
│   └── types.cardity    # 类型定义
├── tests/               # 测试文件
│   ├── main.test.cardity
│   └── utils.test.cardity
├── docs/                # 文档
│   └── README.md
├── dist/                # 构建输出
│   ├── main.car
│   └── abi.json
├── .cardity/            # 本地配置
│   ├── cache/          # 缓存目录
│   └── packages/       # 本地包
└── README.md           # 项目说明
```

## ⚙️ 配置文件

### cardity.json

```json
{
  "name": "@your-org/your-protocol",
  "version": "1.0.0",
  "description": "Your protocol description",
  "author": "Your Name <your@email.com>",
  "license": "MIT",
  "repository": "https://github.com/your-org/your-protocol",
  "homepage": "https://your-protocol.com",
  "keywords": ["cardity", "cardinals", "protocol"],
  "main": "src/main.cardity",
  "files": [
    "src/**/*.cardity",
    "dist/**/*.car",
    "README.md"
  ],
  "dependencies": {
    "@cardity/standard": "^1.0.0",
    "@cardity/utils": "^1.2.0"
  },
  "devDependencies": {
    "@cardity/test": "^1.0.0",
    "@cardity/lint": "^1.0.0"
  },
  "scripts": {
    "build": "cardity build",
    "test": "cardity test",
    "lint": "cardity lint",
    "publish": "cardity publish",
    "clean": "rm -rf dist"
  },
  "engines": {
    "cardity": ">=1.0.0"
  },
  "cardity": {
    "compiler": {
      "target": "cardinals",
      "optimize": true,
      "generateABI": true,
      "generateDocs": true
    },
    "runtime": {
      "version": "1.0.0",
      "compatibility": ["cardinals"]
    }
  }
}
```

## 🔧 包开发

### 创建包

1. **初始化包项目**
   ```bash
   cardity init
   ```

2. **编写协议代码**
   ```cardity
   // src/main.cardity
   protocol MyProtocol {
     version: "1.0.0";
     owner: "doge1...";
     
     state {
       message: string = "Hello, Cardity!";
       count: int = 0;
     }
     
     events {
       MessageUpdated(new_msg: string);
       CounterIncremented(old_count: int, new_count: int);
     }
     
     method set_message(new_msg: string) {
       state.message = params.new_msg;
       emit MessageUpdated(params.new_msg);
     }
     
     method increment() {
       state.count = state.count + 1;
       emit CounterIncremented(state.count - 1, state.count);
     }
   }
   ```

3. **添加依赖**
   ```bash
   cardity install @cardity/standard
   ```

4. **编写测试**
   ```cardity
   // tests/main.test.cardity
   test "should set message" {
     protocol MyProtocol;
     
     call set_message("Hello World");
     assert state.message == "Hello World";
   }
   
   test "should increment counter" {
     protocol MyProtocol;
     
     call increment();
     assert state.count == 1;
   }
   ```

5. **构建和测试**
   ```bash
   cardity build
   cardity test
   ```

### 发布包

1. **登录注册表**
   ```bash
   cardity login
   ```

2. **发布包**
   ```bash
   cardity publish
   ```

3. **版本管理**
   ```bash
   # 更新版本号
   cardity version patch  # 1.0.0 -> 1.0.1
   cardity version minor  # 1.0.1 -> 1.1.0
   cardity version major  # 1.1.0 -> 2.0.0
   ```

## 📚 包使用

### 导入包

```cardity
// 导入标准库
import "@cardity/standard" as std;

// 使用标准协议模板
protocol MyProtocol extends std.StandardProtocol {
  // 自定义状态
  state {
    custom_field: string = "";
  }
  
  // 自定义方法
  method set_custom_field(value: string) {
    state.custom_field = params.value;
  }
}
```

### 使用工具函数

```cardity
// 导入工具包
import "@cardity/utils" as utils;

protocol MyProtocol {
  method calculate_hash(data: string) {
    return utils.Hash.sha256(params.data);
  }
  
  method format_time(timestamp: int) {
    return utils.Time.format(params.timestamp);
  }
}
```

## 🔗 包注册表

### 官方注册表

- **URL**: https://registry.cardity.dev
- **搜索**: https://registry.cardity.dev/search
- **文档**: https://registry.cardity.dev/docs

### 包命名规范

```
@scope/package-name
```

- `@cardity/` - 官方包
- `@your-org/` - 组织包
- `package-name` - 个人包

### 包版本规范

遵循 [语义化版本](https://semver.org/)：

- `1.0.0` - 精确版本
- `^1.0.0` - 兼容版本（推荐）
- `~1.0.0` - 补丁版本
- `*` - 最新版本

## 🛠️ 高级功能

### 自定义构建配置

```json
{
  "cardity": {
    "compiler": {
      "target": "cardinals",
      "optimize": true,
      "minify": false,
      "generateABI": true,
      "generateDocs": true,
      "includePaths": ["./src", "./lib"],
      "excludePatterns": ["**/*.test.cardity"]
    },
    "runtime": {
      "version": "1.0.0",
      "compatibility": ["cardinals"],
      "features": ["events", "types"]
    }
  }
}
```

### 脚本系统

```json
{
  "scripts": {
    "prebuild": "cardity lint",
    "build": "cardity build",
    "postbuild": "cardity test",
    "prepublishOnly": "cardity test && cardity build",
    "publish": "cardity publish",
    "postpublish": "echo 'Published successfully!'"
  }
}
```

### 工作区支持

```json
{
  "workspaces": [
    "packages/*"
  ]
}
```

### 私有包

```bash
# 设置私有注册表
cardity config set registry https://your-private-registry.com

# 发布私有包
cardity publish --access private
```

## 🔒 安全

### 包验证

- 自动验证包签名
- 检查包完整性
- 扫描恶意代码
- 依赖安全检查

### 最佳实践

1. **使用锁定文件**
   ```bash
   cardity install --save-exact
   ```

2. **定期更新依赖**
   ```bash
   cardity audit
   cardity update
   ```

3. **验证包来源**
   ```bash
   cardity verify <package>
   ```

## 🚀 部署集成

### 自动部署

```bash
# 构建并部署
cardity build && cardity deploy

# 部署到测试网
cardity deploy --network testnet

# 部署到主网
cardity deploy --network mainnet
```

### CI/CD 集成

```yaml
# .github/workflows/deploy.yml
name: Deploy Protocol
on:
  push:
    tags: ['v*']

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
      
      - name: Install Cardity
        run: |
          git clone https://github.com/cardity/cardity-core.git
          cd cardity-core
          mkdir build && cd build
          cmake .. && make
          sudo make install
      
      - name: Install dependencies
        run: cardity install
      
      - name: Build protocol
        run: cardity build
      
      - name: Run tests
        run: cardity test
      
      - name: Deploy to mainnet
        run: cardity deploy --network mainnet
        env:
          CARDITY_PRIVATE_KEY: ${{ secrets.CARDITY_PRIVATE_KEY }}
```

## 📖 示例项目

### 完整示例

查看 `examples/package_example/` 目录获取完整的包示例：

```bash
cd examples/package_example
cardity install
cardity build
cardity test
```

### 社区包

- `@cardity/standard` - 标准库
- `@cardity/utils` - 工具函数
- `@cardity/test` - 测试框架
- `@cardity/lint` - 代码检查

## 🤝 贡献

### 开发包

1. Fork 项目
2. 创建功能分支
3. 编写代码和测试
4. 提交 Pull Request

### 报告问题

- GitHub Issues: https://github.com/cardity/cardity-core/issues
- 文档问题: https://github.com/cardity/docs/issues

### 社区

- Discord: https://discord.gg/cardity
- Twitter: https://twitter.com/cardity_dev
- 博客: https://blog.cardity.dev

## 📄 许可证

MIT License - 详见 [LICENSE](../LICENSE) 文件 