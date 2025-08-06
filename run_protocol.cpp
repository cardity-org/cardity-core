#include <iostream>
#include <fstream>
#include <string>
#include <map>
#include <vector>
#include <sstream>
#include <regex>

class SimpleProtocolRuntime {
private:
    std::map<std::string, std::string> state;
    std::string protocol_name;
    
public:
    SimpleProtocolRuntime() {
        // 初始化默认状态
        state["message"] = "Hello, Cardity!";
        state["count"] = "0";
    }
    
    bool load_protocol(const std::string& filename) {
        std::ifstream file(filename);
        if (!file.is_open()) {
            std::cerr << "❌ Error: Cannot open file: " << filename << std::endl;
            return false;
        }
        
        std::string content((std::istreambuf_iterator<char>(file)),
                           std::istreambuf_iterator<char>());
        
        // 简单的协议解析
        std::regex protocol_regex(R"(protocol\s+(\w+)\s*\{)");
        std::smatch match;
        if (std::regex_search(content, match, protocol_regex)) {
            protocol_name = match[1];
            std::cout << "📖 Loading protocol: " << filename << std::endl;
            std::cout << "🔧 Protocol name: " << protocol_name << std::endl;
            std::cout << "🔧 Initializing state..." << std::endl;
            return true;
        }
        
        std::cerr << "❌ Error: Invalid protocol format" << std::endl;
        return false;
    }
    
    std::string execute_method(const std::string& method_name, const std::vector<std::string>& params = {}) {
        std::cout << "🚀 Executing: " << method_name;
        if (!params.empty()) {
            std::cout << "(";
            for (size_t i = 0; i < params.size(); ++i) {
                if (i > 0) std::cout << ", ";
                std::cout << params[i];
            }
            std::cout << ")";
        }
        std::cout << std::endl;
        
        if (method_name == "get_message") {
            std::cout << "📥 Result: " << state["message"] << std::endl;
            return state["message"];
        }
        else if (method_name == "set_message" && params.size() > 0) {
            state["message"] = params[0];
            std::cout << "✅ Method executed successfully" << std::endl;
            return "success";
        }
        else if (method_name == "get_count") {
            std::cout << "📥 Result: " << state["count"] << std::endl;
            return state["count"];
        }
        else if (method_name == "set_count" && params.size() > 0) {
            state["count"] = params[0];
            std::cout << "✅ Method executed successfully" << std::endl;
            return "success";
        }
        else if (method_name == "increment") {
            int count = std::stoi(state["count"]);
            count++;
            state["count"] = std::to_string(count);
            std::cout << "✅ Method executed successfully" << std::endl;
            return "success";
        }
        else {
            std::cout << "❌ Error: Unknown method: " << method_name << std::endl;
            return "error";
        }
        
        std::cout << "🔁 Updated State:" << std::endl;
        for (const auto& pair : state) {
            std::cout << "  " << pair.first << ": " << pair.second << std::endl;
        }
    }
    
    void print_state() {
        std::cout << "🔁 Current State:" << std::endl;
        for (const auto& pair : state) {
            std::cout << "  " << pair.first << ": " << pair.second << std::endl;
        }
    }
};

int main(int argc, char* argv[]) {
    if (argc < 3) {
        std::cout << "🔧 Simple Cardity Protocol Runtime" << std::endl;
        std::cout << "===================================" << std::endl;
        std::cout << "Usage: " << argv[0] << " <protocol.car> <method> [params...]" << std::endl;
        std::cout << std::endl;
        std::cout << "Examples:" << std::endl;
        std::cout << "  " << argv[0] << " HelloCardinals.car get_message" << std::endl;
        std::cout << "  " << argv[0] << " HelloCardinals.car set_message \"Hello World\"" << std::endl;
        std::cout << "  " << argv[0] << " HelloCardinals.car increment" << std::endl;
        return 1;
    }
    
    std::string protocol_file = argv[1];
    std::string method_name = argv[2];
    std::vector<std::string> params;
    
    for (int i = 3; i < argc; ++i) {
        params.push_back(argv[i]);
    }
    
    SimpleProtocolRuntime runtime;
    
    if (!runtime.load_protocol(protocol_file)) {
        return 1;
    }
    
    runtime.print_state();
    runtime.execute_method(method_name, params);
    
    return 0;
} 