public class ConflictingModifiers {
    // Error: abstract + virtual conflict
    public abstract virtual void method1() {
    }
    
    // Error: abstract + final conflict
    public abstract final void method2() {
    }
    
    // Error: virtual + final conflict
    public virtual final void method3() {
    }
}
