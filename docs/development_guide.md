# Cardity 开发指南

## 项目概述

Cardity 是一个专用于 Cardinals 协议的智能合约语言编译器。本文档为开发者提供参与项目开发的详细指南。

## 开发环境设置

### 系统要求

- C++17 兼容的编译器 (GCC 7+, Clang 5+, MSVC 2017+)
- CMake 3.16+
- nlohmann/json 库
- Git

### 安装依赖

#### Ubuntu/Debian
```bash
sudo apt update
sudo apt install build-essential cmake git
sudo apt install nlohmann-json3-dev
```

#### macOS
```bash
brew install cmake nlohmann-json
```

#### Windows
```bash
# 使用 vcpkg
vcpkg install nlohmann-json
```

### 构建项目

```bash
# 克隆项目
git clone https://github.com/chinasong/cardity.git
cd cardity

# 创建构建目录
mkdir build && cd build

# 配置项目
cmake ..

# 编译
make -j$(nproc)
```

## 项目架构

### 目录结构

```
cardity/
├── compiler/          # 编译器核心
│   ├── lexer.h/cpp    # 词法分析器
│   ├── parser.h/cpp   # 语法分析器
│   ├── ast.h/cpp      # 抽象语法树
│   ├── semantic.h/cpp # 语义分析器
│   ├── car_generator.h/cpp # CAR 生成器
│   └── main.cpp       # 主程序
├── examples/          # 示例合约
├── tests/             # 测试文件
├── docs/              # 文档
└── output/            # 编译输出
```

### 编译流程

1. **词法分析 (Lexer)**: 将源代码转换为 Token 流
2. **语法分析 (Parser)**: 构建抽象语法树 (AST)
3. **语义分析 (Semantic Analyzer)**: 类型检查和语义验证
4. **代码生成 (CAR Generator)**: 生成 CAR JSON 格式

## 开发规范

### 代码风格

- 使用 C++17 标准
- 遵循 Google C++ 风格指南
- 使用 4 空格缩进
- 类名使用 PascalCase
- 函数和变量使用 snake_case
- 常量使用 UPPER_SNAKE_CASE

### 命名约定

```cpp
// 类名
class Lexer { ... };
class Parser { ... };

// 函数名
void parse_expression();
std::string generate_code();

// 变量名
std::vector<Token> tokens;
int current_position;

// 常量
const int MAX_TOKEN_LENGTH = 1024;
```

### 错误处理

使用异常处理机制：

```cpp
class ParseError : public std::runtime_error {
public:
    explicit ParseError(const std::string& message) 
        : std::runtime_error(message) {}
};

// 使用示例
if (unexpected_token) {
    throw ParseError("Unexpected token: " + token.value);
}
```

## 测试

### 单元测试

使用 Google Test 框架：

```cpp
#include <gtest/gtest.h>

TEST(LexerTest, TokenizeBasicTokens) {
    std::string source = "contract counter {";
    Lexer lexer(source);
    auto tokens = lexer.tokenize();
    
    EXPECT_EQ(tokens[0].type, TokenType::CONTRACT);
    EXPECT_EQ(tokens[1].type, TokenType::IDENTIFIER);
    EXPECT_EQ(tokens[2].type, TokenType::LEFT_BRACE);
}
```

### 集成测试

测试完整的编译流程：

```cpp
TEST(CompilerTest, CompileCounterContract) {
    std::string source = R"(
        contract counter {
            state {
                count: int = 0;
            }
            func increment(): void {
                state.count = state.count + 1;
            }
        }
    )";
    
    // 执行编译流程
    Lexer lexer(source);
    auto tokens = lexer.tokenize();
    
    Parser parser(tokens);
    auto ast = parser.parse();
    
    SemanticAnalyzer analyzer(ast);
    EXPECT_TRUE(analyzer.analyze());
    
    CARGenerator generator(ast);
    auto car = generator.generate();
    
    // 验证输出
    EXPECT_EQ(car["p"], "cardinals");
    EXPECT_EQ(car["protocol"], "counter");
}
```

### 运行测试

```bash
cd build
make test
```

## 贡献指南

### 提交代码

1. Fork 项目仓库
2. 创建功能分支：`git checkout -b feature/new-feature`
3. 提交更改：`git commit -m "Add new feature"`
4. 推送分支：`git push origin feature/new-feature`
5. 创建 Pull Request

### 提交信息格式

```
<type>(<scope>): <subject>

<body>

<footer>
```

类型：
- `feat`: 新功能
- `fix`: 修复 bug
- `docs`: 文档更新
- `style`: 代码格式调整
- `refactor`: 重构
- `test`: 测试相关
- `chore`: 构建过程或辅助工具的变动

### 代码审查

- 所有代码必须通过代码审查
- 确保测试覆盖率
- 遵循项目编码规范
- 添加必要的文档

## 调试

### 调试模式编译

```bash
mkdir build-debug && cd build-debug
cmake -DCMAKE_BUILD_TYPE=Debug ..
make
```

### 使用 GDB 调试

```bash
gdb ./cardity
(gdb) run examples/counter.cardity
```

### 日志输出

使用 `-v` 参数启用详细输出：

```bash
./cardity examples/counter.cardity -v
```

## 性能优化

### 编译优化

- 使用 `-O2` 或 `-O3` 优化级别
- 启用链接时优化 (LTO)
- 使用 Profile Guided Optimization (PGO)

### 内存管理

- 使用智能指针管理内存
- 避免不必要的拷贝
- 使用移动语义

## 发布

### 版本管理

使用语义化版本控制：

- MAJOR.MINOR.PATCH
- MAJOR: 不兼容的 API 修改
- MINOR: 向下兼容的功能性新增
- PATCH: 向下兼容的问题修正

### 发布流程

1. 更新版本号
2. 更新 CHANGELOG.md
3. 创建发布标签
4. 构建发布版本
5. 上传到 GitHub Releases

## 常见问题

### Q: 如何处理循环依赖？

A: 使用前向声明和 PIMPL 模式。

### Q: 如何添加新的语言特性？

A: 
1. 更新词法分析器添加新的 Token
2. 更新语法分析器添加新的语法规则
3. 更新 AST 添加新的节点类型
4. 更新语义分析器添加类型检查
5. 更新代码生成器添加输出逻辑

### Q: 如何优化编译性能？

A:
1. 使用并行编译
2. 减少头文件依赖
3. 使用预编译头文件
4. 优化算法复杂度

## 联系方式

- 项目主页: https://github.com/chinasong/cardity
- 问题反馈: https://github.com/chinasong/cardity/issues
- 讨论区: https://github.com/chinasong/cardity/discussions 