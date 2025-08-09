#!/bin/bash

# Cardity 下载页面生成脚本

set -e

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 版本信息
VERSION=$(node -p "require('./package.json').version")
RELEASE_DIR="releases"

echo -e "${BLUE}🌐 生成 Cardity 下载页面...${NC}"

# 检查发布目录
if [ ! -d "$RELEASE_DIR" ]; then
    echo -e "${RED}❌ 错误: 发布目录不存在，请先运行构建脚本${NC}"
    echo -e "${YELLOW}   运行: ./scripts/build_releases.sh${NC}"
    exit 1
fi

# 创建下载页面
cat > $RELEASE_DIR/download.html << 'EOF'
<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Cardity 下载 - 区块链协议开发语言</title>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            line-height: 1.6;
            color: #333;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            min-height: 100vh;
        }
        
        .container {
            max-width: 1200px;
            margin: 0 auto;
            padding: 2rem;
        }
        
        .header {
            text-align: center;
            color: white;
            margin-bottom: 3rem;
        }
        
        .header h1 {
            font-size: 3rem;
            margin-bottom: 1rem;
            text-shadow: 2px 2px 4px rgba(0,0,0,0.3);
        }
        
        .header p {
            font-size: 1.2rem;
            opacity: 0.9;
        }
        
        .download-section {
            background: white;
            border-radius: 15px;
            padding: 2rem;
            box-shadow: 0 10px 30px rgba(0,0,0,0.2);
            margin-bottom: 2rem;
        }
        
        .platform-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
            gap: 2rem;
            margin-top: 2rem;
        }
        
        .platform-card {
            border: 2px solid #e1e5e9;
            border-radius: 10px;
            padding: 1.5rem;
            text-align: center;
            transition: all 0.3s ease;
        }
        
        .platform-card:hover {
            border-color: #667eea;
            transform: translateY(-5px);
            box-shadow: 0 10px 25px rgba(102, 126, 234, 0.2);
        }
        
        .platform-icon {
            font-size: 3rem;
            margin-bottom: 1rem;
        }
        
        .platform-name {
            font-size: 1.5rem;
            font-weight: bold;
            margin-bottom: 0.5rem;
            color: #333;
        }
        
        .platform-desc {
            color: #666;
            margin-bottom: 1.5rem;
        }
        
        .download-btn {
            display: inline-block;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            padding: 0.8rem 1.5rem;
            text-decoration: none;
            border-radius: 25px;
            font-weight: bold;
            transition: all 0.3s ease;
            margin: 0.5rem;
        }
        
        .download-btn:hover {
            transform: translateY(-2px);
            box-shadow: 0 5px 15px rgba(102, 126, 234, 0.4);
        }
        
        .arch-selector {
            margin-top: 1rem;
        }
        
        .arch-btn {
            display: inline-block;
            background: #f8f9fa;
            color: #333;
            padding: 0.5rem 1rem;
            text-decoration: none;
            border-radius: 15px;
            font-size: 0.9rem;
            margin: 0.2rem;
            border: 1px solid #e1e5e9;
            transition: all 0.3s ease;
        }
        
        .arch-btn:hover {
            background: #667eea;
            color: white;
            border-color: #667eea;
        }
        
        .info-section {
            background: white;
            border-radius: 15px;
            padding: 2rem;
            box-shadow: 0 10px 30px rgba(0,0,0,0.2);
        }
        
        .info-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
            gap: 2rem;
            margin-top: 1.5rem;
        }
        
        .info-card {
            text-align: center;
            padding: 1.5rem;
            border: 1px solid #e1e5e9;
            border-radius: 10px;
        }
        
        .info-icon {
            font-size: 2.5rem;
            margin-bottom: 1rem;
            color: #667eea;
        }
        
        .info-title {
            font-size: 1.2rem;
            font-weight: bold;
            margin-bottom: 0.5rem;
        }
        
        .info-desc {
            color: #666;
            font-size: 0.9rem;
        }
        
        .footer {
            text-align: center;
            color: white;
            margin-top: 3rem;
            opacity: 0.8;
        }
        
        @media (max-width: 768px) {
            .container {
                padding: 1rem;
            }
            
            .header h1 {
                font-size: 2rem;
            }
            
            .platform-grid {
                grid-template-columns: 1fr;
            }
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>🚀 Cardity</h1>
            <p>现代化的区块链协议开发语言</p>
            <p>专为 Dogecoin 生态系统设计</p>
        </div>
        
        <div class="download-section">
            <h2 style="text-align: center; margin-bottom: 1rem; color: #333;">📥 下载 Cardity</h2>
            <p style="text-align: center; color: #666; margin-bottom: 2rem;">
                选择您的操作系统和架构，开始使用 Cardity 开发区块链协议
            </p>
            
            <div class="platform-grid">
                <!-- macOS -->
                <div class="platform-card">
                    <div class="platform-icon">🍎</div>
                    <div class="platform-name">macOS</div>
                    <div class="platform-desc">支持 Intel 和 Apple Silicon</div>
                    <div class="arch-selector">
                        <a href="cardity-VERSION-darwin-x64.tar.gz" class="arch-btn">Intel (x64)</a>
                        <a href="cardity-VERSION-darwin-arm64.tar.gz" class="arch-btn">Apple Silicon (ARM64)</a>
                    </div>
                </div>
                
                <!-- Linux -->
                <div class="platform-card">
                    <div class="platform-icon">🐧</div>
                    <div class="platform-name">Linux</div>
                    <div class="platform-desc">支持 x86_64 和 ARM64</div>
                    <div class="arch-selector">
                        <a href="cardity-VERSION-linux-x64.tar.gz" class="arch-btn">x86_64</a>
                        <a href="cardity-VERSION-linux-arm64.tar.gz" class="arch-btn">ARM64</a>
                    </div>
                </div>
                
                <!-- Windows -->
                <div class="platform-card">
                    <div class="platform-icon">🪟</div>
                    <div class="platform-name">Windows</div>
                    <div class="platform-desc">支持 x64 和 ARM64</div>
                    <div class="arch-selector">
                        <a href="cardity-VERSION-win32-x64.zip" class="arch-btn">x64</a>
                        <a href="cardity-VERSION-win32-arm64.zip" class="arch-btn">ARM64</a>
                    </div>
                </div>
            </div>
        </div>
        
        <div class="info-section">
            <h2 style="text-align: center; margin-bottom: 1rem; color: #333;">📋 安装说明</h2>
            
            <div class="info-grid">
                <div class="info-card">
                    <div class="info-icon">📦</div>
                    <div class="info-title">下载并解压</div>
                    <div class="info-desc">下载对应平台的压缩包并解压到本地目录</div>
                </div>
                
                <div class="info-card">
                    <div class="info-icon">⚙️</div>
                    <div class="info-title">运行安装脚本</div>
                    <div class="info-desc">在解压目录中运行 install.sh (macOS/Linux) 或 install.bat (Windows)</div>
                </div>
                
                <div class="info-card">
                    <div class="info-icon">✅</div>
                    <div class="info-title">验证安装</div>
                    <div class="info-desc">运行 cardity --version 验证安装是否成功</div>
                </div>
                
                <div class="info-card">
                    <div class="info-icon">🚀</div>
                    <div class="info-title">开始开发</div>
                    <div class="info-desc">运行 cardity init my-project 创建第一个项目</div>
                </div>
            </div>
        </div>
        
        <div class="info-section">
            <h2 style="text-align: center; margin-bottom: 1rem; color: #333;">🔧 快速开始</h2>
            
            <div style="background: #f8f9fa; padding: 1.5rem; border-radius: 10px; margin-top: 1rem;">
                <h3 style="margin-bottom: 1rem; color: #333;">创建第一个项目</h3>
                <pre style="background: #2d3748; color: #e2e8f0; padding: 1rem; border-radius: 5px; overflow-x: auto;"><code># 初始化新项目
cardity init my-first-protocol

# 进入项目目录
cd my-first-protocol

# 编译协议
cardityc src/index.car

# 生成 ABI
cardity abi src/index.car

# 运行协议
cardity run dist/index.carc</code></pre>
            </div>
        </div>
        
        <div class="footer">
            <p>&copy; 2024 Cardity Team. 开源项目，基于 MIT 许可证。</p>
            <p>
                <a href="https://github.com/cardity-org/cardity-core" style="color: white; text-decoration: none;">GitHub</a> |
                <a href="https://docs.cardity.dev" style="color: white; text-decoration: none;">文档</a> |
                <a href="https://cardity.dev" style="color: white; text-decoration: none;">官网</a>
            </p>
        </div>
    </div>
    
    <script>
        // 动态更新版本号
        document.addEventListener('DOMContentLoaded', function() {
            const version = 'VERSION';
            const links = document.querySelectorAll('a[href*="VERSION"]');
            links.forEach(link => {
                link.href = link.href.replace('VERSION', version);
            });
        });
        
        // 下载统计
        function trackDownload(platform, arch) {
            // 这里可以添加下载统计代码
            console.log(`Download: ${platform}-${arch}`);
        }
        
        // 为下载链接添加点击事件
        document.querySelectorAll('.arch-btn').forEach(btn => {
            btn.addEventListener('click', function(e) {
                const href = this.href;
                const platform = href.includes('darwin') ? 'macOS' : 
                               href.includes('linux') ? 'Linux' : 'Windows';
                const arch = href.includes('arm64') ? 'ARM64' : 'x64';
                trackDownload(platform, arch);
            });
        });
    </script>
</body>
</html>
EOF

# 替换版本号
sed -i.bak "s/VERSION/$VERSION/g" $RELEASE_DIR/download.html
rm $RELEASE_DIR/download.html.bak

echo -e "${GREEN}✅ 下载页面生成完成: ${RELEASE_DIR}/download.html${NC}"

# 创建简单的下载索引
cat > $RELEASE_DIR/index.html << EOF
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>Cardity Downloads</title>
    <meta http-equiv="refresh" content="0; url=download.html">
</head>
<body>
    <p>Redirecting to <a href="download.html">download page</a>...</p>
</body>
</html>
EOF

echo -e "${GREEN}✅ 重定向页面生成完成: ${RELEASE_DIR}/index.html${NC}"

# 创建下载链接列表
cat > $RELEASE_DIR/downloads.txt << EOF
Cardity v${VERSION} 下载链接
================================

macOS:
- Intel (x64): cardity-${VERSION}-darwin-x64.tar.gz
- Apple Silicon (ARM64): cardity-${VERSION}-darwin-arm64.tar.gz

Linux:
- x86_64: cardity-${VERSION}-linux-x64.tar.gz
- ARM64: cardity-${VERSION}-linux-arm64.tar.gz

Windows:
- x64: cardity-${VERSION}-win32-x64.zip
- ARM64: cardity-${VERSION}-win32-arm64.zip

安装说明:
1. 下载对应平台的压缩包
2. 解压到本地目录
3. 运行安装脚本 (install.sh 或 install.bat)
4. 验证安装: cardity --version

更多信息请访问: https://cardity.dev
EOF

echo -e "${GREEN}✅ 下载链接列表生成完成: ${RELEASE_DIR}/downloads.txt${NC}"

echo ""
echo -e "${BLUE}📋 生成的文件:${NC}"
echo -e "${YELLOW}  📄 ${RELEASE_DIR}/download.html - 完整下载页面${NC}"
echo -e "${YELLOW}  📄 ${RELEASE_DIR}/index.html - 重定向页面${NC}"
echo -e "${YELLOW}  📄 ${RELEASE_DIR}/downloads.txt - 下载链接列表${NC}"
echo ""
echo -e "${GREEN}🎉 下载页面生成完成！${NC}"
echo -e "${BLUE}🌐 可以通过 ${RELEASE_DIR}/download.html 访问下载页面${NC}"
