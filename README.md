# Cardity Core

Cardity 语言核心实现：编译器、运行时、打包与上链工具，面向 Dogecoin/Cardinals 协议。

## 核心能力
- 编译 `.car` → `.carc` 或 JSON
- 运行时本地执行（支持 `ctx.sender/txid`、状态持久化）
- 多模块打包（deploy_package）与分片（deploy_part，≤50KB/笔）
- 仅上链 Hex 工作流（不上链 ABI）
- SDK 生成器（前端按 ABI 生成 TS 封装）

## 安装与构建
```bash
npm install
npm run build
```

## 常用命令
- 编译：
  ```bash
  ./build/cardityc path/to/protocol.car --format carc -o /tmp/protocol.carc
  ./build/cardityc path/to/protocol.car --format json -o /tmp/protocol.json
  ```
- 运行（JSON 协议）：
  ```bash
  ./build/cardity_runtime /tmp/protocol.json <method> [args...] --state /tmp/state.json --sender D...
  ```
- 生成调用铭文（JSON）：
  ```bash
  node bin/cardity.js invoke <contract_id> <method> --args '[...]' [--module Name]
  ```
- 仅上链 Hex：
  ```bash
  # 部署：.carc → hex
  node bin/cardity.js ophex /tmp/protocol.carc > /tmp/protocol.carc.hex
  # 调用：{method,args} → hex（支持 Module.method）
  node bin/cardity.js encode-invoke USDTLikeToken.transfer --args '["D...",5000]' > /tmp/invoke.hex
  ```
- 多模块打包：
  ```bash
  node bin/cardity_package.js <package_dir> /tmp/pkg.inscription.json
  ```
- 分片（Dogecoin 单笔 ≤50KB）：
  ```bash
  node bin/cardity_split_parts.js /tmp/protocol.carc MyBundle MyModule --version 1.0.0 -o /tmp/parts
  ```
- SDK 生成：
  ```bash
  node bin/cardity_sdk.js /tmp/protocol.abi.json /tmp/protocol.sdk.ts
  ```

## 与 dogeuni-indexer 对齐
- 通用：`p: "cardity"`
- 部署（deploy）：`op: "deploy"`, `protocol`, `version`, `abi`(对象/字符串), `carc_b64`
- 调用（invoke）：`op: "invoke"`, `contract_id` 或 `contract_ref`, `method` 或 `Module.method`, `args` 数组
- 包部署（deploy_package）：`package_id`, `version`, `abi`(包级), `modules[{name, abi, carc_b64}]`
- 分片（deploy_part）：`bundle_id`, `idx`, `total`, `package_id`, `version`, `module`, `carc_b64`

## 工作流速览
- 部署（仅 hex 上链）：
  ```bash
  ./build/cardityc examples/08_usdt_like.car --format carc -o /tmp/usdt.carc
  node bin/cardity.js ophex /tmp/usdt.carc > /tmp/usdt.carc.hex
  # 将 /tmp/usdt.carc.hex 放入 OP_RETURN/铭文
  ```
- 调用（仅 hex 上链）：
  ```bash
  node bin/cardity.js encode-invoke USDTLikeToken.transfer --args '["D...",5000]' > /tmp/invoke.hex
  # 将 /tmp/invoke.hex 放入 OP_RETURN/铭文
  ```
- 包/模块：
  ```bash
  node bin/cardity_package.js examples/usdt_package /tmp/usdt_package.inscription.json
  # 或按 50KB 分片：node bin/cardity_split_parts.js /tmp/usdt.carc USDTBundle USDTLikeToken --version 1.0.0 -o /tmp/parts
  ```

## 安全与提交
- `.gitignore` 已默认排除 `.env`、密钥/证书、钱包及生成产物（hex/abi/inscription）。

## 许可证
MIT License
