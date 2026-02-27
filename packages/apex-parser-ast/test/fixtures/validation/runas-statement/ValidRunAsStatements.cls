public class ValidRunAsStatements {
    public void testValidRunAs() {
        User testUser = new User();
        System.runAs(testUser) {
            // Valid: single User argument
        }
        
        System.Version version = System.requestVersion();
        System.runAs(version) {
            // Valid: single Version argument
        }
        
        Package.Version pkgVersion = Package.Version.newInstance(1, 0);
        System.runAs(pkgVersion) {
            // Valid: single Package.Version argument
        }
    }
}
