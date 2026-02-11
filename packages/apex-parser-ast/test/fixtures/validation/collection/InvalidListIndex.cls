public class InvalidListIndex {
    public void testCollections() {
        List<String> myList = new List<String>();
        // Invalid: List index should be Integer, not String
        String value = myList['invalid'];
    }
}
