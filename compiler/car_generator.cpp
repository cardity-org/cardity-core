#include "car_generator.h"
#include <sstream>

namespace cardity {

CARGenerator::CARGenerator(std::shared_ptr<ContractNode> contract) : contract(contract) {}

nlohmann::json CARGenerator::generate() {
    output = {
        {"p", "cardinals"},
        {"op", "deploy"},
        {"protocol", contract->name},
        {"version", "1.0"},
        {"cpl", {
            {"state", nlohmann::json::object()},
            {"methods", nlohmann::json::object()}
        }}
    };
    
    generate_contract(contract);
    
    return output;
}

std::string CARGenerator::generate_string() {
    return generate().dump(2);
}

void CARGenerator::generate_contract(std::shared_ptr<ContractNode> node) {
    if (node->state) {
        generate_state(node->state);
    }
    
    if (!node->functions.empty()) {
        generate_functions(node->functions);
    }
}

void CARGenerator::generate_state(std::shared_ptr<StateNode> node) {
    for (const auto& var : node->variables) {
        generate_state_variable(var);
    }
}

void CARGenerator::generate_state_variable(std::shared_ptr<StateVariableNode> node) {
    nlohmann::json var_def = {
        {"type", type_to_string(node->type)}
    };
    
    if (node->initial_value) {
        var_def["default"] = generate_expression(node->initial_value);
    }
    
    output["cpl"]["state"][node->name] = var_def;
}

void CARGenerator::generate_functions(const std::vector<std::shared_ptr<FunctionNode>>& functions) {
    for (const auto& func : functions) {
        generate_function(func);
    }
}

void CARGenerator::generate_function(std::shared_ptr<FunctionNode> node) {
    nlohmann::json func_def = {
        {"params", nlohmann::json::array()},
        {"logic", ""},
        {"returns", ""}
    };
    
    // 生成参数
    for (const auto& param : node->parameters) {
        func_def["params"].push_back({
            {"name", param->name},
            {"type", type_to_string(param->type)}
        });
    }
    
    // 生成函数体逻辑
    std::string logic;
    for (const auto& stmt : node->body) {
        logic += generate_statement(stmt) + "; ";
    }
    func_def["logic"] = logic;
    
    // 生成返回值
    if (node->return_type->type != TypeNode::Type::VOID) {
        func_def["returns"] = type_to_string(node->return_type);
    }
    
    output["cpl"]["methods"][node->name] = func_def;
}

void CARGenerator::generate_parameters(const std::vector<std::shared_ptr<ParameterNode>>& params) {
    for (const auto& param : params) {
        // 参数已经在 generate_function 中处理
    }
}

void CARGenerator::generate_statements(const std::vector<std::shared_ptr<StatementNode>>& statements) {
    for (const auto& stmt : statements) {
        generate_statement(stmt);
    }
}

std::string CARGenerator::generate_statement(std::shared_ptr<StatementNode> node) {
    if (auto assignment = std::dynamic_pointer_cast<AssignmentNode>(node)) {
        return generate_assignment(assignment);
    } else if (auto return_stmt = std::dynamic_pointer_cast<ReturnNode>(node)) {
        return generate_return(return_stmt);
    }
    
    throw GenerationError("Unknown statement type");
}

std::string CARGenerator::generate_assignment(std::shared_ptr<AssignmentNode> node) {
    return generate_expression(node->target) + " = " + generate_expression(node->value);
}

std::string CARGenerator::generate_return(std::shared_ptr<ReturnNode> node) {
    if (node->value) {
        return "return " + generate_expression(node->value);
    }
    return "return";
}

std::string CARGenerator::generate_expression(std::shared_ptr<ExpressionNode> node) {
    if (auto literal = std::dynamic_pointer_cast<LiteralNode>(node)) {
        return generate_literal(literal);
    } else if (auto identifier = std::dynamic_pointer_cast<IdentifierNode>(node)) {
        return generate_identifier(identifier);
    } else if (auto binary_op = std::dynamic_pointer_cast<BinaryOpNode>(node)) {
        return generate_binary_op(binary_op);
    } else if (auto member_access = std::dynamic_pointer_cast<MemberAccessNode>(node)) {
        return generate_member_access(member_access);
    }
    
    throw GenerationError("Unknown expression type");
}

std::string CARGenerator::generate_literal(std::shared_ptr<LiteralNode> node) {
    return literal_to_string(node->value);
}

std::string CARGenerator::generate_identifier(std::shared_ptr<IdentifierNode> node) {
    return node->name;
}

std::string CARGenerator::generate_binary_op(std::shared_ptr<BinaryOpNode> node) {
    return generate_expression(node->left) + " " + node->op + " " + generate_expression(node->right);
}

std::string CARGenerator::generate_member_access(std::shared_ptr<MemberAccessNode> node) {
    return generate_expression(node->object) + "." + node->member;
}

std::string CARGenerator::generate_type(std::shared_ptr<TypeNode> node) {
    return type_to_string(node);
}

std::string CARGenerator::type_to_string(std::shared_ptr<TypeNode> type) {
    switch (type->type) {
        case TypeNode::Type::INT: return "int";
        case TypeNode::Type::STRING: return "string";
        case TypeNode::Type::BOOL: return "bool";
        case TypeNode::Type::VOID: return "void";
        default: return "unknown";
    }
}

std::string CARGenerator::literal_to_string(const std::variant<int, std::string, bool>& value) {
    return std::visit([](const auto& v) -> std::string {
        using T = std::decay_t<decltype(v)>;
        if constexpr (std::is_same_v<T, std::string>) {
            return "\"" + v + "\"";
        } else {
            return std::to_string(v);
        }
    }, value);
}

} // namespace cardity 