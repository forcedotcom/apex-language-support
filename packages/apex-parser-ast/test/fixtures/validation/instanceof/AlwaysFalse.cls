/**
 * Tests INVALID_INSTANCEOF_ALWAYS_FALSE: left can never be instance of right
 * Cast (String)o has type String, not assignable to AlwaysFalse
 */
public class AlwaysFalse {
    public void method(Object o) {
        if ((String)o instanceof AlwaysFalse) {}
    }
}
