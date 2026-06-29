#!/usr/bin/env bash
# ──────────────────────────────────────────────────────────────────────────────
# สำรองฐานข้อมูล sfmisystem (MariaDB ภายนอก) → gzip + หมุนเวียนเก็บย้อนหลัง
#
# อ่านค่าการเชื่อมต่อจาก .env.production (DB_HOST/DB_PORT/DB_USER/DB_PASS/DB_NAME)
# ใช้ client บน host (mariadb-dump/mysqldump) ถ้ามี ไม่งั้น fallback เป็น docker image
#
# รันมือ:   bash backup-db.sh
# cron (ทุกวัน 02:00):
#   0 2 * * * /DATA/AppData/www/sfmisystem/backup-db.sh >> /DATA/AppData/www/sfmisystem/backups/backup.log 2>&1
#
# ปรับได้ผ่าน env: RETENTION_DAYS (ค่าเริ่ม 14), MARIADB_IMAGE (ค่าเริ่ม mariadb:11)
# ──────────────────────────────────────────────────────────────────────────────
set -euo pipefail

APP_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ENV_FILE="$APP_DIR/.env.production"
BACKUP_DIR="$APP_DIR/backups"
RETENTION_DAYS="${RETENTION_DAYS:-14}"
DOCKER_IMG="${MARIADB_IMAGE:-mariadb:11}"

log() { echo "[$(date '+%F %T')] $*"; }

[ -f "$ENV_FILE" ] || { log "❌ ไม่พบ $ENV_FILE"; exit 1; }
set -a; . "$ENV_FILE"; set +a
: "${DB_HOST:?DB_HOST ไม่ถูกตั้งใน .env.production}"
: "${DB_USER:?DB_USER ไม่ถูกตั้ง}"
: "${DB_PASS:?DB_PASS ไม่ถูกตั้ง}"
: "${DB_NAME:?DB_NAME ไม่ถูกตั้ง}"
DB_PORT="${DB_PORT:-3306}"

mkdir -p "$BACKUP_DIR"
TS="$(date +%Y%m%d_%H%M%S)"
OUT="$BACKUP_DIR/${DB_NAME}_${TS}.sql.gz"
TMP="${OUT}.tmp"
trap 'rm -f "$TMP"' EXIT

DUMP_ARGS="--single-transaction --no-tablespaces --skip-lock-tables --default-character-set=utf8mb4 --routines --events"

log "เริ่ม backup ${DB_NAME} @ ${DB_HOST}:${DB_PORT} → $(basename "$OUT")"
export MYSQL_PWD="$DB_PASS"   # ส่งรหัสผ่านผ่าน env ไม่โผล่ใน process list

if command -v mariadb-dump >/dev/null 2>&1; then
  # shellcheck disable=SC2086
  mariadb-dump -h "$DB_HOST" -P "$DB_PORT" -u "$DB_USER" $DUMP_ARGS "$DB_NAME" | gzip > "$TMP"
elif command -v mysqldump >/dev/null 2>&1; then
  # shellcheck disable=SC2086
  mysqldump  -h "$DB_HOST" -P "$DB_PORT" -u "$DB_USER" $DUMP_ARGS "$DB_NAME" | gzip > "$TMP"
else
  # ใช้ network เดียวกับ backend container — default bridge วิ่งไป DB ภายนอกไม่ถึง
  # และสิทธิ์ DB ถูก grant ตาม IP ของ network นั้น (172.17.0.%)
  BACKEND_CT="${BACKEND_CONTAINER:-sfmisystem-backend-1}"
  NET="$(docker inspect -f '{{range $k,$_ := .NetworkSettings.Networks}}{{$k}} {{end}}' "$BACKEND_CT" 2>/dev/null | awk '{print $1}')"
  NETOPT=""; [ -n "$NET" ] && NETOPT="--network $NET"
  log "ไม่พบ client บน host — ใช้ docker ($DOCKER_IMG) network=${NET:-default}"
  # MariaDB 11 เปลี่ยนชื่อ mysqldump → mariadb-dump; เลือกตัวที่มีอัตโนมัติ
  # shellcheck disable=SC2086
  timeout 600 docker run --rm $NETOPT -e MYSQL_PWD "$DOCKER_IMG" sh -c \
    "exec \"\$(command -v mariadb-dump || command -v mysqldump)\" -h '$DB_HOST' -P '$DB_PORT' -u '$DB_USER' $DUMP_ARGS '$DB_NAME'" \
    | gzip > "$TMP"
fi

# ตรวจไฟล์ไม่ว่าง + ไม่เสีย
[ -s "$TMP" ] || { log "❌ backup ว่างเปล่า"; exit 1; }
gzip -t "$TMP" || { log "❌ ไฟล์ gzip เสีย"; exit 1; }

mv "$TMP" "$OUT"
trap - EXIT
log "✓ สำเร็จ ($(du -h "$OUT" | cut -f1))"

# หมุนเวียน: ลบไฟล์เก่ากว่า RETENTION_DAYS วัน
DELETED="$(find "$BACKUP_DIR" -maxdepth 1 -name "${DB_NAME}_*.sql.gz" -mtime +"$RETENTION_DAYS" -print -delete | wc -l)"
log "ลบ backup เก่ากว่า ${RETENTION_DAYS} วัน: ${DELETED} ไฟล์ | คงเหลือ $(find "$BACKUP_DIR" -maxdepth 1 -name "${DB_NAME}_*.sql.gz" | wc -l) ไฟล์"
