/**
 * Enables custom code to run after a managed package installation or upgrade.
 * <p>Usage
 * App developers can implement this interface to specify Apex code that runs automatically after a subscriber installs or upgrades a managed package. The package install or upgrade can be customized based on details of the subscriber’s organization. For instance, you can use the script to populate custom settings, create sample data, send an email to the installer, notify an external system, or kick off a batch operation to populate a new field across a large set of data.
 * The post install script is invoked after tests have been run, and is subject to default governor limits. It runs as a special system user that represents your package, so all operations performed by the script appear to be done by your package. You can access this user by using UserInfo. You only see this user at runtime, not while running tests.
 * If the script fails, the install or upgrade is aborted. Any errors in the script are emailed to the user specified in the Notify on Apex Error field of the package. If no user is specified, the install or upgrade details are unavailable.
 * The post install script has the following additional properties.
 * It can initiate batch, scheduled, and future jobs.
 * It can’t access Session IDs.
 * It can only perform callouts using an async operation. The callout occurs after the script is run and the install is complete and committed.
 * It can’t call another Apex class in the package if that Apex class uses the with sharing keyword. This keyword can prevent the package from successfully installing. To learn more, see the <a class="xref" href="https://developer.salesforce.com/docs/atlas.en-us.262.0.apexcode.meta/apexcode/apex_classes_keywords_sharing.htm" target="_blank">Apex Developer Guide</a>.
 * The InstallHandler interface has a single method called onInstall, which specifies the actions to be performed on install or upgrade.
 * public interface InstallHandler {
 *   void onInstall(InstallContext context)
 * };
 *
 * The onInstall method takes a context object as its argument, which provides the following information.
 * The org ID of the organization in which the installation takes place.
 * The user ID of the user who initiated the installation.
 * The version number of the previously installed package (specified using the Version class). The version is always a three-part number, such as 1.2.0.
 * Whether the installation is an upgrade.
 * Whether the installation is a push.
 * The context argument is an object whose type is the InstallContext interface. This interface is automatically implemented by the system. The following definition of the InstallContext interface shows the methods you can call on the context argument.
 * public interface InstallContext {
 *   ID organizationId();
 *   ID installerId();
 *   Boolean isUpgrade();
 *   Boolean isPush();
 *   Version previousVersion();
 * }
 */
global interface InstallHandler {
    virtual Boolean equals(Object arg0);

    virtual Integer hashCode();

    abstract void onInstall(System.InstallContext context);

    virtual String toString();
}