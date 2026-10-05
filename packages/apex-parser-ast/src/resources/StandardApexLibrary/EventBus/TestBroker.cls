/**
 * Contains methods that simulate the successful delivery or failed publishing of platform event or change event messages in an Apex test.
 */
global class TestBroker {
    global TestBroker() { }

    /**
     * Delivers platform event messages to the test event bus. Use this method to deliver test event messages multiple times and verify that event subscribers have processed the test events each step of the way.
     * <p>Usage
     * Enclose Test.getEventBus().deliver() within the Test.startTest() and Test.stopTest() statement block.
     * Test.startTest();
     * // Create test events
     * // ...
     * // Publish test events with EventBus.publish()
     * // ...
     * // Deliver test events
     * Test.getEventBus().deliver();
     * // Perform validation
     * // ...
     * Test.stopTest();
     */
    global void deliver() { }

    global virtual Boolean equals(Object o) { return false; }

    /**
     * Causes the publishing of platform event messages to fail in the test event bus. Use this method to test Apex publish callbacks.
     * <p>Usage
     * // Create test events
     * // ...
     * // Publish test events with EventBus.publish()
     * // ...
     * // Fail publishing of test events
     * Test.getEventBus().fail();
     * // Perform validation
     * // ...
     *
     *
     * For more information, see <link>Get the Result of Asynchronous Platform Event Publishing with Apex Publish Callbacks<link/> in the Platform Events Developer Guide.
     */
    global void fail() { }

    global virtual Integer hashCode() { return 0; }

    global override virtual String toString() { return null; }
}