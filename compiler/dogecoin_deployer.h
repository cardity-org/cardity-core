#ifndef CARDITY_DOGECOIN_DEPLOYER_H
#define CARDITY_DOGECOIN_DEPLOYER_H

#include <string>
#include <vector>
#include <nlohmann/json.hpp>

namespace cardity {

using json = nlohmann::json;

// Dogecoin 交易结构
struct DogecoinTransaction {
    std::string txid;
    std::string address;
    std::string private_key;
    std::string public_key;
    uint64_t amount;  // satoshis
    std::string op_return_data;
    std::string inscription_data;
};

// Dogecoin 部署器
class DogecoinDeployer {
public:
    // 从 .carc 文件创建 Dogecoin 交易
    static DogecoinTransaction create_deployment_transaction(
        const std::string& carc_file,
        const std::string& address,
        const std::string& private_key,
        uint64_t amount = 1000  // 默认 1000 satoshis
    );
    
    // 生成 OP_RETURN 数据
    static std::string generate_op_return_data(const std::vector<uint8_t>& carc_data);
    
    // 生成铭文格式数据
    static std::string generate_inscription_data(const std::vector<uint8_t>& carc_data);
    
    // 创建铭文交易
    static DogecoinTransaction create_inscription_transaction(
        const std::string& carc_file,
        const std::string& address,
        const std::string& private_key,
        const std::string& content_type = "application/octet-stream"
    );
    
    // 验证 .carc 文件格式
    static bool validate_carc_file(const std::string& carc_file);
    
    // 获取 .carc 文件信息
    static json get_carc_info(const std::string& carc_file);
    
    // 生成部署脚本
    static std::string generate_deployment_script(const DogecoinTransaction& tx);
    
    // 生成 RPC 命令
    static json generate_rpc_commands(const DogecoinTransaction& tx);
    
private:
    // 读取 .carc 文件
    static std::vector<uint8_t> read_carc_file(const std::string& filename);
    
    // 计算文件哈希
    static std::string calculate_file_hash(const std::vector<uint8_t>& data);
    
    // 编码为 Base64
    static std::string base64_encode(const std::vector<uint8_t>& data);
    
    // 创建铭文头部
    static std::string create_inscription_header(const std::string& content_type);
};

} // namespace cardity

#endif // CARDITY_DOGECOIN_DEPLOYER_H 