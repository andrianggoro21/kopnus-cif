#!/bin/sh
URL="http://localhost:${WEB_PORT:-8080}"

echo "=================================================="
echo " CIF Customer Information Checking siap"
echo " Aplikasi (frontend) : ${URL}"
echo " API (backend)       : ${URL}/api"
echo " Contoh              : POST ${URL}/api/cif/check"
echo "=================================================="
