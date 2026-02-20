public class InvocableVariableValid {
    @InvocableVariable
    public String field1;

    @InvocableVariable(label='Test Field', description='Test description')
    public String field2;

    @InvocableVariable(required=true)
    public String field3;

    @InvocableVariable(defaultValue='test', placeholderText='Enter value')
    public String field4;
}
