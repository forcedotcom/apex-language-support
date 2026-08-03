public class InvalidNestedMapPutAll {
    public void testPutAll() {
        Map<String, List<Integer>> target = new Map<String, List<Integer>>();
        Map<String, List<String>> source = new Map<String, List<String>>();

        target.putAll(source);
    }
}
