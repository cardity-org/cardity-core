# Cardity DRC-20 代币开发指南

## 🎯 概述

Cardity Core 现在支持 DRC-20 代币标准，让开发者可以像编写 Solidity 智能合约一样轻松创建 DRC-20 代币。本指南将详细介绍如何使用 Cardity 语言创建、部署和管理 DRC-20 代币。

## 🏗️ 核心特性

### DRC-20 标准支持
- **Deploy（部署）** - 创建新的 DRC-20 代币
- **Mint（铸造）** - 铸造代币
- **Transfer（转账）** - 转移代币
- **自定义逻辑** - 用户可以定义自己的业务逻辑

### 类似 Solidity 的语法
```cardity
protocol MyDrc20Token {
  // DRC-20 代币定义
  drc20 {
    tick: "MYT";
    name: "My Token";
    max_supply: "1000000";
    mint_limit: "1000";
    decimals: "18";
    deployer: "doge1owner123";
  }
  
  // 状态变量
  state {
    total_supply: int = 0;
    deployed: bool = false;
  }
  
  // 自定义方法
  method deploy() {
    // 自定义部署逻辑
  }
}
```

## 🚀 快速开始

### 1. 创建 DRC-20 代币

使用模板生成器创建基础代币：

```bash
# 生成基础模板
cardity_drc20 template basic --tick MYT --name "My Token" --output my_token.car

# 生成高级模板
cardity_drc20 template advanced --tick ADV --name "Advanced Token" --max-supply 10000000 --output advanced_token.car
```

### 2. 编译代币定义

```bash
# 编译 DRC-20 代币
cardity_drc20 compile my_token.car

# 验证代币定义
cardity_drc20 validate my_token.car
```

### 3. 生成部署铭文

```bash
# 生成部署铭文
cardity_drc20 deploy my_token.car --output deploy.json

# 生成铸造铭文
cardity_drc20 mint MYT 1000 --output mint.json

# 生成转账铭文
cardity_drc20 transfer MYT 100 doge1abc... --output transfer.json
```

## 📝 DRC-20 语法详解

### 代币定义结构

```cardity
drc20 {
  tick: "SYMBOL";        // 代币符号 (3-4 字符)
  name: "Token Name";     // 代币名称
  max_supply: "1000000"; // 最大供应量
  mint_limit: "1000";    // 每次铸造限制 (可选)
  decimals: "18";        // 小数位数 (可选)
  deployer: "address";   // 部署者地址
}
```

### 标准方法

#### Deploy 方法
```cardity
method deploy() {
  if (!state.deployed) {
    // 验证代币参数
    if (drc20.tick.length() < 3 || drc20.tick.length() > 4) {
      return "Invalid tick length";
    }
    
    // 执行部署
    state.deployed = true;
    emit TokenDeployed(drc20.tick, drc20.max_supply);
    return "Token deployed successfully";
  }
  return "Token already deployed";
}
```

#### Mint 方法
```cardity
method mint(amount) {
  if (!state.deployed) {
    return "Token not deployed";
  }
  
  if (amount <= 0) {
    return "Invalid amount";
  }
  
  if (state.total_supply + amount > drc20.max_supply) {
    return "Exceeds max supply";
  }
  
  // 执行铸造
  state.total_supply = state.total_supply + amount;
  state.mint_count = state.mint_count + 1;
  emit TokenMinted(drc20.tick, amount, state.total_supply);
  return "Minted successfully";
}
```

#### Transfer 方法
```cardity
method transfer(to_address, amount) {
  if (!state.deployed) {
    return "Token not deployed";
  }
  
  if (amount <= 0) {
    return "Invalid amount";
  }
  
  if (to_address.length() < 26) {
    return "Invalid address";
  }
  
  // 执行转账
  state.transfer_count = state.transfer_count + 1;
  emit TokenTransferred(drc20.tick, amount, to_address);
  return "Transfer successful";
}
```

### 事件定义

```cardity
event TokenDeployed {
  tick: string;
  max_supply: string;
}

event TokenMinted {
  tick: string;
  amount: int;
  total_supply: int;
}

event TokenTransferred {
  tick: string;
  amount: int;
  to_address: string;
}
```

## 🔧 高级功能

### 自定义验证逻辑

```cardity
method validate_deploy_params() {
  return drc20.tick.length() >= 3 && drc20.tick.length() <= 4;
}

method validate_mint_params(amount) {
  return amount > 0 && state.total_supply + amount <= drc20.max_supply;
}

method validate_transfer_params(to_address, amount) {
  return amount > 0 && to_address.length() >= 26;
}
```

### 查询方法

```cardity
method get_total_supply() {
  return state.total_supply;
}

method get_mint_count() {
  return state.mint_count;
}

method get_transfer_count() {
  return state.transfer_count;
}

method is_deployed() {
  return state.deployed;
}
```

## 🛠️ CLI 工具使用

### cardity_drc20 命令

```bash
# 编译 DRC-20 代币
cardity_drc20 compile <file>

# 生成部署铭文
cardity_drc20 deploy <file> [--output <file>] [--format <fmt>]

# 生成铸造铭文
cardity_drc20 mint <tick> <amount> [--output <file>]

# 生成转账铭文
cardity_drc20 transfer <tick> <amount> <to_address> [--output <file>]

# 验证代币定义
cardity_drc20 validate <file>

# 生成模板
cardity_drc20 template <type> [--tick <symbol>] [--name <name>] [--max-supply <amount>] [--output <file>]
```

### 参数说明

| 参数 | 说明 | 必需 |
|------|------|------|
| `--output` | 输出文件路径 | 否 |
| `--format` | 输出格式 (json, carc, inscription) | 否 |
| `--tick` | 代币符号 | 模板生成时必需 |
| `--name` | 代币名称 | 模板生成时必需 |
| `--max-supply` | 最大供应量 | 高级模板必需 |

## 📋 示例项目

### 基础代币示例

```cardity
protocol BasicToken {
  version: "1.0.0";
  owner: "doge1owner123";
  
  drc20 {
    tick: "BASIC";
    name: "Basic Token";
    max_supply: "1000000";
    mint_limit: "1000";
    decimals: "18";
    deployer: "doge1owner123";
  }
  
  state {
    total_supply: int = 0;
    deployed: bool = false;
    mint_count: int = 0;
    transfer_count: int = 0;
  }
  
  method deploy() {
    if (!state.deployed) {
      state.deployed = true;
      emit TokenDeployed(drc20.tick, drc20.max_supply);
      return "Token deployed successfully";
    }
    return "Token already deployed";
  }
  
  method mint(amount) {
    if (!state.deployed) {
      return "Token not deployed";
    }
    if (amount <= 0) {
      return "Invalid amount";
    }
    if (state.total_supply + amount > drc20.max_supply) {
      return "Exceeds max supply";
    }
    state.total_supply = state.total_supply + amount;
    state.mint_count = state.mint_count + 1;
    emit TokenMinted(drc20.tick, amount, state.total_supply);
    return "Minted successfully";
  }
  
  method transfer(to_address, amount) {
    if (!state.deployed) {
      return "Token not deployed";
    }
    if (amount <= 0) {
      return "Invalid amount";
    }
    state.transfer_count = state.transfer_count + 1;
    emit TokenTransferred(drc20.tick, amount, to_address);
    return "Transfer successful";
  }
  
  // 查询方法
  method get_total_supply() {
    return state.total_supply;
  }
  
  method get_mint_count() {
    return state.mint_count;
  }
  
  method get_transfer_count() {
    return state.transfer_count;
  }
  
  method is_deployed() {
    return state.deployed;
  }
  
  // 事件定义
  event TokenDeployed {
    tick: string;
    max_supply: string;
  }
  
  event TokenMinted {
    tick: string;
    amount: int;
    total_supply: int;
  }
  
  event TokenTransferred {
    tick: string;
    amount: int;
    to_address: string;
  }
}
```

## 🔍 验证规则

### DRC-20 标准验证

1. **代币符号 (tick)**
   - 长度：3-4 字符
   - 字符：仅允许大写字母和数字
   - 格式：`^[A-Z0-9]+$`

2. **最大供应量 (max_supply)**
   - 必须为正整数
   - 格式：`^[0-9]+$`

3. **铸造限制 (mint_limit)**
   - 可选参数
   - 必须为正整数
   - 不能超过最大供应量

4. **小数位数 (decimals)**
   - 可选参数
   - 默认为 18
   - 范围：0-18

5. **地址格式**
   - Dogecoin 地址格式
   - 长度：26-35 字符
   - 前缀：D 或 A

## 🚀 部署流程

### 1. 编写代币定义
```bash
# 创建代币文件
cardity_drc20 template basic --tick MYT --name "My Token" --output my_token.car
```

### 2. 编译和验证
```bash
# 编译代币
cardity_drc20 compile my_token.car

# 验证代币定义
cardity_drc20 validate my_token.car
```

### 3. 生成部署铭文
```bash
# 生成部署铭文
cardity_drc20 deploy my_token.car --output deploy.json
```

### 4. 部署到 Dogecoin
```bash
# 使用 cardity_deploy 部署
cardity_deploy deploy deploy.json --address <your_address> --private-key <your_private_key>
```

## 🔧 故障排除

### 常见错误

1. **"Invalid tick format"**
   - 检查代币符号长度和字符
   - 确保只使用大写字母和数字

2. **"Invalid max supply"**
   - 确保最大供应量为正整数
   - 检查数值格式

3. **"Token not deployed"**
   - 确保先调用 deploy 方法
   - 检查部署状态

4. **"Exceeds max supply"**
   - 检查铸造数量是否超过最大供应量
   - 验证当前总供应量

### 调试技巧

1. **使用验证命令**
   ```bash
   cardity_drc20 validate <file>
   ```

2. **检查编译输出**
   ```bash
   cardity_drc20 compile <file>
   ```

3. **查看生成的铭文**
   ```bash
   cardity_drc20 deploy <file> --output -
   ```

## 📚 相关资源

- [Cardity 语言规范](../language_spec.md)
- [开发指南](../development_guide.md)
- [包管理指南](../package_management.md)
- [部署指南](../README_DEPLOYMENT.md)

## 🤝 贡献

欢迎为 Cardity DRC-20 标准贡献代码和文档！

1. Fork 项目
2. 创建功能分支
3. 提交更改
4. 推送到分支
5. 创建 Pull Request

---

**注意**：本指南基于 Cardity Core 的最新版本。如有问题，请查看项目文档或提交 Issue。 