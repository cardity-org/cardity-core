#include <iostream>
#include <string>
#include <cstring>
#include <fstream>
#include <sstream>
#include <regex>
#include "car_deployer.h"
#include "parser.h"
#include "tokenizer.h"
#include "car_generator.h"
#include "carc_generator.h"

using namespace cardity;

void print_usage(const std::string& program_name) {
    std::cout << "Cardity Protocol Compiler (cardityc)" << std::endl;
    std::cout << "=====================================" << std::endl;
    std::cout << "Usage: " << program_name << " <input_file> [options]" << std::endl;
    std::cout << std::endl;
    std::cout << "Arguments:" << std::endl;
    std::cout << "  input_file    - Input .car protocol file (programming language format)" << std::endl;
    std::cout << std::endl;
    std::cout << "Options:" << std::endl;
    std::cout << "  -o <output>   - Output file (default: input.carc)" << std::endl;
    std::cout << "  --owner <addr> - Set protocol owner address" << std::endl;
    std::cout << "  --sign <key>  - Sign the protocol with private key" << std::endl;
    std::cout << "  --inscription - Generate inscription format for deployment" << std::endl;
    std::cout << "  --wasm        - Generate WASM module" << std::endl;
    std::cout << "  --validate    - Validate protocol format only" << std::endl;
    std::cout << "  --format <fmt> - Output format: carc (binary), json, car, or wasm" << std::endl;
    std::cout << "  --carc        - Generate .carc binary format (default)" << std::endl;
    std::cout << std::endl;
    std::cout << "Examples:" << std::endl;
    std::cout << "  " << program_name << " protocol.car" << std::endl;
    std::cout << "  " << program_name << " protocol.car -o deployed.carc --owner doge1abc..." << std::endl;
    std::cout << "  " << program_name << " protocol.car --inscription" << std::endl;
    std::cout << "  " << program_name << " protocol.car --validate" << std::endl;
    std::cout << "  " << program_name << " protocol.car --format json" << std::endl;
    std::cout << "  " << program_name << " protocol.car --format carc" << std::endl;
}

// 解析编程语言格式的协议
json parse_programming_language_format(const std::string& content) {
    std::cout << "🔍 Parsing programming language format..." << std::endl;
    
    // 创建词法分析器和解析器
    Tokenizer tokenizer(content);
    Parser parser(tokenizer);
    
    // 解析协议
    ProtocolAST ast = parser.parse_protocol();
    
    std::cout << "✅ Successfully parsed programming language format" << std::endl;
    std::cout << "📋 Protocol: " << ast.protocol_name << std::endl;
    std::cout << "📋 Version: " << ast.version << std::endl;
    std::cout << "📋 Owner: " << ast.owner << std::endl;
    
    // 将 AST 转换为 Protocol 对象
    Protocol protocol;
    protocol.name = ast.protocol_name;
    protocol.metadata.version = ast.version;
    protocol.metadata.owner = ast.owner;
    
    // 转换状态变量
    for (const auto& state_var : ast.state_variables) {
        StateVariable var;
        var.name = state_var.name;
        var.type = state_var.type;
        var.default_value = state_var.default_value;
        protocol.state.variables.push_back(var);
    }
    
    // 转换方法
    for (const auto& method_ast : ast.methods) {
        Method method;
        method.name = method_ast.name;
        method.params = method_ast.params;
        method.logic_lines.push_back(method_ast.logic);
        protocol.methods.push_back(method);
    }
    
    // 使用 CarGenerator 将 Protocol 转换为 JSON
    json car_data = CarGenerator::compile_to_car(protocol);
    
    return car_data;
}

int main(int argc, char* argv[]) {
    if (argc < 2) {
        print_usage(argv[0]);
        return 1;
    }

    std::string input_file = argv[1];
    
    // 检查帮助选项
    if (input_file == "-h" || input_file == "--help") {
        print_usage(argv[0]);
        return 0;
    }
    std::string output_file = "";
    std::string owner_address = "";
    std::string private_key = "";
    std::string output_format = "carc";
    bool generate_inscription = false;
    bool generate_wasm = false;
    bool validate_only = false;
    
    // 解析命令行参数
    for (int i = 2; i < argc; ++i) {
        std::string arg = argv[i];
        
        if (arg == "-o" && i + 1 < argc) {
            output_file = argv[++i];
        } else if (arg == "--owner" && i + 1 < argc) {
            owner_address = argv[++i];
        } else if (arg == "--sign" && i + 1 < argc) {
            private_key = argv[++i];
        } else if (arg == "--format" && i + 1 < argc) {
            output_format = argv[++i];
        } else if (arg == "--carc") {
            output_format = "carc";
        } else if (arg == "--inscription") {
            generate_inscription = true;
        } else if (arg == "--wasm") {
            generate_wasm = true;
        } else if (arg == "--validate") {
            validate_only = true;
        } else if (arg == "-h" || arg == "--help") {
            print_usage(argv[0]);
            return 0;
        } else {
            std::cerr << "Unknown option: " << arg << std::endl;
            print_usage(argv[0]);
            return 1;
        }
    }
    
    // 设置默认输出文件名
    if (output_file.empty()) {
        // 根据输出格式设置默认扩展名
        std::string base_name = input_file;
        size_t dot_pos = base_name.find_last_of('.');
        if (dot_pos != std::string::npos) {
            base_name = base_name.substr(0, dot_pos);
        }
        
        if (output_format == "carc") {
            output_file = base_name + ".carc";
        } else if (output_format == "json") {
            output_file = base_name + ".json";
        } else if (output_format == "car") {
            output_file = base_name + ".car";
        } else {
            output_file = base_name + "." + output_format;
        }
    }
    
    try {
        std::cout << "🔧 Cardity Protocol Compiler" << std::endl;
        std::cout << "============================" << std::endl;
        
        // 读取输入文件
        std::cout << "📖 Reading protocol: " << input_file << std::endl;
        std::ifstream ifs(input_file);
        if (!ifs.is_open()) {
            throw std::runtime_error("Failed to open input file: " + input_file);
        }
        
        std::string content((std::istreambuf_iterator<char>(ifs)),
                           std::istreambuf_iterator<char>());
        
        // 解析编程语言格式
        json car_data = parse_programming_language_format(content);
        
        // 验证格式
        std::cout << "✅ Validating protocol format..." << std::endl;
        if (!CarDeployer::validate_car_format(car_data)) {
            throw std::runtime_error("Invalid .car file format");
        }
        
        if (validate_only) {
            std::cout << "✅ Protocol format is valid!" << std::endl;
            return 0;
        }
        
        // 如果输出格式是 JSON，直接输出
        if (output_format == "json") {
            std::cout << "📝 Outputting JSON format..." << std::endl;
            std::ofstream ofs(output_file);
            ofs << car_data.dump(2) << std::endl;
            std::cout << "✅ JSON output saved to: " << output_file << std::endl;
            return 0;
        }
        
        // 如果输出格式是 CARC，生成二进制格式
        if (output_format == "carc") {
            std::cout << "🔧 Generating .carc binary format..." << std::endl;
            
            // 将 JSON 数据转换回 Protocol 对象
            Protocol protocol;
            protocol.name = car_data["protocol"];
            protocol.metadata.version = car_data["version"];
            protocol.metadata.owner = car_data["cpl"]["owner"];
            
            // 解析状态变量
            json state_json = car_data["cpl"]["state"];
            for (auto it = state_json.begin(); it != state_json.end(); ++it) {
                StateVariable var;
                var.name = it.key();
                var.type = it.value()["type"];
                var.default_value = it.value()["default"];
                protocol.state.variables.push_back(var);
            }
            
            // 解析方法
            json methods_json = car_data["cpl"]["methods"];
            for (auto it = methods_json.begin(); it != methods_json.end(); ++it) {
                Method method;
                method.name = it.key();
                method.params = it.value()["params"].get<std::vector<std::string>>();
                method.logic_lines.push_back(it.value()["logic"]);
                protocol.methods.push_back(method);
            }
            
            // 生成 .carc 二进制数据
            std::vector<uint8_t> carc_data = CarcGenerator::compile_to_carc(protocol);
            
            // 写入文件
            if (CarcGenerator::write_to_file(carc_data, output_file)) {
                std::cout << "✅ .carc binary file saved to: " << output_file << std::endl;
                std::cout << "📊 Binary size: " << carc_data.size() << " bytes" << std::endl;
                std::cout << "📋 Protocol: " << protocol.name << std::endl;
                std::cout << "📋 Version: " << protocol.metadata.version << std::endl;
                std::cout << "📋 Owner: " << protocol.metadata.owner << std::endl;
                std::cout << "📋 State variables: " << protocol.state.variables.size() << std::endl;
                std::cout << "📋 Methods: " << protocol.methods.size() << std::endl;
                return 0;
            } else {
                throw std::runtime_error("Failed to write .carc file");
            }
        }
        
        // 创建部署包
        std::cout << "📦 Creating deployment package..." << std::endl;
        CarFile car_file = CarDeployer::create_deployment_package_from_json(car_data);
        
        // 设置所有者
        if (!owner_address.empty()) {
            car_file.owner = owner_address;
            std::cout << "👤 Set owner: " << owner_address << std::endl;
        }
        
        // 签名（如果提供）
        if (!private_key.empty()) {
            car_file.signature = CarDeployer::sign_car_file(car_file, private_key);
            std::cout << "🔐 Protocol signed" << std::endl;
        }
        
        // 生成铭文格式
        if (generate_inscription) {
            std::cout << "📝 Generating inscription format..." << std::endl;
            json inscription = CarDeployer::generate_inscription_format(car_file);
            
            std::string inscription_file = output_file + ".inscription";
            std::ofstream ofs(inscription_file);
            ofs << inscription.dump(2) << std::endl;
            
            std::cout << "✅ Inscription saved to: " << inscription_file << std::endl;
            std::cout << "📋 Inscription content:" << std::endl;
            std::cout << inscription.dump(2) << std::endl;
        }
        
        // 生成 WASM 模块
        if (generate_wasm) {
            std::cout << "⚡ Generating WASM module..." << std::endl;
            std::string wasm_code = WASMClient::export_to_wasm(car_file);
            
            std::string wasm_file = output_file + ".wasm";
            std::ofstream ofs(wasm_file);
            ofs << wasm_code << std::endl;
            
            std::cout << "✅ WASM module saved to: " << wasm_file << std::endl;
        }
        
        // 导出部署包
        std::cout << "💾 Exporting deployment package..." << std::endl;
        CarDeployer::export_to_file(car_file, output_file);
        
        std::cout << "✅ Deployment package saved to: " << output_file << std::endl;
        std::cout << "📊 Protocol info:" << std::endl;
        std::cout << "   Name: " << car_file.protocol << std::endl;
        std::cout << "   Version: " << car_file.version << std::endl;
        std::cout << "   Hash: " << car_file.hash << std::endl;
        
        if (!car_file.owner.empty()) {
            std::cout << "   Owner: " << car_file.owner << std::endl;
        }
        
        if (!car_file.signature.empty()) {
            std::cout << "   Signed: Yes" << std::endl;
        }
        
        return 0;
        
    } catch (const std::exception& e) {
        std::cerr << "❌ Error: " << e.what() << std::endl;
        return 1;
    }
} 