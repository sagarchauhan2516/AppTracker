@echo off
set PORT=3001
echo ========================================================
echo  Starting Vacancy Radar India Portal...
echo  Local URL: http://localhost:3001
echo ========================================================
start http://localhost:3001
"C:\Program Files\Magnet Forensics\Magnet AXIOM\AXIOM Process\.playwright\node\win32_x64\node.exe" server.js
