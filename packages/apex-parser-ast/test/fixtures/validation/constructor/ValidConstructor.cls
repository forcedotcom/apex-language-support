public class ValidConstructor {
    public ValidConstructor() {
        // Valid: no super()/this() call - uses default constructor
        System.debug('No super call');
    }
    
    public ValidConstructor(String param) {
        // Valid: this() is the first statement
        this();
    }
    
    public ValidConstructor(Integer num) {
        // Valid: no super()/this() call - uses default constructor
        System.debug('No super call');
    }
}
