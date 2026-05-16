FROM node:20

WORKDIR /app

COPY backend/package*.json ./backend/

WORKDIR /app/backend

RUN npm install

COPY backend .

RUN npx prisma generate

RUN npm run build

EXPOSE 3000

CMD ["npm", "start"]