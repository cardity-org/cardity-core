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
- **ABI 生成器** - 自动生成协议接口

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

# 如果遇到 "Cannot open file: --version" 错误，请运行：
# sudo rm /usr/local/bin/cardity
# sudo ln -s /usr/local/bin/cardity_cli /usr/local/bin/cardity
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
│   ├── car_deployer.cpp # 部署工具
│   └── event_system.cpp # 事件系统
├── package_manager.cpp   # 包管理器
├── package_config.cpp    # 配置管理
├── package_builder.cpp   # 构建工具
├── registry_client.cpp   # 注册表客户端
├── cardity_cli.cpp      # CLI 工具
├── examples/            # 示例项目
├── tests/               # 测试文件
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

### 编译器工具

```bash
# 编译编程语言格式的 .car 文件
cardityc main.car

# 编译为 JSON 格式
cardityc main.car --format json

# 生成部署包
cardityc main.car -o deployed.car

# 生成 ABI
cardity_abi main.car

# 运行协议
cardity_runtime main.car set_message "Hello"
```

## 📝 语言特性

### 编程语言格式 (.car 文件)

Cardity 现在支持编程语言格式的 `.car` 文件，类似 Solidity 的语法：

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

### 语言特性

- **协议定义**: `protocol` 关键字定义协议
- **状态变量**: `state` 块中定义状态变量
- **事件系统**: `event` 关键字定义事件
- **方法定义**: `method` 关键字定义方法
- **类型系统**: 支持 `string`, `int`, `bool` 等基本类型
- **事件发射**: `emit` 关键字发射事件

### 类型系统

- **基本类型**: `string`, `int`, `bool`, `number`
- **状态访问**: `state.variable_name`
- **事件发射**: `emit EventName(params)`
- **方法调用**: 支持参数传递和返回值

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
- `event_demo.car` - 事件系统演示
- `typed_counter.car` - 类型系统演示

### 运行示例

```bash
# 编译编程语言格式文件
cardityc examples/hello.car -o hello_deployed.car

# 运行协议
cardity_runtime hello_deployed.car get_message

# 运行事件演示
./test_event_demo.sh

# 运行类型系统演示
./test_typed_demo.sh

# 运行部署演示
./test_deployment_demo.sh
```

## 🛠️ 开发指南

### 编译源码

```bash
# 安装依赖
brew install cmake nlohmann-json curl libarchive

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
# - src/HelloCardinals.car (编程语言格式的协议文件)
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

## 📄 许可证

MIT License - 详见 [LICENSE](LICENSE) 文件

## 🔗 相关链接

- [Cardity 官网](https://cardity.dev)
- [语言文档](https://docs.cardity.dev)
- [示例项目](https://github.com/cardity/examples)
- [包注册表](https://registry.cardity.dev)

---

**Cardity Core** - Cardity 编程语言的核心实现 🚀

**最新更新**: 编译器现在完全支持编程语言格式的 `.car` 文件，提供类似 Solidity 的开发体验！
