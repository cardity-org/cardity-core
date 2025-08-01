#include "tokenizer.h"
#include <cctype>
#include <unordered_set>

namespace cardity {

Tokenizer::Tokenizer(const std::string& input)
    : _input(input), _position(0), _line(1), _column(1) {}

Token Tokenizer::nextToken() {
    skipWhitespace();
    skipComment();
    
    if (!hasMoreTokens()) {
        return Token{TokenType::EndOfFile, "", _line, _column};
    }
    
    char c = currentChar();
    
    // 标识符和关键字
    if (isAlpha(c) || c == '_') {
        return parseIdentifier();
    }
    
    // 数字
    if (isDigit(c)) {
        return parseNumber();
    }
    
    // 字符串
    if (c == '"') {
        return parseString();
    }
    
    // 符号
    int currentColumn = _column;
    advance();
    
    switch (c) {
        case '{':
            return Token{TokenType::LBrace, "{", _line, currentColumn};
        case '}':
            return Token{TokenType::RBrace, "}", _line, currentColumn};
        case '(':
            return Token{TokenType::LParen, "(", _line, currentColumn};
        case ')':
            return Token{TokenType::RParen, ")", _line, currentColumn};
        case '[':
            return Token{TokenType::LBracket, "[", _line, currentColumn};
        case ']':
            return Token{TokenType::RBracket, "]", _line, currentColumn};
        case ':':
            return Token{TokenType::Colon, ":", _line, currentColumn};
        case ',':
            return Token{TokenType::Comma, ",", _line, currentColumn};
        case '=':
            return Token{TokenType::Equal, "=", _line, currentColumn};
        case '\n':
            return Token{TokenType::Newline, "\n", _line, currentColumn};
        default:
            return Token{TokenType::Unknown, std::string(1, c), _line, currentColumn};
    }
}

Token Tokenizer::peekToken() const {
    // 保存当前状态
    size_t pos = _position;
    int line = _line;
    int col = _column;
    
    // 创建临时 tokenizer 来获取下一个 token
    Tokenizer temp(_input);
    temp._position = pos;
    temp._line = line;
    temp._column = col;
    
    return temp.nextToken();
}

bool Tokenizer::hasMoreTokens() const {
    return _position < _input.length();
}

void Tokenizer::skipWhitespace() {
    while (hasMoreTokens() && std::isspace(currentChar()) && currentChar() != '\n') {
        advance();
    }
}

void Tokenizer::skipComment() {
    if (currentChar() == '/' && peekChar() == '/') {
        while (hasMoreTokens() && currentChar() != '\n') {
            advance();
        }
    }
}

Token Tokenizer::parseIdentifier() {
    size_t start = _position;
    int startColumn = _column;
    
    while (hasMoreTokens() && isAlnum(currentChar())) {
        advance();
    }
    
    std::string value = _input.substr(start, _position - start);
    
    // 检查是否是关键字
    static const std::unordered_set<std::string> keywords = {
        "contract", "state", "func", "return", "void", "int", "string", "bool", "true", "false"
    };
    
    TokenType type = (keywords.find(value) != keywords.end()) ? TokenType::Keyword : TokenType::Identifier;
    
    return Token{type, value, _line, startColumn};
}

Token Tokenizer::parseNumber() {
    size_t start = _position;
    int startColumn = _column;
    
    while (hasMoreTokens() && isDigit(currentChar())) {
        advance();
    }
    
    std::string value = _input.substr(start, _position - start);
    return Token{TokenType::Number, value, _line, startColumn};
}

Token Tokenizer::parseString() {
    advance(); // 跳过开始的引号
    size_t start = _position;
    int startColumn = _column;
    
    while (hasMoreTokens() && currentChar() != '"') {
        if (currentChar() == '\\') {
            advance(); // 跳过转义字符
        }
        advance();
    }
    
    std::string value = _input.substr(start, _position - start);
    
    if (hasMoreTokens()) {
        advance(); // 跳过结束的引号
    }
    
    return Token{TokenType::String, value, _line, startColumn};
}

char Tokenizer::currentChar() const {
    if (_position >= _input.length()) {
        return '\0';
    }
    return _input[_position];
}

char Tokenizer::peekChar() const {
    if (_position + 1 >= _input.length()) {
        return '\0';
    }
    return _input[_position + 1];
}

void Tokenizer::advance() {
    if (currentChar() == '\n') {
        _line++;
        _column = 1;
    } else {
        _column++;
    }
    _position++;
}

bool Tokenizer::isAlpha(char c) const {
    return std::isalpha(c);
}

bool Tokenizer::isDigit(char c) const {
    return std::isdigit(c);
}

bool Tokenizer::isAlnum(char c) const {
    return std::isalnum(c) || c == '_';
}

} // namespace cardity 