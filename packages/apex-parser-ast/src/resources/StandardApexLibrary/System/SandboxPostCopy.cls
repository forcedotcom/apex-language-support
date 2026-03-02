/**
 * To make your sandbox environment business ready, automate data manipulation or business logic tasks. Extend this interface and add methods to perform post-copy tasks, then specify the class during sandbox creation.
 */
public interface SandboxPostCopy {

  /**
   * Executes actions in a new sandbox to prepare it for use. For example, add logic to this method to create users, run sanitizing code on records, and perform other setup tasks.
   * @param context The org ID, sandbox ID, and sandbox name for your sandbox. To work with these values, reference context.organizationId() , context.sandboxId() , and context.sandboxName() in your code.
   */
  void runApexClass(System.SandboxContext context);

}