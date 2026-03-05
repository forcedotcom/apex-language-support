public class InvalidMapInitializerKeyType {
    public void testInvalidKeyType() {
        Map<String, Integer> map1 = new Map<String, Integer>();
        Map<Integer, Integer> map2 = new Map<Integer, Integer>();
        
        // Error: Key type mismatch (String vs Integer)
        Map<String, Integer> result = new Map<String, Integer>(map2);
    }
}
