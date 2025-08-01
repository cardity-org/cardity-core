#include "runtime.h"
#include <iostream>
#include <string>
#include <vector>
#include <sstream>

using namespace cardity;

void print_usage(const std::string& program_name) {
    std::cout << "Usage: " << program_name << " <car_file> [method_name] [args...]\n";
    std::cout << "\nExamples:\n";
    std::cout << "  " << program_name << " hello.car                    # Load and show initial state\n";
    std::cout << "  " << program_name << " hello.car set_msg \"Hello\"   # Call set_msg method\n";
    std::cout << "  " << program_name << " hello.car get_msg            # Call get_msg method\n";
}

void interactive_mode(const json& car, State& state) {
    std::cout << "\n🎮 Interactive Mode (type 'quit' to exit, 'state' to show state)\n";
    std::cout << "Available methods:\n";
    
    auto methods = car["cpl"]["methods"];
    for (auto& [method_name, method] : methods.items()) {
        std::cout << "  - " << method_name;
        if (method.contains("params")) {
            auto params = method["params"];
            std::cout << "(";
            for (size_t i = 0; i < params.size(); ++i) {
                if (i > 0) std::cout << ", ";
                std::cout << params[i];
            }
            std::cout << ")";
        }
        std::cout << "\n";
    }
    
    std::string input;
    while (true) {
        std::cout << "\n> ";
        std::getline(std::cin, input);
        
        if (input == "quit" || input == "exit") {
            break;
        }
        
        if (input == "state") {
            Runtime::print_state(state);
            continue;
        }
        
        if (input.empty()) {
            continue;
        }
        
        // 解析命令：method_name arg1 arg2 ...
        std::istringstream iss(input);
        std::string method_name;
        std::vector<std::string> args;
        
        iss >> method_name;
        std::string arg;
        while (iss >> arg) {
            args.push_back(arg);
        }
        
        try {
            // 创建运行时实例
            Runtime runtime;
            
            // 初始化事件管理器（如果协议定义了事件）
            if (car.contains("cpl") && car["cpl"].contains("events")) {
                runtime.get_event_manager().parse_events_from_json(car["cpl"]["events"]);
            }
            
            std::string result = runtime.invoke_method(car, state, method_name, args);
            if (result != "ok") {
                std::cout << "📥 Result: " << result << "\n";
            } else {
                std::cout << "✅ Method executed successfully\n";
            }
        } catch (const std::exception& e) {
            std::cout << "❌ Error: " << e.what() << "\n";
        }
    }
}

int main(int argc, char* argv[]) {
    if (argc < 2) {
        print_usage(argv[0]);
        return 1;
    }

    std::string car_file = argv[1];
    
    try {
        // 加载 .car 协议文件
        std::cout << "📖 Loading protocol: " << car_file << std::endl;
        auto car = Runtime::load_car_file(car_file);
        
        // 初始化状态
        std::cout << "🔧 Initializing state..." << std::endl;
        auto state = Runtime::initialize_state(car);
        
        // 显示初始状态
        Runtime::print_state(state, "Initial State");
        
        // 如果提供了方法名，执行单次调用
        if (argc > 2) {
            std::string method_name = argv[2];
            std::vector<std::string> args;
            
            // 收集参数
            for (int i = 3; i < argc; ++i) {
                args.push_back(argv[i]);
            }
            
            std::cout << "\n🚀 Executing: " << method_name;
            if (!args.empty()) {
                std::cout << "(";
                for (size_t i = 0; i < args.size(); ++i) {
                    if (i > 0) std::cout << ", ";
                    std::cout << args[i];
                }
                std::cout << ")";
            }
            std::cout << std::endl;
            
            // 创建运行时实例
            Runtime runtime;
            
            // 初始化事件管理器（如果协议定义了事件）
            if (car.contains("cpl") && car["cpl"].contains("events")) {
                runtime.get_event_manager().parse_events_from_json(car["cpl"]["events"]);
            }
            
            std::string result = runtime.invoke_method(car, state, method_name, args);
            if (result != "ok") {
                std::cout << "📥 Result: " << result << std::endl;
            } else {
                std::cout << "✅ Method executed successfully" << std::endl;
            }
            
            // 显示更新后的状态
            Runtime::print_state(state, "Updated State");
        } else {
            // 进入交互模式
            interactive_mode(car, state);
        }
        
        return 0;
        
    } catch (const std::exception& e) {
        std::cerr << "❌ Error: " << e.what() << std::endl;
        return 1;
    }
} 