public class TestClass {
    private String name;
    private Integer count;
    
    public TestClass() {
        this.name = 'Test';
        this.count = 0;
    }
    
    public void incrementCount() {
        this.count++;
    }
    
    public Integer getCount() {
        return this.count;
    }
    
    public String getName() {
        return this.name;
    }
}