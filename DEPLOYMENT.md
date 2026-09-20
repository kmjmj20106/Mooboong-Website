# 무붕 무료 배포: Render + Supabase

이 폴더 전체가 배포용 프로젝트입니다. **`mooboong-deploy.zip`을 풀고, 안의 파일·폴더 전부를 GitHub 저장소 맨 위에 올리세요.** ZIP 자체나 `public` 폴더만 올리는 방식이 아닙니다. 저장소 첫 화면에 `render.yaml`, `Dockerfile`, `server.mjs`, `package.json`, `lib`, `public`이 보여야 합니다.

사이트 실행은 Render, 멤버·팀·예약·공지·첨부파일·노션 문서는 Supabase PostgreSQL이 담당합니다. 서버를 재시작하거나 새 버전을 배포해도 Supabase에 저장한 데이터는 유지됩니다. 구글 캘린더는 필요하지 않습니다.

## 1. 압축 풀기

`mooboong-deploy.zip`을 더블클릭해 압축을 풉니다. `render.yaml`이 있는 폴더가 프로젝트 최상위 폴더입니다. 기존 로컬 사이트의 `data` 폴더는 옮겨 넣지 마세요. 기존 데이터 이전은 아래 별도 절차를 따릅니다.

## 2. Supabase 프로젝트 만들기

1. https://supabase.com/dashboard 에서 로그인합니다.
2. Free 요금제 조직에서 **New project**를 선택합니다.
3. 프로젝트 이름을 `mooboong`으로 정하고 **Database password**를 별도로 보관합니다. 사이트 로그인 비밀번호와는 다릅니다.
4. 지역은 Render 서버와 가까운 Singapore 등을 선택합니다. 프로젝트 생성이 끝날 때까지 기다립니다.
5. 프로젝트의 **Connect → Connection string → URI → Session pooler** 연결 주소를 복사합니다. 포트는 `5432`이고 사용자명은 보통 `postgres.프로젝트참조값`입니다. 프로젝트 화면의 실제 주소를 그대로 쓰세요.
6. 주소 안의 `[YOUR-PASSWORD]` 부분을 3번의 DB 비밀번호로 바꿉니다. 비밀번호에 `@`, `:`, `/`, `#`, `%` 같은 문자가 있으면 URL 인코딩해야 합니다. 예: `@`는 `%40`. 온라인 인코딩 사이트에 실제 비밀번호를 입력하지 마세요.

예시 모양:

```text
postgresql://postgres.PROJECT_REF:URL_ENCODED_PASSWORD@YOUR_SESSION_POOLER_HOST:5432/postgres
```

**이 주소를 `DATABASE_URL`로 사용합니다.** Supabase 프로젝트 URL, anon key, publishable key, service role key가 아닙니다. Storage 버킷은 만들 필요가 없습니다. 테이블은 서버가 처음 켜질 때 `mooboong` 스키마에 자동 생성합니다. SQL Editor에 `schema.sql`을 따로 실행할 필요도 없습니다.

연결 방식 설명: [Supabase 공식 문서](https://supabase.com/docs/guides/database/connecting-to-postgres).

## 3. GitHub에 파일 올리기

1. https://github.com/new 에서 새 저장소를 만듭니다. 이름은 `mooboong`, 공개 범위는 **Private**로 권장합니다.
2. 빈 저장소의 **uploading an existing file** 링크, 또는 **Add file → Upload files**를 누릅니다.
3. 압축을 푼 폴더 **안의 내용물 전체**를 끌어 놓습니다. 폴더 바깥을 통째로 올려 한 단계 더 중첩시키지 마세요.
4. Mac Finder에서는 `⌘⇧.`으로 숨김 파일도 표시합니다. `.gitignore`, `.dockerignore`, `.env.example`도 함께 올립니다.
5. **Commit changes**를 누릅니다.
6. 저장소 첫 화면에 `render.yaml`과 `Dockerfile`이 바로 보이는지 확인합니다.

이 배포 ZIP에는 실제 멤버 데이터, 실제 비밀번호, `.env`, `node_modules`가 없습니다. 나중에 생기는 `.env`, DB 파일, 백업 JSON을 GitHub에 올리지 마세요. `package-lock.json`은 꼭 올립니다.

## 4. Render에서 배포하기

1. https://dashboard.render.com 에서 로그인합니다.
2. **New → Blueprint**를 선택합니다.
3. GitHub를 연결하고 방금 만든 저장소를 선택합니다. 비공개 저장소라면 해당 저장소 접근 권한을 허용합니다.
4. Blueprint 파일은 최상위의 `render.yaml`입니다. 서비스가 **Docker / Free**인지 확인합니다. `Render Postgres`나 유료 디스크를 추가하지 않습니다.
5. `DATABASE_URL` 입력란에 2단계의 완성된 연결 주소를 붙여 넣습니다.
6. Blueprint를 생성/배포합니다. `Dockerfile`이 Node.js 24, Python 3, 필요한 패키지를 설치합니다. 별도 Build Command나 Start Command는 입력하지 않습니다.
7. 서비스가 **Live**가 되면 서비스 화면의 `https://….onrender.com` 주소를 엽니다. 이 주소가 부원에게 공유할 사이트 주소입니다.

`SETUP_TOKEN`은 Blueprint가 자동 생성합니다. 기본 사이트 주소도 Render의 `RENDER_EXTERNAL_URL`을 자동으로 읽습니다. 처음에는 `APP_ORIGIN`을 직접 입력하지 않아도 됩니다. [Blueprint 설정 문서](https://render.com/docs/blueprint-spec).

## 5. 첫 운영진 계정 만들기

기존 로컬 데이터를 가져올 계획이면 **계정을 만들기 전에 아래 ‘기존 데이터 이전’을 먼저 수행**하세요. 새로 시작한다면:

1. Render 서비스의 **Environment**에서 `SETUP_TOKEN` 값을 확인해 복사합니다.
2. 사이트 첫 화면의 **초기 설정 키**에 붙여 넣습니다.
3. 운영진 아이디·이름·새 비밀번호를 입력합니다. 비밀번호는 8~128자이며 기본값 `20000000`은 사용할 수 없습니다.
4. 계정을 만든 뒤 멤버·팀 관리에서 기존 엑셀 양식으로 등록합니다. 기본 공지는 자동으로 생성됩니다.
5. 일반 멤버 계정으로 첫 로그인·비밀번호 변경·예약을 확인합니다.

멤버 비밀번호를 잊었으면 **멤버·팀 관리 → 멤버 목록 → 재설정**을 이용합니다. 운영진 본인의 비밀번호로 확인한 뒤 임시 비밀번호를 저장하고 멤버에게 전달합니다. 기존 비밀번호는 조회할 수 없고, 새 임시 비밀번호는 저장 완료 창에서 보기·복사할 수 있습니다. 대상 멤버의 기존 로그인은 모두 해제되며 다음 로그인 시 변경이 필요합니다.

## 6. 배포 후 확인

- `https://사이트주소/api/status`를 열었을 때 `storage`가 `postgres`여야 합니다.
- 로그인·엑셀 등록·예약·공지 첨부파일을 확인합니다.
- Render에서 재시작한 뒤에도 예약·첨부파일이 유지되는지 확인합니다.
- 실제 Supabase 계정 연결, Docker 이미지 빌드, 공개 주소 동작은 사용자 계정으로 배포한 뒤 확인해야 합니다. 제공 전 검증은 로컬 SQLite와 PGlite PostgreSQL 엔진/프로토콜을 사용했습니다.

## 기존 로컬 데이터 이전 (선택)

ZIP에 기존 데이터는 들어 있지 않습니다. 기존 로컬 계정·팀·예약을 그대로 쓰려면 **Render 배포/최초 계정 생성 전에** 빈 Supabase 프로젝트로 가져옵니다. Node.js 24 이상이 필요합니다.

터미널에서 배포 폴더로 이동한 뒤:

```sh
npm ci --omit=dev
cp .env.example .env
```

`.env`를 텍스트 편집기로 열어 `DATABASE_URL`을 실제 Session pooler 연결 주소로 수정합니다. 파일은 비공개로 보관합니다. 아래 명령의 SQLite 경로는 이 컴퓨터에서 사용하던 앱의 경로입니다.

```sh
node transfer-data.mjs export local.backup.json "/Users/minjoonk/Documents/Codex/2026-09-18/new-chat-2/outputs/mooboong/data/mooboong.sqlite"
node --env-file=.env transfer-data.mjs import local.backup.json
```

완료되면 위 Render 배포를 진행하고 기존 계정으로 로그인합니다. 로그인 세션은 이전되지 않으므로 다시 로그인해야 합니다. 앱은 초기 운영진 화면 대신 로그인 화면을 표시합니다. 대상 DB에 계정·게시물 등이 이미 있으면 덮어쓰지 않고 중단합니다. 새 빈 Supabase 프로젝트를 사용하세요.

이 컴퓨터에서 `node`/`npm`을 찾지 못하면 Node.js 24 LTS를 설치하세요. 원본 사이트는 이전이 끝날 때까지 남겨 두세요. 이전한 순간 이후 로컬에서 바뀐 내용은 자동 동기화되지 않습니다.

## 백업·복구

배포 폴더의 비공개 `.env`에 DB 연결 주소가 있는 상태에서:

```sh
node --env-file=.env transfer-data.mjs export mooboong-2026-09-20.backup.json
```

파일 이름은 매번 다른 날짜로 지정하세요. 기존 백업 파일은 덮어쓰지 않습니다. 계정의 비밀번호 해시·연락처·예약·공지·첨부파일·위키를 함께 저장합니다. 사용자 비밀번호 원문은 들어 있지 않습니다. 백업은 개인정보가 포함되어 있으므로 GitHub나 공지에 올리지 마세요.

복구는 **새 빈 Supabase 프로젝트** 연결 주소로 `.env`를 바꾼 뒤:

```sh
node --env-file=.env transfer-data.mjs import mooboong-2026-09-20.backup.json
```

가져오기가 성공하면 Render의 `DATABASE_URL`을 새 프로젝트 주소로 수정하고 다시 배포합니다. 로그인과 최근 예약·첨부파일을 확인합니다. 자동 정기 백업은 포함되어 있지 않습니다. 로컬 SQLite 모드에서는 기존 `node backup.mjs`도 사용할 수 있습니다.

## 무료 요금제의 범위

- Render Free는 15분 동안 접속이 없으면 잠들고, 다음 접속 시 약 1분이 걸릴 수 있습니다. 월 사용 시간·대역폭·빌드 한도와 외부 DB 트래픽 제한도 있습니다. 무료 서비스에는 항상 켜짐이 보장되지 않습니다. [Render 무료 운영 조건](https://render.com/docs/free).
- Supabase Free는 DB 500MB이며 일주일간 비활성 상태이면 일시 중지됩니다. 이 앱은 **첨부파일과 노션 이미지까지 DB에 저장**하므로 모두 500MB를 사용합니다. 별도 Storage 1GB는 이 앱에서 사용하지 않습니다. [Supabase 요금제](https://supabase.com/pricing).
- 파일 업로드가 많아지면 용량을 확인하세요. 중지된 프로젝트는 Supabase 대시보드에서 복구하고 Render를 다시 시작합니다. 요금제·사용량은 각 서비스 대시보드에서 확인합니다.

## 오류가 나면

| 증상 | 확인할 것 |
|---|---|
| `DATABASE_URL이 없습니다` | Render Environment에 Session pooler 주소 입력 |
| 인증 실패 / `28P01` | DB 비밀번호, 사용자명 `postgres.PROJECT_REF`, 비밀번호 URL 인코딩 |
| 호스트 연결 실패 / `ENOTFOUND` | Connect에서 복사한 정확한 Session pooler 호스트 |
| 초기 설정 키 오류 | Render Environment의 `SETUP_TOKEN` 값 |
| 공개 주소에서 요청 거부 | 잘못 지정한 `APP_ORIGIN` 제거; 자체 도메인이라면 정확한 HTTPS 주소만 입력 |
| 인증서 오류 | 신뢰 가능한 DB CA 인증서가 필요한지 확인; 검증을 끄지 말고 Render Secret File에 인증서를 넣은 뒤 `PGSSLROOTCERT`로 경로 지정 |
| 이미 DB가 채워져 있어 이전 실패 | 대상이 새 빈 프로젝트인지 확인; 기존 데이터는 자동 삭제하지 않음 |
| 처음 접속할 때 느림 | 무료 Render가 잠들어 있었다면 약 1분 후 다시 확인 |

## 새 버전과 자체 도메인

코드를 GitHub에 다시 올린 뒤 Render 배포를 확인합니다. `.env`나 백업은 올리지 않습니다. 자체 도메인을 연결하면 Render의 Custom Domains 설정을 끝내고 `APP_ORIGIN=https://내도메인`을 추가합니다. 기본 onrender.com 주소만 사용하면 이 설정은 필요 없습니다.
