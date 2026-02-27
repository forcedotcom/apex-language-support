public class MethodTypesClash {
    // Invalid: two methods with same signature but different return types
    public String getValue() {
        return 'string';
    }
    
    public Integer getValue() {
        return 123;
    }
    
    // Valid: different parameter types (overloading)
    public String getValue(String param) {
        return param;
    }
    
    public Integer getValue(Integer param) {
        return param;
    }
}
