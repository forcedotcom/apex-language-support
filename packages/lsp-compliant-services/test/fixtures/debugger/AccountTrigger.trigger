trigger AccountTrigger on Account (before insert) {
  for (Account account : Trigger.new) {
    account.Description = 'new';
  }
}
