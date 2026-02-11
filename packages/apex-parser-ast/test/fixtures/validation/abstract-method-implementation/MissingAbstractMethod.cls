public abstract class AbstractParent {
    public abstract void abstractMethod();

    public class ConcreteChild extends AbstractParent {
        // Error: Must implement abstractMethod
    }
}
