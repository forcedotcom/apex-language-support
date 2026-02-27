trigger FooTrigger on Account (before insert) {
    @InvocableMethod
    public static void bar() {}
}
