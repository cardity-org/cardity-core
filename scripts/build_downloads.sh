#!/bin/bash

# Cardity 三平台下载包构建脚本
# 构建 macOS、Linux 和 Windows 的下载包

set -e

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 版本信息
VERSION=$(node -p "require('./package.json').version")
BUILD_DATE=$(date -u +"%Y-%m-%dT%H:%M:%SZ")

echo -e "${BLUE}🚀 Cardity 三平台下载包构建脚本${NC}"
echo -e "${BLUE}版本: ${VERSION}${NC}"
echo -e "${BLUE}构建时间: ${BUILD_DATE}${NC}"
echo ""

# 创建下载目录
DOWNLOAD_DIR="downloads"
mkdir -p $DOWNLOAD_DIR

# 构建函数
build_platform() {
    local platform=$1
    local arch=$2
    local archive_name="cardity-${VERSION}-${platform}-${arch}"
    
    echo -e "${YELLOW}📦 构建 ${platform} ${arch} 版本...${NC}"
    
    # 创建临时目录
    local temp_dir="${DOWNLOAD_DIR}/temp-${platform}-${arch}"
    mkdir -p $temp_dir
    
    # 复制基础文件
    cp -r bin/ $temp_dir/
    cp -r examples/ $temp_dir/
    cp -r docs/ $temp_dir/
    cp README.md $temp_dir/
    cp LICENSE $temp_dir/
    cp package.json $temp_dir/
    
    # 平台特定构建
    case $platform in
        "darwin")
            build_darwin $arch $temp_dir
            ;;
        "linux")
            build_linux $arch $temp_dir
            ;;
        "win32")
            build_windows $arch $temp_dir
            ;;
    esac
    
    # 创建安装脚本
    create_install_script $platform $temp_dir
    
    # 创建压缩包
    create_archive $platform $arch $temp_dir $archive_name
    
    # 清理临时目录
    rm -rf $temp_dir
    
    echo -e "${GREEN}✅ ${platform} ${arch} 构建完成${NC}"
}

# macOS 构建
build_darwin() {
    local arch=$1
    local temp_dir=$2
    
    echo -e "${BLUE}🍎 构建 macOS ${arch} 二进制文件...${NC}"
    
    # 设置 CMake 参数
    local cmake_flags=""
    if [ "$arch" = "arm64" ]; then
        cmake_flags="-DCMAKE_OSX_ARCHITECTURES=arm64"
    else
        cmake_flags="-DCMAKE_OSX_ARCHITECTURES=x86_64"
    fi
    
    # 创建构建目录
    local build_dir="build-darwin-${arch}"
    mkdir -p $build_dir
    cd $build_dir
    
    # 运行 CMake
    cmake .. $cmake_flags -DCMAKE_BUILD_TYPE=Release
    make -j$(nproc)
    
    # 复制二进制文件
    cp cardity_runtime $temp_dir/bin/
    cp cardity_abi $temp_dir/bin/
    cp cardityc $temp_dir/bin/
    cp cardity_deploy $temp_dir/bin/
    cp cardity_drc20 $temp_dir/bin/
    cp cardity_cli $temp_dir/bin/
    
    cd ..
    rm -rf $build_dir
}

# Linux 构建
build_linux() {
    local arch=$1
    local temp_dir=$2
    
    echo -e "${BLUE}🐧 构建 Linux ${arch} 二进制文件...${NC}"
    
    # 设置 CMake 参数
    local cmake_flags=""
    if [ "$arch" = "arm64" ]; then
        cmake_flags="-DCMAKE_SYSTEM_NAME=Linux -DCMAKE_SYSTEM_PROCESSOR=aarch64"
    fi
    
    # 创建构建目录
    local build_dir="build-linux-${arch}"
    mkdir -p $build_dir
    cd $build_dir
    
    # 运行 CMake
    cmake .. $cmake_flags -DCMAKE_BUILD_TYPE=Release
    make -j$(nproc)
    
    # 复制二进制文件
    cp cardity_runtime $temp_dir/bin/
    cp cardity_abi $temp_dir/bin/
    cp cardityc $temp_dir/bin/
    cp cardity_deploy $temp_dir/bin/
    cp cardity_drc20 $temp_dir/bin/
    cp cardity_cli $temp_dir/bin/
    
    cd ..
    rm -rf $build_dir
}

# Windows 构建
build_windows() {
    local arch=$1
    local temp_dir=$2
    
    echo -e "${BLUE}🪟 构建 Windows ${arch} 二进制文件...${NC}"
    
    # 检查是否在 Windows 环境或有交叉编译工具
    if command -v x86_64-w64-mingw32-gcc >/dev/null 2>&1; then
        # 交叉编译
        local cmake_flags="-DCMAKE_SYSTEM_NAME=Windows -DCMAKE_SYSTEM_PROCESSOR=x86_64"
        if [ "$arch" = "arm64" ]; then
            cmake_flags="-DCMAKE_SYSTEM_NAME=Windows -DCMAKE_SYSTEM_PROCESSOR=ARM64"
        fi
        
        # 创建构建目录
        local build_dir="build-windows-${arch}"
        mkdir -p $build_dir
        cd $build_dir
        
        # 运行 CMake
        cmake .. $cmake_flags -DCMAKE_BUILD_TYPE=Release
        make -j$(nproc)
        
        # 复制二进制文件并添加 .exe 扩展名
        cp cardity_runtime $temp_dir/bin/cardity_runtime.exe
        cp cardity_abi $temp_dir/bin/cardity_abi.exe
        cp cardityc $temp_dir/bin/cardityc.exe
        cp cardity_deploy $temp_dir/bin/cardity_deploy.exe
        cp cardity_drc20 $temp_dir/bin/cardity_drc20.exe
        cp cardity_cli $temp_dir/bin/cardity_cli.exe
        
        cd ..
        rm -rf $build_dir
    else
        echo -e "${YELLOW}⚠️  未找到 Windows 交叉编译工具，跳过 Windows 构建${NC}"
        echo -e "${YELLOW}   请安装 MinGW-w64: brew install mingw-w64${NC}"
    fi
}

# 创建安装脚本
create_install_script() {
    local platform=$1
    local temp_dir=$2
    
    case $platform in
        "darwin")
            create_macos_install_script $temp_dir
            ;;
        "linux")
            create_linux_install_script $temp_dir
            ;;
        "win32")
            create_windows_install_script $temp_dir
            ;;
    esac
}

# macOS 安装脚本
create_macos_install_script() {
    local temp_dir=$1
    
    cat > $temp_dir/install.sh << 'EOF'
#!/bin/bash

# Cardity macOS 安装脚本

set -e

echo "🍎 安装 Cardity..."

# 检查是否为 root 用户
if [ "$EUID" -eq 0 ]; then
    INSTALL_DIR="/usr/local"
    BIN_DIR="/usr/local/bin"
else
    INSTALL_DIR="$HOME/.local"
    BIN_DIR="$HOME/.local/bin"
fi

# 创建目录
mkdir -p $INSTALL_DIR/cardity
mkdir -p $BIN_DIR

# 复制文件
cp -r bin/* $BIN_DIR/
cp -r examples $INSTALL_DIR/cardity/
cp -r docs $INSTALL_DIR/cardity/
cp README.md $INSTALL_DIR/cardity/
cp LICENSE $INSTALL_DIR/cardity/

# 设置权限
chmod +x $BIN_DIR/cardity*
chmod +x $BIN_DIR/cardityc
chmod +x $BIN_DIR/cardity_runtime
chmod +x $BIN_DIR/cardity_abi
chmod +x $BIN_DIR/cardity_deploy
chmod +x $BIN_DIR/cardity_drc20

echo "✅ Cardity 安装完成！"
echo ""
echo "📝 使用方法："
echo "  cardity --version"
echo "  cardity init my-project"
echo "  cardityc my-project.car"
echo ""
echo "📚 文档位置：$INSTALL_DIR/cardity/docs"
echo "📁 示例位置：$INSTALL_DIR/cardity/examples"
EOF

    chmod +x $temp_dir/install.sh
}

# Linux 安装脚本
create_linux_install_script() {
    local temp_dir=$1
    
    cat > $temp_dir/install.sh << 'EOF'
#!/bin/bash

# Cardity Linux 安装脚本

set -e

echo "🐧 安装 Cardity..."

# 检查是否为 root 用户
if [ "$EUID" -eq 0 ]; then
    INSTALL_DIR="/usr/local"
    BIN_DIR="/usr/local/bin"
else
    INSTALL_DIR="$HOME/.local"
    BIN_DIR="$HOME/.local/bin"
fi

# 创建目录
mkdir -p $INSTALL_DIR/cardity
mkdir -p $BIN_DIR

# 复制文件
cp -r bin/* $BIN_DIR/
cp -r examples $INSTALL_DIR/cardity/
cp -r docs $INSTALL_DIR/cardity/
cp README.md $INSTALL_DIR/cardity/
cp LICENSE $INSTALL_DIR/cardity/

# 设置权限
chmod +x $BIN_DIR/cardity*
chmod +x $BIN_DIR/cardityc
chmod +x $BIN_DIR/cardity_runtime
chmod +x $BIN_DIR/cardity_abi
chmod +x $BIN_DIR/cardity_deploy
chmod +x $BIN_DIR/cardity_drc20

# 添加到 PATH（如果不是 root）
if [ "$EUID" -ne 0 ]; then
    if ! grep -q "$BIN_DIR" ~/.bashrc; then
        echo "export PATH=\"$BIN_DIR:\$PATH\"" >> ~/.bashrc
        echo "export PATH=\"$BIN_DIR:\$PATH\"" >> ~/.zshrc 2>/dev/null || true
    fi
fi

echo "✅ Cardity 安装完成！"
echo ""
echo "📝 使用方法："
echo "  cardity --version"
echo "  cardity init my-project"
echo "  cardityc my-project.car"
echo ""
echo "📚 文档位置：$INSTALL_DIR/cardity/docs"
echo "📁 示例位置：$INSTALL_DIR/cardity/examples"
echo ""
if [ "$EUID" -ne 0 ]; then
    echo "🔄 请重新启动终端或运行: source ~/.bashrc"
fi
EOF

    chmod +x $temp_dir/install.sh
}

# Windows 安装脚本
create_windows_install_script() {
    local temp_dir=$1
    
    cat > $temp_dir/install.bat << 'EOF'
@echo off
setlocal enabledelayedexpansion

echo 🪟 安装 Cardity...

:: 设置安装目录
set "INSTALL_DIR=%USERPROFILE%\.cardity"
set "BIN_DIR=%USERPROFILE%\.cardity\bin"

:: 创建目录
if not exist "%INSTALL_DIR%" mkdir "%INSTALL_DIR%"
if not exist "%BIN_DIR%" mkdir "%BIN_DIR%"

:: 复制文件
xcopy /E /I /Y bin "%BIN_DIR%"
xcopy /E /I /Y examples "%INSTALL_DIR%\examples"
xcopy /E /I /Y docs "%INSTALL_DIR%\docs"
copy README.md "%INSTALL_DIR%\"
copy LICENSE "%INSTALL_DIR%\"

:: 添加到 PATH
set "PATH_TO_ADD=%BIN_DIR%"
for /f "tokens=2*" %%a in ('reg query "HKCU\Environment" /v PATH 2^>nul') do set "CURRENT_PATH=%%b"
if not defined CURRENT_PATH (
    for /f "tokens=2*" %%a in ('reg query "HKLM\SYSTEM\CurrentControlSet\Control\Session Manager\Environment" /v PATH 2^>nul') do set "CURRENT_PATH=%%b"
)

if not "!CURRENT_PATH!" == "" (
    echo !CURRENT_PATH! | findstr /i /c:"%PATH_TO_ADD%" >nul
    if errorlevel 1 (
        set "NEW_PATH=!CURRENT_PATH!;%PATH_TO_ADD%"
        reg add "HKCU\Environment" /v PATH /t REG_EXPAND_SZ /d "!NEW_PATH!" /f >nul
    )
)

echo ✅ Cardity 安装完成！
echo.
echo 📝 使用方法：
echo   cardity --version
echo   cardity init my-project
echo   cardityc my-project.car
echo.
echo 📚 文档位置：%INSTALL_DIR%\docs
echo 📁 示例位置：%INSTALL_DIR%\examples
echo.
echo 🔄 请重新启动命令提示符或 PowerShell
pause
EOF
}

# 创建压缩包
create_archive() {
    local platform=$1
    local arch=$2
    local temp_dir=$3
    local archive_name=$4
    
    echo -e "${BLUE}📦 创建压缩包...${NC}"
    
    case $platform in
        "darwin"|"linux")
            tar -czf "${DOWNLOAD_DIR}/${archive_name}.tar.gz" -C $temp_dir .
            echo -e "${GREEN}✅ 创建 ${archive_name}.tar.gz${NC}"
            ;;
        "win32")
            if command -v zip >/dev/null 2>&1; then
                cd $temp_dir
                zip -r "../${archive_name}.zip" .
                cd ../..
                echo -e "${GREEN}✅ 创建 ${archive_name}.zip${NC}"
            else
                echo -e "${YELLOW}⚠️  未找到 zip 命令，跳过压缩包创建${NC}"
            fi
            ;;
    esac
}

# 创建下载信息文件
create_download_info() {
    cat > $DOWNLOAD_DIR/README.md << EOF
# Cardity v${VERSION} 下载包

## 📦 下载文件

### macOS
- **Intel (x64)**: [cardity-${VERSION}-darwin-x64.tar.gz](cardity-${VERSION}-darwin-x64.tar.gz)
- **Apple Silicon (ARM64)**: [cardity-${VERSION}-darwin-arm64.tar.gz](cardity-${VERSION}-darwin-arm64.tar.gz)

### Linux
- **x86_64**: [cardity-${VERSION}-linux-x64.tar.gz](cardity-${VERSION}-linux-x64.tar.gz)
- **ARM64**: [cardity-${VERSION}-linux-arm64.tar.gz](cardity-${VERSION}-linux-arm64.tar.gz)

### Windows
- **x64**: [cardity-${VERSION}-win32-x64.zip](cardity-${VERSION}-win32-x64.zip)
- **ARM64**: [cardity-${VERSION}-win32-arm64.zip](cardity-${VERSION}-win32-arm64.zip)

## 🚀 安装说明

### macOS/Linux
1. 下载对应平台的 .tar.gz 文件
2. 解压: \`tar -xzf cardity-${VERSION}-darwin-x64.tar.gz\`
3. 运行安装脚本: \`./install.sh\`
4. 验证安装: \`cardity --version\`

### Windows
1. 下载对应平台的 .zip 文件
2. 解压到本地目录
3. 双击运行 \`install.bat\`
4. 重新启动命令提示符
5. 验证安装: \`cardity --version\`

## 📚 快速开始

\`\`\`bash
# 创建新项目
cardity init my-project

# 进入项目目录
cd my-project

# 编译协议
cardityc src/index.car

# 运行协议
cardity run dist/index.carc
\`\`\`

## 📄 许可证
MIT License - 详见 LICENSE 文件

---
**Cardity Team** - 让区块链协议开发更简单 🚀
EOF
}

# 主构建流程
main() {
    echo -e "${BLUE}🔧 开始构建三平台下载包...${NC}"
    
    # 检查依赖
    if ! command -v cmake >/dev/null 2>&1; then
        echo -e "${RED}❌ 错误: 未找到 cmake${NC}"
        exit 1
    fi
    
    if ! command -v make >/dev/null 2>&1; then
        echo -e "${RED}❌ 错误: 未找到 make${NC}"
        exit 1
    fi
    
    # 构建各平台版本
    build_platform "darwin" "x64"
    build_platform "darwin" "arm64"
    build_platform "linux" "x64"
    build_platform "linux" "arm64"
    build_platform "win32" "x64"
    build_platform "win32" "arm64"
    
    # 创建下载信息
    create_download_info
    
    echo ""
    echo -e "${GREEN}🎉 三平台下载包构建完成！${NC}"
    echo -e "${BLUE}📁 下载文件位置: ${DOWNLOAD_DIR}/${NC}"
    echo ""
    echo -e "${YELLOW}📋 构建的文件:${NC}"
    ls -la $DOWNLOAD_DIR/
    echo ""
    echo -e "${GREEN}📝 下载说明: ${DOWNLOAD_DIR}/README.md${NC}"
}

# 运行主函数
main "$@"
