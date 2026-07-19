FROM node:20-alpine as build-stage

RUN apk add --no-cache git

# Clone the upstream repo (pinned for reproducibility)
RUN git clone --depth=1 https://github.com/google/android-emulator-container-scripts.git /src

WORKDIR /app

# Install dependencies from the upstream package.json
RUN cp /src/js/package*.json .
RUN npm install

# Apply npm package patches (event_handler height fix + TURN injection)
COPY patch.js patch.js
RUN node patch.js

# Copy upstream source, then overlay our modified files on top
RUN cp -r /src/js/. .
COPY src/ src/

RUN npm run build

FROM nginx:1.21-alpine as production-stage
COPY --from=build-stage /app/build /usr/share/nginx/html
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
