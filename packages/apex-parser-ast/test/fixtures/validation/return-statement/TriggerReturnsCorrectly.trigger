trigger TriggerReturnsCorrectly on Account (before insert) {
    Account a = new Account();
    insert a;
}
