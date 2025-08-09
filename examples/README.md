# Cardity 示例项目

本目录包含了 Cardity 编程语言的各种示例项目，展示了从基础到高级的功能特性。

## 📁 示例文件列表

### 基础示例

#### 01_hello_world.car
最简单的 Hello World 示例，展示基本的协议结构：
- 协议定义和元数据
- 状态变量
- 事件定义和发射
- 基本方法实现

**使用方法：**
```bash
# 编译协议
cardityc examples/01_hello_world.car -o hello_world.carc

# 运行协议
cardity_runtime examples/01_hello_world.car get_message
cardity_runtime examples/01_hello_world.car set_message "Hello, Cardinals!"
cardity_runtime examples/01_hello_world.car increment
```

#### 02_counter.car
计数器协议，展示状态管理和事件系统：
- 状态变量操作
- 条件逻辑
- 事件发射
- 方法参数和返回值

**使用方法：**
```bash
# 编译和运行
cardityc examples/02_counter.car -o counter.carc
cardity_runtime examples/02_counter.car increment
cardity_runtime examples/02_counter.car get_count
cardity_runtime examples/02_counter.car set_name "My Counter"
```

### 金融应用示例

#### 03_wallet.car
基础钱包协议，展示金融应用开发：
- 余额管理
- 交易记录
- 安全锁定机制
- 每日限额控制

**使用方法：**
```bash
# 编译和测试
cardityc examples/03_wallet.car -o wallet.carc
cardity_runtime examples/03_wallet.car deposit 1000
cardity_runtime examples/03_wallet.car withdraw 500
cardity_runtime examples/03_wallet.car get_balance
```

#### 04_drc20_token.car
完整的 DRC-20 代币实现：
- DRC-20 标准支持
- 代币部署
- 铸造和转账
- 持有人统计
- 完整的事件系统

**使用方法：**
```bash
# 编译代币
cardityc examples/04_drc20_token.car -o drc20_token.carc

# 部署代币
cardity_drc20 deploy examples/04_drc20_token.car

# 铸造代币
cardity_drc20 mint MYT 1000

# 转账代币
cardity_drc20 transfer MYT 100 doge1abc123def456
```

### 高级功能示例

#### 05_event_demo.car
事件系统演示，展示复杂的事件处理：
- 多种事件类型
- 事件参数
- 系统事件
- 错误处理事件

**使用方法：**
```bash
# 编译和运行
cardityc examples/05_event_demo.car -o event_demo.carc
cardity_runtime examples/05_event_demo.car register_user "user123" "John Doe"
cardity_runtime examples/05_event_demo.car user_login "user123"
cardity_runtime examples/05_event_demo.car get_stats
```

#### 06_conditional_logic.car
条件逻辑和控制结构示例：
- 复杂条件判断
- 状态管理
- 权限控制
- 升级系统

**使用方法：**
```bash
# 编译和测试
cardityc examples/06_conditional_logic.car -o conditional_logic.carc
cardity_runtime examples/06_conditional_logic.car add_score 50
cardity_runtime examples/06_conditional_logic.car attempt_action "easy"
cardity_runtime examples/06_conditional_logic.car get_stats
```

#### 07_advanced_wallet.car
高级钱包功能，展示复杂应用开发：
- 多级安全系统
- 备份地址管理
- 智能限额控制
- 详细的事件记录

**使用方法：**
```bash
# 编译和测试
cardityc examples/07_advanced_wallet.car -o advanced_wallet.carc
cardity_runtime examples/07_advanced_wallet.car deposit 1000 "doge1sender123"
cardity_runtime examples/07_advanced_wallet.car upgrade_security_level
cardity_runtime examples/07_advanced_wallet.car add_backup_address "doge1backup123"
cardity_runtime examples/07_advanced_wallet.car get_wallet_stats
```

## 🚀 快速开始

### 1. 环境准备
确保已安装 Cardity 开发环境：
```bash
npm install -g cardity
```

### 2. 编译示例
```bash
# 编译所有示例
for file in examples/*.car; do
  cardityc "$file" -o "${file%.car}.carc"
done
```

### 3. 运行示例
```bash
# 运行 Hello World 示例
cardity_runtime examples/01_hello_world.car get_message

# 运行计数器示例
cardity_runtime examples/02_counter.car increment
cardity_runtime examples/02_counter.car get_count
```

### 4. 生成 ABI
```bash
# 为示例生成 ABI
cardity_abi examples/01_hello_world.car hello_world.abi
cardity_abi examples/04_drc20_token.car drc20_token.abi
```

## 📋 示例特性对比

| 示例 | 复杂度 | 主要特性 | 适用场景 |
|------|--------|----------|----------|
| 01_hello_world.car | ⭐ | 基础语法 | 学习入门 |
| 02_counter.car | ⭐⭐ | 状态管理 | 基础应用 |
| 03_wallet.car | ⭐⭐⭐ | 金融逻辑 | 钱包应用 |
| 04_drc20_token.car | ⭐⭐⭐⭐ | DRC-20标准 | 代币开发 |
| 05_event_demo.car | ⭐⭐⭐ | 事件系统 | 复杂应用 |
| 06_conditional_logic.car | ⭐⭐⭐ | 控制结构 | 游戏应用 |
| 07_advanced_wallet.car | ⭐⭐⭐⭐⭐ | 高级功能 | 企业应用 |

## 🔧 开发工具

### 编译器命令
```bash
# 编译为 .carc 二进制格式
cardityc protocol.car --format carc

# 编译为 JSON 格式
cardityc protocol.car --format json

# 验证协议语法
cardityc protocol.car --validate
```

### 运行时命令
```bash
# 运行协议方法
cardity_runtime protocol.car method_name [params...]

# 查看协议信息
cardity_runtime protocol.car --info
```

### ABI 生成
```bash
# 生成 ABI 文件
cardity_abi protocol.car protocol.abi

# 查看 ABI 内容
cardity_abi protocol.car --pretty
```

## 📚 学习路径

### 初学者路径
1. **01_hello_world.car** - 了解基本语法
2. **02_counter.car** - 学习状态管理
3. **03_wallet.car** - 掌握金融逻辑

### 进阶路径
1. **05_event_demo.car** - 深入事件系统
2. **06_conditional_logic.car** - 掌握控制结构
3. **04_drc20_token.car** - 学习代币标准

### 高级路径
1. **07_advanced_wallet.car** - 复杂应用开发
2. 自定义协议开发
3. 生产环境部署

## 🛠️ 自定义开发

### 创建新示例
```bash
# 创建新的协议文件
touch examples/my_protocol.car

# 编写协议代码
# 参考现有示例的语法结构

# 编译和测试
cardityc examples/my_protocol.car -o my_protocol.carc
cardity_runtime examples/my_protocol.car test_method
```

### 最佳实践
1. **命名规范** - 使用描述性的协议和方法名
2. **事件设计** - 为重要操作定义事件
3. **错误处理** - 添加适当的验证和错误消息
4. **文档注释** - 为复杂逻辑添加注释
5. **测试覆盖** - 为所有方法编写测试用例

## 📖 相关文档

- [语言规范](../docs/language_spec.md)
- [开发指南](../docs/development_guide.md)
- [DRC-20 指南](../docs/drc20_guide.md)
- [包管理指南](../docs/package_management.md)

## 🤝 贡献

欢迎提交新的示例或改进现有示例！

1. Fork 项目
2. 创建新示例或改进现有示例
3. 确保示例可以正常编译和运行
4. 提交 Pull Request

---

**Cardity 示例项目** - 从入门到精通的完整学习路径 🚀
