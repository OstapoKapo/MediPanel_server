# 1. Візьмемо легкий Node образ
FROM node:18-alpine

# 2. Робоча директорія в контейнері
WORKDIR /app

# 3. Копіюємо package.json та package-lock.json
COPY package*.json ./

# 4. Встановлюємо залежності
RUN npm install

# 5. Копіюємо весь проект у контейнер
COPY . .

# 6. Запускаємо збірку TypeScript
RUN npm run build

# 7. Відкриваємо порт 8000
EXPOSE 8000

# 8. Запускаємо сервер (збудований код)
CMD ["node", "dist/main"]
