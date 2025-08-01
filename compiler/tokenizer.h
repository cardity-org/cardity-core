#pragma once
#include <string>
#include <vector>

namespace cardity {

enum class TokenType {
    // 关键字
    KEYWORD_CONTRACT,
    KEYWORD_STATE,
    KEYWORD_STRING,
    KEYWORD_INT,
    KEYWORD_DEFAULT,
    KEYWORD_METHOD,
    KEYWORD_PARAMS,
    KEYWORD_RETURNS,
    KEYWORD_OWNER,
    
    // 标识符和字面量
    IDENTIFIER,
    NUMBER,
    STRING,
    
    // 符号
    EQUAL,
    COLON,
    SEMICOLON,
    LBRACE,
    RBRACE,
    LPAREN,
    RPAREN,
    LBRACKET,
    RBRACKET,
    COMMA,
    
    // 特殊
    END,
    UNKNOWN
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

    Token next_token();
    bool has_more_tokens() const;

private:
    std::string source;
    size_t pos;
};

} // namespace cardity 