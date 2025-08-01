#include "parser.h"
#include <stdexcept>
#include <cctype>

namespace cardity {

Parser::Parser(const std::vector<Token>& tokens) 
    : tokens(tokens), current(0) {}

const Token& Parser::peek() {
    if (current >= tokens.size()) {
        static Token eof{TokenType::EndOfFile, "", 0, 0};
        return eof;
    }
    return tokens[current];
}

const Token& Parser::advance() {
    if (current < tokens.size()) {
        return tokens[current++];
    }
    static Token eof{TokenType::EndOfFile, "", 0, 0};
    return eof;
}

bool Parser::match(const std::string& keyword) {
    if (peek().type == TokenType::Keyword && peek().value == keyword) {
        advance();
        return true;
    }
    return false;
}

std::unique_ptr<ContractDef> Parser::parse() {
    return parse_contract();
}

std::unique_ptr<ContractDef> Parser::parse_contract() {
    auto contract = std::make_unique<ContractDef>();
    
    // 解析合约关键字
    if (!match("contract")) {
        throw std::runtime_error("Expected 'contract' keyword");
    }
    
    // 解析协议名称
    if (peek().type != TokenType::Identifier) {
        throw std::runtime_error("Expected protocol name");
    }
    contract->protocol_name = advance().value;
    
    // 解析版本（可选）
    if (match("version")) {
        if (peek().type == TokenType::String) {
            contract->version = advance().value;
        }
    }
    
    // 解析所有者（可选）
    if (match("owner")) {
        if (peek().type == TokenType::String) {
            contract->owner = advance().value;
        }
    }
    
    // 解析状态
    if (match("state")) {
        contract->state = parse_state();
    }
    
    // 解析方法
    while (peek().type != TokenType::EndOfFile) {
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
    while (peek().type == TokenType::Identifier) {
        auto var = parse_variable();
        state.variables[var.name] = var;
    }
    
    return state;
}

MethodDef Parser::parse_method() {
    MethodDef method;
    
    // 解析方法名
    if (peek().type != TokenType::Identifier) {
        throw std::runtime_error("Expected method name");
    }
    method.name = advance().value;
    
    // 解析参数（简化实现）
    if (match("(")) {
        while (peek().type != TokenType::Symbol || peek().value != ")") {
            if (peek().type == TokenType::Identifier) {
                method.params.push_back(advance().value);
            }
            if (peek().value == ",") {
                advance();
            }
        }
        if (match(")")) {
            // 参数解析完成
        }
    }
    
    // 解析方法逻辑（简化实现）
    if (match("{")) {
        std::string logic;
        while (peek().type != TokenType::Symbol || peek().value != "}") {
            logic += advance().value + " ";
        }
        method.logic = logic;
        match("}");
    }
    
    return method;
}

VariableDef Parser::parse_variable() {
    VariableDef var;
    
    // 解析变量名
    if (peek().type != TokenType::Identifier) {
        throw std::runtime_error("Expected variable name");
    }
    var.name = advance().value;
    
    // 解析类型
    if (peek().type != TokenType::Keyword) {
        throw std::runtime_error("Expected variable type");
    }
    var.type = advance().value;
    
    // 解析默认值（可选）
    if (match("=")) {
        if (peek().type == TokenType::Number || peek().type == TokenType::String) {
            var.default_value = advance().value;
        }
    }
    
    return var;
}

} // namespace cardity 