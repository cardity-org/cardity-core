# Cardity 编译器开发指南

## 🏗️ 架构概述

Cardity 编译器采用经典的编译原理架构：

```
Cardity Source (.cardity)
         ↓
    [Tokenizer] → Tokens
         ↓
    [Parser] → AST
         ↓
[CarGenerator] → JSON (.car)
```

## 📁 核心模块

### 1. 词法分析器 (Tokenizer)

**文件**: `compiler/tokenizer.h`, `compiler/tokenizer.cpp`

负责将源代码字符串分解为 Token 序列。

**主要类**:
- `Tokenizer`: 词法分析器主类
- `Token`: Token 结构体
- `TokenType`: Token 类型枚举

**扩展方法**:
1. 在 `TokenType` 枚举中添加新类型
2. 在 `next_token()` 方法中添加识别逻辑

### 2. 语法分析器 (Parser)

**文件**: `compiler/parser.h`, `compiler/parser.cpp`

负责将 Token 序列解析为抽象语法树 (AST)。

**主要类**:
- `Parser`: 语法分析器主类

**扩展方法**:
1. 添加新的解析方法
2. 更新 `parse()` 主方法调用新解析逻辑

### 3. 抽象语法树 (AST)

**文件**: `compiler/ast.h`

定义所有 AST 节点类型。

**主要结构**:
- `ASTNode`: 基类
- `Protocol`: 协议根节点
- `Metadata`: 元数据
- `StateBlock`: 状态块
- `StateVariable`: 状态变量
- `Method`: 方法定义

**扩展方法**:
1. 继承 `ASTNode` 创建新节点类型
2. 在解析器中添加对应的解析逻辑

### 4. JSON 生成器 (CarGenerator)

**文件**: `compiler/car_generator.h`, `compiler/car_generator.cpp`

负责将 AST 转换为 Cardinals .car JSON 格式。

**主要类**:
- `CarGenerator`: JSON 生成器主类

**扩展方法**:
1. 添加新的编译方法
2. 更新 `compile_to_car()` 主方法

## 🔧 开发工作流

### 添加新语法特性

1. **更新词法分析器**
   ```cpp
   // 在 tokenizer.h 中添加新 TokenType
   enum class TokenType {
       // ... 现有类型
       NEW_KEYWORD,
   };
   
   // 在 tokenizer.cpp 中添加识别逻辑
   if (word == "new_keyword") return {TokenType::NEW_KEYWORD, word, 0, 0};
   ```

2. **更新 AST 结构**
   ```cpp
   // 在 ast.h 中添加新节点
   struct NewNode : public ASTNode {
       std::string value;
   };
   ```

3. **更新语法分析器**
   ```cpp
   // 在 parser.h 中添加解析方法声明
   NewNode parseNewNode();
   
   // 在 parser.cpp 中实现解析逻辑
   NewNode Parser::parseNewNode() {
       // 解析逻辑
   }
   ```

4. **更新 JSON 生成器**
   ```cpp
   // 在 car_generator.cpp 中添加编译逻辑
   json compileNewNode(const NewNode& node) {
       // 编译逻辑
   }
   ```

### 添加新类型支持

1. **更新 TokenType**
   ```cpp
   enum class TokenType {
       // ... 现有类型
       KEYWORD_FLOAT,
   };
   ```

2. **更新词法分析器**
   ```cpp
   if (word == "float") return {TokenType::KEYWORD_FLOAT, word, 0, 0};
   ```

3. **更新解析器**
   ```cpp
   // 在 parseStateVariable() 中添加类型支持
   if (peek().type == TokenType::KEYWORD_FLOAT) {
       var.type = advance().value;
   }
   ```

4. **更新 JSON 生成器**
   ```cpp
   // JSON 生成器会自动处理新类型
   ```

## 🧪 测试

### 创建测试用例

1. **创建测试文件**
   ```bash
   echo 'protocol test {
     version: "1.0";
     owner: "test";
     state {
       value: int = 42;
     }
   }' > examples/test.cardity
   ```

2. **运行测试**
   ```bash
   ./build/cardity examples/test.cardity
   ```

3. **验证输出**
   ```bash
   cat output/test.car
   ```

### 调试技巧

1. **启用详细输出**
   ```cpp
   // 在 main.cpp 中添加调试信息
   std::cout << "Token: " << token.value << " (Type: " << static_cast<int>(token.type) << ")" << std::endl;
   ```

2. **检查 AST 结构**
   ```cpp
   // 在解析后打印 AST 信息
   std::cout << "Protocol: " << protocol->name << std::endl;
   std::cout << "Methods: " << protocol->methods.size() << std::endl;
   ```

## 📋 常见问题

### 编译错误

1. **找不到 nlohmann/json**
   ```bash
   # 安装依赖
   brew install nlohmann-json
   ```

2. **CMake 错误**
   ```bash
   # 清理并重新构建
   rm -rf build
   cmake -B build
   cmake --build build
   ```

### 运行时错误

1. **词法分析错误**
   - 检查是否支持所有需要的字符
   - 确认关键字拼写正确

2. **语法分析错误**
   - 检查语法是否符合 Cardity 规范
   - 确认所有必需的分号和括号

3. **JSON 生成错误**
   - 检查 AST 结构是否完整
   - 确认所有必需字段都已设置

## 🚀 性能优化

1. **减少字符串拷贝**
   - 使用引用传递
   - 避免不必要的字符串连接

2. **优化内存分配**
   - 预分配容器大小
   - 使用移动语义

3. **提高解析效率**
   - 缓存常用 Token
   - 优化关键字查找

## 📚 参考资料

- [C++ 编译原理](https://en.wikipedia.org/wiki/Compiler)
- [nlohmann/json 文档](https://github.com/nlohmann/json)
- [CMake 教程](https://cmake.org/cmake/help/latest/guide/tutorial/) 