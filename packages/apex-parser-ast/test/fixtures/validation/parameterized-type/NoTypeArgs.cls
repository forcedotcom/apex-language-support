/**
 * Tests NO_TYPE_ARGUMENTS_FOR_PARAMETERIZED_TYPE: List/Set/Map without type args
 */
public class NoTypeArgs {
    List listField;
    Set setField;
    Map mapField;

    public void method(List p, Map m) {}
    public Set returnsSet() { return null; }
}
