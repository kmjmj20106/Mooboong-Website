# 무붕 공간 공개 배포 안내

현재 버전은 Node.js 24 + Python 3 + SQLite로 작동합니다. 가장 간단한 경로는 **Render의 Docker Web Service 한 개 + 영구 디스크**입니다. 구글 캘린더나 별도 데이터베이스 서비스가 필요하지 않습니다. 무료 임시 파일 시스템에 SQLite를 두면 재배포 때 데이터가 사라질 수 있으므로 영구 디스크를 붙이는 유료 구성이 필요합니다. 실제 비용은 서비스 생성 화면에서 확인하세요.

## 1. 코드 준비

`mooboong` 폴더를 비공개 GitHub 저장소에 올립니다. `data/`, `backups/`, `.env`, 실제 계정·전화번호·백업 파일은 올리지 않습니다. 배포 ZIP에는 실제 데이터가 포함되지 않습니다. GitHub에 프로젝트 상위 폴더를 올린 경우 Render Root Directory를 `outputs/mooboong`으로 지정하고, 이 폴더 내용만 올렸다면 비워 둡니다.

## 2. Render 서비스 생성

1. Render에서 New → Web Service → 해당 저장소를 연결합니다.
2. Runtime을 Docker로 선택합니다. 저장소의 Dockerfile이 Node와 Python을 설치합니다.
3. 영구 디스크를 지원하는 인스턴스 플랜을 고릅니다. 인스턴스 수는 **1개**로 유지합니다.
4. Disk를 추가하고 Mount Path를 `/var/data`로 지정합니다. 크기는 공지 첨부와 위키 이미지 사용량을 고려해 선택합니다.
5. 아래 환경변수를 설정합니다. Render의 실제 서비스 주소를 확인한 후 `APP_ORIGIN`을 정확하게 입력합니다.

| 변수 | 값 |
| --- | --- |
| `APP_ORIGIN` | `https://실제서비스이름.onrender.com` (경로 없이) |
| `HOST` | `0.0.0.0` (Docker 기본값) |
| `PORT` | `10000` (Docker 기본값) |
| `DATA_DIR` | `/var/data` (디스크 경로와 동일) |
| `PYTHON_BIN` | `python3` (Docker 기본값) |
| `SETUP_TOKEN` | 최초 설정을 보호할 충분히 긴 무작위 비밀값 |

`SETUP_TOKEN`은 Render의 비밀 환경변수에만 넣습니다. 로컬에서 `node -e "console.log(require('node:crypto').randomBytes(32).toString('hex'))"`로 생성할 수 있습니다. Health Check Path는 `/api/status`입니다. 배포 로그에서 디스크 쓰기 권한 오류가 발생하면 디스크가 컨테이너 사용자 `node`(UID 1000)에게 쓰기 가능한지 확인합니다. 앱은 데이터 경로에 쓰지 못하면 시작을 중단합니다.

6. 배포 후 HTTPS 주소를 열고 초기 설정 키를 입력해 운영진 계정을 만듭니다. 기존 DB를 이전했다면 기존 계정으로 로그인합니다.
7. 새 관리자 계정 생성이 끝나면 `SETUP_TOKEN`을 삭제해도 됩니다. 계정이 하나라도 있으면 최초 설정은 다시 열리지 않습니다.
8. 다른 기기에서 로그인, 임시 예약/취소, XLSX 검토, 첨부 다운로드를 확인합니다. 재배포 뒤에도 데이터가 남는지 확인한 뒤 부원들에게 주소를 공유합니다.

커스텀 도메인은 Render에 도메인을 연결하고 인증서 발급을 확인한 다음 `APP_ORIGIN`도 해당 HTTPS 주소로 바꿉니다. 이전 주소에서의 로그인·저장은 거부되므로 부원에게 새 주소를 안내하세요.

## 3. 현재 로컬 데이터 이전 (필요할 때만)

코드만 배포하면 빈 서비스로 시작합니다. 현재 계정·팀·예약까지 옮기려면 로컬에서 `node backup.mjs`를 실행한 뒤 생성된 검증 백업을 서버에 안전하게 전송합니다. 서버를 정지한 상태에서 `/var/data/mooboong.sqlite`로 배치하고 사용자 `node`의 읽기·쓰기 권한을 확인한 후 시작하세요. 실행 중인 DB 파일 위에 덮어쓰지 않습니다. 이전 DB가 있다면 먼저 별도 백업하고, 서버가 완전히 멈춘 뒤 기존 WAL/SHM 파일까지 별도 위치로 옮겨 복구 DB와 섞이지 않도록 합니다. 실제 데이터 전송·공개 배포는 아직 수행하지 않았습니다.

## 4. 백업과 복구

- 실행 중에도 `node backup.mjs /var/data/backups/원하는이름.sqlite`로 일관된 백업을 만들 수 있습니다. 기존 파일을 덮어쓰지 않고 무결성 검사를 합니다.
- 디스크 안의 백업만으로는 서비스 삭제나 계정 사고를 대비할 수 없습니다. 정기적으로 백업을 운영진 전용의 별도 저장소에 내려받으세요. 자동 외부 백업은 이 버전에 연결하지 않았습니다.
- 백업에는 계정·전화번호·예약·공지·위키와 첨부파일이 모두 들어 있습니다. 공개 저장소나 일반부원 공유 폴더에 두지 않습니다.
- 복구는 서비스를 정지하고 현재 DB를 따로 보관한 뒤 검증 백업을 `mooboong.sqlite`로 배치하고 재시작합니다. 복구 후 운영진 로그인, 팀 목록, 공지 첨부를 확인합니다.
- 서버를 여러 대로 늘리려면 SQLite 구조를 공유 DB(PostgreSQL 등)로 바꾸는 작업이 필요합니다.

## 공식 안내

- [Render Web Service 배포](https://render.com/docs/deploy-node-express-app)
- [Render 영구 디스크의 조건과 제한](https://render.com/docs/disks)
- [노션 HTML 내보내기](https://www.notion.com/help/export-your-content)

Docker 이미지 자체의 클라우드 빌드 및 Render 실제 배포는 아직 확인하지 않았습니다. 로컬 Node/Python 실행과 데이터 백업은 검증 대상으로 포함했습니다.
