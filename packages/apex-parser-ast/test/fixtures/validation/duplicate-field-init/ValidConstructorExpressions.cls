public class ValidConstructorExpressions {
    public void testValidConstructors() {
        // Valid: no field initializers
        Account acc1 = new Account();
        
        // Valid: single field initializer
        Account acc2 = new Account(Name='Test');
        
        // Valid: multiple different field initializers
        Account acc3 = new Account(Name='Test', Phone='123', Industry='Tech');
        
        // Valid: case-sensitive different fields (Name vs Phone)
        Account acc4 = new Account(Name='Test', Phone='123');
    }
}
