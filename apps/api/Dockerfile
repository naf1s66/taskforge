FROM node:20-alpine

# Install OpenSSL and other dependencies needed for Prisma
RUN apk add --no-cache openssl libc6-compat

WORKDIR /app
COPY package*.json* ./
RUN npm i -g pnpm
RUN pnpm install --prod=false
COPY . .
RUN pnpm exec prisma generate
EXPOSE 4000
CMD ["pnpm","dev"]
