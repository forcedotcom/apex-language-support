public virtual class Parent {
    public void method1() { // Not virtual, so cannot be overridden
    }
    
    public class Child extends Parent {
        override public void method1() { // Error: @Override on non-overriding method (parent method is not virtual)
        }
    }
}
