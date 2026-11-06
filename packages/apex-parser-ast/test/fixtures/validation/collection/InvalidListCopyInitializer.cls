public class InvalidListCopyInitializer {
    public void testCollections() {
        List<String> values = new List<String>(new List<Integer>(0));
    }
}
