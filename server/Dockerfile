FROM node:20-alpine

# adb binary
RUN apk add --no-cache android-tools

WORKDIR /app
COPY package.json ./
RUN npm install --production

COPY server.js start.sh ./
RUN chmod +x start.sh

EXPOSE 3000
CMD ["/app/start.sh"]
