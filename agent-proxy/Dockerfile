FROM node:22-alpine
WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm install --omit=dev
COPY server.js ./
ENV PORT=3100
EXPOSE 3100
CMD ["node", "server.js"]
