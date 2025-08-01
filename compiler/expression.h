#ifndef CARDITY_EXPRESSION_H
#define CARDITY_EXPRESSION_H

#include <string>
#include <vector>
#include <unordered_map>
#include <nlohmann/json.hpp>
#include "type_system.h"

namespace cardity {

using json = nlohmann::json;

// 状态容器类型
using State = std::unordered_map<std::string, std::string>;

class ExpressionEvaluator {
public:
    // 评估条件表达式
    static bool evaluate_condition(const std::string& expr, 
                                 const State& state, 
                                 const std::vector<std::string>& args, 
                                 const json& method);
    
    // 解析并执行 if 条件语句
    static bool execute_if_statement(const std::string& logic, 
                                   State& state, 
                                   const std::vector<std::string>& args, 
                                   const json& method);
    
    // 解析赋值语句
    static void parse_assignment(const std::string& assignment, 
                               State& state, 
                               const std::vector<std::string>& args, 
                               const json& method);

public:
    // 解析表达式中的操作符
    static std::tuple<std::string, std::string, std::string> parse_expression(const std::string& expr);
    
    // 解析变量引用（state.xxx 或 params.xxx）
    static std::string resolve_variable(const std::string& token, 
                                      const State& state, 
                                      const std::vector<std::string>& args, 
                                      const json& method);
    
    // 解析字面量（字符串或数字）
    static std::string resolve_literal(const std::string& token);
    
    // 清理字符串（移除空白字符）
    static std::string trim(const std::string& str);
    
    // 检查是否为字符串字面量
    static bool is_string_literal(const std::string& token);
    
    // 检查是否为数字字面量
    static bool is_number_literal(const std::string& token);
    
    // 提取字符串字面量的值
    static std::string extract_string_literal(const std::string& token);

private:
};

} // namespace cardity

#endif // CARDITY_EXPRESSION_H 