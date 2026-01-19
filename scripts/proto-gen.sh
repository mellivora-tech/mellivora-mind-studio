#!/bin/bash
# =============================================================================
# Proto Code Generation Script
# =============================================================================

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(dirname "$SCRIPT_DIR")"
PROTO_DIR="$ROOT_DIR/proto"

# Output directories
GEN_GO_DIR="$ROOT_DIR/gen/go"
GEN_PYTHON_DIR="$ROOT_DIR/gen/python"
GEN_TS_DIR="$ROOT_DIR/gen/typescript"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${GREEN}=== Proto Code Generation ===${NC}"
echo "Proto directory: $PROTO_DIR"

# Check for protoc
if ! command -v protoc &> /dev/null; then
    echo -e "${RED}Error: protoc is not installed${NC}"
    echo "Install with: brew install protobuf (macOS) or apt install protobuf-compiler (Linux)"
    exit 1
fi

# =============================================================================
# Go Generation
# =============================================================================

generate_go() {
    echo -e "${YELLOW}Generating Go code...${NC}"
    
    # Check for Go plugins
    if ! command -v protoc-gen-go &> /dev/null; then
        echo "Installing protoc-gen-go..."
        go install google.golang.org/protobuf/cmd/protoc-gen-go@latest
    fi
    
    if ! command -v protoc-gen-go-grpc &> /dev/null; then
        echo "Installing protoc-gen-go-grpc..."
        go install google.golang.org/grpc/cmd/protoc-gen-go-grpc@latest
    fi
    
    mkdir -p "$GEN_GO_DIR"
    
    # Generate for each proto file
    for proto in $(find "$PROTO_DIR" -name "*.proto"); do
        echo "  Processing: $(basename $proto)"
        protoc \
            --proto_path="$PROTO_DIR" \
            --go_out="$GEN_GO_DIR" \
            --go_opt=paths=source_relative \
            --go-grpc_out="$GEN_GO_DIR" \
            --go-grpc_opt=paths=source_relative \
            "$proto"
    done
    
    echo -e "${GREEN}Go code generated in: $GEN_GO_DIR${NC}"
}

# =============================================================================
# Python Generation
# =============================================================================

generate_python() {
    echo -e "${YELLOW}Generating Python code...${NC}"
    
    # Check for grpcio-tools
    if ! python -c "import grpc_tools.protoc" &> /dev/null; then
        echo "Installing grpcio-tools..."
        pip install grpcio-tools
    fi
    
    mkdir -p "$GEN_PYTHON_DIR"
    
    python -m grpc_tools.protoc \
        --proto_path="$PROTO_DIR" \
        --python_out="$GEN_PYTHON_DIR" \
        --grpc_python_out="$GEN_PYTHON_DIR" \
        --pyi_out="$GEN_PYTHON_DIR" \
        $(find "$PROTO_DIR" -name "*.proto")
    
    # Create __init__.py files
    find "$GEN_PYTHON_DIR" -type d -exec touch {}/__init__.py \;
    
    # Fix Python imports (relative imports)
    echo "  Fixing Python imports..."
    for f in $(find "$GEN_PYTHON_DIR" -name "*_pb2_grpc.py" -o -name "*_pb2.py"); do
        sed -i.bak 's/^import \([a-z_]*\)_pb2/from . import \1_pb2/g' "$f"
        rm -f "$f.bak"
    done
    
    echo -e "${GREEN}Python code generated in: $GEN_PYTHON_DIR${NC}"
}

# =============================================================================
# TypeScript Generation (for frontend)
# =============================================================================

generate_typescript() {
    echo -e "${YELLOW}Generating TypeScript code...${NC}"
    
    # Check for ts-proto
    if ! command -v protoc-gen-ts_proto &> /dev/null; then
        echo "ts-proto not found. Skipping TypeScript generation."
        echo "Install with: npm install -g ts-proto"
        return
    fi
    
    mkdir -p "$GEN_TS_DIR"
    
    protoc \
        --proto_path="$PROTO_DIR" \
        --plugin=protoc-gen-ts_proto=$(which protoc-gen-ts_proto) \
        --ts_proto_out="$GEN_TS_DIR" \
        --ts_proto_opt=outputServices=grpc-js \
        --ts_proto_opt=esModuleInterop=true \
        $(find "$PROTO_DIR" -name "*.proto")
    
    echo -e "${GREEN}TypeScript code generated in: $GEN_TS_DIR${NC}"
}

# =============================================================================
# Main
# =============================================================================

case "${1:-all}" in
    go)
        generate_go
        ;;
    python)
        generate_python
        ;;
    typescript|ts)
        generate_typescript
        ;;
    all)
        generate_go
        generate_python
        generate_typescript
        ;;
    *)
        echo "Usage: $0 [go|python|typescript|all]"
        exit 1
        ;;
esac

echo -e "${GREEN}=== Done ===${NC}"
