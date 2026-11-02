#!/bin/sh
set -e

rm -f /tmp/ready

if [ -z "${APP_KEY:-}" ]; then
    APP_KEY="base64:$(head -c 32 /dev/urandom | base64)"
    export APP_KEY
fi

mkdir -p storage/app/private storage/framework/cache/data storage/framework/sessions storage/framework/views storage/logs
php artisan config:cache

if [ "${RUN_MIGRATIONS:-0}" = "1" ]; then
    php artisan migrate --force
fi

chown -R www-data:www-data storage bootstrap/cache
touch /tmp/ready

exec "$@"
