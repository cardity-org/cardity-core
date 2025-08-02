# Cardity 编程语言

Cardity 是一个专为 Cardinals 协议开发设计的现代编程语言，语法类似 TypeScript，提供类型安全、模块化开发和丰富的生态系统。

## 🎯 语言特性

- **类型安全**: 静态类型检查，编译时错误检测
- **模块化**: ES6 风格的导入导出，支持包管理
- **简洁性**: 类似 TypeScript 的语法，易于学习
- **可扩展性**: 支持自定义类型、装饰器和泛型
- **安全性**: 内置安全检查和最佳实践
- **异步编程**: 支持 async/await 和 Promise
- **装饰器**: 元编程和代码生成支持

## 🚀 快速开始

### 安装 Cardity

```bash
# 从源码编译安装
git clone https://github.com/cardity/cardity-core.git
cd cardity-core
mkdir build && cd build
cmake ..
make
sudo make install

# 验证安装
cardity --version
```

### 创建第一个协议

```cardity
// hello.cardity
import { StandardProtocol } from "@cardity/standard";

@protocol({
    version: "1.0.0",
    owner: "doge1...",
    description: "Hello World Protocol"
})
class HelloProtocol extends StandardProtocol {
    @state
    private message: string = "Hello, Cardity!";
    
    @state
    private count: number = 0;
    
    @event
    MessageUpdated(oldMessage: string, newMessage: string): void {}
    
    @method
    setMessage(newMessage: string): void {
        const oldMessage = this.message;
        this.message = newMessage;
        this.emit("MessageUpdated", oldMessage, newMessage);
    }
    
    @method
    getMessage(): string {
        return this.message;
    }
    
    @method
    increment(): void {
        this.count++;
    }
    
    @method
    getCount(): number {
        return this.count;
    }
}

export default HelloProtocol;
```

### 编译和运行

```bash
# 编译协议
cardity build hello.cardity

# 运行协议
cardity run hello.car setMessage "Hello, World!"
cardity run hello.car getMessage
cardity run hello.car increment
```

## 📝 语言语法

### 基本语法

```cardity
// 变量声明
let message: string = "Hello, Cardity!";
let count: number = 42;
let active: boolean = true;

// 函数定义
function greet(name: string): string {
    return `Hello, ${name}!`;
}

// 箭头函数
const add = (a: number, b: number): number => a + b;

// 类定义
class Calculator {
    add(a: number, b: number): number {
        return a + b;
    }
}
```

### 类型系统

```cardity
// 接口定义
interface User {
    id: string;
    name: string;
    email: string;
    balance: number;
}

// 类型别名
type Status = "pending" | "approved" | "rejected";

// 泛型
function identity<T>(arg: T): T {
    return arg;
}

// 联合类型
type ID = string | number;
```

### 协议开发

```cardity
// 协议装饰器
@protocol({
    version: "1.0.0",
    owner: "doge1...",
    description: "DeFi Protocol"
})
class DeFiProtocol extends StandardProtocol {
    // 状态变量
    @state
    private users: Map<string, User> = new Map();
    
    // 事件定义
    @event
    UserRegistered(userId: string, user: User): void {}
    
    // 方法定义
    @method
    @validate
    registerUser(userId: string, name: string): User {
        const user: User = { id: userId, name, email: "", balance: 0 };
        this.users.set(userId, user);
        this.emit("UserRegistered", userId, user);
        return user;
    }
}
```

## 📦 包管理系统

### 安装包

```bash
# 安装标准库
cardity install @cardity/standard

# 安装工具包
cardity install @cardity/utils

# 安装测试框架
cardity install @cardity/test
```

### 使用包

```cardity
// 导入包
import { StandardProtocol, Events } from "@cardity/standard";
import { Hash, Math } from "@cardity/utils";
import { Validation } from "@cardity/security";

// 使用包中的功能
class MyProtocol extends StandardProtocol {
    @method
    calculateHash(data: string): string {
        return Hash.sha256(data);
    }
}
```

## 🔧 开发工具

### VS Code 扩展

安装 Cardity 扩展获得完整的开发体验：
- 语法高亮
- 智能提示
- 错误检查
- 代码格式化
- 调试支持

### 在线 Playground

访问 [Cardity Playground](https://playground.cardity.dev) 在线编写和测试代码。

### CLI 工具

```bash
# 初始化项目
cardity init

# 编译项目
cardity build

# 运行测试
cardity test

# 发布包
cardity publish

# 运行脚本
cardity run <script>
```

## 📚 标准库

### 核心模块

```cardity
// 标准协议
import { StandardProtocol, Events, Methods } from "@cardity/protocol";

// 工具函数
import { Hash, Math, String, Array } from "@cardity/utils";

// 安全工具
import { Security, Validation } from "@cardity/security";

// 测试框架
import { Test, Assert } from "@cardity/test";
```

### 内置类型

```cardity
// 基本类型
string, number, boolean, symbol, bigint

// 复杂类型
Array<T>, Map<K, V>, Set<T>, Promise<T>

// 工具类型
Partial<T>, Required<T>, Readonly<T>, Pick<T, K>, Omit<T, K>
```

## 🎯 最佳实践

### 代码组织

```cardity
// 文件结构
src/
├── protocols/
│   ├── lending/
│   │   ├── index.cardity
│   │   ├── types.cardity
│   │   └── methods.cardity
│   └── trading/
│       └── index.cardity
├── utils/
│   ├── math.cardity
│   └── validation.cardity
└── main.cardity
```

### 错误处理

```cardity
// 使用 Result 类型
type Result<T, E = Error> = Success<T> | Failure<E>;

function divide(a: number, b: number): Result<number, string> {
    if (b === 0) {
        return new Failure("Division by zero");
    }
    return new Success(a / b);
}
```

### 性能优化

```cardity
// 使用缓存装饰器
@cache
function expensiveCalculation(input: number): number {
    return input * input * input;
}

// 懒加载
class LazyLoader<T> {
    private _value?: T;
    
    get value(): T {
        if (!this._value) {
            this._value = this._factory();
        }
        return this._value;
    }
}
```

## 🚀 部署和运行

### 本地测试

```bash
# 编译协议
cardity build

# 运行测试
cardity test

# 本地部署
cardity deploy --local
```

### 网络部署

```bash
# 部署到测试网
cardity deploy --network testnet

# 部署到主网
cardity deploy --network mainnet
```

## 📖 示例项目

### 完整示例

查看 `examples/typescript_style/` 目录获取完整的 DeFi 借贷协议示例：

```bash
cd examples/typescript_style
cardity install
cardity build
cardity test
```

### 更多示例

- **DeFi 协议**: 借贷、交易、流动性挖矿
- **NFT 协议**: 铸造、交易、拍卖
- **DAO 协议**: 治理、投票、提案
- **游戏协议**: 角色、装备、战斗

## 🔗 生态系统

### 官方包

- `@cardity/standard` - 标准库
- `@cardity/utils` - 工具函数
- `@cardity/security` - 安全工具
- `@cardity/test` - 测试框架

### 社区包

- `@cardity/defi` - DeFi 协议模板
- `@cardity/nft` - NFT 协议模板
- `@cardity/dao` - DAO 协议模板
- `@cardity/game` - 游戏协议模板

## 🤝 贡献

### 开发指南

1. Fork 项目
2. 创建功能分支
3. 编写代码和测试
4. 提交 Pull Request

### 报告问题

- GitHub Issues: https://github.com/cardity/cardity-core/issues
- 文档问题: https://github.com/cardity/docs/issues

### 社区

- Discord: https://discord.gg/cardity
- Twitter: https://twitter.com/cardity_dev
- 博客: https://blog.cardity.dev

## 📄 许可证

MIT License - 详见 [LICENSE](LICENSE) 文件

---

**Cardity** - 为 Cardinals 协议开发而生的现代编程语言，让区块链开发更简单、更安全、更高效。 