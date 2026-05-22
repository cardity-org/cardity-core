#include <iostream>
#include <fstream>
#include "event_system.h"

using namespace cardity;

void print_usage(const std::string& program_name) {
    std::cout << "Usage: " << program_name << " <car_file> [output_file]" << std::endl;
    std::cout << "  car_file    - Input .car protocol file" << std::endl;
    std::cout << "  output_file - Output ABI file (optional, defaults to stdout)" << std::endl;
    std::cout << std::endl;
    std::cout << "Examples:" << std::endl;
    std::cout << "  " << program_name << " protocol.car" << std::endl;
    std::cout << "  " << program_name << " protocol.car protocol.abi" << std::endl;
}

int main(int argc, char* argv[]) {
    if (argc < 2) {
        print_usage(argv[0]);
        return 1;
    }

    std::string car_file = argv[1];
    std::string output_file = "";

    for (int i = 2; i < argc; ++i) {
        std::string arg = argv[i];
        if ((arg == "-o" || arg == "--output") && i + 1 < argc) {
            output_file = argv[++i];
        } else if (output_file.empty()) {
            output_file = arg;
        } else {
            std::cerr << "Unknown option: " << arg << std::endl;
            print_usage(argv[0]);
            return 1;
        }
    }
    
    try {
        // 生成 ABI
        std::cout << "🔧 Generating ABI for: " << car_file << std::endl;
        auto abi = ABIGenerator::generate_abi_from_car(car_file);
        
        // 输出结果
        if (output_file.empty()) {
            // 输出到标准输出
            std::cout << abi.dump(2) << std::endl;
        } else {
            // 输出到文件
            std::ofstream ofs(output_file);
            if (!ofs.is_open()) {
                throw std::runtime_error("Failed to open output file: " + output_file);
            }
            ofs << abi.dump(2) << std::endl;
            std::cout << "✅ ABI written to: " << output_file << std::endl;
        }
        
        return 0;
        
    } catch (const std::exception& e) {
        std::cerr << "❌ Error: " << e.what() << std::endl;
        return 1;
    }
} 
