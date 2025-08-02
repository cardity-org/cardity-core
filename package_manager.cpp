#include "package_manager.h"
#include <iostream>
#include <fstream>
#include <sstream>
#include <algorithm>
#include <curl/curl.h>
#include <archive.h>
#include <archive_entry.h>

namespace cardity {

// 辅助函数
static size_t copy_data(struct archive* ar, struct archive* aw) {
    int r;
    const void* buff;
    size_t size;
    int64_t offset;
    
    for (;;) {
        r = archive_read_data_block(ar, &buff, &size, &offset);
        if (r == ARCHIVE_EOF)
            return ARCHIVE_OK;
        if (r < ARCHIVE_OK)
            return r;
        r = archive_write_data_block(aw, buff, size, offset);
        if (r < ARCHIVE_OK) {
            return r;
        }
    }
}

// PackageManager 实现
PackageManager::PackageManager() 
    : registry_url("https://registry.cardity.dev"), 
      cache_dir("./.cardity/cache"),
      packages_dir("./.cardity/packages") {
    initialize();
}

PackageManager::PackageManager(const std::string& registry, const std::string& cache)
    : registry_url(registry), 
      cache_dir(cache + "/cache"),
      packages_dir(cache + "/packages") {
    initialize();
}

void PackageManager::initialize() {
    // 创建必要的目录
    fs::create_directories(cache_dir);
    fs::create_directories(packages_dir);
    
    // 初始化 CURL
    curl_global_init(CURL_GLOBAL_DEFAULT);
    
    // 加载已安装的包信息
    load_installed_packages();
}

bool PackageManager::install_package(const std::string& package_name, const std::string& version) {
    try {
        std::cout << "📦 Installing package: " << package_name << "@" << version << std::endl;
        
        // 检查包是否已安装
        if (package_exists(package_name)) {
            std::cout << "⚠️  Package already installed: " << package_name << std::endl;
            return true;
        }
        
        // 获取包元数据
        json metadata = fetch_package_metadata(package_name);
        if (metadata.empty()) {
            std::cerr << "❌ Package not found: " << package_name << std::endl;
            return false;
        }
        
        // 确定版本
        std::string target_version = version;
        if (version == "latest") {
            target_version = metadata["latest"];
        }
        
        // 下载包
        if (!download_package(package_name, target_version)) {
            std::cerr << "❌ Failed to download package: " << package_name << std::endl;
            return false;
        }
        
        // 解压包
        std::string archive_path = cache_dir + "/" + package_name + "-" + target_version + ".tar.gz";
        std::string extract_path = packages_dir + "/" + package_name;
        
        if (!extract_package(archive_path, extract_path)) {
            std::cerr << "❌ Failed to extract package: " << package_name << std::endl;
            return false;
        }
        
        // 验证包
        if (!validate_package(extract_path)) {
            std::cerr << "❌ Invalid package: " << package_name << std::endl;
            return false;
        }
        
        // 安装依赖
        PackageInfo pkg_info = get_package_info(package_name);
        if (!pkg_info.dependencies.empty()) {
            std::cout << "📋 Installing dependencies..." << std::endl;
            std::vector<Dependency> deps;
            for (const auto& dep : pkg_info.dependencies) {
                deps.push_back(Dependency(dep, "latest"));
            }
            resolve_dependencies(deps);
        }
        
        // 更新已安装包列表
        installed_packages[package_name] = pkg_info;
        save_installed_packages();
        
        std::cout << "✅ Package installed successfully: " << package_name << "@" << target_version << std::endl;
        return true;
        
    } catch (const std::exception& e) {
        std::cerr << "❌ Error installing package: " << e.what() << std::endl;
        return false;
    }
}

bool PackageManager::install_package_from_url(const std::string& url, const std::string& version) {
    try {
        std::cout << "📦 Installing package from URL: " << url << std::endl;
        
        // 解析包名
        size_t last_slash = url.find_last_of('/');
        std::string package_name = url.substr(last_slash + 1);
        
        // 下载包
        std::string download_path = cache_dir + "/" + package_name + ".tar.gz";
        
        CURL* curl = curl_easy_init();
        if (!curl) {
            std::cerr << "❌ Failed to initialize CURL" << std::endl;
            return false;
        }
        
        FILE* fp = fopen(download_path.c_str(), "wb");
        if (!fp) {
            std::cerr << "❌ Failed to create download file" << std::endl;
            curl_easy_cleanup(curl);
            return false;
        }
        
        curl_easy_setopt(curl, CURLOPT_URL, url.c_str());
        curl_easy_setopt(curl, CURLOPT_WRITEFUNCTION, NULL);
        curl_easy_setopt(curl, CURLOPT_WRITEDATA, fp);
        curl_easy_setopt(curl, CURLOPT_FOLLOWLOCATION, 1L);
        
        CURLcode res = curl_easy_perform(curl);
        fclose(fp);
        curl_easy_cleanup(curl);
        
        if (res != CURLE_OK) {
            std::cerr << "❌ Failed to download package: " << curl_easy_strerror(res) << std::endl;
            return false;
        }
        
        // 解压并安装
        std::string extract_path = packages_dir + "/" + package_name;
        if (!extract_package(download_path, extract_path)) {
            std::cerr << "❌ Failed to extract package" << std::endl;
            return false;
        }
        
        // 验证和安装
        if (!validate_package(extract_path)) {
            std::cerr << "❌ Invalid package" << std::endl;
            return false;
        }
        
        // 更新已安装包列表
        PackageInfo pkg_info;
        pkg_info.name = package_name;
        pkg_info.version = version;
        pkg_info.source = url;
        installed_packages[package_name] = pkg_info;
        save_installed_packages();
        
        std::cout << "✅ Package installed successfully from URL" << std::endl;
        return true;
        
    } catch (const std::exception& e) {
        std::cerr << "❌ Error installing package from URL: " << e.what() << std::endl;
        return false;
    }
}

bool PackageManager::install_package_from_local(const std::string& path) {
    try {
        std::cout << "📦 Installing package from local path: " << path << std::endl;
        
        if (!fs::exists(path)) {
            std::cerr << "❌ Package path does not exist: " << path << std::endl;
            return false;
        }
        
        // 读取包配置
        std::string config_path = path + "/cardity.json";
        if (!fs::exists(config_path)) {
            std::cerr << "❌ Package configuration not found: " << config_path << std::endl;
            return false;
        }
        
        std::ifstream ifs(config_path);
        json config = json::parse(ifs);
        
        std::string package_name = config["name"];
        std::string version = config["version"];
        
        // 复制包到安装目录
        std::string install_path = packages_dir + "/" + package_name;
        fs::create_directories(install_path);
        
        // 复制所有文件
        for (const auto& entry : fs::recursive_directory_iterator(path)) {
            if (entry.is_regular_file()) {
                std::string relative_path = fs::relative(entry.path(), path).string();
                std::string target_path = install_path + "/" + relative_path;
                
                fs::create_directories(fs::path(target_path).parent_path());
                fs::copy_file(entry.path(), target_path, fs::copy_options::overwrite_existing);
            }
        }
        
        // 验证包
        if (!validate_package(install_path)) {
            std::cerr << "❌ Invalid package" << std::endl;
            return false;
        }
        
        // 更新已安装包列表
        PackageInfo pkg_info;
        pkg_info.name = package_name;
        pkg_info.version = version;
        pkg_info.source = "local";
        installed_packages[package_name] = pkg_info;
        save_installed_packages();
        
        std::cout << "✅ Package installed successfully from local path" << std::endl;
        return true;
        
    } catch (const std::exception& e) {
        std::cerr << "❌ Error installing package from local path: " << e.what() << std::endl;
        return false;
    }
}

bool PackageManager::uninstall_package(const std::string& package_name) {
    try {
        std::cout << "🗑️  Uninstalling package: " << package_name << std::endl;
        
        if (!package_exists(package_name)) {
            std::cerr << "❌ Package not installed: " << package_name << std::endl;
            return false;
        }
        
        // 删除包目录
        std::string package_path = packages_dir + "/" + package_name;
        fs::remove_all(package_path);
        
        // 从已安装包列表中移除
        installed_packages.erase(package_name);
        save_installed_packages();
        
        std::cout << "✅ Package uninstalled successfully: " << package_name << std::endl;
        return true;
        
    } catch (const std::exception& e) {
        std::cerr << "❌ Error uninstalling package: " << e.what() << std::endl;
        return false;
    }
}

std::vector<PackageInfo> PackageManager::list_installed_packages() {
    std::vector<PackageInfo> packages;
    for (const auto& pair : installed_packages) {
        packages.push_back(pair.second);
    }
    return packages;
}

bool PackageManager::package_exists(const std::string& package_name) {
    return installed_packages.find(package_name) != installed_packages.end();
}

PackageInfo PackageManager::get_package_info(const std::string& package_name) {
    if (package_exists(package_name)) {
        return installed_packages[package_name];
    }
    
    // 尝试从包目录读取信息
    std::string package_path = packages_dir + "/" + package_name;
    std::string config_path = package_path + "/cardity.json";
    
    if (fs::exists(config_path)) {
        std::ifstream ifs(config_path);
        json config = json::parse(ifs);
        
        PackageInfo info;
        info.name = config["name"];
        info.version = config["version"];
        info.description = config.value("description", "");
        info.author = config.value("author", "");
        info.license = config.value("license", "");
        info.repository = config.value("repository", "");
        
        if (config.contains("dependencies")) {
            for (const auto& dep : config["dependencies"]) {
                info.dependencies.push_back(dep);
            }
        }
        
        return info;
    }
    
    return PackageInfo();
}

std::string PackageManager::get_package_path(const std::string& package_name) {
    return packages_dir + "/" + package_name;
}

bool PackageManager::validate_package(const std::string& package_path) {
    try {
        // 检查必要的文件
        std::string config_path = package_path + "/cardity.json";
        if (!fs::exists(config_path)) {
            return false;
        }
        
        // 读取并验证配置
        std::ifstream ifs(config_path);
        json config = json::parse(ifs);
        
        if (!config.contains("name") || !config.contains("version")) {
            return false;
        }
        
        // 检查源代码文件
        std::string src_dir = package_path + "/src";
        if (fs::exists(src_dir)) {
            bool has_source_files = false;
            for (const auto& entry : fs::directory_iterator(src_dir)) {
                if (entry.is_regular_file() && entry.path().extension() == ".cardity") {
                    has_source_files = true;
                    break;
                }
            }
            if (!has_source_files) {
                return false;
            }
        }
        
        return true;
        
    } catch (const std::exception& e) {
        return false;
    }
}

std::string PackageManager::import_package(const std::string& package_name, const std::string& symbol) {
    try {
        if (!package_exists(package_name)) {
            throw std::runtime_error("Package not installed: " + package_name);
        }
        
        std::string package_path = get_package_path(package_name);
        std::string import_path = package_path + "/src";
        
        // 生成导入语句
        std::string import_statement = "import \"" + import_path + "\" as " + symbol + ";\n";
        
        return import_statement;
        
    } catch (const std::exception& e) {
        std::cerr << "❌ Error importing package: " << e.what() << std::endl;
        return "";
    }
}

// 内部方法实现
bool PackageManager::download_package(const std::string& package_name, const std::string& version) {
    // 实现包下载逻辑
    std::string download_url = registry_url + "/packages/" + package_name + "/" + version + "/download";
    std::string download_path = cache_dir + "/" + package_name + "-" + version + ".tar.gz";
    
    CURL* curl = curl_easy_init();
    if (!curl) {
        return false;
    }
    
    FILE* fp = fopen(download_path.c_str(), "wb");
    if (!fp) {
        curl_easy_cleanup(curl);
        return false;
    }
    
    curl_easy_setopt(curl, CURLOPT_URL, download_url.c_str());
    curl_easy_setopt(curl, CURLOPT_WRITEFUNCTION, NULL);
    curl_easy_setopt(curl, CURLOPT_WRITEDATA, fp);
    curl_easy_setopt(curl, CURLOPT_FOLLOWLOCATION, 1L);
    
    CURLcode res = curl_easy_perform(curl);
    fclose(fp);
    curl_easy_cleanup(curl);
    
    return res == CURLE_OK;
}

bool PackageManager::extract_package(const std::string& archive_path, const std::string& extract_path) {
    struct archive* a = archive_read_new();
    struct archive* ext = archive_write_disk_new();
    struct archive_entry* entry;
    int r;
    
    archive_read_support_filter_gzip(a);
    archive_read_support_format_tar(a);
    archive_write_disk_set_options(ext, ARCHIVE_EXTRACT_TIME);
    
    if ((r = archive_read_open_filename(a, archive_path.c_str(), 10240))) {
        archive_read_free(a);
        archive_write_free(ext);
        return false;
    }
    
    for (;;) {
        r = archive_read_next_header(a, &entry);
        if (r == ARCHIVE_EOF)
            break;
        if (r < ARCHIVE_OK)
            break;
        
        std::string entry_path = extract_path + "/" + archive_entry_pathname(entry);
        archive_entry_set_pathname(entry, entry_path.c_str());
        
        r = archive_write_header(ext, entry);
        if (r < ARCHIVE_OK) {
            break;
        }
        
        if (archive_entry_size(entry) > 0) {
            r = copy_data(a, ext);
            if (r < ARCHIVE_OK) {
                break;
            }
        }
        
        r = archive_write_finish_entry(ext);
        if (r < ARCHIVE_OK) {
            break;
        }
    }
    
    archive_read_close(a);
    archive_read_free(a);
    archive_write_close(ext);
    archive_write_free(ext);
    
    return r == ARCHIVE_OK;
}

json PackageManager::fetch_package_metadata(const std::string& package_name) {
    std::string url = registry_url + "/packages/" + package_name;
    
    CURL* curl = curl_easy_init();
    if (!curl) {
        return json();
    }
    
    std::string response;
    curl_easy_setopt(curl, CURLOPT_URL, url.c_str());
    curl_easy_setopt(curl, CURLOPT_WRITEFUNCTION, +[](void* contents, size_t size, size_t nmemb, std::string* userp) {
        userp->append((char*)contents, size * nmemb);
        return size * nmemb;
    });
    curl_easy_setopt(curl, CURLOPT_WRITEDATA, &response);
    
    CURLcode res = curl_easy_perform(curl);
    curl_easy_cleanup(curl);
    
    if (res != CURLE_OK) {
        return json();
    }
    
    try {
        return json::parse(response);
    } catch (const std::exception& e) {
        return json();
    }
}

void PackageManager::load_installed_packages() {
    std::string packages_file = cache_dir + "/installed_packages.json";
    if (fs::exists(packages_file)) {
        try {
            std::ifstream ifs(packages_file);
            json data = json::parse(ifs);
            
            for (const auto& item : data) {
                PackageInfo info;
                info.name = item["name"];
                info.version = item["version"];
                info.description = item.value("description", "");
                info.author = item.value("author", "");
                info.license = item.value("license", "");
                info.repository = item.value("repository", "");
                
                if (item.contains("dependencies")) {
                    for (const auto& dep : item["dependencies"]) {
                        info.dependencies.push_back(dep);
                    }
                }
                
                installed_packages[info.name] = info;
            }
        } catch (const std::exception& e) {
            std::cerr << "Warning: Failed to load installed packages: " << e.what() << std::endl;
        }
    }
}

void PackageManager::save_installed_packages() {
    std::string packages_file = cache_dir + "/installed_packages.json";
    json data = json::array();
    
    for (const auto& pair : installed_packages) {
        json item;
        item["name"] = pair.second.name;
        item["version"] = pair.second.version;
        item["description"] = pair.second.description;
        item["author"] = pair.second.author;
        item["license"] = pair.second.license;
        item["repository"] = pair.second.repository;
        item["dependencies"] = pair.second.dependencies;
        
        data.push_back(item);
    }
    
    std::ofstream ofs(packages_file);
    ofs << data.dump(2) << std::endl;
}

std::vector<PackageInfo> PackageManager::search_packages(const std::string& query) {
    std::vector<PackageInfo> result;
    
    // 这里应该实现实际的搜索逻辑
    // 简化实现：返回空结果
    (void)query; // 避免未使用参数警告
    return result;
}

bool PackageManager::resolve_dependencies(const std::vector<Dependency>& deps) {
    for (const auto& dep : deps) {
        if (!install_package(dep.name, dep.version)) {
            std::cerr << "Failed to install dependency: " << dep.name << std::endl;
            return false;
        }
    }
    return true;
}

bool PackageManager::update_package(const std::string& package_name) {
    std::cout << "🔄 Updating package: " << package_name << std::endl;
    
    // 简化实现：重新安装包
    return install_package(package_name, "latest");
}

} // namespace cardity 