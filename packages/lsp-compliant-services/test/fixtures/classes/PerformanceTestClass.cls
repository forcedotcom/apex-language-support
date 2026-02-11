public class PerformanceTestClass {
    // This class is used for performance testing of didOpen operations
    // It includes various language features to trigger compilation, symbol resolution, and reference processing
    
    private static final String CONSTANT_VALUE = 'Test';
    private Integer counter = 0;
    
    public class InnerClass {
        private String name;
        
        public InnerClass(String name) {
            this.name = name;
        }
        
        public String getName() {
            return this.name;
        }
    }
    
    public PerformanceTestClass() {
        this.counter = 0;
    }
    
    public PerformanceTestClass(Integer initialValue) {
        this.counter = initialValue;
    }
    
    public void increment() {
        this.counter++;
    }
    
    public void decrement() {
        this.counter--;
    }
    
    public Integer getCounter() {
        return this.counter;
    }
    
    public String processString(String input) {
        if (String.isBlank(input)) {
            return CONSTANT_VALUE;
        }
        return input.toUpperCase();
    }
    
    public List<String> createList() {
        List<String> result = new List<String>();
        result.add('First');
        result.add('Second');
        result.add('Third');
        return result;
    }
    
    public Map<String, Integer> createMap() {
        Map<String, Integer> result = new Map<String, Integer>();
        result.put('one', 1);
        result.put('two', 2);
        result.put('three', 3);
        return result;
    }
    
    public void processCollection() {
        List<String> items = createList();
        Map<String, Integer> counts = createMap();
        
        for (String item : items) {
            System.debug('Item: ' + item);
        }
        
        for (String key : counts.keySet()) {
            System.debug(key + ' = ' + counts.get(key));
        }
    }
    
    public static void staticMethod() {
        System.debug('Static method called');
    }
}
