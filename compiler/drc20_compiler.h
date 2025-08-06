#ifndef CARDITY_DRC20_COMPILER_H
#define CARDITY_DRC20_COMPILER_H

#include "drc20_standard.h"
#include "drc20_parser.h"
#include "car_generator.h"
#include <string>

namespace cardity {

// DRC-20 编译器类
class Drc20Compiler {
public:
    // 编译 DRC-20 代币定义
    static json compile_drc20_protocol(const std::string& source);
    
    // 生成 DRC-20 部署脚本
    static std::string generate_deploy_inscription(const json& token_definition);
    
    // 生成 DRC-20 铸造脚本
    static std::string generate_mint_inscription(const std::string& tick, const std::string& amount);
    
    // 生成 DRC-20 转账脚本
    static std::string generate_transfer_inscription(const std::string& tick, const std::string& amount, const std::string& to_address);
    
    // 验证 DRC-20 代币定义
    static bool validate_drc20_definition(const json& token_definition);
    
    // 生成完整的 DRC-20 协议
    static json generate_drc20_protocol(const json& token_definition, const json& custom_logic);
    
private:
    // 内部编译方法
    static json compile_drc20_structure(const json& token_definition);
    static json compile_custom_logic(const json& token_definition);
    static json generate_standard_drc20_methods(const json& token_definition);
    static json generate_custom_drc20_methods(const json& token_definition);
    
    // 验证方法
    static bool validate_tick_format(const std::string& tick);
    static bool validate_supply_format(const std::string& supply);
    static bool validate_address_format(const std::string& address);
};

// DRC-20 代码生成器
class Drc20CodeGenerator {
public:
    // 生成 DRC-20 标准方法
    static std::string generate_deploy_method(const json& token_definition);
    static std::string generate_mint_method(const json& token_definition);
    static std::string generate_transfer_method(const json& token_definition);
    
    // 生成 DRC-20 查询方法
    static std::string generate_query_methods(const json& token_definition);
    
    // 生成 DRC-20 事件定义
    static std::string generate_drc20_events();
    
    // 生成 DRC-20 验证逻辑
    static std::string generate_validation_logic(const json& token_definition);
    
private:
    // 内部生成方法
    static std::string generate_tick_validation(const std::string& tick);
    static std::string generate_supply_validation(const std::string& max_supply);
    static std::string generate_amount_validation(const std::string& amount);
    static std::string generate_address_validation(const std::string& address);
};

// DRC-20 模板生成器
class Drc20TemplateGenerator {
public:
    // 生成基础 DRC-20 模板
    static std::string generate_basic_template(const std::string& tick, const std::string& name);
    
    // 生成高级 DRC-20 模板
    static std::string generate_advanced_template(const std::string& tick, const std::string& name, const std::string& max_supply);
    
    // 生成自定义 DRC-20 模板
    static std::string generate_custom_template(const json& token_definition);
    
private:
    // 模板内容
    static const std::string basic_template_content;
    static const std::string advanced_template_content;
    static const std::string custom_template_content;
};

} // namespace cardity

#endif // CARDITY_DRC20_COMPILER_H 