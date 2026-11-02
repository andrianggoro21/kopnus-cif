FROM composer:2 AS vendor
WORKDIR /app
COPY composer.json composer.lock ./
RUN composer install --no-dev --no-scripts --no-autoloader --prefer-dist --no-interaction
COPY . .
RUN composer dump-autoload --optimize --no-dev

FROM php:8.4-fpm-alpine AS app
RUN docker-php-ext-install pdo_mysql
COPY docker/php.ini $PHP_INI_DIR/conf.d/app.ini
COPY docker/entrypoint.sh /usr/local/bin/entrypoint
RUN chmod +x /usr/local/bin/entrypoint
WORKDIR /var/www/html
COPY --chown=www-data:www-data . .
COPY --from=vendor --chown=www-data:www-data /app/vendor vendor
ENTRYPOINT ["entrypoint"]
CMD ["php-fpm"]

FROM app AS test
RUN apk add --no-cache unzip libpng-dev libjpeg-turbo-dev \
    && docker-php-ext-configure gd --with-jpeg \
    && docker-php-ext-install gd
COPY --from=composer:2 /usr/bin/composer /usr/bin/composer
RUN composer install --prefer-dist --no-interaction \
    && cp .env.example .env \
    && php artisan key:generate
ENTRYPOINT []
CMD ["php", "artisan", "test"]
