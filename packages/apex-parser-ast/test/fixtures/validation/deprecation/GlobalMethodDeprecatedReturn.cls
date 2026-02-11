@Deprecated
public class DeprecatedType {
}

public class GlobalMethodDeprecatedReturn {
    // Invalid: global method returns deprecated type but is not deprecated
    global DeprecatedType getDeprecated() {
        return new DeprecatedType();
    }
}
