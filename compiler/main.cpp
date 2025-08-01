#include <iostream>
#include <fstream>
#include <string>
#include <vector>
#include "tokenizer.h"
#include "parser.h"
#include "car_generator.h"

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

int main(int argc, char* argv[]) {
    if (argc < 2) {
        std::cerr << "Usage: cardity_compiler <input.cardity>" << std::endl;
        return 1;
    }

    std::string sourcePath = argv[1];
    
    try {
        // 读取源文件
        std::string source = read_file(sourcePath);
        
        // 词法分析
        Tokenizer tokenizer(source);
        std::vector<Token> tokens;
        while (tokenizer.hasMoreTokens()) {
            tokens.push_back(tokenizer.nextToken());
        }
        
        // 语法分析
        Parser parser(tokens);
        auto contract = parser.parse();
        
        // 获取合约名称
        std::string contractName = contract->protocol_name;
        
        // 生成 CAR（需要适配新的数据结构）
        // TODO: 更新 CARGenerator 以支持新的 ContractDef 结构
        std::string car_json = "{\"p\":\"cardinals\",\"op\":\"deploy\",\"protocol\":\"" + contractName + "\"}";
        
        // 写入输出文件
        std::string outputPath = "output/" + contractName + ".car";
        write_file(outputPath, car_json);
        
        std::cout << "Compiled successfully to " << outputPath << std::endl;
        return 0;
        
    } catch (const std::exception& e) {
        std::cerr << "Error: " << e.what() << std::endl;
        return 1;
    }
} 