/**
 * Enables custom code to run after a managed package is uninstalled.
 * <p>Usage
 * App developers can implement this interface to specify Apex code that runs automatically after a subscriber uninstalls a managed package. This makes it possible to perform cleanup and notification tasks based on details of the subscriber’s organization.
 * The uninstall script is subject to default governor limits. It runs as a special system user that represents your package, so all operations performed by the script will appear to be done by your package. You can access this user by using UserInfo. You will only see this user at runtime, not while running tests.
 * If the script fails, the uninstall continues but none of the changes performed by the script are committed. Any errors in the script are emailed to the user specified in the Notify on Apex Error field of the package. If no user is specified, the uninstall details will be unavailable.
 * The uninstall script has the following restrictions. You can’t use it to initiate batch, scheduled, and future jobs, to access Session IDs, or to perform callouts.
 * The UninstallHandler interface has a single method called onUninstall, which specifies the actions to be performed on uninstall.
 * global interface UninstallHandler {
 *   void onUninstall(UninstallContext context)};
 *
 * The onUninstall method takes a context object as its argument, which provides the following information.
 * The org ID of the organization in which the uninstall takes place.
 * The user ID of the user who initiated the uninstall.
 * The context argument is an object whose type is the UninstallContext interface. This interface is automatically implemented by the system. The following definition of the UninstallContext interface shows the methods you can call on the context argument.
 * global interface UninstallContext {
 *   ID organizationId();
 *   ID uninstallerId();
 * }
 */
global interface UninstallHandler {
    virtual Boolean equals(Object arg0);

    virtual Integer hashCode();

    abstract void onUninstall(System.UninstallContext context);

    virtual String toString();
}