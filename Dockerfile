# 1. Base Image
FROM node:20-alpine

# 2. Set Working Directory
WORKDIR /app

# 3. Install Dependencies
# sharp 등 이미지 라이브러리 호환성을 위해 libc6-compat 추가
RUN apk add --no-cache libc6-compat

COPY package.json package-lock.json ./
RUN npm ci

# 4. Copy Source Code
COPY . .

# 5. Build Application
RUN npm run build

# 6. Expose Port
EXPOSE 3000

# 7. Start Application (프로덕션 모드)
CMD ["npm", "start"]
