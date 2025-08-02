# Cardity 开发指南

## 概述

Cardity 是一个专为 Cardinals 协议设计的现代编程语言，语法类似于 TypeScript 和 Solidity，但专门针对 Cardinals 生态系统进行了优化。

## 文件格式

Cardity 使用 `.car` 文件扩展名，这是主要的开发格式。`.car` 文件是编程语言文件，使用类似 TypeScript/Solidity 的语法。

## 基本语法

### 1. 协议声明

```car
protocol my_protocol {
  version: "1.0";
  owner: "doge1abc123def456";
  
  // 协议内容
}
```

### 2. 状态变量

```car
state {
  balance: int = 1000;
  owner: string = "doge1abc123def456";
  active: bool = true;
  transactions: array = [];
}
```

### 3. 事件定义

```car
event BalanceUpdated {
  old_balance: int;
  new_balance: int;
}

event TransactionCreated {
  amount: int;
  timestamp: string;
}
```

### 4. 方法定义

```car
method deposit(amount: int) {
  if (amount > 0) {
    let old_balance = state.balance;
    state.balance = state.balance + amount;
    state.transactions.push(amount);
    
    emit BalanceUpdated(old_balance, state.balance);
  }
}

method get_balance() {
  return state.balance;
}
```

## 数据类型

- `int`: 整数类型
- `string`: 字符串类型
- `bool`: 布尔类型
- `array`: 数组类型
- `address`: 地址类型（Cardinals 地址）

## 控制结构

### 条件语句

```car
if (condition) {
  // 执行代码
} else {
  // 其他代码
}
```

### 循环

```car
for (let i = 0; i < array.length; i++) {
  // 循环代码
}

while (condition) {
  // 循环代码
}
```

## 内置函数

- `now()`: 获取当前时间戳
- `abs(value)`: 获取绝对值
- `emit event_name(params)`: 触发事件

## 开发工作流

### 1. 创建协议文件

```bash
# 创建新的 .car 文件
touch my_protocol.car
```

### 2. 编写协议代码

```car
protocol my_protocol {
  version: "1.0";
  owner: "doge1abc123def456";

  state {
    count: int = 0;
  }

  method increment() {
    state.count = state.count + 1;
  }

  method get_count() {
    return state.count;
  }
}
```

### 3. 编译协议

```bash
# 编译 .car 文件
./build/cardityc my_protocol.car

# 或者编译为部署格式
./build/cardityc my_protocol.car -o my_protocol_deployed.car
```

### 4. 生成 ABI

```bash
# 生成接口定义
./build/cardity_abi my_protocol.car
```

### 5. 测试协议

```bash
# 运行协议方法
./build/cardity_runtime my_protocol.car get_count
./build/cardity_runtime my_protocol.car increment
```

## 示例项目

### 简单计数器

```car
protocol counter {
  version: "1.0";
  owner: "doge1abc123def456";

  state {
    count: int = 0;
    max_count: int = 100;
  }

  event CountChanged {
    old_count: int;
    new_count: int;
  }

  method increment() {
    if (state.count < state.max_count) {
      let old_count = state.count;
      state.count = state.count + 1;
      emit CountChanged(old_count, state.count);
    }
  }

  method decrement() {
    if (state.count > 0) {
      let old_count = state.count;
      state.count = state.count - 1;
      emit CountChanged(old_count, state.count);
    }
  }

  method get_count() {
    return state.count;
  }
}
```

### 钱包协议

```car
protocol wallet {
  version: "1.0";
  owner: "doge1abc123def456";

  state {
    balance: int = 1000;
    owner: string = "doge1abc123def456";
  }

  event BalanceUpdated {
    old_balance: int;
    new_balance: int;
  }

  method deposit(amount: int) {
    if (amount > 0) {
      let old_balance = state.balance;
      state.balance = state.balance + amount;
      emit BalanceUpdated(old_balance, state.balance);
    }
  }

  method withdraw(amount: int) {
    if (amount > 0 && amount <= state.balance) {
      let old_balance = state.balance;
      state.balance = state.balance - amount;
      emit BalanceUpdated(old_balance, state.balance);
    }
  }

  method get_balance() {
    return state.balance;
  }
}
```

## 最佳实践

1. **命名规范**: 使用小写字母和下划线命名协议和方法
2. **类型安全**: 始终指定参数和返回值的类型
3. **事件驱动**: 使用事件来记录重要的状态变化
4. **错误处理**: 在方法中添加适当的条件检查
5. **文档化**: 为复杂的逻辑添加注释

## 调试技巧

1. 使用 `./build/cardity_runtime` 逐步测试方法
2. 检查生成的 ABI 文件了解接口结构
3. 使用事件来跟踪状态变化
4. 在开发环境中使用简单的测试数据

## 部署

编译后的协议可以部署到 Cardinals 网络：

```bash
# 编译协议
./build/cardityc my_protocol.car

# 部署到网络（需要网络配置）
./build/cardity_deploy my_protocol.car --network mainnet
```

## 更多资源

- 查看 `examples/` 目录中的示例
- 参考 `docs/language_spec.md` 了解详细语法
- 使用 `./build/cardity --help` 查看命令行选项 