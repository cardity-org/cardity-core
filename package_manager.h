#pragma once

#include <string>
#include <vector>
#include <unordered_map>
#include <nlohmann/json.hpp>
#include <filesystem>

namespace cardity {

using json = nlohmann::json;
namespace fs = std::filesystem;

// 包信息结构
struct PackageInfo {
    std::string name;
    std::string version;
    std::string description;
    std::string author;
    std::string license;
    std::string repository;
    std::string source;  // "registry", "github", "local"
    std::vector<std::string> dependencies;
    std::vector<std::string> files;
    std::string hash;
    std::string timestamp;
    
    PackageInfo() = default;
    PackageInfo(const std::string& n, const std::string& v) : name(n), version(v) {}
};

// 包依赖解析器
struct Dependency {
    std::string name;
    std::string version;
    std::string source;  // "registry", "github", "local"
    std::string url;     // 包源地址
    
    Dependency() = default;
    Dependency(const std::string& n, const std::string& v) : name(n), version(v) {}
};

// 包管理器类
class PackageManager {
private:
    std::string registry_url;
    std::string cache_dir;
    std::string packages_dir;
    std::unordered_map<std::string, PackageInfo> installed_packages;
    
public:
    PackageManager();
    PackageManager(const std::string& registry, const std::string& cache);
    
    // 初始化包管理器
    void initialize();
    
    // 包安装
    bool install_package(const std::string& package_name, const std::string& version = "latest");
    bool install_package_from_url(const std::string& url, const std::string& version = "latest");
    bool install_package_from_local(const std::string& path);
    
    // 包卸载
    bool uninstall_package(const std::string& package_name);
    
    // 包更新
    bool update_package(const std::string& package_name);
    bool update_all_packages();
    
    // 包列表
    std::vector<PackageInfo> list_installed_packages();
    std::vector<PackageInfo> search_packages(const std::string& query);
    
    // 依赖管理
    bool resolve_dependencies(const std::vector<Dependency>& deps);
    std::vector<Dependency> get_package_dependencies(const std::string& package_name);
    
    // 包信息
    PackageInfo get_package_info(const std::string& package_name);
    bool package_exists(const std::string& package_name);
    
    // 包验证
    bool validate_package(const std::string& package_path);
    std::string calculate_package_hash(const std::string& package_path);
    
    // 缓存管理
    void clear_cache();
    void update_cache();
    
    // 包发布
    bool publish_package(const std::string& package_path, const std::string& api_key);
    bool unpublish_package(const std::string& package_name, const std::string& version, const std::string& api_key);
    
    // 包导入
    std::string import_package(const std::string& package_name, const std::string& symbol);
    
    // 获取包路径
    std::string get_package_path(const std::string& package_name);
    
    // 设置配置
    void set_registry_url(const std::string& url);
    void set_cache_directory(const std::string& path);
    
private:
    // 内部方法
    bool download_package(const std::string& package_name, const std::string& version);
    bool extract_package(const std::string& archive_path, const std::string& extract_path);
    json fetch_package_metadata(const std::string& package_name);
    bool verify_package_signature(const std::string& package_path, const std::string& signature);
    std::string generate_package_signature(const std::string& package_path, const std::string& private_key);
    void load_installed_packages();
    void save_installed_packages();
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
    
    // 依赖管理
    void add_dependency(const std::string& name, const std::string& version);
    void remove_dependency(const std::string& name);
    void update_dependency(const std::string& name, const std::string& version);
    
    // 脚本管理
    void add_script(const std::string& name, const std::string& command);
    void remove_script(const std::string& name);
    
    // 获取配置
    std::string get_name() const;
    std::string get_version() const;
    std::string get_description() const;
    std::string get_author() const;
    std::string get_license() const;
    std::string get_repository() const;
    std::vector<Dependency> get_dependencies() const;
    std::unordered_map<std::string, std::string> get_scripts() const;
    
    // 验证配置
    bool validate();
    
private:
    void create_default_config();
};

// 包构建器
class PackageBuilder {
private:
    PackageConfig config;
    std::string source_dir;
    std::string output_dir;
    
public:
    PackageBuilder(const std::string& source, const std::string& output);
    
    // 构建包
    bool build();
    bool build_for_distribution();
    bool build_for_development();
    
    // 清理构建
    void clean();
    
    // 运行脚本
    bool run_script(const std::string& script_name);
    
    // 测试包
    bool test();
    
    // 发布包
    bool publish(const std::string& api_key);
    
private:
    bool compile_sources();
    bool copy_assets();
    bool generate_metadata();
    bool create_archive();
    bool run_tests();
};

// 包注册表客户端
class RegistryClient {
private:
    std::string registry_url;
    std::string api_key;
    
public:
    RegistryClient(const std::string& url, const std::string& key = "");
    
    // 包查询
    json search_packages(const std::string& query);
    json get_package_info(const std::string& package_name);
    json get_package_versions(const std::string& package_name);
    
    // 包下载
    bool download_package(const std::string& package_name, const std::string& version, const std::string& output_path);
    
    // 包发布
    bool publish_package(const std::string& package_path, const std::string& api_key);
    bool unpublish_package(const std::string& package_name, const std::string& version, const std::string& api_key);
    
    // 用户管理
    json login(const std::string& username, const std::string& password);
    bool logout();
    json get_user_info();
    
private:
    json make_request(const std::string& endpoint, const std::string& method = "GET", const json& data = json());
    std::string upload_file(const std::string& file_path);
};

} // namespace cardity 