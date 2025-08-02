# Cardity 语言规范

Cardity 是一个专为 Cardinals 协议开发设计的现代编程语言，语法类似 TypeScript，提供类型安全、模块化开发和丰富的生态系统。

## 🎯 语言设计理念

### 设计原则

1. **类型安全** - 静态类型检查，编译时错误检测
2. **模块化** - 支持包管理和依赖导入
3. **简洁性** - 类似 TypeScript 的语法，易于学习
4. **可扩展性** - 支持自定义类型和操作符
5. **安全性** - 内置安全检查和最佳实践

### 语言特性

- **静态类型系统** - 编译时类型检查
- **模块系统** - ES6 风格的导入导出
- **接口和类型** - 类似 TypeScript 的类型定义
- **泛型支持** - 可重用的类型安全代码
- **装饰器** - 元编程和代码生成
- **异步编程** - async/await 支持

## 📝 语法规范

### 1. 基本语法

#### 变量声明

```cardity
// 类型推断
let message = "Hello, Cardity!";
let count = 42;
let active = true;

// 显式类型声明
let name: string = "Cardity";
let age: number = 25;
let isStudent: boolean = true;

// 常量声明
const PI: number = 3.14159;
const VERSION: string = "1.0.0";

// 数组类型
let numbers: number[] = [1, 2, 3, 4, 5];
let names: Array<string> = ["Alice", "Bob", "Charlie"];

// 元组类型
let tuple: [string, number] = ["age", 25];
let coordinates: [number, number, number] = [10, 20, 30];
```

#### 函数定义

```cardity
// 基本函数
function greet(name: string): string {
    return `Hello, ${name}!`;
}

// 箭头函数
const add = (a: number, b: number): number => a + b;

// 可选参数
function createUser(name: string, email?: string): User {
    return { name, email: email || "" };
}

// 默认参数
function multiply(a: number, b: number = 1): number {
    return a * b;
}

// 剩余参数
function sum(...numbers: number[]): number {
    return numbers.reduce((acc, n) => acc + n, 0);
}

// 函数重载
function process(value: string): string;
function process(value: number): number;
function process(value: string | number): string | number {
    if (typeof value === "string") {
        return value.toUpperCase();
    } else {
        return value * 2;
    }
}
```

#### 控制流

```cardity
// 条件语句
if (age >= 18) {
    console.log("Adult");
} else if (age >= 13) {
    console.log("Teenager");
} else {
    console.log("Child");
}

// 三元操作符
const status = age >= 18 ? "adult" : "minor";

// switch 语句
switch (day) {
    case "monday":
        console.log("Start of week");
        break;
    case "friday":
        console.log("End of week");
        break;
    default:
        console.log("Mid week");
}

// 循环
for (let i = 0; i < 10; i++) {
    console.log(i);
}

for (const item of items) {
    console.log(item);
}

for (const [key, value] of Object.entries(obj)) {
    console.log(`${key}: ${value}`);
}

while (condition) {
    // 循环体
}

do {
    // 循环体
} while (condition);
```

### 2. 类型系统

#### 基本类型

```cardity
// 基本类型
let str: string = "Hello";
let num: number = 42;
let bool: boolean = true;
let sym: symbol = Symbol("key");
let big: bigint = 100n;

// 字面量类型
let direction: "north" | "south" | "east" | "west" = "north";
let status: 200 | 404 | 500 = 200;

// null 和 undefined
let nullable: string | null = null;
let optional: string | undefined = undefined;
```

#### 复杂类型

```cardity
// 对象类型
interface User {
    id: number;
    name: string;
    email?: string;
    readonly createdAt: Date;
}

// 类型别名
type Point = {
    x: number;
    y: number;
};

type ID = string | number;

// 联合类型
type Status = "pending" | "approved" | "rejected";

// 交叉类型
type Employee = Person & {
    employeeId: string;
    department: string;
};

// 映射类型
type Readonly<T> = {
    readonly [P in keyof T]: T[P];
};

type Partial<T> = {
    [P in keyof T]?: T[P];
};
```

#### 泛型

```cardity
// 泛型函数
function identity<T>(arg: T): T {
    return arg;
}

// 泛型接口
interface Container<T> {
    value: T;
    getValue(): T;
    setValue(value: T): void;
}

// 泛型类
class Stack<T> {
    private items: T[] = [];

    push(item: T): void {
        this.items.push(item);
    }

    pop(): T | undefined {
        return this.items.pop();
    }

    peek(): T | undefined {
        return this.items[this.items.length - 1];
    }
}

// 泛型约束
interface Lengthwise {
    length: number;
}

function logLength<T extends Lengthwise>(arg: T): T {
    console.log(arg.length);
    return arg;
}
```

### 3. 模块系统

#### 导入导出

```cardity
// 默认导出
export default class Calculator {
    add(a: number, b: number): number {
        return a + b;
    }
}

// 命名导出
export function multiply(a: number, b: number): number {
    return a * b;
}

export const PI = 3.14159;

export interface Point {
    x: number;
    y: number;
}

// 重新导出
export { Calculator as Calc } from './calculator';
export * from './utils';

// 导入
import Calculator from './calculator';
import { multiply, PI, Point } from './math';
import * as Utils from './utils';
import { Calculator as Calc } from './calculator';
```

#### 包导入

```cardity
// 导入包
import { StandardProtocol, Events } from "@cardity/standard";
import { Hash, Math } from "@cardity/utils";

// 使用包中的类型和函数
class MyProtocol extends StandardProtocol {
    constructor() {
        super();
    }
    
    calculateHash(data: string): string {
        return Hash.sha256(data);
    }
}
```

### 4. 协议开发

#### 协议定义

```cardity
// 协议装饰器
@protocol({
    version: "1.0.0",
    owner: "doge1...",
    description: "A sample protocol"
})
class MyProtocol {
    // 状态变量
    @state
    private message: string = "Hello, Cardity!";
    
    @state
    private count: number = 0;
    
    @state
    private users: Map<string, User> = new Map();
    
    // 事件定义
    @event
    MessageUpdated(oldMessage: string, newMessage: string): void {}
    
    @event
    UserRegistered(userId: string, user: User): void {}
    
    // 方法定义
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
    registerUser(userId: string, user: User): void {
        if (this.users.has(userId)) {
            throw new Error("User already exists");
        }
        
        this.users.set(userId, user);
        this.emit("UserRegistered", userId, user);
    }
    
    @method
    getUser(userId: string): User | undefined {
        return this.users.get(userId);
    }
    
    // 私有方法
    private validateUser(user: User): boolean {
        return user.name.length > 0 && user.email.includes("@");
    }
}
```

#### 接口和类型

```cardity
// 用户接口
interface User {
    id: string;
    name: string;
    email: string;
    createdAt: Date;
    isActive: boolean;
}

// 协议配置接口
interface ProtocolConfig {
    version: string;
    owner: string;
    description?: string;
    metadata?: Record<string, any>;
}

// 事件接口
interface EventHandler<T = any> {
    (data: T): void;
}

// 方法参数接口
interface MethodParams {
    [key: string]: any;
}

// 协议状态接口
interface ProtocolState {
    [key: string]: any;
}
```

### 5. 装饰器

#### 内置装饰器

```cardity
// 协议装饰器
@protocol({
    version: "1.0.0",
    owner: "doge1...",
    description: "DeFi lending protocol"
})
class LendingProtocol {
    // 状态装饰器
    @state
    private totalSupply: number = 0;
    
    @state
    private interestRate: number = 0.05;
    
    // 事件装饰器
    @event
    Deposit(userId: string, amount: number): void {}
    
    @event
    Withdraw(userId: string, amount: number): void {}
    
    // 方法装饰器
    @method
    @validate
    deposit(userId: string, amount: number): void {
        if (amount <= 0) {
            throw new Error("Amount must be positive");
        }
        
        this.totalSupply += amount;
        this.emit("Deposit", userId, amount);
    }
    
    @method
    @validate
    withdraw(userId: string, amount: number): void {
        if (amount > this.totalSupply) {
            throw new Error("Insufficient funds");
        }
        
        this.totalSupply -= amount;
        this.emit("Withdraw", userId, amount);
    }
    
    // 计算属性装饰器
    @computed
    get totalValue(): number {
        return this.totalSupply * (1 + this.interestRate);
    }
}
```

#### 自定义装饰器

```cardity
// 验证装饰器
function validate(target: any, propertyKey: string, descriptor: PropertyDescriptor) {
    const originalMethod = descriptor.value;
    
    descriptor.value = function(...args: any[]) {
        // 验证逻辑
        if (args.some(arg => arg === null || arg === undefined)) {
            throw new Error("Invalid arguments");
        }
        
        return originalMethod.apply(this, args);
    };
    
    return descriptor;
}

// 日志装饰器
function log(target: any, propertyKey: string, descriptor: PropertyDescriptor) {
    const originalMethod = descriptor.value;
    
    descriptor.value = function(...args: any[]) {
        console.log(`Calling ${propertyKey} with args:`, args);
        const result = originalMethod.apply(this, args);
        console.log(`${propertyKey} returned:`, result);
        return result;
    };
    
    return descriptor;
}

// 缓存装饰器
function cache(target: any, propertyKey: string, descriptor: PropertyDescriptor) {
    const originalMethod = descriptor.value;
    const cache = new Map();
    
    descriptor.value = function(...args: any[]) {
        const key = JSON.stringify(args);
        
        if (cache.has(key)) {
            return cache.get(key);
        }
        
        const result = originalMethod.apply(this, args);
        cache.set(key, result);
        return result;
    };
    
    return descriptor;
}
```

### 6. 异步编程

#### Promise 和 async/await

```cardity
// Promise 使用
function fetchUser(id: string): Promise<User> {
    return new Promise((resolve, reject) => {
        // 异步操作
        setTimeout(() => {
            if (id === "valid") {
                resolve({ id, name: "John", email: "john@example.com" });
            } else {
                reject(new Error("User not found"));
            }
        }, 1000);
    });
}

// async/await
async function getUserData(id: string): Promise<UserData> {
    try {
        const user = await fetchUser(id);
        const posts = await fetchUserPosts(id);
        
        return {
            user,
            posts
        };
    } catch (error) {
        console.error("Error fetching user data:", error);
        throw error;
    }
}

// 并行执行
async function fetchMultipleUsers(ids: string[]): Promise<User[]> {
    const promises = ids.map(id => fetchUser(id));
    return Promise.all(promises);
}

// 错误处理
async function safeFetch(id: string): Promise<User | null> {
    try {
        return await fetchUser(id);
    } catch (error) {
        console.error("Failed to fetch user:", error);
        return null;
    }
}
```

### 7. 错误处理

#### 异常处理

```cardity
// 自定义异常
class ProtocolError extends Error {
    constructor(
        message: string,
        public code: string,
        public details?: any
    ) {
        super(message);
        this.name = "ProtocolError";
    }
}

class ValidationError extends ProtocolError {
    constructor(message: string, field: string) {
        super(message, "VALIDATION_ERROR", { field });
        this.name = "ValidationError";
    }
}

// 异常处理
function processTransaction(amount: number): void {
    try {
        if (amount <= 0) {
            throw new ValidationError("Amount must be positive", "amount");
        }
        
        if (amount > 1000) {
            throw new ProtocolError("Amount exceeds limit", "LIMIT_EXCEEDED");
        }
        
        // 处理交易
        console.log("Transaction processed:", amount);
        
    } catch (error) {
        if (error instanceof ValidationError) {
            console.error("Validation error:", error.message);
        } else if (error instanceof ProtocolError) {
            console.error("Protocol error:", error.code);
        } else {
            console.error("Unknown error:", error);
        }
        throw error;
    }
}
```

### 8. 工具类型

#### 内置工具类型

```cardity
// 部分类型
type PartialUser = Partial<User>;

// 必需类型
type RequiredUser = Required<User>;

// 只读类型
type ReadonlyUser = Readonly<User>;

// 选择类型
type UserName = Pick<User, "name">;

// 排除类型
type UserWithoutId = Omit<User, "id">;

// 条件类型
type NonNullable<T> = T extends null | undefined ? never : T;

// 映射类型
type Getters<T> = {
    [K in keyof T as `get${Capitalize<string & K>}`]: () => T[K];
};

// 模板字面量类型
type EmailLocale = "en" | "zh";
type EmailTemplate = `welcome_${EmailLocale}`;
```

## 🔧 编译和运行

### 编译选项

```json
{
  "compilerOptions": {
    "target": "cardinals",
    "module": "esnext",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "declaration": true,
    "outDir": "./dist",
    "rootDir": "./src",
    "sourceMap": true,
    "removeComments": true,
    "noImplicitAny": true,
    "strictNullChecks": true,
    "strictFunctionTypes": true,
    "noImplicitReturns": true,
    "noFallthroughCasesInSwitch": true,
    "noUncheckedIndexedAccess": true,
    "exactOptionalPropertyTypes": true
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist", "tests"]
}
```

### 运行环境

```cardity
// 运行时配置
@runtime({
    version: "1.0.0",
    features: ["events", "types", "async"],
    compatibility: ["cardinals"]
})
class MyProtocol {
    // 协议实现
}
```

## 📚 标准库

### 内置模块

```cardity
// 数学运算
import { Math } from "@cardity/std";

// 字符串处理
import { String } from "@cardity/std";

// 数组操作
import { Array } from "@cardity/std";

// 对象工具
import { Object } from "@cardity/std";

// 时间处理
import { Date, Time } from "@cardity/std";

// 加密哈希
import { Hash } from "@cardity/crypto";

// 网络请求
import { fetch, Request, Response } from "@cardity/net";

// 文件系统
import { File, Path } from "@cardity/fs";
```

### 协议开发库

```cardity
// 标准协议
import { StandardProtocol, Events, Methods } from "@cardity/protocol";

// 安全工具
import { Security, Validation } from "@cardity/security";

// 测试框架
import { Test, Assert } from "@cardity/test";

// 部署工具
import { Deploy, Network } from "@cardity/deploy";
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
│   │   ├── events.cardity
│   │   └── methods.cardity
│   └── trading/
│       ├── index.cardity
│       └── types.cardity
├── utils/
│   ├── math.cardity
│   ├── validation.cardity
│   └── helpers.cardity
├── types/
│   ├── common.cardity
│   └── api.cardity
└── main.cardity
```

### 命名约定

```cardity
// 类名：PascalCase
class LendingProtocol {}

// 接口名：PascalCase
interface UserProfile {}

// 类型别名：PascalCase
type TransactionStatus = "pending" | "completed" | "failed";

// 变量名：camelCase
let userName = "John";
let totalAmount = 1000;

// 常量名：UPPER_SNAKE_CASE
const MAX_RETRY_COUNT = 3;
const DEFAULT_TIMEOUT = 5000;

// 方法名：camelCase
function calculateInterest() {}
function validateInput() {}

// 私有成员：下划线前缀
private _internalState: string;
private _validateUser() {}
```

### 错误处理

```cardity
// 使用 Result 类型
type Result<T, E = Error> = Success<T> | Failure<E>;

class Success<T> {
    constructor(public value: T) {}
    isSuccess(): this is Success<T> { return true; }
    isFailure(): this is Failure<any> { return false; }
}

class Failure<E> {
    constructor(public error: E) {}
    isSuccess(): this is Success<any> { return false; }
    isFailure(): this is Failure<E> { return true; }
}

// 使用示例
function divide(a: number, b: number): Result<number, string> {
    if (b === 0) {
        return new Failure("Division by zero");
    }
    return new Success(a / b);
}
```

### 性能优化

```cardity
// 使用缓存
@cache
function expensiveCalculation(input: number): number {
    // 复杂计算
    return input * input * input;
}

// 懒加载
class LazyLoader<T> {
    private _value?: T;
    private _factory: () => T;
    
    constructor(factory: () => T) {
        this._factory = factory;
    }
    
    get value(): T {
        if (!this._value) {
            this._value = this._factory();
        }
        return this._value;
    }
}

// 内存管理
class ResourceManager {
    private resources = new Set<Resource>();
    
    add(resource: Resource): void {
        this.resources.add(resource);
    }
    
    cleanup(): void {
        for (const resource of this.resources) {
            resource.dispose();
        }
        this.resources.clear();
    }
}
```

## 🚀 未来特性

### 计划中的功能

1. **高级类型系统**
   - 条件类型
   - 映射类型
   - 模板字面量类型

2. **元编程**
   - 装饰器元数据
   - 反射 API
   - 代码生成

3. **并发编程**
   - Worker 线程
   - 共享内存
   - 原子操作

4. **WebAssembly 支持**
   - 编译到 WASM
   - 浏览器运行
   - 性能优化

5. **包生态系统**
   - 包管理器
   - 版本控制
   - 依赖解析

Cardity 语言将继续发展，为 Cardinals 协议开发提供最现代、最强大的编程体验。 