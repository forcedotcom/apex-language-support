public class InvalidSObjectMap {
    public void testInvalidSObjectMap() {
        // Error: Cannot create Map<String, SObject> - must use concrete SObject type
        Map<String, SObject> invalidMap = new Map<String, SObject>();
    }
}
