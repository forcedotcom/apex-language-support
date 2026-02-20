/**
 * Valid parameterized types - no errors expected
 */
public class ValidParameterized {
    List<String> listField;
    Set<Id> setField;
    Map<String, Integer> mapField;
    List<List<String>> nestedList;
    Map<String, List<Integer>> mapWithList;

    public void method(List<Account> p, Map<Id, String> m) {}
    public List<Contact> returnsList() { return null; }
}
