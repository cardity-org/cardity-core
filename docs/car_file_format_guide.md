# .car 文件格式指南

## 当前状态

### 现有实现
目前 Cardity 编译器支持的是 JSON 格式的 `.car` 文件，例如：

```json
{
  "cpl": {
    "state": {
      "count": {
        "type": "int",
        "default": "0"
      }
    },
    "methods": {
      "increment": {
        "logic": "state.count = new_value"
      },
      "get_count": {
        "returns": "state.count"
      }
    }
  }
}
```

### 目标实现
我们计划将 `.car` 文件改为编程语言格式，类似 TypeScript/Solidity：

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

  method get_count() {
    return state.count;
  }
}
```

## 开发工作流

### 当前工作流（JSON格式）

1. **创建协议文件**：
   ```bash
   touch my_protocol.car
   ```

2. **编写JSON格式协议**：
   ```json
   {
     "cpl": {
       "state": {
         "balance": {
           "type": "int",
           "default": "1000"
         }
       },
       "methods": {
         "get_balance": {
           "returns": "state.balance"
         }
       }
     }
   }
   ```

3. **编译和测试**：
   ```bash
   ./build/cardityc my_protocol.car --validate
   ./build/cardity_runtime my_protocol.car get_balance
   ```

### 目标工作流（编程语言格式）

1. **创建协议文件**：
   ```bash
   touch my_protocol.car
   ```

2. **编写编程语言格式协议**：
   ```car
   protocol my_protocol {
     version: "1.0";
     owner: "doge1abc123def456";

     state {
       balance: int = 1000;
     }

     method get_balance() {
       return state.balance;
     }
   }
   ```

3. **编译和测试**：
   ```bash
   ./build/cardityc my_protocol.car --validate
   ./build/cardity_runtime my_protocol.car get_balance
   ```

## 语法对比

### 状态变量定义

**JSON格式**：
```json
"state": {
  "balance": {
    "type": "int",
    "default": "1000"
  }
}
```

**编程语言格式**：
```car
state {
  balance: int = 1000;
}
```

### 方法定义

**JSON格式**：
```json
"methods": {
  "deposit": {
    "params": ["amount"],
    "logic": "if (params.amount > 0) { state.balance = balance_plus_amount }"
  }
}
```

**编程语言格式**：
```car
method deposit(amount: int) {
  if (amount > 0) {
    state.balance = state.balance + amount;
  }
}
```

### 事件定义

**JSON格式**：
```json
"events": {
  "BalanceUpdated": {
    "params": [
      {
        "name": "old_balance",
        "type": "int"
      }
    ]
  }
}
```

**编程语言格式**：
```car
event BalanceUpdated {
  old_balance: int;
}
```

## 实现计划

### 阶段1：编译器扩展
- 添加对编程语言语法的解析器
- 实现词法分析器和语法分析器
- 支持基本的语法结构

### 阶段2：语言特性
- 支持变量声明和类型系统
- 实现控制结构（if/else, for, while）
- 添加内置函数和事件系统

### 阶段3：高级特性
- 支持模块化和导入
- 实现错误处理和调试
- 添加优化和代码生成

## 示例文件

### 当前可用的JSON格式示例

- `examples/counter.car` - 简单计数器
- `examples/hello.car` - Hello World示例
- `examples/advanced_wallet.car` - 高级钱包协议

### 目标编程语言格式示例

- `examples/simple_counter.car` - 简单计数器（编程语言格式）
- `examples/wallet_protocol.car` - 钱包协议（编程语言格式）

## 迁移指南

### 从JSON格式迁移到编程语言格式

1. **状态变量迁移**：
   ```json
   // JSON格式
   "balance": {
     "type": "int",
     "default": "1000"
   }
   ```
   ```car
   // 编程语言格式
   balance: int = 1000;
   ```

2. **方法迁移**：
   ```json
   // JSON格式
   "deposit": {
     "params": ["amount"],
     "logic": "state.balance = balance_plus_amount"
   }
   ```
   ```car
   // 编程语言格式
   method deposit(amount: int) {
     state.balance = state.balance + amount;
   }
   ```

3. **事件迁移**：
   ```json
   // JSON格式
   "BalanceUpdated": {
     "params": [
       {
         "name": "old_balance",
         "type": "int"
       }
     ]
   }
   ```
   ```car
   // 编程语言格式
   event BalanceUpdated {
     old_balance: int;
   }
   ```

## 总结

目前 Cardity 使用 JSON 格式的 `.car` 文件，但我们正在开发编程语言格式的支持。编程语言格式将提供：

- 更直观的语法
- 更好的开发体验
- 类型安全
- 更好的错误处理
- 更丰富的语言特性

在编程语言格式完全支持之前，建议使用现有的 JSON 格式进行开发。 