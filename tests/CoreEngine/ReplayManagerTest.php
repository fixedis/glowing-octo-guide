<?php

declare(strict_types=1);

// tests/CoreEngine/ReplayManagerTest.php

namespace Project\Tests\CoreEngine;

use PHPUnit\Framework\TestCase;
use Project\CoreEngine\Core\Command;
use Project\CoreEngine\Core\CoreEngineBootstrap;
use Project\CoreEngine\Core\Logging\NullLogger;
use Project\CoreEngine\Core\ReplayManager;

final class ReplayManagerTest extends TestCase
{
    private string $file;

    protected function setUp(): void
    {
        $this->file = sys_get_temp_dir() . '/replay_' . bin2hex(random_bytes(8)) . '.jsonl';
    }

    protected function tearDown(): void
    {
        if (is_file($this->file)) {
            unlink($this->file);
        }
    }

    private function kernel(): ReplayManager
    {
        $bootstrap = new CoreEngineBootstrap(new NullLogger());
        $runtime = $bootstrap->createRuntime(__DIR__ . '/../../src/Engines', 'replay-seed');

        return new ReplayManager($runtime->kernel, $this->file);
    }

    private function command(int $n): Command
    {
        return new Command(
            'cmd_' . $n,
            'GenerateGalaxyChunk',
            ['universeSeed' => 1, 'chunkX' => $n, 'chunkY' => 0, 'chunkZ' => 0]
        );
    }

    public function testRecordThenReplayIsDeterministic(): void
    {
        // Запись 5 тиков с командами.
        $record = $this->kernel();
        $record->startRecording();

        for ($i = 1; $i <= 5; $i++) {
            $record->enqueue($this->command($i));
            $record->step();
        }

        $record->stopRecording();

        self::assertFileExists($this->file);

        // Воспроизведение на СВЕЖЕМ ядре (replay требует чистого состояния).
        $replay = $this->kernel();
        $divergences = $replay->replay();

        self::assertSame([], $divergences, 'Replay должен совпадать с записью (детерминизм).');
    }

    public function testReplayAfterFreshBootMatches(): void
    {
        // Запись.
        $record = $this->kernel();
        $record->startRecording();

        for ($i = 1; $i <= 5; $i++) {
            $record->enqueue($this->command($i));
            $record->step();
        }
        $record->stopRecording();

        // Новый рантайм (свежий Kernel) — replay должен дать те же хэши.
        $replay = $this->kernel();
        $divergences = $replay->replay();

        self::assertSame([], $divergences, 'Replay после перезапуска ядра должен совпадать.');
    }

    public function testReplayDetectsHashDivergence(): void
    {
        // Записываем сессию.
        $record = $this->kernel();
        $record->startRecording();
        $record->enqueue($this->command(1));
        $record->step();
        $record->stopRecording();

        // Портмим файл: меняем хэш последней записи → replay должен заметить.
        $lines = file($this->file, FILE_IGNORE_NEW_LINES);
        $last = json_decode(end($lines), true);
        $last['hash'] = 'tampered_hash';
        $lines[count($lines) - 1] = json_encode($last);
        file_put_contents($this->file, implode("\n", $lines) . "\n");

        $replay = $this->kernel();
        $divergences = $replay->replay();

        self::assertNotEmpty($divergences);
        self::assertStringContainsString('Hash divergence at tick 1', $divergences[0]);
    }

    public function testEmptyReplayThrows(): void
    {
        $replay = $this->kernel();

        $this->expectException(\RuntimeException::class);
        $replay->replay();
    }
}
