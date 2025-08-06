#ifndef CARDITY_DRC20_PARSER_H
#define CARDITY_DRC20_PARSER_H

#include "parser.h"
#include "drc20_standard.h"
#include <string>
#include <vector>

namespace cardity {

// DRC-20 代币定义结构
struct Drc20TokenDefinition {
    std::string tick;
    std::string name;
    std::string max_supply;
    std::string mint_limit;
    std::string decimals;
    std::string deployer;
    
    // 自定义逻辑
    std::string deploy_logic;
    std::string mint_logic;
    std::string transfer_logic;
};

// DRC-20 解析器类
class Drc20Parser {
public:
    Drc20Parser(Tokenizer& tokenizer);
    
    // 解析 DRC-20 代币定义
    Drc20TokenDefinition parse_drc20_token();
    
    // 解析 DRC-20 操作
    json parse_drc20_operation(const std::string& operation_type);
    
    // 验证 DRC-20 语法
    bool validate_drc20_syntax(const Drc20TokenDefinition& token);
    
private:
    Tokenizer& tokenizer;
    Token current;
    
    // 解析方法
    void parse_token_definition(Drc20TokenDefinition& token);
    void parse_token_parameters(Drc20TokenDefinition& token);
    void parse_custom_logic(Drc20TokenDefinition& token);
    
    // 辅助方法
    void expect_keyword(const std::string& keyword);
    std::string parse_string_value();
    std::string parse_number_value();
    void skip_whitespace();
    bool is_at_end() const;
    void advance();
    Token peek() const;
};

// DRC-20 语法扩展
class Drc20SyntaxExtension {
public:
    // 扩展标准解析器以支持 DRC-20 语法
    static void extend_parser(Parser& parser);
    
    // 添加 DRC-20 关键字支持
    static void add_drc20_keywords();
    
    // 解析 DRC-20 特定的语法结构
    static json parse_drc20_structure(const std::string& source);
    
private:
    // DRC-20 关键字列表
    static const std::vector<std::string> drc20_keywords;
    
    // DRC-20 语法规则
    static json parse_drc20_deploy_statement();
    static json parse_drc20_mint_statement();
    static json parse_drc20_transfer_statement();
};

} // namespace cardity

#endif // CARDITY_DRC20_PARSER_H 