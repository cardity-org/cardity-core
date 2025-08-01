#include "lexer.h"
#include <cctype>
#include <unordered_map>

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
    TokenType type = get_keyword_type(value);
    
    return Token(type, value, line, column - value.length());
}

Token Lexer::read_number() {
    size_t start = position;
    while (std::isdigit(current_char())) {
        advance();
    }
    
    std::string value = source.substr(start, position - start);
    return Token(TokenType::INT_LITERAL, value, line, column - value.length());
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
        return Token(TokenType::ERROR, "Unterminated string", line, column);
    }
    
    std::string value = source.substr(start, position - start);
    advance(); // 跳过结束的引号
    
    return Token(TokenType::STRING_LITERAL, value, line, column - value.length() - 2);
}

TokenType Lexer::get_keyword_type(const std::string& word) const {
    static const std::unordered_map<std::string, TokenType> keywords = {
        {"contract", TokenType::CONTRACT},
        {"state", TokenType::STATE},
        {"func", TokenType::FUNC},
        {"return", TokenType::RETURN},
        {"void", TokenType::VOID},
        {"int", TokenType::INT},
        {"string", TokenType::STRING},
        {"bool", TokenType::BOOL},
        {"true", TokenType::BOOL_LITERAL},
        {"false", TokenType::BOOL_LITERAL}
    };
    
    auto it = keywords.find(word);
    return (it != keywords.end()) ? it->second : TokenType::IDENTIFIER;
}

Token Lexer::next_token() {
    skip_whitespace();
    skip_comment();
    
    if (current_char() == '\0') {
        return Token(TokenType::END_OF_FILE, "", line, column);
    }
    
    char c = current_char();
    int current_column = column;
    
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
    
    // 运算符和分隔符
    switch (c) {
        case '=':
            advance();
            return Token(TokenType::ASSIGN, "=", line, current_column);
        case '+':
            advance();
            return Token(TokenType::PLUS, "+", line, current_column);
        case '-':
            advance();
            return Token(TokenType::MINUS, "-", line, current_column);
        case '*':
            advance();
            return Token(TokenType::MULTIPLY, "*", line, current_column);
        case '/':
            advance();
            return Token(TokenType::DIVIDE, "/", line, current_column);
        case ';':
            advance();
            return Token(TokenType::SEMICOLON, ";", line, current_column);
        case ',':
            advance();
            return Token(TokenType::COMMA, ",", line, current_column);
        case '.':
            advance();
            return Token(TokenType::DOT, ".", line, current_column);
        case ':':
            advance();
            return Token(TokenType::COLON, ":", line, current_column);
        case '{':
            advance();
            return Token(TokenType::LEFT_BRACE, "{", line, current_column);
        case '}':
            advance();
            return Token(TokenType::RIGHT_BRACE, "}", line, current_column);
        case '(':
            advance();
            return Token(TokenType::LEFT_PAREN, "(", line, current_column);
        case ')':
            advance();
            return Token(TokenType::RIGHT_PAREN, ")", line, current_column);
        default:
            advance();
            return Token(TokenType::ERROR, std::string(1, c), line, current_column);
    }
}

std::vector<Token> Lexer::tokenize() {
    std::vector<Token> tokens;
    reset();
    
    while (has_more()) {
        Token token = next_token();
        tokens.push_back(token);
        
        if (token.type == TokenType::END_OF_FILE || token.type == TokenType::ERROR) {
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