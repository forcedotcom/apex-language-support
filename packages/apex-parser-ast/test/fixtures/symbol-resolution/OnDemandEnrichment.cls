public class TestClass {
    @TestVisible private static AccountAutoDeletionSettingsVMapper instance;
    
    public static AccountAutoDeletionSettingsVMapper getInstance() {
        if (instance == null) {
            instance = new AccountAutoDeletionSettingsVMapper();
        }
        return instance;
    }
}

public class AccountAutoDeletionSettingsVMapper {
    public AccountAutoDeletionSettingsVMapper() { }
}

