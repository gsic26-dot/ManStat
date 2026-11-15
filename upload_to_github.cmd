@echo off
chcp 65001 >nul
echo ========================================================
echo   UPLOADING MANSTAT MODERN TO GITHUB (gsic26-dot/ManStat)
echo ========================================================
cd /d "D:\ManStat-Modern"
git add -A
git commit -m "feat: complete ground-truth 15-sheet migration to supabase and vercel"
git branch -M main
git push origin main
echo.
echo ========================================================
echo   UPLOAD COMPLETED! VERCEL WILL AUTO-DEPLOY NOW!
echo ========================================================
pause
