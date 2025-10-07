FROM node:20-alpine
WORKDIR /app
COPY package*.json* ./
RUN npm i -g pnpm
RUN pnpm install --prod=false || true
COPY . .
EXPOSE 4000
CMD ["pnpm","dev"]
