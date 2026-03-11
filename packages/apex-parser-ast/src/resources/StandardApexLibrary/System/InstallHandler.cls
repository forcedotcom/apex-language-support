/**
 * Enables custom code to run after a managed package installation or upgrade.
 */
global interface InstallHandler {

  /**
   * Specifies the actions to be performed on install/upgrade.
   * @param context 
   */
  void onInstall(InstallContext context);

}