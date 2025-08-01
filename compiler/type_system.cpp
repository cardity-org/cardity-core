#include "type_system.h"
#include <algorithm>
#include <cctype>
#include <sstream>
#include <iostream>

namespace cardity {

void TypeSystem::check_param_type(const std::string& name, ValueType expected, const Value& actual) {
    if (actual.type != expected) {
        throw std::runtime_error("Parameter '" + name + "' type mismatch: expected " + 
                               type_to_string(expected) + ", got " + type_to_string(actual.type));
    }
}

ValueType TypeSystem::infer_type(const std::string& value) {
    // 检查是否为布尔值
    if (value == "true" || value == "false") {
        return ValueType::BOOL;
    }
    
    // 检查是否为数字
    if (!value.empty()) {
        bool is_number = true;
        size_t start = 0;
        if (value[0] == '-') start = 1;
        
        for (size_t i = start; i < value.length(); ++i) {
            if (!std::isdigit(value[i])) {
                is_number = false;
                break;
            }
        }
        
        if (is_number) {
            return ValueType::INT;
        }
    }
    
    // 默认为字符串
    return ValueType::STRING;
}

Value TypeSystem::convert_value(const std::string& value, ValueType target_type) {
    switch (target_type) {
        case ValueType::INT:
            return Value(std::stoi(value));
        case ValueType::BOOL:
            return Value(value == "true" || value == "1");
        case ValueType::STRING:
            return Value(value);
        default:
            throw std::runtime_error("Unsupported target type for conversion");
    }
}

void TypeSystem::validate_state_variable(const std::string& name, const Value& value, ValueType expected_type) {
    if (value.type != expected_type) {
        throw std::runtime_error("State variable '" + name + "' type mismatch: expected " + 
                               type_to_string(expected_type) + ", got " + type_to_string(value.type));
    }
}

TypedState TypeSystem::parse_state_definition(const json& state_def) {
    TypedState state;
    
    for (auto& [name, var_def] : state_def.items()) {
        ValueType type = ValueType::STRING; // 默认类型
        std::string default_val = "";
        
        if (var_def.contains("type")) {
            type = string_to_type(var_def["type"]);
        }
        
        if (var_def.contains("default")) {
            default_val = var_def["default"];
        }
        
        state[name] = create_default_value(type, default_val);
    }
    
    return state;
}

Value TypeSystem::create_default_value(ValueType type, const std::string& default_val) {
    if (!default_val.empty()) {
        return convert_value(default_val, type);
    }
    
    switch (type) {
        case ValueType::INT:
            return Value(0);
        case ValueType::BOOL:
            return Value(false);
        case ValueType::STRING:
            return Value("");
        default:
            throw std::runtime_error("Unknown type for default value creation");
    }
}

bool TypeSystem::is_compatible(ValueType from, ValueType to) {
    if (from == to) return true;
    
    // 允许的隐式转换
    if (from == ValueType::INT && to == ValueType::BOOL) return true;
    if (from == ValueType::BOOL && to == ValueType::INT) return true;
    if (from == ValueType::STRING && to == ValueType::BOOL) return true;
    
    return false;
}

bool TypeSystem::evaluate_boolean_expression(const std::string& expr, const TypedState& state) {
    try {
        return parse_boolean_expression(expr, state);
    } catch (const std::exception& e) {
        throw std::runtime_error("Failed to evaluate boolean expression: " + std::string(e.what()));
    }
}

Value TypeSystem::evaluate_arithmetic_expression(const std::string& expr, const TypedState& state) {
    // 简化实现：只支持基本的算术运算
    // 这里可以扩展为更复杂的表达式解析器
    
    // 检查是否为简单变量引用
    if (expr.find("state.") == 0) {
        return resolve_variable(expr, state);
    }
    
    // 检查是否为字面量
    if (infer_type(expr) == ValueType::INT) {
        return Value(std::stoi(expr));
    }
    
    throw std::runtime_error("Unsupported arithmetic expression: " + expr);
}

bool TypeSystem::parse_boolean_expression(const std::string& expr, const TypedState& state) {
    // 检查逻辑运算符
    if (expr.find("&&") != std::string::npos) {
        return parse_logical_expression(expr, state);
    }
    
    if (expr.find("||") != std::string::npos) {
        return parse_logical_expression(expr, state);
    }
    
    if (expr.find("!") == 0) {
        // 处理否定
        std::string sub_expr = expr.substr(1);
        return !parse_boolean_expression(sub_expr, state);
    }
    
    // 检查比较运算符
    std::vector<std::string> operators = {"==", "!=", ">=", "<=", ">", "<"};
    for (const auto& op : operators) {
        if (expr.find(op) != std::string::npos) {
            return parse_comparison_expression(expr, state);
        }
    }
    
    // 单个值的情况
    Value val = resolve_variable(expr, state);
    return val.to_bool();
}

bool TypeSystem::parse_comparison_expression(const std::string& expr, const TypedState& state) {
    std::vector<std::string> operators = {"==", "!=", ">=", "<=", ">", "<"};
    
    for (const auto& op : operators) {
        size_t pos = expr.find(op);
        if (pos != std::string::npos) {
            std::string left = expr.substr(0, pos);
            std::string right = expr.substr(pos + op.length());
            
            // 清理空白字符
            left.erase(std::remove_if(left.begin(), left.end(), ::isspace), left.end());
            right.erase(std::remove_if(right.begin(), right.end(), ::isspace), right.end());
            
            // 额外清理前后空格
            if (!left.empty()) {
                size_t start = left.find_first_not_of(" \t\r\n");
                if (start != std::string::npos) {
                    left = left.substr(start);
                }
                size_t end = left.find_last_not_of(" \t\r\n");
                if (end != std::string::npos) {
                    left = left.substr(0, end + 1);
                }
            }
            
            if (!right.empty()) {
                size_t start = right.find_first_not_of(" \t\r\n");
                if (start != std::string::npos) {
                    right = right.substr(start);
                }
                size_t end = right.find_last_not_of(" \t\r\n");
                if (end != std::string::npos) {
                    right = right.substr(0, end + 1);
                }
            }
            
            Value left_val = resolve_variable(left, state);
            Value right_val = resolve_variable(right, state);
            
            // 执行比较
            if (op == "==") {
                return left_val.to_string() == right_val.to_string();
            } else if (op == "!=") {
                return left_val.to_string() != right_val.to_string();
            } else if (op == ">") {
                return left_val.to_int() > right_val.to_int();
            } else if (op == "<") {
                return left_val.to_int() < right_val.to_int();
            } else if (op == ">=") {
                return left_val.to_int() >= right_val.to_int();
            } else if (op == "<=") {
                return left_val.to_int() <= right_val.to_int();
            }
        }
    }
    
    throw std::runtime_error("Invalid comparison expression: " + expr);
}

bool TypeSystem::parse_logical_expression(const std::string& expr, const TypedState& state) {
    // 简化实现：只处理基本的 && 和 ||
    
    if (expr.find("&&") != std::string::npos) {
        size_t pos = expr.find("&&");
        std::string left = expr.substr(0, pos);
        std::string right = expr.substr(pos + 2);
        
        // 清理空白字符
        left.erase(std::remove_if(left.begin(), left.end(), ::isspace), left.end());
        right.erase(std::remove_if(right.begin(), right.end(), ::isspace), right.end());
        
        return parse_boolean_expression(left, state) && parse_boolean_expression(right, state);
    }
    
    if (expr.find("||") != std::string::npos) {
        size_t pos = expr.find("||");
        std::string left = expr.substr(0, pos);
        std::string right = expr.substr(pos + 2);
        
        // 清理空白字符
        left.erase(std::remove_if(left.begin(), left.end(), ::isspace), left.end());
        right.erase(std::remove_if(right.begin(), right.end(), ::isspace), right.end());
        
        return parse_boolean_expression(left, state) || parse_boolean_expression(right, state);
    }
    
    throw std::runtime_error("Invalid logical expression: " + expr);
}

Value TypeSystem::resolve_variable(const std::string& var_ref, const TypedState& state) {
    if (var_ref.find("state.") == 0) {
        std::string var_name = var_ref.substr(6);
        auto it = state.find(var_name);
        if (it != state.end()) {
            return it->second;
        } else {
            throw std::runtime_error("State variable not found: " + var_name);
        }
    }
    
    // 尝试解析为字面量
    return parse_literal(var_ref);
}

Value TypeSystem::parse_literal(const std::string& literal) {
    // 检查是否为字符串字面量
    if (literal.length() >= 2 && 
        ((literal.front() == '"' && literal.back() == '"') ||
         (literal.front() == '\'' && literal.back() == '\''))) {
        return Value(literal.substr(1, literal.length() - 2));
    }
    
    // 检查是否为布尔字面量
    if (literal == "true") return Value(true);
    if (literal == "false") return Value(false);
    
    // 检查是否为数字字面量
    if (infer_type(literal) == ValueType::INT) {
        return Value(std::stoi(literal));
    }
    
    // 默认为字符串
    return Value(literal);
}

} // namespace cardity 