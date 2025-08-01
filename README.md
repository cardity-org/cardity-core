# Cardity - Cardinals Protocol Language

Cardity 是一种专用于 Cardinals 协议的智能协议语言，支持将 `.cardity` 文件编译为 `.car` JSON 协议，并部署至 Dogecoin 的 UTXO 模型中。

## 🎯 项目目标

将 Cardity 开发为一种专用于 Cardinals 协议的智能协议语言，支持将 .cardity 文件编译为 .car JSON 协议，并部署至 Dogecoin 的 UTXO 模型中，通过去中心化索引客户端实现协议执行与状态变迁。

## 🏗️ 架构总览

```
Cardity Source Code (.cardity)
           ↓
      [Lexer & Parser]
           ↓
     [AST (抽象语法树)]
           ↓
  [Semantic Analyzer + Optimizer]
           ↓
    [CAR IR Generator (中间结构)]
           ↓
      JSON Encoder (Output .car)
```

## 📁 项目结构

```
cardity/
├── compiler/          # 编译器核心模块
│   ├── lexer.cpp      # 词法分析器
│   ├── parser.cpp     # 语法分析器
│   ├── ast.cpp        # 抽象语法树
│   ├── semantic.cpp   # 语义分析器
│   ├── car_generator.cpp # CAR 生成器
│   └── main.cpp       # 主程序入口
├── examples/          # 示例文件
│   └── hello.cardity  # 示例合约
├── output/            # 编译输出
│   └── hello.car      # 生成的 CAR 文件
├── tests/             # 测试文件
├── docs/              # 文档
└── CMakeLists.txt     # 构建配置
```

## 🔠 语言特性

### 支持的元素
- `contract` 合约定义
- `state` 状态变量
- `func` 函数（支持参数与返回类型）
- 基础类型：`string`, `int`, `bool`
- 逻辑赋值语句：`state.key = value;`
- 返回语句：`return ...;`

### 示例语法

```cardity
contract counter {
  state {
    count: int = 0;
  }

  func increment(): void {
    state.count = state.count + 1;
  }

  func get_count(): int {
    return state.count;
  }
}
```

## 🧠 编译产物

编译输出为 JSON 格式的 `.car` 文件：

```json
{
  "p": "cardinals",
  "op": "deploy",
  "protocol": "counter",
  "version": "1.0",
  "cpl": {
    "state": {
      "count": {
        "type": "int",
        "default": 0
      }
    },
    "methods": {
      "increment": {
        "params": [],
        "logic": "state.count = state.count + 1",
        "returns": ""
      },
      "get_count": {
        "params": [],
        "logic": "return state.count",
        "returns": "state.count"
      }
    }
  }
}
```

## 🚀 快速开始

### 构建项目
```bash
mkdir build && cd build
cmake ..
make
```

### 编译合约
```bash
./cardity examples/counter.cardity
```

## 🛣️ 开发路线图

- [ ] 🛡️ 权限控制：owner, only_owner
- [ ] 🔁 状态机支持：transition, state_enum
- [ ] 🪙 资产绑定：关联 Meme20, NFT 等资产协议
- [ ] 🧪 集成测试工具：本地运行模拟 .car 行为
- [ ] 📝 事件系统：event 声明
- [ ] 🔀 控制流：if/else, match, loop
- [ ] 🏗️ 自定义结构体与数组

## �� 许可证

MIT License 