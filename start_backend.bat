@echo off
title SFMIS Backend (NestJS port 3000)
cd /d D:\laragon\www\sfmisystem\backend
echo === Installing backend dependencies (if needed) ===
if not exist node_modules (
  call npm install
)
echo === Starting NestJS dev server ===
call npm run start:dev
pause
