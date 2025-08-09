#include "runtime.h"
#include <iostream>
#include <string>
#include <vector>
#include <sstream>
#include <fstream>

using namespace cardity;

void print_usage(const std::string& program_name) {
    std::cout << "Usage: " << program_name << " <car_file> [method_name] [args...] [--sender <addr>] [--txid <id>] [--data-length <n>] [--state <file>]\n";
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
        
        // 可选上下文参数解析
        std::string sender = "";
        std::string txid = "";
        std::string data_length = "";
        std::string state_file = "";

        // 如果提供了方法名，执行单次调用
        if (argc > 2) {
            std::string method_name = argv[2];
            std::vector<std::string> args;
            
            // 收集参数与可选上下文
            for (int i = 3; i < argc; ++i) {
                std::string a = argv[i];
                if (a == "--sender" && i + 1 < argc) { sender = argv[++i]; continue; }
                if (a == "--txid" && i + 1 < argc) { txid = argv[++i]; continue; }
                if (a == "--data-length" && i + 1 < argc) { data_length = argv[++i]; continue; }
                if (a == "--state" && i + 1 < argc) { state_file = argv[++i]; continue; }
                args.push_back(a);
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
            if (!sender.empty()) runtime.set_context("sender", sender);
            if (!txid.empty()) runtime.set_context("txid", txid);
            if (!data_length.empty()) runtime.set_context("data_length", data_length);
            
            // 初始化事件管理器（如果协议定义了事件）
            if (car.contains("cpl") && car["cpl"].contains("events")) {
                runtime.get_event_manager().parse_events_from_json(car["cpl"]["events"]);
            }
            
            // 加载持久化 state
            if (!state_file.empty()) {
                try {
                    std::ifstream sfi(state_file);
                    if (sfi.good()) {
                        json s = json::parse(sfi);
                        for (auto& [k,v] : s.items()) {
                            if (v.is_string()) state[k] = v.get<std::string>();
                            else if (v.is_number_integer()) state[k] = std::to_string(v.get<long long>());
                            else if (v.is_number_unsigned()) state[k] = std::to_string(v.get<unsigned long long>());
                            else if (v.is_number_float()) state[k] = std::to_string(v.get<double>());
                            else if (v.is_boolean()) state[k] = v.get<bool>() ? "true" : "false";
                            else state[k] = v.dump();
                        }
                    }
                } catch (...) {}
            }

            std::string result = runtime.invoke_method(car, state, method_name, args);
            if (result != "ok") {
                std::cout << "📥 Result: " << result << std::endl;
            } else {
                std::cout << "✅ Method executed successfully" << std::endl;
            }
            
            // 显示更新后的状态
            Runtime::print_state(state, "Updated State");

            // 打印事件日志
            const auto& evts = runtime.get_event_log();
            if (!evts.empty()) {
                std::cout << "\n📣 Events:" << std::endl;
                for (const auto& e : evts) {
                    std::cout << "  " << e.name << "(";
                    for (size_t i = 0; i < e.values.size(); ++i) {
                        if (i > 0) std::cout << ", ";
                        std::cout << e.values[i];
                    }
                    std::cout << ")" << std::endl;
                }
            }

            // 保存持久化 state
            if (!state_file.empty()) {
                try {
                    json s;
                    for (const auto& kv : state) s[kv.first] = kv.second;
                    std::ofstream sfo(state_file);
                    sfo << s.dump(2);
                    // 保存事件到独立日志文件（追加）
                    if (!evts.empty()) {
                        std::string events_file = state_file + ".events.json";
                        json arr = json::array();
                        // 若已有，读出并作为初始数组
                        std::ifstream efi(events_file);
                        if (efi.good()) {
                            try { arr = json::parse(efi); } catch (...) { arr = json::array(); }
                        }
                        for (const auto& e : evts) {
                            json item;
                            item["name"] = e.name;
                            item["values"] = e.values;
                            arr.push_back(item);
                        }
                        std::ofstream efo(events_file);
                        efo << arr.dump(2);
                    }
                } catch (...) {}
            }
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