/**
 * Enables custom code to run after a managed package installation or upgrade.
 */
public interface InstallHandler {

  /**
   * Specifies the actions to be performed on install/upgrade.
   * @param context 
   * @return Void
   */
  Void onInstall(InstallContext context);

}