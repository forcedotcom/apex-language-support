/**
 * Enables custom code to run after a managed package is uninstalled.
 */
global interface UninstallHandler {

  /**
   * Specifies the actions to be performed on uninstall.
   * @param context 
   */
  void onUninstall(UninstallContext context);

}