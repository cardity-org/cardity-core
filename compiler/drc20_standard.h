#ifndef CARDITY_DRC20_STANDARD_H
#define CARDITY_DRC20_STANDARD_H

#include <string>
#include <vector>
#include <unordered_map>
#include <nlohmann/json.hpp>

namespace cardity {

using json = nlohmann::json;

// DRC-20 代币标准结构
struct Drc20Token {
    std::string tick;           // 代币符号 (3-4 字符)
    std::string name;           // 代币名称
    std::string max_supply;     // 最大供应量
    std::string mint_limit;     // 每次铸造限制
    std::string decimals;       // 小数位数
    std::string deployer;       // 部署者地址
    std::string deploy_time;    // 部署时间
    bool is_deployed;           // 是否已部署
};

// DRC-20 操作类型
enum class Drc20Operation {
    DEPLOY,
    MINT,
    TRANSFER
};

// DRC-20 操作数据
struct Drc20OperationData {
    Drc20Operation operation;
    std::string tick;
    std::string amount;
    std::string from_address;
    std::string to_address;
    json custom_data;  // 用户自定义数据
};

// DRC-20 标准库类
class Drc20Standard {
public:
    // 验证 DRC-20 代币参数
    static bool validate_deploy_params(const json& params);
    static bool validate_mint_params(const json& params);
    static bool validate_transfer_params(const json& params);
    
    // 生成 DRC-20 操作数据
    static json generate_deploy_inscription(const Drc20Token& token);
    static json generate_mint_inscription(const std::string& tick, const std::string& amount);
    static json generate_transfer_inscription(const std::string& tick, const std::string& amount, const std::string& to_address);
    
    // 解析 DRC-20 操作
    static Drc20OperationData parse_operation(const json& inscription_data);
    
    // 验证代币符号
    static bool validate_tick(const std::string& tick);
    
    // 验证数量格式
    static bool validate_amount(const std::string& amount);
    
    // 验证地址格式
    static bool validate_address(const std::string& address);
    
    // 生成标准化的操作数据
    static json create_drc20_operation(Drc20Operation op, const json& params);
    
private:
    // 内部验证方法
    static bool is_valid_tick_length(const std::string& tick);
    static bool is_valid_tick_chars(const std::string& tick);
    static bool is_valid_number(const std::string& num);
    static bool is_valid_address(const std::string& address);
};

// DRC-20 编译器扩展
class Drc20TokenCompiler {
public:
    // 编译 DRC-20 代币定义
    static json compile_drc20_token(const json& token_definition);
    
    // 生成部署脚本
    static std::string generate_deploy_script(const Drc20Token& token);
    
    // 生成铸造脚本
    static std::string generate_mint_script(const std::string& tick, const std::string& amount);
    
    // 生成转账脚本
    static std::string generate_transfer_script(const std::string& tick, const std::string& amount, const std::string& to_address);
    
    // 验证用户自定义逻辑
    static bool validate_custom_logic(const json& logic);
    
private:
    // 内部编译方法
    static json compile_deploy_logic(const json& deploy_logic);
    static json compile_mint_logic(const json& mint_logic);
    static json compile_transfer_logic(const json& transfer_logic);
};

} // namespace cardity

#endif // CARDITY_DRC20_STANDARD_H 