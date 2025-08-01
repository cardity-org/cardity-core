#pragma once

#include "lexer.h"
#include "ast.h"
#include <vector>
#include <memory>

namespace cardity {

class Parser {
private:
    std::vector<Token> tokens;
    size_t current;
    
    Token& current_token();
    Token& peek();
    bool match(TokenType type);
    void advance();
    bool is_at_end() const;
    
    // 解析方法
    std::shared_ptr<ProgramNode> parse_program();
    std::shared_ptr<ContractNode> parse_contract();
    std::shared_ptr<StateNode> parse_state();
    std::shared_ptr<StateVariableNode> parse_state_variable();
    std::shared_ptr<FunctionNode> parse_function();
    std::shared_ptr<ParameterNode> parse_parameter();
    std::shared_ptr<StatementNode> parse_statement();
    std::shared_ptr<StatementNode> parse_assignment();
    std::shared_ptr<StatementNode> parse_return();
    std::shared_ptr<ExpressionNode> parse_expression();
    std::shared_ptr<ExpressionNode> parse_term();
    std::shared_ptr<ExpressionNode> parse_factor();
    std::shared_ptr<ExpressionNode> parse_primary();
    std::shared_ptr<TypeNode> parse_type();
    
    // 辅助方法
    void consume(TokenType type, const std::string& message);
    bool check(TokenType type) const;
    
public:
    explicit Parser(const std::vector<Token>& tokens);
    
    std::shared_ptr<ProgramNode> parse();
    
    // 错误处理
    class ParseError : public std::runtime_error {
    public:
        explicit ParseError(const std::string& message) : std::runtime_error(message) {}
    };
};

} // namespace cardity 