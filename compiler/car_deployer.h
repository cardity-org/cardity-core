#pragma once

#include <string>
#include <vector>
#include <nlohmann/json.hpp>
#include "event_system.h"

namespace cardity {

using json = nlohmann::json;

// .car 文件结构定义
struct CarFile {
    std::string protocol;
    std::string version;
    std::string owner;
    json cpl;  // 协议逻辑
    json abi;  // 接口定义
    std::string signature;  // 可选签名
    std::string hash;      // 文件哈希
    
    CarFile() = default;
    CarFile(const std::string& p, const std::string& v) : protocol(p), version(v) {}
};

// .car 文件部署器
class CarDeployer {
private:
    std::string protocol_name;
    std::string version;
    std::string owner_address;
    
public:
    CarDeployer(const std::string& protocol, const std::string& ver);
    
    // 设置所有者地址
    void set_owner(const std::string& owner);
    
    // 从 .car 协议文件创建部署包
    static CarFile create_deployment_package(const std::string& car_file_path);
    
    // 从 JSON 数据创建部署包
    static CarFile create_deployment_package_from_json(const json& car_data);
    
    // 生成完整的 .car 部署文件
    json generate_deployment_json(const json& cpl_data);
    
    // 计算文件哈希
    static std::string calculate_hash(const json& data);
    
    // 签名 .car 文件（可选）
    static std::string sign_car_file(const CarFile& car_file, const std::string& private_key);
    
    // 验证签名
    static bool verify_signature(const CarFile& car_file, const std::string& public_key);
    
    // 编码为 base64（用于链上嵌入）
    static std::string encode_to_base64(const json& car_data);
    
    // 从 base64 解码
    static json decode_from_base64(const std::string& base64_data);
    
    // 生成铭文格式（用于 Dogecoin UTXO）
    static json generate_inscription_format(const CarFile& car_file);
    
    // 验证 .car 文件格式
    static bool validate_car_format(const json& car_data);
    
    // 导出为文件
    static void export_to_file(const CarFile& car_file, const std::string& output_path);
};

// WASM 客户端接口定义
class WASMClient {
private:
    CarFile loaded_protocol;
    json current_state;
    EventManager event_manager;
    
public:
    WASMClient();
    
    // 加载 .car 协议
    bool load_protocol(const std::string& car_data);
    
    // 执行方法调用
    json execute_method(const std::string& method_name, const json& args);
    
    // 获取当前状态
    json get_state() const { return current_state; }
    
    // 获取事件日志
    json get_event_log() const;
    
    // 获取 ABI 接口
    json get_abi() const { return loaded_protocol.abi; }
    
    // 验证协议完整性
    bool validate_protocol() const;
    
    // 创建状态快照
    json create_snapshot() const;
    
    // 从快照恢复状态
    bool restore_from_snapshot(const json& snapshot);
    
    // 导出为 WASM 模块
    static std::string export_to_wasm(const CarFile& car_file);
};

} // namespace cardity 