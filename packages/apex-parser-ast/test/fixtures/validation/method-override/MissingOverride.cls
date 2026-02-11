public virtual class Parent {
    public virtual void method1() {
    }
    
    public class Child extends Parent {
        public void method1() { // Error: missing @Override
        }
    }
}
