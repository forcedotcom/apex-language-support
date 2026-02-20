public class ConcreteClass extends AbstractClass {
    public void test() {
        AbstractClass obj = new ConcreteClass();
        obj.abstractMethod(); // Error: Cannot call abstract method directly
    }
    
    // Note: abstractMethod() is not implemented, which is intentional for this test
}
