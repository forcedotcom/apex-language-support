/**
 * Tests INVALID_PARAMETERIZED_TYPE_COUNT: wrong type arg count
 * List<String,Integer> - 2 args (expected 1)
 * Map<String> - 1 arg (expected 2)
 */
public class InvalidCount {
    List<String, Integer> listField;
    Set<String, Integer> setField;
    Map<String> mapField;

    public void method(List<String, Integer> p) {}
    public Map<String> returnsMap() { return null; }
}
