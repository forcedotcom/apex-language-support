/**
 * Demonstrates: Abstract method has a body
 * Error Code: abstract.methods.cannot.have.body
 * Validator: AbstractMethodBodyValidator (TIER 1)
 */
public abstract class AbstractMethodWithBody {
    public abstract void abstractMethod() {
        // Abstract methods cannot have a body - error!
    }
}
