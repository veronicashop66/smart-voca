# 2026-11-25 - smart-voca - 컨테이너 이미지 (Node 24 내장 SQLite 사용, 외부 패키지 없음)
# 파일 위치: Dockerfile
# 기준: ai-agent/uploads/04_Dockerfile 프롬프트.md 공통 조건 1~9

# 조건 1: 공식 이미지, 버전 태그 고정, slim 계열 (latest 금지)
FROM node:24.11.0-slim

# 조건 2: 0.0.0.0:8080 에서 듣는다
# 조건 5: DB 경로는 DB_PATH 환경변수를 따른다
# 조건 6: 의존성이 없으므로 빌드 때 설치할 것이 없다 (npm install 없음)
ENV NODE_ENV=production \
    HOST=0.0.0.0 \
    PORT=8080 \
    DB_PATH=/data/voca.db

WORKDIR /app

# 조건 4: UID 10001 사용자 생성 (빌드 단계에서만 root). 조건 5: /data 소유자를 10001로 지정
RUN groupadd --gid 10001 voca \
 && useradd --uid 10001 --gid 10001 --no-create-home --shell /usr/sbin/nologin voca \
 && mkdir -p /data \
 && chown 10001:10001 /data

COPY app/ ./

EXPOSE 8080

# 조건 4: 마지막에 비root 사용자로 실행 (cap-drop ALL은 서버 실행 옵션으로 지정된다)
USER 10001:10001

# 조건 8: 운영용 실행, JSON 배열 형식
CMD ["node", "server.js"]
