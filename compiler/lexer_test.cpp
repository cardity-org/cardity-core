#include "tokenizer.h"
#include <iostream>
#include <iomanip>

namespace cardity {

void print_token(const Token& token) {
    std::cout << std::setw(20) << std::left;
    
    switch (token.type) {
        case TokenType::KEYWORD_PROTOCOL: std::cout << "KEYWORD_PROTOCOL"; break;
        case TokenType::KEYWORD_STATE: std::cout << "KEYWORD_STATE"; break;
        case TokenType::KEYWORD_METHOD: std::cout << "KEYWORD_METHOD"; break;
        case TokenType::KEYWORD_VERSION: std::cout << "KEYWORD_VERSION"; break;
        case TokenType::KEYWORD_OWNER: std::cout << "KEYWORD_OWNER"; break;
        case TokenType::KEYWORD_RETURN: std::cout << "KEYWORD_RETURN"; break;
        case TokenType::KEYWORD_STRING: std::cout << "KEYWORD_STRING"; break;
        case TokenType::KEYWORD_INT: std::cout << "KEYWORD_INT"; break;
        case TokenType::KEYWORD_BOOL: std::cout << "KEYWORD_BOOL"; break;
        case TokenType::KEYWORD_TRUE: std::cout << "KEYWORD_TRUE"; break;
        case TokenType::KEYWORD_FALSE: std::cout << "KEYWORD_FALSE"; break;
        case TokenType::IDENTIFIER: std::cout << "IDENTIFIER"; break;
        case TokenType::NUMBER: std::cout << "NUMBER"; break;
        case TokenType::STRING: std::cout << "STRING"; break;
        case TokenType::BOOLEAN: std::cout << "BOOLEAN"; break;
        case TokenType::EQUAL: std::cout << "EQUAL"; break;
        case TokenType::COLON: std::cout << "COLON"; break;
        case TokenType::SEMICOLON: std::cout << "SEMICOLON"; break;
        case TokenType::LBRACE: std::cout << "LBRACE"; break;
        case TokenType::RBRACE: std::cout << "RBRACE"; break;
        case TokenType::LPAREN: std::cout << "LPAREN"; break;
        case TokenType::RPAREN: std::cout << "RPAREN"; break;
        case TokenType::COMMA: std::cout << "COMMA"; break;
        case TokenType::DOT: std::cout << "DOT"; break;
        case TokenType::PLUS: std::cout << "PLUS"; break;
        case TokenType::MINUS: std::cout << "MINUS"; break;
        case TokenType::MULTIPLY: std::cout << "MULTIPLY"; break;
        case TokenType::DIVIDE: std::cout << "DIVIDE"; break;
        case TokenType::NOT: std::cout << "NOT"; break;
        case TokenType::END_OF_FILE: std::cout << "END_OF_FILE"; break;
        case TokenType::UNKNOWN: std::cout << "UNKNOWN"; break;
    }
    
    std::cout << " | " << std::setw(15) << std::left << token.value;
    std::cout << " | " << std::setw(3) << token.line << ":" << std::setw(3) << token.column;
    std::cout << std::endl;
}

void test_lexer(const std::string& source, const std::string& test_name) {
    std::cout << "\n🧪 Testing: " << test_name << std::endl;
    std::cout << "Source: " << source << std::endl;
    std::cout << std::string(80, '-') << std::endl;
    std::cout << std::setw(20) << std::left << "Token Type" 
              << " | " << std::setw(15) << std::left << "Value" 
              << " | " << std::setw(7) << std::left << "Position" << std::endl;
    std::cout << std::string(80, '-') << std::endl;
    
    try {
        Tokenizer tokenizer(source);
        int token_count = 0;
        
        while (tokenizer.has_more_tokens()) {
            Token token = tokenizer.next_token();
            print_token(token);
            token_count++;
            
            if (token.type == TokenType::END_OF_FILE) {
                break;
            }
        }
        
        std::cout << std::string(80, '-') << std::endl;
        std::cout << "✅ Successfully tokenized " << token_count << " tokens" << std::endl;
        
    } catch (const std::exception& e) {
        std::cout << "❌ Error: " << e.what() << std::endl;
    }
}

} // namespace cardity

int main() {
    std::cout << "🔤 Cardity Lexer Test Suite" << std::endl;
    std::cout << "==========================" << std::endl;
    
    // 测试基本关键字
    cardity::test_lexer("protocol state method", "Basic Keywords");
    
    // 测试标识符
    cardity::test_lexer("hello_world counter123 _private", "Identifiers");
    
    // 测试字符串
    cardity::test_lexer("\"Hello, World!\" \"doge1abc...\"", "String Literals");
    
    // 测试数字
    cardity::test_lexer("42 0 -123", "Numbers");
    
    // 测试符号
    cardity::test_lexer("{ } ( ) : ; = , . + - * / !", "Symbols");
    
    // 测试布尔值
    cardity::test_lexer("true false", "Boolean Literals");
    
    // 测试复杂表达式
    cardity::test_lexer("state.count = state.count + 1;", "Complex Expression");
    
    // 测试多行代码
    cardity::test_lexer(
        "protocol counter {\n"
        "  version: \"1.0\";\n"
        "  state {\n"
        "    count: int = 0;\n"
        "  }\n"
        "}", 
        "Multi-line Protocol"
    );
    
    // 测试错误情况
    cardity::test_lexer("hello @ world", "Invalid Character");
    
    std::cout << "\n🎉 Lexer test suite completed!" << std::endl;
    return 0;
} 