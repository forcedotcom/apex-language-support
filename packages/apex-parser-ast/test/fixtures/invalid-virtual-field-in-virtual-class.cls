/*
 * Test fixture for invalid virtual fields in virtual inner classes
 * This ensures our workaround correctly:
 * 1. Parses the virtual inner class as a class (not field)
 * 2. Still catches and reports virtual field modifier errors
 */
public class TestInvalidVirtualField {
    
    // Valid: virtual inner class should be parsed correctly
    public virtual class VirtualInnerClass {
        // INVALID: virtual field should still generate an error
        public virtual String invalidVirtualField;
        
        // Valid: regular fields should work fine
        public String validField;
        private static final Integer CONSTANT = 42;
        
        // Valid: virtual methods are allowed
        public virtual void validVirtualMethod() {
            // Implementation
        }
    }
    
    // Another valid virtual inner class for thoroughness
    public virtual class AnotherVirtualClass {
        // INVALID: another virtual field that should fail
        private virtual Integer anotherInvalidField;
        
        // Valid: normal field
        public Boolean normalField;
    }
    
    // Valid: regular field in outer class
    public String outerClassField;
} 