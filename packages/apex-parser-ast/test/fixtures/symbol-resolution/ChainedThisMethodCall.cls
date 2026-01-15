public class TestClass {
    public void myMethod() {
        this.locateAccountRecordTypeAutoDeletionService()
            .getAccountRecordTypeAutoDeletionModel();
    }
    
    private AccountRecordTypeAutoDeletionService locateAccountRecordTypeAutoDeletionService() {
        return new AccountRecordTypeAutoDeletionService();
    }
}

