#ifndef CARDITY_PARSER_H
#define CARDITY_PARSER_H

#include <string>
#include <vector>
#include <memory>
#include "tokenizer.h"
#include "parser_ast.h"

namespace cardity {

// 解析器类定义
class Parser {
public:
    explicit Parser(Tokenizer& lexer);
    
    // 主解析方法
    ProtocolAST parse_protocol();
    
    // 调试和错误处理
    std::string get_current_position() const;
    void reset();

private:
    Tokenizer& lexer;
    Token current;
    
    // 辅助方法
    bool match(const std::string& value);
    void expect(const std::string& value);
    std::string expect_identifier();
    std::string expect_string();
    std::string expect_number();
    
    // 解析方法
    std::vector<ParserStateVariable> parse_state_block();
    std::vector<ParserMethod> parse_methods_block();
    ParserMethod parse_method();
    std::vector<std::string> parse_method_params();
    std::string parse_method_body();
    
    // 跳过 event 块
    void skip_event_block();
    
    // 错误处理
    void error(const std::string& msg);
    void advance();
    bool is_at_end() const;
    Token peek() const;
};

} // namespace cardity

#endif // CARDITY_PARSER_H 