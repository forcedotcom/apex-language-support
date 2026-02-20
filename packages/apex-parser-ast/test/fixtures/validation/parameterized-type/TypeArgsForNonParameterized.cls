/**
 * Tests TYPE_ARGUMENTS_FOR_NON_PARAMETERIZED_TYPE: type args on non-List/Set/Map
 */
public class TypeArgsForNonParameterized {
    String<Integer> strField;
    Account<Id> accountField;
    Integer<Long> primField;

    public void method(String<Integer> p) {}
}
