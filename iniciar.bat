@echo off
title Nexo Hidrico - CCO Server
echo Iniciando servidor local do Nexo Hidrico...
start "" http://127.0.0.1:4173
npx http-server -p 4173 -d false
pause
