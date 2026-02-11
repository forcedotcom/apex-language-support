public class InvalidConstructorExpressions {
    public void testInvalidConstructors() {
        // Error: duplicate field initialization (case-insensitive)
        Account acc1 = new Account(Name='Test', name='Test2');
        
        // Error: duplicate field initialization
        Account acc2 = new Account(Name='Test', Phone='123', Name='Test2');
        
        // Error: duplicate field initialization (different case)
        Account acc3 = new Account(Phone='123', phone='456');
        
        // Error: multiple duplicates
        Account acc4 = new Account(Name='Test', name='Test2', Phone='123', phone='456');
    }
}
