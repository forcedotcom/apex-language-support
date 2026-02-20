public class Parent {
    public void method1() { // Not virtual or abstract
    }
    
    public class Child extends Parent {
        override public void method1() { // Error: overriding non-virtual method
        }
    }
}
