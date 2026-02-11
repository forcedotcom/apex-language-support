/**
 * Tests INVALID_INSTANCEOF_INVALID_TYPE: RHS is primitive (obj instanceof Integer)
 */
public class InvalidType {
    public void method(Object obj) {
        if (obj instanceof Integer) {}
        if (obj instanceof String) {}
    }
}
