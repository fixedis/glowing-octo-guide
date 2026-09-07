<?php

declare(strict_types=1);

// tests/CoreEngine/KernelTest.php

namespace Project\Tests\CoreEngine;

use PHPUnit\Framework\TestCase;
use Project\CoreEngine\Contracts\CommandHandlerInterface;
use Project\CoreEngine\Contracts\EventHandlerInterface;
use Project\CoreEngine\Contracts\StateInterface;
use Project\CoreEngine\Contracts\TickSystemInterface;
use Project\CoreEngine\Core\Command;
use Project\CoreEngine\Core\CommandBus;
use Project\CoreEngine\Core\CommandResult;
use Project\CoreEngine\Core\DeterministicRandom;
use Project\CoreEngine\Core\EngineRegistry;
use Project\CoreEngine\Core\Event;
use Project\CoreEngine\Core\EventBus;
use Project\CoreEngine\Core\InMemorySnapshotStore;
use Project\CoreEngine\Core\Kernel;
use Project\CoreEngine\Core\Logging\NullLogger;
use Project\CoreEngine\Core\SnapshotManager;
use Project\CoreEngine\Core\State;
use Project\CoreEngine\Core\SystemPipeline;
use Project\CoreEngine\Core\TickContext;

final class KernelTest extends TestCase
{
    public function testRunTickExecutesCommandsAndPublishesEvents(): void
    {
        $logger = new NullLogger();
        $state = new State();
        $eventBus = new EventBus($logger);
        $commandBus = new CommandBus($eventBus, $logger);
        $engineRegistry = new EngineRegistry($logger);
        $systemPipeline = new SystemPipeline($logger);
        $random = new DeterministicRandom($logger, 'kernel-test-seed');
        $snapshotStore = new InMemorySnapshotStore();
        $snapshotManager = new SnapshotManager($snapshotStore, $logger);

        $kernel = new Kernel(
            $state,
            $commandBus,
            $eventBus,
            $engineRegistry,
            $systemPipeline,
            $random,
            $snapshotManager,
            $logger
        );

        $commandBus->register('Increment', new class implements CommandHandlerInterface {
            public function handle(Command $command, StateInterface $state): CommandResult
            {
                $current = (int) $state->get('counter', 0);
                $amount = (int) ($command->payload['amount'] ?? 1);
                $next = $current + $amount;

                $state->set('counter', $next);

                return CommandResult::ok([
                    new Event(
                        'counter_incremented_test',
                        'CounterIncremented',
                        [
                            'value' => $next,
                        ],
                        (int) $state->get('tick', 0)
                    ),
                ]);
            }
        });

        $collector = new class implements EventHandlerInterface {
            /**
             * @var list<Event>
             */
            public array $events = [];

            public function handle(Event $event): void
            {
                $this->events[] = $event;
            }
        };

        $eventBus->subscribe('CounterIncremented', $collector);

        $kernel->boot();
        $kernel->addCommand(new Command('cmd_1', 'Increment', ['amount' => 5]));

        $snapshot = $kernel->runTick();

        self::assertSame(5, $state->get('counter'));
        self::assertSame(1, $snapshot->tick);
        self::assertCount(1, $collector->events);
        self::assertSame('CounterIncremented', $collector->events[0]->type);
        self::assertSame(5, $collector->events[0]->payload['value']);
        self::assertSame(1, $collector->events[0]->tick);
    }

    public function testUnknownCommandIsRejected(): void
    {
        $logger = new NullLogger();
        $state = new State();
        $eventBus = new EventBus($logger);
        $commandBus = new CommandBus($eventBus, $logger);
        $engineRegistry = new EngineRegistry($logger);
        $systemPipeline = new SystemPipeline($logger);
        $random = new DeterministicRandom($logger, 'kernel-test-seed');
        $snapshotStore = new InMemorySnapshotStore();
        $snapshotManager = new SnapshotManager($snapshotStore, $logger);

        $kernel = new Kernel(
            $state,
            $commandBus,
            $eventBus,
            $engineRegistry,
            $systemPipeline,
            $random,
            $snapshotManager,
            $logger
        );

        $collector = new class implements EventHandlerInterface {
            /**
             * @var list<Event>
             */
            public array $events = [];

            public function handle(Event $event): void
            {
                $this->events[] = $event;
            }
        };

        $eventBus->subscribe('CommandRejected', $collector);

        $kernel->boot();
        $kernel->addCommand(new Command('cmd_unknown', 'DoesNotExist', []));

        $kernel->runTick();

        self::assertCount(1, $collector->events);
        self::assertSame('CommandRejected', $collector->events[0]->type);
        self::assertSame('cmd_unknown', $collector->events[0]->payload['command_id']);
        self::assertSame('DoesNotExist', $collector->events[0]->payload['command_type']);
    }

    public function testTickSystemsAreExecuted(): void
    {
        $logger = new NullLogger();
        $state = new State();
        $eventBus = new EventBus($logger);
        $commandBus = new CommandBus($eventBus, $logger);
        $engineRegistry = new EngineRegistry($logger);
        $systemPipeline = new SystemPipeline($logger);
        $random = new DeterministicRandom($logger, 'kernel-test-seed');
        $snapshotStore = new InMemorySnapshotStore();
        $snapshotManager = new SnapshotManager($snapshotStore, $logger);

        $kernel = new Kernel(
            $state,
            $commandBus,
            $eventBus,
            $engineRegistry,
            $systemPipeline,
            $random,
            $snapshotManager,
            $logger
        );

        $systemPipeline->add(new class implements TickSystemInterface {
            public function name(): string
            {
                return 'TestSystem';
            }

            public function update(TickContext $context): void
            {
                $context->state->set('system_executed', true);
                $context->state->set(
                    'random_sample',
                    $context->random->nextInt(1, 100, 'test-system')
                );

                $context->eventBus->publish(new Event(
                    'system_executed_test',
                    'SystemExecuted',
                    [
                        'tick' => $context->tick,
                    ],
                    $context->tick
                ));
            }
        });

        $collector = new class implements EventHandlerInterface {
            /**
             * @var list<Event>
             */
            public array $events = [];

            public function handle(Event $event): void
            {
                $this->events[] = $event;
            }
        };

        $eventBus->subscribe('SystemExecuted', $collector);

        $kernel->boot();
        $snapshot = $kernel->runTick();

        self::assertTrue(true === $state->get('system_executed'));
        self::assertCount(1, $collector->events);
        self::assertSame('SystemExecuted', $collector->events[0]->type);
        self::assertSame(1, $collector->events[0]->tick);
        self::assertSame(1, $snapshot->tick);

        $randomSample = (int) $state->get('random_sample');

        self::assertGreaterThanOrEqual(1, $randomSample);
        self::assertLessThanOrEqual(100, $randomSample);
    }
}
