public class DeclarationTestClass {
    // Field declarations
    private String message;
    private Integer count;
    private FileUtilities fileUtils;
    private String name;
    
    // Property declarations
    public String Name { get; set; }
    public String Description { get; set; }
    public Account Owner { get; set; }
    
    public void testMethod() {
        // Variable declarations with builtin types
        String message = 'Hello World';
        System.debug(message);
        
        Integer count = 42;
        System.debug('Count: ' + count);
        
        List<String> names = new List<String>();
        names.add('John');
        names.add('Jane');
        
        Map<String, Object> data = new Map<String, Object>();
        data.put('key1', 'value1');
        data.put('key2', 42);
        
        // Variable declarations with workspace classes
        FileUtilities utils = new FileUtilities();
        String result = utils.createFile('test.txt', 'Hello World');
        
        ServiceClass service = new ServiceClass();
        String processed = service.processData('test data', 100, true);
        
        Account acc = new Account('Test Account');
        acc.Name = 'Updated Name';
        acc.updateBillingAddress('123 Main St', 'Anytown', 'CA', '12345', 'USA');
        
        // Variable declarations with standard Apex classes
        System system = System.class;
        system.debug('Hello World');
        
        EncodingUtil encoder = EncodingUtil.class;
        String encoded = encoder.urlEncode('Hello World', 'UTF-8');
        
        // Field assignments
        this.message = 'Hello World';
        this.count = 42;
        this.fileUtils = new FileUtilities();
        this.name = 'Test Name';
        
        // Property assignments
        this.Name = 'Test Name';
        this.Description = 'Test Description';
        this.Owner = new Account('Test Account');
    }
}
