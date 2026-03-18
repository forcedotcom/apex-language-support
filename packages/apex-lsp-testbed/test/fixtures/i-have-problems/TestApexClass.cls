@isTest
public class TestApexClass {
    @isTest
    static void testAddition() {
        Integer result = 2 + 2;
        System.assertEquals(4, result, 'Addition should work correctly');
    }
    
    @isTest
    static void testSubtraction() {
        Integer result = 10 - 5;
        System.assertEquals(5, result, 'Subtraction should work correctly');
    }
    
    @isTest
    static void testStringOperations() {
        String greeting = 'Hello';
        String name = 'World';
        String result = greeting + ' ' + name;
        System.assertEquals('Hello World', result, 'String concatenation should work');
    }
    
    @isTest
    static void testListOperations() {
        List<Integer> numbers = new List<Integer>{1, 2, 3, 4, 5};
        System.assertEquals(5, numbers.size(), 'List should have 5 elements');
        System.assertEquals(1, numbers[0], 'First element should be 1');
        System.assertEquals(5, numbers[4], 'Last element should be 5');
    }
    
    @isTest
    static void testMapOperations() {
        Map<String, Integer> scoreMap = new Map<String, Integer>();
        scoreMap.put('Alice', 95);
        scoreMap.put('Bob', 87);
        scoreMap.put('Charlie', 92);
        
        System.assertEquals(3, scoreMap.size(), 'Map should have 3 entries');
        System.assertEquals(95, scoreMap.get('Alice'), 'Alice score should be 95');
        System.assertTrue(scoreMap.containsKey('Bob'), 'Map should contain Bob');
    }
    
    @isTest
    static void testAccountCreation() {
        Test.startTest();
        
        Account testAccount = new Account(
            Name = 'Test Account',
            Type = 'Customer'
        );
        insert testAccount;
        
        System.assertNotEquals(null, testAccount.Id, 'Account should have an ID after insert');
        
        Account retrievedAccount = [SELECT Id, Name, Type FROM Account WHERE Id = :testAccount.Id];
        System.assertEquals('Test Account', retrievedAccount.Name, 'Account name should match');
        System.assertEquals('Customer', retrievedAccount.Type, 'Account type should match');
        
        Test.stopTest();
    }
    
    @isTest
    static void testExceptionHandling() {
        Boolean exceptionCaught = false;
        
        try {
            Integer result = 10 / 0;
        } catch (MathException e) {
            exceptionCaught = true;
            System.assertEquals('Divide by 0', e.getMessage(), 'Exception message should be correct');
        }
        
        System.assertTrue(exceptionCaught, 'Exception should have been caught');
    }
    
    @TestSetup
    static void setupTestData() {
        List<Account> testAccounts = new List<Account>();
        
        for (Integer i = 0; i < 5; i++) {
            testAccounts.add(new Account(
                Name = 'Test Account ' + i,
                Type = 'Prospect'
            ));
        }
        
        insert testAccounts;
    }
    
    @isTest
    static void testBulkOperations() {
        List<Account> accounts = [SELECT Id, Name FROM Account WHERE Name LIKE 'Test Account%'];
        System.assertEquals(5, accounts.size(), 'Should have 5 test accounts from setup');
        
        for (Account acc : accounts) {
            acc.Type = 'Customer';
        }
        
        update accounts;
        
        List<Account> updatedAccounts = [SELECT Id, Type FROM Account WHERE Id IN :accounts];
        for (Account acc : updatedAccounts) {
            System.assertEquals('Customer', acc.Type, 'Account type should be updated to Customer');
        }
    }
}