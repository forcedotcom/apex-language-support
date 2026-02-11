/**
 * Tests PARAMETERIZED_TYPE_TOO_DEEP: nesting exceeds max depth (5)
 * List<List<List<List<List<List<String>>>>>> = depth 6
 */
public class TooDeep {
    List<List<List<List<List<List<String>>>>>> deepField;

    public void method(Map<String, List<List<List<List<List<Integer>>>>>> p) {}
}
