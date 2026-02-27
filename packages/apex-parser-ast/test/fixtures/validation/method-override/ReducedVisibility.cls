public virtual class Parent {
    public virtual void method1() {
    }
    
    public class Child extends Parent {
        private override void method1() { // Error: reduced visibility
        }
    }
}
