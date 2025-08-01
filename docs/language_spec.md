# Cardity 语言规范

## 📖 概述

Cardity 是一种专为 Cardinals 协议设计的智能合约语言，具有简洁的语法和强大的表达能力。

## 🎯 设计原则

1. **简洁性**: 语法简洁明了，易于学习和使用
2. **类型安全**: 强类型系统，编译时类型检查
3. **可读性**: 代码结构清晰，易于理解和维护
4. **可扩展性**: 支持未来功能扩展

## 📝 语法规范

### 程序结构

每个 Cardity 程序都是一个协议定义：

```cardity
protocol <protocol_name> {
  <metadata>
  <state_block>
  <method_definitions>
}
```

### 元数据 (Metadata)

协议的基本信息：

```cardity
version: "<version_string>";
owner: "<owner_address>";
```

**规则**:
- `version`: 协议版本号，字符串格式
- `owner`: 协议所有者地址，字符串格式
- 每个元数据项以分号结尾

### 状态块 (State Block)

定义协议的状态变量：

```cardity
state {
  <variable_name>: <type> = <default_value>;
  <variable_name>: <type> = <default_value>;
  ...
}
```

**规则**:
- 变量名必须是有效的标识符
- 支持的类型：`string`, `int`, `bool`
- 默认值是可选的
- 每个变量定义以分号结尾

**示例**:
```cardity
state {
  count: int = 0;
  message: string = "Hello";
  active: bool = true;
}
```

### 方法定义 (Method Definitions)

定义协议的方法：

```cardity
method <method_name>(<parameters>) {
  <statements>
}
```

**规则**:
- 方法名必须是有效的标识符
- 参数列表可以为空
- 多个参数用逗号分隔
- 方法体用大括号包围

**示例**:
```cardity
method increment() {
  state.count = state.count + 1;
}

method set_message(msg) {
  state.message = msg;
}
```

## 🔤 词法规范

### 标识符

- 以字母或下划线开头
- 只能包含字母、数字和下划线
- 区分大小写

**有效标识符**:
```
counter
set_count
_private
user123
```

**无效标识符**:
```
123counter  // 不能以数字开头
set-count   // 不能包含连字符
```

### 关键字

保留关键字，不能用作标识符：

```
protocol
state
method
version
owner
return
string
int
bool
true
false
```

### 字面量

#### 字符串字面量

用双引号包围：

```cardity
"Hello, World!"
"doge1abc..."
""
```

**转义字符**:
- `\"`: 双引号
- `\\`: 反斜杠
- `\n`: 换行符
- `\t`: 制表符

#### 数字字面量

整数格式：

```cardity
0
42
-123
```

#### 布尔字面量

```cardity
true
false
```

### 操作符

#### 算术操作符

```cardity
+  // 加法
-  // 减法
*  // 乘法
/  // 除法
```

#### 赋值操作符

```cardity
=  // 赋值
```

#### 逻辑操作符

```cardity
!  // 逻辑非
```

#### 成员访问操作符

```cardity
.  // 成员访问
```

### 分隔符

```cardity
(  )  // 圆括号
{  }  // 大括号
[  ]  // 方括号
,     // 逗号
;     // 分号
:     // 冒号
```

## 📋 语义规范

### 类型系统

#### 基本类型

1. **string**: 字符串类型
   - 值：任意字符串
   - 默认值：`""`

2. **int**: 整数类型
   - 值：32位整数
   - 默认值：`0`

3. **bool**: 布尔类型
   - 值：`true` 或 `false`
   - 默认值：`false`

#### 类型兼容性

- 赋值时，目标类型必须与源类型匹配
- 不支持隐式类型转换
- 算术运算只能在相同类型间进行

### 作用域规则

1. **全局作用域**: 协议级别的元数据和状态变量
2. **方法作用域**: 方法参数和局部变量
3. **状态访问**: 方法内可以通过 `state.` 访问状态变量

### 表达式

#### 字面量表达式

```cardity
42        // 数字字面量
"hello"   // 字符串字面量
true      // 布尔字面量
```

#### 标识符表达式

```cardity
count     // 变量引用
new_msg   // 参数引用
```

#### 成员访问表达式

```cardity
state.count    // 状态变量访问
state.message  // 状态变量访问
```

#### 算术表达式

```cardity
state.count + 1
state.count - 1
state.count * 2
state.count / 2
```

#### 逻辑表达式

```cardity
!state.active
```

### 语句

#### 赋值语句

```cardity
<target> = <expression>;
```

**规则**:
- 目标必须是可赋值的表达式
- 表达式类型必须与目标类型匹配
- 以分号结尾

**示例**:
```cardity
state.count = 42;
state.message = "Hello";
state.active = true;
```

#### 返回语句

```cardity
return <expression>;
```

**规则**:
- 表达式是可选的
- 以分号结尾

**示例**:
```cardity
return state.count;
return;
```

## 🔍 错误处理

### 编译时错误

1. **语法错误**: 不符合语法规范
2. **类型错误**: 类型不匹配
3. **未定义错误**: 使用未定义的标识符
4. **重复定义错误**: 重复定义标识符

### 错误消息格式

```
Error: <error_type> at line <line_number>: <description>
```

**示例**:
```
Error: Syntax error at line 5: Expected ';' after variable definition
Error: Type error at line 10: Cannot assign string to int
```

## 📚 示例

### 简单计数器

```cardity
protocol counter {
  version: "1.0";
  owner: "doge1counter...";

  state {
    count: int = 0;
  }

  method increment() {
    state.count = state.count + 1;
  }

  method decrement() {
    state.count = state.count - 1;
  }

  method get_count() {
    return state.count;
  }
}
```

### 消息存储

```cardity
protocol message_store {
  version: "1.0";
  owner: "doge1message...";

  state {
    message: string = "";
    active: bool = true;
  }

  method set_message(msg) {
    state.message = msg;
  }

  method get_message() {
    return state.message;
  }

  method toggle_active() {
    state.active = !state.active;
  }
}
```

## 🔮 未来扩展

### 计划中的功能

1. **更多类型**: `float`, `array`, `struct`
2. **控制流**: `if/else`, `for`, `while`
3. **事件**: `event` 声明和触发
4. **权限控制**: `only_owner` 修饰符
5. **状态机**: 状态转换支持

### 向后兼容性

- 新版本将保持向后兼容
- 废弃的功能将提供迁移指南
- 重大变更将提前通知 