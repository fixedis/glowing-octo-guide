<?php

declare(strict_types=1);

// tests/CoreEngine/EngineRegistrationTest.php

namespace Project\Tests\CoreEngine;

use InvalidArgumentException;
use PHPUnit\Framework\TestCase;
use Project\CoreEngine\Contracts\CommandHandlerInterface;
use Project\CoreEngine\Contracts\EventHandlerInterface;
use Project\CoreEngine\Contracts\StateInterface;
use Project\CoreEngine\Contracts\TickSystemInterface;
use Project\CoreEngine\Core\Command;
use Project\CoreEngine\Core\CommandBus;
use Project\CoreEngine\Core\CommandResult;
use Project\CoreEngine\Core\DeterministicRandom;
use Project\CoreEngine\Core\EngineRegistration;
use Project\CoreEngine\Core\Event;
use Project\CoreEngine\Core\EventBus;
use Project\CoreEngine\Core\Logging\NullLogger;
use Project\CoreEngine\Core\State;
use Project\CoreEngine\Core\SystemPipeline;
use Project\CoreEngine\Core\TickContext;

final class EngineRegistrationTest extends TestCase
{
    private State $state;
    private EventBus $eventBus;
    private CommandBus $commandBus;
    private SystemPipeline $systemPipeline;
    private NullLogger $logger;
    private DeterministicRandom $random;
    private EngineRegistration $registration;

    protected function setUp(): void
    {
        $this->logger = new NullLogger();
        $this->state = new State();
        $this->eventBus = new EventBus($this->logger);
        $this->commandBus = new CommandBus($this->eventBus, $this->logger);
        $this->systemPipeline = new SystemPipeline($this->logger);
        $this->random = new DeterministicRandom($this->logger, 'engine-registration-test-seed');

        $this->registration = new EngineRegistration(
            'test-engine',
            $this->commandBus,
            $this->eventBus,
            $this->systemPipeline,
            $this->logger
        );
    }

    public function testRegistersCommandHandler(): void
    {
        $this->registration->commandHandler('TestCommand', new class implements CommandHandlerInterface {
            public function handle(Command $command, StateInterface $state): CommandResult
            {
                $state->set('test_command_handled', true);

                return CommandResult::ok();
            }
        });

        self::assertSame(['TestCommand'], $this->registration->registeredCommandTypes());

        $result = $this->commandBus->dispatch(
            new Command('cmd_test', 'TestCommand'),
            $this->state
        );

        self::assertTrue($result->success);
        self::assertTrue(true === $this->state->get('test_command_handled'));
    }

    public function testRegistersEventHandler(): void
    {
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

        $this->registration->eventHandler('TestEvent', $collector);

        self::assertSame(['TestEvent'], $this->registration->registeredEventTypes());

        $this->eventBus->publish(new Event(
            'evt_test',
            'TestEvent',
            [],
            1
        ));

        self::assertCount(1, $collector->events);
        self::assertSame('TestEvent', $collector->events[0]->type);
    }

    public function testRegistersTickSystem(): void
    {
        $this->registration->system(new class implements TickSystemInterface {
            public function name(): string
            {
                return 'TestSystem';
            }

            public function update(TickContext $context): void
            {
                $context->state->set('test_system_executed', true);
            }
        });

        self::assertSame(['TestSystem'], $this->registration->registeredSystemNames());

        $this->systemPipeline->run(new TickContext(
            1,
            $this->state,
            $this->eventBus,
            $this->random,
            $this->logger
        ));

        self::assertTrue(true === $this->state->get('test_system_executed'));
    }

    public function testThrowsExceptionForEmptyCommandType(): void
    {
        $this->expectException(InvalidArgumentException::class);

        $this->registration->commandHandler('   ', new class implements CommandHandlerInterface {
            public function handle(Command $command, StateInterface $state): CommandResult
            {
                return CommandResult::ok();
            }
        });
    }
}
