public class InvalidSObjectList {
    public void testInvalidSObjectList() {
        // Error: Cannot create List<SObject> - must use concrete SObject type
        List<SObject> invalidList = new List<SObject>();
    }
}
