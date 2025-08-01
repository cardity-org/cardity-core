#include "parser.h"
#include "tokenizer.h"
#include <stdexcept>
#include <cctype>
#include <iostream>

namespace cardity {

Parser::Parser(const std::vector<Token>& tokens) 
    : tokens(tokens), current(0) {}

const Token& Parser::peek() {
    if (current >= tokens.size()) {
        static Token eof{TokenType::END, "", 0, 0};
        return eof;
    }
    return tokens[current];
}

const Token& Parser::advance() {
    if (current < tokens.size()) {
        return tokens[current++];
    }
    static Token eof{TokenType::END, "", 0, 0};
    return eof;
}

bool Parser::match(const std::string& keyword) {
    // 将关键字字符串映射到对应的 TokenType
    TokenType expectedType;
    if (keyword == "contract") expectedType = TokenType::KEYWORD_CONTRACT;
    else if (keyword == "state") expectedType = TokenType::KEYWORD_STATE;
    else if (keyword == "string") expectedType = TokenType::KEYWORD_STRING;
    else if (keyword == "int") expectedType = TokenType::KEYWORD_INT;
    else if (keyword == "default") expectedType = TokenType::KEYWORD_DEFAULT;
    else if (keyword == "method") expectedType = TokenType::KEYWORD_METHOD;
    else if (keyword == "params") expectedType = TokenType::KEYWORD_PARAMS;
    else if (keyword == "returns") expectedType = TokenType::KEYWORD_RETURNS;
    else if (keyword == "owner") expectedType = TokenType::KEYWORD_OWNER;
    else return false;
    
    if (peek().type == expectedType) {
        advance();
        return true;
    }
    return false;
}

std::unique_ptr<ContractDef> Parser::parse() {
    return parse_contract();
}

std::unique_ptr<ProgramNode> Parser::parseProgram() {
    auto program = std::make_unique<ProgramNode>();
    while (!isAtEnd()) {
        auto stmt = parseStatement();
        if (stmt) program->statements.push_back(std::move(stmt));
    }
    return program;
}

std::unique_ptr<ASTNode> Parser::parseStatement() {
    if (peek().type == TokenType::KEYWORD_CONTRACT) {
        return parse_contract();
    }
    // 这里可以添加更多语句类型的解析
    std::cerr << "Unexpected token: " << peek().value << std::endl;
    advance();
    return nullptr;
}

std::unique_ptr<LetStatementNode> Parser::parseLetStatement() {
    advance(); // consume 'let'
    if (peek().type != TokenType::IDENTIFIER) {
        std::cerr << "Expected identifier after 'let'\n";
        return nullptr;
    }
    std::string id = advance().value;

    if (peek().type != TokenType::EQUAL) {
        std::cerr << "Expected '=' after identifier\n";
        return nullptr;
    }
    advance();

    if (peek().type != TokenType::STRING) {
        std::cerr << "Expected string after '='\n";
        return nullptr;
    }
    std::string val = advance().value;

    if (peek().type != TokenType::SEMICOLON) {
        std::cerr << "Expected ';' after value\n";
        return nullptr;
    }
    advance();

    auto letStmt = std::make_unique<LetStatementNode>();
    letStmt->identifier = id;
    letStmt->value = val;
    return letStmt;
}

bool Parser::isAtEnd() const {
    return current >= tokens.size();
}

std::unique_ptr<ContractDef> Parser::parse_contract() {
    auto contract = std::make_unique<ContractDef>();
    
    // 解析合约关键字
    if (!match("contract")) {
        throw std::runtime_error("Expected 'contract' keyword");
    }
    
    // 解析协议名称
    if (peek().type != TokenType::IDENTIFIER) {
        throw std::runtime_error("Expected protocol name");
    }
    contract->protocol_name = advance().value;
    
    // 解析版本（可选）
    if (match("version")) {
        if (peek().type == TokenType::STRING) {
            contract->version = advance().value;
        }
    }
    
    // 解析所有者（可选）
    if (match("owner")) {
        if (peek().type == TokenType::STRING) {
            contract->owner = advance().value;
        }
    }
    
    // 解析状态
    if (match("state")) {
        contract->state = parse_state();
    }
    
    // 解析方法
    while (peek().type != TokenType::END) {
        if (match("func")) {
            contract->methods.push_back(parse_method());
        } else {
            break;
        }
    }
    
    return contract;
}

StateDef Parser::parse_state() {
    StateDef state;
    
    // 解析状态变量
    while (peek().type == TokenType::IDENTIFIER) {
        auto var = parse_variable();
        state.variables[var.name] = var;
    }
    
    return state;
}

MethodDef Parser::parse_method() {
    MethodDef method;
    
    // 解析方法名
    if (peek().type != TokenType::IDENTIFIER) {
        throw std::runtime_error("Expected method name");
    }
    method.name = advance().value;
    
    // 解析参数（简化实现）
    if (peek().type == TokenType::LPAREN) {
        advance(); // 跳过 '('
        while (peek().type != TokenType::RPAREN) {
            if (peek().type == TokenType::IDENTIFIER) {
                method.params.push_back(advance().value);
            }
            if (peek().type == TokenType::COMMA) {
                advance();
            }
        }
        if (peek().type == TokenType::RPAREN) {
            advance(); // 跳过 ')'
        }
    }
    
    // 解析方法逻辑（简化实现）
    if (peek().type == TokenType::LBRACE) {
        advance(); // 跳过 '{'
        std::string logic;
        while (peek().type != TokenType::RBRACE) {
            logic += advance().value + " ";
        }
        method.logic = logic;
        if (peek().type == TokenType::RBRACE) {
            advance(); // 跳过 '}'
        }
    }
    
    return method;
}

VariableDef Parser::parse_variable() {
    VariableDef var;
    
    // 解析变量名
    if (peek().type != TokenType::IDENTIFIER) {
        throw std::runtime_error("Expected variable name");
    }
    var.name = advance().value;
    
    // 解析类型
    if (peek().type != TokenType::KEYWORD_STRING && peek().type != TokenType::KEYWORD_INT) {
        throw std::runtime_error("Expected variable type");
    }
    var.type = advance().value;
    
    // 解析默认值（可选）
    if (match("=")) {
        if (peek().type == TokenType::NUMBER || peek().type == TokenType::STRING) {
            var.default_value = advance().value;
        }
    }
    
    return var;
}

} // namespace cardity 