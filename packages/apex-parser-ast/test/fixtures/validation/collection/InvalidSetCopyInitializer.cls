public class InvalidSetCopyInitializer {
    public void testCollections() {
        Set<String> values = new Set<String>(new Set<Integer>());
    }
}
