#pragma once

#include <string>
#include <vector>
#include <unordered_map>
#include <nlohmann/json.hpp>
#include <filesystem>

namespace cardity {

using json = nlohmann::json;
namespace fs = std::filesystem;

// 包依赖结构
struct Dependency {
    std::string name;
    std::string version;
    std::string source;  // "registry", "github", "local"
    std::string url;     // 包源地址
    
    Dependency() = default;
    Dependency(const std::string& n, const std::string& v) : name(n), version(v) {}
};

// 包配置文件管理器
class PackageConfig {
private:
    json config;
    std::string config_path;
    
public:
    PackageConfig(const std::string& path = "cardity.json");
    
    // 读取配置
    void load();
    void save();
    
    // 配置操作
    void set_name(const std::string& name);
    void set_version(const std::string& version);
    void set_description(const std::string& description);
    void set_author(const std::string& author);
    void set_license(const std::string& license);
    void set_repository(const std::string& repo);
    void set_keywords(const std::vector<std::string>& keywords);
    void set_homepage(const std::string& homepage);
    void set_bugs(const std::string& bugs);
    
    // 依赖管理
    void add_dependency(const std::string& name, const std::string& version);
    void add_dev_dependency(const std::string& name, const std::string& version);
    void remove_dependency(const std::string& name);
    void remove_dev_dependency(const std::string& name);
    void update_dependency(const std::string& name, const std::string& version);
    void update_dev_dependency(const std::string& name, const std::string& version);
    
    // 脚本管理
    void add_script(const std::string& name, const std::string& command);
    void remove_script(const std::string& name);
    void update_script(const std::string& name, const std::string& command);
    
    // 文件管理
    void add_file(const std::string& file_path);
    void remove_file(const std::string& file_path);
    void set_files(const std::vector<std::string>& files);
    
    // 获取配置
    std::string get_name() const;
    std::string get_version() const;
    std::string get_description() const;
    std::string get_author() const;
    std::string get_license() const;
    std::string get_repository() const;
    std::vector<std::string> get_keywords() const;
    std::string get_homepage() const;
    std::string get_bugs() const;
    
    std::vector<Dependency> get_dependencies() const;
    std::vector<Dependency> get_dev_dependencies() const;
    std::unordered_map<std::string, std::string> get_scripts() const;
    std::vector<std::string> get_files() const;
    
    // 验证配置
    bool validate();
    
    // 获取完整配置
    json get_config() const { return config; }
    
private:
    void create_default_config();
    Dependency parse_dependency(const std::string& dep_string) const;
    std::string format_dependency(const Dependency& dep) const;
};

} // namespace cardity 