#include "car_deployer.h"
#include <iostream>
#include <fstream>
#include <sstream>
#include <iomanip>
#include <functional>

namespace cardity {

// CarDeployer 实现
CarDeployer::CarDeployer(const std::string& protocol, const std::string& ver) 
    : protocol_name(protocol), version(ver) {}

void CarDeployer::set_owner(const std::string& owner) {
    owner_address = owner;
}

CarFile CarDeployer::create_deployment_package(const std::string& car_file_path) {
    // 读取 .car 协议文件
    std::ifstream ifs(car_file_path);
    if (!ifs.is_open()) {
        throw std::runtime_error("Failed to open .car file: " + car_file_path);
    }
    
    json car_data = json::parse(ifs);
    
    // 验证基本格式
    if (!validate_car_format(car_data)) {
        throw std::runtime_error("Invalid .car file format");
    }
    
    // 创建 CarFile 结构
    CarFile car_file;
    car_file.protocol = car_data.value("protocol", "unknown");
    car_file.version = car_data.value("version", "1.0");
    car_file.cpl = car_data["cpl"];
    
    // 生成 ABI
    ABIGenerator abi_gen(car_file.protocol, car_file.version);
    if (car_file.cpl.contains("methods")) {
        abi_gen.set_methods(car_file.cpl["methods"]);
    }
    if (car_file.cpl.contains("events")) {
        EventManager event_manager;
        event_manager.parse_events_from_json(car_file.cpl["events"]);
        
        auto events_def = event_manager.export_events_to_json();
        std::unordered_map<std::string, EventDefinition> events_map;
        
        for (auto& [event_name, event_data] : events_def.items()) {
            EventDefinition event_def(event_name);
            if (event_data.contains("params")) {
                auto params = event_data["params"];
                for (const auto& param : params) {
                    event_def.add_param(param["name"], param["type"]);
                }
            }
            events_map[event_name] = event_def;
        }
        
        abi_gen.set_events(events_map);
    }
    
    car_file.abi = abi_gen.generate_abi();
    
    // 计算哈希
    car_file.hash = calculate_hash(car_data);
    
    return car_file;
}

CarFile CarDeployer::create_deployment_package_from_json(const json& car_data) {
    // 验证基本格式
    if (!validate_car_format(car_data)) {
        throw std::runtime_error("Invalid .car file format");
    }
    
    // 创建 CarFile 结构
    CarFile car_file;
    car_file.protocol = car_data.value("protocol", "unknown");
    car_file.version = car_data.value("version", "1.0");
    car_file.cpl = car_data["cpl"];
    
    // 生成 ABI
    ABIGenerator abi_gen(car_file.protocol, car_file.version);
    if (car_file.cpl.contains("methods")) {
        abi_gen.set_methods(car_file.cpl["methods"]);
    }
    if (car_file.cpl.contains("events")) {
        EventManager event_manager;
        event_manager.parse_events_from_json(car_file.cpl["events"]);
        
        auto events_def = event_manager.export_events_to_json();
        std::unordered_map<std::string, EventDefinition> events_map;
        
        for (auto& [event_name, event_data] : events_def.items()) {
            EventDefinition event_def(event_name);
            if (event_data.contains("params")) {
                auto params = event_data["params"];
                for (const auto& param : params) {
                    event_def.add_param(param["name"], param["type"]);
                }
            }
            events_map[event_name] = event_def;
        }
        
        abi_gen.set_events(events_map);
    }
    
    car_file.abi = abi_gen.generate_abi();
    
    // 计算哈希
    car_file.hash = calculate_hash(car_data);
    
    return car_file;
}

json CarDeployer::generate_deployment_json(const json& cpl_data) {
    json deployment;
    
    deployment["p"] = "cardinals";
    deployment["op"] = "deploy";
    deployment["protocol"] = protocol_name;
    deployment["version"] = version;
    deployment["cpl"] = cpl_data;
    
    if (!owner_address.empty()) {
        deployment["owner"] = owner_address;
    }
    
    // 生成 ABI
    ABIGenerator abi_gen(protocol_name, version);
    if (cpl_data.contains("methods")) {
        abi_gen.set_methods(cpl_data["methods"]);
    }
    if (cpl_data.contains("events")) {
        EventManager event_manager;
        event_manager.parse_events_from_json(cpl_data["events"]);
        
        auto events_def = event_manager.export_events_to_json();
        std::unordered_map<std::string, EventDefinition> events_map;
        
        for (auto& [event_name, event_data] : events_def.items()) {
            EventDefinition event_def(event_name);
            if (event_data.contains("params")) {
                auto params = event_data["params"];
                for (const auto& param : params) {
                    event_def.add_param(param["name"], param["type"]);
                }
            }
            events_map[event_name] = event_def;
        }
        
        abi_gen.set_events(events_map);
    }
    
    deployment["abi"] = abi_gen.generate_abi();
    
    // 计算哈希
    deployment["hash"] = calculate_hash(deployment);
    
    return deployment;
}

std::string CarDeployer::calculate_hash(const json& data) {
    std::string json_str = data.dump();
    
    // 使用简单的哈希函数（实际应用中应使用更安全的哈希算法）
    std::hash<std::string> hasher;
    size_t hash_value = hasher(json_str);
    
    // 转换为十六进制字符串
    std::stringstream ss;
    ss << std::hex << hash_value;
    
    return ss.str();
}

std::string CarDeployer::sign_car_file(const CarFile& car_file, const std::string& private_key) {
    // 简化的签名实现（实际应用中应使用更安全的签名算法）
    std::string data_to_sign = car_file.protocol + car_file.version + car_file.hash;
    
    // 这里应该使用实际的签名算法
    // 暂时返回一个模拟签名
    return "signature_" + calculate_hash(json::object({{"data", data_to_sign}}));
}

bool CarDeployer::verify_signature(const CarFile& car_file, const std::string& public_key) {
    // 简化的签名验证实现
    if (car_file.signature.empty()) {
        return false;
    }
    
    // 这里应该使用实际的签名验证算法
    return car_file.signature.find("signature_") == 0;
}

std::string CarDeployer::encode_to_base64(const json& car_data) {
    std::string json_str = car_data.dump();
    
    // 简化的 base64 编码（实际应用中应使用标准库）
    std::string base64_chars = 
        "ABCDEFGHIJKLMNOPQRSTUVWXYZ"
        "abcdefghijklmnopqrstuvwxyz"
        "0123456789+/";
    
    std::string result;
    int val = 0, valb = -6;
    
    for (unsigned char c : json_str) {
        val = (val << 8) + c;
        valb += 8;
        while (valb >= 0) {
            result.push_back(base64_chars[(val >> valb) & 0x3F]);
            valb -= 6;
        }
    }
    
    if (valb > -6) {
        result.push_back(base64_chars[((val << 8) >> (valb + 8)) & 0x3F]);
    }
    
    while (result.size() % 4) {
        result.push_back('=');
    }
    
    return result;
}

json CarDeployer::decode_from_base64(const std::string& base64_data) {
    // 简化的 base64 解码
    std::string base64_chars = 
        "ABCDEFGHIJKLMNOPQRSTUVWXYZ"
        "abcdefghijklmnopqrstuvwxyz"
        "0123456789+/";
    
    std::string result;
    int val = 0, valb = -8;
    
    for (unsigned char c : base64_data) {
        if (c == '=') break;
        
        auto it = base64_chars.find(c);
        if (it == std::string::npos) continue;
        
        val = (val << 6) + it;
        valb += 6;
        
        if (valb >= 0) {
            result.push_back(char((val >> valb) & 0xFF));
            valb -= 8;
        }
    }
    
    return json::parse(result);
}

json CarDeployer::generate_inscription_format(const CarFile& car_file) {
    json inscription;
    
    inscription["p"] = "cardinals";
    inscription["op"] = "deploy";
    inscription["protocol"] = car_file.protocol;
    inscription["version"] = car_file.version;
    
    // 将整个 .car 文件编码为 base64
    json car_json;
    car_json["cpl"] = car_file.cpl;
    car_json["abi"] = car_file.abi;
    car_json["hash"] = car_file.hash;
    
    if (!car_file.owner.empty()) {
        car_json["owner"] = car_file.owner;
    }
    
    inscription["car"] = encode_to_base64(car_json);
    
    return inscription;
}

bool CarDeployer::validate_car_format(const json& car_data) {
    // 验证必需的字段
    if (!car_data.contains("protocol") || !car_data.contains("version") || !car_data.contains("cpl")) {
        return false;
    }
    
    // 验证 cpl 结构
    auto cpl = car_data["cpl"];
    if (!cpl.contains("state") || !cpl.contains("methods")) {
        return false;
    }
    
    return true;
}

void CarDeployer::export_to_file(const CarFile& car_file, const std::string& output_path) {
    json output_data;
    output_data["protocol"] = car_file.protocol;
    output_data["version"] = car_file.version;
    output_data["cpl"] = car_file.cpl;
    output_data["abi"] = car_file.abi;
    output_data["hash"] = car_file.hash;
    
    if (!car_file.owner.empty()) {
        output_data["owner"] = car_file.owner;
    }
    
    if (!car_file.signature.empty()) {
        output_data["sig"] = car_file.signature;
    }
    
    std::ofstream ofs(output_path);
    if (!ofs.is_open()) {
        throw std::runtime_error("Failed to open output file: " + output_path);
    }
    
    ofs << output_data.dump(2) << std::endl;
}

// WASMClient 实现
WASMClient::WASMClient() {
    // 初始化 WASM 客户端
}

bool WASMClient::load_protocol(const std::string& car_data) {
    try {
        json car_json = json::parse(car_data);
        
        if (!CarDeployer::validate_car_format(car_json)) {
            return false;
        }
        
        loaded_protocol.protocol = car_json["protocol"];
        loaded_protocol.version = car_json["version"];
        loaded_protocol.cpl = car_json["cpl"];
        
        if (car_json.contains("abi")) {
            loaded_protocol.abi = car_json["abi"];
        }
        
        if (car_json.contains("owner")) {
            loaded_protocol.owner = car_json["owner"];
        }
        
        // 初始化状态
        if (loaded_protocol.cpl.contains("state")) {
            auto state_def = loaded_protocol.cpl["state"];
            for (auto& [var_name, var_def] : state_def.items()) {
                if (var_def.contains("default")) {
                    current_state[var_name] = var_def["default"];
                }
            }
        }
        
        // 初始化事件管理器
        if (loaded_protocol.cpl.contains("events")) {
            event_manager.parse_events_from_json(loaded_protocol.cpl["events"]);
        }
        
        return true;
    } catch (const std::exception& e) {
        std::cerr << "Failed to load protocol: " << e.what() << std::endl;
        return false;
    }
}

json WASMClient::execute_method(const std::string& method_name, const json& args) {
    if (!loaded_protocol.cpl.contains("methods") || 
        !loaded_protocol.cpl["methods"].contains(method_name)) {
        throw std::runtime_error("Method not found: " + method_name);
    }
    
    auto method = loaded_protocol.cpl["methods"][method_name];
    
    // 这里应该调用实际的运行时执行器
    // 暂时返回模拟结果
    json result;
    result["method"] = method_name;
    result["status"] = "success";
    result["state"] = current_state;
    
    return result;
}

json WASMClient::get_event_log() const {
    json event_log = json::array();
    
    for (const auto& event : event_manager.get_event_log()) {
        json event_json;
        event_json["name"] = event.name;
        event_json["values"] = event.values;
        event_log.push_back(event_json);
    }
    
    return event_log;
}

bool WASMClient::validate_protocol() const {
    return !loaded_protocol.protocol.empty() && 
           !loaded_protocol.version.empty() && 
           !loaded_protocol.cpl.empty();
}

json WASMClient::create_snapshot() const {
    json snapshot;
    snapshot["protocol"] = loaded_protocol.protocol;
    snapshot["version"] = loaded_protocol.version;
    snapshot["state"] = current_state;
    snapshot["timestamp"] = std::time(nullptr);
    
    return snapshot;
}

bool WASMClient::restore_from_snapshot(const json& snapshot) {
    if (!snapshot.contains("state")) {
        return false;
    }
    
    current_state = snapshot["state"];
    return true;
}

std::string WASMClient::export_to_wasm(const CarFile& car_file) {
    // 这里应该生成实际的 WASM 模块
    // 暂时返回一个占位符
    return "// WASM module placeholder for protocol: " + car_file.protocol;
}

} // namespace cardity 