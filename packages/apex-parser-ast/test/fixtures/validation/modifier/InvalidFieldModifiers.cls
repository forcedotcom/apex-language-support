public class InvalidFieldModifiers {
    // Error: virtual not allowed on fields
    public virtual String field1;
    
    // Error: abstract not allowed on fields
    public abstract String field2;
    
    // Error: override not allowed on fields
    public override String field3;
}
