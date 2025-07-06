# 🤖 Nexus Panel Discord Bot

[![Discord Bot](https://img.shields.io/badge/Discord-Bot-5865F2?style=for-the-badge&logo=discord&logoColor=white)](https://app.nexus-panel.com/bot-security)
[![Node.js](https://img.shields.io/badge/Node.js-18+-339933?style=for-the-badge&logo=node.js&logoColor=white)](https://nodejs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-4.9+-3178C6?style=for-the-badge&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![License](https://img.shields.io/badge/License-MIT-green?style=for-the-badge)](LICENSE)

## 🌟 **EL ÚNICO BOT DE DISCORD CON TRANSPARENCIA TOTAL**

Nexus Panel es el primer y único bot de Discord que te muestra **exactamente** qué hace, cuándo lo hace, y por qué es completamente seguro. Mientras otros bots piden confianza ciega, nosotros la ganamos con transparencia total.

### 🎯 **¿Por qué Nexus Panel es Diferente?**

- ✅ **Transparencia Completa**: Cada acción es visible y documentada
- ✅ **Código Abierto**: Todo el código está disponible para revisión
- ✅ **Restricciones Programáticas**: Límites estrictos codificados en el software
- ✅ **Doble Invitación**: Elige entre permisos específicos o administrator
- ✅ **Dashboard Público**: Ve la actividad del bot en tiempo real

## 🔐 **INFORMACIÓN DE SEGURIDAD**

### **Bot Transparencia & Seguridad**
👀 **[Ver Página de Transparencia Completa](https://app.nexus-panel.com/bot-security)**

### **Restricciones Programáticas Implementadas:**

El bot **NO PUEDE** hacer lo siguiente, incluso con permisos de administrator:

- ❌ **Banear al dueño del servidor**
- ❌ **Banear administradores** 
- ❌ **Eliminar canales importantes**
- ❌ **Modificar roles superiores**
- ❌ **Exceder límites de velocidad programados**

### **Límites de Velocidad Automáticos:**

- **General**: 100 acciones por minuto
- **Roles**: 50 cambios por hora
- **Mensajes**: 30 mensajes por minuto
- **Baneos**: 5 baneos por hora
- **Expulsiones**: 10 expulsiones por hora
- **Canales**: 3 creaciones por hora

### **Monitoreo en Tiempo Real:**

- 📊 **Dashboard Público**: Estadísticas en vivo de actividad
- 📝 **Logs Completos**: Registro de todas las acciones
- 🚨 **Alertas Automáticas**: Detección de actividad anómala
- 🛑 **Parada de Emergencia**: Control manual inmediato

## 🚀 **CARACTERÍSTICAS PRINCIPALES**

### **⚡ Automatización de Workflows**
- Triggers automáticos para eventos de Discord
- Acciones personalizables
- Lógica condicional avanzada
- 15+ triggers disponibles
- 20+ acciones automáticas

### **💰 Monetización de Roles**
- Venta de roles premium con PayPal
- Asignación automática de roles
- Revenue sharing automático (90-95% para ti)
- Gestión de suscripciones
- Dashboard de ventas completo

### **📊 Analytics Avanzados**
- Métricas de actividad en tiempo real
- Análisis de crecimiento del servidor
- Engagement de miembros
- Exportación de datos
- Reportes automáticos

### **🛡️ Auto-Moderación Inteligente**
- 6 tipos de reglas de moderación
- Procesamiento en tiempo real
- Acciones automáticas configurables
- Logs de moderación completos

### **🎨 Personalización Completa**
- Temas personalizados por servidor
- Colores y branding personalizable
- Logo personalizado
- Interfaz multiidioma (ES/EN)

### **🔧 Webhooks & API**
- API REST completa
- Webhooks configurables
- Integraciones con servicios externos
- Documentación completa

## 🔗 **OPCIONES DE INVITACIÓN**

### **Opción 1: Standard (Permisos Específicos)**
Recomendado para nuevos usuarios y servidores pequeños.

**Características:**
- ✅ Workflows básicos
- ✅ Analytics limitadas
- ✅ Auto-moderación básica
- ✅ Gestión de roles
- ✅ Comandos slash básicos

**Permisos Incluidos:**
- Gestionar roles
- Leer mensajes
- Enviar mensajes
- Gestionar mensajes
- Conectar a voz
- Mover miembros
- Usar comandos slash

### **Opción 2: Premium (Administrator)**
Recomendado para servidores enterprise y configuración simplificada.

**Características:**
- ✅ Funcionalidad completa
- ✅ Setup automático
- ✅ Soporte prioritario
- ✅ Analytics avanzadas
- ✅ Auto-moderación completa
- ✅ Gestión avanzada de servidor

**Permisos Incluidos:**
- Administrador (todos los permisos)
- Configuración automática
- Acceso completo a todas las funcionalidades

## 📥 **INVITAR EL BOT**

### 🔒 **[INVITAR CON TRANSPARENCIA TOTAL](https://app.nexus-panel.com/bot-security)**

Al hacer click en el enlace anterior:
1. **Verás toda la información de seguridad**
2. **Entenderás exactamente qué hace el bot**
3. **Elegirás entre Standard o Premium**
4. **Tomarás una decisión informada**

## 🏗️ **ARQUITECTURA TÉCNICA**

### **Stack Tecnológico:**
- **Runtime**: Node.js 18+
- **Language**: TypeScript
- **Bot Framework**: Discord.js v14
- **Database**: PostgreSQL con Prisma ORM
- **Cache**: Redis
- **Queues**: BullMQ
- **Authentication**: JWT
- **Payments**: PayPal API

### **Estructura del Proyecto:**
```
nexuspanelbot/
├── src/
│   ├── index.ts              # Punto de entrada principal
│   ├── commands/             # Comandos slash
│   ├── events/               # Event handlers de Discord
│   ├── services/             # Lógica de negocio
│   ├── utils/                # Utilidades
│   └── types/                # Definiciones de tipos
├── Dockerfile                # Container configuration
├── package.json              # Dependencies
└── tsconfig.json            # TypeScript config
```

### **Servicios Integrados:**
- **Backend API**: Comunicación con el panel web
- **Worker Queue**: Procesamiento de tareas en background
- **Security Service**: Validación y límites de seguridad
- **Analytics Service**: Recopilación de métricas
- **Revenue Service**: Gestión de pagos y comisiones

## 🔧 **INSTALACIÓN Y DESARROLLO**

### **Requisitos:**
- Node.js 18+
- npm o yarn
- Discord Application con Bot Token
- PostgreSQL Database
- Redis Server

### **Instalación:**
```bash
# Clonar el repositorio
git clone https://github.com/koyere/nexuspanelbot.git
cd nexuspanelbot

# Instalar dependencias
npm install

# Configurar variables de entorno
cp .env.example .env
# Editar .env con tus configuraciones

# Compilar TypeScript
npm run build

# Ejecutar el bot
npm start
```

### **Variables de Entorno:**
```env
DISCORD_BOT_TOKEN=your_bot_token_here
BACKEND_API_URL=http://localhost:3001
BOT_INTERNAL_API_KEY=your_internal_api_key
REDIS_HOST=localhost
REDIS_PORT=6379
```

### **Scripts Disponibles:**
```bash
npm run dev          # Desarrollo con hot-reload
npm run build        # Compilar TypeScript
npm start            # Ejecutar en producción
npm run test         # Ejecutar tests
npm run lint         # Linting con ESLint
```

## 🤝 **CONTRIBUIR**

¡Las contribuciones son bienvenidas! Este proyecto es completamente open-source.

### **Cómo Contribuir:**
1. Fork el repositorio
2. Crea una rama para tu feature (`git checkout -b feature/nueva-funcionalidad`)
3. Commit tus cambios (`git commit -m 'Agregar nueva funcionalidad'`)
4. Push a la rama (`git push origin feature/nueva-funcionalidad`)
5. Abre un Pull Request

### **Áreas Donde Puedes Ayudar:**
- 🐛 **Bug fixes**
- ⚡ **Optimizaciones de rendimiento**
- 📚 **Mejoras en documentación**
- 🌍 **Traducciones a más idiomas**
- 🔒 **Mejoras de seguridad**
- ✨ **Nuevas características**

## 📄 **LICENCIA**

Este proyecto está licenciado bajo la Licencia MIT. Ver el archivo [LICENSE](LICENSE) para más detalles.

## 🔗 **ENLACES IMPORTANTES**

- 🌐 **[Sitio Web Oficial](https://nexus-panel.com)**
- 📱 **[Panel de Control](https://app.nexus-panel.com)**
- 📖 **[Documentación](https://docs.nexus-panel.com)**
- 🔒 **[Transparencia del Bot](https://app.nexus-panel.com/bot-security)**
- 🛡️ **[Política de Privacidad](https://app.nexus-panel.com/privacy)**
- 💬 **[Servidor de Discord](https://discord.gg/nexuspanel)**

## 📧 **SOPORTE Y CONTACTO**

- **Email de Soporte**: support@nexus-panel.com
- **Email de Privacidad**: privacy@nexus-panel.com
- **Tiempo de Respuesta**: 48 horas máximo
- **Soporte 24/7**: Disponible para planes Enterprise

## ⭐ **¿TE GUSTA EL PROYECTO?**

Si encuentras útil este bot, ¡dale una estrella ⭐ al repositorio!

Comparte con otros administradores de Discord que buscan transparencia y funcionalidad completa.

---

**🎯 Nexus Panel: El único bot de Discord con transparencia total.**

*Mientras otros bots piden confianza ciega, nosotros la ganamos con transparencia completa.*