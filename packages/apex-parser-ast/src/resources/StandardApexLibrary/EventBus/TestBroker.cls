/**
 * Contains methods that simulate the successful delivery or failed publishing of platform event or change event messages in an Apex test.
 */
global class TestBroker {

  /**
   * Delivers platform event messages to the test event bus. Use this method to deliver test event messages multiple times and verify that event subscribers have processed the test events each step of the way.
   */
  public void deliver() {}

  public void fail() {}

}