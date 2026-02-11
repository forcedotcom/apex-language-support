public virtual class Parent {
    public virtual void method1() {
    }
    
    public abstract void method2(); // Abstract method
    
    public class Child extends Parent {
        override public void method1() { // Valid: overrides virtual method
        }
        
        override public void method2() { // Valid: implements abstract method
        }
    }
}
