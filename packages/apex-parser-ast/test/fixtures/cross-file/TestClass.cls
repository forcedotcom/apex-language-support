public class TestClass {
    private String name;
    private Integer count;
    
    public TestClass() {
        this.name = 'Test';
        this.count = 0;
    }
    
    public TestClass(String name) {
        this.name = name;
        this.count = 0;
    }
    
    public void testFileUtilities() {
        // Test cross-file reference to FileUtilities.createFile
        String result = FileUtilities.createFile('test.txt', 'Hello World');
        System.debug(result);
        
        // Test cross-file reference to FileUtilities.fileExists
        Boolean exists = FileUtilities.fileExists('test.txt');
        System.debug('File exists: ' + exists);
    }
    
    public void testAccountSObject() {
        // Test cross-file reference to Account.Name
        Account acc = new Account('Test Account');
        String accountName = acc.Name;
        System.debug('Account name: ' + accountName);
        
        // Test cross-file reference to Account.updateBillingAddress
        acc.updateBillingAddress('123 Main St', 'Anytown', 'CA', '12345', 'USA');
    }
    
    public void testUtilityClass() {
        // Test cross-file reference to UtilityClass.formatString
        String formatted = UtilityClass.formatString('  Hello World  ');
        System.debug('Formatted: ' + formatted);
        
        // Test cross-file reference to UtilityClass.calculateSum
        List<Integer> numbers = new List<Integer>{1, 2, 3, 4, 5};
        Integer sum = UtilityClass.calculateSum(numbers);
        System.debug('Sum: ' + sum);
    }
    
    public void testServiceClass() {
        // Test cross-file reference to ServiceClass.processData
        String processed = ServiceClass.processData('test data');
        System.debug(processed);
        
        // Test cross-file reference to ServiceClass.splitString
        List<String> parts = ServiceClass.splitString('a,b,c', ',');
        System.debug('Parts: ' + parts);
    }
    
    public void testBuiltInTypes() {
        // Test built-in type references
        String message = 'Test message';
        Integer number = 42;
        Boolean flag = true;
        
        // Test System.debug reference
        System.debug(message);
        System.debug('Number: ' + number);
        System.debug('Flag: ' + flag);
    }
    
    public String getName() {
        return name;
    }
    
    public void setName(String name) {
        this.name = name;
    }
    
    public Integer getCount() {
        return count;
    }
    
    public void incrementCount() {
        this.count++;
    }
    
    public void incrementCount(Integer amount) {
        this.count += amount;
    }
}
