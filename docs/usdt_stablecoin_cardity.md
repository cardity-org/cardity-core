## 用 Cardity 在 Bitcoin/Dogecoin 上实现 USDT-like 稳定币（工程师视角）

本文面向工程师，手把手实现一个去掉 allowance/transferFrom 的 UTXO 友好型 USDT-like 稳定币协议，适配 dogeuni-indexer 索引，并给出前端 SDK 自动化产出方案。

### 为什么选择 Cardity + UTXO

- 安全模型：UTXO 单次消费、单签控制，天然避免授权型攻击（approve/allowance 竞态与钓鱼）。
- 设计简洁：移除 allowance/transferFrom，改用 freeze/unfreeze、max_tx_amount、pause/unpause 构建强风控。
- 上链即索引：与 dogeuni-indexer 的铭文 JSON 约定对齐（p:"cardity"），部署/调用一体化。

### 协议能力目标

- 核心：total_supply、balances[address]
- 治理：owner、pause/unpause、freeze/unfreeze
- 政策：issue（增发）、max_supply、max_tx_amount（单笔上限）
- 费用：basis_points_rate（BP）与 maximum_fee（上限）
- 失败场景返回标准错误码："InvalidAmount" | "Paused" | "ExceedsLimit" | "SenderFrozen" | "RecipientFrozen" | "Insufficient" | "ExceedsMaxSupply"
- 事件：Issue、Transfer

### 代码示例

完整示例见 `examples/08_usdt_like.car`，片段如下：

```cardity
protocol USDTLikeToken {
  version: "1.0.0";
  owner: "doge1owner...";

  state {
    name: string = "Tether USD";
    symbol: string = "USDT";
    decimals: int = 6;
    total_supply: int = 0;
    max_supply: int = 1000000000;
    owner_addr: address = "doge1owner...";
    balances_placeholder: string = "";
    paused: bool = false;
    basis_points_rate: int = 0;
    maximum_fee: int = 0;
    _fee: int = 0;
    _send: int = 0;
    max_tx_amount: int = 500000;
    frozen_placeholder: string = "";
    _result: string = "ok";
  }

  method set_fee_policy(bps, cap) { state.basis_points_rate = params.bps; state.maximum_fee = params.cap }
  returns: string "ok";

  method issue(amount) {
    state._result = "ok";
    if (params.amount <= 0) { state._result = "InvalidAmount" }
    if (state.total_supply + params.amount > state.max_supply) { state._result = "ExceedsMaxSupply" }
    if (state._result == "ok") { state.total_supply = state.total_supply + params.amount }
    if (state._result == "ok") { state.balances[state.owner_addr] = state.balances[state.owner_addr] + params.amount }
    if (state._result == "ok") { emit Issue(state.owner_addr, params.amount, state.total_supply) }
  }
  returns: string state._result;

  method transfer(to, amount) {
    state._result = "ok";
    if (params.amount <= 0) { state._result = "InvalidAmount" }
    if (state.paused == "true") { state._result = "Paused" }
    if (params.amount > state.max_tx_amount) { state._result = "ExceedsLimit" }
    if (state.frozen[ctx.sender] == "true") { state._result = "SenderFrozen" }
    if (state.frozen[params.to] == "true") { state._result = "RecipientFrozen" }
    if (state.balances[ctx.sender] < params.amount) { state._result = "Insufficient" }

    if (state._result == "ok") { state._fee = params.amount }
    if (state._result == "ok") { state._fee = state._fee * state.basis_points_rate }
    if (state._result == "ok") { state._fee = state._fee / 10000 }
    if (state._result == "ok") { if (state._fee > state.maximum_fee) { state._fee = state.maximum_fee } }
    if (state._result == "ok") { state._send = params.amount - state._fee }
    if (state._result == "ok") { state.balances[ctx.sender] = state.balances[ctx.sender] - params.amount }
    if (state._result == "ok") { state.balances[params.to] = state.balances[params.to] + state._send }
    if (state._result == "ok") { state.balances[state.owner_addr] = state.balances[state.owner_addr] + state._fee }
    if (state._result == "ok") { emit Transfer(ctx.sender, params.to, state._send, state._fee) }
  }
  returns: string state._result;
}
```

要点：

- 显式返回：`returns: <type> <expr>;`，利于前端直接接收错误码或结果值。
- 上下文：`ctx.sender/ctx.txid/ctx.data_length` 可用于风控与审计。
- 状态 map：`state.balances[addr]` 等映射访问，运行时以扁平键落盘。

### 编译与运行

```bash
npm run build
./build/cardityc examples/08_usdt_like.car --format carc -o /tmp/usdt.carc
# 编译器会输出 ABI 路径：🧾 ABI saved to: /tmp/usdt.abi.json
```

### 与 dogeuni-indexer 的铭文对接

- 部署（deploy）：
  - `p:"cardity"`, `op:"deploy"`, `protocol`, `version`, `abi`（字符串或对象均可）, `carc_b64`
- 调用（invoke）：
  - `p:"cardity"`, `op:"invoke"`, `contract_id` 或 `contract_ref`, `method`, `args`

CLI 也支持快捷生成 `invoke`：

```bash
node bin/cardity.js invoke <contract_id_or_txhash> transfer --args '["doge1recipient...", 5000]'
```

### 前端 SDK 自动化

构建后使用 `cardity_sdk` 从 ABI 生成 TS 客户端代码：

```bash
node bin/cardity_sdk.js /tmp/usdt.abi.json /tmp/usdt.sdk.ts
```

使用示例：

```ts
// import { USDTLikeTokenClient } from '/tmp/usdt.sdk.ts'
const c = new USDTLikeTokenClient('your-contract-id')
const p1 = c.set_fee_policy(30, 1000)        // 0.3% 手续费，上限 1000
const p2 = c.issue(1_000_000)                // 增发到 owner
const p3 = c.transfer('doge1recipient...', 5000)
const p4 = c.balance_of('doge1recipient...')
// 将上述 payload 交给你的上链/铭文提交服务
```

类型映射：int→number，bool→boolean，其余（string/address）→string。类名为 `<protocol>Client`，如 `USDTLikeTokenClient`。

### 端到端演示（issue→transfer→balance_of）

1) 设置费率与上限：`set_fee_policy(bps, cap)`
2) 增发：`issue(amount)`
3) 转账：`transfer(to, amount)`（自动计算手续费，归 owner）
4) 查询余额：`balance_of(user)`

### 最佳实践与注意事项

- 错误码统一：前端/后端共享错误码枚举，精确提示。
- 复杂逻辑分步：避免复杂表达式，提升可读性与执行稳定性。
- 索引兼容：严格遵循 README 的“索引约定”，确保 indexer 正确解析。

—— 完 ——


