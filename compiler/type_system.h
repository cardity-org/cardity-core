#ifndef CARDITY_TYPE_SYSTEM_H
#define CARDITY_TYPE_SYSTEM_H

#include <string>
#include <variant>
#include <unordered_map>
#include <stdexcept>
#include <nlohmann/json.hpp>

namespace cardity {

using json = nlohmann::json;

// 值类型枚举
enum class ValueType { 
    INT, 
    BOOL, 
    STRING,
    ADDRESS,
    MAP
};

// 类型字符串映射
inline std::string type_to_string(ValueType type) {
    switch (type) {
        case ValueType::INT: return "int";
        case ValueType::BOOL: return "bool";
        case ValueType::STRING: return "string";
        case ValueType::ADDRESS: return "address";
        case ValueType::MAP: return "map";
        default: return "unknown";
    }
}

inline ValueType string_to_type(const std::string& type_str) {
    if (type_str == "int") return ValueType::INT;
    if (type_str == "bool") return ValueType::BOOL;
    if (type_str == "string") return ValueType::STRING;
    if (type_str == "address") return ValueType::ADDRESS;
    if (type_str == "map") return ValueType::MAP;
    throw std::runtime_error("Unknown type: " + type_str);
}

// 值结构体
struct Value {
    ValueType type;
    std::variant<int, bool, std::string> data;
    
    // 构造函数
    Value() : type(ValueType::STRING), data("") {}
    Value(int val) : type(ValueType::INT), data(val) {}
    Value(bool val) : type(ValueType::BOOL), data(val) {}
    Value(const std::string& val) : type(ValueType::STRING), data(val) {}
    
    // 转换为字符串
    std::string to_string() const {
        switch (type) {
            case ValueType::INT: 
                return std::to_string(std::get<int>(data));
            case ValueType::BOOL: 
                return std::get<bool>(data) ? "true" : "false";
            case ValueType::STRING: 
                return std::get<std::string>(data);
            case ValueType::ADDRESS:
                return std::get<std::string>(data);
            default: 
                return "undefined";
        }
    }
    
    // 类型转换
    int to_int() const {
        switch (type) {
            case ValueType::INT: 
                return std::get<int>(data);
            case ValueType::BOOL: 
                return std::get<bool>(data) ? 1 : 0;
            case ValueType::STRING: 
                return std::stoi(std::get<std::string>(data));
            default: 
                throw std::runtime_error("Cannot convert to int");
        }
    }
    
    bool to_bool() const {
        switch (type) {
            case ValueType::INT: 
                return std::get<int>(data) != 0;
            case ValueType::BOOL: 
                return std::get<bool>(data);
            case ValueType::STRING: 
                return !std::get<std::string>(data).empty();
            default: 
                throw std::runtime_error("Cannot convert to bool");
        }
    }
    
    std::string to_string_val() const {
        return to_string();
    }
};

// 类型化状态容器
using TypedState = std::unordered_map<std::string, Value>;

class TypeSystem {
public:
    // 类型检查
    static void check_param_type(const std::string& name, ValueType expected, const Value& actual);
    
    // 类型推断
    static ValueType infer_type(const std::string& value);
    
    // 类型转换
    static Value convert_value(const std::string& value, ValueType target_type);
    
    // 验证状态变量类型
    static void validate_state_variable(const std::string& name, const Value& value, ValueType expected_type);
    
    // 解析状态定义
    static TypedState parse_state_definition(const json& state_def);
    
    // 创建默认值
    static Value create_default_value(ValueType type, const std::string& default_val = "");
    
    // 类型兼容性检查
    static bool is_compatible(ValueType from, ValueType to);
    
    // 布尔表达式求值
    static bool evaluate_boolean_expression(const std::string& expr, const TypedState& state);
    
    // 算术表达式求值
    static Value evaluate_arithmetic_expression(const std::string& expr, const TypedState& state);

private:
    // 解析布尔表达式
    static bool parse_boolean_expression(const std::string& expr, const TypedState& state);
    
    // 解析比较表达式
    static bool parse_comparison_expression(const std::string& expr, const TypedState& state);
    
    // 解析逻辑表达式
    static bool parse_logical_expression(const std::string& expr, const TypedState& state);
    
    // 解析变量引用
    static Value resolve_variable(const std::string& var_ref, const TypedState& state);
    
    // 解析字面量
    static Value parse_literal(const std::string& literal);
};

} // namespace cardity

#endif // CARDITY_TYPE_SYSTEM_H 