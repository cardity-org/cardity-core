#include <iostream>
#include <string>
#include <fstream>
#include "dogecoin_deployer.h"

using namespace cardity;

void print_usage(const std::string& program_name) {
    std::cout << "Cardity Dogecoin Deployer" << std::endl;
    std::cout << "=========================" << std::endl;
    std::cout << "Usage: " << program_name << " <command> [options]" << std::endl;
    std::cout << std::endl;
    std::cout << "Commands:" << std::endl;
    std::cout << "  info <carc_file>           - Show .carc file information" << std::endl;
    std::cout << "  validate <carc_file>       - Validate .carc file format" << std::endl;
    std::cout << "  deploy <carc_file> [options] - Deploy protocol to Dogecoin" << std::endl;
    std::cout << "  inscription <carc_file> [options] - Create inscription transaction" << std::endl;
    std::cout << std::endl;
    std::cout << "Deploy Options:" << std::endl;
    std::cout << "  --address <addr>           - Dogecoin address" << std::endl;
    std::cout << "  --private-key <key>        - Private key" << std::endl;
    std::cout << "  --amount <satoshis>        - Amount in satoshis (default: 1000)" << std::endl;
    std::cout << "  --output <file>            - Output script file" << std::endl;
    std::cout << "  --rpc                      - Generate RPC commands" << std::endl;
    std::cout << std::endl;
    std::cout << "Examples:" << std::endl;
    std::cout << "  " << program_name << " info protocol.carc" << std::endl;
    std::cout << "  " << program_name << " validate protocol.carc" << std::endl;
    std::cout << "  " << program_name << " deploy protocol.carc --address doge1abc... --private-key xyz..." << std::endl;
    std::cout << "  " << program_name << " inscription protocol.carc --address doge1abc... --output deploy.sh" << std::endl;
}

int cmd_info(const std::string& carc_file) {
    try {
        std::cout << "📋 Protocol Information" << std::endl;
        std::cout << "=======================" << std::endl;
        
        json info = DogecoinDeployer::get_carc_info(carc_file);
        
        if (info.contains("error")) {
            std::cerr << "❌ Error: " << info["error"] << std::endl;
            return 1;
        }
        
        std::cout << "Protocol: " << info["protocol"] << std::endl;
        std::cout << "Version: " << info["version"] << std::endl;
        std::cout << "Owner: " << info["owner"] << std::endl;
        std::cout << "State Variables: " << info["state_variables"] << std::endl;
        std::cout << "Methods: " << info["methods"] << std::endl;
        std::cout << "File Size: " << info["file_size"] << " bytes" << std::endl;
        std::cout << "Hash: " << info["hash"] << std::endl;
        
        return 0;
        
    } catch (const std::exception& e) {
        std::cerr << "❌ Error: " << e.what() << std::endl;
        return 1;
    }
}

int cmd_validate(const std::string& carc_file) {
    std::cout << "🔍 Validating .carc file..." << std::endl;
    
    if (DogecoinDeployer::validate_carc_file(carc_file)) {
        std::cout << "✅ .carc file is valid!" << std::endl;
        return 0;
    } else {
        std::cout << "❌ .carc file is invalid!" << std::endl;
        return 1;
    }
}

int cmd_deploy(int argc, char* argv[]) {
    std::string carc_file = argv[2];
    std::string address = "";
    std::string private_key = "";
    uint64_t amount = 1000;
    std::string output_file = "";
    bool generate_rpc = false;
    
    // 解析参数
    for (int i = 3; i < argc; ++i) {
        std::string arg = argv[i];
        
        if (arg == "--address" && i + 1 < argc) {
            address = argv[++i];
        } else if (arg == "--private-key" && i + 1 < argc) {
            private_key = argv[++i];
        } else if (arg == "--amount" && i + 1 < argc) {
            amount = std::stoull(argv[++i]);
        } else if (arg == "--output" && i + 1 < argc) {
            output_file = argv[++i];
        } else if (arg == "--rpc") {
            generate_rpc = true;
        }
    }
    
    if (address.empty() || private_key.empty()) {
        std::cerr << "❌ Error: --address and --private-key are required" << std::endl;
        return 1;
    }
    
    try {
        std::cout << "🚀 Creating deployment transaction..." << std::endl;
        
        DogecoinTransaction tx = DogecoinDeployer::create_deployment_transaction(
            carc_file, address, private_key, amount);
        
        std::cout << "✅ Deployment transaction created!" << std::endl;
        std::cout << "📋 Address: " << tx.address << std::endl;
        std::cout << "💰 Amount: " << tx.amount << " satoshis" << std::endl;
        std::cout << "📝 OP_RETURN: " << tx.op_return_data << std::endl;
        
        if (generate_rpc) {
            std::cout << "\n🔧 RPC Commands:" << std::endl;
            json rpc_commands = DogecoinDeployer::generate_rpc_commands(tx);
            std::cout << rpc_commands.dump(2) << std::endl;
        }
        
        if (!output_file.empty()) {
            std::string script = DogecoinDeployer::generate_deployment_script(tx);
            std::ofstream ofs(output_file);
            ofs << script;
            ofs.close();
            
            std::cout << "📄 Deployment script saved to: " << output_file << std::endl;
        }
        
        return 0;
        
    } catch (const std::exception& e) {
        std::cerr << "❌ Error: " << e.what() << std::endl;
        return 1;
    }
}

int cmd_inscription(int argc, char* argv[]) {
    std::string carc_file = argv[2];
    std::string address = "";
    std::string private_key = "";
    std::string output_file = "";
    
    // 解析参数
    for (int i = 3; i < argc; ++i) {
        std::string arg = argv[i];
        
        if (arg == "--address" && i + 1 < argc) {
            address = argv[++i];
        } else if (arg == "--private-key" && i + 1 < argc) {
            private_key = argv[++i];
        } else if (arg == "--output" && i + 1 < argc) {
            output_file = argv[++i];
        }
    }
    
    if (address.empty() || private_key.empty()) {
        std::cerr << "❌ Error: --address and --private-key are required" << std::endl;
        return 1;
    }
    
    try {
        std::cout << "🏷️ Creating inscription transaction..." << std::endl;
        
        DogecoinTransaction tx = DogecoinDeployer::create_inscription_transaction(
            carc_file, address, private_key);
        
        std::cout << "✅ Inscription transaction created!" << std::endl;
        std::cout << "📋 Address: " << tx.address << std::endl;
        std::cout << "💰 Amount: " << tx.amount << " satoshis" << std::endl;
        std::cout << "📝 Inscription Data: " << tx.inscription_data << std::endl;
        
        if (!output_file.empty()) {
            std::ofstream ofs(output_file);
            ofs << tx.inscription_data;
            ofs.close();
            
            std::cout << "📄 Inscription data saved to: " << output_file << std::endl;
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
    
    if (command == "info") {
        if (argc < 3) {
            std::cerr << "❌ Error: .carc file required" << std::endl;
            return 1;
        }
        return cmd_info(argv[2]);
    }
    
    if (command == "validate") {
        if (argc < 3) {
            std::cerr << "❌ Error: .carc file required" << std::endl;
            return 1;
        }
        return cmd_validate(argv[2]);
    }
    
    if (command == "deploy") {
        if (argc < 3) {
            std::cerr << "❌ Error: .carc file required" << std::endl;
            return 1;
        }
        return cmd_deploy(argc, argv);
    }
    
    if (command == "inscription") {
        if (argc < 3) {
            std::cerr << "❌ Error: .carc file required" << std::endl;
            return 1;
        }
        return cmd_inscription(argc, argv);
    }
    
    std::cerr << "❌ Unknown command: " << command << std::endl;
    print_usage(argv[0]);
    return 1;
} 