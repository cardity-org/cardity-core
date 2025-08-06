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

### 项目结构

```
cardity_core/
├── compiler/             # 编译器源码
│   ├── lexer.cpp        # 词法分析器
│   ├── parser.cpp       # 语法分析器
│   ├── semantic.cpp     # 语义分析
│   ├── type_system.cpp  # 类型系统
│   ├── runtime.cpp      # 运行时
│   ├── car_generator.cpp # CAR 格式生成器
│   ├── carc_generator.cpp # CARC 二进制格式生成器
│   ├── car_deployer.cpp # 部署工具
│   ├── dogecoin_deployer.cpp # Dogecoin 部署工具
│   ├── drc20_standard.cpp # DRC-20 标准库
│   ├── drc20_compiler.cpp # DRC-20 编译器
│   ├── drc20_cli.cpp    # DRC-20 CLI 工具
│   └── event_system.cpp # 事件系统
├── package_manager.cpp   # 包管理器
├── package_config.cpp    # 配置管理
├── package_builder.cpp   # 构建工具
├── registry_client.cpp   # 注册表客户端
├── cardity_cli.cpp      # CLI 工具
├── examples/            # 示例项目
├── docs/                # 文档
└── CMakeLists.txt       # 构建配置
```

## 🔧 开发工具

### CLI 命令

```bash
# 项目初始化
cardity init

# 构建项目
cardity build

# 运行测试
cardity test

# 包管理
cardity install <package>
cardity uninstall <package>
cardity list
cardity search <query>

# 发布
cardity publish
```

### DRC-20 代币操作

Cardity Core 支持完整的 DRC-20 代币标准，让开发者可以像编写 Solidity 智能合约一样创建 DRC-20 代币：

```bash
# 生成 DRC-20 代币模板
cardity_drc20 template basic --tick MYT --name "My Token" --output my_token.car

# 编译 DRC-20 代币
cardity_drc20 compile my_token.car

# 验证代币定义
cardity_drc20 validate my_token.car

# 生成部署铭文
cardity_drc20 deploy my_token.car --output deploy.json

# 生成铸造铭文
cardity_drc20 mint MYT 1000 --output mint.json

# 生成转账铭文
cardity_drc20 transfer MYT 100 doge1abc... --output transfer.json
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
cardity_abi dpptoken.car dpptoken.abi  # 处理 DRC-20 代币文件

# 运行协议
cardity_runtime main.car set_message "Hello"
```

### DRC-20 代币工具

```bash
# 查看 DRC-20 工具帮助
cardity_drc20 --help

# 生成基础 DRC-20 模板
cardity_drc20 template basic --tick MYT --name "My Token" --output my_token.car

# 生成高级 DRC-20 模板
cardity_drc20 template advanced --tick ADV --name "Advanced Token" --max-supply 10000000 --output advanced_token.car

# 编译 DRC-20 代币定义
cardity_drc20 compile my_token.car

# 验证 DRC-20 代币参数
cardity_drc20 validate my_token.car

# 生成部署铭文 (用于 Dogecoin 链上部署)
cardity_drc20 deploy my_token.car --output deploy.json

# 生成铸造铭文
cardity_drc20 mint MYT 1000 --output mint.json

# 生成转账铭文
cardity_drc20 transfer MYT 100 doge1abc... --output transfer.json
```

### ABI 生成器工具

```bash
# 查看 ABI 生成器帮助
cardity_abi

# 从编程语言格式生成 ABI
cardity_abi protocol.car
cardity_abi protocol.car protocol.abi

# 从 JSON 格式生成 ABI
cardity_abi protocol.json
cardity_abi protocol.json protocol.abi

# 处理 DRC-20 代币文件
cardity_abi dpptoken.car dpptoken.abi
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

Cardity 支持完整的 DRC-20 代币标准，让开发者可以轻松创建代币：

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
    mint_count: int = 0;
    transfer_count: int = 0;
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
    state.mint_count = state.mint_count + 1;
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
    state.transfer_count = state.transfer_count + 1;
    emit TokenTransferred(drc20.tick, amount, to_address);
    return "Transfer successful";
  }
  
  // 查询方法
  method get_total_supply() {
    return state.total_supply;
  }
  
  method get_mint_count() {
    return state.mint_count;
  }
  
  method get_transfer_count() {
    return state.transfer_count;
  }
  
  method is_deployed() {
    return state.deployed;
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

## 🧪 测试

```bash
# 运行所有测试
make test

# 运行特定测试
./lexer_test
./parser_test
./runtime_test
./package_manager_test

# 测试编译器
cardityc examples/hello.car --validate
```

## 📦 包管理系统

### 功能特性

- **依赖解析** - 自动解析包依赖关系
- **版本管理** - 支持语义化版本控制
- **缓存系统** - 本地包缓存
- **注册表集成** - 支持多个包注册表
- **GitHub 集成** - 直接从 GitHub 安装包

### 配置文件

```json
{
  "name": "my-protocol",
  "version": "1.0.0",
  "description": "My Cardity Protocol",
  "dependencies": {
    "@cardity/standard": "^1.0.0",
    "@cardity/utils": "~2.0.0"
  },
  "scripts": {
    "build": "cardity build",
    "test": "cardity test",
    "publish": "cardity publish"
  }
}
```

## 🔍 示例项目

### 基础示例

查看 `examples/` 目录获取完整示例：

- `hello.car` - 简单的 Hello World 协议
- `counter.car` - 计数器协议
- `wallet.car` - 钱包协议
- `event_demo.car` - 事件系统演示
- `typed_counter.car` - 类型系统演示
- `drc20_token.car` - DRC-20 代币示例

### DRC-20 代币示例

```bash
# 查看 DRC-20 代币示例
cat examples/drc20_token.car

# 编译 DRC-20 代币
cardity_drc20 compile examples/drc20_token.car

# 生成部署铭文
cardity_drc20 deploy examples/drc20_token.car --output deploy.json

# 验证代币定义
cardity_drc20 validate examples/drc20_token.car

# 生成 ABI
cardity_abi examples/drc20_token.car drc20_token.abi
```

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
# - src/main.car (编程语言格式的协议文件)
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

- [部署指南](README_DEPLOYMENT.md)
- [DRC-20 代币开发指南](docs/drc20_guide.md)
- [语言规范](docs/language_spec.md)
- [包管理指南](docs/package_management.md)
- [开发指南](docs/development_guide.md)
- [发布指南](docs/release_guide.md)

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

---

**Cardity Core** - Cardity 编程语言的核心实现 🚀

**最新更新**: 支持完整的区块链协议开发工作流程，包括 .carc 二进制格式、Dogecoin 链上部署、DRC-20 代币标准和智能 ABI 生成器！
