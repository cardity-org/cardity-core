#include "drc20_standard.h"
#include <regex>
#include <chrono>
#include <iomanip>
#include <sstream>

namespace cardity {

// Drc20Standard 实现

bool Drc20Standard::validate_deploy_params(const json& params) {
    if (!params.contains("tick") || !params.contains("max_supply")) {
        return false;
    }
    
    std::string tick = params["tick"];
    std::string max_supply = params["max_supply"];
    
    return validate_tick(tick) && validate_amount(max_supply);
}

bool Drc20Standard::validate_mint_params(const json& params) {
    if (!params.contains("tick") || !params.contains("amount")) {
        return false;
    }
    
    std::string tick = params["tick"];
    std::string amount = params["amount"];
    
    return validate_tick(tick) && validate_amount(amount);
}

bool Drc20Standard::validate_transfer_params(const json& params) {
    if (!params.contains("tick") || !params.contains("amount") || !params.contains("to_address")) {
        return false;
    }
    
    std::string tick = params["tick"];
    std::string amount = params["amount"];
    std::string to_address = params["to_address"];
    
    return validate_tick(tick) && validate_amount(amount) && is_valid_address(to_address);
}

json Drc20Standard::generate_deploy_inscription(const Drc20Token& token) {
    json inscription;
    inscription["p"] = "drc-20";
    inscription["op"] = "deploy";
    inscription["tick"] = token.tick;
    inscription["max"] = token.max_supply;
    
    if (!token.mint_limit.empty()) {
        inscription["lim"] = token.mint_limit;
    }
    
    if (!token.decimals.empty()) {
        inscription["dec"] = token.decimals;
    }
    
    return inscription;
}

json Drc20Standard::generate_mint_inscription(const std::string& tick, const std::string& amount) {
    json inscription;
    inscription["p"] = "drc-20";
    inscription["op"] = "mint";
    inscription["tick"] = tick;
    inscription["amt"] = amount;
    
    return inscription;
}

json Drc20Standard::generate_transfer_inscription(const std::string& tick, const std::string& amount, const std::string& to_address) {
    json inscription;
    inscription["p"] = "drc-20";
    inscription["op"] = "transfer";
    inscription["tick"] = tick;
    inscription["amt"] = amount;
    inscription["to"] = to_address;
    
    return inscription;
}

Drc20OperationData Drc20Standard::parse_operation(const json& inscription_data) {
    Drc20OperationData data;
    
    if (inscription_data.contains("op")) {
        std::string op = inscription_data["op"];
        if (op == "deploy") {
            data.operation = Drc20Operation::DEPLOY;
        } else if (op == "mint") {
            data.operation = Drc20Operation::MINT;
        } else if (op == "transfer") {
            data.operation = Drc20Operation::TRANSFER;
        }
    }
    
    if (inscription_data.contains("tick")) {
        data.tick = inscription_data["tick"];
    }
    
    if (inscription_data.contains("amt")) {
        data.amount = inscription_data["amt"];
    }
    
    if (inscription_data.contains("to")) {
        data.to_address = inscription_data["to"];
    }
    
    // 保存自定义数据
    data.custom_data = inscription_data;
    
    return data;
}

bool Drc20Standard::validate_tick(const std::string& tick) {
    return is_valid_tick_length(tick) && is_valid_tick_chars(tick);
}

bool Drc20Standard::validate_amount(const std::string& amount) {
    return is_valid_number(amount);
}

bool Drc20Standard::validate_address(const std::string& address) {
    return is_valid_address(address);
}

json Drc20Standard::create_drc20_operation(Drc20Operation op, const json& params) {
    json operation;
    operation["p"] = "drc-20";
    
    switch (op) {
        case Drc20Operation::DEPLOY:
            operation["op"] = "deploy";
            operation["tick"] = params["tick"];
            operation["max"] = params["max_supply"];
            if (params.contains("mint_limit")) {
                operation["lim"] = params["mint_limit"];
            }
            if (params.contains("decimals")) {
                operation["dec"] = params["decimals"];
            }
            break;
            
        case Drc20Operation::MINT:
            operation["op"] = "mint";
            operation["tick"] = params["tick"];
            operation["amt"] = params["amount"];
            break;
            
        case Drc20Operation::TRANSFER:
            operation["op"] = "transfer";
            operation["tick"] = params["tick"];
            operation["amt"] = params["amount"];
            operation["to"] = params["to_address"];
            break;
    }
    
    return operation;
}

// 私有验证方法实现

bool Drc20Standard::is_valid_tick_length(const std::string& tick) {
    return tick.length() >= 2 && tick.length() <= 8;
}

bool Drc20Standard::is_valid_tick_chars(const std::string& tick) {
    std::regex tick_regex("^[A-Za-z0-9]+$");
    return std::regex_match(tick, tick_regex);
}

bool Drc20Standard::is_valid_number(const std::string& num) {
    std::regex number_regex("^[0-9]+$");
    return std::regex_match(num, number_regex);
}

bool Drc20Standard::is_valid_address(const std::string& address) {
    // 简单的 Dogecoin 地址验证
    return address.length() >= 26 && address.length() <= 35 && 
           (address[0] == 'D' || address[0] == 'A' || address[0] == 'd');
}

// Drc20Compiler 实现

json Drc20TokenCompiler::compile_drc20_token(const json& token_definition) {
    json compiled_token;
    
    // 验证必需字段
    if (!token_definition.contains("tick") || !token_definition.contains("max_supply")) {
        throw std::runtime_error("Missing required fields: tick and max_supply");
    }
    
    // 验证参数
    if (!Drc20Standard::validate_deploy_params(token_definition)) {
        throw std::runtime_error("Invalid DRC-20 token parameters");
    }
    
    // 编译代币定义
    compiled_token["tick"] = token_definition["tick"];
    compiled_token["max_supply"] = token_definition["max_supply"];
    
    if (token_definition.contains("mint_limit")) {
        compiled_token["mint_limit"] = token_definition["mint_limit"];
    }
    
    if (token_definition.contains("decimals")) {
        compiled_token["decimals"] = token_definition["decimals"];
    }
    
    // 添加时间戳
    auto now = std::chrono::system_clock::now();
    auto time_t = std::chrono::system_clock::to_time_t(now);
    std::stringstream ss;
    ss << std::put_time(std::gmtime(&time_t), "%Y-%m-%dT%H:%M:%SZ");
    compiled_token["deploy_time"] = ss.str();
    
    return compiled_token;
}

std::string Drc20TokenCompiler::generate_deploy_script(const Drc20Token& token) {
    json inscription = Drc20Standard::generate_deploy_inscription(token);
    return inscription.dump();
}

std::string Drc20TokenCompiler::generate_mint_script(const std::string& tick, const std::string& amount) {
    json inscription = Drc20Standard::generate_mint_inscription(tick, amount);
    return inscription.dump();
}

std::string Drc20TokenCompiler::generate_transfer_script(const std::string& tick, const std::string& amount, const std::string& to_address) {
    json inscription = Drc20Standard::generate_transfer_inscription(tick, amount, to_address);
    return inscription.dump();
}

bool Drc20TokenCompiler::validate_custom_logic(const json& logic) {
    // 验证用户自定义逻辑
    if (!logic.contains("type") || !logic.contains("params")) {
        return false;
    }
    
    std::string type = logic["type"];
    
    if (type == "deploy") {
        return Drc20Standard::validate_deploy_params(logic["params"]);
    } else if (type == "mint") {
        return Drc20Standard::validate_mint_params(logic["params"]);
    } else if (type == "transfer") {
        return Drc20Standard::validate_transfer_params(logic["params"]);
    }
    
    return false;
}

json Drc20TokenCompiler::compile_deploy_logic(const json& deploy_logic) {
    json compiled;
    compiled["operation"] = "deploy";
    compiled["inscription"] = Drc20Standard::create_drc20_operation(Drc20Operation::DEPLOY, deploy_logic);
    return compiled;
}

json Drc20TokenCompiler::compile_mint_logic(const json& mint_logic) {
    json compiled;
    compiled["operation"] = "mint";
    compiled["inscription"] = Drc20Standard::create_drc20_operation(Drc20Operation::MINT, mint_logic);
    return compiled;
}

json Drc20TokenCompiler::compile_transfer_logic(const json& transfer_logic) {
    json compiled;
    compiled["operation"] = "transfer";
    compiled["inscription"] = Drc20Standard::create_drc20_operation(Drc20Operation::TRANSFER, transfer_logic);
    return compiled;
}

} // namespace cardity 