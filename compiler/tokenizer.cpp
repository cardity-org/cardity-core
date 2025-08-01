#include "tokenizer.h"
#include <cctype>
#include <stdexcept>
#include <sstream>

namespace cardity {

Tokenizer::Tokenizer(const std::string& input)
    : source(input), pos(0), line(1), column(1) {}

Token Tokenizer::next_token() {
    skip_whitespace();

    if (pos >= source.size()) {
        return Token(TokenType::END_OF_FILE, "", line, column);
    }

    char ch = source[pos];

    // 字符串字面量
    if (ch == '"') {
        return parse_string();
    }

    // 标识符或关键字
    if (std::isalpha(ch) || ch == '_') {
        return parse_identifier_or_keyword();
    }

    // 数字
    if (std::isdigit(ch)) {
        return parse_number();
    }

    // 符号
    if (is_symbol(ch)) {
        return parse_symbol();
    }

    // 未知字符
    std::string error_msg = "Unknown character: " + std::string(1, ch);
    error_msg += " at line " + std::to_string(line) + ", column " + std::to_string(column);
    throw std::runtime_error(error_msg);
}

bool Tokenizer::has_more_tokens() const {
    return pos < source.size();
}

std::string Tokenizer::get_current_position() const {
    std::ostringstream oss;
    oss << "line " << line << ", column " << column;
    return oss.str();
}

void Tokenizer::reset() {
    pos = 0;
    line = 1;
    column = 1;
}

void Tokenizer::skip_whitespace() {
    while (pos < source.size() && std::isspace(source[pos])) {
        if (source[pos] == '\n') {
            line++;
            column = 1;
        } else {
            column++;
        }
        pos++;
    }
}

Token Tokenizer::parse_string() {
    int start_line = line;
    int start_column = column;
    
    advance_position(); // 跳过开始的引号
    
    size_t start = pos;
    while (pos < source.size() && source[pos] != '"') {
        if (source[pos] == '\n') {
            line++;
            column = 1;
        } else {
            column++;
        }
        pos++;
    }
    
    if (pos >= source.size()) {
        std::string error_msg = "Unterminated string literal at " + get_current_position();
        throw std::runtime_error(error_msg);
    }
    
    std::string value = source.substr(start, pos - start);
    advance_position(); // 跳过结束的引号
    
    return Token(TokenType::STRING, value, start_line, start_column);
}

Token Tokenizer::parse_identifier_or_keyword() {
    int start_line = line;
    int start_column = column;
    
    size_t start = pos;
    while (pos < source.size() && (std::isalnum(source[pos]) || source[pos] == '_')) {
        advance_position();
    }
    
    std::string word = source.substr(start, pos - start);
    
    // 检查是否是关键字
    if (is_keyword(word)) {
        return Token(get_keyword_type(word), word, start_line, start_column);
    }
    
    return Token(TokenType::IDENTIFIER, word, start_line, start_column);
}

Token Tokenizer::parse_number() {
    int start_line = line;
    int start_column = column;
    
    size_t start = pos;
    while (pos < source.size() && std::isdigit(source[pos])) {
        advance_position();
    }
    
    std::string value = source.substr(start, pos - start);
    return Token(TokenType::NUMBER, value, start_line, start_column);
}

Token Tokenizer::parse_symbol() {
    int start_line = line;
    int start_column = column;
    
    char ch = source[pos];
    std::string value(1, ch);
    advance_position();
    
    // 检查双字符操作符
    if (pos < source.size()) {
        char next_ch = source[pos];
        std::string two_char = value + next_ch;
        
        if (two_char == "==") {
            advance_position();
            return Token(TokenType::EQUAL_EQUAL, two_char, start_line, start_column);
        } else if (two_char == "!=") {
            advance_position();
            return Token(TokenType::NOT_EQUAL, two_char, start_line, start_column);
        } else if (two_char == ">=") {
            advance_position();
            return Token(TokenType::GREATER_EQUAL, two_char, start_line, start_column);
        } else if (two_char == "<=") {
            advance_position();
            return Token(TokenType::LESS_EQUAL, two_char, start_line, start_column);
        }
    }
    
    TokenType type;
    switch (ch) {
        case '=': type = TokenType::EQUAL; break;
        case ':': type = TokenType::COLON; break;
        case ';': type = TokenType::SEMICOLON; break;
        case '{': type = TokenType::LBRACE; break;
        case '}': type = TokenType::RBRACE; break;
        case '(': type = TokenType::LPAREN; break;
        case ')': type = TokenType::RPAREN; break;
        case ',': type = TokenType::COMMA; break;
        case '.': type = TokenType::DOT; break;
        case '+': type = TokenType::PLUS; break;
        case '-': type = TokenType::MINUS; break;
        case '*': type = TokenType::MULTIPLY; break;
        case '/': type = TokenType::DIVIDE; break;
        case '!': type = TokenType::NOT; break;
        case '>': type = TokenType::GREATER_THAN; break;
        case '<': type = TokenType::LESS_THAN; break;
        default:
            type = TokenType::UNKNOWN;
    }
    
    return Token(type, value, start_line, start_column);
}

bool Tokenizer::is_symbol(char c) const {
    return c == '{' || c == '}' || c == ':' || c == ';' || 
           c == '(' || c == ')' || c == '=' || c == ',' || 
           c == '.' || c == '+' || c == '-' || c == '*' || 
           c == '/' || c == '!' || c == '>' || c == '<';
}

bool Tokenizer::is_keyword(const std::string& word) const {
    return get_keyword_type(word) != TokenType::UNKNOWN;
}

TokenType Tokenizer::get_keyword_type(const std::string& word) const {
    if (word == "protocol") return TokenType::KEYWORD_PROTOCOL;
    if (word == "state") return TokenType::KEYWORD_STATE;
    if (word == "method") return TokenType::KEYWORD_METHOD;
    if (word == "version") return TokenType::KEYWORD_VERSION;
    if (word == "owner") return TokenType::KEYWORD_OWNER;
    if (word == "return") return TokenType::KEYWORD_RETURN;
    if (word == "string") return TokenType::KEYWORD_STRING;
    if (word == "int") return TokenType::KEYWORD_INT;
    if (word == "bool") return TokenType::KEYWORD_BOOL;
    if (word == "true") return TokenType::KEYWORD_TRUE;
    if (word == "false") return TokenType::KEYWORD_FALSE;
    
    return TokenType::UNKNOWN;
}

void Tokenizer::advance_position() {
    if (pos < source.size()) {
        pos++;
        column++;
    }
}

void Tokenizer::advance_position_by(int count) {
    for (int i = 0; i < count && pos < source.size(); i++) {
        advance_position();
    }
}

} // namespace cardity 