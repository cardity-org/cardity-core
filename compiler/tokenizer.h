#pragma once
#include <string>
#include <vector>

namespace cardity {

enum class TokenType {
    Identifier,
    Keyword,
    Number,
    String,
    LBrace,
    RBrace,
    LParen,
    RParen,
    LBracket,
    RBracket,
    Colon,
    Comma,
    Equal,
    Arrow,
    Newline,
    EndOfFile,
    Unknown
};

struct Token {
    TokenType type;
    std::string value;
    int line;
    int column;
};

class Tokenizer {
public:
    explicit Tokenizer(const std::string& input);

    Token nextToken();
    Token peekToken() const;
    bool hasMoreTokens() const;

private:
    void skipWhitespace();
    void skipComment();
    Token parseIdentifier();
    Token parseNumber();
    Token parseString();
    char currentChar() const;
    char peekChar() const;
    void advance();
    bool isAlpha(char c) const;
    bool isDigit(char c) const;
    bool isAlnum(char c) const;

    std::string _input;
    size_t _position;
    int _line;
    int _column;
};

} // namespace cardity 