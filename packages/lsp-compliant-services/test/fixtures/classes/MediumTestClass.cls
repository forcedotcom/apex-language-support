public class MediumTestClass {
    // Medium complexity: Collections (List, Map)
    // Expected first open: ~100-120ms (6-7 stdlib classes: String, Integer, List, Map)
    
    public List<String> getItems() {
        List<String> items = new List<String>();
        items.add('test');
        return items;
    }
    
    public Map<String, Integer> getCounts() {
        Map<String, Integer> counts = new Map<String, Integer>();
        counts.put('one', 1);
        return counts;
    }
}
