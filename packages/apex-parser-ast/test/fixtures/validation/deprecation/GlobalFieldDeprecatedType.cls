@Deprecated
public class DeprecatedType {
}

public class GlobalFieldDeprecatedType {
    // Invalid: global field has deprecated type but is not deprecated
    global DeprecatedType deprecatedField;
}
