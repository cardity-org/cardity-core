#include <iostream>
#include <fstream>
#include <string>
#include <vector>
#include <memory>
#include "lexer.h"
#include "parser.h"
#include "semantic.h"
#include "car_generator.h"

using namespace cardity;

void print_usage(const char* program_name) {
    std::cout << "Usage: " << program_name << " <input_file> [options]\n";
    std::cout << "Options:\n";
    std::cout << "  -o <output_file>    Specify output file (default: input.car)\n";
    std::cout << "  -v, --verbose       Enable verbose output\n";
    std::cout << "  -h, --help          Show this help message\n";
    std::cout << "\n";
    std::cout << "Example:\n";
    std::cout << "  " << program_name << " contract.cardity -o contract.car\n";
}

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
        print_usage(argv[0]);
        return 1;
    }

    std::string input_file;
    std::string output_file;
    bool verbose = false;

    // 解析命令行参数
    for (int i = 1; i < argc; i++) {
        std::string arg = argv[i];
        
        if (arg == "-h" || arg == "--help") {
            print_usage(argv[0]);
            return 0;
        } else if (arg == "-v" || arg == "--verbose") {
            verbose = true;
        } else if (arg == "-o" && i + 1 < argc) {
            output_file = argv[++i];
        } else if (arg[0] != '-') {
            input_file = arg;
        } else {
            std::cerr << "Unknown option: " << arg << std::endl;
            print_usage(argv[0]);
            return 1;
        }
    }

    if (input_file.empty()) {
        std::cerr << "Error: No input file specified" << std::endl;
        print_usage(argv[0]);
        return 1;
    }

    // 如果没有指定输出文件，使用默认名称
    if (output_file.empty()) {
        size_t dot_pos = input_file.find_last_of('.');
        if (dot_pos != std::string::npos) {
            output_file = input_file.substr(0, dot_pos) + ".car";
        } else {
            output_file = input_file + ".car";
        }
    }

    try {
        if (verbose) {
            std::cout << "Reading input file: " << input_file << std::endl;
        }

        // 读取源文件
        std::string source = read_file(input_file);

        if (verbose) {
            std::cout << "Lexical analysis..." << std::endl;
        }

        // 词法分析
        Lexer lexer(source);
        std::vector<Token> tokens = lexer.tokenize();

        if (verbose) {
            std::cout << "Parsing..." << std::endl;
        }

        // 语法分析
        Parser parser(tokens);
        std::shared_ptr<ProgramNode> ast = parser.parse();

        if (verbose) {
            std::cout << "Semantic analysis..." << std::endl;
        }

        // 语义分析
        SemanticAnalyzer analyzer(ast);
        if (!analyzer.analyze()) {
            std::cerr << "Semantic errors found:" << std::endl;
            for (const auto& error : analyzer.get_errors()) {
                std::cerr << "  " << error << std::endl;
            }
            return 1;
        }

        if (verbose) {
            std::cout << "Generating CAR..." << std::endl;
        }

        // 生成 CAR
        CARGenerator generator(ast);
        std::string car_json = generator.generate_string();

        if (verbose) {
            std::cout << "Writing output file: " << output_file << std::endl;
        }

        // 写入输出文件
        write_file(output_file, car_json);

        if (verbose) {
            std::cout << "Compilation successful!" << std::endl;
        } else {
            std::cout << "Successfully compiled " << input_file << " to " << output_file << std::endl;
        }

        return 0;

    } catch (const std::exception& e) {
        std::cerr << "Error: " << e.what() << std::endl;
        return 1;
    }
} 