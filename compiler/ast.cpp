#include "ast.h"
#include <sstream>

namespace cardity {

std::string TypeNode::to_string() const {
    if (!name.empty()) {
        return name;
    }
    
    switch (type) {
        case Type::INT: return "int";
        case Type::STRING: return "string";
        case Type::BOOL: return "bool";
        case Type::VOID: return "void";
        default: return "unknown";
    }
}

std::string LiteralNode::to_string() const {
    return std::visit([](const auto& value) -> std::string {
        using T = std::decay_t<decltype(value)>;
        if constexpr (std::is_same_v<T, std::string>) {
            return "\"" + value + "\"";
        } else {
            return std::to_string(value);
        }
    }, value);
}

std::string IdentifierNode::to_string() const {
    return name;
}

std::string BinaryOpNode::to_string() const {
    return "(" + left->to_string() + " " + op + " " + right->to_string() + ")";
}

std::string MemberAccessNode::to_string() const {
    return object->to_string() + "." + member;
}

std::string AssignmentNode::to_string() const {
    return target->to_string() + " = " + value->to_string();
}

std::string ReturnNode::to_string() const {
    if (value) {
        return "return " + value->to_string();
    }
    return "return";
}

std::string StateVariableNode::to_string() const {
    std::string result = name + ": " + type->to_string();
    if (initial_value) {
        result += " = " + initial_value->to_string();
    }
    return result;
}

std::string StateNode::to_string() const {
    std::stringstream ss;
    ss << "state {\n";
    for (const auto& var : variables) {
        ss << "  " << var->to_string() << ";\n";
    }
    ss << "}";
    return ss.str();
}

std::string ParameterNode::to_string() const {
    return name + ": " + type->to_string();
}

std::string FunctionNode::to_string() const {
    std::stringstream ss;
    ss << "func " << name << "(";
    
    for (size_t i = 0; i < parameters.size(); ++i) {
        if (i > 0) ss << ", ";
        ss << parameters[i]->to_string();
    }
    
    ss << "): " << return_type->to_string() << " {\n";
    
    for (const auto& stmt : body) {
        ss << "  " << stmt->to_string() << ";\n";
    }
    
    ss << "}";
    return ss.str();
}

std::string ContractNode::to_string() const {
    std::stringstream ss;
    ss << "contract " << name << " {\n";
    
    if (state) {
        ss << "  " << state->to_string() << "\n\n";
    }
    
    for (const auto& func : functions) {
        ss << "  " << func->to_string() << "\n\n";
    }
    
    ss << "}";
    return ss.str();
}

std::string ProgramNode::to_string() const {
    std::stringstream ss;
    for (const auto& contract : contracts) {
        ss << contract->to_string() << "\n\n";
    }
    return ss.str();
}

} // namespace cardity 