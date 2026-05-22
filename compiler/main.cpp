#include <iostream>
#include <fstream>
#include <string>
#include <vector>
#include <sstream>
#include "tokenizer.h"
#include "parser.h"
#include "car_generator.h"
#include "car_generator_ast.h"

using namespace cardity;

std::string read_file(const std::string& filename) {
    std::ifstream file(filename);
    if (!file.is_open()) {
        throw std::runtime_error("Cannot open file: " + filename);
    }
    
    std::string content((std::istreambuf_iterator<char>(file)),
                        std::istreambuf_iterator<char>());
    return content;
}

void write_file(const std::string& filename, const std::string& content) {
    std::ofstream file(filename);
    if (!file.is_open()) {
        throw std::runtime_error("Cannot create file: " + filename);
    }
    file << content;
}

// 将新的 ProtocolAST 转换为旧的 AST 结构
std::unique_ptr<Protocol> convert_ast(const ProtocolAST& new_ast) {
    auto protocol = std::make_unique<Protocol>();
    
    // 设置基本信息
    protocol->name = new_ast.protocol_name;
    protocol->metadata.version = new_ast.version;
    protocol->metadata.owner = new_ast.owner;
    
    // 转换状态变量
    for (const auto& var : new_ast.state_variables) {
        StateVariable state_var;
        state_var.name = var.name;
        state_var.type = var.type;
        state_var.default_value = var.default_value;
        protocol->state.variables.push_back(state_var);
    }

    for (const auto& table_ast : new_ast.tables) {
        Table table;
        table.name = table_ast.name;
        for (const auto& column_ast : table_ast.columns) {
            TableColumn column;
            column.name = column_ast.name;
            column.type = column_ast.type;
            column.default_value = column_ast.default_value;
            table.columns.push_back(column);
        }
        protocol->tables.push_back(table);
    }
    
    // 转换方法
    for (const auto& method : new_ast.methods) {
        Method new_method;
        new_method.name = method.name;
        new_method.params = method.params;
        
        // 将逻辑字符串分割为行
        std::istringstream iss(method.logic);
        std::string line;
        while (std::getline(iss, line)) {
            if (!line.empty()) {
                new_method.logic_lines.push_back(line);
            }
        }
        
        protocol->methods.push_back(new_method);
    }
    
    return protocol;
}

int main(int argc, char* argv[]) {
    if (argc < 2) {
        std::cerr << "Usage: cardity_compiler <input.cardity>" << std::endl;
        return 1;
    }

    std::string sourcePath = argv[1];
    
    try {
        // 读取源文件
        std::string source = read_file(sourcePath);
        std::cout << "📖 Reading source file: " << sourcePath << std::endl;
        
        // 词法分析
        std::cout << "🔤 Tokenizing..." << std::endl;
        Tokenizer tokenizer(source);
        std::vector<Token> tokens;
        while (tokenizer.has_more_tokens()) {
            tokens.push_back(tokenizer.next_token());
        }
        std::cout << "   Generated " << tokens.size() << " tokens" << std::endl;
        
        // 语法分析 - 构建 AST
        std::cout << "🌳 Parsing and building AST..." << std::endl;
        Tokenizer parser_tokenizer(source); // 为解析器创建新的 tokenizer 实例
        Parser parser(parser_tokenizer);
        auto new_ast = parser.parse_protocol();
        
        std::cout << "   Protocol: " << new_ast.protocol_name << std::endl;
        std::cout << "   Methods: " << new_ast.methods.size() << std::endl;
        std::cout << "   State variables: " << new_ast.state_variables.size() << std::endl;
        
        // 生成 Cardinals .car JSON（新 AST 流程）
        std::cout << "🔄 Generating Cardinals .car JSON..." << std::endl;
        json car_json = generate_car_json(new_ast);
        std::string outputPath = "output/" + new_ast.protocol_name + ".car";
        write_car_file(car_json, outputPath);
        
        std::cout << "✅ Compiled successfully to " << outputPath << std::endl;
        std::cout << "\n📄 Generated JSON:" << std::endl;
        std::cout << car_json.dump(2) << std::endl;
        
        return 0;
        
    } catch (const std::exception& e) {
        std::cerr << "❌ Error: " << e.what() << std::endl;
        return 1;
    }
} 
