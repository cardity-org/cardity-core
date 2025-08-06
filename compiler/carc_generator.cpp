#include "carc_generator.h"
#include <fstream>
#include <iostream>
#include <cstring>

namespace cardity {

std::vector<uint8_t> CarcGenerator::compile_to_carc(const Protocol& protocol) {
    std::vector<uint8_t> data;
    
    // 写入头部信息
    CarcHeader header;
    header.magic = 0x43415243; // "CARC"
    header.version = 1;
    header.protocol_len = protocol.name.length();
    header.owner_len = protocol.metadata.owner.length();
    header.state_size = protocol.state.variables.size();
    header.methods_size = protocol.methods.size();
    
    // 先写入头部结构
    write_uint32(data, header.magic);
    write_uint32(data, header.version);
    write_uint32(data, header.protocol_len);
    write_uint32(data, header.owner_len);
    write_uint32(data, header.state_size);
    write_uint32(data, header.methods_size);
    write_uint32(data, 0); // total_size 稍后填充
    
    // 写入协议名和所有者
    write_string(data, protocol.name);
    write_string(data, protocol.metadata.owner);
    
    // 写入状态变量
    for (const auto& var : protocol.state.variables) {
        compile_state_var(data, var);
    }
    
    // 写入方法
    for (const auto& method : protocol.methods) {
        compile_method(data, method);
    }
    
    // 更新总大小
    uint32_t total_size = data.size();
    memcpy(&data[24], &total_size, sizeof(uint32_t)); // 更新 total_size 字段
    
    return data;
}

bool CarcGenerator::write_to_file(const std::vector<uint8_t>& carc_data, const std::string& filename) {
    std::ofstream file(filename, std::ios::binary);
    if (!file.is_open()) {
        std::cerr << "❌ Error: Cannot open file for writing: " << filename << std::endl;
        return false;
    }
    
    file.write(reinterpret_cast<const char*>(carc_data.data()), carc_data.size());
    file.close();
    
    if (file.fail()) {
        std::cerr << "❌ Error: Failed to write to file: " << filename << std::endl;
        return false;
    }
    
    return true;
}

Protocol CarcGenerator::parse_from_carc(const std::string& filename) {
    std::ifstream file(filename, std::ios::binary);
    if (!file.is_open()) {
        throw std::runtime_error("Cannot open file: " + filename);
    }
    
    // 读取文件内容
    file.seekg(0, std::ios::end);
    size_t file_size = file.tellg();
    file.seekg(0, std::ios::beg);
    
    std::vector<uint8_t> data(file_size);
    file.read(reinterpret_cast<char*>(data.data()), file_size);
    file.close();
    
    // 解析头部
    size_t offset = 0;
    CarcHeader header;
    header.magic = read_uint32(data, offset);
    header.version = read_uint32(data, offset);
    header.protocol_len = read_uint32(data, offset);
    header.owner_len = read_uint32(data, offset);
    header.state_size = read_uint32(data, offset);
    header.methods_size = read_uint32(data, offset);
    header.total_size = read_uint32(data, offset);
    
    // 验证魔数
    if (header.magic != 0x43415243) {
        throw std::runtime_error("Invalid .carc file: wrong magic number");
    }
    
    // 解析协议信息
    Protocol protocol;
    protocol.name = read_string(data, offset);
    protocol.metadata.owner = read_string(data, offset);
    protocol.metadata.version = "1.0"; // 从版本字段解析
    
    // 解析状态变量
    for (uint32_t i = 0; i < header.state_size; ++i) {
        StateVariable var;
        var.name = read_string(data, offset);
        var.type = read_string(data, offset);
        var.default_value = read_string(data, offset);
        protocol.state.variables.push_back(var);
    }
    
    // 解析方法
    for (uint32_t i = 0; i < header.methods_size; ++i) {
        Method method;
        method.name = read_string(data, offset);
        
        uint32_t params_count = read_uint32(data, offset);
        for (uint32_t j = 0; j < params_count; ++j) {
            method.params.push_back(read_string(data, offset));
        }
        
        method.logic_lines.push_back(read_string(data, offset));
        protocol.methods.push_back(method);
    }
    
    return protocol;
}

void CarcGenerator::write_string(std::vector<uint8_t>& data, const std::string& str) {
    uint32_t len = str.length();
    write_uint32(data, len);
    data.insert(data.end(), str.begin(), str.end());
}

void CarcGenerator::write_uint32(std::vector<uint8_t>& data, uint32_t value) {
    data.push_back((value >> 0) & 0xFF);
    data.push_back((value >> 8) & 0xFF);
    data.push_back((value >> 16) & 0xFF);
    data.push_back((value >> 24) & 0xFF);
}

std::string CarcGenerator::read_string(const std::vector<uint8_t>& data, size_t& offset) {
    uint32_t len = read_uint32(data, offset);
    std::string str(reinterpret_cast<const char*>(&data[offset]), len);
    offset += len;
    return str;
}

uint32_t CarcGenerator::read_uint32(const std::vector<uint8_t>& data, size_t& offset) {
    uint32_t value = 0;
    value |= data[offset++];
    value |= (data[offset++] << 8);
    value |= (data[offset++] << 16);
    value |= (data[offset++] << 24);
    return value;
}

void CarcGenerator::compile_state_var(std::vector<uint8_t>& data, const StateVariable& var) {
    write_string(data, var.name);
    write_string(data, var.type);
    write_string(data, var.default_value);
}

void CarcGenerator::compile_method(std::vector<uint8_t>& data, const Method& method) {
    write_string(data, method.name);
    write_uint32(data, method.params.size());
    
    for (const auto& param : method.params) {
        write_string(data, param);
    }
    
    // 合并逻辑行
    std::string logic;
    for (size_t i = 0; i < method.logic_lines.size(); ++i) {
        if (i > 0) logic += "\n";
        logic += method.logic_lines[i];
    }
    write_string(data, logic);
}

} // namespace cardity 