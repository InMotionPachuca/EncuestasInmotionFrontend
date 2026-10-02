# ---- Build ----
FROM node:22-alpine AS build
WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY . .
RUN npm run build

# ---- Runtime ----
FROM nginx:alpine
# NOTA: Reemplaza "in-motion-encuestas" por el nombre de salida de tu build (revisa tu angular.json o dist/)
# Si es Angular 17+: /app/dist/<nombre-app>/browser
# Si es Angular previo: /app/dist/<nombre-app>
COPY --from=build /app/dist/in-motion-encuestas/browser /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80