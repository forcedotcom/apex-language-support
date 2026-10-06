/**
 * To make your sandbox environment business ready, automate data manipulation or business logic tasks. Extend this interface and add methods to perform post-copy tasks, then specify the class during sandbox creation.
 * Usage
 * Create an Apex class that implements this interface. Specify your class during sandbox creation. After your sandbox is created, the runApexClass(context) method in your class runs using the automated process user’s permissions.
 * Important
 * The SandboxPostCopy Apex class is executed at the end of the sandbox copy using a special Automated Process user that isn’t visible within the org. This user doesn’t have access to all object and features; therefore, the Apex script cannot access all objects and features. If the script fails, run the script after sandbox activation as a user with appropriate permissions.
 */
global interface SandboxPostCopy {
    virtual Boolean equals(Object arg0);

    virtual Integer hashCode();

    /**
     * Executes actions in a new sandbox to prepare it for use. For example, add logic to this method to create users, run sanitizing code on records, and perform other setup tasks.
     */
    abstract void runApexClass(System.SandboxContext context);

    virtual String toString();
}