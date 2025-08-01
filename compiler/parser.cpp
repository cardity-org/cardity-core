#include "parser.h"
#include <stdexcept>
#include <cctype>

namespace cardity {

Parser::Parser(const std::string& source) 
    : source(source), pos(0), current(0) {
    // 初始化词法分析器并获取 tokens
    Lexer lexer(source);
    tokens = lexer.tokenize();
}

char Parser::currentChar() const {
    if (pos >= source.length()) {
        return '\0';
    }
    return source[pos];
}

char Parser::peekChar() const {
    if (pos + 1 >= source.length()) {
        return '\0';
    }
    return source[pos + 1];
}

void Parser::advance() {
    if (!isAtEnd()) {
        pos++;
    }
}

bool Parser::isAtEnd() const {
    return pos >= source.length();
}

void Parser::consume(char expected, const std::string& message) {
    if (currentChar() == expected) {
        advance();
    } else {
        throw ParseError(message);
    }
}

void Parser::skipWhitespace() {
    while (std::isspace(currentChar())) {
        advance();
    }
}

std::string Parser::parseIdentifier() {
    std::string result;
    while (std::isalnum(currentChar()) || currentChar() == '_') {
        result += currentChar();
        advance();
    }
    return result;
}

std::string Parser::parseString() {
    consume('"', "Expected '\"' at start of string");
    std::string result;
    while (currentChar() != '"' && !isAtEnd()) {
        result += currentChar();
        advance();
    }
    consume('"', "Expected '\"' at end of string");
    return result;
}

std::shared_ptr<ContractNode> Parser::parse() {
    skipWhitespace();
    return parseContract();
}

std::shared_ptr<ContractNode> Parser::parseContract() {
    // 解析 "contract" 关键字
    std::string keyword = parseIdentifier();
    if (keyword != "contract") {
        throw ParseError("Expected 'contract' keyword");
    }
    
    skipWhitespace();
    
    // 解析合约名称
    std::string name = parseIdentifier();
    if (name.empty()) {
        throw ParseError("Expected contract name");
    }
    
    skipWhitespace();
    
    // 解析左大括号
    consume('{', "Expected '{' after contract name");
    
    auto contract = std::make_shared<ContractNode>();
    contract->name = name;
    
    skipWhitespace();
    
    // 解析合约内容（状态和函数）
    while (currentChar() != '}' && !isAtEnd()) {
        std::string section = parseIdentifier();
        
        if (section == "state") {
            contract->state = parseState();
        } else if (section == "func") {
            contract->functions.push_back(parseMethod());
        } else {
            throw ParseError("Expected 'state' or 'func'");
        }
        
        skipWhitespace();
    }
    
    // 解析右大括号
    consume('}', "Expected '}' at end of contract");
    
    return contract;
}

std::shared_ptr<StateNode> Parser::parseState() {
    skipWhitespace();
    consume('{', "Expected '{' after 'state'");
    
    auto state = std::make_shared<StateNode>();
    
    skipWhitespace();
    
    // 解析状态变量
    while (currentChar() != '}' && !isAtEnd()) {
        std::string varName = parseIdentifier();
        skipWhitespace();
        consume(':', "Expected ':' after variable name");
        skipWhitespace();
        
        auto type = parseType();
        skipWhitespace();
        
        std::shared_ptr<ExpressionNode> initialValue = nullptr;
        if (currentChar() == '=') {
            advance(); // 跳过 '='
            skipWhitespace();
            initialValue = parseExpression();
        }
        
        auto var = std::make_shared<StateVariableNode>(varName, type, initialValue);
        state->variables.push_back(var);
        
        skipWhitespace();
        consume(';', "Expected ';' after variable declaration");
        skipWhitespace();
    }
    
    consume('}', "Expected '}' at end of state");
    
    return state;
}

std::shared_ptr<FunctionNode> Parser::parseMethod() {
    skipWhitespace();
    
    // 解析函数名
    std::string name = parseIdentifier();
    if (name.empty()) {
        throw ParseError("Expected function name");
    }
    
    skipWhitespace();
    consume('(', "Expected '(' after function name");
    
    auto func = std::make_shared<FunctionNode>();
    func->name = name;
    
    skipWhitespace();
    
    // 解析参数（简化实现，暂时跳过）
    while (currentChar() != ')' && !isAtEnd()) {
        // 跳过参数
        while (currentChar() != ',' && currentChar() != ')' && !isAtEnd()) {
            advance();
        }
        if (currentChar() == ',') {
            advance();
            skipWhitespace();
        }
    }
    
    consume(')', "Expected ')' after parameters");
    skipWhitespace();
    consume(':', "Expected ':' after parameters");
    skipWhitespace();
    
    // 解析返回类型
    func->return_type = parseType();
    
    skipWhitespace();
    consume('{', "Expected '{' before function body");
    
    skipWhitespace();
    
    // 解析函数体（简化实现）
    while (currentChar() != '}' && !isAtEnd()) {
        // 跳过函数体内容
        advance();
    }
    
    consume('}', "Expected '}' at end of function");
    
    return func;
}

std::shared_ptr<ExpressionNode> Parser::parseExpression() {
    skipWhitespace();
    
    // 简化实现：只解析基本表达式
    if (std::isdigit(currentChar())) {
        // 解析数字
        std::string num;
        while (std::isdigit(currentChar())) {
            num += currentChar();
            advance();
        }
        return std::make_shared<LiteralNode>(std::stoi(num));
    } else if (currentChar() == '"') {
        // 解析字符串
        std::string str = parseString();
        return std::make_shared<LiteralNode>(str);
    } else if (std::isalpha(currentChar())) {
        // 解析标识符
        std::string id = parseIdentifier();
        return std::make_shared<IdentifierNode>(id);
    }
    
    throw ParseError("Unexpected character in expression");
}

std::shared_ptr<TypeNode> Parser::parseType() {
    std::string typeName = parseIdentifier();
    
    if (typeName == "int") {
        return std::make_shared<TypeNode>(TypeNode::Type::INT);
    } else if (typeName == "string") {
        return std::make_shared<TypeNode>(TypeNode::Type::STRING);
    } else if (typeName == "bool") {
        return std::make_shared<TypeNode>(TypeNode::Type::BOOL);
    } else if (typeName == "void") {
        return std::make_shared<TypeNode>(TypeNode::Type::VOID);
    }
    
    throw ParseError("Unknown type: " + typeName);
}

} // namespace cardity 