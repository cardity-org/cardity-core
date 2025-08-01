# Cardity 编译器

Cardity 是一个专为 Cardinals 协议设计的编译器，将 Cardity 语言编译为 Cardinals .car JSON 格式。

## 🚀 功能特性

- **词法分析**: 支持 Cardity 语言的所有关键字和语法
- **语法分析**: 构建抽象语法树 (AST)
- **JSON 生成**: 输出标准的 Cardinals .car JSON 格式
- **类型支持**: 支持 string、int、bool 类型
- **方法支持**: 支持带参数的方法定义

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

```bash
./build/cardity <input.cardity>
```

输出文件将保存在 `output/` 目录中。

## 🎯 语言语法

### 协议定义

```cardity
protocol <name> {
  version: "<version>";
  owner: "<owner_address>";

  state {
    <variable_name>: <type> = <default_value>;
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
  }

  method set_msg(new_msg) {
    state.msg = new_msg;
  }

  method get_msg() {
    return state.msg;
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
      }
    },
    "methods": {
      "set_msg": {
        "params": ["new_msg"],
        "logic": "state.msg = new_msg"
      },
      "get_msg": {
        "params": [],
        "logic": "return state.msg"
      }
    }
  }
}
```

## 🧪 测试示例

项目包含多个测试示例：

- `examples/hello_cardinals.cardity` - 简单的问候协议
- `examples/counter.cardity` - 计数器协议

运行测试：

```bash
./build/cardity examples/hello_cardinals.cardity
./build/cardity examples/counter.cardity
```

## 🏗️ 项目结构

```
cardity/
├── compiler/          # 编译器源码
│   ├── main.cpp      # 主程序
│   ├── tokenizer.h   # 词法分析器
│   ├── parser.h      # 语法分析器
│   ├── ast.h         # AST 定义
│   └── car_generator.h # JSON 生成器
├── examples/         # 示例文件
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

## �� 许可证

MIT License 