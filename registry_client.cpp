#include "registry_client.h"
#include <iostream>
#include <fstream>
#include <sstream>
#include <curl/curl.h>

namespace cardity {

RegistryClient::RegistryClient(const std::string& url, const std::string& key) 
    : registry_url(url), api_key(key) {
    // 初始化 CURL
    curl_global_init(CURL_GLOBAL_DEFAULT);
}

json RegistryClient::search_packages(const std::string& query) {
    std::string endpoint = "/search?q=" + query;
    return make_request(endpoint);
}

json RegistryClient::get_package_info(const std::string& package_name) {
    std::string endpoint = "/packages/" + package_name;
    return make_request(endpoint);
}

json RegistryClient::get_package_versions(const std::string& package_name) {
    std::string endpoint = "/packages/" + package_name + "/versions";
    return make_request(endpoint);
}

bool RegistryClient::download_package(const std::string& package_name, const std::string& version, const std::string& output_path) {
    std::string endpoint = "/packages/" + package_name + "/" + version + "/download";
    
    CURL* curl = curl_easy_init();
    if (!curl) {
        return false;
    }
    
    std::string url = registry_url + endpoint;
    FILE* fp = fopen(output_path.c_str(), "wb");
    if (!fp) {
        curl_easy_cleanup(curl);
        return false;
    }
    
    curl_easy_setopt(curl, CURLOPT_URL, url.c_str());
    curl_easy_setopt(curl, CURLOPT_WRITEFUNCTION, NULL);
    curl_easy_setopt(curl, CURLOPT_WRITEDATA, fp);
    curl_easy_setopt(curl, CURLOPT_FOLLOWLOCATION, 1L);
    
    // 添加认证头
    if (!api_key.empty()) {
        struct curl_slist* headers = NULL;
        headers = curl_slist_append(headers, ("Authorization: Bearer " + api_key).c_str());
        curl_easy_setopt(curl, CURLOPT_HTTPHEADER, headers);
    }
    
    CURLcode res = curl_easy_perform(curl);
    fclose(fp);
    curl_easy_cleanup(curl);
    
    return res == CURLE_OK;
}

bool RegistryClient::publish_package(const std::string& package_path, const std::string& api_key) {
    if (api_key.empty()) {
        std::cerr << "API key is required for publishing" << std::endl;
        return false;
    }
    
    // 上传包文件
    std::string upload_url = upload_file(package_path);
    if (upload_url.empty()) {
        return false;
    }
    
    // 创建发布请求
    json publish_data = {
        {"upload_url", upload_url},
        {"package_path", package_path}
    };
    
    json response = make_request("/publish", "POST", publish_data);
    return !response.empty() && response.contains("success") && response["success"].get<bool>();
}

bool RegistryClient::unpublish_package(const std::string& package_name, const std::string& version, const std::string& api_key) {
    if (api_key.empty()) {
        std::cerr << "API key is required for unpublishing" << std::endl;
        return false;
    }
    
    json unpublish_data = {
        {"package_name", package_name},
        {"version", version}
    };
    
    json response = make_request("/unpublish", "DELETE", unpublish_data);
    return !response.empty() && response.contains("success") && response["success"].get<bool>();
}

json RegistryClient::login(const std::string& username, const std::string& password) {
    json login_data = {
        {"username", username},
        {"password", password}
    };
    
    json response = make_request("/login", "POST", login_data);
    if (!response.empty() && response.contains("token")) {
        api_key = response["token"].get<std::string>();
    }
    
    return response;
}

bool RegistryClient::logout() {
    json response = make_request("/logout", "POST");
    api_key.clear();
    return !response.empty() && response.contains("success") && response["success"].get<bool>();
}

json RegistryClient::get_user_info() {
    return make_request("/user");
}

json RegistryClient::make_request(const std::string& endpoint, const std::string& method, const json& data) {
    CURL* curl = curl_easy_init();
    if (!curl) {
        return json();
    }
    
    std::string url = registry_url + endpoint;
    std::string response;
    
    curl_easy_setopt(curl, CURLOPT_URL, url.c_str());
    curl_easy_setopt(curl, CURLOPT_WRITEFUNCTION, +[](void* contents, size_t size, size_t nmemb, std::string* userp) {
        userp->append((char*)contents, size * nmemb);
        return size * nmemb;
    });
    curl_easy_setopt(curl, CURLOPT_WRITEDATA, &response);
    
    // 设置请求方法
    if (method == "POST") {
        curl_easy_setopt(curl, CURLOPT_POST, 1L);
    } else if (method == "DELETE") {
        curl_easy_setopt(curl, CURLOPT_CUSTOMREQUEST, "DELETE");
    }
    
    // 设置请求数据
    if (!data.empty()) {
        std::string post_data = data.dump();
        curl_easy_setopt(curl, CURLOPT_POSTFIELDS, post_data.c_str());
        
        struct curl_slist* headers = NULL;
        headers = curl_slist_append(headers, "Content-Type: application/json");
        curl_easy_setopt(curl, CURLOPT_HTTPHEADER, headers);
    }
    
    // 添加认证头
    if (!api_key.empty()) {
        struct curl_slist* headers = NULL;
        headers = curl_slist_append(headers, ("Authorization: Bearer " + api_key).c_str());
        curl_easy_setopt(curl, CURLOPT_HTTPHEADER, headers);
    }
    
    CURLcode res = curl_easy_perform(curl);
    curl_easy_cleanup(curl);
    
    if (res != CURLE_OK) {
        std::cerr << "Request failed: " << curl_easy_strerror(res) << std::endl;
        return json();
    }
    
    try {
        return json::parse(response);
    } catch (const std::exception& e) {
        std::cerr << "Failed to parse response: " << e.what() << std::endl;
        return json();
    }
}

std::string RegistryClient::upload_file(const std::string& file_path) {
    CURL* curl = curl_easy_init();
    if (!curl) {
        return "";
    }
    
    std::string url = registry_url + "/upload";
    std::string response;
    
    curl_easy_setopt(curl, CURLOPT_URL, url.c_str());
    curl_easy_setopt(curl, CURLOPT_POST, 1L);
    curl_easy_setopt(curl, CURLOPT_WRITEFUNCTION, +[](void* contents, size_t size, size_t nmemb, std::string* userp) {
        userp->append((char*)contents, size * nmemb);
        return size * nmemb;
    });
    curl_easy_setopt(curl, CURLOPT_WRITEDATA, &response);
    
    // 设置文件上传
    curl_mime* mime = curl_mime_init(curl);
    curl_mimepart* part = curl_mime_addpart(mime);
    curl_mime_name(part, "file");
    curl_mime_filedata(part, file_path.c_str());
    curl_easy_setopt(curl, CURLOPT_MIMEPOST, mime);
    
    // 添加认证头
    if (!api_key.empty()) {
        struct curl_slist* headers = NULL;
        headers = curl_slist_append(headers, ("Authorization: Bearer " + api_key).c_str());
        curl_easy_setopt(curl, CURLOPT_HTTPHEADER, headers);
    }
    
    CURLcode res = curl_easy_perform(curl);
    curl_mime_free(mime);
    curl_easy_cleanup(curl);
    
    if (res != CURLE_OK) {
        std::cerr << "Upload failed: " << curl_easy_strerror(res) << std::endl;
        return "";
    }
    
    try {
        json response_json = json::parse(response);
        if (response_json.contains("upload_url")) {
            return response_json["upload_url"].get<std::string>();
        }
    } catch (const std::exception& e) {
        std::cerr << "Failed to parse upload response: " << e.what() << std::endl;
    }
    
    return "";
}

} // namespace cardity 