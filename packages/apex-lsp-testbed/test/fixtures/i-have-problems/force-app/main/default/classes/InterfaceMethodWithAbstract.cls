/**
 * Demonstrates semantic error: abstract keyword not allowed on interface methods
 * Interface methods are implicitly abstract and cannot have explicit modifiers
 */
public interface InterfaceMethodWithAbstract {
    abstract void methodWithAbstract();
}
