#include "semantic.h"

namespace cardity {

SemanticAnalyzer::SemanticAnalyzer(std::shared_ptr<ProgramNode> ast) 
    : ast(ast), current_scope(nullptr) {
    enter_scope(); // 全局作用域
}

SemanticAnalyzer::~SemanticAnalyzer() {
    while (current_scope) {
        exit_scope();
    }
}

bool SemanticAnalyzer::analyze() {
    try {
        analyze_program(ast);
        return errors.empty();
    } catch (const std::exception& e) {
        report_error(e.what());
        return false;
    }
}

void SemanticAnalyzer::analyze_program(std::shared_ptr<ProgramNode> node) {
    for (const auto& contract : node->contracts) {
        analyze_contract(contract);
    }
}

void SemanticAnalyzer::analyze_contract(std::shared_ptr<ContractNode> node) {
    enter_scope(); // 合约作用域
    
    // 分析状态变量
    if (node->state) {
        analyze_state(node->state);
    }
    
    // 分析函数
    for (const auto& func : node->functions) {
        analyze_function(func);
    }
    
    exit_scope();
}

void SemanticAnalyzer::analyze_state(std::shared_ptr<StateNode> node) {
    for (const auto& var : node->variables) {
        analyze_state_variable(var);
    }
}

void SemanticAnalyzer::analyze_state_variable(std::shared_ptr<StateVariableNode> node) {
    // 检查变量是否已定义
    if (current_scope->is_defined(node->name)) {
        report_error("Variable '" + node->name + "' is already defined");
        return;
    }
    
    // 检查初始值类型
    if (node->initial_value) {
        auto value_type = analyze_expression(node->initial_value);
        if (!is_compatible(value_type, node->type)) {
            report_error("Type mismatch in variable '" + node->name + "'");
        }
    }
    
    // 添加到符号表
    current_scope->define(node->name, Symbol(node->name, node->type, false));
}

void SemanticAnalyzer::analyze_function(std::shared_ptr<FunctionNode> node) {
    enter_scope(); // 函数作用域
    
    // 添加参数到符号表
    for (const auto& param : node->parameters) {
        if (current_scope->is_defined(param->name)) {
            report_error("Parameter '" + param->name + "' is already defined");
        } else {
            current_scope->define(param->name, Symbol(param->name, param->type, false));
        }
    }
    
    // 分析函数体
    for (const auto& stmt : node->body) {
        analyze_statement(stmt);
    }
    
    exit_scope();
}

void SemanticAnalyzer::analyze_statement(std::shared_ptr<StatementNode> node) {
    if (auto assignment = std::dynamic_pointer_cast<AssignmentNode>(node)) {
        analyze_assignment(assignment);
    } else if (auto return_stmt = std::dynamic_pointer_cast<ReturnNode>(node)) {
        analyze_return(return_stmt);
    }
}

void SemanticAnalyzer::analyze_assignment(std::shared_ptr<AssignmentNode> node) {
    auto target_type = analyze_expression(node->target);
    auto value_type = analyze_expression(node->value);
    
    if (!is_compatible(value_type, target_type)) {
        report_error("Type mismatch in assignment");
    }
}

void SemanticAnalyzer::analyze_return(std::shared_ptr<ReturnNode> node) {
    if (node->value) {
        auto return_type = analyze_expression(node->value);
        // 这里应该检查返回类型是否与函数声明匹配
        // 简化实现，暂时跳过
    }
}

std::shared_ptr<TypeNode> SemanticAnalyzer::analyze_expression(std::shared_ptr<ExpressionNode> node) {
    if (auto literal = std::dynamic_pointer_cast<LiteralNode>(node)) {
        return analyze_literal(literal);
    } else if (auto identifier = std::dynamic_pointer_cast<IdentifierNode>(node)) {
        return analyze_identifier(identifier);
    } else if (auto binary_op = std::dynamic_pointer_cast<BinaryOpNode>(node)) {
        return analyze_binary_op(binary_op);
    } else if (auto member_access = std::dynamic_pointer_cast<MemberAccessNode>(node)) {
        return analyze_member_access(member_access);
    }
    
    report_error("Unknown expression type");
    return std::make_shared<TypeNode>(TypeNode::Type::INT); // 默认返回 int
}

std::shared_ptr<TypeNode> SemanticAnalyzer::analyze_literal(std::shared_ptr<LiteralNode> node) {
    return std::visit([](const auto& value) -> std::shared_ptr<TypeNode> {
        using T = std::decay_t<decltype(value)>;
        if constexpr (std::is_same_v<T, int>) {
            return std::make_shared<TypeNode>(TypeNode::Type::INT);
        } else if constexpr (std::is_same_v<T, std::string>) {
            return std::make_shared<TypeNode>(TypeNode::Type::STRING);
        } else if constexpr (std::is_same_v<T, bool>) {
            return std::make_shared<TypeNode>(TypeNode::Type::BOOL);
        } else {
            return std::make_shared<TypeNode>(TypeNode::Type::INT);
        }
    }, node->value);
}

std::shared_ptr<TypeNode> SemanticAnalyzer::analyze_identifier(std::shared_ptr<IdentifierNode> node) {
    Symbol* symbol = current_scope->lookup(node->name);
    if (!symbol) {
        report_error("Undefined variable '" + node->name + "'");
        return std::make_shared<TypeNode>(TypeNode::Type::INT);
    }
    return symbol->type;
}

std::shared_ptr<TypeNode> SemanticAnalyzer::analyze_binary_op(std::shared_ptr<BinaryOpNode> node) {
    auto left_type = analyze_expression(node->left);
    auto right_type = analyze_expression(node->right);
    
    // 简化实现：假设所有二元运算都返回 int
    if (!is_compatible(left_type, std::make_shared<TypeNode>(TypeNode::Type::INT)) ||
        !is_compatible(right_type, std::make_shared<TypeNode>(TypeNode::Type::INT))) {
        report_error("Invalid operands for binary operation");
    }
    
    return std::make_shared<TypeNode>(TypeNode::Type::INT);
}

std::shared_ptr<TypeNode> SemanticAnalyzer::analyze_member_access(std::shared_ptr<MemberAccessNode> node) {
    auto object_type = analyze_expression(node->object);
    
    // 简化实现：假设所有成员访问都返回 int
    return std::make_shared<TypeNode>(TypeNode::Type::INT);
}

bool SemanticAnalyzer::is_compatible(std::shared_ptr<TypeNode> from, std::shared_ptr<TypeNode> to) {
    if (!from || !to) return false;
    
    // 简化实现：只检查基本类型
    if (from->type == to->type) return true;
    
    // 允许一些隐式转换
    if (from->type == TypeNode::Type::INT && to->type == TypeNode::Type::INT) return true;
    if (from->type == TypeNode::Type::STRING && to->type == TypeNode::Type::STRING) return true;
    if (from->type == TypeNode::Type::BOOL && to->type == TypeNode::Type::BOOL) return true;
    
    return false;
}

std::shared_ptr<TypeNode> SemanticAnalyzer::get_expression_type(std::shared_ptr<ExpressionNode> node) {
    return analyze_expression(node);
}

void SemanticAnalyzer::enter_scope() {
    current_scope = new Scope(current_scope);
}

void SemanticAnalyzer::exit_scope() {
    if (current_scope) {
        Scope* parent = current_scope->parent;
        delete current_scope;
        current_scope = parent;
    }
}

void SemanticAnalyzer::report_error(const std::string& message) {
    errors.push_back(message);
}

// Scope 实现
void Scope::define(const std::string& name, const Symbol& symbol) {
    symbols[name] = symbol;
}

Symbol* Scope::lookup(const std::string& name) {
    auto it = symbols.find(name);
    if (it != symbols.end()) {
        return &it->second;
    }
    
    if (parent) {
        return parent->lookup(name);
    }
    
    return nullptr;
}

bool Scope::is_defined(const std::string& name) const {
    return symbols.find(name) != symbols.end();
}

} // namespace cardity 