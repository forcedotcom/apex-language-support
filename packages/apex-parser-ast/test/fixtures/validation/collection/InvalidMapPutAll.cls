public class InvalidMapPutAll {
    public void testPutAll() {
        Map<String, Integer> map1 = new Map<String, Integer>();
        Map<String, String> map2 = new Map<String, String>();
        
        // Error: Incompatible value types (Integer vs String)
        map1.putAll(map2);
    }
}
