#!/bin/bash
# Nexus Bot Health Monitor
# Checks bot status and restarts if needed

LOG_FILE="/opt/nexus-panel/bot/logs/health-monitor.log"
BOT_DIR="/opt/nexus-panel/bot"

log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" >> "$LOG_FILE"
}

check_bot_process() {
    pgrep -f "node dist/index.js" > /dev/null
    return $?
}

check_bot_api() {
    curl -s -f http://localhost:3002/health > /dev/null
    return $?
}

check_bot_discord() {
    local response=$(curl -s http://localhost:3002/health)
    echo "$response" | grep -q '"bot":"ready"'
    return $?
}

restart_bot() {
    log "RESTART: Restarting bot due to health check failure"
    
    # Stop existing process
    pkill -f "node dist/index.js"
    sleep 3
    
    # Start bot
    cd "$BOT_DIR"
    npm start > logs/bot.log 2>&1 &
    
    sleep 10
    
    if check_bot_process && check_bot_api; then
        log "RESTART: Bot restarted successfully"
        return 0
    else
        log "RESTART: Bot restart failed"
        return 1
    fi
}

# Main health check
main() {
    # Check if bot process is running
    if ! check_bot_process; then
        log "ERROR: Bot process not running"
        restart_bot
        return
    fi
    
    # Check if API is responding
    if ! check_bot_api; then
        log "ERROR: Bot API not responding"
        restart_bot
        return
    fi
    
    # Check if Discord connection is ready
    if ! check_bot_discord; then
        log "WARNING: Bot not connected to Discord"
        # Don't restart immediately, might be temporary
        return
    fi
    
    log "OK: Bot healthy"
}

# Run health check
main

# Cleanup old logs (keep last 7 days)
find /opt/nexus-panel/bot/logs/ -name "*.log" -mtime +7 -delete 2>/dev/null