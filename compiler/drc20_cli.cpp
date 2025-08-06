#include <iostream>
#include <string>
#include <fstream>
#include "drc20_standard.h"
#include "drc20_compiler.h"

using namespace cardity;

void print_usage(const std::string& program_name) {
    std::cout << "Cardity DRC-20 Token Compiler" << std::endl;
    std::cout << "=============================" << std::endl;
    std::cout << "Usage: " << program_name << " <command> [options]" << std::endl;
    std::cout << std::endl;
    std::cout << "Commands:" << std::endl;
    std::cout << "  compile <file>           - Compile DRC-20 token definition" << std::endl;
    std::cout << "  deploy <file> [options]  - Generate deploy inscription" << std::endl;
    std::cout << "  mint <tick> <amount>     - Generate mint inscription" << std::endl;
    std::cout << "  transfer <tick> <amount> <to> - Generate transfer inscription" << std::endl;
    std::cout << "  validate <file>          - Validate DRC-20 token definition" << std::endl;
    std::cout << "  template <type> [options] - Generate DRC-20 template" << std::endl;
    std::cout << std::endl;
    std::cout << "Options:" << std::endl;
    std::cout << "  --output <file>          - Output file" << std::endl;
    std::cout << "  --format <fmt>           - Output format (json, carc, inscription)" << std::endl;
    std::cout << "  --tick <symbol>          - Token ticker symbol" << std::endl;
    std::cout << "  --name <name>            - Token name" << std::endl;
    std::cout << "  --max-supply <amount>    - Maximum supply" << std::endl;
    std::cout << std::endl;
    std::cout << "Examples:" << std::endl;
    std::cout << "  " << program_name << " compile token.car" << std::endl;
    std::cout << "  " << program_name << " deploy token.car --output deploy.json" << std::endl;
    std::cout << "  " << program_name << " mint MYT 1000" << std::endl;
    std::cout << "  " << program_name << " transfer MYT 100 doge1abc..." << std::endl;
    std::cout << "  " << program_name << " template basic --tick MYT --name MyToken" << std::endl;
}

int cmd_compile(const std::string& file_path) {
    try {
        std::cout << "🔧 Compiling DRC-20 token definition..." << std::endl;
        
        // 读取文件
        std::ifstream file(file_path);
        if (!file.is_open()) {
            std::cerr << "❌ Error: Cannot open file: " << file_path << std::endl;
            return 1;
        }
        
        std::string source((std::istreambuf_iterator<char>(file)),
                          std::istreambuf_iterator<char>());
        file.close();
        
        // 编译 DRC-20 协议
        json result = Drc20Compiler::compile_drc20_protocol(source);
        
        std::cout << "✅ DRC-20 token compiled successfully!" << std::endl;
        std::cout << "📋 Token Info:" << std::endl;
        std::cout << "   Tick: " << result["tick"] << std::endl;
        std::cout << "   Max Supply: " << result["max_supply"] << std::endl;
        std::cout << "   Deploy Time: " << result["deploy_time"] << std::endl;
        
        return 0;
        
    } catch (const std::exception& e) {
        std::cerr << "❌ Error: " << e.what() << std::endl;
        return 1;
    }
}

int cmd_deploy(int argc, char* argv[]) {
    std::string file_path = argv[2];
    std::string output_file = "";
    std::string format = "json";
    
    // 解析参数
    for (int i = 3; i < argc; ++i) {
        std::string arg = argv[i];
        
        if (arg == "--output" && i + 1 < argc) {
            output_file = argv[++i];
        } else if (arg == "--format" && i + 1 < argc) {
            format = argv[++i];
        }
    }
    
    try {
        std::cout << "🚀 Generating DRC-20 deploy inscription..." << std::endl;
        
        // 读取并解析代币定义
        std::ifstream file(file_path);
        if (!file.is_open()) {
            std::cerr << "❌ Error: Cannot open file: " << file_path << std::endl;
            return 1;
        }
        
        std::string source((std::istreambuf_iterator<char>(file)),
                          std::istreambuf_iterator<char>());
        file.close();
        
        // 编译代币定义
        json token_def = Drc20Compiler::compile_drc20_protocol(source);
        
        // 创建 DRC-20 代币对象
        Drc20Token token;
        token.tick = token_def["tick"];
        token.max_supply = token_def["max_supply"];
        token.mint_limit = token_def.value("mint_limit", "");
        token.decimals = token_def.value("decimals", "18");
        token.deployer = token_def.value("deployer", "");
        token.deploy_time = token_def["deploy_time"];
        token.is_deployed = false;
        
        // 生成部署铭文
        json inscription = Drc20Standard::generate_deploy_inscription(token);
        
        std::cout << "✅ Deploy inscription generated!" << std::endl;
        std::cout << "📝 Inscription: " << inscription.dump() << std::endl;
        
        if (!output_file.empty()) {
            std::ofstream out_file(output_file);
            if (format == "json") {
                out_file << inscription.dump(2) << std::endl;
            } else {
                out_file << inscription.dump() << std::endl;
            }
            out_file.close();
            std::cout << "📄 Saved to: " << output_file << std::endl;
        }
        
        return 0;
        
    } catch (const std::exception& e) {
        std::cerr << "❌ Error: " << e.what() << std::endl;
        return 1;
    }
}

int cmd_mint(int argc, char* argv[]) {
    if (argc < 4) {
        std::cerr << "❌ Error: Missing arguments. Usage: mint <tick> <amount>" << std::endl;
        return 1;
    }
    
    std::string tick = argv[2];
    std::string amount = argv[3];
    std::string output_file = "";
    
    // 解析参数
    for (int i = 4; i < argc; ++i) {
        std::string arg = argv[i];
        
        if (arg == "--output" && i + 1 < argc) {
            output_file = argv[++i];
        }
    }
    
    try {
        std::cout << "🪙 Generating DRC-20 mint inscription..." << std::endl;
        
        // 验证参数
        if (!Drc20Standard::validate_tick(tick)) {
            std::cerr << "❌ Error: Invalid tick format" << std::endl;
            return 1;
        }
        
        if (!Drc20Standard::validate_amount(amount)) {
            std::cerr << "❌ Error: Invalid amount format" << std::endl;
            return 1;
        }
        
        // 生成铸造铭文
        json inscription = Drc20Standard::generate_mint_inscription(tick, amount);
        
        std::cout << "✅ Mint inscription generated!" << std::endl;
        std::cout << "📝 Inscription: " << inscription.dump() << std::endl;
        
        if (!output_file.empty()) {
            std::ofstream out_file(output_file);
            out_file << inscription.dump(2) << std::endl;
            out_file.close();
            std::cout << "📄 Saved to: " << output_file << std::endl;
        }
        
        return 0;
        
    } catch (const std::exception& e) {
        std::cerr << "❌ Error: " << e.what() << std::endl;
        return 1;
    }
}

int cmd_transfer(int argc, char* argv[]) {
    if (argc < 5) {
        std::cerr << "❌ Error: Missing arguments. Usage: transfer <tick> <amount> <to_address>" << std::endl;
        return 1;
    }
    
    std::string tick = argv[2];
    std::string amount = argv[3];
    std::string to_address = argv[4];
    std::string output_file = "";
    
    // 解析参数
    for (int i = 5; i < argc; ++i) {
        std::string arg = argv[i];
        
        if (arg == "--output" && i + 1 < argc) {
            output_file = argv[++i];
        }
    }
    
    try {
        std::cout << "💸 Generating DRC-20 transfer inscription..." << std::endl;
        
        // 验证参数
        if (!Drc20Standard::validate_tick(tick)) {
            std::cerr << "❌ Error: Invalid tick format" << std::endl;
            return 1;
        }
        
        if (!Drc20Standard::validate_amount(amount)) {
            std::cerr << "❌ Error: Invalid amount format" << std::endl;
            return 1;
        }
        
        if (!Drc20Standard::validate_address(to_address)) {
            std::cerr << "❌ Error: Invalid address format" << std::endl;
            return 1;
        }
        
        // 生成转账铭文
        json inscription = Drc20Standard::generate_transfer_inscription(tick, amount, to_address);
        
        std::cout << "✅ Transfer inscription generated!" << std::endl;
        std::cout << "📝 Inscription: " << inscription.dump() << std::endl;
        
        if (!output_file.empty()) {
            std::ofstream out_file(output_file);
            out_file << inscription.dump(2) << std::endl;
            out_file.close();
            std::cout << "📄 Saved to: " << output_file << std::endl;
        }
        
        return 0;
        
    } catch (const std::exception& e) {
        std::cerr << "❌ Error: " << e.what() << std::endl;
        return 1;
    }
}

int cmd_validate(const std::string& file_path) {
    try {
        std::cout << "🔍 Validating DRC-20 token definition..." << std::endl;
        
        // 读取文件
        std::ifstream file(file_path);
        if (!file.is_open()) {
            std::cerr << "❌ Error: Cannot open file: " << file_path << std::endl;
            return 1;
        }
        
        std::string source((std::istreambuf_iterator<char>(file)),
                          std::istreambuf_iterator<char>());
        file.close();
        
        // 编译并验证
        json result = Drc20Compiler::compile_drc20_protocol(source);
        
        std::cout << "✅ DRC-20 token definition is valid!" << std::endl;
        std::cout << "📋 Validation Results:" << std::endl;
        std::cout << "   ✓ Tick format: " << result["tick"] << std::endl;
        std::cout << "   ✓ Max supply: " << result["max_supply"] << std::endl;
        std::cout << "   ✓ Mint limit: " << result.value("mint_limit", "None") << std::endl;
        std::cout << "   ✓ Decimals: " << result.value("decimals", "18") << std::endl;
        
        return 0;
        
    } catch (const std::exception& e) {
        std::cerr << "❌ Validation failed: " << e.what() << std::endl;
        return 1;
    }
}

int cmd_template(int argc, char* argv[]) {
    if (argc < 3) {
        std::cerr << "❌ Error: Missing template type. Usage: template <type> [options]" << std::endl;
        return 1;
    }
    
    std::string template_type = argv[2];
    std::string tick = "";
    std::string name = "";
    std::string max_supply = "";
    std::string output_file = "";
    
    // 解析参数
    for (int i = 3; i < argc; ++i) {
        std::string arg = argv[i];
        
        if (arg == "--tick" && i + 1 < argc) {
            tick = argv[++i];
        } else if (arg == "--name" && i + 1 < argc) {
            name = argv[++i];
        } else if (arg == "--max-supply" && i + 1 < argc) {
            max_supply = argv[++i];
        } else if (arg == "--output" && i + 1 < argc) {
            output_file = argv[++i];
        }
    }
    
    try {
        std::cout << "📝 Generating DRC-20 template..." << std::endl;
        
        std::string template_content;
        
        if (template_type == "basic") {
            if (tick.empty() || name.empty()) {
                std::cerr << "❌ Error: --tick and --name are required for basic template" << std::endl;
                return 1;
            }
            template_content = Drc20TemplateGenerator::generate_basic_template(tick, name);
        } else if (template_type == "advanced") {
            if (tick.empty() || name.empty() || max_supply.empty()) {
                std::cerr << "❌ Error: --tick, --name, and --max-supply are required for advanced template" << std::endl;
                return 1;
            }
            template_content = Drc20TemplateGenerator::generate_advanced_template(tick, name, max_supply);
        } else {
            std::cerr << "❌ Error: Unknown template type: " << template_type << std::endl;
            return 1;
        }
        
        std::cout << "✅ Template generated successfully!" << std::endl;
        
        if (!output_file.empty()) {
            std::ofstream out_file(output_file);
            out_file << template_content;
            out_file.close();
            std::cout << "📄 Saved to: " << output_file << std::endl;
        } else {
            std::cout << "📝 Template content:" << std::endl;
            std::cout << template_content << std::endl;
        }
        
        return 0;
        
    } catch (const std::exception& e) {
        std::cerr << "❌ Error: " << e.what() << std::endl;
        return 1;
    }
}

int main(int argc, char* argv[]) {
    if (argc < 2) {
        print_usage(argv[0]);
        return 1;
    }
    
    std::string command = argv[1];
    
    if (command == "-h" || command == "--help") {
        print_usage(argv[0]);
        return 0;
    }
    
    if (command == "compile") {
        if (argc < 3) {
            std::cerr << "❌ Error: File path required" << std::endl;
            return 1;
        }
        return cmd_compile(argv[2]);
    }
    
    if (command == "deploy") {
        if (argc < 3) {
            std::cerr << "❌ Error: File path required" << std::endl;
            return 1;
        }
        return cmd_deploy(argc, argv);
    }
    
    if (command == "mint") {
        return cmd_mint(argc, argv);
    }
    
    if (command == "transfer") {
        return cmd_transfer(argc, argv);
    }
    
    if (command == "validate") {
        if (argc < 3) {
            std::cerr << "❌ Error: File path required" << std::endl;
            return 1;
        }
        return cmd_validate(argv[2]);
    }
    
    if (command == "template") {
        return cmd_template(argc, argv);
    }
    
    std::cerr << "❌ Unknown command: " << command << std::endl;
    print_usage(argv[0]);
    return 1;
} 