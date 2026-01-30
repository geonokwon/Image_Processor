# Image Processor

**AI 기반 이미지 일괄 편집 웹 애플리케이션** — Next.js 14, 멀티 AI 프로바이더(OpenAI / Google Gemini), 실시간 진행 상태(SSE), 인증·보안을 적용한 풀스택 프로젝트입니다.

---

## 📌 프로젝트 소개

Image Processor는 **여러 장의 이미지를 한 번에 AI로 편집**할 수 있는 웹 도구입니다.  
드래그 앤 드롭으로 이미지를 올리고, 텍스트 프롬프트만 입력하면 배경 제거·색감 보정·스타일 변경 등을 **일괄 처리**할 수 있으며, 처리 결과는 실시간으로 확인하고 ZIP으로 일괄 다운로드할 수 있습니다.

- **대상 사용 시나리오**: 이커머스 상품 이미지 보정, SNS용 이미지 일괄 편집, 내부 업무용 이미지 전처리
- **배포**: Docker 기반으로 NAS·온프레미스·클라우드에 배포 가능
- **인증**: NextAuth.js + bcrypt 기반 로그인으로 내부 전용 도구로 운영 가능

---

## 🛠 기술 스택

| 구분 | 기술 |
|------|------|
| **Frontend** | Next.js 14 (App Router), React 18, TypeScript |
| **Backend** | Next.js API Routes (Server Actions / Route Handlers) |
| **인증** | NextAuth.js (Credentials Provider), JWT 세션, bcrypt 비밀번호 해싱 |
| **AI** | OpenAI (gpt-image-1 / DALL·E), Google Gemini (gemini-3-pro-image-preview, Imagen) — **Factory 패턴으로 프로바이더 교체** |
| **실시간 통신** | Server-Sent Events (SSE) — 폴링 없이 작업 진행률 스트리밍 |
| **이미지·파일** | Sharp, archiver(ZIP), fs-extra |
| **검증·로깅** | Zod, Winston |
| **스타일** | CSS Modules |
| **배포** | Docker, Docker Compose |

---

## 🏗 아키텍처 및 설계

### 레이어 구조

- **Presentation**: Next.js App Router 페이지, React 컴포넌트 (역할별 분리: 업로드, 갤러리, 프롬프트, 프리셋, 액션 버튼 등)
- **API**: Route Handlers — 인증 미들웨어로 보호, 요청/응답 타입 명시
- **Application**: 서비스 레이어 (`aiImageService`, `geminiImageService`, `imageService`, `presetService`, `promptPresetService`)
- **Domain**: `ImageProvider` 인터페이스, AI 프로바이더 팩토리(`aiImageProviderFactory`), 공통 타입(`types/index.ts`)

### 설계 포인트 (취업 포트폴리오 관점)

- **SOLID**
  - **단일 책임**: 페이지를 StatusSection, PromptPresetSection, BackgroundColorPresetSection, PromptInputSection, ActionButtons 등으로 분리해 화면/기능별 단일 책임 유지
  - **개방-폐쇄**: `ImageProvider` 인터페이스와 `getImageProvider()` 팩토리로 OpenAI/Gemini 추가·교체 시 기존 코드 수정 최소화
- **의존성 역전**: AI 처리 로직이 구체 클래스가 아닌 `ImageProvider` 인터페이스에 의존
- **타입 안정성**: API 응답·이미지·작업 상태 등을 TypeScript 인터페이스로 정의하고 전 구간에서 사용
- **실시간 UX**: 장시간 일괄 처리 시 폴링 대신 **SSE**로 진행률 스트리밍, 불필요한 요청 감소
- **상태 관리**: 일괄 작업 ID 기반 `JobStore`(인메모리)로 진행 상태 공유 — 확장 시 Redis/DB 교체 가능 구조

### 디렉터리 구조

```
src/
├── app/
│   ├── api/                    # API Routes
│   │   ├── auth/[...nextauth]/  # NextAuth
│   │   ├── upload/              # 이미지 업로드
│   │   ├── process/             # AI 일괄 처리
│   │   ├── process/stream/      # SSE 진행률 스트림
│   │   ├── process/[id]/retry/  # 개별 재처리
│   │   ├── download/            # ZIP 다운로드
│   │   ├── image/               # 이미지 조회/삭제/정리
│   │   ├── presets/             # 배경색 프리셋 CRUD
│   │   └── prompt-presets/      # 프롬프트 프리셋 CRUD
│   ├── auth/signin/             # 로그인 페이지
│   ├── page.tsx                 # 메인 (컴포넌트 조합)
│   └── layout.tsx
├── components/                  # UI 컴포넌트 (역할별 분리)
├── lib/
│   ├── ai/
│   │   └── aiImageProviderFactory.ts  # AI 프로바이더 팩토리
│   ├── services/                # 비즈니스 로직
│   │   ├── aiImageService.ts    # OpenAI
│   │   ├── geminiImageService.ts # Gemini
│   │   ├── imageService.ts
│   │   ├── presetService.ts
│   │   └── promptPresetService.ts
│   ├── auth.ts
│   ├── config.ts
│   ├── jobStore.ts              # 작업 상태 저장소
│   └── logger.ts
├── types/
└── middleware.ts                # 인증 미들웨어 (보호 경로 설정)
```

---

## ✨ 주요 기능

| 기능 | 설명 |
|------|------|
| **다중 이미지 업로드** | 드래그 앤 드롭, JPG/PNG/WEBP, 최대 파일 수·용량 설정 가능 |
| **AI 일괄 편집** | 하나의 프롬프트로 여러 이미지 순차 처리 (OpenAI 또는 Gemini) |
| **실시간 진행률** | SSE로 처리 단계별 진행 상황 스트리밍 |
| **개별 재처리** | 실패·불만족 이미지만 선택 후 재실행 |
| **프롬프트 프리셋** | 자주 쓰는 프롬프트 저장·선택 (서버 저장) |
| **배경색 프리셋** | 자주 쓰는 배경색 저장·선택 |
| **ZIP 일괄 다운로드** | 처리된 이미지 전체를 한 번에 다운로드 |
| **토큰 사용량 표시** | 이미지별·전체 토큰 사용량 노출 (비용 가시화) |

---

## 🔐 보안

- **인증**: NextAuth.js Credentials + bcrypt 해시, JWT 세션(유효기간 설정)
- **경로 보호**: `middleware.ts`로 `/`, `/api/upload`, `/api/process/*`, `/api/download`, `/api/image/*` 등 로그인 필수
- **API 키**: OpenAI/Gemini 키는 서버 환경 변수로만 사용, 클라이언트 노출 없음
- **비밀/키 관리**: `.env`, `.env.local`, `*.key`, `*credentials*.json` 등은 `.gitignore`로 저장소 제외

---

## 🚀 로컬 실행

### 1. 의존성 설치

```bash
npm install
```

### 2. 환경 변수

`.env.local` 예시:

```bash
# NextAuth
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=<랜덤 시크릿>

# 로그인 (bcrypt 해시는 npm run generate:password 로 생성)
AUTH_USERNAME=admin
AUTH_PASSWORD_HASH=$2a$10$...

# AI (둘 중 사용할 프로바이더만 설정)
OPENAI_API_KEY=sk-...
# GEMINI_API_KEY=...   또는 GOOGLE_API_KEY=...

# (선택) AI 프로바이더: openai | gemini
# AI_PROVIDER=openai
```

비밀번호 해시 생성:

```bash
npm run generate:password
```

### 3. 개발 서버

```bash
npm run dev
```

브라우저에서 `http://localhost:3000` 접속 후 로그인하여 사용합니다.

---

## 🐳 Docker 배포

```bash
docker-compose up -d
```

- `docker-compose.yml`에서 `env_file: .env`(또는 `.env.local`)로 환경 변수 로드
- `./uploads` 볼륨으로 업로드·결과 이미지 영구 저장
- NAS·서버에 그대로 배포 가능

---

## 📁 저장소

- **Git**: `git@github.com:geonokwon/Image_Processor.git`

---

## 📝 라이선스

MIT
