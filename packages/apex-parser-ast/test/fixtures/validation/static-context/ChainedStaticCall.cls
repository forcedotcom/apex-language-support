/**
 * Edge case: chained static method call via instance (this.staticA().staticB())
 */
public class ChainedStaticCall {
    public static ChainedStaticCall staticA() {
        return new ChainedStaticCall();
    }
    public static void staticB() {
    }
    public void instanceMethod() {
        this.staticA().staticB();
    }
}
