public class SystemKeywordTestClass {
    // Test System namespace usage (should work with hover)
    public void testSystemDebug() {
        System.debug('test'); // Hover on "System" should work
    }
    
    public void testSystemString() {
        System.String str = 'test'; // Hover on "System" should work
    }
    
    public void testSystemList() {
        System.List<String> list = new System.List<String>(); // Hover on "System" should work
    }
    
    public void testSystemRunAs() {
        User testUser = [SELECT Id FROM User LIMIT 1];
        system.runas(testUser) { // Hover on "system" should return null (keyword context)
            System.debug('inside runas');
        }
    }
    
    // Test DML keyword usage (should return null for hover)
    public void testDmlSystemKeyword() {
        Account acc = new Account(Name = 'Test');
        insert as system acc; // Hover on "system" should return null (DML keyword)
    }
    
    public void testDmlUpdateSystemKeyword() {
        Account acc = new Account(Name = 'Test');
        update as system acc; // Hover on "system" should return null (DML keyword)
    }
    
    // Test SOQL keyword usage (should return null for hover)
    public void testSoqlSystemMode() {
        List<Account> accounts = [
            SELECT Id, Name 
            FROM Account 
            WITH SYSTEM_MODE
        ]; // Hover on "SYSTEM" in "SYSTEM_MODE" should return null (SOQL keyword)
    }
}
