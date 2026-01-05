public class AssignmentLHSTestClass {
  @TestVisible private static AccountAutoDeletionSettingsVMapper instance;
  
  public static AccountAutoDeletionSettingsVMapper getInstance() {
    if (instance == null) {
      instance = new AccountAutoDeletionSettingsVMapper();
    }
    return instance;
  }
}

