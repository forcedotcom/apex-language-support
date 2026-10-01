trigger LegacyTrigger on Account (before insert) {
  Integer count = 0;

  class InnerClass {
    void run() {
      System.debug('inner');
    }
  }

  for (Account account : Trigger.new) {
    System.debug(account);
  }
}
