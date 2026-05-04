@echo off
title SFMIS Frontend (Next.js port 3001)
cd /d D:\laragon\www\sfmisystem\frontend
echo === Installing frontend dependencies (if needed) ===
if not exist node_modules (
  call npm install
)
echo === Starting Next.js dev server ===
call npm run dev
pause
