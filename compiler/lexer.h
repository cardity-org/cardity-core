#pragma once

#include <string>
#include <vector>
#include <memory>

namespace cardity {

// Token 类型枚举
enum class TokenType {
    // 关键字
    CONTRACT,
    STATE,
    FUNC,
    RETURN,
    VOID,
    INT,
    STRING,
    BOOL,
    
    // 标识符和字面量
    IDENTIFIER,
    INT_LITERAL,
    STRING_LITERAL,
    BOOL_LITERAL,
    
    // 运算符
    ASSIGN,      // =
    PLUS,        // +
    MINUS,       // -
    MULTIPLY,    // *
    DIVIDE,      // /
    
    // 分隔符
    SEMICOLON,   // ;
    COMMA,       // ,
    DOT,         // .
    COLON,       // :
    
    // 括号
    LEFT_BRACE,  // {
    RIGHT_BRACE, // }
    LEFT_PAREN,  // (
    RIGHT_PAREN, // )
    
    // 特殊
    END_OF_FILE,
    ERROR
};

// Token 结构
struct Token {
    TokenType type;
    std::string value;
    int line;
    int column;
    
    Token(TokenType t, const std::string& v, int l, int c)
        : type(t), value(v), line(l), column(c) {}
};

// 词法分析器类
class Lexer {
private:
    std::string source;
    size_t position;
    size_t line;
    size_t column;
    
    char current_char() const;
    void advance();
    void skip_whitespace();
    void skip_comment();
    
    Token read_identifier();
    Token read_number();
    Token read_string();
    
    TokenType get_keyword_type(const std::string& word) const;

public:
    explicit Lexer(const std::string& source);
    
    Token next_token();
    std::vector<Token> tokenize();
    
    bool has_more() const;
    void reset();
};

} // namespace cardity 