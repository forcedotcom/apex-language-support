public virtual class OuterClass {
    public virtual void method1() {
        System.debug('Outer method');
    }
    
    // Test: Can inner class extend its outer class?
    public class InnerClass extends OuterClass {
        override public void method1() {
            System.debug('Inner method');
        }
    }
}
