#pragma once

#include <string>
#include <vector>
#include "parser.h"

namespace cardity {

// 词法分析器类
class Lexer {
private:
    std::string source;
    size_t position;
    size_t line;
    size_t column;
    
    char current_char() const;
    char peek() const;
    void advance();
    void skip_whitespace();
    void skip_comment();
    
    Token read_identifier();
    Token read_number();
    Token read_string();
    Token read_symbol();
    
    bool is_keyword(const std::string& word) const;

public:
    explicit Lexer(const std::string& source);
    
    Token next_token();
    std::vector<Token> tokenize();
    
    bool has_more() const;
    void reset();
};

} // namespace cardity 