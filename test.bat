@echo off
rem Обёртка для запуска PHPUnit через PHP 8.1 из ОСПанель.
rem Использование: test.bat [любой аргумент phpunit, например --filter SeedGraphTest]
C:\OSPanel\modules\php\PHP_8.1\php.exe vendor/phpunit/phpunit/phpunit --configuration phpunit.xml %*
