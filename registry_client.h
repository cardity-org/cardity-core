#pragma once

#include <string>
#include <nlohmann/json.hpp>

namespace cardity {

using json = nlohmann::json;

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