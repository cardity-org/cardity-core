# Cardity Core

Cardity 编程语言的核心实现，包含编译器、运行时、包管理系统和开发工具。

## 📋 项目描述

Cardity Core 是 Cardity 编程语言的完整实现，提供：

- **编译器** - 将编程语言格式的 .car 文件编译为可执行格式
- **运行时** - 执行编译后的协议
- **包管理器** - 管理依赖和发布包
- **CLI 工具** - 命令行开发工具
- **类型系统** - 静态类型检查
- **事件系统** - 事件驱动架构
- **ABI 生成器** - 自动生成协议接口（支持编程语言格式和 JSON 格式）
- **区块链部署** - 支持 Dogecoin 链上部署
- **DRC-20 代币标准** - 完整的 DRC-20 代币支持

## 🚀 快速开始

### 安装

#### 通过 npm 安装（推荐）

```bash
# 全局安装 Cardity
npm install -g cardity

# 验证安装
cardity --version

# 查看帮助
cardity --help
```

#### 从源码编译安装

```bash
# 克隆项目
git clone https://github.com/cardity-org/cardity-core.git
cd cardity-core

# 安装依赖
npm install

# 验证安装
cardity --version
```

### 创建第一个项目

```bash
# 初始化新项目
cardity init my-first-protocol

# 进入项目目录
cd my-first-protocol

# 编译协议
cardity compile src/index.car

# 生成 ABI
cardity abi src/index.car

# 运行协议
cardity run dist/index.carc
```

## 🔧 开发工具

### CLI 命令

```bash
# 项目初始化
cardity init [project-name]

# 编译协议
cardity compile <file> [options]

# 运行协议
cardity run <file> [options]

# 生成 ABI
cardity abi <file> [options]

# 部署到 Dogecoin
cardity deploy <file> [options]

# 查看帮助
cardity help
```

### DRC-20 代币操作

```bash
# 编译 DRC-20 代币
cardity drc20 compile <file>

# 部署 DRC-20 代币
cardity drc20 deploy <file> [options]

# 铸造代币
cardity drc20 mint <tick> <amount> [options]

# 转账代币
cardity drc20 transfer <tick> <to> <amount> [options]
```

### 编译器工具

```bash
# 编译编程语言格式的 .car 文件为 .carc 二进制格式
cardityc main.car --format carc

# 编译为 JSON 格式
cardityc main.car --format json

# 生成部署包
cardityc main.car -o deployed.carc

# 生成 ABI (支持编程语言格式和 JSON 格式)
cardity_abi main.car                    # 输出到标准输出
cardity_abi main.car main.abi          # 输出到文件

# 运行协议
cardity_runtime main.car set_message "Hello"
```

### 部署工具

```bash
# 验证 .carc 文件
cardity_deploy validate protocol.carc

# 查看协议信息
cardity_deploy info protocol.carc

# 部署到 Dogecoin 链
cardity_deploy deploy protocol.carc --address doge1... --private-key ...

# 创建铭文交易
cardity_deploy inscription protocol.carc --address doge1... --output inscription.txt
```

## 📝 语言特性

### 编程语言格式 (.car 文件)

Cardity 支持编程语言格式的 `.car` 文件，类似 Solidity 的语法：

```cardity
protocol HelloCardinals {
  version: "1.0.0";
  owner: "doge1abc123def456";
  
  state {
    message: string = "Hello, Cardity!";
    count: int = 0;
  }
  
  event MessageUpdated {
    new_message: string;
  }
  
  method get_message() {
    return state.message;
  }
  
  method set_message(new_message) {
    state.message = new_message;
    emit MessageUpdated(new_message);
  }
  
  method increment() {
    state.count = state.count + 1;
  }
  
  method get_count() {
    return state.count;
  }
}
```

### DRC-20 代币格式

Cardity 支持完整的 DRC-20 代币标准：

```cardity
protocol MyDrc20Token {
  version: "1.0.0";
  owner: "doge1token123";
  
  // DRC-20 代币定义
  drc20 {
    tick: "MYT";
    name: "My Token";
    max_supply: "1000000";
    mint_limit: "1000";
    decimals: "18";
    deployer: "doge1token123";
  }
  
  // 状态变量
  state {
    total_supply: int = 0;
    deployed: bool = false;
  }
  
  // 部署方法
  method deploy() {
    if (!state.deployed) {
      state.deployed = true;
      emit TokenDeployed(drc20.tick, drc20.max_supply);
      return "Token deployed successfully";
    }
    return "Token already deployed";
  }
  
  // 铸造方法
  method mint(amount) {
    if (!state.deployed) {
      return "Token not deployed";
    }
    if (amount <= 0) {
      return "Invalid amount";
    }
    if (state.total_supply + amount > drc20.max_supply) {
      return "Exceeds max supply";
    }
    state.total_supply = state.total_supply + amount;
    emit TokenMinted(drc20.tick, amount, state.total_supply);
    return "Minted successfully";
  }
  
  // 转账方法
  method transfer(to_address, amount) {
    if (!state.deployed) {
      return "Token not deployed";
    }
    if (amount <= 0) {
      return "Invalid amount";
    }
    emit TokenTransferred(drc20.tick, amount, to_address);
    return "Transfer successful";
  }
  
  // 事件定义
  event TokenDeployed {
    tick: string;
    max_supply: string;
  }
  
  event TokenMinted {
    tick: string;
    amount: int;
    total_supply: int;
  }
  
  event TokenTransferred {
    tick: string;
    amount: int;
    to_address: string;
  }
}
```

### 语言特性

- **协议定义**: `protocol` 关键字定义协议
- **状态变量**: `state` 块中定义状态变量
- **事件系统**: `event` 关键字定义事件
- **方法定义**: `method` 关键字定义方法
- **类型系统**: 支持 `string`, `int`, `bool` 等基本类型
- **事件发射**: `emit` 关键字发射事件
- **DRC-20 支持**: `drc20` 块定义代币标准
- **代币操作**: 内置 Deploy、Mint、Transfer 方法
- **ABI 生成**: 自动从编程语言格式生成标准 ABI

### 类型系统

- **基本类型**: `string`, `int`, `bool`, `number`
- **状态访问**: `state.variable_name`
- **事件发射**: `emit EventName(params)`
- **方法调用**: 支持参数传递和返回值

### ABI 生成

Cardity 的 ABI 生成器支持两种格式：

1. **编程语言格式** - 直接解析类似 Solidity 的语法
2. **JSON 格式** - 解析标准 JSON 协议定义

生成的 ABI 包含：
- **协议信息**: 协议名和版本
- **方法定义**: 所有方法的名称和参数
- **事件定义**: 所有事件的名称和参数类型

## 🏗️ 区块链部署

### .carc 二进制格式

Cardity Core 支持将协议编译为 `.carc` 二进制格式，用于 Dogecoin 链上部署：

```bash
# 编译为二进制格式
cardityc protocol.car --format carc

# 验证二进制文件
cardity_deploy validate protocol.carc

# 部署到 Dogecoin 链
cardity_deploy deploy protocol.carc --address doge1... --private-key ...
```

### 部署方式

1. **OP_RETURN 部署** - 将协议数据存储在 OP_RETURN 输出中
2. **铭文部署** - 使用 ordinals 协议创建铭文

## 🔍 示例项目

### 基础示例

查看 `examples/` 目录获取完整示例：

- `hello.car` - 简单的 Hello World 协议
- `counter.car` - 计数器协议
- `wallet.car` - 钱包协议
- `event_demo.car` - 事件系统演示
- `drc20_token.car` - DRC-20 代币示例

### 运行示例

```bash
# 编译编程语言格式文件
cardityc examples/hello.car -o hello_deployed.carc

# 验证二进制文件
cardity_deploy validate hello_deployed.carc

# 查看协议信息
cardity_deploy info hello_deployed.carc

# 部署到 Dogecoin 链
cardity_deploy deploy hello_deployed.carc --address doge1... --private-key ...
```

### DRC-20 代币工作流程

```bash
# 1. 创建 DRC-20 代币定义
cardity_drc20 template basic --tick MYT --name "My Token" --output my_token.car

# 2. 编译和验证代币
cardity_drc20 compile my_token.car
cardity_drc20 validate my_token.car

# 3. 生成 ABI
cardity_abi my_token.car my_token.abi

# 4. 生成部署铭文
cardity_drc20 deploy my_token.car --output deploy.json

# 5. 部署到 Dogecoin 链
cardity_deploy deploy deploy.json --address doge1... --private-key ...

# 6. 生成铸造铭文
cardity_drc20 mint MYT 1000 --output mint.json

# 7. 生成转账铭文
cardity_drc20 transfer MYT 100 doge1abc... --output transfer.json
```

## 🛠️ 开发指南

### 编译源码

```bash
# 安装依赖
brew install cmake nlohmann-json curl libarchive openssl

# 编译项目
mkdir build && cd build
cmake ..
make -j4

# 安装到系统
sudo make install
```

### 创建新项目

```bash
# 初始化新项目
cardity init

# 这会创建：
# - cardity.json (项目配置)
# - src/index.car (编程语言格式的协议文件)
# - README.md (项目文档)
```

### 调试

```bash
# 启用调试模式
cmake -DCMAKE_BUILD_TYPE=Debug ..
make

# 运行调试版本
./cardity_cli --debug init

# 测试编译器
./cardityc --validate src/main.car
```

## 📚 文档

- [DRC-20 代币开发指南](docs/drc20_guide.md)
- [语言规范](docs/language_spec.md)
- [包管理指南](docs/package_management.md)
- [开发指南](docs/development_guide.md)

## 🔗 与 dogeuni-indexer 对接（Cardity 索引约定）

为了让链上数据被 `dogeuni-indexer` 正确解析与入库，请遵循以下字段约定：

- 通用：`p: "cardity"`
- 部署（deploy）
  - `op: "deploy"`
  - `protocol: string` 协议名
  - `version: string` 协议版本
  - `abi: string` 字符串化后的 ABI JSON（stringified JSON）
  - `carc_b64: string` `.carc` 二进制的 base64 编码
  - 可选：`contract_id: string`（不提供时 indexer 将以部署 `txhash` 作为合约标识）

- 调用（invoke）
  - `op: "invoke"`
  - `contract_id: string` 或 `contract_ref: string`（合约标识）
  - `method: string` 方法名
  - `args: any[]` 原始 JSON 数组参数

### 生成方式

- 生成 `.carc` 与部署铭文（deploy inscription）：

```bash
./build/cardityc examples/00_minimal.car --format carc -o /tmp/min.carc --inscription
# 输出 /tmp/min.carc.inscription，内容示意：
{
  "p": "cardity",
  "op": "deploy",
  "protocol": "Minimal",
  "version": "1.0.0",
  "abi": "{\"events\":null,\"methods\":{...},\"protocol\":\"Minimal\",\"version\":\"1.0.0\"}",
  "carc_b64": "...base64..."
}
```

- 生成调用铭文（invoke inscription）：

```bash
node bin/cardity.js invoke <contract_id_or_txhash> <method> \
  --args '[<json-array> ]'

# 示例
node bin/cardity.js invoke my-contract-123 inc --args '[1]'
```

说明：indexer 端已兼容 `abi` 为字符串或对象、以及历史 `car` 字段，但推荐优先产出上述标准字段。

## 🧱 多模块/多文件打包与上链

当协议由多个 `.car` 文件组成时，可用 `cardity_package` 生成“包级”部署铭文：

```bash
# 在包目录（包含多个 .car 或有 cardity.json）下执行
node bin/cardity_package.js . /tmp/pkg.inscription.json

# inscription 示例（精简）
{
  "p": "cardity",
  "op": "deploy_package",
  "package": "StablecoinSuite",
  "version": "1.0.0",
  "modules": [
    { "name": "USDTLikeToken", "abi": { ... }, "carc_b64": "..." },
    { "name": "Bank", "abi": { ... }, "carc_b64": "..." }
  ],
  "package_abi": { "USDTLikeToken": { ... }, "Bank": { ... } }
}
```

调用某模块方法：

```bash
node bin/cardity.js invoke <contract_id> transfer --args '["D...",5000]' --module USDTLikeToken
# 或者：method 使用 点号
node bin/cardity.js invoke <contract_id> USDTLikeToken.transfer --args '["D...",5000]'
```

## 🔒 仅上链 Hex（不上链 ABI）工作流

当你希望链上只存放二进制/调用数据而不包含 ABI：

- 部署：
  ```bash
  # 1) 编译 .car 为 .carc
  ./build/cardityc path/to/protocol.car --format carc -o /tmp/protocol.carc
  # 2) 导出十六进制数据（直接放入 OP_RETURN/铭文）
  node bin/cardity.js ophex /tmp/protocol.carc > /tmp/protocol.carc.hex
  ```

- 调用（方法 + 参数 → hex）：
  ```bash
  # method 可使用 Module.method 形式；args 为 JSON 数组
  node bin/cardity.js encode-invoke USDTLikeToken.transfer --args '["D...",5000]' > /tmp/invoke.hex
  ```

说明：indexer/后端在拿到 hex 后按 UTF-8 解析 JSON（{method,args}），再关联到合约处理流程。

## 🧩 前端 SDK 生成器（cardity_sdk）

为便于前端直接构造调用铭文（op: "invoke"），提供 SDK 代码生成器。它读取编译产出的 ABI（.abi.json），生成 TypeScript 客户端类，每个方法会返回一段可直接上链的 `invoke` JSON（payload）。

### 安装与命令

已随本项目发布（package.json 中的 bin）。构建后可直接使用：

```bash
npm run build
node bin/cardity_sdk.js <abi.json> <out.ts>
```

### 生成流程示例（Minimal）

```bash
# 1) 编译 .car，产出 .carc 与 ABI（编译器会打印 ABI 路径）
./build/cardityc examples/00_minimal.car --format carc -o /tmp/min.carc

# 2) 生成 TS SDK（将上一步打印的 ABI 路径替换到 <ABI_PATH>）
node bin/cardity_sdk.js <ABI_PATH> /tmp/min.sdk.ts

# 3) 使用（示意）
// import { MinimalClient } from '/tmp/min.sdk.ts'
// const client = new MinimalClient('contract-id-or-txhash')
// const payload = client.inc(1)  // => { p:'cardity', op:'invoke', contract_id:'...', method:'inc', args:[1] }
```

### 生成流程示例（USDT-like）

```bash
# 1) 编译 USDT-like 示例
./build/cardityc examples/08_usdt_like.car --format carc -o /tmp/usdt.carc

# 2) 生成 TS SDK（使用编译器打印的 ABI 路径，一般为 /tmp/usdt.abi.json）
node bin/cardity_sdk.js /tmp/usdt.abi.json /tmp/usdt.sdk.ts

# 3) 使用（示意）
// import { USDTLikeTokenClient } from '/tmp/usdt.sdk.ts'
// const c = new USDTLikeTokenClient('contract-id-or-txhash')
// const p1 = c.set_fee_policy(30, 1000)
// const p2 = c.issue(1000000)
// const p3 = c.transfer('doge1recipient...', 5000)
// 将 payload 提交到你的上链/铭文发送服务
```

### 类型映射说明

- 方法参数类型映射到 TS：
  - int → number
  - bool → boolean
  - 其余（string/address 等）→ string
- 生成类名：`<protocol>Client`，例如 `USDTLikeTokenClient`
- 构造参数：可选 `contractId`，生成的 payload 将自动带上 `contract_id`

## 🤝 贡献

欢迎贡献代码！

1. Fork 项目
2. 创建功能分支 (`git checkout -b feature/amazing-feature`)
3. 提交更改 (`git commit -m 'Add amazing feature'`)
4. 推送到分支 (`git push origin feature/amazing-feature`)
5. 打开 Pull Request

### 开发环境

- **C++17** - 主要开发语言
- **CMake** - 构建系统
- **nlohmann/json** - JSON 处理
- **libcurl** - 网络请求
- **libarchive** - 压缩文件处理
- **OpenSSL** - 加密和哈希

## 📄 许可证

MIT License - 详见 [LICENSE](LICENSE) 文件

## 🔗 相关链接

- [Cardity 官网](https://cardity.dev)
- [语言文档](https://docs.cardity.dev)
- [示例项目](https://github.com/cardity/examples)
- [包注册表](https://registry.cardity.dev)
- [npm 包](https://www.npmjs.com/package/cardity)

---

**Cardity Core** - Cardity 编程语言的核心实现 🚀

**最新更新**: 成功发布到 npm 注册表！现在可以通过 `npm install -g cardity` 全局安装，支持完整的区块链协议开发工作流程，包括 .carc 二进制格式、Dogecoin 链上部署、DRC-20 代币标准和智能 ABI 生成器！
