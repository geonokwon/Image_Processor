# 리팩토링 설명 문서

이 문서는 `page.tsx` 파일을 여러 개의 작은 컴포넌트로 분리한 리팩토링에 대한 설명입니다.

## 📋 목차

1. [리팩토링의 목적](#리팩토링의-목적)
2. [분리된 컴포넌트 목록](#분리된-컴포넌트-목록)
3. [각 컴포넌트 상세 설명](#각-컴포넌트-상세-설명)
4. [컴포넌트 사용 방법](#컴포넌트-사용-방법)
5. [주요 개선 사항](#주요-개선-사항)

---

## 리팩토링의 목적

### 문제점
- `page.tsx` 파일이 1113줄로 너무 길었습니다
- 하나의 파일에 모든 기능이 들어있어 읽기 어려웠습니다
- SOLID 원칙 중 **단일 책임 원칙(Single Responsibility Principle)**을 위반했습니다
- 코드를 수정하거나 테스트하기 어려웠습니다

### 해결 방법
- 기능별로 컴포넌트를 분리했습니다
- 각 컴포넌트가 하나의 명확한 역할만 담당하도록 했습니다
- 초보자도 이해할 수 있도록 간단한 패턴을 사용했습니다

---

## 분리된 컴포넌트 목록

총 5개의 새로운 컴포넌트를 만들었습니다:

1. **StatusSection** - 상태 표시 (업로드/완료/실패/토큰)
2. **PromptPresetSection** - 프롬프트 프리셋 관리
3. **BackgroundColorPresetSection** - 배경색 프리셋 관리
4. **PromptInputSection** - 프롬프트 텍스트 입력
5. **ActionButtons** - 처리/초기화/다운로드 버튼

---

## 각 컴포넌트 상세 설명

### 1. StatusSection (상태 표시)

**위치**: `src/components/StatusSection.tsx`

**역할**: 
- 업로드된 이미지 수를 표시합니다
- 처리 완료된 이미지 수를 표시합니다
- 처리 실패한 이미지 수를 표시합니다
- 사용된 토큰 수를 계산하고 표시합니다

**사용 방법**:
```tsx
<StatusSection 
  uploadedCount={uploadedImages.length}
  processedImages={processedImages}
/>
```

**주요 특징**:
- 업로드된 이미지가 없으면 아무것도 표시하지 않습니다
- 토큰 사용량은 현재 버전과 히스토리 버전 모두 포함하여 계산합니다

---

### 2. PromptPresetSection (프롬프트 프리셋 관리)

**위치**: `src/components/PromptPresetSection.tsx`

**역할**:
- 프롬프트 프리셋 목록을 표시합니다
- 프롬프트 프리셋을 선택할 수 있습니다
- 프롬프트 프리셋을 추가/수정/삭제할 수 있습니다

**사용 방법**:
```tsx
<PromptPresetSection
  presets={promptPresets}
  selectedPresetId={selectedPromptPresetId}
  currentPrompt={prompt}
  processing={processing}
  onPresetSelect={(preset) => {
    // 프리셋 선택 시 실행할 함수
    handleSelectPromptPreset(preset);
  }}
  onPresetsChange={(updatedPresets) => {
    // 프리셋 목록이 변경될 때 실행할 함수
    setPromptPresets(updatedPresets);
  }}
  onPromptChange={(newPrompt) => {
    // 프롬프트가 변경될 때 실행할 함수
    setPrompt(newPrompt);
  }}
/>
```

**주요 특징**:
- 모달 창을 사용하여 프리셋을 추가/수정합니다
- 수정 모드를 통해 기존 프리셋을 편집할 수 있습니다
- 프리셋 삭제 시 확인 메시지를 표시합니다

---

### 3. BackgroundColorPresetSection (배경색 프리셋 관리)

**위치**: `src/components/BackgroundColorPresetSection.tsx`

**역할**:
- 배경색 프리셋 목록을 표시합니다
- 배경색 프리셋을 선택할 수 있습니다
- 배경색 프리셋을 추가/수정/삭제할 수 있습니다

**사용 방법**:
```tsx
<BackgroundColorPresetSection
  presets={backgroundColorPresets}
  selectedPresetId={selectedBackgroundColor || ''}
  processing={processing}
  onPresetSelect={(presetId) => {
    // 프리셋 선택 시 실행할 함수
    setSelectedBackgroundColor(presetId || null);
  }}
  onPresetsChange={(updatedPresets) => {
    // 프리셋 목록이 변경될 때 실행할 함수
    setBackgroundColorPresets(updatedPresets);
  }}
/>
```

**주요 특징**:
- 색상 선택기를 통해 색상을 선택할 수 있습니다
- 색상 코드를 직접 입력할 수도 있습니다
- 색상 미리보기 스와치를 표시합니다

---

### 4. PromptInputSection (프롬프트 텍스트 입력)

**위치**: `src/components/PromptInputSection.tsx`

**역할**:
- 프롬프트를 입력할 수 있는 textarea를 제공합니다
- 간단하고 재사용 가능한 컴포넌트입니다

**사용 방법**:
```tsx
<PromptInputSection
  prompt={prompt}
  processing={processing}
  onPromptChange={(newPrompt) => {
    // 프롬프트 변경 시 실행할 함수
    setPrompt(newPrompt);
  }}
/>
```

**주요 특징**:
- 매우 간단한 컴포넌트입니다
- 프롬프트 입력과 관련된 로직만 담당합니다

---

### 5. ActionButtons (액션 버튼)

**위치**: `src/components/ActionButtons.tsx`

**역할**:
- "모든 이미지 처리하기" 버튼을 제공합니다
- "초기화" 버튼을 제공합니다
- "모두 다운로드 (ZIP)" 버튼을 제공합니다

**사용 방법**:
```tsx
<ActionButtons
  hasUploadedImages={uploadedImages.length > 0}
  completedCount={processedImages.filter(img => img.status === 'completed').length}
  processing={processing}
  uploading={uploading}
  downloading={downloading}
  onProcessAll={handleProcessAll}
  onReset={handleReset}
  onDownloadAll={handleDownloadAll}
/>
```

**주요 특징**:
- 업로드된 이미지가 없으면 표시하지 않습니다
- 다운로드 버튼은 처리 완료된 이미지가 있을 때만 표시됩니다
- 처리 중일 때는 버튼을 비활성화합니다

---

## 컴포넌트 사용 방법

### Props란?
컴포넌트를 사용할 때 전달하는 데이터를 **Props**라고 합니다.

예를 들어:
```tsx
<StatusSection 
  uploadedCount={5}  // 이것이 props입니다
  processedImages={images}  // 이것도 props입니다
/>
```

### Callback 함수란?
부모 컴포넌트(페이지)에서 자식 컴포넌트로 함수를 전달하는 것을 **Callback**이라고 합니다.

예를 들어:
```tsx
<PromptInputSection
  onPromptChange={(newPrompt) => {
    // 자식 컴포넌트에서 이 함수를 호출하면
    // 부모 컴포넌트의 상태가 업데이트됩니다
    setPrompt(newPrompt);
  }}
/>
```

### 데이터 흐름
1. **부모 → 자식**: Props를 통해 데이터를 전달합니다
2. **자식 → 부모**: Callback 함수를 통해 이벤트를 전달합니다

```
[page.tsx (부모)]
    ↓ Props (데이터 전달)
[컴포넌트 (자식)]
    ↑ Callback (이벤트 전달)
[page.tsx (부모)]
```

---

## 주요 개선 사항

### 1. 코드 가독성 향상
- 이전: 1113줄의 긴 파일
- 이후: 기능별로 분리된 작은 파일들

### 2. 유지보수 용이성
- 특정 기능을 수정할 때 해당 컴포넌트만 찾아서 수정하면 됩니다
- 다른 부분에 영향을 주지 않습니다

### 3. 재사용성
- 컴포넌트를 다른 페이지에서도 사용할 수 있습니다
- 예: `StatusSection`을 대시보드 페이지에서도 사용 가능

### 4. 테스트 용이성
- 각 컴포넌트를 독립적으로 테스트할 수 있습니다

### 5. SOLID 원칙 준수
- **단일 책임 원칙**: 각 컴포넌트가 하나의 역할만 담당합니다
- **개방-폐쇄 원칙**: 기능을 추가할 때 기존 코드를 수정하지 않고 확장할 수 있습니다

---

## 파일 구조

```
src/
├── app/
│   └── page.tsx              # 메인 페이지 (이제 훨씬 짧아짐)
└── components/
    ├── StatusSection.tsx
    ├── StatusSection.module.css
    ├── PromptPresetSection.tsx
    ├── PromptPresetSection.module.css
    ├── BackgroundColorPresetSection.tsx
    ├── BackgroundColorPresetSection.module.css
    ├── PromptInputSection.tsx
    ├── PromptInputSection.module.css
    ├── ActionButtons.tsx
    ├── ActionButtons.module.css
    ├── ImageUploader.tsx      # 기존 컴포넌트
    └── ImageGallery.tsx       # 기존 컴포넌트
```

---

## 다음 단계

더 개선할 수 있는 부분:
1. **커스텀 훅(Hook)**: 반복되는 로직을 훅으로 분리
2. **타입 정의**: Props 타입을 별도 파일로 분리
3. **상태 관리**: 복잡한 상태는 Context API나 상태 관리 라이브러리 사용

하지만 현재는 초보자도 이해하기 쉬운 수준으로 유지했습니다.

---

## 질문이 있으신가요?

각 컴포넌트의 코드에 주석이 달려있으니 함께 읽어보시면 이해가 더 쉬우실 겁니다!
