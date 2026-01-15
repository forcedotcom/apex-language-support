public with sharing class LocalVariableTestClass {
    public virtual HealthCheckGroupVModel getHealthCheckGroup() {
        AccountModelSettingsModel accountModelSettingModel = this.locateAccountModelSettingsService().getAccountModelSettingsModel();
        return null;
    }
    
    private AccountModelSettingsService locateAccountModelSettingsService() {
        return new AccountModelSettingsService();
    }
}

public class AccountModelSettingsModel {}
public class AccountModelSettingsService {
    public AccountModelSettingsModel getAccountModelSettingsModel() {
        return new AccountModelSettingsModel();
    }
}
