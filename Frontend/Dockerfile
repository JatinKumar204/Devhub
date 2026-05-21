FROM node:20-alpine AS build
WORKDIR /app

ARG DEVHUB_ENV=development

COPY package*.json ./
RUN npm ci --silent

COPY . .
RUN npx ng build --configuration=$DEVHUB_ENV --output-path=/dist

FROM nginx:alpine AS final
COPY --from=build /dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Inject machine name at container start
ARG MACHINE_NAME=docker-host
RUN sed -i "s/DEVHUB_MACHINE_PLACEHOLDER/$MACHINE_NAME/g" /usr/share/nginx/html/index.html

EXPOSE 80
HEALTHCHECK --interval=30s --timeout=5s CMD wget -qO- http://localhost/ || exit 1
CMD ["nginx", "-g", "daemon off;"]
