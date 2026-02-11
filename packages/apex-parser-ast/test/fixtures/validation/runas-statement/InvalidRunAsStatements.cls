public class InvalidRunAsStatements {
    public void testInvalidRunAs() {
        // Error: no arguments
        System.runAs() {
        }
        
        // Error: too many arguments
        User user1 = new User();
        User user2 = new User();
        System.runAs(user1, user2) {
        }
        
        // Error: wrong type (String)
        String str = 'test';
        System.runAs(str) {
        }
        
        // Error: wrong type (Integer)
        Integer num = 5;
        System.runAs(num) {
        }
        
        // Error: wrong type (Account)
        Account acc = new Account();
        System.runAs(acc) {
        }
    }
}
