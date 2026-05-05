# 📊 SISTEMA DE LOGGING DEL BUNDLE SYSTEM

## 🎯 Overview

El sistema de logging del bundle system está diseñado para proporcionar información detallada y estructurada sobre las operaciones de bundles en Discord, facilitando el debugging y monitoreo durante el desarrollo y producción.

## 🔧 Configuración

### Variables de Entorno

```bash
# Niveles disponibles: DEBUG, INFO, WARN, ERROR
BUNDLE_LOG_LEVEL=INFO
```

### Niveles de Log

- **DEBUG**: Información muy detallada para debugging (API calls, performance metrics, bundle data)
- **INFO**: Información general de operaciones (comandos ejecutados, checkouts exitosos)
- **WARN**: Advertencias sobre situaciones inusuales
- **ERROR**: Errores que requieren atención

## 📋 Tipos de Logs

### 1. Bundle Commands (`🎁 BUNDLE_COMMAND`)
```json
{
  "timestamp": "2025-07-18T...",
  "level": "INFO",
  "prefix": "🎁 BUNDLE_COMMAND",
  "action": "browse",
  "guildId": "123456789",
  "userId": "987654321",
  "data": {
    "bundleQuery": null,
    "username": "usuario#1234"
  }
}
```

### 2. API Calls (`🔍 BUNDLE_API`)
```json
{
  "timestamp": "2025-07-18T...",
  "level": "DEBUG",
  "prefix": "🔍 BUNDLE_API",
  "endpoint": "/api/bundles/public/guild/123456789",
  "guildId": "123456789"
}
```

### 3. Success Operations (`✅ BUNDLE_SUCCESS`)
```json
{
  "timestamp": "2025-07-18T...",
  "level": "INFO",
  "prefix": "✅ BUNDLE_SUCCESS",
  "operation": "getGuildBundles",
  "guildId": "123456789",
  "bundleCount": 3
}
```

### 4. Errors (`❌ BUNDLE_ERROR`)
```json
{
  "timestamp": "2025-07-18T...",
  "level": "ERROR",
  "prefix": "❌ BUNDLE_ERROR",
  "operation": "getBundleDetails",
  "bundleId": "bundle123",
  "error": {
    "message": "Bundle not found",
    "stack": "..."
  },
  "responseStatus": 404
}
```

### 5. Button Interactions (`🔘 BUNDLE_BUTTON`)
```json
{
  "timestamp": "2025-07-18T...",
  "level": "DEBUG",
  "prefix": "🔘 BUNDLE_BUTTON",
  "buttonId": "purchase_bundle_abc123",
  "guildId": "123456789",
  "userId": "987654321",
  "bundleId": "abc123",
  "action": "purchase"
}
```

### 6. Checkout Operations (`💳 BUNDLE_CHECKOUT`)
```json
{
  "timestamp": "2025-07-18T...",
  "level": "INFO",
  "prefix": "✅ BUNDLE_CHECKOUT",
  "status": "success",
  "bundleId": "abc123",
  "userId": "987654321",
  "guildId": "123456789",
  "orderId": "PAY-123456789",
  "provider": "paypal",
  "bundleName": "Premium Pack",
  "finalPrice": "19.99"
}
```

### 7. Performance Metrics (`⚡ BUNDLE_PERF`)
```json
{
  "timestamp": "2025-07-18T...",
  "level": "DEBUG",
  "prefix": "⚡ BUNDLE_PERF",
  "operation": "getGuildBundles",
  "duration_ms": 245
}
```

### 8. Bundle Data (`📊 BUNDLE_DATA`)
```json
{
  "timestamp": "2025-07-18T...",
  "level": "DEBUG",
  "prefix": "📊 BUNDLE_DATA",
  "bundleCount": 2,
  "guildId": "123456789",
  "bundles": [
    {
      "id": "abc123",
      "name": "Premium Pack",
      "finalPrice": "19.99",
      "isActive": true,
      "rolesCount": 3
    }
  ]
}
```

## 🔍 Uso Práctico

### Debugging de Problemas

1. **Bundle no aparece**: Revisar logs `📊 BUNDLE_DATA` para ver si se está recibiendo del backend
2. **Error en checkout**: Revisar logs `💳 BUNDLE_CHECKOUT` con status "error"
3. **Comando no responde**: Revisar logs `🎁 BUNDLE_COMMAND` y `❌ BUNDLE_ERROR`
4. **Performance lento**: Revisar logs `⚡ BUNDLE_PERF` para identificar operaciones lentas

### Monitoreo en Producción

```bash
# Ver solo errores
docker logs nexus_bot 2>&1 | grep "BUNDLE_ERROR"

# Ver operaciones de checkout
docker logs nexus_bot 2>&1 | grep "BUNDLE_CHECKOUT"

# Ver performance
docker logs nexus_bot 2>&1 | grep "BUNDLE_PERF"

# Seguir logs en tiempo real
docker logs nexus_bot -f 2>&1 | grep "BUNDLE"
```

### Cambiar Nivel de Log Dinámicamente

En código, se puede cambiar el nivel:
```typescript
import { bundleLogger, LogLevel } from '../utils/bundleLogger';

// Cambiar a DEBUG para debugging intensivo
bundleLogger.setLogLevel(LogLevel.DEBUG);

// Cambiar a ERROR para solo errores críticos
bundleLogger.setLogLevel(LogLevel.ERROR);
```

## 🚀 Ventajas del Sistema

### 1. **Estructurado**
- Logs en formato JSON para fácil parsing
- Campos consistentes entre diferentes tipos de log
- Timestamps precisos

### 2. **Contextual**
- Información de guild, user, bundle en cada log
- Stack traces completos para errores
- Performance metrics automáticos

### 3. **Filtrable**
- Prefijos únicos por tipo de operación
- Niveles de log configurables
- Emojis para identificación visual rápida

### 4. **Escalable**
- Nivel de log configurable por entorno
- No impacta performance en producción (nivel INFO)
- Información detallada disponible cuando se necesite (nivel DEBUG)

## 📈 Métricas Clave

El sistema captura automáticamente:
- **Latencia de API calls** (GET bundles, GET details, POST checkout)
- **Tasa de éxito/error** por operación
- **Patrones de uso** (comandos más utilizados, bundles más vistos)
- **Errores recurrentes** con contexto completo

## 🔧 Extensión Futura

El sistema está diseñado para ser extensible:
- Agregar nuevos tipos de log fácilmente
- Integrar con sistemas de monitoreo externos
- Exportar métricas a Prometheus/Grafana
- Alertas automáticas basadas en patterns de error