#!/bin/bash
# System Status Report for Nexus Bot VPS

echo "🤖 NEXUS BOT VPS STATUS REPORT"
echo "=============================="
echo "📅 Generated: $(date)"
echo "🖥️  Server: $(hostname) ($(curl -s ipinfo.io/ip))"
echo

echo "📊 SYSTEM RESOURCES"
echo "-------------------"
echo "💾 Memory Usage:"
free -h
echo
echo "💽 Disk Usage:"
df -h /
echo
echo "⚡ CPU Load:"
uptime
echo

echo "🤖 BOT STATUS"
echo "-------------"
if pgrep -f "node dist/index.js" > /dev/null; then
    echo "✅ Bot Process: RUNNING"
    echo "🔗 Process ID: $(pgrep -f 'node dist/index.js')"
else
    echo "❌ Bot Process: NOT RUNNING"
fi

if curl -s -f http://localhost:3002/health > /dev/null; then
    echo "✅ Bot API: RESPONDING"
    curl -s http://localhost:3002/health | jq . 2>/dev/null || curl -s http://localhost:3002/health
else
    echo "❌ Bot API: NOT RESPONDING"
fi
echo

echo "🔒 SECURITY STATUS"
echo "------------------"
echo "🛡️  Firewall: $(ufw status | head -1 | cut -d: -f2)"
echo "🌐 nginx: $(systemctl is-active nginx)"
echo "🔐 SSH: $(systemctl is-active ssh)"
echo

echo "📊 NETWORK STATUS"
echo "-----------------"
echo "🔗 Listening Ports:"
ss -tlnp | grep -E ':(22|80|3002) '
echo

echo "📋 RECENT ACTIVITY"
echo "------------------"
echo "🔍 Bot Logs (last 5 lines):"
tail -5 /opt/nexus-panel/bot/logs/bot.log 2>/dev/null | grep -v "ETIMEDOUT" | tail -3 || echo "No recent logs"
echo

echo "📈 PERFORMANCE METRICS"
echo "----------------------"
echo "⏰ System Uptime: $(uptime -p)"
echo "🔄 Bot Restart Count: $(grep -c "Starting Nexus Panel Bot" /opt/nexus-panel/bot/logs/bot.log 2>/dev/null || echo "0")"
echo "📊 Health Checks: $(grep -c "OK: Bot healthy" /opt/nexus-panel/bot/logs/health-monitor.log 2>/dev/null || echo "0")"
echo
echo "=============================="