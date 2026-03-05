public class SafeNavGetSObjectTypeInvalid {
    public void test(Account acc) {
        Schema.SObjectType t = acc?.Name?.getSObjectType();
    }
}
