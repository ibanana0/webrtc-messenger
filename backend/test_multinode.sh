#!/bin/bash

# Script untuk testing P2P Multi-Node
# Jalankan dari folder backend/

echo "=========================================="
echo "   P2P Multi-Node Testing Guide"
echo "=========================================="
echo ""

case "$1" in
    "node1")
        echo "Starting Node 1 (Primary)..."
        docker-compose down 2>/dev/null
        docker-compose up --build
        ;;
    
    "node2")
        echo "Starting Node 2 (Secondary)..."
        docker-compose -f docker-compose.node2.yml down 2>/dev/null
        docker-compose -f docker-compose.node2.yml up --build
        ;;
    
    "stop")
        echo "Stopping all nodes..."
        docker-compose down
        docker-compose -f docker-compose.node2.yml down
        echo "All nodes stopped."
        ;;
    
    "status")
        echo "Checking node status..."
        echo ""
        echo "Node 1 (Port 8080):"
        curl -s http://localhost:8080/api/p2p/info 2>/dev/null | python3 -m json.tool || echo "  Not running"
        echo ""
        echo "Node 2 (Port 8081):"
        curl -s http://localhost:8081/api/p2p/info 2>/dev/null | python3 -m json.tool || echo "  Not running"
        ;;
    
    *)
        echo "Usage: ./test_multinode.sh [command]"
        echo ""
        echo "Commands:"
        echo "  node1   - Start Node 1 (primary) on port 8080"
        echo "  node2   - Start Node 2 (secondary) on port 8081"
        echo "  stop    - Stop all nodes"
        echo "  status  - Check status of both nodes"
        echo ""
        echo "Testing Steps:"
        echo "=============="
        echo "1. Open Terminal 1: ./test_multinode.sh node1"
        echo "2. Open Terminal 2: ./test_multinode.sh node2"
        echo "3. Open Terminal 3: ./test_multinode.sh status"
        echo ""
        echo "4. Open browser tabs:"
        echo "   - Tab 1: http://localhost:3000 (connects to Node 1)"
        echo "   - Tab 2: Change frontend to connect to port 8081"
        echo ""
        echo "5. Copy Full Address from Node 1's P2P panel"
        echo "6. Paste into Node 2's 'Connect to Peer' input (replace 0.0.0.0 with host.docker.internal)"
        echo "7. Send message from Node 1 - should appear on Node 2!"
        ;;
esac
