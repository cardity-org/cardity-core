#include "expression.h"
#include <algorithm>
#include <cctype>
#include <stdexcept>
#include <tuple>

namespace cardity {

bool ExpressionEvaluator::evaluate_condition(const std::string& expr, 
                                           const State& state, 
                                           const std::vector<std::string>& args, 
                                           const json& method) {
    try {
        auto [left, op, right] = parse_expression(expr);
        
        std::string lval, rval;
        
        // 解析左侧值
        if (left.find("state.") == 0 || left.find("params.") == 0) {
            lval = resolve_variable(left, state, args, method);
        } else {
            lval = resolve_literal(left);
        }
        
        // 解析右侧值
        if (right.find("state.") == 0 || right.find("params.") == 0) {
            rval = resolve_variable(right, state, args, method);
        } else {
            rval = resolve_literal(right);
        }
        
        // 执行比较操作
        if (op == "==") {
            return lval == rval;
        } else if (op == "!=") {
            return lval != rval;
        } else if (op == ">") {
            return std::stoi(lval) > std::stoi(rval);
        } else if (op == "<") {
            return std::stoi(lval) < std::stoi(rval);
        } else if (op == ">=") {
            return std::stoi(lval) >= std::stoi(rval);
        } else if (op == "<=") {
            return std::stoi(lval) <= std::stoi(rval);
        } else {
            throw std::runtime_error("Unsupported operator: " + op);
        }
        
    } catch (const std::exception& e) {
        throw std::runtime_error("Failed to evaluate condition: " + std::string(e.what()));
    }
}

bool ExpressionEvaluator::execute_if_statement(const std::string& logic, 
                                             State& state, 
                                             const std::vector<std::string>& args, 
                                             const json& method) {
    // 查找 if 语句的结构：if (condition) { body }
    size_t if_pos = logic.find("if");
    if (if_pos == std::string::npos) {
        return false; // 不是 if 语句
    }
    
    size_t lparen = logic.find("(", if_pos);
    size_t rparen = logic.find(")", lparen);
    size_t lbrace = logic.find("{", rparen);
    size_t rbrace = logic.find("}", lbrace);
    
    if (lparen == std::string::npos || rparen == std::string::npos || 
        lbrace == std::string::npos || rbrace == std::string::npos) {
        throw std::runtime_error("Invalid if statement syntax");
    }
    
    // 提取条件和主体
    std::string condition = logic.substr(lparen + 1, rparen - lparen - 1);
    std::string body = logic.substr(lbrace + 1, rbrace - lbrace - 1);
    
    // 清理空白字符
    condition = trim(condition);
    body = trim(body);
    
    // 评估条件
    bool condition_result = evaluate_condition(condition, state, args, method);
    
    if (condition_result) {
        // 条件为真，执行主体
        parse_assignment(body, state, args, method);
    }
    
    return true; // 表示这是一个 if 语句
}

void ExpressionEvaluator::parse_assignment(const std::string& assignment, 
                                         State& state, 
                                         const std::vector<std::string>& args, 
                                         const json& method) {
    size_t eq = assignment.find('=');
    if (eq == std::string::npos) {
        throw std::runtime_error("Invalid assignment syntax: " + assignment);
    }
    
    std::string lhs = assignment.substr(0, eq);
    std::string rhs = assignment.substr(eq + 1);
    
    // 清理空白字符
    lhs = trim(lhs);
    rhs = trim(rhs);
    
    // 检查左侧是否为 state.xxx 格式
    if (lhs.find("state.") == 0) {
        std::string varname = lhs.substr(6); // 移除 "state."
        
        // 解析右侧值
        std::string value;
        if (rhs.find("params.") == 0) {
            value = resolve_variable(rhs, state, args, method);
        } else if (rhs.find("state.") == 0) {
            value = resolve_variable(rhs, state, args, method);
        } else {
            value = resolve_literal(rhs);
        }
        
        state[varname] = value;
    } else {
        throw std::runtime_error("Invalid state assignment: " + lhs);
    }
}

std::tuple<std::string, std::string, std::string> ExpressionEvaluator::parse_expression(const std::string& expr) {
    std::string left, op, right;
    
    // 支持的比较操作符
    std::vector<std::string> operators = {"==", "!=", ">=", "<=", ">", "<"};
    
    for (const auto& op_test : operators) {
        size_t pos = expr.find(op_test);
        if (pos != std::string::npos) {
            left = expr.substr(0, pos);
            op = op_test;
            right = expr.substr(pos + op_test.length());
            break;
        }
    }
    
    if (op.empty()) {
        throw std::runtime_error("No valid operator found in expression: " + expr);
    }
    
    return {trim(left), op, trim(right)};
}

std::string ExpressionEvaluator::resolve_variable(const std::string& token, 
                                                const State& state, 
                                                const std::vector<std::string>& args, 
                                                const json& method) {
    if (token.find("state.") == 0) {
        std::string key = token.substr(6);
        auto it = state.find(key);
        if (it != state.end()) {
            return it->second;
        } else {
            throw std::runtime_error("State variable not found: " + key);
        }
    } else if (token.find("params.") == 0) {
        std::string key = token.substr(7);
        if (!method.contains("params")) {
            throw std::runtime_error("Method has no parameters");
        }
        
        auto param_list = method["params"];
        auto it = std::find(param_list.begin(), param_list.end(), key);
        if (it == param_list.end()) {
            throw std::runtime_error("Unknown parameter: " + key);
        }
        
        size_t idx = std::distance(param_list.begin(), it);
        if (idx >= args.size()) {
            throw std::runtime_error("Missing argument for parameter: " + key);
        }
        
        return args[idx];
    } else {
        throw std::runtime_error("Invalid variable reference: " + token);
    }
}

std::string ExpressionEvaluator::resolve_literal(const std::string& token) {
    if (is_string_literal(token)) {
        return extract_string_literal(token);
    } else if (is_number_literal(token)) {
        return token; // 数字字面量直接返回
    } else {
        throw std::runtime_error("Invalid literal: " + token);
    }
}

std::string ExpressionEvaluator::trim(const std::string& str) {
    std::string result = str;
    result.erase(std::remove_if(result.begin(), result.end(), ::isspace), result.end());
    return result;
}

bool ExpressionEvaluator::is_string_literal(const std::string& token) {
    return token.length() >= 2 && 
           ((token.front() == '"' && token.back() == '"') ||
            (token.front() == '\'' && token.back() == '\''));
}

bool ExpressionEvaluator::is_number_literal(const std::string& token) {
    if (token.empty()) return false;
    
    // 检查是否为数字（包括负号）
    size_t start = 0;
    if (token[0] == '-') start = 1;
    
    for (size_t i = start; i < token.length(); ++i) {
        if (!std::isdigit(token[i])) {
            return false;
        }
    }
    
    return true;
}

std::string ExpressionEvaluator::extract_string_literal(const std::string& token) {
    if (!is_string_literal(token)) {
        throw std::runtime_error("Not a string literal: " + token);
    }
    
    // 移除首尾的引号
    return token.substr(1, token.length() - 2);
}

} // namespace cardity 