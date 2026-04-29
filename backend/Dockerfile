# Usar una versión ligera de Node.js
FROM node:18-alpine

# Crear la carpeta de la app dentro del contenedor
WORKDIR /app

# Copiar los archivos de dependencias y ejecutarlas
COPY package*.json ./
RUN npm install

# Copiar todo el resto del código del backend
COPY . .

# Exponer el puerto (Back4App lo leerá)
EXPOSE 5000

# Comando final para encender el servidor
CMD ["node", "server.js"]