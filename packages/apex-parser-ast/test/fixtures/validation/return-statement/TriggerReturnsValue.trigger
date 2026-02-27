trigger TriggerReturnsValue on Account (before insert) {
    return 'test';
}
