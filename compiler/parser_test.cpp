#include "parser.h"
#include "tokenizer.h"
#include <iostream>
#include <iomanip>

namespace cardity {

void print_protocol_ast(const ProtocolAST& ast) {
    std::cout << "\n📋 Protocol AST:" << std::endl;
    std::cout << "=================" << std::endl;
    std::cout << "Name: " << ast.protocol_name << std::endl;
    std::cout << "Version: " << ast.version << std::endl;
    std::cout << "Owner: " << ast.owner << std::endl;
    
    std::cout << "\n🏗️ State Variables (" << ast.state_variables.size() << "):" << std::endl;
    for (const auto& var : ast.state_variables) {
        std::cout << "  - " << var.name << ": " << var.type;
        if (!var.default_value.empty()) {
            std::cout << " = " << var.default_value;
        }
        std::cout << std::endl;
    }
    
    std::cout << "\n🔧 Methods (" << ast.methods.size() << "):" << std::endl;
    for (const auto& method : ast.methods) {
        std::cout << "  - " << method.name << "(";
        for (size_t i = 0; i < method.params.size(); i++) {
            if (i > 0) std::cout << ", ";
            std::cout << method.params[i];
        }
        std::cout << ")" << std::endl;
        std::cout << "    Logic: " << method.logic << std::endl;
    }
}

void test_parser(const std::string& source, const std::string& test_name) {
    std::cout << "\n🧪 Testing Parser: " << test_name << std::endl;
    std::cout << "Source:" << std::endl;
    std::cout << "```cardity" << std::endl;
    std::cout << source << std::endl;
    std::cout << "```" << std::endl;
    
    try {
        Tokenizer tokenizer(source);
        Parser parser(tokenizer);
        ProtocolAST ast = parser.parse_protocol();
        
        print_protocol_ast(ast);
        std::cout << "\n✅ Successfully parsed protocol!" << std::endl;
        
    } catch (const std::exception& e) {
        std::cout << "\n❌ Parse Error: " << e.what() << std::endl;
    }
}

} // namespace cardity

int main() {
    std::cout << "🌳 Cardity Parser Test Suite" << std::endl;
    std::cout << "============================" << std::endl;
    
    // 测试简单协议
    cardity::test_parser(
        "protocol simple {\n"
        "  version: \"1.0\";\n"
        "  owner: \"doge1simple...\";\n"
        "  state {\n"
        "    message: string = \"Hello\";\n"
        "  }\n"
        "  method get_message() {\n"
        "    return state.message;\n"
        "  }\n"
        "}",
        "Simple Protocol"
    );
    
    // 测试复杂协议
    cardity::test_parser(
        "protocol counter {\n"
        "  version: \"1.0\";\n"
        "  owner: \"doge1counter...\";\n"
        "  state {\n"
        "    count: int = 0;\n"
        "    name: string = \"Counter\";\n"
        "    active: bool = true;\n"
        "  }\n"
        "  method increment() {\n"
        "    state.count = state.count + 1;\n"
        "  }\n"
        "  method decrement() {\n"
        "    state.count = state.count - 1;\n"
        "  }\n"
        "  method set_count(value) {\n"
        "    state.count = value;\n"
        "  }\n"
        "  method get_count() {\n"
        "    return state.count;\n"
        "  }\n"
        "}",
        "Complex Counter Protocol"
    );
    
    // 测试错误情况
    cardity::test_parser(
        "protocol invalid {\n"
        "  version: \"1.0\";\n"
        "  state {\n"
        "    count: int = 0\n"
        "  }\n"
        "}",
        "Invalid Syntax (Missing Semicolon)"
    );
    
    // 测试嵌套结构
    cardity::test_parser(
        "protocol nested {\n"
        "  version: \"1.0\";\n"
        "  owner: \"doge1nested...\";\n"
        "  state {\n"
        "    data: string = \"nested\";\n"
        "  }\n"
        "  method complex_method(param1, param2) {\n"
        "    state.data = param2;\n"
        "    return state.data;\n"
        "  }\n"
        "}",
        "Nested Structures"
    );
    
    std::cout << "\n🎉 Parser test suite completed!" << std::endl;
    return 0;
} 