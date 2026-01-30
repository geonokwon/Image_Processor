# Haiorder Image Processor

**Next.js + NextAuth + OpenAI DALL-E 기반 AI 이미지 일괄 편집 도구**

## 🎯 특징

- ✅ **Next.js 14** 웹 애플리케이션
- ✅ **NextAuth.js 로그인** (아이디 + bcrypt 비밀번호)
- ✅ **다중 이미지 업로드** (드래그 앤 드롭 지원)
- ✅ **OpenAI DALL-E 2** 이미지 편집
- ✅ **일괄 처리** (여러 이미지를 같은 프롬프트로 자동 처리)
- ✅ **개별 재처리** (실패한 이미지만 다시 처리)
- ✅ **ZIP 다운로드** (모든 결과 이미지 한번에 다운로드)
- ✅ **Docker 배포** (NAS에 배포 가능)

---

## 🚀 빠른 시작

### 1. 의존성 설치

```bash
npm install
```

### 2. 비밀번호 해시 생성

로그인에 사용할 비밀번호의 **bcrypt 해시**를 생성합니다:

```bash
npm run generate:password
```

**실행 예시:**
```
============================================================
🔐 비밀번호 해시 생성기 (bcrypt)
============================================================

비밀번호를 입력하세요: ********

✅ 해시 생성 완료!

------------------------------------------------------------
다음 내용을 .env 파일에 추가하세요:
------------------------------------------------------------

AUTH_PASSWORD_HASH=$2a$10$abcd1234...xyz

------------------------------------------------------------
```

### 3. 환경 변수 설정

`.env.local` 파일 생성:

```bash
# NextAuth
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=swgRcJMQyqUlueoBwk3cjQweV1yqJncIeghyV2RTS9s=

# 로그인 인증 (bcrypt 해시 사용)
AUTH_USERNAME=admin
AUTH_PASSWORD_HASH=\$2a\$10\$xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx

# OpenAI API (DALL-E 2 사용)
OPENAI_API_KEY=sk-proj-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
OPENAI_MODEL=gpt-4o

# 이미지 저장 경로 (선택사항, 기본값: ./uploads)
# UPLOAD_DIR=/path/to/uploads/originals
# RESULT_DIR=/path/to/uploads/results

# 파일 제한 (선택사항)
# MAX_FILE_SIZE=10485760  # 10MB
# MAX_FILES=50
```

⚠️ **주의**: 
- `AUTH_PASSWORD_HASH`는 각 `$` 앞에 `\`를 붙여서 escape 처리하세요!
- 또는 작은따옴표로 감싸세요: `AUTH_PASSWORD_HASH='$2a$10$...'`

### 4. 개발 서버 실행

```bash
npm run dev
```

브라우저에서 http://localhost:3000 접속

---

## 🔐 보안

### 로그인 시스템
- ✅ NextAuth.js 기반 인증
- ✅ bcrypt 암호화된 비밀번호
- ✅ JWT 세션 (30일 유효)

### API 보안
- ✅ 모든 API는 로그인 필수
- ✅ OpenAI API 키는 서버 사이드만 사용 (클라이언트 노출 안 됨)

### 내부망 배포 권장
- NAS Docker에 배포하여 내부 네트워크에서만 접근
- 방화벽으로 외부 접근 차단

---

## 📖 사용 방법

### 1. 로그인

브라우저에서 `http://localhost:3000` 접속:
- **아이디**: `.env.local`에 설정한 `AUTH_USERNAME`
- **비밀번호**: 해시 생성 시 입력한 원본 비밀번호

### 2. 이미지 업로드

- **드래그 앤 드롭** 또는 **클릭**하여 이미지 선택
- 여러 개 선택 가능 (최대 50개)
- JPG, PNG, WEBP 지원

### 3. 프롬프트 입력

모든 이미지에 적용할 AI 프롬프트 입력:
```
배경을 흰색으로 변경해주세요
```
```
이미지를 선명하게 만들어주세요
```
```
제품만 남기고 배경을 제거해주세요
```

### 4. 일괄 처리

- **"모든 이미지 처리하기"** 버튼 클릭
- 이미지가 순차적으로 AI로 처리됨
- 실시간으로 결과 확인 가능

### 5. 결과 확인 및 재처리

- 원본과 결과 이미지를 나란히 비교
- 마음에 안 드는 이미지는 **"재처리"** 버튼으로 다시 처리
- 모든 처리가 완료되면 **"모두 다운로드 (ZIP)"** 버튼으로 한번에 다운로드

---

## 🐳 Docker 배포 (NAS)

### 빌드 및 실행

```bash
# Docker Compose로 배포
docker-compose up -d

# 로그 확인
docker-compose logs -f

# 중지
docker-compose down
```

### docker-compose.yml

```yaml
version: '3.8'

services:
  app:
    build: .
    ports:
      - "3000:3000"
    volumes:
      - ./uploads:/app/uploads:rw
    env_file:
      - .env.local
    restart: unless-stopped
```

### 볼륨 마운트

- `./uploads`: 업로드된 이미지와 처리된 이미지가 저장됨
- 컨테이너를 재시작해도 데이터 유지

---

## 💰 비용 (OpenAI DALL-E 2)

### 이미지 편집 비용
- **1024×1024**: $0.020 / 이미지
- **512×512**: $0.018 / 이미지
- **256×256**: $0.016 / 이미지

### 예상 비용
- 10개 이미지: **$0.20** (약 270원)
- 100개 이미지: **$2.00** (약 2,700원)

⚠️ OpenAI API 키에 결제 정보가 등록되어 있어야 합니다.

---

## 🛠️ 기술 스택

- **Frontend**: Next.js 14 (App Router), React, TypeScript
- **Backend**: Next.js API Routes, Node.js
- **Authentication**: NextAuth.js, bcrypt
- **AI**: OpenAI DALL-E 2 API
- **File Handling**: fs-extra, archiver
- **Styling**: CSS Modules
- **Deployment**: Docker, Docker Compose

---

## 📁 프로젝트 구조

```
Image_Processor/
├── src/
│   ├── app/
│   │   ├── api/
│   │   │   ├── auth/[...nextauth]/  # NextAuth 인증
│   │   │   ├── upload/              # 이미지 업로드
│   │   │   ├── process/             # AI 처리
│   │   │   ├── download/            # ZIP 다운로드
│   │   │   └── image/[filename]/    # 이미지 조회
│   │   ├── auth/signin/             # 로그인 페이지
│   │   ├── page.tsx                 # 메인 페이지
│   │   └── layout.tsx               # 레이아웃
│   ├── components/
│   │   ├── ImageUploader.tsx        # 업로드 UI
│   │   ├── ImageGallery.tsx         # 갤러리 UI
│   │   └── SessionProvider.tsx      # 세션 관리
│   ├── lib/
│   │   ├── services/
│   │   │   ├── aiImageService.ts    # AI 처리
│   │   │   └── imageService.ts      # 이미지 관리
│   │   ├── config.ts                # 설정
│   │   └── logger.ts                # 로깅
│   └── types/
│       └── index.ts                 # 타입 정의
├── uploads/                         # 이미지 저장소
│   ├── originals/                   # 원본 이미지
│   └── results/                     # 처리된 이미지
├── scripts/
│   └── generate-password-hash.js    # 비밀번호 해시 생성
├── docker-compose.yml
├── Dockerfile
└── package.json
```

---

## 🐛 문제 해결

### Q: 로그인이 안 돼요
A: 
1. `.env.local` 파일의 `AUTH_PASSWORD_HASH`가 올바른지 확인
2. `$` 기호를 escape (`\$`) 했는지 확인
3. `npm run dev`로 서버 재시작

### Q: 이미지 처리가 실패해요
A:
1. `OPENAI_API_KEY`가 올바른지 확인
2. OpenAI 계정에 결제 정보가 등록되어 있는지 확인
3. API 사용 한도를 초과하지 않았는지 확인

### Q: 업로드가 안 돼요
A:
1. 파일 크기가 10MB를 초과하지 않는지 확인
2. 이미지 형식이 JPG, PNG, WEBP인지 확인
3. `uploads/` 디렉토리에 쓰기 권한이 있는지 확인

---

## 📝 라이선스

MIT

---

## 👨‍💻 개발자

Haiorder Team

---

## 📞 문의

문제가 발생하면 GitHub Issues를 통해 문의해주세요.
