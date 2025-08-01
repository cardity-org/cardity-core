#include <iostream>
#include <string>
#include <cstring>
#include <fstream>
#include "car_deployer.h"

using namespace cardity;

void print_usage(const std::string& program_name) {
    std::cout << "Cardity Protocol Compiler (cardityc)" << std::endl;
    std::cout << "=====================================" << std::endl;
    std::cout << "Usage: " << program_name << " <input_file> [options]" << std::endl;
    std::cout << std::endl;
    std::cout << "Arguments:" << std::endl;
    std::cout << "  input_file    - Input .car protocol file" << std::endl;
    std::cout << std::endl;
    std::cout << "Options:" << std::endl;
    std::cout << "  -o <output>   - Output file (default: input.car)" << std::endl;
    std::cout << "  --owner <addr> - Set protocol owner address" << std::endl;
    std::cout << "  --sign <key>  - Sign the protocol with private key" << std::endl;
    std::cout << "  --inscription - Generate inscription format for deployment" << std::endl;
    std::cout << "  --wasm        - Generate WASM module" << std::endl;
    std::cout << "  --validate    - Validate protocol format only" << std::endl;
    std::cout << std::endl;
    std::cout << "Examples:" << std::endl;
    std::cout << "  " << program_name << " protocol.car" << std::endl;
    std::cout << "  " << program_name << " protocol.car -o deployed.car --owner doge1abc..." << std::endl;
    std::cout << "  " << program_name << " protocol.car --inscription" << std::endl;
    std::cout << "  " << program_name << " protocol.car --validate" << std::endl;
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
        output_file = input_file;
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
        
        json car_data = json::parse(ifs);
        
        // 验证格式
        std::cout << "✅ Validating protocol format..." << std::endl;
        if (!CarDeployer::validate_car_format(car_data)) {
            throw std::runtime_error("Invalid .car file format");
        }
        
        if (validate_only) {
            std::cout << "✅ Protocol format is valid!" << std::endl;
            return 0;
        }
        
        // 创建部署包
        std::cout << "📦 Creating deployment package..." << std::endl;
        CarFile car_file = CarDeployer::create_deployment_package(input_file);
        
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