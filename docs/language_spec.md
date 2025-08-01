# Cardity 语言规范

## 概述

Cardity 是一种专用于 Cardinals 协议的智能合约语言，设计简洁且易于理解。本文档描述了 Cardity 语言的完整语法和语义。

## 语法结构

### 1. 合约定义

合约是 Cardity 程序的基本单位，每个 `.cardity` 文件包含一个或多个合约。

```cardity
contract <contract_name> {
    // 状态变量定义
    state {
        // 状态变量声明
    }
    
    // 函数定义
    func <function_name>(<parameters>): <return_type> {
        // 函数体
    }
}
```

### 2. 状态变量

状态变量存储在合约的状态中，在合约的所有函数之间共享。

```cardity
state {
    variable_name: type = initial_value;
    count: int = 0;
    name: string = "Default";
    active: bool = true;
}
```

#### 支持的类型

- `int`: 整数类型
- `string`: 字符串类型
- `bool`: 布尔类型
- `void`: 无返回值类型（仅用于函数返回类型）

### 3. 函数定义

函数定义了合约的行为，可以修改状态或返回数据。

```cardity
func function_name(param1: type1, param2: type2): return_type {
    // 函数体
    statement1;
    statement2;
    return expression;
}
```

#### 函数特性

- 函数名必须是有效的标识符
- 参数列表可以为空
- 返回类型必须明确指定
- 函数体包含一个或多个语句

### 4. 语句

#### 赋值语句

```cardity
state.variable_name = expression;
```

#### 返回语句

```cardity
return expression;
return;  // 用于 void 函数
```

### 5. 表达式

#### 字面量

```cardity
42          // 整数字面量
"hello"     // 字符串字面量
true        // 布尔字面量
false       // 布尔字面量
```

#### 标识符

```cardity
variable_name
state.variable_name
```

#### 二元运算

```cardity
expression + expression  // 加法
expression - expression  // 减法
expression * expression  // 乘法
expression / expression  // 除法
```

#### 成员访问

```cardity
object.member
state.count
```

## 语义规则

### 1. 作用域

- 状态变量在整个合约中可见
- 函数参数在函数体内可见
- 局部变量（未来支持）在声明块内可见

### 2. 类型系统

- 静态类型检查
- 类型推断（部分支持）
- 类型兼容性检查

### 3. 错误处理

- 编译时错误检测
- 语义错误报告
- 类型错误检查

## 示例

### 简单计数器

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

### 代币合约

```cardity
contract token {
    state {
        name: string = "My Token";
        symbol: string = "MTK";
        total_supply: int = 1000000;
        balance: int = 1000000;
    }
    
    func transfer(amount: int): bool {
        if (state.balance >= amount) {
            state.balance = state.balance - amount;
            return true;
        }
        return false;
    }
    
    func get_balance(): int {
        return state.balance;
    }
}
```

## 编译输出

Cardity 编译器将 `.cardity` 文件编译为 `.car` JSON 格式：

```json
{
  "p": "cardinals",
  "op": "deploy",
  "protocol": "contract_name",
  "version": "1.0",
  "cpl": {
    "state": {
      "variable_name": {
        "type": "type",
        "default": "initial_value"
      }
    },
    "methods": {
      "function_name": {
        "params": [],
        "logic": "function_logic",
        "returns": "return_value"
      }
    }
  }
}
```

## 未来扩展

### 计划中的功能

1. **控制流语句**
   - `if/else` 条件语句
   - `match` 模式匹配
   - `loop` 循环语句

2. **高级类型**
   - 数组类型
   - 结构体类型
   - 映射类型

3. **事件系统**
   - `event` 声明
   - 事件触发

4. **权限控制**
   - `owner` 声明
   - `only_owner` 修饰符

5. **状态机支持**
   - `transition` 状态转换
   - `state_enum` 状态枚举 