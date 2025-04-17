/**
 * This file contains type declarations for classes that would typically be part
 * of a managed package. These are not meant to be functional but rather to demonstrate
 * how the FQN calculation would work with external namespaces.
 */

// ManagedPkg namespace classes
global class ManagedPkg {
    // Main namespace class that serves as container
    
    // External class in the managed package
    global class ExternalClass {
        // Properties
        global String externalProperty { get; set; }
        
        // Constructor
        global ExternalClass() {
            this.externalProperty = 'default';
        }
        
        // Static method
        global static void doSomething() {
            System.debug('Doing something in managed package');
        }
        
        // Instance method
        global String externalMethod() {
            return 'Result from managed package';
        }
        
        // Private helper method (not accessible outside the package)
        private void helperMethod() {
            // Implementation details
        }
    }
    
    // Another class in the managed package
    global class AnotherClass {
        // A field that references another class in the same package
        global ExternalClass reference;
        
        global AnotherClass() {
            reference = new ExternalClass();
        }
        
        global void useReference() {
            reference.externalMethod();
        }
    }
    
    // Enum in the managed package
    global enum PackageStatus {
        ACTIVE,
        INACTIVE,
        PENDING
    }
    
    // Interface in the managed package
    global interface PackageInterface {
        void processPackage();
        String getPackageInfo();
    }
}

// Another namespace for a different managed package
global class OtherPkg {
    // Classes in a different managed package
    
    global class ServiceClass {
        global void performService() {
            // Implementation
        }
    }
    
    // Class that references another managed package
    global class IntegrationClass {
        // Reference across managed packages
        global ManagedPkg.ExternalClass crossPackageRef;
        
        global void integrate() {
            crossPackageRef = new ManagedPkg.ExternalClass();
            String result = crossPackageRef.externalMethod();
        }
    }
} 