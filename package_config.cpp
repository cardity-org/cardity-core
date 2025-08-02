#include "package_manager.h"
#include <iostream>
#include <fstream>
#include <nlohmann/json.hpp>

using namespace cardity;
using json = nlohmann::json;

// PackageConfig 实现
PackageConfig::PackageConfig(const std::string& path) : config_path(path) {
    load();
}

void PackageConfig::load() {
    if (std::ifstream(config_path)) {
        try {
            std::ifstream ifs(config_path);
            config = json::parse(ifs);
        } catch (const std::exception& e) {
            std::cerr << "Warning: Failed to load config: " << e.what() << std::endl;
            create_default_config();
        }
    } else {
        create_default_config();
    }
}

void PackageConfig::save() {
    try {
        std::ofstream ofs(config_path);
        ofs << config.dump(2) << std::endl;
    } catch (const std::exception& e) {
        std::cerr << "Error saving config: " << e.what() << std::endl;
    }
}

void PackageConfig::set_name(const std::string& name) {
    config["name"] = name;
}

void PackageConfig::set_version(const std::string& version) {
    config["version"] = version;
}

void PackageConfig::set_description(const std::string& description) {
    config["description"] = description;
}

void PackageConfig::set_author(const std::string& author) {
    config["author"] = author;
}

void PackageConfig::set_license(const std::string& license) {
    config["license"] = license;
}

void PackageConfig::set_repository(const std::string& repo) {
    config["repository"] = repo;
}

void PackageConfig::add_dependency(const std::string& name, const std::string& version) {
    if (!config.contains("dependencies")) {
        config["dependencies"] = json::object();
    }
    config["dependencies"][name] = version;
}

void PackageConfig::remove_dependency(const std::string& name) {
    if (config.contains("dependencies") && config["dependencies"].contains(name)) {
        config["dependencies"].erase(name);
    }
}

void PackageConfig::update_dependency(const std::string& name, const std::string& version) {
    add_dependency(name, version);
}

void PackageConfig::add_script(const std::string& name, const std::string& command) {
    if (!config.contains("scripts")) {
        config["scripts"] = json::object();
    }
    config["scripts"][name] = command;
}

void PackageConfig::remove_script(const std::string& name) {
    if (config.contains("scripts") && config["scripts"].contains(name)) {
        config["scripts"].erase(name);
    }
}

std::string PackageConfig::get_name() const {
    return config.value("name", "");
}

std::string PackageConfig::get_version() const {
    return config.value("version", "");
}

std::string PackageConfig::get_description() const {
    return config.value("description", "");
}

std::string PackageConfig::get_author() const {
    return config.value("author", "");
}

std::string PackageConfig::get_license() const {
    return config.value("license", "");
}

std::string PackageConfig::get_repository() const {
    return config.value("repository", "");
}

std::vector<Dependency> PackageConfig::get_dependencies() const {
    std::vector<Dependency> deps;
    if (config.contains("dependencies")) {
        for (const auto& [name, version] : config["dependencies"].items()) {
            deps.push_back(Dependency(name, version));
        }
    }
    return deps;
}

std::unordered_map<std::string, std::string> PackageConfig::get_scripts() const {
    std::unordered_map<std::string, std::string> scripts;
    if (config.contains("scripts")) {
        for (const auto& [name, command] : config["scripts"].items()) {
            scripts[name] = command;
        }
    }
    return scripts;
}

bool PackageConfig::validate() {
    return !get_name().empty() && !get_version().empty();
}

void PackageConfig::create_default_config() {
    config = json::object();
    config["name"] = "my-cardity-project";
    config["version"] = "1.0.0";
    config["description"] = "A Cardity protocol project";
    config["author"] = "";
    config["license"] = "MIT";
    config["repository"] = "";
    config["dependencies"] = json::object();
    config["scripts"] = json::object();
} 