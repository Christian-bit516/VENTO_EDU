# Usar una versión ligera de Node.js
FROM node:18-alpine

# Crear la carpeta de la app dentro del contenedor
WORKDIR /app

# Copiar los archivos de dependencias e instalar solo producción
COPY package*.json ./
RUN npm install --omit=dev

# Copiar todo el resto del código del backend
COPY . .

# Railway usa el puerto 8080 por defecto
EXPOSE 8080

# Variables de entorno de producción
ENV NODE_ENV=production

# Comando final para encender el servidor
CMD ["node", "server.js"]