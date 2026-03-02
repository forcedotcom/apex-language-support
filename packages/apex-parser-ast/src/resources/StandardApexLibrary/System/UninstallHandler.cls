/**
 * Enables custom code to run after a managed package is uninstalled.
 */
public interface UninstallHandler {

  /**
   * Specifies the actions to be performed on uninstall.
   * @param context 
   * @return Void
   */
  Void onUninstall(UninstallContext context);

}