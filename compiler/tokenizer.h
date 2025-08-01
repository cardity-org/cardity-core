#pragma once
#include <string>
#include <vector>

namespace cardity {

enum class TokenType {
    // 关键字
    KEYWORD_PROTOCOL,
    KEYWORD_STATE,
    KEYWORD_METHOD,
    KEYWORD_VERSION,
    KEYWORD_OWNER,
    KEYWORD_RETURN,
    KEYWORD_STRING,
    KEYWORD_INT,
    KEYWORD_BOOL,
    KEYWORD_TRUE,
    KEYWORD_FALSE,
    
    // 标识符和字面量
    IDENTIFIER,
    NUMBER,
    STRING,
    BOOLEAN,
    
    // 符号
    EQUAL,
    COLON,
    SEMICOLON,
    LBRACE,
    RBRACE,
    LPAREN,
    RPAREN,
    COMMA,
    DOT,
    
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