#include "parser.h"
#include "tokenizer.h"
#include <stdexcept>
#include <sstream>
#include <iostream> // Added for std::cout

namespace cardity {

Parser::Parser(Tokenizer& lex) : lexer(lex) {
    current = lexer.next_token();
}

ProtocolAST Parser::parse_protocol() {
    expect("protocol");
    std::string protocol_name = expect_identifier();
    expect("{");

    ProtocolAST ast;
    ast.protocol_name = protocol_name;

    while (current.value != "}" && !is_at_end()) {
        if (match("version")) {
            expect(":");
            ast.version = expect_string();
            expect(";");
        } else if (match("owner")) {
            expect(":");
            ast.owner = expect_string();
            expect(";");
        } else if (match("state")) {
            ast.state_variables = parse_state_block();
        } else if (match("method")) {
            ast.methods.push_back(parse_method());
        } else if (current.value.empty() || current.value == " ") {
            // 跳过空字符串或空格
            advance();
        } else {
            // 跳过未知的 token，继续解析
            std::cout << "Warning: Skipping unknown token: '" << current.value << "'" << std::endl;
            advance();
        }
    }
    expect("}"); // 消费协议块的结束大括号

    return ast;
}

std::string Parser::get_current_position() const {
    return "line " + std::to_string(current.line) + ", column " + std::to_string(current.column);
}

void Parser::reset() {
    lexer.reset();
    current = lexer.next_token();
}

bool Parser::match(const std::string& value) {
    if (current.value == value) {
        advance();
        return true;
    }
    return false;
}

void Parser::expect(const std::string& value) {
    if (current.value != value) {
        error("Expected: " + value + ", got: " + current.value);
    }
    advance();
}

std::string Parser::expect_identifier() {
    if (current.type != TokenType::IDENTIFIER) {
        error("Expected identifier, got: " + current.value);
    }
    std::string val = current.value;
    advance();
    return val;
}

std::string Parser::expect_string() {
    if (current.type != TokenType::STRING) {
        error("Expected string literal, got: " + current.value);
    }
    std::string val = current.value;
    advance();
    return val;
}

std::string Parser::expect_number() {
    if (current.type != TokenType::NUMBER) {
        error("Expected number, got: " + current.value);
    }
    std::string val = current.value;
    advance();
    return val;
}

std::vector<ParserStateVariable> Parser::parse_state_block() {
    std::vector<ParserStateVariable> vars;
    expect("{");
    
    std::cout << "DEBUG: Starting state block parsing" << std::endl;
    
    while (current.value != "}" && !is_at_end()) {
        std::cout << "DEBUG: Current token: '" << current.value << "' at " << get_current_position() << std::endl;
        
        std::string name = expect_identifier();
        expect(":");
        
        // 允许关键字作为类型
        std::string type;
        if (current.type == TokenType::IDENTIFIER || 
            current.type == TokenType::KEYWORD_STRING ||
            current.type == TokenType::KEYWORD_INT ||
            current.type == TokenType::KEYWORD_BOOL) {
            type = current.value;
            advance();
        } else {
            error("Expected type, got: " + current.value);
        }
        
        std::string def = "";
        
        if (match("=")) {
            if (current.type == TokenType::STRING) {
                def = expect_string();
            } else if (current.type == TokenType::NUMBER) {
                def = expect_number();
            } else if (current.type == TokenType::KEYWORD_TRUE || 
                      current.type == TokenType::KEYWORD_FALSE) {
                def = current.value;
                advance();
            } else {
                error("Expected value after '='");
            }
        }
        
        expect(";");
        vars.push_back({name, type, def});
        
        std::cout << "DEBUG: Added state variable: " << name << ":" << type << std::endl;
    }
    
    std::cout << "DEBUG: State block parsing finished, current token: '" << current.value << "'" << std::endl;
    
    if (current.value == "}") {
        advance(); // 消费结束的 }
    } else {
        error("Expected '}' at end of state block");
    }
    
    return vars;
}

std::vector<ParserMethod> Parser::parse_methods_block() {
    std::vector<ParserMethod> methods;
    expect("{");
    
    while (!match("}")) {
        methods.push_back(parse_method());
    }
    
    return methods;
}

ParserMethod Parser::parse_method() {
    std::string name = expect_identifier();
    expect("(");
    
    std::vector<std::string> params = parse_method_params();
    expect(")");
    expect("{");
    
    std::string logic = parse_method_body();
    // parse_method_body() 已经消费了结束的 }，所以这里不需要再消费
    
    return {name, params, logic};
}

std::vector<std::string> Parser::parse_method_params() {
    std::vector<std::string> params;
    
    if (current.value == ")") {
        return params;
    }
    
    while (true) {
        params.push_back(expect_identifier());
        
        if (match(",")) {
            continue;
        } else {
            break;
        }
    }
    
    return params;
}

std::string Parser::parse_method_body() {
    std::string logic;
    int brace_count = 1; // 已经有一个开始的 {
    
    while (brace_count > 0 && !is_at_end()) {
        if (current.value == "{") {
            brace_count++;
        } else if (current.value == "}") {
            brace_count--;
        }
        
        if (brace_count > 0) {
            logic += current.value + " ";
        }
        
        advance();
    }
    
    // 移除末尾的空格
    if (!logic.empty() && logic.back() == ' ') {
        logic.pop_back();
    }
    
    return logic;
}

void Parser::error(const std::string& msg) {
    std::string error_msg = "Parse error: " + msg + " at " + get_current_position();
    throw std::runtime_error(error_msg);
}

void Parser::advance() {
    if (!is_at_end()) {
        current = lexer.next_token();
    }
}

bool Parser::is_at_end() const {
    return current.type == TokenType::END_OF_FILE;
}

Token Parser::peek() const {
    return current;
}

} // namespace cardity 