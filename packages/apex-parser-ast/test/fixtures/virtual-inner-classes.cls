/*
 * Test fixture for virtual inner classes
 * Tests the workaround for grammar parsing issue where virtual inner classes
 * were incorrectly parsed as field declarations
 */
public class VirtualInnerClassesTest {
    
    // Virtual inner class extending another class
    public virtual class GlobalPicklistValue extends Metadata {
        public String color;
        public String value;
        
        public virtual void initialize() {
            // Virtual method in virtual inner class
        }
    }
    
    // Abstract virtual inner class
    public abstract virtual class AbstractInnerClass {
        public abstract void abstractMethod();
        
        public virtual void concreteMethod() {
            // Implementation
        }
    }
    
    // Final inner class (should not be parsed as field)
    public final class FinalInnerClass {
        public String finalField;
    }
    
    // Interface inner declaration
    public interface InnerInterface {
        void interfaceMethod();
    }
    
    // Enum inner declaration
    public enum InnerEnum {
        VALUE1, VALUE2, VALUE3
    }
    
    // Regular field for comparison (should still work)
    public String regularField;
    private static final Integer CONSTANT = 100;
} 