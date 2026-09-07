<?php

declare(strict_types=1);

// src/Engines/NaniteEngine/Contracts/NaniteEntityInterface.php
//
// ДОМЕН-НЕЗАВИСИМЫЙ КОНТРАКТ ПРЕДСТАВИМОГО ТЕЛА.
//
// «Нанит-ядро» не знает предметной области: звезда это, планета или
// галактический чанк — для бюджета детализации важны только три числа:
//   - screenPx  — во сколько пикселей проецируется тело на этом кадре
//   - baseRadius — эталонный радиус тела (мировые единицы, любая шкала)
//   - entityId  — стабильный идентификатор для кэша/сигнатуры
//
// Любой движок может реализовать этот интерфейс и отдать тела в NaniteEngine
// через команду EvaluateNaniteFrame — без правки ядра нанитов.

namespace Project\Engines\NaniteEngine\Contracts;

interface NaniteEntityInterface
{
    public function naniteEntityId(): string;

    /**
     * Текущий экранный размер тела в пикселях (>= 0).
     * Это «единственная валюта детализации» в нанит-философии.
     */
    public function naniteScreenPx(): int;

    /**
     * Эталонный радиус тела в мировых единицах (для нормализации порогов
     * и масштабирования представлений). Должен быть > 0.
     */
    public function naniteBaseRadius(): int;
}
