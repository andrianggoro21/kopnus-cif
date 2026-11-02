FROM node:26-alpine AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM nginx:alpine
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY docker/banner.sh /docker-entrypoint.d/99-banner.sh
RUN chmod +x /docker-entrypoint.d/99-banner.sh
COPY --from=build /app/dist /usr/share/nginx/html
