/**
 * Tests INVALID_INSTANCEOF_ALWAYS_TRUE: left always instance of right (redundant)
 * obj instanceof Object - any object is always Object
 */
public class AlwaysTrue {
    public void method(Object obj) {
        if (obj instanceof Object) {}
    }
}
