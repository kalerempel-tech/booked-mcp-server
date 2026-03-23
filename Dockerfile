FROM node:18-alpine
WORKDIR /app
COPY package.json ./
RUN npm install
COPY . .
ENV MODAL_API_URL=https://kalerempel--booked-demo-analysis-fastapi-app.modal.run
ENV PORT=3000
EXPOSE 3000
CMD ["node", "server.js"]
