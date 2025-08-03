#!/bin/bash

# Webhook Server Docker 一键启动脚本
# 使用方法: ./start.sh [选项]

set -e

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 打印带颜色的消息
print_info() {
    echo -e "${BLUE}ℹ️  $1${NC}"
}

print_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

print_error() {
    echo -e "${RED}❌ $1${NC}"
}

# 显示帮助信息
show_help() {
    echo "Webhook Server Docker 一键启动脚本"
    echo ""
    echo "使用方法:"
    echo "  ./start.sh [选项]"
    echo ""
    echo "选项:"
    echo "  -h, --help     显示此帮助信息"
    echo "  -d, --dev      开发模式启动"
    echo "  -p, --prod     生产模式启动"
    echo "  -s, --stop     停止服务"
    echo "  -r, --restart  重启服务"
    echo "  -l, --logs     查看日志"
    echo "  --build        重新构建镜像"
    echo "  --clean        清理所有数据和镜像"
    echo ""
    echo "示例:"
    echo "  ./start.sh              # 默认启动"
    echo "  ./start.sh -d           # 开发模式"
    echo "  ./start.sh -p           # 生产模式"
    echo "  ./start.sh --build      # 重新构建并启动"
}

# 检查 Docker 和 Docker Compose
check_requirements() {
    print_info "检查系统要求..."
    
    if ! command -v docker &> /dev/null; then
        print_error "Docker 未安装，请先安装 Docker"
        exit 1
    fi
    
    if ! command -v docker-compose &> /dev/null && ! docker compose version &> /dev/null; then
        print_error "Docker Compose 未安装，请先安装 Docker Compose"
        exit 1
    fi
    
    print_success "系统要求检查通过"
}

# 检查环境配置文件
check_env_file() {
    if [ ! -f .env ]; then
        print_warning "未找到 .env 文件"
        print_info "正在创建默认配置文件..."
        
        if [ -f .env.docker ]; then
            cp .env.docker .env
            print_success "已创建 .env 文件，请根据需要修改配置"
        else
            print_error "未找到 .env.docker 模板文件"
            exit 1
        fi
    else
        print_success "找到环境配置文件"
    fi
}

# 构建镜像
build_image() {
    print_info "构建 Docker 镜像..."
    docker-compose build --no-cache
    print_success "镜像构建完成"
}

# 启动服务
start_service() {
    local mode=${1:-"default"}
    
    print_info "启动 Webhook Server ($mode 模式)..."
    
    case $mode in
        "dev")
            NODE_ENV=development docker-compose up -d
            ;;
        "prod")
            NODE_ENV=production docker-compose up -d
            ;;
        *)
            docker-compose up -d
            ;;
    esac
    
    print_success "服务启动完成"
    
    # 等待服务就绪
    print_info "等待服务就绪..."
    sleep 5
    
    # 检查服务状态
    if docker-compose ps | grep -q "Up"; then
        print_success "服务运行正常"
        show_service_info
    else
        print_error "服务启动失败，请查看日志"
        docker-compose logs
    fi
}

# 停止服务
stop_service() {
    print_info "停止服务..."
    docker-compose down
    print_success "服务已停止"
}

# 重启服务
restart_service() {
    print_info "重启服务..."
    docker-compose restart
    print_success "服务已重启"
    show_service_info
}

# 显示日志
show_logs() {
    print_info "显示服务日志..."
    docker-compose logs -f
}

# 清理数据和镜像
clean_all() {
    print_warning "这将删除所有数据和镜像，确定要继续吗？(y/N)"
    read -r response
    if [[ "$response" =~ ^([yY][eE][sS]|[yY])$ ]]; then
        print_info "清理所有数据..."
        docker-compose down -v --rmi all
        docker system prune -f
        print_success "清理完成"
    else
        print_info "取消清理操作"
    fi
}

# 显示服务信息
show_service_info() {
    local port=$(grep "^PORT=" .env 2>/dev/null | cut -d'=' -f2 || echo "7392")

    echo ""
    print_success "🚀 Webhook Server 已启动！"
    echo ""
    echo "📊 Web 界面:     http://localhost:$port"
    echo "🔗 Webhook 端点: http://localhost:$port/webhook"
    echo "📡 API 端点:     http://localhost:$port/api"
    echo "❤️  健康检查:     http://localhost:$port/api/health"
    echo ""
    print_info "使用 './start.sh -l' 查看日志"
    print_info "使用 './start.sh -s' 停止服务"
    echo ""
}

# 主函数
main() {
    case ${1:-""} in
        -h|--help)
            show_help
            ;;
        -d|--dev)
            check_requirements
            check_env_file
            start_service "dev"
            ;;
        -p|--prod)
            check_requirements
            check_env_file
            start_service "prod"
            ;;
        -s|--stop)
            stop_service
            ;;
        -r|--restart)
            restart_service
            ;;
        -l|--logs)
            show_logs
            ;;
        --build)
            check_requirements
            check_env_file
            build_image
            start_service
            ;;
        --clean)
            clean_all
            ;;
        "")
            check_requirements
            check_env_file
            start_service
            ;;
        *)
            print_error "未知选项: $1"
            show_help
            exit 1
            ;;
    esac
}

# 运行主函数
main "$@"
