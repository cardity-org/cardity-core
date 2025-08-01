#include "parser.h"
#include <stdexcept>

namespace cardity {

Parser::Parser(const std::vector<Token>& tokens) 
    : tokens(tokens), current(0) {}

Token& Parser::current_token() {
    return tokens[current];
}

Token& Parser::peek() {
    if (current + 1 >= tokens.size()) {
        return tokens.back();
    }
    return tokens[current + 1];
}

bool Parser::match(TokenType type) {
    if (check(type)) {
        advance();
        return true;
    }
    return false;
}

void Parser::advance() {
    if (!is_at_end()) {
        current++;
    }
}

bool Parser::is_at_end() const {
    return current >= tokens.size();
}

bool Parser::check(TokenType type) const {
    if (is_at_end()) return false;
    return current_token().type == type;
}

void Parser::consume(TokenType type, const std::string& message) {
    if (check(type)) {
        advance();
    } else {
        throw ParseError(message);
    }
}

std::shared_ptr<ProgramNode> Parser::parse() {
    return parse_program();
}

std::shared_ptr<ProgramNode> Parser::parse_program() {
    auto program = std::make_shared<ProgramNode>();
    
    while (!is_at_end() && current_token().type != TokenType::END_OF_FILE) {
        if (current_token().type == TokenType::CONTRACT) {
            program->contracts.push_back(parse_contract());
        } else {
            throw ParseError("Expected 'contract' at " + std::to_string(current_token().line));
        }
    }
    
    return program;
}

std::shared_ptr<ContractNode> Parser::parse_contract() {
    consume(TokenType::CONTRACT, "Expected 'contract'");
    
    if (current_token().type != TokenType::IDENTIFIER) {
        throw ParseError("Expected contract name");
    }
    std::string name = current_token().value;
    advance();
    
    consume(TokenType::LEFT_BRACE, "Expected '{' after contract name");
    
    auto contract = std::make_shared<ContractNode>();
    contract->name = name;
    
    // 解析状态和函数
    while (!is_at_end() && current_token().type != TokenType::RIGHT_BRACE) {
        if (current_token().type == TokenType::STATE) {
            contract->state = parse_state();
        } else if (current_token().type == TokenType::FUNC) {
            contract->functions.push_back(parse_function());
        } else {
            throw ParseError("Expected 'state' or 'func'");
        }
    }
    
    consume(TokenType::RIGHT_BRACE, "Expected '}' after contract body");
    
    return contract;
}

std::shared_ptr<StateNode> Parser::parse_state() {
    consume(TokenType::STATE, "Expected 'state'");
    consume(TokenType::LEFT_BRACE, "Expected '{' after 'state'");
    
    auto state = std::make_shared<StateNode>();
    
    while (!is_at_end() && current_token().type != TokenType::RIGHT_BRACE) {
        state->variables.push_back(parse_state_variable());
    }
    
    consume(TokenType::RIGHT_BRACE, "Expected '}' after state variables");
    
    return state;
}

std::shared_ptr<StateVariableNode> Parser::parse_state_variable() {
    if (current_token().type != TokenType::IDENTIFIER) {
        throw ParseError("Expected variable name");
    }
    std::string name = current_token().value;
    advance();
    
    consume(TokenType::COLON, "Expected ':' after variable name");
    
    auto type = parse_type();
    std::shared_ptr<ExpressionNode> initial_value = nullptr;
    
    if (match(TokenType::ASSIGN)) {
        initial_value = parse_expression();
    }
    
    consume(TokenType::SEMICOLON, "Expected ';' after variable declaration");
    
    return std::make_shared<StateVariableNode>(name, type, initial_value);
}

std::shared_ptr<FunctionNode> Parser::parse_function() {
    consume(TokenType::FUNC, "Expected 'func'");
    
    if (current_token().type != TokenType::IDENTIFIER) {
        throw ParseError("Expected function name");
    }
    std::string name = current_token().value;
    advance();
    
    consume(TokenType::LEFT_PAREN, "Expected '(' after function name");
    
    auto func = std::make_shared<FunctionNode>();
    func->name = name;
    
    // 解析参数
    if (!check(TokenType::RIGHT_PAREN)) {
        do {
            func->parameters.push_back(parse_parameter());
        } while (match(TokenType::COMMA));
    }
    
    consume(TokenType::RIGHT_PAREN, "Expected ')' after parameters");
    consume(TokenType::COLON, "Expected ':' after parameters");
    
    func->return_type = parse_type();
    
    consume(TokenType::LEFT_BRACE, "Expected '{' before function body");
    
    // 解析函数体
    while (!is_at_end() && current_token().type != TokenType::RIGHT_BRACE) {
        func->body.push_back(parse_statement());
    }
    
    consume(TokenType::RIGHT_BRACE, "Expected '}' after function body");
    
    return func;
}

std::shared_ptr<ParameterNode> Parser::parse_parameter() {
    if (current_token().type != TokenType::IDENTIFIER) {
        throw ParseError("Expected parameter name");
    }
    std::string name = current_token().value;
    advance();
    
    consume(TokenType::COLON, "Expected ':' after parameter name");
    
    auto type = parse_type();
    
    return std::make_shared<ParameterNode>(name, type);
}

std::shared_ptr<StatementNode> Parser::parse_statement() {
    if (current_token().type == TokenType::RETURN) {
        return parse_return();
    } else {
        return parse_assignment();
    }
}

std::shared_ptr<StatementNode> Parser::parse_assignment() {
    auto target = parse_expression();
    
    if (!match(TokenType::ASSIGN)) {
        throw ParseError("Expected '=' in assignment");
    }
    
    auto value = parse_expression();
    consume(TokenType::SEMICOLON, "Expected ';' after assignment");
    
    return std::make_shared<AssignmentNode>(target, value);
}

std::shared_ptr<StatementNode> Parser::parse_return() {
    consume(TokenType::RETURN, "Expected 'return'");
    
    std::shared_ptr<ExpressionNode> value = nullptr;
    if (!check(TokenType::SEMICOLON)) {
        value = parse_expression();
    }
    
    consume(TokenType::SEMICOLON, "Expected ';' after return");
    
    return std::make_shared<ReturnNode>(value);
}

std::shared_ptr<ExpressionNode> Parser::parse_expression() {
    return parse_term();
}

std::shared_ptr<ExpressionNode> Parser::parse_term() {
    auto left = parse_factor();
    
    while (check(TokenType::PLUS) || check(TokenType::MINUS)) {
        std::string op = current_token().value;
        advance();
        auto right = parse_factor();
        left = std::make_shared<BinaryOpNode>(op, left, right);
    }
    
    return left;
}

std::shared_ptr<ExpressionNode> Parser::parse_factor() {
    auto left = parse_primary();
    
    while (check(TokenType::MULTIPLY) || check(TokenType::DIVIDE)) {
        std::string op = current_token().value;
        advance();
        auto right = parse_primary();
        left = std::make_shared<BinaryOpNode>(op, left, right);
    }
    
    return left;
}

std::shared_ptr<ExpressionNode> Parser::parse_primary() {
    if (check(TokenType::INT_LITERAL)) {
        int value = std::stoi(current_token().value);
        advance();
        return std::make_shared<LiteralNode>(value);
    }
    
    if (check(TokenType::STRING_LITERAL)) {
        std::string value = current_token().value;
        advance();
        return std::make_shared<LiteralNode>(value);
    }
    
    if (check(TokenType::BOOL_LITERAL)) {
        bool value = (current_token().value == "true");
        advance();
        return std::make_shared<LiteralNode>(value);
    }
    
    if (check(TokenType::IDENTIFIER)) {
        std::string name = current_token().value;
        advance();
        
        // 检查是否是成员访问
        if (match(TokenType::DOT)) {
            if (check(TokenType::IDENTIFIER)) {
                std::string member = current_token().value;
                advance();
                return std::make_shared<MemberAccessNode>(
                    std::make_shared<IdentifierNode>(name), member);
            } else {
                throw ParseError("Expected member name after '.'");
            }
        }
        
        return std::make_shared<IdentifierNode>(name);
    }
    
    throw ParseError("Unexpected token: " + current_token().value);
}

std::shared_ptr<TypeNode> Parser::parse_type() {
    if (check(TokenType::INT)) {
        advance();
        return std::make_shared<TypeNode>(TypeNode::Type::INT);
    }
    
    if (check(TokenType::STRING)) {
        advance();
        return std::make_shared<TypeNode>(TypeNode::Type::STRING);
    }
    
    if (check(TokenType::BOOL)) {
        advance();
        return std::make_shared<TypeNode>(TypeNode::Type::BOOL);
    }
    
    if (check(TokenType::VOID)) {
        advance();
        return std::make_shared<TypeNode>(TypeNode::Type::VOID);
    }
    
    throw ParseError("Expected type");
}

} // namespace cardity 