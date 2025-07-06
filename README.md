# 🤖 Nexus Panel Discord Bot

[![Discord Bot](https://img.shields.io/badge/Discord-Bot-5865F2?style=for-the-badge&logo=discord&logoColor=white)](https://app.nexus-panel.com/bot-security)
[![Node.js](https://img.shields.io/badge/Node.js-18+-339933?style=for-the-badge&logo=node.js&logoColor=white)](https://nodejs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-4.9+-3178C6?style=for-the-badge&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![License](https://img.shields.io/badge/License-MIT-green?style=for-the-badge)](LICENSE)

## 🌟 **THE ONLY DISCORD BOT WITH COMPLETE TRANSPARENCY**

Nexus Panel is the first and only Discord bot that shows you **exactly** what it does, when it does it, and why it's completely safe. While other bots ask for blind trust, we earn it through complete transparency.

### 🎯 **Why Nexus Panel is Different?**

- ✅ **Complete Transparency**: Every action is visible and documented
- ✅ **Open Source**: All code is available for review
- ✅ **Programmatic Restrictions**: Strict limits coded into the software
- ✅ **Dual Invitation**: Choose between specific permissions or administrator
- ✅ **Public Dashboard**: See bot activity in real-time

## 🔐 **SECURITY INFORMATION**

### **Bot Transparency & Security**
👀 **[View Complete Transparency Page](https://app.nexus-panel.com/bot-security)**

### **Implemented Programmatic Restrictions:**

The bot **CANNOT** do the following, even with administrator permissions:

- ❌ **Ban server owner**
- ❌ **Ban administrators** 
- ❌ **Delete important channels**
- ❌ **Modify higher roles**
- ❌ **Exceed programmed rate limits**

### **Automatic Rate Limits:**

- **General**: 100 actions per minute
- **Roles**: 50 changes per hour
- **Messages**: 30 messages per minute
- **Bans**: 5 bans per hour
- **Kicks**: 10 kicks per hour
- **Channels**: 3 creations per hour

### **Real-Time Monitoring:**

- 📊 **Public Dashboard**: Live activity statistics
- 📝 **Complete Logs**: Record of all actions
- 🚨 **Automatic Alerts**: Anomalous activity detection
- 🛑 **Emergency Stop**: Immediate manual control

## 🚀 **KEY FEATURES**

### **⚡ Workflow Automation**
- Automatic triggers for Discord events
- Customizable actions
- Advanced conditional logic
- 15+ available triggers
- 20+ automatic actions

### **💰 Role Monetization**
- Sell premium roles with PayPal
- Automatic role assignment
- Automatic revenue sharing (90-95% for you)
- Subscription management
- Complete sales dashboard

### **📊 Advanced Analytics**
- Real-time activity metrics
- Server growth analysis
- Member engagement
- Data export
- Automatic reports

### **🛡️ Intelligent Auto-Moderation**
- 6 types of moderation rules
- Real-time processing
- Configurable automatic actions
- Complete moderation logs

### **🎨 Complete Customization**
- Custom themes per server
- Customizable colors and branding
- Custom logo
- Multi-language interface (ES/EN)

### **🔧 Webhooks & API**
- Complete REST API
- Configurable webhooks
- External service integrations
- Complete documentation

## 🔗 **INVITATION OPTIONS**

### **Option 1: Standard (Specific Permissions)**
Recommended for new users and small servers.

**Features:**
- ✅ Basic workflows
- ✅ Limited analytics
- ✅ Basic auto-moderation
- ✅ Role management
- ✅ Basic slash commands

**Included Permissions:**
- Manage roles
- Read messages
- Send messages
- Manage messages
- Connect to voice
- Move members
- Use slash commands

### **Option 2: Premium (Administrator)**
Recommended for enterprise servers and simplified setup.

**Features:**
- ✅ Complete functionality
- ✅ Automatic setup
- ✅ Priority support
- ✅ Advanced analytics
- ✅ Complete auto-moderation
- ✅ Advanced server management

**Included Permissions:**
- Administrator (all permissions)
- Automatic configuration
- Complete access to all functionalities

## 📥 **INVITE THE BOT**

### 🔒 **[INVITE WITH COMPLETE TRANSPARENCY](https://app.nexus-panel.com/bot-security)**

By clicking the link above:
1. **You'll see all security information**
2. **You'll understand exactly what the bot does**
3. **You'll choose between Standard or Premium**
4. **You'll make an informed decision**

## 🏗️ **TECHNICAL ARCHITECTURE**

### **Technology Stack:**
- **Runtime**: Node.js 18+
- **Language**: TypeScript
- **Bot Framework**: Discord.js v14
- **Database**: PostgreSQL with Prisma ORM
- **Cache**: Redis
- **Queues**: BullMQ
- **Authentication**: JWT
- **Payments**: PayPal API

### **Project Structure:**
```
nexuspanelbot/
├── src/
│   ├── index.ts              # Main entry point
│   ├── commands/             # Slash commands
│   ├── events/               # Discord event handlers
│   ├── services/             # Business logic
│   ├── utils/                # Utilities
│   └── types/                # Type definitions
├── Dockerfile                # Container configuration
├── package.json              # Dependencies
└── tsconfig.json            # TypeScript config
```

### **Integrated Services:**
- **Backend API**: Communication with web panel
- **Worker Queue**: Background task processing
- **Security Service**: Validation and security limits
- **Analytics Service**: Metrics collection
- **Revenue Service**: Payment and commission management

## 🔧 **INSTALLATION AND DEVELOPMENT**

### **Requirements:**
- Node.js 18+
- npm or yarn
- Discord Application with Bot Token
- PostgreSQL Database
- Redis Server

### **Installation:**
```bash
# Clone the repository
git clone https://github.com/koyere/nexuspanelbot.git
cd nexuspanelbot

# Install dependencies
npm install

# Configure environment variables
cp .env.example .env
# Edit .env with your configurations

# Compile TypeScript
npm run build

# Run the bot
npm start
```

### **Environment Variables:**
```env
DISCORD_BOT_TOKEN=your_bot_token_here
BACKEND_API_URL=http://localhost:3001
BOT_INTERNAL_API_KEY=your_internal_api_key
REDIS_HOST=localhost
REDIS_PORT=6379
```

### **Available Scripts:**
```bash
npm run dev          # Development with hot-reload
npm run build        # Compile TypeScript
npm start            # Run in production
npm run test         # Run tests
npm run lint         # Linting with ESLint
```

## 🤝 **CONTRIBUTING**

Contributions are welcome! This project is completely open-source.

### **How to Contribute:**
1. Fork the repository
2. Create a feature branch (`git checkout -b feature/new-feature`)
3. Commit your changes (`git commit -m 'Add new feature'`)
4. Push to the branch (`git push origin feature/new-feature`)
5. Open a Pull Request

### **Areas Where You Can Help:**
- 🐛 **Bug fixes**
- ⚡ **Performance optimizations**
- 📚 **Documentation improvements**
- 🌍 **Translations to more languages**
- 🔒 **Security improvements**
- ✨ **New features**

## 📄 **LICENSE**

This project is licensed under the MIT License. See the [LICENSE](LICENSE) file for more details.

## 🔗 **IMPORTANT LINKS**

- 🌐 **[Official Website](https://nexus-panel.com)**
- 📱 **[Control Panel](https://app.nexus-panel.com)**
- 📖 **[Documentation](https://docs.nexus-panel.com)**
- 🔒 **[Bot Transparency](https://app.nexus-panel.com/bot-security)**
- 🛡️ **[Privacy Policy](https://app.nexus-panel.com/privacy)**
- 💬 **[Discord Server](https://discord.gg/nexuspanel)**

## 📧 **SUPPORT AND CONTACT**

- **Support Email**: support@nexus-panel.com
- **Privacy Email**: privacy@nexus-panel.com
- **Response Time**: 48 hours maximum
- **24/7 Support**: Available for Enterprise plans

## ⭐ **DO YOU LIKE THE PROJECT?**

If you find this bot useful, give it a star ⭐ on the repository!

Share it with other Discord administrators looking for transparency and complete functionality.

---

**🎯 Nexus Panel: The only Discord bot with complete transparency.**

*While other bots ask for blind trust, we earn it through complete transparency.*