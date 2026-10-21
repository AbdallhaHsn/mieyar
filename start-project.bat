@echo off
chcp 65001 > nul
title تشغيل نظام الربان المحاسبي - Al-Roban ERP
echo ==============================================================================
echo                 نظام الربان المحاسبي المتكامل (Al-Roban ERP)
echo                        سكربت التشغيل السريع
echo ==============================================================================
echo.
echo جاري بدء تشغيل البيئة والواجهة الخلفية والأمامية...
echo.

powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0scripts\start-all.ps1" %*

echo.
echo تم تنفيذ أمر التشغيل. اضغط أي مفتاح للإغلاق...
pause > nul
