#!/usr/bin/env bash
# ──────────────────────────────────────────────────────────────────────────────
# Deploy SFMIS บน Linux server
#   path : /DATA/AppData/www/sfmisystem
#   DB   : MariaDB ภายนอก 192.168.1.4:3306 (database: sfmisystem)
#
# วิธีใช้ (บนเซิร์ฟเวอร์):
#   cd /DATA/AppData/www/sfmisystem
#   cp .env.production.example .env.production   # ครั้งแรก: เติม DB_USER/DB_PASS ให้ครบ
#   bash deploy-production.sh
# ──────────────────────────────────────────────────────────────────────────────
set -euo pipefail

APP_DIR="/DATA/AppData/www/sfmisystem"
COMPOSE_FILE="docker-compose.production.yml"
ENV_FILE=".env.production"

cd "$APP_DIR"

# 1) ตรวจไฟล์ env ---------------------------------------------------------------
if [[ ! -f "$ENV_FILE" ]]; then
  echo "❌ ไม่พบ $ENV_FILE — สร้างจาก template ก่อน: cp .env.production.example .env.production"
  exit 1
fi
# โหลดค่ามาใช้ในสคริปต์ (DB_*)
set -a; source "$ENV_FILE"; set +a

if [[ "${DB_USER:-}" == "CHANGE_ME_DB_USER" || -z "${DB_USER:-}" || "${DB_PASS:-}" == "CHANGE_ME_DB_PASSWORD" || -z "${DB_PASS:-}" ]]; then
  echo "❌ ยังไม่ได้ตั้ง DB_USER / DB_PASS ใน $ENV_FILE"
  exit 1
fi

# 2) สร้าง database ถ้ายังไม่มี (ต้องมี mysql client บน host; ข้ามได้ถ้าสร้างผ่าน phpMyAdmin แล้ว)
if command -v mysql >/dev/null 2>&1; then
  echo "▶ ensuring database '${DB_NAME}' exists on ${DB_HOST}:${DB_PORT} ..."
  mysql -h "$DB_HOST" -P "$DB_PORT" -u "$DB_USER" -p"$DB_PASS" \
    -e "CREATE DATABASE IF NOT EXISTS \`${DB_NAME}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;" \
    && echo "  ✓ database พร้อม" || echo "  ⚠ สร้าง database ไม่สำเร็จ — ตรวจสิทธิ์ผู้ใช้ หรือสร้างเองผ่าน phpMyAdmin"
else
  echo "ℹ ไม่มี mysql client บน host — ถ้ายังไม่มี database '${DB_NAME}' ให้สร้างผ่าน phpMyAdmin ก่อน"
fi

# 3) build + start --------------------------------------------------------------
echo "▶ building & starting containers ..."
docker compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" up -d --build

# 4) รอ backend healthy แล้วรัน migration ---------------------------------------
echo "▶ waiting for backend ..."
for i in $(seq 1 30); do
  if docker compose -f "$COMPOSE_FILE" exec -T backend wget -qO- http://localhost:3000/api/health >/dev/null 2>&1; then
    echo "  ✓ backend up"
    break
  fi
  sleep 2
done

echo "▶ running database migrations ..."
docker compose -f "$COMPOSE_FILE" exec -T backend npm run migration:run:prod

# 5) (ครั้งแรกเท่านั้น) seed ข้อมูลเริ่มต้น + แอดมิน
#    ยกเลิกคอมเมนต์บรรทัดล่างเมื่อต้องการ seed (admin_local / Admin@123)
# docker compose -f "$COMPOSE_FILE" exec -T backend node dist/seeds.js

echo ""
echo "✅ Deploy เสร็จ"
echo "   Frontend : ${NEXTAUTH_URL}"
echo "   API      : ${NEXT_PUBLIC_API_URL}"
echo "   ดู log   : docker compose -f $COMPOSE_FILE logs -f"
