/**
 * Sample class that demonstrates usage of managed package types.
 * This would be part of the customer's own codebase (not from the managed package).
 */
public class ManagedPackageUsage {
    // References to managed package classes
    private ManagedPkg.ExternalClass externalObj;
    private OtherPkg.ServiceClass serviceObj;
    
    // Class that implements a managed package interface
    public class MyImplementation implements ManagedPkg.PackageInterface {
        public void processPackage() {
            System.debug('Processing package in customer code');
        }
        
        public String getPackageInfo() {
            return 'Custom implementation of package interface';
        }
    }
    
    // Method that uses managed package types
    public void useExternalTypes() {
        // Static method call
        ManagedPkg.ExternalClass.doSomething();
        
        // Creating instances
        externalObj = new ManagedPkg.ExternalClass();
        serviceObj = new OtherPkg.ServiceClass();
        
        // Using properties and methods
        externalObj.externalProperty = 'Modified value';
        String result = externalObj.externalMethod();
        
        // Using enums from managed package
        ManagedPkg.PackageStatus status = ManagedPkg.PackageStatus.ACTIVE;
        
        // Cross-package integration
        OtherPkg.IntegrationClass integration = new OtherPkg.IntegrationClass();
        integration.integrate();
        
        // Using interface implementation
        MyImplementation impl = new MyImplementation();
        processImplementation(impl);
    }
    
    private void processImplementation(ManagedPkg.PackageInterface impl) {
        impl.processPackage();
        String info = impl.getPackageInfo();
    }
} 