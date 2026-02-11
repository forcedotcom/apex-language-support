public class ValidDeprecation {
    @Deprecated
    public class DeprecatedType {
    }
    
    @Deprecated
    global DeprecatedType getDeprecatedField() {
        return new DeprecatedType();
    }
    
    @Deprecated
    global DeprecatedType deprecatedField;
}
