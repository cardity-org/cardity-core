# Cardity 编译器

Cardity 是一个专为 Cardinals 协议设计的编译器，将 Cardity 语言编译为 Cardinals .car JSON 格式。

## 🚀 功能特性

- **词法分析**: 支持 Cardity 语言的所有关键字和语法
- **语法分析**: 构建抽象语法树 (AST)
- **JSON 生成**: 输出标准的 Cardinals .car JSON 格式
- **类型支持**: 支持 string、int、bool 类型
- **方法支持**: 支持带参数的方法定义
- **事件系统**: 支持事件定义和触发
- **表达式求值**: 支持复杂的逻辑表达式
- **条件语句**: 支持 if 条件判断
- **ABI 生成**: 自动生成应用二进制接口
- **部署工具**: 支持 .car 文件部署和签名

## 📦 安装依赖

```bash
# 安装 nlohmann/json (macOS)
brew install nlohmann-json

# 或者使用 vcpkg
vcpkg install nlohmann-json
```

## 🔨 编译

```bash
mkdir build
cmake -B build
cmake --build build
```

## 📝 使用方法

### 基本编译

```bash
./build/cardity <input.cardity>
```

输出文件将保存在 `output/` 目录中。

### 运行时测试

```bash
# 运行协议
./build/cardity_runtime <car_file> <method> [args...]

# 示例
./build/cardity_runtime examples/hello.car set_msg "Hello World"
./build/cardity_runtime examples/hello.car get_msg
```

### ABI 生成

```bash
# 生成 ABI
./build/cardity_abi <car_file>

# 示例
./build/cardity_abi examples/hello.car
```

### 部署工具

```bash
# 编译部署包
./build/cardityc <car_file> -o <output_file> --owner <owner_address>

# 示例
./build/cardityc examples/hello.car -o deployed_hello.car --owner doge1abc123
```

## 🎯 语言语法

### 协议定义

```cardity
protocol <name> {
  version: "<version>";
  owner: "<owner_address>";

  state {
    <variable_name>: <type> = <default_value>;
  }

  events {
    <event_name>(<params>) {
      <param_name>: <type>;
    }
  }

  method <method_name>(<params>) {
    <logic>;
  }
}
```

### 示例

```cardity
protocol hello_cardinals {
  version: "1.0";
  owner: "doge1abc...";

  state {
    msg: string = "Hello, Cardinals!";
    count: int = 0;
    active: bool = true;
  }

  events {
    MessageUpdated(new_msg: string);
    CounterIncremented(old_count: int, new_count: int);
  }

  method set_msg(new_msg: string) {
    if (new_msg != "") {
      state.msg = new_msg;
      emit MessageUpdated(new_msg);
    }
  }

  method get_msg() {
    return state.msg;
  }

  method increment() {
    if (state.active && state.count < 10) {
      state.count = state.count + 1;
      emit CounterIncremented(state.count - 1, state.count);
    }
  }
}
```

## 📄 输出格式

编译器生成标准的 Cardinals .car JSON 格式：

```json
{
  "p": "cardinals",
  "op": "deploy",
  "protocol": "hello_cardinals",
  "version": "1.0",
  "cpl": {
    "owner": "doge1abc...",
    "state": {
      "msg": {
        "type": "string",
        "default": "Hello, Cardinals!"
      },
      "count": {
        "type": "int",
        "default": "0"
      },
      "active": {
        "type": "bool",
        "default": "true"
      }
    },
    "events": {
      "MessageUpdated": {
        "params": [
          {
            "name": "new_msg",
            "type": "string"
          }
        ]
      },
      "CounterIncremented": {
        "params": [
          {
            "name": "old_count",
            "type": "int"
          },
          {
            "name": "new_count",
            "type": "int"
          }
        ]
      }
    },
    "methods": {
      "set_msg": {
        "params": ["new_msg"],
        "logic": "if (params.new_msg != \"\") { state.msg = params.new_msg; emit MessageUpdated(params.new_msg); }"
      },
      "get_msg": {
        "returns": {
          "type": "string",
          "expr": "state.msg"
        }
      },
      "increment": {
        "logic": "if (state.active && state.count < 10) { state.count = state.count + 1; emit CounterIncremented(state.count - 1, state.count); }"
      }
    }
  }
}
```

## 🧪 测试示例

项目包含多个测试示例：

- `examples/hello_cardinals.cardity` - 简单的问候协议
- `examples/counter.cardity` - 计数器协议
- `examples/conditional.cardity` - 条件逻辑示例
- `examples/typed_counter.cardity` - 类型化计数器
- `examples/event_demo.cardity` - 事件系统演示

运行测试：

```bash
# 编译示例
./build/cardity examples/hello_cardinals.cardity
./build/cardity examples/counter.cardity
./build/cardity examples/conditional.cardity

# 运行时测试
./build/cardity_runtime examples/hello.car call set_msg "Hello World"
./build/cardity_runtime examples/counter.car call increment
./build/cardity_runtime examples/event_demo.car call set_message "Test Event"
```

## 🏗️ 项目结构

```
cardity/
├── compiler/          # 编译器源码
│   ├── main.cpp      # 主程序
│   ├── tokenizer.h   # 词法分析器
│   ├── parser.h      # 语法分析器
│   ├── ast.h         # AST 定义
│   ├── car_generator.h # JSON 生成器
│   ├── runtime.h     # 运行时系统
│   ├── expression.h  # 表达式求值器
│   ├── type_system.h # 类型系统
│   ├── event_system.h # 事件系统
│   └── car_deployer.h # 部署工具
├── examples/         # 示例文件
├── tests/           # 测试文件
├── docs/            # 文档
├── output/          # 输出目录
└── CMakeLists.txt   # 构建配置
```

## 🔧 开发

### 添加新的关键字

1. 在 `tokenizer.h` 中添加新的 `TokenType`
2. 在 `tokenizer.cpp` 中添加关键字识别逻辑
3. 在 `parser.cpp` 中添加解析逻辑

### 扩展 AST 结构

1. 在 `ast.h` 中定义新的节点类型
2. 在 `parser.cpp` 中实现解析逻辑
3. 在 `car_generator.cpp` 中实现 JSON 生成逻辑

### 添加新的运行时功能

1. 在相应的头文件中定义接口
2. 在实现文件中添加功能
3. 更新 CMakeLists.txt 包含新文件
4. 添加测试用例

## 🔗 相关项目

- **Cardity WASM Runtime** - WebAssembly 运行时环境
- **Cardity Core** - 核心协议定义和工具

## �� 许可证

MIT License 