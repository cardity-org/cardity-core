#ifndef CARDITY_CARC_GENERATOR_H
#define CARDITY_CARC_GENERATOR_H

#include "ast.h"
#include <vector>
#include <string>
#include <cstdint>

namespace cardity {

// .carc 文件格式结构
struct CarcHeader {
    uint32_t magic;           // 魔数: 0x43415243 ("CARC")
    uint32_t version;         // 版本号: 1
    uint32_t protocol_len;    // 协议名长度
    uint32_t owner_len;       // 所有者地址长度
    uint32_t state_size;      // 状态变量数量
    uint32_t methods_size;    // 方法数量
    uint32_t total_size;      // 文件总大小
};

struct CarcStateVar {
    uint32_t name_len;        // 变量名长度
    uint32_t type_len;        // 类型长度
    uint32_t default_len;     // 默认值长度
    // 后面跟着: name + type + default_value
};

struct CarcMethod {
    uint32_t name_len;        // 方法名长度
    uint32_t params_count;    // 参数数量
    uint32_t logic_len;       // 逻辑代码长度
    // 后面跟着: name + params + logic
};

class CarcGenerator {
public:
    // 将 Protocol AST 编译为 .carc 二进制格式
    static std::vector<uint8_t> compile_to_carc(const Protocol& protocol);
    
    // 将 .carc 二进制数据写入文件
    static bool write_to_file(const std::vector<uint8_t>& carc_data, const std::string& filename);
    
    // 从 .carc 文件读取并解析
    static Protocol parse_from_carc(const std::string& filename);
    
private:
    // 写入字符串到二进制数据
    static void write_string(std::vector<uint8_t>& data, const std::string& str);
    
    // 写入32位整数到二进制数据
    static void write_uint32(std::vector<uint8_t>& data, uint32_t value);
    
    // 从二进制数据读取字符串
    static std::string read_string(const std::vector<uint8_t>& data, size_t& offset);
    
    // 从二进制数据读取32位整数
    static uint32_t read_uint32(const std::vector<uint8_t>& data, size_t& offset);
    
    // 编译状态变量
    static void compile_state_var(std::vector<uint8_t>& data, const StateVariable& var);
    
    // 编译方法
    static void compile_method(std::vector<uint8_t>& data, const Method& method);
};

} // namespace cardity

#endif // CARDITY_CARC_GENERATOR_H 