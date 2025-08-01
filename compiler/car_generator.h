#pragma once

#include "ast.h"
#include <nlohmann/json.hpp>
#include <string>
#include <memory>

namespace cardity {

// CAR 生成器
class CARGenerator {
private:
    std::shared_ptr<ProgramNode> ast;
    nlohmann::json output;
    
    // 生成方法
    void generate_program(std::shared_ptr<ProgramNode> node);
    void generate_contract(std::shared_ptr<ContractNode> node);
    void generate_state(std::shared_ptr<StateNode> node);
    void generate_state_variable(std::shared_ptr<StateVariableNode> node);
    void generate_functions(const std::vector<std::shared_ptr<FunctionNode>>& functions);
    void generate_function(std::shared_ptr<FunctionNode> node);
    void generate_parameters(const std::vector<std::shared_ptr<ParameterNode>>& params);
    void generate_statements(const std::vector<std::shared_ptr<StatementNode>>& statements);
    void generate_statement(std::shared_ptr<StatementNode> node);
    void generate_assignment(std::shared_ptr<AssignmentNode> node);
    void generate_return(std::shared_ptr<ReturnNode> node);
    std::string generate_expression(std::shared_ptr<ExpressionNode> node);
    std::string generate_literal(std::shared_ptr<LiteralNode> node);
    std::string generate_identifier(std::shared_ptr<IdentifierNode> node);
    std::string generate_binary_op(std::shared_ptr<BinaryOpNode> node);
    std::string generate_member_access(std::shared_ptr<MemberAccessNode> node);
    std::string generate_type(std::shared_ptr<TypeNode> node);
    
    // 辅助方法
    std::string type_to_string(std::shared_ptr<TypeNode> type);
    std::string literal_to_string(const std::variant<int, std::string, bool>& value);
    
public:
    explicit CARGenerator(std::shared_ptr<ProgramNode> ast);
    
    nlohmann::json generate();
    std::string generate_string();
    
    // 错误处理
    class GenerationError : public std::runtime_error {
    public:
        explicit GenerationError(const std::string& message) : std::runtime_error(message) {}
    };
};

} // namespace cardity 