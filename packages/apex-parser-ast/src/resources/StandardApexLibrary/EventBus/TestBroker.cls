/**
 * Contains methods that simulate the successful delivery or failed publishing of platform event or change event messages in an Apex test.
 */
global class TestBroker {

  global TestBroker() {}

  /**
   * Delivers platform event messages to the test event bus. Use this method to deliver test event messages multiple times and verify that event subscribers have processed the test events each step of the way.
   */
  global void deliver() {}

  global void fail() {}

  global Object clone() {}

}