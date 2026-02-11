public class InvalidMapInitializerValueType {
    public void testInvalidValueType() {
        Map<String, Integer> map1 = new Map<String, Integer>();
        Map<String, String> map2 = new Map<String, String>();
        
        // Error: Value type mismatch (Integer vs String)
        Map<String, Integer> result = new Map<String, Integer>(map2);
    }
}
