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
- 跨模块静态检查（已集成到打包前置校验）：
  ```bash
  # 单独运行
  node bin/cardity_check_imports.js <package_dir>
  # 或打包时自动执行 --package-check，发现问题将中止
  ```
- 分片（Dogecoin 单笔 ≤50KB）：
  （不推荐自定义分片，建议使用 dogeuni-sdk 的 commit/reveal 方案，见下“铭文计划”）
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
  - 说明：不推荐自行切片。大文件推荐通过 dogeuni-sdk 的 commit/reveal 流程自动分段入脚本。

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
  # 大文件发布（推荐铭文计划）：生成计划 JSON → 直接上链（无需外部 SDK）
  node bin/cardity_inscribe_plan.js /tmp/usdt.carc <revealAddr> \
    --op deploy --protocol USDTLikeToken --version 1.0.0 > /tmp/usdt.inscribe.plan.json
  node bin/cardity_inscribe.js /tmp/usdt.inscribe.plan.json   # 需 .env RPC
  ```

## 铭文计划（推荐）
- 生成计划：
  ```bash
  node bin/cardity_inscribe_plan.js /tmp/protocol.carc <revealAddr> \
    [--op deploy|deploy_package|deploy_part] [--protocol <name>] [--package-id <id>] [--module <name>] [--version <v>] > /tmp/protocol.inscribe.plan.json
  ```
- 说明：产物结构与 dogeuni-sdk 的 FileInscriptionRequest 对齐（核心字段为 `inscriptionDataList[0].file_b64` 装载 .carc 字节；body 可写最小 envelope）。
- 直接上链：`node bin/cardity_inscribe.js /tmp/protocol.inscribe.plan.json`（读取 .env RPC，完成 fund/sign/send）。

## 安全与提交
- `.gitignore` 已默认排除 `.env`、密钥/证书、钱包及生成产物（hex/abi/inscription）。

## 类型校验（跨模块）
- 在 `.car` 中为方法参数增加类型注解（推荐）：
  - 例：`method transfer(to: address, amount: int) { ... }`
- 编译输出会包含 `param_types`；检查器与打包前置校验会使用它做基础类型匹配：
  - 支持 int/string/bool/address/map 的匹配与别名归一（number→int, boolean→bool）
  - 能对常量、`params.x`、`ctx.sender` 做轻量类型推断

## 许可证
MIT License
