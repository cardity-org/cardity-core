#include "lexer.h"
#include <cctype>
#include <unordered_set>

namespace cardity {

Lexer::Lexer(const std::string& source) 
    : source(source), position(0), line(1), column(1) {}

char Lexer::current_char() const {
    if (position >= source.length()) {
        return '\0';
    }
    return source[position];
}

char Lexer::peek() const {
    if (position + 1 >= source.length()) {
        return '\0';
    }
    return source[position + 1];
}

void Lexer::advance() {
    if (current_char() == '\n') {
        line++;
        column = 1;
    } else {
        column++;
    }
    position++;
}

void Lexer::skip_whitespace() {
    while (std::isspace(current_char())) {
        advance();
    }
}

void Lexer::skip_comment() {
    if (current_char() == '/' && peek() == '/') {
        while (current_char() != '\n' && current_char() != '\0') {
            advance();
        }
    }
}

Token Lexer::read_identifier() {
    size_t start = position;
    while (std::isalnum(current_char()) || current_char() == '_') {
        advance();
    }
    
    std::string value = source.substr(start, position - start);
    TokenType type = is_keyword(value) ? TokenType::Keyword : TokenType::Identifier;
    
    return Token{type, value, static_cast<int>(line), static_cast<int>(column - value.length())};
}

Token Lexer::read_number() {
    size_t start = position;
    while (std::isdigit(current_char())) {
        advance();
    }
    
    std::string value = source.substr(start, position - start);
    return Token{TokenType::Number, value, static_cast<int>(line), static_cast<int>(column - value.length())};
}

Token Lexer::read_string() {
    advance(); // 跳过开始的引号
    size_t start = position;
    
    while (current_char() != '"' && current_char() != '\0') {
        if (current_char() == '\\') {
            advance(); // 跳过转义字符
        }
        advance();
    }
    
    if (current_char() == '\0') {
        return Token{TokenType::EndOfFile, "Unterminated string", static_cast<int>(line), static_cast<int>(column)};
    }
    
    std::string value = source.substr(start, position - start);
    advance(); // 跳过结束的引号
    
    return Token{TokenType::String, value, static_cast<int>(line), static_cast<int>(column - value.length() - 2)};
}

Token Lexer::read_symbol() {
    char c = current_char();
    advance();
    return Token{TokenType::Symbol, std::string(1, c), static_cast<int>(line), static_cast<int>(column - 1)};
}

bool Lexer::is_keyword(const std::string& word) const {
    static const std::unordered_set<std::string> keywords = {
        "contract", "state", "func", "return", "void", "int", "string", "bool", "true", "false"
    };
    
    return keywords.find(word) != keywords.end();
}

Token Lexer::next_token() {
    skip_whitespace();
    skip_comment();
    
    if (current_char() == '\0') {
        return Token{TokenType::EndOfFile, "", static_cast<int>(line), static_cast<int>(column)};
    }
    
    char c = current_char();
    
    // 标识符和关键字
    if (std::isalpha(c) || c == '_') {
        return read_identifier();
    }
    
    // 数字
    if (std::isdigit(c)) {
        return read_number();
    }
    
    // 字符串
    if (c == '"') {
        return read_string();
    }
    
    // 符号
    return read_symbol();
}

std::vector<Token> Lexer::tokenize() {
    std::vector<Token> tokens;
    reset();
    
    while (has_more()) {
        Token token = next_token();
        tokens.push_back(token);
        
        if (token.type == TokenType::EndOfFile) {
            break;
        }
    }
    
    return tokens;
}

bool Lexer::has_more() const {
    return position < source.length();
}

void Lexer::reset() {
    position = 0;
    line = 1;
    column = 1;
}

} // namespace cardity 