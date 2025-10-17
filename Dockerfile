# Dockerfile
# Define cómo construir la imagen de nuestro contenedor de backend.

# 1. Usar una imagen oficial de Python como base
FROM python:3.11-slim

# Instalar dependencias del sistema, incluyendo FFmpeg
RUN apt-get update && apt-get install -y ffmpeg

# 2. Evitar que Python genere archivos .pyc
ENV PYTHONDONTWRITEBYTECODE 1
ENV PYTHONUNBUFFERED 1

# 3. Establecer el directorio de trabajo dentro del contenedor
WORKDIR /app

# 4. Instalar las dependencias de Python
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# 5. Copiar el resto del código del proyecto al contenedor
COPY . .
