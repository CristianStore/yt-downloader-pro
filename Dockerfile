# Usar una imagen de Node.js ligera
FROM node:20-slim

# Instalar dependencias necesarias para yt-dlp (python3)
RUN apt-get update && apt-get install -y python3 curl && rm -rf /var/lib/apt/lists/*

# Crear directorio de la app
WORKDIR /app

# Instalar yt-dlp (version de Linux para el servidor)
RUN curl -L https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp -o /usr/local/bin/yt-dlp
RUN chmod a+rx /usr/local/bin/yt-dlp

# Copiar archivos de dependencias
COPY package*.json ./

# Instalar dependencias de Node
RUN npm install --production

# Copiar el resto del código
COPY . .

# Exponer el puerto
EXPOSE 4050

# Comando para iniciar
CMD ["node", "server.js"]
