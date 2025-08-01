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
    
    // 操作符
    PLUS,
    MINUS,
    MULTIPLY,
    DIVIDE,
    NOT,
    GREATER_THAN,
    LESS_THAN,
    GREATER_EQUAL,
    LESS_EQUAL,
    EQUAL_EQUAL,
    NOT_EQUAL,
    
    // 特殊
    END_OF_FILE,
    UNKNOWN
};

struct Token {
    TokenType type;
    std::string value;
    int line;
    int column;
    
    // 构造函数
    Token(TokenType t, const std::string& v, int l, int c) 
        : type(t), value(v), line(l), column(c) {}
    
    // 默认构造函数
    Token() : type(TokenType::UNKNOWN), line(0), column(0) {}
};

class Tokenizer {
public:
    explicit Tokenizer(const std::string& input);

    // 主要方法
    Token next_token();
    bool has_more_tokens() const;
    
    // 调试和错误处理
    std::string get_current_position() const;
    void reset();

private:
    std::string source;
    size_t pos;
    int line;
    int column;
    
    // 私有辅助方法
    void skip_whitespace();
    Token parse_string();
    Token parse_identifier_or_keyword();
    Token parse_number();
    Token parse_symbol();
    bool is_symbol(char c) const;
    bool is_keyword(const std::string& word) const;
    TokenType get_keyword_type(const std::string& word) const;
    
    // 位置跟踪
    void advance_position();
    void advance_position_by(int count);
};

} // namespace cardity 