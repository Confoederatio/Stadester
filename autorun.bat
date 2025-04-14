@echo off
:loop
cls
node --max-old-space-size=8192 --expose-gc --trace-uncaught "main.js"
pause
goto loop
