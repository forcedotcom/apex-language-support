public class ValidDmlStatements {
    public void testValidDml() {
        Account acc = new Account();
        insert acc;
        
        List<Account> accounts = new List<Account>();
        insert accounts;
        
        Contact con = new Contact();
        update con;
        
        List<Contact> contacts = new List<Contact>();
        update contacts;
        
        delete acc;
        delete accounts;
        
        undelete acc;
        undelete accounts;
        
        upsert acc;
        upsert accounts;
        
        Account master = new Account();
        List<Account> duplicates = new List<Account>();
        merge master duplicates;
    }
}
