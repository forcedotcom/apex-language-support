public class InvalidSetListInitializer {
    public void testCollections() {
        Set<String> values = new Set<String>(new List<Integer>());
    }
}
