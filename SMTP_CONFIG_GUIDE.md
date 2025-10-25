# Guía de Configuración SMTP - Archivo+ v3.1

## 📧 Acceso al Panel de Configuración

1. Inicia sesión como **administrador** en Archivo+
2. Ve al menú **Admin** (arriba a la derecha)
3. Haz clic en la pestaña **SMTP Config**

## 🔧 Configuración con Gmail

### Paso 1: Generar App Password en Google

Gmail no permite usar tu contraseña normal para aplicaciones de terceros. Necesitas generar una **App Password**:

1. **Ve a tu cuenta de Google**: https://myaccount.google.com/security
2. **Activa 2-Step Verification** (si no está activado):
   - En la sección "Signing in to Google"
   - Haz clic en "2-Step Verification"
   - Sigue las instrucciones para activarlo
3. **Genera una App Password**:
   - Vuelve a https://myaccount.google.com/security
   - Busca "App passwords" (Contraseñas de aplicaciones)
   - Selecciona "Mail" y "Other" (Custom name)
   - Escribe "Archivo Plus" como nombre
   - Haz clic en "Generate"
   - **Copia el password de 16 caracteres** (formato: xxxx xxxx xxxx xxxx)

### Paso 2: Configurar en Archivo+

En el panel **SMTP Config**:

| Campo | Valor |
|-------|-------|
| **Backend de Email** | `SMTP (Production - envía emails reales)` |
| **SMTP Host** | `smtp.gmail.com` |
| **Puerto SMTP** | `587` |
| **Usar TLS** | ✅ Activado |
| **Email Usuario** | `tu-cuenta@gmail.com` |
| **Password** | `xxxx xxxx xxxx xxxx` (App Password generado) |
| **Email Remitente** | `noreply@archivoplus.local` |

### Paso 3: Probar la Configuración

1. En la sección **"Probar Configuración"** del mismo panel
2. Ingresa tu email de prueba
3. Haz clic en **"Enviar Prueba"**
4. Verifica tu bandeja de entrada

## 🔄 Modo de Desarrollo (Console)

Si solo quieres probar sin enviar emails reales:

1. Selecciona **Backend de Email**: `Console (Development - muestra en logs)`
2. Los emails se mostrarán en los logs del backend en lugar de enviarse

Ver emails en logs:
```bash
docker logs archivoplus_backend | grep "Reset password token"
```

## 📋 Otros Proveedores SMTP

### Outlook/Hotmail

| Campo | Valor |
|-------|-------|
| **SMTP Host** | `smtp-mail.outlook.com` |
| **Puerto** | `587` |
| **TLS** | ✅ Activado |
| **Usuario** | `tu-cuenta@outlook.com` |

### SendGrid

| Campo | Valor |
|-------|-------|
| **SMTP Host** | `smtp.sendgrid.net` |
| **Puerto** | `587` |
| **TLS** | ✅ Activado |
| **Usuario** | `apikey` |
| **Password** | Tu API Key de SendGrid |

### Mailgun

| Campo | Valor |
|-------|-------|
| **SMTP Host** | `smtp.mailgun.org` |
| **Puerto** | `587` |
| **TLS** | ✅ Activado |
| **Usuario** | Tu usuario SMTP de Mailgun |
| **Password** | Tu password SMTP de Mailgun |

## 🚨 Solución de Problemas

### Error: "Application-specific password required"

**Problema**: Gmail rechaza la conexión con tu password normal.

**Solución**: 
- Debes usar una **App Password** generada en Google
- No puedes usar tu contraseña normal de Gmail
- Sigue el Paso 1 de esta guía

### Error: "Username and Password not accepted"

**Problemas comunes**:
1. No has activado 2-Step Verification en Google
2. Estás usando tu password normal en lugar de la App Password
3. Copiaste mal la App Password (verifica espacios/caracteres)

**Solución**:
- Genera una nueva App Password
- Copia y pega completa (sin espacios extras)
- Verifica que sea de 16 caracteres

### Error: "SMTPAuthenticationError"

**Problema**: Credenciales incorrectas.

**Solución**:
- Verifica que el email sea correcto
- Regenera la App Password en Google
- Asegúrate de estar usando `smtp.gmail.com` y puerto `587`

### Error: "Connection refused"

**Problema**: No se puede conectar al servidor SMTP.

**Solución**:
- Verifica tu conexión a internet
- Confirma que el puerto 587 no esté bloqueado por firewall
- Si estás en una red corporativa, puede que bloqueen SMTP

### Los emails no llegan

**Verifica**:
1. Revisa la **carpeta de Spam/Junk**
2. Verifica que el email destinatario sea correcto
3. Revisa los logs: `docker logs archivoplus_backend`
4. Asegúrate de estar en modo **SMTP** (no Console)

## 🔐 Seguridad

### ✅ Buenas Prácticas

- ✅ Usa **App Passwords** (nunca tu password principal)
- ✅ Activa **2-Step Verification** en tu cuenta de Google
- ✅ Usa **TLS** para encriptar la conexión
- ✅ Configura un email remitente específico (`noreply@...`)
- ✅ Revoca App Passwords si ya no las usas

### ⚠️ Advertencias

- ⚠️ **NO compartas** tu App Password
- ⚠️ **NO subas** el archivo `.env` a repositorios públicos
- ⚠️ **NO uses** tu password principal de Gmail
- ⚠️ Cambia la App Password si crees que fue comprometida

## 🧪 Testing

### Probar desde la UI

1. Ve a **Admin → SMTP Config**
2. Configura el SMTP
3. Guarda la configuración
4. En "Probar Configuración", ingresa un email
5. Haz clic en "Enviar Prueba"

### Probar recuperación de contraseña

1. Configura SMTP como se indica arriba
2. Cierra sesión
3. Haz clic en "¿Olvidaste tu contraseña?"
4. Ingresa tu email
5. Revisa tu bandeja de entrada
6. Haz clic en el link de recuperación

### Ver logs de email

```bash
# Ver todos los logs del backend
docker logs archivoplus_backend

# Ver solo logs relacionados con email
docker logs archivoplus_backend | grep -i email

# Ver tokens de reset password (modo console)
docker logs archivoplus_backend | grep "Reset password token"

# Seguir logs en tiempo real
docker logs -f archivoplus_backend
```

## 📊 Límites de Gmail

Gmail tiene límites diarios para envío de emails:

| Tipo de Cuenta | Límite Diario |
|----------------|---------------|
| **Gmail gratis** | 500 emails/día |
| **Google Workspace** | 2,000 emails/día |

Para aplicaciones en producción con alto volumen, considera usar:
- **SendGrid** (100 emails/día gratis, luego pago)
- **Mailgun** (5,000 emails/mes gratis)
- **Amazon SES** (62,000 emails/mes gratis)

## 🔄 Reiniciar Servidor

Después de cambiar la configuración desde el panel, **reinicia el backend**:

```bash
# Método 1: Docker Compose
docker-compose restart backend

# Método 2: PM2 (instalación nativa)
pm2 restart archivoplus-backend
```

## 📝 Configuración Manual (.env)

Si prefieres editar el archivo `.env` manualmente:

```bash
# Editar archivo
nano /Users/acarreola/Sites/archivoplus/.env
```

Agregar o modificar:
```env
EMAIL_BACKEND=django.core.mail.backends.smtp.EmailBackend
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USE_TLS=True
EMAIL_HOST_USER=tu-cuenta@gmail.com
EMAIL_HOST_PASSWORD=xxxx xxxx xxxx xxxx
DEFAULT_FROM_EMAIL=noreply@archivoplus.local
FRONTEND_URL=http://localhost:5173
```

Guardar y reiniciar backend.

## 🎯 Checklist de Configuración

Antes de usar recuperación de contraseñas en producción:

- [ ] Configuración SMTP guardada en Admin panel
- [ ] App Password generada en Google
- [ ] 2-Step Verification activado en Google
- [ ] Email de prueba enviado exitosamente
- [ ] Email de prueba recibido (verificar spam)
- [ ] `FRONTEND_URL` configurado con dominio real (producción)
- [ ] Backend reiniciado después de cambios
- [ ] Recuperación de contraseña probada end-to-end
- [ ] Logs verificados para errores

## 🆘 Soporte

Si sigues teniendo problemas:

1. **Revisa los logs**: `docker logs archivoplus_backend`
2. **Verifica el panel SMTP Config**: Admin → SMTP Config
3. **Prueba modo Console** primero para descartar problemas de SMTP
4. **Contacta al administrador del sistema**

---

**Última actualización**: 2025-01-XX  
**Versión**: Archivo+ v3.1  
**Documento**: SMTP_CONFIG_GUIDE.md
